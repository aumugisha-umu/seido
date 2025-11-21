"use client"

import { LayoutGrid, List, Calendar } from 'lucide-react'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { ViewMode } from '@/hooks/use-view-mode'

/**
 * 🎨 VIEW MODE SWITCHER V2 - ICON + LABEL
 *
 * **Design Philosophy:**
 * - Combined icon + text for maximum clarity
 * - Responsive labels (hide on mobile, show on tablet+)
 * - Explicit mode names in French
 * - Balance between clarity and space
 *
 * **Pros:**
 * ✅ More explicit (better for new users)
 * ✅ No learning curve (text explains function)
 * ✅ Better accessibility (text + icon)
 * ✅ Responsive design (collapses on mobile)
 * ✅ Professional appearance
 *
 * **Cons:**
 * ❌ Takes more horizontal space
 * ❌ May wrap on small screens
 * ❌ Requires translation for i18n
 *
 * **Best for:**
 * - Applications with new or occasional users
 * - Professional/enterprise interfaces
 * - When space is less critical
 * - Accessibility-first designs
 *
 * @example
 * ```tsx
 * <ViewModeSwitcherV2
 *   value={viewMode}
 *   onChange={setViewMode}
 *   showLabels="always" // or "desktop" or "never"
 * />
 * ```
 */

interface ViewModeSwitcherV2Props {
  /** Current active view mode */
  value: ViewMode
  /** Callback when view mode changes */
  onChange: (mode: ViewMode) => void
  /** Optional CSS classes */
  className?: string
  /** Whether component is disabled */
  disabled?: boolean
  /**
   * Label visibility strategy:
   * - "always": Show labels on all screen sizes
   * - "desktop": Show labels on tablet+ (sm:inline)
   * - "never": Icon-only (same as V1)
   */
  showLabels?: 'always' | 'desktop' | 'never'
}

export function ViewModeSwitcherV2({
  value,
  onChange,
  className,
  disabled = false,
  showLabels = 'desktop'
}: ViewModeSwitcherV2Props) {
  // Determine label visibility class based on showLabels prop
  const labelClass =
    showLabels === 'always'
      ? 'inline'
      : showLabels === 'desktop'
      ? 'hidden sm:inline'
      : 'hidden'

  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(newValue) => {
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
        className="h-8 px-3 gap-1.5 data-[state=on]:bg-blue-100 data-[state=on]:text-blue-700 hover:bg-slate-100 transition-colors text-sm"
        title="Vue en cartes avec informations détaillées"
      >
        <LayoutGrid className="h-4 w-4" />
        <span className={labelClass}>Cartes</span>
      </ToggleGroupItem>

      {/* LIST VIEW */}
      <ToggleGroupItem
        value="list"
        aria-label="Vue en liste"
        className="h-8 px-3 gap-1.5 data-[state=on]:bg-blue-100 data-[state=on]:text-blue-700 hover:bg-slate-100 transition-colors text-sm"
        title="Vue en liste avec colonnes triables"
      >
        <List className="h-4 w-4" />
        <span className={labelClass}>Liste</span>
      </ToggleGroupItem>

      {/* CALENDAR VIEW */}
      <ToggleGroupItem
        value="calendar"
        aria-label="Vue calendrier"
        className="h-8 px-3 gap-1.5 data-[state=on]:bg-blue-100 data-[state=on]:text-blue-700 hover:bg-slate-100 transition-colors text-sm"
        title="Vue calendrier mensuel avec marqueurs"
      >
        <Calendar className="h-4 w-4" />
        <span className={labelClass}>Calendrier</span>
      </ToggleGroupItem>
    </ToggleGroup>
  )
}

/**
 * ✶ Insight ─────────────────────────────────────
 *
 * **Responsive Label Strategy:**
 * Three visibility modes balance clarity with space:
 * - "always": Best for desktop-only apps or when space permits
 * - "desktop": Default - icons on mobile, full labels on tablet+
 * - "never": Fallback to icon-only for ultra-compact layouts
 *
 * **Layout Considerations:**
 * - gap-1.5 (6px) provides comfortable spacing between icon and text
 * - px-3 (12px) horizontal padding ensures buttons don't feel cramped
 * - text-sm (14px) matches standard UI text size
 *
 * **When to Choose V2 over V1:**
 * Use V2 when users are unfamiliar with the interface, when accessibility
 * is paramount, or when the toolbar has sufficient horizontal space.
 * The labels significantly reduce cognitive load for new users.
 *
 * ─────────────────────────────────────────────────
 */
