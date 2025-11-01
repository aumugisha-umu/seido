"use client"

import { useViewMode } from '@/hooks/use-view-mode'
import { useAuth } from '@/hooks/use-auth'
import type { InterventionWithRelations } from '@/lib/services'
import type { InterventionDateField } from '@/lib/intervention-calendar-utils'

// View Switcher
import { ViewModeSwitcherV1 } from './view-mode-switcher-v1'

// List View
import { InterventionsListViewV1 } from './interventions-list-view-v1'

// Calendar View (unified month/week component)
import { InterventionsCalendarView } from './interventions-calendar-view'

// Card View (Existing)
import { InterventionsList } from './interventions-list'

/**
 * 🎨 INTERVENTIONS VIEW CONTAINER
 *
 * **Purpose:**
 * Central orchestrator for all intervention view modes (cards, list, calendar).
 * Handles view switching, state management, and component selection.
 *
 * **Architecture:**
 * - useViewMode hook manages view state (localStorage + URL sync)
 * - Renders configured view switcher variant (V1, V2, or V3)
 * - Renders appropriate view component based on current mode
 * - Passes through all props to child components
 *
 * **Usage:**
 * ```tsx
 * <InterventionsViewContainer
 *   interventions={allInterventions}
 *   userContext="gestionnaire"
 *   viewSwitcherVariant="v1"
 *   listViewVariant="v1"
 *   calendarViewVariant="v1"
 * />
 * ```
 */

export interface InterventionsViewContainerProps {
  /** List of interventions to display */
  interventions: InterventionWithRelations[]
  /** User role context for URL generation */
  userContext: 'gestionnaire' | 'prestataire' | 'locataire'
  /** Whether component is in loading state */
  loading?: boolean
  /** Empty state configuration for cards view */
  emptyStateConfig?: {
    title: string
    description: string
    showCreateButton?: boolean
  }
  /** Whether to show status actions (for card view) */
  showStatusActions?: boolean

  /**
   * Which date field to use for calendar grouping
   * - "scheduled_date": When intervention is planned (default)
   * - "created_at": When intervention was requested
   * - "completed_date": When intervention was finished
   * - "requested_date": When tenant requested
   */
  calendarDateField?: InterventionDateField

  /**
   * Enable URL sync for view mode
   * When true, view mode is reflected in URL (?view=cards)
   * Allows sharing links with specific view mode
   */
  syncViewModeWithUrl?: boolean

  /** Optional CSS classes for container */
  className?: string

  /** External view mode control (lifted state) */
  viewMode?: 'cards' | 'list' | 'calendar'
  setViewMode?: (mode: 'cards' | 'list' | 'calendar') => void
  hideViewSwitcher?: boolean
}

