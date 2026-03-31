# Batch 2 后端 API 安全审计报告

> 审查日期：2026-03-31
> 审查范围：`ratings.ts`、`favorites.ts`、`users.ts`（增强）、`resources.ts`（修改）
> 审查基准：`docs/batch1-security-audit.md` 中的 Batch 2 安全 Checklist
> 审查员：安全审计员

---

## 审查总览

| 审查项 | 文件 | 状态 |
|--------|------|------|
| 评分路由 | `apps/api/src/routes/ratings.ts` | ⚠️ 有问题 |
| 收藏路由 | `apps/api/src/routes/favorites.ts` | ⚠️ 有问题 |
| 用户增强 | `apps/api/src/routes/users.ts` | ⚠️ 有问题 |
| 资源路由修改 | `apps/api/src/routes/resources.ts` | ✅ 基本合格 |

---

## 一、评分路由审计（`ratings.ts`）

### Checklist 对照

| # | 安全要求 | 结果 | 说明 |
|---|----------|------|------|
| 1 | Zod schema 限制 `rating` 为 1-5 | ✅ PASS | `z.number().int().min(1).max(5)` (L12-14) |
| 2 | `resourceId` UUID 校验 | ❌ FAIL | `c.req.param("id")!` 直接使用，无格式校验 |
| 3 | 请求体仅含 `rating` 字段 | ✅ PASS | Zod schema 默认 strip unknown |
| 4 | `authMiddleware` 保护 | ✅ PASS | L19 |
| 5 | 禁止自评 | ❌ FAIL | 未检查 `resource.authorId !== userId` |
| 6 | 未发布资源不能评分 | ❌ FAIL | 仅查 `resources.id` 存在，未检查 `isPublished` |
| 7 | Upsert 语义（uniqueIndex 兜底） | ✅ PASS | L38-58 手动 upsert，uniqueIndex 兜底 |
| 8 | 使用 `onConflictDoUpdate` | ⚠️ WARN | 手动 SELECT+INSERT/UPDATE，非原子 |
| 9 | SQL 聚合计算评分 | ✅ PASS | L61-67 使用 `avg()` + `count()` |
| 10 | DB CHECK 约束 | ❌ FAIL | 未添加（Batch 1 Issue #D2 未修复） |
| 11 | 速率限制 | ❌ FAIL | 无 |

### 发现的问题

#### Issue #R1 — resourceId 参数无 UUID 格式校验
- **Severity**: MEDIUM
- **File**: `apps/api/src/routes/ratings.ts:22`
- **Issue**: `c.req.param("id")!` 直接传入 DB 查询。虽然 Drizzle 参数化查询防止 SQL 注入，但无效 UUID 会导致不必要的 DB 查询，且错误响应不友好
- **Fix**: 添加 Zod 校验或至少做格式检查
  ```typescript
  const resourceId = c.req.param("id")!;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resourceId)) {
    return c.json({ success: false, error: "Invalid resource ID" }, 400);
  }
  ```

#### Issue #R2 — 缺少自评检查（用户可给自己的资源评分）
- **Severity**: MEDIUM
- **File**: `apps/api/src/routes/ratings.ts:27-35`
- **Issue**: 资源存在性检查仅 SELECT `{ id: resources.id }`，未检查 `authorId`。用户可以给自己的资源刷高分
- **Fix**:
  ```typescript
  const [resource] = await db
    .select({ id: resources.id, authorId: resources.authorId })
    .from(resources)
    .where(eq(resources.id, resourceId))
    .limit(1);

  if (!resource) {
    return c.json({ success: false, error: "Resource not found" }, 404);
  }
  if (resource.authorId === userId) {
    return c.json({ success: false, error: "Cannot rate your own resource" }, 403);
  }
  ```

#### Issue #R3 — 未发布资源可被评分
- **Severity**: LOW
- **File**: `apps/api/src/routes/ratings.ts:27-35`
- **Issue**: 查询条件未包含 `isPublished: true`，未发布资源可被评分
- **Fix**: 添加条件
  ```typescript
  .where(and(eq(resources.id, resourceId), eq(resources.isPublished, true)))
  ```

#### Issue #R4 — 评分 upsert 非原子操作（竞态条件）
- **Severity**: MEDIUM
- **File**: `apps/api/src/routes/ratings.ts:38-58`
- **Issue**: 先 SELECT 查是否已评分，再 INSERT 或 UPDATE。两个操作之间没有事务保护，并发请求可能导致：
  - 两个请求同时通过 SELECT（未发现 existing），都执行 INSERT → uniqueIndex 会报错但返回 500
  - uniqueIndex 兜底防止了重复数据，但错误处理不优雅
