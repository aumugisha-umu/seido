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
    lot?: string
    renew?: string
    // Paramètres de retour après création de contact
    sessionKey?: string
    newContactId?: string
    contactType?: string
  }>
}) {
  // Server-side auth + team verification
  const { team } = await getServerAuthContext('gestionnaire')

  const params = await searchParams
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

  // Initialize services
  const buildingService = await createServerBuildingService()
  const lotService = await createServerLotService()
  const contactService = await createServerContactService()

  // Load buildings with lots (for PropertySelector)
  const buildingsResult = await buildingService.getBuildingsByTeam(team.id)
  let buildings = buildingsResult.success ? (buildingsResult.data || []) : []

  // ✅ 2025-12-26: Get occupied lot IDs from ACTIVE CONTRACTS (not lot_contacts)
  let occupiedLotIds = new Set<string>()
  try {
    const contractService = await createServerContractService()
    const occupiedResult = await contractService.getOccupiedLotIdsByTeam(team.id)
    if (occupiedResult.success) {
      occupiedLotIds = occupiedResult.data
      logger.info('✅ [NEW-CONTRACT-PAGE] Occupied lots from contracts:', {
        count: occupiedLotIds.size
      })
    }
  } catch (error) {
    logger.warn('⚠️ [NEW-CONTRACT-PAGE] Could not get occupied lots from contracts')
  }

  // Transform buildings lots to add status field
  buildings = buildings.map((building: any) => ({
    ...building,
    lots: (building.lots || []).map((lot: any) => {
      // ✅ 2025-12-26: Use contracts-based occupation instead of lot_contacts
      const isOccupied = occupiedLotIds.has(lot.id)
      return {
        ...lot,
        is_occupied: isOccupied,
        status: isOccupied ? "occupied" : "vacant"
      }
    })
  }))

  logger.info('✅ [NEW-CONTRACT-PAGE] Buildings loaded', { count: buildings.length })

  // Load individual lots (for PropertySelector)
  const lotsResult = await lotService.getLotsByTeam(team.id)
  const rawLots = lotsResult.success ? (lotsResult.data || []) : []

  // Transform lots to add status and building_name
  // ✅ 2025-12-26: Use contracts-based occupation instead of lot.is_occupied
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

  // Prepare buildings data for PropertySelector
  const buildingsData = {
    buildings,
    lots: transformedLots,
    teamId: team.id
  }

  // Load team contacts server-side (for tenant/guarantor selection)
  const contactsResult = await contactService.getContactsByTeam(team.id)

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
      teamId={team.id}
      initialBuildingsData={buildingsData}
      initialContacts={contacts}
      prefilledLotId={prefilledLotId}
      // Props pour retour après création de contact
      sessionKey={sessionKey}
      newContactId={newContactId}
      contactType={contactType}
    />
  )
}
