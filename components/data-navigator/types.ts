import { ReactNode, ComponentType } from 'react'
import { LucideIcon } from 'lucide-react'

/**
 * Column definition for data table
 */
export interface ColumnDef<T = any> {
    id: string
    header: string
    accessorKey?: keyof T | string
    cell?: (item: T) => ReactNode
    sortable?: boolean
    width?: string
    className?: string
}

/**
 * Filter configuration
 */
export interface FilterConfig {
    id: string
    label: string
    options: Array<{
        value: string
        label: string
    }>
    defaultValue: string
}

/**
 * Tab configuration for data grouping
 */
export interface TabConfig<T = any> {
    id: string
    label: string
    icon?: LucideIcon
    filter?: (item: T) => boolean
    count?: number | string
}

/**
 * Action configuration for row actions
 */
export interface ActionConfig<T = any> {
    id: string
    label: string
    icon?: LucideIcon
    onClick: (item: T) => void | Promise<void>
    variant?: 'default' | 'ghost' | 'outline' | 'destructive'
    show?: (item: T) => boolean
    className?: string
}

/**
 * Empty state configuration
 */
export interface EmptyStateConfig {
    title: string
    description: string
    icon?: LucideIcon
    showCreateButton?: boolean
    createButtonText?: string
    createButtonAction?: () => void
}

/**
 * View mode type
 */
export type ViewMode = 'cards' | 'list'

/**
 * Card component props
 */
export interface CardComponentProps<T = any> {
    item: T
    mode?: 'view' | 'select'
    isSelected?: boolean
    onSelect?: (id: string) => void
    actions?: ActionConfig<T>[]
}

/**
 * Main data table configuration
 */
export interface DataTableConfig<T = any> {
    // Identification
    id: string
    name: string

    // Columns for list view
    columns: ColumnDef<T>[]

    // Search configuration
    searchConfig: {
        placeholder: string
        searchableFields: Array<keyof T | string>
        searchFn?: (item: T, searchTerm: string) => boolean
    }

    // Filters
    filters?: FilterConfig[]

    // Tabs for data grouping
    tabs?: TabConfig<T>[]
    defaultTab?: string

    // View modes
    views: {
        card: {
            enabled: boolean
            component: ComponentType<CardComponentProps<T>>
            compact?: boolean
        }
        list: {
            enabled: boolean
            defaultSort?: {
                field: keyof T | string
                direction: 'asc' | 'desc'
            }
        }
    }

    // Default view mode
    defaultView?: ViewMode

    // Actions
    actions?: ActionConfig<T>[]

    // Empty state
    emptyState?: EmptyStateConfig

    // Loading state
    loading?: boolean
}

/**
 * Data navigator props
 */
export interface DataNavigatorProps<T = any> {
    config: DataTableConfig<T>
    data: T[]
    loading?: boolean
    className?: string
    onRefresh?: () => void
}
