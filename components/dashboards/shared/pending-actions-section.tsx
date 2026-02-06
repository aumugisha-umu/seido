"use client"

import { useMemo, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertTriangle, ChevronRight, ChevronDown, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { filterPendingActions } from "@/lib/intervention-alert-utils"
import { InterventionCard } from "./intervention-card"
import type { UserRole } from "@/lib/intervention-action-utils"

// ============================================================================
// TYPES
// ============================================================================

interface Intervention {
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
  created_at?: string
  [key: string]: unknown
}

interface PendingActionsSectionProps {
  /** All interventions (filtering is done internally) */
  interventions: Intervention[]
  /** User role for filtering and action generation */
  userRole: UserRole
  /** User ID (needed for some role-specific checks) */
  userId?: string
  /** Section title (defaults to role-specific title) */
  title?: string
  /** Additional CSS classes */
  className?: string
  /** Maximum number of cards to show (default: no limit) */
  maxItems?: number
  /** Show empty state message when no actions */
  showEmptyState?: boolean
  /** Custom empty state message */
  emptyMessage?: string
  /** Callback when all pending actions are completed */
  onAllComplete?: () => void
  /** Custom action handlers to pass to cards */
  customActionHandlers?: {
    [key: string]: (intervention: any) => Promise<boolean>
  }
  /** Callback to open ProgrammingModal for start_planning action */
  onOpenProgrammingModal?: (intervention: any) => void
}

// ============================================================================
// DEFAULT TITLES BY ROLE
// ============================================================================

const defaultTitles: Record<UserRole, string> = {
  gestionnaire: "À traiter en priorité",
  prestataire: "À traiter en priorité",
  locataire: "À traiter en priorité"
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const getUrgencyLevel = (intervention: Intervention): number => {
  const urgency = intervention.urgency || 'normale'
  switch (urgency) {
    case 'urgente': return 3
    case 'haute': return 2
    default: return 1
  }
}

// ✅ FIX 2026-01-26: Removed demande_de_devis - quotes now independent of workflow status
const getActionPriority = (intervention: Intervention): number => {
  switch (intervention.status) {
    case 'demande': return 5
    case 'cloturee_par_prestataire': return 4
    case 'cloturee_par_locataire': return 4
    case 'planification': return 3
    default: return 1
  }
}

// ============================================================================
// VIEW ALL URLS BY ROLE
// ============================================================================

const getViewAllUrl = (userRole: UserRole): string => {
  switch (userRole) {
    case 'gestionnaire':
      return '/gestionnaire/interventions'
    case 'prestataire':
      return '/prestataire/interventions'
    case 'locataire':
      return '/locataire/interventions'
  }
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * PendingActionsSection - Section d'actions en attente multi-rôles
 *
 * Affiche un wrapper orange avec scroll horizontal comme la section gestionnaire.
 * Filtre automatiquement les interventions nécessitant une action de l'utilisateur.
 *
 * @example
 * ```tsx
 * // Dans le dashboard prestataire
 * <PendingActionsSection
 *   interventions={allInterventions}
 *   userRole="prestataire"
 *   userId={currentUserId}
 * />
 * ```
 */
export function PendingActionsSection({
  interventions,
  userRole,
  userId,
  title,
  className,
  maxItems,
  showEmptyState = false,
  emptyMessage,
  onAllComplete,
  customActionHandlers,
  onOpenProgrammingModal
}: PendingActionsSectionProps) {
  const router = useRouter()

  // Track removed cards for animation
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set())
  // 🎯 État pour collapse/expand la section
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Filter interventions that need action from this user
  const pendingInterventions = useMemo(() => {
    const filtered = filterPendingActions(interventions, userRole)
      .filter(i => !removedIds.has(i.id))
      .sort((a, b) => {
        // Sort by action priority first, then urgency, then date
        const actionDiff = getActionPriority(b) - getActionPriority(a)
        if (actionDiff !== 0) return actionDiff
        const urgencyDiff = getUrgencyLevel(b) - getUrgencyLevel(a)
        if (urgencyDiff !== 0) return urgencyDiff
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0
        return dateB - dateA
      })

    return maxItems ? filtered.slice(0, maxItems) : filtered
  }, [interventions, userRole, removedIds, maxItems])

  // Handle card action complete (remove from list)
  const handleActionComplete = useCallback((interventionId: string) => {
    setRemovedIds(prev => {
      const newSet = new Set(prev)
      newSet.add(interventionId)

      // Check if all pending are now removed
      const remaining = filterPendingActions(interventions, userRole)
        .filter(i => !newSet.has(i.id))

      if (remaining.length === 0) {
        onAllComplete?.()
      }

      return newSet
    })
  }, [interventions, userRole, onAllComplete])

  // Display title
  const displayTitle = title || defaultTitles[userRole]

  // Handle view all click
  const handleViewAll = () => {
    router.push(getViewAllUrl(userRole))
  }

  // Empty state
  if (pendingInterventions.length === 0) {
    if (!showEmptyState) return null

    return (
      <section className={cn("space-y-4", className)}>
        <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-xl p-6 text-center">
          <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto mb-3" />
          <p className="text-green-800 dark:text-green-200 font-medium">
            {emptyMessage || "Tout est à jour !"}
          </p>
          <p className="text-green-600 dark:text-green-400 text-sm mt-1">
            Aucune action en attente de votre part
          </p>
        </div>
      </section>
    )
  }

  return (
    <Card className={cn(
      "border-none shadow-lg overflow-hidden relative",
      "bg-amber-50 ring-1 ring-amber-500/30",
      "dark:bg-amber-500/10 dark:ring-amber-500/30",
      className
    )}>
      {/* Background icon - decorative (smaller on mobile) */}
      <div className="absolute right-0 top-0 p-4 sm:p-6 opacity-10">
        <AlertTriangle className="h-20 w-20 sm:h-32 sm:w-32 text-amber-500" />
      </div>

      <CardHeader className="pb-2 relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-xl",
              "bg-amber-500",
              "shadow-lg shadow-amber-500/25"
            )}>
              <AlertTriangle className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-amber-900 dark:text-amber-100">
                {displayTitle}
              </CardTitle>
              <p className="text-sm text-amber-700/70 dark:text-amber-300/70">
                {pendingInterventions.length} action{pendingInterventions.length > 1 ? 's' : ''} requise{pendingInterventions.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>
          {/* 🎯 Chevron pour collapse/expand */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-amber-700 hover:text-amber-900 hover:bg-amber-100/50 dark:text-amber-300 dark:hover:bg-amber-900/30 p-2"
            aria-expanded={!isCollapsed}
            aria-label={isCollapsed ? "Afficher les actions" : "Masquer les actions"}
          >
            <ChevronDown className={cn(
              "h-5 w-5 transition-transform duration-200",
              isCollapsed && "-rotate-90"
            )} />
          </Button>
        </div>
      </CardHeader>

      {/* 🎯 Contenu collapsible avec animation */}
      <CardContent className={cn(
        "relative z-10 transition-all duration-200 ease-in-out overflow-hidden",
        isCollapsed ? "max-h-0 py-0 opacity-0" : "max-h-[2000px] pt-2 pb-4 opacity-100"
      )}
      style={{ paddingLeft: 0, paddingRight: 0 }}
      >
        {/* Mobile: Stacked vertical layout with scroll */}
        <div className="sm:hidden flex flex-col gap-3 px-0 max-h-[calc(3*220px)] overflow-y-auto scrollbar-thin scrollbar-thumb-amber-300 scrollbar-track-transparent">
          {pendingInterventions.map((intervention) => (
            <div key={intervention.id}>
              <InterventionCard
                intervention={intervention}
                userRole={userRole}
                userId={userId}
                onActionComplete={handleActionComplete}
                customActionHandlers={customActionHandlers}
                onOpenProgrammingModal={onOpenProgrammingModal}
              />
            </div>
          ))}
        </div>

        {/* Tablet+: Horizontal scrollable container with CSS Grid for equal heights */}
        <div className="@container hidden sm:grid grid-flow-col auto-rows-[1fr] gap-4 overflow-x-auto pl-4 pb-2 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-amber-300 scrollbar-track-transparent">
          {pendingInterventions.map((intervention) => (
            <div
              key={intervention.id}
              className="w-[85cqw] @sm:w-[45cqw] @lg:w-[31cqw] min-w-[320px] max-w-[450px] snap-start"
            >
              <InterventionCard
                intervention={intervention}
                userRole={userRole}
                userId={userId}
                onActionComplete={handleActionComplete}
                customActionHandlers={customActionHandlers}
                onOpenProgrammingModal={onOpenProgrammingModal}
              />
            </div>
          ))}
          {/* Spacer to preserve right padding with overflow-x-auto */}
          <div className="flex-shrink-0 w-4" aria-hidden="true" />
        </div>

      </CardContent>

      {/* 🎯 Bouton "Voir toutes les interventions" - TOUJOURS VISIBLE, gestionnaire only */}
      {userRole === 'gestionnaire' && (
        <div className="px-0 pb-0 pt-0 border-t border-amber-200/50 dark:border-amber-700/30 relative z-10">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleViewAll}
            className="w-full text-amber-700 hover:text-amber-900 hover:bg-amber-100/50 dark:text-amber-300 dark:hover:bg-amber-900/30"
          >
            Voir toutes les interventions
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </Card>
  )
}
