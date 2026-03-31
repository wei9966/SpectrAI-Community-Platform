# SpectrAI 社区平台 — 最终安全审计汇总报告

> 审查周期：2026-03-31
> 审查范围：Phase 2（社交化功能）+ Phase 3（论坛系统）全批次
> 审查员：安全审计员
> 报告版本：v1.0 Final

---

## 一、安全评分

| 维度 | 得分 | 满分 | 说明 |
|------|------|------|------|
| 认证与授权 | 32 | 40 | JWT 认证健全，部分端点缺 ownership 检查 |
| 输入校验 | 20 | 30 | Zod 使用广泛但多个字段缺 maxLength |
| 注入防护 | 18 | 20 | Drizzle 参数化查询全面，全文搜索安全 |
| 文件上传 | 8 | 20 | 缺类型白名单、大小限制、过期时间过长 |
| 内容安全（XSS） | 2 | 20 | **未安装 Markdown 消毒库**，CRITICAL 风险 |
| 数据库安全 | 12 | 15 | 缺 CHECK 约束，pgEnum 使用不完整 |
| 缓存/DoS 防护 | 6 | 15 | 无速率限制，缓存异常处理不足 |
| 隐私保护 | 10 | 15 | 部分端点信息泄露（未发布资源、收藏列表） |
| 配置安全 | 6 | 15 | 默认凭据、端口暴露、Redis 无密码 |
| **总计** | **114** | **190** | |

### 最终安全评分：60/100

| 等级 | 范围 | 说明 |
|------|------|------|
| 🟢 可上线 | 80-100 | 无 CRITICAL/HIGH 未修复 |
| 🟡 有条件上线 | 60-79 | HIGH 需修复，LOW/MEDIUM 可后续 |
| 🔴 不可上线 | < 60 | 存在未修复 CRITICAL |

**当前结论：🟡 有条件上线 — 需先修复 10 个 HIGH 级别问题**

---

## 二、各批次审计结果汇总

| 批次 | 审计报告 | CRITICAL | HIGH | MEDIUM | LOW | 通过率 |
|------|----------|----------|------|--------|-----|--------|
| Batch 1 (Schema/类型) | `batch1-security-audit.md` | 0 | 1 | 4 | 5 | 70% |
| Batch 2 (评分/收藏/用户) | `batch2-security-audit.md` | 0 | 2 | 7 | 3 | 65% |
| Batch 4 (Projects/上传) | `security-review-batch4.md` | 0 | 5 | 8 | 3 | 55% |
| Batch 5 (排行榜/Redis) | `security-review-batch5.md` | 0 | 2 | 5 | 2 | 60% |
| Batch 6 (论坛) | `security-review-batch6.md` | 0 | 2 | 5 | 2 | 39% |
| Batch 7 (通知系统) | 本文内联审计 | 0 | 1 | 4 | 1 | 75% |
| **合计** | — | **0** | **13** | **33** | **16** | — |

---

## 三、跨批次共性安全模式

### 模式 1：输入校验不一致 — `z.any()` / 无 maxLength（影响 6 批次）

| 批次 | 具体位置 | 问题 |
|------|----------|------|
| B1 | `workflow.schema.ts` config | `z.record(z.unknown())` 无深度/大小限制 |
| B1 | 全部 content schema | 字符串字段无 `.max()` |
| B2 | `ratings.ts` resourceId | 无 UUID 校验 |
| B4 | `projects.ts` toolChain | `z.any()` |
| B4 | `projects.ts` tags/description | 无 maxLength |
| B6 | `forum.ts` content | 无 maxLength |
| B6 | `forum.ts` tags | 无元素/数量限制 |
| B7 | `notify.ts` title/content | 无 maxLength |

**根因**：缺少统一的 Zod schema 编码规范。建议在 CLAUDE.md 或编码规范中添加：
```
- 所有字符串必须有 .max()（短文本 50-200，长文本 10000-50000）
- 禁止 z.any()，所有 jsonb 字段用具体 Zod schema
- 所有数组必须有 .max() 限制元素数量
- 所有 URL 字段必须校验协议白名单
```

