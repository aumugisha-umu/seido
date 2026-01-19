"use client"

import { LotCardUnified } from './lot-card-unified'
import type { LotData } from './types'

/**
 * Wrapper interface matching the DataCards pattern
 * This allows LotCardUnified to be used with the data-navigator/table pattern
 */
export interface CardComponentProps<T> {
  item: T
  actions?: Array<{
    id: string
    label: string
    onClick: (item: T) => void
  }>
}

/**
 * LotCardWrapper - Adapter for DataCards/DataNavigator pattern
 *
 * Converts CardComponentProps to LotCardUnifiedProps so the unified
 * component can be used in patrimoine.config.tsx
 */
export function LotCardWrapper({ item, actions: _actions }: CardComponentProps<LotData>) {
  void _actions // Actions handled internally by LotCardUnified
  return (
    <LotCardUnified
      lot={item}
      variant="expandable"
      mode="view"
      showBuilding={true}
    />
  )
}

export default LotCardWrapper
