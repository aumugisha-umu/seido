"use client"

import { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ContractCard } from './contract-card'
import { ContractsListView } from './contracts-list-view'
import { deleteContract } from '@/app/actions/contract-actions'
import { toast } from 'sonner'
import { useViewMode } from '@/hooks/use-view-mode'
import { Search, LayoutGrid, List, FileText, AlertTriangle, Archive, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { logger } from '@/lib/logger'
import type { ContractWithRelations, ContractsNavigatorProps, ContractStatus } from '@/lib/types/contract.types'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

// ============================================================================
// CONTRACTS NAVIGATOR - Composant BEM Unifié
// ============================================================================
// Block:    contracts-section
// Elements: contracts-section__content, __tabs, __tab, __controls, __search,
//           __view-switcher, __view-btn, __data, __grid
// Modifiers: contracts-section__tab--active, __view-btn--active
// ============================================================================

type TabId = 'actifs' | 'expire_bientot' | 'termines' | 'tous'

interface Tab {
  id: TabId
  label: string
  icon: typeof FileText
  filter: (contract: ContractWithRelations) => boolean
}

const TABS: Tab[] = [
  {
    id: 'actifs',
    label: 'Actifs',
    icon: CheckCircle,
    filter: (c) => c.status === 'actif'
  },
  {
    id: 'expire_bientot',
    label: 'Expirent bientôt',
    icon: AlertTriangle,
    filter: (c) => {
      if (c.status !== 'actif') return false
      const endDate = new Date(c.end_date)
      const today = new Date()
      const daysRemaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      return daysRemaining > 0 && daysRemaining <= 30
    }
  },
  {
    id: 'termines',
    label: 'Terminés',
    icon: Archive,
    filter: (c) => c.status === 'expire' || c.status === 'resilie' || c.status === 'renouvele'
  },
  {
    id: 'tous',
    label: 'Tous',
    icon: FileText,
    filter: () => true
  }
]

export function ContractsNavigator({
  contracts,
  loading = false,
  onRefresh,
  onDeleteContract,
  className
}: ContractsNavigatorProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabId>('actifs')
  const [searchTerm, setSearchTerm] = useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [contractToDelete, setContractToDelete] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // View mode state
  const { viewMode, setViewMode, mounted } = useViewMode({
    defaultMode: 'cards',
    syncWithUrl: false
  })

  // Get current tab config
  const currentTab = TABS.find(t => t.id === activeTab) || TABS[0]

  // Apply filters
  const filteredContracts = useMemo(() => {
    let result = contracts.filter(currentTab.filter)

    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase()
      result = result.filter(contract => {
        return (
          contract.title.toLowerCase().includes(searchLower) ||
          contract.lot?.reference?.toLowerCase().includes(searchLower) ||
          contract.lot?.building?.name?.toLowerCase().includes(searchLower) ||
          contract.contacts?.some(c =>
            c.user.name?.toLowerCase().includes(searchLower) ||
            c.user.email?.toLowerCase().includes(searchLower)
          )
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

  // Handlers
  const handleView = useCallback((id: string) => {
    router.push(`/gestionnaire/contrats/${id}`)
  }, [router])

  const handleEdit = useCallback((id: string) => {
    router.push(`/gestionnaire/contrats/modifier/${id}`)
  }, [router])

  const handleDeleteClick = useCallback((id: string) => {
    setContractToDelete(id)
    setDeleteDialogOpen(true)
  }, [])

  const handleConfirmDelete = useCallback(async () => {
    if (!contractToDelete) return

    setIsDeleting(true)
    try {
      const result = await deleteContract(contractToDelete)

      if (result.success) {
        toast.success('Contrat supprimé avec succès')
        onDeleteContract?.(contractToDelete)
        onRefresh?.()
      } else {
        toast.error(result.error || 'Erreur lors de la suppression')
      }
    } catch (error) {
      logger.error('Error deleting contract:', error)
      toast.error('Erreur lors de la suppression du contrat')
    } finally {
      setIsDeleting(false)
      setDeleteDialogOpen(false)
      setContractToDelete(null)
    }
  }, [contractToDelete, onDeleteContract, onRefresh])

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value as TabId)
    setSearchTerm('')
  }

  // ========================================
  // BEM Classes
  // ========================================
  const blockClass = cn(
    'contracts-section',
    'flex-1 min-h-0 flex flex-col overflow-hidden',
    'border border-slate-200 rounded-lg shadow-sm bg-white',
    className
  )

  const contentClass = cn(
    'contracts-section__content',
    'p-4 space-y-4 flex-1 flex flex-col min-h-0 overflow-hidden'
  )

  const headerClass = cn(
    'contracts-section__header',
    'flex flex-col sm:flex-row sm:items-center justify-between gap-4'
  )

  const tabsContainerClass = cn(
    'contracts-section__tabs',
    'flex-shrink-0 inline-flex h-10 bg-slate-100 rounded-md p-1 overflow-x-auto'
  )

  const getTabClass = (isActive: boolean) => cn(
    'contracts-section__tab',
    'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all',
    isActive
      ? 'contracts-section__tab--active bg-white text-primary shadow-sm'
      : 'text-slate-600 hover:bg-slate-200/60'
  )

  const getTabIconClass = (isActive: boolean) => cn(
    'contracts-section__tab-icon',
    'h-4 w-4 mr-2',
    isActive ? 'text-primary' : 'text-slate-600'
  )

  const getTabBadgeClass = (isActive: boolean) => cn(
    'contracts-section__tab-badge',
    'ml-2 text-xs px-2 py-0.5 rounded',
    isActive ? 'bg-primary/10 text-primary' : 'bg-slate-200 text-slate-700'
  )

  const controlsClass = cn(
    'contracts-section__controls',
    'flex items-center gap-2 flex-1'
  )

  const searchClass = cn(
    'contracts-section__search',
    'relative flex-1'
  )

  const viewSwitcherClass = cn(
    'contracts-section__view-switcher',
    'flex-shrink-0 inline-flex h-10 bg-slate-100 rounded-md p-1'
  )

  const getViewBtnClass = (isActive: boolean) => cn(
    'contracts-section__view-btn',
    'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all',
    isActive
      ? 'contracts-section__view-btn--active bg-white text-slate-900 shadow-sm'
      : 'text-slate-600 hover:bg-slate-200/60'
  )

  const dataClass = cn(
    'contracts-section__data',
    'flex-1 mt-4 overflow-y-auto'
  )

  const gridClass = cn(
    'contracts-section__grid',
    viewMode === 'cards'
      ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4'
      : 'space-y-2'
  )

  // Render loading state
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
    <>
      <div className={blockClass}>
        <div className={contentClass}>
          {/* Header with tabs and search */}
          <div className={headerClass}>
            {/* Tabs */}
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
                  placeholder="Rechercher un contrat..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-10"
                />
              </div>

              {/* View switcher */}
              <div className={viewSwitcherClass}>
                <button
                  onClick={() => setViewMode('cards')}
                  className={getViewBtnClass(viewMode === 'cards')}
                  aria-label="Vue grille"
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={getViewBtnClass(viewMode === 'list')}
                  aria-label="Vue liste"
                >
                  <List className="h-4 w-4" />
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
              <div className="contracts-section__empty flex flex-col items-center justify-center py-12 text-center">
                <FileText className="h-12 w-12 text-slate-300 mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-1">
                  {searchTerm ? 'Aucun résultat' : 'Aucun contrat'}
                </h3>
                <p className="text-sm text-slate-500 max-w-md">
                  {searchTerm
                    ? `Aucun contrat ne correspond à "${searchTerm}"`
                    : 'Créez votre premier contrat pour commencer à gérer vos baux'
                  }
                </p>
                {!searchTerm && (
                  <Button
                    onClick={() => router.push('/gestionnaire/contrats/nouveau')}
                    className="mt-4"
                  >
                    Créer un contrat
                  </Button>
                )}
              </div>
            ) : viewMode === 'list' ? (
              <ContractsListView
                contracts={filteredContracts}
                onView={handleView}
                onEdit={handleEdit}
                onDelete={handleDeleteClick}
              />
            ) : (
              <div className={gridClass}>
                {filteredContracts.map((contract) => (
                  <ContractCard
                    key={contract.id}
                    contract={contract}
                    onView={handleView}
                    onEdit={handleEdit}
                    onDelete={handleDeleteClick}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le contrat ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le contrat sera définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Suppression...' : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