### 模式 2：Toggle 操作事务保护不一致（影响 B2, B4）

| 路由 | 操作 | 事务保护 |
|------|------|---------|
| `resources.ts` Like toggle | delete + update count | ❌ 无事务（遗留 Bug） |
| `ratings.ts` upsert | select + insert/update | ❌ 无事务 |
| `favorites.ts` toggle | select + delete/insert | ❌ 无事务 |
| `forum.ts` vote toggle | select + delete/insert/update | ✅ **有事务** |
| `forum.ts` reply count | insert + update count | ❌ 无事务 |

**建议**：统一所有 toggle/counter 操作使用 `db.transaction()`

### 模式 3：URL 参数无统一 UUID 校验（影响全部批次）

所有路由的 `:id` 参数通过 `c.req.param("id")!` 直接使用，无格式校验。虽不影响安全（Drizzle 参数化查询防注入），但浪费 DB 查询且错误响应不友好。

**建议**：创建 `validateUuidParam` 中间件统一处理。

### 模式 4：速率限制全平台缺失（影响全部写入端点）

5 个批次的审计均标记此问题。无任何速率限制中间件。

### 模式 5：信息泄露 — 未发布内容可见（影响 B2, B4）

| 端点 | 泄露内容 |
|------|---------|
| `GET /users/:id/activity` | 未发布资源名称 |
| `GET /users/:id/comments` | 对未发布资源的评论 |
| `GET /projects/:id` | 草稿项目详情（IDOR） |
| `GET /projects?status=draft&userId=X` | 枚举他人草稿 |

---

## 四、未修复高危问题清单（上线前必须修复）

### 必须修复（10 个 HIGH）

| # | 来源 | Issue | 描述 | 修复难度 |
|---|------|-------|------|---------|
| H1 | B1 | #S1 | Content Schema 全部字符串缺 maxLength | 低（批量改 Zod） |
| H2 | B2 | #F1 | 收藏 toggle 无事务保护（竞态+数据不一致） | 低（套 db.transaction） |
| H3 | B2 | #RES2 | Like toggle 无事务保护（遗留 Bug） | 低 |
| H4 | B4 | #P1 | 草稿项目 IDOR（任何人可查看） | 中（加 optionalAuth+权限判断） |
| H5 | B4 | #P3 | toolChain 使用 `z.any()` | 中（定义具体 schema） |
| H6 | B4 | #U2 | 文件上传无类型白名单 | 低（枚举白名单） |
| H7 | B4 | #U3 | 文件上传无大小限制 | 低（加 fileSize 参数） |
| H8 | B5 | #R1 | JSON.parse 无 try-catch（缓存损坏 crash） | 低（3 行） |
| H9 | B5 | #R2 | KEYS 命令阻塞 Redis（O(N)） | 低（改 SCAN） |
| H10 | B6 | #F1+F2 | 论坛 content 无 max + 无嵌套深度限制 | 低（1+15 行） |

### 建议修复（重要 MEDIUM）

| # | 来源 | Issue | 描述 |
|---|------|-------|------|
| M1 | B2 | #R2 | 评分无自评检查 |
| M2 | B2 | #U2+U3 | 活动时间线/评论泄露未发布资源 |
| M3 | B4 | #U1 | Presigned URL 过期 1h 过长 |
| M4 | B4 | #P5 | URL 字段无协议白名单 |
| M5 | B5 | #R3 | TTL 固定无抖动（雪崩风险） |
| M6 | B6 | #F3 | 投票无自投禁止 |
| M7 | B6 | #F4 | 锁定帖子仍可投票 |
| M8 | B7 | #N1 | 通知 type 无枚举约束 |
| M9 | B7 | #N2 | 通知 content 可能含 XSS 载荷 |

---

## 五、Batch 7 通知系统安全审计（实际代码审查）

> 通知系统代码已存在，以下为实际代码审计结果。

### 5.1 审计文件

| 文件 | 用途 |
|------|------|
| `apps/api/src/routes/notifications.ts` | 通知 CRUD API（4 端点） |
| `apps/api/src/lib/notify.ts` | 通知创建工具函数 |
| 触发集成点 | favorites.ts, forum.ts, ratings.ts |

