"use client"

import { InterventionsNavigator } from "@/components/interventions/interventions-navigator"
import { UnreadMessagesSection } from "@/components/dashboards/shared/unread-messages-section"
import type { UnreadThread } from "@/lib/services/repositories/conversation-repository"

// ============================================================================
// TYPES
// ============================================================================

interface ProviderDashboardV2Props {
    stats: any
    interventions: any[]
    pendingCount: number
    userId?: string
    unreadThreads?: UnreadThread[]
    unreadThreadsTotalCount?: number
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
    unreadThreads,
    unreadThreadsTotalCount,
}: ProviderDashboardV2Props) {
    return (
        <div className="dashboard">
            <div className="dashboard__container space-y-6">
                {/* Unread Messages Section */}
                {unreadThreads && unreadThreads.length > 0 && (
                    <UnreadMessagesSection
                        threads={unreadThreads}
                        role="prestataire"
                        totalCount={unreadThreadsTotalCount ?? unreadThreads.length}
                    />
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
