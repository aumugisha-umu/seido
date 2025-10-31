"use client"

import { LayoutGrid, List, Calendar, ChevronDown } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import type { ViewMode } from '@/hooks/use-view-mode'

/**
 * 🎨 VIEW MODE SWITCHER V3 - DROPDOWN SELECT
 *
 * **Design Philosophy:**
 * - Most compact option (single dropdown button)
 * - Scalable to more view modes in future
 * - Clean, familiar dropdown pattern
 * - Mobile-friendly (native select on mobile)
 *
 * **Pros:**
 * ✅ Most space-efficient (single button)
 * ✅ Scalable (easy to add more modes)
 * ✅ Clean visual hierarchy
 * ✅ Familiar pattern (standard dropdown)
 * ✅ Mobile-optimized (native picker)
 * ✅ Shows current mode explicitly
 *
 * **Cons:**
 * ❌ Requires extra click to see options
 * ❌ Less discoverability (hidden options)
 * ❌ Slower interaction (2 clicks vs 1)
 *
 * **Best for:**
 * - Toolbar space is critical
 * - More than 3 view modes planned
 * - Mobile-first applications
 * - Users comfortable with dropdowns
 * - Secondary/less-used feature
 *
 * @example
 * ```tsx
 * <ViewModeSwitcherV3
 *   value={viewMode}
 *   onChange={setViewMode}
 *   variant="compact" // or "full"
 * />
 * ```
 */

interface ViewModeSwitcherV3Props {
  /** Current active view mode */
  value: ViewMode
  /** Callback when view mode changes */
  onChange: (mode: ViewMode) => void
  /** Optional CSS classes */
  className?: string
  /** Whether component is disabled */
  disabled?: boolean
  /**
   * Display variant:
   * - "compact": Icon + label in trigger, minimal width
   * - "full": Full text labels, comfortable width
   */
  variant?: 'compact' | 'full'
}

// View mode configuration with labels and icons
const VIEW_MODES = [
  {
    value: 'cards' as const,
    label: 'Cartes',
    icon: LayoutGrid,
    description: 'Vue en grille avec informations détaillées'
  },
  {
    value: 'list' as const,
    label: 'Liste',
    icon: List,
    description: 'Vue en liste avec colonnes triables'
  },
  {
    value: 'calendar' as const,
    label: 'Calendrier',
    icon: Calendar,
    description: 'Vue calendrier mensuel avec marqueurs'
  }
]

export function ViewModeSwitcherV3({
  value,
  onChange,
  className,
  disabled = false,
  variant = 'compact'
}: ViewModeSwitcherV3Props) {
  // Get current mode configuration
  const currentMode = VIEW_MODES.find(mode => mode.value === value)
  const CurrentIcon = currentMode?.icon || LayoutGrid

  return (
    <Select value={value} onValueChange={onChange as (value: string) => void} disabled={disabled}>
      <SelectTrigger
        className={`
          ${variant === 'compact' ? 'w-[120px]' : 'w-[160px]'}
          h-8
          gap-1.5
          ${className}
        `}
        aria-label="Choisir le mode d'affichage"
      >
        <SelectValue asChild>
          <div className="flex items-center gap-1.5">
            <CurrentIcon className="h-4 w-4 flex-shrink-0" />
            <span className="text-sm truncate">{currentMode?.label}</span>
          </div>
        </SelectValue>
      </SelectTrigger>

      <SelectContent align="end" className="min-w-[200px]">
        {VIEW_MODES.map(mode => {
          const Icon = mode.icon
          return (
            <SelectItem
              key={mode.value}
              value={mode.value}
              className="cursor-pointer"
            >
              <div className="flex items-start gap-2.5 py-1">
                {/* Icon */}
                <Icon className="h-4 w-4 mt-0.5 flex-shrink-0" />

                {/* Label + Description */}
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium">{mode.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {mode.description}
                  </span>
                </div>
              </div>
            </SelectItem>
          )
        })}
      </SelectContent>
    </Select>
  )
}

/**
 * ✶ Insight ─────────────────────────────────────
 *
 * **Dropdown vs Toggle Group Trade-offs:**
 *
 * Dropdowns excel at:
 * - Conserving horizontal space (critical on mobile)
 * - Scaling to many options (4+ modes)
 * - Providing descriptions (helps new users)
 * - Showing current selection explicitly
 *
 * Toggle groups excel at:
 * - Single-click switching (faster interaction)
 * - Visual comparison (all options visible)
 * - Muscle memory (spatial positioning)
 *
 * **When to Choose V3:**
 * Use dropdown pattern when:
 * 1. Toolbar real estate is limited (e.g., mobile)
 * 2. Future expansion planned (4+ view modes)
 * 3. Users need descriptions to understand modes
 * 4. View switching is occasional, not frequent
 *
 * **Rich Dropdown Items:**
 * V3 includes descriptions in dropdown items, providing
 * educational value for new users without cluttering the
 * closed state. This follows the "progressive disclosure"
 * UX principle - complexity revealed on demand.
 *
 * ─────────────────────────────────────────────────
 */