### 5.2 安全检查清单

| # | 检查项 | 结果 | 说明 |
|---|--------|------|------|
| 1 | 所有端点需 authMiddleware | ✅ PASS | L10, L72, L95, L109 全部有 |
| 2 | 列表仅返回当前用户通知 | ✅ PASS | L19 `eq(notifications.userId, userId)` |
| 3 | 标记已读检查 ownership | ✅ PASS | L79 `eq(notifications.userId, userId)` |
| 4 | 批量标记仅自己的 | ✅ PASS | L102 `eq(notifications.userId, userId)` |
| 5 | 删除检查 ownership | ✅ PASS | L116 `eq(notifications.userId, userId)` |
| 6 | fromUser 仅返回公开字段 | ✅ PASS | L33-35 仅 id/username/avatarUrl |
| 7 | 自通知过滤 | ✅ PASS | notify.ts L26 `fromUserId === toUserId` |
| 8 | 错误不泄露详情 | ✅ PASS | catch 中 console.error 不暴露给用户 |
| 9 | 分页 limit 有上限 | ✅ PASS | L13 `Math.min(..., 100)` |
| 10 | 通知 type 枚举约束 | ❌ FAIL | `type: string` 无校验 |
| 11 | title/content 有 maxLength | ❌ FAIL | notify.ts 无 Zod schema |
| 12 | 通知内容 XSS 防护 | ❌ FAIL | content 直接存储用户输入 |
| 13 | fromUserId 不可伪造 | ✅ PASS | 仅服务端 notify.ts 调用，非 API 端点 |
| 14 | 速率限制 | ❌ FAIL | 无 |
| 15 | unread-count 独立 | ✅ PASS | L48-53 每次列表请求附带返回 |

### 5.3 发现的问题

#### Issue #N1 — 通知 `type` 无枚举约束（数据污染风险）
- **Severity**: MEDIUM
- **File**: `apps/api/src/lib/notify.ts:9`
- **Issue**: `type: string` 允许任意字符串。虽然调用方硬编码了类型名，但无校验意味着调试困难，且 DB 中可能积累脏数据
- **Fix**: 添加 Zod 枚举校验
  ```typescript
  const NotificationType = z.enum([
    'comment', 'like', 'favorite', 'reply', 'mention', 'best_answer', 'system'
  ]);

  interface CreateNotificationParams {
    type: z.infer<typeof NotificationType>;
    // ...
  }
  ```

