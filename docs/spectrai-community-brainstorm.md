# SpectrAI 社区平台 — 头脑风暴报告

> 日期：2026-03-30
> 版本：v0.1 草案
> 状态：待确认

---

## 一、项目现状分析

### 1.1 SpectrAI 是什么

SpectrAI 是一个 **多 AI CLI 会话编排桌面端**（Electron 28 + React 18 + TypeScript），用户通过它同时操控 Claude Code、Codex、Gemini 等多种 AI 工具协作开发软件。

### 1.2 核心能力一览

| 能力 | 说明 |
|------|------|
| 多会话管理 | 同时运行多个 AI 会话，结构化对话视图 |
| Provider 适配 | 6+ AI 提供者统一接口（Claude Code、Codex、Gemini、iFlow、OpenCode 等） |
| Agent 编排 | spawn 子 Agent、Supervisor 模式、自动分配任务 |
| 团队协作 | 多 AI 角色 P2P 协作、SharedTaskList、TeamBus |
| Workflow DAG | 可视化多步骤自动化流水线，5+ 内置模板 |
| Skill 市场 | 13+ 内置技能 + 在线 registry |
| MCP 生态 | 20+ MCP 工具服务器 |
| 远程控制 | Telegram Bot 远程操控 |
| 原型设计 | HTML/React 原型预览 |
| 监控仪表盘 | Token 用量、会话统计、30 天趋势图 |

### 1.3 用户产出物

用户使用 SpectrAI 主要产出以下内容：

1. **软件项目** — 用 AI 辅助开发的完整应用
2. **Workflow 模板** — 可复用的 DAG 流水线
3. **Team 模板** — 多 AI 角色配置方案
4. **Skill 模板** — 自定义提示词/命令
5. **MCP 服务器** — 自定义工具扩展
6. **原型页面** — AI 生成的 UI 设计

### 1.4 已有分享基础设施

| 基础设施 | 现状 |
|----------|------|
| PHP 后端 | `claudeops.wbdao.cn/api/` — 用户认证、遥测统计、Relay 模板 CRUD |
| Skill Registry | GitHub JSON 注册表，Markdown → promptTemplate 转换 |
| MCP Registry | JSON 注册表 + 24h 缓存 |
| Edition 分层 | 已有 `community / pro` 版本区分 |

---

## 二、社区定位 — 三层架构

SpectrAI 社区应分为三个层次，从轻到重递进建设：

### 层次 1：资源市场（Marketplace）

**定位**：用户分享用 SpectrAI 创建的"配方"

**分享物类型**：
- **Workflow 模板** — "一键生成 Next.js 全栈项目"、"自动化 Code Review 流水线"
- **Team 模板** — "前后端+测试三人协作配置"
- **Skill 模板** — 自定义提示词、代码审查规则
- **MCP 扩展** — 自建工具服务器
- **Quick Action 集合** — 高频操作快捷方式

**核心价值**：降低新用户上手门槛，让高手的经验可复用。相当于 VS Code 的插件市场。

### 层次 2：作品展示（Showcase）

**定位**：用户分享用 SpectrAI 做出来的项目/成果

**分享物类型**：
- **开源项目** — AI 辅助开发的完整应用（GitHub 链接 + 制作过程）
- **原型设计** — AI 生成的 UI 方案
- **教程/案例** — "我用 SpectrAI 3 小时搭了一个 SaaS"
- **视频演示** — 录制开发过程

**核心价值**：证明 SpectrAI 的能力，形成口碑传播，让用户看到"别人用这个工具做出了什么"。

### 层次 3：交流论坛（Forum）

**定位**：用户之间讨论问题、分享经验

**板块设计**：
- **使用帮助** — 安装、配置、常见问题
- **功能请求** — 投票驱动的需求收集
- **Bug 反馈** — 结构化的问题上报
- **技巧分享** — Workflow 设计心得、Provider 对比、最佳实践
- **开发者交流** — 对 SpectrAI 本身做二次开发/贡献的讨论

---

## 三、技术方案对比

### 方案 A：独立 Web 项目

```
spectrai-community/
├── frontend/       # React/Next.js Web 应用
├── backend/        # Node.js API 服务
└── shared/         # 共享类型定义
```

| 维度 | 评价 |
|------|------|
| 优势 | 不污染桌面端代码；SEO 友好；移动端友好；可做官网门户；新人无需安装软件即可浏览 |
| 劣势 | 需独立维护前后端；需与桌面端打通认证 |

### 方案 B：嵌入桌面端

在 SpectrAI 里新增"社区"Tab，WebView 加载社区页面。

| 维度 | 评价 |
|------|------|
| 优势 | 一键发布/安装；不离开软件 |
| 劣势 | 必须打开软件才能访问；Electron WebView 限制多；增加桌面端复杂度 |

### 方案 C：混合模式（推荐）

**独立 Web 站 + 桌面端轻集成**

- 社区是独立的 Web 应用，有完整的浏览器访问体验
- 桌面端通过 API 集成：一键发布、一键安装、通知推送
- 共享同一套用户系统（复用已有 PHP 后端的 auth 基础）

**推荐理由**：兼顾传播性和使用便利性，是最佳平衡点。

---

## 四、社区核心功能模块

### 4.1 资源市场

**功能概览**

| 功能 | 说明 |
|------|------|
| 资源上传 | 用户从 SpectrAI 一键导出 → 上传到社区 |
| 分类浏览 | 按类型（Workflow/Team/Skill/MCP）+ 标签筛选 |
| 一键安装 | 点击安装 → 调起 SpectrAI 自动导入 |
| 版本管理 | 资源可以更新版本，用户收到升级通知 |
| 评分评论 | 打星 + 文字评价 |
| 下载统计 | 热门排行、趋势榜 |
| 预览 | Workflow 的 DAG 图、Skill 的提示词预览 |

**用户故事**

| 编号 | 用户故事 | 优先级 |
|------|---------|--------|
| US-4.1.1 | 作为资源创作者，我想将 SpectrAI 中调试好的 Workflow 一键发布到社区，以便其他用户可以直接复用 | P0 |
| US-4.1.2 | 作为新用户，我想按类型和标签浏览社区资源，以便快速找到适合我场景的模板 | P0 |
| US-4.1.3 | 作为浏览者，我想点击"安装"后自动调起 SpectrAI 并导入资源，以便无需手动下载配置 | P0 |
| US-4.1.4 | 作为资源维护者，我想发布新版本时通知所有已安装用户，以便他们及时获取改进 | P1 |
| US-4.1.5 | 作为用户，我想在安装前预览 Workflow 的 DAG 图和 Skill 的提示词，以便判断是否符合需求 | P1 |

**资源全链路流程**

```
创建 → 导出 → 上传 → 审核 → 发布 → 发现 → 安装 → 使用 → 反馈
```

1. **创建**：用户在 SpectrAI 桌面端创建/编辑 Workflow、Skill、Team 或 MCP 配置
2. **导出**：点击"发布到社区"，桌面端自动将配置导出为标准 JSON 包（含 metadata + payload，格式见第十三章）
3. **上传**：桌面端调用 `POST /api/resources` 上传 JSON 包，附带截图和 README 描述
4. **审核**：
   - **自动审核**：JSON Schema 校验 → 安全扫描（恶意脚本、敏感信息检测）→ 兼容性校验（`spectrai_version_min` 匹配）
   - **人工审核**（可选）：社区版主抽检，初期全量审核，后期转为抽检 + 举报触发
5. **发布**：审核通过后状态变为 `published`，进入公开列表，触发关注者通知
6. **发现**：用户通过搜索、分类浏览、排行榜、个性化推荐发现资源
7. **安装**：点击"安装到 SpectrAI" → 触发 `spectrai://install?resource_id=xxx` Deep Link → 桌面端资源导入引擎解析 JSON 包 → 写入本地配置
8. **使用**：用户在 SpectrAI 中直接使用导入的资源
9. **反馈**：用户评分、评论、举报问题，形成质量闭环

**版本管理机制**

| 维度 | 规范 |
|------|------|
| 版本号 | 遵循 SemVer（`major.minor.patch`），如 `1.2.3` |
| 发布新版 | 作者调用 `POST /api/resources/:id/versions` 提交新版本包 |
| 变更日志 | 每个版本必须附带 changelog 描述变更内容 |
| 向后兼容 | minor/patch 版本保证向后兼容；major 版本可含 breaking changes |
| 升级通知 | 桌面端定期轮询已安装资源版本（30 分钟间隔），有更新时弹出通知 |
| 回滚机制 | 桌面端保留前一版本备份，升级失败或不满意可一键回滚 |
| 版本锁定 | 用户可锁定到指定版本，不接收自动升级提示 |
| 版本淘汰 | 作者可标记旧版本为 `deprecated`，安装页展示迁移指引 |

**验收标准**

- [ ] 用户可从 SpectrAI 桌面端一键导出资源并上传至社区
- [ ] 资源上传后 30 秒内完成自动审核（Schema 校验 + 安全扫描）
- [ ] 已发布资源可通过分类、标签、关键词搜索准确找到
- [ ] 点击安装后 5 秒内调起桌面端并开始导入
- [ ] 资源作者可发布新版本，已安装用户在 24 小时内收到更新通知
- [ ] 版本回滚功能正常，回滚后资源配置与旧版一致

### 4.2 作品展示

**功能概览**

| 功能 | 说明 |
|------|------|
| 项目卡片 | 封面图 + 简介 + GitHub 链接 + 使用的工具链 |
| 制作过程 | 可附带教程/视频，描述 AI 开发流程 |
| 标签系统 | "Next.js" "Python" "全栈" "CLI 工具" 等 |
| 点赞收藏 | 社交互动 |
| 关联资源 | 该项目使用了哪些 Workflow/Skill/Team |

**用户故事**

| 编号 | 用户故事 | 优先级 |
|------|---------|--------|
| US-4.2.1 | 作为开发者，我想展示自己用 SpectrAI 完成的项目，以便获得社区认可和反馈 | P1 |
| US-4.2.2 | 作为新用户，我想浏览优秀作品及其制作过程，以便学习 AI 辅助开发的最佳实践 | P1 |
| US-4.2.3 | 作为浏览者，我想一键安装某个项目使用的 Workflow/Skill 组合，以便复现类似项目 | P2 |
| US-4.2.4 | 作为内容创作者，我想为项目撰写图文教程或上传视频演示，以便完整展示开发过程 | P2 |

**交互流程**

1. 用户点击"提交作品" → 填写项目信息表单（标题、简介、封面图、GitHub 链接）
2. 选择技术标签（框架、语言、应用类型）
3. 勾选关联的 SpectrAI 资源（从自己已发布的资源中选择）
4. 可选：撰写 Markdown 格式制作过程教程，或上传视频演示（支持外链嵌入）
5. 提交后进入审核队列（基础信息校验 + 链接有效性检查 + 封面图合规检查）
6. 发布后出现在 Showcase 页面，参与排行和推荐

**验收标准**

- [ ] 项目卡片完整展示：封面图、标题、简介、标签、点赞数、浏览量
- [ ] 支持通过标签和关键词搜索作品
- [ ] 关联资源可一键跳转到资源详情页并安装
- [ ] 教程内容支持 Markdown 渲染和代码高亮
- [ ] 视频演示支持 Bilibili / YouTube 外链嵌入

### 4.3 论坛

**功能概览**

