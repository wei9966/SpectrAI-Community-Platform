# Phase 2 & Phase 3 测试策略文档 (Batch 2-9)

> 日期：2026-03-31
> 覆盖范围：Batch 2 至 Batch 9 完整测试策略

---

## 一、测试策略总览

| 批次 | 功能模块 | 测试文件位置 | 测试类型 |
|------|----------|--------------|----------|
| Batch 2 | Phase 2 后端 API | `apps/api/src/__tests__/` | 集成测试 |
| Batch 3 | Phase 2 前端组件 | `apps/web/__tests__/` | 单元测试 |
| Batch 4 | Showcase+ 存储 | `apps/api/__tests__/, apps/web/__tests__/` | 集成 + 单元 |
| Batch 5 | 排行榜 | `apps/api/src/__tests__/` | 单元测试 + 集成 |
| Batch 6 | 论坛后端 | `apps/api/src/__tests__/` | 集成测试 |
| Batch 7 | 通知系统 | `apps/api/src/__tests__/` | 集成测试 |
| Batch 8 | Phase 3 前端 | `apps/web/__tests__/` | 单元测试 |
| Batch 9 | 收尾测试 | `apps/api/, apps/web/` | E2E + 集成 |

---

## 二、Batch 2 测试策略 — Phase 2 后端 API

### 2.1 评分系统 (`ratings.test.ts`)

**端点**: `POST /api/resources/:id/rate`

| 测试类别 | 测试用例 | 输入/操作 | 预期结果 |
|----------|----------|-----------|----------|
| **正常路径** | 提交有效评分 | `{ score: 5 }` + 有效 token | `200 { success: true, data: { score: 5 } }` |
| | 更新已有评分 | `{ score: 3 }` + 已评过分 | `200 { success: true, data: { score: 3 } }` (upsert) |
| **校验失败** | 评分超出范围 | `{ score: 0 }` 或 `{ score: 6 }` | `400 { success: false, error }` |
| | 评分类型错误 | `{ score: "5" }` | `400` |
| | 缺少评分字段 | `{}` | `400` |
| **认证失败** | 无 token | 无 Authorization header | `401 { success: false, error: 'Authentication required' }` |
| | 无效 token | `Bearer invalid-token` | `401 { success: false, error: 'Invalid or expired token' }` |
| **404** | 资源不存在 | `POST /api/resources/non-existent/rate` | `404 { success: false, error: 'Resource not found' }` |
| **响应格式** | 返回平均评分 | GET `/api/resources/:id` | 包含 `averageRating`, `ratingCount` |
| **排序** | 按评分排序 | GET `/api/resources?sort=rating` | 按 `averageRating` 降序 |

**测试代码结构**:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Hono } from 'hono';
import ratingsRoutes from '../routes/ratings';

