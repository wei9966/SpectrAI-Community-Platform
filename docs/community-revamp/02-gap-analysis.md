# SpectrAI 社区论坛改造：差距清单（对标 Linux.do）

> 文档编号：02
> 
> 输入基线：[01-linuxdo-benchmark.md](./01-linuxdo-benchmark.md)
> 
> 现状基线：[00-current-state-analysis.md](./00-current-state-analysis.md)
> 
> 后续执行：[03-roadmap.md](./03-roadmap.md) · [04-p0-detailed-plan.md](./04-p0-detailed-plan.md)

---

## 1. 对比方法说明

### 1.1 对比目标

本对比不追求像素级复刻 Linux.do。

本对比目标是识别“会直接影响社区增长、治理、留存、内容复用”的关键机制差距。

本对比默认 SpectrAI 现阶段仍属于“可用骨架 + 机制未封顶”的阶段。

### 1.2 对比输入

- Linux.do 基线：`docs/community-revamp/01-linuxdo-benchmark.md:166-1170`
- SpectrAI 现状：`docs/community-revamp/00-current-state-analysis.md`
- 前端证据：`docs/community-revamp/raw/raw_frontend.md`
- 后端证据：`docs/community-revamp/raw/raw_backend.md`

### 1.3 对比维度

- 信息架构（IA）
- 视觉设计与可读性
- 交互细节
- 社区治理
- 技术底盘

### 1.4 评分口径

- `A`：已对齐
- `B`：基本可用但机制不完整
- `C`：有局部能力但关键链路缺失
- `D`：基本未实现或可见损坏

### 1.5 优先级口径

- `P0`：不做就无法进入“可持续论坛”阶段
- `P1`：做了会显著提升增长、留存、治理效率
- `P2`：做了会增强体验与长期护城河

### 1.6 不纳入本轮的事项

- 不做品牌视觉换肤
- 不做一次性大规模重写
- 不讨论团队人名与组织架构

---

## 2. 差距总览表（30 项）

| # | Linux.do 的能力 | SpectrAI 现状 | 差距判断 | 优先级 |
|---:|---|---|---|---|
| 1 | 顶部导航三分法：分类/最新/热门 | 有论坛入口，但缺稳定三分法信息流 | IA 主入口不完整 | P0 |
| 2 | 顶栏全局搜索 + typeahead | Header 无搜索入口，论坛无搜索 | 检索前置能力缺失 | P0 |
| 3 | 分类页高可读（色条+描述+活跃信号） | 分类有，但信息密度和治理信号弱 | 分类信息表达不完整 | P1 |
| 4 | 标签作为第二索引 | 标签更多是字段，不是治理体系 | 跨分类聚合能力弱 | P1 |
| 5 | 帖子详情深阅读能力（进度条/锚点） | 帖子详情可看，但深阅读组件缺失 | 长帖体验差 | P0 |
| 6 | 引用交互与上下文保留 | reply 树有层级，但引用交互弱 | 深讨论效率不足 | P0 |
| 7 | @提及触发通知 | 后端明确缺 @提醒解析 | 协作召回链路缺失 | P0 |
| 8 | 私信 PM | 无私信表、无路由、无前端入口 | 私域协作缺失 | P1 |
| 9 | 站内+邮件+实时通知 | 仅站内列表 CRUD | 通知系统不完整 | P0 |
| 10 | 通知偏好细粒度配置 | 未实现偏好表与偏好 API | 用户打扰控制缺失 | P1 |
| 11 | 信任等级 TL0-TL4 可运行 | trust_levels 读多写少，无自动写回 | 渐进信任不可执行 | P0 |
| 12 | 徽章体系可视化 | user_badges 预留未接入 | 贡献可见性不足 | P1 |
| 13 | 旗标/举报闭环 | 举报前后端未闭环 | 共治能力缺失 | P0 |
| 14 | 自动隐藏与复核机制 | 无举报阈值自动动作 | 风险扩散控制弱 | P0 |
| 15 | 治理反馈透明 | 无举报处理反馈产品化 | 用户信任机制弱 | P1 |
| 16 | 软草稿 Draft | 编辑器无草稿保存 | 长文创作风险高 | P1 |
| 17 | 移动端完整讨论能力 | 有响应式，但触控/输入细节弱 | 移动参与效率偏低 | P1 |
| 18 | 主题切换（浅/深/自动） | 强制 dark，无法切换 | 可访问性与偏好支持不足 | P2 |
| 19 | 长文排版稳健（typography） | 缺 typography 插件 | 阅读可用性差 | P0 |
| 20 | Markdown 安全与语法完整 | 手写 parser，XSS 风险 | 内容安全与维护风险 | P0 |
| 21 | 统一状态反馈（加载/错误/空态） | 文本式反馈为主，缺统一组件 | 感知质量不足 | P1 |
| 22 | SSR/性能策略 | 动态页面几乎全 CSR | SEO 与首屏体验弱 | P0 |
| 23 | 图片资源链路稳定 | blob 假上传、后端校验不足 | 内容资产失真风险高 | P0 |
| 24 | 认证链路稳定 | OAuth 回调前端损坏 | 登录主路径不稳定 | P0 |
| 25 | 关注关系与 Feed 流 | follow 未实现 | 社交增长回路缺失 | P1 |
| 26 | 搜索降低重复提问 | 无全局搜索建议机制 | 重复帖与噪音风险高 | P1 |
| 27 | 排行榜时间窗激励 | 基础排行有，防刷治理弱 | 激励机制可被短期噪声影响 | P2 |
| 28 | API/工程质量闸门严格 | TS/ESLint 构建检查被禁用 | 质量回归风险高 | P0 |
| 29 | 反垃圾底盘（限流等） | 全平台限流缺失 | 安全底座不足 | P0 |
| 30 | 运营与治理数据回路 | 缺系统化治理看板与透明反馈 | 运营可持续性不足 | P2 |