| 功能 | 说明 |
|------|------|
| 分板块发帖 | 帮助 / 功能请求 / Bug / 技巧 / 开发者 |
| Markdown 编辑器 | 支持代码高亮、图片上传 |
| 投票机制 | 功能请求投票、答案投票 |
| 标签 + 搜索 | 全文搜索 |
| 通知系统 | 回复通知、@提醒 |

**用户故事**

| 编号 | 用户故事 | 优先级 |
|------|---------|--------|
| US-4.3.1 | 作为遇到问题的用户，我想在帮助板块发帖描述问题并附上日志/截图，以便获得社区或官方的解答 | P1 |
| US-4.3.2 | 作为产品使用者，我想对功能请求投票，以便影响产品开发优先级 | P1 |
| US-4.3.3 | 作为经验丰富的用户，我想撰写技巧分享帖，以便帮助他人提升使用效率 | P2 |
| US-4.3.4 | 作为开发者，我想在开发者板块讨论 SpectrAI 的二次开发和插件机制，以便参与生态建设 | P2 |

**板块详细设计**

| 板块 | 帖子模板 | 状态流转 |
|------|---------|---------|
| 使用帮助 | 问题描述 + 环境信息 + 复现步骤 | 待回答 → 已回答 → 已解决 |
| 功能请求 | 需求描述 + 使用场景 + 期望行为 | 投票中 → 已采纳 → 开发中 → 已上线 |
| Bug 反馈 | 版本号 + 复现步骤 + 期望/实际行为 + 日志 | 待确认 → 已确认 → 修复中 → 已修复 |
| 技巧分享 | 教程正文 + 相关资源链接 | 已发布（无状态流转） |
| 开发者交流 | 自由格式 | 已发布（无状态流转） |

**交互流程**

1. 用户选择板块 → 点击"发帖" → 按板块模板填写标题、正文（Markdown）、选择标签
2. 发布后通知板块关注者和被 @提及的用户
3. 其他用户可回复（支持楼中楼嵌套两层）、投票（赞/踩）、@提及、收藏
4. 功能请求帖达到投票阈值（默认 10 票）后自动同步到内部需求池
5. Bug 帖可由版主/官方人员更新状态标签

**验收标准**

- [ ] 支持 5 个预设板块的分板块发帖，各板块有独立的帖子模板
- [ ] Markdown 编辑器支持代码高亮（10+ 语言）、图片拖拽上传（限制 5MB/张）
- [ ] 功能请求帖支持投票，按票数排序展示
- [ ] 全文搜索结果在 500ms 内返回
- [ ] 帖子状态流转由版主/官方操作，状态变更触发通知

### 4.4 用户系统

**功能概览**

| 功能 | 说明 |
|------|------|
| 统一认证 | 复用已有 PHP 后端 auth + GitHub OAuth |
| 个人主页 | 发布的资源、作品、帖子汇总 |
| 贡献者等级 | 根据分享量/评分/活跃度晋级 |
| 关注机制 | 关注创作者，Feed 流更新 |

**用户故事**

| 编号 | 用户故事 | 优先级 |
|------|---------|--------|
| US-4.4.1 | 作为新用户，我想通过 GitHub 账号一键注册并登录社区和桌面端，以便无需管理额外密码 | P0 |
| US-4.4.2 | 作为活跃贡献者，我想在个人主页展示我的资源、作品和贡献等级，以便建立社区声誉 | P1 |
| US-4.4.3 | 作为用户，我想关注感兴趣的创作者并通过 Feed 流获取他们的动态，以便发现优质内容 | P2 |

**贡献者等级体系**

| 等级 | 名称 | 积分要求 | 权益 |
|------|------|---------|------|
| Lv.0 | 新手 | 0 | 浏览、安装、评论 |
| Lv.1 | 贡献者 | 50 | 发布资源、提交作品 |
| Lv.2 | 活跃者 | 200 | 参与资源审核投票 |
| Lv.3 | 专家 | 500 | 获得"专家"徽章，审核权限 |
| Lv.4 | 大师 | 2000 | 获得"大师"徽章，推荐位展示 |

> 积分规则：发布资源 +20、资源被安装 +2/次、获得好评 +5、发帖 +3、回答被采纳 +10

**交互流程**

1. **注册/登录**：点击"GitHub 登录" → GitHub OAuth 授权 → 后端创建/关联账号 → 签发 JWT → 通过 `spectrai://auth` 同步到桌面端
2. **个人主页**：展示头像、简介、等级徽章、统计面板（资源数、获赞数、被安装总次数、积分）
3. **Feed 流**：聚合关注用户的动态（新资源发布、新作品提交、论坛活动），按时间倒序，支持无限滚动

**验收标准**

- [ ] GitHub OAuth 登录流程 ≤ 3 步点击完成
- [ ] 个人主页数据在用户操作后 1 分钟内更新
- [ ] 贡献者等级根据积分自动计算并展示
- [ ] Feed 流按时间倒序，支持无限滚动加载

### 4.5 通知系统

**通知类型与渠道**

| 通知类型 | 触发条件 | 站内 | 桌面端推送 | 邮件 |
|---------|---------|:----:|:--------:|:----:|
| 资源更新 | 已安装的资源发布新版本 | ✅ | ✅ | ❌ |
| 评论回复 | 自己的资源/帖子收到新评论 | ✅ | ❌ | ✅ |
| @提及 | 被其他用户在帖子/评论中 @提到 | ✅ | ❌ | ✅ |
| 审核结果 | 提交的资源审核通过或被拒绝 | ✅ | ✅ | ✅ |
| 关注动态 | 关注的用户发布新内容 | ✅ | ❌ | ❌ |
| 系统公告 | 平台更新、活动、维护通知 | ✅ | ✅ | ✅ |
| 投票达标 | 自己发起的功能请求达到投票阈值 | ✅ | ❌ | ✅ |
| 等级升级 | 积分达到新等级要求 | ✅ | ✅ | ❌ |

**技术设计**

| 组件 | 方案 |
|------|------|
| 站内通知存储 | `notifications` 表，记录 `user_id`、`type`、`payload`、`is_read`、`created_at` |
| 实时推送 | WebSocket（Socket.io）—— 用户在线时即时推送新通知小红点 |
| 桌面端推送 | 社区 API → 桌面端轮询（30 秒间隔）→ Electron Notification API 系统级通知 |
| 邮件通知 | 异步队列（Bull + Redis）→ Resend API / 阿里云邮件推送，防抖合并（5 分钟内同类通知合并为一封） |
| 用户偏好 | 用户可按通知类型 × 渠道细粒度开关，设置保存在 `user_notification_preferences` 表 |

### 4.6 内容审核流程

**审核管线**

```
用户提交 → 自动审核 ─→ [通过] → 直接发布
                    ├→ [可疑] → 进入人工审核队列 → 版主审核 → 通过/拒绝
                    └→ [拒绝] → 通知作者 + 附带拒绝原因和修改建议
```

**自动审核检查项**

| 检查项 | 检测方法 | 说明 |
|--------|---------|------|
| Schema 合规 | JSON Schema 校验（Ajv） | 确保资源包结构符合第十三章定义的格式 |
| 恶意脚本检测 | 正则匹配 + AST 静态分析 | 检测 shell 注入、`eval()`、远程下载等危险操作 |
| 敏感信息扫描 | 正则匹配 + 熵值分析 | 检测 API Key、密码、私钥、Token 等意外泄露 |
| 内容合规 | AI 文本审核（调用内容安全 API） | 检测违规、色情、政治敏感等内容 |
| 兼容性校验 | 版本范围比对 | `spectrai_version_min` 不低于平台最低支持版本 |
| 文件大小限制 | 阈值检查 | 单个资源包 ≤ 10MB，单个截图 ≤ 5MB |

**社区举报机制**

| 维度 | 规则 |
|------|------|
| 举报入口 | 资源详情页、帖子、评论均有"举报"按钮 |
| 举报原因 | 恶意内容 / 抄袭侵权 / 信息过时 / 垃圾广告 / 其他 |
| 自动下架 | 同一内容被 ≥ 3 个不同用户举报后自动下架，进入人工复审 |
| 处理时效 | 举报处理结果在 48 小时内反馈给举报者 |
| 申诉机制 | 被拒绝/下架的作者可提交申诉，由高级版主二次审核 |

---

## 五、技术栈建议

### 5.1 技术栈总览

| 层级 | 推荐技术 | 备选方案 | 理由 |
|------|---------|---------|------|
| 前端 | Next.js 15 (App Router) | Nuxt 3 / Remix | SSR/SSG 友好、SEO 好、React 生态复用 |
| UI 框架 | Tailwind CSS + shadcn/ui | Ant Design / Material UI | 与 SpectrAI 桌面端风格统一 |
| 后端 | Fastify 5 | Hono / Express | 与桌面端统一 TypeScript 生态，性能优秀 |
| ORM | Drizzle ORM | Prisma | 轻量、类型安全、SQL-like API |
| 数据库 | PostgreSQL 16 | MySQL 8.x | 结构化数据 + JSONB + 内置全文搜索 |
| 文件存储 | 阿里云 OSS | MinIO（自部署） | 资源包、图片、视频 |
| 搜索引擎 | MeiliSearch | PostgreSQL FTS（MVP） | 资源/帖子全文搜索，中文友好 |
| 缓存 | Redis 7 | Dragonfly | 热门排行、会话缓存、消息队列 |
| 部署 | Docker Compose + Nginx | Kubernetes（后期） | 复用 `claudeops.wbdao.cn` 服务器 |

### 5.2 整体架构图

```
                           ┌─────────────────────┐
                           │   CDN (阿里云/CF)    │
                           └─────────┬───────────┘
                                     │
                           ┌─────────▼───────────┐
                           │  Next.js Frontend    │
                           │  (SSR + Static)      │
                           └─────────┬───────────┘
                                     │
                           ┌─────────▼───────────┐
                           │  API Gateway (Nginx) │
                           │  Rate Limit + SSL    │
                           └─────────┬───────────┘
                                     │
              ┌──────────────────────┼──────────────────────┐
              │                      │                      │
    ┌─────────▼─────────┐ ┌─────────▼─────────┐ ┌─────────▼─────────┐
    │   Fastify API     │ │   Auth Service    │ │   File Service    │
    │   (核心业务)       │ │  (JWT + OAuth)    │ │  (上传/下载)       │
    └────────┬──────────┘ └────────┬──────────┘ └────────┬──────────┘
             │                     │                      │
    ┌────────▼──────────┐ ┌───────▼───────┐    ┌────────▼──────────┐
    │  PostgreSQL 16    │ │   Redis 7     │    │  阿里云 OSS       │
    │  (主数据库)        │ │  (缓存+队列)   │    │  (文件存储)        │
    └────────┬──────────┘ └───────────────┘    └───────────────────┘
             │
    ┌────────▼──────────┐
    │   MeiliSearch     │
    │  (全文搜索引擎)     │
    └───────────────────┘
```

### 5.3 前端框架对比

**推荐：Next.js 15 (App Router)**

| 对比维度 | Next.js 15 | Nuxt 3 | Remix |
|---------|-----------|--------|-------|
| 底层框架 | React 19 | Vue 3 | React 19 |
| 渲染模式 | SSR / SSG / ISR / RSC 灵活切换 | SSR / SSG / ISR | SSR（loader/action 模型） |
| npm 周下载量 | ~700 万 | ~50 万 | ~30 万 |
| 与桌面端代码复用 | SpectrAI 用 React，组件/类型可直接复用 | 需重写为 Vue 组件 | 部分复用 |
| SEO 支持 | App Router + metadata API 原生支持 | 内置 `useSeoMeta` | 需手动配置 `meta` |
| 数据获取 | Server Components + Server Actions | `useFetch` + `useAsyncData` | `loader` + `action` |
| 部署灵活度 | Vercel / Docker / standalone Node.js | Nitro 多平台部署 | 多平台 |
| 生态与插件 | 最丰富，Auth.js / next-intl 等成熟方案 | 活跃，但规模较小 | 相对较少 |
| 学习曲线 | 中等（App Router + RSC 概念较新） | 低（约定优于配置） | 低（拥抱 Web 标准） |

