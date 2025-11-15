/**
 * Dashboard Prestataire - Mode Démo
 */

'use client'

import { useDemoContext } from '@/lib/demo/demo-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Wrench, FileText, CheckCircle, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export default function PrestataireDashboardDemo() {
  const { store, getCurrentUser } = useDemoContext()

  const user = getCurrentUser()

  // Récupérer les interventions assignées à ce prestataire
  const assignments = store.query('intervention_assignments', { filters: { user_id: user?.id } })
  const interventionIds = assignments.map((a: any) => a.intervention_id)
  const interventions = interventionIds.map((id: string) => store.get('interventions', id)).filter(Boolean)

  // Récupérer les devis de ce prestataire
  const quotes = store.query('intervention_quotes', { filters: { provider_id: user?.id } })

  const interventionsEnCours = interventions.filter((i: any) => i.status === 'en_cours')
  const interventionsPlanifiees = interventions.filter((i: any) => i.status === 'planifiee')
  const interventionsCloturees = interventions.filter((i: any) => i.status === 'cloturee_par_gestionnaire')

  const stats = [
    {
      title: 'Interventions en cours',
      value: interventionsEnCours.length,
      icon: Wrench,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    },
    {
      title: 'Planifiées',
      value: interventionsPlanifiees.length,
      icon: Clock,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      title: 'Devis envoyés',
      value: quotes.length,
      icon: FileText,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      title: 'Terminées',
      value: interventionsCloturees.length,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    }
  ]

  return (
    <div className="container py-8">
      {/* Welcome header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Bonjour {user?.name} 👋
        </h1>
        <p className="text-gray-600 mt-2">
          Votre tableau de bord prestataire
        </p>
        {user?.provider_rating && (
          <div className="flex items-center gap-2 mt-2">
            <span className="text-yellow-500 text-xl">⭐</span>
            <span className="font-semibold">{user.provider_rating.toFixed(1)} / 5.0</span>
            <span className="text-sm text-gray-500">({user.total_interventions} interventions)</span>
          </div>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Interventions récentes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="w-5 h-5" />
            Interventions récentes
          </CardTitle>
          <CardDescription>
            Vos dernières interventions assignées
          </CardDescription>
        </CardHeader>
        <CardContent>
          {interventions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Aucune intervention assignée pour le moment
            </div>
          ) : (
            <div className="space-y-3">
              {interventions.slice(0, 5).map((intervention: any) => (
                <div key={intervention.id} className="p-3 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium">{intervention.title}</p>
                      <p className="text-sm text-gray-600 mt-1">{intervention.reference}</p>
                      <p className="text-xs text-gray-500 mt-1">Type: {intervention.type}</p>
                    </div>
                    <Badge
                      variant={
                        intervention.status === 'en_cours' ? 'default' :
                        intervention.status === 'planifiee' ? 'secondary' :
                        'outline'
                      }
                    >
                      {intervention.status}
                    </Badge>
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
