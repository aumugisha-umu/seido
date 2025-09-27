"use client"

import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { useRouter } from "next/navigation"
import { useDashboardSessionTimeout } from "@/hooks/use-dashboard-session-timeout"

/**
 * 🎛️ COMPOSANT CLIENT - Locataire Dashboard (Interactions)
 * Seulement les parties interactives du dashboard locataire
 */
export function LocataireDashboardClient() {
  const router = useRouter()

  // ✅ Surveillance de session inactive sur dashboard
  useDashboardSessionTimeout()

  const handleNewIntervention = () => {
    console.log('📝 [LOCATAIRE-CLIENT] Creating new intervention...')
    router.push('/locataire/interventions/nouvelle-demande')
  }

  const handleInterventionClick = (interventionId: string) => {
    console.log('👁️ [LOCATAIRE-CLIENT] Viewing intervention:', interventionId)
    router.push(`/locataire/interventions/${interventionId}`)
  }

  const handleOpenChat = () => {
    // TODO: Remplacer par la vraie logique de chat
    console.log('💬 [LOCATAIRE-CLIENT] Opening chat with manager...')

    // Exemples d'implémentation possibles :
    // 1. Router vers une page de chat dédiée
    // router.push('/locataire/chat/manager')

    // 2. Ouvrir un modal de chat
    // setIsChatModalOpen(true)

    // 3. Router vers une liste de conversations
    // router.push('/locataire/conversations')

    // Pour l'instant, on peut rediriger vers le dashboard comme fallback
    router.push('/locataire/dashboard')
  }

  return (
    <div className="flex justify-center lg:justify-end">
      <Button
        className="px-6 py-3 text-base font-semibold"
        onClick={handleNewIntervention}
      >
        <Plus className="w-5 h-5 mr-2" />
        Créer une nouvelle demande
      </Button>
    </div>
  )
}