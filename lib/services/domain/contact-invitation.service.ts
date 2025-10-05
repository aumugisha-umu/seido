/**
 * Contact Invitation Service - Phase 5.1
 * Handles contact creation with optional app invitations
 */

import { ContactService, createContactService, createServerContactService } from './contact.service'
import type { ServiceResult, Contact, User } from '../core/service-types'
import { logger, logError } from '@/lib/logger'
/**
 * Contact data for invitation flow
 */
export interface ContactInvitationData {
  type: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  speciality?: string
  notes?: string
  inviteToApp: boolean
  teamId: string
}

/**
 * Role mapping result
 */
interface RoleMappingResult {
  role: 'admin' | 'gestionnaire' | 'prestataire' | 'locataire'
  provider_category?: string
}

/**
 * Contact Invitation Service
 * Manages the flow of creating contacts and optionally inviting them to the application
 */
export class ContactInvitationService {
  constructor(private contactService: ContactService) {}

  /**
   * Create a contact and optionally invite them to the application
   */
  async createContactWithOptionalInvite(contactData: ContactInvitationData): Promise<ServiceResult<{
    contact?: Contact
    user?: User
    invitationSent?: boolean
  }>> {
    try {
      logger.info('🚀 [CONTACT-INVITATION-SERVICE] Starting with data:', contactData)

      if (contactData.inviteToApp) {
        // Use the invite-user API for full user creation
        const response = await fetch('/api/invite-user', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: contactData.email,
            firstName: contactData.firstName,
            lastName: contactData.lastName,
            role: this.mapFrontendTypeToUserRole(contactData.type).role,
            providerCategory: this.mapFrontendTypeToUserRole(contactData.type).provider_category,
            teamId: contactData.teamId,
            phone: contactData.phone,
            notes: contactData.notes,
            speciality: contactData.speciality,
            shouldInviteToApp: contactData.inviteToApp
          })
        })

        const result = await response.json()

        if (!response.ok || !result.success) {
          throw new Error(result.error || `API returned ${response.status}`)
        }

