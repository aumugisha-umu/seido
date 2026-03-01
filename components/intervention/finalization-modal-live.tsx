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

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  UnifiedModal,
  UnifiedModalHeader,
  UnifiedModalBody,
  UnifiedModalFooter,
} from '@/components/ui/unified-modal'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { InterventionDetailsCard } from '@/components/interventions/shared/cards/intervention-details-card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Wrench,
  CalendarPlus,
  FileText,
  AlertTriangle
} from 'lucide-react'
import { FinalizationConfirmationDialog } from './finalization-confirmation-dialog'
import { toast } from "sonner"
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

interface AssignmentUser {
  id: string
  name: string
  email?: string
  phone?: string
  role?: string
  avatar_url?: string | null
  provider_category?: string
  auth_user_id?: string | null
  company?: { name?: string } | null
}

interface Assignment {
  id: string
  role: string
  is_primary?: boolean
  user?: AssignmentUser | null
}

interface AddressRecord {
  formatted_address?: string
  street?: string
  city?: string
  postal_code?: string
  latitude?: number | null
  longitude?: number | null
}

interface FinalizationContextData {
  intervention: {
    id: string
    reference: string
    title: string
    type: string
    urgency: string
    description: string
    instructions?: string | null
    scheduling_type?: string | null
    requires_quote?: boolean
    status: string
    is_contested?: boolean
    lot?: {
      id: string
      reference: string
      address_record?: AddressRecord | null
      building?: {
        id: string
        name: string
        address_record?: AddressRecord | null
      }
    }
    building?: {
      id: string
      name: string
      address_record?: AddressRecord | null
    }
  }
  assignments: Assignment[]
  timeSlots: Array<{ id: string; slot_date: string; start_time: string; end_time: string; status: string; selected_by_manager?: boolean }>
  quotes: Array<{ id: string; amount: number | null; status: string }>
  reports: InterventionReport[]
}

const getStatusBadgeColors = (status: string) => {
  const s = status.toLowerCase()
  if (s.includes('clotur')) return { bg: 'bg-green-100 text-green-800 border-green-200', dot: 'bg-green-500' }
  if (s === 'approuvee') return { bg: 'bg-emerald-100 text-emerald-800 border-emerald-200', dot: 'bg-emerald-500' }
  if (s.includes('planifi')) return { bg: 'bg-blue-100 text-blue-800 border-blue-200', dot: 'bg-blue-500' }
  return { bg: 'bg-amber-100 text-amber-800 border-amber-200', dot: 'bg-amber-500' }
}

const getUrgencyBadgeColors = (urgency: string) => {
  const u = urgency.toLowerCase()
  if (u === 'haute' || u === 'urgente') return { bg: 'bg-red-100 text-red-800 border-red-200', dot: 'bg-red-500' }
  if (u === 'moyenne') return { bg: 'bg-amber-100 text-amber-800 border-amber-200', dot: 'bg-amber-500' }
  return { bg: 'bg-green-100 text-green-800 border-green-200', dot: 'bg-green-500' }
}

