"use client"

import { Plus, Wrench, Clock, Archive } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { InterventionsList } from "@/components/interventions/interventions-list"
import ContentNavigator from "@/components/content-navigator"
import { PendingActionsCompactHybrid } from "@/components/ui-proposals/pending-actions-compact-hybrid"
import { Card, CardContent } from "@/components/ui/card"
import { AlertCircle } from "lucide-react"
import { logger } from '@/lib/logger'

// Intervention type based on what the service returns
interface Intervention {
  id: string
  title: string
  description: string
  status: string
  priority?: string
  urgency?: string
  intervention_type?: string
  location?: string
  estimated_duration?: string
  created_at: string
  reference?: string
  lot?: any
  building?: any
  intervention_assignments?: Array<{
    role: string
    is_primary: boolean
    user?: {
      name: string
    }
  }>
}

interface InterventionsClientProps {
  interventions: Intervention[]
}

export default function InterventionsClient({ interventions }: InterventionsClientProps) {
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
        emptyStateConfig={{
          title: tabId === "en_cours" ? "Aucune intervention en cours" : "Aucune intervention terminée",
          description: tabId === "en_cours"
            ? "Vos demandes d'intervention apparaîtront ici"
            : "Vos interventions terminées apparaîtront ici",
          showCreateButton: tabId === "en_cours",
          createButtonText: "Créer ma première demande",
          createButtonAction: () => window.location.href = '/locataire/interventions/nouvelle-demande'
        }}
        showStatusActions={true}
        userContext="locataire"
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

  // Convertir les interventions en format PendingAction
  const convertToPendingActions = () => {
    return transformedInterventions
      .filter((intervention) => [
        "demande",
        "approuvee",
        "demande_de_devis",
        "planification",
        "planifiee",
        "en_cours"
      ].includes(intervention.status))
      .map((intervention) => ({
        id: intervention.id,
        type: 'intervention',
        title: intervention.title,
        description: intervention.description,
        status: intervention.status,
        reference: intervention.reference,
        priority: intervention.urgency,
        urgency: intervention.urgency,
        location: {
          building: intervention.building?.name,
          lot: intervention.lot?.reference,
          address: intervention.building?.address,
          city: intervention.building?.city,
          postal_code: intervention.building?.postal_code
        },
        contact: intervention.intervention_assignments?.find((a: any) => a.role === 'gestionnaire')?.user ? {
          name: intervention.intervention_assignments.find((a: any) => a.role === 'gestionnaire')?.user?.name || '',
          role: 'Gestionnaire',
          phone: undefined,
          email: undefined
        } : undefined,
        assigned_contact: intervention.intervention_assignments?.find((a: any) => a.role === 'prestataire')?.user ? {
          name: intervention.intervention_assignments.find((a: any) => a.role === 'prestataire')?.user?.name || '',
          phone: undefined,
          email: undefined
        } : undefined,
        dates: {
          created: intervention.created_at,
          planned: undefined,
          completed: undefined
        },
        actionUrl: `/locataire/interventions/${intervention.id}`
      }))
  }

  const pendingActions = convertToPendingActions()

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Mes Demandes</h1>
          <p className="text-gray-600">Suivez vos demandes d'intervention pour votre logement</p>
        </div>
        <Link href="/locataire/interventions/nouvelle-demande">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle demande
          </Button>
        </Link>
      </div>

      <div className="space-y-6">
        {/* Section 1: Actions en attente */}
        {pendingActions.length > 0 && (
          <section>
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                    <AlertCircle className="w-4 h-4 text-orange-500" />
                    <span className="font-medium text-foreground">Actions en attente</span>
                    <span className="text-xs text-slate-600 ml-auto">Interventions nécessitant votre attention</span>
                  </div>
                  <PendingActionsCompactHybrid
                    actions={pendingActions}
                    userRole="locataire"
                  />
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Section 2: Interventions avec tabs */}
        <section>
          <div className="flex items-center space-x-2 mb-4">
            <Wrench className="h-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Mes demandes d'intervention ({transformedInterventions.length})
            </h2>
          </div>

          <ContentNavigator
            tabs={interventionsTabsConfig}
            defaultTab="en_cours"
            searchPlaceholder="Rechercher par titre, description, ou référence..."
            onSearch={(value) => logger.info("Recherche:", value)}
          />
        </section>
      </div>
    </div>
  )
}
