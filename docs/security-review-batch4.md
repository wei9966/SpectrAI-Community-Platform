# Batch 4 安全审计报告：Projects CRUD + MinIO 上传 + Schema 修复

> 审查日期：2026-03-31
> 审查范围：`projects.ts`、`uploads.ts`、`storage.ts`、`docker-compose.yml`、`env.ts`、`schema.ts`
> 审查员：安全审计员

---

## 审查总览

| 审查项 | 文件 | 状态 |
|--------|------|------|
| Projects CRUD | `apps/api/src/routes/projects.ts` | ⚠️ 有问题 |
| 文件上传 | `apps/api/src/routes/uploads.ts` | ⚠️ 有问题 |
| 存储工具 | `apps/api/src/lib/storage.ts` | ⚠️ 有问题 |
| 环境配置 | `apps/api/src/config/env.ts` | ⚠️ 有问题 |
| Docker Compose | `docker-compose.yml` | ⚠️ 有问题 |
| DB Schema | `apps/api/src/db/schema.ts` | ✅ 基本合格 |

---

## 一、Projects CRUD 审计（`projects.ts`）

### 1.1 认证/授权检查

| 操作 | 认证 | 所有权检查 | 管理员绕过 | 结果 |
|------|------|------------|-----------|------|
| `POST /` (创建) | ✅ L177 | N/A | N/A | ✅ PASS |
| `PUT /:id` (更新) | ✅ L198 | ✅ L216 `userId !== userId` | ❌ 无 | ⚠️ WARN |
| `DELETE /:id` (删除) | ✅ L234 | ✅ L247 | ✅ `role !== "admin"` | ✅ PASS |
| `POST /:id/resources` (关联) | ✅ L259 | ✅ L278 | ❌ 无 | ⚠️ WARN |
| `DELETE /:id/resources/:rid` (取消关联) | ✅ L322 | ✅ L340 | ❌ 无 | ⚠️ WARN |
| `GET /` (列表) | ❌ 公开 | N/A | N/A | ✅ PASS |
| `GET /:id` (详情) | ❌ 公开 | N/A | N/A | ⚠️ WARN |

### 发现的问题

#### Issue #P1 — 草稿项目对所有人可见（IDOR）
- **Severity**: HIGH
- **File**: `apps/api/src/routes/projects.ts:124-149`
- **Issue**: `GET /:id` 端点返回任何状态（包括 `draft`）的项目详情，无需认证。攻击者只要知道/猜测 UUID 就可查看他人未发布的草稿项目
- **Impact**: 未发布项目信息泄露（标题、描述、工具链、关联资源）
- **Fix**:
  ```typescript
  projectRoutes.get("/:id", optionalAuthMiddleware, async (c) => {
    const id = c.req.param("id");
    const currentUserId = c.get("user")?.userId;

    const [project] = await db.select({...}).from(projects)
      .where(eq(projects.id, id)).limit(1);

    if (!project) return c.json({...}, 404);

    // 非公开项目仅作者和管理员可见
    if (project.status !== 'published' && project.userId !== currentUserId) {
      return c.json({ success: false, error: "Project not found" }, 404);
    }
    ...
  });
  ```

#### Issue #P2 — 列表端点可查询他人草稿项目
- **Severity**: MEDIUM
- **File**: `apps/api/src/routes/projects.ts:59-63`
- **Issue**: `listQuerySchema` 允许传入 `status: "draft"` + `userId`，任何人可枚举查看某用户的草稿项目
- **Fix**: 非管理员/非本人不允许查 draft 状态
  ```typescript
  if (status === 'draft' && userId !== currentUserId && role !== 'admin') {
    return c.json({ success: false, error: '无权查看草稿' }, 403);
  }
  ```

#### Issue #P3 — `toolChain` 字段使用 `z.any()` 无校验（JSON 注入风险）
- **Severity**: HIGH
- **File**: `apps/api/src/routes/projects.ts:23`
- **Issue**: `toolChain: z.any().optional()` 允许传入任意 JSON 结构，包括：
  - 深层嵌套对象（DoS）
  - 超大 JSON 字符串
  - 恶意键名/值
