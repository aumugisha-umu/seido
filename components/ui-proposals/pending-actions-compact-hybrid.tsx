"use client"

/**
 * VERSION HYBRID: Liste compacte avec accordéon
 *
 * CONCEPT:
 * Fusion entre V1 (list compacte) et V3 (accordéon).
 * Layout horizontal compact quand collapsé + accordéon pour voir TOUS les détails inline.
 * L'utilisateur n'a plus besoin d'aller sur la page de détails de l'intervention.
 *
 * JUSTIFICATION UX:
 * - Compact par défaut = scrolling minimal pour voir interventions en dessous
 * - Accordéon = contrôle utilisateur sur niveau de détail (progressive disclosure)
 * - Tous les détails inline = zéro navigation nécessaire
 * - Chevron indique clairement qu'il y a plus d'infos à voir
 * - Design propre et moderne sans Cards lourdes
 *
 * GAINS:
 * - Hauteur collapsée: ~40-50px par action (comme V1)
 * - Hauteur expandée: ~200-250px avec TOUS les détails
 * - Réduction: -70% en mode collapsé vs version actuelle
 * - UX: Zéro navigation vers pages détails
 */

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  ChevronDown,
  Clock,
  DollarSign,
  FileText,
  MapPin,
  User,
  Wrench,
  Phone,
  Mail,
  Building2,
  Home,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

interface PendingAction {
  id: string
  type: string
  title: string
  description?: string
  status: string
  reference?: string
  priority?: string
  urgency?: string
  location?: {
    building?: string
    lot?: string
    address?: string
    city?: string
    postal_code?: string
  }
  contact?: {
    name: string
    role: string
    phone?: string
    email?: string
  }
  assigned_contact?: {
    name: string
    phone?: string
    email?: string
  }
  dates?: {
    created?: string
    planned?: string
    completed?: string
  }
  metadata?: Record<string, unknown>
  actionUrl: string
}

interface PendingActionsCompactHybridProps {
  actions: PendingAction[]
  userRole: 'locataire' | 'prestataire' | 'gestionnaire'
  onActionClick?: (action: PendingAction) => void
}

interface HybridConfig {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  iconColor: string
  badgeVariant: "default" | "secondary" | "outline" | "destructive"
  badgeClass: string
  label: string
  buttonText: string
  isUrgent?: boolean
}

