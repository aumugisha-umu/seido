"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  Eye,
  Edit,
  MoreVertical,
  Wrench,
  Archive,
  ChevronUp,
  ChevronDown
} from "lucide-react"
import type { LotCardActionsProps } from "./types"

/**
 * Actions section: dropdown menu with all actions + chevron (for expand)
 */
export function LotCardActions({
  lot,
  mode,
  isSelected,
  isExpanded = false,
  variant = 'compact',
  onSelect,
  onToggleExpand,
  showDropdown = true
}: LotCardActionsProps) {
  const router = useRouter()

  // Selection mode - show select button
  if (mode === "select") {
    return (
      <div className="flex items-center gap-1 flex-shrink-0">
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

        {/* Chevron for expandable variant */}
        {variant === 'expandable' && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={(e) => {
              e.stopPropagation()
              onToggleExpand?.()
            }}
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            )}
          </Button>
        )}
      </div>
    )
  }

  // View mode - show chevron + quick action button + dropdown menu
  // Order: Chevron (expand) → Eye (view details) → Menu (other actions)
  return (
    <div className="flex items-center gap-1 flex-shrink-0">
      {/* 1. Chevron for expand/collapse (always visible in view mode) */}
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={(e) => {
          e.stopPropagation()
          onToggleExpand?.()
        }}
        title={isExpanded ? "Réduire" : "Développer"}
      >
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-gray-500" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-500" />
        )}
      </Button>

      {/* 2. Quick access: View details button */}
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
        onClick={(e) => {
          e.stopPropagation()
          router.push(`/gestionnaire/biens/lots/${lot.id}`)
        }}
        title="Voir détails"
      >
        <Eye className="h-4 w-4" />
      </Button>

      {/* 3. Dropdown menu with other actions */}
      {showDropdown && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-slate-500 hover:text-slate-700"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            {/* Edit */}
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation()
                router.push(`/gestionnaire/biens/lots/modifier/${lot.id}`)
              }}
              className="cursor-pointer"
            >
              <Edit className="h-4 w-4 mr-2" />
              Modifier
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {/* Create intervention */}
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation()
                router.push(`/gestionnaire/interventions/nouvelle-intervention?lot=${lot.id}`)
              }}
              className="cursor-pointer text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            >
              <Wrench className="h-4 w-4 mr-2" />
              Créer une intervention
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {/* Archive - disabled for now */}
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation()
                // Future feature: Archive lot
                console.log('Archive lot:', lot.id)
              }}
              className="cursor-pointer text-amber-600 hover:text-amber-700 hover:bg-amber-50"
              disabled
            >
              <Archive className="h-4 w-4 mr-2" />
              Archiver
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}

export default LotCardActions
