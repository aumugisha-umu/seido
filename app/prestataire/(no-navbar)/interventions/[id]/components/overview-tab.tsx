'use client'

/**
 * Overview Tab Component for Prestataire
 * Displays intervention details and provider-specific actions
 * Now includes Estimation and Planification sections like gestionnaire view
 */

import { useState, useMemo } from 'react'
import { InterventionSchedulingPreview } from '@/components/interventions/intervention-scheduling-preview'
import { InterventionProviderGuidelines } from '@/components/interventions/intervention-provider-guidelines'
import { TimeSlotProposer } from '@/components/interventions/time-slot-proposer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { formatErrorMessage } from '@/lib/utils/error-formatter'
import { FileText, Edit, XCircle, Clock, CheckCircle2, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  startInterventionAction,
  completeByProviderAction,
  proposeTimeSlotsAction
} from '@/app/actions/intervention-actions'
import type { Database } from '@/lib/database.types'

type Intervention = Database['public']['Tables']['interventions']['Row'] & {
  building?: Database['public']['Tables']['buildings']['Row']
  lot?: Database['public']['Tables']['lots']['Row']
}

type TimeSlotResponse = Database['public']['Tables']['time_slot_responses']['Row'] & {
  user?: Database['public']['Tables']['users']['Row']
}

type TimeSlot = Database['public']['Tables']['intervention_time_slots']['Row'] & {
  proposed_by_user?: Database['public']['Tables']['users']['Row']
  responses?: TimeSlotResponse[]
}

type User = Database['public']['Tables']['users']['Row']

type Quote = Database['public']['Tables']['intervention_quotes']['Row'] & {
  provider?: Database['public']['Tables']['users']['Row']
}

type Assignment = Database['public']['Tables']['intervention_assignments']['Row'] & {
  user?: Database['public']['Tables']['users']['Row']
}

interface Contact {
  id: string
  name: string
  email: string
  phone?: string | null
  type?: "gestionnaire" | "prestataire" | "locataire"
}

interface TimeSlotForPreview {
  date: string
  startTime: string
  endTime: string
}

interface OverviewTabProps {
  intervention: Intervention
  timeSlots: TimeSlot[]
  currentUser: User
  assignments: Assignment[]
  quotes: Quote[]
  onRefresh: () => void
  // Slot action handlers
  onRejectSlot?: (slot: TimeSlot) => void
  onAcceptSlot?: (slot: TimeSlot) => void
  onModifyChoice?: (slot: TimeSlot, currentResponse: 'accepted' | 'rejected') => void
  // Quote action handlers (for prestataire)
  onEditQuote?: (quote: Quote) => void
  onCancelQuote?: (quoteId: string) => void
}

