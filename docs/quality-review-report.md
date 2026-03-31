# 质量审查报告 — SpectrAI 社区平台

**审查日期**: 2026-03-31  
**审查员**: QA (质量保证)  
**审查范围**: 现有代码规范 + Batch 1 前基线检查

---

## 一、现有代码规范审查

### 1.1 API 响应格式规范 ✅

**标准格式** (`packages/shared/src/types/api.ts`):
```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface PaginatedResponse<T> {
  success: true;
  data: {
    items: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}
```

**后端实现一致性**:
| 路由文件 | 响应格式 | 状态 |
|---------|---------|------|
| `auth.ts` | `{ success: true/false, data/error }` | ✅ 符合 |
| `resources.ts` | `{ success: true/false, data: { items, pagination } }` | ✅ 符合 |
| `users.ts` | `{ success: true/false, data/error }` | ✅ 符合 |

### 1.2 前端编码规范 ✅

**命名规范**:
- 组件：PascalCase (e.g., `ResourceCard`, `CommentSection`)
- 工具函数：camelCase (e.g., `cn()`, `adaptPagination()`)
- 类型：PascalCase (e.g., `PublicResource`, `ApiResponse`)

**组件结构**:
- 使用 shadcn/ui 基础组件
- Tailwind CSS 样式
- `cn()` 合并 className
- 暗色模式支持

### 1.3 ESLint/Prettier/TypeScript 配置

| 配置项 | 设置 | 状态 |
|-------|------|------|
| ESLint Parser | `@typescript-eslint/parser` | ✅ |
| `no-explicit-any` | `warn` | ⚠️ 建议改为 `error` |
| `no-unused-vars` | `error` (忽略 `_` 前缀) | ✅ |
| Prettier `printWidth` | 100 | ✅ |
| Prettier `singleQuote` | true | ✅ |
| TypeScript `strict` | true | ✅ |

---

## 二、发现的质量问题

### Category: Consistency
| # | File | Issue | Suggestion |
|---|------|-------|------------|
| C1 | `apps/api/src/routes/resources.ts:26` vs `packages/shared/src/schemas/resource.schema.ts:17` | name 字段最大长度不一致：路由为 200，schema 为 100 | 统一为 200 或 100 |
| C2 | `apps/api/src/routes/resources.ts:54` vs `packages/shared/src/api-client.ts:192` | 搜索参数命名不一致：后端用 `q`，前端用 `query` | 统一使用 `q` 或 `query` |
| C3 | `apps/web/lib/mock-data.ts` | 前端页面仍使用 mock 数据而非真实 API | Phase 1 需切换至真实 API |

### Category: TypeSafety
| # | File | Issue | Suggestion |
|---|------|-------|------------|
| T1 | `apps/api/src/routes/resources.ts:28` | `content: z.any()` 未使用具体类型 | 使用 `z.union([workflowContentSchema, ...])` |
| T2 | `apps/api/src/routes/resources.ts:14` | TypeScript 导入 `TypeResource` 但未使用 | 移除未使用导入 |
| T3 | `apps/api/src/types/shared.ts` | 存在 `any` 类型使用 | 替换为具体类型或添加 TODO 注释 |

### Category: ErrorHandling
| # | File | Issue | Suggestion |
|---|------|-------|------------|
| E1 | `apps/web/lib/api.ts:103-110` | `getComments`/`addComment` 仅 `console.log` 占位 | 实现真实 API 调用 |
| E2 | `apps/web/components/CommentSection.tsx` | 评论组件未连接 API | 接通 `GET/POST /api/resources/:id/comments` |
| E3 | `apps/web/lib/api.ts:54-59` | `logout` 方法仅清除本地 token | 如后端实现 logout 端点则调用 |

