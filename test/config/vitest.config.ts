import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['../../test/setup.ts'],
    globals: true,
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true
      }
    },
    include: [
      'test/**/*.test.{ts,tsx}',
      'app/**/*.test.{ts,tsx}',
      'components/**/*.test.{ts,tsx}',
      'lib/**/*.test.{ts,tsx}'
    ],
    exclude: [
      'node_modules',
      'dist',
      '.next',
      'coverage',
      'test/e2e/**'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'test/',
        '**/*.d.ts',
        '**/*.config.*',
        'components/ui/**', // Exclude shadcn/ui components from coverage
        'app/api/**', // Exclude API routes from coverage for now
        'lib/database.types.ts', // Exclude generated types
      ],
      thresholds: {
        global: {
          branches: 60,
          functions: 60,
          lines: 60,
          statements: 60
        }
      }
    },
    // Améliorer la stabilité des tests
    testTimeout: 10000,
    hookTimeout: 10000
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../../'),
      '@/components': path.resolve(__dirname, '../../components'),
      '@/lib': path.resolve(__dirname, '../../lib'),
      '@/app': path.resolve(__dirname, '../../app'),
      '@/hooks': path.resolve(__dirname, '../../hooks'),
      '@/contexts': path.resolve(__dirname, '../../contexts'),
      '@/test': path.resolve(__dirname, '../../test'),
    },
  },
})