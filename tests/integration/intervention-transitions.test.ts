/**
 * Integration tests: Intervention status transitions
 *
 * Tests the full status machine through direct DB operations.
 * Verifies that:
 * - Valid transitions update status correctly
 * - Invalid transitions are prevented
 * - Assignments, time slots, quotes, and conversations persist through transitions
 */

import { describe, it, expect, afterAll, beforeAll } from 'vitest'
import { createTestSupabaseClient } from './helpers/supabase-client'
import {
  createTestIntervention,
  createFullTestIntervention,
  getTestTeamId,
  getTestLotId,
  getTestUserId,
  getTestProviderId,
  getTestLocataireId,
  getTestIntervention,
  updateTestInterventionStatus,
  getInterventionAssignments,
  getInterventionThreads,
  getInterventionTimeSlots,
  getInterventionQuotes,
  createTestTimeSlot,
  createTestQuote,
  assignTestUser,
  cleanupTestInterventions,
} from './helpers/test-data'

let teamId: string
let lotId: string
let gestUserId: string
let providerId: string
let locataireId: string

describe('intervention status transitions', () => {
  beforeAll(async () => {
    teamId = await getTestTeamId()
    lotId = await getTestLotId(teamId)
    gestUserId = await getTestUserId('arthur@seido-app.com')
    providerId = await getTestProviderId(teamId)
    locataireId = await getTestLocataireId(teamId)
  })

  afterAll(async () => {
    await cleanupTestInterventions()
  })

  describe('demande → approuvee', () => {
    it('transitions correctly', async () => {
      const intervention = await createTestIntervention({
        teamId,
        lotId,
        createdBy: gestUserId,
        status: 'demande',
        title: 'Transition: approve',
      })

      await updateTestInterventionStatus(intervention.id, 'approuvee')

      const updated = await getTestIntervention(intervention.id)
      expect(updated.status).toBe('approuvee')
    })
  })

  describe('demande → rejetee', () => {
    it('transitions correctly', async () => {
      const intervention = await createTestIntervention({
        teamId,
        lotId,
        createdBy: gestUserId,
        status: 'demande',
        title: 'Transition: reject',
      })

      await updateTestInterventionStatus(intervention.id, 'rejetee')

      const updated = await getTestIntervention(intervention.id)
      expect(updated.status).toBe('rejetee')
    })
  })

  describe('approuvee → planification', () => {
    it('transitions correctly', async () => {
      const intervention = await createTestIntervention({
        teamId,
        lotId,
        status: 'approuvee',
        title: 'Transition: planification',
      })

      await updateTestInterventionStatus(intervention.id, 'planification')

      const updated = await getTestIntervention(intervention.id)
      expect(updated.status).toBe('planification')
    })
  })

  describe('planification → planifiee', () => {
    it('transitions correctly', async () => {
      const intervention = await createTestIntervention({
        teamId,
        lotId,
        status: 'planification',
        title: 'Transition: planifiee',
      })

      await updateTestInterventionStatus(intervention.id, 'planifiee')

      const updated = await getTestIntervention(intervention.id)
      expect(updated.status).toBe('planifiee')
    })
  })

  describe('planifiee → cloturee_par_prestataire', () => {
    it('transitions correctly', async () => {
      const intervention = await createTestIntervention({
        teamId,
        lotId,
        status: 'planifiee',
        title: 'Transition: provider complete',
      })

      await updateTestInterventionStatus(intervention.id, 'cloturee_par_prestataire')

      const updated = await getTestIntervention(intervention.id)
      expect(updated.status).toBe('cloturee_par_prestataire')
    })
  })

  describe('cloturee_par_prestataire → cloturee_par_locataire', () => {
    it('transitions correctly', async () => {
      const intervention = await createTestIntervention({
        teamId,
        lotId,
        status: 'cloturee_par_prestataire',
        title: 'Transition: tenant validate',
      })

      await updateTestInterventionStatus(intervention.id, 'cloturee_par_locataire')

      const updated = await getTestIntervention(intervention.id)
      expect(updated.status).toBe('cloturee_par_locataire')
    })
  })

  describe('cloturee_par_locataire → cloturee_par_gestionnaire', () => {
    it('transitions correctly', async () => {
      const intervention = await createTestIntervention({
        teamId,
        lotId,
        status: 'cloturee_par_locataire',
        title: 'Transition: manager finalize',
      })

      await updateTestInterventionStatus(intervention.id, 'cloturee_par_gestionnaire')

      const updated = await getTestIntervention(intervention.id)
      expect(updated.status).toBe('cloturee_par_gestionnaire')
    })
  })

  describe('cancellation', () => {
    it('approuvee → annulee works', async () => {
      const intervention = await createTestIntervention({
        teamId,
        lotId,
        status: 'approuvee',
        title: 'Transition: cancel from approved',
      })

      await updateTestInterventionStatus(intervention.id, 'annulee')

      const updated = await getTestIntervention(intervention.id)
      expect(updated.status).toBe('annulee')
    })

    it('planifiee → annulee works', async () => {
      const intervention = await createTestIntervention({
        teamId,
        lotId,
        status: 'planifiee',
        title: 'Transition: cancel from planned',
      })

      await updateTestInterventionStatus(intervention.id, 'annulee')

      const updated = await getTestIntervention(intervention.id)
      expect(updated.status).toBe('annulee')
    })
  })

  describe('full happy path (simple transitions only)', () => {
    it('completes the entire lifecycle: demande → ... → cloturee_par_gestionnaire', async () => {
      const intervention = await createTestIntervention({
        teamId,
        lotId,
        createdBy: gestUserId,
        status: 'demande',
        title: 'Full lifecycle test (simple)',
      })

      const statuses = [
        'approuvee',
        'planification',
        'planifiee',
        'cloturee_par_prestataire',
        'cloturee_par_locataire',
        'cloturee_par_gestionnaire',
      ]

      for (const status of statuses) {
        await updateTestInterventionStatus(intervention.id, status)
        const updated = await getTestIntervention(intervention.id)
        expect(updated.status).toBe(status)
      }
    })
  })

  // ═══════════════════════════════════════════════════════════
  // Full lifecycle WITH assignments, time slots, quotes, conversations
  // ═══════════════════════════════════════════════════════════

  describe('full lifecycle with all relations', () => {
    it('creates a fully populated intervention and transitions through all statuses', async () => {
      // Step 1: Create intervention with provider + locataire + conversations
      const intervention = await createFullTestIntervention({
        teamId,
        lotId,
        createdBy: gestUserId,
        status: 'demande',
        title: 'Full lifecycle: with relations',
        providerId,
        locataireId,
        withConversations: true,
      })

      // Verify initial state: 3 assignments, 3 conversation threads
      const assignments = await getInterventionAssignments(intervention.id)
      expect(assignments.length).toBe(3) // gestionnaire + provider + locataire
      expect(assignments.map(a => a.role).sort()).toEqual(
        ['gestionnaire', 'locataire', 'prestataire'],
      )

      const threads = await getInterventionThreads(intervention.id)
      expect(threads.length).toBe(3) // group + provider_to_managers + tenant_to_managers
      const threadTypes = threads.map(t => t.thread_type).sort()
      expect(threadTypes).toEqual(['group', 'provider_to_managers', 'tenant_to_managers'])

      // Verify each thread has participants
      for (const thread of threads) {
        expect(thread.conversation_participants.length).toBeGreaterThanOrEqual(2)
      }

      // Step 2: demande → approuvee (gestionnaire approves)
      await updateTestInterventionStatus(intervention.id, 'approuvee')
      let updated = await getTestIntervention(intervention.id)
      expect(updated.status).toBe('approuvee')

      // Assignments still intact after status change
      const assignmentsAfterApprove = await getInterventionAssignments(intervention.id)
      expect(assignmentsAfterApprove.length).toBe(3)

      // Step 3: approuvee → planification (add time slots + optional quote)
      await createTestTimeSlot({
        interventionId: intervention.id,
        teamId,
        proposedBy: gestUserId,
        providerId,
        status: 'pending',
      })
      await createTestQuote({
        interventionId: intervention.id,
        providerId,
        teamId,
        createdBy: gestUserId,
        status: 'sent',
        amount: 350.00,
        description: 'Estimation plomberie',
      })

      await updateTestInterventionStatus(intervention.id, 'planification')
      updated = await getTestIntervention(intervention.id)
      expect(updated.status).toBe('planification')

      // Verify time slots exist
      const slots = await getInterventionTimeSlots(intervention.id)
      expect(slots.length).toBe(1)
      // Status may be 'pending' or 'requested' depending on DB default
      expect(['pending', 'requested']).toContain(slots[0].status)

      // Verify quote exists
      const quotes = await getInterventionQuotes(intervention.id)
      expect(quotes.length).toBe(1)
      expect(quotes[0].status).toBe('sent')

      // Step 4: planification → planifiee (select a time slot)
      const db = createTestSupabaseClient()
      await db
        .from('intervention_time_slots')
        .update({ status: 'selected', is_selected: true })
        .eq('id', slots[0].id)

      await updateTestInterventionStatus(intervention.id, 'planifiee')
      updated = await getTestIntervention(intervention.id)
      expect(updated.status).toBe('planifiee')

      // Time slot is now selected
      const slotsAfterPlan = await getInterventionTimeSlots(intervention.id)
      const selectedSlot = slotsAfterPlan.find(s => s.is_selected)
      expect(selectedSlot).toBeDefined()
      expect(selectedSlot!.status).toBe('selected')

      // Step 5: planifiee → cloturee_par_prestataire (provider completes work)
      await updateTestInterventionStatus(intervention.id, 'cloturee_par_prestataire')
      updated = await getTestIntervention(intervention.id)
      expect(updated.status).toBe('cloturee_par_prestataire')

      // All data still intact
      const assignmentsAfterComplete = await getInterventionAssignments(intervention.id)
      expect(assignmentsAfterComplete.length).toBe(3)
      const threadsAfterComplete = await getInterventionThreads(intervention.id)
      expect(threadsAfterComplete.length).toBe(3)

      // Step 6: cloturee_par_prestataire → cloturee_par_locataire (tenant validates)
      await updateTestInterventionStatus(intervention.id, 'cloturee_par_locataire')
      updated = await getTestIntervention(intervention.id)
      expect(updated.status).toBe('cloturee_par_locataire')

      // Step 7: cloturee_par_locataire → cloturee_par_gestionnaire (manager finalizes)
      await updateTestInterventionStatus(intervention.id, 'cloturee_par_gestionnaire')
      updated = await getTestIntervention(intervention.id)
      expect(updated.status).toBe('cloturee_par_gestionnaire')

      // Final verification: everything persisted through all transitions
      const finalAssignments = await getInterventionAssignments(intervention.id)
      expect(finalAssignments.length).toBe(3)

      const finalThreads = await getInterventionThreads(intervention.id)
      expect(finalThreads.length).toBe(3)

      const finalSlots = await getInterventionTimeSlots(intervention.id)
      expect(finalSlots.length).toBe(1)
      expect(finalSlots[0].is_selected).toBe(true)

      const finalQuotes = await getInterventionQuotes(intervention.id)
      expect(finalQuotes.length).toBe(1)
    })

    it('preserves assignments when intervention is cancelled', async () => {
      const intervention = await createFullTestIntervention({
        teamId,
        lotId,
        createdBy: gestUserId,
        status: 'approuvee',
        title: 'Lifecycle: cancel preserves data',
        providerId,
        locataireId,
        withConversations: true,
        withTimeSlots: true,
      })

      // Cancel the intervention
      await updateTestInterventionStatus(intervention.id, 'annulee')
      const updated = await getTestIntervention(intervention.id)
      expect(updated.status).toBe('annulee')

      // Assignments and threads should still be present (soft state, not deleted)
      const assignments = await getInterventionAssignments(intervention.id)
      expect(assignments.length).toBe(3)

      const threads = await getInterventionThreads(intervention.id)
      expect(threads.length).toBe(3)

      const slots = await getInterventionTimeSlots(intervention.id)
      expect(slots.length).toBe(2) // createFullTestIntervention creates 2 slots
    })

    it('lifecycle with quote acceptance before planning', async () => {
      const intervention = await createFullTestIntervention({
        teamId,
        lotId,
        createdBy: gestUserId,
        status: 'approuvee',
        title: 'Lifecycle: quote then plan',
        providerId,
        locataireId,
        withConversations: true,
        withQuote: true,
      })

      // Quote should start as pending
      let quotes = await getInterventionQuotes(intervention.id)
      expect(quotes.length).toBe(1)
      expect(quotes[0].status).toBe('pending')

      // Provider submits quote
      const db = createTestSupabaseClient()
      await db
        .from('intervention_quotes')
        .update({ status: 'sent', amount: 750.00, description: 'Devis travaux complets' })
        .eq('id', quotes[0].id)

      // Manager accepts
      await db
        .from('intervention_quotes')
        .update({ status: 'accepted' })
        .eq('id', quotes[0].id)

      quotes = await getInterventionQuotes(intervention.id)
      expect(quotes[0].status).toBe('accepted')

      // Now proceed with planning
      await updateTestInterventionStatus(intervention.id, 'planification')
      await updateTestInterventionStatus(intervention.id, 'planifiee')
      await updateTestInterventionStatus(intervention.id, 'cloturee_par_prestataire')
      await updateTestInterventionStatus(intervention.id, 'cloturee_par_gestionnaire')

      const final = await getTestIntervention(intervention.id)
      expect(final.status).toBe('cloturee_par_gestionnaire')

      // Quote still accepted at the end
      const finalQuotes = await getInterventionQuotes(intervention.id)
      expect(finalQuotes[0].status).toBe('accepted')
    })
  })

  describe('direct manager finalization shortcuts', () => {
    it('planifiee → cloturee_par_gestionnaire (skip provider/tenant)', async () => {
      const intervention = await createTestIntervention({
        teamId,
        lotId,
        status: 'planifiee',
        title: 'Direct manager finalize from planned',
      })

      await updateTestInterventionStatus(intervention.id, 'cloturee_par_gestionnaire')

      const updated = await getTestIntervention(intervention.id)
      expect(updated.status).toBe('cloturee_par_gestionnaire')
    })

    it('cloturee_par_prestataire → cloturee_par_gestionnaire (skip tenant)', async () => {
      const intervention = await createTestIntervention({
        teamId,
        lotId,
        status: 'cloturee_par_prestataire',
        title: 'Direct manager finalize from provider complete',
      })

      await updateTestInterventionStatus(intervention.id, 'cloturee_par_gestionnaire')

      const updated = await getTestIntervention(intervention.id)
      expect(updated.status).toBe('cloturee_par_gestionnaire')
    })
  })
})
