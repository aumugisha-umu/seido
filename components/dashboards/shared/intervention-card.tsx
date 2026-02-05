"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MapPin, Clock, Loader2, CheckCircle, Eye, MoreVertical, Flame, Calendar } from "lucide-react"
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
import { useToast } from "@/hooks/use-toast"

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
export function InterventionCard({
  intervention,
  userRole,
  userId,
  onActionComplete,
  enableAnimations = true,
  customActionHandlers,
  onOpenProgrammingModal
}: InterventionCardProps) {
  const router = useRouter()
  const { toast } = useToast()

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
  const actions = getRoleBasedActions(intervention.id, intervention.status, userRole)
  const dotMenuActions = getDotMenuActions(intervention.id, intervention.status, userRole)

  // Generate intervention URL based on role
  const getInterventionUrl = useCallback(() => {
    switch (userRole) {
      case 'prestataire':
        return `/prestataire/interventions/${intervention.id}`
      case 'locataire':
        return `/locataire/interventions/${intervention.id}`
      default:
        return `/gestionnaire/interventions/${intervention.id}`
    }
  }, [userRole, intervention.id])

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
          toast({
            title: "Action effectuée",
            description: `${intervention.reference || intervention.id} - ${intervention.title}`,
            variant: "default",
            duration: 3000
          })
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
        toast({
          title: "Action effectuée",
          description: `${intervention.reference || intervention.id} - ${intervention.title}`,
          variant: "default",
          duration: 3000
        })
        triggerSuccessAnimation(action.actionType)
      } else {
        throw new Error(data.error || 'Erreur lors de l\'action')
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible d'effectuer l'action",
        variant: "destructive"
      })
      setIsLoading(false)
      setLoadingAction(null)
    }
  }, [intervention, customActionHandlers, toast, triggerSuccessAnimation])

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
      router.push(getInterventionUrl())
    }
  }, [handleApiAction, router, getInterventionUrl, onOpenProgrammingModal, intervention])

  // Check if user prefers reduced motion
  const prefersReducedMotion = typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  return (
    <div
      className={cn(
        "group relative bg-card dark:bg-white/5 rounded-2xl p-4 sm:p-5 shadow-sm dark:shadow-none",
        "transition-all duration-300 border border-border dark:border-white/10",
        "hover:border-primary/30 flex flex-col h-full dark:backdrop-blur-sm",
        "will-change-transform",
        isRemoving && !prefersReducedMotion && "slide-out-right",
        isRemoving && prefersReducedMotion && "opacity-0"
      )}
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
          <h3
            className="text-base font-semibold text-foreground group-hover:text-primary transition-colors truncate cursor-pointer"
            onClick={() => router.push(getInterventionUrl())}
          >
            {intervention.title}
          </h3>
          {/* Badges row - directly under title */}
          <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
            <Badge className={cn(getPriorityColor(urgency), "text-xs border flex items-center gap-1")}>
              <Flame className="h-3 w-3" aria-hidden="true" />
              {getPriorityLabel(urgency)}
            </Badge>
            <Badge className={cn(getStatusColor(intervention.status), "text-xs border flex items-center gap-1")}>
              <Calendar className="h-3 w-3" aria-hidden="true" />
              {getStatusLabel(intervention.status)}
            </Badge>
            <QuoteStatusBadge
              quotes={intervention.quotes}
              requiresQuote={intervention.requires_quote}
            />
          </div>
        </div>

        {/* Eye button - FIXED POSITION in header for all roles */}
        {/* Material Design: 44x44px touch target, 3:1 contrast ratio, visible background */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => router.push(getInterventionUrl())}
          className="flex-shrink-0 h-9 w-9 border-border/60 bg-muted/50 text-muted-foreground hover:bg-accent hover:text-accent-foreground hover:border-accent"
          title="Voir les détails"
        >
          <Eye className="h-5 w-5" aria-hidden="true" />
          <span className="sr-only">Voir les détails</span>
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
                  onClick={() => action.href && router.push(action.href)}
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

      {/* Status Banner - Action message only */}
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
            "text-sm font-medium",
            isAlert ? 'text-orange-900 dark:text-orange-200' : 'text-blue-900 dark:text-blue-200'
          )}>
            {actionMessage}
          </p>
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

      {/* ACTION BUTTONS - Generated by getRoleBasedActions */}
      {/* Primary actions (approve/reject) on same row, secondary actions below */}
      {actions.length > 0 && (() => {
        // Separate primary/destructive actions from secondary ones
        const primaryActions = actions.filter(a => a.variant === 'primary' || a.variant === 'destructive')
        const secondaryActions = actions.filter(a => a.variant !== 'primary' && a.variant !== 'destructive')

        return (
          <div className="flex flex-col gap-2 mt-auto pt-4 border-t border-border">
            {/* Primary actions row (Approuver/Rejeter) */}
            {primaryActions.length > 0 && (
              <div className={cn(
                "flex gap-2",
                primaryActions.length === 1 ? "flex-col" : "flex-row"
              )}>
                {primaryActions.map((action, idx) => {
                  // Green background for primary workflow actions
                  const isGreenAction = ['approve', 'process_request', 'finalize', 'validate_work', 'mark_completed', 'propose_slots', 'start_planning'].includes(action.actionType)
                  return (
                  <Button
                    key={idx}
                    variant={isGreenAction ? toButtonVariant(action.variant) : 'outline'}
                    size="default"
                    onClick={() => handleActionClick(action)}
                    disabled={isLoading}
                    className={cn(
                      "flex-1 justify-center min-h-[44px]",
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
                        <action.icon className="h-4 w-4 mr-2" aria-hidden="true" />
                        {action.label}
                      </>
                    )}
                  </Button>
                  )
                })}
              </div>
            )}
            {/* Secondary actions (Demander détails, etc.) */}
            {secondaryActions.map((action, idx) => (
              <Button
                key={idx}
                variant={toButtonVariant(action.variant)}
                size="default"
                onClick={() => handleActionClick(action)}
                disabled={isLoading}
                className="w-full justify-center min-h-[44px]"
                aria-label={`${action.label} l'intervention ${intervention.reference || intervention.id}`}
              >
                {isLoading && loadingAction === action.actionType ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    En cours...
                  </>
                ) : (
                  <>
                    <action.icon className="h-4 w-4 mr-2" aria-hidden="true" />
                    {action.label}
                  </>
                )}
              </Button>
            ))}
          </div>
        )
      })()}
    </div>
  )
}

// Backward compatibility alias
export { InterventionCard as PendingActionsCard }
