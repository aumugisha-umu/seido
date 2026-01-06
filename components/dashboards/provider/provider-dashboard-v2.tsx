"use client"

import { AlertTriangle } from "lucide-react"
import { StatsCard } from "@/components/dashboards/shared/stats-card"
import { InterventionsNavigator } from "@/components/interventions/interventions-navigator"

// ============================================================================
// TYPES
// ============================================================================

interface ProviderDashboardV2Props {
    stats: any
    interventions: any[]
    pendingCount: number
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ProviderDashboardV2({ stats, interventions, pendingCount }: ProviderDashboardV2Props) {
    return (
        <div className="dashboard">
            <div className="dashboard__container">
                {/* Actions Requises Card - Full width, hidden when no pending */}
                {pendingCount > 0 && (
                    <div className="mb-6">
                        <StatsCard
                            id="actions"
                            label="ACTIONS REQUISES"
                            value={pendingCount}
                            sublabel="Urgent"
                            icon={AlertTriangle}
                            iconColor="text-amber-500"
                            variant="warning"
                            className="w-full"
                        />
                    </div>
                )}

                {/* Interventions Section with tabs inside the card */}
                <div className="dashboard__content">
                    <InterventionsNavigator
                        interventions={interventions}
                        userContext="prestataire"
                        tabsPreset="prestataire"
                        className="bg-card rounded-lg border border-border shadow-sm"
                    />
                </div>
            </div>
        </div>
    )
}
