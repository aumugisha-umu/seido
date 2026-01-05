/**
 * Server Actions for Contact Operations
 * ✅ Executes server-side for faster RLS evaluation
 * ✅ Optimized queries with minimal column selection
 * ✅ Proper error handling
 */

'use server'

import { createServerActionSupabaseClient } from '@/lib/services/core/supabase-client'
import { logger } from '@/lib/logger'
import { buildInvitationStatusMap } from '@/lib/utils/invitation-status'

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

    // Parallel fetch: contacts + invitations
    const [contactsResult, invitationsResult] = await Promise.all([
      // Contacts query - utilise users directement (comme la page Contacts)
      // Cela garantit que les emails matchent avec les invitations
      supabase
        .from('users')
        .select(`
          id,
          name,
          email,
          phone,
          role,
          provider_category,
          speciality,
          is_company,
          company_id,
          auth_user_id,
          company:company_id (
            id,
            name,
            vat_number
          )
        `)
        .eq('team_id', teamId)
        .eq('is_active', true)
        .order('created_at', { ascending: false }),

      // Invitations query - récupérer TOUTES les invitations pour mapper le statut complet
      // Note: Contacts page only fetches pending, but we fetch all to match the mapping logic
      supabase
        .from('user_invitations')
        .select('email, status, expires_at, created_at')
        .eq('team_id', teamId)
        .order('created_at', { ascending: false })
    ])

    if (contactsResult.error) {
      logger.error('[SERVER-ACTION] Error fetching team contacts:', contactsResult.error)
      throw new Error(`Failed to fetch team contacts: ${contactsResult.error.message}`)
    }

    // ✅ Build invitation status map using unified utility
    // This function checks expires_at for pending invitations and returns 'expired' if needed
    // Source of truth: user_invitations table only (no auth_user_id fallback)
    const invitationStatusMap = !invitationsResult.error && invitationsResult.data
      ? buildInvitationStatusMap(invitationsResult.data)
      : {}

    // Add invitationStatus to each contact
    // Source of truth: user_invitations table only
    const contacts = (contactsResult.data || []).map((contact: any) => {
      const emailLower = contact.email?.toLowerCase()
      const invitationStatus = emailLower ? invitationStatusMap[emailLower] || null : null

      return {
        ...contact,
        invitationStatus
      }
    })

    const loadTime = Date.now() - startTime
    logger.info(`[SERVER-ACTION] Fetched ${contacts.length} contacts with invitation status in ${loadTime}ms`)

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
          speciality,
          is_company,
          company_id,
          company:company_id (
            id,
            name,
            vat_number
          )
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
