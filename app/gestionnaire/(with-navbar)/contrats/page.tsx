import { ContratsPageClient } from './contrats-page-client'
import { createServerContractService } from '@/lib/services/domain/contract.service'
import { logger } from '@/lib/logger'
import { getServerAuthContext } from '@/lib/server-context'
import { checkExpiringContracts } from '@/app/actions/notification-actions'
import type { ContractWithRelations } from '@/lib/types/contract.types'

// Force dynamic rendering - cette page dépend toujours de la session
export const dynamic = 'force-dynamic'

export default async function ContratsPage() {
  logger.info("🔵 [CONTRATS-PAGE] Server-side fetch starting")

  try {
    // AUTH + TEAM en 1 ligne (cached via React.cache())
    const { profile, team } = await getServerAuthContext('gestionnaire')

    // Create service
    const contractService = await createServerContractService()

    // Fetch all contracts for team
    const result = await contractService.getByTeam(team.id, { includeExpired: true })

    let contracts: ContractWithRelations[] = []

    if (result.success && result.data) {
      contracts = result.data
      logger.info(`✅ [CONTRATS-PAGE] Loaded ${contracts.length} contracts`)
    } else {
      logger.error(`❌ [CONTRATS-PAGE] Failed to load contracts: ${result.error?.message || 'Unknown error'}`)
    }

    // Get contract stats
    const stats = await contractService.getStats(team.id)

    // Check for expiring contracts and send notifications (async, non-blocking)
    checkExpiringContracts().catch((err) => {
      logger.warn('⚠️ [CONTRATS-PAGE] Failed to check expiring contracts:', err)
    })

    logger.info(`📊 [CONTRATS-PAGE] Server data ready - Contracts: ${contracts.length}`, {
      active: stats.totalActive,
      expiringSoon: stats.expiringNext30Days
    })

    // Pass data to Client Component
    return (
      <ContratsPageClient
        initialContracts={contracts}
        initialStats={stats}
        teamId={team.id}
        userId={profile.id}
      />
    )
  } catch (error) {
    // Detailed error logging
    const errorDetails = {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    }

    logger.error("❌ [CONTRATS-PAGE] Server error:", errorDetails)

    // Re-throw NEXT_REDIRECT errors
    if (error && typeof error === 'object' && 'digest' in error &&
        typeof error.digest === 'string' && error.digest.startsWith('NEXT_REDIRECT')) {
      throw error
    }

    // For other errors, render empty state
    return (
      <ContratsPageClient
        initialContracts={[]}
        initialStats={{
          totalActive: 0,
          expiringThisMonth: 0,
          expiringNext30Days: 0,
          expired: 0,
          totalRentMonthly: 0,
          averageRent: 0,
          totalLots: 0,
          totalTenants: 0
        }}
        teamId={undefined}
        userId={undefined}
      />
    )
  }
}
