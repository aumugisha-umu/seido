"use client"

import { useState, useMemo } from 'react'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { buildingsTableConfig, lotsTableConfig, type BuildingData, type LotData } from '@/config/table-configs/patrimoine.config'
import { useViewMode } from '@/hooks/use-view-mode'
import { DataTable } from '@/components/ui/data-table/data-table'
import { DataCards } from '@/components/ui/data-table/data-cards'
import { Building2, Home, Search, Filter, LayoutGrid, List } from 'lucide-react'

interface PatrimoineNavigatorProps {
    buildings: BuildingData[]
    lots: LotData[]
    loading?: boolean
    onRefresh?: () => void
}

export function PatrimoineNavigator({
    buildings,
    lots,
    loading = false,
    onRefresh
}: PatrimoineNavigatorProps) {
    const [activeTab, setActiveTab] = useState<'buildings' | 'lots'>('buildings')
    const [searchTerm, setSearchTerm] = useState('')

    // View mode state
    const { viewMode, setViewMode, mounted } = useViewMode({
        defaultMode: 'cards',
        syncWithUrl: false
    })

    // Get current config and data based on active tab
    const currentConfig = activeTab === 'buildings' ? buildingsTableConfig : lotsTableConfig
    const currentData = activeTab === 'buildings' ? buildings : lots

    // Apply search filter
    const getNestedValue = (obj: any, path: string): any => {
        return path.split('.').reduce((current, key) => current?.[key], obj)
    }

    const filteredData = useMemo(() => {
        if (!searchTerm.trim()) return currentData

        const searchLower = searchTerm.toLowerCase()
        return currentData.filter(item => {
            return currentConfig.searchConfig.searchableFields.some(field => {
                const value = getNestedValue(item, field as string)
                return value?.toString().toLowerCase().includes(searchLower)
            })
        })
    }, [currentData, searchTerm, currentConfig])

    // Render content based on view mode
    const renderContent = (data: any[], config: typeof buildingsTableConfig | typeof lotsTableConfig) => {
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

        if (viewMode === 'list') {
            return (
                <DataTable
                    data={data as any}
                    columns={config.columns as any}
                    actions={config.actions}
                    loading={loading}
                    emptyMessage={emptyConfig.description}
                />
            )
        }

        return (
            <DataCards
                data={data as any}
                CardComponent={config.views.card.component as any}
                actions={config.actions}
                loading={loading}
                emptyMessage={emptyConfig.description}
                compact={config.views.card.compact}
            />
        )
    }

    // Handle tab change
    const handleTabChange = (value: string) => {
        setActiveTab(value as 'buildings' | 'lots')
        setSearchTerm('') // Reset search when switching tabs
    }

    return (
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden border border-slate-200 rounded-lg shadow-sm bg-white">
            <div className="p-4 space-y-4 flex-1 flex flex-col min-h-0 overflow-hidden">
                <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col overflow-hidden">
                    {/* Header with tabs and search */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        {/* Tabs */}
                        <div className="flex-shrink-0">
                            <div className="inline-flex h-10 bg-slate-100 rounded-md p-1">
                                <button
                                    onClick={() => handleTabChange('buildings')}
                                    className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all ${activeTab === 'buildings'
                                            ? 'bg-white text-sky-600 shadow-sm'
                                            : 'text-slate-600 hover:bg-slate-200/60'
                                        }`}
                                >
                                    <Building2 className={`h-4 w-4 mr-2 ${activeTab === 'buildings' ? 'text-sky-600' : 'text-slate-600'}`} />
                                    Immeubles
                                    <span className={`ml-2 text-xs px-2 py-0.5 rounded ${activeTab === 'buildings'
                                            ? 'bg-sky-100 text-sky-800'
                                            : 'bg-slate-200 text-slate-700'
                                        }`}>
                                        {buildings.length}
                                    </span>
                                </button>
                                <button
                                    onClick={() => handleTabChange('lots')}
                                    className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all ${activeTab === 'lots'
                                            ? 'bg-white text-sky-600 shadow-sm'
                                            : 'text-slate-600 hover:bg-slate-200/60'
                                        }`}
                                >
                                    <Home className={`h-4 w-4 mr-2 ${activeTab === 'lots' ? 'text-sky-600' : 'text-slate-600'}`} />
                                    Lots
                                    <span className={`ml-2 text-xs px-2 py-0.5 rounded ${activeTab === 'lots'
                                            ? 'bg-sky-100 text-sky-800'
                                            : 'bg-slate-200 text-slate-700'
                                        }`}>
                                        {lots.length}
                                    </span>
                                </button>
                            </div>
                        </div>

                        {/* Search, Filter and View Toggle */}
                        <div className="flex items-center gap-2 flex-1">
                            {/* Filter Icon */}
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-10 w-10 p-0 text-slate-600 hover:text-slate-900 border-slate-200 flex-shrink-0"
                                title="Filtres"
                            >
                                <Filter className="h-4 w-4" />
                            </Button>

                            {/* Search - Takes all available space */}
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    type="text"
                                    placeholder={currentConfig.searchConfig.placeholder}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9 h-10"
                                />
                            </div>

                            {/* View Mode Toggle (Cards/List only, no calendar) */}
                            {mounted && (
                                <div className="flex-shrink-0 inline-flex h-10 bg-slate-100 rounded-md p-1">
                                    <button
                                        onClick={() => setViewMode('cards')}
                                        className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all ${viewMode === 'cards'
                                                ? 'bg-white text-slate-900 shadow-sm'
                                                : 'text-slate-600 hover:bg-slate-200/60'
                                            }`}
                                        title="Vue cartes"
                                    >
                                        <LayoutGrid className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => setViewMode('list')}
                                        className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all ${viewMode === 'list'
                                                ? 'bg-white text-slate-900 shadow-sm'
                                                : 'text-slate-600 hover:bg-slate-200/60'
                                            }`}
                                        title="Vue liste"
                                    >
                                        <List className="h-4 w-4" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Tab Contents */}
                    <TabsContent value="buildings" className="flex-1 mt-4 overflow-y-auto">
                        {renderContent(filteredData as BuildingData[], buildingsTableConfig)}
                    </TabsContent>

                    <TabsContent value="lots" className="flex-1 mt-4 overflow-y-auto">
                        {renderContent(filteredData as LotData[], lotsTableConfig)}
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    )
}
