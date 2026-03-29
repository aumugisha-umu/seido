import { logger } from '@/lib/logger'
import { createServiceRoleSupabaseClient } from '@/lib/services/core/supabase-client'
import { normalizePhoneE164 } from '@/lib/services/domain/ai-phone/call-transcript-analyzer.service'

// ============================================================================
// Types
// ============================================================================

export interface PhoneTeamMapping {
  id: string
  contact_phone: string
  team_id: string
  user_id: string | null
  user_role: string | null
  source: string
  last_used_at: string
  created_at: string
}

export interface PropertyOption {
  lotId?: string
  buildingId?: string
  label: string
  reference?: string
}

export interface InterventionOption {
  interventionId: string
  label: string
  reference: string
  buildingId?: string
  lotId?: string
}

type SupabaseClient = ReturnType<typeof createServiceRoleSupabaseClient>

// ============================================================================
// Mapping CRUD
// ============================================================================

/**
 * Primary routing lookup: find all mappings for a phone number.
 * Tests both normalized E.164 and raw form for safety.
 */
export const lookupMappings = async (
  supabase: SupabaseClient,
  contactPhone: string
): Promise<PhoneTeamMapping[]> => {
  const normalized = normalizePhoneE164(contactPhone)

  const phones = normalized !== contactPhone
    ? [normalized, contactPhone]
    : [normalized]

  const { data, error } = await supabase
    .from('phone_team_mappings')
    .select('id, contact_phone, team_id, user_id, user_role, source, last_used_at, created_at')
    .in('contact_phone', phones)
    .order('last_used_at', { ascending: false })

  if (error) {
    logger.warn({ error, contactPhone }, '[PHONE-MAPPING] Lookup failed')
    return []
  }

  return (data ?? []) as PhoneTeamMapping[]
}

/**
 * Create or update a phone→team mapping.
 * Uses upsert on (contact_phone, team_id) unique constraint.
 */
export const createOrUpdateMapping = async (
  supabase: SupabaseClient,
  opts: {
    contactPhone: string
    teamId: string
    userId?: string | null
    userRole?: string | null
    source?: string
  }
): Promise<void> => {
  const normalized = normalizePhoneE164(opts.contactPhone)

  const { error } = await supabase
    .from('phone_team_mappings')
    .upsert(
      {
        contact_phone: normalized,
        team_id: opts.teamId,
        user_id: opts.userId ?? null,
        user_role: opts.userRole ?? null,
        source: opts.source ?? 'auto',
        last_used_at: new Date().toISOString(),
      },
      { onConflict: 'contact_phone,team_id' }
    )

  if (error) {
    logger.warn({ error, phone: normalized, teamId: opts.teamId }, '[PHONE-MAPPING] Upsert failed')
  }
}

/**
 * Touch mapping: update last_used_at timestamp.
 */
export const touchMapping = async (
  supabase: SupabaseClient,
  contactPhone: string,
  teamId: string
): Promise<void> => {
  const normalized = normalizePhoneE164(contactPhone)

  const { error } = await supabase
    .from('phone_team_mappings')
    .update({ last_used_at: new Date().toISOString() })
    .eq('contact_phone', normalized)
    .eq('team_id', teamId)

  if (error) {
    logger.warn({ error }, '[PHONE-MAPPING] Touch failed')
  }
}

/**
 * Delete a mapping (stale team membership or admin action).
 */
export const deleteMapping = async (
  supabase: SupabaseClient,
  contactPhone: string,
  teamId: string
): Promise<void> => {
  const normalized = normalizePhoneE164(contactPhone)

  const { error } = await supabase
    .from('phone_team_mappings')
    .delete()
    .eq('contact_phone', normalized)
    .eq('team_id', teamId)

  if (error) {
    logger.warn({ error }, '[PHONE-MAPPING] Delete failed')
  }
}

// ============================================================================
// Staleness check
// ============================================================================

const STALENESS_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

