# Batch 1 安全审查报告：共享类型 + Zod Schemas

> 审查日期：2026-03-31
> 审查范围：`packages/shared/src/types/`、`packages/shared/src/schemas/`、`apps/api/src/db/schema.ts`
> 审查员：安全审计员

---

## 一、共享类型审查（`packages/shared/src/types/`）

### 审查文件
| 文件 | 用途 |
|------|------|
| `user.ts` | 用户角色枚举、公共用户信息、用户输入类型 |
| `resource.ts` | 资源枚举、内容类型、资源实体、评论类型 |
| `api.ts` | API 响应封装、分页、认证请求类型 |
| `index.ts` | 统一导出 |

### 发现的问题

#### Issue #T1 — TypeScript 类型无运行时校验保护
- **Severity**: MEDIUM
- **File**: `packages/shared/src/types/` 全部 4 个类型文件
- **Issue**: TypeScript interface/type 仅在编译时生效，运行时不提供任何校验。例如：
  - `PaginationParams.pageSize` 无上限，攻击者可传入 `pageSize=999999` 导致内存溢出
  - `CreateResourceInput.name` 是 `string`，无长度限制
  - `CreateUserInput.username` 是 `string`，无长度限制
  - `SearchParams.query` 是 `string`，无长度限制
- **Impact**: 这些类型被前端直接使用时无防护，必须配合 Zod schema 才能在 API 层拦截
- **Status**: **可接受** — 这是 TypeScript 的固有特性，只要 API 层使用 Zod 校验即可。但前端表单也应做客户端校验。

#### Issue #T2 — `Search_params` 缺少 `sortBy` 的 `'rating'` 选项
- **Severity**: LOW
- **File**: `packages/shared/src/types/api.ts:29`
- **Issue**: `SearchParams.sortBy` 枚举缺少 `'rating'`，与 Batch 2 需求（按评分排序）不一致
- **Fix**: 添加 `'rating'` 到 sortBy 联合类型

#### Issue #T3 — `ChangePasswordRequest` 无密码强度校验
- **Severity**: LOW
- **File**: `packages/shared/src/types/api.ts:88-91`
- **Issue**: `newPassword` 仅为 `string`，无最小长度、复杂度要求
- **Fix**: 后端 Zod schema 应加 `.min(8)` 等强度规则（Batch 2 不涉及，记入后续 Checklist）

---

## 二、Zod Schema 审查（`packages/shared/src/schemas/`）

### 审查文件
| 文件 | 用途 |
|------|------|
| `resource.schema.ts` | 资源创建/更新/公共资源校验 |
| `workflow.schema.ts` | 工作流内容校验 |
| `skill.schema.ts` | 技能内容校验 |
| `team.schema.ts` | 团队配置校验 |
| `mcp.schema.ts` | MCP 服务器配置校验 |
| `index.ts` | 统一导出 |

### 发现的问题

#### Issue #S1 — **各 Content Schema 字符串字段缺少 maxLength 限制** ⚠️ 核心问题
- **Severity**: HIGH
- **File**: 全部 5 个 schema 文件
- **Issue**: 所有 Content Schema 中的字符串字段（`name`, `description`, `command`, `promptTemplate`, `version`, `author`）均无 `.max()` 限制

  **受影响字段清单**：
  | Schema | 字段 | 当前约束 | 风险 |
  |--------|------|----------|------|
  | `workflow.schema.ts` | `name` | `z.string()` | 可提交任意长度 → DB varchar 溢出或存储滥用 |
  | `workflow.schema.ts` | `description` | `z.string()` | 同上 |
  | `workflow.schema.ts` | `version` | `z.string()` | 同上 |
  | `workflow.schema.ts` | `step.name` | `z.string()` | 同上 |
  | `workflow.schema.ts` | `step.type` | `z.string()` | 同上 |
  | `workflow.schema.ts` | `step.config` | `z.record(z.unknown())` | **无深度/大小限制** → 嵌套巨型 JSON 可导致解析 DoS |
  | `skill.schema.ts` | `command` | `z.string()` | 可注入超长命令行 → 安全风险 |
  | `skill.schema.ts` | `promptTemplate` | `z.string()` | 可提交数 MB 模板文本 |
  | `mcp.schema.ts` | `command` | `z.string()` | 同 skill.command |
  | `mcp.schema.ts` | `env` | `z.record(z.string())` | **无大小限制** → 可注入任意数量环境变量 |
  | `team.schema.ts` | `permissions` | `z.array(z.string())` | **无数组长度限制** → 可创建数千权限条目 |

