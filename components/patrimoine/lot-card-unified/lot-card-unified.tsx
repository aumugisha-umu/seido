"use client"

import { useState, useCallback, useMemo, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Lock } from "lucide-react"
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
  isLocked = false,
  showBuilding = false,
  showInterventionsCount = false,
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
  const router = useRouter()

  // Internal expansion state (only used if not controlled)
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded)
  const cardRef = useRef<HTMLDivElement>(null)
  const previousExpandedRef = useRef(controlledExpanded ?? defaultExpanded)

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

  // Focus and scroll to card when it's expanded
  useEffect(() => {
    if (variant === "expandable" && expanded && !previousExpandedRef.current && cardRef.current) {
      // Card was just opened - scroll into view and focus
      setTimeout(() => {
        cardRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'nearest'
        })
        cardRef.current?.focus()
      }, 100) // Small delay to ensure DOM is updated
    }
    previousExpandedRef.current = expanded
  }, [expanded, variant])

  // Handle card click (for selection mode or expand)
  const handleCardClick = useCallback((e: React.MouseEvent) => {
    // Locked lots: block all interaction
    if (isLocked) return

    // Don't trigger if clicking on a button or interactive element
    if ((e.target as HTMLElement).closest('button, a, [role="button"]')) {
      return
    }

    if (mode === "select" && onSelect) {
      if (!isSelected) {
        onSelect(lot.id, lot.building?.id)
      }
    }
  }, [isLocked, mode, onSelect, isSelected, lot.id, lot.building?.id])

  // Handle header click (for expandable variant)
  const handleHeaderClick = useCallback(() => {
    if (isLocked) return
    if (variant === "expandable") {
      handleToggleExpand()
    }
  }, [isLocked, variant, handleToggleExpand])

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
    <div
      ref={cardRef}
      tabIndex={-1}
      className={cn(
        "outline-none w-full h-full",
        expanded && variant === "expandable" && !isLocked && "col-span-full"
      )}
    >
      <Card
        className={cn(
          BLOCK,
          "relative h-full bg-white p-0 transition-all duration-200",
          isLocked
            ? "border-l-4 border-l-gray-300"
            : cn(
                "group hover:shadow-md hover:border-primary/30",
                isOccupied ? "border-l-4 border-l-green-500" : "border-l-4 border-l-gray-300",
              ),
          mode === "select" && !isLocked && "cursor-pointer",
          isSelected && !isLocked && "ring-2 ring-blue-500 bg-blue-50",
          className
        )}
        onClick={handleCardClick}
        role={!isLocked && (mode === "select" || variant === "expandable") ? "button" : undefined}
        tabIndex={!isLocked && (mode === "select" || variant === "expandable") ? 0 : undefined}
        onKeyDown={!isLocked && (mode === "select" || variant === "expandable") ? handleKeyDown : undefined}
      >
      {/* Card Header - Always visible */}
      <CardHeader
        className={cn(
          `${BLOCK}__header`,
          "p-4",
          !isLocked && variant === "expandable" && "cursor-pointer hover:bg-gray-50/50 transition-colors"
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

          {/* Right: Actions (hidden when locked) */}
          {!isLocked && (
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
          )}
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

      {/* Expanded Content - Contact sections + Contracts (disabled when locked) */}
      {!isLocked && variant === "expandable" && expanded && (
        <CardContent className={cn(`${BLOCK}__expanded`, "pt-0 pb-3 px-3")}>
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

      {/* Lock overlay: semi-transparent cover + "Déverrouiller" CTA */}
      {isLocked && (
        <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-end pr-4 z-10 rounded-lg">
          <Button
            size="sm"
            className="bg-amber-600 hover:bg-amber-700 text-white shadow-md"
            onClick={(e) => {
              e.stopPropagation()
              router.push('/gestionnaire/settings/billing')
            }}
          >
            <Lock className="h-3.5 w-3.5 mr-1.5" />
            D&eacute;verrouiller
          </Button>
        </div>
      )}
      </Card>
    </div>
  )
}

export default LotCardUnified
