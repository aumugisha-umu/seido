'use client'

/**
 * Modale de Finalisation d'Intervention - Version V2 Simplifiée
 *
 * Features:
 * - Vue unique (sans tabs)
 * - Affichage des rapports existants (prestataire + locataire)
 * - Zone de saisie pour le rapport gestionnaire (optionnel)
 * - Finalisation directe (sans dialogue de confirmation)
 * - Toggle pour programmer intervention de suivi
 */

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { VisuallyHidden } from '@/components/ui/visually-hidden'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  CheckCircle2,
  XCircle,
  User,
  Building2,
  Phone,
  Mail,
  Wrench,
  CalendarPlus,
  FileText,
  AlertTriangle
} from 'lucide-react'
import { FinalizationConfirmationDialog } from './finalization-confirmation-dialog'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

interface FinalizationModalLiveProps {
  interventionId: string
  isOpen: boolean
  onClose: () => void
  onComplete?: () => void
}

interface InterventionReport {
  id: string
  report_type: 'provider_report' | 'tenant_report'
  title: string
  content: string
  metadata: Record<string, any> | null
  created_at: string
  creator: {
    id: string
    name: string
    role: string
  }
}

interface UserContact {
  id: string
  name: string
  email?: string
  phone?: string
  role?: string
  provider_category?: string
}

interface FinalizationContextData {
  intervention: {
    id: string
    reference: string
    title: string
    type: string
    urgency: string
    description: string
    status: string
    is_contested?: boolean
    lot?: {
      id: string
      reference: string
      building?: {
        id: string
        name: string
        address?: string
      }
    }
  }
  tenant?: UserContact | null
  provider?: UserContact | null
  reports: InterventionReport[]
}

