'use client'

/**
 * Modale de Finalisation d'Intervention - Version Live (connectée à la DB)
 *
 * Features:
 * - Charge les données depuis l'API finalization-context
 * - 2 onglets : Détails + Exécution
 * - Footer sticky toujours visible pour décision
 * - Toggle pour programmer intervention de suivi
 * - Modale de confirmation avec note obligatoire
 * - Redirection automatique si suivi activé
 */

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { VisuallyHidden } from '@/components/ui/visually-hidden'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Loader2, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  CheckCircle2,
  XCircle,
  Clock,
  Euro,
  FileText,
  Image as ImageIcon,
  Star,
  ThumbsUp,
  User,
  Building2,
  Phone,
  Mail,
  Package,
  Wrench,
  CalendarPlus
} from 'lucide-react'
import { FinalizationConfirmationDialog } from './finalization-confirmation-dialog'
import { useToast } from '@/hooks/use-toast'

interface FinalizationModalLiveProps {
  interventionId: string
  isOpen: boolean
  onClose: () => void
  onComplete?: () => void
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
  workCompletion?: {
    id: string
    workSummary: string
    workDetails?: string
    materialsUsed?: string
    actualDurationHours?: number
    actualCost?: number
    issuesEncountered?: string
    recommendations?: string
    beforePhotos?: Array<{ id: string; url: string; caption?: string }>
    afterPhotos?: Array<{ id: string; url: string; caption?: string }>
    documents?: Array<{ id: string; name: string; url: string; size: number }>
    submittedAt: string
    provider?: {
      id: string
      name: string
      email?: string
      phone?: string
    }
  }
  tenantValidation?: {
    id: string
    validationType: 'approve' | 'contest'
    satisfaction?: {
      quality_rating?: number
      professionalism_rating?: number
      punctuality_rating?: number
      cleanliness_rating?: number
      overall_rating?: number
    }
    comments?: string
    additionalComments?: string
    recommendProvider?: boolean
    submittedAt: string
  }
  selectedQuote?: {
    id: string
    amount: number
    description?: string
    details?: {
      materials?: Array<{ name: string; quantity: number; unitPrice: number; total: number }>
      labor?: { hours: number; ratePerHour: number; total: number }
      breakdown?: { subtotal: number; vatRate: number; vatAmount: number; total: number }
    }
    provider?: {
      id: string
      name: string
    }
    createdAt: string
  }
  contacts?: Array<{
    id: string
    role: string
    user?: {
      id: string
      name: string
      email?: string
      phone?: string
    }
  }>
}

