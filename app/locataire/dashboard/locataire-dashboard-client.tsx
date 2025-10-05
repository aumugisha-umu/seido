"use client"

import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { useRouter } from "next/navigation"
import { useDashboardSessionTimeout } from "@/hooks/use-dashboard-session-timeout"
import { logger, logError } from '@/lib/logger'
/**
 * 🎛️ COMPOSANT CLIENT - Locataire Dashboard (Interactions)
 * Seulement les parties interactives du dashboard locataire
 */
export function LocataireDashboardClient() {
  const _router = useRouter()

  // ✅ Surveillance de session inactive sur dashboard
  useDashboardSessionTimeout()

  const handleNewIntervention = () => {
    logger.info('📝 [LOCATAIRE-CLIENT] Creating new intervention...')
    router.push('/locataire/interventions/nouvelle-demande')
  }

  // Removed unused functions handleInterventionClick and handleOpenChat

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
