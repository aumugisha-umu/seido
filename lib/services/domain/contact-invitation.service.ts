/**
 * Contact Invitation Service - Phase 5.1
 * Handles contact creation with optional app invitations
 */

import { ContactService, createContactService, createServerContactService } from './contact.service'
import type { ServiceResult, Contact, User } from '../core/service-types'

/**
 * Contact data for invitation flow
 */
export interface ContactInvitationData {
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
      console.log('🚀 [CONTACT-INVITATION-SERVICE] Starting with data:', contactData)

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
            speciality: contactData.speciality,
            shouldInviteToApp: contactData.inviteToApp
          })
        })

        const result = await response.json()

        if (!response.ok || !result.success) {
          throw new Error(result.error || `API returned ${response.status}`)
        }

        console.log('✅ [CONTACT-INVITATION-SERVICE] Process completed:', result)
        return { success: true, data: result }
      } else {
        // Create contact only without user invitation
        const contactResult = await this.contactService.create({
          email: contactData.email,
          first_name: contactData.firstName,
          last_name: contactData.lastName,
          phone: contactData.phone,
          role: this.mapFrontendTypeToUserRole(contactData.type).role,
          team_id: contactData.teamId,
          created_by: 'system', // Would be replaced with actual user ID
          invitation_status: 'not_invited',
          is_active: true
        })

        if (!contactResult.success) {
          throw new Error(contactResult.error || 'Failed to create contact')
        }

        console.log('✅ [CONTACT-INVITATION-SERVICE] Contact created without invitation:', contactResult.data)
        return { success: true, data: contactResult.data }
      }

    } catch (error) {
      console.error('❌ [CONTACT-INVITATION-SERVICE] Error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
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
      'provider': { role: 'prestataire', provider_category: 'service' },
      'prestataire': { role: 'prestataire', provider_category: 'service' },
      'syndic': { role: 'prestataire', provider_category: 'syndic' },
      'insurance': { role: 'prestataire', provider_category: 'insurance' },
      'assurance': { role: 'prestataire', provider_category: 'assurance' },
      'notary': { role: 'prestataire', provider_category: 'legal' },
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
