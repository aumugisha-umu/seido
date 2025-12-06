import { notFound } from 'next/navigation'
import { getServerAuthContext } from '@/lib/server-context'
import {
  createServerContractService,
  createServerLotService,
  createServerContactService,
  createServerBuildingService
} from '@/lib/services'
import ContractFormContainer from '@/components/contract/contract-form-container'
import { logger } from '@/lib/logger'

/**
 * SERVER COMPONENT - Contract Edit Page
 *
 * Loads:
 * - Existing contract data with relations (contacts, documents)
 * - Buildings with lots (for PropertySelector)
 * - Individual lots (for PropertySelector)
 * - Team contacts for tenant/guarantor selection
 */
export default async function EditContractPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  // Server-side auth + team verification
  const { team } = await getServerAuthContext('gestionnaire')

  const { id: contractId } = await params

  logger.info('📝 [EDIT-CONTRACT-PAGE] Loading contract data', {
    teamId: team.id,
    contractId
  })

  // Load contract with relations
  const contractService = await createServerContractService()
  const contractResult = await contractService.getContractWithRelations(contractId)

  if (!contractResult.success || !contractResult.data) {
    logger.warn('❌ [EDIT-CONTRACT-PAGE] Contract not found', { contractId })
    notFound()
  }

  const contract = contractResult.data

  // Verify contract belongs to user's team
  if (contract.team_id !== team.id) {
    logger.warn('❌ [EDIT-CONTRACT-PAGE] Contract not in user team', {
      contractId,
      contractTeamId: contract.team_id,
      userTeamId: team.id
    })
    notFound()
  }

  // Initialize services
  const buildingService = await createServerBuildingService()
  const lotService = await createServerLotService()
  const contactService = await createServerContactService()

  // Load buildings with lots (for PropertySelector) - same as creation page
  const buildingsResult = await buildingService.getBuildingsByTeam(team.id)
  let buildings = buildingsResult.success ? (buildingsResult.data || []) : []

  // Transform buildings lots to add status field
  buildings = buildings.map((building: any) => ({
    ...building,
    lots: (building.lots || []).map((lot: any) => {
      const tenants = lot.lot_contacts?.filter((contact: any) =>
        contact.user?.role === 'locataire'
      ) || []
      const isOccupied = tenants.length > 0
      return {
        ...lot,
        is_occupied: isOccupied,
        status: isOccupied ? "occupied" : "vacant"
      }
    })
  }))

  logger.info('✅ [EDIT-CONTRACT-PAGE] Buildings loaded', { count: buildings.length })

  // Load individual lots (for PropertySelector)
  const lotsResult = await lotService.getLotsByTeam(team.id)
  const rawLots = lotsResult.success ? (lotsResult.data || []) : []

  // Transform lots to add status and building_name
  const transformedLots = rawLots.map((lot: any) => {
    const isOccupied = lot.is_occupied || false
    return {
      ...lot,
      status: isOccupied ? "occupied" : "vacant",
      building_name: buildings.find((b: any) => b.id === lot.building_id)?.name || null
    }
  })

  logger.info('✅ [EDIT-CONTRACT-PAGE] Lots loaded', { count: transformedLots.length })

  // Prepare buildings data for PropertySelector (same format as creation page)
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

  logger.info('✅ [EDIT-CONTRACT-PAGE] Contacts loaded', { count: contacts.length })

  return (
    <ContractFormContainer
      mode="edit"
      teamId={team.id}
      initialBuildingsData={buildingsData}
      initialContacts={contacts}
      existingContract={contract}
    />
  )
}