        logger.info('✅ [CONTACT-INVITATION-SERVICE] Process completed:', result)
        return { success: true, data: result }
      } else {
        // Create contact/user WITHOUT app invitation
        // Use the same invite-user API but with skipInvitation flag

        // ✅ FIX: Ajouter timeout de 30s pour éviter spinner infini
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 secondes

        logger.info('📡 [CONTACT-INVITATION-SERVICE] Sending request to /api/invite-user with data:', {
          email: contactData.email,
          role: this.mapFrontendTypeToUserRole(contactData.type).role,
          providerCategory: this.mapFrontendTypeToUserRole(contactData.type).provider_category,
          shouldInviteToApp: false
        })

        const response = await fetch('/api/invite-user', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: contactData.email,
            firstName: contactData.firstName,
            lastName: contactData.lastName,
            role: this.mapFrontendTypeToUserRole(contactData.type).role,
            providerCategory: this.mapFrontendTypeToUserRole(contactData.type).provider_category,
            teamId: contactData.teamId,
            phone: contactData.phone,
            notes: contactData.notes,
            speciality: contactData.speciality,
            shouldInviteToApp: false // ✅ Skip the Supabase auth invitation
          }),
          signal: controller.signal // ✅ Ajouter le signal pour timeout
        }).finally(() => clearTimeout(timeoutId)) // ✅ Nettoyer le timeout

        const result = await response.json()

        if (!response.ok || !result.success) {
          throw new Error(result.error || `API returned ${response.status}`)
        }

        logger.info('✅ [CONTACT-INVITATION-SERVICE] Contact created without invitation:', result)
        return { success: true, data: result }
      }

    } catch (error) {
      logger.error('❌ [CONTACT-INVITATION-SERVICE] Error:', error)

      // ✅ FIX: Gestion spécifique du timeout
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          error: 'La création du contact a pris trop de temps (timeout 30s). Veuillez réessayer.'
        }
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * Resend an invitation for a contact
   * Returns a flattened response for UI compatibility
   */
  async resendInvitation(contactId: string): Promise<{
    success: boolean
    magicLink?: string
    message?: string
    emailSent?: boolean
    error?: string
  }> {
    try {
      logger.info('🔄 [CONTACT-INVITATION-SERVICE] Resending invitation for contact:', contactId)

      const response = await fetch('/api/resend-invitation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invitationId: contactId
        })
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        logger.error('❌ [CONTACT-INVITATION-SERVICE] Failed to resend:', result)
        throw new Error(result.error || `API returned ${response.status}`)
      }

      logger.info('✅ [CONTACT-INVITATION-SERVICE] Invitation resent successfully:', result)
      // ✅ Retourner structure aplatie pour compatibilité UI
      return {
        success: true,
        magicLink: result.magicLink,
        message: result.message,
        emailSent: result.emailSent
      }

    } catch (error) {
      logger.error('❌ [CONTACT-INVITATION-SERVICE] Error resending invitation:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to resend invitation'
      }
    }
  }

  /**
   * Cancel an invitation for a contact
   * Returns a flattened response for UI compatibility
   */
  async cancelInvitation(invitationId: string): Promise<{
    success: boolean
    message?: string
    authDeleted?: boolean
    error?: string
  }> {
    try {
      logger.info('🚫 [CONTACT-INVITATION-SERVICE] Cancelling invitation:', invitationId)

      const response = await fetch('/api/cancel-invitation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invitationId
        })
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        logger.error('❌ [CONTACT-INVITATION-SERVICE] Failed to cancel:', result)
        throw new Error(result.error || `API returned ${response.status}`)
      }

      logger.info('✅ [CONTACT-INVITATION-SERVICE] Invitation cancelled successfully:', result)
      // ✅ Retourner structure aplatie pour compatibilité UI
      return {
        success: true,
        message: result.message,
        authDeleted: result.authDeleted
      }

    } catch (error) {
      logger.error('❌ [CONTACT-INVITATION-SERVICE] Error cancelling invitation:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel invitation'
      }
    }
  }

  /**
   * Get pending invitations for a team
   */
  async getPendingInvitations(teamId: string): Promise<any[]> {
    try {
      logger.info('📋 [CONTACT-INVITATION-SERVICE] Fetching pending invitations for team:', teamId)

      const response = await fetch(`/api/team-invitations?teamId=${teamId}&status=pending`)

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`)
      }

      const result = await response.json()
      logger.info('✅ [CONTACT-INVITATION-SERVICE] Found pending invitations:', result.length || 0)

      return result.invitations || []

    } catch (error) {
      logger.error('❌ [CONTACT-INVITATION-SERVICE] Error fetching invitations:', error)
      return []
    }
  }

  /**
   * Map frontend contact type to user role and provider category
   */
  private mapFrontendTypeToUserRole(_type: string): RoleMappingResult {
    const mapping: Record<string, RoleMappingResult> = {
      'tenant': { role: 'locataire' },
      'locataire': { role: 'locataire' },
      'manager': { role: 'gestionnaire' },
      'gestionnaire': { role: 'gestionnaire' },
      'provider': { role: 'prestataire', provider_category: 'prestataire' },
      'prestataire': { role: 'prestataire', provider_category: 'prestataire' },
      'syndic': { role: 'prestataire', provider_category: 'syndic' },
      'insurance': { role: 'prestataire', provider_category: 'assurance' },
      'assurance': { role: 'prestataire', provider_category: 'assurance' },
      'notary': { role: 'prestataire', provider_category: 'notaire' },
      'notaire': { role: 'prestataire', provider_category: 'notaire' },
      'owner': { role: 'gestionnaire' },
      'proprietaire': { role: 'gestionnaire' }
    }

    return mapping[_type.toLowerCase()] || { role: 'locataire' }
  }
}

// Factory functions for creating service instances
export const createContactInvitationService = (contactService?: ContactService) => {
  const contacts = contactService || createContactService()
  return new ContactInvitationService(contacts)
}

export const createServerContactInvitationService = async () => {
  const contactService = await createServerContactService()
  return new ContactInvitationService(contactService)
}
