'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { useIsMobile } from '@/hooks/use-mobile'
import type { BankConnectionSafe, BankTransactionRow } from '@/lib/types/bank.types'
import {
  TransactionFilters,
  DEFAULT_FILTERS,
  type TransactionFilterValues,
} from '@/components/bank/transaction-filters'
import { TransactionTableRow, TransactionCard } from '@/components/bank/transaction-row'
import { ReconciliationPanel } from '@/components/bank/reconciliation-panel'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TransactionsTabProps {
  connections: BankConnectionSafe[]
}

interface FetchResult {
  data: BankTransactionRow[]
  total: number
}

const PAGE_SIZES = [25, 50, 100] as const

// ---------------------------------------------------------------------------
// Build query string from filters + pagination
// ---------------------------------------------------------------------------

function buildQueryString(
  filters: TransactionFilterValues,
  page: number,
  pageSize: number
): string {
  const params = new URLSearchParams()

  params.set('page', String(page))
  params.set('page_size', String(pageSize))

  if (filters.status !== 'all') {
    params.set('status', filters.status)
  }
  if (filters.search.trim()) {
    params.set('search', filters.search.trim())
  }
  if (filters.bankConnectionId !== 'all') {
    params.set('bank_connection_id', filters.bankConnectionId)
  }
  if (filters.dateFrom) {
    params.set('date_from', filters.dateFrom)
  }
  if (filters.dateTo) {
    params.set('date_to', filters.dateTo)
  }
  if (filters.amountMin) {
    const parsed = parseFloat(filters.amountMin)
    if (!isNaN(parsed) && parsed > 0) {
      params.set('amount_min', String(parsed))
    }
  }

  return params.toString()
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TransactionsTab({ connections }: TransactionsTabProps) {
  const isMobile = useIsMobile()

  // Filter state
  const [filters, setFilters] = useState<TransactionFilterValues>(DEFAULT_FILTERS)

  // Pagination state
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(25)

  // Data state
  const [transactions, setTransactions] = useState<BankTransactionRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Reconciliation panel state
  const [selectedTransaction, setSelectedTransaction] = useState<BankTransactionRow | null>(null)

  // Connection name lookup
  const connectionNameMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const conn of connections) {
      const label = conn.iban_last4
        ? `${conn.bank_name} ****${conn.iban_last4}`
        : conn.bank_name
      map.set(conn.id, label)
    }
    return map
  }, [connections])

  // Fetch transactions
  const fetchTransactions = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const qs = buildQueryString(filters, page, pageSize)
      const response = await fetch(`/api/bank/transactions?${qs}`)

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}`)
      }

      const result: FetchResult = await response.json()
      setTransactions(result.data)
      setTotal(result.total)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue'
      setError(message)
      setTransactions([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [filters, page, pageSize])

  useEffect(() => {
    void fetchTransactions()
  }, [fetchTransactions])

  // Reset to page 1 when filters change
  const handleFiltersChange = useCallback((newFilters: TransactionFilterValues) => {
    setFilters(newFilters)
    setPage(1)
  }, [])

  const handlePageSizeChange = useCallback((value: string) => {
    setPageSize(Number(value))
    setPage(1)
  }, [])

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const startItem = total === 0 ? 0 : (page - 1) * pageSize + 1
  const endItem = Math.min(page * pageSize, total)

  return (
    <div className="space-y-4">
      {/* Filters */}
      <TransactionFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        connections={connections}
      />

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Chargement...</span>
        </div>
      ) : error ? (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-center">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={fetchTransactions}>
            Reessayer
          </Button>
        </div>
      ) : transactions.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Aucune transaction trouvee avec ces criteres.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          {!isMobile ? (
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full caption-bottom text-sm">
                  <thead className="sticky top-0 z-10 bg-muted/50 [&_tr]:border-b">
                    <tr className="border-b">
                      <th className="h-10 px-2 text-left align-middle font-semibold whitespace-nowrap text-muted-foreground">
                        Date
                      </th>
                      <th className="h-10 px-2 text-left align-middle font-semibold whitespace-nowrap text-muted-foreground">
                        Description
                      </th>
                      <th className="h-10 px-2 text-right align-middle font-semibold whitespace-nowrap text-muted-foreground">
                        Montant
                      </th>
                      <th className="h-10 px-2 text-left align-middle font-semibold whitespace-nowrap text-muted-foreground">
                        Compte
                      </th>
                      <th className="h-10 px-2 text-left align-middle font-semibold whitespace-nowrap text-muted-foreground">
                        Statut
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => (
                      <TransactionTableRow
                        key={tx.id}
                        transaction={tx}
                        connectionName={connectionNameMap.get(tx.bank_connection_id)}
                        onReconcile={() => setSelectedTransaction(tx)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Mobile cards */
            <div className="space-y-3">
              {transactions.map((tx) => (
                <TransactionCard
                  key={tx.id}
                  transaction={tx}
                  connectionName={connectionNameMap.get(tx.bank_connection_id)}
                  onReconcile={() => setSelectedTransaction(tx)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Pagination */}
      {total > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-2">
          <p className="text-sm text-muted-foreground">
            {startItem}&ndash;{endItem} sur {total} transaction{total > 1 ? 's' : ''}
          </p>

          <div className="flex items-center gap-3">
            {/* Page size selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground shrink-0">Par page</span>
              <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
                <SelectTrigger className="w-[80px]" aria-label="Nombre par page">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZES.map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Page navigation */}
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                aria-label="Page precedente"
              >
                <ChevronLeft className="size-4" />
              </Button>

              <span className="px-3 text-sm text-muted-foreground whitespace-nowrap">
                {page} / {totalPages}
              </span>

              <Button
                variant="outline"
                size="icon"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                aria-label="Page suivante"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reconciliation side panel */}
      <ReconciliationPanel
        transaction={selectedTransaction}
        isOpen={selectedTransaction !== null}
        onClose={() => setSelectedTransaction(null)}
        onAction={fetchTransactions}
      />
    </div>
  )
}
