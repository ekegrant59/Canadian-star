import { afterEach, describe, expect, it, vi } from 'vitest';
import { verifyTurnstile } from './turnstile';

describe('verifyTurnstile', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.TURNSTILE_SECRET_KEY;
    delete process.env.TURNSTILE_EXPECTED_HOSTNAME;
    vi.stubEnv('NODE_ENV', originalNodeEnv ?? 'test');
  });

  it('allows local development requests so LAN device previews are not blocked', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    process.env.TURNSTILE_SECRET_KEY = 'secret';
    await expect(verifyTurnstile(undefined, '192.168.1.4', { action: 'vote' })).resolves.toBe(true);
  });

  it('fails closed when the provider is configured but unavailable', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    process.env.TURNSTILE_SECRET_KEY = 'secret';
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    await expect(verifyTurnstile('token', '127.0.0.1', { action: 'vote' })).resolves.toBe(false);
  });

  it('requires the expected action and hostname', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    process.env.TURNSTILE_SECRET_KEY = 'secret';
    process.env.TURNSTILE_EXPECTED_HOSTNAME = 'example.test';
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({ success: true, action: 'login', hostname: 'example.test' }),
            { status: 200 },
          ),
        ),
    );
    await expect(verifyTurnstile('token', '127.0.0.1', { action: 'vote' })).resolves.toBe(false);
  });

  it('rejects a successful response that omits the configured hostname', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    process.env.TURNSTILE_SECRET_KEY = 'secret';
    process.env.TURNSTILE_EXPECTED_HOSTNAME = 'example.test';
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ success: true, action: 'vote' }), { status: 200 }),
        ),
    );
    await expect(verifyTurnstile('token', '127.0.0.1', { action: 'vote' })).resolves.toBe(false);
  });
});