describe('POST /api/resources/:id/rate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create rating with valid input', async () => {
    // mock db.select (check existing) -> []
    // mock db.insert -> new rating
    // mock db.update (resource rating count)
    const app = new Hono();
    app.route('/api/resources', ratingsRoutes);

    const res = await app.request('/api/resources/res-1/rate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer valid-token' },
      body: JSON.stringify({ score: 5 }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.score).toBe(5);
  });

  // 其他测试用例...
});
```

---

### 2.2 收藏系统 (`favorites.test.ts`)

**端点**: `POST /api/resources/:id/favorite`

| 测试类别 | 测试用例 | 输入/操作 | 预期结果 |
|----------|----------|-----------|----------|
| **正常路径** | 收藏资源 | 有效 token + 资源存在 | `200 { success: true, data: { favorited: true } }` |
| | 取消收藏 (toggle) | 已收藏的资源 | `200 { success: true, data: { favorited: false } }` |
| **认证失败** | 无 token | 无 Authorization | `401` |
| **404** | 资源不存在 | 无效 resourceId | `404` |
| **冲突处理** | 重复收藏 | 同一用户第二次点击 | 应更新而非插入 (upsert) |

**GET /api/user/:username/favorites 测试**:

| 测试用例 | 预期 |
|----------|------|
| 用户收藏列表 | 返回分页数据 `{ items: [...], pagination: {...} }` |
| 空收藏 | `{ items: [], pagination: {...} }` |
| 用户不存在 | `404` |

---

### 2.3 用户增强 (`users-enhanced.test.ts`)

**端点**:
- `GET /api/users/:username` (扩展统计)
- `GET /api/users/:username/resources`
- `GET /api/users/:username/likes`
- `GET /api/users/:username/comments`
- `GET /api/users/:username/activity`

| 测试类别 | 测试用例 | 预期 |
|----------|----------|------|
| **统计面板** | 返回总下载/获赞/评分/加入天数 | `{ stats: { totalDownloads, totalLikes, totalRatings, daysSinceJoin } }` |
| **我的资源** | 分页返回用户发布的资源 | `{ items: [...], pagination: {...} }` |
| **我的点赞** | 分页返回用户点赞的资源 | 同上 |
| **我的评论** | 分页返回用户的评论 | 同上 |
| **活动时间线** | 最近 10 条活动记录 | `{ activities: [{ type, timestamp, targetId }] }` |
| **404** | 用户不存在 | `404 { error: 'User not found' }` |

---

### 2.4 Resources 扩展 (`resources-extended.test.ts`)

**修改**: `GET /api/resources/:id` 返回 `averageRating`, `ratingCount`

| 测试用例 | 预期 |
|----------|------|
| 无评分的资源 | `averageRating: null, ratingCount: 0` |
| 有评分的资源 | `averageRating: 4.5, ratingCount: 10` (精确计算) |
| 按评分排序 | `GET /api/resources?sort=rating` 返回按 `averageRating` 降序 |

---

## 三、Batch 3 测试策略 — Phase 2 前端组件

### 3.1 StarRating 组件 (`StarRating.test.tsx`)

| 测试类别 | 测试用例 | 断言 |
|----------|----------|------|
| **渲染** | 显示 5 颗星 | `screen.getAllByRole('button', { name: /star/i }).toHaveLength(5)` |
| | 正确高亮选中星 | 第 3 星有 `filled` 类 |
| | 显示半星 (如 3.5) | 第 4 星半填充 |
| **交互** | 点击第 4 星调用 onRate(4) | `expect(onRate).toHaveBeenCalledWith(4)` |
| | 只读模式不可点击 | `disabled` 属性存在 |
| **状态** | 空值显示 0 星 | 无高亮 |
| | 禁用状态样式 | `aria-disabled="true"` |

---

### 3.2 ResourceCard 扩展 (`ResourceCard-extended.test.tsx`)

| 测试类别 | 测试用例 | 断言 |
|----------|----------|------|
| **评分显示** | 显示平均评分 | `screen.getByText(/4\.5/)` |
| | 显示评分数量 | `screen.getByText(/10 条评价/)` |
| | 无评分显示 "暂无评分" | `screen.getByText('暂无评分')` |
| **收藏按钮** | 点击触发 onFavorite | `expect(onFavorite).toHaveBeenCalled()` |
| | 已收藏状态 | 书签图标填充 |
| **排序** | 按评分排序 UI | 选中 "评分" 时高亮 |

---

### 3.3 资源详情页 (`ResourceDetail.test.tsx`)

| 测试用例 | 断言 |
|----------|------|
| 评分提交成功显示 Toast | `screen.getByText('评分成功')` |
| 收藏成功更新计数 | `screen.getByText(/收藏数：11/)` |
| 登录用户显示评分入口 | `screen.getByLabelText('提交评分')` |
| 未登录用户隐藏评分入口 | `queryByLabelText('提交评分')).not.toBeInTheDocument()` |

---

### 3.4 用户主页 (`UserProfile.test.tsx`)

| 测试类别 | 测试用例 | 断言 |
|----------|----------|------|
| **Tab 切换** | 点击"我的点赞"切换内容 | `screen.getByText('我的点赞').click()` + 内容变化 |
| | 点击"我的评论"切换内容 | 同上 |
| **统计面板** | 显示总下载量 | `screen.getByText(/总下载：/)` |
| | 显示总获赞 | `screen.getByText(/总获赞：/)` |
| | 显示加入天数 | `screen.getByText(/加入天数：/)` |
| **时间线** | 显示最近活动 | `screen.getByText(/发布了资源/)` |
| **空状态** | 无资源显示空提示 | `screen.getByText('暂无资源')` |

---

## 四、Batch 4 测试策略 — Showcase + 存储

### 4.1 Projects CRUD API (`projects.test.ts`)

**端点**:

| Method | Path | 测试要点 |
|--------|------|----------|
| GET | `/api/projects` | 分页、筛选、搜索 |
| GET | `/api/projects/:id` | 详情 + 关联资源 |
| POST | `/api/projects` | 认证、校验、创建 |
| PUT | `/api/projects/:id` | 作者权限、校验 |
| DELETE | `/api/projects/:id` | 作者/管理员权限 |

| 测试类别 | 测试用例 | 预期 |
|----------|----------|------|
| **正常路径** | 创建有效项目 | `201 { success: true, data: {...} }` |
| | 获取项目列表 | `200 { success: true, data: { items: [...], pagination } }` |
| | 获取项目详情 | `200 { success: true, data: {...} }` |
| | 更新项目 (作者) | `200 { success: true }` |
| | 删除项目 (作者) | `200 { success: true }` |
| **校验失败** | 缺少 title | `400` |
| | title 超长 (>100) | `400` |
| | 无效 tag 类型 | `400` |
| **权限** | 未授权创建 | `401` |
| | 非作者更新 | `403` |
| | 非作者删除 (非管理员) | `403` |
| | 管理员删除任意 | `200` |
| **404** | 获取不存在项目 | `404` |
| | 更新不存在项目 | `404` |
| | 删除不存在项目 | `404` |

---

### 4.2 Upload API (`upload.test.ts`)

**端点**: `POST /api/upload/presign`

| 测试用例 | 预期 |
|----------|------|
| 获取 presigned URL (图片) | `200 { uploadUrl, publicUrl }` |
| 获取 presigned URL (压缩包) | `200` |
| 文件类型不允许 | `400 { error: 'Invalid file type' }` |
| 文件超大 (>10MB) | `400 { error: 'File too large' }` |
| 未认证 | `401` |

---

### 4.3 前端组件测试

#### ShowCase 页面 (`Showcase.test.tsx`)

| 测试用例 | 断言 |
|----------|------|
| 项目列表渲染 | `screen.getByText(/项目标题/)` |
| 封面图加载 | `screen.getByAltText(/封面/)` |
| 工具链标签显示 | `screen.getByText(/React/)` |
| 分页切换 | `screen.getByText('2').click()` |
| 空状态 | `screen.getByText('暂无项目')` |

#### ProjectDetail 页面 (`ProjectDetail.test.tsx`)

| 测试用例 | 断言 |
|----------|------|
| 项目详情渲染 | `screen.getByText(/制作过程/)` |
| 关联资源列表 | `screen.getByText(/关联资源/)` |
| GitHub 链接跳转 | `expect(link).toHaveAttribute('href', githubUrl)` |

#### ImageUpload 组件 (`ImageUpload.test.tsx`)

| 测试用例 | 断言 |
|----------|------|
| 选择图片触发上传 | `expect(onUpload).toHaveBeenCalledWith(file)` |
| 上传中显示进度条 | `screen.getByRole('progressbar')` |
| 上传成功显示预览 | `screen.getByAltText('预览')` |
| 上传失败显示错误 | `screen.getByText('上传失败')` |
| 文件类型错误提示 | `screen.getByText('仅支持图片格式')` |

---

## 五、Batch 5 测试策略 — 排行榜

### 5.1 排行算法测试 (`rankings-algorithm.test.ts`)

**文件**: `packages/shared/src/__tests__/rankings-algorithm.test.ts`

| 测试用例 | 输入 | 预期 |
|----------|------|------|
| 基础分数计算 | `downloads=100, likes=50, rating=4` | `score = 100×0.4 + 50×0.3 + 4×0.3` |
| 时间衰减 (7 天前) | `daysSinceCreated=7` | `衰减系数 ≈ 0.93` |
| 时间衰减 (30 天前) | `daysSinceCreated=30` | `衰减系数 ≈ 0.74` |
| 时间衰减 (90 天前) | `daysSinceCreated=90` | `衰减系数 ≈ 0.41` |
| 零值处理 | `downloads=0, likes=0, rating=0` | `score = 0` |
| 边界值 | `downloads=1, likes=0, rating=1` | 正常计算 |

**算法公式**:
```
score = (downloads × 0.4 + likes × 0.3 + averageRating × 0.3) × timeDecay
timeDecay = 1 / (1 + (daysSinceCreated / 30)^0.5)
```

---

### 5.2 Rankings API 测试 (`rankings.test.ts`)

**端点**: `GET /api/rankings`

| 测试类别 | 测试用例 | 预期 |
|----------|----------|------|
| **正常路径** | 获取本周排行 | `200 { items: [...], period: 'weekly' }` |
| | 获取本月排行 | `200 { period: 'monthly' }` |
| | 获取全部排行 | `200 { period: 'all' }` |
| **缓存** | 第二次请求命中缓存 | Redis `get` 返回缓存数据 |
| | 缓存过期刷新 | Redis `setex` 1 小时 |
| **筛选** | 按类型筛选 | `?type=workflow` 仅返回 workflow |
| **分页** | 分页参数 | `page=2, limit=10` 正确返回 |

---

### 5.3 首页排行榜区块 (`HomeRankings.test.tsx`)

| 测试用例 | 断言 |
|----------|------|
| 加载状态显示骨架屏 | `screen.getByTestId('skeleton')` |
| 数据加载完成显示排行 | `screen.getByText('Top 1')` |
| 点击查看更多跳转 | `expect(router.push).toHaveBeenCalledWith('/rankings')` |
| 空数据提示 | `screen.getByText('暂无排行数据')` |

---

## 六、Batch 6 测试策略 — 论坛后端

### 6.1 论坛 API 端点 (`forum.test.ts`)

#### GET /api/forum/categories

| 测试用例 | 预期 |
|----------|------|
| 获取板块列表 | `200 { items: [{ id, name, slug, postCount }] }` |
| 板块按 sortOrder 排序 | 验证排序顺序 |
| 空板块列表 | `{ items: [] }` |

---

#### GET /api/forum/posts

| 测试用例 | 预期 |
|----------|------|
| 获取帖子列表 | `200 { items: [...], pagination }` |
| 按板块筛选 | `?category=general` 正确过滤 |
| 按最新排序 | `?sort=newest` 按 createdAt 降序 |
| 按最热排序 | `?sort=popular` 按 viewCount 降序 |
| 按精华筛选 | `?filter=featured` 仅返回精华帖 |
| 搜索 | `?q=keyword` 标题/内容搜索 |

---

#### GET /api/forum/posts/:id

| 测试用例 | 预期 |
|----------|------|
| 获取帖子详情 | `200 { post, replies }` |
| 增加浏览量 | `viewCount + 1` |
| 404 | 帖子不存在 `404` |

---

#### POST /api/forum/posts

| 测试类别 | 测试用例 | 预期 |
|----------|----------|------|
| **正常路径** | 创建有效帖子 | `201 { success: true, data: {...} }` |
| **校验失败** | 缺少 title | `400` |
| | 缺少 content | `400` |
| | 缺少 categoryId | `400` |
| | title 超长 (>200) | `400` |
| | content 超长 (>50000) | `400` |
| **认证** | 未认证 | `401` |
| **权限** | 无效 categoryId | `400 { error: 'Category not found' }` |

---

#### POST /api/forum/posts/:id/replies

| 测试用例 | 预期 |
|----------|------|
| 创建回复 | `201 { success: true }` |
| 嵌套回复 (parentReplyId) | `201` |
| 空内容 | `400` |
| 未认证 | `401` |
| 帖子不存在 | `404` |
| 帖子已锁定 | `403 { error: 'Post is locked' }` |

---

#### POST /api/forum/votes

| 测试类别 | 测试用例 | 预期 |
|----------|----------|------|
| **正常路径** | 给帖子点赞 | `200 { success: true, data: { votes: 1 } }` |
| | 给帖子点踩 | `200 { votes: -1 }` |
| | 给回复投票 | `200` |
| | 切换投票 (up→down) | `200 { votes: -1 }` (原子更新) |
| | 取消投票 | `200 { votes: 0 }` |
| **认证** | 未认证 | `401` |
| **404** | 目标不存在 | `404` |
| **校验** | 无效 targetType | `400` |
| | 无效 voteType | `400` |

---

#### 管理员操作

| 端点 | 测试用例 | 预期 |
|------|----------|------|
| POST `/api/forum/posts/:id/pin` | 管理员置顶 | `200 { isPinned: true }` |
| | 非管理员 | `403` |
| POST `/api/forum/posts/:id/lock` | 管理员锁定 | `200 { isLocked: true }` |
| | 非管理员 | `403` |

---

### 6.2 回复树构建测试 (`reply-tree.test.ts`)

**文件**: `apps/api/src/__tests__/reply-tree.test.ts`

| 测试用例 | 输入 | 预期输出 |
|----------|------|----------|
| 空回复列表 | `[]` | `[]` |
| 单层回复 | `[{ id: '1', parentReplyId: null }]` | `[{ id: '1', children: [] }]` |
| 两层嵌套 | `[{ id: '1' }, { id: '2', parentReplyId: '1' }]` | `[{ id: '1', children: [{ id: '2' }] }]` |
| 多层嵌套 (5 层) | 5 层深度 | 正确树结构 |
| 无序回复 | 乱序数组 | 正确树结构 (先构建 map) |
| 孤立回复 (parent 不存在) | `[{ id: '2', parentReplyId: 'non-existent' }]` | 作为顶层或丢弃 |

---

### 6.3 论坛种子数据测试 (`forum-seed.test.ts`)

**文件**: `apps/api/src/__tests__/forum-seed.test.ts`

| 测试用例 | 断言 |
|----------|------|
| 板块数据存在 | `SELECT COUNT(*) FROM forum_categories` >= 4 |
| 示例帖子存在 | `SELECT COUNT(*) FROM forum_posts` >= 10 |
| 示例回复存在 | `SELECT COUNT(*) FROM forum_replies` >= 20 |
| 板块 slug 唯一 | 无重复 slug |

---

## 七、Batch 7 测试策略 — 通知系统

### 7.1 Notifications API (`notifications.test.ts`)

**端点**:

| Method | Path | 用途 |
|--------|------|------|
| GET | `/api/notifications` | 获取用户通知 |
| PUT | `/api/notifications/:id/read` | 标记已读 |
| PUT | `/api/notifications/read-all` | 全部已读 |

| 测试类别 | 测试用例 | 预期 |
|----------|----------|------|
| **正常路径** | 获取通知列表 | `200 { items: [...], pagination }` |
| | 筛选未读 | `?unread=true` 仅返回未读 |
| | 标记单条已读 | `200 { success: true }` |
| | 标记全部已读 | `200 { success: true, count: 5 }` |
| **认证** | 未认证 | `401` |
| **权限** | 标记他人通知 | `403` |
| **404** | 通知不存在 | `404` |

---

### 7.2 通知触发器测试 (`notify-integration.test.ts`)

**触发规则**:

| 触发事件 | 通知接收者 | 通知类型 | 测试要点 |
|----------|------------|----------|----------|
| 资源被评论 | 资源作者 | `comment` | 检查 `notifications` 表插入 |
| 资源被点赞 | 资源作者 | `like` | 检查通知插入 |
| 资源被收藏 | 资源作者 | `favorite` | 检查通知插入 |
| 帖子被回复 | 帖子作者 | `reply` | 检查通知插入 |
| 被 @ 提及 | 被提及用户 | `mention` | 解析内容中的 @username |

**测试代码结构**:

```typescript
describe('Notification Triggers', () => {
  it('should create notification when resource is commented', async () => {
    // 1. 创建资源
    // 2. 他人评论资源
    // 3. 检查 notifications 表
    const notification = await db.select().from(notifications).where({
      userId: resourceAuthorId,
      type: 'comment',
    }).get();

    expect(notification).toBeDefined();
    expect(notification.sourceId).toBe(resourceId);
  });

  // 其他触发器测试...
});
```

---

### 7.3 通知轮询测试 (前端)

**文件**: `apps/web/__tests__/useNotifications.test.ts`

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { useNotifications } from '@/hooks/useNotifications';

describe('useNotifications', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should poll every 30 seconds', async () => {
    const { result } = renderHook(() => useNotifications());

    // 初始调用
    expect(fetch).toHaveBeenCalledTimes(1);

    // 30 秒后
    vi.advanceTimersByTime(30000);
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));

    // 60 秒后
    vi.advanceTimersByTime(30000);
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(3));
  });

  it('should cleanup interval on unmount', () => {
    const { unmount } = renderHook(() => useNotifications());
    unmount();

    vi.advanceTimersByTime(30000);
    expect(fetch).toHaveBeenCalledTimes(1); // 不再轮询
  });
});
```

