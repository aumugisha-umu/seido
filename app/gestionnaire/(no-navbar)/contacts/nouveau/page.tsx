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

    // ✅ Charger les sociétés existantes pour le CompanySelector
    const companyRepository = await createServerCompanyRepository()
    let companies: any[] = []

    const companiesResult = await companyRepository.findActiveByTeam(team.id)

    if (companiesResult.success && companiesResult.data) {
      companies = companiesResult.data
      logger.info(`✅ [NEW-CONTACT-PAGE] Loaded ${companies.length} companies`)
    } else {
      logger.warn('⚠️ [NEW-CONTACT-PAGE] No companies found or error loading')
    }

    // ✅ Charger les immeubles et lots pour EntityLinkSection
    // Utiliser les services (comme intervention) pour avoir les lots inclus dans chaque building
    const buildingService = await createServerBuildingService()
    const lotService = await createServerLotService()
    const contractService = await createServerContractService()

    let buildings: any[] = []
    let lots: any[] = []

    // ✅ Charger les buildings AVEC leurs lots (via le service)
    const buildingsResult = await buildingService.getBuildingsByTeam(team.id)
    if (buildingsResult.success && buildingsResult.data) {
      buildings = buildingsResult.data
      logger.info(`✅ [NEW-CONTACT-PAGE] Loaded ${buildings.length} buildings with lots`)
    }

    // ✅ Récupérer les lots occupés (via contrats actifs)
    let occupiedLotIds = new Set<string>()
    try {
      const occupiedResult = await contractService.getOccupiedLotIdsByTeam(team.id)
      if (occupiedResult.success) {
        occupiedLotIds = occupiedResult.data
        logger.info(`✅ [NEW-CONTACT-PAGE] Occupied lots from contracts: ${occupiedLotIds.size}`)
      } else {
        logger.warn({
          error: occupiedResult.error,
          teamId: team.id
        }, '⚠️ [NEW-CONTACT-PAGE] Contract service returned error for occupied lots')
      }
    } catch (error) {
      logger.warn({
        error: error instanceof Error ? error.message : String(error),
        teamId: team.id
      }, '⚠️ [NEW-CONTACT-PAGE] Exception getting occupied lots from contracts')
      // Continue without occupied lot info - form will still work
    }

    // ✅ Transformer les buildings pour ajouter le statut des lots
    buildings = buildings.map((building: any) => ({
      ...building,
      lots: (building.lots || []).map((lot: any) => {
        const isOccupied = occupiedLotIds.has(lot.id)
        return {
          ...lot,
          is_occupied: isOccupied,
          status: isOccupied ? "occupied" : "vacant"
        }
      })
    }))

    // ✅ Charger tous les lots pour l'onglet "Lots" (indépendants + attachés)
    const lotsResult = await lotService.getLotsByTeam(team.id)
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

    logger.info(`📊 [NEW-CONTACT-PAGE] Server data ready - Companies: ${companies.length}, Buildings: ${buildings.length}, Lots: ${lots.length}`)

    // ✅ Pass data to Client Component (avec paramètres de redirection si présents)
    return (
      <ContactCreationClient
        teamId={team.id}
        initialCompanies={companies}
        initialBuildings={buildings}
        initialLots={lots}
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
