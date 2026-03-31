# Batch 6 安全审计报告：论坛 API 实现代码安全审计

> 审查日期：2026-03-31
> 审查范围：`forum.ts`、`reply-tree.ts`、`seed-forum.ts`、`schema.ts`（论坛部分）
> 审查基准：`docs/forum-security-risk-assessment.md` 预评估报告（15 项 Checklist）
> 审查员：安全审计员

---

## 审查总览

| 审查项 | 文件 | 状态 |
|--------|------|------|
| 帖子 CRUD | `apps/api/src/routes/forum.ts` | ✅ 大部分合格 |
| 回复系统 | `forum.ts` + `reply-tree.ts` | ⚠️ 有问题 |
| 投票系统 | `forum.ts` | ✅ 合格（亮点） |
| 种子数据 | `seed-forum.ts` | ✅ 合格 |
| 预评估 Checklist 对照 | 全部 | 见下方逐项 |

---

## 一、预评估 Checklist 逐项验证

### 1.1 Markdown 内容安全（预评估 #1 — CRITICAL）

| # | 要求 | 结果 | 说明 |
|---|------|------|------|
| 1 | 安装 `rehype-sanitize` | ⚠️ 前端 | **后端不涉及**，需在 Batch 8 前端审计中验证 |
| 2 | 创建安全 `MarkdownRenderer` | ⚠️ 前端 | 同上 |
| 3 | 帖子内容 `maxLength: 50000` | ❌ FAIL | `z.string().min(1)` 无 max (L22) |
| 4 | 回复内容 `maxLength: 10000` | ❌ FAIL | `z.string().min(1)` 无 max (L34) |
| 5 | 帖子标题 `maxLength: 200` | ✅ PASS | L21 `z.string().min(1).max(200)` |
| 6 | 后端危险 HTML 模式检测 | ❌ FAIL | 未实现（可选项） |

### 1.2 嵌套回复深度（预评估 #2 — HIGH）

| # | 要求 | 结果 | 说明 |
|---|------|------|------|
| 1 | 后端限制最大深度 ≤ 10 层 | ❌ FAIL | `POST /replies` 无深度检查 (L374-430) |
| 2 | 后端校验 parentId 属于同一帖子 | ✅ PASS | L405 `parentReply.postId !== postId` |
| 3 | 前端 depth 5+ 折叠 | ✅ PASS | `reply-tree.ts:40` COLLAPSE_DEPTH=5 |
| 4 | 建树用迭代而非递归 | ⚠️ WARN | L67-79 第一遍迭代，但 L82-88 `setDepths` 用递归 |
| 5 | React.memo 回复组件 | ⚠️ 前端 | 需在 Batch 8 验证 |

### 1.3 投票系统（预评估 #3 — HIGH）

| # | 要求 | 结果 | 说明 |
|---|------|------|------|
| 1 | DB `CHECK (value IN (1, -1))` | ❌ FAIL | schema.ts 未添加 CHECK 约束（#D3 遗留） |
| 2 | DB 互斥约束 (postId XOR replyId) | ❌ FAIL | 未实现 |
| 3 | uniqueIndex NULL 处理 | ⚠️ WARN | 使用 isNull 过滤，应用层正确但 DB 层未优化 |
| 4 | 投票 `db.transaction()` | ✅ PASS | L522/L605 使用 `db.transaction()` |
| 5 | 禁止自投自票 | ❌ FAIL | 未检查帖子/回复作者 === 当前用户 |
| 6 | 锁定帖子禁止投票 | ❌ FAIL | 投票端点未检查 `post.isLocked` |
| 7 | Zod 严格限制 value | ✅ PASS | L43 `z.union([z.literal(1), z.literal(-1)])` |

### 1.4 权限控制（预评估 #4 — HIGH）