---

## 3. P0 必修清单（详细）

> 原则：必须先把“可持续运营底盘”补齐，再谈功能扩展。

### P0-01 信息入口三分法（分类/最新/热门）

- 现状：论坛有分类与帖子列表，但缺“明确并列”的三分入口策略。
- 差距：Linux.do 把“按主题找、按时间找、按热度找”并列成默认心智。
- 为什么是 P0：入口错误会直接造成首屏迷失和内容发现失败。
- 影响范围：Header、论坛首页、排序 API、缓存层。
- 证据：`docs/community-revamp/01-linuxdo-benchmark.md:192-218`，`docs/community-revamp/raw/raw_frontend.md:521-531`。

### P0-02 顶栏全局搜索 + typeahead

- 现状：Marketplace 有局部搜索，Header 不存在搜索，论坛无搜索。
- 差距：Linux.do 搜索是“输入即候选”，不是“跳转后再搜”。
- 为什么是 P0：搜索效率直接决定知识复用率与重复帖比例。
- 影响范围：Header、搜索 API、索引策略、中文分词。
- 证据：`docs/community-revamp/01-linuxdo-benchmark.md:374-400`，`docs/community-revamp/raw/raw_frontend.md:529-531`，`docs/community-revamp/raw/raw_backend.md:560`。

### P0-03 帖子详情深阅读体验（进度条/锚点/引用）

- 现状：帖子详情可渲染，但缺阅读进度与引用交互的成体系支持。
- 差距：Linux.do 的长帖体验强调“不迷路、可追踪、可回看”。
- 为什么是 P0：论坛价值核心是深讨论，不是短内容流。
- 影响范围：帖子详情页、回复数据结构、交互组件。
- 证据：`docs/community-revamp/01-linuxdo-benchmark.md:270-302`，`docs/community-revamp/01-linuxdo-benchmark.md:618`，`docs/community-revamp/raw/raw_frontend.md:238`。

### P0-04 @提及与通知联动

