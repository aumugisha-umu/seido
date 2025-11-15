/**
 * Dashboard Locataire - Mode Démo
 * Affiche les données filtrées par l'utilisateur impersoné
 */

'use client'

import { useDemoContext } from '@/lib/demo/demo-context'
import { useDemoUserLots } from '@/hooks/demo/use-demo-lots'
import { useDemoInterventions, useDemoInterventionStats } from '@/hooks/demo/use-demo-interventions'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Home, Wrench, AlertCircle, Plus, Clock, CheckCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { PWADashboardPrompt } from '@/components/pwa/pwa-dashboard-prompt'

export default function LocataireDashboardDemo() {
  const { getCurrentUser } = useDemoContext()

  const user = getCurrentUser()

  // Utiliser les hooks démo
  const { lots } = useDemoUserLots()
  const { interventions } = useDemoInterventions()
  const { stats } = useDemoInterventionStats()

  const primaryLot = lots[0] || null
  const building = primaryLot?.building_id ? null : null // On récupérera le building via un autre hook si nécessaire

  const activeInterventions = interventions.filter(
    (i: any) => !['cloturee_par_gestionnaire', 'annulee'].includes(i.status)
  )

  return (
    <div className="space-y-8">
      {/* PWA Prompt */}
      <PWADashboardPrompt />

      {/* Welcome header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-slate-900">
          Bonjour {user?.first_name || user?.name} 👋
        </h1>
        <p className="text-slate-600">
          Bienvenue sur votre espace locataire
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Interventions actives
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeInterventions.length}</div>
            <p className="text-xs text-muted-foreground">
              En cours de traitement
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total interventions
            </CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              Toutes vos demandes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Clôturées
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.cloturees}</div>
            <p className="text-xs text-muted-foreground">
              Interventions terminées
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Logement info */}
      {primaryLot && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="w-5 h-5" />
              Mon logement
            </CardTitle>
            <CardDescription>Informations sur votre bien</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Référence</p>
                <p className="text-lg font-semibold">{primaryLot.reference}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Type</p>
                <Badge variant="outline" className="mt-1">{primaryLot.category}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!primaryLot && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
              <p className="text-sm text-yellow-800">
                Aucun logement n'est associé à votre compte. Contactez votre gestionnaire.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions rapides */}
      <div className="flex gap-4">
        <Link href="/demo/locataire/interventions/nouvelle">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle intervention
          </Button>
        </Link>
      </div>

      {/* Liste des interventions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="w-5 h-5" />
                Mes interventions récentes
              </CardTitle>
              <CardDescription className="mt-1.5">
                Vos dernières demandes d'intervention
              </CardDescription>
            </div>
            <Link href="/demo/locataire/interventions">
              <Button variant="outline" size="sm">
                Voir tout
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {interventions.length === 0 ? (
            <div className="text-center py-12">
              <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">
                Aucune intervention
              </h3>
              <p className="text-slate-500 mb-4">
                Vous n'avez pas encore créé de demande d'intervention
              </p>
              <Link href="/demo/locataire/interventions/nouvelle">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Créer une intervention
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {interventions.slice(0, 5).map((intervention: any) => (
                <div key={intervention.id} className="p-4 border rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">{intervention.title}</p>
                      <p className="text-sm text-muted-foreground mt-1">{intervention.reference}</p>
                      <p className="text-xs text-muted-foreground mt-1">Type: {intervention.type}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge
                        variant={
                          intervention.status === 'cloturee_par_gestionnaire' ? 'default' :
                          intervention.status === 'en_cours' ? 'secondary' :
                          'outline'
                        }
                      >
                        {intervention.status}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {intervention.urgency}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
