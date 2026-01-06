"use client"

import { useState, useCallback } from "react"
import {
  Search,
  Filter,
  X,
  Calendar,
  User,
  Building,
  Home,
  Settings,
  FileText,
  Users,
  CheckCircle,
  XCircle,
  Plus,
  Edit,
  Trash2,
  UserCheck,
  RotateCcw
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

// ============================================================================
// Types
// ============================================================================

export interface ActivityFilters {
  search: string
  userId: string | null
  entityType: string | null
  actionType: string | null
  status: string | null
  dateRange: { from: Date | null; to: Date | null }
}

export interface TeamMember {
  id: string
  name: string
}

interface ActivityLogFiltersProps {
  filters: ActivityFilters
  onFiltersChange: (filters: ActivityFilters) => void
  teamMembers: TeamMember[]
  isLoading?: boolean
}

// ============================================================================
// Constants - Filter Options
// ============================================================================

const ENTITY_TYPES = [
  { value: "building", label: "Immeuble", icon: Building },
  { value: "lot", label: "Lot", icon: Home },
  { value: "intervention", label: "Intervention", icon: Settings },
  { value: "contract", label: "Contrat", icon: FileText },
  { value: "document", label: "Document", icon: FileText },
  { value: "contact", label: "Contact", icon: User },
  { value: "user", label: "Utilisateur", icon: User },
  { value: "team", label: "Équipe", icon: Users },
] as const

const ACTION_TYPES = [
  { value: "create", label: "Création", icon: Plus },
  { value: "update", label: "Modification", icon: Edit },
  { value: "delete", label: "Suppression", icon: Trash2 },
  { value: "assign", label: "Assignation", icon: UserCheck },
  { value: "unassign", label: "Désassignation", icon: User },
  { value: "approve", label: "Approbation", icon: CheckCircle },
  { value: "reject", label: "Rejet", icon: XCircle },
  { value: "status_change", label: "Changement de statut", icon: Settings },
] as const

const STATUS_OPTIONS = [
  { value: "success", label: "Réussi", color: "bg-emerald-500" },
  { value: "failure", label: "Échoué", color: "bg-red-500" },
  { value: "pending", label: "En cours", color: "bg-amber-500" },
] as const

// ============================================================================
// Helper Functions
// ============================================================================

const getActiveFiltersCount = (filters: ActivityFilters): number => {
  let count = 0
  if (filters.userId) count++
  if (filters.entityType) count++
  if (filters.actionType) count++
  if (filters.status) count++
  if (filters.dateRange.from || filters.dateRange.to) count++
  return count
}

const formatDateForInput = (date: Date | null): string => {
  if (!date) return ""
  return date.toISOString().split("T")[0]
}

// ============================================================================
// Component
// ============================================================================

export function ActivityLogFilters({
  filters,
  onFiltersChange,
  teamMembers,
  isLoading = false,
}: ActivityLogFiltersProps) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)

  // Local state for popover (apply on button click)
  const [localFilters, setLocalFilters] = useState(filters)

  // Sync local filters when popover opens
  const handlePopoverOpen = (open: boolean) => {
    if (open) {
      setLocalFilters(filters)
    }
    setIsPopoverOpen(open)
  }

  // Apply filters from popover
  const handleApplyFilters = () => {
    onFiltersChange(localFilters)
    setIsPopoverOpen(false)
  }

  // Reset all filters
  const handleResetFilters = () => {
    const emptyFilters: ActivityFilters = {
      search: "",
      userId: null,
      entityType: null,
      actionType: null,
      status: null,
      dateRange: { from: null, to: null },
    }
    setLocalFilters(emptyFilters)
    onFiltersChange(emptyFilters)
    setIsPopoverOpen(false)
  }

  // Update search immediately (no popover needed)
  const handleSearchChange = useCallback(
    (value: string) => {
      onFiltersChange({ ...filters, search: value })
    },
    [filters, onFiltersChange]
  )

  // Remove a specific filter
  const handleRemoveFilter = (filterKey: keyof ActivityFilters) => {
    const newFilters = { ...filters }
    if (filterKey === "dateRange") {
      newFilters.dateRange = { from: null, to: null }
    } else {
      ;(newFilters[filterKey] as string | null) = null
    }
    onFiltersChange(newFilters)
  }

  const activeFiltersCount = getActiveFiltersCount(filters)

  // Get label for active filter badge
  const getFilterLabel = (key: string, value: string | null): string => {
    if (!value) return ""

    switch (key) {
      case "userId":
        const member = teamMembers.find((m) => m.id === value)
        return member?.name || "Utilisateur"
      case "entityType":
        return ENTITY_TYPES.find((e) => e.value === value)?.label || value
      case "actionType":
        return ACTION_TYPES.find((a) => a.value === value)?.label || value
      case "status":
        return STATUS_OPTIONS.find((s) => s.value === value)?.label || value
      default:
        return value
    }
  }

  return (
    <div className="space-y-3 mb-4">
      {/* Search bar + Filter button */}
      <div className="flex flex-col sm:flex-row gap-2">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher dans l'activité..."
            value={filters.search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9 h-10"
            disabled={isLoading}
          />
          {filters.search && (
            <button
              onClick={() => handleSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filter popover */}
        <Popover open={isPopoverOpen} onOpenChange={handlePopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "h-10 gap-2 shrink-0",
                activeFiltersCount > 0 && "border-primary text-primary"
              )}
              disabled={isLoading}
            >
              <Filter className="h-4 w-4" />
              <span className="hidden sm:inline">Filtres</span>
              {activeFiltersCount > 0 && (
                <Badge
                  variant="secondary"
                  className="h-5 w-5 p-0 flex items-center justify-center text-xs bg-primary text-primary-foreground"
                >
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[340px] p-3" align="end">
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Filtrer l&apos;activité</h4>

              {/* Grid 2x2 pour les 4 premiers filtres */}
              <div className="grid grid-cols-2 gap-2">
                {/* User filter */}
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Utilisateur</Label>
                  <Select
                    value={localFilters.userId || "all"}
                    onValueChange={(value) =>
                      setLocalFilters({
                        ...localFilters,
                        userId: value === "all" ? null : value,
                      })
                    }
                  >
                    <SelectTrigger className="h-8 text-xs w-full">
                      <SelectValue placeholder="Tous" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous</SelectItem>
                      {teamMembers.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Entity type filter */}
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Entité</Label>
                  <Select
                    value={localFilters.entityType || "all"}
                    onValueChange={(value) =>
                      setLocalFilters({
                        ...localFilters,
                        entityType: value === "all" ? null : value,
                      })
                    }
                  >
                    <SelectTrigger className="h-8 text-xs w-full">
                      <SelectValue placeholder="Tous" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les types</SelectItem>
                      {ENTITY_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <type.icon className="h-3 w-3 text-muted-foreground" />
                            {type.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Action type filter */}
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Action</Label>
                  <Select
                    value={localFilters.actionType || "all"}
                    onValueChange={(value) =>
                      setLocalFilters({
                        ...localFilters,
                        actionType: value === "all" ? null : value,
                      })
                    }
                  >
                    <SelectTrigger className="h-8 text-xs w-full">
                      <SelectValue placeholder="Toutes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes</SelectItem>
                      {ACTION_TYPES.map((action) => (
                        <SelectItem key={action.value} value={action.value}>
                          <div className="flex items-center gap-2">
                            <action.icon className="h-3 w-3 text-muted-foreground" />
                            {action.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Status filter */}
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Statut</Label>
                  <Select
                    value={localFilters.status || "all"}
                    onValueChange={(value) =>
                      setLocalFilters({
                        ...localFilters,
                        status: value === "all" ? null : value,
                      })
                    }
                  >
                    <SelectTrigger className="h-8 text-xs w-full">
                      <SelectValue placeholder="Tous" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous</SelectItem>
                      {STATUS_OPTIONS.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          <div className="flex items-center gap-2">
                            <div className={cn("h-2 w-2 rounded-full", status.color)} />
                            {status.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Date range filter - Full width below */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Période</Label>
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1">
                  <Input
                    type="date"
                    className="h-8 text-xs px-2"
                    value={formatDateForInput(localFilters.dateRange.from)}
                    onChange={(e) =>
                      setLocalFilters({
                        ...localFilters,
                        dateRange: {
                          ...localFilters.dateRange,
                          from: e.target.value ? new Date(e.target.value) : null,
                        },
                      })
                    }
                  />
                  <span className="text-muted-foreground text-xs px-1">→</span>
                  <Input
                    type="date"
                    className="h-8 text-xs px-2"
                    value={formatDateForInput(localFilters.dateRange.to)}
                    onChange={(e) =>
                      setLocalFilters({
                        ...localFilters,
                        dateRange: {
                          ...localFilters.dateRange,
                          to: e.target.value ? new Date(e.target.value) : null,
                        },
                      })
                    }
                  />
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-between pt-2 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetFilters}
                  className="text-muted-foreground"
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-1" />
                  Réinitialiser
                </Button>
                <Button size="sm" onClick={handleApplyFilters}>
                  Appliquer
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Active filters badges */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Filtres actifs:</span>

          {filters.userId && (
            <Badge
              variant="secondary"
              className="gap-1 pr-1 text-xs h-6"
            >
              <User className="h-3 w-3" />
              {getFilterLabel("userId", filters.userId)}
              <button
                onClick={() => handleRemoveFilter("userId")}
                className="ml-1 hover:bg-muted rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {filters.entityType && (
            <Badge
              variant="secondary"
              className="gap-1 pr-1 text-xs h-6"
            >
              <Building className="h-3 w-3" />
              {getFilterLabel("entityType", filters.entityType)}
              <button
                onClick={() => handleRemoveFilter("entityType")}
                className="ml-1 hover:bg-muted rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {filters.actionType && (
            <Badge
              variant="secondary"
              className="gap-1 pr-1 text-xs h-6"
            >
              <Settings className="h-3 w-3" />
              {getFilterLabel("actionType", filters.actionType)}
              <button
                onClick={() => handleRemoveFilter("actionType")}
                className="ml-1 hover:bg-muted rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {filters.status && (
            <Badge
              variant="secondary"
              className="gap-1 pr-1 text-xs h-6"
            >
              <CheckCircle className="h-3 w-3" />
              {getFilterLabel("status", filters.status)}
              <button
                onClick={() => handleRemoveFilter("status")}
                className="ml-1 hover:bg-muted rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {(filters.dateRange.from || filters.dateRange.to) && (
            <Badge
              variant="secondary"
              className="gap-1 pr-1 text-xs h-6"
            >
              <Calendar className="h-3 w-3" />
              {filters.dateRange.from?.toLocaleDateString("fr-FR") || "..."}
              {" → "}
              {filters.dateRange.to?.toLocaleDateString("fr-FR") || "..."}
              <button
                onClick={() => handleRemoveFilter("dateRange")}
                className="ml-1 hover:bg-muted rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {/* Clear all button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetFilters}
            className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            Tout effacer
          </Button>
        </div>
      )}
    </div>
  )
}

// Export default filters for initialization
export const defaultActivityFilters: ActivityFilters = {
  search: "",
  userId: null,
  entityType: null,
  actionType: null,
  status: null,
  dateRange: { from: null, to: null },
}
