'use client'

/**
 * Multi-Slot Response Modal
 *
 * Unified modal for responding to multiple time slots at once.
 * Replaces both TimeSlotResponseModal (single slot) and TenantSlotConfirmationModal.
 *
 * Features:
 * - Display all proposed time slots grouped by date
 * - Accept one slot → auto-reject others
 * - Manual adjustment of responses before confirming
 * - Global comment (required if all rejected)
 * - Optional: Propose new slots if all rejected
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  UnifiedModal,
  UnifiedModalHeader,
  UnifiedModalBody,
  UnifiedModalFooter,
} from '@/components/ui/unified-modal'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { TimePicker24h } from '@/components/ui/time-picker-24h'
import {
  Calendar,
  Clock,
  Check,
  X,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Loader2,
  AlertCircle,
  Plus,
  ArrowRight,
  User,
  HelpCircle
} from 'lucide-react'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar as CalendarWidget } from '@/components/ui/calendar'
import { toast } from 'sonner'
import {
  acceptTimeSlotAction,
  rejectTimeSlotAction,
  withdrawResponseAction,
  proposeTimeSlotsAction,
  cancelTimeSlotAction
} from '@/app/actions/intervention-actions'
import { cn } from '@/lib/utils'
import { formatDateShort, formatTimeRange } from '@/components/interventions/shared/utils/helpers'

// ============================================================================
// MULTI-SLOT-RESPONSE-MODAL - Composant BEM Modulaire
// ============================================================================
// Block:    multi-slot-response-modal
// Elements: multi-slot-response-modal__header, __body, __slot-card, __response-indicators
// Modifiers: submitting (état de chargement), all-rejected (tous créneaux refusés)
// ============================================================================
//
// USAGE DES RÉPONSES (ResponseIndicators)
// ----------------------------------------
// Pour afficher les indicateurs de réponses dans les cartes de créneaux,
// passez la propriété `responses` dans chaque objet TimeSlot.
//
// @example - Depuis un appel parent
// ```tsx
// const slotsWithResponses: TimeSlot[] = rawSlots.map(slot => ({
//   ...slot,
//   responses: slot.time_slot_responses?.map(r => ({
//     user_id: r.user_id,
//     response: r.response as 'accepted' | 'rejected' | 'pending',
//     user: {
//       name: r.profiles?.first_name
//         ? `${r.profiles.first_name} ${r.profiles.last_name || ''}`
//         : r.profiles?.company_name || 'Utilisateur',
//       role: r.profiles?.role
//     }
//   })) || []
// }))
//
// <MultiSlotResponseModal
//   slots={slotsWithResponses}
//   interventionId={intervention.id}
//   ...
// />
// ```
//
// @example - Structure de données attendue
// ```tsx
// const slot: TimeSlot = {
//   id: "slot-uuid",
//   slot_date: "2026-02-04",
//   start_time: "09:00:00",
//   end_time: "12:00:00",
//   responses: [
//     { user_id: "u1", response: "accepted", user: { name: "Arthur Umugisha", role: "gestionnaire" } },
//     { user_id: "u2", response: "pending", user: { name: "Dépannage Rapide", role: "prestataire" } },
//     { user_id: "u3", response: "rejected", user: { name: "Marie Dupont", role: "locataire" } }
//   ]
// }
// ```
//
// @example - Requête Supabase pour récupérer les réponses
// ```ts
// const { data: slots } = await supabase
//   .from('intervention_time_slots')
//   .select(`
//     *,
//     time_slot_responses (
//       user_id,
//       response,
//       profiles:user_id (first_name, last_name, company_name, role)
//     )
//   `)
//   .eq('intervention_id', interventionId)
// ```
// ============================================================================

// ============================================================================
// TYPES
// ============================================================================

export interface TimeSlotResponse {
  user_id: string
  response: 'accepted' | 'rejected' | 'pending'
  user?: {
    name: string
    role?: string
  }
}

export interface TimeSlot {
  id: string
  slot_date: string
  start_time: string
  end_time: string
  notes?: string | null
  proposer_name?: string
  proposer_role?: 'gestionnaire' | 'prestataire' | 'locataire'
  status?: string
  /** Réponses des participants - voir documentation BEM en haut du fichier */
  responses?: TimeSlotResponse[]
}

