"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Wrench, MapPin, Clock, CheckCircle, AlertCircle, Archive, Calendar, FileText, Euro } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { TeamCheckModal } from "@/components/team-check-modal"
import { useTeamStatus } from "@/hooks/use-team-status"
import { usePrestataireData } from "@/hooks/use-prestataire-data"
import { useDashboardSessionTimeout } from "@/hooks/use-dashboard-session-timeout"
import ContentNavigator from "@/components/content-navigator"
import { InterventionsList } from "@/components/interventions/interventions-list"
import { InterventionCancellationProvider } from "@/contexts/intervention-cancellation-context"
import { InterventionCancellationManager } from "@/components/intervention/intervention-cancellation-manager"

export default function PrestataireDashboard() {
  const { user } = useAuth()
  const router = useRouter()
  const { teamStatus, hasTeam } = useTeamStatus()
  const { stats, interventions, urgentInterventions, loading, error } = usePrestataireData(user?.id || '')
  
  // ✅ NOUVEAU: Surveillance de session inactive sur dashboard
  useDashboardSessionTimeout()

  // Afficher la vérification d'équipe en cours ou échoué
  if (teamStatus === 'checking' || (teamStatus === 'error' && !hasTeam)) {
    return <TeamCheckModal onTeamResolved={() => {}} />
  }

  if (loading) {
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
        "programmee",                // Dates planifiées, prêt à exécuter (mappé depuis planifiee)
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
      />
    )
  }

  // Get pending actions count for summary card (excluding quote requests which have their own section)
  // ⚠️ IMPORTANT: Utiliser les statuts FRONTEND mappés par le hook usePrestataireData
  const getPendingActionsCount = () => {
    return interventions.filter((i) => [
      "devis-a-fournir",     // Devis à fournir (mappé depuis demande_de_devis) - Legacy, devrait être demande_de_devis
      "planification",       // Planification à faire
      "programmee",          // Prêt à commencer (mappé depuis planifiee)
      "en_cours"             // En cours d'exécution
    ].includes(i.status)).length
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

  const pendingActionsCount = getPendingActionsCount()

  return (
    <InterventionCancellationProvider>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Page Header - Simple et centré */}
        <div className="text-center lg:text-left mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900 mb-2">Bonjour {user?.name} 👋</h1>
              <p className="text-slate-600">Gérez vos interventions assignées</p>
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

        {/* Section 1: Actions en attente */}
        <section>
          <Card className="mb-8">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <AlertCircle className="w-5 h-5 text-orange-500" />
                Actions en attente
              </CardTitle>
              <CardDescription>
                Interventions nécessitant votre attention
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              {pendingActionsCount === 0 ? (
                <div className="text-center py-6">
                  <CheckCircle className="w-12 h-12 mx-auto mb-4 text-emerald-500" />
                  <p className="text-slate-600 font-medium">Aucune action en attente</p>
                  <p className="text-sm text-slate-500">Toutes vos interventions sont à jour</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Cards individuelles pour chaque intervention nécessitant une action */}
                  {interventions
                    .filter((intervention) => [
                      "devis-a-fournir",
                      "demande_de_devis",
                      "planification",
                      "programmee",
                      "en_cours"
                    ].includes(intervention.status))
                    .map((intervention) => {
                      const getActionConfig = (status: string) => {
                        switch (status) {
                          case "devis-a-fournir":
                          case "demande_de_devis":
                            return {
                              bgColor: "bg-sky-50",
                              borderColor: "border-sky-200",
                              iconBg: "bg-sky-100",
                              iconColor: "text-sky-600",
                              textColor: "text-sky-900",
                              subtextColor: "text-sky-700",
                              icon: FileText,
                              actionLabel: "Devis à fournir",
                              buttonText: "Soumettre devis"
                            }
                          case "planification":
                            return {
                              bgColor: "bg-amber-50",
                              borderColor: "border-amber-200",
                              iconBg: "bg-amber-100",
                              iconColor: "text-amber-600",
                              textColor: "text-amber-900",
                              subtextColor: "text-amber-700",
                              icon: Calendar,
                              actionLabel: "À planifier",
                              buttonText: "Planifier"
                            }
                          case "programmee":
                          case "en_cours":
                            return {
                              bgColor: "bg-emerald-50",
                              borderColor: "border-emerald-200",
                              iconBg: "bg-emerald-100",
                              iconColor: "text-emerald-600",
                              textColor: "text-emerald-900",
                              subtextColor: "text-emerald-700",
                              icon: Wrench,
                              actionLabel: "À réaliser",
                              buttonText: "Commencer"
                            }
                          default:
                            return {
                              bgColor: "bg-slate-50",
                              borderColor: "border-slate-200",
                              iconBg: "bg-slate-100",
                              iconColor: "text-slate-600",
                              textColor: "text-slate-900",
                              subtextColor: "text-slate-700",
                              icon: Clock,
                              actionLabel: "En attente",
                              buttonText: "Voir"
                            }
                        }
                      }

                      const config = getActionConfig(intervention.status)
                      const IconComponent = config.icon

                      return (
                        <Card key={intervention.id} className={`${config.bgColor} ${config.borderColor} border`}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-start gap-3 flex-1">
                                <div className={`w-8 h-8 ${config.iconBg} rounded-full flex items-center justify-center flex-shrink-0 mt-1`}>
                                  <IconComponent className={`h-4 w-4 ${config.iconColor}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge className={`${config.bgColor} ${config.textColor} border-0 text-xs`}>
                                      {config.actionLabel}
                                    </Badge>
                                  </div>
                                  <h4 className={`font-medium ${config.textColor} mb-1 truncate`}>
                                    {intervention.reference} - {intervention.title}
                                  </h4>
                                  <div className={`text-xs ${config.subtextColor} space-y-1`}>
                                    <div className="flex items-center gap-1">
                                      <MapPin className="h-3 w-3" />
                                      <span>{intervention.building?.name} • {intervention.lot?.reference}</span>
                                    </div>
                                    {intervention.tenant && (
                                      <p>Locataire: {intervention.tenant.name}</p>
                                    )}
                                    {intervention.priority === "urgent" && (
                                      <Badge variant="destructive" className="text-xs">
                                        Urgent
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex flex-col gap-2 ml-4">
                                <Button
                                  size="sm"
                                  className="bg-sky-600 hover:bg-sky-700 text-white"
                                  onClick={() => router.push(`/prestataire/interventions/${intervention.id}`)}
                                >
                                  {config.buttonText}
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })
                  }
                </div>
              )}
            </CardContent>
          </Card>
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
            onSearch={(value) => console.log("Recherche:", value)}
          />
        </section>
      </div>

      {/* Gestionnaire des modales d'annulation */}
      <InterventionCancellationManager />
    </InterventionCancellationProvider>
  )
}
