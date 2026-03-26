import { Badge } from '@/components/ui/badge'
import { Shield, Building2 } from 'lucide-react'
import { getServerAuthContext } from '@/lib/server-context'
import { getAdminTeamsWithSubscriptions } from '@/app/actions/admin-team-actions'
import { TeamsManagementClient } from './teams-management-client'

/**
 * Admin Teams Page — Server Component
 *
 * Displays all teams with subscription status, member/lot counts.
 * Allows trial extension for teams in trialing status.
 */
export default async function AdminTeamsPage() {
  const { profile } = await getServerAuthContext('admin')

  const teamsResult = await getAdminTeamsWithSubscriptions()
  const teams = teamsResult.success ? teamsResult.data || [] : []

  const stats = {
    total: teams.length,
    trialing: teams.filter(t => t.subscription_status === 'trialing').length,
    active: teams.filter(t => t.subscription_status === 'active').length,
    canceled: teams.filter(t => t.subscription_status === 'canceled').length,
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6">
      {/* Page Header */}
      <div className="mb-6 lg:mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl lg:text-4xl mb-2">
              Gestion des Equipes
            </h1>
            <p className="text-slate-600">
              Equipes, abonnements et periodes d'essai
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="bg-red-100 text-red-800">
              <Shield className="w-3 h-3 mr-1" />
              {profile.display_name || profile.name}
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Building2 className="w-3 h-3" />
              {stats.total} equipes
            </Badge>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border p-4">
          <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
          <div className="text-sm text-slate-600">Total</div>
        </div>
        <div className="bg-amber-50 rounded-lg border border-amber-200 p-4">
          <div className="text-2xl font-bold text-amber-700">{stats.trialing}</div>
          <div className="text-sm text-amber-600">En essai</div>
        </div>
        <div className="bg-green-50 rounded-lg border border-green-200 p-4">
          <div className="text-2xl font-bold text-green-700">{stats.active}</div>
          <div className="text-sm text-green-600">Actives</div>
        </div>
        <div className="bg-slate-50 rounded-lg border border-slate-200 p-4">
          <div className="text-2xl font-bold text-slate-700">{stats.canceled}</div>
          <div className="text-sm text-slate-600">Annulees</div>
        </div>
      </div>

      {/* Error */}
      {!teamsResult.success && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <strong>Erreur:</strong> {teamsResult.error || 'Impossible de charger les equipes'}
        </div>
      )}

      {/* Teams Table */}
      <TeamsManagementClient initialTeams={teams} />
    </div>
  )
}