type SlotResponseType = 'accept' | 'reject' | 'pending'

interface SlotResponse {
  slotId: string
  response: SlotResponseType
  rejectionReason?: string
}

interface ProposedSlot {
  date: string
  startTime: string
  endTime: string
}

interface MultiSlotResponseModalProps {
  isOpen: boolean
  onClose: () => void
  slots: TimeSlot[]
  interventionId: string
  /** Current user's existing responses (keyed by slot ID) */
  existingResponses?: Record<string, { response: SlotResponseType; reason?: string }>
  /** Slot IDs proposed by the current user — will be cancelled if user accepts an existing slot */
  userProposedSlotIds?: string[]
  onSuccess?: () => void
}

// ============================================================================
// RESPONSE INDICATORS COMPONENT
// ============================================================================

/**
 * Indicateurs de réponses avec HoverCard
 * Affiche un résumé des réponses (acceptées/en attente/refusées) avec détails au survol
 */
function ResponseIndicators({ slot }: { slot: TimeSlot }) {
  const responses = slot.responses || []

  const acceptedResponses = responses.filter(r => r.response === 'accepted')
  const rejectedResponses = responses.filter(r => r.response === 'rejected')
  const pendingResponses = responses.filter(r => r.response === 'pending')

  if (responses.length === 0) return null

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <button className="flex items-center gap-2 text-sm hover:bg-slate-100 rounded px-2 py-1 transition-colors">
          {acceptedResponses.length > 0 && (
            <span className="flex items-center gap-1 text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              {acceptedResponses.length}
            </span>
          )}
          {pendingResponses.length > 0 && (
            <span className="flex items-center gap-1 text-amber-600">
              <HelpCircle className="h-4 w-4" />
              {pendingResponses.length}
            </span>
          )}
          {rejectedResponses.length > 0 && (
            <span className="flex items-center gap-1 text-red-600">
              <XCircle className="h-4 w-4" />
              {rejectedResponses.length}
            </span>
          )}
        </button>
      </HoverCardTrigger>

      <HoverCardContent className="w-72 z-[10000]" align="end" side="top">
        <div className="space-y-3">
          <p className="text-sm font-semibold border-b pb-2">Réponses au créneau</p>

          {acceptedResponses.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-green-700 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" />
                Ont accepté ({acceptedResponses.length})
              </p>
              {acceptedResponses.map(r => (
                <p key={r.user_id} className="text-sm text-slate-600 pl-5">
                  {r.user?.name || 'Utilisateur'}
                </p>
              ))}
            </div>
          )}

          {pendingResponses.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-amber-700 flex items-center gap-1.5">
                <HelpCircle className="h-4 w-4" />
                En attente ({pendingResponses.length})
              </p>
              {pendingResponses.map(r => (
                <p key={r.user_id} className="text-sm text-slate-600 pl-5">
                  {r.user?.name || 'Utilisateur'}
                </p>
              ))}
            </div>
          )}

          {rejectedResponses.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-red-700 flex items-center gap-1.5">
                <XCircle className="h-4 w-4" />
                Ont refusé ({rejectedResponses.length})
              </p>
              {rejectedResponses.map(r => (
                <p key={r.user_id} className="text-sm text-slate-600 pl-5">
                  {r.user?.name || 'Utilisateur'}
                </p>
              ))}
            </div>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}

// ============================================================================
// SLOT CARD COMPONENT
// ============================================================================

interface ModalSlotCardProps {
  slot: TimeSlot
  response: SlotResponse
  onResponseChange: (response: SlotResponseType) => void
  disabled: boolean
}

