# Batch 5 安全审计报告：排行榜后端 (Redis + Rankings API + 缓存策略)

> 审查日期：2026-03-31
> 审查范围：`redis.ts`、`rankings.ts`、`docker-compose.yml` (Redis)、`env.ts`
> 审查员：安全审计员

---

## 审查总览

| 审查项 | 文件 | 状态 |
|--------|------|------|
| Redis 客户端 | `apps/api/src/lib/redis.ts` | ⚠️ 有问题 |
| Rankings 路由 | `apps/api/src/routes/rankings.ts` | ⚠️ 有问题 |
| Docker Redis 配置 | `docker-compose.yml` | ⚠️ 有问题 |
| 环境配置 | `apps/api/src/config/env.ts` | ✅ 合格 |

---

## 一、Redis 客户端审计（`redis.ts`）

### 1.1 连接安全

| 检查项 | 结果 | 说明 |
|--------|------|------|
| 连接字符串从环境变量读取 | ✅ PASS | L12 `env.REDIS_URL` |
| 连接错误处理 | ✅ PASS | L22-24 error event handler |
| 重连策略 | ✅ PASS | L15-17 指数退避，上限 2s |
| 密码配置 | ⚠️ WARN | 依赖 REDIS_URL 中是否含密码，docker-compose 未设密码（#DR1） |
| Redis 命令注入 | ✅ PASS | ioredis 库使用参数化命令 |
| 单例模式 | ✅ PASS | lazy init |

### 1.2 缓存工具函数审计

| 检查项 | 结果 | 说明 |
|--------|------|------|
| Key 构造安全 | ✅ PASS | L53 key 由固定前缀 + Zod 校验值组成，无用户自由输入 |
| TTL 设置 | ⚠️ WARN | L44/L126 默认 3600s（1h），未区分数据敏感性 |
| JSON.parse 无异常处理 | ❌ FAIL | L51 无 try-catch，缓存数据损坏会 crash 进程 |
| `KEYS` 命令使用 | ❌ FAIL | L70 `client.keys("ranking:*")` — 生产环境性能隐患 |

### 发现的问题

#### Issue #R1 — `JSON.parse` 无异常处理（缓存损坏导致服务崩溃）
- **Severity**: HIGH
- **File**: `apps/api/src/lib/redis.ts:51`
- **Issue**: `JSON.parse(cached)` 没有 try-catch。如果 Redis 中的缓存数据被损坏（部分写入、版本升级格式变化、手动误操作），服务端会抛出 `SyntaxError` 导致请求失败（500）
- **Impact**: 所有排行榜接口不可用，影响面 100%
- **Fix**:
  ```typescript
  const cached = await client.get(key);
  if (cached) {
    try {
      const parsed = JSON.parse(cached) as { data: T; cachedAt: string };
      return { ...parsed, fromCache: true };
    } catch {
      // Cache corrupted, delete and recompute
      await client.del(key);
    }
  }
  ```

#### Issue #R2 — `KEYS` 命令在生产环境有性能风险
- **Severity**: HIGH
- **File**: `apps/api/src/lib/redis.ts:70`
- **Issue**: `client.keys("ranking:*")` 是 O(N) 操作，会扫描整个 Redis keyspace。当 Redis 中有大量 key 时（其他功能也用 Redis），此操作会阻塞 Redis 主线程，导致所有 Redis 操作超时
- **Impact**: Admin 调用 `/rankings/refresh` 可能导致全站缓存服务短暂不可用
- **Fix**: 使用 `SCAN` 替代 `KEYS`，或维护一个已注册 key 的集合
  ```typescript
  export async function invalidateRankingCaches(): Promise<void> {
    const client = getRedis();
    // Use SCAN instead of KEYS for production safety
    const stream = client.scanStream({ match: "ranking:*", count: 100 });
    const keys: string[] = [];

    await new Promise<void>((resolve, reject) => {
      stream.on("data", (resultKeys: string[]) => keys.push(...resultKeys));
      stream.on("end", () => resolve());
      stream.on("error", reject);
    });

    if (keys.length > 0) {
      await client.del(...keys);
    }
  }
  ```

#### Issue #R3 — 缓存 TTL 固定 3600s，存在缓存雪崩风险
- **Severity**: MEDIUM
- **File**: `apps/api/src/lib/redis.ts:44` + `rankings.ts:126,220,297`
- **Issue**: 所有排行榜缓存 TTL 都是固定 3600 秒。当大量缓存同时过期（如部署重启后全部 miss 再同时写入），会导致 "thundering herd" 效应——所有请求同时穿透到数据库
- **Fix**: 添加 TTL 随机抖动
  ```typescript
  export async function getCachedOrCompute<T>(
    key: string,
    fn: () => Promise<T>,
    ttlSeconds = 3600
  ): Promise<{ data: T; cachedAt: string; fromCache: boolean }> {
    // ...
    const jitter = Math.floor(ttlSeconds * 0.1 * Math.random()); // ±10% jitter
    await client.setex(key, ttlSeconds + jitter, payload);
    // ...
  }
  ```

