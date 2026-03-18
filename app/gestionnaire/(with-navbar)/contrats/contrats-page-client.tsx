"use client"

import { Plus, Upload, ChevronDown, ScrollText, Wrench } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useFABActions } from "@/components/ui/fab"
import { PageActions } from "@/components/page-actions"
import { ContractsNavigator } from "@/components/contracts/contracts-navigator"
import { SupplierContractsNavigator } from "@/components/contracts/supplier-contracts-navigator"
import { useState, useEffect, useCallback, useRef } from "react"
import { cn } from "@/lib/utils"
import { logger } from '@/lib/logger'
import type { ContractWithRelations } from '@/lib/types/contract.types'
import type { SupplierContractWithRelations } from '@/lib/types/supplier-contract.types'

type ContractType = 'baux' | 'fournisseur'

interface ContratsPageClientProps {
  initialContracts: ContractWithRelations[]
  initialSupplierContracts: SupplierContractWithRelations[]
  teamId: string | undefined
  userId: string | undefined
}

// Helper function to create a simple hash of data for change detection
function createDataHash(contracts: ContractWithRelations[], teamId: string | undefined): string {
  const contractIds = contracts.map(c => c.id).sort().join(',')
  const contractCount = contracts.length
  return `${teamId}-${contractCount}-${contractIds.substring(0, 50)}`
}

export function ContratsPageClient({
  initialContracts,
  initialSupplierContracts,
  teamId
}: ContratsPageClientProps) {
  const router = useRouter()

  useFABActions([
    {
      id: 'import-contrats',
      label: 'Importer',
      icon: Upload,
      onClick: () => router.push('/gestionnaire/import'),
    }
  ])

  const [isRefreshing, setIsRefreshing] = useState(false)
  const previousDataHashRef = useRef<string>('')

  // Contract type toggle state
  const [activeContractType, setActiveContractType] = useState<ContractType>('baux')

  // State for lease contracts
  const [contracts, setContracts] = useState<ContractWithRelations[]>(
    Array.isArray(initialContracts) ? initialContracts : []
  )

  // State for supplier contracts
  const [supplierContracts, setSupplierContracts] = useState<SupplierContractWithRelations[]>(
    Array.isArray(initialSupplierContracts) ? initialSupplierContracts : []
  )

  // Debug: Log initial data structure
  useEffect(() => {
    logger.info("📊 [CONTRATS-PAGE-CLIENT] Initial data received:", {
      contractsCount: Array.isArray(initialContracts) ? initialContracts.length : 0,
      supplierContractsCount: Array.isArray(initialSupplierContracts) ? initialSupplierContracts.length : 0,
      teamId: teamId
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only log on mount

  // Manual refresh function with loading state
  const handleRefresh = useCallback(async () => {
    logger.info("🔄 [CONTRATS-PAGE-CLIENT] Manual refresh triggered")
    setIsRefreshing(true)

    try {
      router.refresh()
      previousDataHashRef.current = ''
    } catch (error) {
      logger.error("❌ [CONTRATS-PAGE-CLIENT] Error during refresh:", error)
      setIsRefreshing(false)
    }
  }, [router])

  // Initialize hash on mount
  useEffect(() => {
    const initialHash = createDataHash(initialContracts, teamId)
    previousDataHashRef.current = initialHash
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Improved change detection using hash comparison
  useEffect(() => {
    const currentHash = createDataHash(initialContracts, teamId)
    const previousHash = previousDataHashRef.current

    if (currentHash !== previousHash) {
      logger.info("🔄 [CONTRATS-PAGE-CLIENT] Data changed, updating state", {
        previousHash: previousHash.substring(0, 20),
        currentHash: currentHash.substring(0, 20),
        contractsCount: initialContracts.length
      })

      const safeContracts = Array.isArray(initialContracts) ? initialContracts : []

      setContracts(safeContracts)

      logger.info("✅ [CONTRATS-PAGE-CLIENT] Data updated in state:", {
        contractsCount: safeContracts.length,
        teamId: teamId
      })
      previousDataHashRef.current = currentHash
      setIsRefreshing(false)
    }
  }, [initialContracts, teamId])

  // Update supplier contracts when initial data changes
  useEffect(() => {
    const safe = Array.isArray(initialSupplierContracts) ? initialSupplierContracts : []
    setSupplierContracts(safe)
  }, [initialSupplierContracts])

  // Handle delete callback
  const handleDeleteContract = useCallback(async (id: string) => {
    logger.info("🗑️ [CONTRATS-PAGE-CLIENT] Delete contract requested:", id)
    handleRefresh()
  }, [handleRefresh])

  // ========================================
  // Toggle styling (PatrimoineNavigator pattern)
  // ========================================
  const getToggleButtonClass = (isActive: boolean) => cn(
    "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all",
    isActive
      ? "bg-white text-sky-600 shadow-sm"
      : "text-slate-600 hover:bg-slate-200/60"
  )

  const getToggleBadgeClass = (isActive: boolean) => cn(
    "ml-2 text-xs px-2 py-0.5 rounded",
    isActive ? "bg-sky-100 text-sky-800" : "bg-slate-200 text-slate-700"
  )

  const getToggleIconClass = (isActive: boolean) => cn(
    "h-4 w-4 mr-2",
    isActive ? "text-sky-600" : "text-slate-600"
  )

  return (
    <div className="h-full flex flex-col overflow-hidden layout-container">
      <div className="content-max-width flex flex-col flex-1 min-h-0 overflow-hidden">
        <PageActions>
          {/* Contract type toggle — in the topbar, next to the page title */}
          <div className="inline-flex h-9 bg-slate-100 rounded-md p-1 mr-auto">
            <button
              onClick={() => setActiveContractType('baux')}
              className={getToggleButtonClass(activeContractType === 'baux')}
            >
              <ScrollText className={getToggleIconClass(activeContractType === 'baux')} />
              Baux
              <span className={getToggleBadgeClass(activeContractType === 'baux')}>
                {contracts.length}
              </span>
            </button>
            <button
              onClick={() => setActiveContractType('fournisseur')}
              className={getToggleButtonClass(activeContractType === 'fournisseur')}
            >
              <Wrench className={getToggleIconClass(activeContractType === 'fournisseur')} />
              Fournisseurs
              <span className={getToggleBadgeClass(activeContractType === 'fournisseur')}>
                {supplierContracts.length}
              </span>
            </button>
          </div>

          <Button variant="outline" className="flex items-center space-x-2" onClick={() => router.push('/gestionnaire/import')}>
            <Upload className="h-4 w-4" /><span>Importer</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="flex items-center space-x-2">
                <Plus className="h-4 w-4" /><span>Nouveau contrat</span><ChevronDown className="h-3 w-3 ml-1 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => router.push('/gestionnaire/contrats/nouveau?type=bail')}>
                Bail locatif
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/gestionnaire/contrats/nouveau?type=fournisseur')}>
                Contrat fournisseur
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </PageActions>

        {/* Card wrapper */}
        <div className="bg-card rounded-lg border border-border shadow-sm flex-1 flex flex-col min-h-0 overflow-hidden">
          {activeContractType === 'baux' ? (
            <ContractsNavigator
              contracts={contracts}
              loading={isRefreshing}
              onRefresh={handleRefresh}
              onDeleteContract={handleDeleteContract}
              className="border-0 shadow-none bg-transparent"
            />
          ) : (
            <SupplierContractsNavigator
              contracts={supplierContracts}
              loading={isRefreshing}
              className="border-0 shadow-none bg-transparent"
            />
          )}
        </div>
      </div>
    </div>
  )
}