export function FinalizationModalLive({
  interventionId,
  isOpen,
  onClose,
  onComplete
}: FinalizationModalLiveProps) {
  const [activeTab, setActiveTab] = useState('details')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<FinalizationContextData | null>(null)
  const { toast } = useToast()

  // Confirmation dialog state
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [confirmationAction, setConfirmationAction] = useState<'approve' | 'reject'>('approve')
  const [isProcessing, setIsProcessing] = useState(false)

  // Follow-up intervention toggle
  const [scheduleFollowUp, setScheduleFollowUp] = useState(false)

  // Load data when modal opens
  useEffect(() => {
    if (isOpen) {
      loadFinalizationContext()
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

  // Handlers
  const handleApproveClick = () => {
    setConfirmationAction('approve')
    setShowConfirmation(true)
  }

  const handleRejectClick = () => {
    setConfirmationAction('reject')
    setShowConfirmation(true)
  }

  const handleConfirm = async (note: string) => {
    setIsProcessing(true)

    try {
      const endpoint = confirmationAction === 'approve'
        ? `/api/intervention-finalize`
        : `/api/intervention-reject-finalization`

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interventionId,
          note
        })
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Erreur lors de la finalisation')
      }

      toast({
        title: confirmationAction === 'approve' ? '✅ Intervention finalisée' : '❌ Finalisation refusée',
        description: result.message || 'L\'action a été effectuée avec succès'
      })

      setShowConfirmation(false)

      // If follow-up is enabled, redirect to new intervention page
      if (scheduleFollowUp && confirmationAction === 'approve' && data) {
        const queryParams = new URLSearchParams({
          from_intervention: data.intervention.id,
          lot_id: data.intervention.lot?.id || '',
          building_id: data.intervention.lot?.building?.id || '',
          type: data.intervention.type,
          context: `Suite à l'intervention ${data.intervention.reference}`,
          title: `Suivi - ${data.intervention.title}`
        })

        window.location.href = `/gestionnaire/interventions/nouvelle?${queryParams.toString()}`
      } else {
        // Close modal and refresh
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

  const { intervention, workCompletion, tenantValidation, selectedQuote, contacts } = data || {}

  // Extract tenant and provider from contacts
  const tenant = contacts?.find(c => c.role === 'locataire')?.user
  const provider = workCompletion?.provider || contacts?.find(c => c.role === 'prestataire')?.user

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="!w-[1400px] !max-w-[90vw] h-[90vh] p-0">
        {/* Loading state */}
        {isLoading && (
          <>
            <VisuallyHidden>
              <DialogTitle>Chargement des données de finalisation</DialogTitle>
            </VisuallyHidden>
            <div className="flex flex-col h-full bg-white rounded-xl items-center justify-center">
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
            <div className="flex flex-col h-full bg-white rounded-xl items-center justify-center p-8">
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
          <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-8 py-6 border-b border-gray-100">
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
            {tenantValidation ? 'Validé par le locataire' : 'Cloturé par le prestataire'}
          </Badge>
        </div>
      </div>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <div className="px-8 pt-4 border-b border-gray-100">
          <TabsList className="bg-gray-50/50 p-1 rounded-lg">
            <TabsTrigger
              value="details"
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md px-6 py-2 font-normal"
            >
              Détails de l'intervention
            </TabsTrigger>
            <TabsTrigger
              value="execution"
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md px-6 py-2 font-normal"
            >
              Exécution et validation
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Scrollable Content */}
        <ScrollArea className="flex-1">
          <div className="px-8 py-6 pb-32">
            {/* Tab: Details */}
            <TabsContent value="details" className="mt-0 space-y-6">
              {/* Intervention Info */}
              <Card className="border-gray-100 shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-medium text-gray-900">
                    Informations générales
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Type d'intervention
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

                  <Separator className="bg-gray-100" />

                  <div className="space-y-1">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Description
                    </p>
                    <p className="text-sm font-normal text-gray-700 leading-relaxed">
                      {intervention.description}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Property & People */}
              <div className="grid grid-cols-2 gap-6">
                {/* Property */}
                {intervention.lot && (
                  <Card className="border-gray-100 shadow-sm">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-base font-medium text-gray-900 flex items-center">
                        <Building2 className="w-4 h-4 mr-2 text-sky-600" />
                        Bien concerné
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-gray-900">
                          {intervention.lot.reference}
                        </p>
                        {intervention.lot.building && (
                          <>
                            <p className="text-xs text-gray-600">
                              {intervention.lot.building.name}
                            </p>
                            {intervention.lot.building.address && (
                              <p className="text-xs text-gray-600">
                                {intervention.lot.building.address}
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Tenant */}
                {tenant && (
                  <Card className="border-gray-100 shadow-sm">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-base font-medium text-gray-900 flex items-center">
                        <User className="w-4 h-4 mr-2 text-sky-600" />
                        Locataire
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-start space-x-3">
                        <Avatar className="h-10 w-10 bg-sky-100">
                          <AvatarFallback className="bg-sky-100 text-sky-700 font-medium">
                            {tenant.name?.slice(0, 2).toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="space-y-1 flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {tenant.name}
                          </p>
                          {tenant.email && (
                            <div className="flex items-center text-xs text-gray-600">
                              <Mail className="w-3 h-3 mr-1.5" />
                              {tenant.email}
                            </div>
                          )}
                          {tenant.phone && (
                            <div className="flex items-center text-xs text-gray-600">
                              <Phone className="w-3 h-3 mr-1.5" />
                              {tenant.phone}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Provider Info */}
              {provider && (
                <Card className="border-gray-100 shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base font-medium text-gray-900 flex items-center">
                      <Wrench className="w-4 h-4 mr-2 text-sky-600" />
                      Prestataire
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-start space-x-3">
                      <Avatar className="h-10 w-10 bg-purple-100">
                        <AvatarFallback className="bg-purple-100 text-purple-700 font-medium">
                          {provider.name?.slice(0, 2).toUpperCase() || 'P'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="space-y-1 flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {provider.name}
                        </p>
                        {provider.email && (
                          <div className="flex items-center text-xs text-gray-600">
                            <Mail className="w-3 h-3 mr-1.5" />
                            {provider.email}
                          </div>
                        )}
                        {provider.phone && (
                          <div className="flex items-center text-xs text-gray-600">
                            <Phone className="w-3 h-3 mr-1.5" />
                            {provider.phone}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Tab: Execution */}
            <TabsContent value="execution" className="mt-0 space-y-6">
              {/* Work Summary */}
              {workCompletion && (
                <Card className="border-gray-100 shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg font-medium text-gray-900">
                      Compte-rendu des travaux
                    </CardTitle>
                    <CardDescription className="text-xs font-normal">
                      Par {provider?.name} • {new Date(workCompletion.submittedAt).toLocaleDateString('fr-FR')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm font-normal text-gray-700 leading-relaxed whitespace-pre-line">
                      {workCompletion.workSummary}
                    </p>
                    {workCompletion.workDetails && (
                      <>
                        <Separator className="my-4" />
                        <p className="text-sm font-normal text-gray-600 leading-relaxed whitespace-pre-line">
                          {workCompletion.workDetails}
                        </p>
                      </>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Photos Before/After */}
              {workCompletion && (workCompletion.beforePhotos?.length || workCompletion.afterPhotos?.length) ? (
                <div className="grid grid-cols-2 gap-6">
                  {/* Before Photos */}
                  {workCompletion.beforePhotos && workCompletion.beforePhotos.length > 0 && (
                    <Card className="border-gray-100 shadow-sm">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-base font-medium text-gray-900 flex items-center">
                          <ImageIcon className="w-4 h-4 mr-2 text-amber-600" />
                          Photos avant travaux
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-3">
                          {workCompletion.beforePhotos.map((photo) => (
                            <div
                              key={photo.id}
                              className="aspect-square bg-gray-100 rounded-md overflow-hidden group cursor-pointer"
                            >
                              <img
                                src={photo.url}
                                alt={photo.caption || 'Photo avant travaux'}
                                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                              />
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* After Photos */}
                  {workCompletion.afterPhotos && workCompletion.afterPhotos.length > 0 && (
                    <Card className="border-gray-100 shadow-sm">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-base font-medium text-gray-900 flex items-center">
                          <ImageIcon className="w-4 h-4 mr-2 text-green-600" />
                          Photos après travaux
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-3">
                          {workCompletion.afterPhotos.slice(0, 4).map((photo) => (
                            <div
                              key={photo.id}
                              className="aspect-square bg-gray-100 rounded-md overflow-hidden group cursor-pointer"
                            >
                              <img
                                src={photo.url}
                                alt={photo.caption || 'Photo après travaux'}
                                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                              />
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              ) : null}

              {/* Cost Breakdown (from quote or work completion) */}
              {(selectedQuote?.details || workCompletion?.actualCost) && (
                <Card className="border-gray-100 shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base font-medium text-gray-900 flex items-center">
                      <Euro className="w-4 h-4 mr-2 text-sky-600" />
                      Détail des coûts
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {selectedQuote?.details?.materials && selectedQuote.details.materials.length > 0 && (
                      <>
                        <div className="space-y-3">
                          <div className="flex items-center text-xs font-medium text-gray-500 uppercase tracking-wide">
                            <Package className="w-3.5 h-3.5 mr-2" />
                            Fournitures
                          </div>
                          {selectedQuote.details.materials.map((material, idx) => (
                            <div key={idx} className="flex items-center justify-between text-sm">
                              <span className="text-gray-700">
                                {material.name} <span className="text-gray-500">×{material.quantity}</span>
                              </span>
                              <span className="font-medium text-gray-900">
                                {material.total.toFixed(2)} €
                              </span>
                            </div>
                          ))}
                        </div>
                        <Separator className="bg-gray-100" />
                      </>
                    )}

                    {selectedQuote?.details?.labor && (
                      <>
                        <div className="space-y-3">
                          <div className="flex items-center text-xs font-medium text-gray-500 uppercase tracking-wide">
                            <Wrench className="w-3.5 h-3.5 mr-2" />
                            Main d'œuvre
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-700">
                              {selectedQuote.details.labor.hours}h × {selectedQuote.details.labor.ratePerHour}€/h
                            </span>
                            <span className="font-medium text-gray-900">
                              {selectedQuote.details.labor.total.toFixed(2)} €
                            </span>
                          </div>
                        </div>
                        <Separator className="bg-gray-100" />
                      </>
                    )}

                    {/* Totals */}
                    {selectedQuote?.details?.breakdown ? (
                      <div className="space-y-2 pt-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Sous-total HT</span>
                          <span className="font-medium text-gray-900">
                            {selectedQuote.details.breakdown.subtotal.toFixed(2)} €
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">
                            TVA ({(selectedQuote.details.breakdown.vatRate * 100).toFixed(0)}%)
                          </span>
                          <span className="font-medium text-gray-900">
                            {selectedQuote.details.breakdown.vatAmount.toFixed(2)} €
                          </span>
                        </div>
                        <Separator className="bg-gray-100" />
                        <div className="flex items-center justify-between text-base pt-2">
                          <span className="font-medium text-gray-900">Total TTC</span>
                          <span className="text-2xl font-medium text-gray-900">
                            {selectedQuote.details.breakdown.total.toFixed(2)} €
                          </span>
                        </div>
                      </div>
                    ) : workCompletion?.actualCost ? (
                      <div className="flex items-center justify-between text-base pt-2">
                        <span className="font-medium text-gray-900">Coût total</span>
                        <span className="text-2xl font-medium text-gray-900">
                          {workCompletion.actualCost.toFixed(2)} €
                        </span>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              )}

              {/* Tenant Validation */}
              {tenantValidation && (
                <Card className="border-green-100 shadow-sm bg-green-50/30">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base font-medium text-green-900 flex items-center">
                      <ThumbsUp className="w-4 h-4 mr-2 text-green-600" />
                      Validation du locataire
                    </CardTitle>
                    <CardDescription className="text-xs font-normal text-green-700">
                      Validé le {new Date(tenantValidation.submittedAt).toLocaleDateString('fr-FR')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Ratings */}
                    {tenantValidation.satisfaction && (
                      <>
                        <div className="grid grid-cols-5 gap-4">
                          {[
                            { label: 'Qualité', value: tenantValidation.satisfaction.quality_rating || 0 },
                            { label: 'Pro.', value: tenantValidation.satisfaction.professionalism_rating || 0 },
                            { label: 'Ponctualité', value: tenantValidation.satisfaction.punctuality_rating || 0 },
                            { label: 'Propreté', value: tenantValidation.satisfaction.cleanliness_rating || 0 },
                            { label: 'Global', value: tenantValidation.satisfaction.overall_rating || 0 }
                          ].map((rating) => (
                            <div key={rating.label} className="text-center space-y-1">
                              <div className="flex items-center justify-center space-x-0.5">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`w-3.5 h-3.5 ${
                                      i < rating.value
                                        ? 'fill-green-500 text-green-500'
                                        : 'text-gray-300'
                                    }`}
                                  />
                                ))}
                              </div>
                              <p className="text-xs text-gray-600">{rating.label}</p>
                            </div>
                          ))}
                        </div>
                        <Separator className="bg-green-200/50" />
                      </>
                    )}

                    {/* Feedback */}
                    {tenantValidation.comments && (
                      <div className="space-y-2">
                        <p className="text-sm font-normal text-gray-700 leading-relaxed">
                          "{tenantValidation.comments}"
                        </p>
                        {tenantValidation.additionalComments && (
                          <p className="text-sm font-normal text-gray-600 italic">
                            {tenantValidation.additionalComments}
                          </p>
                        )}
                      </div>
                    )}

                    {tenantValidation.recommendProvider && (
                      <div className="flex items-center space-x-2 text-xs text-green-700 bg-green-100 rounded-lg px-3 py-2">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="font-medium">Recommande ce prestataire</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </div>
        </ScrollArea>

        {/* Sticky Footer - Decision Section */}
        <div className="sticky bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg px-8 py-6">
          <div className="space-y-4">
            {/* Toggle for follow-up intervention */}
            <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200">
              <div className="flex items-center space-x-3">
                <CalendarPlus className="w-5 h-5 text-sky-600" />
                <div>
                  <Label htmlFor="schedule-followup" className="text-sm font-medium text-gray-900 cursor-pointer">
                    Programmer une intervention de suivi
                  </Label>
                  <p className="text-xs text-gray-600">
                    Après finalisation, vous serez redirigé vers la création d'une nouvelle intervention
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
              <div className="flex items-center gap-2 p-3 bg-sky-50 border border-sky-200 rounded-lg animate-in slide-in-from-top-2">
                <CheckCircle2 className="w-5 h-5 text-sky-600 flex-shrink-0" />
                <div className="text-sm text-sky-900">
                  <span className="font-medium">Intervention de suivi activée</span>
                  <p className="text-xs text-sky-700 mt-0.5">
                    Les informations de cette intervention (lot, type, contexte) seront pré-remplies dans le formulaire
                  </p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-gray-900">
                  Décision de finalisation
                </p>
                <p className="text-xs font-medium text-gray-700">
                  {scheduleFollowUp
                    ? 'Après validation, vous serez redirigé vers la page de création d\'intervention'
                    : 'Validez ou refusez la clôture définitive de cette intervention'}
                </p>
              </div>

              <div className="flex items-center space-x-3">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleRejectClick}
                  disabled={isProcessing}
                  className="rounded-full px-8 border-gray-300 hover:bg-gray-50"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Refuser
                </Button>
                <Button
                  size="lg"
                  onClick={handleApproveClick}
                  disabled={isProcessing}
                  className="rounded-full px-8 bg-green-600 hover:bg-green-700 text-white shadow-md"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  {scheduleFollowUp ? 'Finaliser et Programmer' : 'Finaliser l\'intervention'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Tabs>

          {/* Confirmation Dialog */}
          <FinalizationConfirmationDialog
            isOpen={showConfirmation}
            onClose={() => setShowConfirmation(false)}
            onConfirm={handleConfirm}
            action={confirmationAction}
            interventionRef={intervention?.reference || ''}
            isLoading={isProcessing}
          />
        </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
