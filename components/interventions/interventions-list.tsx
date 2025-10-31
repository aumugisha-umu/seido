"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Wrench, Plus } from "lucide-react"
import { InterventionCard } from "@/components/intervention/intervention-card"
import type { InterventionWithRelations } from "@/lib/services"
import { logger, logError } from '@/lib/logger'
interface EmptyStateConfig {
  title: string
  description: string
  showCreateButton?: boolean
  createButtonText?: string
  createButtonAction?: () => void
}

interface ContactContext {
  contactId: string
  contactName: string
  contactRole?: 'gestionnaire' | 'prestataire' | 'locataire'
}

interface ActionHooks {
  approvalHook?: () => void
  quotingHook?: () => void
  planningHook?: () => void
  executionHook?: () => void
  finalizationHook?: () => void
}

interface InterventionsListProps {
  interventions: InterventionWithRelations[]
  loading?: boolean
  compact?: boolean
  maxItems?: number
  emptyStateConfig?: EmptyStateConfig
  showStatusActions?: boolean
  contactContext?: ContactContext
  className?: string
  actionHooks?: ActionHooks
  userContext?: 'gestionnaire' | 'prestataire' | 'locataire'
  horizontal?: boolean
}

export function InterventionsList({
  interventions,
  loading = false,
  compact = false,
  maxItems,
  emptyStateConfig,
  showStatusActions = true,
  contactContext,
  className = "",
  actionHooks,
  userContext = 'gestionnaire',
  horizontal = false
}: InterventionsListProps) {
  const router = useRouter()

  // Limit interventions if maxItems is specified
  const displayedInterventions = maxItems ? interventions.slice(0, maxItems) : interventions

  // Handle action completion callback
  const handleActionComplete = () => {
    // Could trigger a refresh of the interventions list if needed
    logger.info('[InterventionsList] Action completed, list may need refresh')
  }

  // Compact rendering for dashboard
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
        createButtonText: "Ajouter une intervention",
        createButtonAction: () => router.push("/gestionnaire/interventions/nouvelle-intervention")
      }

      const config = { ...defaultEmptyConfig, ...emptyStateConfig }

      return (
        <div className={`text-center py-8 ${className}`}>
          <Wrench className="h-8 w-8 text-slate-400 mx-auto mb-3" />
          <h3 className="text-sm font-medium text-slate-900 mb-1">
            {config.title}
          </h3>
          <p className="text-slate-500 text-sm mb-4">
            {config.description}
          </p>
          {config.showCreateButton && (
            <Button onClick={config.createButtonAction} size="sm" className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              {config.createButtonText}
            </Button>
          )}
        </div>
      )
    }

    return (
      <div className={`space-y-3 ${className}`}>
        {displayedInterventions.map((intervention) => (
          <InterventionCard
            key={intervention.id}
            intervention={intervention}
            userContext={userContext}
            compact={true}
            showStatusActions={showStatusActions}
            contactContext={contactContext}
            actionHooks={actionHooks}
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
      <div className={`grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6 ${className}`}>
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
      createButtonText: "Ajouter une intervention",
      createButtonAction: () => router.push("/gestionnaire/interventions/nouvelle-intervention")
    }

    const config = { ...defaultEmptyConfig, ...emptyStateConfig }

    return (
      <div className={`text-center py-12 ${className}`}>
        <Wrench className="h-12 w-12 text-slate-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-900 mb-2">
          {config.title}
        </h3>
        <p className="text-slate-500 mb-6">
          {config.description}
        </p>
        {config.showCreateButton && (
          <Button onClick={config.createButtonAction} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            {config.createButtonText}
          </Button>
        )}
      </div>
    )
  }

  // Horizontal scroll layout
  if (horizontal) {
    return (
      <div className={`flex gap-3 overflow-x-auto overflow-y-hidden pb-2 ${className}`}>
        {displayedInterventions.map((intervention) => (
          <div key={intervention.id} className="min-w-[320px] max-w-[320px] lg:min-w-[360px] lg:max-w-[360px] flex-shrink-0">
            <div>
              <InterventionCard
                intervention={intervention}
                userContext={userContext}
                compact={false}
                showStatusActions={showStatusActions}
                contactContext={contactContext}
                actionHooks={actionHooks}
                onActionComplete={handleActionComplete}
              />
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Default grid layout
  return (
    <div className={`grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6 ${className}`}>
      {displayedInterventions.map((intervention) => (
        <InterventionCard
          key={intervention.id}
          intervention={intervention}
          userContext={userContext}
          compact={false}
          showStatusActions={showStatusActions}
          contactContext={contactContext}
          actionHooks={actionHooks}
          onActionComplete={handleActionComplete}
        />
      ))}
    </div>
  )
}

