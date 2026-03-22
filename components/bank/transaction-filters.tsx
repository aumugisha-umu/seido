'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RotateCcw, Search } from 'lucide-react'
import type { BankConnectionSafe, TransactionReconciliationStatus } from '@/lib/types/bank.types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TransactionFilterValues {
  search: string
  status: TransactionReconciliationStatus | 'all'
  bankConnectionId: string
  dateFrom: string
  dateTo: string
  amountMin: string
}

interface TransactionFiltersProps {
  filters: TransactionFilterValues
  onFiltersChange: (filters: TransactionFilterValues) => void
  connections: BankConnectionSafe[]
}

// ---------------------------------------------------------------------------
// Default
// ---------------------------------------------------------------------------

export const DEFAULT_FILTERS: TransactionFilterValues = {
  search: '',
  status: 'to_reconcile',
  bankConnectionId: 'all',
  dateFrom: '',
  dateTo: '',
  amountMin: '',
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TransactionFilters({
  filters,
  onFiltersChange,
  connections,
}: TransactionFiltersProps) {
  // Debounced search
  const [searchInput, setSearchInput] = useState(filters.search)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchInput(value)

      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }

      debounceRef.current = setTimeout(() => {
        onFiltersChange({ ...filters, search: value })
      }, 300)
    },
    [filters, onFiltersChange]
  )

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  // Sync local search input when filters are reset externally
  useEffect(() => {
    setSearchInput(filters.search)
  }, [filters.search])

  const updateFilter = useCallback(
    <K extends keyof TransactionFilterValues>(key: K, value: TransactionFilterValues[K]) => {
      onFiltersChange({ ...filters, [key]: value })
    },
    [filters, onFiltersChange]
  )

  const handleReset = useCallback(() => {
    onFiltersChange(DEFAULT_FILTERS)
  }, [onFiltersChange])

  const hasActiveFilters =
    filters.search !== '' ||
    filters.status !== 'to_reconcile' ||
    filters.bankConnectionId !== 'all' ||
    filters.dateFrom !== '' ||
    filters.dateTo !== '' ||
    filters.amountMin !== ''

  return (
    <div className="space-y-3">
      {/* Row 1: Search + Status + Compte */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 min-w-0 sm:max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Rechercher..."
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
            aria-label="Rechercher des transactions"
          />
        </div>

        <Select
          value={filters.status}
          onValueChange={(v) => updateFilter('status', v as TransactionReconciliationStatus | 'all')}
        >
          <SelectTrigger className="w-full sm:w-[180px]" aria-label="Filtrer par statut">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="to_reconcile">A rapprocher</SelectItem>
            <SelectItem value="reconciled">Rapproche</SelectItem>
            <SelectItem value="ignored">Ignore</SelectItem>
            <SelectItem value="all">Tous</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.bankConnectionId}
          onValueChange={(v) => updateFilter('bankConnectionId', v)}
        >
          <SelectTrigger className="w-full sm:w-[220px]" aria-label="Filtrer par compte">
            <SelectValue placeholder="Tous les comptes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les comptes</SelectItem>
            {connections.map((conn) => (
              <SelectItem key={conn.id} value={conn.id}>
                {conn.bank_name}
                {conn.iban_last4 ? ` ****${conn.iban_last4}` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Row 2: Date range + Amount min + Reset */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => updateFilter('dateFrom', e.target.value)}
            className="w-full sm:w-[150px]"
            aria-label="Date de debut"
          />
          <span className="text-sm text-muted-foreground shrink-0">a</span>
          <Input
            type="date"
            value={filters.dateTo}
            onChange={(e) => updateFilter('dateTo', e.target.value)}
            className="w-full sm:w-[150px]"
            aria-label="Date de fin"
          />
        </div>

        <Input
          type="number"
          placeholder="Montant min"
          value={filters.amountMin}
          onChange={(e) => updateFilter('amountMin', e.target.value)}
          className="w-full sm:w-[140px]"
          aria-label="Montant minimum"
          min={0}
          step="0.01"
        />

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="shrink-0"
            aria-label="Reinitialiser les filtres"
          >
            <RotateCcw className="size-4 mr-1.5" />
            Reinitialiser
          </Button>
        )}
      </div>
    </div>
  )
}