export function FinalizationModalLive({
  interventionId,
  isOpen,
  onClose,
  onComplete
}: FinalizationModalLiveProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<FinalizationContextData | null>(null)
  // ⚡ Optimized navigation helper
  const navigateTo = useCallback((path: string) => {
    router.push(path)
  }, [router])

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

      toast.success('Intervention finalisée', { description: result.message || 'L\'intervention a été finalisée avec succès' })

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

        navigateTo(`/gestionnaire/interventions/nouvelle-intervention?${queryParams.toString()}`)
      } else {
        onClose()
        onComplete?.()
      }
    } catch (err) {
      toast.error('Erreur', { description: err instanceof Error ? err.message : 'Une erreur est survenue' })
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

      toast('Finalisation refusée', { description: result.message || 'Le refus a été enregistré' })

      setShowRejectDialog(false)
      onClose()
      onComplete?.()
    } catch (err) {
      toast.error('Erreur', { description: err instanceof Error ? err.message : 'Une erreur est survenue' })
    } finally {
      setIsProcessing(false)
    }
  }

  const { intervention, assignments = [], timeSlots = [], quotes = [], reports = [] } = data || {}

  // Build participants data for ParticipantsRow (same pattern as intervention-detail-client.tsx lines 618-652)
  const participantsData = useMemo(() => ({
    managers: assignments
      .filter(a => a.role === 'gestionnaire' && a.user)
      .map(a => ({
        id: a.user!.id,
        name: a.user!.name || '',
        email: a.user!.email || undefined,
        phone: a.user!.phone || undefined,
        avatar_url: a.user!.avatar_url || undefined,
        company_name: (typeof a.user!.company === 'object' ? a.user!.company?.name : undefined) || undefined,
        role: 'manager' as const,
        hasAccount: !!a.user!.auth_user_id
      })),
    providers: assignments
      .filter(a => a.role === 'prestataire' && a.user)
      .map(a => ({
        id: a.user!.id,
        name: a.user!.name || '',
        email: a.user!.email || undefined,
        phone: a.user!.phone || undefined,
        avatar_url: a.user!.avatar_url || undefined,
        company_name: (typeof a.user!.company === 'object' ? a.user!.company?.name : undefined) || undefined,
        role: 'provider' as const,
        hasAccount: !!a.user!.auth_user_id
      })),
    tenants: assignments
      .filter(a => a.role === 'locataire' && a.user)
      .map(a => ({
        id: a.user!.id,
        name: a.user!.name || '',
        email: a.user!.email || undefined,
        phone: a.user!.phone || undefined,
        avatar_url: a.user!.avatar_url || undefined,
        company_name: (typeof a.user!.company === 'object' ? a.user!.company?.name : undefined) || undefined,
        role: 'tenant' as const,
        hasAccount: !!a.user!.auth_user_id
      }))
  }), [assignments])

  // Build locationDetails for InterventionDetailsCard
  const locationDetails = useMemo(() => {
    if (!intervention) return undefined
    const lotBuilding = intervention.lot?.building
    const directBuilding = intervention.building
    const lotRecord = intervention.lot?.address_record
    const buildingRecord = lotBuilding?.address_record || directBuilding?.address_record
    const record = lotRecord || buildingRecord
    return {
      buildingName: lotBuilding?.name || directBuilding?.name,
      lotReference: intervention.lot?.reference,
      fullAddress: record?.formatted_address
        || (record?.street || record?.city
          ? [record.street, record.postal_code, record.city].filter(Boolean).join(', ')
          : undefined),
      latitude: record?.latitude || null,
      longitude: record?.longitude || null
    }
  }, [intervention])

  // Build planning status for InterventionDetailsCard (aligned with General tab logic)
  const planning = useMemo(() => {
    if (!intervention) return undefined
    const confirmedSlot = timeSlots.find(s => s.status === 'selected')
    const isFixedScheduling = confirmedSlot?.selected_by_manager === true
    const scheduledDate = confirmedSlot?.slot_date || null

    const proposedSlotsCount = timeSlots.filter(s =>
      s.status === 'pending' || s.status === 'requested'
    ).length

    const planningStatus: 'pending' | 'proposed' | 'scheduled' = scheduledDate
      ? 'scheduled'
      : proposedSlotsCount > 0
        ? 'proposed'
        : 'pending'

    const approvedQuote = quotes.find(q => q.status === 'accepted')
    const sentQuotes = quotes.filter(q => q.status === 'sent')
    const pendingQuotes = quotes.filter(q => q.status === 'pending')

    return {
      status: planningStatus,
      scheduledDate,
      scheduledStartTime: confirmedSlot?.start_time || null,
      scheduledEndTime: confirmedSlot?.end_time || null,
      isFixedScheduling,
      schedulingType: intervention.scheduling_type as 'fixed' | 'slots' | 'flexible' | null,
      proposedSlotsCount,
      quotesStatus: approvedQuote ? 'approved' as const
        : sentQuotes.length > 0 ? 'received' as const
        : pendingQuotes.length > 0 ? 'pending' as const
        : 'none' as const,
      selectedQuoteAmount: approvedQuote?.amount || null,
      receivedQuotesCount: sentQuotes.length,
      requestedQuotesCount: pendingQuotes.length,
    }
  }, [intervention, timeSlots, quotes])

  // Format date helper
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  return (
    <UnifiedModal
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      size="full"
      preventCloseOnOutsideClick={isProcessing}
      preventCloseOnEscape={isProcessing}
    >
      {/* Loading state */}
      {isLoading && (
        <>
          <UnifiedModalHeader
            title="Chargement..."
            icon={<Loader2 className="h-5 w-5 animate-spin" />}
          />
          <UnifiedModalBody>
            <div className="flex flex-col h-[300px] items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-sky-600 mb-4" />
              <p className="text-sm text-gray-600">Chargement des données...</p>
            </div>
          </UnifiedModalBody>
        </>
      )}

      {/* Error state */}
      {!isLoading && (error || !data) && (
        <>
          <UnifiedModalHeader
            title="Erreur de chargement"
            icon={<AlertCircle className="h-5 w-5" />}
            variant="danger"
          />
          <UnifiedModalBody>
            <div className="flex flex-col items-center justify-center p-8">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {error || 'Impossible de charger les données de finalisation'}
                </AlertDescription>
              </Alert>
              <Button onClick={onClose} className="mt-4">Fermer</Button>
            </div>
          </UnifiedModalBody>
        </>
      )}

      {/* Main content */}
      {!isLoading && !error && data && intervention && (
        <>
          <UnifiedModalHeader
            title="Finalisation de l'intervention"
            subtitle={intervention.title}
            icon={<CheckCircle2 className="h-5 w-5" />}
            className="bg-white !pr-14"
            badge={
              <>
                <Badge variant="outline" className="text-xs font-normal text-gray-700 border-gray-300">
                  {intervention.type}
                </Badge>
                <Badge className={cn('text-xs font-normal border', getStatusBadgeColors(intervention.status).bg)}>
                  <div className={cn('w-2 h-2 rounded-full', getStatusBadgeColors(intervention.status).dot)} />
                  <span>{intervention.status}</span>
                </Badge>
                <Badge className={cn('text-xs font-normal border', getUrgencyBadgeColors(intervention.urgency).bg)}>
                  <div className={cn('w-2 h-2 rounded-full', getUrgencyBadgeColors(intervention.urgency).dot)} />
                  <span>{intervention.urgency}</span>
                </Badge>
              </>
            }
          />

          <UnifiedModalBody className="space-y-4 bg-slate-50">

                {/* Section 1: Informations générales (réutilisation InterventionDetailsCard) */}
                <Card className="border-gray-100 shadow-sm">
                  <CardContent className="pt-6">
                    <InterventionDetailsCard
                      sections={['participants', 'description', 'location', 'instructions', 'planning']}
                      description={intervention.description || undefined}
                      instructions={intervention.instructions || undefined}
                      interventionStatus={intervention.status}
                      locationDetails={locationDetails}
                      participants={participantsData}
                      currentUserRole="gestionnaire"
                      planning={planning}
                    />
                  </CardContent>
                </Card>

                {/* Section 2: Rapports d'intervention */}
                <Card className="border-gray-100 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-medium text-gray-900 flex items-center">
                      <FileText className="w-5 h-5 mr-2 text-sky-600" />
                      Rapports d'intervention
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {reports.length === 0 ? (
                      <p className="text-sm text-gray-500 italic">Aucun rapport soumis</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {reports.map((report) => {
                          const isProviderReport = report.report_type === 'provider_report'
                          const isContested = report.metadata?.is_contested === true

                          return (
                            <div
                              key={report.id}
                              className={cn(
                                "p-3 rounded-lg border",
                                isContested
                                  ? "border-amber-300 bg-amber-50"
                                  : isProviderReport
                                    ? "border-purple-200 bg-purple-50/30"
                                    : "border-green-200 bg-green-50/30"
                              )}
                            >
                              <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-2">
                                  {isProviderReport ? (
                                    <Wrench className="w-4 h-4 text-purple-600" />
                                  ) : (
                                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                                  )}
                                  <span className="text-sm font-medium text-gray-900">
                                    {isProviderReport ? 'Rapport du prestataire' : 'Validation du locataire'}
                                  </span>
                                </div>
                                {isContested && (
                                  <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-300">
                                    <AlertTriangle className="w-3 h-3 mr-1" />
                                    Contesté
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 mb-1.5">
                                {formatDate(report.created_at)} • Par {report.creator?.name || 'Utilisateur'}
                              </p>
                              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                                {report.content}
                              </p>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Section 3: Votre rapport (gestionnaire) */}
                <Card className="border-gray-100 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-medium text-gray-900">
                      Votre rapport (optionnel)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      value={managerReport}
                      onChange={(e) => setManagerReport(e.target.value)}
                      placeholder="Ajoutez vos commentaires de clôture, observations ou recommandations..."
                      className="min-h-[80px] resize-none"
                      maxLength={5000}
                    />
                    <p className="text-xs text-gray-500 mt-1 text-right">
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
                      <div className="flex items-center gap-2 p-3 mt-3 bg-sky-50 border border-sky-200 rounded-lg animate-in slide-in-from-top-2">
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

          </UnifiedModalBody>

          <UnifiedModalFooter className="flex-col sm:flex-row gap-2">
            <div className="flex-1 space-y-1">
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
                onClick={handleRejectClick}
                disabled={isProcessing}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Refuser
              </Button>
              <Button
                onClick={handleFinalize}
                disabled={isProcessing}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                )}
                {scheduleFollowUp ? 'Finaliser et Programmer' : 'Finaliser l\'intervention'}
              </Button>
            </div>
          </UnifiedModalFooter>

          {/* Rejection Confirmation Dialog (kept for reject action only) */}
          <FinalizationConfirmationDialog
            isOpen={showRejectDialog}
            onClose={() => setShowRejectDialog(false)}
            onConfirm={handleRejectConfirm}
            action="reject"
            interventionRef={intervention?.reference || ''}
            isLoading={isProcessing}
          />
        </>
      )}
    </UnifiedModal>
  )
}
