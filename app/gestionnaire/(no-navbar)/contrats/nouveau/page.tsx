import { getServerAuthContext } from '@/lib/server-context'
import { createServerLotService, createServerContactService } from '@/lib/services'
import ContractCreationClient from './contract-creation-client'
import { logger } from '@/lib/logger'

/**
 * SERVER COMPONENT - Contract Creation Page
 *
 * Loads initial data server-side:
 * - Available lots for the team
 * - Team contacts for tenant/guarantor selection
 */
export default async function NewContractPage({
  searchParams
}: {
  searchParams: Promise<{ lot?: string; renew?: string }>
}) {
  // Server-side auth + team verification
  const { profile, team } = await getServerAuthContext('gestionnaire')

  const params = await searchParams
  const prefilledLotId = params.lot || null
  const renewFromId = params.renew || null

  logger.info('📄 [NEW-CONTRACT-PAGE] Loading initial data', {
    teamId: team.id,
    prefilledLotId,
    renewFromId
  })

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

  logger.info('✅ [NEW-CONTRACT-PAGE] Lots loaded', { count: lots.length })

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

  logger.info('✅ [NEW-CONTRACT-PAGE] Contacts loaded', { count: contacts.length })

  return (
    <ContractCreationClient
      teamId={team.id}
      initialLots={lots}
      initialContacts={contacts}
      prefilledLotId={prefilledLotId}
      renewFromId={renewFromId}
    />
  )
}
