"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Wrench, Clock, Archive, AlertCircle } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { TeamCheckModal } from "@/components/team-check-modal"
import { useTeamStatus } from "@/hooks/use-team-status"
import { useTenantData } from "@/hooks/use-tenant-data"
import { useDashboardSessionTimeout } from "@/hooks/use-dashboard-session-timeout"
import ContentNavigator from "@/components/content-navigator"
import { InterventionsList } from "@/components/interventions/interventions-list"
import { PendingActionsCompactHybrid } from "@/components/ui-proposals/pending-actions-compact-hybrid"
import TenantHeaderV1 from "@/components/ui-proposals/tenant-header-v1"
import { logger } from '@/lib/logger'

export default function LocataireDashboard() {
  const { user } = useAuth()
  const router = useRouter()
  const { teamStatus, hasTeam } = useTeamStatus()
  const { tenantData, tenantInterventions, loading, error } = useTenantData()

  // 🎯 FIX: Pattern "mounted" pour éviter l'erreur d'hydration React
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // ✅ NOUVEAU: Surveillance de session inactive sur dashboard
  useDashboardSessionTimeout()

  // Afficher la vérification d'équipe en cours ou échoué
  if (teamStatus === 'checking' || (teamStatus === 'error' && !hasTeam)) {
    return <TeamCheckModal onTeamResolved={() => {}} />
  }

  // 🎯 FIX: Afficher skeleton si pas encore monté OU si loading
  if (!mounted || loading) {
    return (
      <div className="space-y-8">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="bg-white rounded-lg p-6 shadow mb-8">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-4 bg-gray-200 rounded w-full"></div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-lg p-6 shadow">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">Erreur de chargement</h3>
              <p className="text-slate-500 mb-4">{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!tenantData) {
    return (
      <div className="space-y-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Aucune propriété trouvée pour ce locataire.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Transform TenantIntervention[] to format expected by InterventionsList
  const transformedInterventions = tenantInterventions.map((intervention) => ({
    id: intervention.id,
    title: intervention.title,
    description: intervention.description || '',
    status: intervention.status,
    created_at: intervention.created_at,
    urgency: intervention.urgency || 'normale',
    type: intervention.type || 'autre',
    reference: `INT-${intervention.id.slice(0, 8)}`,
    priority: intervention.urgency || 'normale',
    lot: intervention.lot,
    building: intervention.lot?.building,
    assigned_contact: intervention.assigned_contact
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
        loading={loading}
        emptyStateConfig={{
          title: tabId === "en_cours" ? "Aucune intervention en cours" : "Aucune intervention terminée",
          description: tabId === "en_cours"
            ? "Vos demandes d'intervention apparaîtront ici"
            : "Vos interventions terminées apparaîtront ici",
          showCreateButton: false
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
      count: loading ? "..." : getFilteredInterventions("en_cours").length,
      content: renderInterventionsList("en_cours")
    },
    {
      id: "terminees",
      label: "Terminées",
      icon: Archive,
      count: loading ? "..." : getFilteredInterventions("terminees").length,
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
        priority: intervention.priority,
        urgency: intervention.urgency,
        location: {
          building: intervention.building?.name,
          lot: intervention.lot?.reference,
          address: intervention.building?.address,
          city: intervention.building?.city,
          postal_code: intervention.building?.postal_code
        },
        contact: intervention.assigned_contact ? {
          name: intervention.assigned_contact.name,
          role: 'Gestionnaire',
          phone: intervention.assigned_contact.phone,
          email: intervention.assigned_contact.email
        } : undefined,
        assigned_contact: intervention.assigned_contact,
        dates: {
          created: intervention.created_at,
          planned: (intervention as any).planned_date,
          completed: (intervention as any).completed_date
        },
        actionUrl: `/locataire/interventions/${intervention.id}`
      }))
  }

  const pendingActions = convertToPendingActions()

  // Handler pour créer une nouvelle intervention
  const handleCreateIntervention = () => {
    logger.info('📝 [LOCATAIRE-DASHBOARD] Creating new intervention...')
    router.push('/locataire/interventions/nouvelle-demande')
  }

  return (
    <div className="space-y-6">
      {/* Header avec informations du logement - Version 1 Ultra-Compact */}
      <TenantHeaderV1
        lotReference={tenantData.reference || ''}
        buildingName={tenantData.building?.name}
        street={tenantData.building?.address}
        floor={tenantData.floor}
        apartmentNumber={tenantData.apartment_number}
        postalCode={tenantData.building?.postal_code}
        city={tenantData.building?.city}
        onCreateIntervention={handleCreateIntervention}
      />

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

      {/* Section 2: Interventions avec ContentNavigator */}
      <section>
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Wrench className="w-5 h-5 text-slate-900" />
            <h2 className="text-xl font-semibold text-slate-900">Mes interventions</h2>
          </div>
        </div>

        <ContentNavigator
          tabs={interventionsTabsConfig}
          defaultTab="en_cours"
          searchPlaceholder="Rechercher par titre, description, ou référence..."
          onSearch={(value) => logger.info("Recherche:", value)}
        />
      </section>
    </div>
  )
}
