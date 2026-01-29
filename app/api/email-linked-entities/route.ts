import { NextResponse } from 'next/server'
import { getApiAuthContext } from '@/lib/api-auth-helper'
import { createServerSupabaseClient } from '@/lib/services'
import { logger } from '@/lib/logger'

/**
 * GET /api/email-linked-entities
 * Returns all entities linked to at least 1 email for the team.
 *
 * OPTIMIZATION (2026-01-22):
 * - Uses RPC function `get_distinct_linked_entities` instead of JavaScript deduplication
 * - Parallelizes entity detail fetches with Promise.all
 * - Reduces response time from 24s+ (timeout) to <1s
 */
export async function GET() {
  const startTime = Date.now()

  try {
    const authResult = await getApiAuthContext()
    if (!authResult.success) return authResult.error

    const { userProfile } = authResult.data

    if (!userProfile.team_id) {
      return NextResponse.json({ success: false, error: 'No team' }, { status: 403 })
    }

    const supabase = await createServerSupabaseClient()

    // 1. Try RPC function first, fallback to direct query if not exists
    let linkedData: Array<{ entity_type: string; entity_id: string; email_count: number }> | null = null

    const { data: rpcData, error: rpcError } = await supabase
      .rpc('get_distinct_linked_entities', { p_team_id: userProfile.team_id })

    if (rpcError) {
      // RPC function might not exist yet (migration not applied)
      // Fallback to direct query
      logger.warn({ error: rpcError.message }, '⚠️ [EMAIL-LINKED-ENTITIES] RPC failed, using fallback query')

      const { data: fallbackData, error: fallbackError } = await supabase
        .from('email_links')
        .select('entity_type, entity_id')
        .eq('team_id', userProfile.team_id)

      if (fallbackError) {
        logger.error({ error: fallbackError }, '❌ [EMAIL-LINKED-ENTITIES] Fallback query error')
        return NextResponse.json({ success: false, error: 'Error fetching links' }, { status: 500 })
      }

      // Deduplicate and count in JavaScript (slower but works without migration)
      const countMap = new Map<string, { entity_type: string; entity_id: string; email_count: number }>()
      fallbackData?.forEach((row) => {
        const key = `${row.entity_type}:${row.entity_id}`
        const existing = countMap.get(key)
        if (existing) {
          existing.email_count++
        } else {
          countMap.set(key, { entity_type: row.entity_type, entity_id: row.entity_id, email_count: 1 })
        }
      })
      linkedData = Array.from(countMap.values())
    } else {
      linkedData = rpcData
    }

    // 2. Group by type and collect entity IDs with counts
    const countsByType: Record<string, Map<string, number>> = {
      building: new Map(),
      lot: new Map(),
      contact: new Map(),
      contract: new Map(),
      intervention: new Map(),
      company: new Map()
    }

    linkedData?.forEach((row: { entity_type: string; entity_id: string; email_count: number }) => {
      const typeMap = countsByType[row.entity_type]
      if (typeMap) {
        typeMap.set(row.entity_id, row.email_count)
      }
    })

    // 3. Prepare entity fetch promises (parallel execution)
    const entities: {
      buildings: Array<{ id: string; name: string; address?: string; emailCount: number }>
      lots: Array<{ id: string; name: string; building_name?: string; emailCount: number }>
      contacts: Array<{ id: string; name: string; email?: string; emailCount: number }>
      contracts: Array<{ id: string; name: string; reference?: string; emailCount: number }>
      interventions: Array<{ id: string; name: string; reference?: string; emailCount: number }>
      companies: Array<{ id: string; name: string; emailCount: number }>
    } = {
      buildings: [],
      lots: [],
      contacts: [],
      contracts: [],
      interventions: [],
      companies: []
    }

    // 4. Fetch all entity details in parallel
    const fetchPromises: Promise<void>[] = []

    // Buildings (address is now in addresses table via address_id)
    const buildingIds = Array.from(countsByType.building.keys())
    if (buildingIds.length > 0) {
      fetchPromises.push(
        supabase
          .from('buildings')
          .select('id, name, address_record:address_id(street, city, postal_code)')
          .in('id', buildingIds)
          .then(({ data: buildings }) => {
            entities.buildings = (buildings || []).map((b: any) => {
              // Construire l'adresse depuis la relation address_record
              const addressRecord = b.address_record
              const address = addressRecord
                ? `${addressRecord.street || ''}, ${addressRecord.postal_code || ''} ${addressRecord.city || ''}`.trim().replace(/^,\s*/, '')
                : undefined
              return {
                id: b.id,
                name: b.name,
                address: address || undefined,
                emailCount: countsByType.building.get(b.id) || 0
              }
            })
          })
      )
    }

    // Lots
    const lotIds = Array.from(countsByType.lot.keys())
    if (lotIds.length > 0) {
      fetchPromises.push(
        supabase
          .from('lots')
          .select('id, reference, building:buildings(name)')
          .in('id', lotIds)
          .then(({ data: lots }) => {
            entities.lots = (lots || []).map(l => ({
              id: l.id,
              name: l.reference || `Lot ${l.id.slice(0, 8)}`,
              building_name: (l.building as any)?.name,
              emailCount: countsByType.lot.get(l.id) || 0
            }))
          })
      )
    }

    // Contacts (from users table)
    const contactIds = Array.from(countsByType.contact.keys())
    if (contactIds.length > 0) {
      fetchPromises.push(
        supabase
          .from('users')
          .select('id, name, email')
          .in('id', contactIds)
          .then(({ data: contacts }) => {
            entities.contacts = (contacts || []).map(c => ({
              id: c.id,
              name: c.name || 'Contact',
              email: c.email || undefined,
              emailCount: countsByType.contact.get(c.id) || 0
            }))
          })
      )
    }

    // Contracts
    const contractIds = Array.from(countsByType.contract.keys())
    if (contractIds.length > 0) {
      fetchPromises.push(
        supabase
          .from('contracts')
          .select('id, title, contract_type')
          .in('id', contractIds)
          .then(({ data: contracts }) => {
            entities.contracts = (contracts || []).map(c => ({
              id: c.id,
              name: c.title || `Contrat ${c.contract_type || 'N/A'}`,
              reference: c.contract_type || undefined,
              emailCount: countsByType.contract.get(c.id) || 0
            }))
          })
      )
    }

    // Interventions
    const interventionIds = Array.from(countsByType.intervention.keys())
    if (interventionIds.length > 0) {
      fetchPromises.push(
        supabase
          .from('interventions')
          .select('id, title, reference')
          .in('id', interventionIds)
          .then(({ data: interventions }) => {
            entities.interventions = (interventions || []).map(i => ({
              id: i.id,
              name: i.title || `Intervention ${i.reference || i.id.slice(0, 8)}`,
              reference: i.reference || undefined,
              emailCount: countsByType.intervention.get(i.id) || 0
            }))
          })
      )
    }

    // Companies
    const companyIds = Array.from(countsByType.company.keys())
    if (companyIds.length > 0) {
      fetchPromises.push(
        supabase
          .from('companies')
          .select('id, name')
          .in('id', companyIds)
          .then(({ data: companies }) => {
            entities.companies = (companies || []).map(c => ({
              id: c.id,
              name: c.name,
              emailCount: countsByType.company.get(c.id) || 0
            }))
          })
      )
    }

    // 5. Wait for all parallel fetches to complete
    await Promise.all(fetchPromises)

    const duration = Date.now() - startTime
    logger.info({
      buildings: entities.buildings.length,
      lots: entities.lots.length,
      contacts: entities.contacts.length,
      contracts: entities.contracts.length,
      interventions: entities.interventions.length,
      companies: entities.companies.length,
      durationMs: duration
    }, '✅ [EMAIL-LINKED-ENTITIES] Fetched linked entities')

    return NextResponse.json({
      success: true,
      entities
    }, {
      headers: {
        // Cache 5 min (linked entities change infrequently)
        'Cache-Control': 'private, max-age=300, stale-while-revalidate=600'
      }
    })

  } catch (error) {
    logger.error({ error }, '❌ [EMAIL-LINKED-ENTITIES] Unexpected error')
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
