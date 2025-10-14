/**
 * Locataire New Intervention Page
 * Allows tenants to create new intervention requests
 */

import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/services'
import { NewInterventionClient } from './new-intervention-client'

export default async function NewInterventionPage() {
  // Auth check
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user data and check role
  const { data: userData } = await supabase
    .from('users')
    .select('*')
    .eq('auth_user_id', user.id)
    .single()

  if (!userData || userData.role !== 'locataire') {
    redirect('/')
  }

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