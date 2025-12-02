'use client'

/**
 * SummaryCard - Card de synthèse pour l'intervention
 *
 * @example
 * <SummaryCard
 *   scheduledDate="2025-01-20"
 *   quotesCount={2}
 *   selectedQuoteAmount={150}
 * />
 */

import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Calendar,
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle
} from 'lucide-react'
import { formatDate, formatAmount } from '../utils/helpers'

export interface SummaryCardProps {
  /** Titre de la card (par défaut: "Synthèse") */
  title?: string
  /** Date planifiée de l'intervention */
  scheduledDate?: string | null
  /** Nombre de devis reçus */
  quotesCount?: number
  /** Montant du devis sélectionné */
  selectedQuoteAmount?: number | null
  /** Statut du planning */
  planningStatus?: 'pending' | 'scheduled' | 'completed'
  /** Statut des devis */
  quotesStatus?: 'pending' | 'received' | 'approved'
  /** Classes CSS additionnelles */
  className?: string
}

/**
 * Card de synthèse affichant les informations clés
 */
export const SummaryCard = ({
  title = 'Synthèse',
  scheduledDate,
  quotesCount = 0,
  selectedQuoteAmount,
  planningStatus = 'pending',
  quotesStatus = 'pending',
  className
}: SummaryCardProps) => {
  const getPlanningStatusConfig = () => {
    switch (planningStatus) {
      case 'completed':
        return {
          icon: CheckCircle2,
          label: 'Terminée',
          color: 'text-green-600',
          bgColor: 'bg-green-50'
        }
      case 'scheduled':
        return {
          icon: Calendar,
          label: 'Planifiée',
          color: 'text-purple-600',
          bgColor: 'bg-purple-50'
        }
      default:
        return {
          icon: Clock,
          label: 'En attente',
          color: 'text-amber-600',
          bgColor: 'bg-amber-50'
        }
    }
  }

  const getQuotesStatusConfig = () => {
    switch (quotesStatus) {
      case 'approved':
        return {
          icon: CheckCircle2,
          label: 'Devis validé',
          color: 'text-green-600',
          bgColor: 'bg-green-50'
        }
      case 'received':
        return {
          icon: FileText,
          label: `${quotesCount} devis reçu${quotesCount > 1 ? 's' : ''}`,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50'
        }
      default:
        return {
          icon: AlertCircle,
          label: 'En attente de devis',
          color: 'text-amber-600',
          bgColor: 'bg-amber-50'
        }
    }
  }

  const planningConfig = getPlanningStatusConfig()
  const quotesConfig = getQuotesStatusConfig()
  const PlanningIcon = planningConfig.icon
  const QuotesIcon = quotesConfig.icon

  return (
    <Card className={cn('h-full', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Section Planning */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'flex items-center justify-center h-9 w-9 rounded-lg',
                planningConfig.bgColor
              )}
            >
              <PlanningIcon className={cn('h-4 w-4', planningConfig.color)} aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-medium">Planning</p>
              <p className="text-xs text-muted-foreground">
                {scheduledDate ? formatDate(scheduledDate) : planningConfig.label}
              </p>
            </div>
          </div>

          <Badge
            variant="outline"
            className={cn(
              'text-xs',
              planningConfig.bgColor,
              planningConfig.color,
              'border-transparent'
            )}
            aria-label={`Statut planning: ${planningConfig.label}`}
          >
            {planningConfig.label}
          </Badge>
        </div>

        {/* Section Devis */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'flex items-center justify-center h-9 w-9 rounded-lg',
                quotesConfig.bgColor
              )}
            >
              <QuotesIcon className={cn('h-4 w-4', quotesConfig.color)} aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-medium">Devis</p>
              <p className="text-xs text-muted-foreground">
                {selectedQuoteAmount
                  ? formatAmount(selectedQuoteAmount)
                  : quotesConfig.label}
              </p>
            </div>
          </div>

          {selectedQuoteAmount ? (
            <Badge
              variant="outline"
              className="text-xs bg-green-50 text-green-600 border-transparent"
              aria-label="Devis validé"
            >
              Validé
            </Badge>
          ) : quotesCount > 0 ? (
            <Badge
              variant="outline"
              className="text-xs bg-blue-50 text-blue-600 border-transparent"
              aria-label={`${quotesCount} devis reçu${quotesCount > 1 ? 's' : ''}`}
            >
              {quotesCount} reçu{quotesCount > 1 ? 's' : ''}
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="text-xs bg-amber-50 text-amber-600 border-transparent"
              aria-label="Devis en attente"
            >
              En attente
            </Badge>
          )}
        </div>

        {/* Montant total si devis validé */}
        {selectedQuoteAmount && (
          <div className="pt-2 border-t border-dashed">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Montant validé</span>
              <span className="text-lg font-semibold text-green-600">
                {formatAmount(selectedQuoteAmount)}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