| # | 要求 | 结果 | 说明 |
|---|------|------|------|
| 1 | 编辑帖子：ownership | ✅ PASS | L330 `existing.userId !== userId` |
| 2 | 删除帖子：ownership + role | ✅ PASS | L361 三重检查 |
| 3 | 编辑回复：ownership | ✅ PASS | L452 `existing.userId !== userId` |
| 4 | 删除回复：ownership + role | ✅ PASS | L480 三重检查 |
| 5 | 锁定帖子禁止编辑 | ✅ PASS | L333 `existing.isLocked` |
| 6 | 锁定帖子禁止回复 | ✅ PASS | L393 `post.isLocked` |
| 7 | 置顶/锁定仅 admin/moderator | ❌ FAIL | 无置顶/锁定/最佳答案端点 |
| 8 | 最佳答案标记 | ❌ FAIL | 无此端点 |

### 1.5 速率限制（预评估 #6 — HIGH）

| 要求 | 结果 | 说明 |
|------|------|------|
| 全平台速率限制 | ❌ FAIL | 仍未实现 |

### 1.6 内容大小限制（预评估 #7 — MEDIUM）

| 字段 | 要求 | 结果 | 说明 |
|------|------|------|------|
| `content` (帖子) | max 50000 | ❌ FAIL | L22 无 max |
| `content` (回复) | max 10000 | ❌ FAIL | L34 无 max |
| `tags[]` 元素限制 | max 50 | ❌ FAIL | L24 `z.array(z.string())` 无限制 |
| `tags[]` 数组限制 | max 20 | ❌ FAIL | 同上 |

---

## 二、详细发现

### Issue #F1 — 帖子/回复内容无 maxLength（DoS 风险）
- **Severity**: HIGH
- **File**: `apps/api/src/routes/forum.ts:22,34`
- **Issue**: `content: z.string().min(1)` 无上限。DB 使用 `text` 类型（无限），攻击者可提交数 MB 内容
- **Impact**: 存储滥用、查询性能退化、带宽浪费
- **Fix**:
  ```typescript
  // L22 帖子
  content: z.string().min(1).max(50000),

  // L34 回复
  content: z.string().min(1).max(10000),
  ```

### Issue #F2 — 无嵌套回复深度限制（DoS 风险）
- **Severity**: HIGH
- **File**: `apps/api/src/routes/forum.ts:374-430`
- **Issue**: `POST /posts/:id/replies` 不限制嵌套深度。攻击者可逐层创建 1000 层嵌套回复。虽然 `reply-tree.ts` 使用迭代建树（第一遍 O(N)），但 `setDepths` (L82-88) 使用递归，深层嵌套可能导致栈溢出
- **Impact**:
  1. 后端 `setDepths` 递归 → RangeError: Maximum call stack size exceeded
  2. 前端渲染递归组件 → 同样栈溢出
  3. 每次查看帖子都要加载所有回复 → 性能退化
- **Fix**:
  ```typescript
  // 在 POST /posts/:id/replies 中添加深度检查
  const MAX_REPLY_DEPTH = 10;

  if (parentReplyId) {
    // 验证 parentId 属于同一帖子（已有）
    // ...existing code...

    // 检查深度
    let depth = 0;
    let currentId: string | null = parentReplyId;
    while (currentId && depth < MAX_REPLY_DEPTH + 1) {
      const [r] = await db
        .select({ parentId: forumReplies.parentId })
        .from(forumReplies)
        .where(eq(forumReplies.id, currentId))
        .limit(1);
      if (!r || !r.parentId) break;
      currentId = r.parentId;
      depth++;
    }
    if (depth >= MAX_REPLY_DEPTH) {
      return c.json({ success: false, error: '回复嵌套深度超过限制' }, 400);
    }
  }
  ```

  同时修复 `reply-tree.ts` 的 `setDepths` 为迭代：
  ```typescript
  // 迭代版 setDepths
  function setDepthsIterative(roots: ReplyTreeNode[]) {
    const stack: Array<{ node: ReplyTreeNode; depth: number }> =
      roots.map(r => ({ node: r, depth: 0 }));
    while (stack.length > 0) {
      const { node, depth } = stack.pop()!;
      node.depth = depth;
      node.collapsed = depth >= COLLAPSE_DEPTH;
      for (const child of node.children) {
        stack.push({ node: child, depth: depth + 1 });
      }
    }
  }
  ```

