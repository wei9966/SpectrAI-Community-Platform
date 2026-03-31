# Batch 9 — 最终集成检查清单

> 生成时间: 2026-03-31
> 生成角色: team-supervisor
> 状态: 所有开发工作均以 uncommitted working directory changes 形式存在，**尚未创建任何分支或合并**

---

## 1. Worktree 合并状态总览

| Worktree | HEAD | 分支 | 提交 | 职责 |
|----------|------|------|------|------|
| **主仓库** | 0882d00 | master | Phase 1 代码 | 后端+前端集成 |
| agent-17aae890 | 0882d00 | worktree/agent-17aae890 | 无 | Phase 1 副本 |
| agent-b17002af | 0882d00 | worktree/agent-b17002af | 无 | Phase 1 副本 |
| agent-e74bd3cf | 0882d00 | worktree/agent-e74bd3cf | 无 | Phase 1 副本 |
| agent-f53066a8 | 0882d00 | worktree/agent-f53066a8 | 无 | Phase 1 副本 |
| agent-fa0a5697 | 0882d00 | worktree/agent-fa0a5697 | 无 | Phase 1 副本 |
| agent-fb191010 | 0882d00 | worktree/agent-fb191010 | 无 | Phase 1 副本 |
| **agent-f8f3a959** | 0882d00 | worktree/agent-f8f3a959 | 无 | **前端类型/Schema 开发** |

### 关键发现
- **所有 worktree HEAD 相同** (0882d00)，无任何分支被创建或推送
- **主仓库包含** Batch 2-6 后端路由 + Batch 4/5 前端页面（uncommitted）
- **agent-f8f3a959 包含** Phase 2/3 共享类型和 Schema 文件（uncommitted）
- 6 个 agent worktree 仅有 Phase 1 基础文件，无增量修改

---

## 2. API 路由注册验证

### 2.1 已实现路由文件 (`apps/api/src/routes/`)

| 文件 | 状态 | Batch |
|------|------|-------|
| `auth.ts` | Phase 1 | Batch 1 |
| `resources.ts` | Phase 1 + 增强 | Batch 1-2 |
| `users.ts` | Phase 1 + 增强 | Batch 1-2 |
| `ratings.ts` | 新增 | Batch 2 |
| `favorites.ts` | 新增 | Batch 2 |
| `projects.ts` | 新增 | Batch 3 |
| `uploads.ts` | 新增 | Batch 4 |
| `rankings.ts` | 新增 | Batch 5 |
| `forum.ts` | 新增 | Batch 6 |
| **notifications.ts** | **缺失** | **Batch 7** |

### 2.2 `index.ts` 路由注册 vs 实际实现

| 路由 | index.ts 注册 | 文件存在 | 状态 |
|------|:---:|:---:|------|
| `/api/auth` | ✅ | ✅ | OK |
| `/api/resources` (主路由) | ✅ | ✅ | OK |
| `/api/resources` (ratings) | ✅ | ✅ | OK |
| `/api/resources` (favorites) | ✅ | ✅ | OK |
| `/api/users` (主路由) | ✅ | ✅ | OK |
| `/api/users` (userFavorites) | ✅ | ✅ | OK |
| `/api/projects` | ✅ | ✅ | OK |
| `/api/uploads` | ✅ | ✅ | OK |
| `/api/rankings` | ✅ | ✅ | OK |
| **`/api/forum`** | **❌ 未注册** | ✅ | **需添加 import + route** |
| **`/api/notifications`** | **❌ 未注册** | **❌ 不存在** | **需完整实现** |

### 2.3 完整 API 端点清单

#### Auth (`/api/auth`)
- POST `/login` — 登录
- POST `/register` — 注册
- POST `/github` — GitHub OAuth
- GET `/me` — 获取当前用户

#### Resources (`/api/resources`)
- GET `/` — 列表 (支持 sort=rating)
- GET `/search` — 搜索
- GET `/:id` — 详情
- POST `/` — 创建 (需认证)
- PUT `/:id` — 更新 (需认证)
- DELETE `/:id` — 删除 (需认证)
- POST `/:id/like` — 点赞 (需认证)
- POST `/:id/rate` — 评分 1-5 (需认证)
- POST `/:id/favorite` — 收藏切换 (需认证)

