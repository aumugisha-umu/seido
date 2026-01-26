"use client"

import { InterventionsNavigator } from "@/components/interventions/interventions-navigator"
import { PendingActionsSection } from "@/components/dashboards/shared/pending-actions-section"

// ============================================================================
// TYPES
// ============================================================================

interface ProviderDashboardV2Props {
    stats: any
    interventions: any[]
    pendingCount: number
    /** Current user ID for role-specific action checks */
    userId?: string
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * ProviderDashboardV2 - Dashboard prestataire avec actions en attente
 *
 * Affiche:
 * 1. Section "Actions requises" avec cartes interactives (si des actions existent)
 * 2. Navigator avec toutes les interventions
 */
export function ProviderDashboardV2({
    stats,
    interventions,
    pendingCount,
    userId
}: ProviderDashboardV2Props) {
    return (
        <div className="dashboard">
            <div className="dashboard__container space-y-6">
                {/* Pending Actions Section - Orange wrapper with horizontal scroll */}
                <PendingActionsSection
                    interventions={interventions}
                    userRole="prestataire"
                    userId={userId}
                />

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