- 现状：通知 CRUD 有，但缺 @ 提及解析与通知触发。
- 差距：Linux.do 通过 @ 提及形成异步协作召回。
- 为什么是 P0：没有 @，讨论无法有效点对点推进。
- 影响范围：编辑器、后端解析、通知入库、前端呈现。
- 证据：`docs/community-revamp/01-linuxdo-benchmark.md:594-606`，`docs/community-revamp/raw/raw_backend.md:245`，`docs/community-revamp/raw/raw_backend.md:309`。

### P0-05 通知系统重构（偏好/邮件/实时）

- 现状：站内通知有，邮件通知与实时推送缺，偏好缺。
- 差距：Linux.do/Discourse 强调站内外多通道召回。
- 为什么是 P0：没有召回系统，社区难以形成持续回访节奏。
- 影响范围：notifications API、偏好表、推送通道、邮件队列。
- 证据：`docs/community-revamp/01-linuxdo-benchmark.md:666`，`docs/community-revamp/raw/raw_backend.md:309`，`docs/community-revamp/raw/raw_backend.md:571`。

### P0-06 渐进信任 + 反垃圾底盘

- 现状：trust_levels 主要读门槛，自动升级写回缺失；限流缺失。
- 差距：Linux.do 的治理基石是“行为换权限 + 社区共治”。
- 为什么是 P0：无治理底盘会导致噪音上升快于优质内容增长。
- 影响范围：trust 规则、风控中间件、审核流程、运营策略。
- 证据：`docs/community-revamp/01-linuxdo-benchmark.md:502-570`，`docs/community-revamp/raw/raw_backend.md:273`，`docs/community-revamp/raw/raw_backend.md:643`。

### P0-07 举报闭环（举报→隐藏→复核→反馈）

- 现状：前端举报按钮无行为，后端无举报模型/路由。
- 差距：Linux.do 模型强调共治闭环，非单点人工处理。
- 为什么是 P0：治理动作不可产品化，社区秩序不可规模化。
- 影响范围：帖子详情、资源详情、审核后台、通知。
- 证据：`docs/community-revamp/raw/raw_frontend.md:1004-1021`，`docs/community-revamp/raw/raw_backend.md:607-608`，`docs/community-revamp/01-linuxdo-benchmark.md:706-758`。

### P0-08 Markdown 与内容安全链路

- 现状：手写渲染器 + typography 缺失 + XSS 风险点。
- 差距：Linux.do 依赖成熟内容渲染与治理机制。
- 为什么是 P0：论坛核心内容载体不稳，所有功能价值都会折损。
- 影响范围：编辑器、渲染器、前后端 sanitization。
- 证据：`docs/community-revamp/raw/raw_frontend.md:44-46`，`docs/community-revamp/raw/raw_frontend.md:388`，`docs/community-revamp/raw/raw_frontend.md:725-727`。

### P0-09 上传链路正确性与安全性

- 现状：前端 blob 假上传；后端上传校验不足。
- 差距：Linux.do 级社区默认要求“可持久、可审计、可控”。
- 为什么是 P0：内容资产失真会直接打击用户信任。
- 影响范围：编辑器、上传 API、对象存储、审计。
- 证据：`docs/community-revamp/raw/raw_frontend.md:954-963`，`docs/community-revamp/raw/raw_backend.md:621-635`，`docs/community-revamp/raw/raw_backend.md:665`。

### P0-10 登录主链路修复（OAuth + token 生命周期）

- 现状：OAuth 回调损坏；refresh 管理缺位。
- 差距：Linux.do/Discourse 级社区登录链路稳定且低摩擦。
- 为什么是 P0：没有稳定登录，后续社交与治理都无法闭环。
- 影响范围：auth callback、token 刷新、错误反馈。
- 证据：`docs/community-revamp/raw/raw_frontend.md:950`，`docs/community-revamp/raw/raw_backend.md:259`。

### P0-11 SSR/性能主路径重构

