'use server'

/**
 * Building Server Actions
 * Server-side operations for building management with proper auth context
 *
 * ✅ REFACTORED (Jan 2026): Uses centralized getServerActionAuthContextOrNull()
 *    instead of inline auth with getSession() + .single() bugs
 */

import { createServerActionCompositeService, createServerActionBuildingService } from '@/lib/services'
import { getServerActionAuthContextOrNull } from '@/lib/server-context'
import { createServiceRoleSubscriptionService } from '@/lib/services/domain/subscription-helpers'
// Pages are force-dynamic — no cache invalidation needed
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
    // ── Subscription limit check (defense-in-depth) ────────────────────
    if (data.building.team_id && data.lots.length > 0) {
      const subService = createServiceRoleSubscriptionService()
      const canAdd = await subService.canAddProperty(data.building.team_id, data.lots.length)
      if (!canAdd.allowed) {
        logger.warn('[SERVER-ACTION] Building creation blocked by subscription limit:', {
          teamId: data.building.team_id,
          reason: canAdd.reason,
        })
        return {
          success: false,
          data: { building: {} as Building, lots: [] },
          error: canAdd.reason ?? 'Limite d\'abonnement atteinte',
          operations: [],
        }
      }
    }

    logger.info('[SERVER-ACTION] Creating complete property:', {
      buildingName: data.building.name,
      lotsCount: data.lots.length,
      buildingContactsCount: data.buildingContacts?.length || 0,
      teamId: data.building.team_id
    })

    const compositeService = await createServerActionCompositeService()

    // Execute property creation
    const result = await compositeService.createCompleteProperty(data)

    if (result.success) {
      logger.info('✅ [SERVER-ACTION] Property created successfully:', {
        buildingId: result.data.building.id,
        buildingName: result.data.building.name,
        lotsCreated: result.data.lots.length
      })

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

    // ✅ REFACTORED: Use centralized auth context (fixes .single() bug for multi-profile users)
    const authContext = await getServerActionAuthContextOrNull()
    if (!authContext) {
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

    const { profile: userData, supabase: debugSupabase, user: authUser } = authContext

    logger.info('🔍 [DEBUG] Server Action Auth Check (Update):', {
      hasSession: true,
      userId: authUser.id,
      databaseUserId: userData.id,
      buildingId: data.buildingId,
      timestamp: new Date().toISOString()
    })

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

    // ── Subscription limit check for new lots (defense-in-depth) ─────
    if (data.lots.new.length > 0) {
      const subService = createServiceRoleSubscriptionService()
      const canAdd = await subService.canAddProperty(existingBuilding.team_id, data.lots.new.length)
      if (!canAdd.allowed) {
        logger.warn('[SERVER-ACTION] Building edit blocked by subscription limit:', {
          teamId: existingBuilding.team_id,
          newLotsCount: data.lots.new.length,
          reason: canAdd.reason,
        })
        return {
          success: false,
          data: { building: {} as Building, lots: [] },
          error: canAdd.reason ?? 'Limite d\'abonnement atteinte',
          operations: [],
        }
      }
    }

    // RLS enforces team access via is_team_manager(team_id) on buildings_update policy
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
