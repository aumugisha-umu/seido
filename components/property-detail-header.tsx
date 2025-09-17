"use client"

import {
  ArrowLeft,
  Building2,
  Calendar,
  ChevronDown,
  MapPin,
  MoreVertical,
  User,
  Archive,
  Edit,
  Trash2,
  Eye,
  Plus,
  Users,
  Home,
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

interface PropertyData {
  id: string
  title: string
  createdAt: string
  createdBy?: string
  // Pour les lots
  reference?: string
  isOccupied?: boolean
  apartmentNumber?: string
  floor?: number | null
  building?: {
    name: string
    address: string
    city: string
  }
  // Pour les immeubles
  name?: string
  address?: string
  city?: string
  totalLots?: number
  occupiedLots?: number
  occupancyRate?: number
}

interface PropertyHeaderProps {
  property: PropertyData
  type: "lot" | "building"
  onBack: () => void
  onEdit: () => void
  onArchive?: () => void
  customActions?: Array<{
    key: string
    label: string
    icon: any
    onClick: () => void
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost"
  }>
}

export const PropertyDetailHeader = ({
  property,
  type,
  onBack,
  onEdit,
  onArchive,
  customActions = [],
}: PropertyHeaderProps) => {
  // Configuration selon le type
  const getConfig = () => {
    if (type === "lot") {
      return {
        title: property.reference || property.title,
        subtitle: property.building ? `${property.building.name} • ${property.building.address}, ${property.building.city}` : "",
        badges: [
          property.isOccupied !== undefined ? {
            color: property.isOccupied 
              ? "bg-emerald-100 text-emerald-800 border-emerald-200" 
              : "bg-slate-100 text-slate-700 border-slate-200",
            dot: property.isOccupied ? "bg-emerald-500" : "bg-slate-500",
            label: property.isOccupied ? "Occupé" : "Vacant",
            icon: property.isOccupied ? Users : Home
          } : null,
          property.apartmentNumber ? {
            color: "bg-blue-100 text-blue-800 border-blue-200",
            dot: "bg-blue-500", 
            label: `Apt. ${property.apartmentNumber}`,
            icon: Home
          } : null,
          property.floor !== undefined && property.floor !== null ? {
            color: "bg-purple-100 text-purple-800 border-purple-200",
            dot: "bg-purple-500",
            label: `Étage ${property.floor}`,
            icon: Building2
          } : null
        ].filter(Boolean),
        backLabel: "Retour aux biens",
        icon: Home
      }
    } else {
      return {
        title: property.name || property.title,
        subtitle: property.address && property.city ? `${property.address}, ${property.city}` : "",
        badges: [
          property.totalLots !== undefined ? {
            color: "bg-blue-100 text-blue-800 border-blue-200",
            dot: "bg-blue-500",
            label: `${property.totalLots} lots`,
            icon: Users
          } : null,
          property.occupancyRate !== undefined ? {
            color: property.occupancyRate >= 80 
              ? "bg-emerald-100 text-emerald-800 border-emerald-200"
              : property.occupancyRate >= 50
              ? "bg-amber-100 text-amber-800 border-amber-200"
              : "bg-red-100 text-red-800 border-red-200",
            dot: property.occupancyRate >= 80 ? "bg-emerald-500" 
              : property.occupancyRate >= 50 ? "bg-amber-500" 
              : "bg-red-500",
            label: `${property.occupancyRate}% occupé`,
            icon: Building2
          } : null
        ].filter(Boolean),
        backLabel: "Retour aux biens",
        icon: Building2
      }
    }
  }

  const config = getConfig()


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
                  <p>{config.backLabel}</p>
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Section Centrale - Informations principales */}
            <div className="flex-1 max-w-3xl mx-6">
              <div className="text-center">
                {/* Titre et badges */}
                <div className="flex items-center justify-center space-x-3 mb-2">
                  <h1 className="text-lg sm:text-xl font-bold text-slate-900 truncate">
                    {config.title}
                  </h1>
                  
                  {/* Badges dynamiques */}
                  {config.badges.map((badge: any, index: number) => {
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
                  {config.subtitle && (
                    <div className="flex items-center space-x-1">
                      <MapPin className="h-3 w-3" />
                      <span className="truncate max-w-xs">{config.subtitle}</span>
                    </div>
                  )}
                  
                  {property.createdBy && (
                    <div className="hidden md:flex items-center space-x-1">
                      <User className="h-3 w-3" />
                      <span>{property.createdBy}</span>
                    </div>
                  )}
                  
                  <div className="hidden lg:flex items-center space-x-1">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {new Date(property.createdAt).toLocaleDateString("fr-FR", {
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
                  {onArchive && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={onArchive}
                        className="flex items-center space-x-2 text-slate-600 hover:text-slate-900 hover:bg-slate-50 focus:bg-slate-100 focus:text-slate-900"
                      >
                        <Archive className="h-4 w-4" />
                        <span>Archiver</span>
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
