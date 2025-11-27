"use client"

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Home, MapPin, Users, Building2, Eye, Edit, Check, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { getLotCategoryConfig } from '@/lib/lot-types'
import type { CardComponentProps } from '@/components/data-navigator/types'
import { cn } from '@/lib/utils'

interface LotData {
    id: string
    reference: string
    category?: string
    floor?: number
    apartment_number?: string
    surface_area?: number
    rooms?: number
    status?: string
    is_occupied?: boolean
    lot_contacts?: Array<{ user?: { id: string; name: string; role: string } }>
    building?: {
        id: string
        name: string
        address?: string
        city?: string
    }
    interventions_count?: number
}

export function LotCardCompact({ item, actions }: CardComponentProps<LotData>) {
    const router = useRouter()
    const lot = item

    const tenants = lot.lot_contacts?.filter(lc => lc.user?.role === 'locataire') || []
    const isOccupied = tenants.length > 0 || lot.is_occupied || lot.status === 'occupied'
    const categoryConfig = lot.category ? getLotCategoryConfig(lot.category) : null

    // BEM Classes
    const blockClass = "lot-card"

    return (
        <Card className={cn(
            blockClass,
            "group hover:shadow-md transition-all duration-200 h-full bg-white p-0",
            isOccupied ? 'border-l-4 border-l-green-500' : 'border-l-4 border-l-gray-300'
        )}>
            <CardContent className={cn(`${blockClass}__content`, "p-4")}>
                <div className="space-y-3">
                    {/* Header */}
                    <div className={cn(`${blockClass}__header`, "flex items-start justify-between gap-2")}>
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className={cn(
                                `${blockClass}__icon`,
                                "w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0"
                            )}>
                                <Home className="h-5 w-5 text-amber-600" />
                            </div>
                            <div className={cn(`${blockClass}__info`, "min-w-0 flex-1")}>
                                <h3 className={cn(`${blockClass}__title`, "font-semibold text-sm text-slate-900 truncate")}>
                                    {lot.reference}
                                </h3>
                                {lot.building && (
                                    <div className={cn(`${blockClass}__subtitle`, "flex items-center text-xs text-slate-600 mt-0.5")}>
                                        <Building2 className="h-3 w-3 mr-1 flex-shrink-0" />
                                        <span className="truncate">{lot.building.name}</span>
                                    </div>
                                )}
                                {lot.apartment_number && (
                                    <div className={cn(`${blockClass}__detail`, "text-xs text-slate-600 mt-0.5")}>
                                        N° {lot.apartment_number}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className={cn(`${blockClass}__actions`, "flex items-center gap-1 flex-shrink-0")}>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-slate-500 hover:text-slate-700"
                                onClick={() => router.push(`/gestionnaire/biens/lots/modifier/${lot.id}`)}
                                title="Modifier"
                            >
                                <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-slate-500 hover:text-slate-700"
                                onClick={() => router.push(`/gestionnaire/biens/lots/${lot.id}`)}
                                title="Voir détails"
                            >
                                <Eye className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    </div>

                    {/* Footer: Badges and Stats */}
                    <div className={cn(
                        `${blockClass}__footer`,
                        "flex items-center flex-wrap gap-2 pt-2 border-t border-slate-100"
                    )}>
                        {/* Category */}
                        {categoryConfig && (
                            <Badge
                                variant="outline"
                                className={cn(
                                    `${blockClass}__badge-category`,
                                    categoryConfig.bgColor,
                                    categoryConfig.borderColor,
                                    categoryConfig.color,
                                    "text-xs h-5 px-2"
                                )}
                            >
                                {categoryConfig.label}
                            </Badge>
                        )}

                        {/* Occupation Status */}
                        <Badge
                            variant={isOccupied ? "default" : "secondary"}
                            className={cn(
                                `${blockClass}__badge-status`,
                                "text-xs h-5 px-2",
                                isOccupied ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                            )}
                        >
                            <span className="flex items-center gap-1">
                                {isOccupied ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                                {isOccupied ? "Occupé" : "Libre"}
                            </span>
                        </Badge>

                        {/* Floor */}
                        {lot.floor !== undefined && (
                            <span className={cn(`${blockClass}__stat`, "text-xs text-slate-600")}>
                                Étage {lot.floor}
                            </span>
                        )}

                        {/* Surface */}
                        {lot.surface_area && (
                            <span className={cn(`${blockClass}__stat`, "text-xs text-slate-600")}>
                                {lot.surface_area}m²
                            </span>
                        )}

                        {/* Rooms */}
                        {lot.rooms && (
                            <span className={cn(`${blockClass}__stat`, "text-xs text-slate-600")}>
                                {lot.rooms} pièces
                            </span>
                        )}

                        {/* Contacts */}
                        {tenants.length > 0 && (
                            <div className={cn(
                                `${blockClass}__badge-contacts`,
                                "flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 border border-blue-200 rounded text-xs"
                            )}>
                                <Users className="w-3 h-3 text-blue-600" />
                                <span className="text-blue-700 font-medium">{tenants.length}</span>
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