- 现状：动态页面高度 CSR，首屏与 SEO 弱。
- 差距：内容社区需要被索引与快速首屏展示。
- 为什么是 P0：增长入口依赖搜索收录与快速加载。
- 影响范围：首页、分类页、帖子详情、资源详情。
- 证据：`docs/community-revamp/raw/raw_frontend.md:219`，`docs/community-revamp/raw/raw_frontend.md:623-627`。

### P0-12 工程质量闸门恢复

- 现状：TS/ESLint 构建失败不阻断。
- 差距：成熟社区必须让质量问题在 CI 阶段被拦截。
- 为什么是 P0：P0 改造期若无闸门，回归风险极高。
- 影响范围：CI、构建配置、提交流程。
- 证据：`docs/community-revamp/raw/raw_frontend.md:123`，`docs/community-revamp/raw/raw_frontend.md:126`。

---

## 4. P1 应做清单（价值 × 复杂度）

### P1-01 标签治理体系（词表、别名、合并）

- 价值：提升跨分类知识聚合效率。
- 复杂度：中。
- 证据：`docs/community-revamp/01-linuxdo-benchmark.md:270`，`docs/community-revamp/raw/raw_backend.md:560`。

### P1-02 分类页信息强化（描述、统计、节奏信号）

- 价值：降低新手发帖误投与版块迷失。
- 复杂度：中低。
- 证据：`docs/community-revamp/01-linuxdo-benchmark.md:218-246`。

### P1-03 私信 PM（含反骚扰策略）

- 价值：提升协作闭环与冲突缓冲能力。
- 复杂度：中高。
- 证据：`docs/community-revamp/01-linuxdo-benchmark.md:642-654`，`docs/community-revamp/raw/raw_backend.md:574-579`。

### P1-04 个人主页增强（贡献轨迹 + 身份可视化）

- 价值：提升长期参与动机。
- 复杂度：中。
- 证据：`docs/community-revamp/01-linuxdo-benchmark.md:302-328`，`docs/community-revamp/raw/raw_frontend.md:250`。

### P1-05 徽章体系上线

- 价值：让“好行为”被看见并可学习。
- 复杂度：中。
- 证据：`docs/community-revamp/01-linuxdo-benchmark.md:570-582`，`docs/community-revamp/raw/raw_backend.md:588-589`。

### P1-06 软草稿（Draft）与未保存保护

- 价值：降低长文流失，鼓励深度创作。
- 复杂度：中。
- 证据：`docs/community-revamp/01-linuxdo-benchmark.md:630-642`，`docs/community-revamp/raw/raw_frontend.md:593`。

### P1-07 统一状态组件（Loading/Error/Empty）

- 价值：提升体验一致性与感知质量。
- 复杂度：中低。
- 证据：`docs/community-revamp/raw/raw_frontend.md:562`，`docs/community-revamp/raw/raw_frontend.md:573`，`docs/community-revamp/raw/raw_frontend.md:579`。

### P1-08 移动端讨论体验专项

- 价值：提高移动端发帖回复质量与频次。
- 复杂度：中。
- 证据：`docs/community-revamp/01-linuxdo-benchmark.md:466-486`，`docs/community-revamp/raw/raw_frontend.md:543-544`。

### P1-09 Follow + Feed 流

- 价值：形成“关注—回访—互动”增长回路。
- 复杂度：中高。
- 证据：`docs/spectrai-community-brainstorm.md:441-467`，`docs/community-revamp/raw/raw_backend.md:596`。

### P1-10 分类模板与状态流转产品化

- 价值：降低低质量发帖，提高问题可处理性。
- 复杂度：中。
- 证据：`docs/spectrai-community-brainstorm.md:400-430`。

### P1-11 论坛搜索结果页与过滤器

- 价值：提升历史内容再发现能力。
- 复杂度：中。
- 证据：`docs/community-revamp/01-linuxdo-benchmark.md:374-400`。

### P1-12 管理后台治理工具升级

