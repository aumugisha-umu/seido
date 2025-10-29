/**
 * Building Data Transformation Utilities
 *
 * Transforme les données entre la structure DB et le format des composants
 * pour les wizards de création et d'édition d'immeubles.
 */

import type { Building, Lot as DBLot, Contact as DBContact, User } from "@/lib/services/core/service-types"
import type { LotCategory } from "@/lib/lot-types"

// Mapping des valeurs enum DB vers noms de pays affichés
const dbEnumToCountry: Record<string, string> = {
  "belgique": "Belgique",
  "france": "France",
  "luxembourg": "Luxembourg",
  "pays-bas": "Pays-Bas",
  "allemagne": "Allemagne",
  "suisse": "Suisse",
  "autre": "Autre",
}

// Types pour les composants
export interface BuildingInfo {
  name: string
  address: string
  postalCode: string
  city: string
  country: string
  description: string
}

export interface ComponentLot {
  id: string
  reference: string
  floor: string
  doorNumber: string
  description: string
  category: LotCategory
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

export interface LotContactAssignments {
  [lotId: string]: ContactsByType
}

export interface LotManagerAssignments {
  [lotId: string]: Array<{ user: User }>
}

/**
 * Transforme un immeuble chargé depuis la DB vers le format des composants
 */
export function transformBuildingForEdit(building: any): {
  buildingInfo: BuildingInfo
  lots: ComponentLot[]
  buildingManagers: Array<{ user: User }>
  buildingContacts: ContactsByType
  lotContactAssignments: LotContactAssignments
  assignedManagers: LotManagerAssignments
} {
  return {
    buildingInfo: {
      name: building.name || "",
      address: building.address || "",
      postalCode: building.postal_code || "",
      city: building.city || "",
      country: dbEnumToCountry[building.country] || building.country || "Belgique",
      description: building.description || ""
    },
    lots: transformLotsFromDB(building.lots || []),
    buildingManagers: extractBuildingManagers(building.building_contacts || []),
    buildingContacts: groupBuildingContactsByType(building.building_contacts || []),
    lotContactAssignments: groupLotContactsByLot(building.lots || []),
    assignedManagers: groupLotManagersByLot(building.lots || [])
  }
}

/**
 * Transforme les lots DB vers le format composant
 */
function transformLotsFromDB(dbLots: any[]): ComponentLot[] {
  return dbLots.map(lot => ({
    id: lot.id, // Garder le DB ID (UUID)
    reference: lot.reference || "",
    floor: lot.floor !== null && lot.floor !== undefined ? String(lot.floor) : "",
    doorNumber: lot.apartment_number || "",
    description: lot.description || "",
    category: (lot.category as LotCategory) || "appartement"
  }))
}

/**
 * Extrait les gestionnaires de l'immeuble depuis building_contacts
 * Returns { user: User }[] structure to match TeamMember structure
 */
function extractBuildingManagers(buildingContacts: any[]): any[] {
  return buildingContacts
    .filter(bc => bc.user && (bc.user.role === 'gestionnaire' || bc.user.role === 'admin'))
    .map(bc => ({ user: bc.user }))  // Wrap in { user } structure to match TeamMember
}

/**
 * Groupe les contacts de l'immeuble par type
 */
function groupBuildingContactsByType(buildingContacts: any[]): ContactsByType {
  const contacts: ContactsByType = {
    provider: [],
    owner: [],
    other: []
  }

  buildingContacts.forEach(bc => {
    if (!bc.user) return

    // Skip gestionnaires (ils sont dans buildingManagers)
    if (bc.user.role === 'gestionnaire' || bc.user.role === 'admin') return

    const contact: Contact = {
      id: bc.user.id,
      name: bc.user.name || bc.user.email,
      email: bc.user.email,
      type: bc.user.role || 'other',
      phone: bc.user.phone,
      speciality: bc.user.speciality
    }

    // Mapper selon le type
    if (bc.user.role === 'prestataire') {
      contacts.provider?.push(contact)
    } else if (bc.user.role === 'proprietaire') {
      contacts.owner?.push(contact)
    } else {
      contacts.other?.push(contact)
    }
  })

  return contacts
}

/**
 * Groupe les contacts des lots par lot ID
 */
function groupLotContactsByLot(lots: any[]): LotContactAssignments {
  const assignments: LotContactAssignments = {}

  lots.forEach(lot => {
    if (!lot.lot_contacts || lot.lot_contacts.length === 0) {
      assignments[lot.id] = {
        tenant: [],
        provider: [],
        owner: [],
        other: []
      }
      return
    }

    const lotContacts: ContactsByType = {
      tenant: [],
      provider: [],
      owner: [],
      other: []
    }

    lot.lot_contacts.forEach((lc: any) => {
      if (!lc.user) return

      // Skip gestionnaires (ils sont dans assignedManagers)
      if (lc.user.role === 'gestionnaire' || lc.user.role === 'admin') return

      const contact: Contact = {
        id: lc.user.id,
        name: lc.user.name || lc.user.email,
        email: lc.user.email,
        type: lc.user.role || 'other',
        phone: lc.user.phone,
        speciality: lc.user.speciality
      }

      // Mapper selon le type
      if (lc.user.role === 'locataire') {
        lotContacts.tenant?.push(contact)
      } else if (lc.user.role === 'prestataire') {
        lotContacts.provider?.push(contact)
      } else if (lc.user.role === 'proprietaire') {
        lotContacts.owner?.push(contact)
      } else {
        lotContacts.other?.push(contact)
      }
    })

    assignments[lot.id] = lotContacts
  })

  return assignments
}

/**
 * Groupe les gestionnaires des lots par lot ID
 * Returns { user: User }[] structure to match TeamMember structure
 */
function groupLotManagersByLot(lots: any[]): LotManagerAssignments {
  const assignments: LotManagerAssignments = {}

  lots.forEach(lot => {
    if (!lot.lot_contacts || lot.lot_contacts.length === 0) {
      assignments[lot.id] = []
      return
    }

    const managers = lot.lot_contacts
      .filter((lc: any) => lc.user && (lc.user.role === 'gestionnaire' || lc.user.role === 'admin'))
      .map((lc: any) => ({ user: lc.user }))  // Wrap in { user } structure to match TeamMember

    assignments[lot.id] = managers
  })

  return assignments
}

/**
 * Identifie si un lot ID est un ID temporaire (nouveau lot) ou DB ID (existant)
 */
export function isNewLot(lotId: string): boolean {
  // Les nouveaux lots ont des IDs comme "lot1", "lot2", etc.
  // Les lots existants ont des UUIDs
  return lotId.startsWith('lot') && !lotId.match(/^[0-9a-f-]{36}$/i)
}

/**
 * Identifie si un lot ID est un ID de base de données (UUID)
 */
export function isExistingLot(lotId: string): boolean {
  return lotId.match(/^[0-9a-f-]{36}$/i) !== null
}
