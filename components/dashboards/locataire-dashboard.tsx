"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Home, MessageSquare, CreditCard, AlertTriangle, Calendar, FileText } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { TeamCheckModal } from "@/components/team-check-modal"
import { useTeamStatus } from "@/hooks/use-team-status"

export default function LocataireDashboard() {
  const { user } = useAuth()
  const router = useRouter()
  const { teamStatus, hasTeam } = useTeamStatus()

  // Afficher la vérification d'équipe en cours ou échoué
  if (teamStatus === 'checking' || (teamStatus === 'error' && !hasTeam)) {
    return <TeamCheckModal onTeamResolved={() => {}} />
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
          <Button size="sm" variant="outline" className="bg-background">
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
              <h3 className="font-medium mb-1">Résidence Champs-Élysées</h3>
              <p className="text-sm text-muted-foreground">Appartement 3B</p>
              <p className="text-sm text-muted-foreground">123 Rue de la Paix, 75001 Paris</p>
              <p className="text-sm text-muted-foreground">45m² - 2 pièces</p>
            </div>
            <div className="flex flex-col justify-center">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-2xl font-bold text-primary">950€</span>
                <span className="text-sm text-muted-foreground">hors charges</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-semibold">+ 250€</span>
                <Badge variant="outline" className="text-xs h-5">
                  Provision mensuelle
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Régularisation annuelle en décembre</p>
            </div>
            <div className="flex flex-col justify-center">
              <div className="text-right lg:text-left">
                <p className="text-sm text-muted-foreground">Total mensuel</p>
                <p className="text-2xl font-bold">1 200€</p>
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
            <div className="text-2xl font-bold">2</div>
            <p className="text-xs text-muted-foreground">1 en cours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prochaine échéance</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">15</div>
            <p className="text-xs text-muted-foreground">Janvier 2025</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground">Disponibles</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Interventions</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
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
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Badge variant="secondary">En cours</Badge>
                <div>
                  <p className="font-medium">Réparation robinet cuisine</p>
                  <p className="text-sm text-muted-foreground">Demandé le 8 janvier 2025</p>
                </div>
              </div>
              <Button size="sm" variant="outline">
                Voir détails
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="border-green-200 text-green-800">
                  Terminé
                </Badge>
                <div>
                  <p className="font-medium">Changement ampoule salon</p>
                  <p className="text-sm text-muted-foreground">Terminé le 5 janvier 2025</p>
                </div>
              </div>
              <Button size="sm" variant="outline">
                Voir détails
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
