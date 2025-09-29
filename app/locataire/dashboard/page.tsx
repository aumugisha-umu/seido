"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Home,
  MessageSquare,
  CreditCard,
  AlertTriangle,
  Calendar,
  FileText,
  Clock,
  CheckCircle,
  Wrench,
  User,
  MessageCircle,
  MapPin,
  Building2,
  Eye,
  Droplets,
  Zap,
  Flame,
  Key,
  Paintbrush,
  Hammer,
  Archive,
  Plus
} from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useTenantData } from "@/hooks/use-tenant-data"
import { useTenantPendingActions } from "@/hooks/use-tenant-pending-actions"
import { useDashboardSessionTimeout } from "@/hooks/use-dashboard-session-timeout"
import { useRouter } from "next/navigation"
import ContentNavigator from "@/components/content-navigator"
import { PendingActionsCard } from "@/components/shared/pending-actions-card"
import { InterventionsList } from "@/components/interventions/interventions-list"
import {
  getInterventionLocationText,
  getInterventionLocationIcon,
  isBuildingWideIntervention,
  getStatusColor,
  getStatusLabel,
  getPriorityColor,
  getPriorityLabel
} from "@/lib/intervention-utils"

export default function LocataireDashboard() {
  const { user } = useAuth()
  const { tenantData, tenantStats, tenantInterventions, loading, error } = useTenantData()
  const { pendingActions, loading: pendingActionsLoading, error: pendingActionsError, refresh: refreshPendingActions } = useTenantPendingActions(user?.id || '')
  const router = useRouter()

  // ✅ NOUVEAU: Surveillance de session inactive sur dashboard
  useDashboardSessionTimeout()

  if (!user) return <div>Chargement...</div>

  if (loading) {
    return <LoadingSkeleton />
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-destructive">
              Erreur lors du chargement des données: {error}
            </p>
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

  const handleInterventionClick = (interventionId: string) => {
    router.push(`/locataire/interventions/${interventionId}`)
  }

  const handleNewIntervention = () => {
    router.push('/locataire/interventions/nouvelle-demande')
  }

  const handleOpenChat = () => {
    // TODO: Remplacer par la vraie logique de chat
    console.log('Opening chat with manager...')
    
    // Exemples d'implémentation possibles :
    // 1. Router vers une page de chat dédiée
    // router.push('/locataire/chat/manager')
    
    // 2. Ouvrir un modal de chat
    // setIsChatModalOpen(true)
    
    // 3. Router vers une liste de conversations
    // router.push('/locataire/conversations')
    
    // Pour l'instant, on peut rediriger vers le dashboard comme fallback
    router.push('/locataire/dashboard')
  }


  // Filter function for interventions based on tab (pour locataires)
  // ✅ COUVERTURE COMPLÈTE : Tous les statuts sont mappés pour garantir qu'aucune intervention ne disparaisse
  const getFilteredInterventions = (tabId: string) => {
    if (tabId === "en_cours") {
      // En cours : tous les statuts nécessitant une action du locataire ou en cours de traitement
      return tenantInterventions.filter((i) => [
        "demande",                   // Nouvelle demande en attente
        "approuvee",                 // Approuvée par le gestionnaire  
        "demande_de_devis",          // En attente de devis du prestataire
        "planification",             // Phase de planification des dates
        "planifiee",                 // Dates planifiées, en attente d'exécution
        "en_cours",                  // Intervention en cours d'exécution
        "cloturee_par_prestataire"   // ✅ DÉPLACÉ : Le locataire doit encore valider la clôture !
      ].includes(i.status))
    } else if (tabId === "cloturees") {
      // Clôturées : interventions définitivement terminées (aucune action requise du locataire)
      return tenantInterventions.filter((i) => [
        "cloturee_par_locataire",    // Validée et clôturée par le locataire
        "cloturee_par_gestionnaire", // Clôturée administrativement par le gestionnaire
        "rejetee",                   // Rejetée par le gestionnaire
        "annulee"                    // Annulée (par n'importe quel acteur)
      ].includes(i.status))
    }
    return tenantInterventions
  }

  // Function to render interventions list (utilise maintenant le composant standardisé)
  const renderInterventionsList = (tabId: string) => {
    const filteredInterventions = getFilteredInterventions(tabId)

    return (
      <InterventionsList
        interventions={filteredInterventions}
        loading={loading}
        emptyStateConfig={{
          title: tabId === "en_cours" ? "Aucune intervention en cours" : "Aucune intervention clôturée",
          description: tabId === "en_cours"
            ? "Vos demandes d'intervention apparaîtront ici"
            : "L'historique de vos interventions clôturées apparaîtra ici",
          showCreateButton: tabId === "en_cours",
          createButtonText: "Créer une nouvelle demande",
          createButtonAction: handleNewIntervention
        }}
        showStatusActions={true}
        userContext="locataire"
      />
    )
  }

  // Tabs configuration pour les locataires
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Page Header - Simplifié */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Bonjour {user.name} 👋</h1>
        <p className="text-slate-600 mt-1">Gérez vos demandes d'intervention et suivez leur avancement</p>
      </div>

      {/* Section Informations du logement - VERSION COMPACTE */}
      <section className="mb-6">
        <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
          {/* Desktop Layout - Horizontal */}
          <div className="hidden lg:flex lg:items-center lg:justify-between lg:flex-wrap gap-4">
            {/* Colonne 1: Identification du logement */}
            <div className="flex items-center gap-3 flex-1">
              <Home className="w-5 h-5 text-slate-600 flex-shrink-0" />
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-semibold text-slate-900">
                  {tenantData.building?.name || `Lot ${tenantData.reference}`}
                </span>
                <span className="text-slate-500">•</span>
                <span className="text-slate-700">
                  {tenantData.reference}
                </span>
                {tenantData.building && (
                  <>
                    <span className="text-slate-500">•</span>
                    <span className="text-slate-600">
                      {tenantData.building.address}, {tenantData.building.postal_code} {tenantData.building.city}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Colonne 2: Détails compacts (si disponibles) */}
            {(tenantData.floor !== undefined || tenantData.rooms || tenantData.surface_area || tenantData.charges_amount) && (
              <div className="flex items-center gap-3 text-sm text-slate-600">
                {tenantData.floor !== undefined && (
                  <span>Étage {tenantData.floor}</span>
                )}
                {tenantData.rooms && (
                  <>
                    {tenantData.floor !== undefined && <span className="text-slate-400">•</span>}
                    <span>{tenantData.rooms} pièces</span>
                  </>
                )}
                {tenantData.surface_area && (
                  <>
                    <span className="text-slate-400">•</span>
                    <span>{tenantData.surface_area}m²</span>
                  </>
                )}
                {tenantData.charges_amount && (
                  <>
                    <span className="text-slate-400">•</span>
                    <span>Charges: {tenantData.charges_amount.toFixed(0)}€</span>
                  </>
                )}
              </div>
            )}

            {/* Colonne 3: Gestionnaire avec action chat */}
            {tenantData.building?.manager && (
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-slate-600" />
                <span className="text-sm text-slate-600">Gestionnaire:</span>
                <button
                  onClick={handleOpenChat}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-full transition-colors"
                  aria-label={`Contacter ${tenantData.building.manager.name}`}
                >
                  <span>{tenantData.building.manager.name}</span>
                  <MessageCircle className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Mobile Layout - Vertical compact */}
          <div className="lg:hidden space-y-2">
            {/* Ligne 1: Identification principale */}
            <div className="flex items-start gap-2">
              <Home className="w-4 h-4 text-slate-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 text-sm">
                <div className="font-semibold text-slate-900">
                  {tenantData.building?.name || `Lot ${tenantData.reference}`}
                </div>
                <div className="text-slate-600">
                  {tenantData.reference}
                </div>
              </div>
            </div>

            {/* Ligne 2: Adresse */}
            {tenantData.building && (
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-slate-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-slate-600 flex-1">
                  {tenantData.building.address}, {tenantData.building.postal_code} {tenantData.building.city}
                </div>
              </div>
            )}

            {/* Ligne 3: Détails compacts */}
            {(tenantData.floor !== undefined || tenantData.rooms || tenantData.surface_area || tenantData.charges_amount) && (
              <div className="flex flex-wrap gap-3 text-xs text-slate-600 ml-6">
                {tenantData.floor !== undefined && (
                  <span>Étage {tenantData.floor}</span>
                )}
                {tenantData.rooms && (
                  <span>{tenantData.rooms} pièces</span>
                )}
                {tenantData.surface_area && (
                  <span>{tenantData.surface_area}m²</span>
                )}
                {tenantData.charges_amount && (
                  <span>{tenantData.charges_amount.toFixed(0)}€/mois</span>
                )}
              </div>
            )}

            {/* Ligne 4: Gestionnaire avec bouton chat */}
            {tenantData.building?.manager && (
              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <User className="w-4 h-4" />
                  <span>Gestionnaire</span>
                </div>
                <button
                  onClick={handleOpenChat}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-full transition-colors"
                >
                  <span>{tenantData.building.manager.name}</span>
                  <MessageCircle className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Section 1: Actions en attente */}
      <section>
        <PendingActionsCard
          actions={pendingActions}
          userRole="locataire"
          loading={pendingActionsLoading}
        />
      </section>

      {/* Section 3: Interventions avec ContentNavigator */}
      <section>
        <div className="mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-2">
            <div className="flex items-center gap-2">
              <Wrench className="w-5 h-5 text-slate-900" />
              <h2 className="text-xl font-semibold text-slate-900">Mes interventions</h2>
            </div>
            <Button 
              className="flex items-center gap-2 w-full sm:w-auto justify-center sm:justify-start" 
              onClick={handleNewIntervention}
            >
              <Plus className="h-4 w-4" />
              <span>Créer une nouvelle demande</span>
            </Button>
          </div>
        </div>

        <ContentNavigator
          tabs={interventionsTabsConfig}
          defaultTab="en_cours"
          searchPlaceholder="Rechercher par titre ou description..."
          onSearch={(value) => console.log("Recherche:", value)}
        />
      </section>

    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Header skeleton */}
      <div className="text-center lg:text-left mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <Skeleton className="h-8 w-64 mb-2 mx-auto lg:mx-0" />
            <Skeleton className="h-5 w-80 mx-auto lg:mx-0" />
          </div>
          <Skeleton className="h-12 w-48 mx-auto lg:mx-0" />
        </div>
      </div>

      {/* Informations du logement skeleton */}
      <Card className="mb-8">
        <CardHeader className="pb-4">
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-5 w-48" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-40 rounded-full" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Interventions en cours skeleton */}
      <Card className="mb-8">
        <CardHeader className="pb-4">
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="border rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Skeleton className="w-5 h-5 mt-0.5" />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-5 w-40" />
                      <Skeleton className="h-6 w-20" />
                      <Skeleton className="h-6 w-16" />
                    </div>
                    <Skeleton className="h-4 w-64" />
                    <div className="space-y-1">
                      <Skeleton className="h-3 w-32" />
                      <Skeleton className="h-3 w-36" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

          {/* Interventions skeleton */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Skeleton className="w-5 h-5" />
          <Skeleton className="h-6 w-48" />
        </div>
        
        <Card>
          <CardContent className="pt-6 space-y-4">
            {/* Tab skeleton */}
            <div className="flex gap-2">
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-32" />
            </div>
            
            {/* Grid skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3 flex-1">
                      <Skeleton className="w-10 h-10 rounded-lg" />
                  <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-40" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                    </div>
                    <Skeleton className="h-8 w-16" />
                  </div>
                  <div className="flex gap-2">
                      <Skeleton className="h-6 w-20" />
                      <Skeleton className="h-6 w-16" />
                    </div>
                  <Skeleton className="h-4 w-full" />
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex gap-3">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-18" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  )
}

// Les fonctions de style sont maintenant gérées par les utilitaires dans /lib/intervention-utils
