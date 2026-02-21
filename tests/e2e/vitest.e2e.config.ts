import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

/**
 * Vitest config for Puppeteer E2E tests
 *
 * Runs browser tests against a live Next.js server.
 *
 * globalSetup: Logs in once, saves auth cookies → all test files reuse them.
 *
 * Usage:
 *   npm run test:e2e                   # local (localhost:3000)
 *   npm run test:e2e -- --mode preview # Vercel preview URL
 */
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    globals: true,
    reporters: ['verbose'],
    include: ['tests/e2e/**/*.e2e.ts'],
    exclude: ['node_modules', 'dist', '.next'],
    testTimeout: 60_000,
    hookTimeout: 60_000,
    // Login once before all test files, cleanup after
    globalSetup: ['tests/e2e/setup/global-setup.ts'],
    teardownTimeout: 10_000,
    // Sequential execution — E2E tests share browser state
    sequence: { concurrent: false },
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
  },
})
