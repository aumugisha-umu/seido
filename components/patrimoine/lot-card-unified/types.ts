/**
 * LotCardUnified - Types and Interfaces
 *
 * Unified type definitions for the lot card component used across:
 * - Patrimoine list (lots tab)
 * - Building details (lots section)
 * - Property selector (contract creation)
 */

import type { LotCategory } from "@/lib/lot-types"

// ============================================================================
// CONTACT TYPES
// ============================================================================

/**
 * Contact linked directly to a lot (lot_contacts table)
 */
export interface LotContact {
  id: string
  user_id: string
  is_primary: boolean
  user: {
    id: string
    name: string
    email: string
    phone?: string | null
    role: string
    provider_category?: string
    speciality?: string
  }
}

/**
 * Contact linked via a contract (contract_contacts table)
 */
export interface ContractContact {
  id: string
  role: 'locataire' | 'colocataire' | 'garant' | 'representant_legal' | 'autre'
  is_primary?: boolean
  user: {
    id: string
    name: string
    email: string | null
    phone?: string | null
  }
}

/**
 * Contract with its contacts (for expanded view)
 */
export interface LotContract {
  id: string
  title: string
  status: string
  start_date: string
  end_date: string
  contacts: ContractContact[]
}

/**
 * Base contact format for display
 */
export interface BaseContact {
  id: string
  name: string
  email: string
  phone?: string | null
  type?: string
  company?: string | null
  speciality?: string
}

// ============================================================================
// BUILDING CONTEXT (for inherited contacts)
// ============================================================================

export interface BuildingContext {
  id: string
  name: string
  address?: string
  city?: string
  // Inherited contacts from building (displayed in expanded mode)
  managers?: BaseContact[]
  tenants?: BaseContact[]
  providers?: BaseContact[]
  owners?: BaseContact[]
  others?: BaseContact[]
}

// ============================================================================
// LOT DATA
// ============================================================================

/**
 * Main lot data interface matching database schema
 */
export interface LotData {
  id: string
  reference: string
  category?: LotCategory | string
  floor?: number
  apartment_number?: string
  door_number?: string
  surface_area?: number
  rooms?: number
  status?: string
  is_occupied?: boolean
  has_active_tenants?: boolean
  tenant_id?: string | null // Deprecated - for backward compatibility
  tenant?: {
    id: string
    name: string
  }
  lot_contacts?: LotContact[]
  lot_tenants?: Array<{ // Deprecated - for backward compatibility
    contact?: { name: string }
    is_primary?: boolean
  }>
  building?: {
    id: string
    name: string
    address?: string
    city?: string
  }
  building_id?: string
  contracts?: LotContract[]
  interventions_count?: number
}

// ============================================================================
// COMPONENT PROPS
// ============================================================================

/**
 * Display variant
 * - compact: Just the card header with badges (no expansion)
 * - expandable: Compact + chevron + collapsible content
 */
export type LotCardVariant = 'compact' | 'expandable'

/**
 * Interaction mode
 * - view: Normal view with edit/view actions
 * - select: Selection mode for forms (property selector)
 */
export type LotCardMode = 'view' | 'select'

/**
 * Lookup map for contact removal (prevents N+1 queries)
 */
export type LotContactIdsMap = Record<string, {
  lotId: string
  lotContactId: string
  lotReference: string
}>

/**
 * Main component props
 */
export interface LotCardUnifiedProps {
  // Required
  lot: LotData

  // Display configuration
  variant?: LotCardVariant              // default: 'compact'
  mode?: LotCardMode                    // default: 'view'

  // State
  isSelected?: boolean                  // For selection mode
  isExpanded?: boolean                  // External control of expansion
  defaultExpanded?: boolean             // Initial expansion state

  // Context flags
  showBuilding?: boolean                // Show building name (for Patrimoine list)
  showInterventionsCount?: boolean      // Show interventions badge

  // Building context (for inherited contacts in expanded mode)
  buildingContext?: BuildingContext

  // Contact management IDs (for removal actions)
  lotContactIdsMap?: LotContactIdsMap
  teamId?: string                       // For contact selector modal

  // Interventions data (optional)
  interventions?: Array<{ id: string; lot_id: string }>

  // Callbacks
  onSelect?: (lotId: string | null, buildingId?: string) => void
  onExpand?: (expanded: boolean) => void

  // Contact management callbacks (for expanded mode)
  onAddContact?: (sectionType: string, lotId: string) => void
  onRemoveContact?: (contactId: string, lotId: string) => void

  // Custom actions configuration
  customActions?: {
    showDropdown?: boolean
  }

  // Styling
  className?: string
}

// ============================================================================
// SUBCOMPONENT PROPS
// ============================================================================

export interface LotCardHeaderProps {
  lot: LotData
  showBuilding?: boolean
  isOccupied: boolean
  contactsCount: number
}

export interface LotCardBadgesProps {
  lot: LotData
  isOccupied: boolean
  contactsCount: number
  interventionsCount?: number
  showInterventionsCount?: boolean
  /** Show floor, door number, surface and rooms (default: false for compact view) */
  showDetails?: boolean
}

export interface LotCardActionsProps {
  lot: LotData
  mode: LotCardMode
  isSelected: boolean
  isExpanded?: boolean
  variant?: LotCardVariant
  onSelect?: (lotId: string | null, buildingId?: string) => void
  onToggleExpand?: () => void
  showDropdown?: boolean
}

export interface LotCardExpandedContentProps {
  lot: LotData
  buildingContext?: BuildingContext
  lotContactIdsMap?: LotContactIdsMap
  teamId?: string
  onAddContact?: (sectionType: string, lotId: string) => void
  onRemoveContact?: (contactId: string, lotId: string) => void
  readOnly?: boolean
}

// ============================================================================
// HELPER TYPES
// ============================================================================

/**
 * Transformed contacts by role (for display)
 */
export interface TransformedContacts {
  managers: BaseContact[]
  tenants: BaseContact[]
  providers: BaseContact[]
  owners: BaseContact[]
  others: BaseContact[]
}
