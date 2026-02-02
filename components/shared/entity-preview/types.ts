/**
 * Types for Entity Preview Layout components
 * Used by EntityPreviewLayout, EntityTabs, EntityActivityLog
 */

// ============================================================================
// Tab Configuration
// ============================================================================

/**
 * Configuration for a single tab
 */
export interface TabConfig {
  /** Unique tab identifier */
  value: string
  /** Display label */
  label: string
  /** Optional badge count */
  count?: number
  /** Whether there are unread items (shows a red dot indicator) */
  hasUnread?: boolean
}

/**
 * Pre-defined tab configurations by entity type
 */
export const ENTITY_TABS_CONFIG = {
  building: [
    { value: 'overview', label: 'Vue d\'ensemble' },
    { value: 'interventions', label: 'Interventions' },
    { value: 'documents', label: 'Documents' },
    { value: 'emails', label: 'Emails' },
    { value: 'activity', label: 'Activité' }
  ],
  lot: [
    { value: 'overview', label: 'Vue d\'ensemble' },
    { value: 'contracts', label: 'Contrats' },
    { value: 'interventions', label: 'Interventions' },
    { value: 'documents', label: 'Documents' },
    { value: 'emails', label: 'Emails' },
    { value: 'activity', label: 'Activité' }
  ],
  contract: [
    { value: 'overview', label: 'Aperçu' },
    { value: 'contacts', label: 'Contacts' },
    { value: 'documents', label: 'Documents' },
    { value: 'emails', label: 'Emails' },
    { value: 'tasks', label: 'Tâches' },
    { value: 'activity', label: 'Activité' }
  ],
  contact: [
    { value: 'overview', label: 'Aperçu' },
    { value: 'properties', label: 'Biens' },
    { value: 'interventions', label: 'Interventions' },
    { value: 'emails', label: 'Emails' },
    { value: 'activity', label: 'Activité' }
  ]
} as const satisfies Record<string, TabConfig[]>

export type EntityType = keyof typeof ENTITY_TABS_CONFIG

// ============================================================================
// Intervention Tabs Configuration (role-based)
// ============================================================================

/**
 * User role for intervention tabs
 */
export type InterventionUserRole = 'manager' | 'provider' | 'tenant'

/**
 * Get tabs configuration for intervention based on user role
 * Migrated from InterventionTabs component for unification with EntityTabs
 */
export function getInterventionTabsConfig(role: InterventionUserRole): TabConfig[] {
  // Base tabs common to all roles
  const baseTabs: TabConfig[] = [
    { value: 'general', label: 'Général' },
    { value: 'conversations', label: 'Conversations' }
  ]

  switch (role) {
    case 'manager':
      return [
        ...baseTabs,
        { value: 'planning', label: 'Planning' },
        { value: 'documents', label: 'Documents' },
        { value: 'contacts', label: 'Contacts' },
        { value: 'emails', label: 'Emails' },
        { value: 'activity', label: 'Activité' }
      ]
    case 'provider':
      return [
        ...baseTabs,
        { value: 'planning', label: 'Planning' },
        { value: 'activity', label: 'Activité' }
      ]
    case 'tenant':
      return [
        ...baseTabs,
        { value: 'planning', label: 'Rendez-vous' },
        { value: 'activity', label: 'Activité' }
      ]
  }
}

// ============================================================================
// Activity Log Types
// ============================================================================

/**
 * Activity log entry from the API/RPC function
 */
export interface ActivityLogEntry {
  id: string
  team_id: string
  user_id: string | null
  action_type: string
  entity_type: string
  entity_id: string | null
  entity_name: string | null
  description: string
  status: 'success' | 'failure' | 'pending'
  metadata: Record<string, unknown> | null
  error_message: string | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
  // User info
  user_name: string | null
  user_email: string | null
  user_avatar_url: string | null
  user_role: string | null
  // Source entity info (for related entities)
  source_entity_type?: string | null
  source_entity_name?: string | null
}

/**
 * Grouped activity logs by date
 */
export interface GroupedActivityLogs {
  date: string  // ISO date string (YYYY-MM-DD)
  dateLabel: string  // Formatted label (e.g., "Jeudi 30 janvier 2026")
  logs: ActivityLogEntry[]
}

// ============================================================================
// Component Props
// ============================================================================

/**
 * Props for EntityPreviewLayout
 */
export interface EntityPreviewLayoutProps {
  children: React.ReactNode
  className?: string
}

/**
 * Props for EntityTabs
 */
export interface EntityTabsProps {
  /** Currently active tab */
  activeTab: string
  /** Callback when tab changes */
  onTabChange: (tab: string) => void
  /** Tab configuration */
  tabs: TabConfig[]
  /** Tab content */
  children: React.ReactNode
  /** Additional CSS classes */
  className?: string
}

/**
 * Props for EntityActivityLog
 */
export interface EntityActivityLogProps {
  /** Entity type for hierarchical loading */
  entityType: 'building' | 'lot' | 'contract' | 'contact' | 'intervention'
  /** Entity ID */
  entityId: string
  /** Team ID (required for API call) */
  teamId: string
  /** Include related entities in logs (default: true) */
  includeRelated?: boolean
  /** Show navigation links to entities (default: true) */
  showEntityLinks?: boolean
  /** Show technical metadata details (default: false) */
  showMetadata?: boolean
  /** Custom empty state message */
  emptyMessage?: string
  /** Additional CSS classes */
  className?: string
}

/**
 * Props for TabContentWrapper
 */
export interface TabContentWrapperProps {
  /** Tab value (for TabsContent) */
  value: string
  /** Content */
  children: React.ReactNode
  /** Additional CSS classes */
  className?: string
}
