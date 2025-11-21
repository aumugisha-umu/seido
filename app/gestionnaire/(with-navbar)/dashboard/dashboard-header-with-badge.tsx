"use client"

import { PendingActionsHeaderBadge } from "./pending-actions-header-badge"

interface DashboardHeaderWithBadgeProps {
  pendingActionsCount: number
  children: React.ReactNode
}

export function DashboardHeaderWithBadge({
  pendingActionsCount,
  children
}: DashboardHeaderWithBadgeProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
      <div className="flex items-center gap-3">
        <h1 className="font-semibold text-gray-900 text-xl sm:text-2xl leading-tight">
          Tableau de bord
        </h1>
        <PendingActionsHeaderBadge
          count={pendingActionsCount}
        />
      </div>
      {children}
    </div>
  )
}

