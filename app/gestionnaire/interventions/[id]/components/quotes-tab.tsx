'use client'

/**
 * Quotes Tab Component
 * Manages intervention quotes with two sections:
 * - Demandes envoyées (quotes without amount - waiting for provider submission)
 * - Devis reçus (quotes with amount - ready for approval/rejection)
 */

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Send, FileText, ChevronDown, User, Mail, Clock, Calendar } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { QuoteCard } from '@/components/quotes/quote-card'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { toast } from 'sonner'
import { createBrowserSupabaseClient } from '@/lib/services'
import type { Database } from '@/lib/database.types'

type Quote = Database['public']['Tables']['intervention_quotes']['Row'] & {
  provider?: Database['public']['Tables']['users']['Row']
}

interface QuotesTabProps {
  interventionId: string
  quotes: Quote[]
  canManage?: boolean
}

export function QuotesTab({
  interventionId,
  quotes,
  canManage = false
}: QuotesTabProps) {
  // Séparer les demandes (amount = 0) et les devis reçus (amount > 0)
  const pendingRequests = quotes.filter(q =>
    q.status === 'pending' && (!q.amount || q.amount === 0)
  )

  const receivedQuotes = quotes.filter(q =>
    (q.status === 'pending' || q.status === 'sent' || q.status === 'accepted') && q.amount && q.amount > 0
  )

  const [requestsExpanded, setRequestsExpanded] = useState(true)
  const [quotesExpanded, setQuotesExpanded] = useState(true)

  return (
    <div className="space-y-6">
      {/* Section Demandes envoyées */}
      <Collapsible open={requestsExpanded} onOpenChange={setRequestsExpanded}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Send className="w-5 h-5 text-blue-600" />
                  Demandes envoyées ({pendingRequests.length})
                </CardTitle>
                <ChevronDown
                  className={cn(
                    "w-5 h-5 text-muted-foreground transition-transform duration-200",
                    requestsExpanded && "rotate-180"
                  )}
                />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              {pendingRequests.length === 0 ? (
                <div className="text-center py-8">
                  <Send className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium text-muted-foreground mb-2">
                    Aucune demande en cours
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Les demandes de devis envoyées aux prestataires apparaîtront ici
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pendingRequests.map(quote => (
                    <RequestCard
                      key={quote.id}
                      quote={quote}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Section Devis reçus */}
      <Collapsible open={quotesExpanded} onOpenChange={setQuotesExpanded}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-green-600" />
                  Devis reçus ({receivedQuotes.length})
                </CardTitle>
                <ChevronDown
                  className={cn(
                    "w-5 h-5 text-muted-foreground transition-transform duration-200",
                    quotesExpanded && "rotate-180"
                  )}
                />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              {receivedQuotes.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium text-muted-foreground mb-2">
                    Aucun devis reçu
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Les devis soumis par les prestataires apparaîtront ici
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {receivedQuotes.map(quote => (
                    <QuoteCard
                      key={quote.id}
                      quote={{
                        id: quote.id,
                        providerId: quote.provider_id,
                        providerName: quote.provider?.name || 'Prestataire',
                        providerSpeciality: quote.provider?.provider_category,
                        totalAmount: quote.amount,
                        laborCost: (quote.line_items as any)?.labor || 0,
                        materialsCost: (quote.line_items as any)?.materials || 0,
                        description: quote.description || '',
                        estimatedDurationHours: (quote.line_items as any)?.duration,
                        status: quote.status,
                        submittedAt: quote.created_at,
                        attachments: []
                      }}
                      userContext="gestionnaire"
                      showActions={canManage}
                      onDataChange={() => window.location.reload()}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  )
}

/**
 * Request Card Component
 * Displays a pending quote request (waiting for provider submission)
 */
interface RequestCardProps {
  quote: Quote
}

function RequestCard({ quote }: RequestCardProps) {
  const formatDate = (date: string | null) => {
    if (!date) return 'Date inconnue'
    try {
      return format(new Date(date), 'dd MMM yyyy à HH:mm', { locale: fr })
    } catch {
      return 'Date invalide'
    }
  }

  return (
    <Card className="border-gray-200 hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header with provider name and status */}
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-900">
              {quote.provider?.name || 'Prestataire'}
            </h4>
            <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200 text-xs">
              ⏳ En attente
            </Badge>
          </div>

          {/* Provider info */}
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                <User className="h-4 w-4 text-gray-600" />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              {quote.provider?.email && (
                <div className="flex items-center space-x-1 text-xs text-gray-500 mb-1">
                  <Mail className="h-3 w-3" />
                  <span className="truncate">{quote.provider.email}</span>
                </div>
              )}

              {quote.provider?.provider_category && (
                <div className="text-xs text-gray-600 mb-1">
                  Spécialité: {quote.provider.provider_category}
                </div>
              )}

              {/* Request details */}
              <div className="flex items-center space-x-1 text-xs text-gray-500 mb-1">
                <Clock className="h-3 w-3" />
                <span>Envoyé le {formatDate(quote.created_at)}</span>
              </div>

              {quote.valid_until && (
                <div className="flex items-center space-x-1 text-xs text-gray-500">
                  <Calendar className="h-3 w-3" />
                  <span>Échéance: {formatDate(quote.valid_until)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Message if any */}
          {quote.description && (
            <div className="bg-white rounded border border-gray-200 p-2 text-xs text-gray-700">
              {quote.description}
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-2 pt-2 border-t border-gray-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => console.log('View provider profile:', quote.provider_id)}
              className="text-xs h-7"
            >
              Voir profil
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
