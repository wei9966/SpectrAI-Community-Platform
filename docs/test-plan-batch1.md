# Batch 1 测试计划

> 日期：2026-03-31
> 目标：Phase 2 & Phase 3 数据库 Schema + Zod Schemas + 类型定义测试

---

## 一、现有测试基础设施分析

### 1.1 测试框架配置

| 项目 | 配置 |
|------|------|
| **Runner** | Vitest 2.x |
| **后端环境** | `environment: 'node'` |
| **前端环境** | `environment: 'jsdom'` |
| **全局变量** | `globals: true` |
| **覆盖率提供者** | `v8` |

### 1.2 测试文件位置

- **后端 API**: `apps/api/src/__tests__/*.test.ts`
- **前端组件**: `apps/web/__tests__/*.test.tsx`
- **共享 Schema**: `packages/shared/src/__tests__/*.test.ts`

### 1.3 现有测试模式

#### 后端 API 测试（参考 `auth.test.ts`、`resources.test.ts`）

```typescript
// 1. Mock db
vi.mock('../db/index.js', () => ({ db: mockDb }))

// 2. Mock schema
vi.mock('../db/schema.js', () => ({ tableName: {} }))

// 3. Mock env
vi.mock('../config/env.js', () => ({ getEnv: () => mockEnv }))

// 4. 创建 Hono app
const app = new Hono()
app.route('/api/xxx', xxxRoutes)

// 5. 发送请求
const res = await app.request('/api/xxx', { method: 'POST', ... })

// 6. 断言
expect(res.status).toBe(200)
expect(body.success).toBe(true)
```

#### 前端组件测试（参考 `ResourceCard.test.tsx`）

```typescript
// 1. setup.ts mock next/navigation 和 next/image
// 2. 使用 createMockXxx() 工厂函数
// 3. render() + screen.getByText/getByRole
// 4. fireEvent.click/change
```

#### Zod Schema 测试（参考 `schemas.test.ts`）

```typescript
// 使用 safeParse 测试有效/无效输入
const result = schema.safeParse(validInput)
expect(result.success).toBe(true)

const invalidResult = schema.safeParse(invalidInput)
expect(invalidResult.success).toBe(false)
```

---

## 二、Batch 1 新增内容概述

### 2.1 9 张新数据表（需添加到 `apps/api/src/db/schema.ts`）

| 表名 | 用途 | 关键字段 |
|------|------|----------|
| `resource_ratings` | 资源评分 | resourceId, userId, score(1-5) |
| `resource_favorites` | 资源收藏 | resourceId, userId |
| `projects` | Showcase 项目 | id, title, coverImageUrl, authorId, tags |
| `project_resources` | 项目关联资源 | projectId, resourceId |
| `forum_categories` | 论坛板块 | id, name, slug, sortOrder |
| `forum_posts` | 论坛帖子 | id, title, content, categoryId, authorId, isPinned, isLocked |
| `forum_replies` | 论坛回复 | id, postId, authorId, content, parentReplyId |
| `forum_votes` | 论坛投票 | id, targetType, targetId, userId, voteType |
| `notifications` | 通知系统 | id, userId, type, title, content, isRead |

### 2.2 新增 Zod Schemas（需添加到 `packages/shared/src/schemas/`）

| Schema | 用途 |
|--------|------|
| `resourceRatingSchema` | 评分输入验证 (1-5) |
| `projectSchema` | 项目内容验证 |
| `forumPostSchema` | 帖子内容验证 |
| `forumReplySchema` | 回复内容验证 |
| `notificationSchema` | 通知类型验证 |

### 2.3 新增类型定义（需添加到 `packages/shared/src/types/`）

| 类型 | 用途 |
|------|------|
| `ResourceRating` | 评分数据类型 |
| `Project` | 项目数据类型 |
| `ForumCategory`, `ForumPost`, `ForumReply` | 论坛数据类型 |
| `Notification` | 通知数据类型 |

---

## 三、Batch 1 测试用例设计

### 3.1 Schema 完整性测试

**文件**: `apps/api/src/__tests__/schema-integrity.test.ts`

| 测试用例 | 描述 | 断言 |
|----------|------|------|
| `tables should exist` | 验证 9 张新表在 schema 中已定义 | `expect(schema).toHaveProperty('resource_ratings')` |
| `tables should have correct columns` | 每张表有正确的字段定义 | `expect(table.id).toBeDefined()` |
| `tables should have UUID primary keys` | 主键类型为 UUID | `expect(table.id.type).toBe('uuid')` |
| `tables should have timezone timestamps` | 时间戳带时区 | `expect(table.createdAt.type).toBe('timestamp with time zone')` |
| `tables should have foreign key constraints` | 外键约束存在 | 检查 references 配置 |
| `tables should have unique constraints` | 唯一约束（如 rating 的 user+resource） | 检查 uniqueIndex 配置 |

**测试代码示例**:

```typescript
import { describe, it, expect } from 'vitest';
import * as schema from '../db/schema';

describe('Schema Integrity', () => {
  describe('resource_ratings table', () => {
    it('should exist', () => {
      expect(schema).toHaveProperty('resource_ratings');
    });

    it('should have required columns', () => {
      const table = schema.resource_ratings;
      expect(table).toHaveProperty('id');
      expect(table).toHaveProperty('resourceId');
      expect(table).toHaveProperty('userId');
      expect(table).toHaveProperty('score');
      expect(table).toHaveProperty('createdAt');
    });

    it('should have UUID primary key', () => {
      // 通过 Drizzle 元数据验证
      expect(schema.resource_ratings.id.name).toBe('id');
    });
  });

  // 其他 8 张表同理
});
```

