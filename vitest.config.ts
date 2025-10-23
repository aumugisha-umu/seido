/**
 * Vitest Configuration - Next.js 15 App Router
 * Configuration suivant les recommandations officielles Next.js
 * @see https://nextjs.org/docs/app/building-your-application/testing/vitest
 */
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    // Environnement jsdom pour simuler le navigateur
    environment: 'jsdom',

    // Charger les variables d'environnement depuis .env.test
    env: {
      NEXT_PUBLIC_SUPABASE_URL: 'https://test-placeholder.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-placeholder-anon-key-12345',
      SUPABASE_SERVICE_ROLE_KEY: 'test-placeholder-service-key-12345',
      NEXT_PUBLIC_SITE_URL: 'http://localhost:3000',
      LOG_LEVEL: 'error',
    },

    // Setup global (mocks, cleanup, etc.)
    setupFiles: ['./__tests__/setup.ts'],

    // Globals activés pour éviter d'importer describe, it, expect
    globals: true,

    // Inclure les tests dans ces patterns
    include: [
      '__tests__/**/*.test.{ts,tsx}',
      'lib/**/*.test.{ts,tsx}',
      'components/**/*.test.{ts,tsx}',
      'app/**/*.test.{ts,tsx}',
      'hooks/**/*.test.{ts,tsx}',
    ],

    // Exclure
    exclude: [
      'node_modules',
      'dist',
      '.next',
      'coverage',
      'e2e/**',
      'backups/**',
      '**/*.d.ts',
      '**/*.config.*',
    ],

    // Configuration de couverture
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        '__tests__/**',
        'e2e/**',
        '**/*.d.ts',
        '**/*.config.*',
        'components/ui/**', // shadcn/ui components
        'lib/database.types.ts', // Types générés
        '.next/**',
        'backups/**',
      ],
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70,
        },
      },
    },

    // Timeouts
    testTimeout: 10000,
    hookTimeout: 10000,

    // Pool de threads pour isolation
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true, // Évite les race conditions
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      '@/components': path.resolve(__dirname, './components'),
      '@/lib': path.resolve(__dirname, './lib'),
      '@/app': path.resolve(__dirname, './app'),
      '@/hooks': path.resolve(__dirname, './hooks'),
      '@/contexts': path.resolve(__dirname, './contexts'),
    },
  },
})