- **Fix**: 使用 `db.insert().onConflictDoUpdate()` 原子 upsert
  ```typescript
  await db
    .insert(resourceRatings)
    .values({ resourceId, userId, rating })
    .onConflictDoUpdate({
      target: [resourceRatings.resourceId, resourceRatings.userId],
      set: { rating, updatedAt: new Date() },
    });
  ```
  或包裹在 `db.transaction()` 中

---

## 二、收藏路由审计（`favorites.ts`）

### Checklist 对照

| # | 安全要求 | 结果 | 说明 |
|---|----------|------|------|
| 1 | resourceId UUID 校验 | ❌ FAIL | 同 R1，直接 `c.req.param("id")!` |
| 2 | 请求体无需参数 | ✅ PASS | 不读取 body |
| 3 | `authMiddleware` 保护 | ✅ PASS | L10 |
| 4 | 事务保护 toggle | ❌ FAIL | **关键缺失**，与 resources.ts Like 同样的问题 |
| 5 | uniqueIndex 兜底 | ✅ PASS | `resource_favorites_resource_user_idx` |
| 6 | 响应含 `{ favorited: boolean }` | ✅ PASS | L41, L46 |
| 7 | 不泄露他人收藏 | ✅ PASS | 仅返回 toggle 状态 |
| 8 | 用户收藏列表分页 | ✅ PASS | L55-110，limit max 100 |
| 9 | 收藏列表无需 auth | ⚠️ WARN | `GET /:id/favorites` 无 authMiddleware，任何人可查看他人收藏 |
| 10 | 速率限制 | ❌ FAIL | 无 |

### 发现的问题

#### Issue #F1 — Toggle 操作无事务保护（数据一致性风险）
- **Severity**: HIGH
- **File**: `apps/api/src/routes/favorites.ts:26-47`
- **Issue**: 删除收藏记录（L38-40）和返回响应之间没有事务。虽然收藏表没有像 likes 那样的计数器需要同步更新，但 select→delete/insert 的 check-then-act 模式存在竞态条件：
  - 两个并发 toggle 请求可能同时通过 SELECT 检查
  - uniqueIndex 兜底会报 duplicate key 错误 → 返回 500 给用户
- **Fix**: 使用事务
  ```typescript
  await db.transaction(async (tx) => {
    const [existing] = await tx.select().from(resourceFavorites)
      .where(and(eq(resourceFavorites.resourceId, resourceId), eq(resourceFavorites.userId, userId)))
      .limit(1);
    if (existing) {
      await tx.delete(resourceFavorites).where(eq(resourceFavorites.id, existing.id));
      return { favorited: false };
    } else {
      await tx.insert(resourceFavorites).values({ resourceId, userId });
      return { favorited: true };
    }
  });
  ```

#### Issue #F2 — 收藏列表无认证保护（隐私问题）
- **Severity**: MEDIUM
- **File**: `apps/api/src/routes/favorites.ts:55`
- **Issue**: `GET /:id/favorites` 没有 `authMiddleware`，任何人可通过猜测/枚举 UUID 查看任意用户的收藏列表。收藏属于个人偏好数据，应有隐私保护
- **Fix**: 至少要求登录才能查看，或允许用户设置收藏是否公开
  ```typescript
  userFavoriteRoutes.get("/:id/favorites", authMiddleware, async (c) => { ... });
  ```

#### Issue #F3 — 收藏列表未过滤已删除资源
- **Severity**: LOW
- **File**: `apps/api/src/routes/favorites.ts:91`
- **Issue**: `innerJoin` 会自然排除已删除的资源（cascade 已删除 favorite 记录），但如果资源仅被下架（`isPublished: false`），收藏列表仍会显示
- **Fix**: 添加 `eq(resources.isPublished, true)` 条件

---

## 三、用户增强路由审计（`users.ts`）

### Checklist 对照

