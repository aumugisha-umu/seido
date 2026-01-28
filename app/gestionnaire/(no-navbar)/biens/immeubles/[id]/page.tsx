// Server Component - loads data server-side
import { notFound } from 'next/navigation'
import {
  createServerBuildingService,
  createServerLotService,
  createServerInterventionService,
  createServerContractService,
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

    // ✅ 2025-12-26: Get occupied lot IDs from ACTIVE CONTRACTS (not lot_contacts)
    // This ensures consistent occupation calculation across all pages
    const contractService = await createServerContractService()
    let occupiedLotIds = new Set<string>()
    try {
      const occupiedResult = await contractService.getOccupiedLotIdsByTeam(team.id)
      if (occupiedResult.success) {
        occupiedLotIds = occupiedResult.data
        logger.info('✅ [BUILDING-PAGE-SERVER] Occupied lots from contracts:', {
          occupiedCount: occupiedLotIds.size,
          elapsed: `${Date.now() - startTime}ms`
        })
      }
    } catch (error) {
      logger.warn('⚠️ [BUILDING-PAGE-SERVER] Could not get occupied lots from contracts')
    }

    // Apply occupation status from contracts to lots
    const lotsWithOccupation = lots.map((lot: any) => ({
      ...lot,
      is_occupied: occupiedLotIds.has(lot.id)
    }))

    // ✅ 2025-12-26: Load contracts for each lot to display tenants/guarantors
    logger.info('📍 [BUILDING-PAGE-SERVER] Step 2.5: Loading contracts for lots...')
    const lotsWithContracts = await Promise.all(
      lots.map(async (lot: any) => {
        try {
          const contractsResult = await contractService.getByLot(lot.id, { includeExpired: false })
          const contracts = contractsResult.success ? (contractsResult.data || []) : []
          // Only keep active or upcoming contracts
          const relevantContracts = contracts.filter((c: any) =>
            c.status === 'actif' || c.status === 'a_venir'
          )
          return {
            id: lot.id,
            reference: lot.reference,
            category: lot.category,
            floor: lot.floor || 0,
            door_number: lot.door_number || lot.apartment_number || '',
            lot_contacts: lot.lot_contacts || [],
            contracts: relevantContracts.map((contract: any) => ({
              id: contract.id,
              title: contract.title,
              status: contract.status,
              start_date: contract.start_date,
              end_date: contract.end_date,
              contacts: contract.contacts || []
            }))
          }
        } catch (error) {
          logger.warn(`⚠️ [BUILDING-PAGE-SERVER] Could not load contracts for lot ${lot.id}`)
          return {
            id: lot.id,
            reference: lot.reference,
            category: lot.category,
            floor: lot.floor || 0,
            door_number: lot.door_number || lot.apartment_number || '',
            lot_contacts: lot.lot_contacts || [],
            contracts: []
          }
        }
      })
    )
    const totalContractContacts = lotsWithContracts.reduce(
      (sum, lot) => sum + lot.contracts.reduce((s: number, c: any) => s + (c.contacts?.length || 0), 0),
      0
    )
    logger.info('✅ [BUILDING-PAGE-SERVER] Lots with contracts loaded', {
      lotsCount: lotsWithContracts.length,
      totalContractContacts,
      elapsed: `${Date.now() - startTime}ms`
    })

    // Generate lot contact IDs lookup map (like building contacts pattern)
    const lotContactIdsMap: Record<string, { lotId: string; lotContactId: string; lotReference: string }> = {}
    lotsWithContracts.forEach(lot => {
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

    // Step 6: Load address if building has address_id
    let buildingAddress: { latitude: number; longitude: number; formatted_address: string | null } | null = null
    if (building.address_id) {
      logger.info('📍 [BUILDING-PAGE-SERVER] Step 6: Loading building address...', {
        addressId: building.address_id
      })
      const { data: addressData } = await supabase
        .from('addresses')
        .select('latitude, longitude, formatted_address')
        .eq('id', building.address_id)
        .single()

      if (addressData && addressData.latitude && addressData.longitude) {
        buildingAddress = {
          latitude: addressData.latitude,
          longitude: addressData.longitude,
          formatted_address: addressData.formatted_address
        }
        logger.info('✅ [BUILDING-PAGE-SERVER] Building address loaded', {
          hasCoordinates: true,
          elapsed: `${Date.now() - startTime}ms`
        })
      }
    }

    logger.info('🎉 [BUILDING-PAGE-SERVER] All data loaded successfully', {
      buildingId: id,
      totalElapsed: `${Date.now() - startTime}ms`
    })

    // Pass data to Client Component
    // ✅ 2025-12-26: Use lotsWithOccupation for correct occupation status from contracts
    return (
      <BuildingDetailsClient
        building={building}
        lots={lotsWithOccupation}
        interventions={interventions}
        interventionsWithDocs={interventionsWithDocs}
        buildingContacts={buildingContacts}
        lotsWithContacts={lotsWithContracts}
        lotContactIdsMap={lotContactIdsMap}
        teamId={team.id}
        buildingAddress={buildingAddress}
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
