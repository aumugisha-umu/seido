'use client'

import Link from 'next/link'
import { CircleDashed, TrendingUp, AlertCircle } from 'lucide-react'
import { Card } from '@/components/ui/card'

// ─── Types ──────────────────────────────────────────────────────────────────

interface ReconciliationWidgetProps {
  count: number
}

interface CashFlowWidgetProps {
  revenue: number
  expenses: number
}

interface OverdueRentItem {
  lot_name: string
  tenant_name: string
  amount: number
  days_overdue: number
}

interface OverdueRentWidgetProps {
  overdueCount: number
  overdueAmount: number
  topOverdue: OverdueRentItem[]
}

export interface BankWidgetsSectionProps {
  revenue: number
  expenses: number
  collectionRate: number
  toReconcileCount: number
  overdueRentCalls: Array<{
    id: string
    lot_name: string
    tenant_name: string
    amount: number
    days_overdue: number
  }>
  hasBankConnection: boolean
}

// ─── Formatters ─────────────────────────────────────────────────────────────

const currencyFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

const FRENCH_MONTHS = [
  'janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre',
] as const

function getCurrentMonthName(): string {
  return FRENCH_MONTHS[new Date().getMonth()]
}

// ─── ReconciliationWidget ───────────────────────────────────────────────────

function ReconciliationWidget({ count }: ReconciliationWidgetProps) {
  const hasItems = count > 0
  const label = `${count} transaction${count > 1 ? 's' : ''} a rapprocher`

  return (
    <Link href="/gestionnaire/banque?tab=transactions" className="block">
      <Card
        className={`p-4 flex items-center gap-3 transition-colors hover:border-primary/20 ${
          hasItems
            ? 'border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20'
            : 'border-border bg-card'
        }`}
      >
        <div
          className={`flex-shrink-0 rounded-lg p-2 ${
            hasItems
              ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400'
              : 'bg-muted text-muted-foreground'
          }`}
        >
          <CircleDashed className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">
            {label}
          </p>
          <p className="text-xs text-muted-foreground">
            Cliquez pour voir les transactions
          </p>
        </div>
      </Card>
    </Link>
  )
}

// ─── CashFlowWidget ─────────────────────────────────────────────────────────

function CashFlowWidget({ revenue, expenses }: CashFlowWidgetProps) {
  const net = revenue + expenses // expenses are already negative
  const isPositive = net >= 0
  const monthName = getCurrentMonthName()

  return (
    <Card className="p-4 border-border bg-card">
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-shrink-0 rounded-lg p-2 bg-muted text-muted-foreground">
          <TrendingUp className="h-5 w-5" />
        </div>
        <p className="text-sm font-semibold text-foreground">
          Cash flow — {monthName}
        </p>
      </div>
      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Entrees</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-medium">
            +{currencyFormatter.format(revenue)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Sorties</span>
          <span className="text-rose-600 dark:text-rose-400 font-medium">
            {currencyFormatter.format(expenses)}
          </span>
        </div>
        <div className="flex justify-between border-t border-border pt-1 mt-1">
          <span className="text-muted-foreground font-medium">Net</span>
          <span
            className={`font-bold ${
              isPositive
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {currencyFormatter.format(net)}
          </span>
        </div>
      </div>
    </Card>
  )
}

// ─── OverdueRentWidget ──────────────────────────────────────────────────────

function OverdueRentWidget({
  overdueCount,
  overdueAmount,
  topOverdue,
}: OverdueRentWidgetProps) {
  const hasOverdue = overdueCount > 0
  const label = `${overdueCount} loyer${overdueCount > 1 ? 's' : ''} en retard`
  const subtitle = `${currencyFormatter.format(overdueAmount)} impaye${overdueCount > 1 ? 's' : ''}`

  return (
    <Link href="/gestionnaire/banque?tab=loyers" className="block">
      <Card
        className={`p-4 transition-colors hover:border-primary/20 ${
          hasOverdue
            ? 'border-rose-500/30 bg-rose-50/50 dark:bg-rose-950/20'
            : 'border-border bg-card'
        }`}
      >
        <div className="flex items-center gap-3 mb-2">
          <div
            className={`flex-shrink-0 rounded-lg p-2 ${
              hasOverdue
                ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            <AlertCircle className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">
              {label}
            </p>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </div>

        {topOverdue.length > 0 && (
          <ul className="mt-2 space-y-1">
            {topOverdue.slice(0, 3).map((item, index) => (
              <li
                key={index}
                className="text-xs text-muted-foreground truncate"
              >
                {item.lot_name} — {item.tenant_name} — {currencyFormatter.format(item.amount)}{' '}
                <span className="text-rose-500 dark:text-rose-400 font-medium">
                  (J+{item.days_overdue})
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </Link>
  )
}

// ─── BankWidgetsSection (exported wrapper) ──────────────────────────────────

export function BankWidgetsSection({
  revenue,
  expenses,
  toReconcileCount,
  overdueRentCalls,
  hasBankConnection,
  // collectionRate reserved for future KPI display
}: BankWidgetsSectionProps) {
  // If no bank connection, show a subtle connect message
  if (!hasBankConnection) {
    return (
      <div className="mb-4">
        <Link
          href="/gestionnaire/banque"
          className="block text-center text-sm text-muted-foreground py-3 px-4 border border-dashed border-border rounded-lg hover:border-primary/30 transition-colors"
        >
          Connectez un compte bancaire pour suivre vos finances
        </Link>
      </div>
    )
  }

  const overdueCount = overdueRentCalls.length
  const overdueAmount = overdueRentCalls.reduce((sum, r) => sum + r.amount, 0)
  const topOverdue = overdueRentCalls.slice(0, 3).map((r) => ({
    lot_name: r.lot_name,
    tenant_name: r.tenant_name,
    amount: r.amount,
    days_overdue: r.days_overdue,
  }))

  return (
    <div className="mb-4">
      <h3 className="text-sm font-medium text-muted-foreground mb-2">
        Banque
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ReconciliationWidget count={toReconcileCount} />
        <CashFlowWidget revenue={revenue} expenses={expenses} />
        <OverdueRentWidget
          overdueCount={overdueCount}
          overdueAmount={overdueAmount}
          topOverdue={topOverdue}
        />
      </div>
    </div>
  )
}
