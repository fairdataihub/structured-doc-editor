# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# Installs the pnpm version pinned in package.json ("packageManager"), so it matches local and Vercel.
RUN corepack enable && COREPACK_ENABLE_DOWNLOAD_PROMPT=0 corepack install
RUN pnpm install --frozen-lockfile && pnpm store prune

COPY . .
RUN pnpm run build

# Production stage
FROM node:22-alpine

LABEL description="DMP Bridge editor prototype (Nuxt)"

WORKDIR /app

COPY --from=builder /app/.output ./
COPY scripts/start.sh /app/scripts/start.sh
RUN chmod +x /app/scripts/start.sh

EXPOSE 3000

CMD ["/app/scripts/start.sh"]
