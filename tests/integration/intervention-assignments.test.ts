/**
 * Integration tests: Provider assignment + conversations
 *
 * Tests direct DB operations for:
 * - Assigning providers to interventions
 * - Verifying conversation threads are created
 * - Assignment modes (single)
 */

import { describe, it, expect, afterAll, beforeAll } from 'vitest'
import { createTestSupabaseClient } from './helpers/supabase-client'
import {
  createTestIntervention,
  getTestTeamId,
  getTestLotId,
  getTestUserId,
  getTestProviderId,
  getInterventionAssignments,
  getInterventionThreads,
  cleanupTestInterventions,
} from './helpers/test-data'

const supabase = createTestSupabaseClient()

let teamId: string
let lotId: string
let gestUserId: string
let providerId: string

describe('intervention assignments', () => {
  beforeAll(async () => {
    teamId = await getTestTeamId()
    lotId = await getTestLotId(teamId)
    gestUserId = await getTestUserId('arthur@seido-app.com')
    providerId = await getTestProviderId(teamId)
  })

  afterAll(async () => {
    await cleanupTestInterventions()
  })

  describe('provider assignment', () => {
    it('assigns a provider to an intervention', async () => {
      const intervention = await createTestIntervention({
        teamId,
        lotId,
        status: 'approuvee',
        title: 'Assignment: single provider',
      })

      // Create assignment directly in DB
      const { error } = await supabase
        .from('intervention_assignments')
        .insert({
          intervention_id: intervention.id,
          user_id: providerId,
          role: 'prestataire',
        })

      expect(error).toBeNull()

      const assignments = await getInterventionAssignments(intervention.id)
      expect(assignments.length).toBe(1)
      expect(assignments[0].user_id).toBe(providerId)
      expect(assignments[0].role).toBe('prestataire')
    })

    it('allows multiple provider assignments', async () => {
      const intervention = await createTestIntervention({
        teamId,
        lotId,
        status: 'approuvee',
        title: 'Assignment: multiple providers',
      })

      // Get a second provider (if available) or reuse the same one
      const { data: providers } = await supabase
        .from('users')
        .select('id')
        .eq('team_id', teamId)
        .eq('role', 'prestataire')
        .is('deleted_at', null)
        .limit(2)

      const providerIds = providers?.map(p => p.id) || [providerId]

      for (const pid of providerIds) {
        await supabase
          .from('intervention_assignments')
          .insert({
            intervention_id: intervention.id,
            user_id: pid,
            role: 'prestataire',
          })
      }

      const assignments = await getInterventionAssignments(intervention.id)
      expect(assignments.length).toBe(providerIds.length)
    })

    it('deletes assignment when unassigned', async () => {
      const intervention = await createTestIntervention({
        teamId,
        lotId,
        status: 'approuvee',
        title: 'Assignment: unassign test',
      })

      // Create assignment
      const { data: assignment } = await supabase
        .from('intervention_assignments')
        .insert({
          intervention_id: intervention.id,
          user_id: providerId,
          role: 'prestataire',
        })
        .select()
        .single()

      // Hard delete (no soft-delete column on this table)
      await supabase
        .from('intervention_assignments')
        .delete()
        .eq('id', assignment!.id)

      const assignments = await getInterventionAssignments(intervention.id)
      expect(assignments.length).toBe(0)
    })
  })

  describe('gestionnaire assignment', () => {
    it('assigns a gestionnaire to an intervention', async () => {
      const intervention = await createTestIntervention({
        teamId,
        lotId,
        status: 'demande',
        title: 'Assignment: gestionnaire',
      })

      const { error } = await supabase
        .from('intervention_assignments')
        .insert({
          intervention_id: intervention.id,
          user_id: gestUserId,
          role: 'gestionnaire',
        })

      expect(error).toBeNull()

      const assignments = await getInterventionAssignments(intervention.id)
      const gestAssignment = assignments.find(a => a.role === 'gestionnaire')
      expect(gestAssignment).toBeDefined()
      expect(gestAssignment!.user_id).toBe(gestUserId)
    })
  })

  describe('assignment with confirmation', () => {
    it('creates assignment with pending confirmation status', async () => {
      const intervention = await createTestIntervention({
        teamId,
        lotId,
        status: 'planification',
        title: 'Assignment: with confirmation',
      })

      const { error } = await supabase
        .from('intervention_assignments')
        .insert({
          intervention_id: intervention.id,
          user_id: providerId,
          role: 'prestataire',
          requires_confirmation: true,
          confirmation_status: 'pending',
        })

      expect(error).toBeNull()

      const assignments = await getInterventionAssignments(intervention.id)
      expect(assignments[0].requires_confirmation).toBe(true)
      expect(assignments[0].confirmation_status).toBe('pending')
    })

    it('updates confirmation status to confirmed', async () => {
      const intervention = await createTestIntervention({
        teamId,
        lotId,
        status: 'planification',
        title: 'Assignment: confirm',
      })

      const { data: assignment } = await supabase
        .from('intervention_assignments')
        .insert({
          intervention_id: intervention.id,
          user_id: providerId,
          role: 'prestataire',
          requires_confirmation: true,
          confirmation_status: 'pending',
        })
        .select()
        .single()

      // Confirm
      await supabase
        .from('intervention_assignments')
        .update({ confirmation_status: 'confirmed' })
        .eq('id', assignment!.id)

      const assignments = await getInterventionAssignments(intervention.id)
      expect(assignments[0].confirmation_status).toBe('confirmed')
    })
  })
})