export function FinalizationModalLive({
  interventionId,
  isOpen,
  onClose,
  onComplete
}: FinalizationModalLiveProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<FinalizationContextData | null>(null)
  const { toast } = useToast()

  // Manager report input
  const [managerReport, setManagerReport] = useState('')

  // Rejection dialog state (kept for reject action only)
  const [showRejectDialog, setShowRejectDialog] = useState(false)

  // Processing states
  const [isProcessing, setIsProcessing] = useState(false)

  // Follow-up intervention toggle
  const [scheduleFollowUp, setScheduleFollowUp] = useState(false)

  // Load data when modal opens
  useEffect(() => {
    if (isOpen) {
      loadFinalizationContext()
      // Reset state when opening
      setManagerReport('')
      setScheduleFollowUp(false)
    }
  }, [isOpen, interventionId])

  const loadFinalizationContext = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/intervention/${interventionId}/finalization-context`)
      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Erreur lors du chargement')
      }

      setData(result.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle direct finalization (no confirmation dialog)
  const handleFinalize = async () => {
    setIsProcessing(true)

    try {
      const response = await fetch('/api/intervention-finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interventionId,
          managerReport: managerReport.trim() || undefined
        })
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Erreur lors de la finalisation')
      }

      toast({
        title: '✅ Intervention finalisée',
        description: result.message || 'L\'intervention a été finalisée avec succès'
      })

      // If follow-up is enabled, redirect to new intervention page
      if (scheduleFollowUp && data) {
        const queryParams = new URLSearchParams({
          from_intervention: data.intervention.id,
          lot_id: data.intervention.lot?.id || '',
          building_id: data.intervention.lot?.building?.id || '',
          type: data.intervention.type,
          context: `Suite à l'intervention "${data.intervention.title}"`,
          title: `Suivi - ${data.intervention.title}`
        })

        window.location.href = `/gestionnaire/interventions/nouvelle-intervention?${queryParams.toString()}`
      } else {
        onClose()
        onComplete?.()
      }
    } catch (err) {
      toast({
        title: 'Erreur',
        description: err instanceof Error ? err.message : 'Une erreur est survenue',
        variant: 'destructive'
      })
    } finally {
      setIsProcessing(false)
    }
  }

  // Handle rejection (uses confirmation dialog)
  const handleRejectClick = () => {
    setShowRejectDialog(true)
  }

  const handleRejectConfirm = async (note: string) => {
    setIsProcessing(true)

    try {
      const response = await fetch('/api/intervention-reject-finalization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interventionId,
          note
        })
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Erreur lors du refus')
      }

      toast({
        title: '❌ Finalisation refusée',
        description: result.message || 'Le refus a été enregistré'
      })

      setShowRejectDialog(false)
      onClose()
      onComplete?.()
    } catch (err) {
      toast({
        title: 'Erreur',
        description: err instanceof Error ? err.message : 'Une erreur est survenue',
        variant: 'destructive'
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const { intervention, tenant, provider, reports = [] } = data || {}

  // Format date helper
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="!w-[900px] !max-w-[90vw] !max-h-[90vh] flex flex-col p-0 overflow-hidden">
        {/* Loading state */}
        {isLoading && (
          <>
            <VisuallyHidden>
              <DialogTitle>Chargement des données de finalisation</DialogTitle>
            </VisuallyHidden>
            <div className="flex flex-col h-[400px] bg-white rounded-xl items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-sky-600 mb-4" />
              <p className="text-sm text-gray-600">Chargement des données...</p>
            </div>
          </>
        )}

        {/* Error state */}
        {!isLoading && (error || !data) && (
          <>
            <VisuallyHidden>
              <DialogTitle>Erreur de chargement</DialogTitle>
            </VisuallyHidden>
            <div className="flex flex-col h-[400px] bg-white rounded-xl items-center justify-center p-8">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {error || 'Impossible de charger les données de finalisation'}
                </AlertDescription>
              </Alert>
              <Button onClick={onClose} className="mt-4">Fermer</Button>
            </div>
          </>
        )}

        {/* Main content */}
        {!isLoading && !error && data && intervention && (
          <div className="flex flex-col min-h-0 h-full">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex-shrink-0">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <DialogTitle className="text-2xl font-light text-gray-900">
                    Finalisation de l'intervention
                  </DialogTitle>
                  <p className="text-sm font-normal text-gray-500">
                    {intervention.reference} • {intervention.title}
                  </p>
                </div>
                <Badge
                  variant="secondary"
                  className="bg-green-50 text-green-700 border-green-200 text-sm font-normal px-3 py-1"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                  {data.tenantValidation ? 'Validé par le locataire' : 'Clôturé par le prestataire'}
                </Badge>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              <div className="px-6 py-6 space-y-6">

                {/* Section 1: Informations générales + Bien */}
                <Card className="border-gray-100 shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg font-medium text-gray-900">
                      Informations générales
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Type + Urgence */}
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                          Catégorie d'intervention
                        </p>
                        <p className="text-sm font-normal text-gray-900">
                          {intervention.type}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                          Urgence
                        </p>
                        <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-200 font-normal">
                          {intervention.urgency}
                        </Badge>
                      </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Description
                      </p>
                      <p className="text-sm font-normal text-gray-700 leading-relaxed">
                        {intervention.description}
                      </p>
                    </div>

                    <Separator className="bg-gray-100" />

                    {/* Bien concerné */}
                    {intervention.lot && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center">
                          <Building2 className="w-3.5 h-3.5 mr-1.5" />
                          Bien concerné
                        </p>
                        <p className="text-sm font-medium text-gray-900">
                          {intervention.lot.reference}
                          {intervention.lot.building && (
                            <span className="font-normal text-gray-600">
                              {' '}• {intervention.lot.building.name}
                              {intervention.lot.building.address_record?.street && ` • ${intervention.lot.building.address_record.street}`}
                            </span>
                          )}
                        </p>
                      </div>
                    )}

                    <Separator className="bg-gray-100" />

                    {/* Locataire + Prestataire */}
                    <div className="grid grid-cols-2 gap-6">
                      {/* Locataire */}
                      {tenant && (
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center">
                            <User className="w-3.5 h-3.5 mr-1.5" />
                            Locataire
                          </p>
                          <div className="flex items-start space-x-3">
                            <Avatar className="h-9 w-9 bg-sky-100">
                              <AvatarFallback className="bg-sky-100 text-sky-700 text-xs font-medium">
                                {tenant.name?.slice(0, 2).toUpperCase() || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="space-y-0.5">
                              <p className="text-sm font-medium text-gray-900">{tenant.name}</p>
                              {tenant.email && (
                                <p className="text-xs text-gray-600 flex items-center">
                                  <Mail className="w-3 h-3 mr-1" />{tenant.email}
                                </p>
                              )}
                              {tenant.phone && (
                                <p className="text-xs text-gray-600 flex items-center">
                                  <Phone className="w-3 h-3 mr-1" />{tenant.phone}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Prestataire */}
                      {provider && (
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center">
                            <Wrench className="w-3.5 h-3.5 mr-1.5" />
                            Prestataire
                          </p>
                          <div className="flex items-start space-x-3">
                            <Avatar className="h-9 w-9 bg-purple-100">
                              <AvatarFallback className="bg-purple-100 text-purple-700 text-xs font-medium">
                                {provider.name?.slice(0, 2).toUpperCase() || 'P'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="space-y-0.5">
                              <p className="text-sm font-medium text-gray-900">{provider.name}</p>
                              {provider.email && (
                                <p className="text-xs text-gray-600 flex items-center">
                                  <Mail className="w-3 h-3 mr-1" />{provider.email}
                                </p>
                              )}
                              {provider.phone && (
                                <p className="text-xs text-gray-600 flex items-center">
                                  <Phone className="w-3 h-3 mr-1" />{provider.phone}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Section 2: Rapports d'intervention */}
                <Card className="border-gray-100 shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg font-medium text-gray-900 flex items-center">
                      <FileText className="w-5 h-5 mr-2 text-sky-600" />
                      Rapports d'intervention
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {reports.length === 0 ? (
                      <p className="text-sm text-gray-500 italic">Aucun rapport soumis</p>
                    ) : (
                      reports.map((report) => {
                        const isProviderReport = report.report_type === 'provider_report'
                        const isContested = report.metadata?.is_contested === true

                        return (
                          <div
                            key={report.id}
                            className={cn(
                              "p-4 rounded-lg border",
                              isContested
                                ? "border-amber-300 bg-amber-50"
                                : isProviderReport
                                  ? "border-purple-200 bg-purple-50/30"
                                  : "border-green-200 bg-green-50/30"
                            )}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                {isProviderReport ? (
                                  <Wrench className="w-4 h-4 text-purple-600" />
                                ) : (
                                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                                )}
                                <span className="font-medium text-gray-900">
                                  {isProviderReport ? 'Rapport du prestataire' : 'Validation du locataire'}
                                </span>
                                {isContested && (
                                  <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-300">
                                    <AlertTriangle className="w-3 h-3 mr-1" />
                                    Contesté
                                  </Badge>
                                )}
                              </div>
                              <span className="text-xs text-gray-500">
                                {formatDate(report.created_at)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                              {report.content}
                            </p>
                            <p className="text-xs text-gray-500 mt-2">
                              Par {report.creator?.name || 'Utilisateur'}
                            </p>
                          </div>
                        )
                      })
                    )}
                  </CardContent>
                </Card>

                {/* Section 3: Votre rapport (gestionnaire) */}
                <Card className="border-gray-100 shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg font-medium text-gray-900">
                      Votre rapport (optionnel)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      value={managerReport}
                      onChange={(e) => setManagerReport(e.target.value)}
                      placeholder="Ajoutez vos commentaires de clôture, observations ou recommandations..."
                      className="min-h-[120px] resize-none"
                      maxLength={5000}
                    />
                    <p className="text-xs text-gray-500 mt-2 text-right">
                      {managerReport.length}/5000 caractères
                    </p>
                  </CardContent>
                </Card>

                {/* Section 4: Toggle intervention de suivi */}
                <Card className="border-gray-100 shadow-sm">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <CalendarPlus className="w-5 h-5 text-sky-600" />
                        <div>
                          <Label htmlFor="schedule-followup" className="text-sm font-medium text-gray-900 cursor-pointer">
                            Programmer une intervention de suivi
                          </Label>
                          <p className="text-xs text-gray-600">
                            Redirection vers la création après finalisation
                          </p>
                        </div>
                      </div>
                      <Switch
                        id="schedule-followup"
                        checked={scheduleFollowUp}
                        onCheckedChange={setScheduleFollowUp}
                      />
                    </div>

                    {/* Visual indicator when follow-up is enabled */}
                    {scheduleFollowUp && (
                      <div className="flex items-center gap-2 p-3 mt-4 bg-sky-50 border border-sky-200 rounded-lg animate-in slide-in-from-top-2">
                        <CheckCircle2 className="w-5 h-5 text-sky-600 flex-shrink-0" />
                        <div className="text-sm text-sky-900">
                          <span className="font-medium">Intervention de suivi activée</span>
                          <p className="text-xs text-sky-700 mt-0.5">
                            Les informations de cette intervention (lot, type, contexte) seront pré-remplies
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

              </div>
            </div>

            {/* Sticky Footer - Decision Section */}
            <div className="bg-white border-t border-gray-200 shadow-lg px-6 py-4 flex-shrink-0 relative z-10">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-gray-900">
                    Décision de finalisation
                  </p>
                  <p className="text-xs text-gray-600">
                    {scheduleFollowUp
                      ? 'Après validation, vous serez redirigé vers la création d\'intervention'
                      : 'Validez ou refusez la clôture définitive de cette intervention'}
                  </p>
                </div>

                <div className="flex items-center space-x-3">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={handleRejectClick}
                    disabled={isProcessing}
                    className="rounded-full px-6 border-gray-300 hover:bg-gray-50"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Refuser
                  </Button>
                  <Button
                    size="lg"
                    onClick={handleFinalize}
                    disabled={isProcessing}
                    className="rounded-full px-6 bg-green-600 hover:bg-green-700 text-white shadow-md"
                  >
                    {isProcessing ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                    )}
                    {scheduleFollowUp ? 'Finaliser et Programmer' : 'Finaliser l\'intervention'}
                  </Button>
                </div>
              </div>
            </div>

            {/* Rejection Confirmation Dialog (kept for reject action only) */}
            <FinalizationConfirmationDialog
              isOpen={showRejectDialog}
              onClose={() => setShowRejectDialog(false)}
              onConfirm={handleRejectConfirm}
              action="reject"
              interventionRef={intervention?.reference || ''}
              isLoading={isProcessing}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
