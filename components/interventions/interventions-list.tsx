"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { InterventionCancelButton } from "@/components/intervention/intervention-cancel-button"
import {
  Eye,
  MoreVertical,
  Edit,
  Trash2,
  Check,
  Play,
  CheckCircle,
  Calendar,
  Clock,
  MapPin,
  Building2,
  Wrench,
  Plus,
  Droplets,
  Zap,
  Flame,
  Key,
  Paintbrush,
  Hammer,
} from "lucide-react"

import { 
  getInterventionLocationText, 
  getInterventionLocationIcon, 
  isBuildingWideIntervention,
  getStatusColor,
  getStatusLabel,
  getPriorityColor,
  getPriorityLabel 
} from "@/lib/intervention-utils"

interface InterventionsListProps {
  interventions: any[]
  loading?: boolean
  emptyStateConfig?: {
    title: string
    description: string
    showCreateButton?: boolean
    createButtonText?: string
    createButtonAction?: () => void
  }
  showStatusActions?: boolean
  contactContext?: {
    contactId: string
    contactName: string
    contactRole?: string
  }
  className?: string
  actionHooks?: {
    approvalHook?: any
    planningHook?: any
    executionHook?: any
    finalizationHook?: any
  }
}

export function InterventionsList({
  interventions,
  loading = false,
  emptyStateConfig,
  showStatusActions = true,
  contactContext,
  className = "",
  actionHooks
}: InterventionsListProps) {
  const router = useRouter()

  // Get intervention type icon and color
  const getInterventionTypeIcon = (type: string) => {
    const typeConfig = {
      plomberie: { icon: Droplets, color: "bg-blue-100", iconColor: "text-blue-600" },
      electricite: { icon: Zap, color: "bg-yellow-100", iconColor: "text-yellow-600" },
      chauffage: { icon: Flame, color: "bg-red-100", iconColor: "text-red-600" },
      serrurerie: { icon: Key, color: "bg-gray-100", iconColor: "text-gray-600" },
      peinture: { icon: Paintbrush, color: "bg-purple-100", iconColor: "text-purple-600" },
      maintenance: { icon: Hammer, color: "bg-orange-100", iconColor: "text-orange-600" },
    }
    
    return typeConfig[type?.toLowerCase() as keyof typeof typeConfig] || {
      icon: Wrench,
      color: "bg-amber-100",
      iconColor: "text-amber-600"
    }
  }

  // Get actions for intervention based on status
  const getStatusActions = (intervention: any) => {
    const commonActions = [
      {
        label: "Modifier",
        icon: Edit,
        onClick: () => console.log(`[InterventionsList] Edit intervention ${intervention.id}`),
      },
      {
        label: "Supprimer",
        icon: Trash2,
        onClick: () => console.log(`[InterventionsList] Delete intervention ${intervention.id}`),
        className: "text-red-600 hover:text-red-800",
      },
    ]

    if (!showStatusActions) {
      return commonActions
    }

    const statusActions = []

    // Phase 1 : Demande
    if (intervention.status === "demande") {
      statusActions.push({
        label: "Approuver / Rejeter",
        icon: Check,
        onClick: actionHooks?.approvalHook 
          ? () => actionHooks.approvalHook.handleApprovalAction(intervention, "approve")
          : () => console.log(`[InterventionsList] Approve intervention ${intervention.id}`),
      })
    }

    // Phase 2 : Planification & Exécution
    if (intervention.status === "demande_de_devis") {
      statusActions.push({
        label: "Afficher les devis",
        icon: Eye,
        onClick: actionHooks?.finalizationHook
          ? () => actionHooks.finalizationHook.handleQuotesModal(intervention)
          : () => console.log(`[InterventionsList] Show quotes ${intervention.id}`),
      })
    }

    if (intervention.status === "approuvee") {
      statusActions.push({
        label: "Planifier",
        icon: Calendar,
        onClick: actionHooks?.planningHook
          ? () => actionHooks.planningHook.handleProgrammingModal(intervention)
          : () => console.log(`[InterventionsList] Plan intervention ${intervention.id}`),
      })
    }

    if (intervention.status === "planifiee") {
      statusActions.push({
        label: "Démarrer / Annuler",
        icon: Play,
        onClick: actionHooks?.executionHook
          ? () => actionHooks.executionHook.handleExecutionModal(intervention, "start")
          : () => console.log(`[InterventionsList] Start intervention ${intervention.id}`),
      })
    }

    // Phase 3 : Clôture
    if (intervention.status === "cloturee_par_locataire") {
      statusActions.push({
        label: "Finaliser et clôturer",
        icon: CheckCircle,
        onClick: actionHooks?.finalizationHook
          ? () => actionHooks.finalizationHook.handleFinalizeModal(intervention)
          : () => console.log(`[InterventionsList] Finalize intervention ${intervention.id}`),
      })
    }

    // Pour les statuts "demande" et "approuvee", ne pas inclure les actions communes
    if (intervention.status === "demande" || intervention.status === "approuvee") {
      return statusActions
    }

    // Pour tous les autres statuts, inclure les actions communes
    return [...statusActions, ...commonActions]
  }

  if (loading) {
    return (
      <div className={`grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6 ${className}`}>
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4 lg:p-5">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3 flex-1">
                    <div className="w-10 h-10 bg-slate-200 rounded-lg"></div>
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                      <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                    </div>
                  </div>
                  <div className="w-16 h-8 bg-slate-200 rounded"></div>
                </div>
                <div className="flex space-x-2">
                  <div className="h-6 bg-slate-200 rounded w-20"></div>
                  <div className="h-6 bg-slate-200 rounded w-16"></div>
                </div>
                <div className="h-3 bg-slate-200 rounded w-full"></div>
                <div className="h-3 bg-slate-200 rounded w-2/3"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (interventions.length === 0) {
    const defaultEmptyConfig = {
      title: "Aucune intervention",
      description: "Les interventions apparaîtront ici",
      showCreateButton: false,
      createButtonText: "Créer une intervention",
      createButtonAction: () => router.push("/gestionnaire/interventions/nouvelle-intervention")
    }

    const config = { ...defaultEmptyConfig, ...emptyStateConfig }

    return (
      <div className={`text-center py-12 ${className}`}>
        <Wrench className="h-12 w-12 text-slate-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-900 mb-2">
          {config.title}
        </h3>
        <p className="text-slate-500 mb-6">
          {config.description}
        </p>
        {config.showCreateButton && (
          <Button onClick={config.createButtonAction}>
            <Plus className="h-4 w-4 mr-2" />
            {config.createButtonText}
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6 ${className}`}>
      {interventions.map((intervention) => (
        <Card key={intervention.id} className="group hover:shadow-sm transition-all duration-200 flex flex-col h-full hover:bg-slate-50/50">
          <CardContent className="p-0 flex flex-col flex-1">
            <div className="p-3 sm:p-4 lg:p-5 flex flex-col flex-1">
              <div className="space-y-2.5 sm:space-y-3 flex-1">
                {/* Header Row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                    {/* Type Icon */}
                    {(() => {
                      const typeConfig = getInterventionTypeIcon(intervention.type || "")
                      const IconComponent = typeConfig.icon
                      return (
                        <div className={`w-8 h-8 sm:w-10 sm:h-10 ${typeConfig.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                          <IconComponent className={`h-4 w-4 sm:h-5 sm:w-5 ${typeConfig.iconColor}`} />
                        </div>
                      )
                    })()}
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-sm sm:text-base text-slate-900 truncate leading-tight">{intervention.title}</h3>
                      <div className="flex items-center text-xs text-slate-600 mt-0.5 sm:mt-1 min-w-0">
                        {getInterventionLocationIcon(intervention) === "building" ? (
                          <Building2 className="h-3 w-3 mr-1 flex-shrink-0" />
                        ) : (
                          <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
                        )}
                        <span className="truncate">{getInterventionLocationText(intervention)}</span>
                        {isBuildingWideIntervention(intervention) && (
                          <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0.5 hidden sm:inline-flex">
                            Bâtiment entier
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex-shrink-0 flex items-center space-x-1">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="h-8 w-8 sm:w-auto sm:px-3 p-0 sm:p-2 text-xs flex-shrink-0"
                      onClick={() => router.push(`/gestionnaire/interventions/${intervention.id}`)}
                    >
                      <Eye className="h-3 w-3" />
                      <span className="hidden sm:inline ml-1">Détails</span>
                    </Button>
                    {getStatusActions(intervention).length > 0 && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-500 hover:text-slate-700">
                            <MoreVertical className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {getStatusActions(intervention).map((action, idx) => (
                            <DropdownMenuItem
                              key={idx}
                              onClick={action.onClick}
                              className={("className" in action) ? action.className : ""}
                            >
                              <action.icon className="h-4 w-4 mr-2" />
                              {action.label}
                            </DropdownMenuItem>
                          ))}
                          
                          {/* Bouton d'annulation pour les statuts éligibles */}
                          {showStatusActions && (
                            <InterventionCancelButton
                              intervention={intervention}
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

                {/* Status & Priority Badges */}
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <Badge className={`${getStatusColor(intervention.status)} text-xs px-1.5 sm:px-2 py-0.5 sm:py-1`}>
                    {getStatusLabel(intervention.status)}
                  </Badge>
                  <Badge className={`${getPriorityColor(intervention.urgency)} text-xs px-1.5 sm:px-2 py-0.5 sm:py-1`}>
                    {getPriorityLabel(intervention.urgency)}
                  </Badge>
                </div>

                {/* Description */}
                {intervention.description && (
                  <p className="text-xs sm:text-sm text-slate-600 line-clamp-2 leading-relaxed">
                    {intervention.description}
                  </p>
                )}

                {/* Stats Row */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <div className="flex items-center space-x-3 lg:space-x-4 overflow-hidden">
                    {/* Type */}
                    {(() => {
                      const typeConfig = getInterventionTypeIcon(intervention.type || "")
                      const IconComponent = typeConfig.icon
                      return (
                        <div className="flex items-center space-x-1.5">
                          <div className={`w-5 h-5 ${typeConfig.color} rounded-md flex items-center justify-center`}>
                            <IconComponent className={`h-3 w-3 ${typeConfig.iconColor}`} />
                          </div>
                          <span className="text-xs text-slate-600 truncate">
                            {intervention.type || "Non spécifié"}
                          </span>
                        </div>
                      )
                    })()}
                    
                    {/* Schedule */}
                    <div className="flex items-center space-x-1.5">
                      <div className="w-5 h-5 bg-emerald-100 rounded-md flex items-center justify-center">
                        <Calendar className="h-3 w-3 text-emerald-600" />
                      </div>
                      <span className="text-xs text-slate-600 hidden sm:inline">
                        {intervention.scheduled_date
                          ? new Date(intervention.scheduled_date).toLocaleDateString("fr-FR")
                          : "Non prog."}
                      </span>
                    </div>

                    {/* Created date */}
                    <div className="flex items-center space-x-1.5">
                      <div className="w-5 h-5 bg-slate-100 rounded-md flex items-center justify-center">
                        <Clock className="h-3 w-3 text-slate-600" />
                      </div>
                      <span className="text-xs text-slate-500 hidden md:inline">
                        {intervention.created_at
                          ? new Date(intervention.created_at).toLocaleDateString("fr-FR")
                          : "Inconnue"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}