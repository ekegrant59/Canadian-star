import 'server-only';

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

/**
 * One pool, one place. Never instantiate a client outside this file.
 *
 * The global cache exists because Next's dev server reloads modules on every
 * change; without it the container opens a new pool per reload and exhausts
 * Postgres connections within minutes.
 */
const globalForDb = globalThis as unknown as { pool?: Pool };

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }

  return new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });
}

/**
 * Resolved on first use, not at module load.
 *
 * Importing this module must stay side-effect free: `next build` evaluates
 * route modules to collect page data, and DATABASE_URL is deliberately absent
 * during the Docker build (secrets come from Coolify at runtime, never from
 * build args). Creating the pool at import time fails the build with
 * "Failed to collect page data for /api/health". Next 16's cacheComponents
 * rejects `export const dynamic = 'force-dynamic'`, so laziness is the fix.
 */
function getPool(): Pool {
  const existing = globalForDb.pool;
  if (existing) return existing;

  const created = createPool();
  // Cached in every environment: one pool per process is the invariant. In dev
  // this additionally survives HMR reloads, which would otherwise exhaust
  // Postgres connections within minutes.
  globalForDb.pool = created;
  return created;
}

// A Proxy keeps the `db.execute(...)` call sites unchanged while deferring pool
// creation to the first actual query.
export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop, receiver) {
    const instance = drizzle(getPool(), { schema });
    return Reflect.get(instance, prop, receiver);
  },
});

export { getPool };
export type Database = ReturnType<typeof drizzle<typeof schema>>;
