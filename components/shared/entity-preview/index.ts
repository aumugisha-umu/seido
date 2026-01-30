/**
 * Entity Preview Components
 *
 * Unified layout and components for entity preview pages
 * (Building, Lot, Contract, Contact, Intervention)
 *
 * @example
 * import {
 *   EntityPreviewLayout,
 *   EntityTabs,
 *   TabContentWrapper,
 *   EntityActivityLog,
 *   ENTITY_TABS_CONFIG,
 *   getInterventionTabsConfig
 * } from '@/components/shared/entity-preview'
 */

// Layout
export { EntityPreviewLayout, TabPanelWrapper } from './entity-preview-layout'

// Tabs
export { EntityTabs, TabContentWrapper } from './entity-tabs'

// Activity Log
export { EntityActivityLog } from './entity-activity-log'

// Types
export type {
  TabConfig,
  EntityType,
  InterventionUserRole,
  ActivityLogEntry,
  GroupedActivityLogs,
  EntityPreviewLayoutProps,
  EntityTabsProps,
  EntityActivityLogProps,
  TabContentWrapperProps
} from './types'

// Constants & Helpers
export { ENTITY_TABS_CONFIG, getInterventionTabsConfig } from './types'
