"use client"

import { QuoteCard } from "./quote-card"
import { Receipt } from "lucide-react"

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
  attachments: Array<any>
  isCurrentUserQuote?: boolean
}

interface QuotesListProps {
  quotes: Quote[]
  userContext?: 'gestionnaire' | 'prestataire' | 'locataire'
  onApprove?: (quoteId: string) => void
  onReject?: (quoteId: string) => void
  onCancel?: (quoteId: string) => void
  onDownloadAttachment?: (attachment: any) => void
  onDataChange?: () => void
  showActions?: boolean
  compact?: boolean
  emptyStateConfig?: {
    title?: string
    description?: string
    icon?: React.ComponentType<any>
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
  
  const defaultEmptyConfig = {
    title: userContext === 'prestataire' 
      ? "Aucun devis soumis" 
      : "Aucun devis reçu",
    description: userContext === 'prestataire'
      ? "Soumettez un devis pour cette intervention pour continuer le processus"
      : "Les prestataires n'ont pas encore envoyé de devis pour cette intervention.",
    icon: Receipt
  }

  const config = { ...defaultEmptyConfig, ...emptyStateConfig }
  const IconComponent = config.icon || Receipt

  if (quotes.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <IconComponent className={`h-12 w-12 mx-auto mb-3 ${
          userContext === 'prestataire' ? 'text-slate-400' : 'text-gray-300'
        }`} />
        <p className="font-medium text-gray-900 mb-2">{config.title}</p>
        <p className="text-sm text-gray-500">{config.description}</p>
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
