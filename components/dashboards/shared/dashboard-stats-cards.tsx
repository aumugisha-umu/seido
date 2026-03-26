"use client"

import { AlertTriangle, Building2, Users, FileText, Wrench, AlertCircle, CheckCircle2, Bell, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ContractStats } from "@/lib/types/contract.types"
import type { ReminderStats } from "@/lib/types/reminder.types"
import { StatsCard, type TrendData } from "./stats-card"
import { ProgressMini } from "./progress-mini"

// ============================================================================
// TYPES
// ============================================================================

/** Progress data for the intervention completion tracking */
export interface ProgressData {
    completed: number
    total: number
    percentage: number
    periodLabel: string
}

interface DashboardStatsCardsProps {
    pendingCount: number
    activeCount: number
    completedCount?: number
    buildingsCount?: number
    lotsCount?: number
    buildingLotsCount?: number
    independentLotsCount?: number
    occupancyRate?: number
    contractStats?: ContractStats
    /** Number of active tenants */
    tenantCount?: number
    /** Optional trend data for each KPI */
    trendData?: {
        actions?: TrendData
        patrimoine?: TrendData
        occupation?: TrendData
        contrats?: TrendData
        interventions?: TrendData
    }
    /** Progress tracking data for period completion */
    progressData?: ProgressData
    /** Click handler for "Actions requises" card (scroll to interventions) */
    onActionsClick?: () => void
    /** Reminder stats for the 6th KPI card */
    reminderStats?: ReminderStats
}

// ============================================================================
// COMPONENT
// ============================================================================

export function DashboardStatsCards({
    pendingCount,
    activeCount,
    completedCount = 0,
    buildingsCount,
    lotsCount,
    buildingLotsCount,
    independentLotsCount,
    occupancyRate,
    contractStats,
    tenantCount = 0,
    trendData,
    progressData,
    onActionsClick,
    reminderStats
}: DashboardStatsCardsProps) {
    const isManager = buildingsCount !== undefined
    const hasActiveReminders = reminderStats && (reminderStats.due_today > 0 || reminderStats.overdue > 0 || reminderStats.en_cours > 0 || reminderStats.en_attente > 0)

    return (
        <div className={cn(
            "dashboard-stats-cards grid grid-cols-1 gap-3 lg:gap-4",
            isManager
                ? "md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
                : "md:grid-cols-3"
        )}>
            {/* Card 1: Actions requises (Always First) */}
            <StatsCard
                id="actions"
                label="Actions requises"
                value={pendingCount}
                sublabel={pendingCount > 0 ? "Urgent" : "Tout est calme"}
                icon={AlertTriangle}
                iconColor={pendingCount > 0 ? "text-amber-500" : "text-emerald-500"}
                variant={pendingCount > 0 ? "warning" : "success"}
                onClick={onActionsClick}
                href={onActionsClick ? undefined : "/gestionnaire/operations?filter=pending"}
            />

            {/* Card 2: Patrimoine (Manager Only) - Buildings + lots breakdown */}
            {isManager && (() => {
                const totalLots = lotsCount || 0
                const hasBoth = buildingLotsCount !== undefined
                    && independentLotsCount !== undefined
                    && buildingLotsCount > 0
                    && independentLotsCount > 0

                return (
                    <StatsCard
                        id="buildings"
                        label="Patrimoine"
                        value={`${buildingsCount} imm.`}
                        sublabel={`${totalLots} lots`}
                        secondaryValue={
                            hasBoth ? (
                                <span className="text-xs text-foreground/60 flex items-center gap-1">
                                    {buildingLotsCount} lots liés · {independentLotsCount} lots indép.
                                </span>
                            ) : null
                        }
                        icon={Building2}
                        iconColor="text-indigo-600"
                        variant="default"
                        href="/gestionnaire/biens"
                    />
                )
            })()}

            {/* Card 3: Occupation (Manager Only) */}
            {isManager && occupancyRate !== undefined && (
                <StatsCard
                    id="occupation"
                    label="Occupation"
                    value={`${occupancyRate}%`}
                    sublabel="des lots"
                    icon={Users}
                    iconColor="text-emerald-600"
                    variant="default"
                    href="/gestionnaire/contacts"
                    trendData={trendData?.occupation}
                />
            )}

            {/* Card 4: Contrats (Manager Only) - Shows expiring in secondary line */}
            {isManager && contractStats && (
                <StatsCard
                    id="contracts"
                    label="Contrats"
                    value={contractStats.totalActive}
                    sublabel="actifs"
                    secondaryValue={
                        contractStats.expiringNext30Days > 0 ? (
                            <span className="text-amber-600 font-medium flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                {contractStats.expiringNext30Days} expire{contractStats.expiringNext30Days > 1 ? 'nt' : ''} bientot
                            </span>
                        ) : null
                    }
                    icon={FileText}
                    iconColor="text-violet-600"
                    variant="default"
                    href="/gestionnaire/contrats"
                    alertRing={contractStats.expiringNext30Days > 0}
                />
            )}

            {/* Card 5: Interventions (Renamed from "En cours") - Shows completed count + progress */}
            <StatsCard
                id="interventions"
                label="En cours"
                value={activeCount}
                sublabel="interventions"
                secondaryValue={
                    <div className="flex flex-col gap-1 w-full">
                        {completedCount > 0 && (
                            <span className="text-success font-medium flex items-center gap-1 text-xs">
                                <CheckCircle2 className="h-3 w-3" />
                                {completedCount} terminée{completedCount > 1 ? 's' : ''}
                            </span>
                        )}
                        {progressData && (
                            <ProgressMini
                                completed={progressData.completed}
                                total={progressData.total}
                                percentage={progressData.percentage}
                                periodLabel={progressData.periodLabel}
                            />
                        )}
                    </div>
                }
                icon={Wrench}
                iconColor="text-blue-600"
                variant="default"
                href="/gestionnaire/operations"
            />

            {/* Card 6: Rappels (Manager Only, always visible) */}
            {isManager && (() => {
                const dueTodayCount = reminderStats?.due_today ?? 0
                const overdueCount = reminderStats?.overdue ?? 0
                const enAttenteCount = reminderStats?.en_attente ?? 0
                const enCoursCount = reminderStats?.en_cours ?? 0
                const totalActive = enAttenteCount + enCoursCount

                return (
                    <StatsCard
                        id="reminders"
                        label="Rappels"
                        value={hasActiveReminders ? dueTodayCount : totalActive}
                        sublabel={hasActiveReminders ? "aujourd'hui" : "Aucun rappel actif"}
                        secondaryValue={
                            hasActiveReminders ? (
                                <div className="flex flex-col gap-0.5">
                                    {overdueCount > 0 && (
                                        <span className="text-destructive font-medium flex items-center gap-1 text-xs">
                                            <AlertTriangle className="h-3 w-3" />
                                            {overdueCount} en retard
                                        </span>
                                    )}
                                    {enAttenteCount > 0 && (
                                        <span className="text-muted-foreground flex items-center gap-1 text-xs">
                                            <Clock className="h-3 w-3" />
                                            {enAttenteCount} en attente
                                        </span>
                                    )}
                                </div>
                            ) : null
                        }
                        icon={Bell}
                        iconColor={overdueCount > 0 ? "text-red-500" : hasActiveReminders ? "text-amber-500" : "text-muted-foreground"}
                        variant={overdueCount > 0 ? "warning" : "default"}
                        href="/gestionnaire/operations?type=rappel"
                        alertRing={overdueCount > 0}
                    />
                )
            })()}
        </div>
    )
}
