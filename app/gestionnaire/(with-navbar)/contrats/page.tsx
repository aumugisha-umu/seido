import { ContratsPageClient } from './contrats-page-client'
import { createServerContractService } from '@/lib/services/domain/contract.service'
import { createServerSupplierContractService } from '@/lib/services/domain/supplier-contract.service'
import { logger } from '@/lib/logger'
import { getServerAuthContext } from '@/lib/server-context'
import { checkExpiringContracts } from '@/app/actions/notification-actions'
import { transitionContractStatuses } from '@/app/actions/contract-actions'
import { after } from 'next/server'
import type { ContractWithRelations } from '@/lib/types/contract.types'
import type { SupplierContractWithRelations } from '@/lib/types/supplier-contract.types'

// Force dynamic rendering - cette page dépend toujours de la session
export const dynamic = 'force-dynamic'

export default async function ContratsPage() {
  logger.info("🔵 [CONTRATS-PAGE] Server-side fetch starting")

  try {
    // AUTH + TEAM en 1 ligne (cached via React.cache())
    const { profile, team, activeTeamIds, isConsolidatedView } = await getServerAuthContext('gestionnaire')

    // Create services in parallel (Phase 0)
    const [contractService, supplierContractService] = await Promise.all([
      createServerContractService(),
      createServerSupplierContractService()
    ])

    let contracts: ContractWithRelations[] = []
    let supplierContracts: SupplierContractWithRelations[] = []

    // ✅ MULTI-ÉQUIPE: Vue consolidée = fetch de toutes les équipes actives
    if (isConsolidatedView && activeTeamIds.length > 1) {
      logger.info(`🔄 [CONTRATS-PAGE] Consolidated view - fetching from ${activeTeamIds.length} teams`)

      const [leaseResults, supplierResults] = await Promise.all([
        Promise.all(activeTeamIds.map(teamId => contractService.getByTeam(teamId, { includeExpired: true }))),
        Promise.all(activeTeamIds.map(teamId => supplierContractService.getByTeam(teamId).catch(err => {
          logger.warn(`⚠️ [CONTRATS-PAGE] Failed to load supplier contracts for team ${teamId}:`, err)
          return [] as SupplierContractWithRelations[]
        })))
      ])

      // Merge all successful results
      contracts = leaseResults
        .filter(r => r.success && r.data)
        .flatMap(r => r.data || [])

      supplierContracts = supplierResults.flat()

      logger.info(`✅ [CONTRATS-PAGE] Consolidated: ${contracts.length} leases, ${supplierContracts.length} supplier contracts from ${activeTeamIds.length} teams`)

      // Transition statuses for all teams (runs after response — doesn't block page render)
      after(async () => {
        for (const teamId of activeTeamIds) {
          try { await transitionContractStatuses(teamId) }
          catch (err) { logger.warn(`⚠️ [CONTRATS-PAGE] Failed to transition contract statuses for team ${teamId}:`, err) }
        }
      })
    } else {
      // ✅ Vue standard: une seule équipe — fetch both in parallel (Wave 1)
      const [leaseResult, supplierResult] = await Promise.all([
        contractService.getByTeam(team.id, { includeExpired: true }),
        supplierContractService.getByTeam(team.id).catch(err => {
          logger.error('❌ [CONTRATS-PAGE] Failed to load supplier contracts:', err)
          return [] as SupplierContractWithRelations[]
        })
      ])

      if (leaseResult.success && leaseResult.data) {
        contracts = leaseResult.data
        logger.info(`✅ [CONTRATS-PAGE] Loaded ${contracts.length} leases`)
      } else {
        logger.error(`❌ [CONTRATS-PAGE] Failed to load contracts: ${leaseResult.error?.message || 'Unknown error'}`)
      }

      supplierContracts = supplierResult
      logger.info(`✅ [CONTRATS-PAGE] Loaded ${supplierContracts.length} supplier contracts`)

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

    logger.info(`📊 [CONTRATS-PAGE] Server data ready - Leases: ${contracts.length}, Supplier: ${supplierContracts.length}`)

    // Pass data to Client Component
    return (
      <ContratsPageClient
        initialContracts={contracts}
        initialSupplierContracts={supplierContracts}
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
        initialSupplierContracts={[]}
        teamId={undefined}
        userId={undefined}
      />
    )
  }
}
