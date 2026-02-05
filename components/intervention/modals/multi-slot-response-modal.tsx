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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { DatePicker } from '@/components/ui/date-picker'
import { TimePicker24h } from '@/components/ui/time-picker-24h'
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Loader2,
  AlertCircle,
  Plus,
  Trash2,
  User,
  HelpCircle
} from 'lucide-react'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { toast } from 'sonner'
import {
  acceptTimeSlotAction,
  rejectTimeSlotAction,
  withdrawResponseAction
} from '@/app/actions/intervention-actions'
import { cn } from '@/lib/utils'

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

      <HoverCardContent className="w-72" align="end" side="top">
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

interface SlotCardProps {
  slot: TimeSlot
  response: SlotResponse
  onResponseChange: (response: SlotResponseType) => void
  disabled: boolean
  isOnlySlot: boolean
}

function SlotCard({ slot, response, onResponseChange, disabled, isOnlySlot }: SlotCardProps) {
  const isPast = new Date(`${slot.slot_date}T${slot.start_time}`) < new Date()

  return (
    <div className={cn(
      "p-4 rounded-lg border transition-all",
      response.response === 'accept' && "border-green-300 bg-green-50/50",
      response.response === 'reject' && "border-orange-300 bg-orange-50/50",
      response.response === 'pending' && "border-slate-200 bg-slate-50/50",
      isPast && "opacity-60"
    )}>
      {/* Slot info */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-sm font-medium">
            <Clock className="h-4 w-4 text-muted-foreground" />
            {slot.start_time.substring(0, 5)} - {slot.end_time.substring(0, 5)}
          </div>
          {slot.proposer_name && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <User className="h-3.5 w-3.5" />
              <span>{slot.proposer_name}</span>
              {slot.proposer_role && (
                <Badge variant="secondary" className="text-xs capitalize">
                  {slot.proposer_role}
                </Badge>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ResponseIndicators slot={slot} />
          {isPast && (
            <Badge variant="destructive" className="text-xs">Expiré</Badge>
          )}
        </div>
      </div>

      {/* Response selection */}
      <RadioGroup
        value={response.response}
        onValueChange={(value) => onResponseChange(value as SlotResponseType)}
        className="flex gap-2"
        disabled={disabled || isPast}
      >
        <label
          className={cn(
            "flex-1 flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors",
            response.response === 'accept'
              ? "border-green-500 bg-green-100"
              : "border-slate-200 hover:bg-slate-50",
            (disabled || isPast) && "cursor-not-allowed opacity-50"
          )}
        >
          <RadioGroupItem value="accept" className="sr-only" />
          <CheckCircle2 className={cn(
            "h-4 w-4",
            response.response === 'accept' ? "text-green-600" : "text-slate-400"
          )} />
          <span className={cn(
            "text-sm font-medium",
            response.response === 'accept' ? "text-green-700" : "text-slate-600"
          )}>
            Accepter
          </span>
        </label>

        <label
          className={cn(
            "flex-1 flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors",
            response.response === 'reject'
              ? "border-orange-500 bg-orange-100"
              : "border-slate-200 hover:bg-slate-50",
            (disabled || isPast) && "cursor-not-allowed opacity-50"
          )}
        >
          <RadioGroupItem value="reject" className="sr-only" />
          <XCircle className={cn(
            "h-4 w-4",
            response.response === 'reject' ? "text-orange-600" : "text-slate-400"
          )} />
          <span className={cn(
            "text-sm font-medium",
            response.response === 'reject' ? "text-orange-700" : "text-slate-600"
          )}>
            Refuser
          </span>
        </label>

        {!isOnlySlot && (
          <label
            className={cn(
              "flex-1 flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors",
              response.response === 'pending'
                ? "border-slate-400 bg-slate-100"
                : "border-slate-200 hover:bg-slate-50",
              (disabled || isPast) && "cursor-not-allowed opacity-50"
            )}
          >
            <RadioGroupItem value="pending" className="sr-only" />
            <div className={cn(
              "h-4 w-4 rounded-full border-2",
              response.response === 'pending' ? "border-slate-500" : "border-slate-300"
            )} />
            <span className={cn(
              "text-sm font-medium",
              response.response === 'pending' ? "text-slate-700" : "text-slate-500"
            )}>
              En attente
            </span>
          </label>
        )}
      </RadioGroup>
    </div>
  )
}

// ============================================================================
// PROPOSE SLOTS SECTION
// ============================================================================

interface ProposeSlotsProps {
  proposedSlots: ProposedSlot[]
  onSlotsChange: (slots: ProposedSlot[]) => void
  disabled: boolean
}

function ProposeSlots({ proposedSlots, onSlotsChange, disabled }: ProposeSlotsProps) {
  const addSlot = () => {
    onSlotsChange([...proposedSlots, { date: '', startTime: '09:00', endTime: '12:00' }])
  }

  const removeSlot = (index: number) => {
    onSlotsChange(proposedSlots.filter((_, i) => i !== index))
  }

  const updateSlot = (index: number, field: keyof ProposedSlot, value: string) => {
    const updated = [...proposedSlots]
    updated[index] = { ...updated[index], [field]: value }
    onSlotsChange(updated)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Proposer d&apos;autres créneaux (optionnel)</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addSlot}
          disabled={disabled}
        >
          <Plus className="h-4 w-4 mr-1" />
          Ajouter
        </Button>
      </div>

      {proposedSlots.length > 0 && (
        <div className="space-y-2">
          {proposedSlots.map((slot, index) => (
            <div key={index} className="flex items-center gap-2 p-3 rounded-lg border bg-slate-50">
              <DatePicker
                value={slot.date}
                onChange={(value) => updateSlot(index, 'date', value)}
                minDate={new Date().toISOString().split('T')[0]}
                className="flex-1"
                disabled={disabled}
              />
              <TimePicker24h
                value={slot.startTime}
                onChange={(value) => updateSlot(index, 'startTime', value)}
                disabled={disabled}
              />
              <span className="text-muted-foreground">-</span>
              <TimePicker24h
                value={slot.endTime}
                onChange={(value) => updateSlot(index, 'endTime', value)}
                disabled={disabled}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeSlot(index)}
                disabled={disabled}
                className="text-red-500 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
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

  const groupedSlots = useMemo(() => {
    return slots.reduce((acc, slot) => {
      const dateKey = slot.slot_date
      if (!acc[dateKey]) {
        acc[dateKey] = []
      }
      acc[dateKey].push(slot)
      return acc
    }, {} as Record<string, TimeSlot[]>)
  }, [slots])

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

      // TODO: Handle proposed slots if needed (call proposeTimeSlotsAction)

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
    hasAccepted,
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
      size="lg"
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
          {/* Slots grouped by date */}
          {Object.entries(groupedSlots).map(([date, dateSlots]) => (
            <Card key={date}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(date), 'EEEE d MMMM yyyy', { locale: fr })}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {dateSlots.map(slot => (
                  <SlotCard
                    key={slot.id}
                    slot={slot}
                    response={slotResponses[slot.id] || { slotId: slot.id, response: 'pending' }}
                    onResponseChange={(response) => handleSlotResponse(slot.id, response)}
                    disabled={submitting}
                    isOnlySlot={isOnlySlot}
                  />
                ))}
              </CardContent>
            </Card>
          ))}

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
