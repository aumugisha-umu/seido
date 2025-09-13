"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { Building2, Home, Users, Search, Filter, MapPin, Eye, ChevronDown, ChevronRight, ChevronUp, User, Settings, Plus, AlertCircle, Calendar, Zap, Edit } from "lucide-react"
import { useManagerStats } from "@/hooks/use-manager-stats"
import LotCard from "@/components/lot-card"

interface PropertySelectorProps {
  mode: "view" | "select"
  onBuildingSelect?: (buildingId: string | null) => void
  onLotSelect?: (lotId: string | null, buildingId?: string) => void
  selectedBuildingId?: string
  selectedLotId?: string
  showActions?: boolean
}

export default function PropertySelector({
  mode = "view",
  onBuildingSelect,
  onLotSelect,
  selectedBuildingId,
  selectedLotId,
  showActions = true,
}: PropertySelectorProps) {
  const router = useRouter()
  const [expandedBuildings, setExpandedBuildings] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const { data, loading, error } = useManagerStats()

  const buildings = data?.buildings || []
  const individualLots = data?.lots || [] // Récupérer tous les lots depuis les données

  const toggleBuildingExpansion = (buildingId: string) => {
    setExpandedBuildings((prev) =>
      prev.includes(buildingId) ? prev.filter((id) => id !== buildingId) : [...prev, buildingId],
    )
  }

  const getTotalLots = () => {
    return data?.stats.lotsCount || 0
  }

  const getOccupiedLots = () => {
    return data?.stats.occupiedLotsCount || 0
  }

  const getOverallOccupancyRate = () => {
    const total = getTotalLots()
    const occupied = getOccupiedLots()
    return total > 0 ? Math.round((occupied / total) * 100) : 0
  }

  return (
    <Card>
      <CardHeader className="space-y-2 pb-2 sm:space-y-3 sm:pb-3">
        {/* Mobile-First Compact Stats & Actions */}
        <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          {/* Stats - Ultra Compact Mobile */}
          <div className="flex items-center justify-between sm:justify-start space-x-3 sm:space-x-6">
            <div className="flex items-center space-x-1.5">
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-sky-100 rounded-md flex items-center justify-center">
                <Building2 className="h-3 w-3 sm:h-4 sm:w-4 text-sky-600" />
              </div>
              <div>
                {loading ? (
                  <Skeleton className="h-4 w-6 sm:w-12" />
                ) : (
                  <>
                    <div className="text-sm sm:text-lg font-semibold text-slate-900 leading-none">{buildings.length}</div>
                    <div className="hidden sm:block text-xs text-slate-600">Immeubles</div>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-1.5">
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-amber-100 rounded-md flex items-center justify-center">
                <Home className="h-3 w-3 sm:h-4 sm:w-4 text-amber-600" />
              </div>
              <div>
                {loading ? (
                  <Skeleton className="h-4 w-6 sm:w-12" />
                ) : (
                  <>
                    <div className="text-sm sm:text-lg font-semibold text-slate-900 leading-none">{getTotalLots()}</div>
                    <div className="hidden sm:block text-xs text-slate-600">Lots</div>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-1.5">
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-emerald-100 rounded-md flex items-center justify-center">
                <Users className="h-3 w-3 sm:h-4 sm:w-4 text-emerald-600" />
              </div>
              <div>
                {loading ? (
                  <Skeleton className="h-4 w-8 sm:w-16" />
                ) : (
                  <>
                    <div className="text-sm sm:text-lg font-semibold text-slate-900 leading-none">{getOverallOccupancyRate()}%</div>
                    <div className="hidden sm:block text-xs text-slate-600">Occupés</div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Actions - Mobile Responsive */}
          {showActions && mode === "view" && (
            <div className="flex gap-2 sm:gap-3">
              <Button 
                size="sm" 
                className="flex-1 sm:flex-none h-8 sm:h-9 px-3 sm:px-4 text-xs sm:text-sm bg-sky-600 text-white hover:bg-sky-700 focus:ring-sky-500"
                onClick={() => router.push('/gestionnaire/biens/immeubles/nouveau')}
              >
                <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                <span>Immeuble</span>
              </Button>
              <Button 
                size="sm" 
                className="flex-1 sm:flex-none h-8 sm:h-9 px-3 sm:px-4 text-xs sm:text-sm bg-sky-600 text-white hover:bg-sky-700 focus:ring-sky-500"
                onClick={() => router.push('/gestionnaire/biens/lots/nouveau')}
              >
                <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                <span>Lot</span>
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2 pt-0 sm:space-y-3">
        {/* Search Bar - Mobile Compact */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-3 w-3 sm:h-4 sm:w-4" />
          <Input 
            placeholder="Rechercher..." 
            className="pl-9 sm:pl-10 text-sm h-8 sm:h-10 sm:text-base"
          />
        </div>

        <Tabs defaultValue="buildings" className="space-y-2">
          {/* Tabs & Filters Same Line */}
          <div className="flex items-center justify-between gap-2">
            <TabsList className="h-8 sm:h-9 flex-1">
              <TabsTrigger value="buildings" className="text-xs sm:text-sm flex-1 py-1">
                Immeubles ({buildings.length})
              </TabsTrigger>
              <TabsTrigger value="individual-lots" className="text-xs sm:text-sm flex-1 py-1">
                Lots ({individualLots.length})
              </TabsTrigger>
            </TabsList>
            
            {/* Filters Toggle - Compact Mobile */}
            <div className="relative">
              <div className="flex items-center gap-1 sm:gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className="h-8 w-8 p-0 sm:h-8 sm:w-auto sm:px-3 text-slate-600 hover:text-slate-900 flex items-center justify-center sm:justify-start"
                >
                  <Filter className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Filtres</span>
                  <ChevronDown className={`hidden sm:inline h-4 w-4 ml-1 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                </Button>
                
                {showFilters && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="hidden sm:flex h-8 px-3 text-xs text-slate-500 hover:text-slate-700 relative z-20"
                  >
                    Effacer
                  </Button>
                )}
              </div>

              {/* Filters Floating Panel */}
              {showFilters && (
                <>
                  {/* Invisible click area to close */}
                  <div 
                    className="fixed inset-0 z-10"
                    onClick={() => setShowFilters(false)}
                  />
                  
                  {/* Filters Panel - Mobile Optimized */}
                  <div className="fixed top-20 left-4 right-4 sm:absolute sm:top-full sm:left-auto sm:right-0 sm:mt-1 sm:w-80 bg-white border border-slate-200 rounded-lg shadow-xl z-20 p-3 sm:p-4 animate-in fade-in-0 zoom-in-95 duration-200">
                    <div className="space-y-2 sm:space-y-3">
                      <Select defaultValue="all-types">
                        <SelectTrigger className="w-full h-8 sm:h-9 text-xs sm:text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all-types">Tous les types</SelectItem>
                          <SelectItem value="building">Immeubles</SelectItem>
                          <SelectItem value="lot">Lots</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select defaultValue="all-occupations">
                        <SelectTrigger className="w-full h-8 sm:h-9 text-xs sm:text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all-occupations">Toutes occupations</SelectItem>
                          <SelectItem value="occupied">Occupés</SelectItem>
                          <SelectItem value="vacant">Vacants</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select defaultValue="all-interventions">
                        <SelectTrigger className="w-full h-8 sm:h-9 text-xs sm:text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all-interventions">Toutes interventions</SelectItem>
                          <SelectItem value="pending">En attente</SelectItem>
                          <SelectItem value="in-progress">En cours</SelectItem>
                          <SelectItem value="completed">Terminées</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Close button - Mobile Friendly */}
                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-100 sm:justify-end sm:mt-3 sm:pt-3">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setShowFilters(false)}
                        className="sm:hidden h-7 px-3 text-xs text-slate-500 hover:text-slate-700"
                      >
                        Effacer
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setShowFilters(false)}
                        className="h-7 px-3 text-xs text-slate-500 hover:text-slate-700"
                      >
                        Fermer
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <TabsContent value="buildings">
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
              
              ) : buildings.length === 0 ? (
                <div className="col-span-full text-center py-12 px-4">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Building2 className="h-8 w-8 text-slate-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-3">Aucun bâtiment</h3>
                  <p className="text-slate-600 mb-6 max-w-sm mx-auto">
                    Commencez par ajouter votre premier bâtiment pour gérer votre portfolio immobilier
                  </p>
                  <Button 
                    size="lg"
                    onClick={() => router.push('/gestionnaire/biens/immeubles/nouveau')}
                    className="w-full sm:w-auto"
                  >
                    <Building2 className="h-4 w-4 mr-2" />
                    Ajouter un bâtiment
                  </Button>
                </div>
              ) : (
                buildings.map((building) => {
                const isExpanded = expandedBuildings.includes(building.id.toString())
                const occupiedLots = building.lots.filter((lot: any) => lot.status === "occupied").length
                const totalInterventions = building.lots.reduce((sum: number, lot: any) => sum + lot.interventions, 0)
                const isSelected = selectedBuildingId === building.id.toString()

                return (
                  <Card key={building.id} className={`group hover:shadow-sm transition-all duration-200 flex flex-col h-full ${isSelected ? "ring-2 ring-sky-500 bg-sky-50/50" : "hover:bg-slate-50/50"}`}>
                    <CardContent className="p-0 flex flex-col flex-1">
                      {/* Grid-Optimized Compact Design */}
                      <div className="p-4 sm:p-5 flex flex-col flex-1">
                        {/* Header Row - Compact */}
                        <div className="space-y-3 flex-1">
                          {/* Top Row: Icon + Title + Action */}
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
                            
                            {/* Action Buttons - Mobile Responsive */}
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
                                  {isSelected ? "✓ Sélectionné" : "Sélectionner"}
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

                          {/* Stats Row - Mobile Optimized */}
                          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                            <div className="flex items-center space-x-4">
                              <div className="flex items-center space-x-1.5">
                                <div className="w-5 h-5 bg-amber-100 rounded-md flex items-center justify-center">
                                  <Home className="h-3 w-3 text-amber-600" />
                                </div>
                                <span className="text-sm font-medium text-slate-900">{building.lots.length}</span>
                                <span className="text-xs text-slate-600">lots</span>
                              </div>
                              
                              <div className="flex items-center space-x-1.5">
                                <div className="w-5 h-5 bg-emerald-100 rounded-md flex items-center justify-center">
                                  <Users className="h-3 w-3 text-emerald-600" />
                                </div>
                                <span className="text-sm font-medium text-slate-900">{occupiedLots}</span>
                                <span className="text-xs text-slate-600 hidden sm:inline">occupés</span>
                              </div>

                              {totalInterventions > 0 && (
                                <div className="flex items-center space-x-1.5">
                                  <div className="w-5 h-5 bg-red-100 rounded-md flex items-center justify-center">
                                    <AlertCircle className="h-3 w-3 text-red-600" />
                                  </div>
                                  <span className="text-sm font-medium text-red-700">{totalInterventions}</span>
                                </div>
                              )}
                            </div>

                            {/* Expand Toggle with Animation */}
                            {building.lots.length > 0 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleBuildingExpansion(building.id.toString())}
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

                          {/* Lots Preview - Mobile Compact */}
                          {building.lots.length > 0 && !isExpanded && (
                            <div className="grid grid-cols-1 gap-2">
                              {building.lots.slice(0, 2).map((lot: any) => {
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
                                          {lot.status === "occupied" ? "Occupé" : "Vacant"}
                                        </Badge>
                                        
                                        {/* Contact Summary Badge - Compact */}
                                        {(() => {
                                          const lotTenantCount = lot.lot_tenants?.length || (lot.tenant ? 1 : 0)
                                          const lotTenantName = lot.tenant || (lot.lot_tenants?.[0]?.contact?.name)
                                          
                                          if (lotTenantCount === 0) return null
                                          
                                          return (
                                            <div className="relative group">
                                              <div className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 border border-blue-200 rounded text-xs cursor-help hover:bg-blue-100 transition-colors">
                                                <Users className="w-2.5 h-2.5 text-blue-600" />
                                                <span className="text-blue-700 font-medium text-xs">{lotTenantCount}</span>
                                              </div>
                                              
                                              {/* Mini Tooltip - Positionné relativement */}
                                              <div className="absolute bottom-full left-0 mb-1 w-48 max-w-[calc(100vw-2rem)] bg-white border border-slate-200 rounded-md shadow-lg p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none group-hover:pointer-events-auto z-[100]
                                                            before:content-[''] before:absolute before:top-full before:left-3 before:w-0 before:h-0 before:border-l-[3px] before:border-r-[3px] before:border-t-[3px] before:border-l-transparent before:border-r-transparent before:border-t-white">
                                                <div className="text-xs text-slate-700 mb-1 font-medium">
                                                  {lotTenantCount === 1 ? 'Contact assigné:' : 'Contacts assignés:'}
                                                </div>
                                                {lot.lot_tenants?.length > 0 ? (
                                                  <div className="space-y-1">
                                                    {lot.lot_tenants.slice(0, 3).map((tenantInfo: any, idx: number) => (
                                                      <div key={idx} className="flex items-center gap-1.5 text-xs">
                                                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                                                        <span className="text-slate-700">{tenantInfo.contact?.name}</span>
                                                        <span className="text-slate-500">(locataire)</span>
                                                      </div>
                                                    ))}
                                                    {lot.lot_tenants.length > 3 && (
                                                      <div className="text-xs text-slate-500">+{lot.lot_tenants.length - 3} autres</div>
                                                    )}
                                                  </div>
                                                ) : lotTenantName && (
                                                  <div className="flex items-center gap-1.5 text-xs">
                                                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                                                    <span className="text-slate-700">{lotTenantName}</span>
                                                    <span className="text-slate-500">(locataire)</span>
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          )
                                        })()}
                                      </div>
                                      
                                        <div className="flex items-center gap-1">
                                          {mode === "view" && (
                                            <>
                                              {/* Edit Button for Lots */}
                                              <Button 
                                                variant="ghost" 
                                                size="sm"
                                                className="h-6 w-6 p-0 text-slate-500 hover:text-slate-700"
                                                onClick={() => router.push(`/gestionnaire/biens/lots/modifier/${lot.id}`)}
                                                title="Modifier le lot"
                                              >
                                                <Edit className="h-3 w-3" />
                                              </Button>
                                              {/* Details Button for Lots */}
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
                                          
                                          {mode === "select" && (
                                            <Button
                                              variant={isLotSelected ? "default" : "outline"}
                                              size="sm"
                                              className="h-6 px-2 text-xs"
                                              onClick={() => {
                                                if (isLotSelected) {
                                                  onLotSelect?.(null)
                                                } else {
                                                  onLotSelect?.(lot.id, building.id)
                                                }
                                              }}
                                            >
                                              {isLotSelected ? "✓" : "Select"}
                                            </Button>
                                          )}
                                        </div>
                                    </div>
                                  </div>
                                )
                              })}
                              
                              {building.lots.length > 2 && (
                                <div className="text-center">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => toggleBuildingExpansion(building.id.toString())}
                                    className="h-7 px-3 text-xs text-slate-500 hover:text-slate-900 border border-dashed border-slate-300 w-full"
                                  >
                                    +{building.lots.length - 2} autres lots
                                  </Button>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Expanded Lots View - Controlled Height with Animation */}
                          {isExpanded && building.lots.length > 0 && (
                            <div className="pt-2 border-t border-slate-100 animate-in fade-in-0 slide-in-from-top-2 duration-300">
                              <div className="max-h-64 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100 rounded-md">
                                <div className="space-y-2 pr-2">
                                {building.lots.map((lot: any) => {
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
                                          <div className="flex items-center space-x-2">
                                            <div className="font-medium text-xs text-slate-900">{lot.reference}</div>
                                            <Badge
                                              variant={lot.status === "occupied" ? "default" : "secondary"}
                                              className="text-xs h-3 px-1.5"
                                            >
                                              {lot.status === "occupied" ? "Occupé" : "Vacant"}
                                            </Badge>
                                          </div>
                                          
                                          <div className="text-xs text-slate-600 flex items-center space-x-3 min-w-0">
                                            <span>Étage {lot.floor}</span>
                                            {lot.interventions > 0 && (
                                              <div className="flex items-center text-amber-700">
                                                <Zap className="h-3 w-3 mr-1" />
                                                <span>{lot.interventions}</span>
                                              </div>
                                            )}
                                            
                                            {/* Contact Summary for Expanded View */}
                                            {(() => {
                                              const expandedTenantCount = lot.lot_tenants?.length || (lot.tenant ? 1 : 0)
                                              if (expandedTenantCount === 0) return null
                                              
                                              return (
                                                <div className="relative">
                                                  <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 border border-blue-200 rounded text-xs cursor-help w-fit hover:bg-blue-100 transition-colors peer">
                                                    <Users className="w-3 h-3 text-blue-600" />
                                                    <span className="text-blue-700 font-medium">
                                                      {expandedTenantCount} locataire{expandedTenantCount > 1 ? 's' : ''}
                                                    </span>
                                                  </div>
                                                  
                                                  {/* Expanded Tooltip - Maximum Z-Index */}
                                                  <div className="fixed w-56 bg-white border border-slate-200 rounded-lg shadow-xl p-3 opacity-0 invisible peer-hover:opacity-100 peer-hover:visible hover:opacity-100 hover:visible transition-all duration-200 pointer-events-none peer-hover:pointer-events-auto hover:pointer-events-auto"
                                                    style={{
                                                      zIndex: 2147483647, // Maximum z-index value
                                                      left: '50%',
                                                      top: '20%',
                                                      transform: 'translateX(-50%)'
                                                    }}>
                                                    <div className="font-medium text-xs text-slate-700 mb-2">
                                                      {expandedTenantCount === 1 ? 'Contact assigné à' : 'Contacts assignés à'} {lot.reference}:
                                                    </div>
                                                    {lot.lot_tenants?.length > 0 ? (
                                                      <div className="space-y-1">
                                                        {lot.lot_tenants.map((tenantInfo: any, idx: number) => (
                                                          <div key={idx} className="flex items-center gap-2 text-xs">
                                                            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                                            <span className="text-slate-700">{tenantInfo.contact?.name}</span>
                                                            <span className="text-slate-500">(locataire)</span>
                                                            {tenantInfo.is_primary && (
                                                              <span className="text-xs bg-blue-100 text-blue-700 px-1 py-0.5 rounded">Principal</span>
                                                            )}
                                                          </div>
                                                        ))}
                                                      </div>
                                                    ) : (
                                                      <div className="flex items-center gap-2 text-xs">
                                                        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                                        <span className="text-slate-700">{lot.tenant}</span>
                                                        <span className="text-slate-500">(locataire)</span>
                                                      </div>
                                                    )}
                                                    
                                                    {/* Arrow */}
                                                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-white"></div>
                                                  </div>
                                                </div>
                                              )
                                            })()}
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-1">
                                          {mode === "view" && (
                                            <>
                                              {/* Edit Button for Expanded Lots */}
                                              <Button 
                                                variant="ghost" 
                                                size="sm"
                                                className="h-7 w-7 p-0 text-slate-500 hover:text-slate-700"
                                                onClick={() => router.push(`/gestionnaire/biens/lots/modifier/${lot.id}`)}
                                                title="Modifier le lot"
                                              >
                                                <Edit className="h-3 w-3" />
                                              </Button>
                                              {/* Details Button for Expanded Lots */}
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

                                          {mode === "select" && (
                                            <Button
                                              variant={isLotSelected ? "default" : "outline"}
                                              size="sm"
                                              className="h-7 px-3 text-xs"
                                              onClick={() => {
                                                if (isLotSelected) {
                                                  onLotSelect?.(null)
                                                } else {
                                                  onLotSelect?.(lot.id.toString(), building.id.toString())
                                                }
                                              }}
                                            >
                                              {isLotSelected ? "✓" : "Sélectionner"}
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
              }))}
            </div>
          </TabsContent>

          <TabsContent value="individual-lots">
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
              {individualLots.length === 0 ? (
                <div className="col-span-full text-center py-12 px-4">
                  <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Home className="h-8 w-8 text-amber-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-3">Aucun lot individuel</h3>
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
                individualLots.map((lot) => {
                  const isSelected = selectedLotId === lot.id?.toString()
                  
                  return (
                    <LotCard
                      key={lot.id}
                      lot={lot}
                      mode={mode}
                      isSelected={isSelected}
                      onSelect={onLotSelect}
                      showBuilding={true}
                    />
                  )
                }))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

