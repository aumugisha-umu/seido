"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { PendingActionsCard } from "@/components/dashboards/shared/pending-actions-card"
import { InterventionsEmptyState } from "./interventions-empty-state"
import type { InterventionWithRelations } from "@/lib/services"
import { logger } from '@/lib/logger'

interface EmptyStateConfig {
  title: string
  description: string
  showCreateButton?: boolean
  createButtonText?: string
  createButtonAction?: () => void
}

interface InterventionsListProps {
  interventions: InterventionWithRelations[]
  loading?: boolean
  compact?: boolean
  maxItems?: number
  emptyStateConfig?: EmptyStateConfig
  showStatusActions?: boolean
  className?: string
  userContext?: 'gestionnaire' | 'prestataire' | 'locataire'
  horizontal?: boolean
  /** User ID for role-specific actions (e.g., prestataire quotes) */
  userId?: string
  /** Callback when an action completes successfully */
  onActionComplete?: (interventionId: string) => void
}

export function InterventionsList({
  interventions,
  loading = false,
  compact = false,
  maxItems,
  emptyStateConfig,
  showStatusActions = true,
  className = "",
  userContext = 'gestionnaire',
  horizontal = false,
  userId,
  onActionComplete
}: InterventionsListProps) {
  const router = useRouter()

  // Limit interventions if maxItems is specified
  const displayedInterventions = maxItems ? interventions.slice(0, maxItems) : interventions

  // Handle action completion callback
  const handleActionComplete = (interventionId: string) => {
    logger.info('[InterventionsList] Action completed for intervention:', interventionId)
    onActionComplete?.(interventionId)
  }

  // Compact rendering for dashboard (list view)
  if (compact) {
    if (loading) {
      return (
        <div className={`space-y-3 ${className}`}>
          {[...Array(maxItems || 3)].map((_, i) => (
            <div key={i} className="flex items-center space-x-3 p-3 border rounded-lg animate-pulse">
              <div className="h-10 w-10 rounded-full bg-slate-200"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                <div className="h-3 bg-slate-200 rounded w-2/3"></div>
              </div>
              <div className="h-6 w-20 bg-slate-200 rounded-full"></div>
              <div className="h-8 w-8 bg-slate-200 rounded"></div>
            </div>
          ))}
        </div>
      )
    }

    if (displayedInterventions.length === 0) {
      const defaultEmptyConfig = {
        title: "Aucune intervention",
        description: "Les interventions apparaîtront ici",
        showCreateButton: false,
        createButtonText: "Créer une intervention",
        createButtonAction: () => router.push("/gestionnaire/interventions/nouvelle-intervention")
      }

      const config = { ...defaultEmptyConfig, ...emptyStateConfig }

      return <InterventionsEmptyState {...config} />
    }

    return (
      <div className={`space-y-3 ${className}`}>
        {displayedInterventions.map((intervention) => (
          <PendingActionsCard
            key={intervention.id}
            intervention={intervention}
            userRole={userContext}
            userId={userId}
            onActionComplete={handleActionComplete}
          />
        ))}

        {/* Show more button if maxItems is specified and there are more items */}
        {maxItems && interventions.length > maxItems && (
          <div className="text-center pt-2">
            <Button variant="outline" size="sm" onClick={() => router.push("/gestionnaire/interventions")}>
              Voir les {interventions.length - maxItems} autres →
            </Button>
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    if (horizontal) {
      return (
        <div className={`flex gap-4 overflow-x-auto pb-4 ${className}`}>
          {[...Array(6)].map((_, i) => (
            <div key={i} className="min-w-[350px] lg:min-w-[400px] flex-shrink-0 border rounded-lg p-4 lg:p-5 animate-pulse">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3 flex-1">
                    <div className="w-10 h-10 bg-slate-200 rounded-lg"></div>
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                      <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                    </div>
                  </div>
                  <div className="w-16 h-8 bg-slate-200 rounded"></div>
                </div>
                <div className="flex space-x-2">
                  <div className="h-6 bg-slate-200 rounded w-20"></div>
                  <div className="h-6 bg-slate-200 rounded w-16"></div>
                </div>
                <div className="h-3 bg-slate-200 rounded w-full"></div>
                <div className="h-3 bg-slate-200 rounded w-2/3"></div>
              </div>
            </div>
          ))}
        </div>
      )
    }

    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}>
        {[...Array(6)].map((_, i) => (
          <div key={i} className="border rounded-lg p-4 lg:p-5 animate-pulse">
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3 flex-1">
                  <div className="w-10 h-10 bg-slate-200 rounded-lg"></div>
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                    <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                  </div>
                </div>
                <div className="w-16 h-8 bg-slate-200 rounded"></div>
              </div>
              <div className="flex space-x-2">
                <div className="h-6 bg-slate-200 rounded w-20"></div>
                <div className="h-6 bg-slate-200 rounded w-16"></div>
              </div>
              <div className="h-3 bg-slate-200 rounded w-full"></div>
              <div className="h-3 bg-slate-200 rounded w-2/3"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (displayedInterventions.length === 0) {
    const defaultEmptyConfig = {
      title: "Aucune intervention",
      description: "Les interventions apparaîtront ici",
      showCreateButton: false,
      createButtonText: "Créer une intervention",
      createButtonAction: () => router.push("/gestionnaire/interventions/nouvelle-intervention")
    }

    const config = { ...defaultEmptyConfig, ...emptyStateConfig }

    return <InterventionsEmptyState {...config} />
  }

  // Horizontal scroll layout
  if (horizontal) {
    return (
      <div className={`flex gap-3 overflow-x-auto overflow-y-hidden pb-2 ${className}`}>
        {displayedInterventions.map((intervention) => (
          <div key={intervention.id} className="min-w-[320px] max-w-[320px] lg:min-w-[360px] lg:max-w-[360px] flex-shrink-0">
            <PendingActionsCard
              intervention={intervention}
              userRole={userContext}
              userId={userId}
              onActionComplete={handleActionComplete}
            />
          </div>
        ))}
      </div>
    )
  }

  // Default grid layout with vertical scroll
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 h-full overflow-y-auto pb-4 ${className}`}>
      {displayedInterventions.map((intervention) => (
        <PendingActionsCard
          key={intervention.id}
          intervention={intervention}
          userRole={userContext}
          userId={userId}
          onActionComplete={handleActionComplete}
        />
      ))}
    </div>
  )
}
