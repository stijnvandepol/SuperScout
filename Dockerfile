# syntax=docker/dockerfile:1
# Multi-stage build for the Next.js app (standalone output) in this pnpm monorepo.

FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

# ---- Install deps + build ----
FROM base AS build
ENV NEXT_TELEMETRY_DISABLED=1
ENV BUILD_STANDALONE=1
# Workspace manifests first (better layer caching), then sources.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages ./packages
COPY apps ./apps
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @superscout/web build

# ---- Runtime image ----
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

# Standalone bundle mirrors the monorepo layout under apps/web.
COPY --from=build --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

USER nextjs
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
