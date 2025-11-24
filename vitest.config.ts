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

    // Include test file patterns
    include: ['**/__tests__/**/*.test.ts', '**/*.test.ts'],
    exclude: ['node_modules', 'dist', '.next', 'backups'],

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
