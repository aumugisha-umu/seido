'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Home,
  Wrench,
  FileText,
  Receipt,
  Shield,
} from 'lucide-react'
import type { MatchSuggestion, TransactionEntityType } from '@/lib/types/bank.types'
import { formatAmount } from '@/components/bank/transaction-row'

// ---------------------------------------------------------------------------
// Entity type config
// ---------------------------------------------------------------------------

interface EntityTypeConfig {
  icon: typeof Home
  label: string
}

const ENTITY_TYPE_CONFIG: Record<TransactionEntityType, EntityTypeConfig> = {
  rent_call: { icon: Home, label: 'Appel de loyer' },
  intervention: { icon: Wrench, label: 'Intervention' },
  supplier_contract: { icon: FileText, label: 'Contrat fournisseur' },
  property_expense: { icon: Receipt, label: 'Charge' },
  security_deposit: { icon: Shield, label: 'Depot de garantie' },
}

// ---------------------------------------------------------------------------
// Confidence border color
// ---------------------------------------------------------------------------

function getConfidenceBorderClass(level: MatchSuggestion['confidence_level']): string {
  switch (level) {
    case 'high':
      return 'border-l-emerald-500'
    case 'medium':
      return 'border-l-amber-500'
    case 'low':
      return 'border-l-gray-400'
  }
}

// ---------------------------------------------------------------------------
// Amount match indicator
// ---------------------------------------------------------------------------

function getAmountMatchIndicator(
  suggestionAmount: number,
  transactionAmount?: number
): string {
  if (transactionAmount === undefined) return ''
  const diff = Math.abs(Math.abs(suggestionAmount) - Math.abs(transactionAmount))
  return diff < 0.01 ? '=' : '\u2248'
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface SuggestionCardProps {
  suggestion: MatchSuggestion
  transactionAmount?: number
  onAccept: (suggestion: MatchSuggestion) => void
  isAccepting?: boolean
}

export function SuggestionCard({
  suggestion,
  transactionAmount,
  onAccept,
  isAccepting = false,
}: SuggestionCardProps) {
  const config = ENTITY_TYPE_CONFIG[suggestion.entity_type]
  const Icon = config.icon
  const { text: amountText, className: amountClass } = formatAmount(suggestion.amount)
  const matchIndicator = getAmountMatchIndicator(suggestion.amount, transactionAmount)

  return (
    <div
      className={`rounded-lg border border-border border-l-4 bg-card p-3 ${getConfidenceBorderClass(suggestion.confidence_level)}`}
    >
      {/* Header: icon + type + amount */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
            <Icon className="size-4 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{config.label}</p>
            <p className="text-sm font-medium text-foreground truncate">
              {suggestion.label}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {matchIndicator && (
            <span className="text-xs text-muted-foreground font-mono">
              {matchIndicator}
            </span>
          )}
          <span className={`text-sm font-medium ${amountClass}`}>{amountText}</span>
        </div>
      </div>

      {/* Match details pills */}
      {suggestion.match_details.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {suggestion.match_details.map((detail) => (
            <Badge
              key={detail}
              variant="secondary"
              className="text-xs font-normal"
            >
              {detail}
            </Badge>
          ))}
        </div>
      )}

      {/* Accept button */}
      <div className="mt-3 flex justify-end">
        <Button
          size="sm"
          onClick={() => onAccept(suggestion)}
          disabled={isAccepting}
          aria-label={`Valider le rapprochement avec ${suggestion.label}`}
        >
          Valider
        </Button>
      </div>
    </div>
  )
}
