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

# NEXT_PUBLIC_* is inlined into the bundle at BUILD time, so these must be
# present here, not merely at runtime. Coolify supplies them by marking the
# variable as a "Build Variable"; it passes them as build args automatically.
#
# ONLY non-secret values belong here. A build arg is readable in the image
# history by anyone who can pull the image, so API secrets stay runtime-only.
ARG NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL

ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY
ENV NEXT_PUBLIC_TURNSTILE_SITE_KEY=$NEXT_PUBLIC_TURNSTILE_SITE_KEY

# Not NEXT_PUBLIC_, but next.config.ts reads it at build time to scope the
# next/image remotePattern to this Cloudinary account. The cloud name is public
# (it appears in every delivery URL); the API secret is not and is never here.
ARG CLOUDINARY_CLOUD_NAME
ENV CLOUDINARY_CLOUD_NAME=$CLOUDINARY_CLOUD_NAME

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
# Do not reuse the application package-lock here. It contains the complete
# build graph and npm can fail while pruning it for this tiny runtime tree.
# Keep the versions sourced from the application manifest while giving npm a
# clean manifest containing only the migration runner's direct dependencies.
COPY --chown=nextjs:nodejs package.json ./app-package.json
RUN mkdir -p migrate-deps \
  && cd migrate-deps \
  && npm init -y >/dev/null \
  && npm install --package-lock=false --no-audit --no-fund --omit=dev \
     drizzle-orm@$(node -p "require('../app-package.json').dependencies['drizzle-orm']") \
     pg@$(node -p "require('../app-package.json').dependencies['pg']") \
  && rm ../app-package.json \
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
