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
import { Building2, Home, Users, Search, Filter, MapPin, Eye, ChevronDown, ChevronRight, User } from "lucide-react"
import { useManagerStats } from "@/hooks/use-manager-stats"

interface PropertySelectorProps {
  mode: "view" | "select"
  onBuildingSelect?: (buildingId: number) => void
  onLotSelect?: (lotId: number, buildingId?: number) => void
  selectedBuildingId?: number
  selectedLotId?: number
  showActions?: boolean
  title?: string
  subtitle?: string
}

export default function PropertySelector({
  mode = "view",
  onBuildingSelect,
  onLotSelect,
  selectedBuildingId,
  selectedLotId,
  showActions = true,
  title = "Portfolio Immobilier",
  subtitle,
}: PropertySelectorProps) {
  const router = useRouter()
  const [expandedBuildings, setExpandedBuildings] = useState<number[]>([])
  const { data, loading, error } = useManagerStats()

  const buildings = data?.buildings || []
  const individualLots: any[] = [] // Pour l'instant, on garde les lots individuels vides

  const toggleBuildingExpansion = (buildingId: number) => {
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
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
          </div>
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <Building2 className="h-4 w-4 text-blue-500" />
              {loading ? (
                <Skeleton className="h-4 w-20" />
              ) : (
                <span className="text-sm font-medium">{buildings.length} Bâtiments</span>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Home className="h-4 w-4 text-orange-500" />
              {loading ? (
                <Skeleton className="h-4 w-16" />
              ) : (
                <span className="text-sm font-medium">{getTotalLots()} Lots</span>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-green-500" />
              {loading ? (
                <Skeleton className="h-4 w-20" />
              ) : (
                <span className="text-sm font-medium">{getOverallOccupancyRate()}% Occupés</span>
              )}
            </div>
          </div>
          {showActions && mode === "view" && (
            <div className="flex items-center space-x-2">
              <Button 
                size="sm" 
                className="flex items-center space-x-2"
                onClick={() => router.push('/gestionnaire/nouveau-batiment')}
              >
                <Building2 className="h-4 w-4" />
                <span>Nouveau bâtiment</span>
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                className="flex items-center space-x-2 bg-transparent"
                onClick={() => router.push('/gestionnaire/nouveau-lot')}
              >
                <Home className="h-4 w-4" />
                <span>Nouveau lot</span>
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input placeholder="Rechercher une adresse ou un lot..." className="pl-10" />
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filtres</span>
          </div>

          <Select defaultValue="all-types">
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-types">Tous les types</SelectItem>
              <SelectItem value="building">Bâtiments</SelectItem>
              <SelectItem value="lot">Lots</SelectItem>
            </SelectContent>
          </Select>

          <Select defaultValue="all-occupations">
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-occupations">Toutes occupations</SelectItem>
              <SelectItem value="occupied">Occupés</SelectItem>
              <SelectItem value="vacant">Vacants</SelectItem>
            </SelectContent>
          </Select>

          <Select defaultValue="all-interventions">
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-interventions">Toutes interventions</SelectItem>
              <SelectItem value="pending">En attente</SelectItem>
              <SelectItem value="in-progress">En cours</SelectItem>
              <SelectItem value="completed">Terminées</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="ghost" size="sm">
            ✕
          </Button>
        </div>

        <Tabs defaultValue="buildings" className="space-y-6">
          <TabsList>
            <TabsTrigger value="buildings">Bâtiments ({buildings.length})</TabsTrigger>
            <TabsTrigger value="individual-lots">Lots individuels ({individualLots.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="buildings">
            <div className="space-y-4">
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="border rounded-lg">
                      <div className="flex items-center justify-between p-4 bg-gray-50">
                        <div className="flex items-center space-x-4">
                          <Skeleton className="h-8 w-8 rounded" />
                          <div className="w-10 h-10 bg-blue-100 rounded-lg" />
                          <div>
                            <Skeleton className="h-4 w-32 mb-2" />
                            <Skeleton className="h-3 w-48" />
                          </div>
                        </div>
                        <div className="flex items-center space-x-6">
                          <Skeleton className="h-4 w-16" />
                          <Skeleton className="h-4 w-20" />
                          <Skeleton className="h-8 w-16" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : buildings.length === 0 ? (
                <div className="text-center py-12">
                  <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun bâtiment</h3>
                  <p className="text-gray-600 mb-4">Commencez par ajouter votre premier bâtiment</p>
                  <Button onClick={() => router.push('/gestionnaire/nouveau-batiment')}>
                    <Building2 className="h-4 w-4 mr-2" />
                    Ajouter un bâtiment
                  </Button>
                </div>
              ) : (
                buildings.map((building) => {
                const isExpanded = expandedBuildings.includes(building.id)
                const occupiedLots = building.lots.filter((lot) => lot.status === "occupied").length
                const totalInterventions = building.lots.reduce((sum, lot) => sum + lot.interventions, 0)
                const isSelected = selectedBuildingId === building.id

                return (
                  <div key={building.id} className={`border rounded-lg ${isSelected ? "ring-2 ring-blue-500" : ""}`}>
                    {/* Building Header */}
                    <div className="flex items-center justify-between p-4 bg-gray-50">
                      <div className="flex items-center space-x-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleBuildingExpansion(building.id)}
                          className="p-1"
                        >
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </Button>
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">{building.name}</h3>
                          <p className="text-sm text-gray-600 flex items-center">
                            <MapPin className="h-3 w-3 mr-1" />
                            {building.address}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-6">
                        <div className="text-right">
                          <p className="text-sm font-medium">{building.lots.length} lots</p>
                          <div className="flex items-center space-x-2">
                            <Users className="h-3 w-3 text-gray-400" />
                            <span className="text-xs text-gray-600">
                              {occupiedLots}/{building.lots.length} occupés
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-xs text-gray-600">{totalInterventions} interventions</span>
                        </div>

                        {mode === "select" ? (
                          <Button
                            variant={isSelected ? "default" : "outline"}
                            size="sm"
                            onClick={() => {
                              if (isSelected) {
                                onBuildingSelect?.(0)
                              } else {
                                onBuildingSelect?.(building.id)
                              }
                            }}
                          >
                            {isSelected ? "Sélectionné" : "Sélectionner le bâtiment"}
                          </Button>
                        ) : (
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4 mr-1" />
                            Gérer
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Lots List (Expandable) */}
                    {isExpanded && (
                      <div className="border-t bg-white">
                        <div className="p-4">
                          <h4 className="text-sm font-medium text-gray-700 mb-3">Lots ({building.lots.length})</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-fr">
                            {building.lots.map((lot) => {
                              const isLotSelected = selectedLotId === lot.id
                              return (
                                <Card
                                  key={lot.id}
                                  className={`transition-all duration-200 hover:shadow-md ${
                                    isLotSelected ? "ring-2 ring-blue-500 bg-blue-50" : "bg-white"
                                  }`}
                                >
                                  <CardContent className="p-5 h-full flex flex-col justify-between relative">
                                    {/* Status badge in top right */}
                                    <div className="absolute top-4 right-4">
                                      <Badge
                                        variant={lot.status === "occupied" ? "default" : "secondary"}
                                        className="text-xs"
                                      >
                                        {lot.status === "occupied" ? "Occupé" : "Vacant"}
                                      </Badge>
                                    </div>

                                    {/* Top section: Lot name and floor */}
                                    <div className="flex-shrink-0">
                                      <div className="font-medium text-gray-900 text-lg pr-20">{lot.reference}</div>
                                      <div className="text-sm text-gray-500 mt-1">Étage {lot.floor}</div>
                                    </div>

                                    {/* Middle section: Tenant info and interventions */}
                                    <div className="flex-grow flex flex-col space-y-3 py-4 justify-start">
                                      {lot.tenant ? (
                                        <div className="flex items-center space-x-2">
                                          <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                          <span className="text-sm text-gray-700 truncate">{lot.tenant}</span>
                                        </div>
                                      ) : (
                                        <div className="flex items-center space-x-2">
                                          <User className="h-4 w-4 text-gray-300 flex-shrink-0" />
                                          <span className="text-sm text-gray-400">Aucun locataire</span>
                                        </div>
                                      )}

                                      {lot.interventions > 0 && (
                                        <div>
                                          <span className="text-sm text-orange-600 font-medium">
                                            {lot.interventions} intervention{lot.interventions > 1 ? "s" : ""}
                                          </span>
                                        </div>
                                      )}
                                    </div>

                                    {/* Bottom section: Action button */}
                                    <div className="flex-shrink-0 flex justify-end pt-2">
                                      {mode === "select" ? (
                                        <Button
                                          variant={isLotSelected ? "default" : "outline"}
                                          size="sm"
                                          onClick={() => {
                                            if (isLotSelected) {
                                              onLotSelect?.(0)
                                            } else {
                                              onLotSelect?.(lot.id, building.id)
                                            }
                                          }}
                                        >
                                          {isLotSelected ? "Sélectionné" : "Sélectionner"}
                                        </Button>
                                      ) : (
                                        <Button variant="ghost" size="sm" className="flex items-center space-x-1">
                                          <Eye className="h-4 w-4" />
                                          <span>Détails</span>
                                        </Button>
                                      )}
                                    </div>
                                  </CardContent>
                                </Card>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              }))}
            </div>
          </TabsContent>

          <TabsContent value="individual-lots">
            <div className="space-y-4">
              {individualLots.length === 0 ? (
                <div className="text-center py-12">
                  <Home className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun lot individuel</h3>
                  <p className="text-gray-600 mb-4">Commencez par ajouter votre premier lot</p>
                  <Button onClick={() => router.push('/gestionnaire/nouveau-lot')}>
                    <Home className="h-4 w-4 mr-2" />
                    Ajouter un lot
                  </Button>
                </div>
              ) : (
                individualLots.map((lot) => {
                const isSelected = selectedLotId === lot.id
                return (
                  <div
                    key={lot.id}
                    className={`flex items-center justify-between p-4 bg-gray-50 rounded-lg border ${
                      isSelected ? "ring-2 ring-blue-500" : ""
                    }`}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                        <Home className="h-5 w-5 text-orange-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{lot.reference}</h3>
                        <p className="text-sm text-gray-600 flex items-center">
                          <MapPin className="h-3 w-3 mr-1" />
                          {lot.address}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-6">
                      <div className="text-right">
                        <Badge variant={lot.status === "occupied" ? "default" : "secondary"}>
                          {lot.status === "occupied" ? "Occupé" : "Vacant"}
                        </Badge>
                        {lot.tenant && (
                          <div className="flex items-center space-x-2 mt-1">
                            <User className="h-3 w-3 text-gray-400" />
                            <span className="text-xs text-gray-600">{lot.tenant}</span>
                          </div>
                        )}
                      </div>

                      <div className="text-right">
                        <span className="text-xs text-gray-600">{lot.interventions} interventions</span>
                      </div>

                      {mode === "select" ? (
                        <Button
                          variant={isSelected ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            if (isSelected) {
                              onLotSelect?.(0)
                            } else {
                              onLotSelect?.(lot.id)
                            }
                          }}
                        >
                          {isSelected ? "Sélectionné" : "Sélectionner"}
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          Gérer
                        </Button>
                      )}
                    </div>
                  </div>
                )
              }))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
