"use client"

import { useState, useEffect } from "react"
import { FileText, Euro, Clock, TrendingUp, Users, AlertTriangle, CheckCircle, Plus } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { QuotesComparison } from "@/components/intervention/quotes-comparison"
import { QuoteRequestModal } from "@/components/intervention/modals/quote-request-modal"
import { useInterventionQuoting } from "@/hooks/use-intervention-quoting"

interface Quote {
  id: string
  intervention_id: string
  provider_id: string
  labor_cost: number
  materials_cost: number
  total_amount: number
  description: string
  work_details?: string
  estimated_duration_hours?: number
  estimated_start_date?: string
  valid_until: string
  terms_and_conditions?: string
  warranty_period_months: number
  attachments: string[]
  status: 'pending' | 'approved' | 'rejected'
  submitted_at: string
  reviewed_at?: string
  reviewed_by?: string
  review_comments?: string
  rejection_reason?: string
  provider: {
    id: string
    name: string
    email: string
    phone?: string
    provider_category?: string
    speciality?: string
  }
  reviewer?: {
    id: string
    name: string
  }
}

interface IntegratedQuotesCardProps {
  interventionId: string
  intervention: any
  userRole: 'locataire' | 'gestionnaire' | 'prestataire'
  onQuoteStatusChange?: () => void
}