#### Issue #R4 — 并发请求时的缓存击穿（无锁机制）
- **Severity**: MEDIUM
- **File**: `apps/api/src/lib/redis.ts:41-63`
- **Issue**: 当缓存过期时，多个并发请求会同时发现缓存 miss，全部执行 `fn()` 计算函数（排行榜涉及复杂 SQL 查询）。高并发下可能导致数据库压力激增
- **Fix**: 添加简单的分布式锁或 singleflight 模式
  ```typescript
  // Simple singleflight using Redis SETNX
  const lockKey = `lock:${key}`;
  const lock = await client.set(lockKey, "1", "EX", 30, "NX");

  if (!lock) {
    // Another request is computing, wait and retry cache
    await new Promise(r => setTimeout(r, 500));
    const retryCached = await client.get(key);
    if (retryCached) {
      const parsed = JSON.parse(retryCached);
      return { ...parsed, fromCache: true };
    }
  }

  try {
    const data = await fn();
    // ... cache and return
  } finally {
    await client.del(lockKey);
  }
  ```

---

## 二、Rankings 路由审计（`rankings.ts`）

### 2.1 输入校验

| 检查项 | 结果 | 说明 |
|--------|------|------|
| `period` 枚举校验 | ✅ PASS | L21 `z.enum(["week", "month", "all"])` |
| `sort` 枚举校验 | ✅ PASS | L22 `z.enum(["rating", "downloads", "favorites"])` |
| `limit` 范围限制 | ✅ PASS | L23 `z.coerce.number().int().min(1).max(100)` |
| 用户排行 `sort` | ✅ PASS | L28 `z.enum(["contributions", "reputation"])` |
| 项目排行 `limit` | ✅ PASS | L33 `max(100)` |

### 2.2 SQL 查询安全

| 检查项 | 结果 | 说明 |
|--------|------|------|
| Drizzle 参数化查询 | ✅ PASS | `sql` tagged template + `${variable}` 由 Drizzle 参数化 |
| `periodDate` 条件注入 | ✅ PASS | L98 `sql\`AND r.created_at >= ${periodDate}\`` — Date 对象参数化安全 |
| `sort` 值直接用于 SQL CASE | ❌ FAIL | L164 `${sort}` 在 CASE 表达式中（见 #RK1） |
| 复杂 JOIN 查询性能 | ⚠️ WARN | 大表时子查询可能很慢 |

### 2.3 权限与访问控制

| 检查项 | 结果 | 说明 |
|--------|------|------|
| `GET /resources` 认证 | ✅ 合理 | 公开端点，无需认证 |
| `GET /users` 认证 | ✅ 合理 | 公开端点 |
| `GET /projects` 认证 | ✅ 合理 | 公开端点 |
| `POST /refresh` 认证 | ✅ PASS | L310 authMiddleware |
| `POST /refresh` 角色检查 | ✅ PASS | L312 admin/moderator |

### 发现的问题

#### Issue #RK1 — `sort` 参数值直接嵌入 SQL CASE 表达式（潜在 SQL 注入）
- **Severity**: HIGH
- **File**: `apps/api/src/routes/rankings.ts:164`
- **Issue**: `${sort}` 变量在 SQL CASE 表达式中使用：
  ```typescript
  CASE
    WHEN ${sort} = 'contributions' THEN ...
  ```
  虽然 `sort` 已通过 `z.enum(["contributions", "reputation"])` 校验（白名单），所以在当前代码中**不可利用**。但这种模式本身是危险的——如果未来有人修改 Zod schema 放宽了校验，就会导致 SQL 注入
- **Impact**: 当前安全（Zod 白名单保护），但设计模式危险
- **Fix**: 使用 JavaScript 条件分支替代 SQL CASE 中的动态值
  ```typescript
  // 方案 A: 在 JS 层决定排序逻辑
  const sortExpression = sort === 'contributions'
    ? sql`COALESCE(rc.resource_count, 0) * 3 + COALESCE(cc.comment_count, 0) + COALESCE(rpc.reply_count, 0)`
    : sql`COALESCE(rts.avg_rating, 0) * COALESCE(rc.resource_count, 0) + COALESCE(rpc.total_vote_score, 0)`;

  // 然后在 SQL 中:
  // ${sortExpression} as score
  ```

