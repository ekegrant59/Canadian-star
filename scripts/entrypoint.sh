#!/bin/sh
# Container entrypoint: migrate, then serve.
#
# Migrations run here rather than in the Dockerfile because `docker build` has
# no database and no DATABASE_URL: secrets come from Coolify at runtime, never
# from build args. They run here rather than in Coolify's pre-deployment
# command because that executes in the OLD container, which does not contain
# the migration files just written.
#
# set -e: if migrations fail, do NOT start the server. A running app against a
# half-migrated schema corrupts data; a container that refuses to start is a
# loud, harmless failure that Coolify's health check surfaces immediately.
set -e

# Started as root only so a root-owned volume at .next/cache can be handed to
# the app user. Everything after this re-exec runs as nextjs.
if [ "$(id -u)" = "0" ]; then
  mkdir -p /app/.next/cache
  chown -R nextjs:nodejs /app/.next/cache
  exec su-exec nextjs "$0" "$@"
fi

if [ "${RUN_MIGRATIONS_ON_START:-true}" = "true" ]; then
  echo "[entrypoint] applying migrations..."
  node scripts/migrate-prod.mjs
else
  echo "[entrypoint] RUN_MIGRATIONS_ON_START=false, skipping migrations"
fi

echo "[entrypoint] starting server..."
exec "$@"
