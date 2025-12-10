"use client"

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Building2, MapPin, Home, Users, AlertCircle, Eye, Edit } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { CardComponentProps } from '@/components/data-navigator/types'
import { cn } from '@/lib/utils'

interface BuildingData {
    id: string
    name: string
    address: string
    city?: string
    lots?: Array<{ id: string; status?: string }>
    building_contacts?: Array<{ user?: { id: string; name: string; role: string } }>
    interventions_count?: number
}

export function BuildingCardCompact({ item, actions }: CardComponentProps<BuildingData>) {
    const router = useRouter()
    const building = item

    const totalLots = building.lots?.length || 0
    const occupiedLots = building.lots?.filter(lot => lot.status === 'occupied').length || 0
    const contactsCount = building.building_contacts?.length || 0
    const interventionsCount = building.interventions_count || 0

    // BEM Classes
    const blockClass = "building-card"

    const handleCardClick = () => {
        router.push(`/gestionnaire/biens/immeubles/${building.id}`)
    }

    return (
        <Card
            className={cn(
                blockClass,
                "group hover:shadow-md hover:border-primary/30 transition-all duration-200 h-full bg-white p-0 cursor-pointer"
            )}
            onClick={handleCardClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleCardClick()
                }
            }}
        >
            <CardContent className={cn(`${blockClass}__content`, "p-4")}>
                <div className="space-y-3">
                    {/* Header */}
                    <div className={cn(`${blockClass}__header`, "flex items-start justify-between gap-2")}>
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
                                <div className={cn(`${blockClass}__subtitle`, "flex items-center text-xs text-slate-600 mt-0.5")}>
                                    <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
                                    <span className="truncate">{building.address}</span>
                                </div>
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

                    {/* Stats Footer */}
                    <div className={cn(
                        `${blockClass}__footer`,
                        "flex items-center gap-3 pt-2 border-t border-slate-100"
                    )}>
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
                </div>
            </CardContent>
        </Card>
    )
}
