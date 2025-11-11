"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Eye,
  MoreVertical,
  Edit,
  Trash2,
  Check,
  X,
  CheckCircle,
  Calendar,
  Clock,
  MapPin,
  Building2,
  Wrench,
  Droplets,
  Zap,
  Flame,
  Key,
  Paintbrush,
  Hammer,
  FileText,
  Euro,
  UserCheck,
  AlertTriangle,
  TrendingUp,
} from "lucide-react"

import {
  getInterventionLocationText,
  getInterventionLocationIcon,
  isBuildingWideIntervention,
  getStatusColor,
  getStatusLabel,
  getPriorityColor,
  getPriorityLabel,
  getStatusActionMessage
} from "@/lib/intervention-utils"
import { shouldShowAlertBadge } from "@/lib/intervention-alert-utils"
import { InterventionActionButtons } from "@/components/intervention/intervention-action-buttons"
import { InterventionCancelButton } from "@/components/intervention/intervention-cancel-button"
import { logger, logError } from '@/lib/logger'
interface InterventionCardProps {
  intervention: {
    id: string
    title: string
    status: string
    type?: string
    urgency?: string
    description?: string
    scheduled_date?: string
    created_at?: string
    created_by_user?: { name: string }
    creator?: { name: string }
    tenant?: { name: string }
    [key: string]: unknown
  }
  userContext: 'gestionnaire' | 'prestataire' | 'locataire'
  compact?: boolean
  showStatusActions?: boolean
  contactContext?: {
    contactId: string
    contactName: string
    contactRole?: string
  }
  actionHooks?: {
    approvalHook?: {
      handleApprovalAction?: (intervention: unknown, action: string) => void
    }
    quotingHook?: {
      handleQuoteRequest?: (intervention: unknown) => void
    }
    planningHook?: {
      handleProgrammingModal?: (intervention: unknown) => void
    }
    executionHook?: {
      handleExecutionModal?: (intervention: unknown, type: string) => void
    }
    finalizationHook?: {
      handleFinalizeModal?: (intervention: unknown) => void
    }
  }
  onActionComplete?: () => void
}