/**
 * Verify mapping freshness. If last_used_at > 7 days, check team_members.
 * Returns true if mapping is still valid, false if it was deleted/updated.
 */
export const verifyMappingFreshness = async (
  supabase: SupabaseClient,
  mapping: PhoneTeamMapping
): Promise<boolean> => {
  const lastUsed = new Date(mapping.last_used_at).getTime()
  if (Date.now() - lastUsed < STALENESS_THRESHOLD_MS) {
    return true // Fresh enough, skip check
  }

  if (!mapping.user_id) {
    return true // No user linked, can't verify membership
  }

  // Check if user is still an active team member
  const { data: member } = await supabase
    .from('team_members')
    .select('role')
    .eq('user_id', mapping.user_id)
    .eq('team_id', mapping.team_id)
    .is('left_at', null)
    .limit(1)
    .maybeSingle()

  if (!member) {
    // User left team — delete mapping
    await deleteMapping(supabase, mapping.contact_phone, mapping.team_id)
    logger.info(
      { phone: mapping.contact_phone, teamId: mapping.team_id },
      '[PHONE-MAPPING] Stale mapping deleted — user left team'
    )
    return false
  }

  // Update role if changed
  if (member.role !== mapping.user_role) {
    await supabase
      .from('phone_team_mappings')
      .update({ user_role: member.role, last_used_at: new Date().toISOString() })
      .eq('id', mapping.id)

    logger.info(
      { phone: mapping.contact_phone, oldRole: mapping.user_role, newRole: member.role },
      '[PHONE-MAPPING] Role updated'
    )
  } else {
    // Just touch to reset staleness timer
    await touchMapping(supabase, mapping.contact_phone, mapping.team_id)
  }

  return true
}

// ============================================================================
// Conversation history (persistent memory across sessions)
// ============================================================================

const MAX_RECENT_ENTRIES = 10

export interface ConversationHistoryEntry {
  date: string
  channel: string
  problem: string
  address?: string
  urgency?: string
  intervention_ref?: string
  caller_name?: string
}

export interface ConversationHistory {
  compacted?: string
  compacted_count?: number
  entries: ConversationHistoryEntry[]
}

/**
 * Append a conversation summary to the mapping's history.
 * Triggers compaction when entries exceed MAX_RECENT_ENTRIES.
 */
export const appendConversationSummary = async (
  supabase: SupabaseClient,
  contactPhone: string,
  teamId: string,
  entry: ConversationHistoryEntry
): Promise<void> => {
  const normalized = normalizePhoneE164(contactPhone)

  // Fetch current history
  const { data: mapping } = await supabase
    .from('phone_team_mappings')
    .select('conversation_history')
    .eq('contact_phone', normalized)
    .eq('team_id', teamId)
    .limit(1)
    .maybeSingle()

  if (!mapping) return

  const history: ConversationHistory = (mapping.conversation_history as ConversationHistory) ?? { entries: [] }
  history.entries.push(entry)

  // Compact if entries exceed threshold
  if (history.entries.length > MAX_RECENT_ENTRIES) {
    const toCompact = history.entries.slice(0, history.entries.length - MAX_RECENT_ENTRIES)
    const kept = history.entries.slice(history.entries.length - MAX_RECENT_ENTRIES)

    const compactedText = buildCompactedSummary(toCompact, history.compacted)
    history.compacted = compactedText
    history.compacted_count = (history.compacted_count ?? 0) + toCompact.length
    history.entries = kept
  }

  const { error } = await supabase
    .from('phone_team_mappings')
    .update({ conversation_history: history as unknown as Record<string, unknown> })
    .eq('contact_phone', normalized)
    .eq('team_id', teamId)

  if (error) {
    logger.warn({ error, phone: normalized }, '[PHONE-MAPPING] Append conversation history failed')
  }
}

/**
 * Fetch conversation history for a contact+team (used by Claude prompt builder).
 */
