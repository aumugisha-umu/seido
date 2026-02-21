/**
 * Factory functions for integration test data creation/cleanup
 *
 * Uses service-role client to bypass RLS for direct DB operations.
 * All created data should be cleaned up in afterEach/afterAll.
 */

import { createTestSupabaseClient } from './supabase-client'

const supabase = createTestSupabaseClient()

/** Track created intervention IDs for cleanup */
const createdInterventionIds: string[] = []

/**
 * Get the team ID for the gestionnaire test user (arthur@seido-app.com)
 */
export async function getTestTeamId(): Promise<string> {
  const { data, error } = await supabase
    .from('users')
    .select('team_id')
    .eq('email', 'arthur@seido-app.com')
    .limit(1)
    .single()

  if (error || !data) throw new Error(`Failed to get test team ID: ${error?.message}`)
  return data.team_id
}

/**
 * Get the user ID for a test user by email
 */
export async function getTestUserId(email: string): Promise<string> {
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .limit(1)
    .single()

  if (error || !data) throw new Error(`Failed to get user ID for ${email}: ${error?.message}`)
  return data.id
}

/**
 * Get a valid lot ID for the test team
 */
export async function getTestLotId(teamId: string): Promise<string> {
  const { data, error } = await supabase
    .from('lots')
    .select('id')
    .eq('team_id', teamId)
    .is('deleted_at', null)
    .limit(1)
    .single()

  if (error || !data) throw new Error(`Failed to get test lot ID: ${error?.message}`)
  return data.id
}

/**
 * Get a valid building ID for the test team
 */
export async function getTestBuildingId(teamId: string): Promise<string> {
  const { data, error } = await supabase
    .from('buildings')
    .select('id')
    .eq('team_id', teamId)
    .is('deleted_at', null)
    .limit(1)
    .single()

  if (error || !data) throw new Error(`Failed to get test building ID: ${error?.message}`)
  return data.id
}

/**
 * Generate a unique reference for test interventions
 */
function generateTestReference(): string {
  const ts = Date.now().toString(36)
  const rand = Math.random().toString(36).slice(2, 6)
  return `TEST-${ts}-${rand}`.toUpperCase()
}

/**
 * Create a test intervention directly in the DB (bypasses RLS)
 */
