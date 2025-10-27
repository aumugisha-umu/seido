"use client"

import { Wrench, Clock, Archive, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import Link from "next/link"
import { InterventionsList } from "@/components/interventions/interventions-list"
import ContentNavigator from "@/components/content-navigator"
import { logger } from '@/lib/logger'

interface InterventionsSectionClientProps {
  interventions: any[]
  totalCount: number
  actionHooks?: {
    approvalHook?: any
    quotingHook?: any
    planningHook?: any
    executionHook?: any
    finalizationHook?: any
  }
}

export function InterventionsSectionClient({ interventions, totalCount, actionHooks }: InterventionsSectionClientProps) {
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
          createButtonText: "Créer une intervention",
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
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-center space-x-2">
            <Wrench className="h-5 w-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Interventions ({totalCount} au total)
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white">
              <Link href="/gestionnaire/interventions/nouvelle-intervention">
                <Plus className="h-4 w-4 mr-2" />
                Ajouter une intervention
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/gestionnaire/interventions">Voir toutes →</Link>
            </Button>
          </div>
        </div>

        {/* ContentNavigator (retire sa propre Card via className) */}
        <div className="px-6 pb-6">
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
