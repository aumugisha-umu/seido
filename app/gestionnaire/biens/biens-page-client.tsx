"use client"

import { Plus, RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import PropertySelector from "@/components/property-selector"
import { useState, useEffect, useCallback, useRef } from "react"
import { logger } from '@/lib/logger'

interface BiensPageClientProps {
  initialBuildings: any[]
  initialLots: any[]
  teamId: string | null
}

// ✅ Helper function to create a simple hash of data for change detection
// Defined outside component to avoid hook dependency issues
function createDataHash(buildings: any[], lots: any[], teamId: string | null): string {
  // Create a lightweight signature based on counts and IDs
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

  // ✅ Créer un data object compatible avec le format attendu par PropertySelector
  // Ensure arrays are always arrays (never undefined/null)
  const [buildingsData, setBuildingsData] = useState({
    buildings: Array.isArray(initialBuildings) ? initialBuildings : [],
    lots: Array.isArray(initialLots) ? initialLots : [],
    teamId: teamId
  })

  // ✅ Debug: Log initial data structure
  useEffect(() => {
    logger.info("📊 [BIENS-PAGE-CLIENT] Initial data received:", {
      buildingsCount: Array.isArray(initialBuildings) ? initialBuildings.length : 0,
      lotsCount: Array.isArray(initialLots) ? initialLots.length : 0,
      teamId: teamId,
      buildingsIsArray: Array.isArray(initialBuildings),
      lotsIsArray: Array.isArray(initialLots),
      buildingsDataStructure: {
        buildings: buildingsData.buildings.length,
        lots: buildingsData.lots.length,
        teamId: buildingsData.teamId
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only log on mount

  // ✅ Manual refresh function with loading state
  const handleRefresh = useCallback(async () => {
    logger.info("🔄 [BIENS-PAGE-CLIENT] Manual refresh triggered")
    setIsRefreshing(true)
    
    try {
      // Trigger router refresh to re-fetch server component data
      router.refresh()
      
      // Reset hash to force update when new data arrives
      previousDataHashRef.current = ''
      
      // Note: setIsRefreshing(false) will be called when new data arrives via useEffect
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
  }, []) // Only run on mount

  // ✅ Improved change detection using hash comparison
  useEffect(() => {
    const currentHash = createDataHash(initialBuildings, initialLots, teamId)
    const previousHash = previousDataHashRef.current

    // Only update if data actually changed
    if (currentHash !== previousHash) {
      logger.info("🔄 [BIENS-PAGE-CLIENT] Data changed, updating state", {
        previousHash: previousHash.substring(0, 20),
        currentHash: currentHash.substring(0, 20),
        buildingsCount: initialBuildings.length,
        lotsCount: initialLots.length
      })

      // Ensure arrays are always arrays
      const safeBuildings = Array.isArray(initialBuildings) ? initialBuildings : []
      const safeLots = Array.isArray(initialLots) ? initialLots : []
      
      setBuildingsData({
        buildings: safeBuildings,
        lots: safeLots,
        teamId: teamId
      })
      
      logger.info("✅ [BIENS-PAGE-CLIENT] Data updated in state:", {
        buildingsCount: safeBuildings.length,
        lotsCount: safeLots.length,
        teamId: teamId
      })
      previousDataHashRef.current = currentHash
      setIsRefreshing(false) // Clear refreshing state when new data arrives
    }
  }, [initialBuildings, initialLots, teamId])

  // ✅ Update last refresh time when data changes
  useEffect(() => {
    if (!isRefreshing && previousDataHashRef.current) {
      sessionStorage.setItem('biens-last-refresh', Date.now().toString())
    }
  }, [buildingsData, isRefreshing])

  // ✅ Stale-while-revalidate: Refresh on window focus (optional)
  useEffect(() => {
    const handleFocus = () => {
      // Only refresh if page has been inactive for more than 30 seconds
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
    <div className="layout-padding">
      {/* Page Header */}
      <div className="mb-6 lg:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl mb-2">
                Mon Patrimoine
              </h1>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                className="flex items-center space-x-2"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>{isRefreshing ? 'Actualisation...' : 'Actualiser'}</span>
              </Button>
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

        {/* ✅ PropertySelector with server data injected */}
        <PropertySelector
          mode="view"
          showActions={true}
          // Pass server data via a custom prop (we'll modify PropertySelector to support this)
          initialData={buildingsData}
        />
    </div>
  )
}
