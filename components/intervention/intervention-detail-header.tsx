"use client"

import {
  ArrowLeft,
  Calendar,
  ChevronDown,
  FileText,
  MapPin,
  MoreVertical,
  User,
  Archive,
  CheckCircle,
  XCircle,
  Clock,
  Play,
  RefreshCw,
  Send,
  Eye,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface InterventionHeaderProps {
  intervention: {
    id: string
    title: string
    reference: string
    status?: string  // 🔍 CORRECTIF: Optionnel pour éviter les crashes
    urgency?: string  // 🔍 CORRECTIF: Optionnel pour éviter les crashes
    createdAt: string
    createdBy: string
    lot?: {
      reference: string
      building: {
        name: string
      }
    }
    building?: {
      name: string
    }
  }
  onBack: () => void
  onArchive: () => void
  onStatusAction: (_action: string) => void
  displayMode?: "dropdown" | "buttons" | "custom"
  actionPanel?: React.ReactNode
}

export const InterventionDetailHeader = ({
  intervention,
  onBack,
  onArchive,
  onStatusAction,
  displayMode = "dropdown",
  actionPanel,
}: InterventionHeaderProps) => {
  const getUrgencyConfig = (urgency?: string) => {
    // 🔍 CORRECTIF: Gérer les valeurs undefined/null avec une valeur par défaut
    const safeUrgency = (urgency || 'normale').toLowerCase()
    switch (safeUrgency) {
      case "urgent":
        return {
          color: "bg-red-100 text-red-800 border-red-200",
          dot: "bg-red-500"
        }
      case "normale":
        return {
          color: "bg-blue-100 text-blue-800 border-blue-200",
          dot: "bg-blue-500"
        }
      case "faible":
        return {
          color: "bg-slate-100 text-slate-700 border-slate-200",
          dot: "bg-slate-500"
        }
      default:
        return {
          color: "bg-slate-100 text-slate-700 border-slate-200",
          dot: "bg-slate-500"
        }
    }
  }

  const getStatusConfig = (status?: string) => {
    // 🔍 CORRECTIF: Gérer les valeurs undefined/null avec une valeur par défaut
    const statusLower = (status || 'demande').toLowerCase()
    switch (statusLower) {
      case "demande":
        return { 
          color: "bg-amber-100 text-amber-800 border-amber-200", 
          dot: "bg-amber-500",
          icon: FileText 
        }
      case "approuvée":
      case "approuve":
        return { 
          color: "bg-emerald-100 text-emerald-800 border-emerald-200", 
          dot: "bg-emerald-500",
          icon: CheckCircle 
        }
      case "demande de devis":
        return { 
          color: "bg-purple-100 text-purple-800 border-purple-200", 
          dot: "bg-purple-500",
          icon: FileText 
        }
      case "planification":
        return { 
          color: "bg-amber-100 text-amber-800 border-amber-200", 
          dot: "bg-amber-500",
          icon: Calendar 
        }
      case "planifiée":
      case "a venir":
        return { 
          color: "bg-blue-100 text-blue-800 border-blue-200", 
          dot: "bg-blue-500",
          icon: Clock 
        }
      case "en cours":
        return { 
          color: "bg-indigo-100 text-indigo-800 border-indigo-200", 
          dot: "bg-indigo-500",
          icon: Play 
        }
      case "cloturée par prestataire":
      case "terminé":
      case "terminee":
        return { 
          color: "bg-emerald-100 text-emerald-800 border-emerald-200", 
          dot: "bg-emerald-500",
          icon: CheckCircle 
        }
      case "cloturée par locataire":
        return { 
          color: "bg-emerald-100 text-emerald-800 border-emerald-200", 
          dot: "bg-emerald-500",
          icon: CheckCircle 
        }
      case "cloturée par gestionnaire":
      case "finalisée":
        return { 
          color: "bg-emerald-100 text-emerald-800 border-emerald-200", 
          dot: "bg-emerald-500",
          icon: CheckCircle 
        }
      case "annulée":
      case "rejetée":
        return { 
          color: "bg-red-100 text-red-800 border-red-200", 
          dot: "bg-red-500",
          icon: XCircle 
        }
      default:
        return { 
          color: "bg-slate-100 text-slate-700 border-slate-200", 
          dot: "bg-slate-500",
          icon: FileText 
        }
    }
  }

  // Actions disponibles selon le statut
  const getAvailableActions = (status?: string) => {
    // 🔍 CORRECTIF: Gérer les valeurs undefined/null avec une valeur par défaut
    const statusLower = (status || 'demande').toLowerCase()
    const actions = []
    
    switch (statusLower) {
      case "demande":
        actions.push(
          { key: "approve", label: "Approuver", icon: CheckCircle, variant: "success" },
          { key: "reject", label: "Rejeter", icon: XCircle, variant: "destructive" }
        )
        break
      case "approuvée":
      case "approuve":
        actions.push(
          { key: "request-quote", label: "Demander devis", icon: FileText, variant: "default" },
          { key: "schedule", label: "Planifier directement", icon: Calendar, variant: "default" }
        )
        break
      case "demande de devis":
        actions.push(
          { key: "validate-quote", label: "Valider devis", icon: CheckCircle, variant: "success" },
          { key: "reject-quote", label: "Rejeter devis", icon: XCircle, variant: "destructive" }
        )
        break
      case "planification":
        actions.push(
          { key: "schedule-date", label: "Fixer la date", icon: Calendar, variant: "default" },
          { key: "assign-provider", label: "Assigner prestataire", icon: User, variant: "default" }
        )
        break
      case "planifiée":
      case "a venir":
        actions.push(
          { key: "start", label: "Marquer en cours", icon: Play, variant: "default" },
          { key: "reschedule", label: "Reprogrammer", icon: RefreshCw, variant: "outline" }
        )
        break
      case "en cours":
        actions.push(
          { key: "complete", label: "Marquer terminée", icon: CheckCircle, variant: "success" }
        )
        break
      case "cloturée par prestataire":
      case "terminé":
      case "terminee":
        actions.push(
          { key: "validate-closure", label: "Valider clôture", icon: CheckCircle, variant: "success" },
          { key: "contest", label: "Contester", icon: XCircle, variant: "destructive" }
        )
        break
      case "cloturée par locataire":
        actions.push(
          { key: "finalize", label: "Finaliser", icon: CheckCircle, variant: "success" }
        )
        break
      case "annulée":
      case "rejetée":
        actions.push(
          { key: "reactivate", label: "Réactiver", icon: RefreshCw, variant: "default" }
        )
        break
    }

    // Ajouter le bouton "Annuler" pour tous les statuts après "approuvée"
    const canCancel = ["approuvée", "approuve", "demande de devis", "planification", "planifiée", "a venir", "en cours"].includes(statusLower)
    if (canCancel) {
      actions.push({ key: "cancel", label: "Annuler", icon: XCircle, variant: "destructive" })
    }

    return actions
  }

  const urgencyConfig = getUrgencyConfig(intervention.urgency)
  const statusConfig = getStatusConfig(intervention.status)
  const StatusIcon = statusConfig.icon
  const availableActions = getAvailableActions(intervention.status)

  // Fonction pour obtenir le texte de localisation
  const getLocationText = () => {
    if (intervention.lot) {
      return intervention.lot.building
        ? `Lot ${intervention.lot.reference} • ${intervention.lot.building.name}`
        : `Lot indépendant ${intervention.lot.reference}`
    } else if (intervention.building) {
      return `Bâtiment entier • ${intervention.building.name}`
    }
    return "Localisation non spécifiée"
  }

  return (
    <TooltipProvider>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            {/* Section Gauche - Navigation */}
            <div className="flex items-center space-x-4">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onBack}
                    className="flex items-center space-x-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span className="hidden sm:inline">Retour</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Retourner à la liste des interventions</p>
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Section Centrale - Informations principales */}
            <div className="flex-1 max-w-3xl mx-6">
              <div className="text-center">
                {/* Titre et badges */}
                <div className="flex items-center justify-center space-x-3 mb-2">
                  <h1 className="text-lg sm:text-xl font-bold text-slate-900 truncate">
                    {intervention.title}
                  </h1>
                  
                  {/* Badge de statut avec icône */}
                  <Badge className={`${statusConfig.color} flex items-center space-x-1 font-medium border`}>
                    <div className={`w-2 h-2 rounded-full ${statusConfig.dot}`} />
                    <StatusIcon className="h-3 w-3" />
                    <span>{intervention.status}</span>
                  </Badge>
                  
                  {/* Badge d'urgence */}
                  <Badge className={`${urgencyConfig.color} flex items-center space-x-1 font-medium border`}>
                    <div className={`w-2 h-2 rounded-full ${urgencyConfig.dot}`} />
                    <span>{intervention.urgency}</span>
                  </Badge>
                </div>

                {/* Informations contextuelles */}
                <div className="flex items-center justify-center space-x-4 text-sm text-slate-600">
                  <div className="flex items-center space-x-1">
                    <MapPin className="h-3 w-3" />
                    <span className="truncate max-w-xs">{getLocationText()}</span>
                  </div>
                  
                  <div className="hidden md:flex items-center space-x-1">
                    <User className="h-3 w-3" />
                    <span>{intervention.createdBy}</span>
                  </div>
                  
                  <div className="hidden lg:flex items-center space-x-1">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {new Date(intervention.createdAt).toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Section Droite - Actions */}
            <div className="flex items-center space-x-2">
              {displayMode === "custom" && actionPanel ? (
                // Affichage personnalisé avec le panel d'actions injecté
                <div className="flex items-center space-x-2">
                  {actionPanel}
                </div>
              ) : displayMode === "buttons" ? (
                // Affichage en boutons directs pour gestionnaire
                <>
                  {availableActions.map((action) => {
                    const ActionIcon = action.icon
                    const isDestructive = action.variant === "destructive"
                    const isSuccess = action.variant === "success"
                    return (
                      <Button
                        key={action.key}
                        variant={isDestructive ? "destructive" : isSuccess ? "default" : "outline"}
                        size="sm"
                        onClick={() => onStatusAction(action.key)}
                        className={`flex items-center space-x-2 min-h-[44px] ${
                          isSuccess ? "bg-green-600 hover:bg-green-700 text-white border-green-600" : ""
                        }`}
                      >
                        <ActionIcon className="h-4 w-4" />
                        <span className="hidden sm:inline">{action.label}</span>
                      </Button>
                    )
                  })}
                </>
              ) : (
                // Affichage en dropdown menu (comportement par défaut)
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center space-x-2 text-slate-700 border-slate-300 hover:bg-slate-50 hover:border-slate-400 focus:ring-2 focus:ring-sky-500 focus:outline-none min-h-[44px]"
                    >
                      <MoreVertical className="h-4 w-4" />
                      <span className="hidden sm:inline">Actions</span>
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    {/* Actions principales selon le statut */}
                    {availableActions.length > 0 && (
                      <>
                        {availableActions.map((action) => {
                          const ActionIcon = action.icon
                          return (
                            <DropdownMenuItem
                              key={action.key}
                              onClick={() => onStatusAction(action.key)}
                              className="flex items-center space-x-2"
                            >
                              <ActionIcon className="h-4 w-4" />
                              <span>{action.label}</span>
                            </DropdownMenuItem>
                          )
                        })}
                        <DropdownMenuSeparator />
                      </>
                    )}

                    {/* Actions secondaires */}
                    <DropdownMenuItem className="flex items-center space-x-2">
                      <Eye className="h-4 w-4" />
                      <span>Voir l'historique</span>
                    </DropdownMenuItem>

                    <DropdownMenuItem className="flex items-center space-x-2">
                      <Send className="h-4 w-4" />
                      <span>Partager</span>
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    {/* Action d'archivage */}
                    <DropdownMenuItem
                      onClick={onArchive}
                      className="flex items-center space-x-2 text-slate-600 hover:text-slate-900 hover:bg-slate-50 focus:bg-slate-100 focus:text-slate-900"
                    >
                      <Archive className="h-4 w-4" />
                      <span>Archiver</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
