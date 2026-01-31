/**
 * Intervention Location Utility Functions
 *
 * Provides unified formatting for intervention location display
 * across the entire application (table list, cards, details, etc.)
 *
 * Format: "Building Name › Lot REF • Address"
 * Example: "Anderlecht Square › Lot AND-A01 • 56 Place de la Vaillance"
 */

/**
 * Minimal intervention data needed for location formatting
 */
/** Address record structure from centralized addresses table */
interface AddressRecord {
  street?: string | null
  postal_code?: string | null
  city?: string | null
  formatted_address?: string | null
}

export interface InterventionLocationData {
  lot?: {
    reference?: string
    /** Lot's own address_record (for independent lots) */
    address_record?: AddressRecord | null
    building?: {
      name?: string
      address_record?: AddressRecord | null
    }
  }
  building?: {
    name?: string
    address_record?: AddressRecord | null
  }
  location?: string
}

/**
 * Formatted location result with all components
 */
export interface FormattedLocation {
  /** Main text: "Anderlecht Square › Lot AND-A01" */
  primary: string
  /** Full address: "56 Place de la Vaillance, 1070 Bruxelles" */
  address: string | null
  /** Building name for separate display */
  buildingName: string | null
  /** Lot reference for separate display */
  lotReference: string | null
  /** Icon type to use */
  icon: 'building' | 'mapPin'
}

/**
 * Formats intervention location uniformly across the app
 *
 * Business rules:
 * - If lot + building: "Building Name › Lot REF"
 * - If lot only: "Lot REF"
 * - If building only: "Building Name"
 * - Fallback: intervention.location or "Non spécifié"
 *
 * @param intervention - The intervention object with location data
 * @returns Formatted location with all components
 */
export function formatInterventionLocation(
  intervention: InterventionLocationData
): FormattedLocation {
  // Get building from lot or direct intervention building
  const building = intervention.lot?.building || intervention.building
  const buildingName = building?.name || null
  const lotReference = intervention.lot?.reference || null

  // Build address string from address_record
  // Priority: lot's own address_record (independent lots), then building's address_record
  let address: string | null = null
  const lotAddressRecord = intervention.lot?.address_record
  const buildingAddressRecord = building?.address_record
  const addressRecord = lotAddressRecord || buildingAddressRecord

  if (addressRecord?.formatted_address) {
    address = addressRecord.formatted_address
  } else if (addressRecord?.street || addressRecord?.city) {
    const parts = [addressRecord.street, addressRecord.postal_code, addressRecord.city].filter(Boolean)
    address = parts.length > 0 ? parts.join(', ') : null
  }

  // Build primary text
  let primary: string
  if (lotReference && buildingName) {
    // Both lot and building: "Building › Lot REF"
    primary = `${buildingName} › Lot ${lotReference}`
  } else if (lotReference) {
    // Lot only: "Lot REF"
    primary = `Lot ${lotReference}`
  } else if (buildingName) {
    // Building only: "Building Name"
    primary = buildingName
  } else {
    // Fallback
    primary = intervention.location || 'Non spécifié'
  }

  return {
    primary,
    address,
    buildingName,
    lotReference,
    icon: lotReference ? 'mapPin' : 'building'
  }
}
