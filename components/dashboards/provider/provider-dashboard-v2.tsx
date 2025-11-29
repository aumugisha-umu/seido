"use client"

import { DashboardStatsCards } from "@/components/dashboards/shared/dashboard-stats-cards"
import { DashboardInterventionsSection } from "@/components/dashboards/shared/dashboard-interventions-section"

interface ProviderDashboardV2Props {
    stats: any
    interventions: any[]
    pendingCount: number
}

export function ProviderDashboardV2({ stats, interventions, pendingCount }: ProviderDashboardV2Props) {
    // Calculate counts for stats cards
    const activeCount = interventions.filter(i => ['en_cours', 'planifiee', 'planification'].includes(i.status)).length
    const completedCount = interventions.filter(i => ['cloturee_par_prestataire', 'cloturee_par_locataire', 'cloturee_par_gestionnaire'].includes(i.status)).length

    return (
        <div className="dashboard">
            <div className="dashboard__container">
                {/* Stats Section */}
                <div className="dashboard__stats">
                    <DashboardStatsCards
                        pendingCount={pendingCount}
                        activeCount={activeCount}
                        completedCount={completedCount}
                    />
                </div>

                {/* Content Section */}
                <div className="dashboard__content">
                    <DashboardInterventionsSection
                        interventions={interventions}
                        userContext="prestataire"
                    />
                </div>
            </div>
        </div>
    )
}