### Category: Performance
| # | File | Issue | Suggestion |
|---|------|-------|------------|
| P1 | `apps/api/src/routes/resources.ts:80-109` | 列表查询已用 `Promise.all` | ✅ 已优化 |
| P2 | `docker-compose.yml` | Redis 已配置但路由中未使用 | Phase 2 排行榜启用缓存 |

### Category: UX
| # | File | Issue | Suggestion |
|---|------|-------|------------|
| U1 | `apps/web/components/ui/` | Toast 组件已引入但未集成 | 集成错误/成功提示 |
| U2 | `apps/web/app/page.tsx:8` | 使用 mock 资源而非排行榜 API | Phase 2 切换 |

---

## 三、Batch 质量检查清单

每个 Batch 完成后必须通过以下检查：

### ✅ 代码风格一致性
- [ ] 变量/函数命名：camelCase
- [ ] 组件/类型命名：PascalCase
- [ ] 数据库列：snake_case
- [ ] 缩进：2 空格
- [ ] 字符串：单引号
- [ ] 行宽：≤ 100 字符

### ✅ TypeScript 类型安全
- [ ] 无 `any` 类型（或已添加 TODO 注释）
- [ ] shared types 在 `packages/shared/src/types/` 中定义
- [ ] 所有类型正确导出和导入
- [ ] 无未使用类型导入

### ✅ 错误处理完整性
- [ ] 异步操作有 try-catch 或错误处理
- [ ] API 调用显示 loading/error state
- [ ] 表单验证有错误提示
- [ ] 数据库约束违规产生友好错误

### ✅ API 响应格式统一性
- [ ] 成功：`{ success: true, data: T }`
- [ ] 失败：`{ success: false, error: string }`
- [ ] HTTP 状态码正确 (200/201/400/401/403/404/409)

### ✅ 分页格式统一性
- [ ] 分页响应：`{ items: T[], pagination: { page, limit, total, totalPages } }`
- [ ] count 和 data 用 `Promise.all` 并行查询
- [ ] 页码从 1 开始

### ✅ 数据库 Schema 规范
- [ ] 主键：`uuid("id").defaultRandom().primaryKey()`
- [ ] 时间戳：`timestamp("created_at", { withTimezone: true })`
- [ ] 外键：`.references(() => table.column, { onDelete: "cascade" })`
- [ ] 唯一约束：`uniqueIndex` 或 `.unique()`
- [ ] 软删除：无（当前设计为硬删除）

### ✅ 组件拆分合理性
- [ ] 单一职责原则
- [ ] 可复用组件提取至 `components/ui/`
- [ ] 复杂组件使用 `React.memo` 优化

---

## 四、Batch 1 待检查项（完成后执行）

待 Batch 1 完成后，需检查：

### Schema 定义
- [ ] 新增 9 张表是否符合 UUID/时间戳/级联规范
- [ ] 外键约束是否正确设置
- [ ] 索引是否合理（查询频繁字段）

### 共享类型
- [ ] 新增 types 与现有命名风格一致
- [ ] Zod schemas 与 TypeScript interfaces 匹配
- [ ] 导出结构清晰（index.ts 统一导出）

### API 路由
- [ ] 路由文件顶部定义 validation schema
- [ ] 响应格式符合 `{ success, data/error }`
- [ ] 错误处理完整

---

## 五、建议

### 短期 (Phase 1)
1. 统一 `name` 字段长度限制（200 vs 100）
2. 统一搜索参数命名（`q` vs `query`）
3. 前端切换至真实 API 调用
4. 集成 Toast 错误提示

### 中期 (Phase 2)
1. 将 `z.any()` 替换为具体联合类型
2. Redis 缓存用于热门资源和排行榜
3. 启用 ESLint `no-explicit-any: error`

### 长期 (Phase 3+)
1. 代码审查自动化（CI 集成）
2. 测试覆盖率要求（>80%）
3. API 文档自动生成（OpenAPI/Swagger）

---

*本报告作为后续每个 Batch 质量审查的参考基线。*
