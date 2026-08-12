# Multi-stage build producing a standalone Next.js server for Coolify.
# No secrets in build args or image layers: every runtime value comes from
# Coolify's environment config.

# ---------------------------------------------------------------------------
# Stage 1 — dependencies
# ---------------------------------------------------------------------------
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
# npm ci installs exactly what the lockfile pins. Never npm install in a build.
# --ignore-scripts stays: arbitrary postinstall scripts are a supply-chain
# surface. It does mean packages shipping native binaries never unpack them,
# so rebuild the one the build genuinely needs. Tailwind v4 compiles CSS
# through lightningcss, which without this fails at build time with
# "Cannot find module '../lightningcss.<platform>.node'".
RUN npm ci --ignore-scripts \
  && npm rebuild lightningcss

# ---------------------------------------------------------------------------
# Stage 2 — build
# ---------------------------------------------------------------------------
FROM node:22-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build

# ---------------------------------------------------------------------------
# Stage 3 — runner
# ---------------------------------------------------------------------------
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Run as a non-root user.
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Public assets and the standalone server output.
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Migrations and the runner are needed to migrate on deploy. The runner is
# plain .mjs because this image has no tsx and no devDependencies.
COPY --from=builder --chown=nextjs:nodejs /app/drizzle ./drizzle
COPY --from=builder --chown=nextjs:nodejs /app/scripts/migrate-prod.mjs ./scripts/migrate-prod.mjs

# Entrypoint migrates then execs the server, so a deploy applies migrations
# automatically. Not a RUN step: docker build has no database and no
# DATABASE_URL, since secrets arrive from Coolify at runtime.
COPY --from=builder --chown=nextjs:nodejs /app/scripts/entrypoint.sh ./scripts/entrypoint.sh
RUN chmod +x ./scripts/entrypoint.sh

# The standalone build traces only what the app imports at runtime. Nothing in
# the app imports drizzle-orm's migrator, so it is absent from the traced
# node_modules and `node scripts/migrate-prod.mjs` fails with ERR_MODULE_NOT_FOUND.
# Install the two packages the migration runner needs into a separate directory
# that does not overwrite the traced .next/standalone/node_modules.
COPY --chown=nextjs:nodejs package.json package-lock.json ./migrate-deps/
RUN cd migrate-deps \
  && npm install --no-package-lock --no-audit --no-fund --omit=dev \
     drizzle-orm@$(node -p "require('./package.json').dependencies['drizzle-orm']") \
     pg@$(node -p "require('./package.json').dependencies['pg']") \
  && chown -R nextjs:nodejs /app/migrate-deps

# ISR/revalidation writes here. Mount a persistent volume at this path in
# Coolify so the cache survives restarts.
RUN mkdir -p .next/cache && chown -R nextjs:nodejs .next

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["./scripts/entrypoint.sh"]
CMD ["node", "server.js"]
