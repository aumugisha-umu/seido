"use client"

import { useState, useEffect, useCallback } from "react"
import { FileText, Clock, AlertTriangle, CheckCircle, Plus, XCircle, User } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { QuotesComparison } from "@/components/intervention/quotes-comparison"
import { QuoteRequestModal } from "@/components/intervention/modals/quote-request-modal"
import { QuoteValidationModal } from "@/components/quotes/quote-validation-modal"
import { useInterventionQuoting } from "@/hooks/use-intervention-quoting"
import { useQuoteToast } from "@/hooks/use-quote-toast"
import { logger, logError } from '@/lib/logger'
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
  terms_and_conditions?: string
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

interface Intervention {
  id: string
  title: string
  status: string
  quote_deadline?: string
}

interface IntegratedQuotesCardProps {
  interventionId: string
  intervention: Intervention
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

  // État pour le modal de validation
  const [validationModal, setValidationModal] = useState<{
    isOpen: boolean
    quote: Quote | null
    action: 'approve' | 'reject'
  }>({
    isOpen: false,
    quote: null,
    action: 'approve'
  })

  const quoteToast = useQuoteToast()

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

  // Charger les estimations
  const fetchQuotes = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/intervention/${interventionId}/quotes`)

      if (response.ok) {
        const data = await response.json()
        setQuotes(data.quotes || [])
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Erreur lors du chargement des estimations')
      }
    } catch (err) {
      logger.error('Error fetching quotes:', err)
      setError('Erreur de connexion')
    } finally {
      setIsLoading(false)
    }
  }, [interventionId])

  useEffect(() => {
    fetchQuotes()
  }, [interventionId, fetchQuotes])

  // Fonctions pour gérer le modal de validation
  const openValidationModal = (quote: Quote, action: 'approve' | 'reject') => {
    setValidationModal({
      isOpen: true,
      quote,
      action
    })
  }

  const closeValidationModal = () => {
    setValidationModal({
      isOpen: false,
      quote: null,
      action: 'approve'
    })
  }

  // Fonction de validation via le modal
  const handleQuoteValidation = async (quoteId: string, action: 'approve' | 'reject', comments?: string) => {
    if (action === 'approve') {
      await handleQuoteApprove(quoteId, comments)
    } else {
      await handleQuoteReject(quoteId, comments || 'Estimation non retenue')
    }
  }

  // Approuver une estimation
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

        // Toast de succès pour approbation
        const quote = quotes.find(q => q.id === quoteId)
        if (quote) {
          quoteToast.quoteApproved(quote.provider.name, quote.total_amount, intervention.title)
        }
      } else {
        const errorData = await response.json()
        const errorMessage = errorData.error || 'Erreur lors de l\'approbation'
        setError(errorMessage)
        quoteToast.quoteError(errorMessage, 'l\'approbation de l\'estimation')
      }
    } catch (err) {
      logger.error('Error approving quote:', err)
      setError('Erreur lors de l\'approbation de l\'estimation')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Rejeter une estimation
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

        // Toast pour rejet
        const quote = quotes.find(q => q.id === quoteId)
        if (quote) {
          quoteToast.quoteRejected(quote.provider.name, reason, intervention.title)
        }
      } else {
        const errorData = await response.json()
        const errorMessage = errorData.error || 'Erreur lors du rejet'
        setError(errorMessage)
        quoteToast.quoteError(errorMessage, 'le rejet de l\'estimation')
      }
    } catch (err) {
      logger.error('Error rejecting quote:', err)
      setError('Erreur lors du rejet de l\'estimation')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Couleurs selon Design System SEIDO
  const getStatusColor = (_status: string) => {
    switch (status) {
      case 'demande': return 'bg-amber-100 text-amber-800 border-amber-200'
      case 'approuvee': return 'bg-emerald-100 text-emerald-800 border-emerald-200'
      case 'demande_de_devis': return 'bg-sky-100 text-sky-800 border-sky-200'
      case 'planifiee': return 'bg-emerald-100 text-emerald-800 border-emerald-200'
      default: return 'bg-slate-100 text-slate-800 border-slate-200'
    }
  }

  const pendingQuotes = quotes.filter(q => q.status === 'pending')
  const approvedQuotes = quotes.filter(q => q.status === 'accepted')
  const _rejectedQuotes = quotes.filter(q => q.status === 'rejected')

  // Si l'intervention n'est pas en phase d'estimation
  if (intervention.status !== 'demande_de_devis' && quotes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-blue-500" />
              <span>Gestion des Estimations</span>
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
                Prêt pour demande d'estimation
              </h3>
              <p className="text-gray-600 mb-4">
                Cette intervention est approuvée. Vous pouvez maintenant demander des estimations.
              </p>
              <Button onClick={() => handleQuoteRequest(intervention)}>
                <Plus className="h-4 w-4 mr-2" />
                Demander des estimations
              </Button>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Les estimations ne sont pas encore disponibles pour cette intervention</p>
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
          <CardTitle className="flex items-center space-x-2 text-slate-900">
            <FileText className="h-5 w-5 text-sky-600" />
            <span>Gestion des Estimations</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-sky-500"></div>
            <span className="ml-2 text-slate-600">Chargement des estimations...</span>
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
            <CardTitle className="flex items-center space-x-2 text-slate-900">
              <FileText className="h-5 w-5 text-sky-600" />
              <span>Gestion des Estimations</span>
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Badge className={getStatusColor(intervention.status)}>
                {intervention.status}
              </Badge>
              {userRole === 'gestionnaire' && intervention.status === 'demande_de_devis' && (
                <Button
                  variant="outline"
                  size="sm"
                  className="border-sky-200 text-sky-700 hover:bg-sky-50"
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
          {/* Statistiques rapides selon Design System */}
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-lg font-semibold text-sky-600">
                {quotes.length}
              </div>
              <div className="text-xs text-slate-600">Total estimations</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-amber-600">
                {pendingQuotes.length}
              </div>
              <div className="text-xs text-slate-600">En attente</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-emerald-600">
                {approvedQuotes.length}
              </div>
              <div className="text-xs text-slate-600">Approuvés</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-slate-700">
                {quotes.length > 0 ? `${Math.min(...quotes.map(q => q.total_amount)).toFixed(0)} €` : '—'}
              </div>
              <div className="text-xs text-slate-600">Prix min.</div>
            </div>
          </div>

          {/* Messages d'état */}
          {intervention.quote_deadline && (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                Deadline pour les estimations: {new Date(intervention.quote_deadline).toLocaleDateString('fr-FR')}
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Estimations en attente avec actions selon Design System */}
          {pendingQuotes.length > 0 && (
            <div>
              <h4 className="font-medium mb-3 flex items-center text-slate-900">
                <Clock className="h-4 w-4 mr-2 text-amber-600" />
                Estimations en attente de validation ({pendingQuotes.length})
              </h4>
              <div className="space-y-3">
                {pendingQuotes.map((quote) => (
                  <Card key={quote.id} className="border-l-4 border-l-amber-500">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                            <User className="w-5 h-5 text-amber-600" />
                          </div>
                          <div>
                            <h5 className="font-medium text-slate-900">{quote.provider.name}</h5>
                            <p className="text-sm text-slate-600">
                              {quote.provider.provider_category} • Soumis le {new Date(quote.submitted_at).toLocaleDateString('fr-FR')}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-sky-700">{quote.total_amount.toFixed(2)} €</p>
                          <p className="text-xs text-slate-500">
                            Main d'œuvre: {quote.labor_cost}€ • Matériaux: {quote.materials_cost}€
                          </p>
                        </div>
                      </div>

                      {/* Description de l'estimation */}
                      <div className="mb-3 p-3 bg-slate-50 rounded-lg">
                        <p className="text-sm text-slate-700">{quote.description}</p>
                        {quote.work_details && (
                          <p className="text-xs text-slate-600 mt-1">{quote.work_details}</p>
                        )}
                      </div>

                      {/* Actions gestionnaire avec modal de confirmation */}
                      {userRole === 'gestionnaire' && (
                        <div className="flex space-x-3">
                          <Button
                            variant="default"
                            size="sm"
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                            onClick={() => openValidationModal(quote, 'reject')}
                            disabled={isSubmitting}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Rejeter
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => openValidationModal(quote, 'approve')}
                            disabled={isSubmitting}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Approuver
                          </Button>
                        </div>
                      )}

                      {/* Informations supplémentaires */}
                      {quote.estimated_duration_hours && (
                        <div className="mt-3 text-xs text-slate-500">
                          <span>Durée estimée: {quote.estimated_duration_hours}h</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Estimation approuvée selon Design System */}
          {approvedQuotes.length > 0 && (
            <div>
              <h4 className="font-medium mb-3 flex items-center text-slate-900">
                <CheckCircle className="h-4 w-4 mr-2 text-emerald-600" />
                Estimation Approuvée
              </h4>
              {approvedQuotes.map((quote) => (
                <Card key={quote.id} className="border-l-4 border-l-emerald-500">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                          <CheckCircle className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                          <h5 className="font-medium text-emerald-900">{quote.provider.name}</h5>
                          <p className="text-sm text-emerald-700">
                            Approuvé le {quote.reviewed_at ? new Date(quote.reviewed_at).toLocaleDateString('fr-FR') : 'N/A'}
                          </p>
                          {quote.review_comments && (
                            <p className="text-xs text-slate-600 mt-1">"{quote.review_comments}"</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-emerald-700">{quote.total_amount.toFixed(2)} €</p>
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                          Sélectionné
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Prochaine action */}
          {quotes.length === 0 && userRole === 'gestionnaire' && (
            <div className="text-center py-4">
              <Button onClick={() => handleQuoteRequest(intervention)} variant="outline">
                <FileText className="h-4 w-4 mr-2" />
                Demander des estimations
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Composant de comparaison des estimations (si nécessaire) */}
      {quotes.length > 0 && (
        <QuotesComparison
          intervention={intervention}
          quotes={quotes}
          onQuoteApprove={handleQuoteApprove}
          onQuoteReject={handleQuoteReject}
          isLoading={isSubmitting}
        />
      )}

      {/* Modal de demande d'estimation */}
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

      {/* Modal de validation d'estimation */}
      <QuoteValidationModal
        isOpen={validationModal.isOpen}
        onClose={closeValidationModal}
        quote={validationModal.quote}
        action={validationModal.action}
        onConfirm={handleQuoteValidation}
        isLoading={isSubmitting}
      />
    </>
  )
}