---

## 八、Batch 8 测试策略 — Phase 3 前端

### 8.1 论坛页面测试

#### ForumIndex 页面 (`ForumIndex.test.tsx`)

| 测试用例 | 断言 |
|----------|------|
| 板块列表渲染 | `screen.getByText(/公告区/)` |
| 最新帖子区块 | `screen.getByText('最新帖子')` |
| 热门帖子区块 | `screen.getByText('热门帖子')` |
| 点击板块跳转 | `expect(router.push).toHaveBeenCalledWith('/forum/general')` |

---

#### ForumCategory 页面 (`ForumCategory.test.tsx`)

| 测试用例 | 断言 |
|----------|------|
| 板块名称显示 | `screen.getByText('公告区')` |
| 帖子列表渲染 | `screen.getByText(/帖子标题/)` |
| 排序切换 (最新/最热) | `screen.getByText('最热').click()` |
| 分页 | `screen.getByText('2').click()` |
| 空状态 | `screen.getByText('暂无帖子')` |

---

#### PostDetail 页面 (`PostDetail.test.tsx`)

| 测试用例 | 断言 |
|----------|------|
| 帖子内容渲染 | `screen.getByText(/帖子内容/)` |
| 回复列表渲染 | `screen.getByText(/回复内容/)` |
| 回复嵌套显示 | 缩进样式 |
| 投票按钮 | `screen.getByLabelText('赞同')` |
| 点击投票 | `expect(onVote).toHaveBeenCalledWith('up')` |
| 锁定时禁用回复输入 | `screen.getByPlaceholderText('帖子已锁定').disabled` |

