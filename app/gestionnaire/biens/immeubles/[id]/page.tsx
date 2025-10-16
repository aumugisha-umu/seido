// Server Component - loads data server-side
import { notFound } from 'next/navigation'
import {
  createServerBuildingService,
  createServerLotService,
  createServerInterventionService
} from '@/lib/services'
import BuildingDetailsClient from './building-details-client'
import { logger } from '@/lib/logger'
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

// Loading skeleton while data is fetched
function BuildingDetailsLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Skeleton className="h-8 w-64" />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent className="space-y-4">
                {[1, 2, 3, 4].map((j) => (
                  <div key={j} className="flex justify-between">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  )
}

export default async function BuildingDetailsPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const startTime = Date.now()
  const { id } = await params

  logger.info('🏗️ [BUILDING-PAGE-SERVER] Loading building details', {
    buildingId: id,
    timestamp: new Date().toISOString()
  })

  try {
    // Initialize services (server-side)
    const buildingService = await createServerBuildingService()
    const lotService = await createServerLotService()
    const interventionService = await createServerInterventionService()

    // Load building data
    logger.info('📍 [BUILDING-PAGE-SERVER] Step 1: Loading building...', { buildingId: id })
    const buildingResult = await buildingService.getById(id)

    if (!buildingResult.success || !buildingResult.data) {
      logger.error('❌ [BUILDING-PAGE-SERVER] Building not found', {
        buildingId: id,
        error: buildingResult.error
      })
      notFound()
    }

    const building = buildingResult.data
    logger.info('✅ [BUILDING-PAGE-SERVER] Building loaded', {
      buildingId: building.id,
      buildingName: building.name,
      elapsed: `${Date.now() - startTime}ms`
    })

    // Load lots for this building
    logger.info('📍 [BUILDING-PAGE-SERVER] Step 2: Loading lots...', { buildingId: id })
    const lotsResult = await lotService.getByBuilding(id)

    const lots = lotsResult.success ? (lotsResult.data || []) : []
    logger.info('✅ [BUILDING-PAGE-SERVER] Lots loaded', {
      lotCount: lots.length,
      elapsed: `${Date.now() - startTime}ms`
    })

    // Load interventions for all lots (parallel)
    let interventions: unknown[] = []
    if (lots.length > 0) {
      logger.info('📍 [BUILDING-PAGE-SERVER] Step 3: Loading interventions...', {
        lotCount: lots.length
      })

      const lotIds = lots.map(lot => lot.id)
      const interventionResults = await Promise.allSettled(
        lotIds.map(lotId => interventionService.getByLot(lotId))
      )

      interventions = interventionResults
        .filter((result): result is PromiseFulfilledResult<{ success: boolean; data?: unknown[] }> =>
          result.status === 'fulfilled' && result.value.success && !!result.value.data
        )
        .flatMap(result => result.value.data || [])

      logger.info('✅ [BUILDING-PAGE-SERVER] Interventions loaded', {
        interventionCount: interventions.length,
        elapsed: `${Date.now() - startTime}ms`
      })
    }

    // Load interventions with documents (for documents tab)
    logger.info('📍 [BUILDING-PAGE-SERVER] Step 4: Loading interventions with documents...')
    const buildingInterventionsResult = await interventionService.getByBuilding(id)

    let interventionsWithDocs: unknown[] = []
    if (buildingInterventionsResult.success && buildingInterventionsResult.data) {
      const interventionsWithDocsData = await Promise.all(
        buildingInterventionsResult.data.map(async (intervention: { id: string }) => {
          try {
            const docsResult = await interventionService.getDocuments(intervention.id)
            return {
              ...intervention,
              documents: docsResult.success ? docsResult.data : []
            }
          } catch (error) {
            logger.warn(`⚠️ [BUILDING-PAGE-SERVER] Could not load documents for intervention ${intervention.id}`)
            return {
              ...intervention,
              documents: []
            }
          }
        })
      )

      interventionsWithDocs = interventionsWithDocsData
      logger.info('✅ [BUILDING-PAGE-SERVER] Interventions with documents loaded', {
        count: interventionsWithDocs.length,
        elapsed: `${Date.now() - startTime}ms`
      })
    }

    logger.info('🎉 [BUILDING-PAGE-SERVER] All data loaded successfully', {
      buildingId: id,
      totalElapsed: `${Date.now() - startTime}ms`
    })

    // Pass data to Client Component
    return (
      <BuildingDetailsClient
        building={building}
        lots={lots}
        interventions={interventions}
        interventionsWithDocs={interventionsWithDocs}
      />
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error('❌ [BUILDING-PAGE-SERVER] Failed to load building data', {
      buildingId: id,
      error: errorMessage,
      elapsed: `${Date.now() - startTime}ms`
    })

    // In production, you might want to show a proper error page
    notFound()
  }
}

// Optional: Add loading.tsx for Suspense boundary
// This would show while the page is loading
export function Loading() {
  return <BuildingDetailsLoading />
}
