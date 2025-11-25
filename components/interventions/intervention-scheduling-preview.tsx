"use client"

/**
 * Intervention Scheduling Preview Component
 * Displays planning information in read-only mode: participants, estimation, and scheduling method
 */

import { useState } from 'react'
import { ContactSection } from "@/components/ui/contact-section"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { QuoteRequestCard } from "@/components/quotes/quote-request-card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  Users,
  Clock,
  CalendarDays,
  FileText,
  Calendar,
  Check,
  Edit,
  Edit3,
  X,
  Shield,
  Wrench,
  Home,
  CheckCircle,
  XCircle,
  AlertCircle,
  User,
  MoreVertical
} from "lucide-react"
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { ChooseTimeSlotModal } from '@/components/intervention/modals/choose-time-slot-modal'
import type { Database } from '@/lib/database.types'

type UserRow = Database['public']['Tables']['users']['Row']
type Quote = Database['public']['Tables']['intervention_quotes']['Row'] & {
  provider?: UserRow
}

type TimeSlotResponse = Database['public']['Tables']['time_slot_responses']['Row'] & {
  user?: UserRow
}

type FullTimeSlot = Database['public']['Tables']['intervention_time_slots']['Row'] & {
  proposed_by_user?: UserRow
  responses?: TimeSlotResponse[]
}

interface Contact {
  id: string
  name: string
  email: string
  phone?: string | null
  type?: "gestionnaire" | "prestataire" | "locataire"
}

interface SimpleTimeSlot {
  date: string
  startTime: string
  endTime: string
}

interface InterventionSchedulingPreviewProps {
  // Participants
  managers?: Contact[]
  providers?: Contact[]
  tenants?: Contact[]

  // Estimation
  requireQuote?: boolean
  quotes?: Quote[]

  // Scheduling method
  schedulingType?: "fixed" | "slots" | "flexible" | null
  scheduledDate?: string | null
  schedulingSlots?: SimpleTimeSlot[] | null

  // Full time slots for compact card display
  fullTimeSlots?: FullTimeSlot[] | null

  // Actions for slots
  onOpenProgrammingModal?: () => void
  onCancelSlot?: (slot: FullTimeSlot) => void
  onApproveSlot?: (slot: FullTimeSlot) => void
  onRejectSlot?: (slot: FullTimeSlot) => void
  onEditSlot?: (slot: FullTimeSlot) => void
  canManageSlots?: boolean
  currentUserId?: string

  // Current user role for role-specific UI
  currentUserRole?: 'admin' | 'gestionnaire' | 'locataire' | 'prestataire' | 'proprietaire'

  // Actions for participants and quotes
  onEditParticipants?: () => void
  onEditQuotes?: () => void

  // Quote actions
  onCancelQuoteRequest?: (quoteId: string) => void

  // Modify choice action (when user has already responded)
  onModifyChoice?: (slot: FullTimeSlot, currentResponse: 'accepted' | 'rejected') => void
}

