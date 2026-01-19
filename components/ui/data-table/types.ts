import { LucideIcon } from 'lucide-react'

export interface ColumnDef<T = any> {
    id: string
    header: string
    accessorKey?: keyof T | string
    cell?: (item: T) => React.ReactNode
    sortable?: boolean
    className?: string
    width?: string | number
}

export interface ActionConfig<T = any> {
    id: string
    label: string
    icon?: LucideIcon
    /** Click handler for the action. Optional if href is provided. */
    onClick?: (item: T) => void
    /** URL generator for navigation actions. Uses Next.js router for SPA navigation. */
    href?: (item: T) => string
    variant?: 'default' | 'destructive'
    className?: string
    show?: (item: T) => boolean
}
