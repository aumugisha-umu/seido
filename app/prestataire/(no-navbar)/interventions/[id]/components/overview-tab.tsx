'use client'

/**
 * Overview Tab Component for Prestataire
 * Displays intervention details and provider-specific actions
 * Now includes Estimation and Planification sections like gestionnaire view
 */

import { useState, useMemo } from 'react'
import { InterventionOverviewCard } from '@/components/interventions/intervention-overview-card'
import { TimeSlotProposer } from '@/components/interventions/time-slot-proposer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
import { AlertCircle } from 'lucide-react'
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
  onModifyChoice
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

  // Determine scheduling type based on intervention status and data
  const schedulingType = intervention.scheduled_date
    ? 'fixed' as const
    : schedulingSlotsForPreview.length > 0
    ? 'slots' as const
    : intervention.scheduling_method === 'flexible'
    ? 'flexible' as const
    : null

  // Check if quote is required (status or active quotes)
  const requireQuote = intervention.status === 'demande_de_devis' ||
    quotes.some(q => ['pending', 'sent', 'accepted'].includes(q.status))

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
        toast.error(result.error || 'Erreur lors du démarrage des travaux')
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
        toast.error(result.error || 'Erreur lors de la finalisation des travaux')
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
        toast.error(result.error || 'Erreur lors de la proposition des créneaux')
      }
    } catch (error) {
      console.error('Error proposing time slots:', error)
      toast.error('Erreur lors de la proposition des créneaux')
    }
  }

  return (
    <>
      <div className="space-y-6">
        {/* Intervention details with Estimation and Planification sections */}
        <InterventionOverviewCard
          intervention={intervention}
          managers={managers}
          providers={providers}
          tenants={tenants}
          requireQuote={requireQuote}
          quotes={quotes}
          schedulingType={schedulingType}
          schedulingSlots={schedulingSlotsForPreview}
          fullTimeSlots={timeSlots}
          currentUserId={currentUser.id}
          currentUserRole="prestataire"
          onUpdate={onRefresh}
          onRejectSlot={onRejectSlot}
          onApproveSlot={onAcceptSlot}
          canManageSlots={intervention.status === 'planification'}
          onModifyChoice={onModifyChoice}
        />

        {/* Urgency alert */}
        {intervention.urgency === 'urgente' && (
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-orange-800">
                <AlertCircle className="w-5 h-5" />
                Intervention urgente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-orange-700">
                Cette intervention est marquée comme urgente et nécessite une attention prioritaire.
              </p>
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