---

#### NewPost 页面 (`NewPost.test.tsx`)

| 测试用例 | 断言 |
|----------|------|
| 表单渲染 | `screen.getByLabelText('标题')` |
| 板块选择下拉 | `screen.getByLabelText('板块')` |
| Markdown 编辑器渲染 | `screen.getByText('编辑')` |
| 表单验证 (空标题) | `screen.getByText('标题必填')` |
| 提交成功跳转 | `expect(router.push).toHaveBeenCalledWith('/forum/post/123')` |
| 未登录重定向 | `expect(router.replace).toHaveBeenCalledWith('/login')` |

---

### 8.2 组件测试

#### ReplyTree 组件 (`ReplyTree.test.tsx`)

| 测试用例 | 断言 |
|----------|------|
| 单层回复渲染 | `screen.getByText('回复内容')` |
| 嵌套回复缩进 | 子回复有 `ml-8` 类 |
| 折叠深度 5+ | 第 6 层显示 "展开" 按钮 |
| 点击展开 | `screen.getByText('子回复内容')` |

---

#### VoteButton 组件 (`VoteButton.test.tsx`)

| 测试用例 | 断言 |
|----------|------|
| 未投票状态 | 无高亮 |
| 已点赞状态 | 赞同按钮高亮 |
| 已点踩状态 | 反对按钮高亮 |
| 点击赞同 | `expect(onVote).toHaveBeenCalledWith('up')` |
| 切换 (up→down) | `expect(onVote).toHaveBeenCalledWith('down')` |
| 取消投票 | 再次点击相同按钮取消 |

