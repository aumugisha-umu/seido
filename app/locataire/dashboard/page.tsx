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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Page Header - Simple et centré */}
      <div className="text-center lg:text-left mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 mb-2">Bonjour {user.name} 👋</h1>
            <p className="text-slate-600">Signalez vos problèmes ici et faites-en le suivi facilement</p>
          </div>
          <div className="flex justify-center lg:justify-end">
            <Button className="px-6 py-3 text-base font-semibold" onClick={handleNewIntervention}>
              <Plus className="w-5 h-5 mr-2" />
              Créer une nouvelle demande
            </Button>
          </div>
        </div>
      </div>

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

      {/* Section 2: Informations du logement */}
      <section>
        <Card className="mb-8">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <Home className="w-5 h-5" />
              Informations du logement
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Nom / Référence */}
              <div>
                <div className="space-y-1">
                  <p className="text-sm text-slate-600">Nom / Référence</p>
                  <p className="font-semibold text-slate-900">
                    {tenantData.building?.name || `Lot ${tenantData.reference}`}
                  </p>
                  <p className="text-sm text-slate-600">
                    {tenantData.building ? tenantData.reference : `${tenantData.category || 'appartement'} • ${tenantData.reference}`}
                  </p>
                </div>
              </div>

              {/* Adresse */}
              <div>
                <div className="space-y-1">
                  <p className="text-sm text-slate-600">Adresse</p>
                  <p className="text-slate-900">
                    {tenantData.building ?
                      `${tenantData.building.address}, ${tenantData.building.postal_code} ${tenantData.building.city}` :
                      'Lot indépendant'
                    }
                  </p>
                </div>
              </div>

              {/* Gestionnaire */}
              <div>
                <div className="space-y-1">
                  <p className="text-sm text-slate-600">Gestionnaire</p>
                  <div 
                    onClick={handleOpenChat}
                    className="inline-flex items-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-2 rounded-full cursor-pointer transition-colors group"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        handleOpenChat()
                      }
                    }}
                    aria-label="Jean Martin • Cliquer pour ouvrir le chat"
                  >
                    <User className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium">Jean Martin</span>
                    <MessageCircle className="w-4 h-4 text-blue-600 opacity-70 group-hover:opacity-100 transition-opacity ml-1" />
                  </div>
                </div>
              </div>
            </div>

            {/* Informations supplémentaires du lot */}
            {(tenantData.floor !== undefined || tenantData.rooms || tenantData.surface_area || tenantData.charges_amount) && (
              <div className="mt-6 pt-6 border-t border-slate-200">
                <h3 className="text-base font-medium text-slate-900 mb-4">Détails du logement</h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {tenantData.floor !== undefined && (
                    <div>
                      <p className="text-sm text-slate-600">Étage</p>
                      <p className="font-semibold text-slate-900">{tenantData.floor}</p>
                    </div>
                  )}
                  {tenantData.rooms && (
                    <div>
                      <p className="text-sm text-slate-600">Pièces</p>
                      <p className="font-semibold text-slate-900">{tenantData.rooms}</p>
                    </div>
                  )}
                  {tenantData.surface_area && (
                    <div>
                      <p className="text-sm text-slate-600">Surface</p>
                      <p className="font-semibold text-slate-900">{tenantData.surface_area} m²</p>
                    </div>
                  )}
                  {tenantData.charges_amount && (
                    <div>
                      <p className="text-sm text-slate-600">Charges</p>
                      <p className="font-semibold text-slate-900">{tenantData.charges_amount.toFixed(2)} €</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
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
