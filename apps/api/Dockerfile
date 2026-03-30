# 多阶段构建 - Node.js API 服务
FROM node:20-alpine AS base

# 安装 pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# 依赖缓存层
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/
RUN pnpm install --frozen-lockfile

# 构建共享包
FROM base AS shared-builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY packages/shared/package.json ./packages/shared/
COPY packages/shared/src ./packages/shared/src
COPY packages/shared/tsconfig*.json ./packages/shared/
RUN pnpm --filter @spectrai-community/shared build

# 构建 API 服务
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=shared-builder /app/packages/shared/dist ./packages/shared/dist
COPY apps/api/package.json ./apps/api/
COPY apps/api/src ./apps/api/src
COPY apps/api/tsconfig*.json ./apps/api/
WORKDIR /app/apps/api
RUN pnpm install --frozen-lockfile --prod
RUN pnpm build

# 生产镜像
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# 创建非 root 用户
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 api-user

# 复制构建产物
COPY --from=builder --chown=api-user:nodejs /app/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=api-user:nodejs /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder --chown=api-user:nodejs /app/apps/api/package.json ./apps/api/
COPY --from=shared-builder --chown=api-user:nodejs /app/packages/shared/dist ./packages/shared/dist

USER api-user

EXPOSE 3001

CMD ["node", "apps/api/dist/index.js"]
