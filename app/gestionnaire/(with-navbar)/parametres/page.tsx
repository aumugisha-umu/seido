import { getServerAuthContext } from "@/lib/server-context"
import { createServerActionLotService } from "@/lib/services"
import SettingsPage from "@/components/settings-page"
import { getAiSubscriptionStatus } from "@/app/actions/ai-subscription-actions"
import { logger } from "@/lib/logger"

/**
 * Page Paramètres Gestionnaire - Server Component
 *
 * Récupère le nombre de lots de l'équipe pour pré-remplir
 * le slider de la section abonnement, et le statut AI pour la carte compacte.
 */
export default async function GestionnaireParametresPage() {
  const { team } = await getServerAuthContext('gestionnaire')

  // Fetch lot count + AI status in parallel
  const [lotResult, aiResult] = await Promise.all([
    createServerActionLotService()
      .then(svc => svc.getLotsByTeam(team.id))
      .catch((error) => {
        logger.error({ error: error instanceof Error ? error.message : String(error) }, '[SETTINGS] Error fetching lot count')
        return null
      }),
    getAiSubscriptionStatus().catch(() => null),
  ])

  const lotCount = lotResult?.success && lotResult.data ? lotResult.data.length : 10

  const aiStatus = aiResult?.success && aiResult.data
    ? {
        isActive: aiResult.data.isActive,
        phoneNumber: aiResult.data.phoneNumber,
        minutesUsed: aiResult.data.minutesUsed,
        minutesIncluded: aiResult.data.minutesIncluded,
        callsCount: aiResult.data.callsCount,
        tier: aiResult.data.tier,
      }
    : null

  return (
    <SettingsPage
      role="gestionnaire"
      dashboardPath="/gestionnaire/dashboard"
      defaultLotCount={lotCount}
      aiStatus={aiStatus}
    />
  )
}
