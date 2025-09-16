"use client"

import {
  Search,
  Wrench,
  Calendar,
  MapPin,
  Building2,
  Clock,
  Eye,
  MoreVertical,
  AlertTriangle,
  Loader2,
  CheckCircle,
  ListTodo,
  Settings,
  Archive,
  Droplets,
  Zap,
  Flame,
  Key,
  Paintbrush,
  Hammer,
  FileText,
} from "lucide-react"
import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { 
  getInterventionLocationText, 
  getInterventionLocationIcon, 
  isBuildingWideIntervention,
  getStatusColor,
  getStatusLabel,
  getPriorityColor,
  getPriorityLabel 
} from "@/lib/intervention-utils"

interface InterventionAction {
  label: string
  icon: React.ComponentType<any>
  onClick: () => void
  className?: string
}

interface TabConfig {
  id: string
  label: string
  icon: React.ComponentType<any>
  statuses: string[]
}

interface InterventionsListProps {
  interventions: any[]
  userRole: 'tenant' | 'manager' | 'provider'
  loading?: boolean
  error?: string | null
  showTabs?: boolean
  tabsConfig?: TabConfig[]
  displayMode?: 'grid' | 'list'
  showSearch?: boolean
  showActions?: boolean
  onInterventionClick?: (intervention: any) => void
  renderActions?: (intervention: any) => InterventionAction[]
  emptyStateConfig?: {
    title: string
    description: string
    showCreateButton?: boolean
    createButtonText?: string
    onCreateClick?: () => void
  }
}

// Configuration des icônes de type d'intervention
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

// Configuration des onglets par défaut selon le rôle
const getDefaultTabsConfig = (userRole: string): TabConfig[] => {
  switch (userRole) {
    case 'tenant':
      return [
        {
          id: "en_cours",
          label: "En cours",
          icon: Clock,
          statuses: ['demande', 'approuvee', 'planifiee', 'en_cours']
        },
        {
          id: "cloturees",
          label: "Clôturées", 
          icon: CheckCircle,
          statuses: ['cloturee_par_prestataire', 'cloturee_par_locataire', 'cloturee_par_gestionnaire', 'rejetee', 'annulee']
        }
      ]
    case 'provider':
      return [
        {
          id: "demande_de_devis",
          label: "Devis à fournir",
          icon: FileText,
          statuses: ['demande_de_devis']
        },
        {
          id: "planification",
          label: "Planification", 
          icon: Calendar,
          statuses: ['planification']
        },
        {
          id: "planifiee",
          label: "Planifiées",
          icon: Clock,
          statuses: ['planifiee']
        },
        {
          id: "en_cours",
          label: "En cours",
          icon: Settings,
          statuses: ['en_cours']
        },
        {
          id: "terminees", 
          label: "Terminées",
          icon: CheckCircle,
          statuses: ['cloturee_par_prestataire']
        }
      ]
    case 'manager':
    default:
      return [
        {
          id: "toutes",
          label: "Toutes",
          icon: ListTodo,
          statuses: []
        },
        {
          id: "demandes", 
          label: "Demandes",
          icon: AlertTriangle,
          statuses: ['demande', 'approuvee']
        },
        {
          id: "en_cours",
          label: "En cours",
          icon: Settings, 
          statuses: ['demande_de_devis', 'planification', 'planifiee', 'en_cours', 'cloturee_par_prestataire']
        },
        {
          id: "cloturees",
          label: "Clôturées",
          icon: Archive,
          statuses: ['cloturee_par_locataire', 'cloturee_par_gestionnaire', 'annulee', 'rejetee']
        }
      ]
  }
}

