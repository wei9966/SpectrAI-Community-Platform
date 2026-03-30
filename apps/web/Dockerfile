# 多阶段构建 - Next.js Web 服务
FROM node:20-alpine AS base

# 安装 pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# 依赖缓存层
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/web/package.json ./apps/web/
RUN pnpm install --frozen-lockfile

# 构建共享包
FROM base AS shared-builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY packages/shared/package.json ./packages/shared/
COPY packages/shared/src ./packages/shared/src
COPY packages/shared/tsconfig*.json ./packages/shared/
RUN pnpm --filter @spectrai-community/shared build

# 构建 Web 服务
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=shared-builder /app/packages/shared/dist ./packages/shared/dist
COPY apps/web/package.json ./apps/web/
COPY apps/web/src ./apps/web/src
COPY apps/web/app ./apps/web/app
COPY apps/web/components ./apps/web/components
COPY apps/web/public ./apps/web/public
COPY apps/web/next.config.* ./apps/web/
COPY apps/web/tailwind.config.* ./apps/web/
COPY apps/web/postcss.config.* ./apps/web/
COPY apps/web/tsconfig*.json ./apps/web/
WORKDIR /app/apps/web
RUN pnpm install --frozen-lockfile --prod
RUN pnpm build

# 生产镜像
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 创建非 root 用户
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 web-user

# 复制构建产物
COPY --from=builder --chown=api-user:nodejs /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=api-user:nodejs /app/apps/web/.next/standalone ./apps/web/standalone
COPY --from=builder --chown=api-user:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=shared-builder --chown=api-user:nodejs /app/packages/shared/dist ./packages/shared/dist

USER web-user

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/web/standalone/server.js"]
