"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  AlertCircle,
  CheckCircle,
  MapPin,
  Wrench,
  FileText,
  Calendar,
  Clock,
  Building,
  MessageSquare,
  DollarSign,
  User,
  ChevronDown,
  ChevronUp
} from "lucide-react"
import { useRouter } from "next/navigation"

// Types pour les actions en attente
interface ActionConfig {
  bgColor: string
  borderColor: string
  iconBg: string
  iconColor: string
  textColor: string
  subtextColor: string
  icon: any
  actionLabel: string
  buttonText: string
  urgentAction?: boolean
}

interface PendingAction {
  id: string
  type: string
  title: string
  description?: string
  status: string
  reference?: string
  priority?: string
  location?: {
    building?: string
    lot?: string
  }
  contact?: {
    name: string
    role: string
  }
  metadata?: Record<string, any>
  actionUrl: string
}

interface PendingActionsCardProps {
  title?: string
  description?: string
  actions: PendingAction[]
  userRole: 'locataire' | 'prestataire' | 'gestionnaire'
  loading?: boolean
  emptyStateTitle?: string
  emptyStateDescription?: string
  onActionClick?: (action: PendingAction) => void
}

export function PendingActionsCard({
  title = "Actions en attente",
  description = "Interventions nécessitant votre attention",
  actions,
  userRole,
  loading = false,
  emptyStateTitle = "Aucune action en attente",
  emptyStateDescription = "Toutes vos interventions sont à jour",
  onActionClick
}: PendingActionsCardProps) {
  const router = useRouter()
  // ✅ Fermée par défaut si vide, ouverte si des actions existent
  const [isExpanded, setIsExpanded] = useState(actions.length > 0)

  // ✅ Mettre à jour l'état quand les actions changent (après chargement async)
  useEffect(() => {
    setIsExpanded(actions.length > 0)
  }, [actions.length])

  // Configuration des actions selon le rôle utilisateur et le type/statut
  const getActionConfig = (action: PendingAction): ActionConfig => {
    const { type, status } = action

    // Configurations pour les locataires
    if (userRole === 'locataire') {
      switch (status) {
        case 'planification':
          return {
            bgColor: "bg-blue-50",
            borderColor: "border-blue-200",
            iconBg: "bg-blue-100",
            iconColor: "text-blue-600",
            textColor: "text-blue-900",
            subtextColor: "text-blue-700",
            icon: Calendar,
            actionLabel: "Disponibilités à renseigner",
            buttonText: "Renseigner",
            urgentAction: true
          }
        case 'demande':
        case 'nouvelle_demande':
          return {
            bgColor: "bg-yellow-50",
            borderColor: "border-yellow-200",
            iconBg: "bg-yellow-100",
            iconColor: "text-yellow-600",
            textColor: "text-yellow-900",
            subtextColor: "text-yellow-700",
            icon: Clock,
            actionLabel: "En attente de validation",
            buttonText: "Voir détails"
          }
        case 'quote_submitted':
          return {
            bgColor: "bg-purple-50",
            borderColor: "border-purple-200",
            iconBg: "bg-purple-100",
            iconColor: "text-purple-600",
            textColor: "text-purple-900",
            subtextColor: "text-purple-700",
            icon: DollarSign,
            actionLabel: "Devis reçu",
            buttonText: "Consulter devis"
          }
        case 'planifiee':
          return {
            bgColor: "bg-green-50",
            borderColor: "border-green-200",
            iconBg: "bg-green-100",
            iconColor: "text-green-600",
            textColor: "text-green-900",
            subtextColor: "text-green-700",
            icon: CheckCircle,
            actionLabel: "Intervention planifiée",
            buttonText: "Voir planning"
          }
        case 'en_cours':
          return {
            bgColor: "bg-emerald-50",
            borderColor: "border-emerald-200",
            iconBg: "bg-emerald-100",
            iconColor: "text-emerald-600",
            textColor: "text-emerald-900",
            subtextColor: "text-emerald-700",
            icon: Wrench,
            actionLabel: "Intervention en cours",
            buttonText: "Suivre"
          }
        default:
          return {
            bgColor: "bg-slate-50",
            borderColor: "border-slate-200",
            iconBg: "bg-slate-100",
            iconColor: "text-slate-600",
            textColor: "text-slate-900",
            subtextColor: "text-slate-700",
            icon: MessageSquare,
            actionLabel: "Action requise",
            buttonText: "Voir"
          }
      }
    }

    // Configurations pour les prestataires (configuration originale)
    if (userRole === 'prestataire') {
      switch (status) {
        case "devis-a-fournir":
        case "demande_de_devis":
          return {
            bgColor: "bg-sky-50",
            borderColor: "border-sky-200",
            iconBg: "bg-sky-100",
            iconColor: "text-sky-600",
            textColor: "text-sky-900",
            subtextColor: "text-sky-700",
            icon: FileText,
            actionLabel: "Devis à fournir",
            buttonText: "Soumettre devis"
          }
        case "planification":
          return {
            bgColor: "bg-amber-50",
            borderColor: "border-amber-200",
            iconBg: "bg-amber-100",
            iconColor: "text-amber-600",
            textColor: "text-amber-900",
            subtextColor: "text-amber-700",
            icon: Calendar,
            actionLabel: "À planifier",
            buttonText: "Planifier"
          }
        case "programmee":
        case "en_cours":
          return {
            bgColor: "bg-emerald-50",
            borderColor: "border-emerald-200",
            iconBg: "bg-emerald-100",
            iconColor: "text-emerald-600",
            textColor: "text-emerald-900",
            subtextColor: "text-emerald-700",
            icon: Wrench,
            actionLabel: "À réaliser",
            buttonText: "Commencer"
          }
        default:
          return {
            bgColor: "bg-slate-50",
            borderColor: "border-slate-200",
            iconBg: "bg-slate-100",
            iconColor: "text-slate-600",
            textColor: "text-slate-900",
            subtextColor: "text-slate-700",
            icon: Clock,
            actionLabel: "En attente",
            buttonText: "Voir"
          }
      }
    }

    // Configuration par défaut pour gestionnaires ou autres rôles
    return {
      bgColor: "bg-slate-50",
      borderColor: "border-slate-200",
      iconBg: "bg-slate-100",
      iconColor: "text-slate-600",
      textColor: "text-slate-900",
      subtextColor: "text-slate-700",
      icon: Clock,
      actionLabel: "Action requise",
      buttonText: "Traiter"
    }
  }

  const handleActionClick = (action: PendingAction) => {
    if (onActionClick) {
      onActionClick(action)
    } else {
      router.push(action.actionUrl)
    }
  }

  if (loading) {
    return (
      <Card className="mb-8">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="animate-pulse flex-1">
              <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              disabled
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-4">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-20 bg-gray-200 rounded-lg"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="mb-8">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <AlertCircle className="w-5 h-5 text-orange-500" />
              {title}
              {actions.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {actions.length}
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="mt-1">
              {description}
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-slate-100"
            onClick={() => setIsExpanded(!isExpanded)}
            aria-label={isExpanded ? "Masquer les actions" : "Afficher les actions"}
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-slate-600" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-600" />
            )}
          </Button>
        </div>
      </CardHeader>
      {isExpanded && (
        <CardContent className="pt-0">
        {actions.length === 0 ? (
          <div className="text-center py-6">
            <CheckCircle className="w-12 h-12 mx-auto mb-4 text-emerald-500" />
            <p className="text-slate-600 font-medium">{emptyStateTitle}</p>
            <p className="text-sm text-slate-500">{emptyStateDescription}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {actions.map((action) => {
              const config = getActionConfig(action)
              const IconComponent = config.icon

              return (
                <Card key={action.id} className={`${config.bgColor} ${config.borderColor} border`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className={`w-8 h-8 ${config.iconBg} rounded-full flex items-center justify-center flex-shrink-0 mt-1`}>
                          <IconComponent className={`h-4 w-4 ${config.iconColor}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={`${config.bgColor} ${config.textColor} border-0 text-xs`}>
                              {config.actionLabel}
                            </Badge>
                            {config.urgentAction && (
                              <Badge variant="destructive" className="text-xs">
                                Action requise
                              </Badge>
                            )}
                            {action.priority === "urgent" && (
                              <Badge variant="destructive" className="text-xs">
                                Urgent
                              </Badge>
                            )}
                          </div>
                          <h4 className={`font-medium ${config.textColor} mb-1 truncate`}>
                            {action.reference ? `${action.reference} - ${action.title}` : action.title}
                          </h4>
                          {action.description && (
                            <p className={`text-xs ${config.subtextColor} mb-2`}>
                              {action.description}
                            </p>
                          )}
                          <div className={`text-xs ${config.subtextColor} space-y-1`}>
                            {action.location && (action.location.building || action.location.lot) && (
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                <span>
                                  {action.location.building}
                                  {action.location.building && action.location.lot && ' • '}
                                  {action.location.lot}
                                </span>
                              </div>
                            )}
                            {action.contact && (
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                <span>{action.contact.role}: {action.contact.name}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 ml-4">
                        <Button
                          size="sm"
                          className="bg-sky-600 hover:bg-sky-700 text-white"
                          onClick={() => handleActionClick(action)}
                        >
                          {config.buttonText}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
        </CardContent>
      )}
    </Card>
  )
}