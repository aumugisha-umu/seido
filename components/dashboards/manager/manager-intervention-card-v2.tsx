"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    MapPin,
    Calendar,
    MoreVertical,
    Eye,
    Check,
    X,
    FileText,
    Clock,
    Euro,
    CheckCircle,
    UserCheck,
    Trash2,
    Loader2,
    MessageSquare
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
    getStatusColor,
    getStatusLabel,
    getStatusActionMessage,
    getPriorityColor,
    getPriorityLabel
} from "@/lib/intervention-utils"
import { shouldShowAlertBadge } from "@/lib/intervention-alert-utils"
import { formatInterventionLocation } from "@/lib/utils/intervention-location"
import { InterventionTypeIcon } from "@/components/interventions/intervention-type-icon"
import { FinalizationModalLive } from "@/components/intervention/finalization-modal-live"
import { useToast } from "@/hooks/use-toast"
import type { LucideIcon } from "lucide-react"

interface ManagerInterventionCardV2Props {
    intervention: any
    userContext?: 'gestionnaire' | 'prestataire' | 'locataire'
    /** Callback when an action is completed (for removing card from list with animation) */
    onActionComplete?: (interventionId: string) => void
    /** Enable success animations (default true) */
    enableAnimations?: boolean
    /** Custom action handlers (overrides default behavior) */
    customActions?: {
        approve?: (intervention: any) => Promise<boolean>
        reject?: (intervention: any) => Promise<boolean>
        finalize?: (intervention: any) => Promise<boolean>
    }
}

interface ActionButton {
    label: string
    icon: LucideIcon
    variant: 'default' | 'success' | 'destructive' | 'outline'
    action: string
    onClick?: () => void
}

/**
 * Get confirmed time slot from intervention
 */
const getConfirmedSlot = (slots: Array<{ id: string; slot_date: string; start_time: string; end_time: string; status: string }> | undefined | null) => {
    if (!slots || slots.length === 0) return null
    return slots.find(s => s.status === 'selected') || slots[0]
}

/**
 * Mapping Statut -> Boutons d'action primaires
 * Affiche uniquement les actions les plus courantes selon le statut
 */
const getPrimaryActions = (status: string, userContext: string): ActionButton[] => {
    if (userContext !== 'gestionnaire') return []

    switch (status) {
        case 'demande':
            return [
                { label: 'Approuver', icon: Check, variant: 'success', action: 'approve' },
                { label: 'Rejeter', icon: X, variant: 'destructive', action: 'reject' },
                { label: 'Demander détails', icon: MessageSquare, variant: 'outline', action: 'request_details' }
            ]

        case 'approuvee':
            return [
                { label: 'Demander devis', icon: FileText, variant: 'default', action: 'request_quotes' },
                { label: 'Planifier', icon: Calendar, variant: 'default', action: 'start_planning' }
            ]

        case 'demande_de_devis':
            return [
                { label: 'Gerer devis', icon: Euro, variant: 'default', action: 'manage_quotes' }
            ]

        case 'planification':
            return [
                { label: 'Proposer creneaux', icon: Clock, variant: 'default', action: 'propose_slots' }
            ]

        case 'planifiee':
            return [
                { label: 'Cloturer', icon: CheckCircle, variant: 'success', action: 'finalize' },
                { label: 'Replanifier', icon: Calendar, variant: 'outline', action: 'reschedule' }
            ]

        case 'cloturee_par_prestataire':
        case 'cloturee_par_locataire':
            return [
                { label: 'Finaliser', icon: UserCheck, variant: 'success', action: 'finalize' }
            ]

        default:
            return []
    }
}