- 价值：提高版主执行效率与可审计性。
- 复杂度：中。
- 证据：`docs/community-revamp/raw/raw_backend.md:336-350`，`docs/community-revamp/01-linuxdo-benchmark.md:746-758`。

---

## 5. P2 可选清单（增强项）

### P2-01 主题系统（浅/深/自动）

- 价值：提升可访问性和个性化。
- 复杂度：中。
- 证据：`docs/community-revamp/01-linuxdo-benchmark.md:402-422`，`docs/community-revamp/raw/raw_frontend.md:551`。

### P2-02 排行榜反刷与指标解释页

- 价值：提高激励公信力。
- 复杂度：中。
- 证据：`docs/community-revamp/01-linuxdo-benchmark.md:352-374`。

### P2-03 Wiki 帖能力

- 价值：将高频问答沉淀为持续更新知识库。
- 复杂度：中高。
- 证据：`docs/community-revamp/01-linuxdo-benchmark.md:678-690`。

### P2-04 邮件摘要策略运营化

- 价值：提高轻度用户召回率。
- 复杂度：中。
- 证据：`docs/community-revamp/01-linuxdo-benchmark.md:666-678`。

### P2-05 治理透明报告模板化

- 价值：提升社区信任。
- 复杂度：中低。
- 证据：`docs/community-revamp/01-linuxdo-benchmark.md:1290`。

### P2-06 国际化框架准备

- 价值：降低后续中英双语改造成本。
- 复杂度：中。
- 证据：`docs/community-revamp/raw/raw_frontend.md:606`。

### P2-07 PWA 离线壳能力

- 价值：提升移动端回访与加载稳定性。
- 复杂度：中。
- 证据：`docs/community-revamp/raw/raw_frontend.md:544`。

### P2-08 高级检索（语义、容错）

- 价值：提升复杂问题检索命中。
- 复杂度：中高。
- 证据：`docs/spectrai-community-brainstorm.md:648-655`。

### P2-09 社区活动与荣誉季节化机制

- 价值：提升阶段性参与热度。
- 复杂度：中。
- 证据：`docs/spectrai-community-brainstorm.md:2959-2978`。

### P2-10 桌面端社区侧栏联动

- 价值：加强 Web 与桌面产品协同。
- 复杂度：中高。
- 证据：`docs/spectrai-community-brainstorm.md:885-888`。

---

## 6. 按 5 大维度重组差距

## 6.1 信息架构（IA）

### 现状

- 有论坛入口，但入口层次还不够“意图驱动”。
- 搜索入口与分类/时间/热度的联动不完整。

### 关键差距

1. 三分法入口未产品化。
2. 全局搜索缺失。
3. 标签二级索引能力弱。
4. 分类页信息表达偏薄。
5. 深层页面缺面包屑与上下文回路。

### 影响

- 新用户首屏路径选择成本高。
- 老用户回查旧内容摩擦大。
- 内容沉淀率和复用率偏低。

### 优先结论

- IA 维度中的 P0：入口三分法 + 全局搜索。
- IA 维度中的 P1：标签治理 + 分类页增强。

## 6.2 视觉设计

### 现状

- 深色风格一致，但可读性系统不完整。
- Markdown 排版与正文层级不稳。

### 关键差距

1. typography 插件缺失。
2. 文本层级与可读性需统一规范。
3. 浅色/自动主题缺失。
4. 空状态与错误状态视觉引导弱。

### 影响

- 长文阅读疲劳。
- 信息密度高但理解效率低。
- 无障碍与多场景适配弱。

### 优先结论

- 视觉维度 P0：typography + Markdown 渲染重构。
- 视觉维度 P1：状态组件体系化。

## 6.3 交互细节

### 现状

- 关键按钮存在“死按钮”问题。
- 编辑器链路中断（上传、草稿、@）。

### 关键差距

1. 书签/举报无行为。
2. OAuth 回调失败。
3. 上传假成功。
4. 回复编辑器体验不一致。
5. 通知轮询策略粗糙。

### 影响

- 用户信任下降。
- 高价值行为（发长帖、提问、协作）频率下降。

