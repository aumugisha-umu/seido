"use client"

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { buildingsTableConfig, lotsTableConfig, type BuildingData, type LotData } from '@/config/table-configs/patrimoine.config'
import { useDataNavigator } from '@/hooks/use-data-navigator'
import { DataTable } from '@/components/ui/data-table/data-table'
import { BuildingCardExpandable } from './building-card-expandable'
import { LotCardUnified } from './lot-card-unified/lot-card-unified'
import { BuildingCardMobile } from './building-card-mobile'
import { LotCardMobile } from './lot-card-mobile'
import { Building2, Home, Search, Filter, LayoutGrid, List } from 'lucide-react'
import { cn } from '@/lib/utils'

// ============================================================================
// PATRIMOINE NAVIGATOR - Composant BEM Unifié
// ============================================================================
// Block:    patrimoine-section
// Elements: patrimoine-section__content, __tabs, __tab, __controls, __search,
//           __filter-btn, __view-switcher, __view-btn, __data
// Modifiers: patrimoine-section__tab--active, __view-btn--active
// ============================================================================

interface PatrimoineNavigatorProps {
    buildings: BuildingData[]
    lots: LotData[]
    loading?: boolean
    onRefresh?: () => void
    className?: string
    /** IDs of lots that are locked (subscription restriction). null = all accessible. */
    lockedLotIds?: Set<string> | null
}

