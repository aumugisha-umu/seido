import { NextResponse } from 'next/server'
import { getApiAuthContext } from '@/lib/api-auth-helper'
import { createServerSupabaseClient } from '@/lib/services'
import { logger } from '@/lib/logger'

/**
 * GET /api/email-linked-entities
 * Retourne toutes les entités liées à au moins 1 email pour l'équipe
 */
export async function GET() {
  try {
    const authResult = await getApiAuthContext()
    if (!authResult.success) return authResult.error

    const { userProfile } = authResult.data

    if (!userProfile.team_id) {
      return NextResponse.json({ success: false, error: 'No team' }, { status: 403 })
    }

    const supabase = await createServerSupabaseClient()

    // 1. Récupérer tous les liens email pour l'équipe
    const { data: links, error: linksError } = await supabase
      .from('email_links')
      .select('entity_type, entity_id')
      .eq('team_id', userProfile.team_id)

    if (linksError) {
      logger.error({ error: linksError }, '❌ [EMAIL-LINKED-ENTITIES] Error fetching links')
      return NextResponse.json({ success: false, error: 'Error fetching links' }, { status: 500 })
    }

    // 2. Grouper par type et compter les emails par entité
    const countsByType: Record<string, Map<string, number>> = {
      building: new Map(),
      lot: new Map(),
      contact: new Map(),
      contract: new Map(),
      intervention: new Map(),
      company: new Map()
    }

    links?.forEach(link => {
      const typeMap = countsByType[link.entity_type]
      if (typeMap) {
        typeMap.set(link.entity_id, (typeMap.get(link.entity_id) || 0) + 1)
      }
    })

    // 3. Récupérer les détails de chaque entité liée
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

    // Fetch buildings
    const buildingIds = Array.from(countsByType.building.keys())
    if (buildingIds.length > 0) {
      const { data: buildings } = await supabase
        .from('buildings')
        .select('id, name, address')
        .in('id', buildingIds)

      entities.buildings = (buildings || []).map(b => ({
        id: b.id,
        name: b.name,
        address: b.address || undefined,
        emailCount: countsByType.building.get(b.id) || 0
      }))
    }

    // Fetch lots
    const lotIds = Array.from(countsByType.lot.keys())
    if (lotIds.length > 0) {
      const { data: lots } = await supabase
        .from('lots')
        .select('id, reference, building:buildings(name)')
        .in('id', lotIds)

      entities.lots = (lots || []).map(l => ({
        id: l.id,
        name: l.reference || `Lot ${l.id.slice(0, 8)}`,
        building_name: (l.building as any)?.name,
        emailCount: countsByType.lot.get(l.id) || 0
      }))
    }

    // Fetch contacts (from users table - team contacts)
    const contactIds = Array.from(countsByType.contact.keys())
    if (contactIds.length > 0) {
      const { data: contacts } = await supabase
        .from('users')
        .select('id, name, email')
        .in('id', contactIds)

      entities.contacts = (contacts || []).map(c => ({
        id: c.id,
        name: c.name || 'Contact',
        email: c.email || undefined,
        emailCount: countsByType.contact.get(c.id) || 0
      }))
    }

    // Fetch contracts
    const contractIds = Array.from(countsByType.contract.keys())
    if (contractIds.length > 0) {
      const { data: contracts } = await supabase
        .from('contracts')
        .select('id, title, contract_type')
        .in('id', contractIds)

      entities.contracts = (contracts || []).map(c => ({
        id: c.id,
        name: c.title || `Contrat ${c.contract_type || 'N/A'}`,
        reference: c.contract_type || undefined,
        emailCount: countsByType.contract.get(c.id) || 0
      }))
    }

    // Fetch interventions
    const interventionIds = Array.from(countsByType.intervention.keys())
    if (interventionIds.length > 0) {
      const { data: interventions } = await supabase
        .from('interventions')
        .select('id, title, reference')
        .in('id', interventionIds)

      entities.interventions = (interventions || []).map(i => ({
        id: i.id,
        name: i.title || `Intervention ${i.reference || i.id.slice(0, 8)}`,
        reference: i.reference || undefined,
        emailCount: countsByType.intervention.get(i.id) || 0
      }))
    }

    // Fetch companies
    const companyIds = Array.from(countsByType.company.keys())
    if (companyIds.length > 0) {
      const { data: companies } = await supabase
        .from('companies')
        .select('id, name')
        .in('id', companyIds)

      entities.companies = (companies || []).map(c => ({
        id: c.id,
        name: c.name,
        emailCount: countsByType.company.get(c.id) || 0
      }))
    }

    logger.info({
      buildings: entities.buildings.length,
      lots: entities.lots.length,
      contacts: entities.contacts.length,
      contracts: entities.contracts.length,
      interventions: entities.interventions.length,
      companies: entities.companies.length
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
