// Server Component - loads data server-side
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import {
  createServerBuildingService,
  createServerLotService,
  createServerInterventionService,
  createServerContractService,
  createServerSupabaseClient,
  createServerSupplierContractService
} from '@/lib/services'
import { getServerAuthContext } from '@/lib/server-context'
import BuildingDetailsClient from './building-details-client'
import { logger } from '@/lib/logger'
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

type PageProps = {
  params: Promise<{ id: string }>
}

/**
 * ✅ Dynamic SEO Metadata for Building Detail Page
 * - Title includes building name for better SEO
 * - Description includes address
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params

  try {
    const supabase = await createServerSupabaseClient()

    // Lightweight query just for metadata
    const { data: building } = await supabase
      .from('buildings')
      .select('name, address_record:address_id(city, formatted_address)')
      .eq('id', id)
      .single()

    if (!building) {
      return {
        title: 'Immeuble non trouvé | SEIDO',
        description: 'Cet immeuble n\'existe pas ou vous n\'avez pas les permissions nécessaires.'
      }
    }

    const address = building.address_record?.formatted_address || building.address_record?.city || ''
    const addressSuffix = address ? ` - ${address}` : ''

    return {
      title: `${building.name}${addressSuffix} | SEIDO`,
      description: `Détails de l'immeuble : ${building.name}. Gestion des lots, contacts et interventions.`
    }
  } catch {
    return {
      title: 'Immeuble | SEIDO',
      description: 'Détails de l\'immeuble'
    }
  }
}

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
    // Initialize all services in parallel (server-side)
    const [buildingService, lotService, interventionService, contractService, supplierContractService, supabase] = await Promise.all([
      createServerBuildingService(),
      createServerLotService(),
      createServerInterventionService(),
      createServerContractService(),
      createServerSupplierContractService(),
      createServerSupabaseClient()
    ])

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

    // ✅ 2026-02-27: Parallelize independent queries after building + lots are loaded
    // Group 1: occupiedLotIds, contracts, interventions, buildingContacts, address
    // These all depend on building/lots/team but NOT on each other
    const lotIds = lots.map((lot: any) => lot.id)

    logger.info('📍 [BUILDING-PAGE-SERVER] Step 3: Running parallel queries (contracts, interventions, contacts, address)...')

    const [
      occupiedResult,
      contractsResult,
      interventionsResult,
      buildingContactsResponse,
      addressResponse,
      buildingSupplierContracts,
      lotSupplierContracts
    ] = await Promise.all([
      // Occupied lot IDs from active contracts
      contractService.getOccupiedLotIdsByTeam(team.id).catch(() => {
        logger.warn('⚠️ [BUILDING-PAGE-SERVER] Could not get occupied lots from contracts')
        return { success: false as const, data: new Set<string>() }
      }),

      // Batch load contracts for ALL lots in 1 query (N+1 -> 1 query)
      contractService.getByLotIds(lotIds, { includeExpired: false }),

      // Fetch building-level AND lot-level interventions in 1 query
      // Uses .or(building_id.eq.X, lot_id.in.(Y)) to capture both XOR cases
      interventionService.getByBuildingWithLots(id, lotIds),

      // Building contacts
      supabase
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
        .order('is_primary', { ascending: false }),

      // Address data (only if building has address_id)
      building.address_id
        ? supabase
            .from('addresses')
            .select('latitude, longitude, formatted_address')
            .eq('id', building.address_id)
            .single()
        : Promise.resolve({ data: null }),

      // Supplier contracts: building-level
      supplierContractService.getByBuilding(id).catch(() => {
        logger.warn('[BUILDING-PAGE-SERVER] Could not load building supplier contracts')
        return [] as Awaited<ReturnType<typeof supplierContractService.getByBuilding>>
      }),

      // Supplier contracts: lot-level (batch for all lots)
      supplierContractService.getByLotIds(lotIds).catch(() => {
        logger.warn('[BUILDING-PAGE-SERVER] Could not load lot supplier contracts')
        return [] as Awaited<ReturnType<typeof supplierContractService.getByLotIds>>
      })
    ])

    logger.info('✅ [BUILDING-PAGE-SERVER] Parallel queries completed', {
      elapsed: `${Date.now() - startTime}ms`
    })

    // Process occupied lot IDs
    const occupiedLotIds = occupiedResult.success ? occupiedResult.data : new Set<string>()
    logger.info('✅ [BUILDING-PAGE-SERVER] Occupied lots from contracts:', {
      occupiedCount: occupiedLotIds.size,
      elapsed: `${Date.now() - startTime}ms`
    })

    // Apply occupation status from contracts to lots
    const lotsWithOccupation = lots.map((lot: any) => ({
      ...lot,
      is_occupied: occupiedLotIds.has(lot.id)
    }))

    // Process contracts result
    const allContracts = contractsResult.success ? (contractsResult.data || []) : []

    // Group contracts by lot_id using Map (O(n) client-side grouping)
    const contractsByLotId = new Map<string, any[]>()
    for (const contract of allContracts) {
      // Only keep active or upcoming contracts
      if (contract.status === 'actif' || contract.status === 'a_venir') {
        const existing = contractsByLotId.get(contract.lot_id) || []
        existing.push({
          id: contract.id,
          title: contract.title,
          status: contract.status,
          start_date: contract.start_date,
          end_date: contract.end_date,
          rent_amount: contract.rent_amount ?? null,
          charges_amount: contract.charges_amount ?? null,
          contacts: contract.contacts || []
        })
        contractsByLotId.set(contract.lot_id, existing)
      }
    }

    // Map back to lots with their contracts
    const lotsWithContracts = lots.map((lot: any) => ({
      id: lot.id,
      reference: lot.reference,
      category: lot.category,
      floor: lot.floor || 0,
      door_number: lot.door_number || lot.apartment_number || '',
      is_occupied: occupiedLotIds.has(lot.id),
      lot_contacts: lot.lot_contacts || [],
      contracts: contractsByLotId.get(lot.id) || []
    }))
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

    // Process interventions result
    const interventions: unknown[] = interventionsResult.success ? (interventionsResult.data || []) : []
    logger.info('✅ [BUILDING-PAGE-SERVER] Interventions batch loaded', {
      interventionCount: interventions.length,
      elapsed: `${Date.now() - startTime}ms`
    })

    // Group 2: Documents depend on interventions being loaded
    // Batch load documents for all interventions (1 query instead of N)
    logger.info('📍 [BUILDING-PAGE-SERVER] Step 4: Batch loading documents for all interventions...')
    const interventionIds = (interventions as { id: string }[]).map(i => i.id)
    const docsResult = await interventionService.getDocumentsByInterventionIds(interventionIds)
    const docsMap = docsResult.success ? docsResult.data : new Map()

    const interventionsWithDocs = (interventions as { id: string }[]).map(intervention => ({
      ...intervention,
      documents: docsMap.get(intervention.id) || []
    }))

    logger.info('✅ [BUILDING-PAGE-SERVER] Interventions with documents loaded (batch)', {
      count: interventionsWithDocs.length,
      docsTotal: docsResult.success ? Array.from(docsMap.values()).reduce((sum, docs) => sum + docs.length, 0) : 0,
      elapsed: `${Date.now() - startTime}ms`
    })

    // Process building contacts
    const buildingContacts = buildingContactsResponse.data || []
    logger.info('✅ [BUILDING-PAGE-SERVER] Building contacts loaded', {
      contactCount: buildingContacts.length,
      elapsed: `${Date.now() - startTime}ms`
    })

    // Process address data
    let buildingAddress: { latitude: number; longitude: number; formatted_address: string | null } | null = null
    const addressData = addressResponse.data
    if (addressData && 'latitude' in addressData && 'longitude' in addressData && addressData.latitude && addressData.longitude) {
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

    // Group lot-level supplier contracts by lot_id
    const lotSupplierContractsByLotId: Record<string, typeof lotSupplierContracts> = {}
    for (const sc of lotSupplierContracts) {
      if (!sc.lot_id) continue
      const key = sc.lot_id
      if (!lotSupplierContractsByLotId[key]) lotSupplierContractsByLotId[key] = []
      lotSupplierContractsByLotId[key].push(sc)
    }

    logger.info('🎉 [BUILDING-PAGE-SERVER] All data loaded successfully', {
      buildingId: id,
      buildingSupplierContracts: buildingSupplierContracts.length,
      lotSupplierContracts: lotSupplierContracts.length,
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
        buildingSupplierContracts={buildingSupplierContracts}
        lotSupplierContractsByLotId={lotSupplierContractsByLotId}
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