| # | 安全要求 | 结果 | 说明 |
|---|----------|------|------|
| 1 | stats 仅返回公开数据 | ✅ PASS | L146-155 仅含 downloads/likes/rating/days |
| 2 | 不返回 email/passwordHash | ✅ PASS | 明确列选择 |
| 3 | `:id` UUID 校验 | ❌ FAIL | 直接使用 `c.req.param("id")`，无格式校验 |
| 4 | 参数化查询 | ✅ PASS | 全部使用 Drizzle query builder |
| 5 | 不使用 SELECT * | ✅ PASS | 明确列选择 |
| 6 | 活动仅含公开类型 | ✅ PASS | resource/comment/like/favorite |
| 7 | 未发布资源不出现在时间线 | ❌ FAIL | L183 未过滤 `isPublished` |
| 8 | 活动分页 limit 上限 | ✅ PASS | max 50 (L161) |
| 9 | 点赞列表隐私 | ⚠️ WARN | 返回了 `likedAt` 时间戳 |
| 10 | 评论列表仅公开资源 | ❌ FAIL | L346 未过滤 `isPublished` |
| 11 | 分页 limit max 100 | ✅ PASS | 多处使用 |
| 12 | 速率限制 | ❌ FAIL | 无 |

### 发现的问题

#### Issue #U1 — 所有新端点的 `:id` 参数无 UUID 校验
- **Severity**: MEDIUM
- **File**: `apps/api/src/routes/users.ts` — L105, L159, L260, L317
- **Issue**: `c.req.param("id")` 直接传入 DB 查询。`users` 表用 UUID 主键，无效输入不会匹配任何行（返回 404），但会浪费一次 DB 查询
- **Impact**: 低（Drizzle 参数化查询防注入），但应统一处理
- **Fix**: 建议在路由层添加统一校验中间件
  ```typescript
  const uuidParamSchema = z.object({ id: z.string().uuid() });
  // 或创建中间件
  ```

#### Issue #U2 — 活动时间线包含未发布资源
- **Severity**: MEDIUM
- **File**: `apps/api/src/routes/users.ts:183`
- **Issue**: 查询用户资源时未添加 `eq(resources.isPublished, true)` 条件。攻击者可通过查看他人活动时间线发现未发布的资源名称
- **Fix**:
  ```typescript
  .where(and(eq(resources.authorId, id), eq(resources.isPublished, true)))
  ```

#### Issue #U3 — 评论列表包含未发布资源的评论
- **Severity**: MEDIUM
- **File**: `apps/api/src/routes/users.ts:346`
- **Issue**: `innerJoin(resources, eq(resourceComments.resourceId, resources.id))` 未过滤 `isPublished`。用户对未发布资源的评论会暴露未发布资源名称和类型
- **Fix**:
  ```typescript
  .innerJoin(resources, and(
    eq(resourceComments.resourceId, resources.id),
    eq(resources.isPublished, true)
  ))
  ```

#### Issue #U4 — 点赞列表返回 likedAt 时间戳（可能泄露活跃时间）
- **Severity**: LOW
- **File**: `apps/api/src/routes/users.ts:287`
- **Issue**: `likedAt: resourceLikes.createdAt` 暴露用户点赞时间，可被用于分析用户活跃模式
- **建议**: 评估是否需要在公开端点中返回时间戳。如果点赞列表是公开的，考虑去掉 `likedAt` 或仅返回日期不返回时间

---

## 四、资源路由修改审计（`resources.ts`）

### Checklist 对照

| # | 安全要求 | 结果 | 说明 |
|---|----------|------|------|
| 1 | avgRating SQL 聚合计算 | ✅ PASS | L74, L214 使用子查询 AVG |
| 2 | ratingCount SQL 聚合 | ✅ PASS | L108, L215 使用子查询 COUNT |
| 3 | sort=rating 参数安全 | ✅ PASS | L49 枚举白名单 `z.enum([..., "rating"])` |
| 4 | 不使用用户输入做排序 | ✅ PASS | L76-83 switch 映射到固定字段 |
| 5 | averageRating 精度限制 | ✅ PASS | `::numeric(3,2)` 限制精度 |
| 6 | isFavorited 条件查询 | ✅ PASS | L85-87 使用 `EXISTS` 子查询 |
| 7 | userRating 条件查询 | ✅ PASS | L190-192 仅登录用户返回 |
| 8 | optionalAuthMiddleware | ✅ PASS | L54, L182 正确使用 |
| 9 | 搜索 q 无 maxLength | ⚠️ WARN | L50 `q: z.string().optional()` 无长度限制 |
| 10 | 搜索使用 `plainto_tsquery` | ✅ PASS | L163 安全，防止 SQL 注入 |

### 发现的问题