- **Impact**: 存储滥用、DoS、潜在的下游代码在读取 toolChain 时被利用
- **Fix**: 定义具体的 toolChain schema
  ```typescript
  const toolChainItemSchema = z.object({
    name: z.string().max(100),
    version: z.string().max(50).optional(),
    url: z.string().max(500).optional(),
  });

  const toolChainSchema = z.array(toolChainItemSchema).max(20).optional();
  // 在 createProjectSchema 和 updateProjectSchema 中使用
  toolChain: toolChainSchema,
  ```

#### Issue #P4 — `tags` 数组无元素长度限制
- **Severity**: MEDIUM
- **File**: `apps/api/src/routes/projects.ts:24`
- **Issue**: `z.array(z.string()).optional()` 允许任意长度字符串和任意数量标签
- **Fix**: `z.array(z.string().min(1).max(50)).max(20).optional()`

#### Issue #P5 — `coverImage`/`demoUrl`/`sourceUrl` 无 URL 格式校验
- **Severity**: MEDIUM
- **File**: `apps/api/src/routes/projects.ts:20-22`
- **Issue**: 这些字段仅限制 `max(500)`，但接受任意字符串（包括 `javascript:alert(1)`、`data:text/html,...` 等危险协议）
- **Fix**:
  ```typescript
  const safeUrlSchema = z.string().max(500).url().refine(
    (url) => /^https?:\/\//i.test(url),
    { message: 'Only http/https URLs allowed' }
  ).optional();

  coverImage: safeUrlSchema,
  demoUrl: safeUrlSchema,
  sourceUrl: safeUrlSchema,
  ```

#### Issue #P6 — `description` 字段无 maxLength
- **Severity**: MEDIUM
- **File**: `apps/api/src/routes/projects.ts:19`
- **Issue**: `z.string().optional()` 无长度限制，而 DB 的 `description` 是 `text` 类型（无上限）。可提交超大文本
- **Fix**: `z.string().max(10000).optional()`

#### Issue #P7 — 更新操作缺少管理员绕过（与 resources.ts 不一致）
- **Severity**: LOW
- **File**: `apps/api/src/routes/projects.ts:216`
- **Issue**: PUT 更新仅检查 ownership，不允许 admin 代为编辑。而 DELETE 允许 admin 绕过。不一致的权限策略可能导致管理困难
- **建议**: 统一策略——admin 可编辑任何项目，或明确文档说明 admin 仅能删除不能编辑

#### Issue #P8 — 详情接口返回完整项目数据但未过滤 `status`
- **Severity**: MEDIUM
- **File**: `apps/api/src/routes/projects.ts:156-168`
- **Issue**: `GET /:id` 的关联资源查询未过滤 `isPublished`，可泄露未发布资源
- **Fix**: 添加 `eq(resources.isPublished, true)` 条件（对非作者）

---

## 二、文件上传审计（`uploads.ts` + `storage.ts`）

### 2.1 安全检查清单

| # | 安全要求 | 结果 | 说明 |
|---|----------|------|------|
| 1 | Presigned URL 短有效期 | ❌ FAIL | 默认 3600 秒（1 小时），过长 |
| 2 | 文件类型白名单 | ❌ FAIL | `contentType` 仅校验 max(100)，无白名单 |
| 3 | 文件大小限制 | ❌ FAIL | 服务端无 maxSize 检查 |
| 4 | 文件名路径遍历防护 | ✅ PASS | L34 重命名为时间戳+随机字符串 |
| 5 | S3 凭据从环境变量读取 | ✅ PASS | L18-20 从 env 读取 |
| 6 | 文件夹白名单 | ✅ PASS | L16 枚举限制 |
| 7 | 上传需要认证 | ✅ PASS | L26 authMiddleware |
| 8 | MinIO bucket 默认 private | ⚠️ WARN | 未见 bucket 策略配置代码 |
| 9 | 确认端点校验文件是否真实上传 | ❌ FAIL | L51-66 仅返回 URL，未验证 |
| 10 | 防止其他用户覆盖文件 | ✅ PASS | key 包含 userId (L35) |

### 发现的问题

