"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { QuotesList } from "./quotes-list"
import { QuoteRequestCard } from "./quote-request-card"
import { Button } from "@/components/ui/button"
import { Receipt, Send, FileText, ChevronDown, ChevronRight } from "lucide-react"
import { useState } from "react"
import { getQuoteEmptyStateMessage } from "@/lib/quote-state-utils"

// Type local pour les devis dans ce composant
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
  status: 'pending' | 'approved' | 'rejected'
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
}

// Importé depuis quote-state-utils.ts

interface QuoteRequest {
  id: string
  provider: {
    id: string
    name: string
    email: string
    avatar?: string
  }
  assigned_at: string
  individual_message?: string
  deadline?: string
  status: 'pending' | 'responded' | 'expired'
  has_quote?: boolean
  quote_status?: 'pending' | 'approved' | 'rejected'
}

interface IntegratedQuotesSectionProps {
  quotes: Quote[]
  quoteRequests?: QuoteRequest[]
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
  onResendRequest?: (_requestId: string) => void
  onCancelRequest?: (_requestId: string) => void
  onNewRequest?: (_requestId: string) => void
  onViewProvider?: (_providerId: string) => void
  showActions?: boolean
  compact?: boolean
  title?: string
  titleIcon?: React.ComponentType<React.SVGProps<SVGSVGElement>>
  emptyStateConfig?: {
    title?: string
    description?: string
    icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>
  }
  showAsCard?: boolean
  className?: string
}

export function IntegratedQuotesSection({
  quotes,
  quoteRequests = [],
  userContext = 'gestionnaire',
  onApprove,
  onReject,
  onCancel,
  onDownloadAttachment,
  onDataChange,
  onResendRequest,
  onCancelRequest,
  onNewRequest,
  onViewProvider,
  showActions = true,
  compact = false,
  title,
  titleIcon: TitleIcon = Receipt,
  emptyStateConfig,
  showAsCard = true,
  className = ""
}: IntegratedQuotesSectionProps) {
  const [isRequestsExpanded, setIsRequestsExpanded] = useState(true)
  const [isQuotesExpanded, setIsQuotesExpanded] = useState(true)
  
  const getTitle = () => {
    if (title) return title

    if (userContext === 'prestataire') {
      return `Devis`
    }

    // Retourner une chaîne vide pour ne pas afficher de titre global
    return ''
  }

  // Générer le message d'état vide contextuel
  const getEmptyStateConfig = () => {
    if (emptyStateConfig) return emptyStateConfig

    if (userContext === 'prestataire') {
      return {
        title: "Aucun devis soumis",
        description: "Soumettez un devis pour cette intervention pour continuer le processus",
        icon: Receipt
      }
    }

    // Pour les gestionnaires, utiliser la logique contextuelle
    const contextualMessage = getQuoteEmptyStateMessage(quotes)
    return {
      title: contextualMessage.title,
      description: contextualMessage.description,
      icon: Receipt
    }
  }

  const renderContent = () => {
    const hasRequests = quoteRequests.length > 0
    const hasQuotes = quotes.length > 0

    // Si pas de demandes ni de devis, afficher l'état vide
    if (!hasRequests && !hasQuotes) {
      return (
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
    }

    // Afficher les deux sections si on a des demandes et des devis
    if (hasRequests && hasQuotes) {
      return (
        <div className="space-y-6">
          {/* Section Demandes envoyées */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Send className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Demandes envoyées ({quoteRequests.length})
                </h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsRequestsExpanded(!isRequestsExpanded)}
                className="p-1 h-8 w-8"
              >
                {isRequestsExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </div>
            {isRequestsExpanded && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {quoteRequests.filter(request => request.id).map((request) => (
                  <QuoteRequestCard
                    key={request.id}
                    request={request}
                    onResendRequest={onResendRequest}
                    onCancelRequest={onCancelRequest}
                    onNewRequest={onNewRequest}
                    onViewProvider={onViewProvider}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Section Devis reçus */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-green-600" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Devis reçus ({quotes.length})
                </h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsQuotesExpanded(!isQuotesExpanded)}
                className="p-1 h-8 w-8"
              >
                {isQuotesExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </div>
            {isQuotesExpanded && (
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
              />
            )}
          </div>
        </div>
      )
    }

    // Afficher seulement les demandes
    if (hasRequests && !hasQuotes) {
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Send className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                Demandes envoyées ({quoteRequests.length})
              </h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsRequestsExpanded(!isRequestsExpanded)}
              className="p-1 h-8 w-8"
            >
              {isRequestsExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          </div>
          {isRequestsExpanded && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {quoteRequests.filter(request => request.id).map((request) => (
                <QuoteRequestCard
                  key={request.id}
                  request={request}
                  onResendRequest={onResendRequest}
                  onCancelRequest={onCancelRequest}
                  onNewRequest={onNewRequest}
                  onViewProvider={onViewProvider}
                />
              ))}
            </div>
          )}
        </div>
      )
    }

    // Afficher seulement les devis (comportement existant)
    return (
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
  }

  const content = renderContent()

  const currentTitle = getTitle()
  
  if (!showAsCard) {
    return (
      <div className={className}>
        {currentTitle && (
          <div className="mb-4">
            <div className="flex items-center space-x-2 mb-2">
              <TitleIcon className="h-5 w-5 text-green-600" />
              <h2 className="text-xl font-semibold text-slate-900">{currentTitle}</h2>
            </div>
          </div>
        )}
        {content}
      </div>
    )
  }

  return (
    <Card className={className}>
      {currentTitle && (
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center space-x-2">
            <TitleIcon className="h-5 w-5 text-green-600" />
            <span>{currentTitle}</span>
          </CardTitle>
        </CardHeader>
      )}
      <CardContent>
        {content}
      </CardContent>
    </Card>
  )
}
