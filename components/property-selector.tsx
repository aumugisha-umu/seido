"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Building2, Home, Users, MapPin, Eye, ChevronDown, AlertCircle, Zap, Edit } from "lucide-react"
import { useManagerStats } from "@/hooks/use-manager-stats"
import LotCard from "@/components/lot-card"
import ContentNavigator from "@/components/content-navigator"

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
  const [searchTerm, setSearchTerm] = useState("")
  const [filters, setFilters] = useState({
    status: "all",
    interventions: "all"
  })
  const { data, loading, error } = useManagerStats()

  const buildings = data?.buildings || []
  const individualLots = data?.lots || []

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

  const filterBuildings = (buildingsList: any[]) => {
    return buildingsList.filter(building => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase()
        const matchesName = building.name.toLowerCase().includes(searchLower)
        const matchesAddress = building.address.toLowerCase().includes(searchLower)
        const matchesLots = building.lots.some((lot: any) => 
          lot.reference.toLowerCase().includes(searchLower)
        )
        if (!matchesName && !matchesAddress && !matchesLots) return false
      }

      // Status filter
      if (filters.status !== "all") {
        const hasOccupiedLots = building.lots.some((lot: any) => lot.status === "occupied")
        if (filters.status === "occupied" && !hasOccupiedLots) return false
        if (filters.status === "vacant" && hasOccupiedLots) return false
      }

      // Interventions filter
      if (filters.interventions !== "all") {
        const hasInterventions = building.lots.some((lot: any) => lot.interventions > 0)
        if (filters.interventions === "with" && !hasInterventions) return false
        if (filters.interventions === "without" && hasInterventions) return false
      }

      return true
    })
  }

  const filterIndividualLots = (lotsList: any[]) => {
    return lotsList.filter(lot => {
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
        const hasInterventions = lot.interventions > 0
        if (filters.interventions === "with" && !hasInterventions) return false
        if (filters.interventions === "without" && hasInterventions) return false
      }

      return true
    })
  }

  const filteredBuildings = filterBuildings(buildings)
  const filteredIndividualLots = filterIndividualLots(individualLots)

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
            <h3 className="text-xl font-semibold text-slate-900 mb-3">No buildings</h3>
            <p className="text-slate-600 mb-6 max-w-sm mx-auto">
              Start by adding your first building to manage your real estate portfolio
            </p>
            <Button 
              size="lg"
              onClick={() => router.push('/gestionnaire/biens/immeubles/nouveau')}
              className="w-full sm:w-auto"
            >
              <Building2 className="h-4 w-4 mr-2" />
              Add building
            </Button>
          </div>
        ) : (
          filteredBuildings.map((building) => {
            const buildingIdStr = building.id.toString()
            const isExpanded = expandedBuildings.includes(buildingIdStr)
            const occupiedLots = building.lots.filter((lot: any) => lot.status === "occupied").length
            const totalInterventions = building.lots.reduce((sum: number, lot: any) => sum + lot.interventions, 0)
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
                              {isSelected ? "Selected" : "Select"}
                            </Button>
                          ) : (
                            <>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="h-8 w-8 p-0 text-slate-500 hover:text-slate-700"
                                onClick={() => router.push(`/gestionnaire/biens/immeubles/modifier/${building.id}`)}
                                title="Edit building"
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
                                Details
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
                            <span className="text-sm font-medium text-slate-900">{building.lots.length}</span>
                            <span className="text-xs text-slate-600">lots</span>
                          </div>
                          
                          <div className="flex items-center space-x-1.5">
                            <div className="w-5 h-5 bg-emerald-100 rounded-md flex items-center justify-center">
                              <Users className="h-3 w-3 text-emerald-600" />
                            </div>
                            <span className="text-sm font-medium text-slate-900">{occupiedLots}</span>
                            <span className="text-xs text-slate-600 hidden sm:inline">occupied</span>
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

                        {building.lots.length > 0 && (
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
                              {isExpanded ? "Collapse" : "Lots"}
                            </span>
                          </Button>
                        )}
                      </div>

                      {building.lots.length > 0 && !isExpanded && (
                        <div className="grid grid-cols-1 gap-2 animate-in fade-in-0 slide-in-from-top-1 duration-300">
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
                                      {lot.status === "occupied" ? "Occupied" : "Vacant"}
                                    </Badge>
                                    
                                    {(() => {
                                      const lotTenantCount = lot.lot_tenants?.length || (lot.tenant ? 1 : 0)
                                      if (lotTenantCount === 0) return null
                                      
                                      return (
                                        <div className="relative group">
                                          <div className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 border border-blue-200 rounded text-xs cursor-help hover:bg-blue-100 transition-colors">
                                            <Users className="w-2.5 h-2.5 text-blue-600" />
                                            <span className="text-blue-700 font-medium text-xs">{lotTenantCount}</span>
                                          </div>
                                        </div>
                                      )
                                    })()}
                                  </div>
                                  
                                  <div className="flex items-center gap-1">
                                    {mode === "view" && (
                                      <>
                                        <Button 
                                          variant="ghost" 
                                          size="sm"
                                          className="h-6 w-6 p-0 text-slate-500 hover:text-slate-700"
                                          onClick={() => router.push(`/gestionnaire/biens/lots/modifier/${lot.id}`)}
                                          title="Edit lot"
                                        >
                                          <Edit className="h-3 w-3" />
                                        </Button>
                                        <Button 
                                          variant="ghost" 
                                          size="sm"
                                          className="h-6 w-6 p-0 text-slate-500 hover:text-slate-700"
                                          onClick={() => router.push(`/gestionnaire/biens/lots/${lot.id}`)}
                                          title="View lot details"
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
                                        {isLotSelected ? "OK" : "Select"}
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
                                onClick={() => toggleBuildingExpansion(buildingIdStr)}
                                className="h-7 px-3 text-xs text-slate-500 hover:text-slate-900 border border-dashed border-slate-300 w-full"
                              >
                                +{building.lots.length - 2} more lots
                              </Button>
                            </div>
                          )}
                        </div>
                      )}

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
                                            {lot.status === "occupied" ? "Occupied" : "Vacant"}
                                          </Badge>
                                        </div>
                                        
                                        <div className="text-xs text-slate-600 flex items-center space-x-3 min-w-0">
                                          <span>Floor {lot.floor}</span>
                                          {lot.interventions > 0 && (
                                            <div className="flex items-center text-amber-700">
                                              <Zap className="h-3 w-3 mr-1" />
                                              <span>{lot.interventions}</span>
                                            </div>
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
                                              title="Edit lot"
                                            >
                                              <Edit className="h-3 w-3" />
                                            </Button>
                                            <Button 
                                              variant="ghost" 
                                              size="sm"
                                              className="h-7 w-7 p-0 text-slate-500 hover:text-slate-700"
                                              onClick={() => router.push(`/gestionnaire/biens/lots/${lot.id}`)}
                                              title="View lot details"
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
                                            {isLotSelected ? "OK" : "Select"}
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
            <h3 className="text-xl font-semibold text-slate-900 mb-3">No individual lots</h3>
            <p className="text-slate-600 mb-6 max-w-sm mx-auto">
              Add your first lot to manage your individual properties
            </p>
            <Button 
              size="lg"
              onClick={() => router.push('/gestionnaire/biens/lots/nouveau')}
              className="w-full sm:w-auto"
            >
              <Home className="h-4 w-4 mr-2" />
              Add lot
            </Button>
          </div>
        ) : (
          filteredIndividualLots.map((lot) => {
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
          })
        )}
      </div>
    </div>
  )

  const tabs = [
    {
      id: "buildings",
      label: "Buildings",
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
      label: "Status",
      options: [
        { value: "all", label: "All" },
        { value: "occupied", label: "Occupied" },
        { value: "vacant", label: "Vacant" }
      ],
      defaultValue: "all"
    },
    {
      id: "interventions",
      label: "Interventions",
      options: [
        { value: "all", label: "All" },
        { value: "with", label: "With interventions" },
        { value: "without", label: "Without interventions" }
      ],
      defaultValue: "all"
    }
  ]

  return (
    <ContentNavigator
      tabs={tabs}
      defaultTab="buildings"
      searchPlaceholder="Search properties..."
      filters={filterConfigs}
      onSearch={handleSearch}
      onFilterChange={handleFilterChange}
    />
  )
}
