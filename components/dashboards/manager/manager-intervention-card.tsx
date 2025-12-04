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
    Wrench,
    MapPin,
    Calendar,
    Droplets,
    Flame,
    Zap,
    Key,
    Home,
    Paintbrush,
    Hammer,
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
    getStatusActionMessage,
    getPriorityColor,
    getPriorityLabel
} from "@/lib/intervention-utils"
import { shouldShowAlertBadge } from "@/lib/intervention-alert-utils"

interface ManagerInterventionCardProps {
    intervention: any
    userContext?: 'gestionnaire' | 'prestataire' | 'locataire'
    onAction?: (action: string, intervention: any) => void
}

const getTypeIcon = (type: string) => {
    switch (type?.toLowerCase()) {
        case "plomberie": return Droplets
        case "electricite": return Zap
        case "chauffage": return Flame
        case "serrurerie": return Key
        case "peinture": return Paintbrush
        case "maintenance": return Hammer
        case "toiture": return Home
        default: return Wrench
    }
}

const getTypeColor = (type: string) => {
    switch (type?.toLowerCase()) {
        case "plomberie": return "bg-type-plomberie"
        case "electricite": return "bg-type-electricite"
        case "chauffage": return "bg-type-chauffage"
        case "serrurerie": return "bg-type-serrurerie"
        case "peinture": return "bg-brand-purple"
        case "toiture": return "bg-type-toiture"
        default: return "bg-type-autre"
    }
}

export function ManagerInterventionCard({
    intervention,
    userContext = 'gestionnaire',
    onAction
}: ManagerInterventionCardProps) {
    const router = useRouter()
    const TypeIcon = getTypeIcon(intervention.type)
    const typeColor = getTypeColor(intervention.type)
    const isUrgent = intervention.priority === 'haute' || intervention.priority === 'urgente'

    // Action banner logic
    const isAlert = shouldShowAlertBadge(intervention, userContext)
    const actionMessage = getStatusActionMessage(intervention.status, userContext)

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
                            label: "Demander des devis",
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
                        label: "Gérer les devis",
                        icon: Euro,
                        onClick: () => handleActionClick('manage_quotes'),
                    })
                }
                if (userContext === 'prestataire') {
                    actions.push({
                        label: "Soumettre un devis",
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

            case 'en_cours':
                if (userContext === 'prestataire' || userContext === 'gestionnaire') {
                    actions.push({
                        label: "Marquer comme terminé",
                        icon: CheckCircle,
                        onClick: () => handleActionClick('complete_work'),
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

    return (
        <div
            className="group relative bg-card dark:bg-white/5 rounded-2xl p-6 shadow-sm dark:shadow-none hover:shadow-xl dark:hover:shadow-none transition-all duration-300 border border-border dark:border-white/10 h-full flex flex-col dark:backdrop-blur-sm"
            onClick={() => handleActionClick('view_details')}
        >
            {/* Header: Icon + Action Banner + Badges + Menu */}
            <div className="flex items-start mb-4 gap-3">
                {/* Icône de type */}
                <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-md flex-shrink-0", typeColor)}>
                    <TypeIcon className="h-6 w-6" />
                </div>

                {/* Banner d'action (au milieu, prend l'espace disponible) */}
                <div className={cn(
                    "flex-1 border rounded-lg px-3 py-2 min-w-0",
                    isAlert
                        ? 'bg-orange-50 border-orange-200 dark:bg-orange-500/10 dark:border-orange-500/30'
                        : 'bg-blue-50 border-blue-200 dark:bg-blue-500/10 dark:border-blue-500/30',
                )}>
                    <div className="flex items-center gap-2">
                        <div className={cn(
                            "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0",
                            isAlert ? 'bg-orange-100 dark:bg-orange-500/20' : 'bg-blue-100 dark:bg-blue-500/20'
                        )}>
                            <Clock className={cn("h-3 w-3", isAlert ? 'text-orange-600' : 'text-blue-600')} />
                        </div>
                        <p className={cn(
                            "text-xs font-medium truncate",
                            isAlert ? 'text-orange-800' : 'text-blue-800'
                        )}>
                            {actionMessage}
                        </p>
                    </div>
                </div>

                {/* Badges + Menu (à droite) */}
                <div className="flex items-start gap-2 flex-shrink-0">
                    <div className="flex flex-col items-end gap-1">
                        {/* Badge de priorité */}
                        {isUrgent && (
                            <Badge className={cn(getPriorityColor(intervention.priority), "text-xs border")}>
                                {getPriorityLabel(intervention.priority)}
                            </Badge>
                        )}
                        {/* Badge de statut coloré */}
                        <Badge className={cn(getStatusColor(intervention.status), "text-xs border")}>
                            {getStatusLabel(intervention.status)}
                        </Badge>
                    </div>

                    {/* Menu d'actions */}
                    <div onClick={(e) => e.stopPropagation()}>
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
            </div>

            {/* Title */}
            <h3 className="text-lg font-bold text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-1">
                {intervention.title}
            </h3>

            {/* Description */}
            <p className="text-muted-foreground text-sm mb-4 line-clamp-2 flex-1">
                {intervention.description || "Aucune description disponible."}
            </p>

            {/* Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-border text-sm text-muted-foreground mt-auto">
                <div className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    {new Date(intervention.created_at).toLocaleDateString('fr-FR')}
                </div>
                <div className="flex items-center gap-1.5 max-w-[60%]">
                    <MapPin className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">
                        {intervention.lot?.building?.name || intervention.lot?.building?.address}
                    </span>
                </div>
            </div>
        </div>
    )
}