#### Issue #U1 — Presigned URL 过期时间过长（1 小时）
- **Severity**: HIGH
- **File**: `apps/api/src/lib/storage.ts:34`
- **Issue**: `expiresIn = 3600`（1 小时）远超需要。用户通常在几秒到几分钟内完成上传。长时间有效的 presigned URL 增加 URL 泄露后被滥用的风险
- **Impact**: URL 泄露后攻击者有 1 小时窗口可上传任意内容
- **Fix**: 缩短到 5 分钟（300 秒）
  ```typescript
  export async function getPresignedUploadUrl(
    key: string,
    contentType: string,
    expiresIn = 300  // 5 minutes
  ): Promise<string> {
  ```

#### Issue #U2 — 无文件类型白名单（任意文件类型可上传）
- **Severity**: HIGH
- **File**: `apps/api/src/routes/uploads.ts:13-17`
- **Issue**: `contentType: z.string().min(1).max(100)` 接受任意 Content-Type。攻击者可上传：
  - `text/html` → 可能被浏览器直接渲染为 HTML（XSS）
  - `application/x-executable` → 恶意可执行文件
  - `application/pdf` → 恶意 PDF（含 JS）
  - `image/svg+xml` → SVG 内嵌 `<script>`（XSS）
- **Fix**: 添加白名单
  ```typescript
  const ALLOWED_CONTENT_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
  ] as const;

  const presignSchema = z.object({
    filename: z.string().min(1).max(255),
    contentType: z.enum(ALLOWED_CONTENT_TYPES),
    folder: z.enum(["avatars", "covers", "uploads"]).default("uploads"),
  });
  ```

#### Issue #U3 — 无文件大小限制
- **Severity**: HIGH
- **File**: `apps/api/src/routes/uploads.ts` + `apps/api/src/lib/storage.ts`
- **Issue**: 服务端无任何文件大小检查。攻击者可通过 presigned URL 上传任意大小文件到 MinIO，导致存储滥用
- **Impact**: 磁盘空间耗尽、存储成本飙升
- **Fix**:
  ```typescript
  // 方案 1: 在 presign 请求中要求提供 fileSize 并限制
  const presignSchema = z.object({
    filename: z.string().min(1).max(255),
    contentType: z.enum(ALLOWED_CONTENT_TYPES),
    folder: z.enum(["avatars", "covers", "uploads"]).default("uploads"),
    fileSize: z.number().int().max(5 * 1024 * 1024),  // 5MB max
  });

  // 方案 2: 在 PutObjectCommand 中设置 Content-Length 限制
  // MinIO 支持通过 bucket policy 限制大小
  ```

#### Issue #U4 — SVG 上传导致 XSS（如果白名单包含 SVG）
- **Severity**: HIGH (如果允许 SVG)
- **File**: `apps/api/src/lib/storage.ts`
- **Issue**: 如果未来将 `image/svg+xml` 加入白名单，SVG 文件可内嵌 JavaScript。浏览器直接访问 SVG URL 会执行脚本
- **Fix**: **永远不要在白名单中包含 `image/svg+xml`**

#### Issue #U5 — 确认端点不验证文件是否真实上传
- **Severity**: MEDIUM
- **File**: `apps/api/src/routes/uploads.ts:51-66`
- **Issue**: `POST /confirm` 仅接收 `key` 并返回 `publicUrl`，未验证文件是否真正存在于 MinIO。攻击者可：
  1. 获取 presigned URL（不执行上传）
  2. 调用 confirm 拿到 publicUrl
  3. 将此 URL 存入项目 coverImage → 显示 broken image
- **Fix**: 在 confirm 时验证文件存在
  ```typescript
  uploadRoutes.post("/confirm", authMiddleware, zValidator("json", confirmSchema), async (c) => {
    const { key } = c.req.valid("json");
    const { userId } = c.get("user");

    // 验证 key 属于当前用户
    if (!key.startsWith(`avatars/${userId}/`) &&
        !key.startsWith(`covers/${userId}/`) &&
        !key.startsWith(`uploads/${userId}/`)) {
      return c.json({ success: false, error: "Invalid key" }, 403);
    }

    // 验证文件存在（HEAD 请求）
    try {
      await headObject(key);  // 需新增此函数
    } catch {
      return c.json({ success: false, error: "File not uploaded" }, 400);
    }

    return c.json({ success: true, data: { key, url: getPublicUrl(key) } });
  });
  ```

