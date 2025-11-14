// Server Component - loads data server-side
import { notFound } from 'next/navigation'
import {
  createServerLotService,
  createServerInterventionService,
  createServerLotContactRepository,
  createServerBuildingRepository
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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
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

    // Calculate occupation from lot_contacts
    const hasTenant = transformedContacts.some((contact: { user: { role?: string } }) =>
      contact.user?.role === 'locataire'
    )
    logger.info('🏠 [LOT-PAGE-SERVER] Lot occupation status:', hasTenant ? "Occupied" : "Vacant")

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

    logger.info('🎉 [LOT-PAGE-SERVER] All data loaded successfully', {
      lotId: id,
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
        isOccupied={hasTenant}
        teamId={team.id}
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
