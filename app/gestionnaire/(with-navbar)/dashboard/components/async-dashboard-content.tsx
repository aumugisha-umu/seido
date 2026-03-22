/**
 * Async Dashboard Content - Server Component for Suspense streaming
 *
 * This component fetches dashboard data asynchronously and passes to client.
 * Wrap in <Suspense> for streaming partial content as it loads.
 */

import { cache } from 'react'
import {
  createServerActionUserService,
  createServerActionBuildingService,
  createServerActionLotService,
  createServerActionInterventionService,
  createServerActionContractService,
  createServerSupabaseClient,
  createServerReminderService,
  ConversationRepository,
} from "@/lib/services"
import { BankConnectionRepository } from "@/lib/services/repositories/bank-connection.repository"
import { BankTransactionRepository } from "@/lib/services/repositories/bank-transaction.repository"
import { RentCallRepository } from "@/lib/services/repositories/rent-call.repository"
import type { ContractStats } from "@/lib/types/contract.types"
import type { ReminderStats } from "@/lib/types/reminder.types"
import type { InterventionWithRelations } from "@/lib/services"
import { logger } from '@/lib/logger'
import { filterPendingActions } from '@/lib/intervention-alert-utils'
import { loadMultiTeamData, createTeamNameMap } from "@/lib/multi-team-helpers"
import { ManagerDashboardV2 } from "@/components/dashboards/manager/manager-dashboard-v2"

// ✅ PERF: React cache() deduplicates service creation within a single request render tree.
// If the layout or other server components call the same factories, they reuse this instance.
const getCachedUserService = cache(() => createServerActionUserService())
const getCachedBuildingService = cache(() => createServerActionBuildingService())
const getCachedLotService = cache(() => createServerActionLotService())
const getCachedInterventionService = cache(() => createServerActionInterventionService())
const getCachedContractService = cache(() => createServerActionContractService())
const getCachedSupabaseClient = cache(() => createServerSupabaseClient())
const getCachedReminderService = cache(() => createServerReminderService())

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

  // Initialize all services in parallel (cache()-wrapped for request deduplication)
  const [userService, buildingService, lotService, interventionService, contractService, supabase, reminderService] = await Promise.all([
    getCachedUserService(),
    getCachedBuildingService(),
    getCachedLotService(),
    getCachedInterventionService(),
    getCachedContractService(),
    getCachedSupabaseClient(),
    getCachedReminderService(),
  ])

  let stats = {
    buildingsCount: 0,
    lotsCount: 0,
    occupiedLotsCount: 0,
    occupancyRate: 0,
    interventionsCount: 0
  }

  let tenantCount = 0

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
        buildingService.getBuildingsByTeam(team.id),
        userService.getUsersByTeam(team.id, profile.id),
        interventionService.getByTeam(team.id),
        lotService.getLotsByTeam(team.id)
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
      const occupiedResult = await contractService.getOccupiedLotIdsByTeam(team.id)
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
      contractStats = await contractService.getStats(team.id)
    }

    // Tenant count (only value used from contacts data)
    const safeUsers = Array.isArray(users) ? users : []
    tenantCount = safeUsers.filter((u: any) => u.role === 'locataire').length

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

  // Onboarding checklist is now handled by GestionnaireTopbar (self-contained)

  // Fetch unread threads + reminder stats in parallel (separate try/catch to not break dashboard)
  let unreadThreads: Awaited<ReturnType<ConversationRepository['getUnreadThreadsForDashboard']>>['data'] = { threads: [], totalCount: 0 }
  let reminderStats: ReminderStats = { total: 0, en_attente: 0, en_cours: 0, termine: 0, annule: 0, overdue: 0, due_today: 0 }

  const [unreadResult, reminderStatsResult] = await Promise.allSettled([
    (async () => {
      const conversationRepo = new ConversationRepository(supabase)
      return conversationRepo.getUnreadThreadsForDashboard(profile.id)
    })(),
    reminderService.getStats(team.id),
  ])

  if (unreadResult.status === 'fulfilled' && unreadResult.value.success && unreadResult.value.data) {
    unreadThreads = unreadResult.value.data
  } else if (unreadResult.status === 'rejected') {
    logger.warn('[ASYNC-DASHBOARD] Unread threads fetch failed, skipping', { error: unreadResult.reason })
  }

  if (reminderStatsResult.status === 'fulfilled') {
    reminderStats = reminderStatsResult.value
  } else {
    logger.warn('[ASYNC-DASHBOARD] Reminder stats fetch failed, skipping', { error: reminderStatsResult.reason })
  }

  // Fetch bank dashboard data (separate try/catch — never breaks dashboard)
  let bankData: {
    hasBankConnection: boolean
    revenue: number
    expenses: number
    collectionRate: number
    toReconcileCount: number
    overdueRentCalls: Array<{
      id: string
      lot_name: string
      tenant_name: string
      amount: number
      days_overdue: number
    }>
  } = {
    hasBankConnection: false,
    revenue: 0,
    expenses: 0,
    collectionRate: 0,
    toReconcileCount: 0,
    overdueRentCalls: [],
  }

  try {
    const bankConnectionRepo = new BankConnectionRepository(supabase)
    const connections = await bankConnectionRepo.getConnectionsByTeam(team.id)

    if (connections.length > 0) {
      const bankTxRepo = new BankTransactionRepository(supabase)
      const rentCallRepo = new RentCallRepository(supabase)

      // Current month date range
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

      const [transactions, reconcileCount, overdueResult] = await Promise.all([
        bankTxRepo.getTransactionsByDateRange(team.id, monthStart, monthEnd),
        bankTxRepo.getToReconcileCount(team.id),
        rentCallRepo.getOverdueRentCalls(team.id),
      ])

      const revenue = transactions
        .filter((tx) => tx.amount > 0)
        .reduce((sum, tx) => sum + tx.amount, 0)
      const expenses = transactions
        .filter((tx) => tx.amount < 0)
        .reduce((sum, tx) => sum + tx.amount, 0)

      // Map overdue rent calls — lot_name and tenant_name require joins
      // For now, use lot_id as fallback; full join data would come from the API route
      const overdueRentCalls = overdueResult.success
        ? overdueResult.data.slice(0, 5).map((rc) => {
            const dueDate = new Date(rc.due_date)
            const today = new Date()
            const diffMs = today.getTime() - dueDate.getTime()
            const daysOverdue = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))

            return {
              id: rc.id,
              lot_name: `Lot ${rc.lot_id.slice(0, 6)}`,
              tenant_name: '',
              amount: rc.total_expected - rc.total_received,
              days_overdue: daysOverdue,
            }
          })
        : []

      bankData = {
        hasBankConnection: true,
        revenue,
        expenses,
        collectionRate: 0, // computed elsewhere
        toReconcileCount: reconcileCount,
        overdueRentCalls,
      }
    }
  } catch (error) {
    logger.warn('[ASYNC-DASHBOARD] Bank data fetch failed, skipping', { error })
  }

  return (
    <ManagerDashboardV2
      stats={stats}
      tenantCount={tenantCount}
      contractStats={contractStats}
      interventions={allInterventions}
      pendingCount={pendingActionsCount}
      unreadThreads={unreadThreads?.threads}
      unreadThreadsTotalCount={unreadThreads?.totalCount}
      reminderStats={reminderStats}
      bankData={bankData}
    />
  )
}
