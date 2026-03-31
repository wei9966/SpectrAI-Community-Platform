# SpectrAI Community Platform — Security Baseline Report

**审计日期**: 2026-03-31
**审计范围**: 现有认证/授权模式、数据库 Schema、路由安全
**审计员**: Security Auditor

---

## 一、现有安全架构概览

### 认证方式
- **JWT (JSON Web Token)** — 使用 `jsonwebtoken` 库
- **签名算法**: HS256 (默认)
- **Token 有效期**: 7 天
- **Token 传递**: Authorization: Bearer {token}
- **密码哈希**: bcryptjs, cost factor 12

### 授权模式
- **角色系统**: user / admin / moderator (pgEnum)
- **JWT payload 包含**: userId, username, role
- **所有权检查**: `existing.authorId !== userId` (resources PUT/DELETE)
- **管理员覆盖**: `role !== "admin"` (仅 DELETE 资源)

### 数据库
- **ORM**: Drizzle ORM (参数化查询)
- **数据库**: PostgreSQL
- **全文搜索**: `plainto_tsquery` (安全，非 `to_tsquery`)

### CORS 配置
- 硬编码 `origin: ["http://localhost:3000", "http://localhost:5173"]`
- `credentials: true`

---

## 二、发现的安全问题

### CRITICAL — 无

### HIGH

#### H-01: GitHub OAuth 端点缺少输入校验
- **File**: `apps/api/src/routes/auth.ts:113-114`
- **Line(s)**: 113-117
- **Issue**: `POST /api/auth/github` 端点直接用 `await c.req.json()` 解析请求体，未使用 `zValidator` 校验。`code` 字段仅做了简单的 falsy 检查，没有长度限制或格式校验。
- **Fix**:
```typescript
const githubAuthSchema = z.object({
  code: z.string().min(1).max(200),
});

authRoutes.post("/github", zValidator("json", githubAuthSchema), async (c) => {
  const { code } = c.req.valid("json");
  // ...
});
```

#### H-02: Like/评论 Toggle 操作缺少事务保护（竞态条件）
- **File**: `apps/api/src/routes/resources.ts:296-344`
- **Line(s)**: 322-343
- **Issue**: 点赞 toggle 操作（查存在 → 删除/插入 → 更新计数）不是原子操作。高并发下可能导致 `likes` 计数与实际 `resource_likes` 行数不一致。
- **Fix**: 使用 `db.transaction()` 包裹整个 toggle 操作：
```typescript
await db.transaction(async (tx) => {
  const [existingLike] = await tx.select()...;
  if (existingLike) {
    await tx.delete(resourceLikes)...;
    await tx.update(resources).set({ likes: sql`${resources.likes} - 1` })...;
  } else {
    await tx.insert(resourceLikes)...;
    await tx.update(resources).set({ likes: sql`${resources.likes} + 1` })...;
  }
});
```

### MEDIUM

#### M-01: CORS origin 硬编码，不支持环境变量配置
- **File**: `apps/api/src/index.ts:14-17`
- **Line(s)**: 14-17
- **Issue**: CORS origin 硬编码为 `localhost:3000` 和 `localhost:5173`。部署到生产环境后需要修改代码才能更改允许的源，增加了维护成本和配置错误风险。
- **Fix**: 从环境变量读取：
```typescript
app.use("*", cors({
  origin: getEnv().CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
  credentials: true,
}));
```

#### M-02: 搜索查询参数未做 maxLength 限制
- **File**: `apps/api/src/routes/resources.ts:50`
- **Line(s)**: 50
- **Issue**: `listQuerySchema` 中的 `q` 字段为 `z.string().optional()`，没有 maxLength 限制。攻击者可以发送超长搜索字符串，导致全文搜索查询消耗大量资源。
- **Fix**:
```typescript
q: z.string().max(200).optional(),
```

#### M-03: 资源详情页每次查看都增加下载计数
- **File**: `apps/api/src/routes/resources.ts:203-207`
- **Line(s)**: 203-207
- **Issue**: `GET /api/resources/:id` 每次请求都执行 `downloads + 1`。这不是安全问题但可被滥用刷下载量（DoS via counter inflation）。应只在实际下载时计数，或基于 session/IP 去重。
- **Fix**: 将计数逻辑移到独立的 download 端点，或基于 cookie/session 去重。

#### M-04: 注册端点缺少速率限制
- **File**: `apps/api/src/routes/auth.ts:44`
- **Line(s)**: 44-82
- **Issue**: `POST /api/auth/register` 和 `POST /api/auth/login` 没有速率限制。可被暴力破解密码或批量注册垃圾账号。
- **Fix**: Phase 2/3 需要实现速率限制中间件（基于 Redis 或内存）。

#### M-05: 资源内容字段使用 `z.any()` 无验证
- **File**: `apps/api/src/routes/resources.ts:31`
- **Line(s)**: 31
- **Issue**: `createResourceSchema` 和 `updateResourceSchema` 中 `content` 字段使用 `z.any().optional()`，没有结构校验。恶意用户可注入任意 JSON 结构。
- **Fix**: 根据资源类型校验 content 结构（使用 discriminated union）。

