"use client"

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Building2, MapPin, Home, Users, AlertCircle, Eye, Edit, ChevronDown, Check, X, Zap } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { BuildingLotItem, BuildingData } from '@/config/table-configs/patrimoine.config'

interface BuildingCardExpandableProps {
    item: BuildingData
    isExpanded: boolean
    onToggleExpand: () => void
}

/**
 * Helper: Translate lot categories to French
 */
const getLotCategoryLabel = (category?: string): string => {
    const labels: Record<string, string> = {
        'appartement': 'Appartement',
        'collocation': 'Collocation',
        'maison': 'Maison',
        'garage': 'Garage',
        'local_commercial': 'Local commercial',
        'parking': 'Parking',
        'autre': 'Autre'
    }
    return labels[category || 'autre'] || category || 'Autre'
}

/**
 * BuildingCardExpandable - Building card with expandable lots list
 *
 * Combines the compact card design with expansion functionality from PropertySelector.
 * Shows a preview of 2 lots when collapsed, full scrollable list when expanded.
 */
export function BuildingCardExpandable({
    item,
    isExpanded,
    onToggleExpand
}: BuildingCardExpandableProps) {
    const router = useRouter()
    const building = item

    // Calculate stats
    const totalLots = building.lots?.length || 0
    const occupiedLots = building.lots?.filter(lot =>
        lot.is_occupied || lot.status === 'occupied'
    ).length || 0
    const contactsCount = building.building_contacts?.length || 0
    const interventionsCount = building.interventions_count || 0

    // BEM Classes
    const blockClass = "building-card-expandable"

    const handleCardClick = (e: React.MouseEvent) => {
        // Don't navigate if clicking on interactive elements
        const target = e.target as HTMLElement
        if (target.closest('button') || target.closest('a')) {
            return
        }
        router.push(`/gestionnaire/biens/immeubles/${building.id}`)
    }

    const handleLotClick = (lotId: string) => {
        router.push(`/gestionnaire/biens/lots/${lotId}`)
    }

    return (
        <Card
            className={cn(
                blockClass,
                "group hover:shadow-md hover:border-primary/30 transition-all duration-200 bg-white p-0",
                isExpanded && "ring-1 ring-sky-200"
            )}
        >
            <CardContent className={cn(`${blockClass}__content`, "p-4")}>
                <div className="space-y-3">
                    {/* Header - Clickable to navigate */}
                    <div
                        className={cn(`${blockClass}__header`, "flex items-start justify-between gap-2 cursor-pointer")}
                        onClick={handleCardClick}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                router.push(`/gestionnaire/biens/immeubles/${building.id}`)
                            }
                        }}
                    >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className={cn(
                                `${blockClass}__icon`,
                                "w-10 h-10 bg-sky-100 rounded-lg flex items-center justify-center flex-shrink-0"
                            )}>
                                <Building2 className="h-5 w-5 text-sky-600" />
                            </div>
                            <div className={cn(`${blockClass}__info`, "min-w-0 flex-1")}>
                                <h3 className={cn(`${blockClass}__title`, "font-semibold text-sm text-slate-900 truncate")}>
                                    {building.name}
                                </h3>
                                {(() => {
                                    const record = building.address_record
                                    let addressText = ''
                                    if (record?.formatted_address) {
                                        addressText = record.formatted_address
                                    } else if (record?.street || record?.city) {
                                        const parts = [record.street, record.postal_code, record.city].filter(Boolean)
                                        addressText = parts.join(', ')
                                    }
                                    return addressText ? (
                                        <div className={cn(`${blockClass}__subtitle`, "flex items-center text-xs text-slate-600 mt-0.5")}>
                                            <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
                                            <span className="truncate">{addressText}</span>
                                        </div>
                                    ) : null
                                })()}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className={cn(`${blockClass}__actions`, "flex items-center gap-1 flex-shrink-0")}>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-slate-500 hover:text-slate-700"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    router.push(`/gestionnaire/biens/immeubles/modifier/${building.id}`)
                                }}
                                title="Modifier"
                            >
                                <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-slate-500 hover:text-slate-700"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    router.push(`/gestionnaire/biens/immeubles/${building.id}`)
                                }}
                                title="Voir détails"
                            >
                                <Eye className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    </div>

                    {/* Stats Footer with expand button */}
                    <div className={cn(
                        `${blockClass}__footer`,
                        "flex items-center justify-between pt-2 border-t border-slate-100"
                    )}>
                        <div className="flex items-center gap-3">
                            <div className={cn(`${blockClass}__stat`, "flex items-center gap-1.5")}>
                                <div className="w-5 h-5 bg-amber-100 rounded-md flex items-center justify-center">
                                    <Home className="h-3 w-3 text-amber-600" />
                                </div>
                                <span className="text-xs font-medium text-slate-900">{totalLots}</span>
                                <span className="text-xs text-slate-600">lots</span>
                            </div>

                            <div className={cn(`${blockClass}__stat`, "flex items-center gap-1.5")}>
                                <div className="w-5 h-5 bg-emerald-100 rounded-md flex items-center justify-center">
                                    <Users className="h-3 w-3 text-emerald-600" />
                                </div>
                                <span className="text-xs font-medium text-slate-900">{occupiedLots}</span>
                                <span className="text-xs text-slate-600 hidden sm:inline">occupé(s)</span>
                            </div>

                            {contactsCount > 0 && (
                                <div className={cn(
                                    `${blockClass}__badge`,
                                    "flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 border border-blue-200 rounded text-xs"
                                )}>
                                    <Users className="w-3 h-3 text-blue-600" />
                                    <span className="text-blue-700 font-medium">{contactsCount}</span>
                                </div>
                            )}

                            {interventionsCount > 0 && (
                                <div className={cn(`${blockClass}__alert`, "flex items-center gap-1.5")}>
                                    <div className="w-5 h-5 bg-red-100 rounded-md flex items-center justify-center">
                                        <AlertCircle className="h-3 w-3 text-red-600" />
                                    </div>
                                    <span className="text-xs font-medium text-red-700">{interventionsCount}</span>
                                </div>
                            )}
                        </div>

                        {/* Expand/Collapse button */}
                        {totalLots > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onToggleExpand}
                                className="h-7 px-2 text-xs text-slate-500 hover:text-slate-900 transition-all duration-200"
                            >
                                <div className={cn(
                                    "transition-transform duration-200",
                                    isExpanded && "rotate-180"
                                )}>
                                    <ChevronDown className="h-3 w-3" />
                                </div>
                                <span className="ml-1 hidden sm:inline">
                                    {isExpanded ? "Réduire" : "Lots"}
                                </span>
                            </Button>
                        )}
                    </div>

                    {/* Lots Preview (collapsed state) - Show first 2 lots */}
                    {totalLots > 0 && !isExpanded && (
                        <div className="space-y-2 animate-in fade-in-0 slide-in-from-top-1 duration-300">
                            {building.lots?.slice(0, 2).map((lot) => {
                                const isOccupied = lot.is_occupied || lot.status === 'occupied'
                                return (
                                    <LotItemRow
                                        key={lot.id}
                                        lot={lot}
                                        isOccupied={isOccupied}
                                        onView={() => handleLotClick(lot.id)}
                                        compact
                                    />
                                )
                            })}

                            {/* Show "X more lots" button */}
                            {totalLots > 2 && (
                                <div className="text-center">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={onToggleExpand}
                                        className="h-7 px-3 text-xs text-slate-500 hover:text-slate-900 border border-dashed border-slate-300 w-full"
                                    >
                                        +{totalLots - 2} lots de plus
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Lots Full List (expanded state) */}
                    {isExpanded && totalLots > 0 && (
                        <div className="pt-2 border-t border-slate-100 animate-in fade-in-0 slide-in-from-top-2 duration-300">
                            <div className="max-h-64 overflow-y-auto overflow-x-hidden rounded-md">
                                <div className="space-y-2 pr-2">
                                    {building.lots?.map((lot) => {
                                        const isOccupied = lot.is_occupied || lot.status === 'occupied'
                                        return (
                                            <LotItemRow
                                                key={lot.id}
                                                lot={lot}
                                                isOccupied={isOccupied}
                                                onView={() => handleLotClick(lot.id)}
                                            />
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}

/**
 * LotItemRow - Individual lot row inside the building card
 */
interface LotItemRowProps {
    lot: BuildingLotItem
    isOccupied: boolean
    onView: () => void
    compact?: boolean
}

function LotItemRow({ lot, isOccupied, onView, compact = false }: LotItemRowProps) {
    const router = useRouter()
    const contactsCount = lot.lot_contacts?.length || 0
    const interventionsCount = lot.interventions_count || 0

    if (compact) {
        // Compact view for collapsed state
        return (
            <div
                className={cn(
                    "p-2.5 border border-slate-200 rounded-md bg-white hover:bg-slate-50 transition-colors cursor-pointer",
                    isOccupied && "border-l-4 border-l-green-500"
                )}
                onClick={onView}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        onView()
                    }
                }}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="font-medium text-sm text-slate-900">{lot.reference}</span>
                        <Badge
                            variant="secondary"
                            className={cn(
                                "text-xs h-4 px-1.5",
                                isOccupied ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                            )}
                        >
                            {isOccupied ? "Occupé" : "Libre"}
                        </Badge>

                        {/* Contacts badge */}
                        {contactsCount > 0 && (
                            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 border border-blue-200 rounded text-xs">
                                <Users className="w-3 h-3 text-blue-600" />
                                <span className="text-blue-700 font-medium">{contactsCount}</span>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-0.5">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-slate-500 hover:text-slate-700"
                            onClick={(e) => {
                                e.stopPropagation()
                                onView()
                            }}
                            title="Voir détails"
                        >
                            <Eye className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                </div>
            </div>
        )
    }

    // Full view for expanded state
    return (
        <div
            className={cn(
                "p-2.5 border border-slate-200 rounded-md bg-white hover:bg-slate-50 transition-colors cursor-pointer",
                isOccupied && "border-l-4 border-l-green-500"
            )}
            onClick={onView}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onView()
                }
            }}
        >
            <div className="flex items-start justify-between min-w-0">
                <div className="space-y-1 min-w-0 flex-1 mr-2">
                    {/* Line 1: Reference • Category • Status badge */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-xs text-slate-900">{lot.reference}</span>
                        <span className="text-slate-400 text-xs">•</span>
                        <span className="text-xs text-slate-600">{getLotCategoryLabel(lot.category)}</span>
                        <span className="text-slate-400 text-xs">•</span>
                        <Badge
                            variant="outline"
                            className={cn(
                                "h-5 w-5 p-0.5 flex items-center justify-center rounded-full",
                                isOccupied
                                    ? "bg-green-50 border-green-300 text-green-700"
                                    : "bg-red-50 border-red-300 text-red-700"
                            )}
                            title={isOccupied ? "Occupé" : "Libre"}
                        >
                            {isOccupied ? (
                                <Check className="h-3 w-3" />
                            ) : (
                                <X className="h-3 w-3" />
                            )}
                        </Badge>
                    </div>

                    {/* Line 2: Details (Floor, Apt #, Surface, Contacts, Interventions) */}
                    <div className="text-xs text-slate-600 flex items-center gap-2 flex-wrap">
                        {lot.floor !== undefined && (
                            <span>Étage {lot.floor}</span>
                        )}

                        {lot.apartment_number && (
                            <>
                                <span className="text-slate-400">•</span>
                                <span>Porte {lot.apartment_number}</span>
                            </>
                        )}

                        {lot.surface_area && (
                            <>
                                <span className="text-slate-400">•</span>
                                <span>{lot.surface_area}m²</span>
                            </>
                        )}

                        {lot.rooms && (
                            <>
                                <span className="text-slate-400">•</span>
                                <span>{lot.rooms}p</span>
                            </>
                        )}

                        {/* Contacts badge */}
                        {contactsCount > 0 && (
                            <>
                                <span className="text-slate-400">•</span>
                                <div className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 border border-blue-200 rounded text-xs">
                                    <Users className="w-3 h-3 text-blue-600" />
                                    <span className="text-blue-700 font-medium">{contactsCount}</span>
                                </div>
                            </>
                        )}

                        {/* Interventions count */}
                        {interventionsCount > 0 && (
                            <>
                                <span className="text-slate-400">•</span>
                                <div className="flex items-center text-amber-700">
                                    <Zap className="h-3 w-3 mr-1" />
                                    <span>{interventionsCount}</span>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-slate-500 hover:text-slate-700"
                        onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/gestionnaire/biens/lots/modifier/${lot.id}`)
                        }}
                        title="Modifier le lot"
                    >
                        <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-slate-500 hover:text-slate-700"
                        onClick={(e) => {
                            e.stopPropagation()
                            onView()
                        }}
                        title="Voir les détails du lot"
                    >
                        <Eye className="h-3 w-3" />
                    </Button>
                </div>
            </div>
        </div>
    )
}