---

#### PostCard 组件 (`PostCard.test.tsx`)

| 测试用例 | 断言 |
|----------|------|
| 帖子信息渲染 | `screen.getByText('标题')` |
| 浏览量显示 | `screen.getByText(/100 浏览/)` |
| 回复数显示 | `screen.getByText(/10 回复/)` |
| 置顶 Badge | `screen.getByText('置顶')` |
| 锁定 Badge | `screen.getByText('锁定')` |
| 精华 Badge | `screen.getByText('精华')` |

---

#### MarkdownEditor 组件 (`MarkdownEditor.test.tsx`)

| 测试用例 | 断言 |
|----------|------|
| 编辑器渲染 | `screen.getByRole('textbox')` |
| 实时预览 | 输入后预览区更新 |
| 代码块插入 | ` ``` ` 语法支持 |
| 图片上传 | 拖放/选择图片触发上传 |
| @提醒弹出 | 输入 `@` 显示用户列表 |
| Emoji 选择 | 点击 emoji 按钮显示选择器 |

---

#### MarkdownRenderer 组件 (`MarkdownRenderer.test.tsx`)

| 测试用例 | 断言 |
|----------|------|
| 基础 Markdown 渲染 | `**bold**` → `<strong>` |
| 代码高亮 | ` ```typescript ` → Prism 高亮 |
| 链接渲染 | `[text](url)` → `<a>` |
| 图片渲染 | `![alt](url)` → `<img>` |
| 表格渲染 | 表格结构正确 |

