'use server'

/**
 * Intervention Assignment Server Actions
 * Assign/unassign users, multi-provider assignment, linked interventions, provider instructions
 */

import {
  createServerActionInterventionService,
  createServerActionSupabaseClient,
} from '@/lib/services'
import { getServerActionAuthContextOrNull } from '@/lib/server-context'
import { logger } from '@/lib/logger'
import {
  type ActionResult,
  sendParticipantAddedSystemMessage,
} from './intervention-shared'

// Types for multi-provider assignments
type AssignmentMode = 'single' | 'group'

interface MultiProviderAssignmentInput {
  interventionId: string
  providerIds: string[]
  mode: AssignmentMode
}

/**
 * Assign user to intervention
 */
export async function assignUserAction(
  interventionId: string,
  userId: string,
  role: 'gestionnaire' | 'prestataire' | 'locataire'
): Promise<ActionResult<void>> {
  try {
    // Auth check
    const authContext = await getServerActionAuthContextOrNull()
    const user = authContext?.profile
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    // Only managers can assign users
    if (!['gestionnaire', 'admin'].includes(user.role)) {
      return { success: false, error: 'Only managers can assign users to interventions' }
    }

    logger.info('[SERVER-ACTION] Assigning user to intervention:', {
      interventionId,
      assignedUserId: userId,
      role,
      assignedBy: user.id
    })

    // Create service and execute
    const interventionService = await createServerActionInterventionService()
    const result = await interventionService.assignUser(interventionId, userId, role, user.id)

    if (result.success) {
      // Send system message to group thread
      try {
        await sendParticipantAddedSystemMessage(interventionId, userId, role, user)
      } catch (msgError) {
        // Don't fail the assignment if system message fails
        logger.error('[SERVER-ACTION] Failed to send system message:', msgError)
      }

      return { success: true, data: undefined }
    }

    return { success: false, error: result.error || 'Failed to assign user' }
  } catch (error) {
    logger.error('[SERVER-ACTION] Error assigning user:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' }
  }
}

/**
 * Unassign user from intervention
 */
export async function unassignUserAction(
  interventionId: string,
  userId: string,
  role: string
): Promise<ActionResult<void>> {
  try {
    // Auth check
    const authContext = await getServerActionAuthContextOrNull()
    const user = authContext?.profile
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    // Only managers can unassign users
    if (!['gestionnaire', 'admin'].includes(user.role)) {
      return { success: false, error: 'Only managers can unassign users from interventions' }
    }

    logger.info('[SERVER-ACTION] Unassigning user from intervention:', {
      interventionId,
      unassignedUserId: userId,
      role,
      unassignedBy: user.id
    })

    // Create service and execute
    const interventionService = await createServerActionInterventionService()
    const result = await interventionService.unassignUser(interventionId, userId, role, user.id)

    if (result.success) {
      return { success: true, data: undefined }
    }

    return { success: false, error: result.error || 'Failed to unassign user' }
  } catch (error) {
    logger.error('[SERVER-ACTION] Error unassigning user:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' }
  }
}

/**
 * Assign Multiple Providers Action
 * Assigns multiple providers to an intervention with a specific assignment mode
 * Mode: 'single' (1 provider), 'group' (shared info)
 */
export async function assignMultipleProvidersAction(
  input: MultiProviderAssignmentInput
): Promise<ActionResult<{ assignments: unknown[]; mode: AssignmentMode; providerCount: number }>> {
  try {
    logger.info('[SERVER-ACTION] Assigning multiple providers', {
      interventionId: input.interventionId,
      providerCount: input.providerIds.length,
      mode: input.mode
    })

    const { user } = await createServerActionSupabaseClient()

    if (!user) {
      return { success: false, error: 'Non authentifie' }
    }

    // Validate input
    if (!input.providerIds || input.providerIds.length === 0) {
      return { success: false, error: 'Au moins un prestataire doit etre selectionne' }
    }

    if (input.providerIds.length === 1 && input.mode !== 'single') {
      return { success: false, error: 'Un seul prestataire doit utiliser le mode "single"' }
    }

    if (input.providerIds.length > 1 && input.mode === 'single') {
      return { success: false, error: 'Plusieurs prestataires necessitent le mode "group"' }
    }

    const service = await createServerActionInterventionService()

    const result = await service.assignMultipleProviders({
      interventionId: input.interventionId,
      providerIds: input.providerIds,
      mode: input.mode,
      assignedBy: user.id
    })

    if (!result.success) {
      return {
        success: false,
        error: result.error?.message || 'Erreur lors de l\'assignation des prestataires'
      }
    }

    logger.info('Multiple providers assigned successfully', {
      interventionId: input.interventionId,
      providerCount: input.providerIds.length,
      mode: input.mode
    })

    return { success: true, data: result.data! }
  } catch (error) {
    logger.error('[SERVER-ACTION] Error assigning multiple providers:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }
  }
}

/**
 * Get Linked Interventions Action
 * Retrieves parent/child intervention links for a given intervention
 */
export async function getLinkedInterventionsAction(
  interventionId: string
): Promise<ActionResult<unknown[]>> {
  try {
    logger.info('[SERVER-ACTION] Getting linked interventions', { interventionId })

    const { user } = await createServerActionSupabaseClient()

    if (!user) {
      return { success: false, error: 'Non authentifie' }
    }

    const service = await createServerActionInterventionService()
    const result = await service.getLinkedInterventions(interventionId)

    if (!result.success) {
      return {
        success: false,
        error: result.error?.message || 'Erreur lors de la recuperation des interventions liees'
      }
    }

    return { success: true, data: result.data || [] }
  } catch (error) {
    logger.error('[SERVER-ACTION] Error getting linked interventions:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }
  }
}

/**
 * Update Provider Instructions Action
 * Updates specific instructions for a provider in an intervention
 */
export async function updateProviderInstructionsAction(
  interventionId: string,
  providerId: string,
  instructions: string
): Promise<ActionResult<unknown>> {
  try {
    logger.info('[SERVER-ACTION] Updating provider instructions', {
      interventionId,
      providerId,
      instructionsLength: instructions.length
    })

    const { user } = await createServerActionSupabaseClient()

    if (!user) {
      return { success: false, error: 'Non authentifie' }
    }

    if (instructions.length > 5000) {
      return {
        success: false,
        error: 'Les instructions ne doivent pas depasser 5000 caracteres'
      }
    }

    const service = await createServerActionInterventionService()
    const result = await service.updateProviderInstructions(
      interventionId,
      providerId,
      instructions,
      user.id
    )

    if (!result.success) {
      return {
        success: false,
        error: result.error?.message || 'Erreur lors de la mise a jour des instructions'
      }
    }

    return { success: true, data: result.data }
  } catch (error) {
    logger.error('[SERVER-ACTION] Error updating provider instructions:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }
  }
}

/**
 * Get Assignment Mode Action
 * Retrieves the assignment mode for an intervention
 */
export async function getAssignmentModeAction(
  interventionId: string
): Promise<ActionResult<AssignmentMode>> {
  try {
    const { user } = await createServerActionSupabaseClient()

    if (!user) {
      return { success: false, error: 'Non authentifie' }
    }

    const service = await createServerActionInterventionService()
    const mode = await service.getAssignmentMode(interventionId)

    return { success: true, data: mode }
  } catch (error) {
    logger.error('[SERVER-ACTION] Error getting assignment mode:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }
  }
}