#### Issue #U6 — confirm 端点未校验 key 所属用户
- **Severity**: MEDIUM
- **File**: `apps/api/src/routes/uploads.ts:55-56`
- **Issue**: 用户 A 可以传入属于用户 B 的 key（如 `avatars/userB-uuid/xxx.jpg`），确认后拿到用户 B 上传文件的 publicUrl。虽然不会修改文件，但可以冒用他人图片
- **Fix**: 验证 key 包含当前用户 ID（见 #U5 的修复代码）

#### Issue #U7 — `getPublicUrl` 构建直接访问 URL（bucket 可能非 private）
- **Severity**: MEDIUM
- **File**: `apps/api/src/lib/storage.ts:75-78`
- **Issue**: `getPublicUrl` 返回直接访问的 HTTP URL。如果 MinIO bucket 策略允许公开读取，所有上传文件直接可访问。如果 bucket 是 private 的，此 URL 将返回 403
- **建议**:
  - 确保 MinIO bucket 默认 **private**
  - 如果需要公开访问图片，使用 presigned GET URL（短有效期）
  - 或配置 CDN/反向代理（如 Nginx）在认证后代理 MinIO

---

## 三、DB Schema 修复验证

### 3.1 toolChain (jsonb) 字段

| 检查项 | 结果 | 说明 |
|--------|------|------|
| JSON 注入防护 | ❌ FAIL | `z.any()` 无校验（#P3） |
| 存储大小限制 | ❌ FAIL | jsonb 无大小限制 |
| 查询安全性 | ✅ PASS | Drizzle 参数化查询 |

### 3.2 tags (text[]) 字段

| 检查项 | 结果 | 说明 |
|--------|------|------|
| 数组长度限制 | ❌ FAIL | 无限制（#P4） |
| 元素长度限制 | ❌ FAIL | 无限制（#P4） |

### 3.3 外键 Cascade 删除

