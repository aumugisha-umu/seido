"use client"

import { AlertTriangle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface PendingActionsBadgeProps {
  count: number
  onClick: () => void
  userRole?: 'locataire' | 'prestataire' | 'gestionnaire'
  isAlert?: boolean
}

export function PendingActionsBadge({
  count,
  onClick,
  isAlert = false
}: PendingActionsBadgeProps) {
  const isClickable = count > 0

  return (
    <button
      onClick={isClickable ? onClick : undefined}
      disabled={!isClickable}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors border",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        isClickable 
          ? isAlert
            ? "bg-orange-50 border-orange-200 hover:bg-orange-100 cursor-pointer"
            : "bg-blue-50 border-blue-200 hover:bg-blue-100 cursor-pointer"
          : "opacity-50 cursor-not-allowed bg-slate-50 border-slate-200"
      )}
      aria-label={`Actions en attente: ${count}`}
    >
      <AlertTriangle className={cn(
        "w-4 h-4 flex-shrink-0",
        isAlert ? "text-orange-600" : "text-blue-600"
      )} />
      <span className={cn(
        "text-sm font-medium",
        isAlert ? "text-orange-700" : "text-blue-700"
      )}>
        Actions en attente
      </span>
      <Badge 
        variant="secondary" 
        className={cn(
          "text-xs",
          isAlert
            ? "bg-orange-100 text-orange-800 border-orange-200"
            : "bg-blue-100 text-blue-800 border-blue-200"
        )}
      >
        {count}
      </Badge>
    </button>
  )
}

