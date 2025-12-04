/**
 * API Service Role Helper
 *
 * Centralizes service role client creation for API routes.
 * Use when RLS bypass is needed (admin operations like invitations, user creation).
 *
 * Usage:
 * ```typescript
 * import { getServiceRoleClient } from '@/lib/api-service-role-helper'
 *
 * export async function POST(request: Request) {
 *   const supabaseAdmin = getServiceRoleClient()
 *   // Use supabaseAdmin for operations that bypass RLS
 * }
 * ```
 */

import { createServiceRoleSupabaseClient } from '@/lib/services/core/supabase-client'
import { logger } from '@/lib/logger'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

/**
 * Get Service Role Supabase client for API routes
 *
 * This client bypasses RLS policies - use only for admin operations:
 * - User invitations and account creation
 * - System-level data access
 * - Operations that need to access data across teams
 *
 * @throws Error if SUPABASE_SERVICE_ROLE_KEY is not configured
 * @returns Supabase client with service role privileges
 */
export function getServiceRoleClient(): SupabaseClient<Database> {
  const client = createServiceRoleSupabaseClient()

  if (!client) {
    logger.error(
      { component: 'api-service-role-helper' },
      'SUPABASE_SERVICE_ROLE_KEY is not configured. Service role operations will fail.'
    )
    throw new Error(
      'Service role client not available. Check SUPABASE_SERVICE_ROLE_KEY configuration.'
    )
  }

  return client
}

/**
 * Check if service role client is available
 * Useful for graceful degradation or feature flags
 */
export function isServiceRoleAvailable(): boolean {
  return !!process.env.SUPABASE_SERVICE_ROLE_KEY
}

/**
 * Result type for operations requiring service role
 */
export type ServiceRoleResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; status: number }

/**
 * Helper to create a service role error response
 */
export function serviceRoleError(
  error: string,
  status: number = 500
): ServiceRoleResult<never> {
  return { success: false, error, status }
}

/**
 * Helper to create a service role success response
 */
export function serviceRoleSuccess<T>(data: T): ServiceRoleResult<T> {
  return { success: true, data }
}
