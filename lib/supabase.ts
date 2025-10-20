/**
 * Supabase Client Compatibility Layer
 *
 * This file provides backward compatibility for components that still import
 * from '@/lib/supabase' while the new architecture uses '@/lib/services'
 *
 * This allows existing imports to continue working during the migration period.
 */

import { createBrowserSupabaseClient, createServerSupabaseClient, withRetry } from '@/lib/services'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

// Re-export the browser client as the default client for client-side usage
export const supabase = createBrowserSupabaseClient()

// Re-export client creation functions for explicit usage
export { createBrowserSupabaseClient, createServerSupabaseClient }

// Re-export utility functions
export { withRetry }

// Re-export types for compatibility
export type { SupabaseClient, Database }

// Default export for components that import supabase directly
export default supabase
