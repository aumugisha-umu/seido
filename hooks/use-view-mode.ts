"use client"

import { useState, useEffect, useCallback } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

/**
 * 🎨 VIEW MODE TYPES
 *
 * Supported view modes for interventions display:
 * - cards: Grid of intervention cards (default)
 * - list: Table/list format with sortable columns
 * - calendar: Monthly calendar with intervention markers
 */
export type ViewMode = 'cards' | 'list' | 'calendar'

/**
 * 📱 MOBILE BREAKPOINT
 *
 * Matches Tailwind's 'md' breakpoint (768px)
 * Used to determine if device is mobile for responsive behavior
 */
const MOBILE_BREAKPOINT = 768

/**
 * 💾 LOCALSTORAGE KEY
 *
 * Key used to persist user's view preference across sessions
 */
const STORAGE_KEY = 'interventions-view-mode'

/**
 * 🔧 useViewMode Hook
 *
 * Manages view mode state for interventions display with:
 * - localStorage persistence (user preference)
 * - URL params synchronization (shareable links)
 * - Mobile detection (responsive defaults)
 * - Type-safe implementation
 *
 * @param options Configuration options
 * @param options.defaultMode Default view mode if no preference exists
 * @param options.syncWithUrl Whether to sync view mode with URL params
 * @param options.storageKey Custom localStorage key (optional)
 *
 * @returns View mode state and control functions
 *
 * @example
 * ```tsx
 * function InterventionsPage() {
 *   const { viewMode, setViewMode, isMobile } = useViewMode()
 *
 *   return (
 *     <div>
 *       <ViewModeSwitcher value={viewMode} onChange={setViewMode} />
 *       {viewMode === 'cards' && <InterventionsCardsView />}
 *       {viewMode === 'list' && <InterventionsListView />}
 *       {viewMode === 'calendar' && <InterventionsCalendarView />}
 *     </div>
 *   )
 * }
 * ```
 */
export function useViewMode(options?: {
  defaultMode?: ViewMode
  syncWithUrl?: boolean
  storageKey?: string
}) {
  const {
    defaultMode = 'cards',
    syncWithUrl = false,
    storageKey = STORAGE_KEY
  } = options || {}

  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()

  // 📱 MOBILE DETECTION STATE
  const [isMobile, setIsMobile] = useState(false)

  // 🎨 VIEW MODE STATE
  const [viewMode, setViewModeState] = useState<ViewMode>(defaultMode)

  // 🔄 MOUNTED STATE (prevent hydration mismatch)
  const [mounted, setMounted] = useState(false)

  /**
   * 📱 MOBILE DETECTION EFFECT
   *
   * Sets up responsive behavior by:
   * 1. Checking initial window width
   * 2. Setting up resize listener
   * 3. Updating isMobile state on viewport changes
   */
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }

    // Initial check
    checkMobile()

    // Listen for viewport changes
    window.addEventListener('resize', checkMobile)

    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  /**
   * 💾 INITIALIZE VIEW MODE FROM STORAGE/URL
   *
   * Priority order:
   * 1. URL params (if syncWithUrl enabled)
   * 2. localStorage (user preference)
   * 3. defaultMode (fallback)
   */
  useEffect(() => {
    setMounted(true)

    // 1️⃣ Check URL params first (highest priority)
    if (syncWithUrl && searchParams) {
      const urlMode = searchParams.get('view') as ViewMode | null
      if (urlMode && ['cards', 'list', 'calendar'].includes(urlMode)) {
        setViewModeState(urlMode)
        return
      }
    }

    // 2️⃣ Check localStorage for user preference
    try {
      const savedMode = localStorage.getItem(storageKey) as ViewMode | null
      if (savedMode && ['cards', 'list', 'calendar'].includes(savedMode)) {
        setViewModeState(savedMode)
        return
      }
    } catch (error) {
      console.warn('[useViewMode] Failed to read from localStorage:', error)
    }

    // 3️⃣ Fallback to responsive default (list on desktop, cards on mobile)
    const responsiveDefault: ViewMode = window.innerWidth < MOBILE_BREAKPOINT ? 'cards' : 'list'
    setViewModeState(defaultMode !== 'cards' ? defaultMode : responsiveDefault)
  }, [defaultMode, storageKey, syncWithUrl, searchParams])

  /**
   * 🔄 SET VIEW MODE FUNCTION
   *
   * Updates view mode and persists to:
   * - Component state
   * - localStorage (user preference)
   * - URL params (if syncWithUrl enabled)
   */
  const setViewMode = useCallback((mode: ViewMode) => {
    // Update state
    setViewModeState(mode)

    // Persist to localStorage
    try {
      localStorage.setItem(storageKey, mode)
    } catch (error) {
      console.warn('[useViewMode] Failed to write to localStorage:', error)
    }

    // Sync with URL params
    if (syncWithUrl && pathname) {
      const params = new URLSearchParams(searchParams?.toString())
      params.set('view', mode)
      router.replace(`${pathname}?${params.toString()}`)
    }
  }, [storageKey, syncWithUrl, pathname, router, searchParams])

  /**
   * 🔄 TOGGLE VIEW MODE FUNCTION
   *
   * Cycles through view modes in order: cards → list → calendar → cards
   * Useful for keyboard shortcuts or quick toggle buttons
   */
  const toggleViewMode = useCallback(() => {
    const modes: ViewMode[] = ['cards', 'list', 'calendar']
    const currentIndex = modes.indexOf(viewMode)
    const nextIndex = (currentIndex + 1) % modes.length
    setViewMode(modes[nextIndex])
  }, [viewMode, setViewMode])

  /**
   * 🎯 IS VIEW MODE ACTIVE HELPER
   *
   * Helper function to check if a specific view mode is active
   * Useful for conditional styling in view switcher buttons
   */
  const isViewMode = useCallback((mode: ViewMode) => {
    return viewMode === mode
  }, [viewMode])

  return {
    /** Current active view mode */
    viewMode,
    /** Function to set view mode */
    setViewMode,
    /** Function to toggle between view modes */
    toggleViewMode,
    /** Helper to check if specific view mode is active */
    isViewMode,
    /** Whether device is mobile (< 768px) */
    isMobile,
    /** Whether component has mounted (prevents hydration mismatch) */
    mounted
  }
}

/**
 * 🎨 VIEW MODE CONFIGURATION
 *
 * Configuration object for each view mode with display properties
 * Used by view switcher components for consistent labeling
 */
export const VIEW_MODE_CONFIG = {
  cards: {
    label: 'Cartes',
    labelShort: 'Cartes',
    icon: 'LayoutGrid',
    description: 'Vue en grille avec cartes détaillées'
  },
  list: {
    label: 'Liste',
    labelShort: 'Liste',
    icon: 'List',
    description: 'Vue en liste avec colonnes triables'
  },
  calendar: {
    label: 'Calendrier',
    labelShort: 'Cal.',
    icon: 'Calendar',
    description: 'Vue calendrier mensuel avec marqueurs'
  }
} as const
