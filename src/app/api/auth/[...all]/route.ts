/**
 * Better Auth's catch-all HTTP surface.
 *
 * This exposes Better Auth endpoints for password sessions and TOTP. Security
 * rules remain in the Better Auth configuration and server-side role guards.
 */
type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

async function handle(request: Request, method: Method): Promise<Response> {
  // Artist registration is intentionally mediated by the custom OTP action.
  // Keep Better Auth's internal signUpEmail API available to that action, but
  // reject direct browser/API calls to the public endpoint so email ownership
  // cannot be bypassed.
  if (method === 'POST' && new URL(request.url).pathname.endsWith('/sign-up/email')) {
    return Response.json({ message: 'Use the email verification sign-up flow.' }, { status: 403 });
  }
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
