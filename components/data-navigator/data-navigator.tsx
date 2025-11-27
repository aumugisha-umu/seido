"use client"

import { useState, useMemo } from 'react'
import ContentNavigator from '@/components/content-navigator'
import { DataTable } from '@/components/ui/data-table/data-table'
import { DataCards } from '@/components/ui/data-table/data-cards'
import { ViewModeSwitcherV1 } from '@/components/interventions/view-mode-switcher-v1'
import { useViewMode } from '@/hooks/use-view-mode'
import type { DataNavigatorProps, ViewMode, TabConfig } from './types'

export function DataNavigator<T extends { id: string }>({
    config,
    data,
    loading = false,
    className = '',
    onRefresh
}: DataNavigatorProps<T>) {
    const [searchTerm, setSearchTerm] = useState('')
    const [filterValues, setFilterValues] = useState<Record<string, string>>(() => {
        const initial: Record<string, string> = {}
        config.filters?.forEach(filter => {
            initial[filter.id] = filter.defaultValue
        })
        return initial
    })

    // View mode state
    const { viewMode, setViewMode, mounted } = useViewMode({
        defaultMode: config.defaultView || 'cards',
        syncWithUrl: false
    })

    // Get nested value from object path
    const getNestedValue = (obj: any, path: string): any => {
        return path.split('.').reduce((current, key) => current?.[key], obj)
    }

    // Default search function
    const defaultSearchFn = (item: T, search: string): boolean => {
        const searchLower = search.toLowerCase()
        return config.searchConfig.searchableFields.some(field => {
            const value = getNestedValue(item, field as string)
            return value?.toString().toLowerCase().includes(searchLower)
        })
    }

    // Apply search and filters
    const filteredData = useMemo(() => {
        let result = data

        // Apply search
        if (searchTerm.trim()) {
            const searchFn = config.searchConfig.searchFn || defaultSearchFn
            result = result.filter(item => searchFn(item, searchTerm))
        }

        // Apply filters
        if (config.filters) {
            config.filters.forEach(filter => {
                const value = filterValues[filter.id]
                if (value && value !== filter.defaultValue) {
                    // Custom filter logic can be added here
                    result = result.filter(item => {
                        const itemValue = getNestedValue(item, filter.id)
                        return itemValue === value
                    })
                }
            })
        }

        return result
    }, [data, searchTerm, filterValues, config])

    // Get filtered data for specific tab
    const getTabData = (tabId: string): T[] => {
        if (!config.tabs) return filteredData

        const tab = config.tabs.find(t => t.id === tabId)
        if (!tab || !tab.filter) return filteredData

        return filteredData.filter(tab.filter)
    }

    // Render content for a tab
    const renderTabContent = (tabId: string) => {
        const tabData = getTabData(tabId)

        if (!mounted) {
            return (
                <div className="animate-pulse space-y-2">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-32 bg-gray-200 rounded-lg" />
                    ))}
                </div>
            )
        }

        const emptyConfig = config.emptyState || {
            title: 'Aucune donnée',
            description: 'Aucun élément à afficher'
        }

        if (viewMode === 'list' && config.views.list.enabled) {
            return (
                <DataTable
                    data={tabData}
                    columns={config.columns}
                    actions={config.actions}
                    loading={loading}
                    emptyMessage={emptyConfig.description}
                />
            )
        }

        if (viewMode === 'cards' && config.views.card.enabled) {
            return (
                <DataCards
                    data={tabData}
                    CardComponent={config.views.card.component}
                    actions={config.actions}
                    loading={loading}
                    emptyMessage={emptyConfig.description}
                    compact={config.views.card.compact}
                />
            )
        }

        return null
    }

    // Build tabs configuration
    const tabs: TabConfig<T>[] = config.tabs || [
        {
            id: 'all',
            label: 'Tous',
            count: filteredData.length
        }
    ]

    // Update counts
    const tabsWithCounts = tabs.map(tab => ({
        ...tab,
        count: tab.filter ? getTabData(tab.id).length : filteredData.length,
        content: renderTabContent(tab.id)
    }))

    // View switcher
    const viewSwitcher = mounted && (config.views.card.enabled && config.views.list.enabled) ? (
        <ViewModeSwitcherV1
            value={viewMode}
            onChange={setViewMode}
        />
    ) : null

    return (
        <ContentNavigator
            tabs={tabsWithCounts}
            defaultTab={config.defaultTab || tabs[0]?.id}
            searchPlaceholder={config.searchConfig.placeholder}
            filters={config.filters}
            onSearch={setSearchTerm}
            onFilterChange={(filterId, value) => {
                setFilterValues(prev => ({ ...prev, [filterId]: value }))
            }}
            onResetFilters={() => {
                setSearchTerm('')
                const initial: Record<string, string> = {}
                config.filters?.forEach(filter => {
                    initial[filter.id] = filter.defaultValue
                })
                setFilterValues(initial)
            }}
            filterValues={filterValues}
            rightControls={viewSwitcher}
            className={className}
        />
    )
}