#### Users (`/api/users`)
- GET `/:username` — 用户详情
- GET `/:username/resources` — 用户资源
- PUT `/:username` — 更新资料 (需认证)
- GET `/:id/stats` — 用户统计
- GET `/:id/activity` — 活动时间线
- GET `/:id/likes` — 点赞列表
- GET `/:id/comments` — 评论列表
- GET `/:id/favorites` — 收藏列表

#### Projects (`/api/projects`)
- GET `/` — 列表 (分页、搜索、状态过滤)
- GET `/:id` — 详情 (含关联资源)
- POST `/` — 创建 (需认证)
- PUT `/:id` — 更新 (需认证)
- DELETE `/:id` — 删除 (需认证)
- POST `/:id/resources` — 关联资源 (需认证)
- DELETE `/:id/resources/:resourceId` — 取消关联 (需认证)

#### Uploads (`/api/uploads`)
- POST `/presign` — 获取预签名上传 URL (需认证)
- POST `/confirm` — 确认上传 (需认证)

#### Rankings (`/api/rankings`)
- GET `/resources` — 资源排行榜 (Redis 缓存, TTL=1h)
- GET `/users` — 用户排行榜 (Redis 缓存, TTL=1h)
- GET `/projects` — 项目排行榜 (Redis 缓存, TTL=1h)
- POST `/refresh` — 刷新缓存 (需 admin/moderator)

#### Forum (`/api/forum`) — **已实现但未注册**
- GET `/categories` — 分类列表
- GET `/categories/:slug/posts` — 分类帖子列表
- POST `/posts` — 创建帖子 (需认证)
- GET `/posts/:id` — 帖子详情 (含嵌套回复树)
- PUT `/posts/:id` — 更新帖子 (需认证)
- DELETE `/posts/:id` — 删除帖子 (需认证)
- POST `/posts/:id/replies` — 创建回复 (需认证)
- PUT `/replies/:id` — 更新回复 (需认证)
- DELETE `/replies/:id` — 删除回复 (需认证)
- POST `/posts/:id/vote` — 投票 (需认证, 事务性切换)
- POST `/replies/:id/vote` — 回复投票 (需认证, 事务性切换)

#### Notifications (`/api/notifications`) — **完全缺失**
- [ ] GET `/` — 通知列表
- [ ] GET `/unread-count` — 未读数
- [ ] PUT `/:id/read` — 标记已读
- [ ] PUT `/read-all` — 全部标记已读
- [ ] DELETE `/:id` — 删除通知

---

## 3. DB Schema 一致性验证

### 3.1 `schema.ts` 表完整性

| 表名 | Phase | 状态 |
|------|-------|------|
| users | 1 | ✅ 完整 |
| resources | 1 | ✅ 完整 |
| resource_comments | 1 | ✅ 完整 |
| resource_likes | 1 | ✅ 完整 |
| resource_ratings | 2 | ✅ 完整 |
| resource_favorites | 2 | ✅ 完整 |
| projects | 3 | ✅ 含 toolChain/tags/status |
| project_resources | 3 | ✅ 完整 |
| forum_categories | 3 | ✅ 完整 |
| forum_posts | 3 | ✅ 含 tags 字段 |
| forum_replies | 3 | ✅ 完整 |
| forum_votes | 3 | ✅ onDelete=cascade |
| notifications | 3 | ✅ fromUserId onDelete=set null |

### 3.2 Shared Types vs DB Schema 差异分析

#### Project 类型差异 (agent-f8f3a959 worktree)
| 字段 | DB Schema | Shared Type | 差异 |
|------|-----------|-------------|------|
| name/title | `title` | `name` | **命名不一致** |
| slug | 无 | `slug` | **类型多出** |
| coverImage | `coverImage` | `coverImageUrl` | **命名不一致** |
| isPublished | 无 | `isPublished` | **类型多出** |
| viewCount | 无 | `viewCount` | **类型多出** |
| demoUrl | ✅ | 无 | **类型缺失** |
| sourceUrl | ✅ | 无 | **类型缺失** |
| toolChain | ✅ | 无 | **类型缺失** |
| tags | ✅ | 无 | **类型缺失** |
| status | ✅ | 无 | **类型缺失** |