export function InterventionCard({
  intervention,
  userContext,
  compact = false,
  showStatusActions = true,
  contactContext,
  actionHooks,
  onActionComplete
}: InterventionCardProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [isHovered, setIsHovered] = useState(false)

  // Déterminer si le badge doit être en mode alerte (orange)
  const isAlertMode = shouldShowAlertBadge(intervention as any, userContext, user?.id)

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

  // Get creator name
  const getCreatorName = (intervention: InterventionCardProps['intervention']): string => {
    if (intervention.created_by_user?.name) {
      return intervention.created_by_user.name
    }
    if (intervention.creator?.name) {
      return intervention.creator.name
    }
    if (intervention.tenant?.name) {
      return intervention.tenant.name
    }
    return "Non spécifié"
  }

  // Get intervention type icon and color
  const getInterventionTypeIcon = (_type: string) => {
    const typeConfig = {
      plomberie: { icon: Droplets, color: "bg-blue-100", iconColor: "text-blue-600" },
      electricite: { icon: Zap, color: "bg-yellow-100", iconColor: "text-yellow-600" },
      chauffage: { icon: Flame, color: "bg-red-100", iconColor: "text-red-600" },
      serrurerie: { icon: Key, color: "bg-gray-100", iconColor: "text-gray-600" },
      peinture: { icon: Paintbrush, color: "bg-purple-100", iconColor: "text-purple-600" },
      maintenance: { icon: Hammer, color: "bg-orange-100", iconColor: "text-orange-600" },
    }

    return typeConfig[_type?.toLowerCase() as keyof typeof typeConfig] || {
      icon: Wrench,
      color: "bg-amber-100",
      iconColor: "text-amber-600"
    }
  }

  // Get intervention type label in French
  const getTypeLabel = (_type: string) => {
    const labels: Record<string, string> = {
      plomberie: "Plomberie",
      electricite: "Électricité",
      chauffage: "Chauffage",
      serrurerie: "Serrurerie",
      peinture: "Peinture",
      maintenance: "Maintenance",
      autre: "Autre"
    }
    return labels[_type?.toLowerCase()] || "Autre"
  }

  // Get badge color for intervention type/category
  const getTypeBadgeColor = (_type: string) => {
    const colors: Record<string, string> = {
      plomberie: "bg-blue-100 text-blue-800 border-blue-200",
      electricite: "bg-yellow-100 text-yellow-800 border-yellow-200",
      chauffage: "bg-red-100 text-red-800 border-red-200",
      serrurerie: "bg-gray-100 text-gray-800 border-gray-200",
      peinture: "bg-purple-100 text-purple-800 border-purple-200",
      maintenance: "bg-orange-100 text-orange-800 border-orange-200",
      autre: "bg-slate-100 text-slate-800 border-slate-200"
    }
    return colors[_type?.toLowerCase()] || "bg-slate-100 text-slate-800 border-slate-200"
  }

  // Get available actions based on status and user role
  const getAvailableActions = () => {
    const actions = []

    // Actions disponibles selon le statut et le rôle
    switch (intervention.status) {
      case 'demande':
        if (userContext === 'gestionnaire') {
          actions.push(
            {
              label: "Approuver",
              icon: Check,
              onClick: () => handleAction('approve'),
              className: "text-green-600 hover:text-green-800",
            },
            {
              label: "Rejeter",
              icon: X,
              onClick: () => handleAction('reject'),
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
              onClick: () => handleAction('request_quotes'),
            },
            {
              label: "Planifier directement",
              icon: Calendar,
              onClick: () => handleAction('start_planning'),
            }
          )
        }
        break

      case 'demande_de_devis':
        if (userContext === 'gestionnaire') {
          actions.push({
            label: "Gérer les devis",
            icon: Euro,
            onClick: () => handleAction('manage_quotes'),
          })
        }
        if (userContext === 'prestataire') {
          actions.push({
            label: "Soumettre un devis",
            icon: FileText,
            onClick: () => handleAction('submit_quote'),
          })
        }
        break

      case 'planification':
        if (userContext === 'gestionnaire') {
          actions.push({
            label: "Planifier",
            icon: Clock,
            onClick: () => handleAction('propose_slots'),
          })
        }
        if (userContext === 'locataire') {
          actions.push({
            label: "Confirmer un créneau",
            icon: CheckCircle,
            onClick: () => handleAction('confirm_slot'),
          })
        }
        if (userContext === 'prestataire') {
          actions.push({
            label: "Ajouter mes disponibilités",
            icon: Calendar,
            onClick: () => handleAction('add_availabilities'),
          })
        }
        break

      case 'planifiee':
        if (userContext === 'prestataire') {
          actions.push({
            label: "Marquer comme terminé",
            icon: CheckCircle,
            onClick: () => handleAction('complete_work'),
          })
        }
        if (userContext === 'locataire') {
          actions.push(
            {
              label: "Modifier le créneau",
              icon: Calendar,
              onClick: () => handleAction('modify_schedule'),
            },
            {
              label: "Rejeter la planification",
              icon: X,
              onClick: () => handleAction('reject_schedule'),
              className: "text-red-600 hover:text-red-800",
            }
          )
        }
        if (userContext === 'gestionnaire') {
          actions.push({
            label: "Replanifier",
            icon: Calendar,
            onClick: () => handleAction('reschedule'),
          })
        }
        break

      case 'en_cours':
        if (userContext === 'prestataire') {
          actions.push({
            label: "Marquer comme terminé",
            icon: CheckCircle,
            onClick: () => handleAction('complete_work'),
          })
        }
        if (userContext === 'gestionnaire') {
          actions.push({
            label: "Marquer comme terminé",
            icon: CheckCircle,
            onClick: () => handleAction('complete_work'),
          })
        }
        break

      case 'cloturee_par_prestataire':
        if (userContext === 'locataire') {
          actions.push(
            {
              label: "Valider les travaux",
              icon: CheckCircle,
              onClick: () => handleAction('validate_work'),
              className: "text-green-600 hover:text-green-800",
            },
            {
              label: "Contester",
              icon: AlertTriangle,
              onClick: () => handleAction('contest_work'),
              className: "text-red-600 hover:text-red-800",
            }
          )
        }
        if (userContext === 'gestionnaire') {
          actions.push({
            label: "Finaliser",
            icon: UserCheck,
            onClick: () => handleAction('finalize'),
          })
        }
        break

      case 'cloturee_par_locataire':
        if (userContext === 'gestionnaire') {
          actions.push({
            label: "Finaliser",
            icon: UserCheck,
            onClick: () => handleAction('finalize'),
          })
        }
        break
    }

    // Actions communes (modifier/supprimer) selon le contexte
    if (['demande', 'approuvee', 'planification'].includes(intervention.status)) {
      if (userContext === 'gestionnaire' || (userContext === 'locataire' && intervention.status === 'demande')) {
        if (actions.length > 0) {
          actions.push({ separator: true })
        }
        actions.push(
          {
            label: "Modifier",
            icon: Edit,
            onClick: () => handleAction('edit'),
          },
          {
            label: "Supprimer",
            icon: Trash2,
            onClick: () => handleAction('delete'),
            className: "text-red-600 hover:text-red-800",
          }
        )
      }
    }

    return actions
  }

  // Handle action clicks
  const handleAction = (actionType: string) => {
    logger.info(`[InterventionCard] Action: ${actionType} for intervention ${intervention.id}`)

    // Route to specific actions based on type
    switch (actionType) {
      case 'approve':
        actionHooks?.approvalHook?.handleApprovalAction?.(intervention, "approve")
        break
      case 'reject':
        actionHooks?.approvalHook?.handleApprovalAction?.(intervention, "reject")
        break
      case 'request_quotes':
        actionHooks?.quotingHook?.handleQuoteRequest?.(intervention)
        break
      case 'manage_quotes':
      case 'submit_quote':
        router.push(`${getInterventionUrl(intervention.id)}?tab=quotes`)
        break
      case 'start_planning':
      case 'propose_slots':
        actionHooks?.planningHook?.handleProgrammingModal?.(intervention)
        break
      case 'confirm_slot':
      case 'add_availabilities':
        router.push(`${getInterventionUrl(intervention.id)}?tab=planning`)
        break
      case 'start_work':
        actionHooks?.executionHook?.handleExecutionModal?.(intervention, "start")
        break
      case 'complete_work':
        actionHooks?.executionHook?.handleExecutionModal?.(intervention, "complete")
        break
      case 'validate_work':
      case 'contest_work':
        router.push(`${getInterventionUrl(intervention.id)}?tab=validation`)
        break
      case 'finalize':
        actionHooks?.finalizationHook?.handleFinalizeModal?.(intervention)
        break
      case 'modify_schedule':
        router.push(`${getInterventionUrl(intervention.id)}?action=modify-schedule`)
        break
      case 'reject_schedule':
        router.push(`${getInterventionUrl(intervention.id)}?tab=planning`)
        break
      case 'reschedule':
        router.push(`${getInterventionUrl(intervention.id)}?tab=planning`)
        break
      case 'edit':
        router.push(`${getInterventionUrl(intervention.id)}/modifier`)
        break
      case 'delete':
        // Handle delete confirmation
        logger.info(`Delete intervention ${intervention.id}`)
        break
      default:
        // Default to opening details page
        router.push(getInterventionUrl(intervention.id))
    }

    onActionComplete?.()
  }

  const typeConfig = getInterventionTypeIcon(intervention.type || "")
  const IconComponent = typeConfig.icon
  const availableActions = getAvailableActions()

  // Compact rendering for dashboard
  if (compact) {
    return (
      <div className="flex items-start sm:items-center space-x-2 sm:space-x-3 p-2 sm:p-3 border rounded-lg hover:bg-slate-50 transition-colors duration-200">
        {/* Type Icon */}
        <div className={`w-8 h-8 sm:w-10 sm:h-10 ${typeConfig.color} rounded-full flex items-center justify-center flex-shrink-0`}>
          <IconComponent className={`h-4 w-4 sm:h-5 sm:w-5 ${typeConfig.iconColor}`} />
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0 space-y-1">
          {/* Title + Status + Urgency */}
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-medium text-sm text-slate-900 truncate">
              {intervention.title}
            </h3>
            <Badge className={`${getStatusColor(intervention.status)} text-xs px-1.5 py-0.5`}>
              {getStatusLabel(intervention.status)}
            </Badge>
            <Badge className={`${getPriorityColor(intervention.urgency || 'normale')} text-xs px-1.5 py-0.5`}>
              {getPriorityLabel(intervention.urgency || 'normale')}
            </Badge>
          </div>

          {/* Location + Creator + Date */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600 flex-wrap">
            <span className="font-medium">
              {getInterventionLocationText(intervention as any)}
            </span>
            <span className="hidden sm:inline">•</span>
            <span className="hidden sm:inline">Créé par {getCreatorName(intervention)}</span>
            <span className="sm:hidden">Par {getCreatorName(intervention)}</span>
            <span className="hidden md:inline">•</span>
            <span className="hidden md:inline">
              {intervention.created_at
                ? new Date(intervention.created_at).toLocaleDateString("fr-FR")
                : "Date inconnue"}
            </span>
          </div>

          {/* Action Expected */}
          <div className="text-xs text-blue-600 font-medium">
            → {getStatusActionMessage(intervention.status, userContext)}
          </div>
        </div>

        {/* Actions */}
        <div className="flex-shrink-0 flex items-center space-x-1">
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 sm:w-auto sm:px-2 p-0 sm:p-2"
            onClick={() => router.push(getInterventionUrl(intervention.id))}
          >
            <Eye className="h-3 w-3" />
            <span className="hidden sm:inline ml-1">Détails</span>
          </Button>
          {availableActions.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 sm:w-auto sm:px-3 p-0 text-slate-500 hover:text-slate-700">
                  <MoreVertical className="h-3 w-3" />
                  <span className="hidden sm:inline ml-1">Action</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {availableActions.map((action, idx) => {
                  if ('separator' in action) {
                    return <DropdownMenuSeparator key={idx} />
                  }
                  return (
                    <DropdownMenuItem
                      key={idx}
                      onClick={action.onClick}
                      className={action.className || ""}
                    >
                      <action.icon className="h-4 w-4 mr-2" />
                      {action.label}
                    </DropdownMenuItem>
                  )
                })}

                {/* Bouton d'annulation pour les statuts éligibles */}
                {showStatusActions && (
                  <InterventionCancelButton
                    intervention={intervention as any}
                    variant="dropdown-item"
                  />
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    )
  }

  // Full card rendering - Material Design spacing équilibré
  return (
    <Card
      className="group hover:shadow-sm transition-all duration-200 flex flex-col hover:bg-slate-50/50 py-0 gap-0 max-w-[360px] w-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardContent className="p-0 flex flex-col">
        <div className="px-4 py-4 flex flex-col">
          <div className="space-y-4">
            {/* Badge action interactif - Affiche les boutons au hover */}
            <div className={`
              ${isAlertMode ? 'bg-orange-50 border-orange-200' : 'bg-blue-50 border-blue-200'}
              border rounded px-3 py-2.5 transition-all duration-200
              ${isHovered ? 'py-3' : 'py-2.5'}
            `}>
              <div className="flex flex-col gap-2.5 w-full">
                {/* Icône et texte - Ligne 1 */}
                <div className="flex items-center gap-2">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0
                    ${isAlertMode ? 'bg-orange-100' : 'bg-blue-100'}`}>
                    <Clock className={`h-3 w-3 ${isAlertMode ? 'text-orange-600' : 'text-blue-600'}`} />
                  </div>
                  <p className={`text-sm font-medium leading-snug
                    ${isAlertMode ? 'text-orange-800' : 'text-blue-800'}`}>
                    {getStatusActionMessage(intervention.status, userContext)}
                  </p>
                </div>

                {/* Boutons d'action - Ligne 2 (affichés seulement au hover) */}
                {isHovered && (
                  <div className="flex items-center justify-end w-full">
                    <InterventionActionButtons
                      intervention={intervention as any}
                      userRole={userContext}
                      userId={user?.id || ''}
                      compact={true}
                      onActionComplete={onActionComplete}
                      onOpenQuoteModal={actionHooks?.quotingHook?.handleQuoteRequest ?
                        () => actionHooks.quotingHook?.handleQuoteRequest?.(intervention) : undefined}
                      onProposeSlots={actionHooks?.planningHook?.handleProgrammingModal ?
                        () => actionHooks.planningHook?.handleProgrammingModal?.(intervention) : undefined}
                      timeSlots={(intervention as any).timeSlots || []}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Header Row */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center space-x-3 min-w-0 flex-1">
                {/* Type Icon */}
                <div 
                  className={`w-10 h-10 ${typeConfig.color} rounded-lg flex items-center justify-center flex-shrink-0`}
                  title={intervention.type || "Non spécifié"}
                >
                  <IconComponent className={`h-5 w-5 ${typeConfig.iconColor}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-lg text-slate-900 truncate leading-tight mt-0.5">{intervention.title}</h3>
                  <div className="flex items-center text-sm font-medium text-slate-600 mt-1 min-w-0">
                    {getInterventionLocationIcon(intervention as any) === "building" ? (
                      <Building2 className="h-4 w-4 mr-2 flex-shrink-0" />
                    ) : (
                      <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
                    )}
                    <span className="truncate">{getInterventionLocationText(intervention as any)}</span>
                    {isBuildingWideIntervention(intervention as any) && (
                      <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0.5 hidden sm:inline-flex">
                        Bâtiment entier
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex-shrink-0 flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0 text-sm flex-shrink-0"
                  onClick={() => router.push(getInterventionUrl(intervention.id))}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                {availableActions.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-500 hover:text-slate-700">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {availableActions.map((action, idx) => {
                        if ('separator' in action) {
                          return <DropdownMenuSeparator key={idx} />
                        }
                        return (
                          <DropdownMenuItem
                            key={idx}
                            onClick={action.onClick}
                            className={action.className || ""}
                          >
                            <action.icon className="h-4 w-4 mr-2" />
                            {action.label}
                          </DropdownMenuItem>
                        )
                      })}

                      {/* Bouton d'annulation pour les statuts éligibles */}
                      {showStatusActions && (
                        <InterventionCancelButton
                          intervention={intervention as any}
                          variant="dropdown-item"
                        />
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>

            {/* Context Badge for Contact Details */}
            {contactContext && (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs bg-sky-50 text-sky-700 border-sky-200">
                  {contactContext.contactRole === 'prestataire' && 'Assigné à'}
                  {contactContext.contactRole === 'locataire' && 'Lot de'}
                  {contactContext.contactRole === 'gestionnaire' && 'Gérée par'}
                  {!contactContext.contactRole && 'Liée à'} {contactContext.contactName}
                </Badge>
              </div>
            )}

            {/* Category, Priority & Status Badges - Ordre: Catégorie → Urgence → Status */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Catégorie */}
              <Badge className={`${getTypeBadgeColor(intervention.type || 'autre')} text-xs px-2.5 py-1 border`}>
                {getTypeLabel(intervention.type || 'autre')}
              </Badge>
              {/* Urgence */}
              <Badge className={`${getPriorityColor(intervention.urgency || 'normale')} text-xs px-2.5 py-1`}>
                {getPriorityLabel(intervention.urgency || 'normale')}
              </Badge>
              {/* Status */}
              <Badge className={`${getStatusColor(intervention.status)} text-xs px-2.5 py-1`}>
                {getStatusLabel(intervention.status)}
              </Badge>
            </div>

            {/* Description - Material Design spacing */}
            {intervention.description && (
              <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">
                {intervention.description}
              </p>
            )}

            {/* Stats Row - Material Design spacing */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <div className="flex items-center space-x-4 overflow-hidden">
                {/* Created date */}
                <div className="flex items-center space-x-1.5 py-3">
                  <div className="w-6 h-6 bg-slate-100 rounded flex items-center justify-center">
                    <Clock className="h-4 w-4 text-slate-600" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-slate-500">Créée le</span>
                    <span className="text-sm text-slate-600">
                      {intervention.created_at
                        ? new Date(intervention.created_at).toLocaleDateString("fr-FR")
                        : "Inconnue"}
                    </span>
                  </div>
                </div>

                {/* Schedule */}
                <div className="flex items-center space-x-1.5 py-3">
                  <div className="w-6 h-6 bg-emerald-100 rounded flex items-center justify-center">
                    <Calendar className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-slate-500">Programmée</span>
                    <span className="text-sm text-slate-600">
                      {intervention.scheduled_date
                        ? new Date(intervention.scheduled_date).toLocaleDateString("fr-FR")
                        : "Non prog."}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

