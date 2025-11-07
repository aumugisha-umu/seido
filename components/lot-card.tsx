"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Home, Eye, Users, Wrench, MapPin, Building2, Edit } from "lucide-react"
import { useRouter } from "next/navigation"
import { getLotCategoryConfig } from "@/lib/lot-types"

interface LotCardProps {
  lot: {
    id: string
    reference: string
    category?: string
    floor?: number
    surface_area?: number
    rooms?: number
    apartment_number?: string
    tenant_id?: string | null // ⚠️ Deprecated: Use lot_contacts instead
    building_id?: string
    has_active_tenants?: boolean // Calculated field from queries
    is_occupied?: boolean // Calculated field from queries
    tenant?: {
      id: string
      name: string
    }
    lot_contacts?: Array<{
      user?: {
        id: string
        name: string
        role?: string
      }
      is_primary?: boolean
    }>
    lot_tenants?: Array<{ // ⚠️ Deprecated: Use lot_contacts instead
      contact?: {
        name: string
      }
      is_primary?: boolean
    }>
    building?: {
      id: string
      name: string
      address?: string
      city?: string
    }
  }
  interventions?: Array<{ id: string; lot_id: string }>
  mode?: "view" | "select"
  isSelected?: boolean
  onSelect?: (lotId: string | null, buildingId?: string) => void
  showBuilding?: boolean
}

export default function LotCard({
  lot,
  interventions = [],
  mode = "view",
  isSelected = false,
  onSelect,
  showBuilding = false
}: LotCardProps) {
  const router = useRouter()
  const lotInterventions = interventions.filter(i => i.lot_id === lot.id)

  // ✅ Phase 2: Calculate occupancy from lot_contacts (not tenant_id)
  const tenants = lot.lot_contacts?.filter(lc => lc.user?.role === 'locataire') || []
  const isOccupied = tenants.length > 0 || lot.has_active_tenants || lot.is_occupied

  const tenantName = tenants[0]?.user?.name || lot.tenant?.name || null
  const tenantCount = tenants.length || (lot.tenant ? 1 : 0)
  const buildingAddress = lot.building ? `${lot.building.address}, ${lot.building.city}` : 'Adresse non disponible'

  const handleCardClick = (e: React.MouseEvent) => {
    // Empêcher le clic si on clique sur un bouton
    if ((e.target as HTMLElement).closest('button')) {
      return
    }
    
    if (mode === "select" && onSelect) {
      if (!isSelected) {
        onSelect(lot.id, lot.building?.id)
      }
    }
  }

  return (
    <Card 
      className={`
        ${isOccupied ? 'border-l-4 border-l-green-500' : 'border-l-4 border-l-gray-300'}
        ${mode === "select" ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}
        ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : ''}
      `}
      onClick={handleCardClick}
    >
      <CardContent className="p-0 flex flex-col flex-1">
        <div className="flex-1">
          <div className="space-y-3">
            {/* Top Row: Icon + Title + Action */}
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3 min-w-0 flex-1">
                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Home className="h-5 w-5 text-amber-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-base text-slate-900 truncate">{lot.reference}</h3>
                  {showBuilding && lot.building && (
                    <div className="flex items-center text-xs text-slate-600 mt-1">
                      <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
                      <span className="truncate">{buildingAddress}</span>
                    </div>
                  )}
                  {lot.apartment_number && (
                    <div className="text-xs text-slate-600 mt-1">
                      N° {lot.apartment_number}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex-shrink-0 ml-2 flex items-center space-x-1">
                {mode === "select" ? (
                  <Button
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    className="h-8 px-3 text-xs"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (!isSelected) {
                        onSelect?.(lot.id, lot.building?.id)
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
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push(`/gestionnaire/biens/lots/modifier/${lot.id}`)
                      }}
                      title="Modifier le lot"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="h-8 px-3 text-xs"
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push(`/gestionnaire/biens/lots/${lot.id}`)
                      }}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      Détails
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Status and Info Row */}
            <div className="pt-2 border-t border-slate-100">
              <div className="flex items-center flex-wrap gap-2 mb-2">
                {/* Catégorie du lot */}
                {lot.category && (() => {
                  const categoryConfig = getLotCategoryConfig(lot.category)
                  return (
                    <Badge 
                      variant="outline" 
                      className={`${categoryConfig.bgColor} ${categoryConfig.borderColor} ${categoryConfig.color} text-xs`}
                    >
                      {categoryConfig.label}
                    </Badge>
                  )
                })()}
                
                <Badge 
                  variant={isOccupied ? "default" : "secondary"} 
                  className={`px-2 py-1 text-xs ${
                    isOccupied ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {isOccupied ? "Occupé" : "Vacant"}
                </Badge>

                {/* Contact Summary avec Tooltip */}
                {(() => {
                  const hasContacts = tenantCount > 0
                  
                  if (!hasContacts) return null
                  
                  return (
                    <div className="relative group">
                      {/* Summary Badge */}
                      <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 border border-blue-200 rounded text-xs cursor-help w-fit hover:bg-blue-100 transition-colors">
                        <Users className="w-3 h-3 text-blue-600" />
                        <span className="text-blue-700 font-medium">
                          {tenantCount}
                        </span>
                      </div>
                      
                      {/* Tooltip on Hover - Positionné relativement avec gestion des bordures */}
                      <div className="absolute bottom-full left-0 mb-2 w-64 max-w-[calc(100vw-2rem)] bg-white border border-slate-200 rounded-lg shadow-xl p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none group-hover:pointer-events-auto z-[100]
                                    before:content-[''] before:absolute before:top-full before:left-4 before:w-0 before:h-0 before:border-l-4 before:border-r-4 before:border-t-4 before:border-l-transparent before:border-r-transparent before:border-t-white">
                        <div className="space-y-2">
                          <div className="font-medium text-xs text-slate-700 mb-2">Contacts assignés</div>
                          
                          {/* Show all tenants */}
                          {lot.lot_tenants?.length > 0 ? (
                            <div className="space-y-1">
                              {lot.lot_tenants.map((tenantInfo, idx: number) => (
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
                          ) : tenantName && (
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-xs">
                                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                <span className="text-slate-700">{tenantName}</span>
                                <span className="text-slate-500">(locataire)</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })()}
              </div>

              {/* Property Details */}
              {(lot.floor || lot.surface_area || lot.rooms) && (
                <div className="flex items-center space-x-4 text-xs text-slate-600 mb-2">
                  {lot.floor !== undefined && <span>📍 Étage {lot.floor}</span>}
                  {lot.surface_area && <span>📐 {lot.surface_area}m²</span>}
                  {lot.rooms && <span>🏠 {lot.rooms} pièces</span>}
                </div>
              )}

              {/* Building Info */}
              {showBuilding && lot.building?.name && (
                <div className="flex items-center text-xs text-slate-500 mb-2">
                  <Building2 className="h-3 w-3 mr-1" />
                  <span className="truncate">{lot.building.name}</span>
                </div>
              )}

              {/* Interventions Count */}
              <div className="flex items-center text-xs text-slate-600">
                <Wrench className="h-3 w-3 mr-1" />
                <span>
                  {lotInterventions.length > 0 
                    ? `${lotInterventions.length} intervention(s)` 
                    : 'Aucune intervention'
                  }
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

