"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Wrench, Clock, AlertCircle, Archive } from "lucide-react"
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
import { InterventionCancellationProvider } from "@/contexts/intervention-cancellation-context"
import { InterventionCancellationManager } from "@/components/intervention/intervention-cancellation-manager"
import { PendingActionsCompactHybrid } from "@/components/ui-proposals/pending-actions-compact-hybrid"
import { logger, logError } from '@/lib/logger'
export default function PrestataireDashboard() {
  const { user } = useAuth()
  const router = useRouter()
  const { teamStatus, hasTeam } = useTeamStatus()
  const { interventions, loading, error } = usePrestataireData(user?.id || '')

  // 🎯 FIX: Pattern "mounted" pour éviter l'erreur d'hydration React
  // Le composant "use client" est pré-rendu côté serveur dans Next.js 15/React 19
  // On doit s'assurer que le rendu initial est identique entre serveur et client
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // ✅ NOUVEAU: Surveillance de session inactive sur dashboard
  useDashboardSessionTimeout()

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
              <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">Erreur de chargement</h3>
              <p className="text-slate-500 mb-4">{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Filter function for interventions based on tab (pour prestataires)
  // ⚠️ IMPORTANT: Utiliser les statuts FRONTEND mappés par le hook usePrestataireData
  const getFilteredInterventions = (tabId: string) => {
    if (tabId === "en_cours") {
      // En cours : interventions assignées au prestataire nécessitant une action
      return interventions.filter((i) => [
        "demande_de_devis",          // Demandes de devis (nouvellement ajouté)
        "devis-a-fournir",           // Devis à fournir (mappé depuis demande_de_devis)
        "planification",             // Phase de planification des dates
        "planifiee",                 // Dates planifiées, prêt à exécuter
        "en_cours"                   // Intervention en cours d'exécution
      ].includes(i.status))
    } else if (tabId === "cloturees") {
      // Clôturées : interventions terminées ou annulées
      return interventions.filter((i) => [
        "terminee",                  // Toutes les interventions terminées (mappé depuis cloturee_par_*)
        "annulee"                    // Annulée
      ].includes(i.status))
    }
    return interventions
  }

  // Function to render interventions list
  const renderInterventionsList = (tabId: string) => {
    const filteredInterventions = getFilteredInterventions(tabId)

    return (
      <InterventionsList
        interventions={filteredInterventions}
        loading={loading}
        emptyStateConfig={{
          title: tabId === "en_cours" ? "Aucune intervention en cours" : "Aucune intervention clôturée",
          description: tabId === "en_cours"
            ? "Les interventions qui vous sont assignées apparaîtront ici"
            : "Vos interventions terminées apparaîtront ici",
          showCreateButton: false
        }}
        showStatusActions={true}
        userContext="prestataire"
        actionHooks={actionHooks}
      />
    )
  }


  // Tabs configuration pour les prestataires
  const interventionsTabsConfig = [
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

  // Convertir les interventions en format PendingAction pour le composant
  const convertToPendingActions = () => {
    return interventions
      .filter((intervention) => [
        "devis-a-fournir",
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Page Header - Simple et centré */}
        <div className="text-center lg:text-left mb-8">
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
                    userRole="prestataire"
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

      {/* Gestionnaire des modales d'annulation */}
      <InterventionCancellationManager />
    </InterventionCancellationProvider>
  )
}
