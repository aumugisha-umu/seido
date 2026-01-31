/**
 * Server-side utilities for fetching intervention types
 *
 * IMPORTANT: This file is separated from hooks/use-intervention-types.ts
 * because SWR accesses `window` at module import time, which breaks Server Components.
 *
 * Use this file for Server Components, use the hook for Client Components.
 */

import { createServerSupabaseClient } from '@/lib/services'

// ============================================================================
// Types (duplicated from hook to avoid importing SWR-dependent file)
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
// Server Function
// ============================================================================

/**
 * Fetch intervention types server-side (for Server Components)
 * Use this in page.tsx to prefetch data, then pass to Client Component
 *
 * @example
 * ```tsx
 * // In Server Component (page.tsx)
 * import { getInterventionTypesServer } from '@/lib/services/domain/intervention-types.server'
 *
 * export default async function Page() {
 *   const interventionTypes = await getInterventionTypesServer()
 *   return <ClientComponent initialInterventionTypes={interventionTypes} />
 * }
 * ```
 */
export async function getInterventionTypesServer(): Promise<InterventionTypesData | null> {
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
