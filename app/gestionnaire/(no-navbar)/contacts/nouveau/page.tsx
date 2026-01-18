import { getServerAuthContext } from '@/lib/server-context'
import { createServerCompanyRepository } from '@/lib/services/repositories/company.repository'
import { createServerBuildingRepository } from '@/lib/services/repositories/building.repository'
import { createServerLotRepository } from '@/lib/services/repositories/lot.repository'
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
    const buildingRepository = await createServerBuildingRepository()
    const lotRepository = await createServerLotRepository()

    let buildings: { id: string; name: string; address?: string | null }[] = []
    let lots: { id: string; reference: string; building_id: string; category?: string | null; building?: { id: string; name: string; address?: string | null } | null }[] = []

    const buildingsResult = await buildingRepository.findByTeam(team.id)
    if (buildingsResult.success && buildingsResult.data) {
      buildings = buildingsResult.data.map(b => ({
        id: b.id,
        name: b.name,
        address: b.address
      }))
      logger.info(`✅ [NEW-CONTACT-PAGE] Loaded ${buildings.length} buildings`)
    }

    const lotsResult = await lotRepository.findByTeam(team.id)
    if (lotsResult.success && lotsResult.data) {
      lots = lotsResult.data.map(l => ({
        id: l.id,
        reference: l.reference,
        building_id: l.building_id,
        category: l.category,
        building: l.building ? {
          id: l.building.id,
          name: l.building.name,
          address: l.building.address
        } : null
      }))
      logger.info(`✅ [NEW-CONTACT-PAGE] Loaded ${lots.length} lots`)
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
