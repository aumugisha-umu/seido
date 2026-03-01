/**
 * Async Dashboard Content - Server Component for Suspense streaming
 *
 * This component fetches dashboard data asynchronously and passes to client.
 * Wrap in <Suspense> for streaming partial content as it loads.
 */

import {
  createServerActionUserService,
  createServerActionBuildingService,
  createServerActionLotService,
  createServerActionInterventionService,
  createServerActionContractService,
  createServerSupabaseClient,
  ConversationRepository,
} from "@/lib/services"
import type { ContractStats } from "@/lib/types/contract.types"
import type { InterventionWithRelations } from "@/lib/services"
import { logger } from '@/lib/logger'
import { filterPendingActions } from '@/lib/intervention-alert-utils'
import { loadMultiTeamData, createTeamNameMap } from "@/lib/multi-team-helpers"
import { ManagerDashboardV2 } from "@/components/dashboards/manager/manager-dashboard-v2"
import type { OnboardingProgress } from "@/app/actions/subscription-actions"

interface AsyncDashboardContentProps {
  profile: { id: string }
  team: { id: string }
  activeTeamIds: string[]
  isConsolidatedView: boolean
  sameRoleTeams: Array<{ id: string; name: string }>
}

export async function AsyncDashboardContent({
  profile,
  team,
  activeTeamIds,
  isConsolidatedView,
  sameRoleTeams,
}: AsyncDashboardContentProps) {
  const teamNameMap = createTeamNameMap(sameRoleTeams)
  const effectiveTeamId = team.id

  // Initialize all services
  const userService = await createServerActionUserService()
  const buildingService = await createServerActionBuildingService()
  const lotService = await createServerActionLotService()
  const interventionService = await createServerActionInterventionService()
  const contractService = await createServerActionContractService()
  const supabase = await createServerSupabaseClient()

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

  let contractStats: ContractStats = {
    totalActive: 0,
    expiringThisMonth: 0,
    expiringNext30Days: 0,
    expired: 0,
    totalRentMonthly: 0,
    averageRent: 0,
    totalLots: 0,
    totalTenants: 0
  }

  let allInterventions: InterventionWithRelations[] = []
  let pendingActionsCount = 0

  try {
    let buildings: any[] = []
    let users: any[] = []
    let interventions: InterventionWithRelations[] = []
    let allLots: any[] = []

    if (isConsolidatedView && activeTeamIds.length > 1) {
      // Multi-team parallel loading
      const [buildingsMulti, usersMulti, interventionsMulti, lotsMulti] = await Promise.all([
        loadMultiTeamData(
          (teamId) => buildingService.getBuildingsByTeam(teamId),
          { teamIds: activeTeamIds, teamNames: teamNameMap }
        ),
        loadMultiTeamData(
          (teamId) => userService.getUsersByTeam(teamId, profile.id),
          { teamIds: activeTeamIds, teamNames: teamNameMap }
        ),
        loadMultiTeamData(
          (teamId) => interventionService.getByTeam(teamId),
          { teamIds: activeTeamIds, teamNames: teamNameMap }
        ),
        loadMultiTeamData(
          (teamId) => lotService.getLotsByTeam(teamId),
          { teamIds: activeTeamIds, teamNames: teamNameMap }
        )
      ])

      buildings = buildingsMulti
      users = usersMulti
      interventions = interventionsMulti as unknown as InterventionWithRelations[]
      allLots = lotsMulti
    } else {
      // Single team parallel loading
      const [buildingsResult, usersResult, interventionsResult, lotsResult] = await Promise.all([
        buildingService.getBuildingsByTeam(effectiveTeamId),
        userService.getUsersByTeam(effectiveTeamId, profile.id),
        interventionService.getByTeam(effectiveTeamId),
        lotService.getLotsByTeam(effectiveTeamId)
      ])

      buildings = buildingsResult.success ? (buildingsResult.data || []) : []
      users = usersResult.success ? (usersResult.data || []) : []
      interventions = interventionsResult.success ? (interventionsResult.data as unknown as InterventionWithRelations[] || []) : []
      allLots = lotsResult.success ? (lotsResult.data || []) : []
    }

    // Enrich interventions with quotes and slots (batch)
    const interventionIds = interventions.map((i) => i.id)
    let interventionsWithDetails: any[] = []

    if (interventionIds.length > 0) {
      const [{ data: allQuotes }, { data: allTimeSlots }] = await Promise.all([
        supabase
          .from('intervention_quotes')
          .select('id, status, provider_id, created_by, amount, intervention_id')
          .in('intervention_id', interventionIds)
          .is('deleted_at', null),
        supabase
          .from('intervention_time_slots')
          .select(`
            id, slot_date, start_time, status, proposed_by, intervention_id,
            time_slot_responses (user_id, user_role, response, user:users(name, first_name))
          `)
          .in('intervention_id', interventionIds)
      ])

      const quotesMap = new Map<string, typeof allQuotes>()
      const slotsMap = new Map<string, typeof allTimeSlots>()

      allQuotes?.forEach(q => {
        const existing = quotesMap.get(q.intervention_id) || []
        quotesMap.set(q.intervention_id, [...existing, q])
      })
      allTimeSlots?.forEach(s => {
        const existing = slotsMap.get(s.intervention_id) || []
        slotsMap.set(s.intervention_id, [...existing, s])
      })

      interventionsWithDetails = interventions.map((intervention) => ({
        ...intervention,
        quotes: quotesMap.get(intervention.id) || [],
        timeSlots: slotsMap.get(intervention.id) || []
      }))
    }

    allInterventions = interventionsWithDetails

    // Calculate occupied lots
    let occupiedLotsCount = 0
    if (isConsolidatedView && activeTeamIds.length > 1) {
      const occupiedPromises = activeTeamIds.map(teamId =>
        contractService.getOccupiedLotIdsByTeam(teamId)
      )
      const occupiedResults = await Promise.allSettled(occupiedPromises)
      const allOccupiedIds = new Set<string>()
      occupiedResults.forEach((result) => {
        if (result.status === 'fulfilled' && result.value.success) {
          result.value.data.forEach(id => allOccupiedIds.add(id))
        }
      })
      occupiedLotsCount = allOccupiedIds.size
    } else {
      const occupiedResult = await contractService.getOccupiedLotIdsByTeam(effectiveTeamId)
      occupiedLotsCount = occupiedResult.success ? occupiedResult.data.size : 0
    }

    stats = {
      buildingsCount: buildings.length,
      lotsCount: allLots.length,
      occupiedLotsCount,
      occupancyRate: allLots.length > 0 ? Math.round((occupiedLotsCount / allLots.length) * 100) : 0,
      interventionsCount: interventions.length
    }

    // Contract stats
    if (isConsolidatedView && activeTeamIds.length > 1) {
      const statsPromises = activeTeamIds.map(teamId => contractService.getStats(teamId))
      const statsResults = await Promise.allSettled(statsPromises)
      let totalRentSum = 0
      let totalLotsWithRent = 0

      statsResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          const s = result.value
          contractStats.totalActive += s.totalActive
          contractStats.expiringThisMonth += s.expiringThisMonth
          contractStats.expiringNext30Days += s.expiringNext30Days
          contractStats.expired += s.expired
          contractStats.totalRentMonthly += s.totalRentMonthly
          contractStats.totalLots += s.totalLots
          contractStats.totalTenants += s.totalTenants
          if (s.averageRent > 0 && s.totalLots > 0) {
            totalRentSum += s.averageRent * s.totalLots
            totalLotsWithRent += s.totalLots
          }
        }
      })
      contractStats.averageRent = totalLotsWithRent > 0 ? Math.round(totalRentSum / totalLotsWithRent) : 0
    } else {
      contractStats = await contractService.getStats(effectiveTeamId)
    }

    // Contact stats
    const safeUsers = Array.isArray(users) ? users : []
    const activeUsers = safeUsers.filter((u: any) => u.auth_user_id)
    const contactsByType = safeUsers.reduce((acc: Record<string, { total: number; active: number }>, user: any) => {
      if (!acc[user.role]) acc[user.role] = { total: 0, active: 0 }
      acc[user.role].total++
      if (user.auth_user_id) acc[user.role].active++
      return acc
    }, {})

    contactStats = {
      totalContacts: safeUsers.length,
      totalActiveAccounts: activeUsers.length,
      invitationsPending: safeUsers.filter((u: any) => !u.auth_user_id).length,
      contactsByType
    }

    // Sort by date and calculate pending actions
    allInterventions = allInterventions
      .sort((a, b) => (new Date(b.created_at ?? '').getTime() || 0) - (new Date(a.created_at ?? '').getTime() || 0))

    const transformedInterventions = allInterventions.map((intervention: any) => ({
      ...intervention,
      reference: intervention.reference || `INT-${intervention.id.slice(0, 8)}`,
      urgency: intervention.urgency || intervention.priority || 'normale',
      type: intervention.intervention_type || 'autre'
    }))
    pendingActionsCount = filterPendingActions(transformedInterventions, 'gestionnaire').length

  } catch (error) {
    logger.error('❌ [ASYNC-DASHBOARD] Error loading data', { error })
  }

  // Onboarding data: fetch subscription status + progress (separate try/catch to not break dashboard)
  let onboardingProgress: OnboardingProgress | null = null
  let isTrialing = false

  try {
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('status')
      .eq('team_id', effectiveTeamId)
      .limit(1)

    isTrialing = sub?.[0]?.status === 'trialing'

    if (isTrialing) {
      const [obLots, obTenants, obProviders, obContracts, obInterventions, obClosed] = await Promise.all([
        supabase.from('lots').select('id', { count: 'exact', head: true }).eq('team_id', effectiveTeamId),
        supabase.from('team_members').select('id', { count: 'exact', head: true }).eq('team_id', effectiveTeamId).eq('role', 'locataire'),
        supabase.from('team_members').select('id', { count: 'exact', head: true }).eq('team_id', effectiveTeamId).eq('role', 'prestataire'),
        supabase.from('contracts').select('id', { count: 'exact', head: true }).eq('team_id', effectiveTeamId),
        supabase.from('interventions').select('id', { count: 'exact', head: true }).eq('team_id', effectiveTeamId),
        supabase.from('interventions').select('id', { count: 'exact', head: true }).eq('team_id', effectiveTeamId)
          .in('status', ['cloturee_par_gestionnaire', 'cloturee_par_prestataire', 'cloturee_par_locataire']),
      ])

      onboardingProgress = {
        hasLot: (obLots.count ?? 0) > 0,
        hasAddedTenant: (obTenants.count ?? 0) > 0,
        hasInvitedProvider: (obProviders.count ?? 0) > 0,
        hasContract: (obContracts.count ?? 0) > 0,
        hasIntervention: (obInterventions.count ?? 0) > 0,
        hasClosedIntervention: (obClosed.count ?? 0) > 0,
      }
    }
  } catch (error) {
    logger.warn('[ASYNC-DASHBOARD] Onboarding check failed, skipping', { error })
  }

  // Fetch unread conversation threads for dashboard (separate try/catch to not break dashboard)
  let unreadThreads: Awaited<ReturnType<ConversationRepository['getUnreadThreadsForDashboard']>>['data'] = { threads: [], totalCount: 0 }
  try {
    const conversationRepo = new ConversationRepository(supabase)
    const unreadResult = await conversationRepo.getUnreadThreadsForDashboard(profile.id)
    if (unreadResult.success && unreadResult.data) {
      unreadThreads = unreadResult.data
    }
  } catch (error) {
    logger.warn('[ASYNC-DASHBOARD] Unread threads fetch failed, skipping', { error })
  }

  return (
    <ManagerDashboardV2
      stats={stats}
      contactStats={contactStats}
      contractStats={contractStats}
      interventions={allInterventions}
      pendingCount={pendingActionsCount}
      onboardingProgress={onboardingProgress}
      isTrialing={isTrialing}
      unreadThreads={unreadThreads?.threads}
      unreadThreadsTotalCount={unreadThreads?.totalCount}
    />
  )
}
