"use client"

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ContractsListView } from './contracts-list-view'
import { deleteContract } from '@/app/actions/contract-actions'
import { toast } from 'sonner'
import { Search, FileText, AlertTriangle, Archive, CheckCircle, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { logger } from '@/lib/logger'
import { getExpiryInfo } from '@/lib/utils/lease-expiry'
import type { ContractWithRelations, ContractsNavigatorProps } from '@/lib/types/contract.types'
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
//           __data
// Modifiers: contracts-section__tab--active
// ============================================================================

type TabId = 'actifs' | 'a_venir' | 'expire_bientot' | 'termines' | 'tous'

interface Tab {
  id: TabId
  label: string
  icon: typeof FileText
  filter: (contract: ContractWithRelations) => boolean
}

const TABS: Tab[] = [
  {
    id: 'tous',
    label: 'Tous',
    icon: FileText,
    filter: () => true
  },
  {
    id: 'a_venir',
    label: 'À venir',
    icon: Clock,
    filter: (c) => c.status === 'a_venir'
  },
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
      const info = getExpiryInfo(c.end_date, c.duration_months, c.metadata || {})
      // Only show contracts in alert window AND without a decision already taken
      return info.alertTier !== null && info.decision === null
    }
  },
  {
    id: 'termines',
    label: 'Terminés',
    icon: Archive,
    filter: (c) => c.status === 'expire' || c.status === 'resilie' || c.status === 'renouvele'
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
  const [activeTab, setActiveTab] = useState<TabId>('tous')
  const [searchTerm, setSearchTerm] = useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [contractToDelete, setContractToDelete] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

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

  // Fallback: if on expire_bientot tab and count drops to 0, switch to actifs
  useEffect(() => {
    if (activeTab === 'expire_bientot' && tabCounts.expire_bientot === 0) {
      setActiveTab('tous')
    }
  }, [activeTab, tabCounts.expire_bientot])

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

  const getTabClass = (isActive: boolean, isAlert = false) => cn(
    'contracts-section__tab',
    'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all',
    isActive
      ? isAlert
        ? 'bg-orange-50 text-orange-700 shadow-sm border border-orange-200'
        : 'contracts-section__tab--active bg-white text-primary shadow-sm'
      : isAlert
        ? 'text-orange-600 hover:bg-orange-50'
        : 'text-slate-600 hover:bg-slate-200/60'
  )

  const getTabIconClass = (isActive: boolean, isAlert = false) => cn(
    'contracts-section__tab-icon',
    'h-4 w-4 mr-2',
    isAlert
      ? isActive ? 'text-orange-700' : 'text-orange-600'
      : isActive ? 'text-primary' : 'text-slate-600'
  )

  const getTabBadgeClass = (isActive: boolean, isAlert = false) => cn(
    'contracts-section__tab-badge',
    'ml-2 text-xs px-2 py-0.5 rounded',
    isActive
      ? isAlert
        ? 'bg-orange-100 text-orange-800 border-orange-200'
        : 'bg-primary/10 text-primary'
      : isAlert
        ? 'bg-orange-50 text-orange-700 border-orange-200'
        : 'bg-slate-200 text-slate-700'
  )

  const controlsClass = cn(
    'contracts-section__controls',
    'flex items-center gap-2 flex-1'
  )

  const searchClass = cn(
    'contracts-section__search',
    'relative flex-1'
  )

  const dataClass = cn(
    'contracts-section__data',
    'flex-1 mt-4 overflow-y-auto'
  )

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
                const isAlert = tab.id === 'expire_bientot'

                // Hide "Expirent bientôt" when no expiring contracts
                if (isAlert && count === 0) return null

                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={getTabClass(isActive, isAlert)}
                  >
                    <Icon className={getTabIconClass(isActive, isAlert)} />
                    <span className="hidden sm:inline">{tab.label}</span>
                    <span className={getTabBadgeClass(isActive, isAlert)}>{count}</span>
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

            </div>
          </div>

          {/* Content */}
          <div className={dataClass}>
            {loading ? (
              <div className="animate-pulse space-y-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-12 bg-slate-200 rounded-lg" />
                ))}
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
            ) : (
              <ContractsListView
                contracts={filteredContracts}
                onView={handleView}
                onEdit={handleEdit}
                onDelete={handleDeleteClick}
              />
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