export const getConversationHistory = async (
  supabase: SupabaseClient,
  contactPhone: string,
  teamId: string
): Promise<ConversationHistory | null> => {
  const normalized = normalizePhoneE164(contactPhone)

  const { data } = await supabase
    .from('phone_team_mappings')
    .select('conversation_history')
    .eq('contact_phone', normalized)
    .eq('team_id', teamId)
    .limit(1)
    .maybeSingle()

  if (!data?.conversation_history) return null

  const history = data.conversation_history as ConversationHistory
  if (!history.entries?.length && !history.compacted) return null

  return history
}

/**
 * Build a compacted text summary from older entries.
 * Mechanical — no AI call. Aggregates by problem type and address.
 */
const buildCompactedSummary = (
  entries: ConversationHistoryEntry[],
  existingCompacted: string | undefined
): string => {
  // Group by address
  const byAddress = new Map<string, string[]>()
  for (const e of entries) {
    const addr = e.address ?? 'adresse inconnue'
    const problems = byAddress.get(addr) ?? []
    problems.push(e.problem)
    byAddress.set(addr, problems)
  }

  // Build new compact text
  const parts: string[] = []
  for (const [addr, problems] of byAddress) {
    const uniqueProblems = [...new Set(problems)]
    if (uniqueProblems.length === 1) {
      parts.push(`${problems.length}x ${uniqueProblems[0]} a ${addr}`)
    } else {
      parts.push(`${problems.length} demandes a ${addr} (${uniqueProblems.join(', ')})`)
    }
  }

  const dateRange = `${entries[0].date} - ${entries[entries.length - 1].date}`
  const newSummary = `${entries.length} conv. (${dateRange}): ${parts.join('; ')}`

  if (existingCompacted) {
    return `${existingCompacted}. ${newSummary}`
  }
  return newSummary
}

/**
 * Format conversation history for injection into Claude system prompt.
 */
export const formatHistoryForPrompt = (history: ConversationHistory): string => {
  const totalCount = (history.compacted_count ?? 0) + history.entries.length
  const lines: string[] = [`Ce contact a eu ${totalCount} conversation(s) precedente(s).`]

  if (history.compacted) {
    lines.push(`Historique ancien (${history.compacted_count} conv.): ${history.compacted}`)
  }

  // Surface caller name from most recent entry
  const latestName = [...history.entries].reverse().find(e => e.caller_name)?.caller_name
  if (latestName) lines.push(`Nom connu: ${latestName}`)

  if (history.entries.length > 0) {
    lines.push('Recent:')
    // Show most recent first
    for (const e of [...history.entries].reverse()) {
      const parts = [e.date, e.problem]
      if (e.address) parts.push(e.address)
      if (e.urgency && e.urgency !== 'normale') parts.push(`urgence ${e.urgency}`)
      if (e.intervention_ref) parts.push(e.intervention_ref)
      lines.push(`- ${parts.join(' — ')}`)
    }
  }

  return lines.join('\n')
}

// ============================================================================
// Property queries (tenants/owners)
// ============================================================================

/**
 * Fetch properties (lots + standalone buildings) for a user within a team.
 * Queries lot_contacts JOIN lots + building_contacts JOIN buildings.
 * Uses lots.team_id (NOT NULL) rather than lot_contacts.team_id (nullable).
 */