export async function createTestIntervention(overrides: {
  teamId: string
  lotId?: string
  buildingId?: string
  createdBy?: string
  status?: string
  title?: string
  description?: string
  type?: string
  urgency?: string
}) {
  const { data, error } = await supabase
    .from('interventions')
    .insert({
      team_id: overrides.teamId,
      lot_id: overrides.lotId || null,
      building_id: overrides.buildingId || null,
      created_by: overrides.createdBy || null,
      status: overrides.status || 'demande',
      title: overrides.title || `Test Intervention ${Date.now()}`,
      description: overrides.description || 'Test intervention description for integration tests',
      type: overrides.type || 'plomberie',
      urgency: overrides.urgency || 'normale',
      reference: generateTestReference(),
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create test intervention: ${error.message}`)
  createdInterventionIds.push(data.id)
  return data
}

/**
 * Update intervention status directly in DB (bypasses business logic)
 */
export async function updateTestInterventionStatus(
  interventionId: string,
  status: string
) {
  const { error } = await supabase
    .from('interventions')
    .update({ status })
    .eq('id', interventionId)

  if (error) throw new Error(`Failed to update intervention status: ${error.message}`)
}

/**
 * Get intervention by ID (service role, bypasses RLS)
 */
export async function getTestIntervention(interventionId: string) {
  const { data, error } = await supabase
    .from('interventions')
    .select('*')
    .eq('id', interventionId)
    .single()

  if (error) throw new Error(`Failed to get intervention: ${error.message}`)
  return data
}

/**
 * Get notifications for an intervention
 */
export async function getInterventionNotifications(interventionId: string) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('entity_type', 'intervention')
    .eq('entity_id', interventionId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to get notifications: ${error.message}`)
  return data || []
}

/**
 * Get conversation threads for an intervention
 */
export async function getInterventionThreads(interventionId: string) {
  const { data, error } = await supabase
    .from('conversation_threads')
    .select('*, conversation_participants(*)')
    .eq('intervention_id', interventionId)

  if (error) throw new Error(`Failed to get threads: ${error.message}`)
  return data || []
}

/**
 * Get intervention assignments
 */
export async function getInterventionAssignments(interventionId: string) {
  const { data, error } = await supabase
    .from('intervention_assignments')
    .select('*')
    .eq('intervention_id', interventionId)

  if (error) throw new Error(`Failed to get assignments: ${error.message}`)
  return data || []
}

/**
 * Get intervention quotes
 */
export async function getInterventionQuotes(interventionId: string) {
  const { data, error } = await supabase
    .from('intervention_quotes')
    .select('*')
    .eq('intervention_id', interventionId)

  if (error) throw new Error(`Failed to get quotes: ${error.message}`)
  return data || []
}

/**
 * Clean up all test interventions and related data
 */
export async function cleanupTestInterventions() {
  if (createdInterventionIds.length === 0) return

  // Delete related data first (foreign key constraints)
  for (const id of createdInterventionIds) {
    // Delete assignments
    await supabase
      .from('intervention_assignments')
      .delete()
      .eq('intervention_id', id)

    // Delete quotes
    await supabase
      .from('intervention_quotes')
      .delete()
      .eq('intervention_id', id)

    // Delete time slots
    await supabase
      .from('intervention_time_slots')
      .delete()
      .eq('intervention_id', id)

    // Delete conversation messages + participants + threads
    const { data: threads } = await supabase
      .from('conversation_threads')
      .select('id')
      .eq('intervention_id', id)

    if (threads) {
      for (const thread of threads) {
        await supabase.from('conversation_messages').delete().eq('thread_id', thread.id)
        await supabase.from('conversation_participants').delete().eq('thread_id', thread.id)
      }
      await supabase.from('conversation_threads').delete().eq('intervention_id', id)
    }

    // Delete notifications
    await supabase
      .from('notifications')
      .delete()
      .eq('entity_type', 'intervention')
      .eq('entity_id', id)

    // Delete activity logs
    await supabase
      .from('activity_logs')
      .delete()
      .eq('entity_type', 'intervention')
      .eq('entity_id', id)
  }

  // Finally delete the interventions themselves
  const { error } = await supabase
    .from('interventions')
    .delete()
    .in('id', createdInterventionIds)

  if (error) {
    console.warn(`Failed to cleanup test interventions: ${error.message}`)
  }

  // Clear tracking array
  createdInterventionIds.length = 0
}

/**
 * Get a provider contact ID from the test team
 */
export async function getTestProviderId(teamId: string): Promise<string> {
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('team_id', teamId)
    .eq('role', 'prestataire')
    .is('deleted_at', null)
    .limit(1)
    .single()

  if (error || !data) throw new Error(`Failed to get test provider ID: ${error?.message}`)
  return data.id
}

/**
 * Get a locataire (tenant) contact ID from the test team
 */
export async function getTestLocataireId(teamId: string): Promise<string> {
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('team_id', teamId)
    .eq('role', 'locataire')
    .is('deleted_at', null)
    .limit(1)
    .single()

  if (error || !data) throw new Error(`Failed to get test locataire ID: ${error?.message}`)
  return data.id
}

// ═══════════════════════════════════════════════════════════
// Assignment helpers
// ═══════════════════════════════════════════════════════════

/**
 * Assign a user (provider, locataire, gestionnaire) to an intervention
 */
export async function assignTestUser(opts: {
  interventionId: string
  userId: string
  role: 'prestataire' | 'locataire' | 'gestionnaire' | 'proprietaire'
  isPrimary?: boolean
  assignedBy?: string
  requiresConfirmation?: boolean
}) {
  const { data, error } = await supabase
    .from('intervention_assignments')
    .insert({
      intervention_id: opts.interventionId,
      user_id: opts.userId,
      role: opts.role,
      is_primary: opts.isPrimary ?? true,
      assigned_by: opts.assignedBy || null,
      requires_confirmation: opts.requiresConfirmation ?? false,
      confirmation_status: opts.requiresConfirmation ? 'pending' : 'not_required',
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to assign user (${opts.role}): ${error.message}`)
  return data
}

// ═══════════════════════════════════════════════════════════
// Time Slot helpers
// ═══════════════════════════════════════════════════════════

/**
 * Create a time slot for an intervention
 */
export async function createTestTimeSlot(opts: {
  interventionId: string
  teamId: string
  proposedBy?: string
  providerId?: string
  slotDate?: string
  startTime?: string
  endTime?: string
  status?: 'requested' | 'pending' | 'selected' | 'rejected' | 'cancelled'
}) {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const dateStr = opts.slotDate || tomorrow.toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('intervention_time_slots')
    .insert({
      intervention_id: opts.interventionId,
      team_id: opts.teamId,
      proposed_by: opts.proposedBy || null,
      provider_id: opts.providerId || null,
      slot_date: dateStr,
      start_time: opts.startTime || '09:00',
      end_time: opts.endTime || '12:00',
      status: opts.status || 'pending',
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create time slot: ${error.message}`)
  return data
}

/**
 * Get time slots for an intervention
 */
export async function getInterventionTimeSlots(interventionId: string) {
  const { data, error } = await supabase
    .from('intervention_time_slots')
    .select('*')
    .eq('intervention_id', interventionId)

  if (error) throw new Error(`Failed to get time slots: ${error.message}`)
  return data || []
}

// ═══════════════════════════════════════════════════════════
// Conversation helpers
// ═══════════════════════════════════════════════════════════

/**
 * Create a conversation thread for an intervention
 */
export async function createTestConversationThread(opts: {
  interventionId: string
  teamId: string
  createdBy: string
  threadType: 'group' | 'tenant_to_managers' | 'provider_to_managers'
  participantIds?: string[]
}) {
  const { data: thread, error } = await supabase
    .from('conversation_threads')
    .insert({
      intervention_id: opts.interventionId,
      team_id: opts.teamId,
      created_by: opts.createdBy,
      thread_type: opts.threadType,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create conversation thread: ${error.message}`)

  // Add participants if provided
  if (opts.participantIds && opts.participantIds.length > 0) {
    const participants = opts.participantIds.map(userId => ({
      thread_id: thread.id,
      user_id: userId,
    }))
    const { error: pError } = await supabase
      .from('conversation_participants')
      .insert(participants)
    if (pError) throw new Error(`Failed to add participants: ${pError.message}`)
  }

  return thread
}

// ═══════════════════════════════════════════════════════════
// Quote helpers
// ═══════════════════════════════════════════════════════════

/**
 * Create a test quote for an intervention
 */
export async function createTestQuote(opts: {
  interventionId: string
  providerId: string
  teamId: string
  createdBy: string
  status?: 'draft' | 'pending' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'cancelled'
  quoteType?: 'estimation' | 'final'
  amount?: number
  description?: string
}) {
  const { data, error } = await supabase
    .from('intervention_quotes')
    .insert({
      intervention_id: opts.interventionId,
      provider_id: opts.providerId,
      team_id: opts.teamId,
      created_by: opts.createdBy,
      quote_type: opts.quoteType || 'estimation',
      amount: opts.amount ?? 0,
      status: opts.status || 'pending',
      description: opts.description || null,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create test quote: ${error.message}`)
  return data
}

// ═══════════════════════════════════════════════════════════
// Lot contact helpers (for locataire RLS visibility)
// ═══════════════════════════════════════════════════════════

/**
 * Ensure a lot_contacts entry exists for a user on a lot.
 * Uses upsert to be idempotent (UNIQUE constraint on lot_id + user_id).
 *
 * Required for locataire RLS: get_accessible_intervention_ids() checks
 * lot_contacts for interventions with lot_id NOT NULL.
 */
export async function ensureLotContact(opts: {
  lotId: string
  userId: string
  role?: string
  isPrimary?: boolean
}) {
  const { error } = await supabase
    .from('lot_contacts')
    .upsert(
      {
        lot_id: opts.lotId,
        user_id: opts.userId,
        role: opts.role || 'locataire',
        is_primary: opts.isPrimary ?? false,
      },
      { onConflict: 'lot_id,user_id' },
    )

  if (error) throw new Error(`Failed to ensure lot contact: ${error.message}`)
}

// ═══════════════════════════════════════════════════════════
// Composite factory: full intervention with all relations
// ═══════════════════════════════════════════════════════════

/**
 * Create a fully populated test intervention with assignments,
 * time slots, conversations, and optionally quotes.
 *
 * This mimics what the real application creates when a gestionnaire
 * creates an intervention and assigns contacts.
 */
export async function createFullTestIntervention(opts: {
  teamId: string
  lotId: string
  createdBy: string
  status?: string
  title?: string
  providerId?: string
  locataireId?: string
  withTimeSlots?: boolean
  withQuote?: boolean
  withConversations?: boolean
}) {
  // 1. Create the intervention
  const intervention = await createTestIntervention({
    teamId: opts.teamId,
    lotId: opts.lotId,
    createdBy: opts.createdBy,
    status: opts.status || 'demande',
    title: opts.title || `Full Test Intervention ${Date.now()}`,
  })

  // 2. Assign gestionnaire
  await assignTestUser({
    interventionId: intervention.id,
    userId: opts.createdBy,
    role: 'gestionnaire',
    isPrimary: true,
    assignedBy: opts.createdBy,
  })

  // 3. Assign provider if provided
  if (opts.providerId) {
    await assignTestUser({
      interventionId: intervention.id,
      userId: opts.providerId,
      role: 'prestataire',
      isPrimary: true,
      assignedBy: opts.createdBy,
    })
  }

  // 4. Assign locataire if provided
  if (opts.locataireId) {
    await assignTestUser({
      interventionId: intervention.id,
      userId: opts.locataireId,
      role: 'locataire',
      isPrimary: true,
      assignedBy: opts.createdBy,
    })
    // Ensure lot_contacts entry exists so locataire RLS can see the intervention.
    // get_accessible_intervention_ids() checks lot_contacts for lot_id NOT NULL.
    if (opts.lotId) {
      await ensureLotContact({
        lotId: opts.lotId,
        userId: opts.locataireId,
        role: 'locataire',
        isPrimary: true,
      })
    }
  }

  // 5. Create conversation threads if requested
  if (opts.withConversations !== false) {
    const participantIds = [opts.createdBy]
    if (opts.providerId) participantIds.push(opts.providerId)
    if (opts.locataireId) participantIds.push(opts.locataireId)

    // Provider-to-managers thread
    if (opts.providerId) {
      await createTestConversationThread({
        interventionId: intervention.id,
        teamId: opts.teamId,
        createdBy: opts.createdBy,
        threadType: 'provider_to_managers',
        participantIds: [opts.createdBy, opts.providerId],
      })
    }

    // Tenant-to-managers thread
    if (opts.locataireId) {
      await createTestConversationThread({
        interventionId: intervention.id,
        teamId: opts.teamId,
        createdBy: opts.createdBy,
        threadType: 'tenant_to_managers',
        participantIds: [opts.createdBy, opts.locataireId],
      })
    }

    // Group thread (all participants)
    await createTestConversationThread({
      interventionId: intervention.id,
      teamId: opts.teamId,
      createdBy: opts.createdBy,
      threadType: 'group',
      participantIds,
    })
  }

  // 6. Create time slots if requested
  if (opts.withTimeSlots) {
    await createTestTimeSlot({
      interventionId: intervention.id,
      teamId: opts.teamId,
      proposedBy: opts.createdBy,
      providerId: opts.providerId || null,
      status: 'pending',
    })
    // Add a second slot for variety
    await createTestTimeSlot({
      interventionId: intervention.id,
      teamId: opts.teamId,
      proposedBy: opts.createdBy,
      providerId: opts.providerId || null,
      slotDate: (() => {
        const d = new Date()
        d.setDate(d.getDate() + 2)
        return d.toISOString().split('T')[0]
      })(),
      startTime: '14:00',
      endTime: '17:00',
      status: 'pending',
    })
  }

  // 7. Create quote if requested
  if (opts.withQuote && opts.providerId) {
    await createTestQuote({
      interventionId: intervention.id,
      providerId: opts.providerId,
      teamId: opts.teamId,
      createdBy: opts.createdBy,
      status: 'pending',
    })
  }

  return intervention
}
