/**
 * Lot Data Transformation Utilities
 *
 * Transforme les données entre la structure DB et le format des composants
 * pour le wizard d'édition de lots.
 */

import type { User } from "@/lib/services/core/service-types"
import type { LotCategory } from "@/lib/lot-types"

// Types pour les composants
export interface LotInfo {
  reference: string
  floor: string
  doorNumber: string
  description: string
  category: LotCategory
  // Address fields (for independent lots only)
  street?: string
  postalCode?: string
  city?: string
  country?: string
}

export interface ContactsByType {
  tenant?: Contact[]
  provider?: Contact[]
  owner?: Contact[]
  other?: Contact[]
}

export interface Contact {
  id: string
  name: string
  email: string
  type: string
  phone?: string
  speciality?: string
}

export interface BuildingInfo {
  id: string
  name: string
  address?: string
  city?: string
}

/**
 * Transforme un lot chargé depuis la DB vers le format des composants
 */
export function transformLotForEdit(lot: any): {
  lotInfo: LotInfo
  contacts: ContactsByType
  managers: Array<{ user: User }>
  building: BuildingInfo | null
} {
  // Base lot info
  const lotInfo: LotInfo = {
    reference: lot.reference || "",
    floor: lot.floor !== null && lot.floor !== undefined ? String(lot.floor) : "",
    doorNumber: lot.apartment_number || "",
    description: lot.description || "",
    category: (lot.category as LotCategory) || "appartement"
  }

  // Add address fields for independent lots (no building association)
  if (!lot.building_id && !lot.building) {
    lotInfo.street = lot.street || ""
    lotInfo.postalCode = lot.postal_code || ""
    lotInfo.city = lot.city || ""
    lotInfo.country = lot.country || "Belgique"
  }

  return {
    lotInfo,
    contacts: groupContactsByType(lot.lot_contacts || []),
    managers: extractManagers(lot.lot_contacts || []),
    building: lot.building ? {
      id: lot.building_id,
      name: lot.building.name,
      address: lot.building.address,
      city: lot.building.city
    } : null
  }
}

/**
 * Groupe les contacts du lot par type (excluant les gestionnaires)
 */
function groupContactsByType(lotContacts: any[]): ContactsByType {
  const contacts: ContactsByType = {
    tenant: [],
    provider: [],
    owner: [],
    other: []
  }

  lotContacts.forEach(lc => {
    if (!lc.user) return

    // Skip gestionnaires (ils sont dans managers)
    if (lc.user.role === 'gestionnaire' || lc.user.role === 'admin') return

    const contact: Contact = {
      id: lc.user.id,
      name: lc.user.name || lc.user.email,
      email: lc.user.email,
      type: lc.user.role || 'other',
      phone: lc.user.phone,
      speciality: lc.user.provider_category || lc.user.speciality
    }

    // Mapper selon le type
    if (lc.user.role === 'locataire') {
      contacts.tenant?.push(contact)
    } else if (lc.user.role === 'prestataire') {
      contacts.provider?.push(contact)
    } else if (lc.user.role === 'proprietaire') {
      contacts.owner?.push(contact)
    } else {
      contacts.other?.push(contact)
    }
  })

  return contacts
}

/**
 * Extrait les gestionnaires depuis lot_contacts
 * Returns { user: User }[] structure to match TeamMember structure
 */
function extractManagers(lotContacts: any[]): Array<{ user: User }> {
  return lotContacts
    .filter(lc => lc.user && (lc.user.role === 'gestionnaire' || lc.user.role === 'admin'))
    .map(lc => ({ user: lc.user }))  // Wrap in { user } structure to match TeamMember
}
