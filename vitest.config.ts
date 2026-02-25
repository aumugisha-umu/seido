import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    // Environment for Node.js services (not browser/DOM)
    environment: 'node',

    // Globals: describe, it, expect, vi, etc. (no imports needed)
    globals: true,

    // Reporter format for clarity
    reporters: ['verbose'],

    // Include test file patterns (unit tests only — E2E uses separate config)
    include: ['**/__tests__/**/*.test.ts', '**/*.test.ts', 'tests/unit/**/*.test.ts'],
    exclude: ['node_modules', 'dist', '.next', 'backups', 'tests/e2e/**'],

    // Setup files for test utilities
    setupFiles: [],

    // Timeout for async tests
    testTimeout: 10000,

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '.next/',
        'backups/',
        '**/__tests__/**'
      ]
    }
  }
})