/**
 * ManagerInterventionCardV2 - Card avec CTA directs
 *
 * Cette version affiche les boutons d'action directement sur la card
 * au lieu de les cacher dans un menu dropdown.
 *
 * Avantages:
 * - -2 clics pour les actions courantes
 * - Affordance visuelle (l'utilisateur voit immédiatement quelle action est attendue)
 * - Mobile-friendly avec zones tactiles 44px
 * - Animations de succès pour le feedback visuel
 *
 * @example
 * <ManagerInterventionCardV2
 *   intervention={intervention}
 *   onActionComplete={(id) => removeFromList(id)}
 * />
 */
export function ManagerInterventionCardV2({
    intervention,
    userContext = 'gestionnaire',
    onActionComplete,
    enableAnimations = true,
    customActions
}: ManagerInterventionCardV2Props) {
    const router = useRouter()
    const { toast } = useToast()

    // Animation states
    const [isLoading, setIsLoading] = useState(false)
    const [loadingAction, setLoadingAction] = useState<string | null>(null)
    const [showCheckmark, setShowCheckmark] = useState(false)
    const [isRemoving, setIsRemoving] = useState(false)
    const [checkmarkColor, setCheckmarkColor] = useState('text-green-600')

    // Modal state
    const [showFinalizationModal, setShowFinalizationModal] = useState(false)

    // Extract data
    const urgency = intervention.urgency || 'normale'
    const isAlert = shouldShowAlertBadge(intervention, userContext)
    const actionMessage = getStatusActionMessage(intervention.status, userContext)
    const confirmedSlot = getConfirmedSlot(intervention.selected_time_slot)

    // Generate intervention URL - memoized to avoid dependency issues
    const getInterventionUrl = useCallback((interventionId: string) => {
        switch (userContext) {
            case 'prestataire':
                return `/prestataire/interventions/${interventionId}`
            case 'locataire':
                return `/locataire/interventions/${interventionId}`
            default:
                return `/gestionnaire/interventions/${interventionId}`
        }
    }, [userContext])

    // Animation sequence for success
    const triggerSuccessAnimation = useCallback((action: string) => {
        if (!enableAnimations) {
            onActionComplete?.(intervention.id)
            return
        }

        // Set checkmark color based on action
        const colorMap: Record<string, string> = {
            approve: 'text-green-600',
            reject: 'text-red-600',
            finalize: 'text-blue-600'
        }
        setCheckmarkColor(colorMap[action] || 'text-green-600')

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

    // Handle approve action
    const handleApprove = useCallback(async () => {
        setIsLoading(true)
        setLoadingAction('approve')

        try {
            if (customActions?.approve) {
                const success = await customActions.approve(intervention)
                if (success) {
                    toast({
                        title: "Intervention approuvee",
                        description: `${intervention.reference || intervention.id} - ${intervention.title}`,
                        variant: "default",
                        duration: 3000
                    })
                    triggerSuccessAnimation('approve')
                }
            } else {
                // Default: Call API
                const response = await fetch('/api/intervention-approve', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ interventionId: intervention.id })
                })
                const data = await response.json()

                if (data.success) {
                    toast({
                        title: "Intervention approuvee",
                        description: `${intervention.reference || intervention.id} - ${intervention.title}`,
                        variant: "default",
                        duration: 3000
                    })
                    triggerSuccessAnimation('approve')
                } else {
                    throw new Error(data.error || 'Erreur lors de l\'approbation')
                }
            }
        } catch (error) {
            toast({
                title: "Erreur",
                description: error instanceof Error ? error.message : "Impossible d'approuver l'intervention",
                variant: "destructive"
            })
            setIsLoading(false)
            setLoadingAction(null)
        }
    }, [intervention, customActions, toast, triggerSuccessAnimation])

    // Handle reject action
    const handleReject = useCallback(async () => {
        setIsLoading(true)
        setLoadingAction('reject')

        try {
            if (customActions?.reject) {
                const success = await customActions.reject(intervention)
                if (success) {
                    toast({
                        title: "Intervention rejetee",
                        description: `${intervention.reference || intervention.id} - ${intervention.title}`,
                        variant: "default",
                        duration: 3000
                    })
                    triggerSuccessAnimation('reject')
                }
            } else {
                // Default: Navigate to detail page for rejection reason
                router.push(`${getInterventionUrl(intervention.id)}?action=reject`)
            }
        } catch (error) {
            toast({
                title: "Erreur",
                description: error instanceof Error ? error.message : "Impossible de rejeter l'intervention",
                variant: "destructive"
            })
        } finally {
            setIsLoading(false)
            setLoadingAction(null)
        }
    }, [intervention, customActions, toast, triggerSuccessAnimation, router, getInterventionUrl])

    // Handle finalize action (opens modal)
    const handleFinalize = useCallback(() => {
        setShowFinalizationModal(true)
    }, [])

    // Handle finalization complete
    const handleFinalizationComplete = useCallback(() => {
        setShowFinalizationModal(false)
        toast({
            title: "Intervention cloturee",
            description: `${intervention.reference || intervention.id} - ${intervention.title}`,
            variant: "default",
            duration: 3000
        })
        triggerSuccessAnimation('finalize')
    }, [intervention, toast, triggerSuccessAnimation])

    // Handle other actions (navigate to detail page)
    const handleAction = useCallback((actionType: string) => {
        switch (actionType) {
            case 'view_details':
                router.push(getInterventionUrl(intervention.id))
                break
            case 'approve':
                handleApprove()
                break
            case 'reject':
                handleReject()
                break
            case 'finalize':
                handleFinalize()
                break
            case 'request_details':
                // Navigate to detail page with conversations tab and prefill flag
                router.push(`${getInterventionUrl(intervention.id)}?tab=conversations&prefill=details`)
                break
            case 'manage_quotes':
            case 'submit_quote':
                router.push(`${getInterventionUrl(intervention.id)}?tab=quotes`)
                break
            case 'request_quotes':
            case 'start_planning':
            case 'propose_slots':
            case 'reschedule':
                router.push(`${getInterventionUrl(intervention.id)}?tab=planning`)
                break
            default:
                router.push(getInterventionUrl(intervention.id))
        }
    }, [intervention.id, router, getInterventionUrl, handleApprove, handleReject, handleFinalize])

    // Get primary actions for this status
    const primaryActions = getPrimaryActions(intervention.status, userContext)

    // Check if user prefers reduced motion
    const prefersReducedMotion = typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches

    return (
        <>
            <div
                className={cn(
                    "group relative bg-card dark:bg-white/5 rounded-2xl p-5 shadow-sm dark:shadow-none transition-all duration-300 border border-border dark:border-white/10 hover:border-primary/30 h-full flex flex-col dark:backdrop-blur-sm",
                    "will-change-transform", // GPU acceleration hint
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

                {/* Header: Icon + Title + Menu */}
                <div className="flex items-center gap-3 mb-3">
                    <InterventionTypeIcon
                        type={intervention.type}
                        interventionType={intervention.intervention_type}
                        size="lg"
                    />

                    <h3
                        className="text-base font-semibold text-foreground group-hover:text-primary transition-colors truncate flex-1 min-w-0 cursor-pointer"
                        onClick={() => handleAction('view_details')}
                    >
                        {intervention.title}
                    </h3>

                    {/* Secondary actions menu */}
                    <div className="flex-shrink-0">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full"
                                >
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem onClick={() => handleAction('view_details')} className="cursor-pointer">
                                    <Eye className="h-4 w-4 mr-2" />
                                    Voir details
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {(['demande', 'approuvee', 'planification'].includes(intervention.status)) && (
                                    <DropdownMenuItem
                                        onClick={() => router.push(`${getInterventionUrl(intervention.id)}/modifier`)}
                                        className="cursor-pointer"
                                    >
                                        <FileText className="h-4 w-4 mr-2" />
                                        Modifier
                                    </DropdownMenuItem>
                                )}
                                {(['demande', 'approuvee', 'planification'].includes(intervention.status)) && (
                                    <DropdownMenuItem
                                        onClick={() => handleAction('delete')}
                                        className="cursor-pointer text-red-600 hover:text-red-800"
                                    >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Supprimer
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                {/* Status Banner with badges */}
                <div className={cn(
                    "border rounded-lg px-3 py-2.5 mb-3 w-full",
                    isAlert
                        ? 'bg-orange-50/80 border-orange-200 dark:bg-orange-500/15 dark:border-orange-500/40'
                        : 'bg-blue-50/80 border-blue-200 dark:bg-blue-500/15 dark:border-blue-500/40',
                )}>
                    {intervention.status === 'planifiee' && confirmedSlot ? (
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                                <div className="flex items-center gap-2 text-sm font-semibold text-blue-900 dark:text-blue-200">
                                    <Calendar className="h-4 w-4 flex-shrink-0" />
                                    <span className="font-bold">
                                        {new Date(confirmedSlot.slot_date).toLocaleDateString('fr-FR', {
                                            day: 'numeric',
                                            month: 'long',
                                            year: 'numeric'
                                        })}
                                    </span>
                                    <span className="text-blue-700 dark:text-blue-400">-</span>
                                    <span className="font-extrabold text-base">
                                        {confirmedSlot.start_time?.slice(0, 5)}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Badge className={cn(getPriorityColor(urgency), "text-xs border")}>
                                        {getPriorityLabel(urgency)}
                                    </Badge>
                                    <Badge className={cn(getStatusColor(intervention.status), "text-xs border")}>
                                        {getStatusLabel(intervention.status)}
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    ) : (
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
                            <div className="flex items-center gap-1.5">
                                <Badge className={cn(getPriorityColor(urgency), "text-xs border")}>
                                    {getPriorityLabel(urgency)}
                                </Badge>
                                <Badge className={cn(getStatusColor(intervention.status), "text-xs border")}>
                                    {getStatusLabel(intervention.status)}
                                </Badge>
                            </div>
                        </div>
                    )}
                </div>

                {/* Description */}
                <p className="text-muted-foreground text-sm mb-3 line-clamp-2 flex-1">
                    {intervention.description || "Aucune description disponible."}
                </p>

                {/* Location */}
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4" title={formatInterventionLocation(intervention).address || undefined}>
                    <MapPin className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{formatInterventionLocation(intervention).primary}</span>
                </div>

                {/* PRIMARY ACTIONS - Direct CTA buttons */}
                {/* @container/buttons permet un layout adaptatif basé sur la largeur de la card */}
                <div className="@container/buttons flex flex-col @[400px]/buttons:flex-row gap-2 mt-auto pt-4 border-t border-border">
                    {primaryActions.map((action, idx) => (
                        <Button
                            key={idx}
                            variant={action.variant === 'success' ? 'default' : action.variant === 'destructive' ? 'destructive' : 'outline'}
                            size="default"
                            onClick={() => handleAction(action.action)}
                            disabled={isLoading}
                            className={cn(
                                "flex-1 justify-center min-h-[44px]", // Touch target 44px
                                action.variant === 'success' && "bg-green-600 hover:bg-green-700 text-white",
                            )}
                            aria-label={`${action.label} l'intervention ${intervention.reference || intervention.id}`}
                        >
                            {isLoading && loadingAction === action.action ? (
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

                    {/* "View details" button - icon only to save space */}
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleAction('view_details')}
                        className="flex-shrink-0 min-h-[44px] min-w-[44px]"
                        title="Voir les détails"
                    >
                        <Eye className="h-4 w-4" aria-hidden="true" />
                        <span className="sr-only">Voir les détails</span>
                    </Button>
                </div>
            </div>

            {/* Finalization Modal */}
            <FinalizationModalLive
                interventionId={intervention.id}
                isOpen={showFinalizationModal}
                onClose={() => setShowFinalizationModal(false)}
                onComplete={handleFinalizationComplete}
            />
        </>
    )
}
