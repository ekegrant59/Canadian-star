/**
 * No-op stand-in for the `server-only` package under Vitest.
 *
 * The real package throws when imported outside a Server Component. That guard
 * still applies to `next build`, which resolves the real package: a stray
 * client import of a server module still fails the build. This stub only
 * affects the test runner, where the guard would otherwise make every
 * server-side module impossible to unit test.
 *
 * Wired up in vitest.config.ts via resolve.alias.
 */
export {};
