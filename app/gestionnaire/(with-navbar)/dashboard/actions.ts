'use server'

import { revalidatePath } from 'next/cache'
import { getServerActionAuthContextOrNull } from '@/lib/server-context'
import { createServerTeamService, createServerContactInvitationService } from '@/lib/services'
import { logger } from '@/lib/logger'
/**
 * 🔐 DASHBOARD ACTIONS (Bonnes Pratiques 2025)
 *
 * ✅ LAYER 4: Server Actions Security - Validation dans toutes mutations
 * - Authentification obligatoire dans chaque action
 * - Validation des permissions
 * - Revalidation cache après mutations
 */

export interface CreateContactData {
  type: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  address?: string
  speciality?: string
  notes?: string
  inviteToApp: boolean
  teamId: string
}

export async function createContactAction(data: CreateContactData) {
  try {
    const authContext = await getServerActionAuthContextOrNull('gestionnaire')
    if (!authContext) {
      return { success: false, error: 'Authentication required' }
    }
    const { profile } = authContext

    const [teamService, contactInvitationService] = await Promise.all([
      createServerTeamService(),
      createServerContactInvitationService(),
    ])

    // Verify team access
    const teamsResult = await teamService.getUserTeams(profile.id)
    const teams = teamsResult?.data || []
    const hasTeamAccess = teams.some(team => team.id === data.teamId)

    if (!hasTeamAccess) {
      logger.error('[DASHBOARD-ACTION] Access denied', { userId: profile.id, teamId: data.teamId })
      return { success: false, error: 'Accès non autorisé à cette équipe' }
    }

    const result = await contactInvitationService.createContactWithOptionalInvite({
      type: data.type,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      address: data.address,
      speciality: data.speciality,
      notes: data.notes,
      inviteToApp: data.inviteToApp,
      teamId: data.teamId
    })

    if (!result.success) {
      logger.error('[DASHBOARD-ACTION] Contact creation failed:', result.error)
      return {
        success: false,
        error: result.error || 'Erreur lors de la création du contact'
      }
    }

    revalidatePath('/gestionnaire/contacts')

    return {
      success: true,
      contact: result.data?.contact,
      invitationSent: data.inviteToApp && !!result.data?.invitation
    }
  } catch (error) {
    logger.error('[DASHBOARD-ACTION] Contact creation failed:', {
      message: error instanceof Error ? error.message : String(error),
    })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur lors de la création du contact'
    }
  }
}

export async function createInterventionAction() {
  try {
    // ✅ LAYER 4: Server Action Security - Vérification rôle obligatoire
    const authContext = await getServerActionAuthContextOrNull('gestionnaire')
    if (!authContext) {
      return { success: false, error: 'Authentication required' }
    }

    // TODO: Implémenter création intervention
    // Pour l'instant, redirection vers le formulaire
    return { success: true, redirectTo: '/gestionnaire/operations/nouvelle-intervention' }
  } catch (error) {
    logger.error('❌ [DASHBOARD-ACTION] Intervention creation failed:', error)
    return {
      success: false,
      error: 'Erreur lors de la création de l\'intervention'
    }
  }
}