**选型依据**：SpectrAI 桌面端为 React 18 + TypeScript 技术栈，选用 Next.js 可最大程度复用 UI 组件和类型定义，减少跨框架迁移成本。Next.js 的 React Server Components 可在服务端直接查询数据库，减少 API 层代码。

### 5.4 UI 框架对比

**推荐：Tailwind CSS + shadcn/ui**

| 对比维度 | Tailwind + shadcn/ui | Ant Design 5 | Material UI 6 |
|---------|---------------------|-------------|--------------|
| 样式方案 | 原子化 CSS，完全可定制 | CSS-in-JS (cssinjs) | Emotion CSS-in-JS |
| 产物大小 | 按需编译 ~10KB（gzip） | 完整引入 ~350KB（gzip） | ~250KB（gzip） |
| 与桌面端统一 | SpectrAI 已用 Tailwind，设计令牌复用 | 需重写样式系统 | 需重写样式系统 |
| 暗色模式 | 原生 `class="dark"` 切换 | ConfigProvider + 算法 | `createTheme` 内置 |
| 无障碍 | shadcn/ui 基于 Radix Primitives，ARIA 完整 | 较好 | 优秀 |
| 定制成本 | 修改 CSS 变量即可，无需覆盖组件样式 | 需通过 token 或 CSS 覆盖 | 需 theme override |

### 5.5 后端框架对比

**推荐：Fastify 5**

| 对比维度 | Fastify 5 | Hono 4 | Express 4 |
|---------|-----------|--------|-----------|
| 吞吐量（req/s） | ~78,000 (Node.js) | ~100,000 (Bun) / ~40,000 (Node.js) | ~15,000 |
| TypeScript 支持 | 一等公民，内置类型系统 | 一等公民，轻量类型 | 需 `@types/express` |
| 插件生态 | 200+ 官方/社区插件 | 较少（项目较新） | 最丰富（10,000+） |
| JSON Schema 验证 | 内置 Ajv 集成，请求/响应自动校验 | 需手动集成 Zod/Valibot | 需手动集成 |
| 日志系统 | 内置 Pino（结构化日志） | 无内置 | 无内置 |
| 生产成熟度 | 成熟，被 Fastify 基金会维护 | 较新，快速迭代 | 最稳定，项目最多 |

**选型依据**：Fastify 内置的 JSON Schema 校验与社区资源包验证场景天然契合；Pino 结构化日志便于运维监控；性能是 Express 的 5 倍以上，可以更少的服务器资源支撑更多并发。

### 5.6 数据库对比

**推荐：PostgreSQL 16**

| 对比维度 | PostgreSQL 16 | MySQL 8.4 | SQLite |
|---------|--------------|-----------|--------|
| 全文搜索 | 内置 `tsvector` + GIN 索引，支持中文（`zhparser`） | FULLTEXT 索引，中文需 `ngram` | FTS5 基础支持 |
| JSON 支持 | `JSONB` 原生类型 + GIN 索引 + 丰富操作符 | `JSON` 类型，索引和操作符有限 | `json_extract()` 函数 |
| 并发能力 | MVCC，读写不阻塞 | InnoDB 行级锁 | 写锁全表，单写并发 |
| 扩展生态 | `pg_trgm`（模糊搜索）、`pgvector`（向量检索）等 | 插件较少 | 无扩展机制 |
| ORM 支持 | Drizzle / Prisma / TypeORM 全支持 | 全支持 | 全支持 |
| 运维成本 | 中等，需调优 `shared_buffers` 等参数 | 低，默认配置可用 | 零运维 |

**选型依据**：社区资源包为 JSON 格式，PostgreSQL 的 `JSONB` 类型提供原生高效的结构化查询和 GIN 索引能力；内置全文搜索可在 MVP 阶段省去额外部署搜索引擎的成本；`pg_trgm` 扩展支持模糊搜索和拼写纠错。

### 5.7 搜索引擎对比

**推荐：MeiliSearch（MVP 阶段可先用 PostgreSQL FTS 过渡）**

| 对比维度 | PostgreSQL FTS | MeiliSearch 1.x | Elasticsearch 8.x |
|---------|---------------|-----------------|-------------------|
| 部署复杂度 | 无需额外部署 | Docker 单容器 (~50MB) | JVM 集群，需调优 |
| 中文分词 | 需安装 `zhparser` 扩展 | 内置 CJK 分词器 | 需安装 `ik` 插件 |
| 搜索延迟 | ~50ms（万级数据） | ~10ms（百万级数据） | ~20ms（百万级数据） |
| 容错搜索 | 需 `pg_trgm` 配合 | 内置 typo tolerance | 需配置 fuzzy query |
| 内存占用 | 与 PostgreSQL 共享 | ~100MB 起步 | ~1GB 起步（JVM 堆） |
| 运维成本 | 零（复用 DB） | 低 | 高（JVM GC 调优、集群管理） |
| 同义词/停用词 | 需手动配置字典 | 内置管理 API | 内置分析器配置 |

### 5.8 其他组件选型

| 组件 | 推荐方案 | 备选方案 | 选型理由 |
|------|---------|---------|---------|
| 缓存 | Redis 7 | Dragonfly（Redis API 兼容） | 成熟稳定，Bull 队列依赖 Redis |
| 文件存储 | 阿里云 OSS | MinIO（S3 兼容，自部署） | 国内访问快，CDN 集成方便 |
| 邮件服务 | Resend | 阿里云邮件推送 | API 友好，开发者体验好 |
| 消息队列 | BullMQ（Redis-based） | RabbitMQ | 与 Redis 复用，无需额外部署 |
| ORM | Drizzle ORM | Prisma | 更轻量、SQL-like API、无需二进制引擎 |
| 实时通信 | Socket.io | SSE（Server-Sent Events） | 双向通信，Fastify 插件成熟 |

---

## 六、桌面端集成方案

### 6.1 数据流向总览

```
SpectrAI 桌面端                         社区 Web
─────────────                         ──────────
Workflow 编辑器 ────── 一键发布 ──────→  资源详情页
Skill 管理器   ────── 一键发布 ──────→  资源详情页
Team 管理器    ────── 一键发布 ──────→  资源详情页
MCP 管理器     ────── 一键发布 ──────→  资源详情页
                                            │
资源导入引擎   ←────── 一键安装 ──────  安装按钮 (spectrai:// Deep Link)
通知中心       ←────── 更新推送 ──────  版本更新
用户设置       ←─────── SSO ────────→  统一认证
```

### 6.2 桌面端需新增的能力

| 能力 | 说明 | 优先级 |
|------|------|--------|
| 资源导出引擎 | 将本地配置打包为标准 JSON 包（含 metadata + payload） | P0 |
| `spectrai://` 协议注册 | Deep Link 支持一键安装、SSO 认证等 | P0 |
| 资源导入引擎 | 解析社区资源 JSON 包，校验后写入本地配置 | P0 |
| 社区通知组件 | 系统托盘图标 + 通知面板，展示资源更新和社区动态 | P1 |
| 登录状态同步 | 桌面端与 Web 端统一认证，JWT 共享 | P0 |
| 版本检查服务 | 后台轮询已安装资源的版本，有更新时提示用户 | P1 |
| 社区面板 | 桌面端内嵌轻量社区入口，展示热门资源和个人动态 | P2 |

### 6.3 `spectrai://` Deep Link 协议设计

**协议注册**

桌面端安装时通过 Electron 的 `app.setAsDefaultProtocolClient('spectrai')` 注册为 `spectrai://` 协议处理程序。Windows 下写入注册表 `HKCU\Software\Classes\spectrai`，macOS 下通过 `Info.plist` 的 `CFBundleURLSchemes` 声明。

**协议格式规范**

```
spectrai://<action>?<params>
```

**完整动作清单**

| 动作 | 格式 | 说明 |
|------|------|------|
| 安装资源 | `spectrai://install?resource_id=<uuid>&version=<semver\|latest>` | 从社区安装资源到本地 |
| SSO 认证 | `spectrai://auth?token=<jwt>&expires_at=<timestamp>` | Web 端登录后回调桌面端同步登录态 |
| 打开资源 | `spectrai://open?type=<workflow\|skill\|team\|mcp>&id=<local_id>` | 打开本地已安装的资源 |
| 打开社区页面 | `spectrai://community?path=<url_path>` | 在桌面端内嵌浏览器打开社区页面 |
| 导入剪贴板 | `spectrai://import?source=clipboard` | 从剪贴板导入资源 JSON |

**安装动作处理流程**

```
Web 浏览器                       桌面端 (Electron)
──────────                       ─────────────────
用户点击"安装到 SpectrAI"
       │
       ├─→ 浏览器打开 spectrai://install?resource_id=xxx&version=1.2.0
       │
       │                         Electron 捕获协议 URL
       │                               │
       │                         解析 action = "install"
       │                         提取 resource_id, version
       │                               │
       │                         调用 GET /api/resources/:id/versions/:version/download
       │                         获取资源 JSON 包
       │                               │
       │                         资源导入引擎处理：
       │                         ├─ 1. JSON Schema 校验
       │                         ├─ 2. 版本兼容性检查
       │                         ├─ 3. 冲突检测（本地是否已有同名资源）
       │                         ├─ 4. 用户确认对话框
       │                         └─ 5. 写入本地配置文件
       │                               │
       │                         弹出通知："资源安装成功"
       │                         自动打开对应管理器页面
```

**安全约束**

| 约束 | 说明 |
|------|------|
| URL 长度限制 | ≤ 2048 字符，超长参数通过 `resource_id` 引用服务端数据 |
| 参数校验 | 所有参数经过白名单校验，`resource_id` 必须为合法 UUID |
| Token 有效期 | `spectrai://auth` 中的 token 有效期 ≤ 5 分钟，一次性使用 |
| 用户确认 | 安装动作必须弹出确认对话框，展示资源名称和来源，用户点击确认后才执行 |
| 来源验证 | 下载的资源包 URL 必须匹配 `community.spectrai.xxx` 白名单域名 |

### 6.4 资源导出与导入详细流程

**导出流程（桌面端 → 社区）**

```
用户在桌面端                           社区后端
─────────────                        ──────────
1. 选择要发布的资源
   点击"发布到社区"
         │
2. 导出引擎启动：
   ├─ 读取本地配置文件
   ├─ 提取 payload（核心配置数据）
   ├─ 生成 metadata：
   │   ├─ name, description
   │   ├─ version (SemVer)
   │   ├─ author (当前登录用户)
   │   ├─ tags (用户选择)
   │   ├─ spectrai_version_min
   │   └─ type (workflow/skill/team/mcp)
   └─ 合并为标准 JSON 包
         │
3. 弹出发布表单：
   用户填写描述、选择分类/标签
   上传截图（可选）
         │
4. 调用 POST /api/resources ───────→ 5. 接收资源包
   Content-Type: multipart/form-data       ├─ JSON Schema 校验
   Body: { package.json, screenshots[] }   ├─ 安全扫描
                                           ├─ 存储到 OSS
                                           └─ 写入数据库
                                                 │
6. 收到发布结果 ←──────────────────── 返回 resource_id + 状态
   展示成功/失败消息                    (published / pending_review)
```

