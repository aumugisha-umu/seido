'use server'

import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/dal'
import { createServerTeamService, createServerContactInvitationService } from '@/lib/services'



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
    // ✅ LAYER 4: Server Action Security - Vérification rôle obligatoire
    const user = await requireRole('gestionnaire')

    // Initialize services
    const teamService = createServerTeamService()
    const contactInvitationService = createServerContactInvitationService()

    // Vérifier que l'utilisateur peut créer des contacts pour cette équipe
    const teams = await teamService.getUserTeams(user.id)
    const hasTeamAccess = teams.some(team => team.id === data.teamId)

    if (!hasTeamAccess) {
      console.log(`🚫 [DASHBOARD-ACTION] User ${user.id} cannot create contacts for team ${data.teamId}`)
      return { success: false, error: 'Accès non autorisé à cette équipe' }
    }

    console.log('[DASHBOARD-ACTION] Creating contact with invitation service...')

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

    console.log('✅ [DASHBOARD-ACTION] Contact created successfully:', result.contact.id)

    if (data.inviteToApp && result.invitationResult) {
      console.log('📧 [DASHBOARD-ACTION] Invitation sent to:', data.email)
    }

    // Revalider la page pour refléter les changements
    revalidatePath('/gestionnaire/dashboard')
    revalidatePath('/gestionnaire/contacts')

    return {
      success: true,
      contact: result.contact,
      invitationSent: data.inviteToApp && !!result.invitationResult
    }
  } catch (error) {
    console.error('❌ [DASHBOARD-ACTION] Contact creation failed:', error)
    return {
      success: false,
      error: 'Erreur lors de la création du contact'
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
    console.error('❌ [DASHBOARD-ACTION] Intervention creation failed:', error)
    return {
      success: false,
      error: 'Erreur lors de la création de l\'intervention'
    }
  }
}
