"use client"

import Link from "next/link"
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
  ChevronDown
} from "lucide-react"
import type { LotCardActionsProps } from "./types"

/**
 * Actions section for lot cards.
 *
 * View mode layout: [chevron indicator] [Eye link] [⋮ menu]
 * - Chevron is a passive state indicator (header click handles expand)
 * - Eye navigates to lot detail page
 * - ⋮ overflow menu at trailing edge (MD3 convention)
 */
export function LotCardActions({
  lot,
  mode,
  isSelected,
  isExpanded = false,
  variant = 'compact',
  onSelect,
  showDropdown = true
}: LotCardActionsProps) {

  // Selection mode - show select button + passive chevron
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

        {/* Passive chevron indicator for expandable variant */}
        {variant === 'expandable' && (
          <ChevronDown
            className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
          />
        )}
      </div>
    )
  }

  // View mode: [passive chevron] → [Eye link] → [⋮ menu]
  return (
    <div className="flex items-center gap-1 flex-shrink-0">
      {/* 1. Passive expand indicator (header click handles toggle) */}
      {variant === 'expandable' && (
        <ChevronDown
          className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
        />
      )}

      {/* 2. View lot details (always visible) */}
      <Link
        href={`/gestionnaire/biens/lots/${lot.id}`}
        onClick={(e) => e.stopPropagation()}
        className="inline-flex items-center justify-center h-8 w-8 rounded-md text-blue-500 hover:text-blue-700 hover:bg-blue-50 transition-colors"
        title="Voir détails du lot"
      >
        <Eye className="h-4 w-4" />
      </Link>

      {/* 3. Overflow menu at trailing edge (MD3 convention) */}
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
            {/* Edit - ⚡ Link for prefetch */}
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link href={`/gestionnaire/biens/lots/modifier/${lot.id}`} onClick={(e) => e.stopPropagation()}>
                <Edit className="h-4 w-4 mr-2" />
                Modifier
              </Link>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {/* Create intervention - ⚡ Link for prefetch */}
            <DropdownMenuItem asChild className="cursor-pointer text-blue-600 hover:text-blue-700 hover:bg-blue-50">
              <Link href={`/gestionnaire/operations/nouvelle-intervention?lot=${lot.id}`} onClick={(e) => e.stopPropagation()}>
                <Wrench className="h-4 w-4 mr-2" />
                Créer une intervention
              </Link>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {/* Archive - disabled for now */}
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation()
                // Future feature: Archive lot
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
