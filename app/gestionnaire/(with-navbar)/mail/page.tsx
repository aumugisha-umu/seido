/**
 * Mail Page - Server Component
 *
 * ⚡ SSR Optimization: Fetches initial data server-side
 * for instant page load, then hydrates with Client Component for interactivity
 *
 * Server-side fetched:
 * - Email counts
 * - Buildings
 * - Email connections
 * - Linked entities
 * - Notification reply groups
 * - First page of emails (inbox)
 */

import { getServerAuthContext } from '@/lib/server-context'
import { createServiceRoleSupabaseClient } from '@/lib/services/core/supabase-client'
import { MailClient } from './mail-client'
import type { Email } from '@/lib/types/email-integration'
import type { LinkedEntities, EmailConnection } from './components/mailbox-sidebar'
import type { Building } from './components/types'

// ============================================================================
// SERVER-SIDE DATA FETCHING
// ============================================================================

async function getEmailCounts(supabase: any, teamId: string) {
  // ✅ PERF: Single RPC with COUNT FILTER replaces 4 separate count queries
  // v2: also returns source_counts (per-connection unread counts for sidebar badges)
  const { data, error } = await supabase.rpc('get_email_counts', { p_team_id: teamId }).single()

  if (error || !data) {
    console.error('[MAIL-PAGE] get_email_counts RPC failed, falling back to 0:', error?.message)
    return {
      counts: { inbox: 0, processed: 0, sent: 0, drafts: 0, archive: 0 },
      sourceCounts: {} as Record<string, number>
    }
  }

  // Parse source_counts JSONB: { email_connection_id → unread_count }
  const rawSourceCounts = (data.source_counts || {}) as Record<string, number>
  const sourceCounts: Record<string, number> = {}
  for (const [connectionId, count] of Object.entries(rawSourceCounts)) {
    sourceCounts[connectionId] = Number(count) || 0
  }

  return {
    counts: {
      inbox: Number(data.inbox) || 0,
      processed: Number(data.processed) || 0,
      sent: Number(data.sent) || 0,
      drafts: 0,
      archive: Number(data.archive) || 0
    },
    sourceCounts
  }
}

async function getBuildings(supabase: any, teamId: string): Promise<Building[]> {
  const { data, error } = await supabase
    .from('buildings')
    .select('id, name, address_record:address_id(formatted_address)')
    .eq('team_id', teamId)
    .is('deleted_at', null)
    .order('name')

  if (error) {
    console.error('Error fetching buildings:', error)
    return []
  }

  return (data || []).map((b: any) => ({
    id: b.id,
    name: b.name,
    address: b.address_record?.formatted_address || '',
    emailCount: 0,
    lots: []
  }))
}

async function getEmailConnections(supabase: any, teamId: string): Promise<EmailConnection[]> {
  const { data, error } = await supabase
    .from('team_email_connections')
    .select('id, email_address, provider, is_active, created_at')
    .eq('team_id', teamId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching email connections:', error)
    return []
  }

  return (data || []).map((c: any) => ({
    id: c.id,
    email_address: c.email_address,
    provider: c.provider,
    is_active: c.is_active,
    unread_count: 0,
    email_count: 0,
  }))
}

