"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Wrench, Clock, Archive, AlertTriangle, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { TeamCheckModal } from "@/components/team-check-modal"
import { useTeamStatus } from "@/hooks/use-team-status"
import { useTenantData } from "@/hooks/use-tenant-data"
import { useDashboardSessionTimeout } from "@/hooks/use-dashboard-session-timeout"
import ContentNavigator from "@/components/content-navigator"
import { InterventionsList } from "@/components/interventions/interventions-list"
import TenantHeaderV1 from "@/components/ui-proposals/tenant-header-v1"
import { logger } from '@/lib/logger'
import { PWADashboardPrompt } from '@/components/pwa/pwa-dashboard-prompt'
import { hasAnyAlertAction, filterPendingActions } from '@/lib/intervention-alert-utils'

export default function LocataireDashboard() {
  const { user } = useAuth()
  const router = useRouter()
  const { teamStatus, hasTeam } = useTeamStatus()
  const { tenantData, tenantInterventions, loading, error } = useTenantData()
  const [interventionsActiveTab, setInterventionsActiveTab] = useState<string | undefined>(undefined)

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
              <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
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
  const transformedInterventions = tenantInterventions.map((intervention) => {
    const reference = intervention.reference ?? `INT-${intervention.id.slice(0, 8)}`

    return {
      ...intervention,
      description: intervention.description || '',
      created_at: intervention.created_at,
      urgency: intervention.urgency || 'normale',
      type: intervention.type || 'autre',
      reference,
      priority: intervention.urgency || 'normale',
      lot: intervention.lot,
      building: intervention.lot?.building,
      assigned_contact: intervention.assigned_contact
    }
  })

  // Function to get interventions with pending actions
  const getPendingActionsInterventions = () => {
    return filterPendingActions(transformedInterventions, 'locataire')
  }

  // Filter function for interventions based on tab
  const getFilteredInterventions = (tabId: string) => {
    if (tabId === "actions_en_attente") {
      // Actions en attente : interventions nécessitant une action du locataire
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

    return (
      <InterventionsList
        interventions={filteredInterventions}
        loading={loading}
        emptyStateConfig={{
          title: tabId === "actions_en_attente" ? "Aucune action en attente" 
                : tabId === "en_cours" ? "Aucune intervention en cours" 
                : "Aucune intervention terminée",
          description: tabId === "actions_en_attente" 
            ? "Toutes vos interventions sont à jour"
            : tabId === "en_cours"
            ? "Vos demandes d'intervention apparaîtront ici"
            : "Vos interventions terminées apparaîtront ici",
          showCreateButton: false
        }}
        showStatusActions={true}
        userContext="locataire"
      />
    )
  }

  // Get pending actions count for conditional tab display
  const pendingActionsCount = loading ? 0 : getPendingActionsInterventions().length

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
    return filterPendingActions(transformedInterventions, 'locataire')
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
    <div className="flex flex-col h-full min-h-0">
      {/* 📱 PWA Installation Prompt - Triggered automatically on dashboard */}
      <PWADashboardPrompt />

      {/* Header avec informations du logement - Version 1 Ultra-Compact */}
      <div className="flex-shrink-0 mb-6">
        <TenantHeaderV1
          lotReference={tenantData.reference || ''}
          buildingName={tenantData.building?.name}
          street={tenantData.building?.address}
          floor={tenantData.floor}
          apartmentNumber={tenantData.apartment_number}
          postalCode={tenantData.building?.postal_code}
          city={tenantData.building?.city}
          pendingActionsCount={pendingActions.length}
          onPendingActionsClick={() => setInterventionsActiveTab("actions_en_attente")}
        />
      </div>

      {/* Section 2: Interventions avec ContentNavigator */}
      <section className="flex-1 flex flex-col min-h-0">
        {/* ContentNavigator avec header personnalisé via wrapper - Material Design compact */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Header avec titre et bouton - Material Design: padding 8dp */}
          <div className="flex items-center justify-between gap-1.5 px-2 py-1.5 sm:px-3 sm:py-2 flex-shrink-0 border-b border-gray-100">
            <div className="flex items-center gap-1.5">
              <Wrench className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-600" />
              <h2 className="text-xs sm:text-sm font-semibold text-gray-900 leading-tight">Mes interventions</h2>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button 
                className="bg-blue-600 hover:bg-blue-700 text-white h-6 sm:h-7 px-1.5 sm:px-2 text-xs"
                onClick={() => router.push("/locataire/interventions/nouvelle-demande")}
              >
                <Plus className="h-3 w-3 sm:h-3.5 sm:w-3.5 sm:mr-1" />
                <span className="hidden sm:inline">Créer une demande</span>
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
              className="shadow-none border-0 bg-transparent flex-1 flex flex-col min-h-0"
            />
          </div>
        </div>
      </section>
    </div>
  )
}
