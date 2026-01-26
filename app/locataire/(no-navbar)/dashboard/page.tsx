import { requireRole } from "@/lib/auth-dal"
import LocataireDashboard from "@/components/dashboards/locataire-dashboard"
import { createServerTenantService } from "@/lib/services/domain/tenant.service"
import { logger } from "@/lib/logger"

export default async function LocataireDashboardPage() {
  // ✅ Fetch ALL data server-side (Next.js 15 pattern)
  const { user, profile } = await requireRole(['locataire'])

  const userName = profile.name || user.email?.split('@')[0] || 'Utilisateur'
  const userInitial = userName.charAt(0).toUpperCase()
  const teamId = profile.team_id

  // ✅ Fetch tenant data server-side - no client-side fetch needed
  let tenantData = null
  let tenantError = null

  try {
    const tenantService = await createServerTenantService()
    tenantData = await tenantService.getTenantData(profile.id)
    logger.info('✅ [LOCATAIRE-PAGE] Tenant data loaded server-side:', {
      userId: profile.id,
      lotsCount: tenantData?.lots?.length || 0,
      contractStatus: tenantData?.contractStatus,
      interventionsCount: tenantData?.interventions?.length || 0
    })
  } catch (error) {
    logger.error('❌ [LOCATAIRE-PAGE] Failed to load tenant data server-side:', error)
    tenantError = error instanceof Error ? error.message : 'Erreur de chargement'
  }

  return (
    <LocataireDashboard
      userName={userName}
      userInitial={userInitial}
      teamId={teamId}
      // ✅ Pass server-loaded data as props
      serverTenantData={tenantData}
      serverError={tenantError}
      userId={profile.id}
      userRole={profile.role}
    />
  )
}
