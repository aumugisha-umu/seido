"use client"

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    MapPin,
    Calendar,
    Eye,
    Droplets,
    Zap,
    Flame,
    Key,
    Paintbrush,
    Hammer,
    Wrench,
    Clock
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { InterventionWithRelations } from '@/lib/services'
import {
    getStatusColor,
    getStatusLabel,
    getPriorityColor,
    getPriorityLabel,
    getInterventionLocationText,
    getTypeBadgeColor,
    getStatusActionMessage
} from '@/lib/intervention-utils'
import { shouldShowAlertBadge } from '@/lib/intervention-alert-utils'
import { InterventionActionButtons } from '@/components/intervention/intervention-action-buttons'

interface InterventionCardCompactProps {
    intervention: InterventionWithRelations
    userContext?: 'gestionnaire' | 'prestataire' | 'locataire'
    userId?: string
    actionHooks?: {
        approvalHook?: {
            handleApprovalAction?: (intervention: unknown, action: string) => void
        }
        quotingHook?: {
            handleQuoteRequest?: (intervention: unknown) => void
        }
        planningHook?: {
            handleProgrammingModal?: (intervention: unknown) => void
        }
        executionHook?: {
            handleExecutionModal?: (intervention: unknown, type: string) => void
        }
        finalizationHook?: {
            handleFinalizeModal?: (intervention: unknown) => void
        }
    }
    onActionComplete?: () => void
}

export function InterventionCardCompact({
    intervention,
    userContext = 'gestionnaire',
    userId,
    actionHooks,
    onActionComplete
}: InterventionCardCompactProps) {
    const router = useRouter()
    const [isHovered, setIsHovered] = useState(false)

    // Cast to any to avoid strict type checks on helpers for now
    const isAlert = shouldShowAlertBadge(intervention as any, userContext, userId)
    const locationText = getInterventionLocationText(intervention as any)
    const actionMessage = getStatusActionMessage(intervention.status, userContext)

    // Helper to get icon based on type
    const getTypeIcon = (type: string) => {
        switch (type?.toLowerCase()) {
            case "plomberie": return Droplets
            case "electricite": return Zap
            case "chauffage": return Flame
            case "serrurerie": return Key
            case "peinture": return Paintbrush
            case "maintenance": return Hammer
            default: return Wrench
        }
    }

    const TypeIcon = getTypeIcon(intervention.type || 'autre')

    // Extract colors from badge classes for the icon container
    const badgeClasses = getTypeBadgeColor(intervention.type || 'autre')
    // Default fallback
    let iconBgClass = "bg-slate-100"
    let iconTextClass = "text-slate-600"

    if (badgeClasses.includes("blue")) { iconBgClass = "bg-blue-100"; iconTextClass = "text-blue-600" }
    else if (badgeClasses.includes("yellow")) { iconBgClass = "bg-yellow-100"; iconTextClass = "text-yellow-600" }
    else if (badgeClasses.includes("red")) { iconBgClass = "bg-red-100"; iconTextClass = "text-red-600" }
    else if (badgeClasses.includes("gray")) { iconBgClass = "bg-gray-100"; iconTextClass = "text-gray-600" }
    else if (badgeClasses.includes("purple")) { iconBgClass = "bg-purple-100"; iconTextClass = "text-purple-600" }
    else if (badgeClasses.includes("orange")) { iconBgClass = "bg-orange-100"; iconTextClass = "text-orange-600" }

    // BEM Classes
    const blockClass = "intervention-card"

    return (
        <Card
            className={cn(
                blockClass,
                "group hover:shadow-md transition-all duration-200 h-full bg-white p-0"
            )}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <CardContent className={cn(`${blockClass}__content`, "p-4")}>
                <div className="space-y-3">
                    {/* Action Banner */}
                    <div className={cn(
                        `${blockClass}__action-banner`,
                        isAlert ? 'bg-orange-50 border-orange-100' : 'bg-blue-50 border-blue-100',
                        "border rounded px-2.5 py-1.5 transition-all duration-200"
                    )}>
                        <div className="flex items-center gap-2 w-full">
                            {/* Icon and Text */}
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                <div className={cn(
                                    "w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0",
                                    isAlert ? 'bg-orange-100' : 'bg-blue-100'
                                )}>
                                    <Clock className={cn("h-2.5 w-2.5", isAlert ? 'text-orange-600' : 'text-blue-600')} />
                                </div>
                                <p className={cn(
                                    "text-xs font-medium leading-snug truncate",
                                    isAlert ? 'text-orange-800' : 'text-blue-800'
                                )}>
                                    {actionMessage}
                                </p>
                            </div>

                            {/* Action Buttons on Hover */}
                            {isHovered && (
                                <div className="flex items-center flex-shrink-0">
                                    <InterventionActionButtons
                                        intervention={intervention as any}
                                        userRole={userContext}
                                        userId={userId || ''}
                                        compact={true}
                                        onActionComplete={onActionComplete}
                                        onOpenQuoteModal={actionHooks?.quotingHook?.handleQuoteRequest ?
                                            () => actionHooks.quotingHook?.handleQuoteRequest?.(intervention) : undefined}
                                        onProposeSlots={actionHooks?.planningHook?.handleProgrammingModal ?
                                            () => actionHooks.planningHook?.handleProgrammingModal?.(intervention) : undefined}
                                        timeSlots={(intervention as any).timeSlots || []}
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Header: Icon | Title+Loc | Actions */}
                    <div className={cn(`${blockClass}__header`, "flex items-start justify-between gap-2")}>
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                            {/* Icon */}
                            <div className={cn(
                                `${blockClass}__icon`,
                                "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                                iconBgClass
                            )}>
                                <TypeIcon className={cn("h-5 w-5", iconTextClass)} />
                            </div>

                            {/* Info */}
                            <div className={cn(`${blockClass}__info`, "min-w-0 flex-1")}>
                                <div className="flex items-center gap-2">
                                    <h3 className={cn(`${blockClass}__title`, "font-semibold text-sm text-slate-900 truncate")}>
                                        {intervention.title}
                                    </h3>
                                </div>
                                <div className={cn(`${blockClass}__subtitle`, "flex items-center text-xs text-slate-600 mt-0.5")}>
                                    <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
                                    <span className="truncate">{locationText}</span>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className={cn(`${blockClass}__actions`, "flex items-center gap-1 flex-shrink-0")}>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-slate-500 hover:text-slate-700"
                                onClick={() => router.push(`/gestionnaire/interventions/${intervention.id}`)}
                                title="Voir détails"
                            >
                                <Eye className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    </div>

                    {/* Footer: Badges */}
                    <div className={cn(
                        `${blockClass}__footer`,
                        "flex items-center gap-2 pt-2 border-t border-slate-100 flex-wrap"
                    )}>
                        {/* Status */}
                        <Badge className={cn(getStatusColor(intervention.status), "text-xs border px-1.5 py-0.5 h-6")}>
                            {getStatusLabel(intervention.status)}
                        </Badge>

                        {/* Priority */}
                        <Badge variant="outline" className={cn(getPriorityColor(intervention.urgency || 'normale'), "text-xs border-0 bg-transparent px-1.5 py-0.5 h-6")}>
                            {getPriorityLabel(intervention.urgency || 'normale')}
                        </Badge>

                        {/* Date */}
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 ml-auto bg-slate-50 px-2 py-1 rounded-md">
                            <Calendar className="h-3 w-3" />
                            <span>
                                {intervention.scheduled_date
                                    ? new Date(intervention.scheduled_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
                                    : new Date(intervention.created_at || new Date()).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
                                }
                            </span>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
