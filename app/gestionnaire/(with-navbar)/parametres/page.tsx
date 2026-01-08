import { getServerAuthContext } from "@/lib/server-context"
import { createServerActionLotService } from "@/lib/services"
import SettingsPage from "@/components/settings-page"

/**
 * Page Paramètres Gestionnaire - Server Component
 *
 * Récupère le nombre de lots de l'équipe pour pré-remplir
 * le slider de la section abonnement.
 */
export default async function GestionnaireParametresPage() {
  const { team } = await getServerAuthContext('gestionnaire')

  // Récupérer le nombre de lots de l'équipe
  let lotCount = 10 // Valeur par défaut
  try {
    const lotService = await createServerActionLotService()
    const lotsResult = await lotService.getLotsByTeam(team.id)
    if (lotsResult.success && lotsResult.data) {
      lotCount = lotsResult.data.length
    }
  } catch (error) {
    console.error('[SETTINGS] Error fetching lot count:', error)
  }

  return (
    <SettingsPage
      role="gestionnaire"
      dashboardPath="/gestionnaire/dashboard"
      defaultLotCount={lotCount}
    />
  )
}
