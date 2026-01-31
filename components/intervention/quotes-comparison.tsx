"use client"

import {
  FileText,
  User,
  Euro,
  Clock,
  CheckCircle,
  X,
  Phone,
  Mail,
  Calendar
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

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
  status: 'pending' | 'accepted' | 'rejected'
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
  description: string
  urgency: string
  quote_deadline?: string
}

interface QuotesComparisonProps {
  intervention: Intervention
  quotes: Quote[]
  onApproveClick: (quote: Quote) => void
  onRejectClick: (quote: Quote) => void
  isLoading: boolean
}

export const QuotesComparison = ({
  intervention: _intervention,
  quotes,
  onApproveClick,
  onRejectClick,
  isLoading
}: QuotesComparisonProps) => {
  const pendingQuotes = quotes.filter(q => q.status === 'pending')
  const approvedQuotes = quotes.filter(q => q.status === 'accepted')
  const rejectedQuotes = quotes.filter(q => q.status === 'rejected')

  // Les modales sont gérées par le composant parent pour unification

  const getQuoteScore = (quote: Quote) => {
    let score = 0

    // Prix compétitif (30%)
    const minPrice = Math.min(...quotes.map(q => q.total_amount))
    const maxPrice = Math.max(...quotes.map(q => q.total_amount))
    const priceScore = maxPrice > minPrice
      ? ((maxPrice - quote.total_amount) / (maxPrice - minPrice)) * 30
      : 30
    score += priceScore

    // Délai de réalisation (25%)
    if (quote.estimated_duration_hours) {
      const minDuration = Math.min(...quotes.filter(q => q.estimated_duration_hours).map(q => q.estimated_duration_hours!))
      const maxDuration = Math.max(...quotes.filter(q => q.estimated_duration_hours).map(q => q.estimated_duration_hours!))
      if (maxDuration > minDuration) {
        score += ((maxDuration - quote.estimated_duration_hours) / (maxDuration - minDuration)) * 25
      } else {
        score += 25
      }
    } else {
      score += 10 // Pénalité si pas de durée estimée
    }

    // Détails et qualité de la proposition (25%)
    let detailScore = 0
    if (quote.work_details && quote.work_details.length > 100) detailScore += 10
    if (quote.terms_and_conditions) detailScore += 5
    if (quote.estimated_start_date) detailScore += 5
    score += detailScore

    // Rapidité de réponse (20%)
    const submissionTimes = quotes.map(q => new Date(q.submitted_at).getTime())
    const minTime = Math.min(...submissionTimes)
    const maxTime = Math.max(...submissionTimes)
    const quoteTime = new Date(quote.submitted_at).getTime()
    if (maxTime > minTime) {
      score += ((maxTime - quoteTime) / (maxTime - minTime)) * 20
    } else {
      score += 20
    }

    return Math.round(score)
  }

  const QuoteCard = ({ quote, showActions = true }: { quote: Quote; showActions?: boolean }) => {
    const score = getQuoteScore(quote)

    return (
      <Card className={`h-full ${quote.status === 'accepted' ? 'border-green-500 bg-green-50' : quote.status === 'rejected' ? 'border-red-500 bg-red-50' : ''}`}>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <User className="h-5 w-5" />
              {quote.provider.name}
            </CardTitle>
            <div className="flex items-center gap-2">
              {quote.status === 'pending' && (
                <Badge variant="outline" className="text-xs">
                  Score: {score}/100
                </Badge>
              )}
              <Badge
                className={
                  quote.status === 'accepted' ? 'bg-green-100 text-green-800' :
                  quote.status === 'rejected' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }
              >
                {quote.status === 'accepted' ? 'Approuvé' :
                 quote.status === 'rejected' ? 'Rejeté' :
                 'En attente'}
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-slate-600">
            <div className="flex items-center gap-1">
              <Mail className="h-4 w-4" />
              <span>{quote.provider.email}</span>
            </div>
            {quote.provider.phone && (
              <div className="flex items-center gap-1">
                <Phone className="h-4 w-4" />
                <span>{quote.provider.phone}</span>
              </div>
            )}
          </div>

          {quote.provider.provider_category && (
            <Badge variant="outline" className="w-fit text-xs">
              {quote.provider.provider_category}
            </Badge>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Prix */}
          <div className="bg-slate-50 rounded-lg p-3">
            <div className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Euro className="h-6 w-6" />
              {quote.total_amount.toFixed(2)} €
            </div>
            <div className="text-sm text-slate-600 mt-1">
              Main d'œuvre: {quote.labor_cost.toFixed(2)} € •
              Matériaux: {quote.materials_cost.toFixed(2)} €
            </div>
          </div>

          {/* Description */}
          <div>
            <h4 className="font-medium text-slate-900 mb-2">Description</h4>
            <p className="text-sm text-slate-700">{quote.description}</p>
          </div>

          {/* Détails des travaux */}
          {quote.work_details && (
            <div>
              <h4 className="font-medium text-slate-900 mb-2">Détails des travaux</h4>
              <p className="text-sm text-slate-700 bg-slate-50 rounded p-2">
                {quote.work_details}
              </p>
            </div>
          )}

          {/* Informations complémentaires */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            {quote.estimated_duration_hours && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-slate-500" />
                <span>{quote.estimated_duration_hours}h estimées</span>
              </div>
            )}

            {quote.estimated_start_date && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-slate-500" />
                <span>Début: {new Date(quote.estimated_start_date).toLocaleDateString('fr-FR')}</span>
              </div>
            )}

          </div>

          {/* Conditions particulières */}
          {quote.terms_and_conditions && (
            <div>
              <h4 className="font-medium text-slate-900 mb-2">Conditions particulières</h4>
              <p className="text-sm text-slate-700 bg-slate-50 rounded p-2">
                {quote.terms_and_conditions}
              </p>
            </div>
          )}

          {/* Statut et commentaires */}
          {quote.status === 'accepted' && quote.review_comments && (
            <div className="bg-green-50 border border-green-200 rounded p-3">
              <h4 className="font-medium text-green-800 mb-2 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Commentaires d'approbation
              </h4>
              <p className="text-sm text-green-700">{quote.review_comments}</p>
            </div>
          )}

          {quote.status === 'rejected' && quote.rejection_reason && (
            <div className="bg-red-50 border border-red-200 rounded p-3">
              <h4 className="font-medium text-red-800 mb-2 flex items-center gap-2">
                <X className="h-4 w-4" />
                Motif de rejet
              </h4>
              <p className="text-sm text-red-700">{quote.rejection_reason}</p>
            </div>
          )}

          {/* Actions */}
          {showActions && quote.status === 'pending' && (
            <div className="flex gap-2 pt-2">
              <Button
                size="sm"
                onClick={() => onApproveClick(quote)}
                disabled={isLoading}
                className="flex-1"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approuver
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onRejectClick(quote)}
                disabled={isLoading}
                className="flex-1"
              >
                <X className="h-4 w-4 mr-2" />
                Rejeter
              </Button>
            </div>
          )}

          {/* Informations de soumission */}
          <div className="text-xs text-slate-500 pt-2 border-t">
            Soumis le {new Date(quote.submitted_at).toLocaleDateString('fr-FR')} à {new Date(quote.submitted_at).toLocaleTimeString('fr-FR')}
            {quote.reviewed_at && quote.reviewer && (
              <> • Traité par {quote.reviewer.name} le {new Date(quote.reviewed_at).toLocaleDateString('fr-FR')}</>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (quotes.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            Aucune estimation reçue
          </h3>
          <p className="text-slate-600">
            Les estimations soumises par les prestataires appara&icirc;tront ici pour comparaison.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-slate-900">{quotes.length}</div>
            <div className="text-sm text-slate-600">Estimations reçues</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{approvedQuotes.length}</div>
            <div className="text-sm text-slate-600">Approuvés</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{pendingQuotes.length}</div>
            <div className="text-sm text-slate-600">En attente</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-slate-900">
              {quotes.length > 0 ? `${Math.min(...quotes.map(q => q.total_amount)).toFixed(0)} €` : '—'}
            </div>
            <div className="text-sm text-slate-600">Prix min.</div>
          </CardContent>
        </Card>
      </div>

      {/* Estimations en attente */}
      {pendingQuotes.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Estimations en attente ({pendingQuotes.length})
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {pendingQuotes
              .sort((a, b) => getQuoteScore(b) - getQuoteScore(a))
              .map(quote => (
                <QuoteCard key={quote.id} quote={quote} />
              ))}
          </div>
        </div>
      )}

      {/* Estimations approuvées */}
      {approvedQuotes.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-green-700 mb-4 flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Estimations approuvées ({approvedQuotes.length})
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {approvedQuotes.map(quote => (
              <QuoteCard key={quote.id} quote={quote} showActions={false} />
            ))}
          </div>
        </div>
      )}

      {/* Estimations rejetées */}
      {rejectedQuotes.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-red-700 mb-4 flex items-center gap-2">
            <X className="h-5 w-5" />
            Estimations rejetées ({rejectedQuotes.length})
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {rejectedQuotes.map(quote => (
              <QuoteCard key={quote.id} quote={quote} showActions={false} />
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
