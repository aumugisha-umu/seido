"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { QuotesList } from "./quotes-list"
import { Receipt, Plus } from "lucide-react"

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
  onSubmitQuote?: () => void
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
  onSubmitQuote,
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
      return `Devis (${quotes.length})`
    }
    return `Devis reçus (${quotes.length})`
  }

  // Logique pour déterminer si le prestataire peut soumettre un devis
  const canSubmitQuote = () => {
    if (userContext !== 'prestataire' || !onSubmitQuote) return false
    
    // Vérifier s'il y a un devis actif du prestataire (pending ou approved)
    const activeUserQuote = quotes.find(quote =>
      quote.isCurrentUserQuote &&
      (quote.status === 'pending' ||
       quote.status === 'approved')
    )
    
    // Le prestataire peut soumettre un devis seulement s'il n'y en a pas d'actif
    return !activeUserQuote
  }

  // Adapter le message d'état vide pour les prestataires
  const getEmptyStateConfig = () => {
    if (userContext === 'prestataire' && !canSubmitQuote()) {
      // Il y a déjà un devis actif mais il n'y a plus aucun devis affiché (cas rare)
      const activeUserQuote = quotes.find(quote =>
        quote.isCurrentUserQuote &&
        (quote.status === 'pending' ||
         quote.status === 'approved')
      )

      if (activeUserQuote) {
        const statusText = activeUserQuote.status === 'pending' ? 'en attente' : 'accepté'
        return {
          title: "Devis en cours",
          description: `Vous avez déjà un devis ${statusText}. Vous ne pouvez soumettre qu'un seul devis à la fois.`,
          icon: emptyStateConfig?.icon
        }
      }
    }
    
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
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <TitleIcon className="h-5 w-5 text-green-600" />
              <h2 className="text-xl font-semibold text-slate-900">{getTitle()}</h2>
            </div>
            {canSubmitQuote() ? (
              <Button 
                onClick={onSubmitQuote}
                className="bg-sky-600 hover:bg-sky-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Soumettre un devis
              </Button>
            ) : userContext === 'prestataire' && onSubmitQuote && (
              <div className="text-xs text-slate-500 text-right max-w-xs">
                Vous ne pouvez soumettre qu'un devis à la fois.
                <br />
                Annulez le devis actuel si vous souhaitez en soumettre un nouveau.
              </div>
            )}
          </div>
        </div>
        {content}
      </div>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <TitleIcon className="h-5 w-5 text-green-600" />
            <span>{getTitle()}</span>
          </div>
          {canSubmitQuote() ? (
            <Button 
              onClick={onSubmitQuote}
              size="sm"
              className="bg-sky-600 hover:bg-sky-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Soumettre un devis
            </Button>
          ) : userContext === 'prestataire' && onSubmitQuote && (
            <div className="text-xs text-slate-500 text-right max-w-xs">
              Vous ne pouvez soumettre qu'un devis à la fois.
              <br />
              Annulez le devis actuel si vous souhaitez en soumettre un nouveau.
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {content}
      </CardContent>
    </Card>
  )
}
