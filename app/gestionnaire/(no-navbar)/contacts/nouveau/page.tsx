import { getServerAuthContext } from '@/lib/server-context'
import { createServerCompanyRepository } from '@/lib/services/repositories/company.repository'
import {
  createServerBuildingService,
  createServerLotService,
  createServerContractService
} from '@/lib/services'
import { logger } from '@/lib/logger'
import { ContactCreationClient } from './contact-creation-client'

// ✅ Force dynamic rendering - cette page dépend toujours de la session
export const dynamic = 'force-dynamic'

export default async function NewContactPage({
  searchParams
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  try {
    logger.info("🔵 [NEW-CONTACT-PAGE] Server-side fetch starting")

    // ✅ AUTH + TEAM en 1 ligne (cached via React.cache())
    const { user, team } = await getServerAuthContext('gestionnaire')

    // ✅ Lire les paramètres de redirection (si venant d'un autre formulaire)
    const params = await searchParams
    const prefilledType = params.type as string | undefined
    const sessionKey = params.sessionKey as string | undefined
    const returnUrl = params.returnUrl as string | undefined

    if (prefilledType || sessionKey || returnUrl) {
      logger.info(`🔗 [NEW-CONTACT-PAGE] Redirect params detected:`, { prefilledType, sessionKey, returnUrl })
    }

    // ✅ Defensive guard
    if (!team || !team.id) {
      logger.warn('⚠️ [NEW-CONTACT-PAGE] Missing team in auth context')
      throw new Error('Team context is required')
    }

    // ── Phase 0: Service + repository instantiation (all stateless) ────
    const [companyRepository, buildingService, lotService, contractService] = await Promise.all([
      createServerCompanyRepository(),
      createServerBuildingService(),
      createServerLotService(),
      createServerContractService(),
    ])

    // ── Wave 1: All independent queries in parallel ─────────────────────
    const [companiesResult, buildingsResult, occupiedResult, lotsResult, contractsResult] = await Promise.all([
      companyRepository.findActiveByTeam(team.id),
      buildingService.getBuildingsByTeam(team.id),
      contractService.getOccupiedLotIdsByTeam(team.id).catch(() => ({ success: false as const, data: new Set<string>() })),
      lotService.getLotsByTeam(team.id),
      contractService.getByTeam(team.id).catch(() => ({ success: false as const, data: [] as any[] })),
    ])

    // ── Sequential transforms (CPU only, no DB) ────────────────────────
    const companies = (companiesResult.success && companiesResult.data) ? companiesResult.data : []
    logger.info(`✅ [NEW-CONTACT-PAGE] Loaded ${companies.length} companies`)

    const occupiedLotIds = occupiedResult.success ? occupiedResult.data : new Set<string>()

    let buildings: any[] = (buildingsResult.success && buildingsResult.data) ? buildingsResult.data : []
    buildings = buildings.map((building: any) => ({
      ...building,
      lots: (building.lots || []).map((lot: any) => {
        const isOccupied = occupiedLotIds.has(lot.id)
        return { ...lot, is_occupied: isOccupied, status: isOccupied ? "occupied" : "vacant" }
      })
    }))
    logger.info(`✅ [NEW-CONTACT-PAGE] Loaded ${buildings.length} buildings with lots`)

    let lots: any[] = []
    if (lotsResult.success && lotsResult.data) {
      lots = lotsResult.data.map((lot: any) => {
        const isOccupied = occupiedLotIds.has(lot.id)
        return {
          ...lot,
          is_occupied: isOccupied,
          status: isOccupied ? "occupied" : "vacant",
          building_name: buildings.find((b: any) => b.id === lot.building_id)?.name || null
        }
      })
      logger.info(`✅ [NEW-CONTACT-PAGE] Loaded and transformed ${lots.length} lots`)
    }

    const contracts: any[] = (contractsResult.success && contractsResult.data) ? contractsResult.data : []
    logger.info(`✅ [NEW-CONTACT-PAGE] Loaded ${contracts.length} contracts`)

    logger.info(`📊 [NEW-CONTACT-PAGE] Server data ready - Companies: ${companies.length}, Buildings: ${buildings.length}, Lots: ${lots.length}, Contracts: ${contracts.length}`)

    // ✅ Pass data to Client Component (avec paramètres de redirection si présents)
    return (
      <ContactCreationClient
        teamId={team.id}
        initialCompanies={companies}
        initialBuildings={buildings}
        initialLots={lots}
        initialContracts={contracts}
        prefilledType={prefilledType}
        sessionKey={sessionKey}
        returnUrl={returnUrl}
      />
    )
  } catch (error) {
    logger.error("❌ [NEW-CONTACT-PAGE] Server error:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      error: error
    })

    // Re-throw NEXT_REDIRECT errors
    if (error && typeof error === 'object' && 'digest' in error &&
        typeof error.digest === 'string' && error.digest.startsWith('NEXT_REDIRECT')) {
      throw error
    }

    // For other errors, show error page
    throw new Error('Failed to load contact creation page')
  }
}
