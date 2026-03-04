'use server'

/**
 * Lot Server Actions
 * Server-side operations for lot management with proper auth context
 *
 * ✅ REFACTORED (Jan 2026): Uses centralized getServerActionAuthContextOrNull()
 *    instead of inline auth with getSession() + .single() bugs
 */

import { createServerActionLotService } from '@/lib/services'
import { getServerActionAuthContextOrNull } from '@/lib/server-context'
// Pages are force-dynamic — no cache invalidation needed
import type { Lot } from '@/lib/services/core/service-types'
import { logger } from '@/lib/logger'

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

    // ✅ REFACTORED: Use centralized auth context (fixes .single() bug for multi-profile users)
    const authContext = await getServerActionAuthContextOrNull()
    if (!authContext) {
      logger.error('❌ [AUTH-ERROR] No auth session found in Server Action!')
      return {
        success: false,
        error: 'Authentication required: No session found in Server Action'
      }
    }

    const { profile: userData, supabase: debugSupabase, user: authUser } = authContext

    logger.info('🔍 [DEBUG] Server Action Auth Check:', {
      hasSession: true,
      userId: authUser.id,
      databaseUserId: userData.id,
      lotId: data.lotId,
      timestamp: new Date().toISOString()
    })

    // Vérifier que l'utilisateur a accès au lot
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

    // RLS enforces team access via is_team_manager(get_lot_team_id(id)) on lots_update policy

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
