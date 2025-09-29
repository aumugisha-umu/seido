/**
 * BuildingSelector - Atomic component for selecting existing buildings
 *
 * Provides searchable building selection with empty state handling
 * and create building action. Optimized for large building lists.
 */

"use client"

import React from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Building2, Search, Home, Users, Plus, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { BuildingSelectorProps } from "../../types"

export function BuildingSelector({
  buildings,
  selectedBuildingId,
  onBuildingSelect,
  searchQuery,
  onSearchChange,
  isLoading = false,
  disabled = false,
  emptyStateAction,
  className
}: BuildingSelectorProps & { className?: string }) {
  const filteredBuildings = buildings.filter(building =>
    building.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    building.address.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const hasBuildings = buildings.length > 0
  const hasFilteredResults = filteredBuildings.length > 0
  const isSearching = searchQuery.length > 0

  return (
    <div className={cn("space-y-4", className)}>
      <div className="space-y-2">
        <Label className="text-sm font-medium text-gray-700 flex items-center gap-1">
          <Building2 className="w-4 h-4" />
          Sélectionner un immeuble
        </Label>

        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Rechercher un immeuble..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            disabled={disabled || isLoading}
          />
        </div>
      </div>

      {/* Content area */}
      <div className="min-h-[200px]">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-2 text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Chargement des immeubles...</span>
            </div>
          </div>
        ) : !hasBuildings ? (
          // No buildings at all
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="font-medium text-gray-900 mb-2">Aucun immeuble trouvé</h3>
            <p className="text-gray-500 mb-4 text-sm">
              Vous n'avez pas encore créé d'immeuble
            </p>
            {emptyStateAction && (
              <Button variant="outline" onClick={emptyStateAction}>
                <Building2 className="w-4 h-4 mr-2" />
                Créer un immeuble
              </Button>
            )}
          </div>
        ) : !hasFilteredResults && isSearching ? (
          // No search results
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="font-medium text-gray-900 mb-2">Aucun résultat</h3>
            <p className="text-gray-500 text-sm">
              Aucun immeuble trouvé pour "{searchQuery}"
            </p>
          </div>
        ) : (
          // Building grid
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto p-1">
            {filteredBuildings.map((building) => {
              const isSelected = selectedBuildingId === building.id
              const occupiedLots = building.lots?.filter((_lot: unknown) => lot.status === 'occupied').length || 0
              const totalLots = building.lots?.length || 0

              return (
                <Card
                  key={building.id}
                  className={cn(
                    "group relative cursor-pointer transition-all duration-200 min-h-[140px]",
                    isSelected
                      ? "bg-sky-50 border-sky-500 shadow-sm"
                      : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm",
                    disabled && "opacity-50 cursor-not-allowed"
                  )}
                  onClick={() => !disabled && onBuildingSelect(isSelected ? "" : building.id)}
                  tabIndex={disabled ? -1 : 0}
                  onKeyDown={(e) => {
                    if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault()
                      onBuildingSelect(isSelected ? "" : building.id)
                    }
                  }}
                  role="button"
                  aria-pressed={isSelected}
                  aria-label={`Sélectionner l'immeuble ${building.name}`}
                >
                  <CardContent className="p-4">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                        isSelected ? "bg-sky-100" : "bg-slate-100 group-hover:bg-slate-200"
                      )}>
                        <Building2 className={cn(
                          "h-4 w-4",
                          isSelected ? "text-sky-600" : "text-slate-600"
                        )} />
                      </div>

                      {/* Selection indicator */}
                      <div className="flex-shrink-0">
                        {isSelected ? (
                          <div className="w-5 h-5 bg-sky-600 rounded-full flex items-center justify-center shadow-sm">
                            <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                          </div>
                        ) : (
                          <div className="w-5 h-5 border-2 border-slate-300 rounded-full group-hover:border-slate-400 transition-colors"></div>
                        )}
                      </div>
                    </div>

                    {/* Building info */}
                    <div className="space-y-2">
                      <h4 className={cn(
                        "font-semibold text-sm line-clamp-1",
                        isSelected ? "text-sky-900" : "text-slate-900"
                      )} title={building.name}>
                        {building.name}
                      </h4>
                      <p className={cn(
                        "text-xs line-clamp-2 leading-relaxed",
                        isSelected ? "text-sky-700" : "text-slate-600"
                      )} title={building.address}>
                        {building.address}
                      </p>

                      {/* Stats */}
                      <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center space-x-1">
                          <div className={cn(
                            "w-3 h-3 rounded flex items-center justify-center",
                            isSelected ? "bg-sky-200" : "bg-slate-200"
                          )}>
                            <Home className={cn(
                              "h-2 w-2",
                              isSelected ? "text-sky-600" : "text-slate-500"
                            )} />
                          </div>
                          <span className={cn(
                            "text-xs font-medium",
                            isSelected ? "text-sky-700" : "text-slate-600"
                          )}>
                            {totalLots}
                          </span>
                        </div>

                        {occupiedLots > 0 && (
                          <div className="flex items-center space-x-1">
                            <div className={cn(
                              "w-3 h-3 rounded flex items-center justify-center",
                              isSelected ? "bg-emerald-200" : "bg-emerald-100"
                            )}>
                              <Users className={cn(
                                "h-2 w-2",
                                isSelected ? "text-emerald-600" : "text-emerald-500"
                              )} />
                            </div>
                            <span className={cn(
                              "text-xs font-medium",
                              isSelected ? "text-sky-700" : "text-slate-600"
                            )}>
                              {occupiedLots}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>

                  {/* Selection overlay */}
                  {isSelected && (
                    <div className="absolute -inset-px bg-gradient-to-r from-sky-600 to-sky-500 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none -z-10"></div>
                  )}
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Summary */}
      {hasBuildings && (
        <div className="flex items-center justify-between text-xs text-gray-600 pt-2 border-t">
          <span>
            {isSearching
              ? `${filteredBuildings.length} résultat${filteredBuildings.length > 1 ? 's' : ''} trouvé${filteredBuildings.length > 1 ? 's' : ''}`
              : `${buildings.length} immeuble${buildings.length > 1 ? 's' : ''} disponible${buildings.length > 1 ? 's' : ''}`
            }
          </span>
          {selectedBuildingId && (
            <Badge variant="secondary" className="text-xs">
              Sélectionné
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}

BuildingSelector.displayName = "BuildingSelector"