---

#### NotificationBell 组件 (`NotificationBell.test.tsx`)

| 测试用例 | 断言 |
|----------|------|
| 未读数 Badge | `screen.getByText('3')` |
| 无未读隐藏 Badge | `queryByTestId('badge')).not.toBeInTheDocument()` |
| 点击展开下拉 | `screen.getByRole('list')` |
| 点击通知跳转 | `expect(router.push).toHaveBeenCalledWith('/resource/123')` |
| 标记已读 | 点击后 Badge 消失 |
| 全部已读 | `screen.getByText('全部已读').click()` |

---

### 8.3 Header 集成测试 (`Header-integration.test.tsx`)

| 测试用例 | 断言 |
|----------|------|
| 通知铃铛集成在 Header | `screen.getByTestId('notification-bell')` |
| 未登录隐藏铃铛 | `queryByTestId('notification-bell')).not.toBeInTheDocument()` |
| 登录后显示 | `screen.getByTestId('notification-bell')` |

---

## 九、Batch 9 测试策略 — 收尾测试

### 9.1 端到端集成测试 (`e2e.test.ts`)

**文件**: `apps/api/src/__tests__/e2e.test.ts`

| 场景 | 流程 | 断言 |
|------|------|------|
| 完整评分流程 | 登录 → 浏览资源 → 评分 → 检查平均评分更新 | 评分成功，avg 更新 |
| 完整收藏流程 | 登录 → 收藏 → 检查收藏列表 | 收藏存在 |
| 完整论坛流程 | 登录 → 发帖 → 回复 → 投票 → 检查通知 | 通知生成 |
| 完整通知流程 | 用户 A 发帖 → 用户 B 回复 → A 收到通知 → A 标记已读 | 通知状态正确 |