export function PendingActionsCompactHybrid({
  actions,
  userRole,
  onActionClick
}: PendingActionsCompactHybridProps) {
  const router = useRouter()
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const toggleExpanded = (id: string) => {
    setExpandedIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const getHybridConfig = (action: PendingAction): HybridConfig => {
    const { status } = action

    if (userRole === 'locataire') {
      switch (status) {
        case 'planification':
          return {
            icon: Calendar,
            iconColor: "text-blue-600",
            badgeVariant: "default",
            badgeClass: "bg-blue-100 text-blue-700 hover:bg-blue-100",
            label: "Disponibilités",
            buttonText: "Renseigner",
            isUrgent: true
          }
        case 'demande':
          return {
            icon: Clock,
            iconColor: "text-yellow-600",
            badgeVariant: "secondary",
            badgeClass: "bg-yellow-100 text-yellow-700 hover:bg-yellow-100",
            label: "En attente",
            buttonText: "Voir"
          }
        case 'quote_submitted':
          return {
            icon: DollarSign,
            iconColor: "text-purple-600",
            badgeVariant: "secondary",
            badgeClass: "bg-purple-100 text-purple-700 hover:bg-purple-100",
            label: "Devis reçu",
            buttonText: "Consulter"
          }
        case 'planifiee':
          return {
            icon: CheckCircle,
            iconColor: "text-green-600",
            badgeVariant: "secondary",
            badgeClass: "bg-green-100 text-green-700 hover:bg-green-100",
            label: "Planifiée",
            buttonText: "Voir"
          }
        case 'en_cours':
          return {
            icon: Wrench,
            iconColor: "text-emerald-600",
            badgeVariant: "secondary",
            badgeClass: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
            label: "En cours",
            buttonText: "Suivre"
          }
        default:
          return {
            icon: Clock,
            iconColor: "text-slate-600",
            badgeVariant: "outline",
            badgeClass: "",
            label: "Action requise",
            buttonText: "Voir"
          }
      }
    }

    if (userRole === 'prestataire') {
      switch (status) {
        case "devis-a-fournir":
        case "demande_de_devis":
          return {
            icon: FileText,
            iconColor: "text-sky-600",
            badgeVariant: "default",
            badgeClass: "bg-sky-100 text-sky-700 hover:bg-sky-100",
            label: "Devis à fournir",
            buttonText: "Soumettre",
            isUrgent: true
          }
        case "planification":
          return {
            icon: Calendar,
            iconColor: "text-amber-600",
            badgeVariant: "secondary",
            badgeClass: "bg-amber-100 text-amber-700 hover:bg-amber-100",
            label: "À planifier",
            buttonText: "Planifier"
          }
        case "planifiee":
        case "en_cours":
          return {
            icon: Wrench,
            iconColor: "text-emerald-600",
            badgeVariant: "secondary",
            badgeClass: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
            label: "À réaliser",
            buttonText: "Commencer"
          }
        default:
          return {
            icon: Clock,
            iconColor: "text-slate-600",
            badgeVariant: "outline",
            badgeClass: "",
            label: "En attente",
            buttonText: "Voir"
          }
      }
    }

    if (userRole === 'gestionnaire') {
      switch (status) {
        case 'demande':
          return {
            icon: AlertCircle,
            iconColor: "text-orange-600",
            badgeVariant: "destructive",
            badgeClass: "bg-orange-100 text-orange-700 hover:bg-orange-100",
            label: "À valider",
            buttonText: "Valider",
            isUrgent: true
          }
        case 'demande_de_devis':
          return {
            icon: DollarSign,
            iconColor: "text-purple-600",
            badgeVariant: "default",
            badgeClass: "bg-purple-100 text-purple-700 hover:bg-purple-100",
            label: "Devis",
            buttonText: "Examiner",
            isUrgent: true
          }
        case 'approuvee':
          return {
            icon: FileText,
            iconColor: "text-blue-600",
            badgeVariant: "secondary",
            badgeClass: "bg-blue-100 text-blue-700 hover:bg-blue-100",
            label: "Devis en attente",
            buttonText: "Voir"
          }
        case 'planification':
          return {
            icon: Calendar,
            iconColor: "text-amber-600",
            badgeVariant: "secondary",
            badgeClass: "bg-amber-100 text-amber-700 hover:bg-amber-100",
            label: "Planification",
            buttonText: "Suivre"
          }
        case 'planifiee':
        case 'en_cours':
          return {
            icon: Wrench,
            iconColor: "text-green-600",
            badgeVariant: "secondary",
            badgeClass: "bg-green-100 text-green-700 hover:bg-green-100",
            label: "En cours",
            buttonText: "Surveiller"
          }
        default:
          return {
            icon: Clock,
            iconColor: "text-slate-600",
            badgeVariant: "outline",
            badgeClass: "",
            label: "Action requise",
            buttonText: "Traiter"
          }
      }
    }

    return {
      icon: Clock,
      iconColor: "text-slate-600",
      badgeVariant: "outline",
      badgeClass: "",
      label: "Action requise",
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

  const formatDate = (dateString?: string) => {
    if (!dateString) return null
    try {
      return format(new Date(dateString), "d MMM yyyy 'à' HH:mm", { locale: fr })
    } catch {
      return dateString
    }
  }

  const getUrgencyBadge = (urgency?: string) => {
    if (!urgency || urgency === 'normale') return null

    const urgencyConfig = {
      urgent: { label: 'Urgent', class: 'bg-red-100 text-red-700' },
      elevee: { label: 'Élevée', class: 'bg-orange-100 text-orange-700' },
      haute: { label: 'Haute', class: 'bg-orange-100 text-orange-700' }
    }

    const config = urgencyConfig[urgency as keyof typeof urgencyConfig]
    if (!config) return null

    return (
      <Badge className={`${config.class} text-[10px] px-1.5 py-0 h-4 font-medium border-0`}>
        {config.label}
      </Badge>
    )
  }

  if (actions.length === 0) {
    return (
      <div className="flex items-center gap-3 py-4 text-sm text-muted-foreground">
        <CheckCircle className="w-4 h-4 text-emerald-500" />
        <span>Aucune action en attente</span>
      </div>
    )
  }

  return (
    <div className="space-y-0">
      {actions.map((action, index) => {
        const config = getHybridConfig(action)
        const IconComponent = config.icon
        const isExpanded = expandedIds.has(action.id)

        return (
          <div key={action.id}>
            <Collapsible
              open={isExpanded}
              onOpenChange={() => toggleExpanded(action.id)}
            >
              {/* Collapsed view - Compact horizontal layout */}
              <CollapsibleTrigger asChild>
                <div className="flex items-center gap-3 py-2.5 group hover:bg-accent/50 -mx-2 px-2 rounded-md transition-colors cursor-pointer">
                  {/* Icon */}
                  <div className="flex-shrink-0">
                    <IconComponent className={`w-4 h-4 ${config.iconColor}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    {/* Badge status */}
                    <Badge
                      variant={config.badgeVariant}
                      className={`${config.badgeClass} text-[10px] px-1.5 py-0 h-4 font-medium`}
                    >
                      {config.label}
                    </Badge>

                    {/* Priority badge */}
                    {(config.isUrgent || action.priority === "urgent") && (
                      <Badge
                        variant="destructive"
                        className="text-[10px] px-1.5 py-0 h-4 font-medium"
                      >
                        Urgent
                      </Badge>
                    )}

                    {/* Urgency badge */}
                    {getUrgencyBadge(action.urgency)}

                    {/* Title */}
                    <span className="text-sm font-medium text-foreground truncate">
                      {action.reference ? `${action.reference} - ${action.title}` : action.title}
                    </span>

                    {/* Location - compact */}
                    {action.location && (action.location.building || action.location.lot) && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground ml-auto flex-shrink-0">
                        <MapPin className="w-3 h-3" />
                        <span className="truncate max-w-[200px]">
                          {action.location.building}
                          {action.location.building && action.location.lot && ' • '}
                          {action.location.lot}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Chevron indicator */}
                  <ChevronDown className={`
                    w-4 h-4 text-muted-foreground transition-transform duration-200 flex-shrink-0
                    ${isExpanded ? 'rotate-180' : ''}
                  `} />

                  {/* Action button */}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-3 text-xs bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground flex-shrink-0"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleActionClick(action)
                    }}
                  >
                    {config.buttonText}
                  </Button>
                </div>
              </CollapsibleTrigger>

              {/* Expanded content - ALL intervention details */}
              <CollapsibleContent className="px-2 pb-3 pt-1 space-y-3 animate-in slide-in-from-top-2">
                <div className="pl-7 space-y-3">
                  {/* Description */}
                  {action.description && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-foreground">Description</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {action.description}
                      </p>
                    </div>
                  )}

                  {/* Grid Layout: Localisation | Contact | Dates (Desktop: 3 cols, Mobile: stack) */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Full Location Details */}
                    {action.location && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-foreground">Localisation</p>
                        <div className="space-y-1.5">
                          {action.location.building && (
                            <div className="flex items-start gap-2 text-sm text-muted-foreground">
                              <Building2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                              <span>{action.location.building}</span>
                            </div>
                          )}
                          {action.location.lot && (
                            <div className="flex items-start gap-2 text-sm text-muted-foreground">
                              <Home className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                              <span>{action.location.lot}</span>
                            </div>
                          )}
                          {action.location.address && (
                            <div className="flex items-start gap-2 text-sm text-muted-foreground">
                              <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                              <span>
                                {action.location.address}
                                {action.location.postal_code && `, ${action.location.postal_code}`}
                                {action.location.city && ` ${action.location.city}`}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Contact Information */}
                    {(action.contact || action.assigned_contact) && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-foreground">Contact</p>
                        <div className="space-y-1.5">
                          {action.contact && (
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <User className="w-3.5 h-3.5 flex-shrink-0" />
                                <span className="font-medium">{action.contact.name}</span>
                                <span className="text-xs">({action.contact.role})</span>
                              </div>
                              {action.contact.phone && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground ml-5">
                                  <Phone className="w-3 h-3 flex-shrink-0" />
                                  <a href={`tel:${action.contact.phone}`} className="hover:text-foreground hover:underline">
                                    {action.contact.phone}
                                  </a>
                                </div>
                              )}
                              {action.contact.email && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground ml-5">
                                  <Mail className="w-3 h-3 flex-shrink-0" />
                                  <a href={`mailto:${action.contact.email}`} className="hover:text-foreground hover:underline truncate">
                                    {action.contact.email}
                                  </a>
                                </div>
                              )}
                            </div>
                          )}
                          {action.assigned_contact && (
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <User className="w-3.5 h-3.5 flex-shrink-0" />
                                <span className="font-medium">{action.assigned_contact.name}</span>
                                <span className="text-xs">(Assigné)</span>
                              </div>
                              {action.assigned_contact.phone && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground ml-5">
                                  <Phone className="w-3 h-3 flex-shrink-0" />
                                  <a href={`tel:${action.assigned_contact.phone}`} className="hover:text-foreground hover:underline">
                                    {action.assigned_contact.phone}
                                  </a>
                                </div>
                              )}
                              {action.assigned_contact.email && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground ml-5">
                                  <Mail className="w-3 h-3 flex-shrink-0" />
                                  <a href={`mailto:${action.assigned_contact.email}`} className="hover:text-foreground hover:underline truncate">
                                    {action.assigned_contact.email}
                                  </a>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Important Dates */}
                    {action.dates && (action.dates.created || action.dates.planned || action.dates.completed) && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-foreground">Dates importantes</p>
                        <div className="space-y-1.5">
                          {action.dates.created && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                              <span>Créée le {formatDate(action.dates.created)}</span>
                            </div>
                          )}
                          {action.dates.planned && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                              <span>Planifiée le {formatDate(action.dates.planned)}</span>
                            </div>
                          )}
                          {action.dates.completed && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
                              <span>Terminée le {formatDate(action.dates.completed)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action button - Full width in expanded state */}
                  <div className="pt-1">
                    <Button
                      size="sm"
                      className="w-full h-9 text-sm bg-primary text-primary-foreground hover:bg-primary/90"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleActionClick(action)
                      }}
                    >
                      {config.buttonText}
                    </Button>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Separator between actions */}
            {index < actions.length - 1 && (
              <Separator className="my-0" />
            )}
          </div>
        )
      })}
    </div>
  )
}
