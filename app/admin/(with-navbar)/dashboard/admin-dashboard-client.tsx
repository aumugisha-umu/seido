"use client"

import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"
import { useDashboardSessionTimeout } from "@/hooks/use-dashboard-session-timeout"

/**
 * Admin Dashboard — Client interactions (refresh button + session timeout)
 */
export function AdminDashboardClient() {
  const router = useRouter()

  useDashboardSessionTimeout()

  const handleRefreshData = () => {
    router.refresh()
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleRefreshData}
      className="flex items-center gap-2"
    >
      <RefreshCw className="w-4 h-4" />
      Actualiser
    </Button>
  )
}