export const fetchUserProperties = async (
  supabase: SupabaseClient,
  userId: string,
  teamId: string
): Promise<PropertyOption[]> => {
  // Parallel: lot_contacts + building_contacts
  const [{ data: lotData }, { data: buildingData }] = await Promise.all([
    supabase
      .from('lot_contacts')
      .select(`
        lot_id,
        lots!inner(id, reference, apartment_number, floor, team_id, building_id,
          addresses(street, city, postal_code),
          buildings(name, addresses(street, city, postal_code))
        )
      `)
      .eq('user_id', userId)
      .eq('lots.team_id', teamId)
      .is('lots.deleted_at', null),

    supabase
      .from('building_contacts')
      .select(`
        building_id,
        buildings!inner(id, name, team_id,
          addresses(street, city, postal_code)
        )
      `)
      .eq('user_id', userId)
      .eq('buildings.team_id', teamId)
      .is('buildings.deleted_at', null),
  ])

  const options: PropertyOption[] = []
  const seenLotIds = new Set<string>()
  const seenBuildingIds = new Set<string>()

  // Process lots
  for (const row of lotData ?? []) {
    const lot = row.lots as unknown as {
      id: string
      reference: string
      apartment_number: string | null
      floor: number | null
      building_id: string | null
      addresses: { street: string; city: string; postal_code: string } | null
      buildings: { name: string; addresses: { street: string; city: string; postal_code: string } | null } | null
    }
    if (!lot || seenLotIds.has(lot.id)) continue
    seenLotIds.add(lot.id)

    // Lot address: own address or parent building address
    const addr = lot.addresses ?? lot.buildings?.addresses
    const lotLabel = lot.apartment_number
      ? `Apt ${lot.apartment_number}`
      : lot.reference

    const label = addr
      ? `${lotLabel} — ${addr.street}, ${addr.postal_code} ${addr.city}`
      : lotLabel

    options.push({ lotId: lot.id, buildingId: lot.building_id ?? undefined, label, reference: lot.reference })

    // Track building to avoid duplicates
    if (lot.building_id) seenBuildingIds.add(lot.building_id)
  }

  // Process buildings (only those not already covered by lots)
  for (const row of buildingData ?? []) {
    const building = row.buildings as unknown as {
      id: string
      name: string
      addresses: { street: string; city: string; postal_code: string } | null
    }
    if (!building || seenBuildingIds.has(building.id)) continue
    seenBuildingIds.add(building.id)

    const addr = building.addresses
    const label = addr
      ? `${building.name} — ${addr.street}, ${addr.postal_code} ${addr.city}`
      : building.name

    options.push({ buildingId: building.id, label })
  }

  return options
}

// ============================================================================
// Intervention queries (providers)
// ============================================================================

/**
 * Fetch active interventions assigned to a provider within a team.
 */
export const fetchProviderInterventions = async (
  supabase: SupabaseClient,
  userId: string,
  teamId: string
): Promise<InterventionOption[]> => {
  const terminalStatuses = ['cloturee_par_gestionnaire', 'annulee', 'rejetee']

  const { data, error } = await supabase
    .from('intervention_assignments')
    .select(`
      interventions!inner(
        id, reference, title, status, team_id, building_id, lot_id,
        buildings(name, addresses(street, city)),
        lots(reference, apartment_number, buildings(name, addresses(street, city)))
      )
    `)
    .eq('user_id', userId)
    .eq('role', 'prestataire')
    .eq('interventions.team_id', teamId)
    .not('interventions.status', 'in', `(${terminalStatuses.join(',')})`)
    .is('interventions.deleted_at', null)

  if (error) {
    logger.warn({ error, userId, teamId }, '[PHONE-MAPPING] Provider interventions query failed')
    return []
  }

  const options: InterventionOption[] = []
  const seenIds = new Set<string>()

  for (const row of data ?? []) {
    const intervention = row.interventions as unknown as {
      id: string
      reference: string
      title: string
      status: string
      building_id: string | null
      lot_id: string | null
      buildings: { name: string; addresses: { street: string; city: string } | null } | null
      lots: { reference: string; apartment_number: string | null; buildings: { name: string; addresses: { street: string; city: string } | null } | null } | null
    }
    if (!intervention || seenIds.has(intervention.id)) continue
    seenIds.add(intervention.id)

    // Build address from building or lot→building
    const addr = intervention.buildings?.addresses ?? intervention.lots?.buildings?.addresses
    const location = addr ? ` (${addr.street}, ${addr.city})` : ''

    // Truncate title for SMS friendliness
    const shortTitle = intervention.title.length > 50
      ? intervention.title.slice(0, 47) + '...'
      : intervention.title

    options.push({
      interventionId: intervention.id,
      reference: intervention.reference,
      label: `#${intervention.reference} — ${shortTitle}${location}`,
      buildingId: intervention.building_id ?? undefined,
      lotId: intervention.lot_id ?? undefined,
    })
  }

  return options
}

