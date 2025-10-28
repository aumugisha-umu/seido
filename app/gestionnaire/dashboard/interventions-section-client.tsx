"use client"

import { Wrench, Clock, Archive, Plus, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import Link from "next/link"
import { InterventionsList } from "@/components/interventions/interventions-list"
import ContentNavigator from "@/components/content-navigator"
import { logger } from '@/lib/logger'

interface InterventionsSectionClientProps {
  interventions: any[]
  actionHooks?: {
    approvalHook?: any
    quotingHook?: any
    planningHook?: any
    executionHook?: any
    finalizationHook?: any
  }
}

export function InterventionsSectionClient({ interventions, actionHooks }: InterventionsSectionClientProps) {
  // Transform interventions to format expected by InterventionsList
  const transformedInterventions = interventions.map((intervention) => ({
    ...intervention,
    reference: intervention.reference || `INT-${intervention.id.slice(0, 8)}`,
    urgency: intervention.urgency || intervention.priority || 'normale',
    type: intervention.intervention_type || 'autre'
  }))

  // Filter function for interventions based on tab
  const getFilteredInterventions = (tabId: string) => {
    if (tabId === "en_cours") {
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

    return (
      <InterventionsList
        interventions={filteredInterventions}
        loading={false}
        horizontal={true}
        emptyStateConfig={{
          title: tabId === "en_cours" ? "Aucune intervention en cours" : "Aucune intervention terminée",
          description: tabId === "en_cours"
            ? "Les interventions actives apparaîtront ici"
            : "Les interventions terminées apparaîtront ici",
          showCreateButton: tabId === "en_cours",
          createButtonText: "Ajouter une intervention",
          createButtonAction: () => window.location.href = '/gestionnaire/interventions/nouvelle-intervention'
        }}
        showStatusActions={true}
        userContext="gestionnaire"
        actionHooks={actionHooks}
      />
    )
  }

  // Tabs configuration
  const interventionsTabsConfig = [
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

  return (
    <div>
      {/* ContentNavigator avec header personnalisé via wrapper */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        {/* Header avec titre et boutons */}
        <div className="flex items-center justify-between gap-3 px-3 py-2 sm:px-6 sm:py-3">
          <div className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Interventions</h2>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white h-8 px-3">
              <Link href="/gestionnaire/interventions/nouvelle-intervention" className="flex items-center">
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Ajouter une intervention</span>
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="flex-shrink-0 h-8 px-3">
              <Link href="/gestionnaire/interventions" className="flex items-center">
                <ArrowRight className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline text-xs">Voir toutes</span>
              </Link>
            </Button>
          </div>
        </div>

        {/* ContentNavigator (retire sa propre Card via className) */}
        <div className="px-3 pb-3 sm:px-6 sm:pb-4">
          <ContentNavigator
            tabs={interventionsTabsConfig}
            defaultTab="en_cours"
            searchPlaceholder="Rechercher par titre, description, ou référence..."
            onSearch={(value) => logger.info("Recherche:", value)}
            className="shadow-none border-0 bg-transparent"
          />
        </div>
      </div>
    </div>
  )
}
