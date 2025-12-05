import { notFound } from 'next/navigation'
import { getServerAuthContext } from '@/lib/server-context'
import { createServerContractService, createServerLotService, createServerContactService } from '@/lib/services'
import ContractEditClient from './contract-edit-client'
import { logger } from '@/lib/logger'

/**
 * SERVER COMPONENT - Contract Edit Page
 *
 * Loads:
 * - Existing contract data with relations (contacts, documents)
 * - Available lots for the team (in case lot change is needed)
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

  // Load team lots server-side
  const lotService = await createServerLotService()
  const lotsResult = await lotService.getLotsByTeam(team.id)

  const lots = lotsResult.success && lotsResult.data
    ? lotsResult.data.map((lot: any) => ({
        id: lot.id,
        reference: lot.reference,
        category: lot.category,
        street: lot.street || '',
        city: lot.city || '',
        building: lot.building ? {
          id: lot.building.id,
          name: lot.building.name,
          address: lot.building.address || '',
          city: lot.building.city || ''
        } : null
      }))
    : []

  logger.info('✅ [EDIT-CONTRACT-PAGE] Lots loaded', { count: lots.length })

  // Load team contacts server-side (for tenant/guarantor selection)
  const contactService = await createServerContactService()
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
    <ContractEditClient
      teamId={team.id}
      contract={contract}
      initialLots={lots}
      initialContacts={contacts}
    />
  )
}