---

### 3.2 Zod Schema 测试

**文件**: `packages/shared/src/__tests__/batch1-schemas.test.ts`

#### 3.2.1 ResourceRating Schema

| 测试用例 | 输入 | 预期 |
|----------|------|------|
| 有效评分 (1-5) | `{ score: 5 }` | ✅ |
| 无效评分 (0) | `{ score: 0 }` | ❌ |
| 无效评分 (6) | `{ score: 6 }` | ❌ |
| 无效类型 | `{ score: "3" }` | ❌ |

#### 3.2.2 Project Schema

| 测试用例 | 输入 | 预期 |
|----------|------|------|
| 有效项目 | `{ title: "My Project", ... }` | ✅ |
| 缺少标题 | `{ description: "..." }` | ❌ |
| 标题超长 (>100) | `{ title: "a".repeat(101) }` | ❌ |
| 有效 tags | `{ tags: ["ai", "demo"] }` | ✅ |
| 无效 tag 类型 | `{ tags: ["valid", 123] }` | ❌ |

#### 3.2.3 ForumPost Schema

| 测试用例 | 输入 | 预期 |
|----------|------|------|
| 有效帖子 | `{ title: "...", content: "..." }` | ✅ |
| 缺少标题 | `{ content: "..." }` | ❌ |
| 内容超长 | `{ title: "...", content: "a".repeat(50001) }` | ❌ |
| 有效 isPinned | `{ isPinned: true }` | ✅ |

#### 3.2.4 ForumReply Schema

| 测试用例 | 输入 | 预期 |
|----------|------|------|
| 有效回复 | `{ content: "..." }` | ✅ |
| 空内容 | `{ content: "" }` | ❌ |
| 嵌套回复 | `{ parentReplyId: "uuid" }` | ✅ |

#### 3.2.5 Notification Schema

| 测试用例 | 输入 | 预期 |
|----------|------|------|
| 有效通知类型 | `{ type: "comment", ... }` | ✅ |
| 无效类型 | `{ type: "invalid" }` | ❌ |
| 有效 sourceType | `{ sourceType: "resource", sourceId: "uuid" }` | ✅ |

---

### 3.3 类型导出测试

**文件**: `packages/shared/src/__tests__/types-export.test.ts`

| 测试用例 | 描述 |
|----------|------|
| `types should be exported from index` | 验证所有类型可从 `types/index.ts` 导出 |
| `types should match schema structure` | 类型定义与 Zod Schema 一致 |
| `types should be importable in API` | API 端点可正确导入类型 |
| `types should be importable in Web` | 前端组件可正确导入类型 |

**测试代码示例**:

```typescript
import { describe, it, expect } from 'vitest';
import type {
  ResourceRating,
  Project,
  ForumPost,
  Notification,
} from '../types';

describe('Type Exports', () => {
  it('should export ResourceRating type', () => {
    // TypeScript 编译时验证
    const _rating: ResourceRating = {
      id: '1',
      resourceId: '1',
      userId: '1',
      score: 5,
      createdAt: new Date(),
    };
    expect(_rating).toBeDefined();
  });

  // 其他类型同理
});
```

---

## 四、测试执行策略

### 4.1 依赖顺序

```
1. Schema 完整性测试（无依赖）
   ↓
2. Zod Schema 测试（无依赖）
   ↓
3. 类型导出测试（依赖 1+2）
```

### 4.2 测试隔离

- 使用 `beforeEach(() => vi.clearAllMocks())` 重置 mocks
- 不使用共享可变状态
- 每个测试用例独立

### 4.3 工厂函数

创建测试数据工厂函数：

```typescript
// packages/shared/src/__tests__/factories.ts

export function createMockRating(overrides = {}) {
  return {
    id: crypto.randomUUID(),
    resourceId: crypto.randomUUID(),
    userId: crypto.randomUUID(),
    score: 5,
    createdAt: new Date(),
    ...overrides,
  };
}

export function createMockProject(overrides = {}) {
  return {
    id: crypto.randomUUID(),
    title: 'Test Project',
    description: 'A test project',
    coverImageUrl: null,
    authorId: crypto.randomUUID(),
    ...overrides,
  };
}

// 其他工厂函数...
```

---

## 五、成功标准

| 标准 | 检查方式 |
|------|----------|
| Schema 完整性测试通过 | `vitest run apps/api/src/__tests__/schema-integrity.test.ts` |
| Zod Schema 测试通过 | `vitest run packages/shared/src/__tests__/batch1-schemas.test.ts` |
| 类型导出测试通过 | `vitest run packages/shared/src/__tests__/types-export.test.ts` |
| TypeScript 编译无错误 | `tsc --noEmit` |
| 测试覆盖率 > 90% | `vitest run --coverage` |

---

## 六、后续批次测试预览

| 批次 | 测试重点 |
|------|----------|
| Batch 2 | API 端点测试（评分、收藏、用户增强） |
| Batch 3 | 前端组件测试（StarRating、ResourceCard 增强） |
| Batch 4 | Showcase 页面测试、Upload 组件测试 |
| Batch 5 | 排行榜算法测试、Redis 缓存测试 |
| Batch 6 | 论坛 API 测试（CRUD、投票、管理操作） |
| Batch 7 | 通知系统测试、触发器集成测试 |
| Batch 8 | 论坛前端测试、Markdown 编辑器测试 |
| Batch 9 | E2E 集成测试、性能测试 |

---

*Batch 1 测试计划完成。待 Schema 代码实现后，立即编写并执行测试用例。*