function ModalSlotCard({ slot, response, onResponseChange, disabled }: ModalSlotCardProps) {
  const isPast = new Date(`${slot.slot_date}T${slot.start_time}`) < new Date()
  const isDisabled = disabled || isPast

  return (
    <div className={cn(
      "p-3 rounded-lg border transition-colors",
      response.response === 'accept' && "border-green-300 bg-green-50/50",
      response.response === 'reject' && "border-orange-300 bg-orange-50/50",
      response.response === 'pending' && "border-slate-200 bg-white",
      isPast && "opacity-60"
    )}>
      {/* Line 1: Date + Time */}
      <div className="flex items-center gap-2 mb-2">
        <div className="flex items-center gap-1">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm font-medium">{formatDateShort(slot.slot_date)}</span>
        </div>
        <span className="text-slate-300">•</span>
        <div className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {formatTimeRange(slot.start_time, slot.end_time)}
          </span>
        </div>
      </div>

      {/* Line 2: Proposer name (left) + Response indicators (right) */}
      <div className="flex items-center justify-between mb-2">
        {slot.proposer_name ? (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <User className="h-3.5 w-3.5" />
            <span>{slot.proposer_name}</span>
          </div>
        ) : (
          <div />
        )}
        <ResponseIndicators slot={slot} />
      </div>

      {/* Line 3: "Ma réponse" banner (always shown) */}
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-md mb-2 text-sm',
          response.response === 'accept'
            ? 'bg-green-50 text-green-700 border border-green-200'
            : response.response === 'reject'
              ? 'bg-red-50 text-red-700 border border-red-200'
              : 'bg-amber-50 text-amber-700 border border-amber-200'
        )}
      >
        {response.response === 'accept' && <CheckCircle2 className="h-4 w-4 flex-shrink-0" />}
        {response.response === 'reject' && <XCircle className="h-4 w-4 flex-shrink-0" />}
        {response.response === 'pending' && <HelpCircle className="h-4 w-4 flex-shrink-0" />}
        <span className="font-medium">
          Ma réponse : {response.response === 'accept' ? 'Accepté' : response.response === 'reject' ? 'Refusé' : 'En attente'}
        </span>
      </div>

      {/* Line 4: Action buttons (toggle behavior) */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onResponseChange(response.response === 'accept' ? 'pending' : 'accept')}
          disabled={isDisabled}
          className={cn(
            "flex-1",
            response.response === 'accept'
              ? "bg-green-100 text-green-700 border-green-300 hover:bg-green-50"
              : "text-green-700 border-green-300 hover:bg-green-50"
          )}
        >
          <Check className="h-4 w-4 mr-1" />
          Accepter
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onResponseChange(response.response === 'reject' ? 'pending' : 'reject')}
          disabled={isDisabled}
          className={cn(
            "flex-1",
            response.response === 'reject'
              ? "bg-orange-100 text-orange-700 border-orange-300 hover:bg-orange-50"
              : "text-orange-700 border-orange-300 hover:bg-orange-50"
          )}
        >
          <X className="h-4 w-4 mr-1" />
          Refuser
        </Button>
      </div>
    </div>
  )
}

// ============================================================================
// SLOT FORMAT HELPERS
// ============================================================================

function formatSlotDate(dateStr: string): string {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
  } catch {
    return dateStr
  }
}

function formatSlotDateLong(dateStr: string): string {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long' })
  } catch {
    return dateStr
  }
}

// ============================================================================
// TIME SLOT POPOVER CONTENT
// ============================================================================

function TimeSlotPopoverContent({ onAdd, onCancel }: {
  onAdd: (slot: { date: string; startTime: string; endTime: string }) => void
  onCancel: () => void
}) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const dateStr = selectedDate
    ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
    : ''

  const isValid = dateStr && startTime && endTime

  return (
    <div className="space-y-4">
      <div className="text-sm font-medium text-slate-900">Nouveau créneau</div>

      <CalendarWidget
        mode="single"
        selected={selectedDate}
        onSelect={setSelectedDate}
        disabled={{ before: today }}
        className="rounded-md border border-slate-200"
      />

      <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-3">
        <TimePicker24h value={startTime} onChange={setStartTime} contentClassName="z-[10001]" />
        <ArrowRight className="h-4 w-4 text-slate-400 flex-shrink-0" />
        <TimePicker24h value={endTime} onChange={setEndTime} contentClassName="z-[10001]" />
      </div>

      {dateStr && (startTime || endTime) && (
        <div className="px-3 py-2 bg-purple-50 border border-purple-200 rounded-lg text-sm">
          <span className="font-medium text-purple-900">{formatSlotDateLong(dateStr)}</span>
          {startTime && endTime && (
            <span className="text-purple-600 ml-2">{startTime} - {endTime}</span>
          )}
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} className="text-xs">
          Annuler
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={!isValid}
          onClick={() => { if (isValid) onAdd({ date: dateStr, startTime, endTime }) }}
          className="text-xs bg-purple-600 hover:bg-purple-700"
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Ajouter
        </Button>
      </div>
    </div>
  )
}

