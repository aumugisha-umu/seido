"use client"

import { LayoutGrid, List, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ViewMode } from '@/hooks/use-view-mode'

/**
 * 🎨 VIEW MODE SWITCHER V1 - ICON TOGGLE (RECOMMENDED)
 *
 * **Design Philosophy:**
 * - Compact icon-only buttons for space efficiency
 * - Consistent styling with other navigators (patrimoine, contacts, contracts)
 * - Clear visual states (active/inactive)
 * - Material Design 3 principles
 *
 * @example
 * ```tsx
 * <ViewModeSwitcherV1
 *   value={viewMode}
 *   onChange={setViewMode}
 *   className="ml-auto"
 * />
 * ```
 */

interface ViewModeSwitcherV1Props {
  /** Current active view mode */
  value: ViewMode
  /** Callback when view mode changes */
  onChange: (mode: ViewMode) => void
  /** Optional CSS classes */
  className?: string
  /** Whether component is disabled */
  disabled?: boolean
}

export function ViewModeSwitcherV1({
  value,
  onChange,
  className,
  disabled = false
}: ViewModeSwitcherV1Props) {
  // Style cohérent avec les autres navigateurs (contacts, patrimoine, contracts)
  const containerClass = cn(
    "inline-flex h-10 bg-slate-100 rounded-md p-1",
    className
  )

  const getButtonClass = (isActive: boolean) => cn(
    "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all",
    isActive
      ? "bg-white text-slate-900 shadow-sm"
      : "text-slate-600 hover:bg-slate-200/60",
    disabled && "opacity-50 cursor-not-allowed"
  )

  return (
    <div className={containerClass}>
      {/* LIST VIEW */}
      <button
        onClick={() => !disabled && onChange('list')}
        className={getButtonClass(value === 'list')}
        title="Vue liste"
        disabled={disabled}
        aria-label="Vue en liste"
      >
        <List className="h-4 w-4" aria-hidden="true" />
      </button>

      {/* CARDS VIEW */}
      <button
        onClick={() => !disabled && onChange('cards')}
        className={getButtonClass(value === 'cards')}
        title="Vue cartes"
        disabled={disabled}
        aria-label="Vue en cartes"
      >
        <LayoutGrid className="h-4 w-4" aria-hidden="true" />
      </button>

      {/* CALENDAR VIEW */}
      <button
        onClick={() => !disabled && onChange('calendar')}
        className={getButtonClass(value === 'calendar')}
        title="Vue calendrier"
        disabled={disabled}
        aria-label="Vue calendrier"
      >
        <Calendar className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  )
}

/**
 * ✶ Insight ─────────────────────────────────────
 *
 * **Design System Consistency:**
 * - Same visual pattern as patrimoine, contacts, and contracts navigators
 * - Container: bg-slate-100 rounded-md for pill-shaped background
 * - Active button: bg-white shadow-sm for elevated "selected" appearance
 * - Inactive: text-slate-600 with hover state for discoverability
 *
 * **Interventions-specific:**
 * - Includes 3 modes: list, cards, calendar (vs 2 for other navigators)
 * - Calendar icon for date-based intervention planning
 *
 * ─────────────────────────────────────────────────
 */
