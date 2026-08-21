import 'server-only';

import { randomUUID } from 'node:crypto';

export async function verifyTurnstile(
  token: string | undefined,
  remoteIp: string,
  options: { idempotencyKey?: string; action?: string } = {},
) {
  // Cloudflare does not reliably allow widgets served from private LAN IPs
  // (for example, an iPhone opening 192.168.x.x). Local development already
  // has no public trust boundary, so do not make a configured production key
  // break voting previews on another device. Production always verifies.
  if (process.env.NODE_ENV !== 'production') return true;

  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return false;
  if (!token) return false;

  const expectedAction = options.action ?? 'vote';
  const expectedHostname =
    process.env.TURNSTILE_EXPECTED_HOSTNAME ??
    (process.env.NEXT_PUBLIC_APP_URL
      ? new URL(process.env.NEXT_PUBLIC_APP_URL).hostname
      : undefined);
  const body = new URLSearchParams({
    secret,
    response: token,
    remoteip: remoteIp,
    idempotency_key: options.idempotencyKey ?? randomUUID(),
  });
  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body,
      cache: 'no-store',
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) return false;
    const result = (await response.json()) as {
      success?: boolean;
      action?: string;
      hostname?: string;
    };
    if (!result.success) return false;
    if (result.action !== expectedAction) return false;
    if (expectedHostname && result.hostname !== expectedHostname) return false;
    return true;
  } catch {
    // A bot-defense provider outage must fail closed without throwing an
    // unhandled Server Action error to the voter.
    return false;
  }
}
