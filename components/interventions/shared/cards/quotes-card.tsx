'use client'

/**
 * QuotesCard - Card de gestion des devis
 *
 * @example
 * <QuotesCard
 *   quotes={quotes}
 *   userRole="manager"
 *   onAddQuote={handleAdd}
 *   onApproveQuote={handleApprove}
 * />
 */

import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  FileText,
  Plus,
  Eye,
  Check,
  X,
  Euro,
  Clock,
  CheckCircle2,
  XCircle,
  Send
} from 'lucide-react'
import { QuotesCardProps, Quote } from '../types'
import { formatAmount, formatDateShort } from '../utils/helpers'
import { permissions } from '../utils'

/**
 * Élément de devis individuel
 */
interface QuoteItemProps {
  quote: Quote
  userRole: QuotesCardProps['userRole']
  onView?: () => void
  onApprove?: () => void
  onReject?: () => void
}

const QuoteItem = ({
  quote,
  userRole,
  onView,
  onApprove,
  onReject
}: QuoteItemProps) => {
  const canManage = permissions.canManageQuotes(userRole)

  const getStatusConfig = () => {
    switch (quote.status) {
      case 'approved':
        return {
          icon: CheckCircle2,
          label: 'Validé',
          bg: 'bg-green-50',
          text: 'text-green-700',
          border: 'border-green-200'
        }
      case 'rejected':
        return {
          icon: XCircle,
          label: 'Refusé',
          bg: 'bg-red-50',
          text: 'text-red-700',
          border: 'border-red-200'
        }
      case 'sent':
        return {
          icon: Send,
          label: 'Envoyé',
          bg: 'bg-blue-50',
          text: 'text-blue-700',
          border: 'border-blue-200'
        }
      default:
        return {
          icon: Clock,
          label: 'En attente',
          bg: 'bg-amber-50',
          text: 'text-amber-700',
          border: 'border-amber-200'
        }
    }
  }

  const statusConfig = getStatusConfig()
  const StatusIcon = statusConfig.icon

  return (
    <div
      className={cn(
        'p-3 rounded-lg border transition-colors',
        quote.status === 'approved'
          ? 'bg-green-50 border-green-200'
          : 'bg-white border-slate-200 hover:border-slate-300'
      )}
    >
      {/* En-tête: Prestataire et montant */}
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-sm font-medium">
            {quote.provider_name || 'Prestataire'}
          </p>
          {quote.created_at && (
            <p className="text-xs text-muted-foreground">
              {formatDateShort(quote.created_at)}
            </p>
          )}
        </div>

        <div className="text-right">
          <p className="text-lg font-semibold">{formatAmount(quote.amount)}</p>
          <Badge
            variant="outline"
            className={cn(
              'text-[10px]',
              statusConfig.bg,
              statusConfig.text,
              statusConfig.border
            )}
          >
            <StatusIcon className="h-3 w-3 mr-1" />
            {statusConfig.label}
          </Badge>
        </div>
      </div>

      {/* Description si présente */}
      {quote.description && (
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
          {quote.description}
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2 border-t border-dashed">
        {onView && (
          <Button variant="ghost" size="sm" onClick={onView}>
            <Eye className="h-3.5 w-3.5 mr-1" />
            Voir
          </Button>
        )}

        {canManage && quote.status === 'pending' && (
          <>
            {onApprove && (
              <Button
                variant="outline"
                size="sm"
                onClick={onApprove}
                className="text-green-600 border-green-200 hover:bg-green-50"
              >
                <Check className="h-3.5 w-3.5 mr-1" />
                Valider
              </Button>
            )}
            {onReject && (
              <Button
                variant="outline"
                size="sm"
                onClick={onReject}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Refuser
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

/**
 * Card de gestion des devis
 */
export const QuotesCard = ({
  quotes = [],
  userRole,
  onAddQuote,
  onViewQuote,
  onApproveQuote,
  onRejectQuote,
  isLoading = false,
  className
}: QuotesCardProps) => {
  const canSubmit = permissions.canSubmitQuote(userRole)
  const canView = permissions.canViewQuotes(userRole)

  // Sépare les devis par statut
  const pendingQuotes = quotes.filter(q => q.status === 'pending')
  const approvedQuotes = quotes.filter(q => q.status === 'approved')
  const otherQuotes = quotes.filter(q => !['pending', 'approved'].includes(q.status))

  if (!canView) {
    return null
  }

  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Euro className="h-4 w-4 text-muted-foreground" />
            Devis
            {quotes.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {quotes.length}
              </Badge>
            )}
          </CardTitle>

          {canSubmit && onAddQuote && (
            <Button
              variant="outline"
              size="sm"
              onClick={onAddQuote}
              disabled={isLoading}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Nouveau devis
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Message si aucun devis */}
        {quotes.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <FileText className="h-10 w-10 mb-2 text-slate-300" />
            <p className="text-sm">Aucun devis pour le moment</p>
            {canSubmit && onAddQuote && (
              <Button
                variant="link"
                size="sm"
                onClick={onAddQuote}
                className="mt-2"
              >
                Créer un devis
              </Button>
            )}
          </div>
        )}

        {/* Devis validés */}
        {approvedQuotes.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Devis validé
            </p>
            {approvedQuotes.map((quote) => (
              <QuoteItem
                key={quote.id}
                quote={quote}
                userRole={userRole}
                onView={onViewQuote ? () => onViewQuote(quote.id) : undefined}
              />
            ))}
          </div>
        )}

        {/* Devis en attente */}
        {pendingQuotes.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              En attente ({pendingQuotes.length})
            </p>
            {pendingQuotes.map((quote) => (
              <QuoteItem
                key={quote.id}
                quote={quote}
                userRole={userRole}
                onView={onViewQuote ? () => onViewQuote(quote.id) : undefined}
                onApprove={onApproveQuote ? () => onApproveQuote(quote.id) : undefined}
                onReject={onRejectQuote ? () => onRejectQuote(quote.id) : undefined}
              />
            ))}
          </div>
        )}

        {/* Autres devis (refusés, etc.) */}
        {otherQuotes.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Autres
            </p>
            {otherQuotes.map((quote) => (
              <QuoteItem
                key={quote.id}
                quote={quote}
                userRole={userRole}
                onView={onViewQuote ? () => onViewQuote(quote.id) : undefined}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