export function IntegratedQuotesCard({
  interventionId,
  intervention,
  userRole,
  onQuoteStatusChange
}: IntegratedQuotesCardProps) {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    quoteRequestModal,
    handleQuoteRequest,
    closeQuoteRequestModal,
    submitQuoteRequest,
    formData,
    updateFormData,
    toggleProvider,
    updateIndividualMessage,
    providers,
    providersLoading,
    isLoading: quoteRequestLoading,
    error: quoteRequestError
  } = useInterventionQuoting()

  // Charger les devis
  const fetchQuotes = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/intervention/${interventionId}/quotes`)

      if (response.ok) {
        const data = await response.json()
        setQuotes(data.quotes || [])
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Erreur lors du chargement des devis')
      }
    } catch (err) {
      console.error('Error fetching quotes:', err)
      setError('Erreur de connexion')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchQuotes()
  }, [interventionId])

  // Approuver un devis
  const handleQuoteApprove = async (quoteId: string, comments?: string) => {
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/intervention-quote-validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteId,
          action: 'approve',
          comments
        })
      })

      if (response.ok) {
        await fetchQuotes()
        onQuoteStatusChange?.()
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Erreur lors de l\'approbation')
      }
    } catch (err) {
      console.error('Error approving quote:', err)
      setError('Erreur lors de l\'approbation du devis')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Rejeter un devis
  const handleQuoteReject = async (quoteId: string, reason: string) => {
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/intervention-quote-validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteId,
          action: 'reject',
          rejectionReason: reason
        })
      })

      if (response.ok) {
        await fetchQuotes()
        onQuoteStatusChange?.()
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Erreur lors du rejet')
      }
    } catch (err) {
      console.error('Error rejecting quote:', err)
      setError('Erreur lors du rejet du devis')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'demande': return 'bg-yellow-100 text-yellow-800'
      case 'approuvee': return 'bg-green-100 text-green-800'
      case 'demande_de_devis': return 'bg-blue-100 text-blue-800'
      case 'planifiee': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const pendingQuotes = quotes.filter(q => q.status === 'pending')
  const approvedQuotes = quotes.filter(q => q.status === 'approved')
  const rejectedQuotes = quotes.filter(q => q.status === 'rejected')

  // Si l'intervention n'est pas en phase de devis
  if (intervention.status !== 'demande_de_devis' && quotes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-blue-500" />
              <span>Gestion des Devis</span>
            </CardTitle>
            <Badge className={getStatusColor(intervention.status)}>
              {intervention.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {intervention.status === 'approuvee' && userRole === 'gestionnaire' ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Prêt pour demande de devis
              </h3>
              <p className="text-gray-600 mb-4">
                Cette intervention est approuvée. Vous pouvez maintenant demander des devis.
              </p>
              <Button onClick={() => handleQuoteRequest(intervention)}>
                <Plus className="h-4 w-4 mr-2" />
                Demander des devis
              </Button>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Les devis ne sont pas encore disponibles pour cette intervention</p>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5 text-blue-500" />
            <span>Gestion des Devis</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            <span className="ml-2">Chargement des devis...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-blue-500" />
              <span>Gestion des Devis</span>
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Badge className={getStatusColor(intervention.status)}>
                {intervention.status}
              </Badge>
              {userRole === 'gestionnaire' && intervention.status === 'demande_de_devis' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuoteRequest(intervention)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Ajouter prestataires
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Statistiques rapides */}
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-lg font-semibold text-blue-600">
                {quotes.length}
              </div>
              <div className="text-xs text-gray-600">Total devis</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-yellow-600">
                {pendingQuotes.length}
              </div>
              <div className="text-xs text-gray-600">En attente</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-green-600">
                {approvedQuotes.length}
              </div>
              <div className="text-xs text-gray-600">Approuvés</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-gray-600">
                {quotes.length > 0 ? `${Math.min(...quotes.map(q => q.total_amount)).toFixed(0)} €` : '—'}
              </div>
              <div className="text-xs text-gray-600">Prix min.</div>
            </div>
          </div>

          {/* Messages d'état */}
          {intervention.quote_deadline && (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                Deadline pour les devis: {new Date(intervention.quote_deadline).toLocaleDateString('fr-FR')}
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Résumé des devis en attente */}
          {pendingQuotes.length > 0 && (
            <div>
              <h4 className="font-medium mb-2 flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                Devis en attente ({pendingQuotes.length})
              </h4>
              <div className="space-y-2">
                {pendingQuotes.slice(0, 3).map((quote) => (
                  <div key={quote.id} className="flex items-center justify-between bg-yellow-50 rounded p-3">
                    <div>
                      <span className="font-medium">{quote.provider.name}</span>
                      <div className="text-sm text-gray-500">
                        {quote.total_amount.toFixed(2)} € •
                        Soumis le {new Date(quote.submitted_at).toLocaleDateString('fr-FR')}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {quote.provider.provider_category}
                    </Badge>
                  </div>
                ))}
                {pendingQuotes.length > 3 && (
                  <div className="text-xs text-gray-500 text-center">
                    ... et {pendingQuotes.length - 3} autres devis
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Devis approuvé */}
          {approvedQuotes.length > 0 && (
            <div>
              <h4 className="font-medium mb-2 flex items-center">
                <CheckCircle className="h-4 w-4 mr-1 text-green-600" />
                Devis approuvé
              </h4>
              {approvedQuotes.map((quote) => (
                <div key={quote.id} className="bg-green-50 border border-green-200 rounded p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-green-900">{quote.provider.name}</span>
                      <div className="text-sm text-green-700">
                        {quote.total_amount.toFixed(2)} € •
                        Approuvé le {quote.reviewed_at ? new Date(quote.reviewed_at).toLocaleDateString('fr-FR') : ''}
                      </div>
                    </div>
                    <Badge className="bg-green-100 text-green-800">
                      Sélectionné
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Prochaine action */}
          {quotes.length === 0 && userRole === 'gestionnaire' && (
            <div className="text-center py-4">
              <Button onClick={() => handleQuoteRequest(intervention)} variant="outline">
                <FileText className="h-4 w-4 mr-2" />
                Demander des devis
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Composant de comparaison des devis (si nécessaire) */}
      {quotes.length > 0 && (
        <QuotesComparison
          intervention={intervention}
          quotes={quotes}
          onQuoteApprove={handleQuoteApprove}
          onQuoteReject={handleQuoteReject}
          isLoading={isSubmitting}
        />
      )}

      {/* Modal de demande de devis */}
      {quoteRequestModal.isOpen && (
        <QuoteRequestModal
          intervention={quoteRequestModal.intervention}
          isOpen={quoteRequestModal.isOpen}
          onClose={closeQuoteRequestModal}
          onSubmit={submitQuoteRequest}
          formData={formData}
          onUpdateFormData={updateFormData}
          onToggleProvider={toggleProvider}
          onUpdateIndividualMessage={updateIndividualMessage}
          providers={providers}
          providersLoading={providersLoading}
          isLoading={quoteRequestLoading}
          error={quoteRequestError}
        />
      )}
    </>
  )
}