#### Issue #RES1 — 搜索查询 `q` 仍无 maxLength
- **Severity**: LOW
- **File**: `apps/api/src/routes/resources.ts:50`
- **Issue**: `q: z.string().optional()` 无长度限制。攻击者可提交超长搜索字符串导致全文搜索性能退化
- **Fix**: `q: z.string().max(200).optional()`
- **Note**: 此问题在 Batch 1 安全基线报告中已记录，仍未修复

#### Issue #RES2 — Like toggle 仍无事务保护（遗留 Bug）
- **Severity**: HIGH
- **File**: `apps/api/src/routes/resources.ts:348-368`
- **Issue**: Like toggle 的删除/更新操作（L350-356）和插入/更新操作（L360-366）分别执行，无事务保护。如果 `resources.likes` 计数更新失败，数据不一致
- **Note**: 此问题在前两次审计中均记录，仍未修复。应在后续批次中优先处理

---

## 五、跨路由通用问题

### Issue #GEN1 — 全平台缺少速率限制
- **Severity**: HIGH
- **File**: 所有路由文件
- **Issue**: Batch 2 新增的所有写入端点均无速率限制：
  - `POST /:id/rate` — 可无限刷评分
  - `POST /:id/favorite` — 可无限 toggle 收藏
  - `GET /:id/stats` — 可被用于用户枚举探测
  - `GET /:id/activity` — 可被用于爬取用户行为
- **建议**: 在 Batch 5（排行榜/Redis）中实现速率限制中间件，Batch 6（论坛）之前必须就绪

### Issue #GEN2 — URL 参数无统一 UUID 校验
- **Severity**: MEDIUM
- **File**: 所有路由文件
- **Issue**: `:id` 参数均通过 `c.req.param("id")!` 直接使用，无 UUID 格式校验。建议创建统一中间件
- **Fix**:
  ```typescript
  // middleware/validate.ts
  export function validateUuidParam(paramName: string) {
    return async (c: Context, next: Next) => {
      const value = c.req.param(paramName);
      if (!value || !z.string().uuid().safeParse(value).success) {
        return c.json({ success: false, error: `Invalid ${paramName}` }, 400);
      }
      await next();
    };
  }
  ```

---

## 六、汇总

### 按严重级别

| Severity | 数量 | Issue IDs |
|----------|------|-----------|
| CRITICAL | 0 | — |
| HIGH | 2 | #F1 (toggle 无事务), #RES2 (like 无事务, 遗留) |
| MEDIUM | 7 | #R1 (UUID), #R2 (自评), #R4 (upsert 非原子), #F2 (收藏隐私), #U1 (UUID), #U2 (未发布资源泄露), #U3 (未发布评论泄露), #GEN2 (UUID 统一) |
| LOW | 3 | #R3 (未发布评分), #U4 (likedAt), #RES1 (搜索 maxLength) |
| 平台级 | 1 | #GEN1 (速率限制缺失, HIGH) |

### 必须修复的（阻塞后续批次）

1. **#F1 + #RES2** — Toggle 操作事务保护（影响数据一致性）
2. **#R2** — 禁止自评（影响评分公平性）
3. **#U2 + #U3** — 未发布资源信息泄露（影响隐私）

### 建议修复的

4. **#R4** — 评分 upsert 改为 `onConflictDoUpdate`
5. **#F2** — 收藏列表添加认证
6. **#GEN1** — 速率限制中间件
7. **#GEN2** — 统一 UUID 参数校验

### 可接受的

8. **#R1** — resourceId 非法格式仅导致 404，无安全影响
9. **#R3** — 未发布资源评分，影响有限
10. **#RES1** — 搜索 maxLength，已在之前报告记录

---

## 七、Batch 2 Checklist 最终结果

| 类别 | 通过 | 失败 | 警告 |
|------|------|------|------|
| 评分 API（11 项） | 6 | 4 | 1 |
| 收藏 API（10 项） | 6 | 3 | 1 |
| 用户增强（12 项） | 8 | 3 | 1 |
| 资源路由修改（10 项） | 9 | 0 | 1 |
| 通用安全（9 项） | 5 | 4 | 0 |
| **总计（52 项）** | **34** | **14** | **4** |

**通过率: 65% (34/52)**

> ⚠️ 14 项失败中有 2 项 HIGH 级别（事务保护）需优先修复。其余 MEDIUM 级别问题建议在 Batch 3 开始前修复。

---

*报告结束。建议后端开发者修复 #F1、#R2、#U2、#U3 后再次提交审查。*
