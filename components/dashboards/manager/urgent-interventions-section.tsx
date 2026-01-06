"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertTriangle, ChevronRight } from "lucide-react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { ManagerInterventionCard } from "@/components/dashboards/manager/manager-intervention-card"
import { shouldShowAlertBadge } from "@/lib/intervention-alert-utils"

// ============================================================================
// TYPES
// ============================================================================

interface UrgentInterventionsSectionProps {
    interventions: any[]
    maxItems?: number
    userContext: 'gestionnaire' | 'prestataire' | 'locataire'
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const getUrgencyLevel = (intervention: any): number => {
    const urgency = intervention.urgency || intervention.priority || 'normale'
    switch (urgency) {
        case 'urgente': return 3
        case 'haute': return 2
        default: return 1
    }
}

// Priorité d'action basée sur le statut (pour le tri)
const getActionPriority = (intervention: any): number => {
    switch (intervention.status) {
        case 'demande': return 5 // Nouvelle demande à traiter
        case 'cloturee_par_prestataire': return 4 // À finaliser
        case 'cloturee_par_locataire': return 4 // À finaliser
        case 'demande_de_devis': return 3 // Devis à gérer
        case 'planification': return 2 // À planifier
        default: return 1
    }
}

// ============================================================================
// COMPONENT
// ============================================================================

export function UrgentInterventionsSection({
    interventions,
    maxItems = 5,
    userContext
}: UrgentInterventionsSectionProps) {
    const router = useRouter()

    // Filter interventions that require action from the current user
    const actionableInterventions = useMemo(() => {
        return interventions
            .filter(intervention => {
                // Use the same logic as the alert badge to determine if action is needed
                return shouldShowAlertBadge(intervention, userContext)
            })
            .sort((a, b) => {
                // Sort by action priority first, then urgency, then date
                const actionDiff = getActionPriority(b) - getActionPriority(a)
                if (actionDiff !== 0) return actionDiff
                const urgencyDiff = getUrgencyLevel(b) - getUrgencyLevel(a)
                if (urgencyDiff !== 0) return urgencyDiff
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            })
            .slice(0, maxItems)
    }, [interventions, maxItems, userContext])

    // Don't render if no actionable interventions
    if (actionableInterventions.length === 0) {
        return null
    }

    const handleViewAll = () => {
        // Gestionnaire has a dedicated interventions list, others use dashboard
        const basePath = userContext === 'gestionnaire'
            ? '/gestionnaire/interventions'
            : userContext === 'prestataire'
                ? '/prestataire/dashboard'
                : '/locataire/dashboard'
        router.push(basePath)
    }

    return (
        <Card className={cn(
            "border-none shadow-lg overflow-hidden relative",
            "bg-amber-50 ring-1 ring-amber-500/30",
            "dark:bg-amber-500/10 dark:ring-amber-500/30"
        )}>
            {/* Background icon - same as stats card */}
            <div className="absolute right-0 top-0 p-6 opacity-10">
                <AlertTriangle className="h-32 w-32 text-amber-500" />
            </div>

            <CardHeader className="pb-2 relative z-10">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            "p-2 rounded-xl",
                            "bg-amber-500",
                            "shadow-lg shadow-amber-500/25"
                        )}>
                            <AlertTriangle className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <CardTitle className="text-lg font-bold text-amber-900 dark:text-amber-100">
                                À traiter en priorité
                            </CardTitle>
                            <p className="text-sm text-amber-700/70 dark:text-amber-300/70">
                                {actionableInterventions.length} action{actionableInterventions.length > 1 ? 's' : ''} requise{actionableInterventions.length > 1 ? 's' : ''}
                            </p>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleViewAll}
                        className="text-amber-700 hover:text-amber-900 hover:bg-amber-100/50 dark:text-amber-300 dark:hover:bg-amber-900/30"
                    >
                        Voir tout
                        <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="pt-2 pb-4 px-0 relative z-10">
                {/* Horizontal scrollable container - reusing ManagerInterventionCard */}
                <div className="flex gap-4 overflow-x-auto px-4 pb-2 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-amber-300 scrollbar-track-transparent">
                    {actionableInterventions.map((intervention) => (
                        <div
                            key={intervention.id}
                            className="flex-shrink-0 w-[calc(33.333%-11px)] min-w-[320px] snap-start"
                        >
                            <ManagerInterventionCard
                                intervention={intervention}
                                userContext={userContext}
                            />
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