#### M-06: 用户资料页面缺少编辑权限保护
- **File**: `apps/api/src/routes/users.ts`
- **Line(s)**: 全文件
- **Issue**: `users.ts` 只有 GET 端点，没有 PUT/PATCH 更新用户资料。但需注意：Phase 2 添加时必须包含 ownership 检查。

### LOW

#### L-01: 错误消息在生产环境可能泄露堆栈信息
- **File**: `apps/api/src/middleware/error-handler.ts:9`
- **Line(s)**: 9
- **Issue**: `console.error(err.stack)` 在生产环境也会输出完整堆栈到日志。虽然不返回给客户端，但如果日志被泄露会暴露内部结构。
- **Fix**: 生产环境使用结构化日志，不输出完整 stack。

#### L-02: `tags` 字段无长度和内容限制
- **File**: `apps/api/src/routes/resources.ts:32`
- **Line(s)**: 32
- **Issue**: `tags: z.array(z.string()).optional()` 没有限制数组长度和单个 tag 的字符串长度。可被滥用存储大量数据。
- **Fix**:
```typescript
tags: z.array(z.string().max(50).regex(/^[a-zA-Z0-9-_]+$/)).max(10).optional(),
```

#### L-03: `version` 字段无格式校验
- **File**: `apps/api/src/routes/resources.ts:33`
- **Line(s)**: 33
- **Issue**: `version: z.string().optional()` 不校验 semver 格式。
- **Fix**:
```typescript
version: z.string().regex(/^\d+\.\d+\.\d+/).optional(),
```

#### L-04: `description` 字段无 maxLength
- **File**: `apps/api/src/routes/resources.ts:28`
- **Line(s)**: 28
- **Issue**: `createResourceSchema` 中 `description` 为 `z.string().optional()` 没有 maxLength。数据库定义为 `text` 类型，可以存储非常长的文本。
- **Fix**:
```typescript
description: z.string().max(5000).optional(),
```

---

## 三、现有 Schema 安全评估

### 优点
1. **UUID 主键** — 不暴露自增 ID 信息
2. **外键级联删除** — `onDelete: "cascade"` 确保数据一致性
3. **密码字段** — 使用 bcrypt 哈希存储，响应中通过 `sanitizeUser()` 剥离
4. **唯一约束** — `resource_likes_resource_user_idx` 防止重复点赞
5. **参数化查询** — 所有数据库操作使用 Drizzle query builder，无 SQL 注入风险
6. **全文搜索安全** — 使用 `plainto_tsquery` 而非 `to_tsquery`

### 需关注项
1. **级联删除的影响** — 删除用户会级联删除其所有资源、评论、点赞。在某些场景下可能需要软删除。
2. **资源内容无加密** — `content` (jsonb) 字段明文存储。如果未来包含敏感配置（如 API key），需要加密。
3. **无审计日志表** — 当前没有操作审计表。Phase 3 通知系统可部分弥补。

---

## 四、Phase 2/3 安全审查 Checklist

### A. OWASP Top 10 检查项

| # | OWASP 类别 | 检查项 | 当前状态 |
|---|-----------|--------|---------|
| A01 | Broken Access Control | 每个写操作检查 ownership + role | ✅ 部分覆盖 |
| A02 | Cryptographic Failures | 密码 bcrypt 哈希、无明文存储 | ✅ 良好 |
| A03 | Injection | SQL 参数化、Zod 校验 | ✅ 良好 |
| A04 | Insecure Design | 速率限制缺失 | ⚠️ 需补充 |
| A05 | Security Misconfiguration | CORS 硬编码、env 校验 | ⚠️ 需改进 |
| A06 | Vulnerable Components | 依赖版本管理 | 🔍 需定期审计 |
| A07 | Auth Failures | 无速率限制、无账户锁定 | ⚠️ 需补充 |
| A08 | Data Integrity | content 字段无校验 | ⚠️ 需改进 |
| A09 | Logging | 日志中间件存在但基础 | ⚠️ 需增强 |
| A10 | SSRF | GitHub OAuth 外部调用需验证 | 🔍 需关注 |

### B. API 认证/授权检查项

| 检查项 | 要求 | 适用端点 |
|--------|------|---------|
| 所有写操作使用 authMiddleware | `POST/PUT/DELETE` | 所有 Phase 2/3 路由 |
| ownership 检查 | `c.get('user').userId === resource.authorId` | 评分/收藏/论坛帖子编辑 |
| 管理员操作检查 | `role === 'admin' \|\| role === 'moderator'` | 置顶/锁定/删除帖子 |
| 响应不含敏感字段 | 无 passwordHash/email | 所有用户相关端点 |
| JWT payload 完整性 | userId/username/role | 所有认证端点 |
| moderator 角色权限 | 新增 moderator 到 admin 检查 | 论坛管理操作 |

### C. 输入验证检查项

