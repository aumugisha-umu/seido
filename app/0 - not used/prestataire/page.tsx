"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Wrench, Calendar, MapPin, Clock, CheckCircle, AlertCircle } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"

export default function PrestataireDashboard() {
  const { user } = useAuth()

  if (!user) return <div>Chargement...</div>

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-balance">Bonjour {user.name} 👋</h1>
          <p className="text-muted-foreground">Gestion de vos interventions et services</p>
        </div>
        <div className="flex items-center gap-3">
          
          <Button size="sm" className="bg-transparent" variant="outline">
            <Wrench className="w-4 h-4 mr-2" />
            Nouvelle intervention
          </Button>
          
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Interventions en cours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">3 urgentes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Terminées ce mois</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">47</div>
            <p className="text-xs text-muted-foreground">+23% vs mois dernier</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prochains RDV</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground">Cette semaine</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenus du mois</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€3,240</div>
            <p className="text-xs text-muted-foreground">+18% ce mois</p>
          </CardContent>
        </Card>
      </div>

      {/* Interventions urgentes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            Interventions urgentes
          </CardTitle>
          <CardDescription>Interventions nécessitant une attention immédiate</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Badge variant="destructive">Urgent</Badge>
                <div>
                  <p className="font-medium">Fuite d'eau - Résidence Champs-Élysées</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    Appartement 3B - 123 Rue de la Paix, Paris
                  </p>
                </div>
              </div>
              <Button size="sm">Voir détails</Button>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Badge variant="destructive">Urgent</Badge>
                <div>
                  <p className="font-medium">Panne électrique - Tour Montparnasse</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    Étage 15 - 210 Boulevard Saint-Germain, Paris
                  </p>
                </div>
              </div>
              <Button size="sm">Voir détails</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
