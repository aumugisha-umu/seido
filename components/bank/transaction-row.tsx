'use client'

import { Badge } from '@/components/ui/badge'
import { CircleDashed, CheckCircle, EyeOff } from 'lucide-react'
import type { BankTransactionRow } from '@/lib/types/bank.types'

// ---------------------------------------------------------------------------
// Amount formatting
// ---------------------------------------------------------------------------

interface FormattedAmount {
  text: string
  className: string
}

const amountFormatter = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatAmount(amount: number, currency: string = 'EUR'): FormattedAmount {
  const formatted = amountFormatter.format(Math.abs(amount))

  if (amount >= 0) {
    return { text: `+${formatted} ${currency}`, className: 'text-emerald-600 tabular-nums' }
  }
  return { text: `\u2212${formatted} ${currency}`, className: 'text-rose-600 tabular-nums' }
}

import { formatDateFR } from '@/lib/utils/date-formatting'

// ---------------------------------------------------------------------------
// Status badge config
// ---------------------------------------------------------------------------

const STATUS_CONFIG = {
  to_reconcile: {
    label: 'A rapprocher',
    icon: CircleDashed,
    className: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  reconciled: {
    label: 'Rapproche',
    icon: CheckCircle,
    className: 'bg-green-100 text-green-800 border-green-200',
  },
  ignored: {
    label: 'Ignore',
    icon: EyeOff,
    className: 'bg-gray-100 text-gray-600 border-gray-200',
  },
} as const

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface TransactionRowProps {
  transaction: BankTransactionRow
  onReconcile?: () => void
  connectionName?: string
}

/**
 * Desktop table row for a bank transaction.
 * Rendered inside a <TableBody> by the parent.
 */
export function TransactionTableRow({
  transaction,
  onReconcile,
  connectionName,
}: TransactionRowProps) {
  const { text: amountText, className: amountClass } = formatAmount(
    transaction.amount,
    transaction.currency
  )
  const statusCfg = STATUS_CONFIG[transaction.status]
  const StatusIcon = statusCfg.icon
  const counterparty = transaction.payer_name || transaction.payee_name

  return (
    <tr
      className="border-b transition-colors hover:bg-muted/50 cursor-pointer"
      onClick={onReconcile}
      role="button"
      tabIndex={0}
      aria-label={`Transaction ${transaction.description_display || transaction.description_original}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onReconcile?.()
        }
      }}
    >
      <td className="p-2 align-middle whitespace-nowrap text-sm text-muted-foreground">
        {formatDateFR(transaction.transaction_date)}
      </td>
      <td className="p-2 align-middle max-w-xs">
        <div className="truncate text-sm font-medium text-foreground">
          {transaction.description_display || transaction.description_original}
        </div>
        {counterparty && (
          <div className="truncate text-xs text-muted-foreground mt-0.5">
            {counterparty}
          </div>
        )}
      </td>
      <td className="p-2 align-middle whitespace-nowrap text-right">
        <span className={`text-sm font-medium ${amountClass}`}>{amountText}</span>
      </td>
      <td className="p-2 align-middle whitespace-nowrap text-sm text-muted-foreground">
        {connectionName || '\u2014'}
      </td>
      <td className="p-2 align-middle whitespace-nowrap">
        <Badge variant="outline" className={statusCfg.className}>
          <StatusIcon className="size-3" />
          {statusCfg.label}
        </Badge>
      </td>
    </tr>
  )
}

/**
 * Mobile card view for a bank transaction.
 */
export function TransactionCard({
  transaction,
  onReconcile,
  connectionName,
}: TransactionRowProps) {
  const { text: amountText, className: amountClass } = formatAmount(
    transaction.amount,
    transaction.currency
  )
  const statusCfg = STATUS_CONFIG[transaction.status]
  const StatusIcon = statusCfg.icon
  const counterparty = transaction.payer_name || transaction.payee_name

  return (
    <div
      className="rounded-lg border border-border bg-card p-4 cursor-pointer hover:border-primary/20 transition-colors"
      onClick={onReconcile}
      role="button"
      tabIndex={0}
      aria-label={`Transaction ${transaction.description_display || transaction.description_original}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onReconcile?.()
        }
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">
            {transaction.description_display || transaction.description_original}
          </p>
          {counterparty && (
            <p className="truncate text-xs text-muted-foreground mt-0.5">
              {counterparty}
            </p>
          )}
        </div>
        <span className={`text-sm font-medium shrink-0 ${amountClass}`}>{amountText}</span>
      </div>
      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{formatDateFR(transaction.transaction_date)}</span>
          {connectionName && (
            <>
              <span className="text-border">&middot;</span>
              <span>{connectionName}</span>
            </>
          )}
        </div>
        <Badge variant="outline" className={statusCfg.className}>
          <StatusIcon className="size-3" />
          {statusCfg.label}
        </Badge>
      </div>
    </div>
  )
}
