'use server'

/**
 * Lot Server Actions
 * Server-side operations for lot management with proper auth context
 */

import { createServerActionSupabaseClient, createServerActionLotService } from '@/lib/services'
import { revalidatePath } from 'next/cache'
import type { Lot } from '@/lib/services/core/service-types'
import { logger } from '@/lib/logger'
import { cache } from '@/lib/cache/cache-manager'

/**
 * Update a complete lot with contacts and managers
 *
 * ✅ Server Action with authenticated Supabase server client
 * ✅ auth.uid() correctly populated for RLS policies
 * ✅ Proper session management via server-side cookies
 */
export async function updateCompleteLot(data: {
  lotId: string
  lot: Partial<Lot>
  contacts: Array<{
    contactId: string
    contactType: string
    isPrimary: boolean
  }>
}): Promise<{
  success: boolean
  data?: { lot: Lot }
  error?: string
}> {
  try {
    logger.info('🏠 [SERVER-ACTION] Updating complete lot:', {
      lotId: data.lotId,
      lotReference: data.lot.reference,
      contactsCount: data.contacts.length
    })

    // 🔍 DEBUG: Vérifier la session d'authentification
    const debugSupabase = await createServerActionSupabaseClient()
    const { data: { session }, error: sessionError } = await debugSupabase.auth.getSession()

    logger.info('🔍 [DEBUG] Server Action Auth Check:', {
      hasSession: !!session,
      sessionError: sessionError?.message,
      userId: session?.user?.id,
      userEmail: session?.user?.email,
      lotId: data.lotId,
      timestamp: new Date().toISOString()
    })

    if (!session) {
      logger.error('❌ [AUTH-ERROR] No auth session found in Server Action!')
      return {
        success: false,
        error: 'Authentication required: No session found in Server Action'
      }
    }

    // 🔍 DEBUG: Récupérer le database user ID depuis auth_user_id
    const { data: userData, error: userError } = await debugSupabase
      .from('users')
      .select('id')
      .eq('auth_user_id', session.user.id)
      .single()

    logger.info('🔍 [DEBUG] User ID Resolution:', {
      authUserId: session.user.id,
      databaseUserId: userData?.id,
      userError: userError?.message
    })

    if (!userData) {
      logger.error('❌ [AUTH-ERROR] User profile not found in database!')
      return {
        success: false,
        error: 'User profile not found in database'
      }
    }

    // 🔍 DEBUG: Vérifier que l'utilisateur a accès au lot
    const { data: lotData, error: lotError } = await debugSupabase
      .from('lots')
      .select('id, team_id, reference')
      .eq('id', data.lotId)
      .single()

    logger.info('🔍 [DEBUG] Lot Access Check:', {
      lotId: data.lotId,
      lotFound: !!lotData,
      teamId: lotData?.team_id,
      lotError: lotError?.message
    })

    if (!lotData || lotError) {
      logger.error('❌ [ERROR] Lot not found:', data.lotId)
      return {
        success: false,
        error: 'Lot not found'
      }
    }

    // 🔍 DEBUG: Vérifier si l'utilisateur est membre de l'équipe du lot
    const { data: teamMembersCheck, error: teamCheckError } = await debugSupabase
      .from('team_members')
      .select('id, team_id, role, left_at')
      .eq('user_id', userData.id)
      .eq('team_id', lotData.team_id)
      .is('left_at', null)
      .maybeSingle()

    logger.info('🔍 [DEBUG] Team Membership Check:', {
      authUserId: session.user.id,
      databaseUserId: userData.id,
      teamId: lotData.team_id,
      hasTeamMembership: !!teamMembersCheck,
      membershipRole: teamMembersCheck?.role,
      teamCheckError: teamCheckError?.message
    })

    if (!teamMembersCheck) {
      logger.error('❌ [AUTH-ERROR] User is not a member of this team!')
      return {
        success: false,
        error: `User ${session.user.email} is not a member of team ${lotData.team_id}`
      }
    }

    // ✅ Create server action lot service with authenticated Supabase client
    const lotService = await createServerActionLotService()

    // Step 1: Update lot details
    logger.info('📝 [LOT-UPDATE] Updating lot details...')
    const updateResult = await lotService.update(data.lotId, data.lot)

    if (!updateResult.success) {
      logger.error('❌ [LOT-UPDATE] Failed to update lot:', updateResult.error)
      return {
        success: false,
        error: updateResult.error || 'Failed to update lot'
      }
    }

    logger.info('✅ [LOT-UPDATE] Lot details updated successfully')

    // Step 2: Replace lot_contacts
    logger.info('👥 [LOT-UPDATE] Replacing lot contacts...')

    // Delete all existing lot_contacts
    const { error: deleteError } = await debugSupabase
      .from('lot_contacts')
      .delete()
      .eq('lot_id', data.lotId)

    if (deleteError) {
      logger.error('❌ [LOT-UPDATE] Failed to delete old contacts:', deleteError)
      return {
        success: false,
        error: 'Failed to delete old contacts'
      }
    }

    logger.info('🗑️ [LOT-UPDATE] Old contacts deleted')

    // Insert new lot_contacts (bulk insert)
    if (data.contacts.length > 0) {
      const contactsToInsert = data.contacts.map(contact => ({
        lot_id: data.lotId,
        user_id: contact.contactId,
        is_primary: contact.isPrimary
      }))

      const { error: insertError } = await debugSupabase
        .from('lot_contacts')
        .insert(contactsToInsert)

      if (insertError) {
        logger.error('❌ [LOT-UPDATE] Failed to insert new contacts:', insertError)
        return {
          success: false,
          error: 'Failed to insert new contacts'
        }
      }

      logger.info('✅ [LOT-UPDATE] New contacts inserted:', data.contacts.length)
    }

    // Step 3: Invalidate caches
    logger.info('🗑️ [LOT-UPDATE] Invalidating caches...')

    // Invalidate CacheManager (L1+L2)
    await cache.invalidate(`lots:${data.lotId}:full-relations`)
    await cache.invalidate(`lots:${data.lotId}`)

    // Invalidate team-level cache
    if (lotData.team_id) {
      await cache.invalidate(`lots:team:${lotData.team_id}`)
    }

    logger.info('✅ [LOT-UPDATE] Caches invalidated')

    // Step 4: Revalidate Next.js paths
    revalidatePath('/gestionnaire/biens/lots')
    revalidatePath(`/gestionnaire/biens/lots/${data.lotId}`)
    revalidatePath(`/gestionnaire/biens/lots/modifier/${data.lotId}`)

    logger.info('✅ [SERVER-ACTION] Lot updated successfully:', {
      lotId: data.lotId,
      reference: updateResult.data?.reference,
      contactsCount: data.contacts.length
    })

    return {
      success: true,
      data: {
        lot: updateResult.data as Lot
      }
    }

  } catch (error) {
    logger.error('❌ [SERVER-ACTION] Unexpected error updating lot:', error)

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}
