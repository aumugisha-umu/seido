import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

/**
 * Vitest config for integration tests
 *
 * Integration tests hit the real Supabase database (staging) via service role.
 * They test server actions, services, and repositories with real DB operations.
 *
 * Usage:
 *   npm run test:integration
 */
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    globals: true,
    reporters: ['verbose'],
    include: ['tests/integration/**/*.test.ts'],
    exclude: ['node_modules', 'dist', '.next'],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    // Load .env.local for Supabase credentials
    env: {
      NODE_ENV: 'test',
    },
    // Sequential to avoid race conditions on shared DB
    sequence: { concurrent: false },
  },
})
