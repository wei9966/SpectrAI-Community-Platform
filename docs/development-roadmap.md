# SpectrAI 社区平台 — 开发路线图

> 日期：2026-03-31
> 基于代码审计 & 设计文档对照生成
> 状态：待头脑风暴确认

---

## 一、Phase 1 MVP 补齐清单（当前阶段）

当前 Phase 1 完成度约 **65-70%**，以下为需要补齐的具体任务：

### 1.1 前端接通真实 API（优先级：P0 🔴）

当前市场页、详情页、用户页均使用 `mock-data.ts` 硬编码数据，需全部切换为真实 API 调用。

| 页面/组件 | 当前状态 | 需要做的事 |
|-----------|---------|-----------|
| `/marketplace` | 使用 mock 数据本地筛选 | 接 `GET /api/resources` 真实分页+筛选+搜索 |
| `/resource/[id]` | 部分 mock | 接 `GET /api/resources/:id`，下载计数、点赞状态均需真实接口 |
| `/user/[username]` | 仅展示 mock 用户 AIBuilder | 接 `GET /api/users/:username` + `GET /api/users/:username/resources` |
| `CommentSection` | `console.log` 占位 | 接 `GET/POST /api/resources/:id/comments`，实现评论提交和列表展示 |
| `ResourceCard` | 使用本地 mock 数据 | 确保从 API 返回数据正确映射字段 |
| 点赞按钮 | UI 存在但未接 API | 接 `POST /api/resources/:id/like`，同步点赞状态 |

### 1.2 用户资料编辑（优先级：P1 🟡）

| 缺失项 | 说明 |
|--------|------|
| `PUT /api/users/:username` 端点 | 后端缺少用户资料更新接口（bio、avatar、username） |
| `/settings` 或 `/user/edit` 页面 | 前端缺少用户设置/编辑页面 |
| 头像上传 | 当前使用 DiceBear 生成，缺少自定义上传能力 |

### 1.3 标签筛选增强（优先级：P1 🟡）

| 缺失项 | 说明 |
|--------|------|
| 按标签筛选资源 | `TypeFilter` 仅支持类型，需增加标签维度筛选 |
| 标签云/热门标签 | 市场页缺少热门标签入口 |
| API 标签过滤参数 | `GET /api/resources` 需支持 `tags` 查询参数 |

### 1.4 基础设施补全（优先级：P1 🟡）

| 缺失项 | 说明 |
|--------|------|
| Nginx 反向代理 | `docker-compose.yml` 缺少 Nginx 服务，生产环境需要反向代理 + SSL |
| Redis 缓存启用 | Redis 已配置但路由中未实际使用，建议对热门资源列表、排行做缓存 |
| 忘记密码页面 | `/login` 有链接指向 `/forgot-password`，但该页面不存在 |
| 邮箱验证流程 | 注册后无邮箱验证机制 |

### 1.5 前后端细节修复（优先级：P2 🟢）

| 缺失项 | 说明 |
|--------|------|
| 评论删除/编辑 | 已有创建评论接口，但无编辑和删除 |
| 资源编辑页面 | API 有 `PUT /api/resources/:id`，但前端无编辑入口/页面 |
| 资源删除确认 | API 有 `DELETE /api/resources/:id`，但前端无删除按钮和确认弹窗 |
| 错误提示 Toast | Radix UI Toast 已引入但未集成使用 |
| CORS 生产配置 | 当前硬编码 localhost:3000/5173，需环境变量化 |
| 密码重置 | 缺少完整流程（发邮件→验证→重置） |

---

## 二、Phase 2 — 社交化功能

> 前置条件：Phase 1 补齐完成

### 2.1 评分系统（P0 🔴）

| 功能 | 说明 |
|------|------|
| `resource_ratings` 数据表 | 新建表：resourceId、userId、score(1-5)、createdAt，unique(resourceId, userId) |
| `POST /api/resources/:id/rate` | 提交评分（1-5 星），同一用户可修改评分 |
| `GET /api/resources/:id` 扩展 | 返回 averageRating、ratingCount |
| 前端星级组件 | 资源详情页 + ResourceCard 展示星级 |
| 按评分排序 | `GET /api/resources?sort=rating` |

