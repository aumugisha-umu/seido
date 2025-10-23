/**
 * Locataire New Intervention Page
 * Allows tenants to create new intervention requests
 */

import { getServerAuthContext } from '@/lib/server-context'
import { NewInterventionClient } from './new-intervention-client'

export default async function NewInterventionPage() {
  // ✅ AUTH + TEAM en 1 ligne (cached via React.cache())
  // Remplace ~17 lignes d'auth manuelle (getUser + role check)
  const { profile: userData, supabase } = await getServerAuthContext('locataire')

  // Get lots where user is tenant
  const { data: tenantLots } = await supabase
    .from('lot_contacts')
    .select(`
      lot:lots(
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
    `)
    .eq('user_id', userData.id)
    .eq('role', 'locataire')

  // Transform data for client component
  const availableLots = tenantLots?.map(item => ({
    id: item.lot.id,
    reference: item.lot.reference,
    apartment_number: item.lot.apartment_number,
    building_id: item.lot.building_id,
    building: item.lot.building
  })) || []

  return (
    <NewInterventionClient
      currentUser={userData}
      availableLots={availableLots}
    />
  )
}