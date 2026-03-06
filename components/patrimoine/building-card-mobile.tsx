"use client"

import { useRouter } from 'next/navigation'
import { Building2, Home } from 'lucide-react'
import type { BuildingData } from '@/config/table-configs/patrimoine.config'
import { cn } from '@/lib/utils'

interface BuildingCardMobileProps {
  building: BuildingData
}

export function BuildingCardMobile({ building }: BuildingCardMobileProps) {
  const router = useRouter()

  const lotsCount = building.lots?.length ?? 0
  const occupiedCount = building.lots?.filter(l => l.is_occupied).length ?? 0
  const occupancyRate = lotsCount > 0 ? Math.round((occupiedCount / lotsCount) * 100) : 0
  const address = building.address_record?.formatted_address
    || building.address_record?.street
    || null

  const handleClick = () => {
    router.push(`/gestionnaire/biens/immeubles/${building.id}`)
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick() }}
      className="flex items-center gap-3 p-3 rounded-lg border bg-card active:bg-muted/50 cursor-pointer transition-colors"
    >
      {/* Icon */}
      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-sky-50 text-sky-600 flex-shrink-0">
        <Building2 className="h-5 w-5" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium truncate">{building.name}</span>
          <span className={cn(
            "text-xs font-medium px-1.5 py-0.5 rounded-full flex-shrink-0",
            occupancyRate >= 80 ? "bg-emerald-100 text-emerald-700"
              : occupancyRate >= 50 ? "bg-amber-100 text-amber-700"
                : "bg-slate-100 text-slate-600"
          )}>
            {occupancyRate}%
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground mt-0.5">
          {address && <span className="truncate">{address}</span>}
          <div className="flex items-center gap-1 flex-shrink-0">
            <Home className="h-3 w-3" />
            <span>{lotsCount} lot{lotsCount > 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
