"use client"

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Building2, MapPin, Calendar, MoreVertical, Loader2 } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { InterventionWithRelations } from '@/lib/services'
import {
  getStatusColor,
  getStatusLabel,
  getPriorityColor,
  getPriorityLabel,
  getInterventionLocationText,
  getInterventionLocationIcon
} from '@/lib/intervention-utils'
import { shouldShowAlertBadge } from '@/lib/intervention-alert-utils'
import {
  getRoleBasedActions,
  getDotMenuActions,
  toButtonVariant,
  type RoleBasedAction
} from '@/lib/intervention-action-utils'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface InterventionCardMobileProps {
  intervention: InterventionWithRelations
  userContext: 'gestionnaire' | 'prestataire' | 'locataire'
  userId?: string
  onActionComplete?: (interventionId: string) => void
  onOpenProgrammingModal?: (intervention: any) => void
}

export function InterventionCardMobile({
  intervention,
  userContext,
  userId,
  onActionComplete,
  onOpenProgrammingModal
}: InterventionCardMobileProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [loadingAction, setLoadingAction] = useState<string | null>(null)

  const isAlert = shouldShowAlertBadge(intervention as any, userContext, userId)
  const locationText = getInterventionLocationText(intervention as any)
  const locationIcon = getInterventionLocationIcon(intervention as any)

  const scheduledDate = intervention.selected_time_slot?.[0]
    ? new Date(intervention.selected_time_slot[0].slot_date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
    : intervention.scheduled_date
      ? new Date(intervention.scheduled_date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
      : null

  const createdDate = intervention.created_at
    ? new Date(intervention.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
    : null

  const displayDate = scheduledDate || createdDate

  // Compute actions for this role/status
  const hasPendingQuote = userContext === 'prestataire' && (intervention as any).requires_quote && (
    !(intervention as any).quotes?.length ||
    (intervention as any).quotes?.some((q: any) =>
      (q.provider_id === userId || q.created_by === userId) &&
      (q.status === 'pending' || q.status === 'draft')
    ) ||
    !(intervention as any).quotes?.some((q: any) => q.provider_id === userId || q.created_by === userId)
  )

  const actions = getRoleBasedActions(intervention.id, intervention.status, userContext, {
    requiresQuote: (intervention as any).requires_quote,
    hasPendingQuote
  })
  const dotMenuActions = getDotMenuActions(intervention.id, intervention.status, userContext)

  // Handle API-based actions
  const handleApiAction = useCallback(async (action: RoleBasedAction) => {
    if (!action.apiRoute) return

    setIsLoading(true)
    setLoadingAction(action.actionType)

    try {
      const response = await fetch(action.apiRoute, {
        method: action.apiMethod || 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interventionId: intervention.id })
      })
      const data = await response.json()

      if (data.success) {
        toast("Action effectuee", {
          description: `${(intervention as any).reference || intervention.id} - ${intervention.title}`,
          duration: 3000
        })
        onActionComplete?.(intervention.id)
      } else {
        throw new Error(data.error || "Erreur lors de l'action")
      }
    } catch (error) {
      toast.error("Erreur", {
        description: error instanceof Error ? error.message : "Impossible d'effectuer l'action"
      })
    } finally {
      setIsLoading(false)
      setLoadingAction(null)
    }
  }, [intervention, onActionComplete])

  // Handle action button click
  const handleActionClick = useCallback((action: RoleBasedAction) => {
    if (action.actionType === 'start_planning' && onOpenProgrammingModal) {
      onOpenProgrammingModal(intervention)
      return
    }

    if (action.apiRoute && !action.href) {
      handleApiAction(action)
    } else if (action.href) {
      router.push(action.href)
    } else {
      router.push(`/${userContext}/interventions/${intervention.id}`)
    }
  }, [handleApiAction, router, userContext, intervention, onOpenProgrammingModal])

  const handleClick = () => {
    router.push(`/${userContext}/interventions/${intervention.id}`)
  }

  // Green action types (matching desktop)
  const greenActionTypes = ['approve', 'process_request', 'finalize', 'mark_completed', 'propose_slots', 'start_planning']

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick() }}
      className={cn(
        "flex flex-col gap-1 p-3 rounded-lg border bg-card",
        "active:bg-muted/50 cursor-pointer transition-colors",
        isAlert && "border-orange-200 bg-orange-50/30"
      )}
    >
      {/* Line 1: Title + Status + DotMenu */}
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {isAlert && (
            <div className="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0" />
          )}
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-sm font-medium truncate">{intervention.title}</span>
              </TooltipTrigger>
              <TooltipContent>{intervention.title}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Badge className={cn(getStatusColor(intervention.status), "text-[11px]")}>
            {getStatusLabel(intervention.status)}
          </Badge>
          {dotMenuActions.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-foreground"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-3.5 w-3.5" />
                  <span className="sr-only">Plus d'actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {dotMenuActions.map((action, idx) => (
                  <DropdownMenuItem
                    key={idx}
                    onClick={(e) => {
                      e.stopPropagation()
                      if (action.href) router.push(action.href)
                    }}
                    className={cn(
                      action.variant === 'destructive' && 'text-red-600 focus:text-red-600 focus:bg-red-50'
                    )}
                  >
                    <action.icon className="h-4 w-4 mr-2" />
                    {action.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Line 2: Location + Date */}
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-1 min-w-0 flex-1">
          {locationIcon === 'building' ? (
            <Building2 className="h-3 w-3 flex-shrink-0" />
          ) : (
            <MapPin className="h-3 w-3 flex-shrink-0" />
          )}
          <span className="truncate">{locationText}</span>
        </div>
        {displayDate && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <Calendar className="h-3 w-3" />
            <span>{displayDate}</span>
          </div>
        )}
      </div>

      {/* Line 3: Priority + Type badges */}
      <div className="flex items-center gap-1.5">
        {intervention.urgency && intervention.urgency !== 'normale' && (
          <Badge className={cn(getPriorityColor(intervention.urgency), "text-[10px] px-1.5 py-0")}>
            {getPriorityLabel(intervention.urgency)}
          </Badge>
        )}
        {intervention.type && (
          <span className="text-[10px] text-muted-foreground">
            {intervention.type.replace(/_/g, ' ')}
          </span>
        )}
      </div>

      {/* Line 4: Action buttons (single row) */}
      {actions.length > 0 && (
        <div
          className="flex items-center gap-2 mt-1 pt-1.5 border-t border-border"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          {actions.map((action, idx) => {
            const isGreenAction = greenActionTypes.includes(action.actionType)
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
                size="sm"
                onClick={() => handleActionClick(action)}
                disabled={isLoading}
                className={cn(
                  "flex-1 min-w-0 h-8 text-xs justify-center",
                  isGreenAction && "bg-green-600 hover:bg-green-700 text-white"
                )}
              >
                {isLoading && loadingAction === action.actionType ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <>
                    <action.icon className="h-3.5 w-3.5 shrink-0" />
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
}