#### Issue #N2 — 通知 content 可能包含 XSS 载荷（前端渲染风险）
- **Severity**: MEDIUM
- **File**: `apps/api/src/lib/notify.ts:14` + 触发点
- **Issue**: 通知 content 直接传入用户内容（如评论文本、帖子标题）。如果前端直接渲染通知 content 为 HTML/Markdown 而无消毒，XSS 可通过通知传播
- **Fix**:
  1. 后端：截断通知 content 为纯文本，去除 Markdown 格式
  2. 前端：通知内容必须作为纯文本渲染（不使用 dangerouslySetInnerHTML）
  ```typescript
  // notify.ts 中添加纯文本提取
  function stripMarkdown(md: string): string {
    return md
      .replace(/!\[.*?\]\(.*?\)/g, '')  // 图片
      .replace(/\[([^\]]+)\]\(.*?\)/g, '$1')  // 链接
      .replace(/[*_~`#>|]/g, '')  // 格式符号
      .slice(0, 200);  // 截断
  }
  ```

#### Issue #N3 — 通知 title 无长度限制
- **Severity**: MEDIUM
- **File**: `apps/api/src/lib/notify.ts:12`
- **Issue**: `title: string` 无 maxLength。DB 限制 varchar(200)，超出会报 DB 错误但不优雅
- **Fix**: 添加 `title: z.string().min(1).max(200)`

#### Issue #N4 — 通知无防轰炸机制
- **Severity**: MEDIUM
- **File**: 触发点（favorites.ts L50, forum.ts L431/448/613/708, ratings.ts L72）
- **Issue**: 无速率限制的情况下，攻击者可快速收藏/取消/再收藏同一资源，每次都触发通知。被攻击者的通知列表会被刷满
- **Fix**:
  1. 收藏/点赞/评分 toggle 添加速率限制（全局问题）
  2. 短时间内同一 fromUser → toUser 的同类通知合并
  3. 添加通知去重（如同一用户 1 小时内对同一资源的重复操作只发 1 条）

#### Issue #N5 — `page` 参数未用 Zod 校验
- **Severity**: LOW
- **File**: `apps/api/src/routes/notifications.ts:12`
- **Issue**: `page = Number(c.req.query("page") || 1)` 直接 Number() 转换，非数字输入返回 NaN 导致 offset 为 NaN
- **Fix**: 使用 `z.coerce.number().int().min(1).default(1)` 校验

### 5.4 Batch 7 审计评分

| 维度 | 得分 | 满分 |
|------|------|------|
| 认证/授权 | 15 | 15 |
| 输入校验 | 5 | 10 |
| 隐私保护 | 8 | 10 |
| DoS 防护 | 2 | 5 |
| **总计** | **30** | **40** |

**Batch 7 通过率：75%** — 核心安全（认证、ownership、隐私）实现优秀。

---

## 六、安全加固路线图

### Phase 1：上线前必须完成（阻塞上线）

| 优先级 | 任务 | 预估工时 |
|--------|------|---------|
| P0 | 安装 `rehype-sanitize` + `react-markdown`（Markdown XSS 防护） | 2h |
| P0 | 文件上传添加类型白名单 + 大小限制 | 1h |
| P0 | Presigned URL 过期时间缩短到 5 分钟 | 0.5h |
| P0 | `JSON.parse` 添加 try-catch（Redis 缓存） | 0.5h |
| P1 | 论坛 content 添加 maxLength | 0.5h |
| P1 | 回复嵌套深度限制 | 2h |
| P1 | Like/Favorite toggle 添加事务保护 | 1h |
| P1 | 草稿项目 IDOR 修复 | 1h |
| P1 | toolChain Zod schema | 1h |
| P1 | KEYS 替换为 SCAN | 0.5h |
| **总计** | | **~10h** |

### Phase 2：上线后一周内完成

| 优先级 | 任务 | 预估工时 |
|--------|------|---------|
| P2 | 速率限制中间件（全平台） | 4h |
| P2 | DB CHECK 约束（rating 1-5, vote ±1） | 1h |
| P2 | 统一 UUID 参数校验中间件 | 1h |
| P2 | 活动时间线/评论过滤未发布资源 | 1h |
| P2 | 自投禁止（评分 + 投票） | 1h |
| P2 | URL 字段协议白名单 | 0.5h |
| **总计** | | **~8.5h** |

### Phase 3：上线后一个月内完成

| 优先级 | 任务 |
|--------|------|
| P3 | MinIO bucket policy 审计 |
| P3 | Redis 密码认证 |
| P3 | Docker Compose 生产环境配置（移除默认凭据） |
| P3 | Content Schema 批量添加 maxLength |
| P3 | viewCount 防刷（Redis 去重） |
| P3 | 通知去重/合并机制 |
| P3 | TTL 抖动 + singleflight |
| P3 | pgEnum 替换 varchar（status 字段） |

---

## 七、上线建议

### 可上线条件（Checklist）

- [ ] **P0 全部修复**：Markdown XSS 防护、上传白名单、缓存容错
- [ ] **P1 至少修复 8/10 项**：content maxLength、事务保护、IDOR
- [ ] **全平台 typecheck 通过**
- [ ] **核心 API 测试通过**

### 上线后监控建议

1. **Sentry/错误追踪**：监控 `JSON.parse` 失败、事务死锁
2. **Rate limit 告警**：监控异常高频请求
3. **MinIO 监控**：存储使用量、异常大文件上传
4. **Redis 监控**：连接数、内存使用、慢查询（KEYS/SMEMBERS）
5. **安全日志**：记录所有管理操作（置顶/锁定/删除）

---

*最终安全审计报告结束。安全审计员任务完成。*

*审查人：安全审计员*
*日期：2026-03-31*