### 2.2 用户个人主页增强（P0 🔴）

| 功能 | 说明 |
|------|------|
| 个人主页 Tab 切换 | "我的资源" / "我的点赞" / "我的评论" 多 Tab 展示 |
| 统计面板 | 总下载量、总获赞、总评分、加入天数 |
| 活动时间线 | 最近发布/评论/点赞记录 |

### 2.3 作品展示 Showcase（P1 🟡）

| 功能 | 说明 |
|------|------|
| `projects` 数据表 | 新建表：id、title、description、coverImageUrl、githubUrl、demoUrl、authorId、toolChain(jsonb)、tags、likes、createdAt |
| `POST/GET/PUT/DELETE /api/projects` | 项目 CRUD |
| `/showcase` 页面 | 项目卡片网格：封面图 + 标题 + 简介 + GitHub 链接 + 使用的工具链 |
| `/showcase/[id]` 详情页 | 制作过程描述、截图/视频、关联的 Workflow/Skill/Team 资源 |
| `/showcase/submit` 发布页 | 项目信息表单 + 封面图上传 + 关联资源选择 |

### 2.4 收藏功能（P1 🟡）

| 功能 | 说明 |
|------|------|
| `resource_favorites` 数据表 | resourceId、userId、createdAt |
| `POST /api/resources/:id/favorite` | 收藏/取消收藏 Toggle |
| `/user/[username]/favorites` | 用户收藏列表页 |
| ResourceCard 收藏按钮 | 书签图标 + 计数 |

### 2.5 热门排行榜（P2 🟢）

| 功能 | 说明 |
|------|------|
| `/rankings` 页面 | 本周/本月/全部 热门资源排行 |
| 排行算法 | 综合 downloads × 0.4 + likes × 0.3 + rating × 0.3，加入时间衰减因子 |
| Redis 缓存 | 排行榜结果缓存 1 小时 |
| 首页精选 | 首页"热门资源"区块从排行榜 API 读取 |

### 2.6 文件存储（P1 🟡）

| 功能 | 说明 |
|------|------|
| OSS/S3 对接 | 阿里云 OSS 或 S3 兼容存储，用于头像、项目封面、资源包 |
| 图片上传 API | `POST /api/upload` 签名上传 + URL 返回 |
| 图片压缩 | 上传时自动生成缩略图（WebP 格式） |

---

## 三、Phase 3 — 论坛系统

> 前置条件：Phase 2 核心功能完成

### 3.1 数据模型（P0 🔴）

| 新建表 | 字段 |
|--------|------|
| `forum_categories` | id、name、slug、description、sortOrder、postCount |
| `forum_posts` | id、title、content(text)、categoryId、authorId、viewCount、replyCount、isPinned、isLocked、tags、createdAt、updatedAt |
| `forum_replies` | id、postId、authorId、content(text)、parentReplyId(可选，支持嵌套回复)、likes、createdAt |
| `forum_votes` | id、targetType(post/reply)、targetId、userId、voteType(up/down)、createdAt |

### 3.2 API 端点（P0 🔴）

| Method | Path | 说明 |
|--------|------|------|
| GET | `/api/forum/categories` | 获取板块列表 |
| GET | `/api/forum/posts` | 帖子列表（分页 + 板块筛选 + 排序：最新/最热/精华） |
| GET | `/api/forum/posts/:id` | 帖子详情 + 回复列表 |
| POST | `/api/forum/posts` | 发帖（需登录） |
| PUT | `/api/forum/posts/:id` | 编辑帖子（作者/管理员） |
| DELETE | `/api/forum/posts/:id` | 删除帖子（作者/管理员） |
| POST | `/api/forum/posts/:id/replies` | 回复帖子 |
| POST | `/api/forum/votes` | 投票（帖子或回复） |
| POST | `/api/forum/posts/:id/pin` | 置顶帖子（管理员） |
| POST | `/api/forum/posts/:id/lock` | 锁定帖子（管理员） |

