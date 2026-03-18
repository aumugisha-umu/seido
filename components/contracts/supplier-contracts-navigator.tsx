"use client"

import { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { SupplierContractCard } from './supplier-contract-card'
import { SupplierContractsListView } from './supplier-contracts-list-view'
import { useViewMode } from '@/hooks/use-view-mode'
import { Search, LayoutGrid, List, FileText, CheckCircle, Clock, XCircle, Wrench } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SupplierContractWithRelations } from '@/lib/types/supplier-contract.types'

// ============================================================================
// SUPPLIER CONTRACTS NAVIGATOR - BEM Unified
// ============================================================================
// Block:    supplier-contracts-section
// Elements: __content, __tabs, __tab, __controls, __search, __view-switcher, __data, __grid
// ============================================================================

type TabId = 'tous' | 'actifs' | 'expires' | 'resilies'

interface Tab {
  id: TabId
  label: string
  icon: typeof FileText
  filter: (contract: SupplierContractWithRelations) => boolean
}

const TABS: Tab[] = [
  { id: 'tous',     label: 'Tous',     icon: FileText,    filter: () => true },
  { id: 'actifs',   label: 'Actifs',   icon: CheckCircle, filter: (c) => c.status === 'actif' },
  { id: 'expires',  label: 'Expirés',  icon: Clock,       filter: (c) => c.status === 'expire' },
  { id: 'resilies', label: 'Résiliés', icon: XCircle,     filter: (c) => c.status === 'resilie' },
]

interface SupplierContractsNavigatorProps {
  contracts: SupplierContractWithRelations[]
  loading?: boolean
  className?: string
}

