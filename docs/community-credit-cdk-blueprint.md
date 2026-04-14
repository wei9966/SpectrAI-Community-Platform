# SpectrAI 社区积分 × CDK × 产品联动 — 总体方案

> 基于 [linux-do/cdk](https://github.com/linux-do/cdk) 和 [linux-do/credit](https://github.com/linux-do/credit) 的设计理念，结合 SpectrAI 产品生态重新设计。
>
> 最后更新：2026-04-15

---

## 一、系统全景

### 1.1 三方定位

| 系统 | 定位 | 技术栈 |
|------|------|--------|
| **spectrai-community** | 社区主站（论坛 + 资源市场 + 项目展示） | Hono + Next.js + Drizzle + PostgreSQL |
| **Credit 模块**（内建） | 积分经济引擎 | 复用社区 TS 栈，同库同事务 |
| **CDK 模块**（内建） | 内容/权益分发 | 复用社区 TS 栈，同库同事务 |

> **设计决策**：不 fork linux-do 的 Go 项目，而是将核心业务逻辑用 TypeScript 重写为 community 的子模块。原因：
> - 社区全栈 TS，引入 Go 微服务增加部署和维护成本
> - linux-do 原项目的 OAuth / 用户体系与 SpectrAI 不同
> - 核心业务逻辑不复杂，共享同一个 PostgreSQL 可保证事务一致性

### 1.2 已有基础设施

社区已打通的能力（可直接复用）：

| 能力 | 现状 | 对应文件 |
|------|------|---------|
| 软件-社区账户绑定 | `claudeopsUuid` / `claudeopsPlan` / `claudeopsLinkedAt` | `schema.ts` |
| Auth Bridge | SpectrAI JWT → 社区用户自动创建/关联 | `auth-bridge.ts` |
| 双令牌认证 | 社区 JWT + SpectrAI JWT 统一鉴权 | `auth.ts` middleware |
| 在线状态 | heartbeat 心跳 + 在线检测 | `spectrAI.ts` |
| Deep Link | `claudeops://install/{type}/{id}` 一键安装 | `deep-link.ts` |

---

## 二、积分体系设计

### 2.1 积分获取（赚币）

#### 社区贡献

| 行为 | 积分 | 每日上限 | 说明 |
|------|------|---------|------|
| 每日登录 | +5 | 1次/天 | 连续 7 天额外 +20 |
| 发布帖子 | +10 | 5次/天 | 需通过审核才到账 |
| 回复帖子 | +3 | 10次/天 | 灌水检测：内容 < 10 字不给分 |
| 被点赞（帖子/回复） | +2 | 无限 | 被点赞方获积分 |
| 回复被采纳为最佳答案 | +20 | 无限 | 挂钩 `bestAnswerId` |
| 发布 Resource（workflow/skill/mcp） | +30 | 无限 | `reviewStatus = approved` 后到账 |
| Resource 被下载 | +1/次 | 100次/天封顶 | 激励优质内容 |
| Showcase 项目上架 | +50 | 无限 | `projects` 表已有 |

#### 推广拉新

| 行为 | 积分 | 说明 |
|------|------|------|
| 邀请新用户注册 | +50 | 绑定邀请码 |
| 被邀请人首次发帖 | +20 | 二级推广奖励 |
| 被邀请人首次发布 Resource | +30 | 三级推广奖励 |

#### 外部贡献

| 行为 | 积分 | 说明 |
|------|------|------|
| PR 合并到 SpectrAI 仓库 | +100 | GitHub Webhook 触发 |
| 提交有效 Bug Report | +30 | 管理员确认后发放 |
| 撰写教程/文档 | +50 | 需审核 |

### 2.2 积分消费（花币）

#### Tier 1 — 核心产品权益（真金白银）

| 消费场景 | 积分定价 | 机制 | 说明 |
|---------|---------|------|------|
| **GPT Token 额度** | 100积分 = $0.1 | 充值到 `token_quotas`，桌面端/移动端按用量扣减 | 支持 GPT-4o / GPT-4o-mini 等，按实际 token 用量折算美元 |
| **Claude API 额度** | 150积分 = $0.1 | 同上，反映实际成本差异 | 支持 Sonnet / Opus |
| **SpectrAI Pro 会员（月）** | 3000积分 | 写入 `plan_subscriptions`，同步 `claudeopsPlan` | 解锁桌面端全功能 + AI 增强 |
| **SpectrAI Team 会员（月）** | 8000积分 | 同上 | 多人协作 + 全模型访问 |
| **移动端内测资格** | 2000积分（一次性） | 生成激活码，永久有效 | CDK 模式分发 |
| **移动端 Pro 功能（月）** | 1500积分 | 移动端付费功能解锁 | 跟随桌面端 plan 体系 |
| **Pro 续费折扣券** | 500积分 | 兑换后获得真实付费时的 8 折码 | 积分用户转付费用户的桥梁 |

#### Tier 2 — AI 能力体验

| 消费场景 | 积分定价 | 说明 |
|---------|---------|------|
| AI 视频生成 | 200积分/次 | 社区用户体验 SpectrAI 视频能力 |
| AI 配音（ElevenLabs TTS） | 100积分/1000字 | 语音合成体验 |
| 高级模型单次调用（Opus） | 50积分/次 | 社区内直接体验最强模型 |

#### Tier 3 — 社区内消费

| 消费场景 | 积分定价 | 说明 |
|---------|---------|------|
| 兑换 CDK | 按发布者定价 | CDK 市场自由定价 |
| 解锁付费 Resource | 按作者定价 | workflow/skill/mcp 付费下载，平台抽成 10% |
| 悬赏问答 | 自定义（≥50） | 冻结积分 → 采纳后释放给回答者，平台抽 5% |
| 打赏帖子/回复 | 自定义 | P2P 转积分，平台抽 5% |
| 帖子置顶推广 | 50积分/24h | 自费推到版块顶部 |
| 首页推荐位 | 100积分/24h | 曝光位 |

#### Tier 4 — 虚荣/身份

| 消费场景 | 积分定价 | 说明 |
|---------|---------|------|
| 专属徽章 | 200积分/30天 | 用户名旁显示特殊徽章 |
| 用户名渐变色 | 300积分/30天 | 发言用户名炫彩效果 |
| 自定义头衔 | 150积分/30天 | 替代默认的"成员/贡献者" |
| 专属邀请页皮肤 | 100积分 | 邀请链接页面自定义样式 |

---

## 三、Token 额度系统

### 3.1 架构

```
社区积分 ──兑换──→ token_quotas.balance_usd
                        │
         ┌──────────────┼──────────────┐
         ▼              ▼              ▼
    GPT 系列        Claude 系列     其他模型
  (按 token 用量    (按 token 用量   (Gemini 等)
   折算美元扣减)     折算美元扣减)
         │              │              │
         └──────────────┼──────────────┘
                        ▼
              token_usage_logs 用量流水
                        │
                        ▼
          SpectrAI 桌面端 / 移动端
         启动时拉取余额，调用时实时扣减
```

### 3.2 数据流

```
1. 用户在社区花 1000 积分 → POST /api/spectrAI/quota/exchange
2. 写入 token_quotas: { user_id, balance_usd += 1.00 }
3. 写入 credit_transactions: { type: 'spend', action: 'token_exchange', amount: -1000 }
4. SpectrAI 桌面端启动 → GET /api/spectrAI/quota → 显示余额 $1.00
5. 用户调用 GPT-4o → 输入 500 tokens, 输出 200 tokens → 费用 $0.003
6. 桌面端上报 → POST /api/spectrAI/quota/consume
   { model: "gpt-4o", tokens_in: 500, tokens_out: 200, cost_usd: 0.003 }
7. 扣减 token_quotas.balance_usd → 记录 token_usage_logs
8. 余额不足 → 桌面端弹窗"积分不足，去社区赚积分" → 引流回社区
```

### 3.3 定价参考

| 模型 | 输入价格 ($/1M tokens) | 输出价格 ($/1M tokens) | 社区加价系数 |
|------|----------------------|----------------------|------------|
| GPT-4o | $2.50 | $10.00 | 1.0x（成本价） |
| GPT-4o-mini | $0.15 | $0.60 | 1.0x |
| Claude Sonnet | $3.00 | $15.00 | 1.0x |
| Claude Opus | $15.00 | $75.00 | 1.0x |

> 初期建议 1.0x 成本价不加价，用补贴换用户增长。后期可调整为 1.2x-1.5x 覆盖运营成本。

---

## 四、会员系统联动

### 4.1 Plan 生命周期

```
积分兑换 ──→ plan_subscriptions 写入
CDK 兑换 ──→  (plan, source, starts_at, expires_at)
真实付费 ──→
                    │
                    ▼
         claudeopsPlan 字段同步更新
         (users 表已有该字段)
                    │
        ┌───────────┼───────────┐
        ▼           ▼           ▼
   桌面端读取    移动端读取    社区前端读取
  解锁 Pro 功能  解锁移动 Pro  显示会员标识

  Cron Job 每小时检查过期 → 降级为 free
  过期前 3 天 → 推送通知"即将过期，续费或赚积分"
```

### 4.2 Plan 等级权益矩阵

| Plan | 来源 | 桌面端权益 | 移动端权益 | 社区权益 |
|------|------|----------|----------|---------|
| `free` | 默认 | 基础功能 | 无权限 | L0-L1 权限 |
| `pro` | 积分 / 付费 | 全功能 + AI 增强 | 基础移动功能 | L2 + 专属徽章 |
| `team` | 积分 / 付费 | 多人协作 + 全模型 | 全部移动功能 | L3 + 团队空间 |
| `community_vip` | 纯积分特供 | 7 天 Pro 体验 | 7 天体验 | 社区专属标识 |

---

## 五、CDK 分发系统

### 5.1 CDK 在社区的应用场景

| 场景 | 说明 | 示例 |
|------|------|------|
| SpectrAI Pro 体验码 | 官方批量生成，社区用户用积分兑换 | "7 天 Pro 体验" CDK |
| 移动端激活码 | 内测阶段限量发放 | 2000 积分兑换 |
| 第三方 API Key 分享 | 社区用户把 API Key 打包成 CDK | 用户自定价格 |
| 课程/教程解锁码 | 教程作者发布 CDK 分发 | "SpectrAI 高级教程" |
| 活动奖品 | 竞赛/活动以 CDK 形式发奖 | Hackathon 奖品 |
| Resource 付费解锁 | 高级 workflow/skill 用 CDK 模式 | 限量分发 |

### 5.2 CDK 兑换流程

```
创建者发布 CDK 项目 → 设置积分定价 / 导入卡密
                            │
用户浏览 CDK 市场 → 选择兑换 → 检查信任等级 + 余额
                            │
              余额 ≥ 定价 → 扣减积分 → 标记 cdk_item 为 redeemed
                            │
              显示卡密给用户 → 创建者收到积分（平台抽成 10%）
```

---

## 六、信任等级体系

### 6.1 等级定义

| 信任等级 | 积分门槛 | 社区权限 | CDK 权限 | 产品权限 |
|---------|---------|---------|---------|---------|
| **L0** 新人 | 0 | 浏览 + 点赞 | 仅兑换 | 无 |
| **L1** 成员 | 100 | 发帖 + 回复 + 下载 | 兑换（每日 3 个） | Token 兑换 |
| **L2** 活跃 | 500 | 发布 Resource + 创建项目 | 创建 CDK（≤10/批） | Pro 兑换 |
| **L3** 贡献者 | 2000 | 版主 + 审核帖子 | 创建 CDK（≤100/批） | Team 兑换 |
| **L4** 核心 | 5000 | 管理员权限 | 无限制 + 统计面板 | 全部权限 |

### 6.2 等级计算

```typescript
// 每小时 cron 重新计算
function calculateTrustLevel(user: User): number {
  const { lifetimeEarned } = creditAccount;
  if (lifetimeEarned >= 5000) return 4;
  if (lifetimeEarned >= 2000) return 3;
  if (lifetimeEarned >= 500)  return 2;
  if (lifetimeEarned >= 100)  return 1;
  return 0;
}
```

> `lifetimeEarned` 是历史累计获得的积分总量，不随消费减少，防止"花了积分就降级"。

---

## 七、数据模型（新增表）

### 7.1 积分核心

```sql
-- 积分账户（每用户一行）
CREATE TABLE credit_accounts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  balance       INTEGER NOT NULL DEFAULT 0,        -- 可用余额
  frozen        INTEGER NOT NULL DEFAULT 0,        -- 冻结余额（悬赏等）
  lifetime_earned INTEGER NOT NULL DEFAULT 0,      -- 历史累计获得（不减少）
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 积分流水
CREATE TABLE credit_transactions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type          VARCHAR(20) NOT NULL,  -- earn / spend / transfer / freeze / unfreeze
  amount        INTEGER NOT NULL,      -- 正数=收入，负数=支出
  action        VARCHAR(50) NOT NULL,  -- login_daily / post_created / token_exchange / cdk_redeem ...
  ref_id        UUID,                  -- 关联的帖子/资源/订单 ID
  ref_type      VARCHAR(30),           -- post / resource / cdk_project / bounty ...
  note          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_credit_tx_user ON credit_transactions(user_id, created_at DESC);

-- 积分规则配置
CREATE TABLE credit_rules (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action        VARCHAR(50) NOT NULL UNIQUE,  -- login_daily / post_created / ...
  points        INTEGER NOT NULL,
  daily_limit   INTEGER,                      -- NULL = 无限
  min_trust_level INTEGER NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  description   TEXT,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 7.2 产品权益

```sql
-- Token 额度账户
CREATE TABLE token_quotas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  balance_usd     NUMERIC(10,4) NOT NULL DEFAULT 0,    -- 可用余额（美元）
  lifetime_used   NUMERIC(10,4) NOT NULL DEFAULT 0,    -- 历史累计消耗
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Token 用量日志
CREATE TABLE token_usage_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  model         VARCHAR(50) NOT NULL,     -- gpt-4o / claude-sonnet-4-6 / ...
  tokens_in     INTEGER NOT NULL,
  tokens_out    INTEGER NOT NULL,
  cost_usd      NUMERIC(10,6) NOT NULL,
  session_id    VARCHAR(100),             -- SpectrAI 会话 ID
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_token_usage_user ON token_usage_logs(user_id, created_at DESC);

-- 会员订阅
CREATE TABLE plan_subscriptions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan          VARCHAR(20) NOT NULL,     -- pro / team / community_vip
  source        VARCHAR(20) NOT NULL,     -- credit / cdk / payment
  starts_at     TIMESTAMPTZ NOT NULL,
  expires_at    TIMESTAMPTZ NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_plan_sub_user ON plan_subscriptions(user_id, is_active);
CREATE INDEX idx_plan_sub_expires ON plan_subscriptions(expires_at) WHERE is_active = true;

-- 移动端资格
CREATE TABLE mobile_access (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  source          VARCHAR(20) NOT NULL,   -- credit / cdk / payment / admin_grant
  activation_code VARCHAR(32),
  granted_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 折扣码
CREATE TABLE discount_codes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          VARCHAR(32) NOT NULL UNIQUE,
  user_id       UUID REFERENCES users(id) ON DELETE SET NULL,
  discount_pct  INTEGER NOT NULL,         -- 折扣百分比，如 20 表示 8 折
  valid_until   TIMESTAMPTZ NOT NULL,
  used_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 7.3 CDK 市场

```sql
-- CDK 项目
CREATE TABLE cdk_projects (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title         VARCHAR(200) NOT NULL,
  description   TEXT,
  type          VARCHAR(30) NOT NULL,     -- pro_trial / mobile_access / api_key / resource / custom
  credit_price  INTEGER NOT NULL,         -- 积分定价
  stock         INTEGER NOT NULL DEFAULT 0,
  distributed   INTEGER NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- CDK 卡密
CREATE TABLE cdk_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES cdk_projects(id) ON DELETE CASCADE,
  code_hash     VARCHAR(64) NOT NULL,     -- SHA-256 哈希存储，不存明文
  code_preview  VARCHAR(8),               -- 前 4 位预览，如 "AB12****"
  status        VARCHAR(20) NOT NULL DEFAULT 'available',  -- available / redeemed / expired / revoked
  redeemed_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  redeemed_at   TIMESTAMPTZ,
  expires_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_cdk_items_project ON cdk_items(project_id, status);

-- CDK 兑换记录
CREATE TABLE cdk_redemptions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id       UUID NOT NULL REFERENCES cdk_items(id),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id    UUID NOT NULL REFERENCES cdk_projects(id),
  credit_cost   INTEGER NOT NULL,
  redeemed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 7.4 社区经济

```sql
-- 邀请码
CREATE TABLE invite_codes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          VARCHAR(16) NOT NULL UNIQUE,
  inviter_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invitee_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  reward_status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending / granted / rejected
  reward_frozen_until TIMESTAMPTZ,        -- 防作弊冻结期
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 悬赏
CREATE TABLE bounties (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id       UUID NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
  sponsor_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount        INTEGER NOT NULL,
  status        VARCHAR(20) NOT NULL DEFAULT 'open',  -- open / awarded / expired / cancelled
  winner_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  expires_at    TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 推广订单
CREATE TABLE promotions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type   VARCHAR(20) NOT NULL,     -- post / resource / project
  target_id     UUID NOT NULL,
  type          VARCHAR(20) NOT NULL,     -- pin / featured
  cost          INTEGER NOT NULL,
  starts_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at    TIMESTAMPTZ NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT true
);

-- 徽章
CREATE TABLE user_badges (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_type    VARCHAR(50) NOT NULL,     -- gradient_name / custom_title / special_icon
  badge_value   VARCHAR(200),             -- 自定义头衔文本 / 颜色代码 等
  expires_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 打赏记录
CREATE TABLE tips (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount        INTEGER NOT NULL,
  platform_fee  INTEGER NOT NULL DEFAULT 0,  -- 平台抽成
  target_type   VARCHAR(20),              -- post / reply / resource
  target_id     UUID,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 信任等级快照
CREATE TABLE trust_levels (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  level         INTEGER NOT NULL DEFAULT 0,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 八、API 端点规划

### 8.1 积分

```
GET    /api/credits/balance                  # 查询积分余额
GET    /api/credits/transactions             # 积分流水（分页）
GET    /api/credits/transactions/summary     # 收支汇总统计
POST   /api/credits/transfer                 # P2P 转账 / 打赏
GET    /api/credits/rules                    # 查看积分规则
PUT    /api/admin/credits/rules/:action      # [管理员] 修改积分规则
POST   /api/admin/credits/grant              # [管理员] 手动发放积分
```

### 8.2 Token 额度（SpectrAI 桌面端/移动端调用）

```
GET    /api/spectrAI/quota                   # 查询 token 余额（$）
POST   /api/spectrAI/quota/exchange          # 积分兑换 token 额度
POST   /api/spectrAI/quota/consume           # 上报 token 消耗（桌面端调用）
GET    /api/spectrAI/quota/usage             # 用量统计（按模型/按天）
GET    /api/spectrAI/quota/models            # 支持的模型及定价
```

### 8.3 会员

```
POST   /api/spectrAI/plan/exchange           # 积分兑换会员
GET    /api/spectrAI/plan/status             # 查询当前 plan + 到期时间
POST   /api/spectrAI/plan/activate-cdk       # CDK 激活会员
GET    /api/spectrAI/plan/history            # 订阅历史
```

### 8.4 移动端

```
POST   /api/spectrAI/mobile/exchange         # 积分兑换移动端资格
GET    /api/spectrAI/mobile/status           # 查询是否有移动端权限
POST   /api/spectrAI/mobile/activate         # 激活码激活
```

### 8.5 CDK 市场

```
GET    /api/cdk/projects                     # CDK 项目列表（公开市场）
GET    /api/cdk/projects/:id                 # CDK 项目详情
POST   /api/cdk/projects                     # 创建 CDK 项目
PUT    /api/cdk/projects/:id                 # 更新 CDK 项目
POST   /api/cdk/projects/:id/items           # 批量导入卡密
POST   /api/cdk/redeem                       # 用积分兑换 CDK
GET    /api/cdk/my/projects                  # 我创建的 CDK 项目
GET    /api/cdk/my/redeemed                  # 我兑换的 CDK 记录
```

### 8.6 邀请

```
POST   /api/invite/generate                  # 生成邀请码
GET    /api/invite/stats                     # 邀请统计（邀请了谁，积分情况）
POST   /api/invite/bind                      # 注册时绑定邀请码
GET    /api/invite/code                      # 获取我的邀请码
```

### 8.7 悬赏

```
POST   /api/bounties                         # 创建悬赏（挂钩帖子）
POST   /api/bounties/:id/award               # 颁奖（选最佳答案）
POST   /api/bounties/:id/cancel              # 取消悬赏（退回积分）
GET    /api/bounties/active                  # 活跃悬赏列表
```

### 8.8 推广 / 徽章

```
POST   /api/promotions                       # 购买帖子推广
POST   /api/badges/purchase                  # 购买徽章/头衔
GET    /api/badges/my                        # 我的徽章列表
```

---

## 九、SpectrAI 桌面端适配

桌面端需要新增的交互（改动量较小，auth-bridge 和 heartbeat 已打通）：

### 9.1 新增 UI

- **设置页 → "社区积分" 面板**：显示积分余额、Token 余额、当前 Plan、到期时间
- **余额不足弹窗**：AI 调用前检查 token 余额，不足时引导跳转社区
- **"赚积分" 按钮**：一键打开社区网页

### 9.2 新增 API 调用

```typescript
// 启动时拉取
GET /api/spectrAI/quota         → 显示 Token 余额
GET /api/spectrAI/plan/status   → 控制功能解锁
GET /api/spectrAI/mobile/status → 移动端同步

// AI 调用后上报
POST /api/spectrAI/quota/consume → { model, tokens_in, tokens_out, cost_usd }
```

### 9.3 Plan 同步逻辑

```typescript
// 桌面端启动时
const planStatus = await fetch('/api/spectrAI/plan/status');
if (planStatus.plan !== localPlan) {
  updateLocalPlan(planStatus.plan);   // 同步到本地
  unlockFeatures(planStatus.plan);    // 解锁/锁定功能
}
```

---

## 十、积分经济闭环

```
            ┌──────────── 赚 ────────────┐
            │                            │
    ┌───────┴────────┐          ┌────────┴───────┐
    │   社区贡献      │          │   推广拉新      │
    │ 发帖 +10       │          │ 邀请注册 +50   │
    │ 获赞 +2        │          │ 被邀人发帖 +20 │
    │ 发布Resource+30│          │ GitHub PR +100 │
    │ 最佳答案 +20   │          │                │
    └───────┬────────┘          └────────┬───────┘
            │                            │
            ▼                            ▼
     ┌──────────────────────────────────────┐
     │        credit_accounts.balance       │
     │           用户积分余额                 │
     └──────────────┬───────────────────────┘
                    │
      ┌─────────────┼─────────────┬──────────────┐
      ▼             ▼             ▼              ▼
┌───────────┐┌───────────┐┌───────────┐  ┌───────────┐
│ GPT/Claude││  Pro/Team  ││  移动端    │  │ CDK/社区  │
│ Token额度 ││  会员订阅  ││  内测资格  │  │ 自由定价  │
│ $0.1/100  ││  3000/月   ││  2000一次  │  │ 悬赏打赏  │
│ AI 调用   ││  全功能    ││  永久有效  │  │ 付费资源  │
└─────┬─────┘└─────┬─────┘└─────┬─────┘  └─────┬─────┘
      │            │            │              │
      ▼            ▼            ▼              ▼
 SpectrAI       解锁 Pro     下载移动端      社区内
 桌面端调用     全功能        开始使用       内容流通
      │            │            │              │
      └────────────┼────────────┘              │
                   ▼                           │
            用户深度使用产品                     │
                   │                           │
                   └──── 产出更多社区内容 ────────┘
                                │
                                ▼
                          飞轮持续转动
```

---

## 十一、风控措施

### 11.1 积分防刷

- 每个 action 配置 `daily_limit`，超限不发放
- 同 IP / 设备指纹去重，异常行为触发人工审核
- 新用户注册后 24h 内积分行为受限（防批量注册刷分）

### 11.2 CDK 防滥用

- 兑换需 L1 及以上信任等级
- 兑换需验证码（hCaptcha）
- 同一 CDK 项目每人限兑 1 次
- 卡密哈希存储（SHA-256），不存明文

### 11.3 邀请防作弊

- 同 IP 注册的邀请奖励冻结 7 天
- 7 天内被邀请人无任何活跃行为 → 奖励作废
- 单用户每日最多有效邀请 5 人

### 11.4 Token 额度防盗用

- `consume` 接口仅允许 SpectrAI JWT 调用（非社区 JWT）
- 单次消耗上限 $5.00，超出需二次确认
- 异常消耗模式（如短时间大量调用）自动冻结并通知

### 11.5 积分通胀控制

- 定期监控全站积分总量和增长率
- 根据通胀情况动态调整获取规则（降低发放量）
- 持续增加高价值消费场景消耗积分

### 11.6 争议处理

- CDK 兑换后内容无效 → 用户发起 dispute
- 管理员仲裁 → 退还积分 / 驳回 / 封禁发布者

---

## 十二、实施路线图

### P0 — 积分基础 + Token 兑换（第一优先级）

| 任务 | 产出 |
|------|------|
| `credit_accounts` + `credit_transactions` + `credit_rules` 表 | 积分存储和流水 |
| 基础积分规则（登录 / 发帖 / 获赞 / 最佳答案） | 积分能赚 |
| 积分余额 + 流水 API | 前端可查 |
| `token_quotas` + `token_usage_logs` 表 | Token 额度存储 |
| Token 兑换 + 消耗 + 查询 API | **积分换 AI 调用** |
| SpectrAI 桌面端对接 quota API | **闭环打通** |

> P0 完成后，用户即可体验完整的「赚积分 → 换 AI 额度 → 桌面端调用」闭环。

### P1 — 会员 + 移动端 + 邀请

| 任务 | 产出 |
|------|------|
| `plan_subscriptions` + plan API | **积分换会员** |
| 桌面端 plan 同步 + 功能解锁 | Pro/Team 体验 |
| `mobile_access` + 激活码 | **积分换移动端资格** |
| `invite_codes` + 邀请 API | 推广拉新体系 |
| 邀请统计面板 | 用户看到推广效果 |

### P2 — CDK 市场 + 社区经济

| 任务 | 产出 |
|------|------|
| `cdk_projects` + `cdk_items` + `cdk_redemptions` | CDK 完整流程 |
| CDK 市场前端 | 浏览 / 兑换 / 管理 |
| 悬赏问答 (`bounties`) | 积分冻结 / 释放 |
| 打赏 (`tips`) + Resource 付费 | P2P 积分流通 |
| 推广订单 (`promotions`) | 帖子置顶 / 首页推荐 |

### P3 — 虚荣消费 + 运营工具

| 任务 | 产出 |
|------|------|
| 徽章 / 渐变名 / 自定义头衔 | 虚荣消费出口 |
| 信任等级系统 + 权限联动 | 社区分层治理 |
| 排行榜（积分榜 / 贡献榜 / 周星） | 竞争激励 |
| 管理后台：积分管理 / 规则调整 / 数据看板 | 运营工具 |

---

## 附录 A：积分规则初始数据

```typescript
const INITIAL_RULES: CreditRule[] = [
  // 社区贡献
  { action: 'login_daily',        points: 5,    dailyLimit: 1,    description: '每日登录' },
  { action: 'login_streak_7',     points: 20,   dailyLimit: null, description: '连续登录7天奖励' },
  { action: 'post_created',       points: 10,   dailyLimit: 5,    description: '发布帖子' },
  { action: 'reply_created',      points: 3,    dailyLimit: 10,   description: '回复帖子' },
  { action: 'received_like',      points: 2,    dailyLimit: null, description: '被点赞' },
  { action: 'best_answer',        points: 20,   dailyLimit: null, description: '最佳答案' },
  { action: 'resource_published', points: 30,   dailyLimit: null, description: '发布 Resource（审核通过后）' },
  { action: 'resource_downloaded',points: 1,    dailyLimit: 100,  description: 'Resource 被下载' },
  { action: 'project_created',    points: 50,   dailyLimit: null, description: '上架 Showcase 项目' },
  // 推广
  { action: 'invite_registered',  points: 50,   dailyLimit: 5,    description: '邀请用户注册' },
  { action: 'invitee_first_post', points: 20,   dailyLimit: null, description: '被邀请人首次发帖' },
  { action: 'invitee_first_resource', points: 30, dailyLimit: null, description: '被邀请人首次发布 Resource' },
  // 外部贡献
  { action: 'github_pr_merged',   points: 100,  dailyLimit: null, description: 'PR 合并到 SpectrAI' },
  { action: 'bug_report_valid',   points: 30,   dailyLimit: null, description: '有效 Bug Report' },
  { action: 'tutorial_published', points: 50,   dailyLimit: null, description: '撰写教程/文档' },
];
```

## 附录 B：Token 定价配置

```typescript
const TOKEN_PRICING: Record<string, { inputPer1M: number; outputPer1M: number }> = {
  'gpt-4o':             { inputPer1M: 2.50,  outputPer1M: 10.00 },
  'gpt-4o-mini':        { inputPer1M: 0.15,  outputPer1M: 0.60  },
  'gpt-4.1':            { inputPer1M: 2.00,  outputPer1M: 8.00  },
  'gpt-4.1-mini':       { inputPer1M: 0.40,  outputPer1M: 1.60  },
  'claude-sonnet-4-6':  { inputPer1M: 3.00,  outputPer1M: 15.00 },
  'claude-opus-4-6':    { inputPer1M: 15.00, outputPer1M: 75.00 },
  'claude-haiku-4-5':   { inputPer1M: 0.80,  outputPer1M: 4.00  },
  'gemini-2.5-pro':     { inputPer1M: 1.25,  outputPer1M: 10.00 },
  'gemini-2.5-flash':   { inputPer1M: 0.15,  outputPer1M: 0.60  },
};

// 社区加价系数（初期 1.0x 不加价，后期可调）
const MARKUP_MULTIPLIER = 1.0;

// 积分兑换比率
const CREDITS_PER_DOLLAR = 1000;  // 1000 积分 = $1.00
```
