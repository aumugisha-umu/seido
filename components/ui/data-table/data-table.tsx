"use client"

import { useState, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { MoreVertical, ArrowUpDown } from 'lucide-react'
import type { ColumnDef, ActionConfig } from './types'

interface DataTableProps<T = any> {
    data: T[]
    columns: ColumnDef<T>[]
    actions?: ActionConfig<T>[]
    loading?: boolean
    emptyMessage?: string
    onSort?: (columnId: string, direction: 'asc' | 'desc') => void
}

export function DataTable<T extends Record<string, any>>({
    data,
    columns,
    actions = [],
    loading = false,
    emptyMessage = 'Aucune donnée disponible',
    onSort
}: DataTableProps<T>) {
    const [sortColumn, setSortColumn] = useState<string | null>(null)
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

    // Get value from nested path (e.g., "building.name")
    const getNestedValue = (obj: any, path: string): any => {
        return path.split('.').reduce((current, key) => current?.[key], obj)
    }

    // Handle column sort
    const handleSort = (columnId: string) => {
        const newDirection = sortColumn === columnId && sortDirection === 'asc' ? 'desc' : 'asc'
        setSortColumn(columnId)
        setSortDirection(newDirection)
        onSort?.(columnId, newDirection)
    }

    // Sort data
    const sortedData = useMemo(() => {
        if (!sortColumn) return data

        return [...data].sort((a, b) => {
            const column = columns.find(col => col.id === sortColumn)
            if (!column?.accessorKey) return 0

            const aValue = getNestedValue(a, column.accessorKey as string)
            const bValue = getNestedValue(b, column.accessorKey as string)

            if (aValue === bValue) return 0
            if (aValue === null || aValue === undefined) return 1
            if (bValue === null || bValue === undefined) return -1

            const comparison = aValue < bValue ? -1 : 1
            return sortDirection === 'asc' ? comparison : -comparison
        })
    }, [data, sortColumn, sortDirection, columns])

    // Filter visible actions for each row
    const getVisibleActions = (item: T) => {
        return actions.filter(action => !action.show || action.show(item))
    }

    if (loading) {
        return (
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            {columns.map(column => (
                                <TableHead key={column.id} className={column.className}>
                                    {column.header}
                                </TableHead>
                            ))}
                            {actions.length > 0 && <TableHead className="w-[70px]">Actions</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {[...Array(5)].map((_, i) => (
                            <TableRow key={i}>
                                {columns.map(column => (
                                    <TableCell key={column.id}>
                                        <div className="h-4 bg-slate-200 rounded animate-pulse" />
                                    </TableCell>
                                ))}
                                {actions.length > 0 && (
                                    <TableCell>
                                        <div className="h-8 w-8 bg-slate-200 rounded animate-pulse" />
                                    </TableCell>
                                )}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        )
    }

    if (sortedData.length === 0) {
        return (
            <div className="rounded-md border border-dashed border-slate-300 p-12 text-center">
                <p className="text-slate-500">{emptyMessage}</p>
            </div>
        )
    }

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        {columns.map(column => (
                            <TableHead
                                key={column.id}
                                className={column.className}
                                style={{ width: column.width }}
                            >
                                {column.sortable ? (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="-ml-3 h-8 data-[state=open]:bg-accent"
                                        onClick={() => handleSort(column.id)}
                                    >
                                        <span>{column.header}</span>
                                        <ArrowUpDown className="ml-2 h-4 w-4" />
                                    </Button>
                                ) : (
                                    column.header
                                )}
                            </TableHead>
                        ))}
                        {actions.length > 0 && (
                            <TableHead key="actions-header" className="w-[70px]">Actions</TableHead>
                        )}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {sortedData.map((item, index) => {
                        const visibleActions = getVisibleActions(item)
                        // Utiliser un identifiant unique : id si disponible, sinon index avec préfixe pour éviter les collisions
                        const itemId = item.id || `row-${index}`

                        return (
                            <TableRow key={itemId}>
                                {columns.map((column, colIndex) => {
                                    const cellKey = `${itemId}-col-${column.id}-${colIndex}`
                                    return (
                                        <TableCell key={cellKey} className={column.className}>
                                            {column.cell
                                                ? column.cell(item)
                                                : column.accessorKey
                                                    ? getNestedValue(item, column.accessorKey as string)
                                                    : null
                                            }
                                        </TableCell>
                                    )
                                })}
                                {actions.length > 0 && (
                                    <TableCell key={`${itemId}-actions`}>
                                        {visibleActions.length > 0 && (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        className="h-8 w-8 p-0"
                                                    >
                                                        <span className="sr-only">Ouvrir le menu</span>
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    {visibleActions.map((action, idx) => {
                                                        const Icon = action.icon
                                                        const actionKey = action.id || `action-${idx}`
                                                        return (
                                                            <div key={actionKey}>
                                                                {idx > 0 && visibleActions[idx - 1]?.variant === 'destructive' && action.variant !== 'destructive' && (
                                                                    <DropdownMenuSeparator key={`separator-${actionKey}`} />
                                                                )}
                                                                <DropdownMenuItem
                                                                    key={`item-${actionKey}`}
                                                                    onClick={() => action.onClick(item)}
                                                                    className={action.className}
                                                                >
                                                                    {Icon && <Icon className="mr-2 h-4 w-4" />}
                                                                    <span>{action.label}</span>
                                                                </DropdownMenuItem>
                                                            </div>
                                                        )
                                                    })}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        )}
                                    </TableCell>
                                )}
                            </TableRow>
                        )
                    })}
                </TableBody>
            </Table>
        </div>
    )
}
