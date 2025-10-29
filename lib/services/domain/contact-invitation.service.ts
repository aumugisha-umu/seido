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
   * Sanitize phone number for API validation
   * Removes spaces, dashes, dots and converts empty strings to null
   * ✅ FIX (Oct 23, 2025): Phone validation mismatch between form and API
   * - Form accepts: "06 12 34 56 78", "06-12-34-56-78"
   * - API requires: "0612345678" or "+33612345678"
   */
  private sanitizePhone(phone?: string): string | null {
    if (!phone || phone.trim() === '') {
      return null
    }

    // Remove all spaces, dashes, dots but keep + for international format
    const sanitized = phone.replace(/[\s.\-]/g, '')

    // Return null if result is empty after sanitization
    return sanitized.trim() === '' ? null : sanitized
  }

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

      // ✅ FIX (Oct 23, 2025): Sanitize phone number to match Zod validation
      const sanitizedPhone = this.sanitizePhone(contactData.phone)
      logger.info(`📞 [CONTACT-INVITATION-SERVICE] Phone sanitized: "${contactData.phone}" → "${sanitizedPhone}"`)

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
            phone: sanitizedPhone,
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
            phone: sanitizedPhone,
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
   * Revoke access for a contact (soft delete pattern)
   * - Disconnects auth link (users.auth_user_id = NULL)
   * - Soft deletes team membership (team_members.left_at = NOW())
   * - Cancels invitation (user_invitations.status = 'cancelled')
   */
  async revokeAccess(
    contactId: string,
    teamId: string
  ): Promise<ServiceResult<{ message: string }>> {
    try {
      logger.info({ contactId, teamId }, '🚫 [CONTACT-INVITATION-SERVICE] Starting revocation')

      // 1. Récupérer invitation pour validation
      const { data: invitation, error: invError } = await this.contactService['repository']['supabase']
        .from('user_invitations')
        .select('id, status')
        .eq('user_id', contactId)
        .eq('team_id', teamId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (invError && invError.code !== 'PGRST116') {
        logger.error({ error: invError }, '❌ Error fetching invitation')
        return {
          success: false,
          error: { code: 'DB_ERROR', message: invError.message }
        }
      }

      if (!invitation) {
        return {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Invitation non trouvée' }
        }
      }

      // 2. Appeler RPC atomique
      const { data, error } = await this.contactService['repository']['supabase']
        .rpc('revoke_contact_access', {
          p_contact_id: contactId,
          p_team_id: teamId,
          p_invitation_id: invitation.id
        })

      if (error) {
        logger.error({ error }, '❌ Failed to revoke access via RPC')
        return {
          success: false,
          error: { code: 'DB_ERROR', message: error.message }
        }
      }

      if (!data.success) {
        return {
          success: false,
          error: { code: 'REVOKE_FAILED', message: data.error }
        }
      }

      logger.info({ contactId, teamId }, '✅ Access revoked successfully')

      return {
        success: true,
        data: { message: data.message }
      }
    } catch (error) {
      logger.error({ error }, '❌ Unexpected error in revokeAccess')
      return {
        success: false,
        error: { code: 'UNKNOWN', message: error instanceof Error ? error.message : 'Unknown error' }
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
      'owner': { role: 'proprietaire' },
      'proprietaire': { role: 'proprietaire' },
      'autre': { role: 'prestataire', provider_category: 'autre' }
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
