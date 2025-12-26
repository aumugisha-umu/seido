"use client"

import { useState, useCallback, useMemo } from "react"
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { LotCardHeader, LotCardBadges, calculateOccupancy, countContacts } from "./lot-card-header"
import { LotCardActions } from "./lot-card-actions"
import { LotCardExpandedContent } from "./lot-card-expanded-content"
import type { LotCardUnifiedProps } from "./types"

// BEM block name
const BLOCK = "lot-card-unified"

/**
 * LotCardUnified - Unified lot card component
 *
 * Replaces:
 * - lot-card.tsx (Patrimoine list)
 * - lots-with-contacts-preview.tsx (Building details)
 * - lot-card-compact.tsx (Data navigator)
 *
 * Features:
 * - Compact mode: Just the card header with badges
 * - Expandable mode: Compact + chevron + collapsible content
 * - Selection mode: For property selector forms
 * - Left border color: green (occupied) / gray (vacant)
 * - Keyboard accessible
 */
export function LotCardUnified({
  lot,
  variant = "compact",
  mode = "view",
  isSelected = false,
  isExpanded: controlledExpanded,
  defaultExpanded = false,
  showBuilding = false,
  showInterventionsCount = true,
  buildingContext,
  lotContactIdsMap,
  teamId,
  interventions = [],
  onSelect,
  onExpand,
  onAddContact,
  onRemoveContact,
  customActions = { showDropdown: true },
  className,
}: LotCardUnifiedProps) {
  // Internal expansion state (only used if not controlled)
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded)

  // Determine if we're in controlled or uncontrolled mode
  const isControlled = controlledExpanded !== undefined
  const expanded = isControlled ? controlledExpanded : internalExpanded

  // Toggle expansion
  const handleToggleExpand = useCallback(() => {
    if (isControlled) {
      onExpand?.(!expanded)
    } else {
      setInternalExpanded(!expanded)
    }
  }, [isControlled, expanded, onExpand])

  // Computed values
  const { isOccupied } = useMemo(
    () => calculateOccupancy(lot),
    [lot]
  )

  const contactsCount = useMemo(
    () => countContacts(lot),
    [lot]
  )

  const lotInterventions = interventions.filter(i => i.lot_id === lot.id)

  // Handle card click (for selection mode or expand)
  const handleCardClick = useCallback((e: React.MouseEvent) => {
    // Don't trigger if clicking on a button or interactive element
    if ((e.target as HTMLElement).closest('button, a, [role="button"]')) {
      return
    }

    if (mode === "select" && onSelect) {
      if (!isSelected) {
        onSelect(lot.id, lot.building?.id)
      }
    }
  }, [mode, onSelect, isSelected, lot.id, lot.building?.id])

  // Handle header click (for expandable variant)
  const handleHeaderClick = useCallback(() => {
    if (variant === "expandable") {
      handleToggleExpand()
    }
  }, [variant, handleToggleExpand])

  // Keyboard accessibility
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (mode === "select" && onSelect && !isSelected) {
        onSelect(lot.id, lot.building?.id)
      } else if (variant === "expandable") {
        handleToggleExpand()
      }
    }
  }, [mode, onSelect, isSelected, lot.id, lot.building?.id, variant, handleToggleExpand])

  return (
    <Card
      className={cn(
        BLOCK,
        "group hover:shadow-md hover:border-primary/30 transition-all duration-200",
        isOccupied ? "border-l-4 border-l-green-500" : "border-l-4 border-l-gray-300",
        mode === "select" && "cursor-pointer",
        isSelected && "ring-2 ring-blue-500 bg-blue-50",
        expanded && variant === "expandable" && "md:col-span-2 lg:col-span-4",
        className
      )}
      onClick={handleCardClick}
      role={mode === "select" || variant === "expandable" ? "button" : undefined}
      tabIndex={mode === "select" || variant === "expandable" ? 0 : undefined}
      onKeyDown={mode === "select" || variant === "expandable" ? handleKeyDown : undefined}
    >
      {/* Card Header - Always visible */}
      <CardHeader
        className={cn(
          `${BLOCK}__header`,
          "p-4",
          variant === "expandable" && "cursor-pointer hover:bg-gray-50/50 transition-colors"
        )}
        onClick={handleHeaderClick}
      >
        <div className="flex items-start justify-between gap-2">
          {/* Left: Icon + Reference + Building */}
          <LotCardHeader
            lot={lot}
            showBuilding={showBuilding}
            isOccupied={isOccupied}
            contactsCount={contactsCount}
          />

          {/* Right: Actions */}
          <LotCardActions
            lot={lot}
            mode={mode}
            isSelected={isSelected}
            isExpanded={expanded}
            variant={variant}
            onSelect={onSelect}
            onToggleExpand={handleToggleExpand}
            showDropdown={customActions.showDropdown}
          />
        </div>

        {/* Badges row */}
        <LotCardBadges
          lot={lot}
          isOccupied={isOccupied}
          contactsCount={contactsCount}
          interventionsCount={lotInterventions.length}
          showInterventionsCount={showInterventionsCount}
        />
      </CardHeader>

      {/* Expanded Content - Contact sections + Contracts */}
      {variant === "expandable" && expanded && (
        <CardContent className={cn(`${BLOCK}__expanded`, "pt-0 pb-4")}>
          <LotCardExpandedContent
            lot={lot}
            buildingContext={buildingContext}
            lotContactIdsMap={lotContactIdsMap}
            teamId={teamId}
            onAddContact={onAddContact}
            onRemoveContact={onRemoveContact}
            readOnly={mode === "select"}
          />
        </CardContent>
      )}
    </Card>
  )
}

export default LotCardUnified
