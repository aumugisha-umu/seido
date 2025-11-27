"use client"

import { Skeleton } from '@/components/ui/skeleton'
import type { CardComponentProps, ActionConfig } from '../data-navigator/types'

interface DataCardsProps<T = any> {
    data: T[]
    CardComponent: React.ComponentType<CardComponentProps<T>>
    actions?: ActionConfig<T>[]
    loading?: boolean
    emptyMessage?: string
    compact?: boolean
    mode?: 'view' | 'select'
    selectedId?: string
    onSelect?: (id: string) => void
}

export function DataCards<T extends { id: string }>({
    data,
    CardComponent,
    actions = [],
    loading = false,
    emptyMessage = 'Aucune donnée disponible',
    compact = false,
    mode = 'view',
    selectedId,
    onSelect
}: DataCardsProps<T>) {
    if (loading) {
        return (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center space-x-3">
                            <Skeleton className="h-10 w-10 rounded-lg" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-5 w-32" />
                                <Skeleton className="h-4 w-48" />
                            </div>
                            <Skeleton className="h-8 w-20" />
                        </div>
                        <div className="flex items-center space-x-4">
                            <Skeleton className="h-6 w-16" />
                            <Skeleton className="h-6 w-20" />
                            <Skeleton className="h-6 w-12" />
                        </div>
                    </div>
                ))}
            </div>
        )
    }

    if (data.length === 0) {
        return (
            <div className="col-span-full text-center py-12 px-4">
                <p className="text-slate-500">{emptyMessage}</p>
            </div>
        )
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
            {data.map((item) => (
                <CardComponent
                    key={item.id}
                    item={item}
                    mode={mode}
                    isSelected={selectedId === item.id}
                    onSelect={onSelect}
                    actions={actions}
                />
            ))}
        </div>
    )
}
