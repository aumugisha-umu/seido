"use client"

import { Plus } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ContractsNavigator } from "@/components/contracts/contracts-navigator"
import { useState, useEffect, useCallback, useRef } from "react"
import { logger } from '@/lib/logger'
import type { ContractWithRelations } from '@/lib/types/contract.types'

interface ContratsPageClientProps {
  initialContracts: ContractWithRelations[]
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
  teamId
}: ContratsPageClientProps) {
  const router = useRouter()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const previousDataHashRef = useRef<string>('')

  // State for contracts
  const [contracts, setContracts] = useState<ContractWithRelations[]>(
    Array.isArray(initialContracts) ? initialContracts : []
  )

  // Debug: Log initial data structure
  useEffect(() => {
    logger.info("📊 [CONTRATS-PAGE-CLIENT] Initial data received:", {
      contractsCount: Array.isArray(initialContracts) ? initialContracts.length : 0,
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

  // Handle delete callback
  const handleDeleteContract = useCallback(async (id: string) => {
    logger.info("🗑️ [CONTRATS-PAGE-CLIENT] Delete contract requested:", id)
    // The actual delete is handled by ContractsNavigator
    // After delete, refresh the page
    handleRefresh()
  }, [handleRefresh])

  return (
    <div className="h-full flex flex-col overflow-hidden layout-container">
      <div className="content-max-width flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* Page Header */}
        <div className="mb-4 lg:mb-6 flex-shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground sm:text-3xl mb-2">
                Contrats
              </h1>
              <p className="text-muted-foreground">
                Gérez vos contrats et baux
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                className="flex items-center space-x-2"
                onClick={() => router.push('/gestionnaire/contrats/nouveau')}
              >
                <Plus className="h-4 w-4" />
                <span>Nouveau contrat</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Card wrapper - Structure exacte du dashboard */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="bg-card rounded-lg border border-border shadow-sm flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Content wrapper avec padding */}
            <div className="flex-1 flex flex-col min-h-0 p-4">
              <ContractsNavigator
                contracts={contracts}
                loading={isRefreshing}
                onRefresh={handleRefresh}
                onDeleteContract={handleDeleteContract}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
