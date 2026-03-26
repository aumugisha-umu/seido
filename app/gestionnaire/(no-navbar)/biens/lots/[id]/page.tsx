// Server Component - loads data server-side
import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import {
  createServerLotService,
  createServerInterventionService,
  createServerLotContactRepository,
  createServerBuildingRepository,
  createServerContractService,
  createServerSupabaseClient,
  createServerSupplierContractService,
  createServerReminderService
} from '@/lib/services'
import { getServerAuthContext } from '@/lib/server-context'
import { createSubscriptionService } from '@/lib/services/domain/subscription-helpers'
import { SubscriptionRepository } from '@/lib/services/repositories/subscription.repository'
import { createServiceRoleSupabaseClient } from '@/lib/services/core/supabase-client'
import LotDetailsClient from './lot-details-client'
import { logger } from '@/lib/logger'
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

type PageProps = {
  params: Promise<{ id: string }>
}

/**
 * ✅ Dynamic SEO Metadata for Lot Detail Page
 * - Title includes lot reference for better SEO
 * - Description includes building name and category
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params

  try {
    const supabase = await createServerSupabaseClient()

    // Lightweight query just for metadata
    const { data: lot } = await supabase
      .from('lots')
      .select('reference, category, building:building_id(name)')
      .eq('id', id)
      .single()

    if (!lot) {
      return {
        title: 'Lot non trouvé | SEIDO',
        description: 'Ce lot n\'existe pas ou vous n\'avez pas les permissions nécessaires.'
      }
    }

    const buildingName = lot.building?.name || ''
    const buildingSuffix = buildingName ? ` - ${buildingName}` : ''

    return {
      title: `${lot.reference}${buildingSuffix} | SEIDO`,
      description: `Détails du lot : ${lot.reference}. Catégorie : ${lot.category || 'Non spécifié'}. Gestion des contacts et interventions.`
    }
  } catch {
    return {
      title: 'Lot | SEIDO',
      description: 'Détails du lot'
    }
  }
}

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

  // ✅ AUTH + TEAM en 1 ligne (cached via React.cache())
  const { team, supabase } = await getServerAuthContext('gestionnaire')

  // ✅ Subscription restriction: block access to locked lots
  let isLotLocked = false
  try {
    const subscriptionService = createSubscriptionService(supabase)
    const serviceRoleRepo = new SubscriptionRepository(createServiceRoleSupabaseClient())
    const subscriptionInfo = await subscriptionService.getSubscriptionInfo(team.id, serviceRoleRepo)

    if (subscriptionInfo) {
      // Full blocked mode: redirect ALL detail pages when read_only
      if (subscriptionInfo.is_read_only) {
        isLotLocked = true
      } else {
        const accessibleLotIds = await subscriptionService.getAccessibleLotIds(team.id, subscriptionInfo, supabase)
        if (accessibleLotIds && !accessibleLotIds.includes(id)) {
          isLotLocked = true
        }
      }
    }
  } catch (error) {
    // Fail open: if subscription check fails, allow access
    logger.warn('[LOT-PAGE-SERVER] Subscription check failed, allowing access', { lotId: id, error })
  }

  if (isLotLocked) {
    logger.info('[LOT-PAGE-SERVER] Access blocked: lot is locked by subscription restriction', { lotId: id, teamId: team.id })
    redirect('/gestionnaire/biens')
  }

  logger.info('[LOT-PAGE-SERVER] Loading lot details', {
    lotId: id,
    timestamp: new Date().toISOString()
  })

  try {
    // Phase 1: Initialize all services in parallel
    const [lotService, interventionService, lotContactRepository, contractService, supplierContractService, reminderService] = await Promise.all([
      createServerLotService(),
      createServerInterventionService(),
      createServerLotContactRepository(),
      createServerContractService(),
      createServerSupplierContractService(),
      createServerReminderService()
    ])

    // Phase 2: Load lot data WITH relations (building, etc.) — needed before parallel queries
    logger.info('[LOT-PAGE-SERVER] Step 1: Loading lot with relations...', { lotId: id })
    const lotResult = await lotService.getByIdWithRelations(id)

    if (!lotResult.success || !lotResult.data) {
      logger.error('[LOT-PAGE-SERVER] Lot not found', {
        lotId: id,
        error: lotResult.error
      })
      notFound()
    }

    const lot = lotResult.data
    logger.info('[LOT-PAGE-SERVER] Lot loaded', {
      lotId: lot.id,
      lotReference: lot.reference,
      hasAddressId: !!(lot as any).address_id,
      hasAddressRecord: !!(lot as any).address_record,
      elapsed: `${Date.now() - startTime}ms`
    })

    // Phase 3: Run all independent queries in parallel
    // - Interventions, lot contacts, contracts, active tenants, building contacts
    // - Building contacts only fetched if lot has a building_id
    const buildingContactsPromise = lot.building_id
      ? createServerBuildingRepository()
          .then(repo => repo.findByIdWithRelations(lot.building_id!))
          .then(result => {
            if (result.success && result.data) {
              const buildingData = result.data as any
              const buildingContactsData = buildingData.building_contacts || []
              return buildingContactsData.map((bc: any) => ({
                id: bc.id,
                user_id: bc.user_id,
                building_id: bc.building_id,
                lot_id: null,
                type: bc.user?.role === 'locataire' ? 'tenant' :
                      bc.user?.role === 'prestataire' ? 'provider' :
                      bc.user?.role === 'gestionnaire' || bc.user?.role === 'admin' ? 'manager' : 'tenant',
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
            }
            return []
          })
          .catch((error) => {
            logger.warn('[LOT-PAGE-SERVER] Could not load building contacts', { error })
            return [] as any[]
          })
      : Promise.resolve([] as any[])

    const [
      interventionsResult,
      contactsResult,
      contractsResult,
      tenantsResult,
      buildingContacts,
      supplierContracts,
      reminders
    ] = await Promise.all([
      // Interventions (graceful handling)
      interventionService.getByLot(id)
        .then(result => {
          if (result.success) {
            logger.info('[LOT-PAGE-SERVER] Interventions loaded', {
              count: (result.data || []).length,
              elapsed: `${Date.now() - startTime}ms`
            })
            return { success: true as const, data: result.data || [] }
          }
          logger.info('[LOT-PAGE-SERVER] Interventions table not found, skipping')
          return { success: true as const, data: [] as unknown[] }
        })
        .catch(() => {
          logger.warn('[LOT-PAGE-SERVER] Could not load interventions')
          return { success: true as const, data: [] as unknown[] }
        }),

      // Lot contacts
      lotContactRepository.getAllContacts(id),

      // Contracts
      contractService.getByLot(id, { includeExpired: true })
        .then(result => {
          if (result.success && result.data) {
            logger.info('[LOT-PAGE-SERVER] Contracts loaded', {
              count: result.data.length,
              elapsed: `${Date.now() - startTime}ms`
            })
            return result.data
          }
          return [] as any[]
        })
        .catch((error) => {
          logger.warn('[LOT-PAGE-SERVER] Could not load contracts', { error })
          return [] as any[]
        }),

      // Active tenants check
      contractService.getActiveTenantsByLot(id)
        .then(result => {
          const hasTenant = result.success && result.data?.hasActiveTenants || false
          logger.info('[LOT-PAGE-SERVER] Lot occupation status (from contracts):', {
            status: hasTenant ? 'Occupied' : 'Vacant',
            activeTenantsCount: result.success ? result.data?.tenants.length : 0
          })
          return hasTenant
        })
        .catch((error) => {
          logger.warn('[LOT-PAGE-SERVER] Could not check active tenants, defaulting to vacant', { error })
          return false
        }),

      // Building contacts
      buildingContactsPromise,

      // Supplier contracts for this lot
      supplierContractService.getByLot(id).catch((error) => {
        logger.warn('[LOT-PAGE-SERVER] Could not load supplier contracts', { error })
        return [] as Awaited<ReturnType<typeof supplierContractService.getByLot>>
      }),

      // Reminders for this lot
      reminderService.getByLot(id, team.id).catch((error) => {
        logger.warn('[LOT-PAGE-SERVER] Could not load reminders', { error })
        return [] as Awaited<ReturnType<typeof reminderService.getByLot>>
      })
    ])

    // Check lot contacts result (critical — notFound if failed)
    if (!contactsResult.success) {
      logger.error('[LOT-PAGE-SERVER] Failed to load contacts', {
        lotId: id,
        error: contactsResult.error
      })
      notFound()
    }

    const interventions = interventionsResult.data
    const contracts = contractsResult
    const hasTenant = tenantsResult

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
      let contactType: 'tenant' | 'manager' | 'provider' = 'tenant'
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

    logger.info('[LOT-PAGE-SERVER] Contacts loaded', {
      contactCount: transformedContacts.length,
      buildingContactCount: buildingContacts.length,
      elapsed: `${Date.now() - startTime}ms`
    })

    // Phase 4: Batch load documents for all interventions (depends on intervention IDs)
    logger.info('[LOT-PAGE-SERVER] Step 4: Batch loading documents for all interventions...')
    let interventionsWithDocs: unknown[] = []
    try {
      const interventionIds = (interventions as { id: string }[]).map(i => i.id)
      const docsResult = await interventionService.getDocumentsByInterventionIds(interventionIds)
      const docsMap = docsResult.success ? docsResult.data : new Map()

      interventionsWithDocs = (interventions as { id: string }[]).map(intervention => ({
        ...intervention,
        documents: docsMap.get(intervention.id) || []
      }))

      logger.info('[LOT-PAGE-SERVER] Interventions with documents loaded (batch)', {
        count: interventionsWithDocs.length,
        docsTotal: docsResult.success ? Array.from(docsMap.values()).reduce((sum, docs) => sum + docs.length, 0) : 0,
        elapsed: `${Date.now() - startTime}ms`
      })
    } catch (error) {
      logger.warn('[LOT-PAGE-SERVER] Could not load intervention documents (batch)')
      interventionsWithDocs = (interventions as { id: string }[]).map(intervention => ({
        ...intervention,
        documents: []
      }))
    }

    // Phase 5: Load address (lot's own or fallback to building's)
    let lotAddress: { latitude: number | null; longitude: number | null; formatted_address: string | null } | null = null

    // First, try to use address_record from the lot (already fetched by repository via JOIN)
    const addressRecord = (lot as any).address_record
    if (addressRecord && (addressRecord.latitude || addressRecord.formatted_address || addressRecord.street)) {
      lotAddress = {
        latitude: addressRecord.latitude ?? null,
        longitude: addressRecord.longitude ?? null,
        formatted_address: addressRecord.formatted_address
      }
      logger.info('[LOT-PAGE-SERVER] Lot address loaded from address_record', {
        hasCoordinates: !!(addressRecord.latitude && addressRecord.longitude),
        elapsed: `${Date.now() - startTime}ms`
      })
    }
    // Fallback: If no address_record but address_id exists, query separately
    else if ((lot as any).address_id) {
      const { data: addressData } = await supabase
        .from('addresses')
        .select('latitude, longitude, formatted_address, street')
        .eq('id', (lot as any).address_id)
        .single()

      if (addressData && (addressData.latitude || addressData.formatted_address || addressData.street)) {
        lotAddress = {
          latitude: addressData.latitude ?? null,
          longitude: addressData.longitude ?? null,
          formatted_address: addressData.formatted_address
        }
        logger.info('[LOT-PAGE-SERVER] Lot address loaded via direct query', {
          hasCoordinates: !!(addressData.latitude && addressData.longitude),
          elapsed: `${Date.now() - startTime}ms`
        })
      }
    }

    // If lot has no address, try building's address (use pre-fetched building.address_record if available)
    if (!lotAddress && lot.building_id) {
      const buildingRecord = (lot as any).building
      const buildingAddressRecord = buildingRecord?.address_record

      if (buildingAddressRecord && (buildingAddressRecord.latitude || buildingAddressRecord.formatted_address || buildingAddressRecord.street)) {
        lotAddress = {
          latitude: buildingAddressRecord.latitude ?? null,
          longitude: buildingAddressRecord.longitude ?? null,
          formatted_address: buildingAddressRecord.formatted_address
        }
        logger.info('[LOT-PAGE-SERVER] Building address loaded from address_record', {
          hasCoordinates: !!(buildingAddressRecord.latitude && buildingAddressRecord.longitude),
          elapsed: `${Date.now() - startTime}ms`
        })
      } else {
        // Fallback: query building and address separately
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

          if (addressData && (addressData.latitude || addressData.formatted_address)) {
            lotAddress = {
              latitude: addressData.latitude ?? null,
              longitude: addressData.longitude ?? null,
              formatted_address: addressData.formatted_address
            }
            logger.info('[LOT-PAGE-SERVER] Building address loaded via direct query', {
              hasCoordinates: !!(addressData.latitude && addressData.longitude),
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
        supplierContracts={supplierContracts}
        reminders={reminders}
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
