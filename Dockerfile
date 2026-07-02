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

# ---- Ingestion worker (needs a headless browser for JS/bot-protected chains) ----
# Playwright base image ships Chromium + system deps matching playwright 1.61.1.
FROM mcr.microsoft.com/playwright:v1.61.1-noble AS ingest
ENV NODE_ENV=production
RUN corepack enable
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages ./packages
# Install only what the ingestion worker needs (incl. playwright JS).
RUN pnpm install --frozen-lockfile
COPY --from=build /app/packages/ingestion/dist/ingest.cjs ./packages/ingestion/dist/ingest.cjs
CMD ["node", "packages/ingestion/dist/ingest.cjs"]
