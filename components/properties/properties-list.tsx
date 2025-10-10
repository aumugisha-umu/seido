"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { logger, logError } from '@/lib/logger'
import {
  Eye,
  MoreVertical,
  Edit,
  Trash2,
  Home,
  Building2,
  MapPin,
  Users,
  Calendar,
  Plus,
} from "lucide-react"

interface Property {
  id: string
  type: 'building' | 'lot'
  name?: string
  reference?: string
  address?: string
  [key: string]: unknown
}

interface PropertiesListProps {
  properties: Property[]
  loading?: boolean
  emptyStateConfig?: {
    title: string
    description: string
    showCreateButtons?: boolean
    createButtonsConfig?: {
      lot?: {
        text: string
        action: () => void
      }
      building?: {
        text: string
        action: () => void
      }
    }
  }
  contactContext?: {
    contactId: string
    contactName: string
    contactRole?: string
  }
  className?: string
}

export function PropertiesList({
  properties,
  loading = false,
  emptyStateConfig,
  contactContext,
  className = ""
}: PropertiesListProps) {
  const router = useRouter()

  // Get property type configuration
  const getPropertyTypeConfig = (_type: string) => {
    if (type === 'lot') {
      return {
        icon: Home,
        color: "text-green-600",
        bgColor: "bg-green-100",
        label: "Lot"
      }
    } else if (type === 'building') {
      return {
        icon: Building2,
        color: "text-purple-600",
        bgColor: "bg-purple-100",
        label: "Immeuble"
      }
    }
    return {
      icon: Home,
      color: "text-gray-600",
      bgColor: "bg-gray-100",
      label: "Bien"
    }
  }

  // Get occupancy status for lots
  const getOccupancyStatus = (property: Property) => {
    if (property.type !== 'lot') return null

    // Phase 2: Occupancy determined by tenant_id presence
    const isOccupied = !!property.tenant_id
    return isOccupied ? {
      label: "Occupé",
      className: "bg-green-100 text-green-800"
    } : {
      label: "Libre",
      className: "bg-gray-100 text-gray-800"
    }
  }

  // Get property actions
  const getPropertyActions = (property: Property) => {
    return [
      {
        label: "Voir détails",
        icon: Eye,
        onClick: () => {
          if (property.type === 'lot') {
            router.push(`/gestionnaire/biens/lots/${property.id}`)
          } else {
            router.push(`/gestionnaire/biens/immeubles/${property.id}`)
          }
        },
      },
      {
        label: "Modifier",
        icon: Edit,
        onClick: () => {
          if (property.type === 'lot') {
            router.push(`/gestionnaire/biens/lots/${property.id}/modifier`)
          } else {
            router.push(`/gestionnaire/biens/immeubles/${property.id}/modifier`)
          }
        },
      },
      {
        label: "Supprimer",
        icon: Trash2,
        onClick: () => logger.info(`[PropertiesList] Delete ${property.type} ${property.id}`),
        className: "text-red-600 hover:text-red-800",
      },
    ]
  }

  if (loading) {
    return (
      <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 ${className}`}>
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3 flex-1">
                    <div className="w-12 h-12 bg-slate-200 rounded-lg"></div>
                    <div className="space-y-2 flex-1">
                      <div className="h-5 bg-slate-200 rounded w-3/4"></div>
                      <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                    </div>
                  </div>
                  <div className="w-20 h-8 bg-slate-200 rounded"></div>
                </div>
                <div className="space-y-2">
                  <div className="h-3 bg-slate-200 rounded w-full"></div>
                  <div className="h-3 bg-slate-200 rounded w-2/3"></div>
                </div>
                <div className="flex space-x-2">
                  <div className="h-6 bg-slate-200 rounded w-16"></div>
                  <div className="h-6 bg-slate-200 rounded w-20"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (properties.length === 0) {
    const defaultEmptyConfig = {
      title: "Aucun bien",
      description: "Les biens apparaîtront ici",
      showCreateButtons: false,
      createButtonsConfig: {
        lot: {
          text: "Créer un lot",
          action: () => router.push("/gestionnaire/biens/lots/nouveau")
        },
        building: {
          text: "Créer un immeuble",
          action: () => router.push("/gestionnaire/biens/immeubles/nouveau")
        }
      }
    }

    const config = { ...defaultEmptyConfig, ...emptyStateConfig }

    return (
      <div className={`text-center py-12 ${className}`}>
        <Home className="h-12 w-12 text-slate-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-900 mb-2">
          {config.title}
        </h3>
        <p className="text-slate-500 mb-6">
          {config.description}
        </p>
        {config.showCreateButtons && (
          <div className="flex items-center justify-center space-x-2">
            {config.createButtonsConfig?.lot && (
              <Button variant="outline" onClick={config.createButtonsConfig.lot.action}>
                <Plus className="h-4 w-4 mr-2" />
                {config.createButtonsConfig.lot.text}
              </Button>
            )}
            {config.createButtonsConfig?.building && (
              <Button variant="outline" onClick={config.createButtonsConfig.building.action}>
                <Plus className="h-4 w-4 mr-2" />
                {config.createButtonsConfig.building.text}
              </Button>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 ${className}`}>
      {properties.map((property) => {
        const typeConfig = getPropertyTypeConfig(property.type)
        const occupancyStatus = getOccupancyStatus(property)
        const IconComponent = typeConfig.icon

        return (
          <Card key={property.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="flex items-center space-x-2">
                      <div className={`w-12 h-12 ${typeConfig.bgColor} rounded-lg flex items-center justify-center`}>
                        <IconComponent className={`h-6 w-6 ${typeConfig.color}`} />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {property.type === 'lot' ? property.reference : property.name}
                        </h3>
                        <div className="flex items-center space-x-2">
                          <Badge variant="secondary" className={`text-xs ${typeConfig.bgColor} ${typeConfig.color}`}>
                            {typeConfig.label}
                          </Badge>
                          {occupancyStatus && (
                            <Badge variant="outline" className={`text-xs ${occupancyStatus.className}`}>
                              {occupancyStatus.label}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Property Details */}
                  <div className="space-y-2 text-sm text-gray-600">
                    {property.type === 'lot' && (
                      <>
                        {property.building?.name && (
                          <div className="flex items-center space-x-1">
                            <Building2 className="h-3 w-3" />
                            <span>Immeuble: {property.building.name}</span>
                          </div>
                        )}
                        {property.apartment_number && (
                          <div className="flex items-center space-x-1">
                            <Home className="h-3 w-3" />
                            <span>Appartement {property.apartment_number}</span>
                          </div>
                        )}
                        {property.surface_area && (
                          <div className="flex items-center space-x-1">
                            <span>📐 {property.surface_area}m²</span>
                            {property.rooms && <span>• {property.rooms} pièces</span>}
                          </div>
                        )}
                        {property.floor !== null && property.floor !== undefined && (
                          <div className="flex items-center space-x-1">
                            <span>🏢 Étage {property.floor}</span>
                          </div>
                        )}
                        {property.tenant && (
                          <div className="flex items-center space-x-1">
                            <Users className="h-3 w-3" />
                            <span>Locataire: {property.tenant.name}</span>
                          </div>
                        )}
                      </>
                    )}

                    {property.type === 'building' && (
                      <>
                        <div className="flex items-center space-x-1">
                          <MapPin className="h-3 w-3" />
                          <span>{property.address}</span>
                          {property.city && <span>, {property.city}</span>}
                        </div>
                        {property.postal_code && (
                          <div className="flex items-center space-x-1">
                            <span>📮 {property.postal_code}</span>
                          </div>
                        )}
                        {property.construction_year && (
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3" />
                            <span>Construit en {property.construction_year}</span>
                          </div>
                        )}
                        {property.lots && property.lots.length > 0 && (
                          <div className="flex items-center space-x-1">
                            <Home className="h-3 w-3" />
                            <span>{property.lots.length} lot{property.lots.length > 1 ? 's' : ''}</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Contact Context */}
                  {contactContext && (
                    <div className="mt-3">
                      <Badge variant="outline" className="text-xs bg-sky-50 text-sky-700 border-sky-200">
                        {contactContext.contactRole === 'locataire' && property.type === 'lot' && 'Logement de'}
                        {contactContext.contactRole === 'prestataire' && 'Intervient sur'}
                        {contactContext.contactRole === 'gestionnaire' && 'Géré par'}
                        {!contactContext.contactRole && 'Lié à'} {contactContext.contactName}
                      </Badge>
                    </div>
                  )}

                  {property.description && (
                    <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                      {property.description}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex-shrink-0">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {getPropertyActions(property).map((action, idx) => (
                        <DropdownMenuItem
                          key={idx}
                          onClick={action.onClick}
                          className={("className" in action) ? action.className : ""}
                        >
                          <action.icon className="h-4 w-4 mr-2" />
                          {action.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

