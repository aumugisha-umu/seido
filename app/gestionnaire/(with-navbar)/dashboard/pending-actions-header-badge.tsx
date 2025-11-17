"use client"

import { PendingActionsBadge } from "@/components/pending-actions-badge"

interface PendingActionsHeaderBadgeProps {
  count: number
}

export function PendingActionsHeaderBadge({
  count
}: PendingActionsHeaderBadgeProps) {
  if (count === 0) return null

  const handleClick = () => {
    // This will be handled by client component via window method
    if (typeof window !== 'undefined' && (window as any).__handleInterventionsTabChange) {
      (window as any).__handleInterventionsTabChange("actions_en_attente")
    }
  }

  return (
    <PendingActionsBadge
      count={count}
      onClick={handleClick}
      userRole="gestionnaire"
      isAlert={true}
    />
  )
}

