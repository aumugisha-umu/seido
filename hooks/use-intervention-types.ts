/**
 * Custom hook for fetching intervention types with categories
 * ✅ SWR caching (reference data - long cache)
 * ✅ Grouped by category for Combobox display
 * ✅ Helper functions for type lookup
 * ✅ Fallback to static data if DB unavailable
 * ✅ Waits for auth before fetching (RLS requires auth.uid())
 */

import useSWR from 'swr'
import { createBrowserSupabaseClient } from '@/lib/services'
import { PROBLEM_TYPES_FALLBACK } from '@/lib/intervention-data'
import { useAuth } from '@/hooks/use-auth'

// ============================================================================
// Types
// ============================================================================

export interface InterventionTypeCategory {
  id: string
  code: string
  label_fr: string
  description_fr: string | null
  sort_order: number
  is_active: boolean
}

export interface InterventionType {
  id: string
  code: string
  category_id: string
  category_code: string
  category_label: string
  label_fr: string
  description_fr: string | null
  icon_name: string | null
  color_class: string | null
  sort_order: number
  is_active: boolean
}

export interface InterventionTypesData {
  categories: InterventionTypeCategory[]
  types: InterventionType[]
}

// ============================================================================
// Fetcher
// ============================================================================

async function fetchInterventionTypes(): Promise<InterventionTypesData> {
  const supabase = createBrowserSupabaseClient()

  console.log('[useInterventionTypes] Fetching from database...')

  const [categoriesResult, typesResult] = await Promise.all([
    supabase
      .from('intervention_type_categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order'),
    supabase
      .from('intervention_types')
      .select(`
        *,
        category:intervention_type_categories(code, label_fr)
      `)
      .eq('is_active', true)
      .order('sort_order')
  ])

  if (categoriesResult.error) {
    console.error('[useInterventionTypes] Categories fetch error:', categoriesResult.error)
    throw categoriesResult.error
  }
  if (typesResult.error) {
    console.error('[useInterventionTypes] Types fetch error:', typesResult.error)
    throw typesResult.error
  }

  const categories = categoriesResult.data as InterventionTypeCategory[]
  const types = typesResult.data.map((t: Record<string, unknown>) => ({
    ...t,
    category_code: (t.category as { code: string; label_fr: string })?.code || '',
    category_label: (t.category as { code: string; label_fr: string })?.label_fr || '',
  })) as InterventionType[]

  console.log(`[useInterventionTypes] Loaded ${types.length} types in ${categories.length} categories`)

  return { categories, types }
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook options for useInterventionTypes
 */
export interface UseInterventionTypesOptions {
  /**
   * Initial data from server-side fetch (via getInterventionTypesServer)
   * When provided, the dropdown will render instantly without loading state
   */
  initialData?: InterventionTypesData | null
}

/**
 * Hook to fetch and cache intervention types with categories
 *
 * Features:
 * - Long cache duration (5 minutes) - reference data rarely changes
 * - No refetch on focus/reconnect
 * - Fallback to static PROBLEM_TYPES if fetch fails
 * - Helper functions for type lookup
 * - ✅ NEW: Accepts initialData from server to avoid loading delay
 *
 * @example
 * ```tsx
 * // Basic usage (will show loading spinner)
 * const { types, categories, isLoading } = useInterventionTypes()
 *
 * // With server-side prefetch (instant render, no spinner)
 * const { types, categories, isLoading } = useInterventionTypes({
 *   initialData: serverPrefetchedData
 * })
 *
 * // Get type info
 * const plomberie = getTypeByCode('plomberie')
 * console.log(plomberie?.label_fr) // "Plomberie"
 * ```
 */
export function useInterventionTypes(options?: UseInterventionTypesOptions) {
  const { initialData } = options || {}

  // ✅ Wait for auth before fetching (RLS policies require auth.uid())
  const { user, loading: authLoading } = useAuth()

  // SWR key logic:
  // - If we have initialData, we can use a valid key immediately (no auth wait needed for initial render)
  // - Otherwise, wait for auth to complete before fetching
  const hasInitialData = !!initialData && initialData.types.length > 0
  const swrKey = hasInitialData
    ? 'intervention-types' // ✅ Immediate key when we have server data
    : (authLoading ? null : (user ? 'intervention-types' : null))

  // Static fallback for when no data is available
  const staticFallback: InterventionTypesData = {
    categories: [
      { id: '1', code: 'bien', label_fr: 'Bien', description_fr: null, sort_order: 1, is_active: true }
    ],
    types: PROBLEM_TYPES_FALLBACK.map((t, i) => ({
      id: String(i),
      code: t.value,
      category_id: '1',
      category_code: 'bien',
      category_label: 'Bien',
      label_fr: t.label,
      description_fr: null,
      icon_name: null,
      color_class: null,
      sort_order: i,
      is_active: true,
    }))
  }

  const { data, error, isLoading, mutate } = useSWR<InterventionTypesData>(
    swrKey,
    fetchInterventionTypes,
    {
      // Reference data - long cache
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 300000, // 5 minutes
      // ✅ Don't revalidate on mount if we have initial data (already fresh from server)
      revalidateOnMount: !hasInitialData,
      revalidateIfStale: !hasInitialData, // Only revalidate if no initial data
      // Retry on error
      errorRetryCount: 3,
      errorRetryInterval: 2000,
      // ✅ Use initialData if provided, otherwise use static fallback
      fallbackData: initialData || staticFallback
    }
  )

  // Helper: Get type by code
  const getTypeByCode = (code: string): InterventionType | undefined => {
    return data?.types.find(t => t.code === code)
  }

  // Helper: Get types by category code
  const getTypesByCategory = (categoryCode: string): InterventionType[] => {
    return data?.types.filter(t => t.category_code === categoryCode) || []
  }

  // Helper: Get type label (with fallback)
  const getTypeLabel = (code: string): string => {
    const type = getTypeByCode(code)
    if (type) return type.label_fr
    // Fallback for legacy codes
    const legacyMapping: Record<string, string> = {
      'jardinage': 'Espaces verts',
      'menage': 'Nettoyage',
      'autre': 'Autre (technique)',
    }
    return legacyMapping[code] || code
  }

  // Helper: Normalize legacy code to new code
  const normalizeLegacyCode = (code: string): string => {
    const legacyMapping: Record<string, string> = {
      'jardinage': 'espaces_verts',
      'menage': 'nettoyage',
      'autre': 'autre_technique',
    }
    return legacyMapping[code] || code
  }

  // Grouped types for Combobox display
  const groupedTypes = data?.categories.map(category => ({
    category,
    types: getTypesByCategory(category.code)
  })) || []

  // Combined loading state:
  // - If we have initialData, we're never in loading state (instant render)
  // - Otherwise, loading = auth loading OR SWR loading
  const combinedLoading = hasInitialData ? false : (authLoading || isLoading)

  return {
    // Raw data
    types: data?.types || [],
    categories: data?.categories || [],
    groupedTypes,

    // State (includes auth loading)
    isLoading: combinedLoading,
    error,

    // Helper functions
    getTypeByCode,
    getTypesByCategory,
    getTypeLabel,
    normalizeLegacyCode,

    // Mutate for manual refresh
    refresh: mutate,
  }
}

// ============================================================================
// Static export for Server Components
// ============================================================================

/**
 * Fetch intervention types server-side (for Server Components)
 * Use this in page.tsx to prefetch data
 */
export async function getInterventionTypesServer() {
  // Import dynamically to avoid client-side import issues
  const { createServerSupabaseClient } = await import('@/lib/services')
  const supabase = await createServerSupabaseClient()

  const [categoriesResult, typesResult] = await Promise.all([
    supabase
      .from('intervention_type_categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order'),
    supabase
      .from('intervention_types')
      .select(`
        *,
        category:intervention_type_categories(code, label_fr)
      `)
      .eq('is_active', true)
      .order('sort_order')
  ])

  if (categoriesResult.error || typesResult.error) {
    console.error('Failed to fetch intervention types:', categoriesResult.error || typesResult.error)
    return null
  }

  const categories = categoriesResult.data as InterventionTypeCategory[]
  const types = typesResult.data.map((t: Record<string, unknown>) => ({
    ...t,
    category_code: (t.category as { code: string; label_fr: string })?.code || '',
    category_label: (t.category as { code: string; label_fr: string })?.label_fr || '',
  })) as InterventionType[]

  return { categories, types }
}
