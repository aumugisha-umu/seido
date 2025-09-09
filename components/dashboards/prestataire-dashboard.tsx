"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Wrench, Calendar, MapPin, Clock, CheckCircle, AlertCircle } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { TeamCheckModal } from "@/components/team-check-modal"
import { useTeamStatus } from "@/hooks/use-team-status"
import { usePrestataireData } from "@/hooks/use-prestataire-data"

export default function PrestataireDashboard() {
  const { user } = useAuth()
  const router = useRouter()
  const { teamStatus, hasTeam } = useTeamStatus()
  const { stats, urgentInterventions, loading, error } = usePrestataireData(user?.id || '')

  // Afficher la vérification d'équipe en cours ou échoué
  if (teamStatus === 'checking' || (teamStatus === 'error' && !hasTeam)) {
    return <TeamCheckModal onTeamResolved={() => {}} />
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-medium text-gray-900 mb-2">Erreur de chargement</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>
            Réessayer
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Bonjour {user?.name} 👋</h1>
          <p className="text-muted-foreground">Gestion de vos interventions et services</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="bg-background">
            <Calendar className="h-4 w-4 mr-2" />
            Planning
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            className="bg-background"
            onClick={() => router.push('/prestataire/interventions')}
          >
            <Wrench className="h-4 w-4 mr-2" />
            Voir toutes les interventions
          </Button>
          <Button size="sm" variant="outline" className="bg-background">
            <CheckCircle className="h-4 w-4 mr-2" />
            Rapports
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
            <div className="text-2xl font-bold">{stats.interventionsEnCours}</div>
            <p className="text-xs text-muted-foreground">{stats.urgentesCount} urgentes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Terminées ce mois</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.terminesCeMois}</div>
            <p className="text-xs text-muted-foreground">
              {stats.terminesCeMois > 0 ? '+' : ''}
              {stats.terminesCeMois > 0 ? Math.round((stats.terminesCeMois / Math.max(1, stats.interventionsEnCours)) * 100) : 0}% vs mois dernier
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prochains RDV</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.prochainsRdv}</div>
            <p className="text-xs text-muted-foreground">Cette semaine</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenus du mois</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{stats.revenusMois.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {stats.terminesCeMois > 0 ? '+' : ''}
              {stats.terminesCeMois > 0 ? Math.round((stats.revenusMois / Math.max(1, stats.interventionsEnCours * 280)) * 100) : 0}% ce mois
            </p>
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
          {urgentInterventions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
              <p>Aucune intervention urgente en cours</p>
            </div>
          ) : (
            <div className="space-y-4">
              {urgentInterventions.map((intervention) => (
                <div key={intervention.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant="destructive">
                      {intervention.priority === 'urgent' ? 'Urgent' : 'Critique'}
                    </Badge>
                    <div>
                      <p className="font-medium">{intervention.title}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {intervention.location}
                      </p>
                    </div>
                  </div>
                  <Button 
                    size="sm"
                    onClick={() => router.push(`/prestataire/interventions/${intervention.id}`)}
                  >
                    Voir détails
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
