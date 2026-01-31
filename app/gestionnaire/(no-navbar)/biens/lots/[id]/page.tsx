// Server Component - loads data server-side
import { notFound } from 'next/navigation'
import {
  createServerLotService,
  createServerInterventionService,
  createServerLotContactRepository,
  createServerBuildingRepository,
  createServerContractService,
  createServerSupabaseClient
} from '@/lib/services'
import { getServerAuthContext } from '@/lib/server-context'
import LotDetailsClient from './lot-details-client'
import { logger } from '@/lib/logger'
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

// Loading skeleton while data is fetched
function LotDetailsLoading() {
  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border">
        <div className="content-max-width px-4 sm:px-6 lg:px-8 py-4">
          <Button variant="ghost" disabled className="flex items-center space-x-2">
            <ArrowLeft className="h-4 w-4" />
            <span>Retour</span>
          </Button>
        </div>
      </header>

      <div className="content-max-width px-4 sm:px-6 lg:px-8 py-4">
        <Skeleton className="h-8 w-32 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>

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

export default async function LotDetailsPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const startTime = Date.now()
  const { id } = await params

  // 🚨 SECURITY FIX: Cette page n'avait AUCUNE authentification!
  // ✅ AUTH + TEAM en 1 ligne (cached via React.cache())
  const { team } = await getServerAuthContext('gestionnaire')

  logger.info('🏠 [LOT-PAGE-SERVER] Loading lot details', {
    lotId: id,
    timestamp: new Date().toISOString()
  })

  try {
    // Initialize services (server-side)
    const lotService = await createServerLotService()
    const interventionService = await createServerInterventionService()
    const lotContactRepository = await createServerLotContactRepository()

    // Load lot data WITH relations (building, etc.)
    logger.info('📍 [LOT-PAGE-SERVER] Step 1: Loading lot with relations...', { lotId: id })
    const lotResult = await lotService.getByIdWithRelations(id)

    if (!lotResult.success || !lotResult.data) {
      logger.error('❌ [LOT-PAGE-SERVER] Lot not found', {
        lotId: id,
        error: lotResult.error
      })
      notFound()
    }

    const lot = lotResult.data
    logger.info('✅ [LOT-PAGE-SERVER] Lot loaded', {
      lotId: lot.id,
      lotReference: lot.reference,
      hasAddressId: !!(lot as any).address_id,
      hasAddressRecord: !!(lot as any).address_record,
      addressRecordData: (lot as any).address_record ? {
        id: (lot as any).address_record.id,
        latitude: (lot as any).address_record.latitude,
        longitude: (lot as any).address_record.longitude,
        formattedAddress: (lot as any).address_record.formatted_address
      } : null,
      elapsed: `${Date.now() - startTime}ms`
    })

    // Load interventions for this lot (graceful handling for Phase 3 table)
    let interventions: unknown[] = []
    try {
      logger.info('📍 [LOT-PAGE-SERVER] Step 2: Loading interventions...', { lotId: id })
      const interventionsResult = await interventionService.getByLot(id)

      if (interventionsResult.success) {
        interventions = interventionsResult.data || []
        logger.info('✅ [LOT-PAGE-SERVER] Interventions loaded', {
          interventionCount: interventions.length,
          elapsed: `${Date.now() - startTime}ms`
        })
      } else {
        logger.info('ℹ️ [LOT-PAGE-SERVER] Interventions table not found (Phase 3 not applied), skipping')
      }
    } catch (error) {
      logger.warn('⚠️ [LOT-PAGE-SERVER] Could not load interventions (Phase 3 not applied)')
      interventions = []
    }

    // Load lot contacts
    logger.info('📍 [LOT-PAGE-SERVER] Step 3: Loading contacts...', { lotId: id })
    const contactsResult = await lotContactRepository.getAllContacts(id)

    if (!contactsResult.success) {
      logger.error('❌ [LOT-PAGE-SERVER] Failed to load contacts', {
        lotId: id,
        error: contactsResult.error
      })
      notFound()
    }

    // Transform lot_contacts data to required format
    const transformedContacts = (contactsResult.data || []).map((lotContact: {
      id: string
      user_id: string
      lot_id: string
      created_at?: string
      updated_at?: string
      user?: {
        id: string
        name: string
        email: string
        phone?: string
        role?: string
        provider_category?: string
        is_active?: boolean
        company?: string
        address?: string
        speciality?: string
      }
    }) => {
      // Determine contact type based on user role
      const userRole = lotContact.user?.role
      let contactType: 'tenant' | 'owner' | 'manager' | 'provider' = 'tenant'
      if (userRole === 'locataire') contactType = 'tenant'
      else if (userRole === 'gestionnaire' || userRole === 'admin') contactType = 'manager'
      else if (userRole === 'prestataire') contactType = 'provider'

      return {
        id: lotContact.id,
        user_id: lotContact.user_id,
        lot_id: lotContact.lot_id,
        building_id: null,
        type: contactType,
        status: 'active' as const,
        created_at: lotContact.created_at || new Date().toISOString(),
        updated_at: lotContact.updated_at || new Date().toISOString(),
        user: {
          id: lotContact.user?.id || '',
          name: lotContact.user?.name || 'Unknown',
          email: lotContact.user?.email || '',
          phone: lotContact.user?.phone,
          role: lotContact.user?.role,
          provider_category: lotContact.user?.provider_category,
          is_active: lotContact.user?.is_active !== false,
          company: lotContact.user?.company,
          address: lotContact.user?.address,
          speciality: lotContact.user?.speciality
        }
      }
    })

    logger.info('✅ [LOT-PAGE-SERVER] Contacts loaded', {
      contactCount: transformedContacts.length,
      elapsed: `${Date.now() - startTime}ms`
    })

    // Load building contacts if lot has a building (for inheritance display)
    let buildingContacts: any[] = []
    if (lot.building_id) {
      logger.info('📍 [LOT-PAGE-SERVER] Step 3b: Loading building contacts...', { buildingId: lot.building_id })
      try {
        const buildingRepository = await createServerBuildingRepository()
        const buildingResult = await buildingRepository.findByIdWithRelations(lot.building_id)

        if (buildingResult.success && buildingResult.data) {
          const buildingData = buildingResult.data as any
          const buildingContactsData = buildingData.building_contacts || []

          buildingContacts = buildingContactsData.map((bc: any) => ({
            id: bc.id,
            user_id: bc.user_id,
            building_id: bc.building_id,
            lot_id: null,
            type: bc.user?.role === 'locataire' ? 'tenant' :
                  bc.user?.role === 'prestataire' ? 'provider' :
                  bc.user?.role === 'gestionnaire' || bc.user?.role === 'admin' ? 'manager' :
                  bc.user?.role === 'proprietaire' ? 'owner' : 'tenant',
            status: 'active' as const,
            created_at: bc.created_at || new Date().toISOString(),
            updated_at: bc.updated_at || new Date().toISOString(),
            user: {
              id: bc.user?.id || '',
              name: bc.user?.name || 'Unknown',
              email: bc.user?.email || '',
              phone: bc.user?.phone,
              role: bc.user?.role,
              provider_category: bc.user?.provider_category,
              is_active: bc.user?.is_active !== false,
              company: bc.user?.company,
              address: bc.user?.address,
              speciality: bc.user?.speciality
            }
          }))

          logger.info('✅ [LOT-PAGE-SERVER] Building contacts loaded', {
            buildingId: lot.building_id,
            contactCount: buildingContacts.length
          })
        }
      } catch (error) {
        logger.warn('⚠️ [LOT-PAGE-SERVER] Could not load building contacts', { error })
        buildingContacts = []
      }
    }

    // Load contracts for this lot
    logger.info('📍 [LOT-PAGE-SERVER] Step 3c: Loading contracts...', { lotId: id })
    let contracts: any[] = []
    const contractService = await createServerContractService()
    try {
      const contractsResult = await contractService.getByLot(id, { includeExpired: true })

      if (contractsResult.success && contractsResult.data) {
        contracts = contractsResult.data
        logger.info('✅ [LOT-PAGE-SERVER] Contracts loaded', {
          contractCount: contracts.length,
          elapsed: `${Date.now() - startTime}ms`
        })
      }
    } catch (error) {
      logger.warn('⚠️ [LOT-PAGE-SERVER] Could not load contracts', { error })
      contracts = []
    }

    // Calculate occupation from ACTIVE CONTRACTS (not lot_contacts)
    // Only contracts with status='actif' count (not 'a_venir')
    let hasTenant = false
    try {
      const tenantsResult = await contractService.getActiveTenantsByLot(id)
      hasTenant = tenantsResult.success && tenantsResult.data?.hasActiveTenants || false
      logger.info('🏠 [LOT-PAGE-SERVER] Lot occupation status (from contracts):', {
        status: hasTenant ? "Occupied" : "Vacant",
        activeTenantsCount: tenantsResult.success ? tenantsResult.data?.tenants.length : 0
      })
    } catch (error) {
      logger.warn('⚠️ [LOT-PAGE-SERVER] Could not check active tenants, defaulting to vacant', { error })
      hasTenant = false
    }

    // Load interventions with documents (for documents tab)
    logger.info('📍 [LOT-PAGE-SERVER] Step 4: Loading interventions with documents...')
    let interventionsWithDocs: unknown[] = []
    try {
      const lotInterventionsResult = await interventionService.getByLot(id)

      if (lotInterventionsResult.success && lotInterventionsResult.data) {
        const interventionsWithDocsData = await Promise.all(
          lotInterventionsResult.data.map(async (intervention: { id: string }) => {
            try {
              const docsResult = await interventionService.getDocuments(intervention.id)
              return {
                ...intervention,
                documents: docsResult.success ? docsResult.data : []
              }
            } catch (error) {
              logger.warn(`⚠️ [LOT-PAGE-SERVER] Could not load documents for intervention ${intervention.id}`)
              return {
                ...intervention,
                documents: []
              }
            }
          })
        )

        interventionsWithDocs = interventionsWithDocsData
        logger.info('✅ [LOT-PAGE-SERVER] Interventions with documents loaded', {
          count: interventionsWithDocs.length,
          elapsed: `${Date.now() - startTime}ms`
        })
      }
    } catch (error) {
      logger.warn('⚠️ [LOT-PAGE-SERVER] Could not load interventions with documents (Phase 3 not applied)')
      interventionsWithDocs = []
    }

    // Step 5: Load address (lot's own or fallback to building's)
    let lotAddress: { latitude: number; longitude: number; formatted_address: string | null } | null = null
    const supabase = await createServerSupabaseClient()

    // First, try to use address_record from the lot (already fetched by repository via JOIN)
    const addressRecord = (lot as any).address_record
    if (addressRecord && addressRecord.latitude && addressRecord.longitude) {
      logger.info('📍 [LOT-PAGE-SERVER] Step 5: Using address_record from lot...', {
        addressId: addressRecord.id,
        hasCoordinates: true
      })
      lotAddress = {
        latitude: addressRecord.latitude,
        longitude: addressRecord.longitude,
        formatted_address: addressRecord.formatted_address
      }
      logger.info('✅ [LOT-PAGE-SERVER] Lot address loaded from address_record', {
        hasCoordinates: true,
        elapsed: `${Date.now() - startTime}ms`
      })
    }
    // Fallback: If no address_record but address_id exists, query separately
    else if ((lot as any).address_id) {
      logger.info('📍 [LOT-PAGE-SERVER] Step 5: Loading lot address via address_id (fallback)...', {
        addressId: (lot as any).address_id
      })
      const { data: addressData } = await supabase
        .from('addresses')
        .select('latitude, longitude, formatted_address')
        .eq('id', (lot as any).address_id)
        .single()

      if (addressData && addressData.latitude && addressData.longitude) {
        lotAddress = {
          latitude: addressData.latitude,
          longitude: addressData.longitude,
          formatted_address: addressData.formatted_address
        }
        logger.info('✅ [LOT-PAGE-SERVER] Lot address loaded via direct query', {
          hasCoordinates: true,
          elapsed: `${Date.now() - startTime}ms`
        })
      }
    }

    // If lot has no address, try building's address (use pre-fetched building.address_record if available)
    if (!lotAddress && lot.building_id) {
      // First, try to use building.address_record from the lot (already fetched by repository via JOIN)
      const buildingRecord = (lot as any).building
      const buildingAddressRecord = buildingRecord?.address_record

      if (buildingAddressRecord && buildingAddressRecord.latitude && buildingAddressRecord.longitude) {
        logger.info('📍 [LOT-PAGE-SERVER] Step 5b: Using building.address_record from lot...', {
          buildingId: lot.building_id,
          addressId: buildingAddressRecord.id
        })
        lotAddress = {
          latitude: buildingAddressRecord.latitude,
          longitude: buildingAddressRecord.longitude,
          formatted_address: buildingAddressRecord.formatted_address
        }
        logger.info('✅ [LOT-PAGE-SERVER] Building address loaded from address_record', {
          hasCoordinates: true,
          elapsed: `${Date.now() - startTime}ms`
        })
      } else {
        // Fallback: query building and address separately
        logger.info('📍 [LOT-PAGE-SERVER] Step 5b: Loading building address (fallback query)...', {
          buildingId: lot.building_id
        })
        const { data: buildingData } = await supabase
          .from('buildings')
          .select('address_id')
          .eq('id', lot.building_id)
          .single()

        if (buildingData?.address_id) {
          const { data: addressData } = await supabase
            .from('addresses')
            .select('latitude, longitude, formatted_address')
            .eq('id', buildingData.address_id)
            .single()

          if (addressData && addressData.latitude && addressData.longitude) {
            lotAddress = {
              latitude: addressData.latitude,
              longitude: addressData.longitude,
              formatted_address: addressData.formatted_address
            }
            logger.info('✅ [LOT-PAGE-SERVER] Building address loaded via direct query', {
              hasCoordinates: true,
              elapsed: `${Date.now() - startTime}ms`
            })
          }
        }
      }
    }

    logger.info('🎉 [LOT-PAGE-SERVER] All data loaded successfully', {
      lotId: id,
      hasAddress: !!lotAddress,
      totalElapsed: `${Date.now() - startTime}ms`
    })

    // Pass data to Client Component
    return (
      <LotDetailsClient
        lot={lot}
        interventions={interventions}
        contacts={transformedContacts}
        buildingContacts={buildingContacts}
        interventionsWithDocs={interventionsWithDocs}
        contracts={contracts}
        isOccupied={hasTenant}
        teamId={team.id}
        lotAddress={lotAddress}
      />
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error('❌ [LOT-PAGE-SERVER] Failed to load lot data', {
      lotId: id,
      error: errorMessage,
      elapsed: `${Date.now() - startTime}ms`
    })

    // In production, you might want to show a proper error page
    notFound()
  }
}

// Optional: Add loading.tsx for Suspense boundary
export function Loading() {
  return <LotDetailsLoading />
}