#### Issue #RK2 — 复合评分算法可被操纵（刷下载/评分提升排名）
- **Severity**: MEDIUM
- **File**: `apps/api/src/routes/rankings.ts:63-84`
- **Issue**: 资源排行榜评分公式：
  ```
  score = avgRating*0.4 + ln(downloads+1)*0.3 + ln(favorites+1)*0.2 + timeDecay*0.1
  ```
  由于以下原因，排名可被操纵：
  1. **下载计数**：每次 GET /resources/:id 都 +1 下载（resources.ts:229-232），无去重。攻击者可反复请求刷下载量
  2. **评分**：虽然每个用户只能评一次（uniqueIndex），但可以注册多个小号评分
  3. **收藏**：toggle 机制，无事务保护（Batch 2 #F1），且无速率限制
- **Impact**: 排行榜排名可被操纵，影响平台公信力
- **Fix**:
  1. 下载计数添加去重（同一用户/IP 短时间内不重复计数）
  2. 评分、收藏端点添加速率限制
  3. 考虑添加反作弊：新注册用户评分权重降低

#### Issue #RK3 — 下载计数无防刷保护
- **Severity**: MEDIUM
- **File**: `apps/api/src/routes/rankings.ts` (间接影响) + `resources.ts:229-232`
- **Issue**: `resources.ts` 的 GET 详情端点每次请求都 `downloads + 1`，无任何防刷措施：
  - 无用户认证要求
  - 无 IP 去重
  - 无时间窗口限制
- **Impact**: 攻击者可用简单脚本刷下载量，直接提升排行榜分数
- **Fix**: 将下载计数改为去重机制
  ```typescript
  // 使用 Redis 计数去重
  const downloadKey = `dl:${resourceId}:${currentUserId || clientIP}`;
  const alreadyCounted = await redis.get(downloadKey);
  if (!alreadyCounted) {
    await db.update(resources)
      .set({ downloads: sql`${resources.downloads} + 1` })
      .where(eq(resources.id, id));
    await redis.setex(downloadKey, 86400, "1"); // 24h 去重
  }
  ```

#### Issue #RK4 — 用户排行评分公式在 SQL CASE 中嵌入 Zod 校验值
- **Severity**: LOW (设计问题)
- **File**: `apps/api/src/routes/rankings.ts:163-171`
- **Issue**: 与 #RK1 相同的模式。`${sort}` 虽然有 Zod 白名单保护，但应避免在 SQL 中直接使用用户输入
- **Fix**: 同 #RK1

#### Issue #RK5 — 缓存 key 未包含 `sort` 值（用户排行）
- **Severity**: LOW (逻辑 Bug)
- **File**: `apps/api/src/routes/rankings.ts:145`
- **Issue**: `ranking:users:${period}:${sort}:${limit}` — 实际上已包含 sort。经复查，key 构造正确
- **Status**: 撤回，实际上 PASS ✅

#### Issue #RK6 — 大量未使用的 import
- **Severity**: LOW
- **File**: `apps/api/src/routes/rankings.ts:3,9-12`
- **Issue**: `desc`, `gte`, `count`, `avg`, `resourceFavorites`, `resourceComments`, `projects`, `forumReplies` 等被 import 但在 SQL raw query 中直接使用表名，未通过 Drizzle ORM 引用。这些 import 实际未被使用（TypeScript 应该会报 unused warning）
- **建议**: 清理未使用的 import

---

## 三、缓存策略安全

### 3.1 缓存安全矩阵

