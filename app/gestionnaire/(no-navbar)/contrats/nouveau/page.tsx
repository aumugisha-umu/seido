import { getServerAuthContext } from '@/lib/server-context'
import {
  createServerLotService,
  createServerContactService,
  createServerBuildingService,
  createServerContractService
} from '@/lib/services'
import ContractFormContainer from '@/components/contract/contract-form-container'
import { logger } from '@/lib/logger'

/**
 * SERVER COMPONENT - Contract Creation Page
 *
 * Loads initial data server-side:
 * - Buildings with their lots (for PropertySelector)
 * - Individual lots (for PropertySelector)
 * - Team contacts for tenant/guarantor selection
 */
export default async function NewContractPage({
  searchParams
}: {
  searchParams: Promise<{
    type?: string
    lot?: string
    renew?: string
    // Paramètres de retour après création de contact
    sessionKey?: string
    newContactId?: string
    contactType?: string
  }>
}) {
  // Server-side auth + team verification
  const { team, profile } = await getServerAuthContext('gestionnaire')

  const params = await searchParams
  const contractMode = (params.type === 'fournisseur' ? 'fournisseur' : 'bail') as 'bail' | 'fournisseur'
  const prefilledLotId = params.lot || null
  const renewFromId = params.renew || null

  // Paramètres de retour après création de contact
  const sessionKey = params.sessionKey || null
  const newContactId = params.newContactId || null
  const contactType = params.contactType || null

  logger.info('📄 [NEW-CONTRACT-PAGE] Loading initial data', {
    teamId: team.id,
    prefilledLotId,
    renewFromId,
    hasRedirectParams: !!(sessionKey || newContactId)
  })

  // ── Phase 0: Service instantiation (all stateless factories) ──────────
  const [buildingService, lotService, contactService, contractService] = await Promise.all([
    createServerBuildingService(),
    createServerLotService(),
    createServerContactService(),
    createServerContractService(),
  ])

  // ── Wave 1: All independent queries in parallel ───────────────────────
  const [buildingsResult, occupiedResult, lotsResult, contactsResult] = await Promise.all([
    buildingService.getBuildingsByTeam(team.id),
    contractService.getOccupiedLotIdsByTeam(team.id).catch(() => ({ success: false as const, data: new Set<string>() })),
    lotService.getLotsByTeam(team.id),
    contactService.getContactsByTeam(team.id),
  ])

  // ── Sequential transforms (CPU only, no DB) ──────────────────────────
  const occupiedLotIds = occupiedResult.success ? occupiedResult.data : new Set<string>()

  let buildings = buildingsResult.success ? (buildingsResult.data || []) : []
  buildings = buildings.map((building: any) => ({
    ...building,
    lots: (building.lots || []).map((lot: any) => {
      const isOccupied = occupiedLotIds.has(lot.id)
      return { ...lot, is_occupied: isOccupied, status: isOccupied ? "occupied" : "vacant" }
    })
  }))

  logger.info('✅ [NEW-CONTRACT-PAGE] Buildings loaded', { count: buildings.length })

  const rawLots = lotsResult.success ? (lotsResult.data || []) : []
  const transformedLots = rawLots.map((lot: any) => {
    const isOccupied = occupiedLotIds.has(lot.id)
    return {
      ...lot,
      is_occupied: isOccupied,
      status: isOccupied ? "occupied" : "vacant",
      building_name: buildings.find((b: any) => b.id === lot.building_id)?.name || null
    }
  })

  logger.info('✅ [NEW-CONTRACT-PAGE] Lots loaded', { count: transformedLots.length })

  const buildingsData = {
    buildings,
    lots: transformedLots,
    teamId: team.id
  }

  const contacts = contactsResult.success && contactsResult.data
    ? contactsResult.data.map((contact: any) => ({
        id: contact.id,
        name: contact.name || `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 'Sans nom',
        email: contact.email,
        phone: contact.phone,
        role: contact.role
      }))
    : []

  logger.info('✅ [NEW-CONTRACT-PAGE] Contacts loaded', { count: contacts.length })

  return (
    <ContractFormContainer
      mode="create"
      contractMode={contractMode}
      teamId={team.id}
      initialBuildingsData={buildingsData}
      initialContacts={contacts}
      prefilledLotId={prefilledLotId}
      currentUser={{ id: profile.id, name: profile.name || profile.email || '' }}
      // Props pour retour après création de contact
      sessionKey={sessionKey}
      newContactId={newContactId}
      contactType={contactType}
    />
  )
}
