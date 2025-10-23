"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Building2, Home, Users, MapPin, Eye, ChevronDown, AlertCircle, Zap, Edit, Wrench, UserCircle, Check, X } from "lucide-react"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { useBuildings } from "@/hooks/use-buildings"
import type { Building as BuildingType, Lot as LotType } from "@/hooks/use-buildings"
import LotCard from "@/components/lot-card"
import ContentNavigator from "@/components/content-navigator"

type Lot = LotType
type Building = BuildingType

interface BuildingsData {
  buildings: Building[]
  lots: Lot[]
  teamId: string | null
}

interface PropertySelectorProps {
  mode: "view" | "select"
  onBuildingSelect?: (buildingId: string | null) => void
  onLotSelect?: (lotId: string | null, buildingId?: string) => void
  selectedBuildingId?: string
  selectedLotId?: string
  showActions?: boolean
  hideLotsSelect?: boolean  // ✅ Masquer les boutons Select des lots (utile pour création de lot)
  initialData?: BuildingsData  // ✅ Optional server data
}

interface PropertySelectorViewProps extends Omit<PropertySelectorProps, 'initialData'> {
  buildings: Building[]
  individualLots: Lot[]
  loading: boolean
  hideLotsSelect?: boolean
}

// ⚡ PERFORMANCE: Split into two components to avoid unnecessary hook calls
// When initialData is provided (server-side rendering), we skip the useBuildings hook entirely

/**
 * 🏷️ Helper: Traduire les catégories de lots en français
 */
const getLotCategoryLabel = (category: string): string => {
  const labels: Record<string, string> = {
    'appartement': 'Appartement',
    'collocation': 'Collocation',
    'maison': 'Maison',
    'garage': 'Garage',
    'local_commercial': 'Local commercial',
    'parking': 'Parking',
    'autre': 'Autre'
  }
  return labels[category] || category
}

/**
 * 📧 ContactsBadge - Badge affichant tous les contacts d'un lot avec tooltip détaillé
 */
interface LotContact {
  is_primary?: boolean
  user?: {
    id: string
    name: string
    email: string
    role: string
    provider_category?: string
  }
}

interface ContactsBadgeProps {
  lotContacts?: LotContact[]
}