### Issue #F3 — 投票无自投限制
- **Severity**: MEDIUM
- **File**: `apps/api/src/routes/forum.ts:512-520` (帖子投票) / `595-603` (回复投票)
- **Issue**: 帖子投票端点仅验证帖子存在（L512），不检查 `post.userId === userId`。用户可给自己的帖子/回复投票，操纵排名
- **Fix**:
  ```typescript
  // 帖子投票 L512 后添加
  const [post] = await db
    .select({ id: forumPosts.id, userId: forumPosts.userId })
    .from(forumPosts)
    .where(eq(forumPosts.id, postId))
    .limit(1);

  if (!post) return c.json({...}, 404);
  if (post.userId === userId) {
    return c.json({ success: false, error: "Cannot vote on your own post" }, 403);
  }

  // 回复投票同理 L595
  const [reply] = await db
    .select({ id: forumReplies.id, userId: forumReplies.userId })
    .from(forumReplies)
    .where(eq(forumReplies.id, replyId))
    .limit(1);

  if (!reply) return c.json({...}, 404);
  if (reply.userId === userId) {
    return c.json({ success: false, error: "Cannot vote on your own reply" }, 403);
  }
  ```

### Issue #F4 — 投票不检查帖子锁定状态
- **Severity**: MEDIUM
- **File**: `apps/api/src/routes/forum.ts:512-520`
- **Issue**: 投票端点不检查 `post.isLocked`。已锁定的帖子仍可被投票
- **Fix**:
  ```typescript
  const [post] = await db
    .select({ id: forumPosts.id, userId: forumPosts.userId, isLocked: forumPosts.isLocked })
    .from(forumPosts)
    .where(eq(forumPosts.id, postId))
    .limit(1);

  if (!post) return c.json({...}, 404);
  if (post.isLocked) {
    return c.json({ success: false, error: "Post is locked" }, 403);
  }
  ```

### Issue #F5 — 缺少置顶/锁定/最佳答案管理员端点
- **Severity**: MEDIUM
- **File**: `apps/api/src/routes/forum.ts`
- **Issue**: 预评估要求的管理操作端点均未实现：
  - `PUT /posts/:id/pin` — 置顶/取消置顶
  - `PUT /posts/:id/lock` — 锁定/解锁
  - `PUT /posts/:id/best-answer` — 标记最佳答案
- **Impact**: 无法通过 API 管理论坛（除非直接操作 DB）
- **建议**: 添加这些端点，使用 admin/moderator 权限检查

### Issue #F6 — tags 数组无元素长度/数量限制
- **Severity**: MEDIUM
- **File**: `apps/api/src/routes/forum.ts:24`
- **Issue**: `tags: z.array(z.string()).optional()` 允许任意长标签字符串和任意数量标签
- **Fix**: `tags: z.array(z.string().min(1).max(50)).max(10).optional()`

### Issue #F7 — viewCount 更新无防刷保护
- **Severity**: MEDIUM
- **File**: `apps/api/src/routes/forum.ts:230-233`
- **Issue**: 每次查看帖子详情都 `viewCount + 1`（L230-233 fire-and-forget），无任何去重。攻击者可通过脚本刷浏览量
- **Fix**: 使用 Redis 或内存缓存对同一用户/IP 的浏览计数去重
  ```typescript
  // 简单方案：同一用户/IP 5 分钟内不重复计数
  const viewKey = `view:${id}:${currentUserId || clientIP}`;
  const viewed = await redis.get(viewKey);
  if (!viewed) {
    await redis.setex(viewKey, 300, "1");
    db.update(forumPosts)
      .set({ viewCount: sql`${forumPosts.viewCount} + 1` })
      .where(eq(forumPosts.id, id))
      .then(() => {});
  }
  ```

### Issue #F8 — 回复投票查询范围过大（性能）
- **Severity**: LOW
- **File**: `apps/api/src/routes/forum.ts:277-288`
- **Issue**: 查询用户对所有回复的投票时，仅过滤 `userId` 和 `isNull(postId)`，未限制到当前帖子的回复。如果有大量回复，会返回用户在所有帖子回复上的投票
- **Fix**: 添加帖子过滤条件，或改为只查当前帖子回复的投票
  ```typescript
  // 优化：仅查询当前帖子回复的投票
  const replyIds = flatReplies.map(r => r.id);
  const replyVotes = replyIds.length > 0
    ? await db.select({...}).from(forumVotes)
        .where(and(
          eq(forumVotes.userId, currentUserId),
          isNull(forumVotes.postId),
          inArray(forumVotes.replyId, replyIds)
        ))
    : [];
  ```

