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

    // Parallel fetch: contacts + invitations
    const [contactsResult, invitationsResult] = await Promise.all([
      // Contacts query
      supabase
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
            auth_user_id,
            company:company_id (
              id,
              name,
              vat_number
            )
          )
        `)
        .eq('team_id', teamId)
        .is('left_at', null)  // Only active members
        .order('joined_at', { ascending: false }),

      // Invitations query
      supabase
        .from('user_invitations')
        .select('email, status, expires_at')
        .eq('team_id', teamId)
        .in('status', ['pending', 'expired', 'cancelled'])
    ])

    if (contactsResult.error) {
      logger.error('[SERVER-ACTION] Error fetching team contacts:', contactsResult.error)
      throw new Error(`Failed to fetch team contacts: ${contactsResult.error.message}`)
    }

    // Build invitation status map by email
    const invitationStatusMap: Record<string, string> = {}
    const now = new Date()

    if (!invitationsResult.error && invitationsResult.data) {
      for (const invitation of invitationsResult.data) {
        if (invitation.email) {
          const emailLower = invitation.email.toLowerCase()
          // Check if pending invitation is expired
          if (invitation.status === 'pending' && invitation.expires_at) {
            const expiresAt = new Date(invitation.expires_at)
            invitationStatusMap[emailLower] = now > expiresAt ? 'expired' : 'pending'
          } else {
            invitationStatusMap[emailLower] = invitation.status || 'pending'
          }
        }
      }
    }

    // Extract users, filter nulls, and add invitationStatus
    const contacts = (contactsResult.data?.map(tm => tm.user).filter(Boolean) || []).map((contact: any) => {
      const emailLower = contact.email?.toLowerCase()
      let invitationStatus: string | null = null

      // If contact has auth_user_id, they have an active account
      if (contact.auth_user_id) {
        invitationStatus = 'accepted'
      } else if (emailLower && invitationStatusMap[emailLower]) {
        invitationStatus = invitationStatusMap[emailLower]
      }

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