> **结论**: 前端 worktree 的 `Project` 类型与 DB schema 严重不匹配，需重写。API 路由 (`projects.ts`) 和 API Client (`projectsApi`) 使用的字段与 DB 一致，应以 DB/API 为准。

#### ForumPost 类型差异
| 字段 | DB Schema | Shared Type | 差异 |
|------|-----------|-------------|------|
| isResolved | 无 | `isResolved` | **类型多出** |
| acceptedReplyId | 无 (`bestAnswerId`) | `acceptedReplyId` | **命名不一致** |
| voteScore | ✅ | `voteCount` | **命名不一致** |
| tags | ✅ | 无 | **类型缺失** |

> **结论**: 前端 worktree 的 `ForumPost` 类型需对齐 DB schema。`bestAnswerId` 是正确字段名。

#### ForumReply 类型差异
| 字段 | DB Schema | Shared Type | 差异 |
|------|-----------|-------------|------|
| isAccepted | 无 | `isAccepted` | **类型多出** |
| voteScore | ✅ | `voteCount` | **命名不一致** |

#### Notification 类型差异
| 字段 | DB Schema | Shared Type | 差异 |
|------|-----------|-------------|------|
| content | `content` | `message` | **命名不一致** |
| fromUserId | ✅ | 无 (用 actor) | **结构差异** |

### 3.3 Shared Schema 文件命名冲突

| 主仓库 (`packages/shared/src/schemas/`) | 前端 worktree |
|---|---|
| `rating.ts` | `rating.schema.ts` |
| `favorite.ts` | `favorite.schema.ts` |
| `project.ts` | `project.schema.ts` |
| `forum.ts` | `forum.schema.ts` |
| `notification.ts` | `notification.schema.ts` |
| `ranking.ts` | 无对应 |

> **合并策略**: 主仓库的命名 (`rating.ts`) 已被 `index.ts` 引用，应以主仓库为准。worktree 的 `.schema.ts` 版本应被丢弃，但需检查其内容是否有主仓库版本缺少的字段。

---

## 4. 基础设施验证

### 4.1 Redis (Batch 5 排行榜缓存)

| 检查项 | 状态 |
|--------|------|
| `docker-compose.yml` redis 服务 | ✅ redis:7-alpine |
| `package.json` 依赖 `ioredis` | ✅ ^5.10.1 |
| `env.ts` REDIS_URL 配置 | ✅ 有默认值 |
| `lib/redis.ts` 实现 | ✅ getCachedOrCompute + invalidate |
| rankings.ts 使用 Redis 缓存 | ✅ TTL=3600 |

### 4.2 MinIO (Batch 4 文件上传)

| 检查项 | 状态 |
|--------|------|
| `docker-compose.yml` minio 服务 | ✅ latest |
| `package.json` `@aws-sdk/client-s3` | ✅ ^3.1020.0 |
| `package.json` `@aws-sdk/s3-request-presigner` | ✅ ^3.1020.0 |
| `env.ts` MINIO_* 配置 | ✅ 5 个配置项 |
| `lib/storage.ts` 实现 | ✅ presign + confirm + delete |
| `uploads.ts` 路由 | ✅ presign + confirm |

### 4.3 lib/ 工具模块

| 文件 | 功能 | 依赖 |
|------|------|------|
| `redis.ts` | Redis 单例 + 缓存/失效 | ioredis |
| `storage.ts` | MinIO S3 客户端 + 预签名 | @aws-sdk/client-s3 |
| `reply-tree.ts` | 扁平回复 → 嵌套树构建 | 无外部依赖 |

---

## 5. API Client 覆盖验证

### 5.1 `packages/shared/src/api-client.ts` 方法覆盖

| API Client | Batch | 状态 |
|------------|-------|------|
| `resourcesApi` | 1-2 | ✅ list/getByType/create/update/delete/like/rate/favorite |
| `authApi` | 1 | ✅ login/register/github/me |
| `searchApi` | 1 | ✅ search |
| `usersApi` | 1-2 | ✅ getResources/stats/activity/likes/comments/favorites |
| `projectsApi` | 3 | ✅ list/getById/create/update/delete/linkResource/unlinkResource |
| `uploadsApi` | 4 | ✅ presign/confirm |
| `rankingsApi` | 5 | ✅ getResources/getUsers/getProjects/refresh |
| **`forumApi`** | 6 | **❌ 缺失** |
| **`notificationsApi`** | 7 | **❌ 缺失** |