export function PatrimoineNavigator({
    buildings,
    lots,
    loading = false,
    onRefresh,
    className,
    lockedLotIds = null
}: PatrimoineNavigatorProps) {
    const router = useRouter()
    const [activeTab, setActiveTab] = useState<'buildings' | 'lots'>('buildings')
    const [expandedBuildings, setExpandedBuildings] = useState<string[]>([])

    // Toggle building expansion (allows multiple buildings to be expanded)
    const toggleBuildingExpansion = useCallback((buildingId: string) => {
        setExpandedBuildings(prev =>
            prev.includes(buildingId)
                ? prev.filter(id => id !== buildingId)
                : [...prev, buildingId]
        )
    }, [])

    // Get current config and data based on active tab
    const currentConfig = activeTab === 'buildings' ? buildingsTableConfig : lotsTableConfig
    const currentData = activeTab === 'buildings' ? buildings : lots

    // Use shared hook for search, view mode, and filtering
    const {
        searchTerm,
        setSearchTerm,
        viewMode,
        setViewMode,
        mounted,
        filteredData,
        createRowClickHandler
    } = useDataNavigator({
        data: currentData,
        searchableFields: currentConfig.searchConfig.searchableFields as string[],
        defaultView: 'cards'
    })

    // Render content based on view mode - Buildings specific
    const renderBuildingsContent = () => {
        if (!mounted) {
            return (
                <div className="animate-pulse space-y-2">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-32 bg-gray-200 rounded-lg" />
                    ))}
                </div>
            )
        }

        const data = filteredData as BuildingData[]
        const emptyConfig = buildingsTableConfig.emptyState || {
            title: 'Aucune donnée',
            description: 'Aucun élément à afficher'
        }

        if (viewMode === 'list') {
            return (
                <>
                    {/* Mobile: compact cards */}
                    <div className="block md:hidden space-y-2">
                        {data.map((building) => (
                            <BuildingCardMobile key={building.id} building={building} />
                        ))}
                        {!loading && data.length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-8">{emptyConfig.description}</p>
                        )}
                    </div>
                    {/* Desktop: table */}
                    <div className="hidden md:block">
                        <DataTable<BuildingData>
                            data={data}
                            columns={buildingsTableConfig.columns}
                            actions={buildingsTableConfig.actions}
                            loading={loading}
                            emptyMessage={emptyConfig.description}
                            onRowClick={createRowClickHandler(buildingsTableConfig.rowHref)}
                        />
                    </div>
                </>
            )
        }

        // Card view with expandable cards
        if (loading) {
            return (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-40 bg-gray-200 rounded-lg animate-pulse" />
                    ))}
                </div>
            )
        }

        if (data.length === 0) {
            return (
                <div className="text-center py-12 text-slate-500">
                    {emptyConfig.description}
                </div>
            )
        }

        return (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
                {data.map((building) => (
                    <BuildingCardExpandable
                        key={building.id}
                        item={building}
                        isExpanded={expandedBuildings.includes(building.id)}
                        onToggleExpand={() => toggleBuildingExpansion(building.id)}
                    />
                ))}
            </div>
        )
    }

    // Row click handler that respects locked status
    const createLockedAwareRowClickHandler = (rowHref?: (item: LotData) => string) => {
        if (!rowHref) return undefined
        return (item: LotData) => {
            if (lockedLotIds?.has(item.id)) return // Block navigation for locked lots
            router.push(rowHref(item))
        }
    }

    // Render content based on view mode - Lots specific
    const renderLotsContent = () => {
        if (!mounted) {
            return (
                <div className="animate-pulse space-y-2">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-32 bg-gray-200 rounded-lg" />
                    ))}
                </div>
            )
        }

        const data = filteredData as LotData[]
        const emptyConfig = lotsTableConfig.emptyState || {
            title: 'Aucune donnée',
            description: 'Aucun élément à afficher'
        }

        if (viewMode === 'list') {
            return (
                <>
                    {/* Mobile: compact cards */}
                    <div className="block md:hidden space-y-2">
                        {data.map((lot) => (
                            <LotCardMobile
                                key={lot.id}
                                lot={lot}
                                locked={lockedLotIds?.has(lot.id) ?? false}
                            />
                        ))}
                        {!loading && data.length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-8">{emptyConfig.description}</p>
                        )}
                    </div>
                    {/* Desktop: table */}
                    <div className="hidden md:block">
                        <DataTable<LotData>
                            data={data}
                            columns={lotsTableConfig.columns}
                            actions={lotsTableConfig.actions}
                            loading={loading}
                            emptyMessage={emptyConfig.description}
                            onRowClick={lockedLotIds
                                ? createLockedAwareRowClickHandler(lotsTableConfig.rowHref)
                                : createRowClickHandler(lotsTableConfig.rowHref)
                            }
                        />
                    </div>
                </>
            )
        }

        // Card view — render directly to support isLocked per-card
        if (loading) {
            return (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-40 bg-gray-200 rounded-lg animate-pulse" />
                    ))}
                </div>
            )
        }

        if (data.length === 0) {
            return (
                <div className="text-center py-12 text-slate-500">
                    {emptyConfig.description}
                </div>
            )
        }

        return (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
                {data.map((lot) => (
                    <LotCardUnified
                        key={lot.id}
                        lot={lot}
                        variant="expandable"
                        mode="view"
                        showBuilding={true}
                        customActions={{ showDropdown: true }}
                        isLocked={lockedLotIds?.has(lot.id) ?? false}
                    />
                ))}
            </div>
        )
    }

    // Handle tab change
    const handleTabChange = (value: string) => {
        setActiveTab(value as 'buildings' | 'lots')
        setSearchTerm('') // Reset search when switching tabs
    }

    // ========================================
    // BEM Classes
    // ========================================
    const blockClass = cn(
        "patrimoine-section",
        "flex-1 min-h-0 flex flex-col",
        "border border-slate-200 rounded-lg shadow-sm bg-white",
        className
    )

    const contentClass = cn(
        "patrimoine-section__content",
        "p-4 space-y-4 flex-1 flex flex-col min-h-0"
    )

    const headerClass = cn(
        "patrimoine-section__header",
        "flex flex-col sm:flex-row sm:items-center justify-between gap-4"
    )

    const tabsContainerClass = cn(
        "patrimoine-section__tabs",
        "flex-shrink-0 inline-flex h-10 bg-slate-100 rounded-md p-1"
    )

    const getTabClass = (isActive: boolean) => cn(
        "patrimoine-section__tab",
        "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all",
        isActive
            ? "patrimoine-section__tab--active bg-white text-sky-600 shadow-sm"
            : "text-slate-600 hover:bg-slate-200/60"
    )

    const getTabIconClass = (isActive: boolean) => cn(
        "patrimoine-section__tab-icon",
        "h-4 w-4 mr-2",
        isActive ? "text-sky-600" : "text-slate-600"
    )

    const getTabBadgeClass = (isActive: boolean) => cn(
        "patrimoine-section__tab-badge",
        "ml-2 text-xs px-2 py-0.5 rounded",
        isActive ? "bg-sky-100 text-sky-800" : "bg-slate-200 text-slate-700"
    )

    const controlsClass = cn(
        "patrimoine-section__controls",
        "flex items-center gap-2 flex-1"
    )

    const filterBtnClass = cn(
        "patrimoine-section__filter-btn",
        "h-10 w-10 p-0 text-slate-600 hover:text-slate-900 border-slate-200 flex-shrink-0"
    )

    const viewSwitcherClass = cn(
        "patrimoine-section__view-switcher",
        "flex-shrink-0 inline-flex h-10 bg-slate-100 rounded-md p-1"
    )

    const getViewBtnClass = (isActive: boolean) => cn(
        "patrimoine-section__view-btn",
        "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all",
        isActive
            ? "patrimoine-section__view-btn--active bg-white text-slate-900 shadow-sm"
            : "text-slate-600 hover:bg-slate-200/60"
    )

    const searchClass = cn(
        "patrimoine-section__search",
        "relative flex-1"
    )

    const dataClass = cn(
        "patrimoine-section__data",
        "flex-1 mt-4 overflow-y-auto"
    )

    // ========================================
    // Render
    // ========================================
    return (
        <div className={blockClass}>
            <div className={contentClass}>
                <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col min-h-0">
                    {/* Header with tabs and search */}
                    <div className={headerClass}>
                        {/* Tabs */}
                        <div className="flex-shrink-0">
                            <div className={tabsContainerClass}>
                                <button
                                    onClick={() => handleTabChange('buildings')}
                                    className={getTabClass(activeTab === 'buildings')}
                                >
                                    <Building2 className={getTabIconClass(activeTab === 'buildings')} />
                                    Immeubles
                                    <span className={getTabBadgeClass(activeTab === 'buildings')}>
                                        {buildings.length}
                                    </span>
                                </button>
                                <button
                                    onClick={() => handleTabChange('lots')}
                                    className={getTabClass(activeTab === 'lots')}
                                >
                                    <Home className={getTabIconClass(activeTab === 'lots')} />
                                    Lots
                                    <span className={getTabBadgeClass(activeTab === 'lots')}>
                                        {lots.length}
                                    </span>
                                </button>
                            </div>
                        </div>

                        {/* Search, Filter and View Toggle */}
                        <div className={controlsClass}>
                            {/* Filter Icon */}
                            <Button
                                variant="outline"
                                size="sm"
                                className={filterBtnClass}
                                title="Filtres"
                            >
                                <Filter className="h-4 w-4" />
                            </Button>

                            {/* Search - Takes all available space */}
                            <div className={searchClass}>
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    type="text"
                                    placeholder={currentConfig.searchConfig.placeholder}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9 h-10"
                                />
                            </div>

                            {/* View Mode Toggle (Cards/List) */}
                            {mounted && (
                                <div className={viewSwitcherClass}>
                                    <button
                                        onClick={() => setViewMode('list')}
                                        className={getViewBtnClass(viewMode === 'list')}
                                        title="Vue liste"
                                    >
                                        <List className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => setViewMode('cards')}
                                        className={getViewBtnClass(viewMode === 'cards')}
                                        title="Vue cartes"
                                    >
                                        <LayoutGrid className="h-4 w-4" />
                                    </button>
                                </div>
                            )}

                        </div>
                    </div>

                    {/* Tab Contents */}
                    <TabsContent value="buildings" className={dataClass}>
                        {renderBuildingsContent()}
                    </TabsContent>

                    <TabsContent value="lots" className={dataClass}>
                        {renderLotsContent()}
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    )
}