// ============================================================================
// First-contact identification cascade
// ============================================================================

// ============================================================================
// Shared user lookup helpers (used by voice webhook + conversation engine)
// ============================================================================

/**
 * Fetch a user's full name by ID. Returns "First Last" or null.
 */
export const fetchUserName = async (
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> => {
  const { data } = await supabase
    .from('users')
    .select('first_name, last_name')
    .eq('id', userId)
    .limit(1)
    .maybeSingle()

  if (!data) return null
  const parts = [data.first_name, data.last_name].filter(Boolean)
  return parts.length > 0 ? parts.join(' ') : null
}

/**
 * Fetch a user's primary address within a team (via lot_contacts).
 * Returns formatted "Apt X, street, postal city" or null.
 */
export const fetchUserAddress = async (
  supabase: SupabaseClient,
  userId: string,
  teamId: string
): Promise<string | null> => {
  // Query lot_contacts joined with lots filtered by team
  const { data: lotContacts } = await supabase
    .from('lot_contacts')
    .select('lots!inner(apartment_number, team_id, addresses(street, city, postal_code), buildings(name, addresses(street, city, postal_code)))')
    .eq('user_id', userId)
    .eq('lots.team_id', teamId)
    .limit(5)

  if (!lotContacts?.length) return null

  // Find first lot with a valid address
  for (const lc of lotContacts) {
    const lot = lc.lots as unknown as {
      apartment_number: string | null
      addresses: { street: string; city: string; postal_code: string } | null
      buildings: { addresses: { street: string; city: string; postal_code: string } | null } | null
    }
    const addr = lot.addresses ?? lot.buildings?.addresses
    if (addr) {
      const aptLabel = lot.apartment_number ? `Apt ${lot.apartment_number}, ` : ''
      return `${aptLabel}${addr.street}, ${addr.postal_code} ${addr.city}`
    }
  }

  return null
}

// ============================================================================
// Resolve mappings (shared cascade for voice + whatsapp webhooks)
// ============================================================================

/**
 * Resolve phone → team mappings: lookup existing + cascade identification if none found.
 * Returns mapping-like records (may have partial fields when newly created).
 */
export const resolvePhoneMappings = async (
  supabase: SupabaseClient,
  contactPhone: string,
  options?: { checkFreshness?: boolean }
): Promise<PhoneTeamMapping[]> => {
  let mappings = await lookupMappings(supabase, contactPhone)

  // Verify freshness if requested (WhatsApp uses this, voice skips it)
  if (options?.checkFreshness && mappings.length > 0) {
    const freshChecks = await Promise.all(
      mappings.map(m => verifyMappingFreshness(supabase, m))
    )
    mappings = mappings.filter((_, i) => freshChecks[i])
  }

  // First-contact cascade if no mapping found
  if (mappings.length === 0) {
    const cascadeResults = await runIdentificationCascade(supabase, contactPhone)
    if (cascadeResults.length > 0) {
      const createdMappings = await Promise.all(
        cascadeResults.map(async (r) => {
          await createOrUpdateMapping(supabase, {
            contactPhone,
            teamId: r.teamId,
            userId: r.userId,
            userRole: r.userRole,
            source: 'phone_match',
          })
          return {
            team_id: r.teamId,
            user_id: r.userId,
            user_role: r.userRole,
            source: 'phone_match',
          }
        })
      )
      // Cast: cascade-created records have subset of fields used downstream
      mappings = createdMappings as typeof mappings
    }
  }

  return mappings
}

// ============================================================================
// Identification cascade
// ============================================================================

interface IdentificationResult {
  teamId: string
  userId: string | null
  userRole: string | null
}

/**
 * Run the full identification cascade for a phone number that has no existing mapping.
 * Checks: team_members (all roles) → lot_contacts → building_contacts → supplier_contracts.
 * Returns all matches (may be 0, 1, or many).
 */
export const runIdentificationCascade = async (
  supabase: SupabaseClient,
  contactPhone: string
): Promise<IdentificationResult[]> => {
  const normalized = normalizePhoneE164(contactPhone)
  const phones = normalized !== contactPhone ? [normalized, contactPhone] : [normalized]

  const results: IdentificationResult[] = []
  const seenTeams = new Set<string>()

  // 2a. team_members — ALL roles (not just locataire)
  for (const phone of phones) {
    const { data: members } = await supabase
      .from('team_members')
      .select('team_id, role, users!inner(id, phone)')
      .is('left_at', null)
      .eq('users.phone', phone)

    for (const m of members ?? []) {
      const user = m.users as unknown as { id: string }
      const key = `${m.team_id}:${user.id}`
      if (seenTeams.has(key)) continue
      seenTeams.add(key)
      results.push({ teamId: m.team_id, userId: user.id, userRole: m.role })
    }

    if (results.length > 0) break // Found via team_members, skip rest of cascade
  }

  if (results.length > 0) return results

  // 2b-2d: Resolve user IDs from phone once (avoid N+1 users query)
  let cachedUserIds: string[] | null = null
  const getUserIds = async (): Promise<string[]> => {
    if (cachedUserIds !== null) return cachedUserIds
    for (const phone of phones) {
      const { data: users } = await supabase
        .from('users')
        .select('id')
        .eq('phone', phone)
        .is('deleted_at', null)
      if (users?.length) {
        cachedUserIds = users.map(u => u.id)
        return cachedUserIds
      }
    }
    cachedUserIds = []
    return cachedUserIds
  }

  // 2b. lot_contacts — tenants linked to lots but not necessarily in team_members
  const userIdsForLots = await getUserIds()
  if (userIdsForLots.length > 0) {
    const { data: contacts } = await supabase
      .from('lot_contacts')
      .select('user_id, lots!inner(team_id)')
      .in('user_id', userIdsForLots)
      .is('lots.deleted_at', null)

    for (const c of contacts ?? []) {
      const lot = c.lots as unknown as { team_id: string }
      const key = `${lot.team_id}:${c.user_id}`
      if (seenTeams.has(key)) continue
      seenTeams.add(key)
      results.push({ teamId: lot.team_id, userId: c.user_id, userRole: 'locataire' })
    }
  }

  if (results.length > 0) return results

  // 2c. building_contacts
  const userIdsForBuildings = await getUserIds()
  if (userIdsForBuildings.length > 0) {
    const { data: contacts } = await supabase
      .from('building_contacts')
      .select('user_id, buildings!inner(team_id)')
      .in('user_id', userIdsForBuildings)
      .is('buildings.deleted_at', null)

    for (const c of contacts ?? []) {
      const building = c.buildings as unknown as { team_id: string }
      const key = `${building.team_id}:${c.user_id}`
      if (seenTeams.has(key)) continue
      seenTeams.add(key)
      results.push({ teamId: building.team_id, userId: c.user_id, userRole: 'proprietaire' })
    }
  }

  if (results.length > 0) return results

  // 2d. supplier_contracts
  const userIdsForContracts = await getUserIds()
  if (userIdsForContracts.length === 0) return results

  const { data: contracts } = await supabase
    .from('supplier_contracts')
    .select('supplier_id, team_id')
    .in('supplier_id', userIdsForContracts)
    .eq('status', 'actif')
    .is('deleted_at', null)

  for (const c of contracts ?? []) {
    const key = `${c.team_id}:${c.supplier_id}`
    if (seenTeams.has(key)) continue
    seenTeams.add(key)
    results.push({ teamId: c.team_id, userId: c.supplier_id, userRole: 'prestataire' })
  }

  return results
}
