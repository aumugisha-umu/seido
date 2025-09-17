"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Home, MessageSquare, CreditCard, AlertTriangle, Calendar, FileText } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useTenantData } from "@/hooks/use-tenant-data"
import { useRouter } from "next/navigation"
import { TeamCheckModal } from "@/components/team-check-modal"
import { useTeamStatus } from "@/hooks/use-team-status"

export default function LocataireDashboard() {
  const { user } = useAuth()
  const { tenantData, tenantStats, tenantInterventions, loading, error } = useTenantData()
  const router = useRouter()
  const { teamStatus, hasTeam } = useTeamStatus()

  // Afficher la vérification d'équipe en cours ou échoué
  if (teamStatus === 'checking' || (teamStatus === 'error' && !hasTeam)) {
    return <TeamCheckModal onTeamResolved={() => {}} />
  }

  if (loading) {
    return <LoadingSkeleton />
  }

  if (error) {
    return (
      <div className="space-y-6">
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
      <div className="space-y-6">
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
    router.push('/locataire/interventions/nouvelle')
  }

  return (
    <div className="space-y-6">
      {/* Header avec actions */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Bonjour {user.name} 👋</h1>
          <p className="text-muted-foreground">Gestion de votre logement et services</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="bg-background" onClick={handleNewIntervention}>
            <AlertTriangle className="h-4 w-4 mr-2" />
            Signaler un problème
          </Button>
          <Button size="sm" variant="outline" className="bg-background">
            <CreditCard className="h-4 w-4 mr-2" />
            Paiements
          </Button>
          <Button size="sm" variant="outline" className="bg-background">
            <FileText className="h-4 w-4 mr-2" />
            Documents
          </Button>
        </div>
      </div>

      {/* Informations logement */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <Home className="w-5 h-5" />
            Mon logement
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div>
              <h3 className="font-medium mb-1">{tenantData.building.name}</h3>
              <p className="text-sm text-muted-foreground">
                {tenantData.apartment_number || `Lot ${tenantData.reference}`}
              </p>
              <p className="text-sm text-muted-foreground">
                {tenantData.building.address}, {tenantData.building.postal_code} {tenantData.building.city}, {tenantData.building.country || 'Belgique'}
              </p>
              {tenantData.rooms && (
                <p className="text-sm text-muted-foreground">
                  {tenantData.rooms} pièces
                </p>
              )}
            </div>
            <div className="flex flex-col justify-center">
              <div className="text-right lg:text-left">
                <p className="text-sm text-muted-foreground">Total mensuel</p>
                <p className="text-2xl font-bold">
                  Non défini
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Demandes ouvertes</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tenantStats?.openRequests || 0}</div>
            <p className="text-xs text-muted-foreground">
              {tenantStats?.inProgress || 0} en cours
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prochaine échéance</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tenantStats?.nextPaymentDate || 15}</div>
            <p className="text-xs text-muted-foreground">
              {new Date().toLocaleString('fr-FR', { month: 'long', year: 'numeric' })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tenantStats?.documentsCount || 0}</div>
            <p className="text-xs text-muted-foreground">Disponibles</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Interventions</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tenantStats?.thisMonthInterventions || 0}</div>
            <p className="text-xs text-muted-foreground">Ce mois</p>
          </CardContent>
        </Card>
      </div>

      {/* Demandes récentes */}
      <Card>
        <CardHeader>
          <CardTitle>Mes demandes récentes</CardTitle>
          <CardDescription>Suivi de vos demandes d'intervention</CardDescription>
        </CardHeader>
        <CardContent>
          {tenantInterventions.length > 0 ? (
            <div className="space-y-4">
              {tenantInterventions.map((intervention) => (
                <div key={intervention.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge 
                      variant={getStatusVariant(intervention.status)}
                      className={getStatusClassName(intervention.status)}
                    >
                      {getStatusLabel(intervention.status)}
                    </Badge>
                    <div>
                      <p className="font-medium">{intervention.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {intervention.completed_date 
                          ? `Terminé le ${new Date(intervention.completed_date).toLocaleDateString('fr-FR')}`
                          : `Demandé le ${new Date(intervention.created_at).toLocaleDateString('fr-FR')}`
                        }
                      </p>
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleInterventionClick(intervention.id)}
                  >
                    Voir détails
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">Aucune demande d'intervention</p>
              <Button variant="outline" onClick={handleNewIntervention}>
                <AlertTriangle className="w-4 h-4 mr-2" />
                Créer ma première demande
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-5 w-48" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-56" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-6 w-32" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-20" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-8 mb-1" />
              <Skeleton className="h-3 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-6 w-16" />
                  <div>
                    <Skeleton className="h-4 w-32 mb-1" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <Skeleton className="h-8 w-24" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function getStatusVariant(status: string) {
  switch (status) {
    case 'terminee':
      return 'outline' as const
    case 'en_cours':
      return 'default' as const
    case 'nouvelle_demande':
    case 'en_attente_validation':
      return 'secondary' as const
    case 'validee':
      return 'default' as const
    default:
      return 'outline' as const
  }
}

function getStatusClassName(status: string) {
  switch (status) {
    case 'terminee':
      return 'border-green-200 text-green-800'
    case 'en_cours':
      return 'bg-blue-100 text-blue-800'
    case 'validee':
      return 'bg-orange-100 text-orange-800'
    case 'nouvelle_demande':
    case 'en_attente_validation':
      return ''
    case 'annulee':
      return 'border-red-200 text-red-800'
    default:
      return ''
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'terminee':
      return 'Terminé'
    case 'en_cours':
      return 'En cours'
    case 'nouvelle_demande':
      return 'Nouvelle demande'
    case 'en_attente_validation':
      return 'En attente'
    case 'validee':
      return 'Validé'
    case 'annulee':
      return 'Annulé'
    default:
      return status
  }
}
