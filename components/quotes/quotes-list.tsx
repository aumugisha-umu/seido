"use client"

import { QuoteCard } from "./quote-card"
import { Receipt, AlertCircle, Clock } from "lucide-react"
import { getQuoteEmptyStateMessage } from "@/lib/quote-state-utils"

interface Quote {
  id: string
  providerId: string
  providerName: string
  providerSpeciality?: string
  totalAmount: number
  laborCost: number
  materialsCost: number
  description: string
  workDetails?: string
  estimatedDurationHours?: number
  estimatedStartDate?: string
  status: string
  submittedAt: string
  reviewedAt?: string
  reviewComments?: string
  rejectionReason?: string
  attachments: Array<{
    id: string
    name: string
    url: string
    type: string
  }>
  isCurrentUserQuote?: boolean
}

interface QuotesListProps {
  quotes: Quote[]
  userContext?: 'gestionnaire' | 'prestataire' | 'locataire'
  onApprove?: (_quoteId: string) => void
  onReject?: (_quoteId: string) => void
  onCancel?: (_quoteId: string) => void
  onDownloadAttachment?: (attachment: {
    id: string
    name: string
    url: string
    type: string
  }) => void
  onDataChange?: () => void
  showActions?: boolean
  compact?: boolean
  emptyStateConfig?: {
    title?: string
    description?: string
    icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>
  }
  className?: string
}

export function QuotesList({
  quotes,
  userContext = 'gestionnaire',
  onApprove,
  onReject,
  onCancel,
  onDownloadAttachment,
  onDataChange,
  showActions = true,
  compact = false,
  emptyStateConfig,
  className = ""
}: QuotesListProps) {
  
  // Générer la configuration contextuelle pour l'état vide
  const getContextualEmptyConfig = () => {
    if (emptyStateConfig) return emptyStateConfig

    if (userContext === 'prestataire') {
      return {
        title: "Aucune estimation soumise",
        description: "Soumettez une estimation pour cette intervention pour continuer le processus",
        icon: Receipt
      }
    }

    // Pour les gestionnaires, utiliser la logique contextuelle
    const contextualMessage = getQuoteEmptyStateMessage(quotes)
    const iconMap = {
      'info': Clock,
      'warning': AlertCircle,
      'default': Receipt
    }

    return {
      title: contextualMessage.title,
      description: contextualMessage.description,
      icon: iconMap[contextualMessage.variant] || Receipt
    }
  }

  const config = getContextualEmptyConfig()
  const IconComponent = config.icon

  if (quotes.length === 0) {
    const contextualMessage = getQuoteEmptyStateMessage(quotes)

    // Couleur de l'icône selon le contexte
    const iconColorClass = contextualMessage.variant === 'warning' ? 'text-yellow-500' :
                           contextualMessage.variant === 'info' ? 'text-blue-400' :
                           userContext === 'prestataire' ? 'text-slate-400' : 'text-gray-300'

    return (
      <div className={`text-center py-8 ${className}`}>
        <IconComponent className={`h-12 w-12 mx-auto mb-3 ${iconColorClass}`} />
        <p className="font-medium text-gray-900 mb-2">{config.title}</p>
        <p className="text-sm text-gray-500 max-w-md mx-auto">{config.description}</p>
        {contextualMessage.actionLabel && (
          <div className="mt-4">
            <button
              key="empty-state-action-button"
              className="text-sm text-blue-600 hover:text-blue-500 underline"
            >
              {contextualMessage.actionLabel}
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {quotes.map((quote) => (
        <QuoteCard
          key={quote.id}
          quote={quote}
          userContext={userContext}
          onApprove={onApprove}
          onReject={onReject}
          onCancel={onCancel}
          onDownloadAttachment={onDownloadAttachment}
          onDataChange={onDataChange}
          showActions={showActions}
          compact={compact}
        />
      ))}
    </div>
  )
}