---

### 9.2 跨批次一致性审查

**检查清单**:

| 检查项 | 验证方式 |
|--------|----------|
| 所有 API 响应格式一致 | `{ success: true/false, data/error }` |
| 所有分页格式一致 | `{ items, pagination: { page, limit, total, totalPages } }` |
| 所有认证错误返回 401 | 统一错误码 |
| 所有权限错误返回 403 | 统一错误码 |
| 所有 404 返回正确消息 | `{ error: 'xxx not found' }` |
| UUID 主键格式一致 | 所有表主键为 UUID |
| 时间戳带时区 | `withTimezone: true` |
| 外键 cascade 删除 | `onDelete: 'cascade'` |

---

### 9.3 性能审查

**测试用例**:

| 测试项 | 目标 |
|--------|------|
| 排行榜 API 响应时间 | < 200ms (缓存命中) |
| 论坛帖子列表响应 | < 500ms (含回复计数) |
| 通知轮询响应 | < 100ms |
| 数据库查询 N+1 检测 | 使用 explain 分析 |
| Redis 缓存命中率 | > 80% |

---

### 9.4 最终验证

| 检查项 | 命令 |
|--------|------|
| TypeScript 编译 | `tsc --noEmit` |
| 所有测试通过 | `vitest run` |
| 测试覆盖率 > 80% | `vitest run --coverage --threshold=80` |
| Lint 检查 | `eslint . --ext .ts,.tsx` |
| 数据库迁移 | `drizzle-kit migrate` |