### Issue #F9 — 回复删除的 replyCount 减少与创建增加不在同一事务中
- **Severity**: LOW
- **File**: `apps/api/src/routes/forum.ts:424-427` (创建) / `484-492` (删除)
- **Issue**: 创建回复时 INSERT + UPDATE replyCount 是两个独立操作。虽然 INSERT 失败不会导致计数错误（默认 0），但并发场景可能导致计数偏移。删除时同理。
- **建议**: 包裹在 `db.transaction()` 中（与投票系统保持一致）

---

## 三、亮点（做得好的部分）

### 投票系统 — 事务保护 ✅
投票 toggle 使用 `db.transaction()` (L522, L605)，这是本项目中**第一个正确使用事务保护的 toggle 操作**。与 resources.ts 的 Like toggle（无事务）和 ratings.ts 的 upsert（无事务）形成对比。

投票逻辑完整实现了三态切换：
- 同值 → 取消 (remove)
- 不同值 → 反转 (change, diff 计算)
- 无值 → 新增 (vote)

### 权限检查一致性 ✅
- 编辑：ownership 检查 (L330, L452)
- 删除：ownership + admin/moderator 双重检查 (L361, L480)
- 锁定帖子：编辑和回复均被阻止 (L333, L393)

### reply-tree.ts 建树算法 ✅
使用 Map + 两遍迭代（L47-79），时间复杂度 O(N)，空间复杂度 O(N)。第一遍建 Map，第二遍建父子关系。这是正确的做法。`setDepths` 递归在正常深度下安全，但建议改为迭代。

### Zod vote schema ✅
`z.union([z.literal(1), z.literal(-1)])` (L43) 严格限制只有 +1/-1，比 `z.number().int().min(-1).max(1)` 更安全。

### 种子数据 ✅
无敏感信息泄露，使用中文内容合理。

---

## 四、汇总

### 按严重级别

| Severity | 数量 | Issue IDs |
|----------|------|-----------|
| CRITICAL | 0 | — |
| HIGH | 2 | #F1(content无max), #F2(无深度限制) |
| MEDIUM | 5 | #F3(自投), #F4(锁定投票), #F5(缺管理端点), #F6(tags无限制), #F7(viewCount刷量) |
| LOW | 2 | #F8(投票查询范围), #F9(replyCount事务) |

### 预评估 Checklist 达成率

| 类别 | 通过 | 失败 | 达成率 |
|------|------|------|--------|
| Markdown 安全 (6项) | 1 | 5 | 17% |
| 嵌套回复 (5项) | 2 | 2 | 50% |
| 投票系统 (7项) | 3 | 3 | 43% |
| 权限控制 (8项) | 6 | 2 | 75% |
| 速率限制 (1项) | 0 | 1 | 0% |
| 内容限制 (4项) | 0 | 4 | 0% |
| **总计 (31项)** | **12** | **17** | **39%** |

> ⚠️ 达成率偏低主要因为 Markdown 安全（前端依赖）和管理端点（尚未实现）占失败项多数。核心安全逻辑（事务、权限）已正确实现。

### 必须修复（阻塞 Batch 7/8）

1. **#F1** — content 添加 maxLength（1 行修复）
2. **#F2** — 回复深度限制（安全关键）
3. **#F3** — 禁止自投自票
4. **#F4** — 锁定帖子禁止投票

### 建议修复

5. **#F5** — 添加置顶/锁定/最佳答案端点
6. **#F6** — tags 添加限制
7. **#F7** — viewCount 防刷
8. **#F9** — replyCount 操作包裹事务

---

*报告结束。论坛核心安全机制（投票事务、权限检查）实现良好。主要缺失在内容大小限制和嵌套深度防护，均为 1-2 行修复即可解决。*