| 风险类型 | 状态 | 说明 |
|----------|------|------|
| **缓存穿透** (查询不存在的数据绕过缓存) | ✅ 安全 | 缓存 key 由服务端构造，不依赖用户输入的 ID |
| **缓存雪崩** (大量缓存同时过期) | ⚠️ 风险 | 所有 TTL 固定 3600s，无抖动 (#R3) |
| **缓存击穿** (热点 key 过期时大量请求穿透) | ⚠️ 风险 | 无锁/singleflight (#R4) |
| **缓存污染** (恶意数据写入缓存) | ✅ 安全 | 数据来源为 DB 聚合查询，非用户输入 |
| **缓存投毒** (篡改缓存内容) | ✅ 安全 | Redis 不对外暴露，无外部写入途径 |

### 3.2 Redis Key 安全

| 检查项 | 结果 |
|--------|------|
| Key 前缀命名空间 | ✅ `ranking:*` 前缀，不与其他功能冲突 |
| Key 中用户输入 | ✅ 仅含 Zod 校验后的枚举值和数字 |
| Key 长度限制 | ✅ 固定格式 `ranking:<type>:<period>:<sort>:<limit>` |
| Key 注入风险 | ✅ 安全 |

---

## 四、Docker Redis 配置审计

### 发现的问题

#### Issue #DR1 — Redis 无密码认证
- **Severity**: MEDIUM
- **File**: `docker-compose.yml:30`
- **Issue**: Redis 启动命令 `redis-server --appendonly yes` 未设置 `--requirepass`。虽然有网络隔离（docker network），但端口映射到主机（L32 `"${REDIS_PORT:-6379}:6379"`），意味着主机网络上的任何进程都可连接 Redis
- **Impact**: 攻击者如果获得主机访问权限，可直接操作 Redis（读/写/删除所有缓存数据）
- **Fix**:
  ```yaml
  command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD:-redis_secure_2024}
  ```
  并在 `env.ts` 中更新 `REDIS_URL` 格式以包含密码：
  ```
  REDIS_URL=redis://:redis_secure_2024@localhost:6379
  ```

#### Issue #DR2 — Redis 端口暴露到主机
- **Severity**: LOW
- **File**: `docker-compose.yml:32`
- **Issue**: `"${REDIS_PORT:-6379}:6379"` 将 Redis 端口暴露到主机所有接口。开发环境可接受，生产环境应仅绑定 127.0.0.1 或不映射端口
- **Fix**: 生产环境使用 `"127.0.0.1:${REDIS_PORT:-6379}:6379"` 或不映射端口（API 在同一 docker network 中直接访问）

---

## 五、汇总

### 按严重级别

| Severity | 数量 | Issue IDs |
|----------|------|-----------|
| CRITICAL | 0 | — |
| HIGH | 2 | #R1(JSON.parse无保护), #R2(KEYS命令阻塞), #RK1(sort嵌入SQL) |
| MEDIUM | 4 | #R3(缓存雪崩), #R4(缓存击穿), #RK2(排名操纵), #RK3(下载刷量), #DR1(Redis无密码) |
| LOW | 2 | #DR2(Redis端口暴露), #RK6(未使用import) |

> 实际 #RK1 是 HIGH 级别的设计风险，但当前有 Zod 白名单保护，**不可直接利用**。降级为 MEDIUM 更准确。

### 修正后的严重级别

| Severity | 数量 | Issue IDs |
|----------|------|-----------|
| CRITICAL | 0 | — |
| HIGH | 2 | #R1 (JSON.parse crash), #R2 (KEYS 阻塞) |
| MEDIUM | 5 | #R3(雪崩), #R4(击穿), #RK1(SQL设计风险), #RK2(排名操纵), #RK3(下载刷量), #DR1(Redis无密码) |
| LOW | 2 | #DR2(端口), #RK6(import) |

### 必须修复（阻塞上线）

1. **#R1** — `JSON.parse` 添加 try-catch（服务稳定性）
2. **#R2** — `KEYS` 替换为 `SCAN`（性能安全）

### 建议修复

3. **#R3** — TTL 添加随机抖动（防雪崩）
4. **#RK2/#RK3** — 下载计数添加去重、评分添加速率限制
5. **#RK1** — 重构 SQL CASE 表达式
6. **#DR1** — Redis 添加密码认证

### 可延后

7. **#R4** — 缓存击穿 singleflight（社区平台流量有限，初期可延后）
8. **#DR2** — Redis 端口绑定（生产环境配置）
9. **#RK6** — 清理 import

---

## 六、关键修复代码

### redis.ts — 安全加固版

```typescript
export async function getCachedOrCompute<T>(
  key: string,
  fn: () => Promise<T>,
  ttlSeconds = 3600
): Promise<{ data: T; cachedAt: string; fromCache: boolean }> {
  const client = getRedis();

  const cached = await client.get(key);
  if (cached) {
    try {
      const parsed = JSON.parse(cached) as { data: T; cachedAt: string };
      return { ...parsed, fromCache: true };
    } catch {
      await client.del(key);
    }
  }

  const data = await fn();
  const cachedAt = new Date().toISOString();
  const payload = JSON.stringify({ data, cachedAt });

  // TTL jitter to prevent thundering herd
  const jitter = Math.floor(ttlSeconds * 0.1 * Math.random());
  await client.setex(key, ttlSeconds + jitter, payload);

  return { data, cachedAt, fromCache: false };
}

export async function invalidateRankingCaches(): Promise<void> {
  const client = getRedis();
  const stream = client.scanStream({ match: "ranking:*", count: 100 });
  const keys: string[] = [];

  await new Promise<void>((resolve, reject) => {
    stream.on("data", (resultKeys: string[]) => keys.push(...resultKeys));
    stream.on("end", () => resolve());
    stream.on("error", reject);
  });

  if (keys.length > 0) {
    await client.del(...keys);
  }
}
```

---

*报告结束。建议优先修复 #R1 和 #R2，这两个问题直接影响服务稳定性。*
