# syntax=docker/dockerfile:1
# Multi-stage build: a "web" image (Next.js) and an "ingest" worker image,
# both from this pnpm monorepo.

FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

# ---- Install deps + build both artifacts ----
FROM base AS build
ENV NEXT_TELEMETRY_DISABLED=1
ENV BUILD_STANDALONE=1
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages ./packages
COPY apps ./apps
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @superscout/web build
RUN pnpm --filter @superscout/ingestion build:cli

# ---- Web runtime ----
FROM base AS web
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs
COPY --from=build --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public
USER nextjs
EXPOSE 3000
CMD ["node", "apps/web/server.js"]

# ---- Ingestion worker ----
FROM base AS ingest
ENV NODE_ENV=production
RUN addgroup -S nodejs && adduser -S worker -G nodejs
COPY --from=build --chown=worker:nodejs /app/packages/ingestion/dist/ingest.cjs ./ingest.cjs
USER worker
CMD ["node", "ingest.cjs"]
