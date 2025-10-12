'use server'

/**
 * Building Server Actions
 * Server-side operations for building management with proper auth context
 */

import { createServerActionCompositeService, createServerActionSupabaseClient } from '@/lib/services'
import { revalidatePath } from 'next/cache'
import type { CreateCompletePropertyData, CompositeOperationResult } from '@/lib/services/domain/composite.service'
import type { Building, Lot } from '@/lib/services/core/service-types'
import { logger } from '@/lib/logger'

/**
 * Create a complete property with building, lots, and contact assignments
 *
 * ✅ Server Action with authenticated Supabase server client
 * ✅ auth.uid() correctly populated for RLS policies
 * ✅ Proper session management via server-side cookies
 */
export async function createCompleteProperty(
  data: CreateCompletePropertyData
): Promise<CompositeOperationResult<{
  building: Building
  lots: Lot[]
}>> {
  try {
    logger.info('🏢 [SERVER-ACTION] Creating complete property:', {
      buildingName: data.building.name,
      lotsCount: data.lots.length,
      contactsCount: data.contacts.length,
      teamId: data.building.team_id
    })

    // 🔍 DEBUG: Vérifier la session d'authentification AVANT de créer le service
    const debugSupabase = await createServerActionSupabaseClient()
    const { data: { session }, error: sessionError } = await debugSupabase.auth.getSession()

    logger.info('🔍 [DEBUG] Server Action Auth Check:', {
      hasSession: !!session,
      sessionError: sessionError?.message,
      userId: session?.user?.id,
      userEmail: session?.user?.email,
      teamId: data.building.team_id,
      timestamp: new Date().toISOString()
    })

    if (!session) {
      logger.error('❌ [AUTH-ERROR] No auth session found in Server Action!')
      return {
        success: false,
        data: {
          building: {} as Building,
          lots: []
        },
        error: 'Authentication required: No session found in Server Action',
        operations: []
      }
    }

    // 🔍 DEBUG: Récupérer le database user ID depuis auth_user_id
    // ⚠️ CRITICAL: team_members.user_id references users.id, NOT users.auth_user_id!
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
        data: {
          building: {} as Building,
          lots: []
        },
        error: 'User profile not found in database',
        operations: []
      }
    }

    // 🔍 DEBUG: Vérifier si l'utilisateur a des team_members
    const { data: teamMembersCheck, error: teamCheckError } = await debugSupabase
      .from('team_members')
      .select('id, team_id, role, left_at')
      .eq('user_id', userData.id)  // ✅ FIX: Use database user ID, not auth user ID
      .eq('team_id', data.building.team_id)
      .is('left_at', null)
      .maybeSingle()

    logger.info('🔍 [DEBUG] Team Membership Check:', {
      authUserId: session.user.id,        // Auth ID (for reference)
      databaseUserId: userData.id,        // Database ID (used in query)
      teamId: data.building.team_id,
      hasTeamMembership: !!teamMembersCheck,
      membershipRole: teamMembersCheck?.role,
      teamCheckError: teamCheckError?.message
    })

    if (!teamMembersCheck) {
      logger.error('❌ [AUTH-ERROR] User is not a member of this team!')
      return {
        success: false,
        data: {
          building: {} as Building,
          lots: []
        },
        error: `User ${session.user.email} is not a member of team ${data.building.team_id}`,
        operations: []
      }
    }

    // ✅ Create server action composite service with authenticated Supabase client
    // ✅ Uses createServerActionSupabaseClient() which can MODIFY COOKIES
    // ✅ This maintains auth session, ensuring auth.uid() is available for RLS policies
    const compositeService = await createServerActionCompositeService()

    // Execute property creation
    const result = await compositeService.createCompleteProperty(data)

    if (result.success) {
      logger.info('✅ [SERVER-ACTION] Property created successfully:', {
        buildingId: result.data.building.id,
        buildingName: result.data.building.name,
        lotsCreated: result.data.lots.length
      })

      // Revalidate the buildings page to show the new building
      revalidatePath('/gestionnaire/biens')
      revalidatePath('/gestionnaire/biens/immeubles')
    } else {
      logger.error('❌ [SERVER-ACTION] Property creation failed:', result.error)
    }

    return result

  } catch (error) {
    logger.error('❌ [SERVER-ACTION] Unexpected error creating property:', error)

    return {
      success: false,
      data: {
        building: {} as Building,
        lots: []
      },
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      operations: []
    }
  }
}
