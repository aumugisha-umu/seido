import { ContratsPageClient } from './contrats-page-client'
import { createServerContractService } from '@/lib/services/domain/contract.service'
import { logger } from '@/lib/logger'
import { getServerAuthContext } from '@/lib/server-context'
import { checkExpiringContracts } from '@/app/actions/notification-actions'
import { transitionContractStatuses } from '@/app/actions/contract-actions'
import { after } from 'next/server'
import type { ContractWithRelations } from '@/lib/types/contract.types'

// Force dynamic rendering - cette page dépend toujours de la session
export const dynamic = 'force-dynamic'

export default async function ContratsPage() {
  logger.info("🔵 [CONTRATS-PAGE] Server-side fetch starting")

  try {
    // AUTH + TEAM en 1 ligne (cached via React.cache())
    const { profile, team, activeTeamIds, isConsolidatedView } = await getServerAuthContext('gestionnaire')

    // Create service
    const contractService = await createServerContractService()

    let contracts: ContractWithRelations[] = []

    // ✅ MULTI-ÉQUIPE: Vue consolidée = fetch de toutes les équipes actives
    if (isConsolidatedView && activeTeamIds.length > 1) {
      logger.info(`🔄 [CONTRATS-PAGE] Consolidated view - fetching from ${activeTeamIds.length} teams`)

      const results = await Promise.all(
        activeTeamIds.map(teamId => contractService.getByTeam(teamId, { includeExpired: true }))
      )

      // Merge all successful results
      contracts = results
        .filter(r => r.success && r.data)
        .flatMap(r => r.data || [])

      logger.info(`✅ [CONTRATS-PAGE] Consolidated: ${contracts.length} contracts from ${activeTeamIds.length} teams`)

      // Transition statuses for all teams (runs after response — doesn't block page render)
      after(async () => {
        for (const teamId of activeTeamIds) {
          try { await transitionContractStatuses(teamId) }
          catch (err) { logger.warn(`⚠️ [CONTRATS-PAGE] Failed to transition contract statuses for team ${teamId}:`, err) }
        }
      })
    } else {
      // ✅ Vue standard: une seule équipe
      const result = await contractService.getByTeam(team.id, { includeExpired: true })

      if (result.success && result.data) {
        contracts = result.data
        logger.info(`✅ [CONTRATS-PAGE] Loaded ${contracts.length} contracts`)
      } else {
        logger.error(`❌ [CONTRATS-PAGE] Failed to load contracts: ${result.error?.message || 'Unknown error'}`)
      }

      // Transition statuses (runs after response — doesn't block page render)
      after(async () => {
        try { await transitionContractStatuses(team.id) }
        catch (err) { logger.warn('⚠️ [CONTRATS-PAGE] Failed to transition contract statuses:', err) }
      })
    }

    // Check for expiring contracts and send notifications (runs after response)
    after(async () => {
      try { await checkExpiringContracts() }
      catch (err) { logger.warn('⚠️ [CONTRATS-PAGE] Failed to check expiring contracts:', err) }
    })

    logger.info(`📊 [CONTRATS-PAGE] Server data ready - Contracts: ${contracts.length}`)

    // Pass data to Client Component
    return (
      <ContratsPageClient
        initialContracts={contracts}
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
        teamId={undefined}
        userId={undefined}
      />
    )
  }
}