**导入流程（社区 → 桌面端）**

| 步骤 | 操作 | 失败处理 |
|------|------|---------|
| 1. 接收 Deep Link | Electron 捕获 `spectrai://install?resource_id=xxx` | 协议未注册时提示用户安装/更新 SpectrAI |
| 2. 检查登录态 | 验证本地 JWT 是否有效 | 过期则弹出登录引导 |
| 3. 下载资源包 | `GET /api/resources/:id/versions/:version/download` | 网络错误时重试 3 次，超时 30 秒 |
| 4. Schema 校验 | 用 Ajv 校验 JSON 包结构合规 | 校验失败提示"资源包格式不兼容" |
| 5. 版本兼容性检查 | 比对 `spectrai_version_min` 与当前桌面端版本 | 版本过低提示升级 SpectrAI |
| 6. 冲突检测 | 检查本地是否已有同 `resource_id` 的资源 | 已存在则提示"覆盖 / 保留旧版 / 取消" |
| 7. 用户确认 | 弹出对话框展示资源信息，用户点击"确认安装" | 用户取消则终止 |
| 8. 写入本地 | 将 payload 写入对应的配置文件目录 | 写入失败时回滚并提示 |
| 9. 注册到本地索引 | 更新本地已安装资源索引（resource_id + version + 安装时间） | — |
| 10. 完成通知 | 弹出"安装成功"通知，提供"立即打开"按钮 | — |

### 6.5 SSO 登录同步方案

**认证架构**

社区 Web 端和 SpectrAI 桌面端共享同一用户体系，通过 JWT 实现无状态认证，登录态通过 Deep Link 协议在两端同步。

**SSO 时序流程**

```
用户              Web 浏览器           社区后端            SpectrAI 桌面端
────              ──────────           ────────            ─────────────────
  │ 点击"登录"         │                   │                       │
  │──────────────────→│                   │                       │
  │                    │  重定向到 GitHub OAuth                     │
  │                    │──────────────────→│                       │
  │                    │                   │                       │
  │ GitHub 授权页面     │                   │                       │
  │←──────────────────│                   │                       │
  │ 点击"授权"         │                   │                       │
  │──────────────────→│                   │                       │
  │                    │  GitHub 回调 + code│                       │
  │                    │──────────────────→│                       │
  │                    │                   │ 用 code 换 access_token│
  │                    │                   │ 获取 GitHub 用户信息    │
  │                    │                   │ 创建/查找本地用户       │
  │                    │                   │ 签发 JWT (含 user_id)  │
  │                    │                   │                       │
  │                    │ 返回 JWT + 用户信息 │                       │
  │                    │←──────────────────│                       │
  │                    │                   │                       │
  │                    │ 检测桌面端是否在线                          │
  │                    │ (navigator.userAgent 或 WebSocket 心跳)    │
  │                    │                   │                       │
  │                    │ [桌面端在线] 打开 Deep Link:                │
  │                    │ spectrai://auth?token=<jwt>&expires_at=ts  │
  │                    │─────────────────────────────────────────→│
  │                    │                   │                       │ 验证 JWT 签名
  │                    │                   │                       │ 存储到本地 keychain
  │                    │                   │                       │ 更新 UI 登录态
  │                    │                   │                       │
  │ Web 端完成登录      │                   │     桌面端同步登录完成   │
  │←──────────────────│                   │                       │
```

**JWT Token 设计**

| 字段 | 类型 | 说明 |
|------|------|------|
| `sub` | string | 用户 ID (UUID) |
| `username` | string | 用户名 |
| `email` | string | 邮箱 |
| `avatar_url` | string | 头像 URL |
| `level` | number | 贡献者等级 |
| `iat` | number | 签发时间（Unix 时间戳） |
| `exp` | number | 过期时间（默认 7 天） |

**Token 刷新机制**

- Access Token 有效期 7 天，Refresh Token 有效期 30 天
- 桌面端在 Access Token 过期前 24 小时自动用 Refresh Token 换取新 Access Token
- Refresh Token 过期后需用户重新通过 OAuth 登录
- 桌面端将 Token 存储在操作系统 Keychain（Windows: Credential Manager, macOS: Keychain）

### 6.6 桌面端 UI 改动点清单

| 改动位置 | 改动内容 | 优先级 |
|---------|---------|--------|
| 顶部导航栏 | 新增"社区"入口按钮，点击在外部浏览器打开社区首页 | P0 |
| Workflow 编辑器工具栏 | 新增"发布到社区"按钮 | P0 |
| Skill 管理器工具栏 | 新增"发布到社区"按钮 | P0 |
| Team 管理器工具栏 | 新增"发布到社区"按钮 | P1 |
| MCP 管理器工具栏 | 新增"发布到社区"按钮 | P1 |
| 系统托盘 | 新增社区通知图标，未读时显示红点徽章 | P1 |
| 设置页面 | 新增"社区账号"区块：登录状态、通知偏好、已安装资源列表 | P1 |
| 资源管理面板 | 新增"已安装的社区资源"Tab，展示来源、版本、更新状态 | P1 |
| 安装确认对话框 | Deep Link 触发安装时的确认弹窗（资源名 + 作者 + 大小 + 来源） | P0 |
| 登录引导弹窗 | 未登录时操作社区功能弹出的引导弹窗 | P0 |

---

## 七、开发优先级 — 分阶段实施

### Phase 1：MVP（预计 1-2 个月）

- [ ] 资源市场核心：上传 / 浏览 / 下载 Workflow 和 Skill
- [ ] 用户注册登录（复用已有 auth 系统）
- [ ] 桌面端一键发布 / 安装功能
- [ ] 基础搜索和分类

### Phase 2：社交化（预计 1 个月）

- [ ] 评分评论系统
- [ ] 用户个人主页
- [ ] 作品展示板块
- [ ] 热门排行榜

### Phase 3：论坛（预计 1 个月）

- [ ] 分板块发帖
- [ ] Markdown 富文本编辑器
- [ ] 投票 + 通知系统

### Phase 4：增强（持续迭代）

- [ ] 贡献者等级体系
- [ ] 资源版本管理
- [ ] API 开放给第三方
- [ ] 国际化（英文版）

---

## 八、关键决策点

| 决策点 | 选项 | 推荐 | 理由 |
|--------|------|------|------|
| 项目形态 | 独立 Web / 嵌入桌面端 / 混合 | **混合模式** | 传播性 > 便利性 |
| 后端语言 | 扩展 PHP / Node.js / Go | **Node.js** | 与桌面端统一 TS 生态 |
| 资源格式 | JSON 包 / Git Repo / npm 包 | **JSON 包 + 元数据** | 最简单，跨平台 |
| 用户体系 | 新建 / 复用 PHP / OAuth | **复用已有 + GitHub OAuth** | 减少重复建设 |
| 内容审核 | 人工 / AI / 社区举报 | **社区举报 + AI 辅助** | 初期轻量 |
| 社区代码 | 开源 / 闭源 | **开源** | 吸引贡献者 |
| 域名 | 子域名 / 子路径 | **community.spectrai.xxx** | 独立性 + 品牌感 |

---

## 九、风险点

| 风险 | 影响 | 应对策略 |
|------|------|---------|
| 冷启动问题 | 社区初期内容少，留不住用户 | 官方预填充高质量 Workflow/Skill；邀请内测用户分享 |
| 内容质量参差 | 低质量资源泛滥 | 评分排序 + 官方精选标签 + 社区审核 |
| 维护成本 | 独立系统需持续运维 | Docker 化部署，CI/CD 自动化 |
| 安全风险 | 恶意资源/代码注入 | 资源沙箱验证 + AI 安全扫描 |
| 桌面端耦合 | 社区依赖桌面端版本 | 资源格式向后兼容，版本号约束 |

---

## 十、差异化竞争优势

相比 GitHub、Discord、V2EX 等通用社区，SpectrAI 社区的独特价值：

1. **资源即用** — 不是看文章，而是一键安装 Workflow/Skill 到你的 SpectrAI
2. **AI 开发专属** — 围绕"AI 辅助开发"垂直场景，内容高度聚焦
3. **过程可复现** — 分享的不只是代码结果，而是 AI 开发的完整流程和配方
4. **多 AI 协作经验** — 独一无二的"哪个 AI 适合干什么"实战经验库

---

## 十一、数据模型设计

### 11.1 数据库选型依据

选择 PostgreSQL 16 作为主数据库（详细对比见第五章 5.6 节），核心理由：

- **JSONB 原生支持**：社区资源包为 JSON 格式，JSONB 类型可直接存储 payload 并建立 GIN 索引，支持字段级查询
- **全文搜索内置**：`tsvector` + GIN 索引 + `zhparser` 中文分词，MVP 阶段无需额外部署搜索引擎
- **MVCC 并发控制**：读写不阻塞，适合社区场景的读多写少负载模式
- **扩展生态丰富**：`pg_trgm`（模糊搜索）、`pgvector`（未来可用于语义推荐）、`uuid-ossp`（UUID 主键生成）

### 11.2 ER 关系图

```
┌──────────┐       ┌──────────────┐       ┌─────────────────┐
│   User   │──1:N──│   Resource   │──1:N──│ ResourceVersion │
│          │       │              │       │                 │
│          │──1:N──│  Showcase    │       └─────────────────┘
│          │       │              │──N:M──┌──────────┐
│          │──1:N──│  ForumPost   │       │   Tag    │
│          │       └──────────────┘       └──────────┘
│          │              │
│          │──1:N──┌──────┴───────┐       ┌──────────┐
│          │       │   Comment    │       │ Category │
│          │       └──────────────┘       └──────────┘
│          │              │                    │1
│          │──1:N──┌──────┴───────┐            │
│          │       │   Rating     │       ┌────┴─────┐
│          │       └──────────────┘       │ Resource │
│          │                              └──────────┘
│          │──N:M──┌──────────────┐
│          │       │   Follow     │  (user_id → target_user_id)
│          │       └──────────────┘
│          │
│          │──1:N──┌──────────────┐
│          │       │ Notification │
└──────────┘       └──────────────┘
```

**核心关系说明**

| 关系 | 类型 | 说明 |
|------|------|------|
| User → Resource | 1:N | 一个用户可发布多个资源 |
| User → Showcase | 1:N | 一个用户可提交多个作品 |
| User → ForumPost | 1:N | 一个用户可发布多个帖子 |
| User → Comment | 1:N | 一个用户可发表多条评论 |
| User → Rating | 1:N | 一个用户可为多个资源评分（每个资源仅一次） |
| User ↔ User (Follow) | N:M | 用户之间的关注关系 |
| Resource → ResourceVersion | 1:N | 一个资源可有多个版本 |
| Resource ↔ Tag | N:M | 多对多，通过 `resource_tags` 中间表关联 |
| Resource → Category | N:1 | 每个资源属于一个分类 |
| Showcase ↔ Resource | N:M | 作品可关联多个资源，通过 `showcase_resources` 中间表 |
| ForumPost ↔ Tag | N:M | 帖子可有多个标签，通过 `post_tags` 中间表 |
| Comment → Resource / ForumPost | 多态 | 评论可关联到资源或帖子（通过 `target_type` + `target_id`） |

### 11.3 核心实体字段定义