export function InterventionsViewContainer({
  interventions,
  userContext,
  loading = false,
  emptyStateConfig,
  showStatusActions = true,
  calendarDateField = 'scheduled_date',
  syncViewModeWithUrl = false,
  className,
  viewMode: externalViewMode,
  setViewMode: externalSetViewMode,
  hideViewSwitcher = false
}: InterventionsViewContainerProps) {
  const { user } = useAuth()

  // View mode state management - use external if provided, otherwise internal
  const internalViewMode = useViewMode({
    defaultMode: 'cards',
    syncWithUrl: syncViewModeWithUrl
  })

  const viewMode = externalViewMode !== undefined ? externalViewMode : internalViewMode.viewMode
  const setViewMode = externalSetViewMode || internalViewMode.setViewMode
  const mounted = internalViewMode.mounted

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="animate-pulse space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-32 bg-gray-200 rounded-lg" />
        ))}
      </div>
    )
  }

  /**
   * 🎨 Render view switcher (icon toggle)
   */
  const renderViewSwitcher = () => {
    return (
      <ViewModeSwitcherV1
        value={viewMode}
        onChange={setViewMode}
        className="ml-auto"
      />
    )
  }

  /**
   * 📊 Render list view (table dense)
   */
  const renderListView = () => {
    return (
      <InterventionsListViewV1
        interventions={interventions}
        userContext={userContext}
        loading={loading}
        userId={user?.id}
      />
    )
  }

  /**
   * 📅 Render calendar view (month/week with side panel)
   */
  const renderCalendarView = () => {
    return (
      <InterventionsCalendarView
        interventions={interventions}
        userContext={userContext}
        dateField={calendarDateField}
        loading={loading}
      />
    )
  }

  /**
   * 🃏 Render cards view (existing InterventionsList)
   */
  const renderCardsView = () => {
    return (
      <InterventionsList
        interventions={interventions}
        loading={loading}
        emptyStateConfig={emptyStateConfig}
        showStatusActions={showStatusActions}
        userContext={userContext}
      />
    )
  }

  /**
   * 🎯 Render current view based on mode
   */
  const renderCurrentView = () => {
    switch (viewMode) {
      case 'list':
        return renderListView()
      case 'calendar':
        return renderCalendarView()
      case 'cards':
      default:
        return renderCardsView()
    }
  }

  return (
    <div className={`flex flex-col flex-1 min-h-0 ${className}`}>
      {/* View Switcher - Only show if not hidden */}
      {!hideViewSwitcher && (
        <div className="flex items-center justify-end flex-shrink-0 mb-4">
          {renderViewSwitcher()}
        </div>
      )}

      {/* Current View */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {renderCurrentView()}
      </div>
    </div>
  )
}

/**
 * ✶ Insight ─────────────────────────────────────
 *
 * **ViewContainer Design Pattern:**
 *
 * This component implements the "Container/Presenter" pattern:
 * - Container: Manages state, handles logic, orchestrates components
 * - Presenters: View components focus purely on rendering
 *
 * **Architecture Decision:**
 *
 * After evaluating 9 component variants (3 each for view switcher, list view,
 * and calendar view), we selected the optimal combination:
 * - **View Switcher V1**: Icon-only toggle (compact, international)
 * - **List View V1**: Table dense (power users, high info density)
 * - **Calendar View**: Unified component with month/week toggle
 *
 * This simplified architecture eliminates variant selection complexity while
 * providing all necessary functionality.
 *
 * **Benefits:**
 *
 * 1. **Single Integration Point**: Replace existing InterventionsList
 *    with InterventionsViewContainer - one component change
 * 2. **Consistent API**: All view modes receive same data format
 * 3. **Simplified Maintenance**: No variant selection logic needed
 * 4. **Performance**: Only selected components in bundle
 *
 * **Integration Example:**
 *
 * ```tsx
 * // Before (existing code):
 * <InterventionsList
 *   interventions={allInterventions}
 *   userContext="gestionnaire"
 * />
 *
 * // After (with multi-view support):
 * <InterventionsViewContainer
 *   interventions={allInterventions}
 *   userContext="gestionnaire"
 *   calendarDateField="scheduled_date"  // optional
 *   syncViewModeWithUrl={false}         // optional
 * />
 * ```
 *
 * **View Modes:**
 *
 * - **Cards**: Default grid view with intervention cards
 * - **List**: Dense table view with sortable columns
 * - **Calendar**: Month/week calendar with side panel for selected date
 *
 * **Performance Considerations:**
 *
 * - View mode state persists in localStorage (survives refresh)
 * - Only renders active view (no hidden DOM for inactive views)
 * - useViewMode hook memoizes date calculations
 * - Calendar utilities optimized for <1ms with 100+ interventions
 *
 * **Future Enhancements:**
 *
 * - Add view-specific filtering (e.g., calendar month range)
 * - Implement keyboard shortcuts (Ctrl+1/2/3 to switch views)
 * - Add view-specific sorting options
 * - Support custom view components via render props
 *
 * ─────────────────────────────────────────────────
 */
