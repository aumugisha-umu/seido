"use client"

import { Button } from "@/components/ui/button"
import { Settings, RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"
import { useDashboardSessionTimeout } from "@/hooks/use-dashboard-session-timeout"

interface AdminDashboardClientProps {
  userId?: string
}

/**
 * 🎛️ COMPOSANT CLIENT - Admin Dashboard (Interactions)
 * Seulement les parties interactives du dashboard admin
 */
export function AdminDashboardClient({ userId }: AdminDashboardClientProps) {
  // Supprimer l'unused variable warning
  console.log('Admin dashboard client initialized for user:', _userId)
  const _router = useRouter()

  // ✅ Surveillance de session inactive sur dashboard
  useDashboardSessionTimeout()

  const handleRefreshData = () => {
    console.log('🔄 [ADMIN-CLIENT] Refreshing dashboard data...')
    router.refresh()
  }

  const handleSystemSettings = () => {
    console.log('⚙️ [ADMIN-CLIENT] Opening system settings...')
    // Navigate to system settings (à implémenter)
    router.push('/admin/settings')
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleRefreshData}
        className="flex items-center gap-2"
      >
        <RefreshCw className="w-4 h-4" />
        Actualiser
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={handleSystemSettings}
        className="flex items-center gap-2"
      >
        <Settings className="w-4 h-4" />
        Paramètres
      </Button>
    </div>
  )
}
