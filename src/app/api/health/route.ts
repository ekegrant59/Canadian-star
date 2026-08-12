import { sql } from 'drizzle-orm';
import { db } from '@/db';

/**
 * Health check for Coolify and uptime monitoring.
 *
 * Performs a real database round-trip: a health check that only proves the
 * Node process is alive will report healthy while every request 500s.
 *
 * Returns status only. No version strings, no environment detail, no error
 * messages: this endpoint is public and must not become a reconnaissance tool.
 */

// Route handlers are uncached by default under Cache Components, which is what
// a health check needs: it must hit the database on every call. The no-store
// header below makes that explicit to proxies and monitors.

export async function GET() {
  try {
    await db.execute(sql`SELECT 1`);

    return Response.json(
      { status: 'ok' },
      {
        status: 200,
        headers: { 'Cache-Control': 'no-store, max-age=0' },
      },
    );
  } catch (error) {
    // Log the detail server-side; return nothing useful to the caller.
    console.error('[health] database check failed', error);

    return Response.json(
      { status: 'error' },
      {
        status: 503,
        headers: { 'Cache-Control': 'no-store, max-age=0' },
      },
    );
  }
}
