import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Building2, Users, Wrench, CreditCard, Shield, ArrowRight, Clock } from "lucide-react"
import Link from "next/link"
import { getServerAuthContext } from '@/lib/server-context'
import { getAdminDashboardStats, getAdminTeamsWithSubscriptions } from '@/app/actions/admin-team-actions'
import { AdminDashboardClient } from "./admin-dashboard-client"
import { logger } from '@/lib/logger'

/**
 * Admin Dashboard — Server Component
 *
 * Real KPIs from DB, trial teams panel, functional quick links.
 */
export default async function AdminDashboard() {
  const { profile } = await getServerAuthContext('admin')

  // Parallel data fetch
  const [statsResult, teamsResult] = await Promise.all([
    getAdminDashboardStats(),
    getAdminTeamsWithSubscriptions(),
  ])

  const stats = statsResult.success ? statsResult.data : null
  const allTeams = teamsResult.success ? teamsResult.data || [] : []
  const trialTeams = allTeams.filter(t => t.subscription_status === 'trialing')

  if (!statsResult.success) {
    logger.error({ error: statsResult.error }, '[ADMIN-DASHBOARD] Failed to load stats')
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6">
      {/* Page Header */}

      <div className="space-y-8">
        {/* KPI Cards — real data */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Utilisateurs actifs</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(stats?.activeUsers ?? 0).toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Connectes ces 30 derniers jours</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Equipes</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(stats?.totalTeams ?? 0).toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {trialTeams.length > 0 ? `dont ${trialTeams.length} en essai` : 'Total actives'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Abonnements actifs</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(stats?.activeSubscriptions ?? 0).toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Subscriptions payantes</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Interventions</CardTitle>
              <Wrench className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(stats?.recentInterventions ?? 0).toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Creees ces 30 derniers jours</p>
            </CardContent>
          </Card>
        </div>

        {/* Trial Teams Panel */}
        {trialTeams.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-amber-500" />
                  Equipes en essai
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {trialTeams.length} equipe{trialTeams.length > 1 ? 's' : ''} en periode d'essai
                </p>
              </div>
              <Link
                href="/admin/teams?filter=trialing"
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                Voir tout
                <ArrowRight className="h-3 w-3" />
              </Link>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Equipe</TableHead>
                    <TableHead>Gestionnaire</TableHead>
                    <TableHead className="text-right">Lots</TableHead>
                    <TableHead className="text-right">Jours restants</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trialTeams.slice(0, 5).map(team => {
                    const daysLeft = team.trial_end
                      ? Math.max(0, Math.ceil((new Date(team.trial_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
                      : null

                    return (
                      <TableRow key={team.id}>
                        <TableCell className="font-medium">{team.name}</TableCell>
                        <TableCell className="text-muted-foreground">{team.admin_name || '—'}</TableCell>
                        <TableCell className="text-right">{team.lot_count}</TableCell>
                        <TableCell className="text-right">
                          {daysLeft !== null ? (
                            <Badge
                              variant={daysLeft <= 7 ? 'destructive' : daysLeft <= 14 ? 'outline' : 'secondary'}
                              className={daysLeft <= 7 ? '' : daysLeft <= 14 ? 'border-amber-300 text-amber-700' : ''}
                            >
                              {daysLeft}j
                            </Badge>
                          ) : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Link
                            href={`/admin/teams?extend=${team.id}`}
                            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                          >
                            Etendre
                          </Link>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/admin/teams" className="block">
            <Card className="h-full hover:border-blue-300 hover:shadow-md transition-all cursor-pointer">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="h-12 w-12 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <Building2 className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">Gestion des equipes</p>
                  <p className="text-sm text-muted-foreground">Equipes, abonnements, trials</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/users" className="block">
            <Card className="h-full hover:border-green-300 hover:shadow-md transition-all cursor-pointer">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="h-12 w-12 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">Gestion utilisateurs</p>
                  <p className="text-sm text-muted-foreground">Comptes, roles, invitations</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/parametres" className="block">
            <Card className="h-full hover:border-purple-300 hover:shadow-md transition-all cursor-pointer">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="h-12 w-12 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                  <Wrench className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">Configuration systeme</p>
                  <p className="text-sm text-muted-foreground">Parametres, types intervention</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  )
}
