import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    testTimeout: 30000,
    fileParallelism: false,
    env: {
      NODE_ENV: 'test',
      // Prefer CI/provided DATABASE_URL; fall back to local dev database (peer auth).
      DATABASE_URL: process.env.DATABASE_URL ?? 'postgresql://chairunnisa@localhost:5432/qupi_sdit_test',
      AUTH_RATE_LIMIT_MAX: '2000',
    },
    include: ['tests/**/*.test.ts'],
  },
});