function ContactsBadge({ lotContacts }: ContactsBadgeProps) {
  if (!lotContacts || lotContacts.length === 0) return null

  // Grouper les contacts par rôle
  const contactsByRole = {
    locataire: lotContacts.filter(c => c.user?.role === 'locataire'),
    gestionnaire: lotContacts.filter(c => c.user?.role === 'gestionnaire'),
    prestataire: lotContacts.filter(c => c.user?.role === 'prestataire'),
    proprietaire: lotContacts.filter(c => c.user?.role === 'proprietaire'),
    autre: lotContacts.filter(c => !['locataire', 'gestionnaire', 'prestataire', 'proprietaire'].includes(c.user?.role || ''))
  }

  const roleLabels: Record<string, { label: string; icon: any; color: string }> = {
    locataire: { label: 'Locataires', icon: Users, color: 'text-blue-700' },
    gestionnaire: { label: 'Gestionnaires', icon: Users, color: 'text-purple-700' },
    prestataire: { label: 'Prestataires', icon: Wrench, color: 'text-green-700' },
    proprietaire: { label: 'Propriétaires', icon: Home, color: 'text-orange-700' },
    autre: { label: 'Autres', icon: UserCircle, color: 'text-gray-700' }
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 border border-blue-200 rounded text-xs cursor-help hover:bg-blue-100 transition-colors">
          <Users className="w-3 h-3 text-blue-600" />
          <span className="text-blue-700 font-medium">{lotContacts.length}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs bg-white border-slate-200 text-slate-900">
        <div className="space-y-2">
          {Object.entries(contactsByRole).map(([role, contacts]) => {
            if (contacts.length === 0) return null
            const roleInfo = roleLabels[role]
            const Icon = roleInfo.icon
            return (
              <div key={role} className="space-y-1">
                <div className={`flex items-center gap-1.5 font-semibold text-xs ${roleInfo.color}`}>
                  <Icon className="w-3 h-3" />
                  <span>{roleInfo.label} ({contacts.length})</span>
                </div>
                <div className="space-y-0.5 pl-4">
                  {contacts.map((contact, idx) => (
                    <p key={contact.user?.id || idx} className="text-xs text-slate-700">
                      • {contact.user?.name || contact.user?.email || 'Contact sans nom'}
                    </p>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </TooltipContent>
    </Tooltip>
  )
}

/**
 * Internal component that renders the property selector UI
 * This component doesn't call any hooks, it just renders the provided data
 */
function PropertySelectorView({
  mode,
  onBuildingSelect,
  onLotSelect,
  selectedBuildingId,
  selectedLotId,
  showActions: _showActions = true,
  hideLotsSelect = false,
  buildings,
  individualLots,
  loading
}: PropertySelectorViewProps) {
  const router = useRouter()
  const [expandedBuildings, setExpandedBuildings] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [filters, setFilters] = useState({
    status: "all",
    interventions: "all"
  })

  const toggleBuildingExpansion = (buildingId: string) => {
    setExpandedBuildings((prev) =>
      prev.includes(buildingId) ? prev.filter((id) => id !== buildingId) : [...prev, buildingId],
    )
  }

  const handleSearch = (value: string) => {
    setSearchTerm(value)
  }

  const handleFilterChange = (filterId: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [filterId]: value
    }))
  }

  // ⚡ PERFORMANCE: Memoize filtered results to avoid recalculating on every render
  // Only recompute when buildings, searchTerm, or filters change
  const filteredBuildings = useMemo(() => {
    return buildings.filter(building => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase()
        const matchesName = building.name.toLowerCase().includes(searchLower)
        const matchesAddress = building.address.toLowerCase().includes(searchLower)
        const matchesLots = (building.lots || []).some((lot: Lot) =>
          lot.reference.toLowerCase().includes(searchLower)
        )
        if (!matchesName && !matchesAddress && !matchesLots) return false
      }

      // Status filter
      if (filters.status !== "all") {
        const hasOccupiedLots = (building.lots || []).some((lot: Lot) => lot.status === "occupied")
        if (filters.status === "occupied" && !hasOccupiedLots) return false
        if (filters.status === "vacant" && hasOccupiedLots) return false
      }

      // Interventions filter
      if (filters.interventions !== "all") {
        const hasInterventions = (building.lots || []).some((lot: Lot) => (lot.interventions || 0) > 0)
        if (filters.interventions === "with" && !hasInterventions) return false
        if (filters.interventions === "without" && hasInterventions) return false
      }

      return true
    })
  }, [buildings, searchTerm, filters])

  // ⚡ PERFORMANCE: Memoize filtered lots to avoid recalculating on every render
  // Only recompute when lots, searchTerm, or filters change
  const filteredIndividualLots = useMemo(() => {
    return individualLots.filter(lot => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase()
        const matchesReference = lot.reference.toLowerCase().includes(searchLower)
        const matchesBuilding = lot.building_name?.toLowerCase().includes(searchLower)
        if (!matchesReference && !matchesBuilding) return false
      }

      // Status filter
      if (filters.status !== "all") {
        if (filters.status === "occupied" && lot.status !== "occupied") return false
        if (filters.status === "vacant" && lot.status === "occupied") return false
      }

      // Interventions filter
      if (filters.interventions !== "all") {
        const hasInterventions = (lot.interventions || 0) > 0
        if (filters.interventions === "with" && !hasInterventions) return false
        if (filters.interventions === "without" && hasInterventions) return false
      }

      return true
    })
  }, [individualLots, searchTerm, filters])

  const buildingsContent = (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
        {loading ? (
          <>
            {[1, 2, 3].map((i) => (
              <Card key={i} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="p-4 space-y-3">
                    <div className="flex items-center space-x-3">
                      <Skeleton className="h-10 w-10 rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-4 w-48" />
                      </div>
                      <Skeleton className="h-8 w-20" />
                    </div>
                    <div className="flex items-center space-x-4">
                      <Skeleton className="h-6 w-16" />
                      <Skeleton className="h-6 w-20" />
                      <Skeleton className="h-6 w-12" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </>
        ) : filteredBuildings.length === 0 ? (
          <div className="col-span-full text-center py-12 px-4">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Building2 className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-3">Aucun immeuble trouvé </h3>
            <p className="text-slate-600 mb-6 max-w-sm mx-auto">
              Ajoutez votre premier immeuble pour gérer votre portefeuille immobilier
            </p>
            <Button 
              size="lg"
              onClick={() => router.push('/gestionnaire/biens/immeubles/nouveau')}
              className="w-full sm:w-auto"
            >
              <Building2 className="h-4 w-4 mr-2" />
              Ajouter un immeuble
            </Button>
          </div>
        ) : (
          filteredBuildings.map((building) => {
            const buildingIdStr = building.id.toString()
            const isExpanded = expandedBuildings.includes(buildingIdStr)
            const occupiedLots = (building.lots || []).filter((lot: Lot) => lot.status === "occupied").length
            const totalInterventions = (building.lots || []).reduce((sum: number, lot: Lot) => sum + (lot.interventions || 0), 0)
            const isSelected = selectedBuildingId === buildingIdStr

            return (
              <Card key={building.id} className={`group hover:shadow-sm transition-all duration-200 flex flex-col h-full ${isSelected ? "ring-2 ring-sky-500 bg-sky-50/50" : "hover:bg-slate-50/50"}`}>
                <CardContent className="p-0 flex flex-col flex-1">
                  <div className="p-4 sm:p-5 flex flex-col flex-1">
                    <div className="space-y-3 flex-1">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3 min-w-0 flex-1 mr-2">
                          <div className="w-10 h-10 bg-sky-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Building2 className="h-5 w-5 text-sky-600" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-base text-slate-900 truncate">{building.name}</h3>
                            <div className="flex items-center text-xs text-slate-600 mt-1 min-w-0">
                              <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
                              <span className="truncate">{building.address}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex-shrink-0 ml-2 flex items-center space-x-1">
                          {mode === "select" ? (
                            <Button
                              variant={isSelected ? "default" : "outline"}
                              size="sm"
                              className="h-8 px-3 text-xs"
                              onClick={() => {
                                if (isSelected) {
                                  onBuildingSelect?.(null)
                                } else {
                                  onBuildingSelect?.(building.id.toString())
                                }
                              }}
                            >
                              {isSelected ? "Sélectionné" : "Sélectionner"}
                            </Button>
                          ) : (
                            <>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="h-8 w-8 p-0 text-slate-500 hover:text-slate-700"
                                onClick={() => router.push(`/gestionnaire/biens/immeubles/modifier/${building.id}`)}
                                title="Modifier l'immeuble"
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="h-8 px-3 text-xs"
                                onClick={() => router.push(`/gestionnaire/biens/immeubles/${building.id}`)}
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                Détails
                              </Button>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-1.5">
                            <div className="w-5 h-5 bg-amber-100 rounded-md flex items-center justify-center">
                              <Home className="h-3 w-3 text-amber-600" />
                            </div>
                            <span className="text-sm font-medium text-slate-900">{(building.lots || []).length}</span>
                            <span className="text-xs text-slate-600">lots</span>
                          </div>
                          
                          <div className="flex items-center space-x-1.5">
                            <div className="w-5 h-5 bg-emerald-100 rounded-md flex items-center justify-center">
                              <Users className="h-3 w-3 text-emerald-600" />
                            </div>
                            <span className="text-sm font-medium text-slate-900">{occupiedLots}</span>
                            <span className="text-xs text-slate-600 hidden sm:inline">occupé(s)</span>
                          </div>

                          {/* Badge contacts de l'immeuble */}
                          {building.building_contacts && building.building_contacts.length > 0 && (
                            <ContactsBadge lotContacts={building.building_contacts} />
                          )}

                          {totalInterventions > 0 && (
                            <div className="flex items-center space-x-1.5">
                              <div className="w-5 h-5 bg-red-100 rounded-md flex items-center justify-center">
                                <AlertCircle className="h-3 w-3 text-red-600" />
                              </div>
                              <span className="text-sm font-medium text-red-700">{totalInterventions}</span>
                            </div>
                          )}
                        </div>

                        {(building.lots || []).length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleBuildingExpansion(buildingIdStr)}
                            className="h-7 px-2 text-xs text-slate-500 hover:text-slate-900 transition-all duration-200"
                          >
                            <div className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                              <ChevronDown className="h-3 w-3" />
                            </div>
                            <span className="ml-1 hidden sm:inline">
                              {isExpanded ? "Réduire" : "Lots"}
                            </span>
                          </Button>
                        )}
                      </div>

                      {(building.lots || []).length > 0 && !isExpanded && (
                        <div className="grid grid-cols-1 gap-2 animate-in fade-in-0 slide-in-from-top-1 duration-300">
                          {(building.lots || []).slice(0, 2).map((lot: Lot) => {
                            const isLotSelected = selectedLotId === lot.id.toString()
                            return (
                              <div
                                key={lot.id}
                                className={`p-2.5 border border-slate-200 rounded-md bg-white hover:bg-slate-50 transition-colors ${
                                  isLotSelected ? "ring-1 ring-sky-500 bg-sky-50" : ""
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2 min-w-0 flex-1">
                                    <div className="font-medium text-sm text-slate-900">{lot.reference}</div>
                                    <Badge
                                      variant={lot.status === "occupied" ? "default" : "secondary"}
                                      className="text-xs h-4 px-1.5"
                                    >
                                      {lot.status === "occupied" ? "Occupé" : "Libre"}
                                    </Badge>
                                    
                                    {/* Badge des contacts avec tooltip */}
                                    {lot.lot_contacts && lot.lot_contacts.length > 0 && (
                                      <ContactsBadge lotContacts={lot.lot_contacts} />
                                    )}
                                  </div>
                                  
                                  <div className="flex items-center gap-1">
                                    {mode === "view" && (
                                      <>
                                        <Button 
                                          variant="ghost" 
                                          size="sm"
                                          className="h-6 w-6 p-0 text-slate-500 hover:text-slate-700"
                                          onClick={() => router.push(`/gestionnaire/biens/lots/modifier/${lot.id}`)}
                                          title="Modifier le lot"
                                        >
                                          <Edit className="h-3 w-3" />
                                        </Button>
                                        <Button 
                                          variant="ghost" 
                                          size="sm"
                                          className="h-6 w-6 p-0 text-slate-500 hover:text-slate-700"
                                          onClick={() => router.push(`/gestionnaire/biens/lots/${lot.id}`)}
                                          title="Voir les détails du lot"
                                        >
                                          <Eye className="h-3 w-3" />
                                        </Button>
                                      </>
                                    )}

                                    {mode === "select" && !hideLotsSelect && (
                                      <Button
                                        variant={isLotSelected ? "default" : "outline"}
                                        size="sm"
                                        className="h-6 px-2 text-xs"
                                        onClick={() => {
                                          if (!isLotSelected) {
                                            onLotSelect?.(lot.id.toString(), building.id.toString())
                                          }
                                        }}
                                      >
                                        {isLotSelected ? "OK" : "Sélectionner"}
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                          
                          {(building.lots || []).length > 2 && (
                            <div className="text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleBuildingExpansion(buildingIdStr)}
                                className="h-7 px-3 text-xs text-slate-500 hover:text-slate-900 border border-dashed border-slate-300 w-full"
                              >
                                +{(building.lots || []).length - 2} lots de plus
                              </Button>
                            </div>
                          )}
                        </div>
                      )}

                      {isExpanded && (building.lots || []).length > 0 && (
                        <div className="pt-2 border-t border-slate-100 animate-in fade-in-0 slide-in-from-top-2 duration-300">
                          <div className="max-h-64 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100 rounded-md">
                            <div className="space-y-2 pr-2">
                              {(building.lots || []).map((lot: Lot) => {
                                const isLotSelected = selectedLotId === lot.id.toString()
                                return (
                                  <div
                                    key={lot.id}
                                    className={`p-2.5 border border-slate-200 rounded-md bg-white hover:bg-slate-50 transition-colors ${
                                      isLotSelected ? "ring-2 ring-sky-500 bg-sky-50" : ""
                                    }`}
                                  >
                                    <div className="flex items-start justify-between min-w-0">
                                      <div className="space-y-1 min-w-0 flex-1 mr-2">
                                        {/* Ligne 1: Référence • Catégorie • Badge icône occupation */}
                                        <div className="flex items-center space-x-2">
                                          {/* Référence */}
                                          <div className="font-medium text-xs text-slate-900">{lot.reference}</div>

                                          {/* Séparateur */}
                                          <span className="text-slate-400 text-xs">•</span>

                                          {/* Catégorie */}
                                          <span className="text-xs text-slate-600">{getLotCategoryLabel(lot.category)}</span>

                                          {/* Séparateur */}
                                          <span className="text-slate-400 text-xs">•</span>

                                          {/* Badge icône occupation (vert/rouge) */}
                                          <Badge
                                            variant="outline"
                                            className={`h-5 w-5 p-0.5 flex items-center justify-center rounded-full ${
                                              lot.status === "occupied"
                                                ? "bg-green-50 border-green-300 text-green-700"
                                                : "bg-red-50 border-red-300 text-red-700"
                                            }`}
                                            title={lot.status === "occupied" ? "Occupé" : "Libre"}
                                          >
                                            {lot.status === "occupied" ? (
                                              <Check className="h-3 w-3" />
                                            ) : (
                                              <X className="h-3 w-3" />
                                            )}
                                          </Badge>
                                        </div>

                                        {/* Ligne 2: Détails (Étage, Porte, Contacts, Interventions) */}
                                        <div className="text-xs text-slate-600 flex items-center space-x-3 min-w-0 flex-wrap">
                                          <span>Étage {lot.floor ?? 0}</span>

                                          {lot.apartment_number && (
                                            <>
                                              <span className="text-slate-400">•</span>
                                              <span>Porte {lot.apartment_number}</span>
                                            </>
                                          )}

                                          {/* Badge des contacts avec tooltip */}
                                          {lot.lot_contacts && lot.lot_contacts.length > 0 && (
                                            <>
                                              <span className="text-slate-400">•</span>
                                              <ContactsBadge lotContacts={lot.lot_contacts} />
                                            </>
                                          )}

                                          {(lot.interventions || 0) > 0 && (
                                            <>
                                              <span className="text-slate-400">•</span>
                                              <div className="flex items-center text-amber-700">
                                                <Zap className="h-3 w-3 mr-1" />
                                                <span>{lot.interventions}</span>
                                              </div>
                                            </>
                                          )}
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-1">
                                        {mode === "view" && (
                                          <>
                                            <Button 
                                              variant="ghost" 
                                              size="sm"
                                              className="h-7 w-7 p-0 text-slate-500 hover:text-slate-700"
                                              onClick={() => router.push(`/gestionnaire/biens/lots/modifier/${lot.id}`)}
                                              title="Modifier le lot"
                                            >
                                              <Edit className="h-3 w-3" />
                                            </Button>
                                            <Button 
                                              variant="ghost" 
                                              size="sm"
                                              className="h-7 w-7 p-0 text-slate-500 hover:text-slate-700"
                                              onClick={() => router.push(`/gestionnaire/biens/lots/${lot.id}`)}
                                              title="Voir les détails du lot"
                                            >
                                              <Eye className="h-3 w-3" />
                                            </Button>
                                          </>
                                        )}

                                        {mode === "select" && !hideLotsSelect && (
                                          <Button
                                            variant={isLotSelected ? "default" : "outline"}
                                            size="sm"
                                            className="h-7 px-3 text-xs"
                                            onClick={() => {
                                              if (!isLotSelected) {
                                                onLotSelect?.(lot.id.toString(), building.id.toString())
                                              }
                                            }}
                                          >
                                            {isLotSelected ? "OK" : "Sélectionner"}
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )

  const individualLotsContent = (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
        {filteredIndividualLots.length === 0 ? (
          <div className="col-span-full text-center py-12 px-4">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Home className="h-8 w-8 text-amber-600" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-3">Aucun lot trouvé</h3>
            <p className="text-slate-600 mb-6 max-w-sm mx-auto">
              Ajoutez votre premier lot pour gérer vos propriétés individuelles
            </p>
            <Button 
              size="lg"
              onClick={() => router.push('/gestionnaire/biens/lots/nouveau')}
              className="w-full sm:w-auto"
            >
              <Home className="h-4 w-4 mr-2" />
              Ajouter un lot
            </Button>
          </div>
        ) : (
          filteredIndividualLots.map((lot) => {
            const isSelected = selectedLotId === lot.id?.toString()

            const lotForCard = {
              id: lot.id?.toString() || "",
              reference: lot.reference,
              // ✅ Phase 2: Pass lot_contacts and is_occupied for proper occupancy calculation
              lot_contacts: (lot as any).lot_contacts || [],
              is_occupied: (lot as any).is_occupied || false,
              tenant_id: lot.status === "occupied" ? "occupied" : null, // Fallback for compatibility
              tenant: undefined as undefined | { id: string; name: string },
              // ✅ Pass building with complete address info
              building: lot.building_name
                ? {
                    id: (lot as any).building?.id || "",
                    name: lot.building_name,
                    address: (lot as any).building?.address || lot.address || undefined,
                    city: (lot as any).building?.city || lot.city || undefined
                  }
                : undefined,
              // Additional lot properties for LotCard display
              floor: (lot as any).floor,
              surface_area: (lot as any).surface_area,
              rooms: (lot as any).rooms,
              apartment_number: (lot as any).apartment_number,
              category: (lot as any).category,
            }

            return (
              <LotCard
                key={lot.id as any}
                lot={lotForCard}
                mode={mode}
                isSelected={isSelected}
                onSelect={onLotSelect}
                showBuilding={true}
              />
            )
          })
        )}
      </div>
    </div>
  )

  const tabs = [
    {
      id: "buildings",
      label: "Immeubles",
      icon: Building2,
      count: filteredBuildings.length,
      content: buildingsContent
    },
    {
      id: "individual-lots", 
      label: "Lots",
      icon: Home,
      count: filteredIndividualLots.length,
      content: individualLotsContent
    }
  ]

  const filterConfigs = [
    {
      id: "status",
      label: "Statut",
      options: [
        { value: "all", label: "Tous" },
        { value: "occupied", label: "Occupés" },
        { value: "vacant", label: "Libres" }
      ],
      defaultValue: "all"
    },
    {
      id: "interventions",
      label: "Interventions",
      options: [
        { value: "all", label: "Tous" },
        { value: "with", label: "Avec interventions" },
        { value: "without", label: "Sans interventions" }
      ],
      defaultValue: "all"
    }
  ]

  return (
    <ContentNavigator
      tabs={tabs}
      defaultTab="buildings"
      searchPlaceholder="Rechercher..."
      filters={filterConfigs}
      onSearch={handleSearch}
      onFilterChange={handleFilterChange}
    />
  )
}

/**
 * Wrapper that uses initialData directly (server-side data)
 * This skips the useBuildings hook entirely, avoiding duplicate fetches
 */
function PropertySelectorWithInitialData(props: PropertySelectorProps & { initialData: BuildingsData }) {
  // DEBUG: Log received data in PropertySelector with detailed lot info
  console.log('🔍 [PROPERTY-SELECTOR] Received initialData:', {
    buildingsCount: props.initialData.buildings.length,
    lotsCount: props.initialData.lots.length,
    firstLot: props.initialData.lots[0] ? {
      reference: props.initialData.lots[0].reference,
      status: props.initialData.lots[0].status,
      is_occupied: props.initialData.lots[0].is_occupied
    } : null,
    buildings: props.initialData.buildings.map(b => ({
      id: b.id,
      name: b.name,
      lotsCount: b.lots?.length || 0,
      lotsDetail: b.lots?.map(l => ({
        reference: l.reference,
        status: l.status,
        is_occupied: l.is_occupied
      }))
    }))
  })

  // DEBUG: Specifically check first building's first lot
  if (props.initialData.buildings[0]?.lots?.[0]) {
    console.log('🔍 [PROPERTY-SELECTOR] First building first lot:', {
      reference: props.initialData.buildings[0].lots[0].reference,
      status: props.initialData.buildings[0].lots[0].status,
      is_occupied: props.initialData.buildings[0].lots[0].is_occupied
    })
  }

  return (
    <PropertySelectorView
      {...props}
      buildings={props.initialData.buildings}
      individualLots={props.initialData.lots}
      loading={false}
    />
  )
}

/**
 * Wrapper that uses the useBuildings hook (client-side fetching)
 * This is used when no server-side data is provided
 */
function PropertySelectorWithHook(props: PropertySelectorProps) {
  const hookData = useBuildings()

  return (
    <PropertySelectorView
      {...props}
      buildings={hookData.data?.buildings || []}
      individualLots={hookData.data?.lots || []}
      loading={hookData.loading}
    />
  )
}

/**
 * Main PropertySelector component
 * Conditionally renders either the initialData version or hook version
 * This prevents duplicate data fetching when server-side data is available
 */
export default function PropertySelector(props: PropertySelectorProps) {
  // ⚡ PERFORMANCE: Choose the right component based on initialData availability
  // If initialData is provided, use it directly (no hook call, no duplicate fetch)
  // Otherwise, fetch data via the useBuildings hook
  return props.initialData
    ? <PropertySelectorWithInitialData {...props} initialData={props.initialData} />
    : <PropertySelectorWithHook {...props} />
}

