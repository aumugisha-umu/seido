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

// Fonction pour forcer la synchronisation des cookies en production
export const ensureAuthSync = async (): Promise<boolean> => {
  try {
    console.log('🔍 [AUTH-SYNC] Starting auth synchronization check...')
    
    // Vérifier que les cookies sont présents dans le navigateur
    const cookies = document.cookie
    console.log('🍪 [AUTH-SYNC] All cookies:', cookies.substring(0, 200) + (cookies.length > 200 ? '...' : ''))
    
    const hasSupabaseCookies = cookies.includes('sb-') && 
      (cookies.includes('session') || cookies.includes('auth') || cookies.includes('token'))
    
    console.log('🔍 [AUTH-SYNC] Cookie analysis:', {
      totalCookieLength: cookies.length,
      hasSupabasePrefix: cookies.includes('sb-'),
      hasSession: cookies.includes('session'),
      hasAuth: cookies.includes('auth'),
      hasToken: cookies.includes('token'),
      hasSupabaseCookies
    })
    
    if (!hasSupabaseCookies) {
      console.log('⚠️ [AUTH-SYNC] No Supabase cookies found in browser')
      return false
    }
    
    console.log('🔍 [AUTH-SYNC] Supabase cookies found, checking session...')
    
    // Attendre que la session soit complètement synchronisée
    const { data: { session }, error } = await supabase.auth.getSession()
    
    console.log('📊 [AUTH-SYNC] Session check result:', {
      hasError: !!error,
      errorMessage: error?.message,
      hasSession: !!session,
      hasUser: !!session?.user,
      userId: session?.user?.id
    })
    
    if (error) {
      console.log('⚠️ [AUTH-SYNC] Error getting session:', error.message)
      return false
    }
    
    if (!session || !session.user) {
      console.log('⚠️ [AUTH-SYNC] No valid session found')
      return false
    }
    
    console.log('✅ [AUTH-SYNC] Session and cookies synchronized successfully for user:', session.user.id)
    return true
  } catch (error) {
    console.error('❌ [AUTH-SYNC] Error syncing auth:', error)
    return false
  }
}

// Fonction pour effectuer une redirection sécurisée après authentification
export const safeAuthRedirect = async (redirectPath: string, maxRetries: number = 3): Promise<void> => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`🔄 [SAFE-REDIRECT] Attempt ${attempt}/${maxRetries} to sync auth before redirect`)
    
    const isSync = await ensureAuthSync()
    
    if (isSync) {
      console.log('✅ [SAFE-REDIRECT] Auth synchronized, proceeding with redirect')
      // Délai supplémentaire pour s'assurer que les cookies sont persistés
      await new Promise(resolve => setTimeout(resolve, 500))
      window.location.replace(redirectPath)
      return
    }
    
    if (attempt < maxRetries) {
      console.log(`⏳ [SAFE-REDIRECT] Auth not ready, waiting before retry...`)
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }
  
  console.log('⚠️ [SAFE-REDIRECT] Max retries reached, using hard refresh approach')
  // Approche alternative : hard refresh vers la destination
  window.location.href = redirectPath
}

// Alternative : redirection avec hard refresh immédiat (pour cas critiques)
export const hardAuthRedirect = async (redirectPath: string): Promise<void> => {
  console.log('💪 [HARD-REDIRECT] Using immediate hard redirect to force cookie sync')
  console.log('🌍 [HARD-REDIRECT] Current URL:', window.location.href)
  console.log('🎯 [HARD-REDIRECT] Target URL:', redirectPath)
  
  // Forcer un refresh immédiat vers la destination
  // Cela garantit que les cookies sont présents lors de la requête
  window.location.href = redirectPath
}

// Solution ultra-agressive : redirection sans attendre la sync (fallback final)
export const forceRedirect = (redirectPath: string): void => {
  console.log('🚨 [FORCE-REDIRECT] Using ultra-aggressive redirect - no auth sync check')
  console.log('🌍 [FORCE-REDIRECT] Current URL:', window.location.href)
  console.log('🎯 [FORCE-REDIRECT] Target URL:', redirectPath)
  console.log('⚡ [FORCE-REDIRECT] Executing immediate redirect...')
  
  // Immediate redirect without any checks
  window.location.replace(redirectPath)
}

// Re-export Database type for convenience
export type { Database } from './database.types'