### 3.3 前端页面（P0 🔴）

| 页面 | 路由 | 说明 |
|------|------|------|
| 论坛首页 | `/forum` | 板块列表 + 最新帖子 + 热门帖子 |
| 板块页 | `/forum/[category]` | 该板块帖子列表，支持排序筛选 |
| 帖子详情 | `/forum/post/[id]` | 帖子内容 + 回复列表 + 投票 |
| 发帖页 | `/forum/new` | Markdown 富文本编辑器 + 板块选择 + 标签 |

### 3.4 Markdown 编辑器（P1 🟡）

| 功能 | 说明 |
|------|------|
| 编辑器组件 | 基于 MDXEditor 或 Milkdown，支持实时预览 |
| 代码高亮 | Prism.js 已引入，支持主流语言语法高亮 |
| 图片上传 | 复用 Phase 2 的 OSS 上传能力 |
| @提醒 | 输入 @ 弹出用户选择器 |
| 表情支持 | Emoji Picker |

### 3.5 通知系统（P1 🟡）

| 功能 | 说明 |
|------|------|
| `notifications` 数据表 | id、userId、type(comment/reply/like/follow/system)、title、content、sourceType、sourceId、isRead、createdAt |
| `GET /api/notifications` | 获取用户通知列表（分页 + 未读筛选） |
| `PUT /api/notifications/:id/read` | 标记已读 |
| `PUT /api/notifications/read-all` | 全部标记已读 |
| Header 通知铃铛 | 未读数 Badge + 下拉通知列表 |
| 触发规则 | 资源被评论/被点赞/被收藏时 → 通知作者；帖子被回复 → 通知发帖人；被 @ → 通知被提及人 |

### 3.6 投票机制（P2 🟢）

| 功能 | 说明 |
|------|------|
| 帖子/回复投票 | 赞同/反对，净票数排序 |
| 功能请求投票 | 专门的"功能请求"板块，按投票数排序 |
| 最佳答案 | "使用帮助"板块，发帖人可标记最佳答案 |

---

## 四、Phase 4 — 增强迭代

> 持续迭代，按优先级逐步推进

### 4.1 贡献者等级体系（P0 🔴）

| 功能 | 说明 |
|------|------|
| `user_points` 数据表 | userId、totalPoints、level、pointsHistory(jsonb) |
| 积分规则 | 发布资源 +10、获赞 +2、被安装 +5、被评论 +3、发帖 +5、被采纳 +15 |
| 等级定义 | Lv1 新手(0) → Lv2 活跃(50) → Lv3 贡献者(200) → Lv4 专家(500) → Lv5 大使(1500) |
| 等级特权 | Lv2: 自定义头像框；Lv3: 精选推荐权；Lv4: 社区版主候选；Lv5: Beta 功能优先体验 |
| 个人主页徽章 | 等级 Badge + 积分进度条 |

### 4.2 资源版本管理（P1 🟡）

| 功能 | 说明 |
|------|------|
| `resource_versions` 数据表 | id、resourceId、version、content(jsonb)、changelog、createdAt |
| 版本历史页 | 资源详情页 Tab："版本历史"，展示各版本 changelog |
| 版本回退 | 作者可恢复到之前版本 |
| 升级通知 | 已安装用户收到版本更新通知 |
| Semver 校验 | 新版本号必须大于当前版本 |

### 4.3 桌面端集成（P0 🔴）

| 功能 | 说明 |
|------|------|
| `spectrai://` 协议注册 | 桌面端注册自定义协议处理器 |
| Deep Link 格式 | `spectrai://install/{type}/{id}?version=x`、`spectrai://open/{type}/{id}` |
| 资源导入引擎 | 桌面端接收 Deep Link → 下载 JSON → Schema 校验 → 导入到本地 |
| 一键发布 | 桌面端 Workflow/Skill/Team 编辑器→"发布到社区"按钮→调 API 创建资源 |
| SSO 同步 | 桌面端登录状态与 Web 端统一（共享 JWT Token） |
| 社区通知组件 | 桌面端侧边栏展示社区通知和资源更新 |

