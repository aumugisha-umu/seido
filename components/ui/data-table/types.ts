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
    onClick: (item: T) => void
    variant?: 'default' | 'destructive'
    className?: string
    show?: (item: T) => boolean
}
