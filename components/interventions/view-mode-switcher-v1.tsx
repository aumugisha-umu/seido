"use client"

import { LayoutGrid, List, Calendar } from 'lucide-react'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { ViewMode } from '@/hooks/use-view-mode'

/**
 * 🎨 VIEW MODE SWITCHER V1 - ICON TOGGLE (RECOMMENDED)
 *
 * **Design Philosophy:**
 * - Compact icon-only buttons for space efficiency
 * - ToggleGroup for mutually exclusive selection
 * - Clear visual states (active/inactive)
 * - Material Design 3 principles
 *
 * **Pros:**
 * ✅ Space-efficient (ideal for toolbar placement)
 * ✅ Clean visual hierarchy
 * ✅ International (no text translation needed)
 * ✅ Fast interaction (single click)
 * ✅ Clear active state
 *
 * **Cons:**
 * ❌ Less explicit for new users (icons need learning)
 * ❌ No text labels (accessibility relies on tooltips)
 *
 * **Best for:**
 * - Users familiar with view switching patterns
 * - Toolbar/header placement next to search
 * - Mobile-first responsive designs
 * - Clean, minimal interfaces
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
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(newValue) => {
        // ToggleGroup returns empty string if same value clicked
        // Prevent deselection by only updating if newValue exists
        if (newValue) {
          onChange(newValue as ViewMode)
        }
      }}
      className={className}
      disabled={disabled}
    >
      {/* CARDS VIEW */}
      <ToggleGroupItem
        value="cards"
        aria-label="Vue en cartes"
        className="h-8 w-8 p-0 data-[state=on]:bg-blue-100 data-[state=on]:text-blue-700 hover:bg-slate-100 transition-colors"
      >
        <LayoutGrid className="h-4 w-4" aria-hidden="true" />
      </ToggleGroupItem>

      {/* LIST VIEW */}
      <ToggleGroupItem
        value="list"
        aria-label="Vue en liste"
        className="h-8 w-8 p-0 data-[state=on]:bg-blue-100 data-[state=on]:text-blue-700 hover:bg-slate-100 transition-colors"
      >
        <List className="h-4 w-4" aria-hidden="true" />
      </ToggleGroupItem>

      {/* CALENDAR VIEW */}
      <ToggleGroupItem
        value="calendar"
        aria-label="Vue calendrier"
        className="h-8 w-8 p-0 data-[state=on]:bg-blue-100 data-[state=on]:text-blue-700 hover:bg-slate-100 transition-colors"
      >
        <Calendar className="h-4 w-4" aria-hidden="true" />
      </ToggleGroupItem>
    </ToggleGroup>
  )
}

/**
 * ✶ Insight ─────────────────────────────────────
 *
 * **ToggleGroup Pattern Benefits:**
 * - Built-in ARIA roles and keyboard navigation (WCAG 2.1 AA)
 * - Prevents deselection (always one active mode)
 * - Radix UI primitives ensure accessibility
 *
 * **Active State Design:**
 * - Blue background (100 shade) for clear contrast
 * - Blue text (700 shade) matches brand colors
 * - Hover state for all buttons improves discoverability
 *
 * **Why Icon-Only Works Here:**
 * - View switching is a common pattern (users learn quickly)
 * - Icons are universal (LayoutGrid = cards, List = table, Calendar = dates)
 * - Space efficiency allows placement next to search bar
 * - Tooltip fallback via title attribute for accessibility
 *
 * ─────────────────────────────────────────────────
 */
