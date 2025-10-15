import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Building2, Home, Users, Wrench, Plus } from "lucide-react"
import Link from "next/link"
import { requireRole } from "@/lib/auth-dal"
import {
  createServerActionTeamService,
  createServerActionUserService,
  createServerActionBuildingService,
  createServerActionLotService,
  createServerActionInterventionService,
  createServerActionStatsService
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
  let userTeamId = ''  // ✅ Déclarer ici pour accessibilité globale

  try {
    // ✅ Vérifier session Supabase AVANT de créer les services
    // 🔐 SECURITY: Use .getUser() instead of .getSession() (recommended by Supabase)
    // .getUser() verifies the token with Auth server (more secure)
    dashLogger.info('🔐 [DASHBOARD] Checking Supabase authenticated user...')
    const { createServerActionSupabaseClient } = await import('@/lib/services/core/supabase-client')
    const supabase = await createServerActionSupabaseClient()
    const { data: { user: sessionUser }, error: sessionError } = await supabase.auth.getUser()

    dashLogger.info('🔐 [DASHBOARD] Auth user status:', {
      hasUser: !!sessionUser,
      sessionUserId: sessionUser?.id,
      profileAuthUserId: profile.auth_user_id,
      profileUserId: profile.id,
      userIdMatch: sessionUser?.id === profile.auth_user_id,
      sessionError: sessionError?.message || null
    })

    if (sessionError) {
      throw new Error(`Supabase auth error: ${sessionError.message}`)
    }

    if (!sessionUser) {
      throw new Error('No authenticated user found')
    }

    // Initialiser les services avec ServerAction clients (auth complète)
    dashLogger.info('🔧 [DASHBOARD] Starting service initialization...')

    dashLogger.info('🔧 [DASHBOARD] Creating TeamService...')
    const teamService = await createServerActionTeamService()
    dashLogger.info('✅ [DASHBOARD] TeamService created')

    dashLogger.info('🔧 [DASHBOARD] Creating UserService...')
    const userService = await createServerActionUserService()
    dashLogger.info('✅ [DASHBOARD] UserService created')

    dashLogger.info('🔧 [DASHBOARD] Creating BuildingService...')
    const buildingService = await createServerActionBuildingService()
    dashLogger.info('✅ [DASHBOARD] BuildingService created')

    dashLogger.info('🔧 [DASHBOARD] Creating LotService...')
    const lotService = await createServerActionLotService()
    dashLogger.info('✅ [DASHBOARD] LotService created')

    dashLogger.info('🔧 [DASHBOARD] Creating InterventionService...')
    const interventionService = await createServerActionInterventionService()
    dashLogger.info('✅ [DASHBOARD] InterventionService created')

    dashLogger.info('🔧 [DASHBOARD] Creating StatsService...')
    const statsService = await createServerActionStatsService()
    dashLogger.info('✅ [DASHBOARD] StatsService created')

    dashLogger.info('✅ [DASHBOARD] All services initialized successfully')

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
      userTeamId = teams[0].id  // ✅ Assigner à la variable déclarée plus haut
      dashLogger.info('📦 [DASHBOARD] Using team ID:', userTeamId)

      // ⚡ OPTIMISATION: Récupérer les statistiques en parallèle avec Promise.all
      dashLogger.info('🏗️ [DASHBOARD] Starting PARALLEL data loading for team:', userTeamId)

      // ⚡ Phase 1: Charger buildings, users et interventions en parallèle
      const [buildingsResult, usersResult, interventionsResult] = await Promise.allSettled([
        buildingService.getBuildingsByTeam(userTeamId),
        userService.getUsersByTeam(userTeamId),
        interventionService.getByTeam(userTeamId)  // ✅ Phase 3: Use team-scoped method (replaces getAll)
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

      // ⚡ OPTIMISATION: Charger TOUS les lots (building + indépendants) en 1 seule requête team-scoped
      dashLogger.info('🏠 [DASHBOARD] Loading ALL lots (including independent) for team:', userTeamId)
      const allLotsResult = await lotService.getLotsByTeam(userTeamId)

      let allLots: any[] = []
      if (allLotsResult.success) {
        allLots = allLotsResult.data || []
        dashLogger.info('✅ [DASHBOARD] ALL lots loaded:', allLots.length, '(including independent lots)')

        // Log breakdown for debugging
        const buildingLots = allLots.filter(lot => lot.building_id)
        const independentLots = allLots.filter(lot => !lot.building_id)
        dashLogger.info('  → Building-linked lots:', buildingLots.length)
        dashLogger.info('  → Independent lots:', independentLots.length)
      } else {
        dashLogger.error('❌ [DASHBOARD] Error loading lots:', allLotsResult.error)
      }

      // Calculer les statistiques
      dashLogger.info('📊 [DASHBOARD] Calculating stats with:')
      dashLogger.info('  - buildings array:', buildings)
      dashLogger.info('  - buildings length:', (buildings as any[])?.length || 0)
      dashLogger.info('  - allLots length:', allLots?.length || 0)
      dashLogger.info('  - interventions length:', interventions?.length || 0)

      // Phase 2: Occupancy determined by tenant_id presence
      const occupiedLots = allLots.filter(lot => (lot as any).tenant_id || (lot as any).tenant)

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
      // 🛡️ DEFENSIVE: Ensure users is always an array before operations
      const safeUsers = Array.isArray(users) ? users : []
      const activeUsers = safeUsers.filter((u: any) => u.auth_user_id)
      const contactsByType = safeUsers.reduce((acc: Record<string, { total: number; active: number }>, user: any) => {
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
        totalContacts: safeUsers.length,
        totalActiveAccounts: activeUsers.length,
        invitationsPending: safeUsers.filter((u: any) => !u.auth_user_id).length,
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
    // Capturer toutes les propriétés de l'erreur pour diagnostic complet
    const errorDetails = {
      message: error instanceof Error ? error.message : String(error),
      name: error instanceof Error ? error.name : 'UnknownError',
      stack: error instanceof Error ? error.stack?.split('\n').slice(0, 5).join('\n') : undefined,
      type: typeof error,
      constructor: error?.constructor?.name
    }

    // 🔍 IMPORTANT: Pino logger requires manual stringification for complex objects
    dashLogger.error('❌ [DASHBOARD] Error loading data - Full Details:')
    dashLogger.error(JSON.stringify(errorDetails, null, 2))

    // Cas spécial : erreur Supabase avec code
    if (error && typeof error === 'object' && 'code' in error) {
      const supabaseError = {
        code: (error as any).code,
        message: (error as any).message,
        details: (error as any).details,
        hint: (error as any).hint
      }
      dashLogger.error('❌ [DASHBOARD] Supabase error details:')
      dashLogger.error(JSON.stringify(supabaseError, null, 2))
    }

    // Les stats par défaut restent (valeurs 0)
  }

  // ✅ userTeamId déjà récupéré dans le try block (ligne 81)
  // Pas besoin de refaire l'appel getUserTeams ici

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
