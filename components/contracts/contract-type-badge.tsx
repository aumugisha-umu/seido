"use client"

import { cn } from '@/lib/utils'
import type { ContractType, ContractTypeBadgeProps } from '@/lib/types/contract.types'
import { CONTRACT_TYPE_LABELS, CONTRACT_TYPE_COLORS } from '@/lib/types/contract.types'

export function ContractTypeBadge({ type }: ContractTypeBadgeProps) {
  const label = CONTRACT_TYPE_LABELS[type]
  const colorClass = CONTRACT_TYPE_COLORS[type]

  return (
    <span
      className={cn(
        'contract-type-badge',
        'inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium',
        colorClass
      )}
    >
      {label}
    </span>
  )
}