#### User（用户）

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| `id` | UUID | PK, DEFAULT `gen_random_uuid()` | 用户唯一标识 |
| `username` | VARCHAR(50) | UNIQUE, NOT NULL | 用户名，仅字母数字下划线 |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL | 邮箱 |
| `avatar_url` | VARCHAR(500) | | 头像 URL |
| `bio` | VARCHAR(500) | | 个人简介 |
| `github_id` | VARCHAR(50) | UNIQUE | GitHub 用户 ID |
| `github_username` | VARCHAR(100) | | GitHub 用户名 |
| `level` | SMALLINT | DEFAULT 0 | 贡献者等级（0-4） |
| `points` | INTEGER | DEFAULT 0 | 积分总数 |
| `role` | VARCHAR(20) | DEFAULT 'user' | 角色：`user` / `moderator` / `admin` |
| `is_active` | BOOLEAN | DEFAULT true | 账号是否启用 |
| `last_login_at` | TIMESTAMPTZ | | 最后登录时间 |
| `created_at` | TIMESTAMPTZ | DEFAULT `now()` | 注册时间 |
| `updated_at` | TIMESTAMPTZ | DEFAULT `now()` | 更新时间 |

#### Resource（资源）

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| `id` | UUID | PK | 资源唯一标识 |
| `author_id` | UUID | FK → `users.id`, NOT NULL | 作者 |
| `category_id` | UUID | FK → `categories.id` | 所属分类 |
| `type` | VARCHAR(20) | NOT NULL, CHECK IN ('workflow','skill','team','mcp') | 资源类型 |
| `name` | VARCHAR(100) | NOT NULL | 资源名称 |
| `slug` | VARCHAR(120) | UNIQUE, NOT NULL | URL 友好标识 |
| `description` | TEXT | | 资源描述（Markdown） |
| `readme` | TEXT | | 详细说明文档（Markdown） |
| `cover_image_url` | VARCHAR(500) | | 封面图 URL |
| `latest_version` | VARCHAR(20) | | 最新版本号（冗余，加速查询） |
| `spectrai_version_min` | VARCHAR(20) | | 最低兼容 SpectrAI 版本 |
| `status` | VARCHAR(20) | DEFAULT 'pending' | 状态：`pending` / `published` / `deprecated` / `rejected` |
| `download_count` | INTEGER | DEFAULT 0 | 下载/安装次数 |
| `rating_avg` | DECIMAL(2,1) | DEFAULT 0 | 平均评分（冗余） |
| `rating_count` | INTEGER | DEFAULT 0 | 评分总数（冗余） |
| `is_official` | BOOLEAN | DEFAULT false | 是否官方精选 |
| `package_url` | VARCHAR(500) | NOT NULL | 资源包 OSS 地址 |
| `package_size` | INTEGER | | 资源包大小（字节） |
| `created_at` | TIMESTAMPTZ | DEFAULT `now()` | 创建时间 |
| `updated_at` | TIMESTAMPTZ | DEFAULT `now()` | 更新时间 |
| `published_at` | TIMESTAMPTZ | | 发布时间 |

#### ResourceVersion（资源版本）

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| `id` | UUID | PK | 版本记录 ID |
| `resource_id` | UUID | FK → `resources.id`, NOT NULL | 所属资源 |
| `version` | VARCHAR(20) | NOT NULL | 版本号（SemVer） |
| `changelog` | TEXT | NOT NULL | 变更日志 |
| `package_url` | VARCHAR(500) | NOT NULL | 该版本资源包 OSS 地址 |
| `package_size` | INTEGER | | 资源包大小（字节） |
| `spectrai_version_min` | VARCHAR(20) | | 该版本要求的最低 SpectrAI 版本 |
| `is_deprecated` | BOOLEAN | DEFAULT false | 是否已废弃 |
| `download_count` | INTEGER | DEFAULT 0 | 该版本下载次数 |
| `created_at` | TIMESTAMPTZ | DEFAULT `now()` | 发布时间 |

> UNIQUE 约束：`(resource_id, version)` 同一资源的版本号不可重复。

#### Showcase（作品展示）

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| `id` | UUID | PK | 作品 ID |
| `author_id` | UUID | FK → `users.id`, NOT NULL | 作者 |
| `title` | VARCHAR(200) | NOT NULL | 作品标题 |
| `description` | TEXT | | 作品简介 |
| `content` | TEXT | | 制作过程（Markdown 教程） |
| `cover_image_url` | VARCHAR(500) | | 封面图 URL |
| `github_url` | VARCHAR(500) | | GitHub 仓库链接 |
| `demo_url` | VARCHAR(500) | | 在线演示链接 |
| `video_url` | VARCHAR(500) | | 视频演示链接 |
| `like_count` | INTEGER | DEFAULT 0 | 点赞数 |
| `view_count` | INTEGER | DEFAULT 0 | 浏览数 |
| `status` | VARCHAR(20) | DEFAULT 'pending' | 状态：`pending` / `published` / `rejected` |
| `created_at` | TIMESTAMPTZ | DEFAULT `now()` | 提交时间 |
| `updated_at` | TIMESTAMPTZ | DEFAULT `now()` | 更新时间 |

#### ForumPost（论坛帖子）

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| `id` | UUID | PK | 帖子 ID |
| `author_id` | UUID | FK → `users.id`, NOT NULL | 发帖人 |
| `board` | VARCHAR(30) | NOT NULL | 板块：`help` / `feature_request` / `bug` / `tips` / `dev` |
| `title` | VARCHAR(200) | NOT NULL | 帖子标题 |
| `content` | TEXT | NOT NULL | 正文（Markdown） |
| `status` | VARCHAR(30) | DEFAULT 'open' | 状态：`open` / `answered` / `resolved` / `accepted` / `in_progress` / `closed` |
| `upvote_count` | INTEGER | DEFAULT 0 | 赞同数 |
| `downvote_count` | INTEGER | DEFAULT 0 | 反对数 |
| `comment_count` | INTEGER | DEFAULT 0 | 评论数（冗余） |
| `view_count` | INTEGER | DEFAULT 0 | 浏览数 |
| `is_pinned` | BOOLEAN | DEFAULT false | 是否置顶 |
| `is_locked` | BOOLEAN | DEFAULT false | 是否锁定（禁止回复） |
| `created_at` | TIMESTAMPTZ | DEFAULT `now()` | 发帖时间 |
| `updated_at` | TIMESTAMPTZ | DEFAULT `now()` | 更新时间 |

#### Comment（评论）

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| `id` | UUID | PK | 评论 ID |
| `author_id` | UUID | FK → `users.id`, NOT NULL | 评论者 |
| `target_type` | VARCHAR(20) | NOT NULL | 目标类型：`resource` / `post` / `showcase` |
| `target_id` | UUID | NOT NULL | 目标 ID |
| `parent_id` | UUID | FK → `comments.id`, NULL | 父评论 ID（楼中楼，NULL 表示顶级评论） |
| `content` | TEXT | NOT NULL | 评论内容（Markdown） |
| `upvote_count` | INTEGER | DEFAULT 0 | 赞同数 |
| `is_deleted` | BOOLEAN | DEFAULT false | 是否软删除 |
| `created_at` | TIMESTAMPTZ | DEFAULT `now()` | 评论时间 |
| `updated_at` | TIMESTAMPTZ | DEFAULT `now()` | 更新时间 |

#### Rating（评分）

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| `id` | UUID | PK | 评分 ID |
| `user_id` | UUID | FK → `users.id`, NOT NULL | 评分者 |
| `resource_id` | UUID | FK → `resources.id`, NOT NULL | 目标资源 |
| `score` | SMALLINT | NOT NULL, CHECK (1-5) | 评分（1-5 星） |
| `review` | TEXT | | 评价文字（可选） |
| `created_at` | TIMESTAMPTZ | DEFAULT `now()` | 评分时间 |
| `updated_at` | TIMESTAMPTZ | DEFAULT `now()` | 更新时间 |

> UNIQUE 约束：`(user_id, resource_id)` 每个用户对同一资源仅能评分一次。

#### Tag（标签）

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| `id` | UUID | PK | 标签 ID |
| `name` | VARCHAR(50) | UNIQUE, NOT NULL | 标签名称 |
| `slug` | VARCHAR(60) | UNIQUE, NOT NULL | URL 友好标识 |
| `usage_count` | INTEGER | DEFAULT 0 | 使用次数（冗余） |
| `created_at` | TIMESTAMPTZ | DEFAULT `now()` | 创建时间 |

#### Category（分类）

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| `id` | UUID | PK | 分类 ID |
| `name` | VARCHAR(50) | UNIQUE, NOT NULL | 分类名称 |
| `slug` | VARCHAR(60) | UNIQUE, NOT NULL | URL 友好标识 |
| `description` | VARCHAR(200) | | 分类描述 |
| `icon` | VARCHAR(50) | | 图标标识 |
| `sort_order` | INTEGER | DEFAULT 0 | 排序权重 |
| `created_at` | TIMESTAMPTZ | DEFAULT `now()` | 创建时间 |

#### Follow（关注关系）

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| `id` | UUID | PK | 记录 ID |
| `follower_id` | UUID | FK → `users.id`, NOT NULL | 关注者 |
| `following_id` | UUID | FK → `users.id`, NOT NULL | 被关注者 |
| `created_at` | TIMESTAMPTZ | DEFAULT `now()` | 关注时间 |

> UNIQUE 约束：`(follower_id, following_id)`，CHECK：`follower_id != following_id`

#### Notification（通知）

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| `id` | UUID | PK | 通知 ID |
| `user_id` | UUID | FK → `users.id`, NOT NULL | 通知接收者 |
| `type` | VARCHAR(30) | NOT NULL | 通知类型（见 4.5 节定义） |
| `title` | VARCHAR(200) | NOT NULL | 通知标题 |
| `content` | TEXT | | 通知内容 |
| `payload` | JSONB | | 附加数据（如跳转链接、资源 ID 等） |
| `is_read` | BOOLEAN | DEFAULT false | 是否已读 |
| `created_at` | TIMESTAMPTZ | DEFAULT `now()` | 创建时间 |

### 11.4 中间表

#### resource_tags（资源-标签关联）

| 字段名 | 类型 | 约束 |
|--------|------|------|
| `resource_id` | UUID | FK → `resources.id`, PK |
| `tag_id` | UUID | FK → `tags.id`, PK |

#### post_tags（帖子-标签关联）

| 字段名 | 类型 | 约束 |
|--------|------|------|
| `post_id` | UUID | FK → `forum_posts.id`, PK |
| `tag_id` | UUID | FK → `tags.id`, PK |

#### showcase_resources（作品-资源关联）

| 字段名 | 类型 | 约束 |
|--------|------|------|
| `showcase_id` | UUID | FK → `showcases.id`, PK |
| `resource_id` | UUID | FK → `resources.id`, PK |

### 11.5 关键索引设计

