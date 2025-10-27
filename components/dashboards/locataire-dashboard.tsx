"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Wrench, Clock, Archive, Home, Plus, AlertCircle } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { TeamCheckModal } from "@/components/team-check-modal"
import { useTeamStatus } from "@/hooks/use-team-status"
import { useTenantData } from "@/hooks/use-tenant-data"
import { useDashboardSessionTimeout } from "@/hooks/use-dashboard-session-timeout"
import ContentNavigator from "@/components/content-navigator"
import { InterventionsList } from "@/components/interventions/interventions-list"
import { PendingActionsCard } from "@/components/shared/pending-actions-card"
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
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
        location: {
          building: intervention.building?.name,
          lot: intervention.lot?.reference
        },
        actionUrl: `/locataire/interventions/${intervention.id}`
      }))
  }

  const pendingActions = convertToPendingActions()

  // Construire l'adresse complète
  const buildingName = tenantData.building?.name || ''
  const lotReference = tenantData.reference || ''
  const apartmentNumber = tenantData.apartment_number || ''
  const street = tenantData.building?.address || ''
  const postalCode = tenantData.building?.postal_code || ''
  const city = tenantData.building?.city || ''
  const floor = tenantData.floor !== undefined ? `Étage ${tenantData.floor}` : ''

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Header avec informations du logement */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="flex-1">
            {/* Référence du lot + Nom de l'immeuble */}
            <div className="flex items-center gap-3 mb-3">
              <Home className="w-6 h-6 text-blue-600 flex-shrink-0" />
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  {lotReference}
                  {buildingName && <span className="text-slate-600 font-normal"> • {buildingName}</span>}
                </h1>
              </div>
            </div>

            {/* Adresse complète */}
            <div className="space-y-1 text-slate-600">
              {street && (
                <p className="text-base">
                  {street}
                  {(floor || apartmentNumber) && (
                    <span className="text-slate-500">
                      {floor && `, ${floor}`}
                      {apartmentNumber && `, Porte ${apartmentNumber}`}
                    </span>
                  )}
                </p>
              )}
              {(postalCode || city) && (
                <p className="text-base">
                  {postalCode} {city}
                </p>
              )}
            </div>
          </div>

          {/* Bouton créer demande */}
          <div className="flex justify-center lg:justify-end">
            <Button
              className="px-6 py-3 text-base font-semibold"
              onClick={() => {
                logger.info('📝 [LOCATAIRE-DASHBOARD] Creating new intervention...')
                router.push('/locataire/interventions/nouvelle-demande')
              }}
            >
              <Plus className="w-5 h-5 mr-2" />
              Nouvelle demande
            </Button>
          </div>
        </div>
      </div>

      {/* Section 1: Actions en attente */}
      <section>
        <PendingActionsCard
          actions={pendingActions}
          userRole="locataire"
          loading={loading}
        />
      </section>

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