| 关系 | 行为 | 风险评估 |
|------|------|---------|
| `projects.userId → users.id` (cascade) | 用户删除 → 项目全删 | ✅ 合理 |
| `projectResources.projectId → projects.id` (cascade) | 项目删除 → 关联删除 | ✅ 合理 |
| `projectResources.resourceId → resources.id` (cascade) | 资源删除 → 关联删除 | ✅ 合理 |
| `projects.status` varchar → 无枚举约束 | 可插入任意值 | ⚠️ 已在 Batch 1 记录 (#D4) |

### 3.4 Schema 变更新增字段审查

DB schema 新增了 `createdAt` 和 `updatedAt` 时间戳字段（L182-187），以及 `status` 字段从 varchar(20) 改为默认 `published`。`status` 仍使用 varchar 而非 pgEnum，已知问题。

---

## 四、Docker Compose / MinIO 配置审计

### 发现的问题

#### Issue #D1 — MinIO 默认凭据 `minioadmin/minioadmin`
- **Severity**: HIGH
- **File**: `docker-compose.yml:50-51`
- **Issue**: 默认凭据 `minioadmin/minioadmin` 在生产环境极度危险。虽然有 `${MINIO_ACCESS_KEY:-minioadmin}` 的环境变量覆盖机制，但如果不设置环境变量就会使用默认值
- **Impact**: 攻击者可用默认凭据访问/删除/覆盖所有上传文件
- **Fix**:
  1. 生产环境 **必须** 通过 `.env` 设置强密码
  2. 默认值应改为空字符串并要求配置
  ```yaml
  MINIO_ROOT_USER: ${MINIO_ACCESS_KEY:?MINIO_ACCESS_KEY must be set}
  MINIO_ROOT_PASSWORD: ${MINIO_SECRET_KEY:?MINIO_SECRET_KEY must be set}
  ```

#### Issue #D2 — MinIO Console 端口暴露
- **Severity**: MEDIUM
- **File**: `docker-compose.yml:54`
- **Issue**: MinIO Console（管理界面）绑定到 `9001` 端口并暴露到主机。生产环境中管理界面不应对外暴露
- **Fix**: 生产环境移除 console 端口映射，或仅绑定到 127.0.0.1
  ```yaml
  ports:
    - "127.0.0.1:${MINIO_CONSOLE_PORT:-9001}:9001"
  ```

#### Issue #D3 — PostgreSQL 默认弱密码
- **Severity**: MEDIUM
- **File**: `docker-compose.yml:11`
- **Issue**: `POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-password}` 默认密码是 `password`
- **Fix**: 使用 `?` 语法要求必须设置

#### Issue #D4 — env.ts 中 MINIO 凭据有弱默认值
- **Severity**: MEDIUM
- **File**: `apps/api/src/config/env.ts:18-19`
- **Issue**: `MINIO_ACCESS_KEY: z.string().default("minioadmin")` 和 `MINIO_SECRET_KEY: z.string().default("minioadmin")`。生产环境不应有默认值
- **Fix**: 生产环境移除默认值或改为空字符串 + `.min(1)` 校验

#### Issue #D5 — Redis 无认证
- **Severity**: LOW
- **File**: `docker-compose.yml:27-30`
- **Issue**: Redis 无密码保护，且暴露到主机端口。虽然在内网，但最佳实践是启用 `--requirepass`
- **Fix**: `command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD:-redis123}`

---

## 五、汇总

### 按严重级别

| Severity | 数量 | Issue IDs |
|----------|------|-----------|
| CRITICAL | 0 | — |
| HIGH | 5 | #P1(草稿泄露), #P3(toolChain无校验), #U1(URL过期1h), #U2(无文件类型白名单), #U3(无大小限制) |
| MEDIUM | 8 | #P2(列表查草稿), #P4(tags无限制), #P5(URL无协议白名单), #P6(description无maxLength), #P8(未发布资源泄露), #U5(confirm不验证), #U6(key不校验所属), #D2(console暴露), #D3(弱密码), #D4(env默认值) |
| LOW | 3 | #P7(admin绕过不一致), #D5(redis无认证), #U7(publicUrl策略) |

### 必须修复（阻塞上线）

1. **#U2** — 添加文件类型白名单（仅 image/jpeg, image/png, image/gif, image/webp）
2. **#U3** — 添加文件大小限制（5MB）
3. **#U1** — 缩短 presigned URL 过期时间到 5 分钟
4. **#P1** — 草稿项目仅作者和管理员可见
5. **#P3** — toolChain 使用具体 Zod schema 替代 `z.any()`
6. **#D1** — MinIO 默认凭据必须移除或强制配置

### 建议修复

7. **#P5** — URL 字段添加协议白名单（仅 https?）
8. **#U5** — confirm 端点验证文件存在
9. **#U6** — confirm 端点验证 key 所属用户
10. **#P4** — tags 添加元素长度和数量限制
11. **#P6** — description 添加 maxLength

### 可接受/延后

12. **#P7** — admin 绕过策略不一致（功能决策，非安全漏洞）
13. **#D5** — Redis 认证（内网环境可接受）
14. **#U7** — publicUrl 策略取决于 bucket 策略

---

## 六、关键修复代码示例

### uploads.ts — 安全加固后的 presign

```typescript
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const presignSchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.enum(ALLOWED_TYPES),
  folder: z.enum(["avatars", "covers", "uploads"]).default("uploads"),
  fileSize: z.number().int().min(1).max(MAX_FILE_SIZE),
});

uploadRoutes.post("/presign", authMiddleware, zValidator("json", presignSchema), async (c) => {
  const { userId } = c.get("user");
  const { filename, contentType, folder } = c.req.valid("json");

  const ext = filename.split(".").pop()?.toLowerCase() || "";
  const ALLOWED_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
  if (!ALLOWED_EXTS.includes(ext)) {
    return c.json({ success: false, error: "Invalid file extension" }, 400);
  }

  const safeFilename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const key = `${folder}/${userId}/${safeFilename}`;

  const uploadUrl = await getPresignedUploadUrl(key, contentType, 300); // 5 minutes

  return c.json({
    success: true,
    data: { uploadUrl, key, publicUrl: getPublicUrl(key) },
  });
});
```

---

*报告结束。建议修复 #U1、#U2、#U3、#P1、#P3、#D1 后再次提交审查。*