---

## 十、测试文件结构总览

```
apps/api/src/__tests__/
├── setup.ts
├── auth.test.ts (已有)
├── resources.test.ts (已有)
├── ratings.test.ts (Batch 2)
├── favorites.test.ts (Batch 2)
├── users-enhanced.test.ts (Batch 2)
├── projects.test.ts (Batch 4)
├── upload.test.ts (Batch 4)
├── rankings.test.ts (Batch 5)
├── forum.test.ts (Batch 6)
├── reply-tree.test.ts (Batch 6)
├── forum-seed.test.ts (Batch 6)
├── notifications.test.ts (Batch 7)
├── notify-integration.test.ts (Batch 7)
└── e2e.test.ts (Batch 9)

apps/web/__tests__/
├── setup.ts
├── ResourceCard.test.tsx (已有)
├── ResourceCard-extended.test.tsx (Batch 3)
├── StarRating.test.tsx (Batch 3)
├── ResourceDetail.test.tsx (Batch 3)
├── UserProfile.test.tsx (Batch 3)
├── Showcase.test.tsx (Batch 4)
├── ProjectDetail.test.tsx (Batch 4)
├── ImageUpload.test.tsx (Batch 4)
├── HomeRankings.test.tsx (Batch 5)
├── ForumIndex.test.tsx (Batch 8)
├── ForumCategory.test.tsx (Batch 8)
├── PostDetail.test.tsx (Batch 8)
├── NewPost.test.tsx (Batch 8)
├── ReplyTree.test.tsx (Batch 8)
├── VoteButton.test.tsx (Batch 8)
├── PostCard.test.tsx (Batch 8)
├── MarkdownEditor.test.tsx (Batch 8)
├── MarkdownRenderer.test.tsx (Batch 8)
├── NotificationBell.test.tsx (Batch 8)
├── useNotifications.test.ts (Batch 7)
└── Header-integration.test.tsx (Batch 8)

packages/shared/src/__tests__/
├── schemas.test.ts (已有)
├── batch1-schemas.test.ts (Batch 1)
├── types-export.test.ts (Batch 1)
├── rankings-algorithm.test.ts (Batch 5)
└── factories.ts (测试工具)
```

---

*测试策略文档完成。每个批次开发完成后，参照本文档编写具体测试用例。*
