/**
 * Locataire New Intervention Page
 * Allows tenants to create new intervention requests
 *
 * ✅ UPDATE 2025-12-11: Changed from lot_contacts to contract_contacts
 * Tenants are now linked to lots via active contracts
 */

import { getServerAuthContext } from '@/lib/server-context'
import { NewInterventionClient } from './new-intervention-client'

export default async function NewInterventionPage() {
  // ✅ AUTH + TEAM en 1 ligne (cached via React.cache())
  // Remplace ~17 lignes d'auth manuelle (getUser + role check)
  const { profile: userData, supabase } = await getServerAuthContext('locataire')

  // Get lots where user is tenant via ACTIVE contracts
  const { data: tenantContracts } = await supabase
    .from('contract_contacts')
    .select(`
      role,
      contract:contract_id(
        id,
        status,
        lot:lot_id(
          id,
          reference,
          apartment_number,
          building_id,
          building:buildings(
            id,
            name,
            address
          )
        )
      )
    `)
    .eq('user_id', userData.id)
    .in('role', ['locataire', 'colocataire'])

  // Filter to only active contracts and transform data for client component
  const availableLots = (tenantContracts || [])
    .filter((item: any) => item.contract?.status === 'actif' && item.contract?.lot)
    .map((item: any) => ({
      id: item.contract.lot.id,
      reference: item.contract.lot.reference,
      apartment_number: item.contract.lot.apartment_number,
      building_id: item.contract.lot.building_id,
      building: item.contract.lot.building
    }))

  return (
    <NewInterventionClient
      currentUser={userData}
      availableLots={availableLots}
    />
  )
}