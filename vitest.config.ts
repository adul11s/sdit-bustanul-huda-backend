import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    testTimeout: 30000,
    fileParallelism: false,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://chairunnisa@localhost:5432/qupi_sdit_test',
      AUTH_RATE_LIMIT_MAX: '2000',
    },
    include: ['tests/**/*.test.ts'],
  },
});
