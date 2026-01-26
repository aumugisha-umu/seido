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
import { MapPin, Clock, Loader2, CheckCircle, Eye, MoreVertical } from "lucide-react"
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

interface PendingActionsCardProps {
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
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * PendingActionsCard - Carte d'intervention avec boutons d'action adaptés au rôle
 *
 * Affiche une intervention nécessitant une action de l'utilisateur avec:
 * - Titre et type de l'intervention
 * - Badge de statut avec message d'action contextuel
 * - Boutons d'action primaires générés selon le rôle
 * - Lien vers les détails
 *
 * @example
 * ```tsx
 * <PendingActionsCard
 *   intervention={intervention}
 *   userRole="prestataire"
 *   onActionComplete={(id) => removeFromList(id)}
 * />
 * ```
 */
export function PendingActionsCard({
  intervention,
  userRole,
  userId,
  onActionComplete,
  enableAnimations = true,
  customActionHandlers
}: PendingActionsCardProps) {
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
  }, [handleApiAction, router, getInterventionUrl])

  // Check if user prefers reduced motion
  const prefersReducedMotion = typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  return (
    <div
      className={cn(
        "group relative bg-card dark:bg-white/5 rounded-2xl p-5 shadow-sm dark:shadow-none",
        "transition-all duration-300 border border-border dark:border-white/10",
        "hover:border-primary/30 h-full flex flex-col dark:backdrop-blur-sm",
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

      {/* Header: Icon + Title + Eye button (UNIFORM for all roles) */}
      <div className="flex items-center gap-3 mb-3">
        <InterventionTypeIcon
          type={intervention.type}
          interventionType={intervention.intervention_type}
          size="lg"
        />

        <h3
          className="text-base font-semibold text-foreground group-hover:text-primary transition-colors truncate flex-1 min-w-0 cursor-pointer"
          onClick={() => router.push(getInterventionUrl())}
        >
          {intervention.title}
        </h3>

        {/* Eye button - FIXED POSITION in header for all roles */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(getInterventionUrl())}
          className="flex-shrink-0 h-8 w-8 text-muted-foreground hover:text-foreground"
          title="Voir les détails"
        >
          <Eye className="h-4 w-4" aria-hidden="true" />
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

      {/* Status Banner with badges */}
      <div className={cn(
        "border rounded-lg px-3 py-2.5 mb-3 w-full",
        isAlert
          ? 'bg-orange-50/80 border-orange-200 dark:bg-orange-500/15 dark:border-orange-500/40'
          : 'bg-blue-50/80 border-blue-200 dark:bg-blue-500/15 dark:border-blue-500/40',
      )}>
        <div className="flex items-center justify-between gap-2 flex-wrap">
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
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge className={cn(getPriorityColor(urgency), "text-xs border")}>
              {getPriorityLabel(urgency)}
            </Badge>
            <Badge className={cn(getStatusColor(intervention.status), "text-xs border")}>
              {getStatusLabel(intervention.status)}
            </Badge>
            {/* Quote status badge - shows when requires_quote is true and quotes exist */}
            <QuoteStatusBadge
              quotes={intervention.quotes}
              requiresQuote={intervention.requires_quote}
            />
          </div>
        </div>
      </div>

      {/* Description */}
      {intervention.description && (
        <p className="text-muted-foreground text-sm mb-3 line-clamp-2 flex-1">
          {intervention.description}
        </p>
      )}

      {/* Location */}
      <div
        className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4"
        title={formatInterventionLocation(intervention).address || undefined}
      >
        <MapPin className="h-4 w-4 flex-shrink-0" />
        <span className="truncate">{formatInterventionLocation(intervention).primary}</span>
      </div>

      {/* ACTION BUTTONS - Generated by getRoleBasedActions */}
      {/* Eye button moved to header - footer contains only action buttons */}
      {/* Hide footer entirely if no actions available (e.g., completed interventions) */}
      {actions.length > 0 && (
        <div className="flex flex-col gap-2 mt-auto pt-4 border-t border-border">
          {actions.map((action, idx) => (
            <Button
              key={idx}
              variant={toButtonVariant(action.variant)}
              size="default"
              onClick={() => handleActionClick(action)}
              disabled={isLoading}
              className={cn(
                "w-full justify-center min-h-[44px]",
                action.variant === 'primary' && "bg-green-600 hover:bg-green-700 text-white",
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
          ))}
        </div>
      )}
    </div>
  )
}
