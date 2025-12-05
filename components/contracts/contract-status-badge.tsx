"use client"

import { cn } from '@/lib/utils'
import type { ContractStatus, ContractStatusBadgeProps } from '@/lib/types/contract.types'
import { CONTRACT_STATUS_LABELS, CONTRACT_STATUS_COLORS } from '@/lib/types/contract.types'
import { FileText, Clock, CheckCircle, XCircle, RefreshCw, AlertCircle } from 'lucide-react'

const STATUS_ICONS: Record<ContractStatus, typeof FileText> = {
  brouillon: FileText,
  actif: CheckCircle,
  expire: AlertCircle,
  resilie: XCircle,
  renouvele: RefreshCw
}

export function ContractStatusBadge({
  status,
  size = 'md',
  showIcon = true
}: ContractStatusBadgeProps) {
  const Icon = STATUS_ICONS[status]
  const label = CONTRACT_STATUS_LABELS[status]
  const colorClass = CONTRACT_STATUS_COLORS[status]

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5'
  }

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  }

  return (
    <span
      className={cn(
        'contract-status-badge',
        'inline-flex items-center gap-1.5 rounded-full border font-medium',
        sizeClasses[size],
        colorClass
      )}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      {label}
    </span>
  )
}
