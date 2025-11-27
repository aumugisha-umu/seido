"use client"

import { Plus } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { PatrimoineNavigator } from "@/components/patrimoine/patrimoine-navigator"
import { useState, useEffect, useCallback, useRef } from "react"
import { logger } from '@/lib/logger'

interface BiensPageClientProps {
  initialBuildings: any[]
  initialLots: any[]
  teamId: string | null
}

// ✅ Helper function to create a simple hash of data for change detection
function createDataHash(buildings: any[], lots: any[], teamId: string | null): string {
  const buildingIds = buildings.map(b => b.id).sort().join(',')
  const lotIds = lots.map(l => l.id).sort().join(',')
  const buildingCount = buildings.length
  const lotCount = lots.length
  return `${teamId}-${buildingCount}-${lotCount}-${buildingIds.substring(0, 50)}-${lotIds.substring(0, 50)}`
}

export function BiensPageClient({ initialBuildings, initialLots, teamId }: BiensPageClientProps) {
  const router = useRouter()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const previousDataHashRef = useRef<string>('')

  // ✅ State for buildings and lots
  const [buildings, setBuildings] = useState(Array.isArray(initialBuildings) ? initialBuildings : [])
  const [lots, setLots] = useState(Array.isArray(initialLots) ? initialLots : [])

  // ✅ Debug: Log initial data structure
  useEffect(() => {
    logger.info("📊 [BIENS-PAGE-CLIENT] Initial data received:", {
      buildingsCount: Array.isArray(initialBuildings) ? initialBuildings.length : 0,
      lotsCount: Array.isArray(initialLots) ? initialLots.length : 0,
      teamId: teamId,
      buildingsIsArray: Array.isArray(initialBuildings),
      lotsIsArray: Array.isArray(initialLots)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only log on mount

  // ✅ Manual refresh function with loading state
  const handleRefresh = useCallback(async () => {
    logger.info("🔄 [BIENS-PAGE-CLIENT] Manual refresh triggered")
    setIsRefreshing(true)

    try {
      router.refresh()
      previousDataHashRef.current = ''
    } catch (error) {
      logger.error("❌ [BIENS-PAGE-CLIENT] Error during refresh:", error)
      setIsRefreshing(false)
    }
  }, [router])

  // ✅ Initialize hash on mount
  useEffect(() => {
    const initialHash = createDataHash(initialBuildings, initialLots, teamId)
    previousDataHashRef.current = initialHash
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ✅ Improved change detection using hash comparison
  useEffect(() => {
    const currentHash = createDataHash(initialBuildings, initialLots, teamId)
    const previousHash = previousDataHashRef.current

    if (currentHash !== previousHash) {
      logger.info("🔄 [BIENS-PAGE-CLIENT] Data changed, updating state", {
        previousHash: previousHash.substring(0, 20),
        currentHash: currentHash.substring(0, 20),
        buildingsCount: initialBuildings.length,
        lotsCount: initialLots.length
      })

      const safeBuildings = Array.isArray(initialBuildings) ? initialBuildings : []
      const safeLots = Array.isArray(initialLots) ? initialLots : []

      setBuildings(safeBuildings)
      setLots(safeLots)

      logger.info("✅ [BIENS-PAGE-CLIENT] Data updated in state:", {
        buildingsCount: safeBuildings.length,
        lotsCount: safeLots.length,
        teamId: teamId
      })
      previousDataHashRef.current = currentHash
      setIsRefreshing(false)
    }
  }, [initialBuildings, initialLots, teamId])

  // ✅ Update last refresh time when data changes
  useEffect(() => {
    if (!isRefreshing && previousDataHashRef.current) {
      sessionStorage.setItem('biens-last-refresh', Date.now().toString())
    }
  }, [buildings, lots, isRefreshing])

  // ✅ Stale-while-revalidate: Refresh on window focus
  useEffect(() => {
    const handleFocus = () => {
      const lastRefresh = sessionStorage.getItem('biens-last-refresh')
      if (lastRefresh) {
        const timeSinceRefresh = Date.now() - parseInt(lastRefresh, 10)
        if (timeSinceRefresh > 30000) { // 30 seconds
          logger.info("🔄 [BIENS-PAGE-CLIENT] Window focused after inactivity, refreshing...")
          handleRefresh()
        }
      }
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [handleRefresh])

  return (
    <div className="h-full flex flex-col overflow-hidden layout-container">
      <div className="content-max-width flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* Page Header */}
        <div className="mb-4 lg:mb-6 flex-shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl mb-2">
                Patrimoine
              </h1>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                className="flex items-center space-x-2"
                onClick={() => router.push('/gestionnaire/biens/lots/nouveau')}
              >
                <Plus className="h-4 w-4" />
                <span>Lot</span>
              </Button>
              <Button
                className="flex items-center space-x-2"
                onClick={() => router.push('/gestionnaire/biens/immeubles/nouveau')}
              >
                <Plus className="h-4 w-4" />
                <span>Immeuble</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Card wrapper - Structure exacte du dashboard */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Content wrapper avec padding */}
            <div className="flex-1 flex flex-col min-h-0 p-4">
              <PatrimoineNavigator
                buildings={buildings}
                lots={lots}
                loading={isRefreshing}
                onRefresh={handleRefresh}
                className="bg-transparent border-0 shadow-none flex-1 flex flex-col min-h-0"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
