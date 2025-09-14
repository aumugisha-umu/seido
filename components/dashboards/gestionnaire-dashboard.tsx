"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Building2, Home, Users, Euro, TrendingUp, AlertTriangle, Wrench, BarChart3, UserPlus, Plus, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { ContactFormModal } from "@/components/contact-form-modal"
import { TeamCheckModal } from "@/components/team-check-modal"
import { useAuth } from "@/hooks/use-auth"
import { useTeamStatus } from "@/hooks/use-team-status"
import { useManagerStats } from "@/hooks/use-manager-stats"

export default function GestionnaireDashboard() {
  const { user } = useAuth()
  const [isContactModalOpen, setIsContactModalOpen] = useState(false)
  const router = useRouter()
  const { teamStatus, hasTeam } = useTeamStatus()
  const { data: managerData, loading: statsLoading, error: statsError, stats, refetch } = useManagerStats()

  // Afficher la vérification d'équipe en cours ou échoué
  if (teamStatus === 'checking' || (teamStatus === 'error' && !hasTeam)) {
    return <TeamCheckModal onTeamResolved={() => {}} />
  }

  const handleContactSubmit = (contactData: any) => {
    console.log("[v0] Contact created:", {
      ...contactData,
      fullName: `${contactData.firstName} ${contactData.lastName}`,
    })
    
    if (contactData.inviteToApp) {
      console.log("📧 Une invitation sera envoyée à:", contactData.email)
    }
    
    setIsContactModalOpen(false)
  }

  return (
    <div className="space-y-6">
      {/* Header avec actions */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tableau de bord</h1>
          <p className="text-muted-foreground">Gestion de votre patrimoine immobilier</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="bg-background"
            onClick={() => router.push("/gestionnaire/biens/immeubles/nouveau")}
          >
            <Building2 className="h-4 w-4 mr-2" />
            Ajouter un immeuble
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="bg-background"
            onClick={() => router.push("/gestionnaire/biens/lots/nouveau")}
          >
            <Home className="h-4 w-4 mr-2" />
            Ajouter un lot
          </Button>
          <Button size="sm" variant="outline" className="bg-background" onClick={() => setIsContactModalOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Ajouter un contact
          </Button>
          <Button size="sm" variant="outline" className="bg-background">
            <Wrench className="h-4 w-4 mr-2" />
            Ajouter une intervention
          </Button>
        </div>
      </div>

      {/* Portfolio Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Immeubles</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              {statsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : stats.buildingsCount}
            </div>
            <p className="text-xs text-muted-foreground">Propriétés gérées</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lots</CardTitle>
            <Home className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              {statsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : stats.lotsCount}
            </div>
            <p className="text-xs text-muted-foreground">Logements totaux</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Occupés</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              {statsLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                `${stats.occupiedLotsCount}/${stats.lotsCount}`
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Progress value={statsLoading ? 0 : stats.occupancyRate} className="flex-1" />
              <span className="text-sm font-medium text-muted-foreground">
                {statsLoading ? '...' : `${Math.round(stats.occupancyRate)}%`}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Interventions</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              {statsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : stats.interventionsCount}
            </div>
            <p className="text-xs text-muted-foreground">Total interventions</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Occupation Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5" />
              <span>Tendances d'occupation</span>
            </CardTitle>
          </CardHeader>
                      <CardContent>
              <div className="flex items-center justify-center h-48">
                <div className="text-center">
                  <div className="w-32 h-32 rounded-full border-8 border-muted mx-auto mb-4 relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl font-bold text-muted-foreground">0%</span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-1">Aucune donnée d'occupation</p>
                  <p className="text-xs text-muted-foreground">Ajoutez des biens pour voir les statistiques</p>
                </div>
              </div>
            </CardContent>
        </Card>

        {/* Interventions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Wrench className="h-5 w-5" />
                <span>Interventions</span>
              </div>
              <Button variant="outline" size="sm">
                Voir toutes →
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center py-12">
              <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Aucune intervention</h3>
              <p className="text-muted-foreground mb-4">Les interventions apparaîtront ici une fois créées</p>
              <Button onClick={() => router.push("/gestionnaire/interventions/nouvelle-intervention")}>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter une intervention
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contact Form Modal */}
      <ContactFormModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
        onSubmit={handleContactSubmit}
        onSuccess={refetch}
        defaultType="locataire"
      />
    </div>
  )
}
