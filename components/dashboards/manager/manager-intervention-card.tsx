"use client"

import { useState } from "react"
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
    AlertTriangle
} from "lucide-react"
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
import { formatInterventionLocation } from "@/lib/utils/intervention-location"
import { InterventionTypeIcon } from "@/components/interventions/intervention-type-icon"

interface ManagerInterventionCardProps {
    intervention: any
    userContext?: 'gestionnaire' | 'prestataire' | 'locataire'
    onAction?: (action: string, intervention: any) => void
    /** Mode compact pour les listes horizontales */
    compact?: boolean
    /** Afficher les actions de statut dans le menu */
    showStatusActions?: boolean
    /** Contexte contact pour afficher des infos supplémentaires */
    contactContext?: {
        contactId: string
        contactName: string
        contactRole?: 'gestionnaire' | 'prestataire' | 'locataire'
    }
    /** Callback appelé après une action */
    onActionComplete?: () => void
}

/**
 * Helper pour trouver le créneau confirmé parmi les time_slots
 * Priorité: slot avec status 'selected', sinon le premier slot disponible
 */
const getConfirmedSlot = (slots: Array<{ id: string; slot_date: string; start_time: string; end_time: string; status: string }> | undefined | null) => {
    if (!slots || slots.length === 0) return null
    // Priorité: slot confirmé (status 'selected'), sinon premier de la liste
    return slots.find(s => s.status === 'selected') || slots[0]
}

