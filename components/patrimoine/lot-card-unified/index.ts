/**
 * LotCardUnified - Unified Lot Card Component
 *
 * A single, reusable lot card component that replaces:
 * - lot-card.tsx (Patrimoine list)
 * - lots-with-contacts-preview.tsx (Building details)
 * - lot-card-compact.tsx (Data navigator)
 *
 * @example
 * // Compact mode (Patrimoine list)
 * <LotCardUnified
 *   lot={lot}
 *   variant="compact"
 *   showBuilding={true}
 * />
 *
 * @example
 * // Expandable mode (Building details)
 * <LotCardUnified
 *   lot={lot}
 *   variant="expandable"
 *   buildingContext={buildingContext}
 *   onAddContact={handleAddContact}
 *   onRemoveContact={handleRemoveContact}
 * />
 *
 * @example
 * // Selection mode (Property selector)
 * <LotCardUnified
 *   lot={lot}
 *   mode="select"
 *   isSelected={selectedLotId === lot.id}
 *   onSelect={handleSelect}
 * />
 */

// Main component
export { LotCardUnified, default } from './lot-card-unified'

// Wrapper for data-navigator/table pattern
export { LotCardWrapper, type CardComponentProps } from './lot-card-wrapper'

// Grid component for building details page
export { BuildingLotsGrid } from './building-lots-grid'

// Subcomponents (for custom compositions)
export { LotCardHeader, LotCardBadges, transformContactsByRole, countContacts, calculateOccupancy } from './lot-card-header'
export { LotCardActions } from './lot-card-actions'
export { LotCardExpandedContent } from './lot-card-expanded-content'

// Types
export type {
  // Main props
  LotCardUnifiedProps,
  LotCardVariant,
  LotCardMode,

  // Data types
  LotData,
  LotContact,
  ContractContact,
  LotContract,
  BaseContact,
  BuildingContext,
  LotContactIdsMap,
  TransformedContacts,

  // Subcomponent props
  LotCardHeaderProps,
  LotCardBadgesProps,
  LotCardActionsProps,
  LotCardExpandedContentProps,
} from './types'
