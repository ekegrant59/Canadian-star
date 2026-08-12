/**
 * Production migration runner.
 *
 * Deliberately plain .mjs with no TypeScript and no dotenv: the runtime image
 * built by our Dockerfile contains only the Next standalone output, so `tsx`
 * and `dotenv` (both devDependencies) do not exist there. `src/db/migrate.ts`
 * is the local equivalent and needs both, which is why it cannot be the thing
 * that runs on deploy.
 *
 * Imports resolve from /app/migrate-deps/node_modules, installed by the
 * Dockerfile. They are NOT taken from .next/standalone/node_modules: the
 * standalone build traces only modules the app actually imports, and nothing
 * in the app imports drizzle-orm's migrator, so it is not there. Verified by
 * building and inspecting the traced output, not assumed.
 *
 * Environment comes from Coolify, already present in the container.
 *
 * Run from /app:  node scripts/migrate-prod.mjs
 */
import { createRequire } from 'node:module';

// Resolve against the dedicated migration dependency tree.
const require = createRequire('/app/migrate-deps/package.json');
const { drizzle } = require('drizzle-orm/node-postgres');
const { migrate } = require('drizzle-orm/node-postgres/migrator');
const pg = require('pg');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}

const pool = new pg.Pool({ connectionString, max: 1 });

try {
  console.log('Running migrations...');
  await migrate(drizzle(pool), { migrationsFolder: './drizzle' });
  console.log('Migrations complete.');
} catch (error) {
  console.error('Migration failed:', error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
