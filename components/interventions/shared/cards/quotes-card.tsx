'use client'

/**
 * QuotesCard - Card de gestion des estimations/devis
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
  /** Afficher les boutons d'action */
  showActions?: boolean
  onApprove?: () => void
  onReject?: () => void
}

const QuoteItem = ({
  quote,
  userRole,
  showActions = true,
  onApprove,
  onReject
}: QuoteItemProps) => {
  const canManage = permissions.canManageQuotes(userRole)
  const canShowActions = showActions && canManage && (quote.status === 'pending' || quote.status === 'sent')

  const getStatusConfig = () => {
    switch (quote.status) {
      case 'approved':
        return {
          icon: CheckCircle2,
          label: 'Validé',
          bg: 'bg-green-50',
          text: 'text-green-700',
          border: 'border-green-200',
          leftBorder: 'border-l-green-500'
        }
      case 'rejected':
        return {
          icon: XCircle,
          label: 'Refusé',
          bg: 'bg-red-50',
          text: 'text-red-700',
          border: 'border-red-200',
          leftBorder: 'border-l-red-500'
        }
      case 'sent':
        return {
          icon: Send,
          label: 'Envoyé',
          bg: 'bg-blue-50',
          text: 'text-blue-700',
          border: 'border-blue-200',
          leftBorder: 'border-l-blue-500'
        }
      default:
        return {
          icon: Clock,
          label: 'En attente',
          bg: 'bg-amber-50',
          text: 'text-amber-700',
          border: 'border-amber-200',
          leftBorder: 'border-l-amber-500'
        }
    }
  }

  const statusConfig = getStatusConfig()
  const StatusIcon = statusConfig.icon

  return (
    <div
      className={cn(
        'p-4 rounded-lg border-l-4 border border-slate-200 bg-white transition-colors',
        statusConfig.leftBorder
      )}
    >
      {/* En-tête: Prestataire et montant */}
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium text-slate-900">
            {quote.provider_name || 'Prestataire'}
          </p>
          {quote.created_at && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {formatDateShort(quote.created_at)}
            </p>
          )}
        </div>

        <div className="text-right">
          <p className="text-lg font-semibold text-slate-900">{formatAmount(quote.amount)}</p>
          <Badge
            variant="outline"
            className={cn(
              'text-xs mt-1',
              statusConfig.bg,
              statusConfig.text,
              statusConfig.border
            )}
            aria-label={`Statut du devis: ${statusConfig.label}`}
          >
            <StatusIcon className="h-3 w-3 mr-1" aria-hidden="true" />
            {statusConfig.label}
          </Badge>
        </div>
      </div>

      {/* Description si présente */}
      {quote.description && (
        <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
          {quote.description}
        </p>
      )}

      {/* Actions - affiché seulement si showActions=true et statut pending/sent */}
      {canShowActions && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-dashed border-slate-200">
          <Button
            variant="outline"
            size="sm"
            onClick={onApprove}
            className="text-green-600 border-green-200 hover:bg-green-50"
            aria-label={`Valider le devis de ${quote.provider_name || 'prestataire'}`}
          >
            <Check className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
            Valider
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onReject}
            className="text-red-600 border-red-200 hover:bg-red-50"
            aria-label={`Refuser le devis de ${quote.provider_name || 'prestataire'}`}
          >
            <X className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
            Refuser
          </Button>
        </div>
      )}
    </div>
  )
}

/**
 * Card de gestion des devis
 *
 * @param showActions - Contrôle l'affichage des boutons Valider/Refuser.
 *                      Par défaut true, permet de masquer les actions pour un affichage lecture seule.
 */
export const QuotesCard = ({
  quotes = [],
  userRole,
  showActions = true,
  onAddQuote,
  onApproveQuote,
  onRejectQuote,
  isLoading = false,
  className
}: QuotesCardProps) => {
  const canSubmit = permissions.canSubmitQuote(userRole)
  const canView = permissions.canViewQuotes(userRole)

  // Sépare les devis par statut
  const pendingQuotes = quotes.filter(q => q.status === 'pending' || q.status === 'sent')
  const approvedQuotes = quotes.filter(q => q.status === 'approved')
  const otherQuotes = quotes.filter(q => !['pending', 'sent', 'approved'].includes(q.status))

  if (!canView) {
    return null
  }

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Euro className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            Estimation
            {quotes.length > 0 && (
              <Badge variant="secondary" className="text-xs" aria-label={`${quotes.length} devis`}>
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
              aria-label="Créer un nouveau devis"
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
              Nouveau devis
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6 flex-1 overflow-y-auto">
        {/* Message si aucun devis */}
        {quotes.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <FileText className="h-10 w-10 mb-2 text-slate-300" aria-hidden="true" />
            <p className="text-sm">Aucun devis pour le moment</p>
            {canSubmit && onAddQuote && (
              <Button
                variant="link"
                size="sm"
                onClick={onAddQuote}
                className="mt-2"
                aria-label="Créer un devis"
              >
                Créer un devis
              </Button>
            )}
          </div>
        )}

        {/* Devis validés */}
        {approvedQuotes.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-green-600 uppercase tracking-wider">
              Devis validé
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {approvedQuotes.map((quote) => (
                <QuoteItem
                  key={quote.id}
                  quote={quote}
                  userRole={userRole}
                  showActions={false}
                />
              ))}
            </div>
          </div>
        )}

        {/* Devis en attente */}
        {pendingQuotes.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              En attente ({pendingQuotes.length})
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {pendingQuotes.map((quote) => (
                <QuoteItem
                  key={quote.id}
                  quote={quote}
                  userRole={userRole}
                  showActions={showActions}
                  onApprove={onApproveQuote ? () => onApproveQuote(quote.id) : undefined}
                  onReject={onRejectQuote ? () => onRejectQuote(quote.id) : undefined}
                />
              ))}
            </div>
          </div>
        )}

        {/* Autres devis (refusés, etc.) */}
        {otherQuotes.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Autres
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {otherQuotes.map((quote) => (
                <QuoteItem
                  key={quote.id}
                  quote={quote}
                  userRole={userRole}
                  showActions={false}
                />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
