"use client"

import {
  ArrowLeft,
  Calendar,
  ChevronDown,
  Mail,
  MoreVertical,
  User,
  Archive,
  Edit,
  MessageSquare,
  Send,
  RefreshCw,
  UserX,
  Phone,
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

interface ContactData {
  id: string
  name: string
  email: string
  phone?: string
  role: string
  provider_category?: string
  speciality?: string
  createdAt: string
  createdBy?: string
}

interface ContactHeaderProps {
  contact: ContactData
  invitationStatus: string | null
  invitationLoading?: boolean
  onBack: () => void
  onEdit: () => void
  onArchive: () => void
  onInvitationAction: (_action: string) => void
  customActions?: Array<{
    key: string
    label: string
    icon: React.ComponentType<{ className?: string }>
    onClick: () => void
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost"
  }>
}

export const ContactDetailHeader = ({
  contact,
  invitationStatus,
  invitationLoading = false,
  onBack,
  onEdit,
  onArchive,
  onInvitationAction,
  customActions = [],
}: ContactHeaderProps) => {
  // Configuration des rôles
  const getRoleConfig = (_role: string) => {
    switch (_role.toLowerCase()) {
      case "locataire":
        return {
          color: "bg-blue-100 text-blue-800 border-blue-200",
          dot: "bg-blue-500",
          label: "Locataire",
        }
      case "gestionnaire":
        return {
          color: "bg-purple-100 text-purple-800 border-purple-200",
          dot: "bg-purple-500",
          label: "Gestionnaire",
        }
      case "prestataire":
        return {
          color: "bg-emerald-100 text-emerald-800 border-emerald-200",
          dot: "bg-emerald-500",
          label: "Prestataire",
        }
      default:
        return {
          color: "bg-slate-100 text-slate-700 border-slate-200",
          dot: "bg-slate-500",
          label: _role,
        }
    }
  }

  // Configuration des catégories de prestataire
  const getProviderCategoryConfig = (category?: string) => {
    if (!category) return null
    
    switch (category.toLowerCase()) {
      case "syndic":
        return {
          color: "bg-orange-100 text-orange-800 border-orange-200",
          dot: "bg-orange-500",
          label: "Syndic",
        }
      case "notaire":
        return {
          color: "bg-indigo-100 text-indigo-800 border-indigo-200",
          dot: "bg-indigo-500",
          label: "Notaire",
        }
      case "assurance":
        return {
          color: "bg-teal-100 text-teal-800 border-teal-200",
          dot: "bg-teal-500",
          label: "Assurance",
        }
      case "proprietaire":
        return {
          color: "bg-amber-100 text-amber-800 border-amber-200",
          dot: "bg-amber-500",
          label: "Propriétaire",
        }
      default:
        return {
          color: "bg-slate-100 text-slate-600 border-slate-200",
          dot: "bg-slate-500",
          label: category,
        }
    }
  }

  // Configuration du statut d'invitation
  const getInvitationConfig = () => {
    if (invitationLoading) {
      return {
        color: "bg-slate-100 text-slate-600 border-slate-200",
        dot: "bg-slate-400",
        label: "Vérification...",
      }
    }

    switch (invitationStatus) {
      case "accepted":
        return {
          color: "bg-emerald-100 text-emerald-800 border-emerald-200",
          dot: "bg-emerald-500",
          label: "Actif",
        }
      case "pending":
        return {
          color: "bg-blue-100 text-blue-800 border-blue-200",
          dot: "bg-blue-500",
          label: "Invitation envoyée",
        }
      case "expired":
        return {
          color: "bg-amber-100 text-amber-800 border-amber-200",
          dot: "bg-amber-500",
          label: "Invitation expirée",
        }
      case "cancelled":
        return {
          color: "bg-red-100 text-red-800 border-red-200",
          dot: "bg-red-500",
          label: "Invitation annulée",
        }
      default:
        return {
          color: "bg-slate-100 text-slate-600 border-slate-200",
          dot: "bg-slate-500",
          label: "Pas de compte",
        }
    }
  }

  // Actions d'invitation selon le statut
  const getInvitationActions = () => {
    const actions = []

    switch (invitationStatus) {
      case "accepted":
        actions.push({
          key: "open-chat",
          label: "Ouvrir le chat",
          icon: MessageSquare,
        })
        break
      case "pending":
        actions.push(
          {
            key: "resend-invitation",
            label: "Renvoyer l'invitation",
            icon: RefreshCw,
          },
          {
            key: "revoke-invitation",
            label: "Révoquer l'invitation",
            icon: UserX,
          }
        )
        break
      case "expired":
      case "cancelled":
      case null:
        actions.push({
          key: "send-invitation",
          label: "Envoyer une invitation",
          icon: Send,
        })
        break
    }

    return actions
  }

  const roleConfig = getRoleConfig(contact.role)
  const categoryConfig = getProviderCategoryConfig(contact.provider_category)
  const invitationConfig = getInvitationConfig()
  const invitationActions = getInvitationActions()

  // Badges à afficher
  const badges = [
    {
      ...roleConfig,
      icon: User,
    },
    categoryConfig && {
      ...categoryConfig,
      icon: User,
    },
    {
      ...invitationConfig,
      icon: MessageSquare,
    },
  ].filter(Boolean)

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
                  <p>Retourner à la liste des contacts</p>
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Section Centrale - Informations principales */}
            <div className="flex-1 max-w-3xl mx-6">
              <div className="text-center">
                {/* Titre et badges */}
                <div className="flex items-center justify-center space-x-3 mb-2">
                  <h1 className="text-lg sm:text-xl font-bold text-slate-900 truncate">
                    {contact.name}
                  </h1>
                  
                  {/* Badges dynamiques */}
                  {badges.map((badge, index: number) => {
                    const BadgeIcon = badge.icon
                    return (
                      <Badge key={index} className={`${badge.color} flex items-center space-x-1 font-medium border`}>
                        <div className={`w-2 h-2 rounded-full ${badge.dot}`} />
                        <BadgeIcon className="h-3 w-3" />
                        <span>{badge.label}</span>
                      </Badge>
                    )
                  })}
                </div>

                {/* Informations contextuelles */}
                <div className="flex items-center justify-center space-x-4 text-sm text-slate-600">
                  <div className="flex items-center space-x-1">
                    <Mail className="h-3 w-3" />
                    <span className="truncate max-w-xs">{contact.email}</span>
                  </div>
                  
                  {contact.phone && (
                    <div className="hidden sm:flex items-center space-x-1">
                      <Phone className="h-3 w-3" />
                      <span>{contact.phone}</span>
                    </div>
                  )}
                  
                  {contact.createdBy && (
                    <div className="hidden md:flex items-center space-x-1">
                      <User className="h-3 w-3" />
                      <span>Créé par {contact.createdBy}</span>
                    </div>
                  )}
                  
                  <div className="hidden lg:flex items-center space-x-1">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {new Date(contact.createdAt).toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Section Droite - Actions */}
            <div className="flex items-center space-x-2">
              {/* Menu dropdown pour toutes les actions */}
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
                  {/* Action modifier toujours présente */}
                  <DropdownMenuItem 
                    onClick={onEdit}
                    className="flex items-center space-x-2"
                  >
                    <Edit className="h-4 w-4" />
                    <span>Modifier</span>
                  </DropdownMenuItem>
                  
                  {/* Actions d'invitation */}
                  {invitationActions.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      {invitationActions.map((action) => {
                        const ActionIcon = action.icon
                        return (
                          <DropdownMenuItem
                            key={action.key}
                            onClick={() => onInvitationAction(action.key)}
                            className="flex items-center space-x-2"
                            disabled={invitationLoading}
                          >
                            <ActionIcon className="h-4 w-4" />
                            <span>{action.label}</span>
                          </DropdownMenuItem>
                        )
                      })}
                    </>
                  )}

                  {/* Actions personnalisées */}
                  {customActions.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      {customActions.map((action) => {
                        const ActionIcon = action.icon
                        return (
                          <DropdownMenuItem
                            key={action.key}
                            onClick={action.onClick}
                            className="flex items-center space-x-2"
                          >
                            <ActionIcon className="h-4 w-4" />
                            <span>{action.label}</span>
                          </DropdownMenuItem>
                        )
                      })}
                    </>
                  )}

                  {/* Action d'archivage */}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={onArchive}
                    className="flex items-center space-x-2 text-slate-600 hover:text-slate-900 hover:bg-slate-50 focus:bg-slate-100 focus:text-slate-900"
                  >
                    <Archive className="h-4 w-4" />
                    <span>Archiver</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
