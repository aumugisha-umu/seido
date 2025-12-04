// Server Component - loads data server-side
import { notFound } from 'next/navigation'
import {
  createServerBuildingService,
  createServerLotService,
  createServerInterventionService,
  createServerSupabaseClient
} from '@/lib/services'
import { getServerAuthContext } from '@/lib/server-context'
import BuildingDetailsClient from './building-details-client'
import { logger } from '@/lib/logger'
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

// Loading skeleton while data is fetched
function BuildingDetailsLoading() {
  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border">
        <div className="content-max-width px-4 sm:px-6 lg:px-8 py-4">
          <Skeleton className="h-8 w-64" />
        </div>
      </header>

      <main className="content-max-width px-4 sm:px-6 lg:px-8 py-8">
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

  // 🚨 SECURITY FIX: Cette page n'avait AUCUNE authentification!
  // ✅ AUTH + TEAM en 1 ligne (cached via React.cache())
  const { team } = await getServerAuthContext('gestionnaire')

  logger.info('🏗️ [BUILDING-PAGE-SERVER] Loading building details', {
    buildingId: id,
    timestamp: new Date().toISOString()
  })

  try {
    // Initialize services (server-side)
    const buildingService = await createServerBuildingService()
    const lotService = await createServerLotService()
    const interventionService = await createServerInterventionService()
    const supabase = await createServerSupabaseClient()

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

    // Transform lots to include contacts (Step 2 already loads lot_contacts relation)
    const lotsWithContacts = lots.map((lot: any) => ({
      id: lot.id,
      reference: lot.reference,
      category: lot.category,
      floor: lot.floor || 0,
      door_number: lot.door_number || lot.apartment_number || '',
      lot_contacts: lot.lot_contacts || []
    }))
    logger.info('✅ [BUILDING-PAGE-SERVER] Lots with contacts transformed', {
      lotsWithContactsCount: lotsWithContacts.length,
      elapsed: `${Date.now() - startTime}ms`
    })

    // Generate lot contact IDs lookup map (like building contacts pattern)
    const lotContactIdsMap: Record<string, { lotId: string; lotContactId: string; lotReference: string }> = {}
    lotsWithContacts.forEach(lot => {
      lot.lot_contacts.forEach((lc: any) => {
        if (lc.user?.id) {
          lotContactIdsMap[lc.user.id] = {
            lotId: lot.id,
            lotContactId: lc.id,
            lotReference: lot.reference
          }
        }
      })
    })
    logger.info('✅ [BUILDING-PAGE-SERVER] Lot contact IDs map generated', {
      totalMappings: Object.keys(lotContactIdsMap).length,
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

    // Load building contacts
    logger.info('📍 [BUILDING-PAGE-SERVER] Step 5: Loading building contacts...')
    const { data: buildingContactsData } = await supabase
      .from('building_contacts')
      .select(`
        id,
        user_id,
        is_primary,
        user:user_id(
          id,
          name,
          email,
          phone,
          role,
          provider_category,
          speciality
        )
      `)
      .eq('building_id', id)
      .order('is_primary', { ascending: false })

    const buildingContacts = buildingContactsData || []
    logger.info('✅ [BUILDING-PAGE-SERVER] Building contacts loaded', {
      contactCount: buildingContacts.length,
      elapsed: `${Date.now() - startTime}ms`
    })

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
        buildingContacts={buildingContacts}
        lotsWithContacts={lotsWithContacts}
        lotContactIdsMap={lotContactIdsMap}
        teamId={team.id}
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