---

## 6. 前端页面验证

### 6.1 已实现页面

| 页面 | 路径 | Batch | 状态 |
|------|------|-------|------|
| 首页 | `apps/web/app/page.tsx` | 1+ | ✅ 已修改 |
| 资源详情 | `apps/web/app/resource/[id]/page.tsx` | 1+2 | ✅ StarRating + FavoriteButton |
| 用户主页 | `apps/web/app/user/[username]/page.tsx` | 1+2 | ✅ 多Tab + 统计 + 时间线 |
| 论坛 | `apps/web/app/forum/` | 6 | ✅ 新增目录 |
| 排行榜 | `apps/web/app/rankings/` | 5 | ✅ 新增目录 |
| 展示厅 | `apps/web/app/showcase/` | 3 | ✅ 新增目录 |

### 6.2 新增前端组件

| 组件 | 路径 | 功能 |
|------|------|------|
| StarRating | `apps/web/src/components/star-rating.tsx` | 星级评分 (hover/动画/只读) |
| FavoriteButton | `apps/web/src/components/favorite-button.tsx` | 收藏按钮 (乐观更新) |
| ImageUpload | `apps/web/src/components/image-upload.tsx` | 图片上传 (MinIO) |

---

## 7. 合并操作清单 (按顺序执行)

### Phase A: 准备工作
- [ ] A1. 确认所有 worktree 的修改都已保存
- [ ] A2. 在主仓库创建集成分支 `git checkout -b integration/batch-1-8`
- [ ] A3. 从 agent-f8f3a959 worktree 复制共享类型文件到主仓库

### Phase B: 后端代码合并
- [ ] B1. 确认主仓库 WD 的后端路由文件均已暂存
  - ratings.ts, favorites.ts, projects.ts, uploads.ts, rankings.ts, forum.ts
- [ ] B2. 确认 lib/ 目录文件已暂存 (redis.ts, storage.ts, reply-tree.ts)
- [ ] B3. 确认 schema.ts 修改已暂存 (含 forum_posts.tags)
- [ ] B4. 确认 env.ts 修改已暂存 (REDIS_URL, MINIO_*)
- [ ] B5. 确认 index.ts 修改已暂存
- [ ] B6. 确认 docker-compose.yml 修改已暂存 (MinIO 服务)

### Phase C: 共享包合并 (需解决冲突)
- [ ] C1. **解决 schema 命名冲突** — 保留主仓库的 `rating.ts` 等命名，删除 worktree 的 `rating.schema.ts` 等
- [ ] C2. **合并 shared types** — 从 worktree 复制 rating.ts, favorite.ts, project.ts, forum.ts, notification.ts, user-enhanced.ts, ranking.ts
- [ ] C3. **修复 Project 类型** — 对齐 DB schema 字段 (title, coverImage, demoUrl, sourceUrl, toolChain, tags, status)
- [ ] C4. **修复 ForumPost 类型** — 对齐字段 (bestAnswerId 非 acceptedReplyId, voteScore 非 voteCount)
- [ ] C5. **修复 ForumReply 类型** — 对齐字段 (voteScore 非 voteCount, 移除 isAccepted)
- [ ] C6. **修复 Notification 类型** — 对齐字段 (content 非消息, fromUserId 结构)
- [ ] C7. **合并 schemas/index.ts** — 统一导出路径
- [ ] C8. **合并 types/index.ts** — 统一导出路径
- [ ] C9. **更新 api-client.ts** — 添加 forumApi 和 notificationsApi

### Phase D: 路由注册
- [ ] D1. 在 `index.ts` 添加 `import forumRoutes from "./routes/forum.js"`
- [ ] D2. 在 `index.ts` 添加 `app.route("/api/forum", forumRoutes)`
- [ ] D3. **实现 notifications.ts 路由** (Batch 7 完全缺失)
- [ ] D4. 在 `index.ts` 注册 notification 路由

