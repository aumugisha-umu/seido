'use server'

/**
 * Building Server Actions
 * Server-side operations for building management with proper auth context
 */

import { createServerActionCompositeService, createServerActionSupabaseClient, createServerActionBuildingService } from '@/lib/services'
import { revalidatePath, revalidateTag } from 'next/cache'
import { redirect } from 'next/navigation'
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
      buildingContactsCount: data.buildingContacts?.length || 0,
      teamId: data.building.team_id
    })

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

      // ✅ Revalidate using both tags and paths for guaranteed cache invalidation
      revalidateTag('buildings')
      revalidateTag(`buildings-team-${data.building.team_id}`)
      revalidateTag('lots')
      revalidateTag(`lots-team-${data.building.team_id}`)
      revalidatePath('/gestionnaire/biens')
      revalidatePath('/gestionnaire/biens/immeubles')

      // ✅ Redirection server-side (pattern Next.js 15)
      // redirect() throws NEXT_REDIRECT - intercepté par le catch ci-dessous
      redirect('/gestionnaire/biens')
    }

    // Retourner le résultat seulement si échec (pour afficher l'erreur côté client)
    logger.error('❌ [SERVER-ACTION] Property creation failed:', result.error)
    return result

  } catch (error) {
    // ✅ redirect() throws NEXT_REDIRECT - propager normalement pour que Next.js gère la navigation
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
      throw error
    }

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

/**
 * Update a complete property with differential updates for lots and contacts
 *
 * ✅ Server Action with authenticated Supabase server client
 * ✅ Handles new lots, updated lots, and deleted lots
 * ✅ Updates building_contacts and lot_contacts
 */
export async function updateCompleteProperty(data: {
  buildingId: string
  building: Partial<Building>
  lots: {
    new: Partial<Lot>[]
    updated: Array<Partial<Lot> & { id: string }>
    deleted: string[]
  }
  buildingContacts?: Array<{ id: string; type: string; isPrimary: boolean }>
  lotContactAssignments?: Array<{
    lotId: string
    assignments: Array<{
      contactId: string
      contactType: string
      isPrimary: boolean
      isLotPrincipal?: boolean
    }>
  }>
}): Promise<CompositeOperationResult<{
  building: Building
  lots: Lot[]
}>> {
  try {
    logger.info('🏢 [SERVER-ACTION] Updating complete property:', {
      buildingId: data.buildingId,
      buildingName: data.building.name,
      newLotsCount: data.lots.new.length,
      updatedLotsCount: data.lots.updated.length,
      deletedLotsCount: data.lots.deleted.length,
      buildingContactsCount: data.buildingContacts?.length || 0
    })

    // Verify auth session
    const debugSupabase = await createServerActionSupabaseClient()
    const { data: { session }, error: sessionError } = await debugSupabase.auth.getSession()

    logger.info('🔍 [DEBUG] Server Action Auth Check (Update):', {
      hasSession: !!session,
      sessionError: sessionError?.message,
      userId: session?.user?.id,
      userEmail: session?.user?.email,
      buildingId: data.buildingId,
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

    // Get database user ID
    const { data: userData, error: userError } = await debugSupabase
      .from('users')
      .select('id')
      .eq('auth_user_id', session.user.id)
      .single()

    logger.info('🔍 [DEBUG] User ID Resolution (Update):', {
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

    // Verify building exists and get its team_id
    const { data: existingBuilding, error: buildingError } = await debugSupabase
      .from('buildings')
      .select('id, team_id')
      .eq('id', data.buildingId)
      .single()

    if (!existingBuilding || buildingError) {
      logger.error('❌ [ERROR] Building not found:', data.buildingId)
      return {
        success: false,
        data: {
          building: {} as Building,
          lots: []
        },
        error: 'Building not found',
        operations: []
      }
    }

    // Verify user is a member of the building's team
    const { data: teamMembersCheck, error: teamCheckError } = await debugSupabase
      .from('team_members')
      .select('id, team_id, role, left_at')
      .eq('user_id', userData.id)
      .eq('team_id', existingBuilding.team_id)
      .is('left_at', null)
      .maybeSingle()

    logger.info('🔍 [DEBUG] Team Membership Check (Update):', {
      authUserId: session.user.id,
      databaseUserId: userData.id,
      teamId: existingBuilding.team_id,
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
        error: `User ${session.user.email} is not a member of team ${existingBuilding.team_id}`,
        operations: []
      }
    }

    // Create server action composite service
    const compositeService = await createServerActionCompositeService()

    // Execute property update
    const result = await compositeService.updateCompleteProperty({
      buildingId: data.buildingId,
      building: data.building,
      lots: data.lots,
      buildingContacts: data.buildingContacts,
      lotContactAssignments: data.lotContactAssignments
    })

    if (result.success) {
      logger.info('✅ [SERVER-ACTION] Property updated successfully:', {
        buildingId: result.data.building.id,
        buildingName: result.data.building.name,
        lotsCount: result.data.lots.length
      })

      // ✅ Revalidate using both tags and paths for guaranteed cache invalidation
      revalidateTag('buildings')
      revalidateTag(`buildings-team-${existingBuilding.team_id}`)
      revalidateTag(`building-${data.buildingId}`)
      revalidateTag('lots')
      revalidateTag(`lots-team-${existingBuilding.team_id}`)
      revalidatePath('/gestionnaire/biens')
      revalidatePath('/gestionnaire/biens/immeubles')
      revalidatePath(`/gestionnaire/biens/immeubles/${data.buildingId}`)
      revalidatePath(`/gestionnaire/biens/immeubles/modifier/${data.buildingId}`)  // ✅ FIX: Invalidate edit page cache
    } else {
      logger.error('❌ [SERVER-ACTION] Property update failed:', result.error)
    }

    return result

  } catch (error) {
    logger.error('❌ [SERVER-ACTION] Unexpected error updating property:', error)

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

/**
 * Get building by ID with relations (managers, contacts)
 *
 * ✅ Server Action with authenticated Supabase server client
 * ✅ Returns building with building_contacts for managers and other contacts
 */
export async function getBuildingWithRelations(buildingId: string): Promise<{
  success: boolean
  building?: Building & {
    building_contacts?: Array<{
      user: {
        id: string
        name?: string
        email: string
        role: string
        phone?: string
        speciality?: string
      }
    }>
  }
  error?: string
}> {
  try {
    logger.info('🏢 [SERVER-ACTION] Getting building with relations:', { buildingId })

    // Create server action building service
    const buildingService = await createServerActionBuildingService()

    // Get building with relations
    const result = await buildingService.getByIdWithRelations(buildingId)

    if (!result.success || !result.data) {
      logger.error('❌ [SERVER-ACTION] Building not found:', { buildingId, error: result.error })
      return {
        success: false,
        error: 'Building not found'
      }
    }

    logger.info('✅ [SERVER-ACTION] Building loaded with relations:', {
      buildingId: result.data.id,
      buildingName: result.data.name,
      contactsCount: (result.data as any).building_contacts?.length || 0
    })

    return {
      success: true,
      building: result.data as Building & {
        building_contacts?: Array<{
          user: {
            id: string
            name?: string
            email: string
            role: string
            phone?: string
            speciality?: string
          }
        }>
      }
    }

  } catch (error) {
    logger.error('❌ [SERVER-ACTION] Unexpected error getting building:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}
