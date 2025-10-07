import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Building2, Home, Users, Wrench, BarChart3 } from "lucide-react"
import { requireRole } from "@/lib/dal"
import {
  createServerTeamService,
  createServerUserService,
  createServerBuildingService,
  createServerLotService,
  createServerStatsService
} from "@/lib/services"
import { DashboardClient } from "./dashboard-client"
import { logger, logError } from '@/lib/logger'
/**
 * 🔐 DASHBOARD GESTIONNAIRE - SERVER COMPONENT (Bonnes Pratiques 2025)
 *
 * Multi-layer security implementation:
 * 1. Route level: requireRole() vérification
 * 2. Data layer: DAL avec authentification
 * 3. UI level: Masquage conditionnel
 * 4. Server actions: Validation dans actions
 */

export default async function DashboardGestionnaire() {
  // ✅ LAYER 1: Route Level Security - Vérification rôle obligatoire
  const user = await requireRole('gestionnaire')

  // ✅ LAYER 2: Data Layer Security - Récupération données sécurisée
  let stats = {
    buildingsCount: 0,
    lotsCount: 0,
    occupiedLotsCount: 0,
    occupancyRate: 0,
    interventionsCount: 0
  }

  let contactStats = {
    totalContacts: 0,
    totalActiveAccounts: 0,
    invitationsPending: 0,
    contactsByType: {} as Record<string, { total: number; active: number }>
  }

  let recentInterventions: unknown[] = []

  try {
    // Initialiser les services
    const teamService = await createServerTeamService()
    const userService = await createServerUserService()
    const buildingService = await createServerBuildingService()
    const lotService = await createServerLotService()
    const statsService = await createServerStatsService()

    // Récupérer l'équipe de l'utilisateur (structure actuelle: users.team_id)
    logger.info('🔍 [DASHBOARD] Getting teams for user:', user.id)
    const teamsResult = await teamService.getUserTeams(user.id)
    logger.info('📦 [DASHBOARD] Teams result:', teamsResult)

    // Extraire les données selon le format RepositoryResult
    const teams = teamsResult?.data || []
    logger.info('📦 [DASHBOARD] Teams array:', teams)
    logger.info('📦 [DASHBOARD] Teams count:', teams.length)

    if (teams && teams.length > 0) {
      logger.info('📦 [DASHBOARD] First team:', teams[0])
      const userTeamId = teams[0].id
      logger.info('📦 [DASHBOARD] Using team ID:', userTeamId)

      // ⚡ OPTIMISATION: Récupérer les statistiques en parallèle avec Promise.all
      logger.info('🏗️ [DASHBOARD] Starting PARALLEL data loading for team:', userTeamId)

      // ⚡ Phase 1: Charger buildings et users en parallèle
      const [buildingsResult, usersResult] = await Promise.allSettled([
        buildingService.getBuildingsByTeam(userTeamId),
        userService.getUsersByTeam(userTeamId)
      ])

      // Traiter résultats buildings
      let buildings = []
      if (buildingsResult.status === 'fulfilled' && buildingsResult.value.success) {
        buildings = buildingsResult.value.data || []
        logger.info('✅ [DASHBOARD] Buildings loaded:', buildings.length)
      } else {
        logger.error('❌ [DASHBOARD] Error loading buildings:',
          buildingsResult.status === 'rejected' ? buildingsResult.reason : 'No data')
      }

      // Traiter résultats users
      let users = []
      if (usersResult.status === 'fulfilled' && usersResult.value.success) {
        users = usersResult.value.data || []
        logger.info('✅ [DASHBOARD] Users loaded:', users.length)
      } else {
        logger.error('❌ [DASHBOARD] Error loading users:',
          usersResult.status === 'rejected' ? usersResult.reason : 'No data')
      }

      // Interventions (temporairement vide)
      const interventions = []
      logger.info('✅ [DASHBOARD] Interventions: 0 (not yet implemented)')

      // ⚡ Phase 2: Charger TOUS les lots en parallèle
      logger.info('🏠 [DASHBOARD] Loading lots for', buildings.length, 'buildings IN PARALLEL')
      const lotsPromises = buildings.map(building =>
        lotService.getLotsByBuilding(building.id)
          .then(response => ({
            buildingId: building.id,
            buildingName: building.name,
            lots: response.success ? response.data : [],
            success: true
          }))
          .catch(error => ({
            buildingId: building.id,
            buildingName: building.name,
            lots: [],
            success: false,
            error
          }))
      )

      const lotsResults = await Promise.all(lotsPromises)
      const allLots = lotsResults.flatMap(result => {
        if (result.success && result.lots) {
          logger.info(`✅ [DASHBOARD] Lots loaded for ${result.buildingName}:`, result.lots.length)
          return result.lots
        } else {
          logger.error(`❌ [DASHBOARD] Error loading lots for ${result.buildingName}:`, result.error)
          return []
        }
      })

      logger.info('🏠 [DASHBOARD] Total lots loaded:', allLots.length)

      // Calculer les statistiques
      logger.info('📊 [DASHBOARD] Calculating stats with:')
      logger.info('  - buildings array:', buildings)
      logger.info('  - buildings length:', buildings?.length || 0)
      logger.info('  - allLots length:', allLots?.length || 0)
      logger.info('  - interventions length:', interventions?.length || 0)

      const occupiedLots = allLots.filter(lot => lot.is_occupied || lot.tenant)

      stats = {
        buildingsCount: buildings?.length || 0,
        lotsCount: allLots?.length || 0,
        occupiedLotsCount: occupiedLots?.length || 0,
        occupancyRate: allLots.length > 0 ? Math.round((occupiedLots.length / allLots.length) * 100) : 0,
        interventionsCount: interventions?.length || 0
      }

      logger.info('📊 [DASHBOARD] Final stats calculated:', stats)
      logger.info('📊 [DASHBOARD] Stats object structure:', JSON.stringify(stats, null, 2))

      // Statistiques contacts
      const activeUsers = users.filter(u => u.auth_user_id)
      const contactsByType = users.reduce((acc, user) => {
        if (!acc[user.role]) {
          acc[user.role] = { total: 0, active: 0 }
        }
        acc[user.role].total++
        if (user.auth_user_id) {
          acc[user.role].active++
        }
        return acc
      }, {} as Record<string, { total: number; active: number }>)

      contactStats = {
        totalContacts: users.length,
        totalActiveAccounts: activeUsers.length,
        invitationsPending: users.filter(u => !u.auth_user_id).length,
        contactsByType
      }

      // Interventions récentes (3 dernières)
      recentInterventions = interventions
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 3)
    } else {
      logger.info('⚠️ [DASHBOARD] No teams found for user:', user.id)
      logger.info('⚠️ [DASHBOARD] Using default stats (all zeros)')
    }
  } catch (error) {
    logger.error('❌ [DASHBOARD] Error loading data:', error)
    // Les stats par défaut restent (valeurs 0)
  }

  // Récupérer l'équipe pour le composant client
  const teamService2 = await createServerTeamService()
  const teamsResult2 = await teamService2.getUserTeams(user.id)
  const teams2 = teamsResult2?.data || []
  const userTeamId = teams2.length > 0 ? teams2[0].id : ''

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200"></header>

      {/* Main Content */}
      <div className="py-2">
        {/* Welcome Message and Quick Actions */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
            <div>
              <h1 className="font-bold text-gray-900 mb-[] mt-[] text-3xl">
                Tableau de bord
              </h1>
            </div>

            {/* Actions rapides - Composant client sécurisé */}
            <DashboardClient teamId={userTeamId} />
          </div>
        </div>

        {/* Portfolio Overview */}
        <div className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Immeubles</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.buildingsCount}</div>
                <p className="text-xs text-muted-foreground">Propriétés gérées</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Lots</CardTitle>
                <Home className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.lotsCount}</div>
                <p className="text-xs text-muted-foreground">Logements totaux</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Occupés</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.occupiedLotsCount}/{stats.lotsCount}</div>
                <div className="flex items-center space-x-2">
                  <Progress value={stats.occupancyRate} className="flex-1" />
                  <span className="text-sm font-medium text-gray-600">{stats.occupancyRate}%</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Contacts</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{contactStats.totalContacts}</div>
                <div className="space-y-1">
                  <p className="text-sm text-green-600">
                    {contactStats.totalActiveAccounts} comptes actifs
                  </p>
                  {contactStats.invitationsPending > 0 && (
                    <p className="text-sm text-orange-600">
                      {contactStats.invitationsPending} invitations en attente
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {Object.entries(contactStats.contactsByType)
                      .filter(([_, typeStats]) => typeStats.total > 0)
                      .slice(0, 3)
                      .map(([type, typeStats]) => (
                        <Badge key={type} variant="secondary" className="text-xs">
                          {type}: {typeStats.total}
                        </Badge>
                      ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
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
                  <div className="w-32 h-32 rounded-full border-8 border-blue-200 mx-auto mb-4 relative">
                    <div
                      className="absolute inset-0 rounded-full border-8 border-blue-600"
                      style={{
                        transform: `rotate(${(stats.occupancyRate / 100) * 360}deg)`,
                        clipPath: 'polygon(50% 0%, 100% 0%, 100% 50%, 50% 50%)'
                      }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl font-bold text-gray-700">{stats.occupancyRate}%</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-1">Taux d'occupation</p>
                  <p className="text-xs text-gray-400">{stats.occupiedLotsCount} sur {stats.lotsCount} lots occupés</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Interventions récentes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Wrench className="h-5 w-5" />
                  <span>Interventions récentes</span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentInterventions.length > 0 ? (
                <div className="space-y-3">
                  <div className="text-sm text-gray-600 mb-4">
                    <span className="font-medium">{stats.interventionsCount}</span> interventions au total
                  </div>
                  {recentInterventions.map((intervention) => (
                    <div key={intervention.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{intervention.title || 'Intervention'}</p>
                        <p className="text-xs text-gray-500">{intervention.description}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(intervention.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant={
                        intervention.status === 'completed' ? 'default' :
                        intervention.status === 'in_progress' ? 'secondary' :
                        'outline'
                      }>
                        {intervention.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Wrench className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-sm mb-2">Aucune intervention</p>
                  <p className="text-xs text-gray-400">Les interventions apparaîtront ici une fois créées</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