| 检查项 | 要求 | 适用字段 |
|--------|------|---------|
| 字符串 maxLength | 所有用户输入字符串 | 标题/内容/描述 |
| 数字 min/max | 评分 1-5、分页 limit | rating、page、limit |
| 枚举限制 | Zod enum 验证 | type、sort、category |
| 数组长度限制 | max(10) 或合理上限 | tags、steps |
| 内容格式校验 | semver、email、URL | version、email、avatarUrl |
| Markdown 消毒 | rehype-sanitize | 帖子/回复/评论内容 |
| 文件上传校验 | 类型 + 大小限制 | 头像/封面/资源包 |

### D. 文件上传安全检查项

| 检查项 | 要求 |
|--------|------|
| Presigned URL 有效期 | ≤ 5 分钟 |
| Content-Type 白名单 | image/png, image/jpeg, image/webp, application/json |
| 文件大小限制 | 头像 2MB、封面 5MB、资源包 10MB |
| 文件名重命名 | UUID 替代原始文件名 |
| MinIO bucket 策略 | 默认 private |
| 上传端点速率限制 | 每用户每分钟 ≤ 10 次 |

### E. CORS / XSS / CSRF 检查项

| 检查项 | 要求 | 当前状态 |
|--------|------|---------|
| CORS origin 从环境变量读取 | 动态配置 | ❌ 硬编码 |
| Credentials 模式 | 仅对认证请求启用 | ✅ 已启用 |
| Markdown 内容消毒 | rehype-sanitize | ❌ 待实现 |
| CSP 头 | 限制脚本来源 | ❌ 待实现 |
| 图片 URL 协议白名单 | 仅 https:// | ❌ 待实现 |
| CSRF Token | Cookie 模式需要 | ❌ 使用 Bearer Token，低风险 |

### F. 速率限制检查项

| 端点类别 | 建议限制 |
|---------|---------|
| 注册 POST /api/auth/register | 5 次/小时/IP |
| 登录 POST /api/auth/login | 10 次/分钟/IP |
| 发帖 POST /api/forum/posts | 5 次/分钟/用户 |
| 评论 POST /api/resources/:id/comments | 10 次/分钟/用户 |
| 投票 POST (toggle 操作) | 20 次/分钟/用户 |
| 上传 POST (presigned URL) | 10 次/分钟/用户 |
| 搜索 GET (全文搜索) | 30 次/分钟/IP |
| 通用 API | 100 次/分钟/IP |

### G. DoS 防护检查项

| 检查项 | 要求 | 当前状态 |
|--------|------|---------|
| 分页 limit 上限 | ≤ 100 | ✅ `max(100)` |
| 帖子内容 maxLength | ≤ 50000 字符 | ❌ 待实现 |
| 搜索查询 maxLength | ≤ 200 字符 | ❌ 待实现 |
| 请求体大小限制 | 服务器级别限制 | ❌ 待确认 |
| 嵌套回复深度 | 限制最大深度 | ❌ 待实现 |
| 数据库连接池 | 合理上限 | 🔍 需确认 |

---

## 五、Batch 1 Schema 安全审查（待新表完成后的检查清单）

当后端开发者完成 Batch 1 新增 9 张表后，需审查以下项目：

### 新增表清单
1. `resource_ratings` — 评分
2. `resource_favorites` — 收藏
3. `projects` — Showcase 项目
4. `project_resources` — 项目资源关联
5. `forum_categories` — 论坛板块
6. `forum_posts` — 论坛帖子
7. `forum_replies` — 论坛回复
8. `forum_votes` — 论坛投票
9. `notifications` — 通知

### 检查项

| 检查项 | 要求 |
|--------|------|
| 外键约束 | 所有外键有 `references` + `onDelete` |
| 级联删除影响 | 删除用户不应丢失论坛帖子（可保留匿名或标记删除） |
| 唯一约束 | 防止重复投票/评分/收藏 |
| 评分范围 | 数据库级 CHECK 或应用层 Zod 限制 1-5 |
| 投票方向 | up/down enum 限制 |
| 通知数据 | 不存储敏感操作细节（如密码变更不通知内容） |
| 帖子内容 | text 类型需在应用层限制 maxLength |
| 索引设计 | 高频查询路径需要索引 |

---

## 六、总结

### 安全基线评级：B+

**优势**:
- JWT 认证实现规范，bcrypt 密码哈希 cost factor 合理
- Drizzle ORM 参数化查询有效防止 SQL 注入
- 全文搜索使用 `plainto_tsquery` 安全函数
- 资源操作有 ownership + role 双重检查
- `sanitizeUser()` 确保响应不含敏感字段
- Zod 校验覆盖了大部分输入端点
- 分页有 max(100) 限制

**需改进**:
- 速率限制缺失（M-04）
- GitHub OAuth 端点输入校验缺失（H-01）
- Like toggle 操作缺少事务保护（H-02）
- CORS 配置硬编码（M-01）
- 搜索查询无长度限制（M-02）
- 资源 content 字段无结构校验（M-05）

**Phase 2/3 关键安全要求**:
1. 所有新增端点必须通过 authMiddleware + zValidator
2. 文件上传必须使用 presigned URL + 类型/大小限制
3. Markdown 渲染必须消毒（rehype-sanitize）
4. 投票/评分 toggle 必须使用 db.transaction()
5. 通知系统不得泄露敏感数据
6. 所有新增字符串字段需 maxLength 限制
