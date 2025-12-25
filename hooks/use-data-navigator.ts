"use client"

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useViewMode, type ViewMode } from '@/hooks/use-view-mode'

// ============================================================================
// USE DATA NAVIGATOR HOOK
// ============================================================================
// Hook partagé pour la logique commune des navigators (Patrimoine, Contacts)
// Gère: recherche, filtres, vue (cards/list), navigation
// ============================================================================

interface UseDataNavigatorOptions<T> {
    /** Data to filter */
    data: T[]
    /** Fields to search in (supports nested paths like 'building.name') */
    searchableFields: string[]
    /** Default view mode */
    defaultView?: ViewMode
}

interface UseDataNavigatorReturn<T> {
    // Search
    searchTerm: string
    setSearchTerm: (term: string) => void

    // Filters
    activeFilters: Record<string, string>
    setActiveFilters: React.Dispatch<React.SetStateAction<Record<string, string>>>
    handleFilterChange: (filterId: string, value: string) => void
    resetFilters: () => void
    activeFilterCount: number

    // View mode
    viewMode: ViewMode
    setViewMode: (mode: ViewMode) => void
    mounted: boolean

    // Data
    filteredData: T[]

    // Navigation
    createRowClickHandler: (rowHref?: (item: T) => string) => ((item: T) => void) | undefined
}

/**
 * Get nested value from object path (e.g., "building.name")
 */
function getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj)
}

/**
 * Hook for data navigation logic shared between PatrimoineNavigator and ContactsNavigator
 *
 * @example
 * ```tsx
 * const {
 *   searchTerm, setSearchTerm,
 *   viewMode, setViewMode, mounted,
 *   filteredData,
 *   createRowClickHandler
 * } = useDataNavigator({
 *   data: buildings,
 *   searchableFields: ['name', 'address', 'city'],
 *   defaultView: 'cards'
 * })
 * ```
 */
export function useDataNavigator<T>({
    data,
    searchableFields,
    defaultView = 'cards'
}: UseDataNavigatorOptions<T>): UseDataNavigatorReturn<T> {
    const router = useRouter()

    // Search state
    const [searchTerm, setSearchTerm] = useState('')

    // Filter state
    const [activeFilters, setActiveFilters] = useState<Record<string, string>>({})

    // View mode state
    const { viewMode, setViewMode, mounted } = useViewMode({
        defaultMode: defaultView,
        syncWithUrl: false
    })

    // Filter data based on search term and active filters
    const filteredData = useMemo(() => {
        let result = data

        // Apply search
        if (searchTerm.trim()) {
            const searchLower = searchTerm.toLowerCase()
            result = result.filter((item: any) => {
                return searchableFields.some(field => {
                    const value = getNestedValue(item, field)
                    return value?.toString().toLowerCase().includes(searchLower)
                })
            })
        }

        // Apply filters
        Object.entries(activeFilters).forEach(([filterId, filterValue]) => {
            if (filterValue && filterValue !== 'all') {
                result = result.filter((item: any) => {
                    const value = getNestedValue(item, filterId)
                    return value === filterValue
                })
            }
        })

        return result
    }, [data, searchTerm, activeFilters, searchableFields])

    // Handle filter change
    const handleFilterChange = (filterId: string, value: string) => {
        setActiveFilters(prev => ({
            ...prev,
            [filterId]: value
        }))
    }

    // Reset all filters
    const resetFilters = () => {
        setActiveFilters({})
        setSearchTerm('')
    }

    // Count active filters (excluding 'all' values)
    const activeFilterCount = Object.values(activeFilters).filter(v => v && v !== 'all').length

    // Create row click handler from rowHref config
    const createRowClickHandler = (rowHref?: (item: T) => string) => {
        return rowHref
            ? (item: T) => router.push(rowHref(item))
            : undefined
    }

    return {
        // Search
        searchTerm,
        setSearchTerm,

        // Filters
        activeFilters,
        setActiveFilters,
        handleFilterChange,
        resetFilters,
        activeFilterCount,

        // View mode
        viewMode,
        setViewMode,
        mounted,

        // Data
        filteredData,

        // Navigation
        createRowClickHandler
    }
}