- **Fix**:
  ```typescript
  // 所有 content schema 字段应添加 maxLength
  name: z.string().min(1).max(200),
  description: z.string().max(2000),
  command: z.string().max(500),
  promptTemplate: z.string().max(50000),
  version: z.string().max(20),

  // config 应限制大小
  config: z.record(z.unknown()).refine(
    (val) => JSON.stringify(val).length <= 10000,
    'Config JSON exceeds 10KB limit'
  ),

  // 数组应有长度限制
  permissions: z.array(z.string().max(100)).max(50),
  steps: z.array(workflowStepSchema).max(100),
  tags: z.array(z.string().max(50)).max(20),
  env: z.record(z.string().max(500)).refine(
    (val) => Object.keys(val).length <= 50,
    'Too many environment variables'
  ),
  ```

#### Issue #S2 — `resource.schema.ts` 中 `version` 字段格式不受限
- **Severity**: MEDIUM
- **File**: `packages/shared/src/schemas/resource.schema.ts:22`
- **Issue**: `version: z.string().default('1.0.0')` 不验证 semver 格式，可提交任意字符串如 `<script>alert(1)</script>`
- **Fix**: 使用正则校验 semver 格式
  ```typescript
  version: z.string().regex(/^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/, 'Invalid semver format').default('1.0.0'),
  ```

#### Issue #S3 — `tags` 数组中字符串无长度限制
- **Severity**: MEDIUM
- **File**: `packages/shared/src/schemas/resource.schema.ts:21`
- **Issue**: `z.array(z.string())` 中每个 tag 字符串无 `.max()` 限制
- **Fix**:
  ```typescript
  tags: z.array(z.string().min(1).max(50)).max(20).nullable().optional().default([]),
  ```

#### Issue #S4 — `updateResourceInputSchema` 的 `version` 无校验
- **Severity**: LOW
- **File**: `packages/shared/src/schemas/resource.schema.ts:34`
- **Issue**: 更新时 `version` 为 `z.string().optional()`，既无 maxLength 也无格式校验
- **Fix**: 同 S2，添加 semver 正则

#### Issue #S5 — `publicResourceSchema` 中 `authorSchema.id` 应为 UUID 格式
- **Severity**: LOW
- **File**: `packages/shared/src/schemas/resource.schema.ts:42`
- **Issue**: `id: z.string()` 不约束 UUID 格式，虽然此 schema 主要用于响应序列化，但若误用于输入校验则有风险
- **Fix**:
  ```typescript
  id: z.string().uuid(),
  ```

#### Issue #S6 — `workflowStepSchema.config` 使用 `z.record(z.unknown())` 过于宽泛
- **Severity**: MEDIUM
- **File**: `packages/shared/src/schemas/workflow.schema.ts:10`
- **Issue**: `z.record(z.unknown())` 允许任意嵌套深度和值类型。攻击者可构造深层嵌套 JSON（如 1000 层嵌套）导致 JSON.parse 栈溢出或 Zod 校验超时
- **Fix**: 添加大小/深度限制

---

## 三、数据库 Schema 与共享类型一致性审查

### 审查发现

#### Issue #D1 — 数据库 `resources.name` 为 `varchar(200)`，但 Zod schema 限制为 `max(100)`
- **Severity**: LOW
- **File**: `apps/api/src/db/schema.ts:50` vs `packages/shared/src/schemas/resource.schema.ts:17`
- **Issue**: DB 允许 200 字符，Zod 仅允许 100 字符。虽不构成安全风险（Zod 更严格是安全的），但可能导致数据不一致的困惑
- **建议**: 统一为同一值（建议 200）

#### Issue #D2 — 数据库 `resourceRatings.rating` 为 `integer` 无 CHECK 约束
- **Severity**: MEDIUM
- **File**: `apps/api/src/db/schema.ts:125`
- **Issue**: DB 层面 `rating` 列是 `integer`，无范围约束（1-5）。若 API 校验被绕过，可插入 0 或负数评分
- **Fix**: 添加 CHECK 约束
  ```sql
  ALTER TABLE resource_ratings ADD CONSTRAINT rating_range CHECK (rating >= 1 AND rating <= 5);
  ```
  或在 Drizzle schema 中使用：
  ```typescript
  rating: integer("rating").notNull().check(sql`rating >= 1 AND rating <= 5`),
  ```

#### Issue #D3 — 数据库 `forumVotes.value` 为 `integer` 无 CHECK 约束
- **Severity**: MEDIUM
- **File**: `apps/api/src/db/schema.ts:290`
- **Issue**: `value` 应为 +1 或 -1，但 DB 层无约束。可插入任意大正/负数操纵投票
- **Fix**:
  ```sql
  ALTER TABLE forum_votes ADD CONSTRAINT vote_value_range CHECK (value IN (1, -1));
  ```

