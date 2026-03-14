// Server Component — Locataire lot details (scoped: contracts, interventions, documents)
import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import {
  createServerLotService,
  createServerInterventionService,
  createServerContractService,
  createServerSupabaseClient
} from '@/lib/services'
import { getServerAuthContext } from '@/lib/server-context'
import { isTeamSubscriptionBlocked } from '@/lib/subscription-guard'
import LotDetailsClient from '@/app/gestionnaire/(no-navbar)/biens/lots/[id]/lot-details-client'
import { logger } from '@/lib/logger'

type PageProps = {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params

  try {
    const supabase = await createServerSupabaseClient()
    const { data: lot } = await supabase
      .from('lots')
      .select('reference, category, building:building_id(name)')
      .eq('id', id)
      .single()

    if (!lot) {
      return { title: 'Lot non trouvé | SEIDO' }
    }

    const buildingName = lot.building?.name || ''
    const buildingSuffix = buildingName ? ` - ${buildingName}` : ''

    return {
      title: `${lot.reference}${buildingSuffix} | Mon logement | SEIDO`,
      description: `Détails de votre logement ${lot.reference}. Contrats, interventions et documents.`
    }
  } catch {
    return { title: 'Mon logement | SEIDO' }
  }
}

export default async function LocataireLotDetailsPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const startTime = Date.now()
  const { id } = await params

  // Auth: locataire role required
  // profile.id = DB user PK (used in contract_contacts.user_id)
  // user.id = Supabase Auth UUID (different!)
  const { profile, team, supabase } = await getServerAuthContext('locataire')

  // Block access if team subscription is blocked
  if (await isTeamSubscriptionBlocked(profile.team_id)) {
    redirect('/locataire/dashboard')
  }

  // Verify locataire has access to this lot via contract_contacts
  const { data: accessCheck } = await supabase
    .from('contract_contacts')
    .select('id, contracts!inner(lot_id)')
    .eq('user_id', profile.id)
    .eq('contracts.lot_id', id)
    .limit(1)

  if (!accessCheck || accessCheck.length === 0) {
    logger.warn('[LOCATAIRE-LOT] Access denied — no contract_contacts link', {
      userId: profile.id,
      lotId: id
    })
    redirect('/locataire/dashboard')
  }

  logger.info('[LOCATAIRE-LOT] Loading lot details', { lotId: id, userId: profile.id })

  try {
    // Phase 1: Initialize services in parallel
    const [lotService, interventionService, contractService] = await Promise.all([
      createServerLotService(),
      createServerInterventionService(),
      createServerContractService()
    ])

    // Phase 2: Load lot with relations (needed before doc query)
    const lotResult = await lotService.getByIdWithRelations(id)

    if (!lotResult.success || !lotResult.data) {
      logger.error('[LOCATAIRE-LOT] Lot not found', { lotId: id })
      notFound()
    }

    const lot = lotResult.data

    // Phase 3: Parallel queries — contracts, tenant-scoped interventions
    const [contractsResult, allTenantInterventions] = await Promise.all([
      contractService.getByLot(id, { includeExpired: true })
        .then(result => result.success && result.data ? result.data : [])
        .catch(() => [] as any[]),

      // Fetch only interventions assigned to this locataire, then filter by lot
      interventionService.getMyInterventions(profile.id, 'locataire', team.id)
        .then(result => result.success ? result.data || [] : [])
        .catch(() => [] as unknown[])
    ])

    // Filter to only interventions on this specific lot
    const interventionsResult = (allTenantInterventions as any[]).filter(
      (i: any) => i.lot_id === id || i.lot?.id === id
    )

    // Phase 4: Batch load intervention documents
    let interventionsWithDocs: unknown[] = []
    try {
      const interventionIds = (interventionsResult as { id: string }[]).map(i => i.id)
      const docsResult = await interventionService.getDocumentsByInterventionIds(interventionIds)
      const docsMap = docsResult.success ? docsResult.data : new Map()

      interventionsWithDocs = (interventionsResult as { id: string }[]).map(intervention => ({
        ...intervention,
        documents: docsMap.get(intervention.id) || []
      }))
    } catch {
      interventionsWithDocs = (interventionsResult as { id: string }[]).map(intervention => ({
        ...intervention,
        documents: []
      }))
    }

    // Phase 5: Resolve address (lot or building fallback)
    let lotAddress: { latitude: number | null; longitude: number | null; formatted_address: string | null } | null = null
    const addressRecord = (lot as any).address_record
    if (addressRecord && (addressRecord.latitude || addressRecord.formatted_address || addressRecord.street)) {
      lotAddress = {
        latitude: addressRecord.latitude ?? null,
        longitude: addressRecord.longitude ?? null,
        formatted_address: addressRecord.formatted_address
      }
    } else if (lot.building_id) {
      const buildingRecord = (lot as any).building
      const buildingAddr = buildingRecord?.address_record
      if (buildingAddr && (buildingAddr.latitude || buildingAddr.formatted_address || buildingAddr.street)) {
        lotAddress = {
          latitude: buildingAddr.latitude ?? null,
          longitude: buildingAddr.longitude ?? null,
          formatted_address: buildingAddr.formatted_address
        }
      }
    }

    logger.info('[LOCATAIRE-LOT] All data loaded', {
      lotId: id,
      contracts: contractsResult.length,
      interventions: (interventionsResult as unknown[]).length,
      elapsed: `${Date.now() - startTime}ms`
    })

    return (
      <LotDetailsClient
        lot={lot}
        interventions={interventionsResult as any}
        interventionsWithDocs={interventionsWithDocs as any}
        contracts={contractsResult}
        isOccupied={true}
        teamId={team.id}
        lotAddress={lotAddress}
        role="locataire"
      />
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error('[LOCATAIRE-LOT] Failed to load', { lotId: id, error: errorMessage })
    notFound()
  }
}