async function getLinkedEntities(supabase: any, teamId: string): Promise<LinkedEntities> {
  // 1. Get entity IDs that have email links + their counts via RPC
  let linkedData: Array<{ entity_type: string; entity_id: string; email_count: number }> = []

  const { data: rpcData, error: rpcError } = await supabase
    .rpc('get_distinct_linked_entities', { p_team_id: teamId })

  if (rpcError) {
    // RPC function might not exist yet — fallback to direct query
    console.warn('[MAIL-PAGE] RPC get_distinct_linked_entities failed, using fallback:', rpcError.message)
    const { data: fallbackData } = await supabase
      .from('email_links')
      .select('entity_type, entity_id')
      .eq('team_id', teamId)

    if (fallbackData) {
      const countMap = new Map<string, { entity_type: string; entity_id: string; email_count: number }>()
      fallbackData.forEach((row: any) => {
        const key = `${row.entity_type}:${row.entity_id}`
        const existing = countMap.get(key)
        if (existing) {
          existing.email_count++
        } else {
          countMap.set(key, { entity_type: row.entity_type, entity_id: row.entity_id, email_count: 1 })
        }
      })
      linkedData = Array.from(countMap.values())
    }
  } else {
    linkedData = rpcData || []
  }

  // 2. Group by entity type, collect IDs + counts
  const countsByType: Record<string, Map<string, number>> = {
    building: new Map(),
    lot: new Map(),
    contact: new Map(),
    contract: new Map(),
    intervention: new Map(),
    company: new Map()
  }

  linkedData.forEach((row) => {
    const typeMap = countsByType[row.entity_type]
    if (typeMap) {
      typeMap.set(row.entity_id, row.email_count)
    }
  })

  // 3. Fetch entity details only for linked IDs, in parallel
  const result: LinkedEntities = {
    buildings: [],
    lots: [],
    contacts: [],
    contracts: [],
    interventions: [],
    companies: []
  }

  const fetchPromises: Promise<void>[] = []

  const buildingIds = Array.from(countsByType.building.keys())
  if (buildingIds.length > 0) {
    fetchPromises.push(
      supabase
        .from('buildings')
        .select('id, name')
        .in('id', buildingIds)
        .then(({ data }: any) => {
          result.buildings = (data || []).map((b: any) => ({
            id: b.id,
            name: b.name || 'Sans nom',
            emailCount: countsByType.building.get(b.id) || 0
          }))
        })
    )
  }

  const lotIds = Array.from(countsByType.lot.keys())
  if (lotIds.length > 0) {
    fetchPromises.push(
      supabase
        .from('lots')
        .select('id, reference, building:buildings(name)')
        .in('id', lotIds)
        .then(({ data }: any) => {
          result.lots = (data || []).map((l: any) => ({
            id: l.id,
            name: l.reference || `Lot ${l.id.slice(0, 8)}`,
            emailCount: countsByType.lot.get(l.id) || 0,
            subtitle: (l.building as any)?.name
          }))
        })
    )
  }

  const contactIds = Array.from(countsByType.contact.keys())
  if (contactIds.length > 0) {
    fetchPromises.push(
      supabase
        .from('users')
        .select('id, name, email')
        .in('id', contactIds)
        .then(({ data }: any) => {
          result.contacts = (data || []).map((c: any) => ({
            id: c.id,
            name: c.name || 'Contact',
            emailCount: countsByType.contact.get(c.id) || 0,
            subtitle: c.email
          }))
        })
    )
  }

  const contractIds = Array.from(countsByType.contract.keys())
  if (contractIds.length > 0) {
    fetchPromises.push(
      supabase
        .from('contracts')
        .select('id, title, contract_type')
        .in('id', contractIds)
        .then(({ data }: any) => {
          result.contracts = (data || []).map((c: any) => ({
            id: c.id,
            name: c.title || `Contrat ${c.contract_type || 'N/A'}`,
            emailCount: countsByType.contract.get(c.id) || 0
          }))
        })
    )
  }

  const interventionIds = Array.from(countsByType.intervention.keys())
  if (interventionIds.length > 0) {
    fetchPromises.push(
      supabase
        .from('interventions')
        .select('id, title, reference')
        .in('id', interventionIds)
        .then(({ data }: any) => {
          result.interventions = (data || []).map((i: any) => ({
            id: i.id,
            name: i.title || `Intervention ${i.reference || i.id.slice(0, 8)}`,
            emailCount: countsByType.intervention.get(i.id) || 0
          }))
        })
    )
  }

  const companyIds = Array.from(countsByType.company.keys())
  if (companyIds.length > 0) {
    fetchPromises.push(
      supabase
        .from('companies')
        .select('id, name')
        .in('id', companyIds)
        .then(({ data }: any) => {
          result.companies = (data || []).map((c: any) => ({
            id: c.id,
            name: c.name || 'Sans nom',
            emailCount: countsByType.company.get(c.id) || 0
          }))
        })
    )
  }

  await Promise.all(fetchPromises)
  return result
}

async function getInitialEmails(supabase: any, teamId: string): Promise<{
  emails: Email[]
  total: number
}> {
  // Fetch received emails (inbox = unread only) + sent replies in parallel
  // ⚠️ Must match API inbox logic: direction=received + status=unread
  const [receivedResult, sentRepliesResult] = await Promise.all([
    supabase
      .from('emails')
      .select(`
        *,
        attachments:email_attachments(id, filename, content_type, size_bytes)
      `, { count: 'estimated' })
      .eq('team_id', teamId)
      .eq('direction', 'received')
      .eq('status', 'unread')
      .is('deleted_at', null)
      .order('received_at', { ascending: false })
      .limit(50),

    // Fetch sent replies to complete conversation threads
    supabase
      .from('emails')
      .select(`
        *,
        attachments:email_attachments(id, filename, content_type, size_bytes)
      `)
      .eq('team_id', teamId)
      .eq('direction', 'sent')
      .not('in_reply_to', 'is', null)
      .is('deleted_at', null)
      .order('sent_at', { ascending: false })
      .limit(200)
  ])

  if (receivedResult.error) {
    console.error('Error fetching initial emails:', receivedResult.error)
    return { emails: [], total: 0 }
  }

  const receivedEmails = receivedResult.data || []
  const sentReplies = sentRepliesResult.data || []

  // Merge, dedup by ID
  const existingIds = new Set(receivedEmails.map((e: any) => e.id))
  const newSentReplies = sentReplies.filter((e: any) => !existingIds.has(e.id))

  return {
    emails: [...receivedEmails, ...newSentReplies],
    total: receivedResult.count || 0
  }
}

// ============================================================================
// PAGE COMPONENT (Server)
// ============================================================================

export default async function MailPage() {
  // ⚡ Server-side auth context (validates user is gestionnaire)
  const { profile, team, supabase } = await getServerAuthContext('gestionnaire')

  // Use service role client for email queries (bypasses slow RLS with 6 policies)
  // Security: getServerAuthContext already validated user is an authenticated gestionnaire
  const supabaseAdmin = createServiceRoleSupabaseClient()

  // Fetch all initial data in parallel
  // supabaseAdmin: email-heavy queries (counts, emails, linked entities, notification groups)
  // supabase: simpler tables with lightweight RLS (buildings, connections)
  const [
    emailCountsResult,
    buildings,
    emailConnections,
    linkedEntities,
    emailsResult
  ] = await Promise.all([
    getEmailCounts(supabaseAdmin, team.id),
    getBuildings(supabase, team.id),
    getEmailConnections(supabaseAdmin, team.id),
    getLinkedEntities(supabaseAdmin, team.id),
    getInitialEmails(supabaseAdmin, team.id)
  ])

  return (
    <MailClient
      teamId={team.id}
      initialCounts={emailCountsResult.counts}
      initialSourceCounts={emailCountsResult.sourceCounts}
      initialBuildings={buildings}
      initialEmailConnections={emailConnections}
      initialLinkedEntities={linkedEntities}
      initialEmails={emailsResult.emails}
      initialTotalEmails={emailsResult.total}
    />
  )
}
