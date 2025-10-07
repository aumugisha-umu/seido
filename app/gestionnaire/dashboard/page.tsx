import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Building2, Home, Users, Wrench, Plus } from "lucide-react"
import Link from "next/link"
import { requireRole } from "@/lib/auth-dal"
import {
  createServerTeamService,
  createServerUserService,
  createServerBuildingService,
  createServerLotService,
  createServerInterventionService,
  createServerStatsService
} from "@/lib/services"
import { DashboardClient } from "./dashboard-client"
import { logger as baseLogger, logError } from '@/lib/logger'
import { InterventionsList } from "@/components/interventions/interventions-list"
import type { InterventionWithRelations, Building, User } from "@/lib/services"

// Relax logger typing locally to avoid strict method signature constraints for rich logs in this server component
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const logger: any = baseLogger
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const dashLogger: any = logger
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
  const { user, profile } = await requireRole(['gestionnaire'])

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

  let recentInterventions: InterventionWithRelations[] = []
  let allInterventions: InterventionWithRelations[] = []

  try {
    // Initialiser les services
    const teamService = await createServerTeamService()
    const userService = await createServerUserService()
    const buildingService = await createServerBuildingService()
    const lotService = await createServerLotService()
    const interventionService = await createServerInterventionService()
    const statsService = await createServerStatsService()

    // Récupérer l'équipe de l'utilisateur (structure actuelle: users.team_id)
    dashLogger.info('🔍 [DASHBOARD] Getting teams for user:', profile.id)
    const teamsResult = await teamService.getUserTeams(profile.id)
    dashLogger.info('📦 [DASHBOARD] Teams result:', teamsResult)

    // Extraire les données selon le format RepositoryResult
    const teams = teamsResult?.data || []
    dashLogger.info('📦 [DASHBOARD] Teams array:', teams)
    dashLogger.info('📦 [DASHBOARD] Teams count:', teams.length)

    if (teams && teams.length > 0) {
      dashLogger.info('📦 [DASHBOARD] First team:', teams[0])
      const userTeamId = teams[0].id
      dashLogger.info('📦 [DASHBOARD] Using team ID:', userTeamId)

      // ⚡ OPTIMISATION: Récupérer les statistiques en parallèle avec Promise.all
      dashLogger.info('🏗️ [DASHBOARD] Starting PARALLEL data loading for team:', userTeamId)

      // ⚡ Phase 1: Charger buildings, users et interventions en parallèle
      const [buildingsResult, usersResult, interventionsResult] = await Promise.allSettled([
        buildingService.getBuildingsByTeam(userTeamId),
        userService.getUsersByTeam(userTeamId),
        interventionService.getAll({ limit: 100 })
      ])

      // Traiter résultats buildings
      let buildings: any[] = []
      if (buildingsResult.status === 'fulfilled' && buildingsResult.value.success) {
        buildings = (buildingsResult.value.data || []) as any[]
        dashLogger.info('✅ [DASHBOARD] Buildings loaded:', buildings.length)
      } else {
        dashLogger.error('❌ [DASHBOARD] Error loading buildings:',
          buildingsResult.status === 'rejected' ? buildingsResult.reason : 'No data')
      }

      // Traiter résultats users
      let users: any[] = []
      if (usersResult.status === 'fulfilled' && usersResult.value.success) {
        users = (usersResult.value.data || []) as any[]
        dashLogger.info('✅ [DASHBOARD] Users loaded:', users.length)
      } else {
        dashLogger.error('❌ [DASHBOARD] Error loading users:',
          usersResult.status === 'rejected' ? usersResult.reason : 'No data')
      }

      // Traiter résultats interventions
      let interventions: InterventionWithRelations[] = []
      if (interventionsResult.status === 'fulfilled' && interventionsResult.value.success) {
        interventions = (interventionsResult.value.data || []) as unknown as InterventionWithRelations[]
        dashLogger.info('✅ [DASHBOARD] Interventions loaded:', interventions.length)
      } else {
        dashLogger.error('❌ [DASHBOARD] Error loading interventions:',
          interventionsResult.status === 'rejected' ? interventionsResult.reason : 'No data')
      }
      allInterventions = interventions

      // ⚡ Phase 2: Charger TOUS les lots en parallèle
      dashLogger.info('🏠 [DASHBOARD] Loading lots for', buildings.length, 'buildings IN PARALLEL')
      const lotsPromises = (buildings as Building[]).map((building: Building) =>
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
          dashLogger.info(`✅ [DASHBOARD] Lots loaded for ${result.buildingName}:`, result.lots.length)
          return result.lots
        } else {
          dashLogger.error(`❌ [DASHBOARD] Error loading lots for ${result.buildingName}:`, (result as any).error)
          return []
        }
      })

      dashLogger.info('🏠 [DASHBOARD] Total lots loaded:', allLots.length)

      // Calculer les statistiques
      dashLogger.info('📊 [DASHBOARD] Calculating stats with:')
      dashLogger.info('  - buildings array:', buildings)
      dashLogger.info('  - buildings length:', (buildings as any[])?.length || 0)
      dashLogger.info('  - allLots length:', allLots?.length || 0)
      dashLogger.info('  - interventions length:', interventions?.length || 0)

      const occupiedLots = allLots.filter(lot => (lot as any).is_occupied || (lot as any).tenant)

      stats = {
        buildingsCount: (buildings as any[])?.length || 0,
        lotsCount: allLots?.length || 0,
        occupiedLotsCount: occupiedLots?.length || 0,
        occupancyRate: allLots.length > 0 ? Math.round((occupiedLots.length / allLots.length) * 100) : 0,
        interventionsCount: interventions?.length || 0
      }

      dashLogger.info('📊 [DASHBOARD] Final stats calculated:', stats)
      dashLogger.info('📊 [DASHBOARD] Stats object structure:', JSON.stringify(stats, null, 2))

      // Statistiques contacts
      const activeUsers = (users as any[]).filter((u: any) => u.auth_user_id)
      const contactsByType = (users as any[]).reduce((acc: Record<string, { total: number; active: number }>, user: any) => {
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
        totalContacts: (users as any[]).length,
        totalActiveAccounts: activeUsers.length,
        invitationsPending: (users as any[]).filter((u: any) => !u.auth_user_id).length,
        contactsByType
      }

      // Interventions triées récentes
      allInterventions = (allInterventions || [])
        .sort((a, b) => (new Date(b.created_at ?? '').getTime() || 0) - (new Date(a.created_at ?? '').getTime() || 0))
      recentInterventions = (allInterventions || []).slice(0, 3)
    } else {
      dashLogger.info('⚠️ [DASHBOARD] No teams found for user:', user.id)
      dashLogger.info('⚠️ [DASHBOARD] Using default stats (all zeros)')
    }
  } catch (error) {
    dashLogger.error('❌ [DASHBOARD] Error loading data:', error)
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

        {/* Interventions */}
        <div className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Wrench className="h-5 w-5" />
                  <span>Interventions</span>
                  <span className="text-sm text-gray-600 font-normal">({stats.interventionsCount} au total)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white">
                    <Link href="/gestionnaire/interventions/nouvelle-intervention">
                      <Plus className="h-4 w-4 mr-2" />
                      Ajouter une intervention
                    </Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href="/gestionnaire/interventions">Voir toutes →</Link>
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <InterventionsList
                interventions={recentInterventions as any}
                loading={false}
                compact={true}
                showStatusActions={false}
                userContext={'gestionnaire'}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