export function OverviewTab({
  intervention,
  timeSlots,
  currentUser,
  assignments,
  quotes,
  onRefresh,
  onRejectSlot,
  onAcceptSlot,
  onModifyChoice,
  onEditQuote,
  onCancelQuote
}: OverviewTabProps) {
  const [timeSlotDialogOpen, setTimeSlotDialogOpen] = useState(false)
  const [completeWorkDialogOpen, setCompleteWorkDialogOpen] = useState(false)
  const [workReport, setWorkReport] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Transform assignments into contacts grouped by role (like gestionnaire)
  const managers: Contact[] = useMemo(() =>
    assignments
      .filter(a => a.role === 'gestionnaire' && a.user)
      .map(a => ({
        id: a.user!.id,
        name: a.user!.name,
        email: a.user!.email || '',
        phone: a.user!.phone || null,
        type: 'gestionnaire' as const
      })),
    [assignments]
  )

  const providers: Contact[] = useMemo(() =>
    assignments
      .filter(a => a.role === 'prestataire' && a.user)
      .map(a => ({
        id: a.user!.id,
        name: a.user!.name,
        email: a.user!.email || '',
        phone: a.user!.phone || null,
        type: 'prestataire' as const
      })),
    [assignments]
  )

  const tenants: Contact[] = useMemo(() =>
    assignments
      .filter(a => a.role === 'locataire' && a.user)
      .map(a => ({
        id: a.user!.id,
        name: a.user!.name,
        email: a.user!.email || '',
        phone: a.user!.phone || null,
        type: 'locataire' as const
      })),
    [assignments]
  )

  // Transform time slots for preview
  const schedulingSlotsForPreview: TimeSlotForPreview[] = useMemo(() =>
    timeSlots
      .filter(ts => ts.slot_date && ts.start_time && ts.end_time)
      .map(ts => ({
        date: ts.slot_date!,
        startTime: ts.start_time!,
        endTime: ts.end_time!
      })),
    [timeSlots]
  )

  // Scheduling type is determined ONLY from the DB field (no fallback inference)
  // This decouples TYPE display from DATA display (slots/dates are shown separately)
  const schedulingType = intervention.scheduling_type as 'fixed' | 'slots' | 'flexible' | null

  // Check if quote is required (from requires_quote flag or active quotes)
  // Note: demande_de_devis status removed - quote status tracked via intervention_quotes
  const requireQuote = intervention.requires_quote ||
    quotes.some(q => ['pending', 'sent', 'accepted'].includes(q.status))

  // Filter quotes by current provider
  const myQuotes = useMemo(() =>
    quotes.filter(q => q.provider_id === currentUser.id),
    [quotes, currentUser.id]
  )

  // Helper to get quote status display
  const getQuoteStatusConfig = (status: string) => {
    const statusMap: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
      pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock },
      sent: { label: 'Envoyé', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: FileText },
      accepted: { label: 'Approuvé', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle2 },
      rejected: { label: 'Rejeté', color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle },
      cancelled: { label: 'Annulé', color: 'bg-gray-100 text-gray-800 border-gray-200', icon: XCircle },
    }
    return statusMap[status] || { label: status, color: 'bg-gray-100 text-gray-800', icon: AlertCircle }
  }

  // Handle start work
  const handleStartWork = async () => {
    if (!confirm('Êtes-vous sûr de vouloir démarrer les travaux ?')) return

    setIsSubmitting(true)
    try {
      const result = await startInterventionAction(intervention.id)
      if (result.success) {
        toast.success('Travaux démarrés avec succès')
        onRefresh()
      } else {
        toast.error(formatErrorMessage(result.error, 'Erreur lors du démarrage des travaux'))
      }
    } catch (error) {
      console.error('Error starting work:', error)
      toast.error('Erreur lors du démarrage des travaux')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle complete work
  const handleCompleteWork = async () => {
    if (!workReport.trim()) {
      toast.error('Veuillez fournir un rapport de fin de travaux')
      return
    }

    setIsSubmitting(true)
    try {
      const result = await completeByProviderAction(intervention.id, workReport)
      if (result.success) {
        toast.success('Travaux terminés avec succès')
        setCompleteWorkDialogOpen(false)
        setWorkReport('')
        onRefresh()
      } else {
        toast.error(formatErrorMessage(result.error, 'Erreur lors de la finalisation des travaux'))
      }
    } catch (error) {
      console.error('Error completing work:', error)
      toast.error('Erreur lors de la finalisation des travaux')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle time slot proposal
  const handleProposeTimeSlots = async (slots: Array<{
    date: string
    start_time: string
    end_time: string
    notes?: string
  }>) => {
    try {
      const result = await proposeTimeSlotsAction(intervention.id, slots)
      if (result.success) {
        toast.success('Créneaux proposés avec succès')
        setTimeSlotDialogOpen(false)
        onRefresh()
      } else {
        toast.error(formatErrorMessage(result.error, 'Erreur lors de la proposition des créneaux'))
      }
    } catch (error) {
      console.error('Error proposing time slots:', error)
      toast.error('Erreur lors de la proposition des créneaux')
    }
  }

  return (
    <>
      <div className="space-y-6">
        {/* Description */}
        {intervention.description && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">Description</h3>
            <p className="text-sm whitespace-pre-wrap">{intervention.description}</p>
          </div>
        )}

        {/* Provider Guidelines */}
        <InterventionProviderGuidelines
          interventionId={intervention.id}
          guidelines={intervention.provider_guidelines || null}
          currentUserRole="prestataire"
          onUpdate={onRefresh}
        />

        {/* Scheduling Preview */}
        <InterventionSchedulingPreview
          managers={managers}
          providers={providers}
          tenants={tenants}
          requireQuote={requireQuote}
          quotes={quotes}
          schedulingType={schedulingType}
          scheduledDate={intervention.scheduled_date}
          schedulingSlots={schedulingSlotsForPreview}
          fullTimeSlots={timeSlots}
          currentUserId={currentUser.id}
          currentUserRole="prestataire"
          onRejectSlot={onRejectSlot}
          onApproveSlot={onAcceptSlot}
          canManageSlots={intervention.status === 'planification'}
          onModifyChoice={onModifyChoice}
        />

        {/* Section Mes Estimations - Visible uniquement si le prestataire a des estimations */}
        {myQuotes.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Mes estimations ({myQuotes.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {myQuotes.map(quote => {
                  const statusConfig = getQuoteStatusConfig(quote.status)
                  const StatusIcon = statusConfig.icon
                  const canModify = ['pending', 'sent'].includes(quote.status)

                  return (
                    <div
                      key={quote.id}
                      className="p-4 border rounded-lg bg-white hover:shadow-sm transition-shadow"
                    >
                      {/* En-tête avec montant et statut */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          {quote.amount && quote.amount > 0 ? (
                            <span className="text-xl font-bold text-green-700">
                              {quote.amount.toFixed(2)} €
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground italic">
                              Montant non défini
                            </span>
                          )}
                        </div>
                        <Badge
                          variant="outline"
                          className={`${statusConfig.color} flex items-center gap-1`}
                        >
                          <StatusIcon className="w-3 h-3" />
                          {statusConfig.label}
                        </Badge>
                      </div>

                      {/* Description de l'estimation */}
                      {quote.description && (
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                          {quote.description}
                        </p>
                      )}

                      {/* Dates */}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Créé le {format(new Date(quote.created_at), 'dd MMM yyyy', { locale: fr })}
                        </span>
                        {quote.valid_until && (
                          <span className="flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Valide jusqu'au {format(new Date(quote.valid_until), 'dd MMM yyyy', { locale: fr })}
                          </span>
                        )}
                      </div>

                      {/* Actions */}
                      {canModify && (
                        <div className="flex gap-2 pt-3 border-t border-gray-100">
                          {onEditQuote && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onEditQuote(quote)}
                              className="flex items-center gap-1"
                            >
                              <Edit className="w-3.5 h-3.5" />
                              Modifier
                            </Button>
                          )}
                          {onCancelQuote && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onCancelQuote(quote.id)}
                              className="flex items-center gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              Annuler
                            </Button>
                          )}
                        </div>
                      )}

                      {/* Message si l'estimation ne peut plus être modifiée */}
                      {!canModify && quote.status === 'accepted' && (
                        <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-700 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4" />
                          Cette estimation a été approuvée par le gestionnaire
                        </div>
                      )}
                      {!canModify && quote.status === 'rejected' && (
                        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-center gap-2">
                          <XCircle className="w-4 h-4" />
                          Cette estimation a été rejetée
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Time Slot Proposer Dialog */}
      <Dialog open={timeSlotDialogOpen} onOpenChange={setTimeSlotDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Proposer des créneaux de disponibilité</DialogTitle>
            <DialogDescription>
              Proposez plusieurs créneaux horaires pour réaliser cette intervention
            </DialogDescription>
          </DialogHeader>
          <TimeSlotProposer
            interventionId={intervention.id}
            onSubmit={handleProposeTimeSlots}
            onCancel={() => setTimeSlotDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Complete Work Dialog */}
      <Dialog open={completeWorkDialogOpen} onOpenChange={setCompleteWorkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Terminer les travaux</DialogTitle>
            <DialogDescription>
              Indiquez les travaux réalisés et toute information importante
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="work-report">
                Rapport d'intervention *
              </Label>
              <Textarea
                id="work-report"
                value={workReport}
                onChange={(e) => setWorkReport(e.target.value)}
                placeholder="Décrivez les travaux effectués, les éventuels problèmes rencontrés, et toute recommandation..."
                className="min-h-[150px] mt-2"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Ce rapport sera visible par le gestionnaire et le locataire.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
              <p className="text-sm text-blue-900">
                <strong>À faire ensuite:</strong> N'oubliez pas d'ajouter les photos après travaux et la facture dans l'onglet Documents.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCompleteWorkDialogOpen(false)}
              disabled={isSubmitting}
            >
              Annuler
            </Button>
            <Button
              onClick={handleCompleteWork}
              disabled={!workReport.trim() || isSubmitting}
            >
              {isSubmitting ? 'Finalisation...' : 'Terminer les travaux'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