```sql
-- User 索引
CREATE UNIQUE INDEX idx_users_username ON users (username);
CREATE UNIQUE INDEX idx_users_email ON users (email);
CREATE UNIQUE INDEX idx_users_github_id ON users (github_id) WHERE github_id IS NOT NULL;

-- Resource 索引
CREATE INDEX idx_resources_author ON resources (author_id);
CREATE INDEX idx_resources_type ON resources (type);
CREATE INDEX idx_resources_status ON resources (status);
CREATE INDEX idx_resources_category ON resources (category_id);
CREATE INDEX idx_resources_published ON resources (published_at DESC) WHERE status = 'published';
CREATE INDEX idx_resources_download ON resources (download_count DESC) WHERE status = 'published';
CREATE INDEX idx_resources_rating ON resources (rating_avg DESC) WHERE status = 'published';
CREATE UNIQUE INDEX idx_resources_slug ON resources (slug);
-- 全文搜索索引
CREATE INDEX idx_resources_fts ON resources USING GIN (
  to_tsvector('zhcfg', coalesce(name, '') || ' ' || coalesce(description, ''))
);

-- ResourceVersion 索引
CREATE UNIQUE INDEX idx_versions_resource_version ON resource_versions (resource_id, version);
CREATE INDEX idx_versions_resource ON resource_versions (resource_id, created_at DESC);

-- ForumPost 索引
CREATE INDEX idx_posts_author ON forum_posts (author_id);
CREATE INDEX idx_posts_board ON forum_posts (board, created_at DESC);
CREATE INDEX idx_posts_board_votes ON forum_posts (board, upvote_count DESC) WHERE board = 'feature_request';
CREATE INDEX idx_posts_fts ON forum_posts USING GIN (
  to_tsvector('zhcfg', coalesce(title, '') || ' ' || coalesce(content, ''))
);

-- Comment 索引
CREATE INDEX idx_comments_target ON comments (target_type, target_id, created_at);
CREATE INDEX idx_comments_author ON comments (author_id);

-- Rating 索引
CREATE UNIQUE INDEX idx_ratings_user_resource ON ratings (user_id, resource_id);
CREATE INDEX idx_ratings_resource ON ratings (resource_id);

-- Follow 索引
CREATE UNIQUE INDEX idx_follows_pair ON follows (follower_id, following_id);
CREATE INDEX idx_follows_following ON follows (following_id);

-- Notification 索引
CREATE INDEX idx_notifications_user_unread ON notifications (user_id, created_at DESC) WHERE is_read = false;
CREATE INDEX idx_notifications_user ON notifications (user_id, created_at DESC);
```

---

## 十二、API 设计规范

### 12.1 设计原则

| 原则 | 说明 |
|------|------|
| RESTful 风格 | 资源名用复数名词，HTTP 方法语义明确（GET 读 / POST 创建 / PUT 全量更新 / PATCH 部分更新 / DELETE 删除） |
| API 版本 | URL 路径前缀 `/api/v1/`，大版本变更启用 `/api/v2/` 并保持 v1 至少运行 6 个月 |
| 认证方式 | JWT Bearer Token（用户请求）+ API Key（第三方集成），Header: `Authorization: Bearer <token>` |
| 统一响应格式 | 所有响应遵循统一 JSON 结构（见 12.3 节） |
| 分页规范 | 基于 cursor 的分页（大数据集）和 offset 分页（小数据集），默认每页 20 条，最大 100 条 |
| 排序规范 | 查询参数 `sort=field:asc\|desc`，支持多字段 `sort=downloads:desc,created_at:desc` |
| 过滤规范 | 查询参数直接使用字段名，如 `?type=workflow&status=published` |
| 速率限制 | 匿名 60 req/min，认证用户 300 req/min，响应头返回 `X-RateLimit-*` 信息 |

### 12.2 统一响应格式

**成功响应（单个对象）**

```json
{
  "success": true,
  "data": { ... }
}
```

**成功响应（列表 + 分页）**

```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "total": 156,
    "page": 1,
    "per_page": 20,
    "total_pages": 8
  }
}
```

**错误响应**

```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Resource with id 'xxx' not found",
    "details": {}
  }
}
```

### 12.3 错误码设计

| HTTP 状态码 | 错误码 | 说明 |
|------------|--------|------|
| 400 | `VALIDATION_ERROR` | 请求参数校验失败 |
| 400 | `INVALID_JSON` | 请求体不是合法 JSON |
| 401 | `UNAUTHORIZED` | 未提供认证凭据 |
| 401 | `TOKEN_EXPIRED` | JWT Token 已过期 |
| 403 | `FORBIDDEN` | 无权限执行此操作 |
| 404 | `RESOURCE_NOT_FOUND` | 资源不存在 |
| 404 | `USER_NOT_FOUND` | 用户不存在 |
| 409 | `DUPLICATE_ENTRY` | 重复数据（如重复评分） |
| 409 | `VERSION_EXISTS` | 版本号已存在 |
| 413 | `PAYLOAD_TOO_LARGE` | 上传文件超过大小限制 |
| 422 | `SCHEMA_INVALID` | 资源包 JSON Schema 校验失败 |
| 429 | `RATE_LIMITED` | 请求频率超限 |
| 500 | `INTERNAL_ERROR` | 服务器内部错误 |

### 12.4 核心 API 端点清单

#### 认证（Auth）

| Method | Path | 描述 | 认证 |
|--------|------|------|------|
| POST | `/api/v1/auth/github` | GitHub OAuth 登录/注册 | 否 |
| POST | `/api/v1/auth/refresh` | 刷新 Access Token | 否（需 Refresh Token） |
| POST | `/api/v1/auth/logout` | 登出（吊销 Refresh Token） | 是 |
| GET | `/api/v1/auth/me` | 获取当前用户信息 | 是 |

**POST `/api/v1/auth/github`**

请求：

```json
{
  "code": "github_oauth_authorization_code"
}
```

响应（200）：

```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOi...",
    "refresh_token": "dGhpcyBpcyBh...",
    "expires_in": 604800,
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "username": "zhangsan",
      "avatar_url": "https://avatars.githubusercontent.com/u/12345",
      "level": 2,
      "points": 320
    }
  }
}
```

#### 用户（Users）

| Method | Path | 描述 | 认证 |
|--------|------|------|------|
| GET | `/api/v1/users/:username` | 获取用户公开信息 | 否 |
| PATCH | `/api/v1/users/me` | 更新当前用户资料 | 是 |
| GET | `/api/v1/users/:username/resources` | 获取用户发布的资源 | 否 |
| GET | `/api/v1/users/:username/showcases` | 获取用户的作品 | 否 |
| GET | `/api/v1/users/:username/posts` | 获取用户的帖子 | 否 |
| POST | `/api/v1/users/:username/follow` | 关注用户 | 是 |
| DELETE | `/api/v1/users/:username/follow` | 取消关注 | 是 |
| GET | `/api/v1/users/:username/followers` | 获取粉丝列表 | 否 |
| GET | `/api/v1/users/:username/following` | 获取关注列表 | 否 |

**GET `/api/v1/users/:username`**

