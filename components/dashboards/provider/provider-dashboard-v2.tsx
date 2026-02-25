"use client"

import { InterventionsNavigator } from "@/components/interventions/interventions-navigator"

// ============================================================================
// TYPES
// ============================================================================

interface ProviderDashboardV2Props {
    stats: any
    interventions: any[]
    pendingCount: number
    userId?: string
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * ProviderDashboardV2 - Dashboard prestataire
 *
 * Affiche le navigator avec toutes les interventions (tab "À traiter" inclus)
 */
export function ProviderDashboardV2({
    interventions,
}: ProviderDashboardV2Props) {
    return (
        <div className="dashboard">
            <div className="dashboard__container space-y-6">
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