export function InterventionSchedulingPreview({
  managers = [],
  providers = [],
  tenants = [],
  requireQuote = false,
  quotes = [],
  schedulingType = null,
  scheduledDate = null,
  schedulingSlots = null,
  fullTimeSlots = null,
  onOpenProgrammingModal,
  onCancelSlot,
  onApproveSlot,
  onRejectSlot,
  onEditSlot,
  canManageSlots = false,
  currentUserId,
  currentUserRole,
  onEditParticipants,
  onEditQuotes,
  onCancelQuoteRequest,
  onModifyChoice
}: InterventionSchedulingPreviewProps) {
  // State for choose time slot modal
  const [selectedSlotToChoose, setSelectedSlotToChoose] = useState<FullTimeSlot | null>(null)
  const [hasActiveQuotes, setHasActiveQuotes] = useState(false)

  // Handler to open choose time slot modal
  const handleChooseSlot = (slot: FullTimeSlot) => {
    const hasActive = quotes.some(q => ['pending', 'sent'].includes(q.status))
    setHasActiveQuotes(hasActive)
    setSelectedSlotToChoose(slot)
  }

  // Helper to get the current user's response for a slot
  const getUserResponse = (slot: FullTimeSlot) => {
    if (!slot.responses || !currentUserId) return null
    return slot.responses.find(r => r.user_id === currentUserId)
  }

  // Format date and time
  const formatDateTime = (date: string) => {
    try {
      return format(new Date(date), 'dd MMMM yyyy à HH:mm', { locale: fr })
    } catch {
      return date
    }
  }

  const formatDate = (date: string) => {
    try {
      return format(new Date(date), 'dd MMMM yyyy', { locale: fr })
    } catch {
      return date
    }
  }

  const formatTime = (time: string) => {
    return time
  }

  // Helper: Get status badge variant
  const getStatusVariant = (status: FullTimeSlot['status']) => {
    switch (status) {
      case 'requested':
        return 'default'
      case 'pending':
        return 'secondary'
      case 'selected':
        return 'success'
      case 'rejected':
        return 'destructive'
      case 'cancelled':
        return 'outline'
      default:
        return 'default'
    }
  }

  // Helper: Get status label
  const getStatusLabel = (status: FullTimeSlot['status']) => {
    switch (status) {
      case 'requested':
        return 'Demandé'
      case 'pending':
        return 'En attente'
      case 'selected':
        return 'Sélectionné'
      case 'rejected':
        return 'Rejeté'
      case 'cancelled':
        return 'Annulé'
      default:
        return status
    }
  }

  // Helper: Get role label
  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Admin'
      case 'gestionnaire':
        return 'Gestionnaire'
      case 'prestataire':
        return 'Prestataire'
      case 'locataire':
        return 'Locataire'
      default:
        return role
    }
  }

  // Get response statistics for a slot
  const getResponseStats = (slot: FullTimeSlot) => {
    if (!slot.responses) {
      return { accepted: [], rejected: [], pending: [] }
    }

    const accepted = slot.responses.filter(r => r.response === 'accepted')
    const rejected = slot.responses.filter(r => r.response === 'rejected')
    const pending = slot.responses.filter(r => r.response === 'pending')

    return { accepted, rejected, pending }
  }

  // Check if slot can be finalized
  const canBeFinalized = (slot: FullTimeSlot) => {
    if (!slot.responses || slot.responses.length === 0) return false

    const hasTenantAcceptance = slot.responses.some(
      r => r.user_role === 'locataire' && r.response === 'accepted'
    )
    const hasProviderAcceptance = slot.responses.some(
      r => r.user_role === 'prestataire' && r.response === 'accepted'
    )

    return hasTenantAcceptance && hasProviderAcceptance
  }

  // Group full slots by date
  const groupedFullSlots = fullTimeSlots?.reduce((acc, slot) => {
    const date = format(new Date(slot.slot_date), 'yyyy-MM-dd')
    if (!acc[date]) acc[date] = []
    acc[date].push(slot)
    return acc
  }, {} as Record<string, FullTimeSlot[]>) || {}

  // Get dynamic section title based on who proposed the slots and current user role
  const getSlotsSectionTitle = () => {
    if (!fullTimeSlots || fullTimeSlots.length === 0) return "Créneaux proposés"

    // Use proposed_by_user.role (immutable) instead of status (changes after validation)
    const hasGestionnaireSlots = fullTimeSlots.some(
      s => s.proposed_by_user?.role === 'gestionnaire' || s.proposed_by_user?.role === 'admin'
    )
    const hasProviderSlots = fullTimeSlots.some(
      s => s.proposed_by_user?.role === 'prestataire'
    )

    // Adapt title for prestataire viewing gestionnaire-proposed slots
    if (currentUserRole === 'prestataire' && hasGestionnaireSlots) {
      return "Créneaux proposés par le gestionnaire"
    }

    if (hasGestionnaireSlots && hasProviderSlots) {
      return "Créneaux proposés (gestionnaire & prestataire)"
    } else if (hasProviderSlots) {
      return "Disponibilités proposées par le prestataire"
    } else {
      return "Créneaux proposés"
    }
  }

  // Get subtitle based on current user role
  const getSlotsSubtitle = (count: number) => {
    if (currentUserRole === 'prestataire') {
      return `Sélectionnez un créneau qui vous convient parmi ${count > 1 ? 'les ' + count + ' propositions' : 'la proposition'}`
    }
    if (currentUserRole === 'locataire') {
      return `Sélectionnez un créneau parmi ${count} option${count > 1 ? 's' : ''}`
    }
    return `Les participants peuvent choisir parmi ${count} créneau${count > 1 ? 'x' : ''}`
  }

  return (
    <div className="space-y-10">
      {/* 1. Participants Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-muted-foreground" />
          <h4 className="text-sm font-medium">Participants</h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Gestionnaires */}
          <ContactSection
            sectionType="managers"
            contacts={managers}
            readOnly={true}
            customLabel="Gestionnaire(s) assigné(s)"
          />

          {/* Prestataires */}
          <ContactSection
            sectionType="providers"
            contacts={providers}
            readOnly={true}
            customLabel="Prestataire(s) à contacter"
          />

          {/* Locataires */}
          <ContactSection
            sectionType="tenants"
            contacts={tenants}
            readOnly={true}
            customLabel="Locataire(s) concerné(s)"
          />
        </div>
      </div>

      {/* 2. Estimation Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <h4 className="text-sm font-medium">Estimation préalable</h4>
        </div>

        {/* Estimations received */}
        {requireQuote && quotes.length > 0 ? (
          <div className="flex gap-3 overflow-x-auto pb-2 scroll-smooth snap-x snap-mandatory items-stretch">
            {quotes.map(quote => (
              <div key={quote.id} className="min-w-[320px] max-w-[400px] flex-shrink-0 snap-start flex">
                <QuoteRequestCard
                  request={quote}
                  onCancelRequest={onCancelQuoteRequest}
                  className="flex-1"
                />
              </div>
            ))}
          </div>
        ) : requireQuote ? (
          <div className="p-4 bg-amber-50/30 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              En attente d&apos;estimation du prestataire
            </p>
          </div>
        ) : (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
            <p className="text-sm text-muted-foreground">
              Pas d&apos;estimation demandée pour cette intervention
            </p>
          </div>
        )}
      </div>

      {/* 3. Scheduling Method Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <h4 className="text-sm font-medium">Méthode de planification</h4>
        </div>

        {schedulingType === "fixed" && scheduledDate && (
          <div className="p-4 bg-blue-50/30 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                <CalendarDays className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <h5 className="font-semibold text-sm text-blue-900 mb-1">
                  Rendez-vous fixé
                </h5>
                <p className="text-sm text-blue-700">
                  {formatDateTime(scheduledDate)}
                </p>
              </div>
            </div>
          </div>
        )}

        {schedulingType === "slots" && fullTimeSlots && fullTimeSlots.length > 0 ? (
          <div className="p-4 bg-purple-50/30 border border-purple-200 rounded-lg space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                <Clock className="h-5 w-5 text-purple-600" />
              </div>
              <div className="flex-1">
                <h5 className="font-semibold text-sm text-purple-900 mb-1">
                  {getSlotsSectionTitle()}
                </h5>
                <p className="text-xs text-purple-700 mb-3">
                  {getSlotsSubtitle(fullTimeSlots.length)}
                </p>

                {/* Compact slot cards grouped by date - horizontal scroll */}
                <div className="space-y-3">
                  {Object.entries(groupedFullSlots).map(([date, slots]) => (
                    <div key={date} className="space-y-2">
                      <h6 className="text-xs font-medium text-purple-800">
                        {format(new Date(date), 'EEEE dd MMMM yyyy', { locale: fr })}
                      </h6>
                      <div className="flex gap-3 overflow-x-auto pb-2 scroll-smooth snap-x snap-mandatory">
                        {slots.map((slot) => {
                          return (
                            <div
                              key={slot.id}
                              className={`
                                min-w-[280px] max-w-[320px] flex-shrink-0 snap-start
                                p-3 rounded-lg border transition-colors
                                ${slot.status === 'selected'
                                  ? 'bg-green-50 border-green-300'
                                  : slot.status === 'cancelled'
                                  ? 'bg-gray-50 border-gray-200 opacity-60'
                                  : 'bg-white border-purple-200'
                                }
                              `}
                            >
                              <div className="space-y-2">
                                {/* Header: Time + Status */}
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                                    <span className="text-sm font-medium">
                                      {slot.start_time?.substring(0, 5)} - {slot.end_time?.substring(0, 5)}
                                    </span>
                                  </div>
                                  <Badge variant={getStatusVariant(slot.status)} className="text-xs h-5">
                                    {slot.status === 'selected' && <Check className="w-3 h-3 mr-1" />}
                                    {getStatusLabel(slot.status)}
                                  </Badge>
                                </div>

                                {/* Validation Indicator - compact */}
                                {slot.status !== 'selected' && slot.status !== 'cancelled' && slot.status !== 'rejected' && (
                                  <div>
                                    {canBeFinalized(slot) ? (
                                      <Badge className="bg-green-50 border-green-300 text-green-800 text-xs h-5">
                                        <CheckCircle className="w-3 h-3 mr-1" />
                                        Prêt à finaliser
                                      </Badge>
                                    ) : (
                                      <Badge className="bg-amber-50 border-amber-300 text-amber-800 text-xs h-5">
                                        <Clock className="w-3 h-3 mr-1" />
                                        En attente de validation
                                      </Badge>
                                    )}
                                  </div>
                                )}

                                {/* Compact Response Badges */}
                                {(() => {
                                  const stats = getResponseStats(slot)
                                  // Filter out the proposer from all lists
                                  const filteredAccepted = stats.accepted.filter(r => r.user_id !== slot.proposed_by)
                                  const filteredRejected = stats.rejected.filter(r => r.user_id !== slot.proposed_by)
                                  const filteredPending = stats.pending.filter(r => r.user_id !== slot.proposed_by)
                                  const hasResponses = filteredAccepted.length > 0 || filteredRejected.length > 0 || filteredPending.length > 0

                                  if (!hasResponses) return null

                                  return (
                                    <TooltipProvider>
                                      <div className="space-y-1.5">
                                        {/* Accepted responses (excluding proposer) */}
                                        {filteredAccepted.length > 0 && (
                                          <div className="flex flex-wrap items-center gap-1">
                                            <span className="text-xs text-green-700 font-medium flex items-center gap-1">
                                              <CheckCircle className="w-3 h-3" />
                                              Accepté:
                                            </span>
                                            {filteredAccepted.map((response) => (
                                              <Badge
                                                key={response.id}
                                                variant="outline"
                                                className="text-xs h-5 gap-0.5 border-green-300 bg-green-50 text-green-800"
                                              >
                                                {response.user?.name || 'Utilisateur'}
                                                {response.user_role === 'gestionnaire' && <Shield className="w-2.5 h-2.5" />}
                                                {response.user_role === 'prestataire' && <Wrench className="w-2.5 h-2.5" />}
                                                {response.user_role === 'locataire' && <Home className="w-2.5 h-2.5" />}
                                              </Badge>
                                            ))}
                                          </div>
                                        )}

                                        {/* Rejected responses (excluding proposer) */}
                                        {filteredRejected.length > 0 && (
                                          <div className="flex flex-wrap items-center gap-1">
                                            <span className="text-xs text-orange-700 font-medium flex items-center gap-1">
                                              <XCircle className="w-3 h-3" />
                                              Rejeté:
                                            </span>
                                            {filteredRejected.map((response) => (
                                              <Tooltip key={response.id}>
                                                <TooltipTrigger asChild>
                                                  <Badge
                                                    variant="outline"
                                                    className="text-xs h-5 gap-0.5 border-orange-300 bg-orange-50 text-orange-800 cursor-help"
                                                  >
                                                    {response.user?.name || 'Utilisateur'}
                                                    {response.user_role === 'gestionnaire' && <Shield className="w-2.5 h-2.5" />}
                                                    {response.user_role === 'prestataire' && <Wrench className="w-2.5 h-2.5" />}
                                                    {response.user_role === 'locataire' && <Home className="w-2.5 h-2.5" />}
                                                  </Badge>
                                                </TooltipTrigger>
                                                <TooltipContent className="max-w-xs">
                                                  <p className="font-semibold mb-1">Raison du rejet:</p>
                                                  <p className="text-sm">{response.notes || 'Aucune raison fournie'}</p>
                                                </TooltipContent>
                                              </Tooltip>
                                            ))}
                                          </div>
                                        )}

                                        {/* Pending responses (excluding proposer) */}
                                        {filteredPending.length > 0 && (
                                          <div className="flex flex-wrap items-center gap-1">
                                            <span className="text-xs text-gray-600 font-medium flex items-center gap-1">
                                              <Clock className="w-3 h-3" />
                                              En attente:
                                            </span>
                                            {filteredPending.map((response) => (
                                              <Badge
                                                key={response.id}
                                                variant="outline"
                                                className="text-xs h-5 gap-0.5 border-gray-300 bg-gray-50 text-gray-700"
                                              >
                                                {response.user?.name || 'Utilisateur'}
                                                {response.user_role === 'gestionnaire' && <Shield className="w-2.5 h-2.5" />}
                                                {response.user_role === 'prestataire' && <Wrench className="w-2.5 h-2.5" />}
                                                {response.user_role === 'locataire' && <Home className="w-2.5 h-2.5" />}
                                              </Badge>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </TooltipProvider>
                                  )
                                })()}

                                {/* Proposer - compact */}
                                {slot.proposed_by_user && (
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <User className="w-3 h-3" />
                                    <span>Proposé par {slot.proposed_by_user.name}</span>
                                    <span className="text-muted-foreground/60">
                                      ({getRoleLabel(slot.proposed_by_user.role)})
                                    </span>
                                  </div>
                                )}

                                {/* Action Buttons - only for active slots */}
                                {canManageSlots && slot.status !== 'selected' && slot.status !== 'cancelled' && slot.status !== 'rejected' && (() => {
                                  const userResponse = getUserResponse(slot)
                                  const hasResponded = userResponse && userResponse.response !== 'pending'

                                  return (
                                  <div className="flex gap-2 mt-2 pt-2 border-t border-gray-100">
                                    {currentUserRole === 'prestataire' || currentUserRole === 'locataire' ? (
                                      // Prestataire/Locataire viewing gestionnaire-proposed slots
                                      slot.proposed_by_user?.role === 'gestionnaire' || slot.proposed_by_user?.role === 'admin' ? (
                                        hasResponded ? (
                                          // User has already responded → Show "Modifier le choix"
                                          onModifyChoice && (
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              className="flex-1 h-7 text-xs text-blue-700 border-blue-300 hover:bg-blue-50"
                                              onClick={() => onModifyChoice(slot, userResponse.response as 'accepted' | 'rejected')}
                                            >
                                              <Edit3 className="w-3 h-3 mr-1" />
                                              Modifier le choix
                                            </Button>
                                          )
                                        ) : (
                                          // User hasn't responded yet → Show Accepter/Rejeter
                                          <>
                                            {onApproveSlot && (
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                className="flex-1 h-7 text-xs text-green-700 border-green-300 hover:bg-green-50"
                                                onClick={() => onApproveSlot(slot)}
                                              >
                                                <Check className="w-3 h-3 mr-1" />
                                                Accepter
                                              </Button>
                                            )}
                                            {onRejectSlot && (
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                className="flex-1 h-7 text-xs text-red-700 border-red-300 hover:bg-red-50"
                                                onClick={() => onRejectSlot(slot)}
                                              >
                                                <X className="w-3 h-3 mr-1" />
                                                Rejeter
                                              </Button>
                                            )}
                                          </>
                                        )
                                      ) : null
                                    ) : slot.proposed_by_user?.role === 'prestataire' ? (
                                      // Gestionnaire viewing prestataire-proposed slots → Approuver/Rejeter
                                      <>
                                        {onApproveSlot && (
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="flex-1 h-7 text-xs text-green-700 border-green-300 hover:bg-green-50"
                                            onClick={() => onApproveSlot(slot)}
                                          >
                                            <Check className="w-3 h-3 mr-1" />
                                            Approuver
                                          </Button>
                                        )}
                                        {onRejectSlot && (
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="flex-1 h-7 text-xs text-red-700 border-red-300 hover:bg-red-50"
                                            onClick={() => onRejectSlot(slot)}
                                          >
                                            <X className="w-3 h-3 mr-1" />
                                            Rejeter
                                          </Button>
                                        )}
                                      </>
                                    ) : (
                                      // Gestionnaire viewing own slots → Modifier/Annuler
                                      <>
                                        {onEditSlot && (
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="flex-1 h-7 text-xs"
                                            onClick={() => onEditSlot(slot)}
                                          >
                                            <Edit className="w-3 h-3 mr-1" />
                                            Modifier
                                          </Button>
                                        )}
                                        {onCancelSlot && (
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="flex-1 h-7 text-xs text-red-700 border-red-300 hover:bg-red-50"
                                            onClick={() => onCancelSlot(slot)}
                                          >
                                            <X className="w-3 h-3 mr-1" />
                                            Annuler
                                          </Button>
                                        )}

                                        {/* Dot menu - Choose time slot */}
                                        {canManageSlots && currentUserRole === 'gestionnaire' && slot.status !== 'cancelled' && slot.status !== 'selected' && slot.status !== 'rejected' && (
                                          <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                                                <MoreVertical className="h-3.5 w-3.5" />
                                              </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                              <DropdownMenuItem onClick={() => handleChooseSlot(slot)}>
                                                <CheckCircle className="mr-2 h-4 w-4" />
                                                Choisir cet horaire
                                              </DropdownMenuItem>
                                            </DropdownMenuContent>
                                          </DropdownMenu>
                                        )}
                                      </>
                                    )}
                                  </div>
                                  )
                                })()}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : schedulingType === "slots" && schedulingSlots && schedulingSlots.length > 0 && (
          // Fallback to simple display if fullTimeSlots not provided
          <div className="p-4 bg-purple-50/30 border border-purple-200 rounded-lg space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                <Clock className="h-5 w-5 text-purple-600" />
              </div>
              <div className="flex-1">
                <h5 className="font-semibold text-sm text-purple-900 mb-1">
                  Créneaux proposés
                </h5>
                <p className="text-xs text-purple-700 mb-3">
                  Les participants peuvent choisir parmi {schedulingSlots.length} créneau{schedulingSlots.length > 1 ? 'x' : ''}
                </p>

                <div className="space-y-2">
                  {schedulingSlots.map((slot, index) => (
                    <div
                      key={index}
                      className="p-2 bg-white border border-purple-200 rounded text-sm"
                    >
                      <span className="font-medium text-slate-700">Créneau {index + 1}:</span>{' '}
                      <span className="text-slate-600">
                        {formatDate(slot.date)} de {formatTime(slot.startTime)} à {formatTime(slot.endTime)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {schedulingType === "flexible" && (
          <div className="p-4 bg-emerald-50/30 border border-emerald-200 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <Users className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="flex-1">
                <h5 className="font-semibold text-sm text-emerald-900 mb-1">
                  Coordination autonome
                </h5>
                <p className="text-sm text-emerald-700 leading-relaxed">
                  Les participants se coordonnent directement entre eux pour fixer le rendez-vous.
                </p>
              </div>
            </div>
          </div>
        )}

        {!schedulingType && (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
            <p className="text-sm text-muted-foreground text-center">
              Aucune méthode de planification définie
            </p>
          </div>
        )}
      </div>

      {/* Choose Time Slot Modal */}
      {selectedSlotToChoose && fullTimeSlots && fullTimeSlots.length > 0 && (
        <ChooseTimeSlotModal
          slot={selectedSlotToChoose}
          interventionId={selectedSlotToChoose.intervention_id}
          hasActiveQuotes={hasActiveQuotes}
          open={!!selectedSlotToChoose}
          onOpenChange={(open) => !open && setSelectedSlotToChoose(null)}
          onSuccess={() => {
            setSelectedSlotToChoose(null)
          }}
        />
      )}
    </div>
  )
}
