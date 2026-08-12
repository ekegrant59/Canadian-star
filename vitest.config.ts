import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),

      /**
       * `server-only` throws on import outside a Server Component, which is
       * exactly its job in the build and exactly what makes server modules
       * untestable under Vitest. Aliasing it to an empty module keeps the
       * real guarantee (Next still resolves the real package at build time,
       * so a stray client import still fails the build) while letting unit
       * tests import server modules directly.
       */
      'server-only': fileURLToPath(new URL('./src/test/server-only-stub.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
