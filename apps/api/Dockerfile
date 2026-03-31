FROM node:20-alpine
RUN corepack enable && corepack prepare pnpm@9 --activate
RUN npm install -g tsx
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/
RUN pnpm install --frozen-lockfile
COPY tsconfig.base.json ./
COPY packages/shared/ ./packages/shared/
COPY apps/api/ ./apps/api/
RUN pnpm --filter @spectrai-community/shared build
EXPOSE 3001
CMD ["tsx", "apps/api/src/index.ts"]
