"use client"

import { useState, useEffect } from "react"
import { Wrench, Clock, Archive, Plus, ArrowRight, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import Link from "next/link"
import { InterventionsViewContainer } from "@/components/interventions/interventions-view-container"
import { ViewModeSwitcherV1 } from "@/components/interventions/view-mode-switcher-v1"
import { useViewMode } from "@/hooks/use-view-mode"
import ContentNavigator from "@/components/content-navigator"
import { logger } from '@/lib/logger'
import { filterPendingActions } from '@/lib/intervention-alert-utils'

export interface InterventionsSectionClientProps {
  interventions: any[]
  actionHooks?: {
    approvalHook?: any
    quotingHook?: any
    planningHook?: any
    executionHook?: any
    finalizationHook?: any
  }
  onActiveTabChange?: (tabId: string) => void
  initialActiveTab?: string
}

export function InterventionsSectionClient({ interventions, actionHooks, onActiveTabChange, initialActiveTab }: InterventionsSectionClientProps) {
  const [interventionsActiveTab, setInterventionsActiveTab] = useState<string | undefined>(initialActiveTab)

  // View mode state (cards, list, calendar)
  const { viewMode, setViewMode, mounted } = useViewMode({
    defaultMode: 'cards',
    syncWithUrl: false
  })

  // Update active tab when initialActiveTab changes
  useEffect(() => {
    if (initialActiveTab !== undefined) {
      setInterventionsActiveTab(initialActiveTab)
    }
  }, [initialActiveTab])
  
  // Handle tab change and notify parent if callback provided
  const handleTabChange = (tabId: string) => {
    setInterventionsActiveTab(tabId)
    onActiveTabChange?.(tabId)
  }
  
  // Expose handleTabChange for external calls (e.g., from badge in header)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__handleInterventionsTabChange = handleTabChange
    }
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).__handleInterventionsTabChange
      }
    }
  }, [handleTabChange])
  
  // Transform interventions to format expected by InterventionsList
  const transformedInterventions = interventions.map((intervention) => ({
    ...intervention,
    reference: intervention.reference || `INT-${intervention.id.slice(0, 8)}`,
    urgency: intervention.urgency || intervention.priority || 'normale',
    type: intervention.intervention_type || 'autre'
  }))

  // Function to get interventions with pending actions
  const getPendingActionsInterventions = () => {
    return filterPendingActions(transformedInterventions, 'gestionnaire')
  }

  // Filter function for interventions based on tab
  const getFilteredInterventions = (tabId: string) => {
    if (tabId === "actions_en_attente") {
      // Actions en attente : interventions nécessitant une action du gestionnaire
      return getPendingActionsInterventions()
    } else if (tabId === "en_cours") {
      // En cours : interventions actives nécessitant une action ou en traitement
      return transformedInterventions.filter((i) => [
        "demande",
        "approuvee",
        "demande_de_devis",
        "planification",
        "planifiee",
        "en_cours"
      ].includes(i.status))
    } else if (tabId === "terminees") {
      // Terminées : interventions clôturées ou annulées
      return transformedInterventions.filter((i) => [
        "cloturee_par_prestataire",
        "cloturee_par_locataire",
        "cloturee_par_gestionnaire",
        "annulee"
      ].includes(i.status))
    }
    return transformedInterventions
  }

  // Function to render interventions list
  const renderInterventionsList = (tabId: string) => {
    const filteredInterventions = getFilteredInterventions(tabId)

    // Don't render until mounted (prevent hydration mismatch)
    if (!mounted) {
      return (
        <div className="animate-pulse space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-lg" />
          ))}
        </div>
      )
    }

    return (
      <InterventionsViewContainer
        interventions={filteredInterventions}
        userContext="gestionnaire"
        loading={false}
        emptyStateConfig={{
          title: tabId === "actions_en_attente" ? "Aucune action en attente"
                : tabId === "en_cours" ? "Aucune intervention en cours"
                : "Aucune intervention terminée",
          description: tabId === "actions_en_attente"
            ? "Toutes vos interventions sont à jour"
            : tabId === "en_cours"
            ? "Les interventions actives apparaîtront ici"
            : "Les interventions terminées apparaîtront ici",
          showCreateButton: tabId === "en_cours",
          createButtonText: "Créer une intervention",
          createButtonAction: () => window.location.href = '/gestionnaire/interventions/nouvelle-intervention'
        }}
        showStatusActions={true}
        viewMode={viewMode}
        setViewMode={setViewMode}
        hideViewSwitcher={true}
        actionHooks={actionHooks}
      />
    )
  }

  // Get pending actions count for conditional tab display
  const pendingActionsCount = getPendingActionsInterventions().length

  // Tabs configuration (conditionally include "Actions en attente" tab first if there are pending actions)
  const interventionsTabsConfig = [
    ...(pendingActionsCount > 0 ? [{
      id: "actions_en_attente",
      label: "En attente",
      icon: AlertTriangle,
      count: pendingActionsCount,
      content: renderInterventionsList("actions_en_attente")
    }] : []),
    {
      id: "en_cours",
      label: "En cours",
      icon: Clock,
      count: getFilteredInterventions("en_cours").length,
      content: renderInterventionsList("en_cours")
    },
    {
      id: "terminees",
      label: "Terminées",
      icon: Archive,
      count: getFilteredInterventions("terminees").length,
      content: renderInterventionsList("terminees")
    }
  ]

  // View switcher to pass as right controls
  const viewSwitcher = mounted ? (
    <ViewModeSwitcherV1
      value={viewMode}
      onChange={setViewMode}
    />
  ) : null

  return (
    <div className="flex-1 flex flex-col min-h-0 mb-2">
      {/* ContentNavigator avec header personnalisé via wrapper - Material Design compact */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Header avec titre et boutons - Material Design: padding 8dp */}
        <div className="flex items-center justify-between gap-1.5 px-2 py-1.5 sm:px-3 sm:py-2 flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <Wrench className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-600" />
            <h2 className="text-xs sm:text-sm font-semibold text-gray-900 leading-tight">Interventions</h2>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white h-6 sm:h-7 px-1.5 sm:px-2 text-xs">
              <Link href="/gestionnaire/interventions/nouvelle-intervention" className="flex items-center">
                <Plus className="h-3 w-3 sm:h-3.5 sm:w-3.5 sm:mr-1" />
                <span className="hidden sm:inline">Ajouter</span>
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="flex-shrink-0 h-6 sm:h-7 px-1.5 sm:px-2">
              <Link href="/gestionnaire/interventions" className="flex items-center">
                <ArrowRight className="h-3 w-3 sm:h-3.5 sm:w-3.5 sm:mr-0.5" />
                <span className="hidden sm:inline text-xs">Toutes</span>
              </Link>
            </Button>
          </div>
        </div>

        {/* ContentNavigator (retire sa propre Card via className) - Material Design: padding 8dp */}
        <div className="flex-1 flex flex-col min-h-0 px-2 pb-1.5 sm:px-3 sm:pb-2">
            <ContentNavigator
              tabs={interventionsTabsConfig}
              defaultTab={pendingActionsCount > 0 ? "actions_en_attente" : "en_cours"}
              activeTab={interventionsActiveTab}
              searchPlaceholder="Rechercher par titre, description, ou référence..."
              onSearch={(value) => logger.info("Recherche:", value)}
              rightControls={viewSwitcher}
              className="shadow-none border-0 bg-transparent flex-1 flex flex-col min-h-0"
            />
        </div>
      </div>
    </div>
  )
}