export function ManagerInterventionCard({
    intervention,
    userContext = 'gestionnaire',
    onAction,
    compact = false,
    showStatusActions = true,
    contactContext,
    onActionComplete
}: ManagerInterventionCardProps) {
    const router = useRouter()
    // Fix: use 'urgency' field (not 'priority') from DB schema
    const urgency = intervention.urgency || 'normale'
    const isUrgent = urgency === 'haute' || urgency === 'urgente'

    // Action banner logic
    const isAlert = shouldShowAlertBadge(intervention, userContext)
    // Message dynamique basé sur les réponses réelles aux créneaux
    const baseActionMessage = getPendingParticipantsMessage(intervention.status, intervention.timeSlots, userContext)

    // Extraire les prénoms des personnes en attente pour un message personnalisé
    const pendingNames = getPendingResponderNames(intervention.timeSlots)

    // Utiliser les prénoms si disponibles pour le statut planification, sinon message générique
    const actionMessage = intervention.status === 'planification' && pendingNames.length > 0
        ? `En attente de ${pendingNames.join(', ')}`
        : baseActionMessage

    // Get confirmed time slot for scheduled interventions
    const confirmedSlot = getConfirmedSlot(intervention.selected_time_slot)

    // Generate intervention URL based on user context
    const getInterventionUrl = (interventionId: string) => {
        switch (userContext) {
            case 'prestataire':
                return `/prestataire/interventions/${interventionId}`
            case 'locataire':
                return `/locataire/interventions/${interventionId}`
            case 'gestionnaire':
            default:
                return `/gestionnaire/interventions/${interventionId}`
        }
    }

    const handleActionClick = (actionType: string) => {
        if (onAction) {
            onAction(actionType, intervention)
        } else {
            // Default navigation logic if no handler provided
            switch (actionType) {
                case 'view_details':
                    router.push(getInterventionUrl(intervention.id))
                    break
                case 'manage_quotes':
                case 'submit_quote':
                    router.push(`${getInterventionUrl(intervention.id)}?tab=quotes`)
                    break
                case 'confirm_slot':
                case 'add_availabilities':
                case 'reject_schedule':
                case 'reschedule':
                    router.push(`${getInterventionUrl(intervention.id)}?tab=planning`)
                    break
                case 'validate_work':
                case 'contest_work':
                    router.push(`${getInterventionUrl(intervention.id)}?tab=validation`)
                    break
                case 'modify_schedule':
                    router.push(`${getInterventionUrl(intervention.id)}?action=modify-schedule`)
                    break
                case 'edit':
                    router.push(`${getInterventionUrl(intervention.id)}/modifier`)
                    break
                default:
                    console.log(`Action ${actionType} triggered for ${intervention.id}`)
            }
        }
    }

    // Logic to determine available actions based on status and role
    const getAvailableActions = () => {
        const actions = []

        // Always add "View Details"
        actions.push({
            label: "Voir détails",
            icon: Eye,
            onClick: () => handleActionClick('view_details'),
        })

        actions.push({ separator: true })

        // Conditional Actions
        switch (intervention.status) {
            case 'demande':
                if (userContext === 'gestionnaire') {
                    actions.push(
                        {
                            label: "Approuver",
                            icon: Check,
                            onClick: () => handleActionClick('approve'),
                            className: "text-green-600 hover:text-green-800",
                        },
                        {
                            label: "Rejeter",
                            icon: X,
                            onClick: () => handleActionClick('reject'),
                            className: "text-red-600 hover:text-red-800",
                        }
                    )
                }
                break

            case 'approuvee':
                if (userContext === 'gestionnaire') {
                    actions.push(
                        {
                            label: "Demander des estimations",
                            icon: FileText,
                            onClick: () => handleActionClick('request_quotes'),
                        },
                        {
                            label: "Planifier directement",
                            icon: Calendar,
                            onClick: () => handleActionClick('start_planning'),
                        }
                    )
                }
                break

            case 'demande_de_devis':
                if (userContext === 'gestionnaire') {
                    actions.push({
                        label: "Gérer les estimations",
                        icon: Euro,
                        onClick: () => handleActionClick('manage_quotes'),
                    })
                }
                if (userContext === 'prestataire') {
                    actions.push({
                        label: "Soumettre une estimation",
                        icon: FileText,
                        onClick: () => handleActionClick('submit_quote'),
                    })
                }
                break

            case 'planification':
                if (userContext === 'gestionnaire') {
                    actions.push({
                        label: "Planifier",
                        icon: Clock,
                        onClick: () => handleActionClick('propose_slots'),
                    })
                }
                if (userContext === 'locataire') {
                    actions.push({
                        label: "Confirmer un créneau",
                        icon: CheckCircle,
                        onClick: () => handleActionClick('confirm_slot'),
                    })
                }
                if (userContext === 'prestataire') {
                    actions.push({
                        label: "Ajouter mes disponibilités",
                        icon: Calendar,
                        onClick: () => handleActionClick('add_availabilities'),
                    })
                }
                break

            case 'planifiee':
                if (userContext === 'prestataire') {
                    actions.push({
                        label: "Marquer comme terminé",
                        icon: CheckCircle,
                        onClick: () => handleActionClick('complete_work'),
                    })
                }
                if (userContext === 'locataire') {
                    actions.push(
                        {
                            label: "Modifier le créneau",
                            icon: Calendar,
                            onClick: () => handleActionClick('modify_schedule'),
                        },
                        {
                            label: "Rejeter la planification",
                            icon: X,
                            onClick: () => handleActionClick('reject_schedule'),
                            className: "text-red-600 hover:text-red-800",
                        }
                    )
                }
                if (userContext === 'gestionnaire') {
                    actions.push({
                        label: "Replanifier",
                        icon: Calendar,
                        onClick: () => handleActionClick('reschedule'),
                    })
                }
                break

            case 'cloturee_par_prestataire':
                if (userContext === 'locataire') {
                    actions.push(
                        {
                            label: "Valider les travaux",
                            icon: CheckCircle,
                            onClick: () => handleActionClick('validate_work'),
                            className: "text-green-600 hover:text-green-800",
                        },
                        {
                            label: "Contester",
                            icon: AlertTriangle,
                            onClick: () => handleActionClick('contest_work'),
                            className: "text-red-600 hover:text-red-800",
                        }
                    )
                }
                if (userContext === 'gestionnaire') {
                    actions.push({
                        label: "Finaliser",
                        icon: UserCheck,
                        onClick: () => handleActionClick('finalize'),
                    })
                }
                break

            case 'cloturee_par_locataire':
                if (userContext === 'gestionnaire') {
                    actions.push({
                        label: "Finaliser",
                        icon: UserCheck,
                        onClick: () => handleActionClick('finalize'),
                    })
                }
                break
        }

        // Delete action
        if (['demande', 'approuvee', 'planification'].includes(intervention.status)) {
            if (userContext === 'gestionnaire' || (userContext === 'locataire' && intervention.status === 'demande')) {
                if (actions.length > 0 && !actions[actions.length - 1].separator) {
                    actions.push({ separator: true })
                }
                actions.push(
                    {
                        label: "Supprimer",
                        icon: Trash2,
                        onClick: () => handleActionClick('delete'),
                        className: "text-red-600 hover:text-red-800",
                    }
                )
            }
        }

        return actions
    }

    const availableActions = getAvailableActions()

    // Mode compact pour les listes
    if (compact) {
        return (
            <div
                className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 hover:border-primary/30 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                onClick={() => handleActionClick('view_details')}
                role="button"
                tabIndex={0}
                aria-label={`Intervention: ${intervention.title}, statut ${getStatusLabel(intervention.status)}`}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        handleActionClick('view_details')
                    }
                }}
            >
                {/* Icône */}
                <InterventionTypeIcon
                    type={intervention.type}
                    interventionType={intervention.intervention_type}
                    size="md"
                />

                {/* Contenu principal */}
                <div className="flex-1 min-w-0 space-y-1">
                    {/* Titre + Badges */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium text-sm text-foreground truncate">
                            {intervention.title}
                        </h3>
                        <Badge className={cn(getStatusColor(intervention.status), "text-xs px-1.5 py-0.5")}>
                            {getStatusLabel(intervention.status)}
                        </Badge>
                        <Badge className={cn(getPriorityColor(urgency), "text-xs px-1.5 py-0.5")}>
                            {getPriorityLabel(urgency)}
                        </Badge>
                    </div>

                    {/* Location + Date */}
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
                        <span className="font-medium truncate">
                            {formatInterventionLocation(intervention).primary}
                        </span>
                        <span className="hidden sm:inline">•</span>
                        <span className="hidden sm:inline">
                            Créé le {intervention.created_at
                                ? new Date(intervention.created_at).toLocaleDateString("fr-FR")
                                : "Date inconnue"}
                        </span>
                    </div>

                    {/* Action attendue ou Créneau planifié */}
                    {intervention.status === 'planifiee' && confirmedSlot ? (
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 dark:text-blue-400">
                            <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                            <span>
                                {new Date(confirmedSlot.slot_date).toLocaleDateString('fr-FR', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric'
                                })}
                            </span>
                            <span className="text-blue-600 dark:text-blue-500">•</span>
                            <span className="font-bold">
                                {confirmedSlot.start_time?.slice(0, 5)}
                            </span>
                        </div>
                    ) : (
                        <div className={cn(
                            "text-xs font-medium",
                            isAlert ? 'text-orange-600' : 'text-blue-600'
                        )}>
                            → {actionMessage}
                        </div>
                    )}
                </div>

                {/* Menu d'actions */}
                <div className="flex-shrink-0 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-9 w-9 sm:h-9 sm:w-auto sm:px-3 p-0"
                        onClick={() => handleActionClick('view_details')}
                    >
                        <Eye className="h-4 w-4" />
                        <span className="hidden sm:inline ml-1">Détails</span>
                    </Button>
                    {availableActions.length > 0 && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-9 w-9 p-0 text-muted-foreground hover:text-foreground">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                {availableActions.map((action, idx) => {
                                    if (action.separator) {
                                        return <DropdownMenuSeparator key={idx} />
                                    }
                                    return (
                                        <DropdownMenuItem
                                            key={idx}
                                            onClick={action.onClick}
                                            className={cn("cursor-pointer", action.className)}
                                        >
                                            {action.icon && <action.icon className="h-4 w-4 mr-2" />}
                                            {action.label}
                                        </DropdownMenuItem>
                                    )
                                })}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
            </div>
        )
    }

    // Mode carte standard
    return (
        <div
            className="group relative bg-card dark:bg-white/5 rounded-2xl p-5 shadow-sm dark:shadow-none hover:shadow-xl dark:hover:shadow-none transition-all duration-300 border border-border dark:border-white/10 hover:border-primary/30 h-full flex flex-col dark:backdrop-blur-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            onClick={() => handleActionClick('view_details')}
            role="button"
            tabIndex={0}
            aria-label={`Intervention: ${intervention.title}, statut ${getStatusLabel(intervention.status)}`}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleActionClick('view_details')
                }
            }}
        >
            {/* Header: Icône + Titre + Menu */}
            <div className="flex items-center gap-3 mb-3">
                {/* Icône de type */}
                <InterventionTypeIcon
                    type={intervention.type}
                    interventionType={intervention.intervention_type}
                    size="lg"
                />

                {/* Titre */}
                <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors truncate flex-1 min-w-0">
                    {intervention.title}
                </h3>

                {/* Menu d'actions */}
                <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
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
                        <DropdownMenuContent align="end" className="w-56">
                            {availableActions.map((action, idx) => {
                                if (action.separator) {
                                    return <DropdownMenuSeparator key={idx} />
                                }
                                return (
                                    <DropdownMenuItem
                                        key={idx}
                                        onClick={action.onClick}
                                        className={cn("cursor-pointer", action.className)}
                                    >
                                        {action.icon && <action.icon className="h-4 w-4 mr-2" />}
                                        {action.label}
                                    </DropdownMenuItem>
                                )
                            })}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Banner d'action avec badges intégrés */}
            <div className={cn(
                "border rounded-lg px-3 py-2.5 mb-3 w-full",
                isAlert
                    ? 'bg-orange-50/80 border-orange-200 dark:bg-orange-500/15 dark:border-orange-500/40'
                    : 'bg-blue-50/80 border-blue-200 dark:bg-blue-500/15 dark:border-blue-500/40',
            )}>
                {intervention.status === 'planifiee' && confirmedSlot ? (
                    <div className="flex flex-col gap-2">
                        {/* Ligne 1: Date/heure + Badges */}
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
                                <span className="text-blue-700 dark:text-blue-400">•</span>
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
                        {/* Action message */}
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
                        {/* Badges */}
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
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-auto" title={formatInterventionLocation(intervention).address || undefined}>
                <MapPin className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{formatInterventionLocation(intervention).primary}</span>
            </div>
        </div>
    )
}