### Phase E: 前端代码合并
- [ ] E1. 暂存主仓库的前端修改 (page.tsx, ResourceCard.tsx, Header.tsx)
- [ ] E2. 暂存新组件 (star-rating.tsx, favorite-button.tsx, image-upload.tsx)
- [ ] E3. 暂存新页面 (forum/, rankings/, showcase/)

### Phase F: 测试种子数据
- [ ] F1. 更新 `seed.ts` 添加 forum 测试数据 (categories, posts, replies, votes)
- [ ] F2. 更新 `seed.ts` 添加 notification 测试数据
- [ ] F3. 更新 `seed.ts` 添加 project 测试数据

### Phase G: 集成验证
- [ ] G1. 运行 `pnpm install` 确认依赖安装
- [ ] G2. 运行 `pnpm --filter @spectrai-community/api build` 确认 TypeScript 编译通过
- [ ] G3. 运行 `pnpm --filter @spectrai-community/web build` 确认前端编译通过
- [ ] G4. 运行 `docker-compose up -d` 启动基础设施
- [ ] G5. 运行 `pnpm --filter @spectrai-community/api db:push` 同步数据库
- [ ] G6. 运行 `pnpm --filter @spectrai-community/api db:seed` 填充测试数据
- [ ] G7. 启动 API 服务，验证所有端点返回正确响应
- [ ] G8. 启动前端，验证页面加载和交互

### Phase H: 提交与清理
- [ ] H1. 提交所有修改到集成分支
- [ ] H2. 推送集成分支到远程
- [ ] H3. 清理不再需要的 worktree
- [ ] H4. 合并集成分支到 master

---

## 8. 风险与注意事项

### 高风险
1. **Schema 命名冲突** — 两套文件名，合并时需仔细选择
2. **Shared Types 字段不匹配** — Project/ForumPost/ForumReply/Notification 类型需重写
3. **Notification 路由完全缺失** — 需从零实现 Batch 7

### 中等风险
4. **MinIO Windows Docker** — `mc ready local` 健康检查在 Windows 可能失败
5. **Forum 投票并发** — 使用了 `db.transaction()` 保护，但仍需压力测试
6. **Redis 连接** — ioredis 的 lazyConnect=false 可能导致启动时阻塞

### 低风险
7. **Reply tree 深度折叠** — COLLAPSE_DEPTH=5 是合理默认值
8. **排行榜缓存 TTL** — 1 小时合理，admin 可手动刷新
9. **Pre-signed URL 过期** — 默认 1 小时，足够上传使用

---

## 9. 测试文件清单

### 已有测试 (`apps/api/src/__tests__/`)
| 文件 | 覆盖 |
|------|------|
| `resources-rating.test.ts` | 资源评分 |
| `ratings.test.ts` | 评分 CRUD |
| `favorites.test.ts` | 收藏切换 |
| `users.test.ts` | 用户统计/活动 |

### 缺失测试
- [ ] projects.test.ts
- [ ] uploads.test.ts
- [ ] rankings.test.ts (需 Redis mock)
- [ ] forum.test.ts (帖子/回复/投票)
- [ ] notifications.test.ts

---

## 10. 总结

### 完成度统计
| Batch | 后端 | 前端 | Shared | 状态 |
|-------|------|------|--------|------|
| Batch 1 | ✅ | ✅ | ✅ | 完成 |
| Batch 2 | ✅ | ✅ | ✅ | 完成 |
| Batch 3 | ✅ | ✅ | ⚠️ 类型需修复 | 基本完成 |
| Batch 4 | ✅ | ✅ | ✅ | 完成 |
| Batch 5 | ✅ | ✅ | ✅ | 完成 |
| Batch 6 | ✅ | ✅ | ⚠️ 类型需修复 | 基本完成 |
| Batch 7 | ❌ 路由缺失 | ✅ 类型存在 | ⚠️ 类型需修复 | **未完成** |
| Batch 8 | N/A | N/A | N/A | 依赖 Batch 7 |
| **Batch 9** | **本文档** | | | **集成阶段** |

### 最高优先级行动项
1. **实现 notifications.ts 路由** (Batch 7 阻塞项)
2. **注册 forum 路由到 index.ts** (一行代码)
3. **修复 shared types 字段不匹配** (4 个类型文件)
4. **解决 schema 命名冲突** (2 套文件)
5. **添加 forumApi/notificationsApi 到 api-client.ts**
