"use client"

import { Plus, RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ContractsNavigator } from "@/components/contracts/contracts-navigator"
import { useState, useEffect, useCallback, useRef } from "react"
import { logger } from '@/lib/logger'
import type { ContractWithRelations, ContractStats } from '@/lib/types/contract.types'

interface ContratsPageClientProps {
  initialContracts: ContractWithRelations[]
  initialStats: ContractStats
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
  initialStats,
  teamId,
  userId
}: ContratsPageClientProps) {
  const router = useRouter()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const previousDataHashRef = useRef<string>('')

  // State for contracts and stats
  const [contracts, setContracts] = useState<ContractWithRelations[]>(
    Array.isArray(initialContracts) ? initialContracts : []
  )
  const [stats, setStats] = useState<ContractStats>(initialStats)

  // Debug: Log initial data structure
  useEffect(() => {
    logger.info("📊 [CONTRATS-PAGE-CLIENT] Initial data received:", {
      contractsCount: Array.isArray(initialContracts) ? initialContracts.length : 0,
      teamId: teamId,
      stats: initialStats
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
      setStats(initialStats)

      logger.info("✅ [CONTRATS-PAGE-CLIENT] Data updated in state:", {
        contractsCount: safeContracts.length,
        teamId: teamId
      })
      previousDataHashRef.current = currentHash
      setIsRefreshing(false)
    }
  }, [initialContracts, initialStats, teamId])

  // Handle delete callback
  const handleDeleteContract = useCallback(async (id: string) => {
    logger.info("🗑️ [CONTRATS-PAGE-CLIENT] Delete contract requested:", id)
    // The actual delete is handled by ContractsNavigator
    // After delete, refresh the page
    handleRefresh()
  }, [handleRefresh])

  return (
    <div className="contrats-page">
      {/* Header section */}
      <div className="contrats-page__header">
        <div className="contrats-page__title-section">
          <h1 className="text-2xl font-bold text-foreground">Contrats</h1>
          <p className="text-muted-foreground mt-1">
            Gérez vos contrats et baux
          </p>
        </div>

        <div className="contrats-page__actions flex items-center gap-2">
          {/* Refresh button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Actualiser</span>
          </Button>

          {/* Create button */}
          <Button
            onClick={() => router.push('/gestionnaire/contrats/nouveau')}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nouveau contrat</span>
            <span className="sm:hidden">Nouveau</span>
          </Button>
        </div>
      </div>

      {/* Stats summary (optional, can be expanded) */}
      {stats.totalActive > 0 && (
        <div className="contrats-page__stats grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 border border-border shadow-sm">
            <div className="text-2xl font-bold text-green-600">{stats.totalActive}</div>
            <div className="text-sm text-muted-foreground">Contrats actifs</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-border shadow-sm">
            <div className="text-2xl font-bold text-orange-600">{stats.expiringNext30Days}</div>
            <div className="text-sm text-muted-foreground">Expirent sous 30j</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-border shadow-sm">
            <div className="text-2xl font-bold text-primary">
              {stats.totalRentMonthly.toLocaleString('fr-FR')} €
            </div>
            <div className="text-sm text-muted-foreground">Loyers mensuels</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-border shadow-sm">
            <div className="text-2xl font-bold text-muted-foreground">
              {stats.averageRent.toLocaleString('fr-FR')} €
            </div>
            <div className="text-sm text-muted-foreground">Loyer moyen</div>
          </div>
        </div>
      )}

      {/* Main content - Navigator */}
      <ContractsNavigator
        contracts={contracts}
        loading={isRefreshing}
        onRefresh={handleRefresh}
        onDeleteContract={handleDeleteContract}
      />
    </div>
  )
}
