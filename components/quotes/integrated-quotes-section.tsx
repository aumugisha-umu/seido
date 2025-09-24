"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { QuotesList } from "./quotes-list"
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

interface IntegratedQuotesSectionProps {
  quotes: Quote[]
  userContext?: 'gestionnaire' | 'prestataire' | 'locataire'
  onApprove?: (quoteId: string) => void
  onReject?: (quoteId: string) => void
  onCancel?: (quoteId: string) => void
  onDownloadAttachment?: (attachment: any) => void
  onDataChange?: () => void
  showActions?: boolean
  compact?: boolean
  title?: string
  titleIcon?: React.ComponentType<any>
  emptyStateConfig?: {
    title?: string
    description?: string
    icon?: React.ComponentType<any>
  }
  showAsCard?: boolean
  className?: string
}

export function IntegratedQuotesSection({
  quotes,
  userContext = 'gestionnaire',
  onApprove,
  onReject,
  onCancel,
  onDownloadAttachment,
  onDataChange,
  showActions = true,
  compact = false,
  title,
  titleIcon: TitleIcon = Receipt,
  emptyStateConfig,
  showAsCard = true,
  className = ""
}: IntegratedQuotesSectionProps) {
  
  const getTitle = () => {
    if (title) return title
    
    if (userContext === 'prestataire') {
      return `Devis `
    }
    return `Devis reçus (${quotes.length})`
  }

  // Adapter le message d'état vide pour les prestataires
  const getEmptyStateConfig = () => {
    return emptyStateConfig
  }

  const content = (
    <QuotesList
      quotes={quotes}
      userContext={userContext}
      onApprove={onApprove}
      onReject={onReject}
      onCancel={onCancel}
      onDownloadAttachment={onDownloadAttachment}
      onDataChange={onDataChange}
      showActions={showActions}
      compact={compact}
      emptyStateConfig={getEmptyStateConfig()}
    />
  )

  if (!showAsCard) {
    return (
      <div className={className}>
        <div className="mb-4">
          <div className="flex items-center space-x-2 mb-2">
            <TitleIcon className="h-5 w-5 text-green-600" />
            <h2 className="text-xl font-semibold text-slate-900">{getTitle()}</h2>
          </div>
        </div>
        {content}
      </div>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center space-x-2">
          <TitleIcon className="h-5 w-5 text-green-600" />
          <span>{getTitle()}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {content}
      </CardContent>
    </Card>
  )
}