#### Issue #D4 — `projects.status` 使用 `varchar(20)` 而非 `pgEnum`
- **Severity**: LOW
- **File**: `apps/api/src/db/schema.ts:179`
- **Issue**: `status` 是 `varchar(20)` 默认 `'published'`，无枚举约束。可插入任意字符串如 `'admin'`
- **Fix**: 使用 `pgEnum('project_status', ['draft', 'published', 'archived'])`

#### Issue #D5 — `notifications.type` 和 `relatedType` 为 varchar 无枚举约束
- **Severity**: LOW
- **File**: `apps/api/src/db/schema.ts:312-316`
- **Issue**: 通知类型和关联类型为自由文本，无枚举约束
- **Fix**: 使用 pgEnum 或至少在 Zod 校验中严格约束

---

## 四、汇总

### 按严重级别

| Severity | 数量 | 说明 |
|----------|------|------|
| CRITICAL | 0 | — |
| HIGH | 1 | Content Schema 字符串/数组全部缺 maxLength (#S1) |
| MEDIUM | 4 | config 宽泛 (#S6)、tags 无限制 (#S3)、rating 无 CHECK (#D2)、vote 无 CHECK (#D3) |
| LOW | 5 | 类型一致性问题、格式校验缺失 |

### 必须在 Batch 2 开始前修复的

1. **#S1** — 为所有 Content Schema 字段添加 maxLength（后端开发者在路由中应引用这些 schema）
2. **#D2** — rating CHECK 约束（数据库迁移应一并处理）
3. **#D3** — vote value CHECK 约束

### 可在后续批次修复的

- #S2, #S4 — version semver 格式校验
- #S5 — author ID UUID 格式
- #D1 — name 长度统一
- #D4, #D5 — pgEnum 替换 varchar

---

# Batch 2 安全审查 Checklist

> 以下 Checklist 供安全审计员在 Batch 2（评分/收藏/用户增强 API）代码完成后逐项验证。

## 1. 评分 API（`POST /api/resources/:id/rate`）

### 输入校验
- [ ] Zod schema 限制 `rating` 为 `z.number().int().min(1).max(5)`
- [ ] `resourceId` 参数校验为 UUID 格式
- [ ] 请求体仅包含 `rating` 字段，无多余字段被接受（Zod `.strict()` 或显式 `.pick()`）

### 认证与授权
- [ ] 路由使用 `authMiddleware` 保护，未登录返回 401
- [ ] 用户不能给自己的资源评分（ownership 检查）
- [ ] 已删除/未发布的资源不能被评分

### 防刷保护
- [ ] **Upsert 语义**：同一用户对同一资源重复评分应覆盖旧评分（uniqueIndex 保证）
- [ ] **速率限制**：评分端点限速（建议每用户每分钟 30 次）
- [ ] 不应暴露评分用户列表给前端（防止枚举攻击）

### 数据一致性
- [ ] `resourceRatings` 的 upsert 使用 `db.insert().onConflictDoUpdate()` 保证原子性
- [ ] `averageRating` / `ratingCount` 计算使用 SQL 聚合（AVG/COUNT），不是应用层计数
- [ ] DB 层有 `CHECK (rating >= 1 AND rating <= 5)` 约束（Issue #D2）

### 响应安全
- [ ] 响应不包含 `userId`（除非是当前用户自己的评分）
- [ ] 响应格式：`{ success: true, data: { averageRating, ratingCount, userRating? } }`

## 2. 收藏 API（Toggle）

### 输入校验
- [ ] `resourceId` 参数校验为 UUID 格式
- [ ] 请求体为空（toggle 无需额外参数）

### 认证与授权
- [ ] 路由使用 `authMiddleware` 保护
- [ ] 用户只能操作自己的收藏列表

### Toggle 原子性（关键！）
- [ ] **事务保护**：toggle 操作（查存在→插入/删除）使用 `db.transaction()`
- [ ] **无竞态条件**：不能出现重复收藏（uniqueIndex 兜底）
- [ ] 收藏数增减应在同一事务内完成
- [ ] 事务失败时回滚所有变更

### 响应安全
- [ ] 响应包含 `{ isFavorited: boolean }` 明确当前状态
- [ ] 不泄露其他用户的收藏信息

### 用户收藏列表 API
- [ ] `GET /api/users/:id/favorites` 支持分页（page, limit）
- [ ] 分页 limit 有最大值（不超过 100）
- [ ] 不暴露 `userId` 的收藏给其他用户（或需要授权）

## 3. 用户增强 API

### 统计面板（`GET /api/users/:id/stats`）

#### 数据隐私
- [ ] 仅返回公开统计数据（总下载、获赞、评分、加入天数）
- [ ] **不返回** email、passwordHash、githubId 等敏感字段
- [ ] 统计查询不暴露其他用户的关系数据

#### 查询安全
- [ ] `:id` 参数校验为 UUID
- [ ] 统计查询使用参数化查询（Drizzle query builder）
- [ ] 不使用 `SELECT *`（明确指定列）

### 活动时间线（`GET /api/users/:id/activity`）

#### 信息泄露防护
- [ ] 仅返回公开活动（发帖、上传资源、评论）
- [ ] **不包含**登录记录、密码修改、邮箱变更等隐私活动
- [ ] 未发布资源不出现在他人视角的活动时间线中
- [ ] 已删除的评论/资源不出现在时间线中

#### 查询安全
- [ ] 分页有最大 limit（100）
- [ ] 支持时间范围过滤时，日期格式校验
- [ ] 排序字段白名单（`createdAt`、`downloads` 等），不接受用户输入的任意字段名

### 用户点赞列表（`GET /api/users/:id/likes`）

#### 隐私保护
- [ ] 点赞列表是否公开需明确策略（建议：公开用户可看到谁点赞了，但列表仅返回资源摘要）
- [ ] 不返回点赞时间（可能泄露活跃时间）

### 用户评论列表（`GET /api/users/:id/comments`）

#### 安全
- [ ] 仅返回公开资源的评论
- [ ] 评论内容需经 Markdown 消毒（防止 XSS）
- [ ] 分页有最大 limit

## 4. 通用安全检查

### 速率限制（关键！）
- [ ] **评分**：每用户每分钟 ≤ 30 次
- [ ] **收藏 toggle**：每用户每分钟 ≤ 60 次
- [ ] **用户统计查询**：每用户每分钟 ≤ 120 次
- [ ] 建议使用 IP + userId 双重限速

### 错误处理
- [ ] 不在错误响应中泄露堆栈跟踪
- [ ] 不在错误响应中泄露数据库查询细节
- [ ] 404 vs 403 区分：资源不存在返回 404，无权限返回 403（但注意：不要通过 403 泄露资源是否存在）

### 响应头安全
- [ ] `Content-Type: application/json`
- [ ] 无 `X-Powered-By` 头
- [ ] CORS 限制正确的 origin（不使用 `*`）

### 参数注入
- [ ] 所有查询参数通过 Zod 校验（不直接使用 `req.query`/`c.req.query()`）
- [ ] URL 参数（`:id`）校验为 UUID
- [ ] 排序字段使用枚举白名单，不接受用户输入字符串

---

## 五、Batch 2 API 路由安全要求清单（供后端开发者参考）

| API 端点 | 方法 | 认证 | Zod 校验 | 速率限制 | 事务 |
|----------|------|------|----------|----------|------|
| `/api/resources/:id/rate` | POST | ✅ authMiddleware | rating: z.int().min(1).max(5) | 30/min | ✅ upsert |
| `/api/resources/:id/favorite` | POST | ✅ authMiddleware | resourceId: z.uuid() | 60/min | ✅ transaction |
| `/api/users/:id/stats` | GET | ❌ 公开 | id: z.uuid() | 120/min | ❌ |
| `/api/users/:id/activity` | GET | ❌ 公开 | id: z.uuid(), page/limit | 120/min | ❌ |
| `/api/users/:id/likes` | GET | ❌ 公开 | id: z.uuid(), page/limit | 120/min | ❌ |
| `/api/users/:id/comments` | GET | ❌ 公开 | id: z.uuid(), page/limit | 120/min | ❌ |
| `/api/users/:id/favorites` | GET | ✅ authMiddleware* | id: z.uuid(), page/limit | 120/min | ❌ |

> \* 收藏列表可能需要 authMiddleware，取决于隐私策略：仅本人可查看 vs 公开

---

## 附录：前置条件检查

Batch 2 开始前，以下前置安全项必须就绪：

1. **Zod Schema 增强**：Content Schema 字段添加 maxLength（Issue #S1）
2. **DB CHECK 约束**：rating 范围 1-5（Issue #D2）
3. **DB CHECK 约束**：vote value 仅 ±1（Issue #D3）
4. **速率限制中间件**：全局或路由级速率限制已实现
5. **错误格式统一**：所有错误响应格式 `{ success: false, error: string }`

---

*报告结束。安全审计员待命，等待 Batch 2 代码完成后进行逐项验证。*
