"use client"

import { useRouter } from 'next/navigation'
import { Home, User } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { LotData } from '@/config/table-configs/patrimoine.config'
import { cn } from '@/lib/utils'

interface LotCardMobileProps {
  lot: LotData
  locked?: boolean
}

export function LotCardMobile({ lot, locked }: LotCardMobileProps) {
  const router = useRouter()

  const buildingName = lot.building?.name || lot.building_name
  const tenantName = lot.lot_contacts?.find(c => c.user?.role === 'locataire')?.user?.name
  const surface = lot.surface_area ? `${lot.surface_area} m²` : null

  const handleClick = () => {
    if (locked) return
    router.push(`/gestionnaire/biens/lots/${lot.id}`)
  }

  return (
    <div
      role="button"
      tabIndex={locked ? -1 : 0}
      onClick={handleClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick() }}
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border bg-card transition-colors",
        locked
          ? "opacity-50 cursor-not-allowed"
          : "active:bg-muted/50 cursor-pointer"
      )}
    >
      {/* Icon */}
      <div className={cn(
        "flex items-center justify-center w-10 h-10 rounded-lg flex-shrink-0",
        lot.is_occupied ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"
      )}>
        <Home className="h-5 w-5" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium truncate">{lot.reference}</span>
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] flex-shrink-0",
              lot.is_occupied
                ? "border-emerald-200 text-emerald-700 bg-emerald-50"
                : "border-slate-200 text-slate-500"
            )}
          >
            {lot.is_occupied ? 'Occupé' : 'Vacant'}
          </Badge>
        </div>
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground mt-0.5">
          <div className="flex items-center gap-1 min-w-0">
            {buildingName && <span className="truncate">{buildingName}</span>}
            {surface && <span className="flex-shrink-0">• {surface}</span>}
          </div>
          {tenantName && (
            <div className="flex items-center gap-1 flex-shrink-0">
              <User className="h-3 w-3" />
              <span className="truncate max-w-[100px]">{tenantName}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
