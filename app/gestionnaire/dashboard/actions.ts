'use server'

import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/dal'
import { createServerTeamService, createServerContactInvitationService } from '@/lib/services'
import { logger, logError } from '@/lib/logger'
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
    logger.info('🚀 [DASHBOARD-ACTION] Starting contact creation:', {
      type: data.type,
      email: data.email,
      teamId: data.teamId,
      inviteToApp: data.inviteToApp
    })

    // ✅ LAYER 4: Server Action Security - Vérification rôle obligatoire
    const user = await requireRole('gestionnaire')
    logger.info('✅ [DASHBOARD-ACTION] User authenticated:', { userId: user.id, role: user.role })

    // ✅ FIX: Initialize services with await (Server Components)
    logger.info('📦 [DASHBOARD-ACTION] Initializing services...')
    const teamService = await createServerTeamService()
    const contactInvitationService = await createServerContactInvitationService()
    logger.info('✅ [DASHBOARD-ACTION] Services initialized')

    // Vérifier que l'utilisateur peut créer des contacts pour cette équipe
    logger.info('🔍 [DASHBOARD-ACTION] Checking team access...')
    const teamsResult = await teamService.getUserTeams(user.id)
    const teams = teamsResult?.data || []

    logger.info('📊 [DASHBOARD-ACTION] User teams:', {
      teamsCount: teams.length,
      teamIds: teams.map(t => t.id),
      requestedTeamId: data.teamId
    })

    // ✅ FIX: Corriger typo data._teamId → data.teamId
    const hasTeamAccess = teams.some(team => team.id === data.teamId)

    if (!hasTeamAccess) {
      logger.error(`🚫 [DASHBOARD-ACTION] Access denied:`, {
        userId: user.id,
        requestedTeamId: data.teamId,
        userTeams: teams.map(t => t.id)
      })
      return { success: false, error: 'Accès non autorisé à cette équipe' }
    }

    logger.info('✅ [DASHBOARD-ACTION] Team access verified, calling service...')

    // Créer le contact avec invitation optionnelle
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

    logger.info('📥 [DASHBOARD-ACTION] Service result:', {
      success: result.success,
      hasData: !!result.data,
      error: result.error
    })

    // ✅ FIX: Vérifier la structure du résultat avant d'accéder aux propriétés
    if (!result.success) {
      logger.error('❌ [DASHBOARD-ACTION] Service returned error:', result.error)
      return {
        success: false,
        error: result.error || 'Erreur lors de la création du contact'
      }
    }

    logger.info('✅ [DASHBOARD-ACTION] Contact created successfully:', result.data)

    // ✅ FIX: La structure du résultat est result.data, pas result.contact
    if (data.inviteToApp && result.data?.invitation) {
      logger.info('📧 [DASHBOARD-ACTION] Invitation sent to:', data.email)
    }

    // Revalider la page pour refléter les changements
    logger.info('🔄 [DASHBOARD-ACTION] Revalidating paths...')
    revalidatePath('/gestionnaire/dashboard')
    revalidatePath('/gestionnaire/contacts')

    return {
      success: true,
      contact: result.data?.contact,
      invitationSent: data.inviteToApp && !!result.data?.invitation
    }
  } catch (error) {
    logger.error('❌ [DASHBOARD-ACTION] Contact creation failed:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      error
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
    await requireRole('gestionnaire')

    // TODO: Implémenter création intervention
    // Pour l'instant, redirection vers le formulaire
    return { success: true, redirectTo: '/gestionnaire/interventions/nouvelle-intervention' }
  } catch (error) {
    logger.error('❌ [DASHBOARD-ACTION] Intervention creation failed:', error)
    return {
      success: false,
      error: 'Erreur lors de la création de l\'intervention'
    }
  }
}
