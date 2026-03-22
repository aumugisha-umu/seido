'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EyeOff, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useIsMobile } from '@/hooks/use-mobile'
import { formatAmount } from '@/components/bank/transaction-row'
import { SuggestionCard } from '@/components/bank/suggestion-card'
import type { BankTransactionRow, MatchSuggestion } from '@/lib/types/bank.types'

import { formatDateFR } from '@/lib/utils/date-formatting'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ReconciliationPanelProps {
  transaction: BankTransactionRow | null
  isOpen: boolean
  onClose: () => void
  onAction: () => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ReconciliationPanel({
  transaction,
  isOpen,
  onClose,
  onAction,
}: ReconciliationPanelProps) {
  const isMobile = useIsMobile()

  // Suggestions state
  const [suggestions, setSuggestions] = useState<MatchSuggestion[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null)

  // Action state
  const [acceptingId, setAcceptingId] = useState<string | null>(null)
  const [ignoring, setIgnoring] = useState(false)

  // Fetch suggestions when transaction changes
  useEffect(() => {
    if (!transaction || !isOpen) {
      setSuggestions([])
      setSuggestionsError(null)
      return
    }

    const controller = new AbortController()

    const fetchSuggestions = async () => {
      setLoadingSuggestions(true)
      setSuggestionsError(null)

      try {
        const response = await fetch(
          `/api/bank/suggestions/${transaction.id}`,
          { signal: controller.signal }
        )

        if (!response.ok) {
          throw new Error(`Erreur ${response.status}`)
        }

        const data: MatchSuggestion[] = await response.json()
        setSuggestions(data)
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        const message = err instanceof Error ? err.message : 'Erreur inconnue'
        setSuggestionsError(message)
        setSuggestions([])
      } finally {
        setLoadingSuggestions(false)
      }
    }

    void fetchSuggestions()

    return () => controller.abort()
  }, [transaction?.id, isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  // Accept a suggestion
  const handleAccept = useCallback(
    async (suggestion: MatchSuggestion) => {
      if (!transaction) return

      setAcceptingId(suggestion.entity_id)
      try {
        const response = await fetch(
          `/api/bank/transactions/${transaction.id}/reconcile`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              entity_type: suggestion.entity_type,
              entity_id: suggestion.entity_id,
              match_method: 'suggestion_accepted' as const,
              match_confidence: suggestion.confidence,
            }),
          }
        )

        if (!response.ok) {
          const body = await response.json().catch(() => ({}))
          throw new Error(
            (body as { error?: string }).error || `Erreur ${response.status}`
          )
        }

        toast.success('Transaction rapprochee avec succes')
        onAction()
        onClose()
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erreur inconnue'
        toast.error(`Echec du rapprochement : ${message}`)
      } finally {
        setAcceptingId(null)
      }
    },
    [transaction, onAction, onClose]
  )

  // Ignore transaction
  const handleIgnore = useCallback(async () => {
    if (!transaction) return

    setIgnoring(true)
    try {
      const response = await fetch(
        `/api/bank/transactions/${transaction.id}/ignore`,
        { method: 'PATCH' }
      )

      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(
          (body as { error?: string }).error || `Erreur ${response.status}`
        )
      }

      toast.success(
        transaction.status === 'ignored'
          ? 'Transaction restauree'
          : 'Transaction ignoree'
      )
      onAction()
      onClose()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue'
      toast.error(`Echec : ${message}`)
    } finally {
      setIgnoring(false)
    }
  }, [transaction, onAction, onClose])

  if (!transaction) return null

  const { text: amountText, className: amountClass } = formatAmount(
    transaction.amount,
    transaction.currency
  )
  const counterparty = transaction.payer_name || transaction.payee_name
  const isIgnored = transaction.status === 'ignored'
  const isReconciled = transaction.status === 'reconciled'

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side={isMobile ? 'bottom' : 'right'}
        className={
          isMobile
            ? 'h-[85vh] rounded-t-xl'
            : 'w-[480px] sm:max-w-[480px]'
        }
      >
        {/* Mobile drag handle indicator */}
        {isMobile && (
          <div className="flex justify-center pb-2" aria-hidden="true">
            <div className="h-1.5 w-12 rounded-full bg-muted-foreground/30" />
          </div>
        )}

        <SheetHeader>
          <SheetTitle>Details de la transaction</SheetTitle>
          <SheetDescription className="sr-only">
            Panneau de rapprochement bancaire
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-6">
          {/* ---- Transaction details ---- */}
          <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">
                  {transaction.description_display || transaction.description_original}
                </p>
                {counterparty && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {counterparty}
                  </p>
                )}
              </div>
              <span className={`text-lg font-semibold shrink-0 ${amountClass}`}>
                {amountText}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>{formatDateFR(transaction.transaction_date)}</span>
              {transaction.reference && (
                <span>
                  Ref : {transaction.reference}
                </span>
              )}
            </div>
          </div>

          {/* ---- Suggestions ---- */}
          {!isReconciled && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">
                Suggestions de rapprochement
              </h3>

              {loadingSuggestions ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="rounded-lg border border-border p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <Skeleton className="size-8 rounded-md" />
                        <div className="flex-1 space-y-1">
                          <Skeleton className="h-3 w-20" />
                          <Skeleton className="h-4 w-40" />
                        </div>
                        <Skeleton className="h-4 w-16" />
                      </div>
                      <div className="flex gap-1">
                        <Skeleton className="h-5 w-24 rounded-full" />
                        <Skeleton className="h-5 w-16 rounded-full" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : suggestionsError ? (
                <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-center">
                  <p className="text-sm text-destructive">{suggestionsError}</p>
                </div>
              ) : suggestions.length === 0 ? (
                <div className="rounded-lg border border-border bg-muted/30 p-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    Aucune suggestion de rapprochement trouvee.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {suggestions.map((suggestion) => (
                    <SuggestionCard
                      key={`${suggestion.entity_type}-${suggestion.entity_id}`}
                      suggestion={suggestion}
                      transactionAmount={transaction.amount}
                      onAccept={handleAccept}
                      isAccepting={acceptingId === suggestion.entity_id}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ---- Reconciled info ---- */}
          {isReconciled && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-center dark:border-green-900 dark:bg-green-950/30">
              <p className="text-sm font-medium text-green-800 dark:text-green-200">
                Cette transaction est deja rapprochee.
              </p>
            </div>
          )}
        </div>

        {/* ---- Footer actions ---- */}
        <div className="border-t border-border p-4">
          <Button
            variant="outline"
            className="w-full"
            onClick={handleIgnore}
            disabled={ignoring}
            aria-label={isIgnored ? 'Restaurer la transaction' : 'Ignorer la transaction'}
          >
            {ignoring ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <EyeOff className="size-4" />
            )}
            {isIgnored ? 'Restaurer' : 'Ignorer'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
