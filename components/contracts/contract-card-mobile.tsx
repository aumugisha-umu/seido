"use client"

import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { FileText, Calendar } from 'lucide-react'
import type { ContractWithRelations } from '@/lib/types/contract.types'
import { cn } from '@/lib/utils'

interface ContractCardMobileProps {
  contract: ContractWithRelations
}

const STATUS_STYLES: Record<string, string> = {
  actif: 'bg-emerald-100 text-emerald-700',
  a_venir: 'bg-blue-100 text-blue-700',
  expire: 'bg-slate-100 text-slate-500',
  resilie: 'bg-red-100 text-red-700',
  renouvele: 'bg-purple-100 text-purple-700',
}

const STATUS_LABELS: Record<string, string> = {
  actif: 'Actif',
  a_venir: 'À venir',
  expire: 'Expiré',
  resilie: 'Résilié',
  renouvele: 'Renouvelé',
}

export function ContractCardMobile({ contract }: ContractCardMobileProps) {
  const router = useRouter()

  const lotRef = contract.lot?.reference
  const buildingName = contract.lot?.building?.name
  const location = [buildingName, lotRef].filter(Boolean).join(' • ')

  const startDate = contract.start_date
    ? new Date(contract.start_date).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })
    : null
  const endDate = contract.end_date
    ? new Date(contract.end_date).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })
    : null
  const dateRange = startDate && endDate ? `${startDate} → ${endDate}` : startDate || null

  const handleClick = () => {
    router.push(`/gestionnaire/contrats/${contract.id}`)
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
      <div className={cn(
        "flex items-center justify-center w-10 h-10 rounded-lg flex-shrink-0",
        contract.status === 'actif' ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"
      )}>
        <FileText className="h-5 w-5" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium truncate">{contract.title}</span>
          <Badge className={cn("text-[10px] flex-shrink-0", STATUS_STYLES[contract.status] || 'bg-slate-100 text-slate-500')}>
            {STATUS_LABELS[contract.status] || contract.status}
          </Badge>
        </div>
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground mt-0.5">
          {location && <span className="truncate">{location}</span>}
          {dateRange && (
            <div className="flex items-center gap-1 flex-shrink-0">
              <Calendar className="h-3 w-3" />
              <span>{dateRange}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
