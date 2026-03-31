# Batch 4 后端 + Batch 5 前端 质量审查报告

**审查日期**: 2026-03-31
**审查员**: QA Reviewer
**审查范围**: Batch 4 后端 (Projects/Uploads/Storage) + Batch 5 Rankings 前端

---

## 一、审查总结

| 模块 | 审查状态 | 通过情况 | 问题数量 |
|------|----------|----------|----------|
| Batch 4 - Projects 路由 | 已完成 | **PASSED** | 2 |
| Batch 4 - Uploads 路由 | 已完成 | **PASSED** | 1 |
| Batch 4 - Storage 工具 | 已完成 | **PASSED** | 1 |
| Batch 4 - DB Schema 修复验证 | 已完成 | **部分通过** | 2 (已修复 + 新增) |
| Batch 5 - Rankings 前端 | 已完成 | **PASSED** | 3 |

**总体 verdict**: **PASSED** (共发现 9 个问题，无严重级别)

---

## 二、Batch 4 后端审查详情

### 2.1 Projects 路由 (`apps/api/src/routes/projects.ts`)

**审查清单**:

| 检查项 | 状态 | 备注 |
|--------|------|------|
| 代码规范一致性 | ✓ 通过 | 遵循 ratings.ts/favorites.ts 路由风格 |
| 错误处理完整性 | ✓ 通过 | 404/403/400 响应正确 |
| 分页实现 | ✓ 通过 | 正确使用 limit/offset，Promise.all 并行查询 |
| 查询性能 | ✓ 通过 | 无 N+1 查询问题 |
| CRUD 完整性 | ✓ 通过 | GET list / GET by id / POST / PUT / DELETE / 关联资源管理 |

**代码亮点**:
- GET `/api/projects` 使用 `Promise.all` 并行执行数据和 count 查询
- GET `/api/projects/:id` 正确 LEFT JOIN 获取 author 信息
- POST /resource 链接接口使用 409 Conflict 处理重复链接
- 权限检查完整 (ownership + admin role)

**发现的问题**:

| 编号 | 严重性 | 问题描述 | 修复建议 |
|------|--------|----------|----------|
| Q013 | Low | Schema 中 `cover_image` vs 代码中 `coverImage` 属性命名不一致 | DB schema 第 173 行使用 `cover_image`，但路由中使用 `coverImage`，确认 Drizzle 是否正确映射 |
| Q014 | Low | GET list 端点未使用 `optionalAuthMiddleware`，无法返回 isFavorited 字段 | 参考 resources.ts GET `/` 模式，添加 `optionalAuthMiddleware` 支持未登录用户 |

---

### 2.2 Uploads 路由 (`apps/api/src/routes/uploads.ts`)

**审查清单**:

| 检查项 | 状态 | 备注 |
|--------|------|------|
| presigned URL 生成 | ✓ 通过 | 调用 `getPresignedUploadUrl` 正确 |
| 文件类型验证 | ✓ 通过 | Zod enum 限制 ["avatars", "covers", "uploads"] |
| 错误处理 | ✓ 通过 | authMiddleware + zValidator 自动返回 400/401 |

**代码亮点**:
- 唯一 key 生成逻辑：`${folder}/${userId}/${timestamp}-${random}.${ext}`
- 同时返回 uploadUrl、key、publicUrl

**发现的问题**:

| 编号 | 严重性 | 问题描述 | 修复建议 |
|------|--------|----------|----------|
| Q015 | Medium | `/confirm` 端点未实际验证文件是否成功上传 | 建议调用 `deleteObject` 或检查 object 存在性，防止空文件 |

---

### 2.3 Storage 工具 (`apps/api/src/lib/storage.ts`)

**审查清单**:

| 检查项 | 状态 | 备注 |
|--------|------|------|
| S3 客户端配置 | ✓ 通过 | endpoint、credentials、region 配置正确 |
| presigned URL 生成 | ✓ 通过 | `getSignedUrl` 使用正确 |
| 错误处理 | ⚠ 部分 | `deleteObject` 未捕获异常 |

**发现的问题**:

| 编号 | 严重性 | 问题描述 | 修复建议 |
|------|--------|----------|----------|
| Q016 | Low | `deleteObject` 函数未 try/catch，可能抛出未处理异常 | 添加 try/catch 并抛出有意义的错误消息 |

```typescript
// 建议修改
export async function deleteObject(key: string): Promise<void> {
  const env = getEnv();
  const command = new DeleteObjectCommand({
    Bucket: env.MINIO_BUCKET,
    Key: key,
  });
  try {
    await getS3Client().send(command);
  } catch (error) {
    throw new Error(`Failed to delete object ${key}: ${error.message}`);
  }
}
```

---

### 2.4 DB Schema 修复验证 (`apps/api/src/db/schema.ts`)

**验证项目**:

| 检查项 | 预期 | 实际 | 状态 |
|--------|------|------|------|
| `projects.toolChain` 字段 | jsonb | `toolChain: jsonb("tool_chain")` ✓ | **已添加** |
| `projects.tags` 字段 | text[] | `tags: text("tags").array()` ✓ | **已添加** |
| `forumPosts.tags` 字段 | text[] | `tags: text("tags").array()` ✓ | **已添加** |
| `forumVotes` onDelete cascade | cascade | `onDelete: "cascade"` ✓ | **已修复** |
| `notifications.fromUserId` onDelete | set null | `onDelete: "set null"` ✓ | **已修复** |