### 优先结论

- 交互维度 P0：修复关键断点（登录、上传、举报、@、通知）。
- 交互维度 P1：草稿、移动端输入体验优化。

## 6.4 社区治理

### 现状

- 管理后台接口可用，但治理闭环未产品化。
- 规则执行更多依赖人工。

### 关键差距

1. 举报系统缺失。
2. 信任等级自动写回缺失。
3. 限流缺失。
4. 处罚反馈与申诉产品化不足。
5. 共治信号未沉淀为可执行工作流。

### 影响

- 社区噪声可能快速放大。
- 版主负担不可控。
- 用户对治理公正性的感知弱。

### 优先结论

- 治理维度 P0：trust + 举报 + 限流。
- 治理维度 P1：治理透明与反馈机制。

## 6.5 技术底盘

### 现状

- 路由和表已经很多，说明“能开发”。
- 但工程闸门、性能路径和安全基建仍偏弱。

### 关键差距

1. 动态页面 CSR 化严重。
2. 构建质量检查禁用。
3. 上传链路校验不足。
4. 事务一致性缺口。
5. 缓存策略存在阻塞风险。

### 影响

- 上线后故障概率高。
- 迭代速度会被回归问题吞噬。

### 优先结论

- 技术维度 P0：SSR 主路径 + 质量闸门 + 安全补丁。
- 技术维度 P1：可观测性与运营指标闭环。

---

## 7. Quick Wins（5–8 项，小改动高收益）

### QW-01 安装并启用 `@tailwindcss/typography`

- 收益：立即改善 Markdown、协议页可读性。
- 改动量：极小。
- 依赖：低。
- 证据：`docs/community-revamp/raw/raw_frontend.md:44-46`。

### QW-02 修复 `/user/me` 路由跳转

- 收益：消除登录后明显错误路径。
- 改动量：极小。
- 依赖：低。
- 证据：`docs/community-revamp/raw/raw_frontend.md:1082-1087`。

### QW-03 补书签/举报按钮最小可用 onClick 与反馈

- 收益：立即消除“死按钮”体验。
- 改动量：小。
- 依赖：中（后端举报接口可分阶段）。
- 证据：`docs/community-revamp/raw/raw_frontend.md:1004-1021`。

### QW-04 恢复 TS/ESLint 构建闸门

- 收益：显著降低回归风险。
- 改动量：小。
- 依赖：中（需清理一批历史告警）。
- 证据：`docs/community-revamp/raw/raw_frontend.md:123-126`。

### QW-05 提取 `timeAgo` 与 `getAuthHeaders` 公共函数

- 收益：快速降低重复代码与后续修改成本。
- 改动量：小。
- 依赖：低。
- 证据：`docs/community-revamp/raw/raw_frontend.md:651-681`。

### QW-06 通知轮询增加页面可见性判断

- 收益：减少无效请求与前台噪声。
- 改动量：小。
- 依赖：低。
- 证据：`docs/community-revamp/raw/raw_frontend.md:431`。

### QW-07 上传接口补 MIME/大小校验

- 收益：降低恶意/错误上传风险。
- 改动量：小到中。
- 依赖：低。
- 证据：`docs/community-revamp/raw/raw_backend.md:621-635`。

### QW-08 增加论坛页基础搜索入口（先直达搜索页）

- 收益：快速改善“找不到内容”的主诉。
- 改动量：小到中。
- 依赖：中（可先做前端入口，后做 typeahead）。
- 证据：`docs/community-revamp/raw/raw_frontend.md:529-531`。

---

## 8. 差距优先级总表（压缩版）

| 优先级 | 项目数 | 核心目标 |
|---|---:|---|
| P0 | 12 | 先补运营底盘，防止社区质量失控 |
| P1 | 12 | 再补增长与留存机制，提升协作效率 |
| P2 | 10 | 最后做体验增强与长期护城河 |

### 8.1 P0 关键词

- 入口
- 搜索
- 阅读
- 通知
- 治理
- 安全
- 性能
- 质量闸门

