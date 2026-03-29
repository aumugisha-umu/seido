"use client"

import { useState, useCallback, memo, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { usePrefetch } from "@/hooks/use-prefetch"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MapPin, Clock, Loader2, CheckCircle, Eye, MoreVertical, Flame, Calendar, Edit } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  getStatusColor,
  getStatusLabel,
  getPendingParticipantsMessage,
  getPendingResponderNames,
  getPriorityColor,
  getPriorityLabel
} from "@/lib/intervention-utils"
import { shouldShowAlertBadge } from "@/lib/intervention-alert-utils"
import {
  getRoleBasedActions,
  getDotMenuActions,
  toButtonVariant,
  type UserRole,
  type RoleBasedAction
} from "@/lib/intervention-action-utils"
import { formatInterventionLocation } from "@/lib/utils/intervention-location"
import { InterventionTypeIcon } from "@/components/interventions/intervention-type-icon"
import { QuoteStatusBadge } from "@/components/interventions/quote-status-badge"
import { toast } from "sonner"
// ============================================================================
// TYPES
// ============================================================================

interface InterventionCardProps {
  /** Intervention data */
  intervention: {
    id: string
    title: string
    status: string
    urgency?: string
    description?: string
    reference?: string
    type?: string
    intervention_type?: any
    lot?: any
    building?: any
    location?: string
    scheduled_date?: string | null
    quotes?: any[]
    timeSlots?: any[]
    requires_quote?: boolean
    [key: string]: unknown
  }
  /** User role determines which actions to show */
  userRole: UserRole
  /** User ID (needed for some role-specific checks like prestataire quotes) */
  userId?: string
  /** Callback when an action successfully completes (card can be removed) */
  onActionComplete?: (interventionId: string) => void
  /** Enable success animations */
  enableAnimations?: boolean
  /** Custom action handlers to override default behavior */
  customActionHandlers?: {
    [key: string]: (intervention: any) => Promise<boolean>
  }
  /** Callback to open ProgrammingModal for start_planning action */
  onOpenProgrammingModal?: (intervention: any) => void
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * InterventionCard - Carte d'intervention avec boutons d'action adaptés au rôle
 *
 * Affiche une intervention avec:
 * - Titre et type de l'intervention
 * - Badge de statut avec message d'action contextuel
 * - Boutons d'action primaires générés selon le rôle
 * - Lien vers les détails
 *
 * @example
 * ```tsx
 * <InterventionCard
 *   intervention={intervention}
 *   userRole="prestataire"
 *   onActionComplete={(id) => removeFromList(id)}
 * />
 * ```
 */
export const InterventionCard = memo(function InterventionCard({
  intervention,
  userRole,
  userId,
  onActionComplete,
  enableAnimations = true,
  customActionHandlers,
  onOpenProgrammingModal
}: InterventionCardProps) {
  const router = useRouter()
  // Animation states
  const [isLoading, setIsLoading] = useState(false)
  const [loadingAction, setLoadingAction] = useState<string | null>(null)
  const [showCheckmark, setShowCheckmark] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)
  const [checkmarkColor, setCheckmarkColor] = useState('text-green-600')

  // Compute display values
  const urgency = intervention.urgency || 'normale'
  const isAlert = shouldShowAlertBadge(intervention as any, userRole, userId)

  // Message dynamique basé sur les réponses réelles aux créneaux
  // Affiche le nombre de personnes avec réponses en attente pour le statut planification
  const baseActionMessage = getPendingParticipantsMessage(intervention.status, intervention.timeSlots, userRole)
  const pendingNames = getPendingResponderNames(intervention.timeSlots)
  const pendingCount = pendingNames.length
  const actionMessage = intervention.status === 'planification' && pendingCount > 0
    ? `En attente de ${pendingCount} réponse${pendingCount > 1 ? 's' : ''}`
    : baseActionMessage
  // Determine if provider has a pending quote to act on
  const hasPendingQuote = userRole === 'prestataire' && intervention.requires_quote && (
    !intervention.quotes?.length ||
    intervention.quotes.some((q: any) =>
      (q.provider_id === userId || q.created_by === userId) &&
      (q.status === 'pending' || q.status === 'draft')
    ) ||
    !intervention.quotes.some((q: any) => q.provider_id === userId || q.created_by === userId)
  )
  const actions = getRoleBasedActions(intervention.id, intervention.status, userRole, {
    requiresQuote: intervention.requires_quote,
    hasPendingQuote
  })

  // Override labels when user has already responded to all active slots
  if (intervention.status === 'planification' && userId && intervention.timeSlots) {
    const activeSlots = intervention.timeSlots.filter(
      (s: any) => s.status === 'pending' || s.status === 'requested'
    )
    const hasRespondedToAll = activeSlots.length > 0 && activeSlots.every((slot: any) => {
      const userResp = slot.responses?.find((r: any) => r.user_id === userId)
      return userResp && userResp.response !== 'pending'
    })

    if (hasRespondedToAll) {
      for (const action of actions) {
        if (action.actionType === 'select_slot' || action.actionType === 'propose_timeslots') {
          action.label = 'Modifier mes réponses'
          action.icon = Edit
        }
      }
    }
  }

  const dotMenuActions = getDotMenuActions(intervention.id, intervention.status, userRole)

  // Generate intervention URL based on role
  const interventionUrl = useMemo(() => {
    switch (userRole) {
      case 'prestataire':
        return `/prestataire/interventions/${intervention.id}`
      case 'locataire':
        return `/locataire/interventions/${intervention.id}`
      default:
        return `/gestionnaire/operations/interventions/${intervention.id}`
    }
  }, [userRole, intervention.id])

  // ✅ Prefetch on hover - page loads instantly when user clicks
  const { onMouseEnter: prefetchOnEnter, onMouseLeave: prefetchOnLeave } = usePrefetch(interventionUrl)

  // Animation sequence for success
  const triggerSuccessAnimation = useCallback((actionType: string) => {
    if (!enableAnimations) {
      onActionComplete?.(intervention.id)
      return
    }

    // Set checkmark color based on action
    const colorMap: Record<string, string> = {
      approve: 'text-green-600',
      reject: 'text-red-600',
      finalize: 'text-blue-600',
      validate_work: 'text-green-600',
      mark_completed: 'text-green-600'
    }
    setCheckmarkColor(colorMap[actionType] || 'text-green-600')

    // Step 1: Show checkmark overlay
    setShowCheckmark(true)

    // Step 2: Slide out card
    setTimeout(() => {
      setIsRemoving(true)
    }, 500)

    // Step 3: Remove from list
    setTimeout(() => {
      onActionComplete?.(intervention.id)
    }, 1000)
  }, [enableAnimations, intervention.id, onActionComplete])

  // Handle API-based actions
  const handleApiAction = useCallback(async (action: RoleBasedAction) => {
    if (!action.apiRoute) return

    setIsLoading(true)
    setLoadingAction(action.actionType)

    try {
      // Check for custom handler first
      if (customActionHandlers?.[action.actionType]) {
        const success = await customActionHandlers[action.actionType](intervention)
        if (success) {
          toast("Action effectuée", { description: `${intervention.reference || intervention.id} - ${intervention.title}`, duration: 3000 })
          triggerSuccessAnimation(action.actionType)
        }
        return
      }

      // Default: Call API
      const response = await fetch(action.apiRoute, {
        method: action.apiMethod || 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interventionId: intervention.id })
      })
      const data = await response.json()

      if (data.success) {
        toast("Action effectuée", { description: `${intervention.reference || intervention.id} - ${intervention.title}`, duration: 3000 })
        triggerSuccessAnimation(action.actionType)
      } else {
        throw new Error(data.error || 'Erreur lors de l\'action')
      }
    } catch (error) {
      toast.error("Erreur", { description: error instanceof Error ? error.message : "Impossible d'effectuer l'action" })
      setIsLoading(false)
      setLoadingAction(null)
    }
  }, [intervention, customActionHandlers, triggerSuccessAnimation])

  // Handle action button click
  const handleActionClick = useCallback((action: RoleBasedAction) => {
    // Special handling for start_planning - open ProgrammingModal
    if (action.actionType === 'start_planning' && onOpenProgrammingModal) {
      onOpenProgrammingModal(intervention)
      return
    }

    if (action.apiRoute && !action.href) {
      // API action
      handleApiAction(action)
    } else if (action.href) {
      // Navigation action
      router.push(action.href)
    } else {
      // Fallback to detail page
      router.push(interventionUrl)
    }
  }, [handleApiAction, router, interventionUrl, onOpenProgrammingModal, intervention])

  // Check if user prefers reduced motion (memoized — matchMedia is a DOM API call)
  const prefersReducedMotion = useMemo(() =>
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  , [])

  return (
    <div
      className={cn(
        "group relative bg-card dark:bg-white/5 rounded-2xl p-4 sm:p-5 shadow-sm dark:shadow-none",
        "transition-all duration-300 border border-border dark:border-white/10",
        "hover:border-primary/30 hover:-translate-y-0.5 hover:shadow-md flex flex-col h-full dark:backdrop-blur-sm cursor-pointer",
        "will-change-transform",
        isRemoving && !prefersReducedMotion && "slide-out-right",
        isRemoving && prefersReducedMotion && "opacity-0"
      )}
      onMouseEnter={prefetchOnEnter}
      onMouseLeave={prefetchOnLeave}
      onClick={() => router.push(interventionUrl)}
    >
      {/* Checkmark Overlay (appears on success) */}
      {showCheckmark && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center bg-green-50/95 dark:bg-green-950/95 backdrop-blur-sm rounded-2xl animate-checkmark-appear"
          data-testid="checkmark-overlay"
        >
          <CheckCircle className={cn("h-16 w-16", checkmarkColor)} />
        </div>
      )}

      {/* Header: Icon + (Title + Badges) + Eye button (UNIFORM for all roles) */}
      <div className="flex items-start gap-3 mb-3">
        <InterventionTypeIcon
          type={intervention.type}
          interventionType={intervention.intervention_type}
          size="lg"
          className="mt-0.5"
        />

        {/* Title + Badges container */}
        <div className="flex-1 min-w-0">
          <Link href={interventionUrl} className="block" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors truncate cursor-pointer">
              {intervention.title}
            </h3>
          </Link>
          {/* Badges row - directly under title */}
          {/* Mobile: icon-only with tooltip | Desktop: icon + text */}
          <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap mt-1.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge className={cn(getPriorityColor(urgency), "text-xs border flex items-center gap-1 cursor-default")}>
                  <Flame className="h-3 w-3" aria-hidden="true" />
                  <span className="hidden sm:inline">{getPriorityLabel(urgency)}</span>
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="sm:hidden">
                {getPriorityLabel(urgency)}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge className={cn(getStatusColor(intervention.status), "text-xs border flex items-center gap-1 cursor-default")}>
                  <Calendar className="h-3 w-3" aria-hidden="true" />
                  <span className="hidden sm:inline">{getStatusLabel(intervention.status)}</span>
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="sm:hidden">
                {getStatusLabel(intervention.status)}
              </TooltipContent>
            </Tooltip>
            <QuoteStatusBadge
              quotes={intervention.quotes}
              requiresQuote={intervention.requires_quote}
              compact
            />
          </div>
        </div>

        {/* Eye button — quick access to details */}
        <Button
          variant="outline"
          size="icon"
          asChild
          className="flex-shrink-0 h-9 w-9 border-border/60 bg-muted/50 text-muted-foreground hover:bg-accent hover:text-accent-foreground hover:border-accent"
          title="Voir les details"
        >
          <Link href={interventionUrl} onClick={(e) => e.stopPropagation()}>
            <Eye className="h-5 w-5" aria-hidden="true" />
            <span className="sr-only">Voir les details</span>
          </Link>
        </Button>

        {/* Dot menu for secondary actions (Modify/Cancel) - only for gestionnaire on intermediate statuses */}
        {dotMenuActions.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="flex-shrink-0 h-8 w-8 text-muted-foreground hover:text-foreground"
                title="Plus d'actions"
              >
                <MoreVertical className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">Plus d'actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {dotMenuActions.map((action, idx) => (
                <DropdownMenuItem
                  key={idx}
                  onClick={(e) => { e.stopPropagation(); action.href && router.push(action.href) }}
                  className={cn(
                    action.variant === 'destructive' && 'text-red-600 focus:text-red-600 focus:bg-red-50'
                  )}
                >
                  <action.icon className="h-4 w-4 mr-2" aria-hidden="true" />
                  {action.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Status Banner - Action message + scheduled date/time inline */}
      <div className={cn(
        "border rounded-lg px-3 py-2 mb-3 w-full",
        isAlert
          ? 'bg-orange-50/80 border-orange-200 dark:bg-orange-500/15 dark:border-orange-500/40'
          : 'bg-blue-50/80 border-blue-200 dark:bg-blue-500/15 dark:border-blue-500/40',
      )}>
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0",
            isAlert ? 'bg-orange-100 dark:bg-orange-500/25' : 'bg-blue-100 dark:bg-blue-500/25'
          )}>
            <Clock className={cn("h-3 w-3", isAlert ? 'text-orange-600' : 'text-blue-600')} />
          </div>
          <p className={cn(
            "text-sm font-medium flex-1 min-w-0",
            isAlert ? 'text-orange-900 dark:text-orange-200' : 'text-blue-900 dark:text-blue-200'
          )}>
            {actionMessage}
          </p>
          {(() => {
            const selectedSlot = intervention.timeSlots?.find((s: any) => s.status === 'selected')
            const scheduledDate = selectedSlot?.slot_date || intervention.scheduled_date
            if (!scheduledDate) return null

            const date = new Date(scheduledDate)
            const formattedDate = date.toLocaleDateString('fr-FR', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })
            const startTime = selectedSlot?.start_time
            const formattedTime = startTime ? startTime.substring(0, 5) : null

            return (
              <span className={cn(
                "text-xs font-medium whitespace-nowrap flex-shrink-0",
                isAlert ? 'text-orange-700 dark:text-orange-300' : 'text-blue-700 dark:text-blue-300'
              )}>
                {formattedDate}{formattedTime ? ` · ${formattedTime}` : ''}
              </span>
            )
          })()}
        </div>
      </div>

      {/* Description */}
      {intervention.description && (
        <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
          {intervention.description}
        </p>
      )}

      {/* Location */}
      {(() => {
        const location = formatInterventionLocation(intervention)
        return (
          <div className="flex flex-col gap-0.5 text-sm text-muted-foreground mb-4">
            <div className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{location.primary}</span>
            </div>
            {location.address && (
              <span className="text-xs text-muted-foreground/80 ml-[22px] truncate">
                {location.address}
              </span>
            )}
          </div>
        )
      })()}

      {/* ACTION BUTTONS - All on single row */}
      {actions.length > 0 && (
        <div className="flex gap-2 mt-auto pt-4 border-t border-border">
          {actions.map((action, idx) => {
            const isGreenAction = ['approve', 'process_request', 'finalize', 'mark_completed', 'propose_slots', 'start_planning'].includes(action.actionType)
            const buttonVariant = isGreenAction
              ? toButtonVariant(action.variant)
              : action.variant === 'destructive'
                ? 'destructive' as const
                : action.variant === 'primary'
                  ? 'default' as const
                  : 'outline' as const
            return (
              <Button
                key={idx}
                variant={buttonVariant}
                size="default"
                onClick={(e) => { e.stopPropagation(); handleActionClick(action) }}
                disabled={isLoading}
                className={cn(
                  "flex-1 min-w-0 justify-center min-h-[44px]",
                  isGreenAction && "bg-green-600 hover:bg-green-700 text-white",
                )}
                aria-label={`${action.label} l'intervention ${intervention.reference || intervention.id}`}
              >
                {isLoading && loadingAction === action.actionType ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    En cours...
                  </>
                ) : (
                  <>
                    <action.icon className="h-4 w-4 mr-2 shrink-0" aria-hidden="true" />
                    <span className="truncate">{action.label}</span>
                  </>
                )}
              </Button>
            )
          })}
        </div>
      )}
    </div>
  )
})

// ⚡ React.memo prevents re-renders when props haven't changed
// This is especially important for intervention lists with many cards

// Backward compatibility alias
export { InterventionCard as PendingActionsCard }
