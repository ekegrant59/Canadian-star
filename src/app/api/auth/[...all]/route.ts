/**
 * Better Auth's catch-all HTTP surface.
 *
 * This exposes the plugin endpoints under /api/auth, including magic-link
 * request/verification, session reads, and TOTP setup/verification. Security
 * rules remain in the Better Auth configuration and server-side role guards.
 */
type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

async function handle(request: Request, method: Method): Promise<Response> {
  // Keep Better Auth (and its required runtime secrets) out of Next's build
  // phase. The auth instance is created only when an auth request arrives.
  const [{ toNextJsHandler }, { auth }] = await Promise.all([
    import('better-auth/next-js'),
    import('@/lib/auth'),
  ]);
  return toNextJsHandler(auth)[method](request);
}

export const GET = (request: Request) => handle(request, 'GET');
export const POST = (request: Request) => handle(request, 'POST');
export const PATCH = (request: Request) => handle(request, 'PATCH');
export const PUT = (request: Request) => handle(request, 'PUT');
export const DELETE = (request: Request) => handle(request, 'DELETE');
