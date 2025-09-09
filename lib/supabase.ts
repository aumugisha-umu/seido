import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './database.types'

// Validate environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
  throw new Error('NEXT_PUBLIC_SUPABASE_URL is required')
}

if (!supabaseAnonKey) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable')
  throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is required')
}

console.log('🔧 Supabase SSR client initializing with:', {
  url: supabaseUrl,
  hasAnonKey: !!supabaseAnonKey,
  keyPrefix: supabaseAnonKey?.substring(0, 20) + '...'
})

// ✅ Configuration optimisée pour éviter les timeouts lors de la navigation
export const supabase = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'x-client-info': 'supabase-ssr-js/1.0.0'
    }
  },
  db: {
    schema: 'public'
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
})

// Utilité pour créer des requêtes avec retry automatique
export const withRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: Error

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error as Error
      console.log(`🔄 Retry attempt ${attempt}/${maxRetries} failed:`, error)

      if (attempt === maxRetries) {
        break
      }

      // Backoff exponentiel avec jitter
      const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000
      console.log(`⏳ Waiting ${Math.round(delay)}ms before retry...`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError!
}

// Re-export Database type for convenience
export type { Database } from './database.types'
