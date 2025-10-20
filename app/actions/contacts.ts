/**
 * Server Actions for Contact Operations
 * ✅ Executes server-side for faster RLS evaluation
 * ✅ Optimized queries with minimal column selection
 * ✅ Proper error handling
 */

'use server'

import { createServerActionSupabaseClient } from '@/lib/services/core/supabase-client'
import { logger } from '@/lib/logger'

/**
 * Get team contacts - Server Action (optimized)
 *
 * Benefits over client-side fetching:
 * - RLS evaluated server-side (much faster)
 * - Only selects essential columns (7 vs 14)
 * - No browser → Supabase latency
 * - Better caching with SWR
 *
 * @param teamId - Team ID to fetch contacts for
 * @returns Array of contacts with essential fields only
 */
export async function getTeamContactsAction(teamId: string) {
  try {
    logger.info('[SERVER-ACTION] getTeamContactsAction called for team:', teamId)
    const startTime = Date.now()

    // Create server-side Supabase client (faster RLS evaluation)
    const supabase = await createServerActionSupabaseClient()

    // Optimized query: only essential columns (7 vs 14)
    const { data, error } = await supabase
      .from('team_members')
      .select(`
        user:user_id (
          id,
          name,
          email,
          phone,
          role,
          provider_category,
          speciality
        )
      `)
      .eq('team_id', teamId)
      .is('left_at', null)  // Only active members
      .order('joined_at', { ascending: false })

    if (error) {
      logger.error('[SERVER-ACTION] Error fetching team contacts:', error)
      throw new Error(`Failed to fetch team contacts: ${error.message}`)
    }

    // Extract users and filter out nulls
    const contacts = data?.map(tm => tm.user).filter(Boolean) || []

    const loadTime = Date.now() - startTime
    logger.info(`[SERVER-ACTION] Fetched ${contacts.length} contacts in ${loadTime}ms`)

    return {
      success: true as const,
      data: contacts,
      loadTime
    }
  } catch (error) {
    logger.error('[SERVER-ACTION] Exception in getTeamContactsAction:', error)
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'Unknown error',
      data: []
    }
  }
}

/**
 * Get team contacts filtered by role - Server Action
 *
 * @param teamId - Team ID
 * @param role - User role to filter by (optional)
 * @returns Filtered contacts
 */
export async function getTeamContactsByRoleAction(teamId: string, role?: string) {
  try {
    logger.info(`[SERVER-ACTION] getTeamContactsByRoleAction called for team: ${teamId}, role: ${role || 'all'}`)

    const supabase = await createServerActionSupabaseClient()

    // Build query with optional role filter
    let query = supabase
      .from('team_members')
      .select(`
        user:user_id (
          id,
          name,
          email,
          phone,
          role,
          provider_category,
          speciality
        )
      `)
      .eq('team_id', teamId)
      .is('left_at', null)

    // Apply role filter if specified
    if (role) {
      query = query.filter('user.role', 'eq', role)
    }

    const { data, error } = await query.order('joined_at', { ascending: false })

    if (error) {
      logger.error('[SERVER-ACTION] Error fetching filtered contacts:', error)
      throw new Error(`Failed to fetch filtered contacts: ${error.message}`)
    }

    const contacts = data?.map(tm => tm.user).filter(Boolean) || []
    logger.info(`[SERVER-ACTION] Fetched ${contacts.length} ${role || 'all'} contacts`)

    return {
      success: true as const,
      data: contacts
    }
  } catch (error) {
    logger.error('[SERVER-ACTION] Exception in getTeamContactsByRoleAction:', error)
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'Unknown error',
      data: []
    }
  }
}