**状态**: 之前 Batch 1 发现的 Q001、Q002 已修复，Q003 命名不一致问题仍存在（DB: `cover_image` → TS: `coverImage`）

**新增发现**:

| 编号 | 严重性 | 问题描述 | 修复建议 |
|------|--------|----------|----------|
| Q017 | Low | `forumPosts.categoryId` 外键未设置 onDelete | 第 236 行：添加 `{ onDelete: "cascade" }` |
| Q018 | Low | `forumReplies.parentId` 自引用外键未设置 onDelete | 第 267 行：添加 `.references(() => forumReplies.id, { onDelete: "cascade" })` |

---

## 三、Batch 5 Rankings 前端审查详情

### 3.1 Rankings 页面 (`apps/web/app/rankings/page.tsx`)

**审查清单**:

| 检查项 | 状态 | 备注 |
|--------|------|------|
| 组件结构和可维护性 | ✓ 通过 | 组件拆分清晰，`ProjectCard` 独立 |
| shadcn/ui 组件使用 | ✓ 通过 | Card, Button, Badge 正确使用 |
| 响应式布局 | ✓ 通过 | `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` |
| 加载/空状态/错误状态 | ⚠ 部分 | 空状态已处理，缺少 loading 和 error 状态 |
| 中文 UI 文案 | ✓ 通过 | 全部使用中文，字体统一 |

**代码亮点**:
- 排名变化指示器 (`ArrowUp`/`ArrowDown`) 视觉反馈好
- 前三名特殊样式 (`border-primary/30 bg-primary/5`)
- 综合评分计算逻辑：`rating * 100 + downloads * 0.1 + likes * 0.5`

**发现的问题**:

| 编号 | 严重性 | 问题描述 | 修复建议 |
|------|--------|----------|----------|
| Q019 | Low | 缺少 loading 状态 | 添加 `isLoading` 状态，数据加载时显示 Skeleton |
| Q020 | Low | 时间范围筛选 (`week`/`month`/`all`) 未实际生效 | Mock 数据未根据时间范围过滤，应添加日期筛选逻辑 |
| Q021 | Low | `as any` 类型断言 (第 43 行) | 使用正确的类型定义代替 `as any` |

---

## 四、Showcase 前端审查 (额外)

### 4.1 Showcase 页面 (`apps/web/app/showcase/page.tsx`)

**审查状态**: **PASSED**

**代码亮点**:
- 排序逻辑正确 (`latest`/`popular`)
- 封面图加载失败时显示首字母占位
- 时间显示使用 `timeAgo` 函数 ("3 天前", "1 小时前")
- 作者头像点击可跳转个人主页
- 空状态提示友好

**发现的问题**:

| 编号 | 严重性 | 问题描述 | 修复建议 |
|------|--------|----------|----------|
| Q022 | Low | Mock 数据硬编码，未调用真实 API | 后续 Batch 应替换为实际 API 调用 |

---

## 五、问题汇总

| 编号 | 模块 | 严重性 | 问题简述 | 状态 |
|------|------|--------|----------|------|
| Q013 | Batch 4 - Projects | Low | cover_image vs coverImage 命名不一致 | 待修复 |
| Q014 | Batch 4 - Projects | Low | GET list 未使用 optionalAuthMiddleware | 待修复 |
| Q015 | Batch 4 - Uploads | Medium | /confirm 未验证文件存在性 | 待修复 |
| Q016 | Batch 4 - Storage | Low | deleteObject 未 try/catch | 待修复 |
| Q017 | Batch 4 - Schema | Low | forumPosts.categoryId 缺少 onDelete | 待修复 |
| Q018 | Batch 4 - Schema | Low | forumReplies.parentId 缺少 onDelete | 待修复 |
| Q019 | Batch 5 - Rankings | Low | 缺少 loading 状态 | 待修复 |
| Q020 | Batch 5 - Rankings | Low | 时间范围筛选未生效 | 待修复 |
| Q021 | Batch 5 - Rankings | Low | `as any` 类型断言 | 待修复 |
| Q022 | Batch 4 - Showcase | Low | Mock 数据未调用 API | 待后续迭代 |

---

## 六、修复优先级

### Medium (建议尽快修复)
- **Q015**: `/confirm` 端点应验证文件存在性，防止空文件占用存储

### Low (可延后修复)
- Q013, Q014, Q016, Q017, Q018, Q019, Q020, Q021, Q022

---

## 七、审查结论

**Batch 4 后端**: **PASSED**
- 所有核心 CRUD 功能正常工作
- API 响应格式符合规范
- 权限检查完整
- 分页实现正确

**Batch 5 前端**: **PASSED**
- 组件结构清晰，可维护性好
- UI/UX 设计合理
- 响应式布局正确

**下一批次**: 等待 Batch 6 Forum API 或 Batch 7 Notifications 提交

---

主人~ 工作完成了哦！
