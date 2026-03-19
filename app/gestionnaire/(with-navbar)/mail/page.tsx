/**
 * Mail Page - Server Component
 *
 * SSR Optimization: Fetches initial data server-side
 * for instant page load, then hydrates with Client Component for interactivity
 *
 * Server-side fetched:
 * - Email counts
 * - Buildings
 * - Email connections
 * - Linked entities
 * - First page of emails (inbox)
 */

import { getServerAuthContext } from '@/lib/server-context'
import { createServiceRoleSupabaseClient } from '@/lib/services/core/supabase-client'
import { MailClient } from './mail-client'
import { logger } from '@/lib/logger'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import type { Email } from '@/lib/types/email-integration'
import type { LinkedEntities, EmailConnection } from './components/mailbox-sidebar'
import type { Building } from './components/types'

// Supabase client type alias for server-side queries
type DbClient = SupabaseClient<Database>

// Types for Supabase query row shapes
interface BuildingRow {
  id: string
  name: string
  address_record: { formatted_address: string } | null
}

interface EmailConnectionRow {
  id: string
  email_address: string
  provider: string
  is_active: boolean
  created_at: string
}

interface EmailLinkRow {
  entity_type: string
  entity_id: string
}

interface LinkedEntityRow {
  entity_type: string
  entity_id: string
  email_count: number
}

interface NamedRow {
  id: string
  name: string
}

interface LotRow {
  id: string
  reference: string | null
  building: { name: string } | null
}

interface ContactRow {
  id: string
  name: string | null
  email: string | null
}

interface ContractRow {
  id: string
  title: string | null
  contract_type: string | null
}

interface InterventionRow {
  id: string
  title: string | null
  reference: string | null
}

// Supabase query result shape
interface SupabaseResult<T> {
  data: T[] | null
  error: { message: string } | null
}

// ============================================================================
// SERVER-SIDE DATA FETCHING
// ============================================================================

async function getEmailCounts(supabase: DbClient, teamId: string) {
  const { data, error } = await supabase.rpc('get_email_counts', { p_team_id: teamId }).single()

  if (error || !data) {
    logger.error({ error: error?.message }, '[MAIL-PAGE] get_email_counts RPC failed, falling back to 0')
    return {
      counts: { inbox: 0, processed: 0, sent: 0, drafts: 0, archive: 0 },
      sourceCounts: {} as Record<string, number>
    }
  }

  // Parse source_counts JSONB: { email_connection_id -> unread_count }
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

async function getBuildings(supabase: DbClient, teamId: string): Promise<Building[]> {
  const { data, error } = await supabase
    .from('buildings')
    .select('id, name, address_record:address_id(formatted_address)')
    .eq('team_id', teamId)
    .is('deleted_at', null)
    .order('name')

  if (error) {
    logger.error({ error: error.message }, 'Error fetching buildings')
    return []
  }

  return (data || []).map((b: unknown) => {
    const row = b as BuildingRow
    return {
      id: row.id,
      name: row.name,
      address: row.address_record?.formatted_address || '',
      emailCount: 0,
      lots: []
    }
  })
}

async function getEmailConnections(supabase: DbClient, teamId: string): Promise<EmailConnection[]> {
  const { data, error } = await supabase
    .from('team_email_connections')
    .select('id, email_address, provider, is_active, created_at')
    .eq('team_id', teamId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) {
    logger.error({ error: error.message }, 'Error fetching email connections')
    return []
  }

  return ((data || []) as EmailConnectionRow[]).map((c) => ({
    id: c.id,
    email_address: c.email_address,
    provider: c.provider,
    is_active: c.is_active,
    unread_count: 0,
    email_count: 0,
  }))
}

async function getLinkedEntities(supabase: DbClient, teamId: string): Promise<LinkedEntities> {
  // 1. Get entity IDs that have email links + their counts via RPC
  let linkedData: Array<{ entity_type: string; entity_id: string; email_count: number }> = []

  const { data: rpcData, error: rpcError } = await supabase
    .rpc('get_distinct_linked_entities', { p_team_id: teamId })

  if (rpcError) {
    // RPC function might not exist yet -- fallback to direct query
    logger.warn({ error: rpcError.message }, '[MAIL-PAGE] RPC get_distinct_linked_entities failed, using fallback')
    const { data: fallbackData } = await supabase
      .from('email_links')
      .select('entity_type, entity_id')
      .eq('team_id', teamId)

    if (fallbackData) {
      const countMap = new Map<string, { entity_type: string; entity_id: string; email_count: number }>()
      ;(fallbackData as unknown as EmailLinkRow[]).forEach((row) => {
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
    linkedData = (rpcData as unknown as LinkedEntityRow[]) || []
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
        .then(({ data }: SupabaseResult<NamedRow>) => {
          result.buildings = (data || []).map((b) => ({
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
        .then(({ data }: SupabaseResult<unknown>) => {
          result.lots = ((data || []) as LotRow[]).map((l) => ({
            id: l.id,
            name: l.reference || `Lot ${l.id.slice(0, 8)}`,
            emailCount: countsByType.lot.get(l.id) || 0,
            subtitle: l.building?.name
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
        .then(({ data }: SupabaseResult<ContactRow>) => {
          result.contacts = (data || []).map((c) => ({
            id: c.id,
            name: c.name || 'Contact',
            emailCount: countsByType.contact.get(c.id) || 0,
            subtitle: c.email || undefined
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
        .then(({ data }: SupabaseResult<ContractRow>) => {
          result.contracts = (data || []).map((c) => ({
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
        .then(({ data }: SupabaseResult<InterventionRow>) => {
          result.interventions = (data || []).map((i) => ({
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
        .then(({ data }: SupabaseResult<NamedRow>) => {
          result.companies = (data || []).map((c) => ({
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

async function getInitialEmails(supabase: DbClient, teamId: string): Promise<{
  emails: Email[]
  total: number
}> {
  // Fetch received emails (inbox = unread only) + sent replies in parallel
  // Must match API inbox logic: direction=received + status=unread
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
    logger.error({ error: receivedResult.error.message }, 'Error fetching initial emails')
    return { emails: [], total: 0 }
  }

  const receivedEmails = (receivedResult.data || []) as unknown as Email[]
  const sentReplies = (sentRepliesResult.data || []) as unknown as Email[]

  // Merge, dedup by ID
  const existingIds = new Set(receivedEmails.map((e) => e.id))
  const newSentReplies = sentReplies.filter((e) => !existingIds.has(e.id))

  return {
    emails: [...receivedEmails, ...newSentReplies],
    total: receivedResult.count || 0
  }
}

// ============================================================================
// PAGE COMPONENT (Server)
// ============================================================================

export default async function MailPage() {
  // Server-side auth context (validates user is gestionnaire)
  const { team, supabase } = await getServerAuthContext('gestionnaire')

  // Use service role client for email queries (bypasses slow RLS with 6 policies)
  // Security: getServerAuthContext already validated user is an authenticated gestionnaire
  const supabaseAdmin = createServiceRoleSupabaseClient()

  // Fetch all initial data in parallel
  // supabaseAdmin: email-heavy queries (counts, emails, linked entities)
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
