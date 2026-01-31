/**
 * Tenant Data Transformation Utilities
 *
 * Transforme les données du TenantService vers le format composant.
 * Pattern aligné sur lot-transform.ts et building-transform.ts
 *
 * @see lib/services/domain/tenant.service.ts - Source des données
 * @see hooks/use-tenant-data.ts - Types cibles
 *
 * NOTE: Les types sont définis localement pour éviter les dépendances circulaires
 * avec use-tenant-data.ts qui importe les fonctions de ce module.
 */

import type { TenantData as ServiceTenantData, TenantContractStatus } from '@/lib/services/domain/tenant.service'

/**
 * Type local pour le format composant (copie de HookTenantData)
 * Défini ici pour éviter la dépendance circulaire avec use-tenant-data.ts
 */
interface TransformedTenantLot {
  id: string
  reference: string
  floor?: number
  apartment_number?: string
  description?: string
  surface_area?: number
  rooms?: number
  charges_amount?: number
  category?: string
  building?: {
    id: string
    name: string
    description?: string
    address_record?: {
      street?: string
      city?: string
      postal_code?: string
      formatted_address?: string
    } | null
  } | null
  is_primary?: boolean
  contract?: {
    start_date?: string
    end_date?: string
    rent_amount?: number
    charges_amount?: number
    status?: 'actif' | 'a_venir'
  }
}

/**
 * Type local pour les interventions transformées
 */
interface TransformedIntervention {
  id: string
  title: string
  description: string
  status: string
  created_at: string
  completed_date?: string
  urgency: string
  type: string
  lot?: {
    id?: string
    reference: string
    building?: {
      id?: string
      name: string
    }
  }
  building?: {
    id: string
    name: string
    address?: string
  } | null
  assigned_contact?: {
    name: string
    phone: string
    email: string
  }
}

/**
 * Type local pour les interventions brutes
 */
interface RawInterventionInput {
  id: string
  title: string
  description?: string
  status: string
  created_at: string
  completed_date?: string
  urgency?: string
  intervention_type?: string
  type?: string
  lot?: {
    reference: string
    building?: {
      name: string
    }
  }
  assigned_contact?: {
    name: string
    phone: string
    email: string
  }
}

/**
 * Transforme un lot du service vers le format composant
 *
 * Cette fonction centralise la logique de transformation pour éviter
 * les divergences entre le SSR (locataire-dashboard.tsx) et le hook (use-tenant-data.ts)
 *
 * NOTE: surface_area et rooms sont stockés dans lot.metadata (JSON)
 * car ils ne sont pas des colonnes directes de la table `lots`
 */
export function transformTenantLotForClient(item: ServiceTenantData['lots'][0]): TransformedTenantLot {
  // Extract metadata for optional fields (surface_area, rooms)
  const lotMetadata = (item.lot as any).metadata || {}

  return {
    id: item.lot.id,
    reference: item.lot.reference,
    floor: item.lot.floor,
    apartment_number: item.lot.apartment_number,
    description: item.lot.description,
    // ✅ surface_area et rooms sont dans metadata (pas des colonnes directes)
    surface_area: lotMetadata.surface_area,
    rooms: lotMetadata.rooms,
    charges_amount: item.lot.charges_amount,
    category: item.lot.category,
    building: item.lot.building || null,
    is_primary: item.is_primary,
    // ✅ Contract data - CRITIQUE pour Property Info Card
    contract: {
      start_date: item.start_date,
      end_date: item.end_date,
      rent_amount: item.rent_amount,
      charges_amount: item.charges_amount,
      status: item.contractStatus as 'actif' | 'a_venir'
    }
  }
}

/**
 * Transforme toutes les données tenant du service vers le format composant
 *
 * @param serverData - Données brutes du TenantService
 * @returns Object avec tenantData (primary), tenantProperties (all), et contractStatus
 */
export function transformTenantDataForClient(serverData: ServiceTenantData): {
  tenantData: TransformedTenantLot | null
  tenantProperties: TransformedTenantLot[]
  contractStatus: TenantContractStatus
} {
  const tenantProperties = serverData.lots.map(transformTenantLotForClient)
  const tenantData = tenantProperties.find(p => p.is_primary) || tenantProperties[0] || null

  return {
    tenantData,
    tenantProperties,
    contractStatus: serverData.contractStatus
  }
}

/**
 * Transforme une intervention brute vers le format composant
 *
 * @param i - Intervention brute du service
 * @returns TenantIntervention formatée pour les composants
 */
export function transformInterventionForClient(i: RawInterventionInput): TransformedIntervention {
  return {
    id: i.id,
    title: i.title,
    description: i.description || '',
    status: i.status,
    created_at: i.created_at,
    completed_date: i.completed_date,
    urgency: i.urgency || 'normale',
    type: i.intervention_type || i.type || 'autre',
    lot: i.lot,
    building: (i as any).building || null,
    assigned_contact: i.assigned_contact
  }
}