### 8.2 P1 关键词

- 标签治理
- 私信
- 身份可视化
- 移动端参与
- 草稿
- Feed

### 8.3 P2 关键词

- 主题系统
- Wiki
- 邮件运营
- 国际化
- 桌面端深联动

---

## 9. 实施建议（从差距到执行）

1. 不要按“功能模块”切割优先级，要按“用户关键路径”切割。
2. 把 P0 全部变成可验收的工程包，再进入开发排期。
3. 每个 P0 都必须有：
   - 功能验收标准
   - 性能验收标准
   - 安全验收标准
   - 回滚方案
4. 把 Quick Wins 插入第 1 周，形成可见进展。
5. 每周做一次差距回扫，避免“做了很多但关键问题没动”。

---

## 10. 与后续文档关系

- 本文给“做什么、先后顺序”。
- [03-roadmap.md](./03-roadmap.md) 给“按时间怎么做”。
- [04-p0-detailed-plan.md](./04-p0-detailed-plan.md) 给“每个 P0 具体怎么做”。
- [05-next-steps.md](./05-next-steps.md) 给“明天就能开工什么”。

---

## 附录 A：差距映射（Linux.do 十大关键点 → SpectrAI）

| Linux.do 十大关键点 | SpectrAI 映射结论 | 优先级 |
|---|---|---|
| 入口三分法 | 未完整实现 | P0 |
| 渐进信任反垃圾 | 基础表在，机制未闭环 | P0 |
| 长帖阅读体验 | 可读可回不足 | P0 |
| 标签第二索引 | 标签治理不足 | P1 |
| 搜索前置 typeahead | 入口缺失 | P0 |
| 身份系统可视化 | 徽章信任未贯通 | P1 |
| 共治闭环产品化 | 举报流程未闭环 | P0 |
| 移动端完整能力 | 响应式有但讨论能力弱 | P1 |
| 邮件摘要精细化 | 未实现 | P1/P2 |
| Wiki 沉淀 | 未实现 | P2 |

证据：`docs/community-revamp/01-linuxdo-benchmark.md:806-1148`。

## 附录 B：检查清单（执行前）

- [ ] P0 是否全部转成可验收任务。
- [ ] 每个 P0 是否有 owner 角色类型（前端/后端/测试/产品）。
- [ ] 是否存在“看起来是 P1，实际上卡住 P0”的误分级。
- [ ] 是否明确首周 Quick Wins。
- [ ] 是否定义 P0 的发布门槛。
- [ ] 是否准备灰度与回滚策略。
- [ ] 是否定义治理指标（举报处理时效、误杀率、恢复率）。
- [ ] 是否定义搜索指标（检索点击率、重复帖下降率）。
- [ ] 是否定义通知指标（送达率、打开率、退订率）。
- [ ] 是否定义信任体系指标（升级率、违规率变化）。

## 附录 C：检查清单（执行中）

- [ ] 每周是否更新差距燃尽图。
- [ ] 每周是否复盘 P0 风险。
- [ ] 每周是否抽样验证论坛真实帖子体验。
- [ ] 每周是否做一次移动端实机检查。
- [ ] 每周是否复查构建质量闸门状态。
- [ ] 每周是否复查上传安全策略。
- [ ] 每周是否复查限流规则是否生效。
- [ ] 每周是否复查举报流程是否有积压。
- [ ] 每周是否复查通知误触达情况。
- [ ] 每周是否对照 Linux.do 基线做偏差更新。

## 附录 D：检查清单（阶段收尾）

- [ ] P0 是否全部达到 DoD（Definition of Done）。
- [ ] P1 是否至少启动 30% 且无 P0 回退。
- [ ] P2 是否有明确冻结边界，避免范围蔓延。
- [ ] 是否沉淀本阶段“新增差距”与“已清零差距”。
- [ ] 是否输出阶段治理报告。
- [ ] 是否更新路线图文档并通知全员。

文档结束。
