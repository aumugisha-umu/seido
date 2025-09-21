"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  MapPin,
  Wrench,
  User,
  Mail,
  Phone,
  FileText,
  Calendar,
  Building
} from "lucide-react"
import { QuoteSubmissionForm } from "@/components/intervention/quote-submission-form"
import {
  getInterventionLocationText,
  getPriorityColor,
  getPriorityLabel
} from "@/lib/intervention-utils"

interface MagicLinkData {
  id: string
  intervention_id: string
  provider_email: string
  provider_id: string | null
  expires_at: string
  individual_message: string | null
  status: string
  quote_submitted: boolean
  intervention: {
    id: string
    reference: string
    title: string
    description: string
    type: string
    urgency: string
    status: string
    created_at: string
    quote_deadline: string | null
    quote_notes: string | null
    lot: {
      id: string
      reference: string
      building: {
        name: string
        address: string
        city: string
        postal_code: string
      }
    }
  }
  existingQuote?: any
}

export default function ExternalProviderInterventionPage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string

  const [magicLinkData, setMagicLinkData] = useState<MagicLinkData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasAccount, setHasAccount] = useState(false)
  const [isCreatingAccount, setIsCreatingAccount] = useState(false)

  // Fetch magic link data
  useEffect(() => {
    const fetchMagicLinkData = async () => {
      try {
        const response = await fetch(`/api/magic-link/${token}`)
        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || 'Erreur lors du chargement')
        }

        setMagicLinkData(result.data)
        setHasAccount(!!result.data.provider_id)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur inconnue')
      } finally {
        setIsLoading(false)
      }
    }

    if (token) {
      fetchMagicLinkData()
    }
  }, [token])

  const handleCreateAccount = async () => {
    if (!magicLinkData) return

    setIsCreatingAccount(true)
    try {
      // Create account for external provider
      const response = await fetch('/api/create-provider-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: magicLinkData.provider_email,
          magicLinkToken: token,
          interventionId: magicLinkData.intervention_id
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors de la création du compte')
      }

      // Redirect to auth flow or show success
      setHasAccount(true)
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création du compte')
    } finally {
      setIsCreatingAccount(false)
    }
  }

  const handleQuoteSuccess = () => {
    // Refresh data to show updated quote status
    window.location.reload()
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-600">Chargement...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              Accès impossible
            </h2>
            <p className="text-slate-600 mb-4">{error}</p>
            <Button onClick={() => router.push('/')} variant="outline">
              Retour à l'accueil
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!magicLinkData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              Lien non trouvé
            </h2>
            <p className="text-slate-600">Ce lien n'existe pas ou a expiré.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const isExpired = new Date(magicLinkData.expires_at) < new Date()
  const intervention = magicLinkData.intervention

  if (isExpired) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <Clock className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              Lien expiré
            </h2>
            <p className="text-slate-600 mb-4">
              Ce lien d'accès a expiré le {new Date(magicLinkData.expires_at).toLocaleDateString('fr-FR')}.
            </p>
            <p className="text-sm text-slate-500">
              Contactez le gestionnaire pour obtenir un nouveau lien.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (magicLinkData.quote_submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              Devis déjà soumis
            </h2>
            <p className="text-slate-600 mb-4">
              Vous avez déjà soumis un devis pour cette intervention.
            </p>
            <p className="text-sm text-slate-500">
              Vous serez notifié de la décision du gestionnaire.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container max-w-6xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Demande de Devis
          </h1>
          <p className="text-slate-600">
            Vous avez été invité à soumettre un devis pour l'intervention suivante
          </p>
        </div>

        {/* Account Status */}
        {!hasAccount && (
          <Alert className="mb-6">
            <User className="h-4 w-4" />
            <AlertDescription>
              <div className="flex items-center justify-between">
                <span>
                  Vous n'avez pas encore de compte. Créez-en un pour soumettre votre devis.
                </span>
                <Button
                  onClick={handleCreateAccount}
                  disabled={isCreatingAccount}
                  className="ml-4"
                >
                  {isCreatingAccount ? 'Création...' : 'Créer un compte'}
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Intervention Details */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Détails de l'intervention
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-slate-900">
                {intervention.title}
              </h3>
              <Badge className={`${getPriorityColor(intervention.urgency)}`}>
                {getPriorityLabel(intervention.urgency)}
              </Badge>
            </div>

            <p className="text-slate-700">{intervention.description}</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Building className="h-4 w-4" />
                <span>{intervention.lot.building?.name || `Lot ${intervention.lot.reference}`}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <MapPin className="h-4 w-4" />
                <span>
                  {intervention.lot.building
                    ? `${intervention.lot.building.address}, ${intervention.lot.building.city}`
                    : "Lot indépendant"
                  }
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <FileText className="h-4 w-4" />
                <span>Lot: {intervention.lot.reference}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Wrench className="h-4 w-4" />
                <span className="capitalize">{intervention.type}</span>
              </div>
            </div>

            {intervention.quote_deadline && (
              <Alert>
                <Calendar className="h-4 w-4" />
                <AlertDescription>
                  <strong>Date limite:</strong> {new Date(intervention.quote_deadline).toLocaleDateString('fr-FR')}
                </AlertDescription>
              </Alert>
            )}

            {magicLinkData.individual_message && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Message spécifique</h4>
                <p className="text-blue-800 text-sm whitespace-pre-wrap">
                  {magicLinkData.individual_message}
                </p>
              </div>
            )}

            {intervention.quote_notes && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <h4 className="font-medium text-slate-900 mb-2">Instructions générales</h4>
                <p className="text-slate-700 text-sm whitespace-pre-wrap">
                  {intervention.quote_notes}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quote Submission Form */}
        {hasAccount ? (
          <QuoteSubmissionForm
            intervention={intervention}
            existingQuote={magicLinkData.existingQuote}
            onSuccess={handleQuoteSuccess}
          />
        ) : (
          <Card>
            <CardContent className="pt-6 text-center">
              <User className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Compte requis
              </h3>
              <p className="text-slate-600 mb-4">
                Vous devez créer un compte pour soumettre votre devis.
              </p>
              <Button
                onClick={handleCreateAccount}
                disabled={isCreatingAccount}
                className="min-w-[140px]"
              >
                {isCreatingAccount ? 'Création en cours...' : 'Créer un compte'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-slate-500">
          <p>
            Ce lien expire le {new Date(magicLinkData.expires_at).toLocaleDateString('fr-FR')} à{' '}
            {new Date(magicLinkData.expires_at).toLocaleTimeString('fr-FR')}
          </p>
        </div>
      </div>
    </div>
  )
}