export function SupplierContractsNavigator({
  contracts,
  loading = false,
  className
}: SupplierContractsNavigatorProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabId>('tous')
  const [searchTerm, setSearchTerm] = useState('')

  const { viewMode, setViewMode, mounted } = useViewMode({
    defaultMode: 'cards',
    syncWithUrl: false
  })

  const currentTab = TABS.find(t => t.id === activeTab) || TABS[0]

  // Apply filters + search
  const filteredContracts = useMemo(() => {
    let result = contracts.filter(currentTab.filter)

    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase()
      result = result.filter(contract => {
        const ref = contract.reference?.toLowerCase() || ''
        const supplierFirst = contract.supplier?.first_name?.toLowerCase() || ''
        const supplierLast = contract.supplier?.last_name?.toLowerCase() || ''
        const supplierName = contract.supplier?.name?.toLowerCase() || ''
        const supplierCompany = contract.supplier?.company?.toLowerCase() || ''
        const companyRecord = contract.supplier?.company_record?.name?.toLowerCase() || ''
        return (
          ref.includes(searchLower) ||
          supplierFirst.includes(searchLower) ||
          supplierLast.includes(searchLower) ||
          supplierName.includes(searchLower) ||
          supplierCompany.includes(searchLower) ||
          companyRecord.includes(searchLower)
        )
      })
    }

    return result
  }, [contracts, currentTab, searchTerm])

  // Count per tab
  const tabCounts = useMemo(() => {
    return TABS.reduce((acc, tab) => {
      acc[tab.id] = contracts.filter(tab.filter).length
      return acc
    }, {} as Record<TabId, number>)
  }, [contracts])

  const handleView = useCallback((contract: SupplierContractWithRelations) => {
    router.push(`/gestionnaire/contrats/fournisseur/${contract.id}`)
  }, [router])

  const handleViewById = useCallback((id: string) => {
    router.push(`/gestionnaire/contrats/fournisseur/${id}`)
  }, [router])

  const handleEdit = useCallback((contract: SupplierContractWithRelations) => {
    router.push(`/gestionnaire/contrats/fournisseur/modifier/${contract.id}`)
  }, [router])

  const handleEditById = useCallback((id: string) => {
    router.push(`/gestionnaire/contrats/fournisseur/modifier/${id}`)
  }, [router])

  const handleTabChange = (value: string) => {
    setActiveTab(value as TabId)
    setSearchTerm('')
  }

  // BEM Classes (mirror ContractsNavigator)
  const blockClass = cn(
    'supplier-contracts-section',
    'flex-1 min-h-0 flex flex-col overflow-hidden',
    'border border-slate-200 rounded-lg shadow-sm bg-white',
    className
  )

  const contentClass = cn(
    'supplier-contracts-section__content',
    'p-4 space-y-4 flex-1 flex flex-col min-h-0 overflow-hidden'
  )

  const headerClass = cn(
    'supplier-contracts-section__header',
    'flex flex-col sm:flex-row sm:items-center justify-between gap-4'
  )

  const tabsContainerClass = cn(
    'supplier-contracts-section__tabs',
    'flex-shrink-0 inline-flex h-10 bg-slate-100 rounded-md p-1 overflow-x-auto'
  )

  const getTabClass = (isActive: boolean) => cn(
    'supplier-contracts-section__tab',
    'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all',
    isActive
      ? 'supplier-contracts-section__tab--active bg-white text-primary shadow-sm'
      : 'text-slate-600 hover:bg-slate-200/60'
  )

  const getTabIconClass = (isActive: boolean) => cn(
    'h-4 w-4 mr-2',
    isActive ? 'text-primary' : 'text-slate-600'
  )

  const getTabBadgeClass = (isActive: boolean) => cn(
    'ml-2 text-xs px-2 py-0.5 rounded',
    isActive ? 'bg-primary/10 text-primary' : 'bg-slate-200 text-slate-700'
  )

  const controlsClass = cn(
    'supplier-contracts-section__controls',
    'flex items-center gap-2 flex-1'
  )

  const searchClass = cn(
    'supplier-contracts-section__search',
    'relative flex-1'
  )

  const viewSwitcherClass = cn(
    'supplier-contracts-section__view-switcher',
    'flex-shrink-0 inline-flex h-10 bg-slate-100 rounded-md p-1'
  )

  const getViewBtnClass = (isActive: boolean) => cn(
    'supplier-contracts-section__view-btn',
    'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all',
    isActive
      ? 'supplier-contracts-section__view-btn--active bg-white text-slate-900 shadow-sm'
      : 'text-slate-600 hover:bg-slate-200/60'
  )

  const dataClass = cn(
    'supplier-contracts-section__data',
    'flex-1 mt-4 overflow-y-auto'
  )

  const gridClass = cn(
    'supplier-contracts-section__grid',
    'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4'
  )

  // Loading skeleton
  if (!mounted) {
    return (
      <div className={blockClass}>
        <div className={contentClass}>
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-slate-200 rounded w-1/3" />
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-48 bg-slate-200 rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={blockClass}>
      <div className={contentClass}>
        {/* Header with tabs and search */}
        <div className={headerClass}>
          {/* Filter tabs */}
          <div className={tabsContainerClass}>
            {TABS.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              const count = tabCounts[tab.id]

              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={getTabClass(isActive)}
                >
                  <Icon className={getTabIconClass(isActive)} />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className={getTabBadgeClass(isActive)}>{count}</span>
                </button>
              )
            })}
          </div>

          {/* Search and view toggle */}
          <div className={controlsClass}>
            <div className={searchClass}>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Rechercher un fournisseur..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-10"
              />
            </div>

            {/* View switcher */}
            <div className={viewSwitcherClass}>
              <button
                onClick={() => setViewMode('list')}
                className={getViewBtnClass(viewMode === 'list')}
                aria-label="Vue liste"
              >
                <List className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={getViewBtnClass(viewMode === 'cards')}
                aria-label="Vue grille"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className={dataClass}>
          {loading ? (
            <div className="animate-pulse space-y-4">
              <div className={gridClass}>
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-48 bg-slate-200 rounded-lg" />
                ))}
              </div>
            </div>
          ) : filteredContracts.length === 0 ? (
            <div className="supplier-contracts-section__empty flex flex-col items-center justify-center py-12 text-center">
              <Wrench className="h-12 w-12 text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-1">
                {searchTerm ? 'Aucun résultat' : 'Aucun contrat fournisseur'}
              </h3>
              <p className="text-sm text-slate-500 max-w-md">
                {searchTerm
                  ? `Aucun contrat ne correspond à "${searchTerm}"`
                  : 'Créez votre premier contrat fournisseur pour gérer vos prestataires'
                }
              </p>
              {!searchTerm && (
                <Button
                  onClick={() => router.push('/gestionnaire/contrats/nouveau?type=fournisseur')}
                  className="mt-4"
                >
                  Créer un contrat fournisseur
                </Button>
              )}
            </div>
          ) : viewMode === 'list' ? (
            <>
              {/* Mobile: cards in single column */}
              <div className="block md:hidden space-y-2">
                {filteredContracts.map((contract) => (
                  <SupplierContractCard
                    key={contract.id}
                    contract={contract}
                    onView={handleView}
                    onEdit={handleEdit}
                  />
                ))}
              </div>
              {/* Desktop: table */}
              <div className="hidden md:block">
                <SupplierContractsListView
                  contracts={filteredContracts}
                  onView={handleViewById}
                  onEdit={handleEditById}
                />
              </div>
            </>
          ) : (
            <div className={gridClass}>
              {filteredContracts.map((contract) => (
                <SupplierContractCard
                  key={contract.id}
                  contract={contract}
                  onView={handleView}
                  onEdit={handleEdit}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