### 4.4 内容审核与安全（P1 🟡）

| 功能 | 说明 |
|------|------|
| 资源沙箱验证 | 上传时 JSON Schema 校验 + 静态分析检测恶意代码 |
| 举报系统 | 资源/帖子/评论举报按钮 → 管理员审核队列 |
| AI 辅助审核 | 接入 AI 模型检测不当内容 |
| 速率限制 | API Rate Limiting（基于 Redis，按 IP 和用户） |
| RBAC 权限 | 管理员/版主/普通用户 三级权限控制 |
| CSP 安全头 | Content-Security-Policy 防 XSS |

### 4.5 API 开放（P2 🟢）

| 功能 | 说明 |
|------|------|
| API Key 管理 | 用户可创建 API Key 用于第三方集成 |
| OpenAPI 文档 | Swagger/Scalar 自动生成 API 文档 |
| Webhook | 资源发布/更新时触发 Webhook 通知 |
| 开发者文档 | 完整的 API 使用教程和示例 |

### 4.6 国际化 i18n（P2 🟢）

| 功能 | 说明 |
|------|------|
| i18n 框架 | next-intl 或 next-i18next |
| 语言包 | 中文（默认）+ 英文 |
| 路由策略 | `/zh/marketplace`、`/en/marketplace` 子路径模式 |
| 内容国际化 | 资源描述可选多语言版本 |

### 4.7 SEO 与性能（P2 🟢）

| 功能 | 说明 |
|------|------|
| SSR/SSG 策略 | 资源详情 SSG + ISR 增量更新，论坛 SSR |
| Meta 标签 | 每页动态 title/description/og:image |
| 结构化数据 | JSON-LD：SoftwareApplication (资源)、DiscussionForumPosting (帖子) |
| Sitemap | 自动生成 XML Sitemap |
| CDN | 静态资源 + 图片走 CDN |
| 图片优化 | Next.js Image 组件 + WebP 格式 |

---

## 五、阶段依赖关系

```
Phase 1 补齐（前端接 API + 用户编辑 + 标签 + 基础设施）
    │
    ├── Phase 2 社交化（评分 + Showcase + 收藏 + 排行榜 + OSS 文件存储）
    │       │
    │       └── Phase 3 论坛（帖子系统 + Markdown 编辑器 + 通知 + 投票）
    │               │
    │               └── Phase 4 增强（等级体系 + 版本管理 + API 开放 + i18n）
    │
    └── Phase 4.3 桌面端集成（可与 Phase 2/3 并行，独立于 Web 端）
```

---

## 六、团队开发建议

每个 Phase 建议的团队角色分工：

### Phase 1 补齐
- **前端开发** — 接通 API、Toast 集成、页面修复
- **后端开发** — 用户编辑接口、标签筛选、Redis 缓存
- **DevOps** — Nginx 配置、CORS 修复、部署脚本

### Phase 2 社交化
- **前端开发** — 评分组件、Showcase 页面、收藏功能、排行榜页面
- **后端开发** — 评分/收藏/项目 API、排行算法、OSS 集成
- **审查者** — API 设计评审、数据库 Schema 评审

### Phase 3 论坛
- **前端开发** — 论坛页面、Markdown 编辑器集成、通知组件
- **后端开发** — 论坛 API、通知系统、投票机制
- **审查者** — 安全审查（XSS/注入防护）、性能审查

### Phase 4 增强
- **全栈开发** — 等级体系、版本管理
- **桌面端开发** — Deep Link 协议、导入引擎、SSO
- **DevOps** — API Gateway、Rate Limiting、CDN、i18n

---

*本文档基于 2026-03-31 代码审计结果生成，供后续头脑风暴和团队开发使用。*
