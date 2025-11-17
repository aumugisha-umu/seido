"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Wrench, Clock, AlertTriangle, Archive } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { TeamCheckModal } from "@/components/team-check-modal"
import { useTeamStatus } from "@/hooks/use-team-status"
import { usePrestataireData } from "@/hooks/use-prestataire-data"
import { useDashboardSessionTimeout } from "@/hooks/use-dashboard-session-timeout"
import { useInterventionExecution } from "@/hooks/use-intervention-execution"
import { useInterventionQuoting } from "@/hooks/use-intervention-quoting"
import { useInterventionPlanning } from "@/hooks/use-intervention-planning"
import ContentNavigator from "@/components/content-navigator"
import { InterventionsList } from "@/components/interventions/interventions-list"
import { InterventionsViewContainer } from "@/components/interventions/interventions-view-container"
import { ViewModeSwitcherV1 } from "@/components/interventions/view-mode-switcher-v1"
import { useViewMode } from "@/hooks/use-view-mode"
import { InterventionCancellationProvider } from "@/contexts/intervention-cancellation-context"
import { InterventionCancellationManager } from "@/components/intervention/intervention-cancellation-manager"
import { PendingActionsCompactHybrid } from "@/components/ui-proposals/pending-actions-compact-hybrid"
import { logger, logError } from '@/lib/logger'
import { PWADashboardPrompt } from '@/components/pwa/pwa-dashboard-prompt'
import { hasAnyAlertAction, filterPendingActions } from '@/lib/intervention-alert-utils'
export default function PrestataireDashboard() {
  const { user } = useAuth()
  const router = useRouter()
  const { teamStatus, hasTeam } = useTeamStatus()
  const { interventions, loading, error } = usePrestataireData(user?.id || '')
  const [interventionsActiveTab, setInterventionsActiveTab] = useState<string | undefined>(undefined)

  // 🎯 FIX: Pattern "mounted" pour éviter l'erreur d'hydration React
  // Le composant "use client" est pré-rendu côté serveur dans Next.js 15/React 19
  // On doit s'assurer que le rendu initial est identique entre serveur et client
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // ✅ NOUVEAU: Surveillance de session inactive sur dashboard
  useDashboardSessionTimeout()

  // View mode state (cards, list, calendar)
  const { viewMode, setViewMode, mounted: viewMounted } = useViewMode({
    defaultMode: 'cards',
    syncWithUrl: false
  })

  // Hooks pour les actions d'intervention (prestataire)
  const executionHook = useInterventionExecution()
  const quotingHook = useInterventionQuoting()
  const planningHook = useInterventionPlanning()

  // Configuration des hooks d'actions
  const actionHooks = {
    executionHook,
    quotingHook,
    planningHook,
  }

  // Afficher la vérification d'équipe en cours ou échoué
  if (teamStatus === 'checking' || (teamStatus === 'error' && !hasTeam)) {
    return <TeamCheckModal onTeamResolved={() => {}} />
  }

  // 🎯 FIX: Afficher skeleton si pas encore monté OU si loading
  // Garantit que serveur et client rendent la même chose initialement
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
              <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">Erreur de chargement</h3>
              <p className="text-slate-500 mb-4">{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Function to get interventions with pending actions
  const getPendingActionsInterventions = () => {
    return filterPendingActions(interventions, 'prestataire')
  }

  // Filter function for interventions based on tab (pour prestataires)
  // ✅ Utiliser les statuts DB originaux (maintenant le hook garde les statuts DB dans .status)
  const getFilteredInterventions = (tabId: string) => {
    if (tabId === "actions_en_attente") {
      // Actions en attente : interventions nécessitant une action du prestataire
      return getPendingActionsInterventions()
    } else if (tabId === "en_cours") {
      // En cours : interventions assignées au prestataire nécessitant une action
      return interventions.filter((i) => [
        "demande_de_devis",          // Demandes de devis
        "planification",             // Phase de planification des dates
        "planifiee",                 // Dates planifiées, prêt à exécuter
        "en_cours"                   // Intervention en cours d'exécution
      ].includes(i.status))
    } else if (tabId === "cloturees") {
      // Clôturées : interventions terminées ou annulées
      return interventions.filter((i) => [
        "cloturee_par_prestataire",  // Clôturée par le prestataire
        "cloturee_par_locataire",    // Clôturée par le locataire
        "cloturee_par_gestionnaire", // Clôturée par le gestionnaire
        "annulee"                    // Annulée
      ].includes(i.status))
    }
    return interventions
  }

  // Function to render interventions list
  const renderInterventionsList = (tabId: string) => {
    const filteredInterventions = getFilteredInterventions(tabId)

    // Don't render until mounted (prevent hydration mismatch)
    if (!viewMounted) {
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
        userContext="prestataire"
        loading={loading}
        emptyStateConfig={{
          title: tabId === "actions_en_attente" ? "Aucune action en attente"
                : tabId === "en_cours" ? "Aucune intervention en cours"
                : "Aucune intervention clôturée",
          description: tabId === "actions_en_attente"
            ? "Toutes vos interventions sont à jour"
            : tabId === "en_cours"
            ? "Les interventions qui vous sont assignées apparaîtront ici"
            : "Vos interventions terminées apparaîtront ici",
          showCreateButton: false
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
  const pendingActionsCount = loading ? 0 : getPendingActionsInterventions().length

  // Tabs configuration pour les prestataires (conditionally include "Actions en attente" tab first if there are pending actions)
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
      id: "cloturees",
      label: "Clôturées",
      icon: Archive,
      count: loading ? "..." : getFilteredInterventions("cloturees").length,
      content: renderInterventionsList("cloturees")
    }
  ]

  // View switcher to pass as right controls
  const viewSwitcher = viewMounted ? (
    <ViewModeSwitcherV1
      value={viewMode}
      onChange={setViewMode}
    />
  ) : null

  // Convertir les interventions en format PendingAction pour le composant
  const convertToPendingActions = () => {
    return filterPendingActions(interventions, 'prestataire')
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
        contact: intervention.tenant ? {
          name: intervention.tenant.name,
          role: 'Locataire',
          phone: intervention.tenant.phone,
          email: intervention.tenant.email
        } : undefined,
        assigned_contact: intervention.assigned_contact,
        dates: {
          created: intervention.created_at,
          planned: (intervention as any).planned_date,
          completed: (intervention as any).completed_date
        },
        actionUrl: `/prestataire/interventions/${intervention.id}`
      }))
  }

  const pendingActions = convertToPendingActions()

  return (
    <InterventionCancellationProvider>
      {/* 📱 PWA Installation Prompt - Triggered automatically on dashboard */}
      <PWADashboardPrompt />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col h-full min-h-0">
        {/* Page Header - Simple et centré */}
        <div className="flex-shrink-0 text-center lg:text-left mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900 mb-2">Bonjour {user?.first_name} 👋</h1>
            </div>
            <div className="flex justify-center lg:justify-end">
              <Button
                variant="outline"
                onClick={() => router.push('/prestataire/interventions')}
              >
                <Wrench className="w-4 h-4 mr-2" />
                Voir toutes les interventions
              </Button>
            </div>
          </div>
        </div>

         {/* Section 1: Actions en attente - Nouveau composant réutilisable */}
         {pendingActions.length > 0 && (
           <section className="flex-shrink-0 mb-8">
             <Card className={`py-0 gap-0 ${hasAnyAlertAction(pendingActions, 'prestataire') ? 'border-orange-300 bg-orange-50/50' : ''}`}>
              <CardContent className="pt-2 pb-2">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                    <span className="text-sm font-medium text-foreground">Actions en attente</span>
                    <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-200 text-xs">
                      {pendingActions.length}
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    className="h-7 px-3 text-xs bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={() => setInterventionsActiveTab("actions_en_attente")}
                  >
                    Voir
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Section 2: Interventions avec ContentNavigator */}
        <section className="flex-1 flex flex-col min-h-0">
          {/* ContentNavigator avec header personnalisé via wrapper - Material Design compact */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Header avec titre uniquement - Material Design: padding 8dp */}
            <div className="flex items-center justify-between gap-1.5 px-2 py-1.5 sm:px-3 sm:py-2 flex-shrink-0 border-b border-gray-100">
              <div className="flex items-center gap-1.5">
                <Wrench className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-600" />
                <h2 className="text-xs sm:text-sm font-semibold text-gray-900 leading-tight">Mes interventions</h2>
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
        </section>
      </div>

      {/* Gestionnaire des modales d'annulation */}
      <InterventionCancellationManager />
    </InterventionCancellationProvider>
  )
}
