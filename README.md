# SpectrAI Community Platform

一个独立的 Web 社区平台，让 SpectrAI 用户分享和安装 Workflow/Team/Skill/MCP 模板资源。

## 技术栈

- **Monorepo**: pnpm workspace
- **前端**: Next.js 15 (App Router) + Tailwind CSS + shadcn/ui
- **后端**: Hono (Node.js) + Drizzle ORM
- **数据库**: PostgreSQL 16 + Redis 7
- **认证**: JWT + GitHub OAuth
- **共享**: TypeScript 类型 + zod schema
- **部署**: Docker Compose

## 快速开始

### 前置条件

- Node.js >= 20.0.0 (使用 `.nvmrc` 可快速切换)
- pnpm >= 9.0.0
- Docker & Docker Compose

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 填入你的配置
```

主要环境变量：
- `DATABASE_URL` - PostgreSQL 连接字符串
- `REDIS_URL` - Redis 连接字符串
- `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` - GitHub OAuth App 凭证
- `JWT_SECRET` - JWT 签名密钥（生产环境需使用 `openssl rand -base64 32` 生成）

### 3. 启动服务

```bash
# 启动数据库和 Redis（Docker Compose）
docker compose up -d

# 数据库迁移（如需要）
pnpm db:push

# 启动开发服务器
pnpm dev
```

### 4. 访问应用

- Web 前端: http://localhost:3000
- API 后端: http://localhost:3001/api

## 项目结构

```
spectrai-community-brainstorm/
├── apps/
│   ├── api/                    # Hono 后端 API
│   │   ├── src/
│   │   │   ├── index.ts        # 入口文件
│   │   │   └── routes/         # API 路由
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── .env.example
│   └── web/                    # Next.js 前端应用
│       ├── src/
│       │   └── app/            # App Router 页面
│       ├── package.json
│       ├── tsconfig.json
│       └── .env.example
├── packages/
│   └── shared/                 # 共享包（类型、Schema、API Client）
│       ├── src/
│       │   ├── index.ts        # 统一导出
│       │   ├── api-client.ts   # API 客户端
│       │   ├── types/          # TypeScript 类型定义
│       │   │   ├── user.ts
│       │   │   ├── resource.ts
│       │   │   └── api.ts
│       │   └── schemas/        # Zod 验证 Schema
│       │       ├── workflow.schema.ts
│       │       ├── skill.schema.ts
│       │       ├── team.schema.ts
│       │       ├── mcp.schema.ts
│       │       └── resource.schema.ts
│       ├── package.json
│       └── tsconfig.json
├── .github/
│   └── workflows/
│       └── ci.yml              # GitHub Actions CI 配置
├── package.json                # Root workspace 配置
├── pnpm-workspace.yaml         # Workspace 声明
├── tsconfig.base.json          # 共享 TypeScript 配置
├── docker-compose.yml          # Docker 服务配置
├── .env.example                # 根目录环境变量模板
├── .nvmrc                      # Node.js 版本
└── README.md
```

## API 端点摘要

### 认证 (Auth)
| 方法 | 端点 | 描述 |
|------|------|------|
| POST | `/api/auth/register` | 用户注册 |
| POST | `/api/auth/login` | 用户登录 |
| POST | `/api/auth/github` | GitHub OAuth |
| GET | `/api/auth/me` | 获取当前用户 |

### 资源 (Resources)
| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/api/resources` | 列表（支持分页、筛选） |
| GET | `/api/resources/:id` | 获取单个资源 |
| POST | `/api/resources` | 创建资源 |
| PUT | `/api/resources/:id` | 更新资源 |
| DELETE | `/api/resources/:id` | 删除资源 |
| POST | `/api/resources/:id/like` | 点赞/取消点赞 |
| GET | `/api/resources/search` | 搜索资源 |

### 用户 (Users)
| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/api/users/:username` | 获取用户信息 |
| GET | `/api/users/:username/resources` | 获取用户的资源列表 |
| PUT | `/api/users/:username` | 更新用户资料 |

## 共享包 @spectrai-community/shared

所有共享类型定义和 Zod Schema 都位于 `packages/shared`。

### 导出内容

```typescript
// 类型
import { User, PublicUser, UserRole } from '@spectrai-community/shared/types';
import { Resource, PublicResource, ResourceType, CreateResourceInput } from '@spectrai-community/shared/types';
import { ApiResponse, PaginatedResponse, AuthResponse } from '@spectrai-community/shared/types';

// Schema
import { createResourceInputSchema, publicResourceSchema } from '@spectrai-community/shared/schemas';
import { workflowContentSchema, skillContentSchema } from '@spectrai-community/shared/schemas';

// API Client
import { resourcesApi, authApi, searchApi, usersApi } from '@spectrai-community/shared';
```

### API 响应格式

统一格式：`{ success: boolean, data?: T, error?: string }`

## 脚本命令

```bash
# 开发
pnpm dev              # 启动前端
pnpm dev:api          # 启动后端 API

# 构建
pnpm build            # 构建所有包
pnpm build:shared     # 仅构建 shared 包

# 代码质量
pnpm lint             # ESLint 检查
pnpm typecheck         # TypeScript 类型检查
pnpm test             # 运行测试

# 数据库
pnpm db:generate       # 生成 Drizzle migrations
pnpm db:migrate        # 执行数据库迁移
pnpm db:push           # Push schema 到数据库
pnpm db:seed           # 填充种子数据
pnpm db:studio         # 打开 Drizzle Studio
```

## 环境变量说明

| 变量 | 描述 | 示例 |
|------|------|------|
| `DATABASE_URL` | PostgreSQL 连接字符串 | `postgresql://postgres:password@localhost:5432/spectrai_community` |
| `REDIS_URL` | Redis 连接字符串 | `redis://localhost:6379` |
| `GITHUB_CLIENT_ID` | GitHub OAuth App Client ID | `Iv1.xxx` |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App Secret | `xxx` |
| `JWT_SECRET` | JWT 签名密钥（生产环境需强随机） | `openssl rand -base64 32` |
| `NEXT_PUBLIC_API_URL` | API 基础 URL（前端用） | `http://localhost:3001/api` |
| `NEXT_PUBLIC_APP_URL` | 应用公共 URL | `http://localhost:3000` |

## 许可证

MIT