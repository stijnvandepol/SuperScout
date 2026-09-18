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
# Pinned, not auto-allocated. The ingestion worker runs as root on a shared
# volume and hands its output to this group (see packages/ingestion/src/
# shared-volume.ts, WEB_GID); an id picked by `addgroup -S` would silently
# drift on a base-image bump and lock the site out of its own data.
RUN addgroup -g 1001 -S nodejs && adduser -u 1001 -S nextjs -G nodejs
COPY --from=build --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public
USER nextjs
EXPOSE 3000
# --experimental-sqlite: node:sqlite is built in but flagged on Node 22. On
# Node 24 the flag is a harmless no-op, so this survives a base-image bump.
CMD ["node", "--experimental-sqlite", "apps/web/server.js"]

# ---- Ingestion worker (needs a headless browser for JS/bot-protected chains) ----
# Playwright base image ships Chromium + system deps matching playwright 1.61.1.
FROM mcr.microsoft.com/playwright:v1.61.1-noble AS ingest
ENV NODE_ENV=production
# Point our own (pnpm-installed) Playwright at the browsers baked into the image
# so it doesn't look in ~/.cache and fail to launch Chromium.
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
RUN corepack enable
WORKDIR /app
# Full workspace manifests so --frozen-lockfile validates (lockfile spans apps/* too).
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages ./packages
COPY apps ./apps
RUN pnpm install --frozen-lockfile
COPY --from=build /app/packages/ingestion/dist/ingest.cjs ./packages/ingestion/dist/ingest.cjs
CMD ["node", "--experimental-sqlite", "packages/ingestion/dist/ingest.cjs"]