响应（200）：

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "zhangsan",
    "avatar_url": "https://avatars.githubusercontent.com/u/12345",
    "bio": "SpectrAI 重度用户，AI 全栈开发者",
    "level": 2,
    "points": 320,
    "stats": {
      "resource_count": 8,
      "showcase_count": 3,
      "follower_count": 156,
      "following_count": 42,
      "total_downloads": 2340
    },
    "created_at": "2026-01-15T08:00:00Z"
  }
}
```

#### 资源（Resources）

| Method | Path | 描述 | 认证 |
|--------|------|------|------|
| GET | `/api/v1/resources` | 资源列表（支持分页、过滤、排序） | 否 |
| POST | `/api/v1/resources` | 发布新资源 | 是 |
| GET | `/api/v1/resources/:id` | 获取资源详情 | 否 |
| PATCH | `/api/v1/resources/:id` | 更新资源信息（仅作者） | 是 |
| DELETE | `/api/v1/resources/:id` | 删除资源（仅作者/管理员） | 是 |
| GET | `/api/v1/resources/:id/versions` | 获取资源的版本列表 | 否 |
| POST | `/api/v1/resources/:id/versions` | 发布新版本 | 是 |
| GET | `/api/v1/resources/:id/versions/:version/download` | 下载指定版本资源包 | 否 |

**GET `/api/v1/resources`**

查询参数：

| 参数 | 类型 | 说明 |
|------|------|------|
| `type` | string | 筛选资源类型：`workflow` / `skill` / `team` / `mcp` |
| `category` | string | 分类 slug |
| `tag` | string | 标签 slug，多个用逗号分隔 |
| `q` | string | 搜索关键词 |
| `sort` | string | 排序：`downloads:desc` / `rating:desc` / `created_at:desc` |
| `page` | number | 页码（默认 1） |
| `per_page` | number | 每页条数（默认 20，最大 100） |

响应（200）：

```json
{
  "success": true,
  "data": [
    {
      "id": "a1b2c3d4-...",
      "type": "workflow",
      "name": "Next.js 全栈项目生成器",
      "slug": "nextjs-fullstack-generator",
      "description": "一键生成 Next.js + Prisma + Auth.js 全栈项目脚手架",
      "cover_image_url": "https://oss.xxx/covers/nextjs-gen.png",
      "latest_version": "2.1.0",
      "author": {
        "username": "zhangsan",
        "avatar_url": "https://avatars.githubusercontent.com/u/12345"
      },
      "category": { "name": "项目脚手架", "slug": "scaffolding" },
      "tags": ["next.js", "fullstack", "prisma"],
      "download_count": 1234,
      "rating_avg": 4.7,
      "rating_count": 89,
      "is_official": true,
      "created_at": "2026-02-10T12:00:00Z"
    }
  ],
  "pagination": {
    "total": 156,
    "page": 1,
    "per_page": 20,
    "total_pages": 8
  }
}
```

**POST `/api/v1/resources`**

请求（`multipart/form-data`）：

| 字段 | 类型 | 说明 |
|------|------|------|
| `package` | File | 资源 JSON 包文件（≤ 10MB） |
| `screenshots` | File[] | 截图文件（≤ 5MB/张，最多 5 张） |
| `category_id` | string | 分类 ID |
| `tags` | string | 标签名列表（逗号分隔） |

响应（201）：

```json
{
  "success": true,
  "data": {
    "id": "new-resource-uuid",
    "status": "pending",
    "message": "资源已提交，正在审核中"
  }
}
```

#### 评分（Ratings）

| Method | Path | 描述 | 认证 |
|--------|------|------|------|
| GET | `/api/v1/resources/:id/ratings` | 获取资源的评分列表 | 否 |
| POST | `/api/v1/resources/:id/ratings` | 为资源评分 | 是 |
| PUT | `/api/v1/resources/:id/ratings` | 更新自己的评分 | 是 |
| DELETE | `/api/v1/resources/:id/ratings` | 删除自己的评分 | 是 |

**POST `/api/v1/resources/:id/ratings`**

请求：

```json
{
  "score": 5,
  "review": "非常好用的 Workflow，节省了大量配置时间！"
}
```

响应（201）：

```json
{
  "success": true,
  "data": {
    "id": "rating-uuid",
    "score": 5,
    "review": "非常好用的 Workflow，节省了大量配置时间！",
    "created_at": "2026-03-20T15:30:00Z"
  }
}
```

#### 评论（Comments）

| Method | Path | 描述 | 认证 |
|--------|------|------|------|
| GET | `/api/v1/comments` | 获取评论列表（按 target_type + target_id 过滤） | 否 |
| POST | `/api/v1/comments` | 发表评论 | 是 |
| PATCH | `/api/v1/comments/:id` | 编辑评论（仅作者，发布后 15 分钟内） | 是 |
| DELETE | `/api/v1/comments/:id` | 删除评论（作者/版主/管理员） | 是 |

**POST `/api/v1/comments`**

请求：

```json
{
  "target_type": "resource",
  "target_id": "resource-uuid",
  "parent_id": null,
  "content": "请问这个 Workflow 支持 monorepo 结构吗？"
}
```

#### 搜索（Search）

| Method | Path | 描述 | 认证 |
|--------|------|------|------|
| GET | `/api/v1/search` | 全局搜索（资源 + 作品 + 帖子） | 否 |
| GET | `/api/v1/search/resources` | 仅搜索资源 | 否 |
| GET | `/api/v1/search/posts` | 仅搜索帖子 | 否 |
| GET | `/api/v1/search/suggestions` | 搜索建议（自动补全） | 否 |

**GET `/api/v1/search`**

查询参数：

| 参数 | 类型 | 说明 |
|------|------|------|
| `q` | string | 搜索关键词（必填） |
| `scope` | string | 搜索范围：`all` / `resources` / `showcases` / `posts`（默认 `all`） |
| `page` | number | 页码 |
| `per_page` | number | 每页条数 |

响应（200）：

```json
{
  "success": true,
  "data": {
    "resources": [
      { "id": "...", "type": "workflow", "name": "...", "description": "...", "_score": 12.5 }
    ],
    "showcases": [
      { "id": "...", "title": "...", "description": "...", "_score": 8.2 }
    ],
    "posts": [
      { "id": "...", "title": "...", "board": "tips", "_score": 6.1 }
    ]
  },
  "pagination": { "total": 42, "page": 1, "per_page": 20, "total_pages": 3 }
}
```

#### 论坛（Posts）

| Method | Path | 描述 | 认证 |
|--------|------|------|------|
| GET | `/api/v1/posts` | 帖子列表（支持按板块、标签过滤） | 否 |
| POST | `/api/v1/posts` | 发帖 | 是 |
| GET | `/api/v1/posts/:id` | 帖子详情 | 否 |
| PATCH | `/api/v1/posts/:id` | 编辑帖子（仅作者） | 是 |
| DELETE | `/api/v1/posts/:id` | 删除帖子（作者/版主/管理员） | 是 |
| POST | `/api/v1/posts/:id/vote` | 投票（赞/踩） | 是 |
| PATCH | `/api/v1/posts/:id/status` | 更新帖子状态（版主/管理员） | 是 |

**POST `/api/v1/posts`**

请求：

```json
{
  "board": "feature_request",
  "title": "希望支持 Workflow 的条件分支节点",
  "content": "目前 Workflow DAG 只支持顺序执行...\n\n## 使用场景\n...",
  "tags": ["workflow", "feature"]
}
```

响应（201）：

```json
{
  "success": true,
  "data": {
    "id": "post-uuid",
    "board": "feature_request",
    "title": "希望支持 Workflow 的条件分支节点",
    "status": "open",
    "author": { "username": "zhangsan", "avatar_url": "..." },
    "created_at": "2026-03-25T10:00:00Z"
  }
}
```

#### 通知（Notifications）

| Method | Path | 描述 | 认证 |
|--------|------|------|------|
| GET | `/api/v1/notifications` | 获取通知列表 | 是 |
| GET | `/api/v1/notifications/unread-count` | 获取未读通知数 | 是 |
| PATCH | `/api/v1/notifications/:id/read` | 标记单条通知已读 | 是 |
| POST | `/api/v1/notifications/read-all` | 标记全部已读 | 是 |
| GET | `/api/v1/notifications/preferences` | 获取通知偏好设置 | 是 |
| PUT | `/api/v1/notifications/preferences` | 更新通知偏好设置 | 是 |

**GET `/api/v1/notifications`**

响应（200）：

```json
{
  "success": true,
  "data": [
    {
      "id": "notif-uuid",
      "type": "resource_update",
      "title": "你安装的「Next.js 全栈项目生成器」发布了新版本 2.2.0",
      "payload": {
        "resource_id": "resource-uuid",
        "version": "2.2.0",
        "url": "/resources/nextjs-fullstack-generator"
      },
      "is_read": false,
      "created_at": "2026-03-28T09:00:00Z"
    }
  ],
  "pagination": { "total": 25, "page": 1, "per_page": 20, "total_pages": 2 }
}
```

---

## 十三、资源格式 JSON Schema

### 13.1 通用元数据结构

所有资源类型共享统一的外层结构：

```json
{
  "$schema": "https://community.spectrai.xxx/schemas/resource/v1.json",
  "metadata": {
    "name": "资源名称",
    "version": "1.0.0",
    "type": "workflow | skill | team | mcp",
    "author": "作者用户名",
    "description": "资源描述",
    "tags": ["tag1", "tag2"],
    "spectrai_version_min": "1.5.0",
    "license": "MIT",
    "homepage": "https://github.com/xxx/yyy",
    "created_at": "2026-03-20T12:00:00Z"
  },
  "payload": { ... }
}
```

**metadata JSON Schema**

```json
{
  "type": "object",
  "required": ["name", "version", "type", "author", "description", "spectrai_version_min"],
  "properties": {
    "name": {
      "type": "string",
      "minLength": 2,
      "maxLength": 100,
      "pattern": "^[\\w\\s\\u4e00-\\u9fff.-]+$",
      "description": "资源显示名称"
    },
    "version": {
      "type": "string",
      "pattern": "^\\d+\\.\\d+\\.\\d+(-[\\w.]+)?$",
      "description": "SemVer 版本号"
    },
    "type": {
      "type": "string",
      "enum": ["workflow", "skill", "team", "mcp"],
      "description": "资源类型"
    },
    "author": {
      "type": "string",
      "description": "作者用户名"
    },
    "description": {
      "type": "string",
      "maxLength": 500,
      "description": "资源简要描述"
    },
    "tags": {
      "type": "array",
      "items": { "type": "string", "maxLength": 30 },
      "maxItems": 10,
      "description": "标签列表"
    },
    "spectrai_version_min": {
      "type": "string",
      "pattern": "^\\d+\\.\\d+\\.\\d+$",
      "description": "要求的最低 SpectrAI 版本"
    },
    "license": {
      "type": "string",
      "default": "MIT",
      "description": "许可证"
    },
    "homepage": {
      "type": "string",
      "format": "uri",
      "description": "资源主页或仓库链接"
    },
    "created_at": {
      "type": "string",
      "format": "date-time",
      "description": "创建时间"
    }
  }
}
```

### 13.2 Workflow 资源 Schema

Workflow 表示一个 DAG 流水线，包含多个步骤节点和步骤之间的连接关系。

**payload JSON Schema**

```json
{
  "type": "object",
  "required": ["steps", "edges"],
  "properties": {
    "variables": {
      "type": "object",
      "description": "全局变量定义（键值对），步骤中可通过 {{var_name}} 引用",
      "additionalProperties": {
        "type": "object",
        "properties": {
          "type": { "type": "string", "enum": ["string", "number", "boolean"] },
          "default": {},
          "description": { "type": "string" }
        },
        "required": ["type"]
      }
    },
    "steps": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "required": ["id", "name", "type"],
        "properties": {
          "id": { "type": "string", "description": "步骤唯一标识" },
          "name": { "type": "string", "description": "步骤显示名称" },
          "type": {
            "type": "string",
            "enum": ["prompt", "script", "condition", "human_review", "parallel"],
            "description": "步骤类型"
          },
          "provider": { "type": "string", "description": "AI 提供者（prompt 类型必填）" },
          "prompt_template": { "type": "string", "description": "提示词模板（prompt 类型）" },
          "script": { "type": "string", "description": "脚本内容（script 类型）" },
          "condition": { "type": "string", "description": "条件表达式（condition 类型）" },
          "timeout_seconds": { "type": "integer", "default": 300, "description": "超时时间" },
          "retry": {
            "type": "object",
            "properties": {
              "max_attempts": { "type": "integer", "default": 1 },
              "delay_seconds": { "type": "integer", "default": 5 }
            }
          },
          "position": {
            "type": "object",
            "properties": {
              "x": { "type": "number" },
              "y": { "type": "number" }
            },
            "description": "DAG 画布上的坐标位置"
          }
        }
      }
    },
    "edges": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["source", "target"],
        "properties": {
          "source": { "type": "string", "description": "起始步骤 ID" },
          "target": { "type": "string", "description": "目标步骤 ID" },
          "label": { "type": "string", "description": "连线标签（如条件分支的 true/false）" }
        }
      }
    },
    "settings": {
      "type": "object",
      "properties": {
        "max_parallel": { "type": "integer", "default": 3, "description": "最大并行步骤数" },
        "on_error": { "type": "string", "enum": ["stop", "skip", "retry"], "default": "stop" }
      }
    }
  }
}
```

**示例 JSON**

```json
{
  "metadata": {
    "name": "Next.js 全栈项目生成器",
    "version": "2.1.0",
    "type": "workflow",
    "author": "zhangsan",
    "description": "自动生成 Next.js + Prisma + Auth.js 全栈项目脚手架",
    "tags": ["next.js", "fullstack", "prisma", "scaffolding"],
    "spectrai_version_min": "1.5.0"
  },
  "payload": {
    "variables": {
      "project_name": { "type": "string", "default": "my-app", "description": "项目名称" },
      "use_auth": { "type": "boolean", "default": true, "description": "是否包含认证模块" }
    },
    "steps": [
      {
        "id": "init",
        "name": "初始化项目",
        "type": "script",
        "script": "npx create-next-app@latest {{project_name}} --typescript --tailwind --app",
        "timeout_seconds": 120
      },
      {
        "id": "setup_db",
        "name": "配置数据库",
        "type": "prompt",
        "provider": "claude-code",
        "prompt_template": "在 {{project_name}} 项目中设置 Prisma ORM，配置 PostgreSQL 连接，创建基础 schema"
      },
      {
        "id": "setup_auth",
        "name": "配置认证",
        "type": "prompt",
        "provider": "claude-code",
        "prompt_template": "在项目中集成 Auth.js v5，配置 GitHub OAuth provider",
        "condition": "{{use_auth}}"
      },
      {
        "id": "review",
        "name": "人工审查",
        "type": "human_review",
        "prompt_template": "请检查生成的项目结构是否符合预期"
      }
    ],
    "edges": [
      { "source": "init", "target": "setup_db" },
      { "source": "setup_db", "target": "setup_auth", "label": "use_auth=true" },
      { "source": "setup_db", "target": "review", "label": "use_auth=false" },
      { "source": "setup_auth", "target": "review" }
    ],
    "settings": {
      "max_parallel": 1,
      "on_error": "stop"
    }
  }
}
```

### 13.3 Skill 资源 Schema

Skill 表示一个可复用的 AI 技能（提示词模板 + 参数 + 触发条件）。

**payload JSON Schema**

```json
{
  "type": "object",
  "required": ["prompt_template"],
  "properties": {
    "prompt_template": {
      "type": "string",
      "minLength": 10,
      "description": "提示词模板，支持 {{param}} 占位符"
    },
    "parameters": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["name", "type"],
        "properties": {
          "name": { "type": "string", "description": "参数名" },
          "type": { "type": "string", "enum": ["string", "number", "boolean", "select"] },
          "description": { "type": "string" },
          "default": {},
          "required": { "type": "boolean", "default": false },
          "options": {
            "type": "array",
            "items": { "type": "string" },
            "description": "select 类型的可选值"
          }
        }
      }
    },
    "trigger": {
      "type": "object",
      "properties": {
        "command": { "type": "string", "description": "斜杠命令名（如 /code-review）" },
        "hotkey": { "type": "string", "description": "快捷键（如 Ctrl+Shift+R）" },
        "event": {
          "type": "string",
          "enum": ["on_file_save", "on_commit", "on_error", "manual"],
          "description": "自动触发事件"
        }
      }
    },
    "output": {
      "type": "object",
      "properties": {
        "format": { "type": "string", "enum": ["text", "markdown", "json", "diff"], "default": "markdown" },
        "target": { "type": "string", "enum": ["chat", "clipboard", "file", "new_tab"], "default": "chat" }
      }
    },
    "provider_preference": {
      "type": "string",
      "description": "建议使用的 AI 提供者（可选，用户可覆盖）"
    }
  }
}
```

**示例 JSON**

```json
{
  "metadata": {
    "name": "智能代码审查",
    "version": "1.3.0",
    "type": "skill",
    "author": "lisi",
    "description": "对选中的代码进行全面审查，涵盖逻辑、性能、安全性和可维护性",
    "tags": ["code-review", "quality", "security"],
    "spectrai_version_min": "1.4.0"
  },
  "payload": {
    "prompt_template": "请对以下代码进行全面审查：\n\n```{{language}}\n{{code}}\n```\n\n审查维度：\n1. 逻辑正确性\n2. 性能问题\n3. 安全漏洞（OWASP Top 10）\n4. 代码风格和可维护性\n5. 测试覆盖建议\n\n严重程度标注：🔴 严重 🟡 警告 🔵 建议\n输出语言：{{output_language}}",
    "parameters": [
      { "name": "code", "type": "string", "description": "待审查的代码", "required": true },
      { "name": "language", "type": "select", "description": "编程语言", "default": "typescript", "options": ["typescript", "python", "go", "rust", "java"] },
      { "name": "output_language", "type": "select", "description": "输出语言", "default": "中文", "options": ["中文", "English"] }
    ],
    "trigger": {
      "command": "/code-review",
      "hotkey": "Ctrl+Shift+R"
    },
    "output": {
      "format": "markdown",
      "target": "chat"
    },
    "provider_preference": "claude-code"
  }
}
```

### 13.4 Team 资源 Schema

Team 表示一个多 AI 角色协作配置，定义角色分工、系统提示词和协作规则。

**payload JSON Schema**

```json
{
  "type": "object",
  "required": ["roles"],
  "properties": {
    "roles": {
      "type": "array",
      "minItems": 2,
      "items": {
        "type": "object",
        "required": ["id", "name", "provider", "system_prompt"],
        "properties": {
          "id": { "type": "string", "description": "角色唯一标识" },
          "name": { "type": "string", "description": "角色显示名称" },
          "provider": { "type": "string", "description": "AI 提供者（如 claude-code, codex, gemini）" },
          "model": { "type": "string", "description": "模型标识（可选，使用 provider 默认模型）" },
          "system_prompt": { "type": "string", "description": "角色系统提示词" },
          "skills": {
            "type": "array",
            "items": { "type": "string" },
            "description": "该角色可使用的 Skill 列表（Skill resource_id）"
          },
          "permissions": {
            "type": "object",
            "properties": {
              "can_edit_files": { "type": "boolean", "default": true },
              "can_run_commands": { "type": "boolean", "default": true },
              "can_access_network": { "type": "boolean", "default": false },
              "allowed_paths": {
                "type": "array",
                "items": { "type": "string" },
                "description": "允许访问的文件路径 glob 模式"
              }
            }
          }
        }
      }
    },
    "coordination": {
      "type": "object",
      "properties": {
        "mode": {
          "type": "string",
          "enum": ["supervisor", "peer", "pipeline"],
          "description": "协作模式：主管分配 / 平级协商 / 流水线"
        },
        "supervisor_role_id": {
          "type": "string",
          "description": "主管角色 ID（supervisor 模式必填）"
        },
        "task_assignment": {
          "type": "string",
          "enum": ["auto", "manual"],
          "default": "auto",
          "description": "任务分配方式"
        },
        "max_iterations": {
          "type": "integer",
          "default": 10,
          "description": "最大协作轮次"
        }
      }
    },
    "shared_context": {
      "type": "object",
      "properties": {
        "working_directory": { "type": "string", "description": "共享工作目录" },
        "shared_files": {
          "type": "array",
          "items": { "type": "string" },
          "description": "所有角色共享的文件列表"
        },
        "environment_variables": {
          "type": "object",
          "additionalProperties": { "type": "string" },
          "description": "共享环境变量"
        }
      }
    }
  }
}
```

**示例 JSON**

```json
{
  "metadata": {
    "name": "前后端协作三人组",
    "version": "1.0.0",
    "type": "team",
    "author": "wangwu",
    "description": "前端、后端、测试三个 AI 角色协作开发全栈项目",
    "tags": ["fullstack", "collaboration", "testing"],
    "spectrai_version_min": "1.6.0"
  },
  "payload": {
    "roles": [
      {
        "id": "leader",
        "name": "技术 Leader",
        "provider": "claude-code",
        "system_prompt": "你是项目技术负责人，负责拆解任务、分配给前端和后端开发者、审查代码质量、协调整体进度。",
        "permissions": { "can_edit_files": true, "can_run_commands": true }
      },
      {
        "id": "frontend",
        "name": "前端开发者",
        "provider": "claude-code",
        "system_prompt": "你是前端开发专家，精通 React、Next.js、Tailwind CSS。负责实现 UI 界面和前端交互逻辑。",
        "permissions": { "can_edit_files": true, "allowed_paths": ["src/app/**", "src/components/**", "public/**"] }
      },
      {
        "id": "backend",
        "name": "后端开发者",
        "provider": "codex",
        "system_prompt": "你是后端开发专家，精通 Node.js、Fastify、PostgreSQL。负责 API 设计和数据库操作。",
        "permissions": { "can_edit_files": true, "allowed_paths": ["src/api/**", "src/db/**", "prisma/**"] }
      }
    ],
    "coordination": {
      "mode": "supervisor",
      "supervisor_role_id": "leader",
      "task_assignment": "auto",
      "max_iterations": 15
    },
    "shared_context": {
      "working_directory": ".",
      "shared_files": ["README.md", "package.json", "tsconfig.json"]
    }
  }
}
```

### 13.5 MCP 资源 Schema

MCP 表示一个 Model Context Protocol 服务器配置，包含服务器连接信息、工具定义和权限配置。

**payload JSON Schema**

```json
{
  "type": "object",
  "required": ["server"],
  "properties": {
    "server": {
      "type": "object",
      "required": ["name", "transport"],
      "properties": {
        "name": { "type": "string", "description": "服务器显示名称" },
        "transport": {
          "type": "string",
          "enum": ["stdio", "sse", "streamable-http"],
          "description": "传输协议类型"
        },
        "command": { "type": "string", "description": "启动命令（stdio 模式）" },
        "args": {
          "type": "array",
          "items": { "type": "string" },
          "description": "命令参数（stdio 模式）"
        },
        "url": { "type": "string", "format": "uri", "description": "服务器 URL（sse / streamable-http 模式）" },
        "env": {
          "type": "object",
          "additionalProperties": { "type": "string" },
          "description": "环境变量（敏感值用占位符 {{ENV_VAR}} 表示，安装时由用户填写）"
        }
      }
    },
    "tools": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["name", "description"],
        "properties": {
          "name": { "type": "string", "description": "工具名称" },
          "description": { "type": "string", "description": "工具功能描述" },
          "input_schema": {
            "type": "object",
            "description": "工具输入参数 JSON Schema"
          }
        }
      },
      "description": "服务器提供的工具列表（仅文档用途，实际由服务器运行时注册）"
    },
    "permissions": {
      "type": "object",
      "properties": {
        "network_access": {
          "type": "array",
          "items": { "type": "string" },
          "description": "允许访问的域名白名单"
        },
        "file_access": {
          "type": "array",
          "items": { "type": "string" },
          "description": "允许访问的文件路径模式"
        },
        "max_memory_mb": { "type": "integer", "default": 512, "description": "内存限制" },
        "timeout_seconds": { "type": "integer", "default": 30, "description": "单次调用超时" }
      }
    },
    "setup": {
      "type": "object",
      "properties": {
        "install_command": { "type": "string", "description": "安装依赖命令（如 npm install）" },
        "prerequisites": {
          "type": "array",
          "items": { "type": "string" },
          "description": "前置条件说明"
        },
        "env_template": {
          "type": "object",
          "additionalProperties": {
            "type": "object",
            "properties": {
              "description": { "type": "string" },
              "required": { "type": "boolean" },
              "default": { "type": "string" }
            }
          },
          "description": "环境变量模板（安装时引导用户配置）"
        }
      }
    }
  }
}
```

**示例 JSON**

```json
{
  "metadata": {
    "name": "GitHub 集成工具",
    "version": "1.2.0",
    "type": "mcp",
    "author": "spectrai-official",
    "description": "通过 GitHub API 管理仓库、Issue、PR，支持代码搜索和文件操作",
    "tags": ["github", "git", "devops"],
    "spectrai_version_min": "1.4.0"
  },
  "payload": {
    "server": {
      "name": "github-mcp-server",
      "transport": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "{{GITHUB_TOKEN}}"
      }
    },
    "tools": [
      {
        "name": "search_repositories",
        "description": "搜索 GitHub 仓库",
        "input_schema": {
          "type": "object",
          "properties": {
            "query": { "type": "string", "description": "搜索关键词" },
            "page": { "type": "integer", "default": 1 }
          },
          "required": ["query"]
        }
      },
      {
        "name": "create_issue",
        "description": "创建 GitHub Issue",
        "input_schema": {
          "type": "object",
          "properties": {
            "owner": { "type": "string" },
            "repo": { "type": "string" },
            "title": { "type": "string" },
            "body": { "type": "string" }
          },
          "required": ["owner", "repo", "title"]
        }
      }
    ],
    "permissions": {
      "network_access": ["api.github.com", "github.com"],
      "file_access": [],
      "max_memory_mb": 256,
      "timeout_seconds": 30
    },
    "setup": {
      "install_command": "npm install -g @modelcontextprotocol/server-github",
      "prerequisites": ["Node.js >= 18", "GitHub Personal Access Token"],
      "env_template": {
        "GITHUB_TOKEN": {
          "description": "GitHub Personal Access Token（需要 repo 和 read:org 权限）",
          "required": true
        }
      }
    }
  }
}
```

### 13.6 版本兼容性规范

| 规则 | 说明 |
|------|------|
| Schema 版本 | 每种资源的 JSON Schema 有独立版本号（如 `v1`），通过 `$schema` 字段标识 |
| 向前兼容 | 新版 SpectrAI 必须能解析旧版 Schema 的资源包（忽略未知字段） |
| 向后兼容 | `spectrai_version_min` 标注最低支持版本，低版本桌面端拒绝导入并提示升级 |
| 字段废弃 | 废弃字段标注 `deprecated: true`，保留至少两个 major 版本后移除 |
| 迁移脚本 | Schema 发生 breaking change 时，提供 `migration` 脚本自动转换旧格式 |
| 校验时机 | 导出时校验一次（桌面端），上传时校验一次（服务端），安装时校验一次（桌面端） |

---

## 附录：参考竞品

| 竞品 | 可借鉴之处 |
|------|-----------|
| VS Code Marketplace | 插件分发、版本管理、评分机制 |
| Raycast Store | 一键安装、优雅的分类浏览 |
| Hugging Face | 模型卡片、在线预览、社区讨论 |
| ProductHunt | 作品展示、投票机制、Launch Day |
| Discourse | 论坛架构、标签系统、信任等级 |

---

*本文档为头脑风暴阶段产出，待确认后进入详细计划阶段。*
