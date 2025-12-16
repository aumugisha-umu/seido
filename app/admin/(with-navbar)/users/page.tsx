import { getServerAuthContext } from '@/lib/server-context'
import { getAllUsersAction } from '@/app/actions/user-admin-actions'
import { UsersManagementClient } from './users-management-client'
import { Badge } from '@/components/ui/badge'
import { Shield, Users } from 'lucide-react'

/**
 * Admin Users Page - Server Component
 *
 * Affiche la liste de tous les utilisateurs avec CRUD complet.
 * Securise: accessible uniquement aux admins via getServerAuthContext('admin')
 */
export default async function AdminUsersPage() {
  // Auth verification (admin only)
  const { profile } = await getServerAuthContext('admin')

  // Load all users
  const usersResult = await getAllUsersAction()
  const users = usersResult.success ? usersResult.data || [] : []

  // Calculate stats
  const stats = {
    total: users.length,
    admins: users.filter(u => u.role === 'admin').length,
    gestionnaires: users.filter(u => u.role === 'gestionnaire').length,
    prestataires: users.filter(u => u.role === 'prestataire').length,
    locataires: users.filter(u => u.role === 'locataire').length,
    active: users.filter(u => u.is_active).length,
    inactive: users.filter(u => !u.is_active).length,
  }

  return (
    <>
      {/* Page Header */}
      <div className="mb-6 lg:mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl lg:text-4xl mb-2">
              Gestion des Utilisateurs
            </h1>
            <p className="text-slate-600">
              Administrez tous les utilisateurs de la plateforme SEIDO
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="bg-red-100 text-red-800">
              <Shield className="w-3 h-3 mr-1" />
              {profile.display_name || profile.name}
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Users className="w-3 h-3" />
              {stats.total} utilisateurs
            </Badge>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
        <div className="bg-white rounded-lg border p-4">
          <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
          <div className="text-sm text-slate-600">Total</div>
        </div>
        <div className="bg-red-50 rounded-lg border border-red-200 p-4">
          <div className="text-2xl font-bold text-red-700">{stats.admins}</div>
          <div className="text-sm text-red-600">Admins</div>
        </div>
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
          <div className="text-2xl font-bold text-blue-700">{stats.gestionnaires}</div>
          <div className="text-sm text-blue-600">Gestionnaires</div>
        </div>
        <div className="bg-orange-50 rounded-lg border border-orange-200 p-4">
          <div className="text-2xl font-bold text-orange-700">{stats.prestataires}</div>
          <div className="text-sm text-orange-600">Prestataires</div>
        </div>
        <div className="bg-green-50 rounded-lg border border-green-200 p-4">
          <div className="text-2xl font-bold text-green-700">{stats.locataires}</div>
          <div className="text-sm text-green-600">Locataires</div>
        </div>
        <div className="bg-emerald-50 rounded-lg border border-emerald-200 p-4">
          <div className="text-2xl font-bold text-emerald-700">{stats.active}</div>
          <div className="text-sm text-emerald-600">Actifs</div>
        </div>
        <div className="bg-slate-50 rounded-lg border border-slate-200 p-4">
          <div className="text-2xl font-bold text-slate-700">{stats.inactive}</div>
          <div className="text-sm text-slate-600">Inactifs</div>
        </div>
      </div>

      {/* Error message if any */}
      {!usersResult.success && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <strong>Erreur:</strong> {usersResult.error || 'Impossible de charger les utilisateurs'}
        </div>
      )}

      {/* Users Management Table */}
      <UsersManagementClient
        initialUsers={users}
        currentUserId={profile.id}
      />
    </>
  )
}