export default function InterventionsList({
  interventions,
  userRole,
  loading = false,
  error = null,
  showTabs = true,
  tabsConfig,
  displayMode = 'grid',
  showSearch = true,
  showActions = true,
  onInterventionClick,
  renderActions,
  emptyStateConfig
}: InterventionsListProps) {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  
  // Configuration des onglets
  const finalTabsConfig = tabsConfig || getDefaultTabsConfig(userRole)
  
  // Initialiser l'onglet actif avec la première option disponible
  const [activeTab, setActiveTab] = useState(finalTabsConfig[0]?.id || "")

  // Filtrer les interventions selon l'onglet actif
  const getFilteredInterventions = (tabId: string) => {
    if (tabId === "toutes") {
      return interventions
    }
    
    const tab = finalTabsConfig.find(t => t.id === tabId)
    if (!tab || tab.statuses.length === 0) {
      return interventions
    }
    
    return interventions.filter(intervention => 
      tab.statuses.includes(intervention.status)
    )
  }

  // Appliquer la recherche
  const searchFilteredInterventions = useMemo(() => {
    const tabFiltered = getFilteredInterventions(activeTab)
    
    if (!searchTerm) {
      return tabFiltered
    }
    
    return tabFiltered.filter(intervention =>
      intervention.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      intervention.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getInterventionLocationText(intervention)?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [activeTab, searchTerm, interventions, finalTabsConfig])

  // Calculer les compteurs pour chaque onglet
  const getTabCount = (tabId: string) => {
    return getFilteredInterventions(tabId).length
  }

  // Gestion du clic sur une intervention
  const handleInterventionClick = (intervention: any) => {
    if (onInterventionClick) {
      onInterventionClick(intervention)
    } else {
      // Navigation par défaut selon le rôle
      switch (userRole) {
        case 'tenant':
          router.push(`/locataire/interventions/${intervention.id}`)
          break
        case 'manager':
          router.push(`/gestionnaire/interventions/${intervention.id}`)
          break
        case 'provider':
          router.push(`/prestataire/interventions/${intervention.id}`)
          break
      }
    }
  }

  // Rendu d'une intervention en mode grid
  const renderInterventionCard = (intervention: any) => {
    const typeConfig = getInterventionTypeIcon(intervention.type || "")
    const IconComponent = typeConfig.icon
    const actions = renderActions ? renderActions(intervention) : []

    return (
      <Card 
        key={intervention.id} 
        className="group hover:shadow-sm transition-all duration-200 flex flex-col h-full hover:bg-slate-50/50 cursor-pointer"
        onClick={() => handleInterventionClick(intervention)}
      >
        <CardContent className="p-0 flex flex-col flex-1">
          <div className="p-4 sm:p-5 flex flex-col flex-1">
            <div className="space-y-3 flex-1">
              {/* Header Row */}
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3 min-w-0 flex-1 mr-2">
                  {/* Type Icon */}
                  <div className={`w-10 h-10 ${typeConfig.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                    <IconComponent className={`h-5 w-5 ${typeConfig.iconColor}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-base text-slate-900 truncate">{intervention.title}</h3>
                    <div className="flex items-center text-xs text-slate-600 mt-1 min-w-0">
                      {getInterventionLocationIcon(intervention) === "building" ? (
                        <Building2 className="h-3 w-3 mr-1 flex-shrink-0" />
                      ) : (
                        <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
                      )}
                      <span className="truncate">{getInterventionLocationText(intervention)}</span>
                      {isBuildingWideIntervention(intervention) && (
                        <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0.5">
                          Bâtiment entier
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Actions */}
                {showActions && actions.length > 0 && (
                  <div className="flex-shrink-0 ml-2 flex items-center space-x-1">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="h-8 px-3 text-xs"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleInterventionClick(intervention)
                      }}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      Détails
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-slate-500 hover:text-slate-700"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {actions.map((action, idx) => (
                          <DropdownMenuItem
                            key={idx}
                            onClick={(e) => {
                              e.stopPropagation()
                              action.onClick()
                            }}
                            className={action.className || ""}
                          >
                            <action.icon className="h-4 w-4 mr-2" />
                            {action.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
              </div>

              {/* Status & Priority Badges */}
              <div className="flex items-center gap-2">
                <Badge className={`${getStatusColor(intervention.status)} text-xs px-2 py-1`}>
                  {getStatusLabel(intervention.status)}
                </Badge>
                {intervention.urgency && (
                  <Badge className={`${getPriorityColor(intervention.urgency)} text-xs px-2 py-1`}>
                    {getPriorityLabel(intervention.urgency)}
                  </Badge>
                )}
              </div>

              {/* Description */}
              {intervention.description && (
                <p className="text-sm text-slate-600 line-clamp-2">
                  {intervention.description}
                </p>
              )}

              {/* Stats Row */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <div className="flex items-center space-x-3 lg:space-x-4 overflow-hidden">
                  {/* Type */}
                  <div className="flex items-center space-x-1.5">
                    <div className={`w-5 h-5 ${typeConfig.color} rounded-md flex items-center justify-center`}>
                      <IconComponent className={`h-3 w-3 ${typeConfig.iconColor}`} />
                    </div>
                    <span className="text-xs text-slate-600 truncate">
                      {intervention.type || "Non spécifié"}
                    </span>
                  </div>
                  
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
    )
  }

  // Rendu d'une intervention en mode liste
  const renderInterventionListItem = (intervention: any) => {
    const typeConfig = getInterventionTypeIcon(intervention.type || "")
    const IconComponent = typeConfig.icon
    const actions = renderActions ? renderActions(intervention) : []

    return (
      <Card 
        key={intervention.id} 
        className="hover:shadow-md transition-shadow cursor-pointer"
        onClick={() => handleInterventionClick(intervention)}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              <div className={`w-10 h-10 ${typeConfig.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                <IconComponent className={`h-5 w-5 ${typeConfig.iconColor}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-medium text-slate-900 truncate">{intervention.title}</h3>
                  <Badge className={getStatusColor(intervention.status)}>
                    {getStatusLabel(intervention.status)}
                  </Badge>
                  {intervention.urgency && (
                    <Badge className={getPriorityColor(intervention.urgency)}>
                      {getPriorityLabel(intervention.urgency)}
                    </Badge>
                  )}
                </div>
                {intervention.description && (
                  <p className="text-sm text-slate-600 mb-2 line-clamp-2">{intervention.description}</p>
                )}
                <div className="flex items-center text-xs text-slate-500 space-x-4">
                  <div className="flex items-center gap-1">
                    {getInterventionLocationIcon(intervention) === "building" ? (
                      <Building2 className="h-3 w-3" />
                    ) : (
                      <MapPin className="h-3 w-3" />
                    )}
                    <span className="truncate">{getInterventionLocationText(intervention)}</span>
                  </div>
                  <span>Créé le {new Date(intervention.created_at).toLocaleDateString('fr-FR')}</span>
                  {intervention.scheduled_date && (
                    <span>Programmé le {new Date(intervention.scheduled_date).toLocaleDateString('fr-FR')}</span>
                  )}
                </div>
              </div>
            </div>
            
            {showActions && actions.length > 0 && (
              <div className="flex items-center gap-2 ml-4">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleInterventionClick(intervention)
                  }}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Détails
                </Button>
                {actions.slice(0, 1).map((action, idx) => (
                  <Button
                    key={idx}
                    variant="default"
                    size="sm" 
                    onClick={(e) => {
                      e.stopPropagation()
                      action.onClick()
                    }}
                  >
                    <action.icon className="h-4 w-4 mr-2" />
                    {action.label}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  // État de chargement
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-2 text-slate-600">Chargement des interventions...</span>
      </div>
    )
  }

  // État d'erreur
  if (error) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-900 mb-2">Erreur de chargement</h3>
        <p className="text-slate-500 mb-4">{error}</p>
        <Button onClick={() => window.location.reload()}>Réessayer</Button>
      </div>
    )
  }

  // Rendu des interventions
  const renderInterventions = (tabId: string) => {
    const filteredInterventions = searchFilteredInterventions

    if (filteredInterventions.length === 0) {
      const config = emptyStateConfig || {
        title: "Aucune intervention",
        description: "Aucune intervention trouvée pour cette catégorie"
      }
      
      return (
        <div className="text-center py-12">
          <Wrench className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">{config.title}</h3>
          <p className="text-slate-500 mb-6">{config.description}</p>
          {config.showCreateButton && config.onCreateClick && (
            <Button onClick={config.onCreateClick}>
              <AlertTriangle className="h-4 w-4 mr-2" />
              {config.createButtonText || "Créer une intervention"}
            </Button>
          )}
        </div>
      )
    }

    if (displayMode === 'grid') {
      return (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
          {filteredInterventions.map(renderInterventionCard)}
        </div>
      )
    } else {
      return (
        <div className="space-y-4">
          {filteredInterventions.map(renderInterventionListItem)}
        </div>
      )
    }
  }

  // Pas d'onglets - affichage simple
  if (!showTabs) {
    return (
      <div className="space-y-6">
        {showSearch && (
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Rechercher une intervention..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        )}
        {renderInterventions("default")}
      </div>
    )
  }

  // Avec onglets
  return (
    <div className="space-y-6">
      {showSearch && (
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Rechercher une intervention..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className={`grid w-full ${finalTabsConfig.length <= 4 ? `grid-cols-${finalTabsConfig.length}` : 'grid-cols-4'} mb-6`}>
          {finalTabsConfig.map((tab) => {
            const IconComponent = tab.icon
            return (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="flex flex-col items-center py-3 gap-1"
              >
                <div className="flex items-center gap-2">
                  <IconComponent className="h-4 w-4" />
                  <span className="text-xs truncate">{tab.label}</span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {getTabCount(tab.id)}
                </Badge>
              </TabsTrigger>
            )
          })}
        </TabsList>

        {finalTabsConfig.map((tab) => (
          <TabsContent key={tab.id} value={tab.id}>
            {renderInterventions(tab.id)}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
