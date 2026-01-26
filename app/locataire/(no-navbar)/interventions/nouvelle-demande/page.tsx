import { requireRole } from "@/lib/auth-dal"
import { createServerTenantService } from "@/lib/services/domain/tenant.service"
import NouvelleDemandePage from "./nouvelle-demande-client"

export default async function NouvelleDemandServerPage() {
  // Fetch user data server-side
  const { user, profile } = await requireRole(['locataire'])

  // Fetch tenant lots server-side
  const tenantService = await createServerTenantService()
  const lots = await tenantService.getSimpleTenantLots(profile.id)

  // Transform lots to the expected format
  const tenantLots = lots.map(lot => ({
    id: lot.id,
    apartment_number: lot.apartment_number,
    reference: lot.reference,
    building: lot.building ? {
      id: lot.building.id,
      name: lot.building.name,
      address: lot.building.address,
      postal_code: lot.building.postal_code,
      city: lot.building.city
    } : undefined,
    surface_area: lot.surface_area
  }))

  return (
    <NouvelleDemandePage
      userId={profile.id}
      userRole={profile.role}
      teamId={profile.team_id}
      tenantLots={tenantLots}
    />
  )
}
