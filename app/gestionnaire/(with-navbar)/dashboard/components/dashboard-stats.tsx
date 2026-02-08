/**
 * Dashboard Stats - Async Server Component
 *
 * Fetches and displays stats cards independently for granular streaming.
 * Wrapped in Suspense in the parent page for progressive loading.
 */

import {
  createServerActionBuildingService,
  createServerActionLotService,
  createServerActionInterventionService,
  createServerActionContractService,
} from "@/lib/services"
import type { ContractStats } from "@/lib/types/contract.types"
import { logger } from '@/lib/logger'
import { loadMultiTeamData, createTeamNameMap } from "@/lib/multi-team-helpers"
import { StatsCards } from "@/components/dashboards/manager/stats-cards"
import type { AuthContext } from "@/lib/server-context"

interface DashboardStatsProps {
  authContext: {
    profile: AuthContext['profile']
    team: AuthContext['team']
    activeTeamIds: string[]
    isConsolidatedView: boolean
    sameRoleTeams: AuthContext['sameRoleTeams']
  }
}

export async function DashboardStats({ authContext }: DashboardStatsProps) {
  const { profile, team, activeTeamIds, isConsolidatedView, sameRoleTeams } = authContext
  const teamNameMap = createTeamNameMap(sameRoleTeams)
  const effectiveTeamId = team.id

  logger.info('📊 [DASHBOARD-STATS] Fetching stats...', { isConsolidatedView })

  // Initialize services
  const buildingService = await createServerActionBuildingService()
  const lotService = await createServerActionLotService()
  const interventionService = await createServerActionInterventionService()
  const contractService = await createServerActionContractService()

  let buildingsCount = 0
  let lotsCount = 0
  let occupiedLotsCount = 0
  let interventionsCount = 0
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

  try {
    if (isConsolidatedView && activeTeamIds.length > 1) {
      // Multi-team: Load all teams in parallel
      const [buildings, allLots, interventions] = await Promise.all([
        loadMultiTeamData(
          (teamId) => buildingService.getBuildingsByTeam(teamId),
          { teamIds: activeTeamIds, teamNames: teamNameMap }
        ),
        loadMultiTeamData(
          (teamId) => lotService.getLotsByTeam(teamId),
          { teamIds: activeTeamIds, teamNames: teamNameMap }
        ),
        loadMultiTeamData(
          (teamId) => interventionService.getByTeam(teamId),
          { teamIds: activeTeamIds, teamNames: teamNameMap }
        )
      ])

      buildingsCount = buildings.length
      lotsCount = allLots.length
      interventionsCount = interventions.length

      // Occupied lots
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

      // Aggregate contract stats
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
      // Single team
      const [buildingsResult, lotsResult, interventionsResult, occupiedResult] = await Promise.all([
        buildingService.getBuildingsByTeam(effectiveTeamId),
        lotService.getLotsByTeam(effectiveTeamId),
        interventionService.getByTeam(effectiveTeamId),
        contractService.getOccupiedLotIdsByTeam(effectiveTeamId)
      ])

      buildingsCount = buildingsResult.success ? (buildingsResult.data?.length || 0) : 0
      lotsCount = lotsResult.success ? (lotsResult.data?.length || 0) : 0
      interventionsCount = interventionsResult.success ? (interventionsResult.data?.length || 0) : 0
      occupiedLotsCount = occupiedResult.success ? occupiedResult.data.size : 0
      contractStats = await contractService.getStats(effectiveTeamId)
    }

    logger.info('✅ [DASHBOARD-STATS] Stats loaded', { buildingsCount, lotsCount, interventionsCount })
  } catch (error) {
    logger.error('❌ [DASHBOARD-STATS] Error', { error })
  }

  const stats = {
    buildingsCount,
    lotsCount,
    occupiedLotsCount,
    occupancyRate: lotsCount > 0 ? Math.round((occupiedLotsCount / lotsCount) * 100) : 0,
    interventionsCount
  }

  return (
    <StatsCards
      stats={stats}
      contractStats={contractStats}
    />
  )
}
