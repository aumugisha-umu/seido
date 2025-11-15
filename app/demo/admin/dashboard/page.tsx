/**
 * Dashboard Admin - Mode Démo
 */

'use client'

import { useDemoContext } from '@/lib/demo/demo-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Building, Home, Wrench, TrendingUp } from 'lucide-react'

export default function AdminDashboardDemo() {
  const { store, getCurrentUser } = useDemoContext()

  const user = getCurrentUser()

  // Statistiques globales
  const totalUsers = store.count('users')
  const totalBuildings = store.count('buildings')
  const totalLots = store.count('lots')
  const totalInterventions = store.count('interventions')

  const stats = [
    {
      title: 'Utilisateurs',
      value: totalUsers,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      title: 'Immeubles',
      value: totalBuildings,
      icon: Building,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      title: 'Lots',
      value: totalLots,
      icon: Home,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      title: 'Interventions',
      value: totalInterventions,
      icon: Wrench,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    }
  ]

  return (
    <div className="space-y-8">
      {/* Welcome header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-slate-900">
          Tableau de bord Administrateur
        </h1>
        <p className="text-slate-600">
          Vue d'ensemble de la plateforme SEIDO
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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

      {/* Activity Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Activité récente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              Activité de la plateforme
            </h3>
            <p className="text-slate-500">
              Les statistiques détaillées et l'activité récente sont affichées ici
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
