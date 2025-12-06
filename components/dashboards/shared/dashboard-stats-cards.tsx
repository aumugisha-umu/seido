"use client"

import { AlertTriangle, Building2, Users, FileText, Wrench, AlertCircle, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ContractStats } from "@/lib/types/contract.types"
import { StatsCard, type TrendData } from "./stats-card"

// ============================================================================
// TYPES
// ============================================================================

interface DashboardStatsCardsProps {
    pendingCount: number
    activeCount: number
    completedCount?: number
    buildingsCount?: number
    lotsCount?: number
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
    occupancyRate,
    contractStats,
    tenantCount = 0,
    trendData
}: DashboardStatsCardsProps) {
    const isManager = buildingsCount !== undefined

    return (
        <div className={cn(
            "dashboard-stats-cards grid grid-cols-1 gap-6",
            isManager ? "md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5" : "md:grid-cols-3"
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
                href="/gestionnaire/interventions?filter=pending"
            />

            {/* Card 2: Immeubles (Manager Only) - Renamed from Patrimoine */}
            {isManager && (
                <StatsCard
                    id="buildings"
                    label="Patrimoine"
                    value={buildingsCount}
                    sublabel={
                        <span className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" /> {lotsCount} lots
                        </span>
                    }
                    icon={Building2}
                    iconColor="text-indigo-600"
                    variant="default"
                    href="/gestionnaire/biens/immeubles"
                />
            )}

            {/* Card 3: Occupation (Manager Only) - Shows tenant count instead of "Stable" */}
            {isManager && occupancyRate !== undefined && (
                <StatsCard
                    id="occupation"
                    label="Occupation"
                    value={`${occupancyRate}%`}
                    sublabel={`${tenantCount} locataire${tenantCount > 1 ? 's' : ''}`}
                    icon={Users}
                    iconColor="text-emerald-600"
                    variant="default"
                    href="/gestionnaire/contacts?type=locataire"
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
                            <span className="text-warning font-medium flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                {contractStats.expiringNext30Days} expire{contractStats.expiringNext30Days > 1 ? 'nt' : ''} bientot
                            </span>
                        ) : null
                    }
                    icon={FileText}
                    iconColor="text-violet-600"
                    variant="default"
                    href="/gestionnaire/biens/contrats"
                    alertRing={contractStats.expiringNext30Days > 0}
                />
            )}

            {/* Card 5: Interventions (Renamed from "En cours") - Shows completed count */}
            <StatsCard
                id="interventions"
                label="En cours"
                value={activeCount}
                sublabel="interventions"
                secondaryValue={
                    completedCount > 0 ? (
                        <span className="text-success font-medium flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            {completedCount} terminee{completedCount > 1 ? 's' : ''}
                        </span>
                    ) : null
                }
                icon={Wrench}
                iconColor="text-blue-600"
                variant="default"
                href="/gestionnaire/interventions"
            />
        </div>
    )
}