// ============================================================================
// PROPOSE SLOTS SECTION (Pill-chip + Popover pattern)
// ============================================================================

interface ProposeSlotsProps {
  proposedSlots: ProposedSlot[]
  onSlotsChange: (slots: ProposedSlot[]) => void
  disabled: boolean
}

function ProposeSlots({ proposedSlots, onSlotsChange, disabled }: ProposeSlotsProps) {
  const [popoverOpen, setPopoverOpen] = useState(false)

  const addSlot = (slot: { date: string; startTime: string; endTime: string }) => {
    onSlotsChange([...proposedSlots, slot])
  }

  const removeSlot = (index: number) => {
    onSlotsChange(proposedSlots.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-3 p-4 bg-purple-50/30 border border-purple-200 rounded-lg">
      <Label className="text-sm font-medium text-slate-900">
        Proposer d&apos;autres créneaux ({proposedSlots.length})
      </Label>

      {/* Slot pills + Add button */}
      <div className="flex flex-wrap items-center gap-2">
        {proposedSlots.map((slot, index) => (
          <div
            key={index}
            className="inline-flex items-center gap-2 px-3 py-2 bg-purple-50 border border-purple-200 rounded-lg text-sm group hover:bg-purple-100 transition-colors"
          >
            <Calendar className="h-3.5 w-3.5 text-purple-600 flex-shrink-0" />
            <span className="font-medium text-purple-900">{formatSlotDate(slot.date)}</span>
            <span className="text-purple-600">{slot.startTime} - {slot.endTime}</span>
            <button
              type="button"
              onClick={() => removeSlot(index)}
              disabled={disabled}
              className="ml-1 p-0.5 rounded-full text-purple-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}

        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              className="border-dashed border-purple-300 text-purple-700 hover:bg-purple-50 hover:text-purple-800 h-9"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Ajouter un créneau
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-4 z-[10000]" align="start" side="top">
            <TimeSlotPopoverContent
              onAdd={(slot) => {
                addSlot(slot)
                setPopoverOpen(false)
              }}
              onCancel={() => setPopoverOpen(false)}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Empty state */}
      {proposedSlots.length === 0 && (
        <div className="text-center py-4 text-sm text-slate-500 bg-white rounded border-2 border-dashed border-slate-200">
          Cliquez sur &quot;Ajouter un créneau&quot; pour proposer des disponibilités.
        </div>
      )}
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function MultiSlotResponseModal({
  isOpen,
  onClose,
  slots,
  interventionId,
  existingResponses,
  userProposedSlotIds,
  onSuccess
}: MultiSlotResponseModalProps) {
  // ============================================================================
  // STATE
  // ============================================================================

  const [slotResponses, setSlotResponses] = useState<Record<string, SlotResponse>>({})
  const [globalComment, setGlobalComment] = useState('')
  const [proposedSlots, setProposedSlots] = useState<ProposedSlot[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  useEffect(() => {
    if (isOpen && slots.length > 0) {
      // Initialize responses from existing or as pending
      const initial: Record<string, SlotResponse> = {}
      slots.forEach(slot => {
        const existing = existingResponses?.[slot.id]
        initial[slot.id] = {
          slotId: slot.id,
          response: existing?.response || 'pending',
          rejectionReason: existing?.reason
        }
      })
      setSlotResponses(initial)
      setGlobalComment('')
      setProposedSlots([])
      setError(null)
    }
  }, [isOpen, slots, existingResponses])

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const allRejected = useMemo(() => {
    const responses = Object.values(slotResponses)
    return responses.length > 0 && responses.every(r => r.response === 'reject')
  }, [slotResponses])

  const hasAccepted = useMemo(() => {
    return Object.values(slotResponses).some(r => r.response === 'accept')
  }, [slotResponses])

  const hasAtLeastOneResponse = useMemo(() => {
    return Object.values(slotResponses).some(r => r.response !== 'pending')
  }, [slotResponses])

  const isOnlySlot = slots.length === 1

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleSlotResponse = useCallback((slotId: string, response: SlotResponseType) => {
    setSlotResponses(prev => {
      const updated = { ...prev }

      // If accepting one slot, auto-reject all others that are still pending
      if (response === 'accept') {
        Object.keys(updated).forEach(id => {
          if (id !== slotId && updated[id].response === 'pending') {
            updated[id] = {
              ...updated[id],
              response: 'reject',
              rejectionReason: 'Autre créneau accepté'
            }
          }
        })
      }

      updated[slotId] = {
        slotId,
        response,
        rejectionReason: response === 'reject' ? '' : undefined
      }

      return updated
    })
    setError(null)
  }, [])

  const handleClose = useCallback(() => {
    if (!submitting) {
      onClose()
    }
  }, [submitting, onClose])

  const validateBeforeSubmit = useCallback((): { valid: boolean; error?: string } => {
    if (!hasAtLeastOneResponse) {
      return { valid: false, error: 'Veuillez répondre à au moins un créneau' }
    }

    if (allRejected && !globalComment.trim()) {
      return {
        valid: false,
        error: 'Veuillez expliquer pourquoi aucun créneau ne vous convient'
      }
    }

    if (allRejected && globalComment.trim().length < 10) {
      return {
        valid: false,
        error: 'L\'explication doit contenir au moins 10 caractères'
      }
    }

    return { valid: true }
  }, [hasAtLeastOneResponse, allRejected, globalComment])

  const handleSubmit = useCallback(async () => {
    const validation = validateBeforeSubmit()
    if (!validation.valid) {
      setError(validation.error || 'Validation échouée')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      // First withdraw any existing responses
      const existingSlotIds = Object.keys(existingResponses || {})
      for (const slotId of existingSlotIds) {
        const existing = existingResponses![slotId]
        if (existing.response !== 'pending') {
          await withdrawResponseAction(slotId, interventionId)
        }
      }

      // Submit new responses
      const responses = Object.values(slotResponses).filter(r => r.response !== 'pending')

      for (const response of responses) {
        if (response.response === 'accept') {
          const result = await acceptTimeSlotAction(response.slotId, interventionId)
          if (!result.success) {
            throw new Error(result.error || 'Erreur lors de l\'acceptation')
          }
        } else if (response.response === 'reject') {
          const reason = response.rejectionReason || globalComment || 'Créneau refusé'
          const result = await rejectTimeSlotAction(response.slotId, interventionId, reason)
          if (!result.success) {
            throw new Error(result.error || 'Erreur lors du refus')
          }
        }
      }

      // Submit proposed slots if any (only when all rejected)
      if (proposedSlots.length > 0) {
        const slotsForAction = proposedSlots.map(s => ({
          date: s.date,
          start_time: s.startTime,
          end_time: s.endTime,
        }))
        const proposeResult = await proposeTimeSlotsAction(interventionId, slotsForAction)
        if (!proposeResult.success) {
          throw new Error(proposeResult.error || 'Erreur lors de la proposition de créneaux')
        }
      }

      // Cancel previously-proposed counter-slots if user now accepts an existing slot
      if (hasAccepted && userProposedSlotIds && userProposedSlotIds.length > 0) {
        for (const proposedSlotId of userProposedSlotIds) {
          try {
            await cancelTimeSlotAction(proposedSlotId, interventionId)
          } catch (err) {
            console.warn('Failed to cancel proposed slot:', proposedSlotId, err)
          }
        }
      }

      toast.success(
        hasAccepted
          ? 'Créneau accepté avec succès'
          : 'Réponses enregistrées avec succès'
      )
      onClose()
      onSuccess?.()
      window.location.reload()
    } catch (err) {
      console.error('Error submitting responses:', err)
      const message = err instanceof Error ? err.message : 'Erreur lors de l\'enregistrement'
      toast.error(message)
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }, [
    validateBeforeSubmit,
    slotResponses,
    existingResponses,
    interventionId,
    globalComment,
    proposedSlots,
    hasAccepted,
    userProposedSlotIds,
    onClose,
    onSuccess
  ])

  // ============================================================================
  // RENDER
  // ============================================================================

  if (slots.length === 0) {
    return (
      <UnifiedModal open={isOpen} onOpenChange={handleClose} size="md">
        <UnifiedModalHeader
          title="Répondre aux créneaux"
          icon={<MessageSquare className="h-5 w-5" />}
        />
        <UnifiedModalBody>
          <Alert>
            <AlertDescription>
              Aucun créneau proposé pour cette intervention.
            </AlertDescription>
          </Alert>
        </UnifiedModalBody>
        <UnifiedModalFooter>
          <Button variant="outline" onClick={handleClose}>Fermer</Button>
        </UnifiedModalFooter>
      </UnifiedModal>
    )
  }

  return (
    <UnifiedModal
      open={isOpen}
      onOpenChange={handleClose}
      size="2xl"
      preventCloseOnOutsideClick={submitting}
      preventCloseOnEscape={submitting}
    >
      <UnifiedModalHeader
        title={isOnlySlot ? 'Répondre au créneau' : 'Répondre aux créneaux proposés'}
        subtitle={
          isOnlySlot
            ? 'Indiquez votre disponibilité pour ce créneau'
            : `${slots.length} créneau${slots.length > 1 ? 'x' : ''} proposé${slots.length > 1 ? 's' : ''} - Acceptez un créneau pour planifier l'intervention`
        }
        icon={<MessageSquare className="h-5 w-5" />}
      />

      <UnifiedModalBody className="max-h-[60vh] overflow-y-auto">
        <div className="space-y-4">
          {/* Flat responsive grid of slot cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {slots.map(slot => (
              <ModalSlotCard
                key={slot.id}
                slot={slot}
                response={slotResponses[slot.id] || { slotId: slot.id, response: 'pending' }}
                onResponseChange={(response) => handleSlotResponse(slot.id, response)}
                disabled={submitting}
              />
            ))}
          </div>

          <Separator />

          {/* Global comment */}
          <div className="space-y-2">
            <Label htmlFor="global-comment" className="text-sm font-medium">
              Commentaire {allRejected && <span className="text-destructive">*</span>}
            </Label>
            <Textarea
              id="global-comment"
              placeholder={
                allRejected
                  ? "Expliquez pourquoi aucun créneau ne vous convient..."
                  : "Ajoutez un commentaire (optionnel)..."
              }
              value={globalComment}
              onChange={(e) => {
                setGlobalComment(e.target.value)
                if (error) setError(null)
              }}
              rows={3}
              disabled={submitting}
              className={cn(
                allRejected && !globalComment.trim() && error && "border-destructive"
              )}
            />
            {allRejected && (
              <p className="text-xs text-muted-foreground">
                Minimum 10 caractères requis
              </p>
            )}
          </div>

          {/* Propose new slots section (only if all rejected) */}
          {allRejected && (
            <>
              <Separator />
              <ProposeSlots
                proposedSlots={proposedSlots}
                onSlotsChange={setProposedSlots}
                disabled={submitting}
              />
            </>
          )}

          {/* Error display */}
          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Info message */}
          <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-3">
            <p className="text-sm text-blue-700 dark:text-blue-400">
              <strong>Note:</strong> Vos réponses seront visibles par tous les participants.
              {hasAccepted && " Les autres créneaux seront automatiquement refusés."}
            </p>
          </div>
        </div>
      </UnifiedModalBody>

      <UnifiedModalFooter>
        <Button
          variant="outline"
          onClick={handleClose}
          disabled={submitting}
        >
          Annuler
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={submitting || !hasAtLeastOneResponse}
          className={cn(
            hasAccepted && "bg-green-600 hover:bg-green-700",
            allRejected && "bg-orange-600 hover:bg-orange-700"
          )}
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Enregistrement...
            </>
          ) : hasAccepted ? (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Confirmer le créneau
            </>
          ) : (
            'Enregistrer mes réponses'
          )}
        </Button>
      </UnifiedModalFooter>
    </UnifiedModal>
  )
}
