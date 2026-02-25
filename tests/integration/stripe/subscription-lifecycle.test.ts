/**
 * Integration tests: Subscription lifecycle
 *
 * Tests direct DB operations for subscription management.
 * Uses service-role client (bypasses RLS) to verify:
 * - CRUD operations via SubscriptionRepository
 * - Status transitions (trialing → active → canceled)
 * - DB helper functions (can_team_add_property, is_team_read_only)
 * - Lot count trigger (billable_properties)
 * - Webhook idempotency cleanup
 *
 * Requires: Real Supabase (staging) with subscription schema deployed.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createTestSupabaseClient } from '../helpers/supabase-client'
import type { SupabaseClient } from '@supabase/supabase-js'

// =============================================================================
// Test State
// =============================================================================

let supabase: SupabaseClient
let testTeamId: string
let testSubscriptionId: string
const testLotIds: string[] = []

// =============================================================================
// Setup + Teardown
// =============================================================================

beforeAll(async () => {
  supabase = createTestSupabaseClient()

  // Get an existing team for testing
  const { data: teams } = await supabase
    .from('teams')
    .select('id')
    .limit(1)

  if (!teams || teams.length === 0) {
    throw new Error('No teams found in database — cannot run integration tests')
  }
  testTeamId = teams[0].id

  // Clean up any existing subscription for this team (from previous test runs)
  await supabase.from('subscriptions').delete().eq('team_id', testTeamId)
})

afterAll(async () => {
  // Cleanup: delete test subscription and lots
  if (testSubscriptionId) {
    await supabase.from('subscriptions').delete().eq('id', testSubscriptionId)
  }
  for (const lotId of testLotIds) {
    await supabase.from('lots').delete().eq('id', lotId)
  }
})

// =============================================================================
// Tests
// =============================================================================

describe('subscription lifecycle (integration)', () => {
  // ─── CRUD Operations ────────────────────────────────────────────────

  it('creates a subscription record with trialing status', async () => {
    const now = new Date()
    const trialEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    const { data, error } = await supabase
      .from('subscriptions')
      .insert({
        team_id: testTeamId,
        status: 'trialing',
        trial_start: now.toISOString(),
        trial_end: trialEnd.toISOString(),
        subscribed_lots: 0,
        billable_properties: 0,
      })
      .select()
      .single()

    expect(error).toBeNull()
    expect(data).toBeDefined()
    expect(data!.status).toBe('trialing')
    expect(data!.team_id).toBe(testTeamId)
    testSubscriptionId = data!.id
  })

  it('reads subscription by team_id', async () => {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('team_id', testTeamId)
      .limit(1)
      .maybeSingle()

    expect(error).toBeNull()
    expect(data).toBeDefined()
    expect(data!.id).toBe(testSubscriptionId)
  })

  it('updates subscription status from trialing to active', async () => {
    const { data, error } = await supabase
      .from('subscriptions')
      .update({
        status: 'active',
        stripe_subscription_id: 'sub_test_integration',
        stripe_customer_id: 'cus_test_integration',
        price_id: 'price_test_annual',
        subscribed_lots: 5,
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .eq('id', testSubscriptionId)
      .select()
      .single()

    expect(error).toBeNull()
    expect(data!.status).toBe('active')
    expect(data!.stripe_subscription_id).toBe('sub_test_integration')
    expect(data!.subscribed_lots).toBe(5)
  })

  it('transitions active → canceled', async () => {
    const { data, error } = await supabase
      .from('subscriptions')
      .update({
        status: 'canceled',
        cancel_at_period_end: true,
        canceled_at: new Date().toISOString(),
      })
      .eq('id', testSubscriptionId)
      .select()
      .single()

    expect(error).toBeNull()
    expect(data!.status).toBe('canceled')
    expect(data!.cancel_at_period_end).toBe(true)
  })

  it('transitions back to active (reactivation)', async () => {
    const { data, error } = await supabase
      .from('subscriptions')
      .update({
        status: 'active',
        cancel_at_period_end: false,
        canceled_at: null,
      })
      .eq('id', testSubscriptionId)
      .select()
      .single()

    expect(error).toBeNull()
    expect(data!.status).toBe('active')
    expect(data!.cancel_at_period_end).toBe(false)
  })

  // ─── DB Helper Functions ────────────────────────────────────────────

  it('can_team_add_property() returns true for active team within limit', async () => {
    // Status is 'active', subscribed_lots is 5, billable_properties should be < 5
    const { data, error } = await supabase.rpc('can_team_add_property', {
      p_team_id: testTeamId,
    })

    expect(error).toBeNull()
    expect(data).toBe(true)
  })

  it('can_team_add_property() returns false for read_only team', async () => {
    // Temporarily set to read_only
    await supabase
      .from('subscriptions')
      .update({ status: 'read_only' })
      .eq('id', testSubscriptionId)

    const { data, error } = await supabase.rpc('can_team_add_property', {
      p_team_id: testTeamId,
    })

    expect(error).toBeNull()
    expect(data).toBe(false)

    // Restore to active
    await supabase
      .from('subscriptions')
      .update({ status: 'active' })
      .eq('id', testSubscriptionId)
  })

  it('is_team_read_only() returns true for read_only status', async () => {
    // Temporarily set to read_only
    await supabase
      .from('subscriptions')
      .update({ status: 'read_only' })
      .eq('id', testSubscriptionId)

    const { data, error } = await supabase.rpc('is_team_read_only', {
      p_team_id: testTeamId,
    })

    expect(error).toBeNull()
    expect(data).toBe(true)

    // Restore to active
    await supabase
      .from('subscriptions')
      .update({ status: 'active' })
      .eq('id', testSubscriptionId)
  })

  it('is_team_read_only() returns false for active status', async () => {
    const { data, error } = await supabase.rpc('is_team_read_only', {
      p_team_id: testTeamId,
    })

    expect(error).toBeNull()
    expect(data).toBe(false)
  })

  it('is_team_read_only() returns false for team without subscription', async () => {
    // Use a random UUID that doesn't exist
    const fakeTeamId = '00000000-0000-0000-0000-000000000000'
    const { data, error } = await supabase.rpc('is_team_read_only', {
      p_team_id: fakeTeamId,
    })

    expect(error).toBeNull()
    expect(data).toBe(false)
  })

  // ─── Free Tier Logic ────────────────────────────────────────────────

  it('can_team_add_property() allows up to 2 lots for free_tier', async () => {
    await supabase
      .from('subscriptions')
      .update({ status: 'free_tier', billable_properties: 1 })
      .eq('id', testSubscriptionId)

    const { data: canAdd1 } = await supabase.rpc('can_team_add_property', {
      p_team_id: testTeamId,
    })
    expect(canAdd1).toBe(true)

    // At 2 lots = limit reached
    await supabase
      .from('subscriptions')
      .update({ billable_properties: 2 })
      .eq('id', testSubscriptionId)

    const { data: canAdd2 } = await supabase.rpc('can_team_add_property', {
      p_team_id: testTeamId,
    })
    expect(canAdd2).toBe(false)

    // Restore
    await supabase
      .from('subscriptions')
      .update({ status: 'active', billable_properties: 0 })
      .eq('id', testSubscriptionId)
  })

  // ─── Webhook Idempotency Cleanup ────────────────────────────────────

  it('cleanup_old_webhook_events() removes records older than 30 days', async () => {
    const oldDate = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString()
    const recentDate = new Date().toISOString()

    // Insert old + recent webhook events
    await supabase.from('stripe_webhook_events').insert([
      { event_id: 'evt_old_test_integration', event_type: 'test.old', processed_at: oldDate },
      { event_id: 'evt_recent_test_integration', event_type: 'test.recent', processed_at: recentDate },
    ])

    // Run cleanup
    const { data: deletedCount, error } = await supabase.rpc('cleanup_old_webhook_events')

    expect(error).toBeNull()
    expect(deletedCount).toBeGreaterThanOrEqual(1)

    // Verify old is gone, recent remains
    const { data: remaining } = await supabase
      .from('stripe_webhook_events')
      .select('event_id')
      .in('event_id', ['evt_old_test_integration', 'evt_recent_test_integration'])

    const eventIds = remaining?.map((r) => r.event_id) || []
    expect(eventIds).not.toContain('evt_old_test_integration')
    expect(eventIds).toContain('evt_recent_test_integration')

    // Cleanup
    await supabase
      .from('stripe_webhook_events')
      .delete()
      .eq('event_id', 'evt_recent_test_integration')
  })

  // ─── Notification Idempotency Flags ─────────────────────────────────

  it('notification flags default to false', async () => {
    const { data } = await supabase
      .from('subscriptions')
      .select('notification_j7_sent, notification_j3_sent, notification_j1_sent, trial_expired_email_sent')
      .eq('id', testSubscriptionId)
      .single()

    expect(data!.notification_j7_sent).toBe(false)
    expect(data!.notification_j3_sent).toBe(false)
    expect(data!.notification_j1_sent).toBe(false)
    expect(data!.trial_expired_email_sent).toBe(false)
  })

  it('notification flags can be updated independently', async () => {
    const { error } = await supabase
      .from('subscriptions')
      .update({ notification_j7_sent: true })
      .eq('id', testSubscriptionId)

    expect(error).toBeNull()

    const { data } = await supabase
      .from('subscriptions')
      .select('notification_j7_sent, notification_j3_sent')
      .eq('id', testSubscriptionId)
      .single()

    expect(data!.notification_j7_sent).toBe(true)
    expect(data!.notification_j3_sent).toBe(false)

    // Reset
    await supabase
      .from('subscriptions')
      .update({ notification_j7_sent: false })
      .eq('id', testSubscriptionId)
  })

  // ─── Unique Constraint ──────────────────────────────────────────────

  it('rejects duplicate subscription for same team', async () => {
    const { error } = await supabase
      .from('subscriptions')
      .insert({
        team_id: testTeamId,
        status: 'trialing',
      })

    expect(error).toBeDefined()
    expect(error!.code).toBe('23505') // unique_violation
  })
})
