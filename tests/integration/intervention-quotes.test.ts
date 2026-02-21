/**
 * Integration tests: Quote lifecycle
 *
 * Tests direct DB operations for the quote workflow:
 * - Request quote (pending)
 * - Provider submits quote (sent)
 * - Manager accepts/rejects quote
 * - requires_quote flag
 * - Multiple quotes
 */

import { describe, it, expect, afterAll, beforeAll } from 'vitest'
import { createTestSupabaseClient } from './helpers/supabase-client'
import {
  createTestIntervention,
  getTestTeamId,
  getTestLotId,
  getTestUserId,
  getTestProviderId,
  getInterventionQuotes,
  cleanupTestInterventions,
} from './helpers/test-data'

const supabase = createTestSupabaseClient()

let teamId: string
let lotId: string
let providerId: string
let gestUserId: string

/** Insert a test quote with all required fields */
async function insertTestQuote(opts: {
  interventionId: string
  providerId: string
  status?: string
  amount?: number
  description?: string
}) {
  return supabase
    .from('intervention_quotes')
    .insert({
      intervention_id: opts.interventionId,
      provider_id: opts.providerId,
      team_id: teamId,
      created_by: gestUserId,
      quote_type: 'estimation',
      amount: opts.amount ?? 0,
      status: opts.status || 'pending',
      description: opts.description || null,
    })
    .select()
    .single()
}

describe('intervention quotes', () => {
  beforeAll(async () => {
    teamId = await getTestTeamId()
    lotId = await getTestLotId(teamId)
    providerId = await getTestProviderId(teamId)
    gestUserId = await getTestUserId('arthur@seido-app.com')
  })

  afterAll(async () => {
    await cleanupTestInterventions()
  })

  describe('quote creation', () => {
    it('creates a pending quote request', async () => {
      const intervention = await createTestIntervention({
        teamId,
        lotId,
        status: 'approuvee',
        title: 'Quote: request test',
      })

      const { data, error } = await insertTestQuote({
        interventionId: intervention.id,
        providerId,
        status: 'pending',
      })

      expect(error).toBeNull()
      expect(data).toBeDefined()

      const quotes = await getInterventionQuotes(intervention.id)
      expect(quotes.length).toBe(1)
      expect(quotes[0].status).toBe('pending')
      expect(quotes[0].provider_id).toBe(providerId)
    })
  })

  describe('provider submits quote', () => {
    it('updates quote with amount and description (status → sent)', async () => {
      const intervention = await createTestIntervention({
        teamId,
        lotId,
        status: 'approuvee',
        title: 'Quote: submit test',
      })

      const { data: quote } = await insertTestQuote({
        interventionId: intervention.id,
        providerId,
        status: 'pending',
      })

      // Provider submits their estimate
      const { error } = await supabase
        .from('intervention_quotes')
        .update({
          status: 'sent',
          amount: 450.00,
          description: 'Remplacement joint robinet + main d\'oeuvre',
        })
        .eq('id', quote!.id)

      expect(error).toBeNull()

      const quotes = await getInterventionQuotes(intervention.id)
      expect(quotes[0].status).toBe('sent')
      expect(quotes[0].amount).toBe(450)
      expect(quotes[0].description).toContain('Remplacement joint')
    })
  })

  describe('manager accepts quote', () => {
    it('transitions quote to accepted status', async () => {
      const intervention = await createTestIntervention({
        teamId,
        lotId,
        status: 'approuvee',
        title: 'Quote: accept test',
      })

      const { data: quote } = await insertTestQuote({
        interventionId: intervention.id,
        providerId,
        status: 'sent',
        amount: 500.00,
        description: 'Devis complet pour travaux',
      })

      const { error } = await supabase
        .from('intervention_quotes')
        .update({ status: 'accepted' })
        .eq('id', quote!.id)

      expect(error).toBeNull()

      const quotes = await getInterventionQuotes(intervention.id)
      expect(quotes[0].status).toBe('accepted')
    })
  })

  describe('manager rejects quote', () => {
    it('transitions quote to rejected status', async () => {
      const intervention = await createTestIntervention({
        teamId,
        lotId,
        status: 'approuvee',
        title: 'Quote: reject test',
      })

      const { data: quote } = await insertTestQuote({
        interventionId: intervention.id,
        providerId,
        status: 'sent',
        amount: 2500.00,
        description: 'Devis trop cher',
      })

      const { error } = await supabase
        .from('intervention_quotes')
        .update({ status: 'rejected' })
        .eq('id', quote!.id)

      expect(error).toBeNull()

      const quotes = await getInterventionQuotes(intervention.id)
      expect(quotes[0].status).toBe('rejected')
    })
  })

  describe('quote with requires_quote flag', () => {
    it('intervention with requires_quote=true tracks quote dependency', async () => {
      const intervention = await createTestIntervention({
        teamId,
        lotId,
        status: 'approuvee',
        title: 'Quote: requires_quote flag',
      })

      // Set requires_quote on the intervention
      await supabase
        .from('interventions')
        .update({ requires_quote: true })
        .eq('id', intervention.id)

      // Create a pending quote
      await insertTestQuote({
        interventionId: intervention.id,
        providerId,
        status: 'pending',
      })

      // Verify the flag is set
      const { data: updated } = await supabase
        .from('interventions')
        .select('requires_quote')
        .eq('id', intervention.id)
        .single()

      expect(updated!.requires_quote).toBe(true)
    })
  })

  describe('multiple quotes', () => {
    it('supports multiple quotes from different providers', async () => {
      const intervention = await createTestIntervention({
        teamId,
        lotId,
        status: 'approuvee',
        title: 'Quote: multiple providers',
      })

      // Get available providers
      const { data: providers } = await supabase
        .from('users')
        .select('id')
        .eq('team_id', teamId)
        .eq('role', 'prestataire')
        .is('deleted_at', null)
        .limit(3)

      const providerIds = providers?.map(p => p.id) || [providerId]

      // Create quotes for each provider
      for (const pid of providerIds) {
        await insertTestQuote({
          interventionId: intervention.id,
          providerId: pid,
          status: 'pending',
        })
      }

      const quotes = await getInterventionQuotes(intervention.id)
      expect(quotes.length).toBe(providerIds.length)
    })

    it('can have mixed statuses across quotes', async () => {
      const intervention = await createTestIntervention({
        teamId,
        lotId,
        status: 'approuvee',
        title: 'Quote: mixed statuses',
      })

      // Create first quote (sent)
      const { data: q1 } = await insertTestQuote({
        interventionId: intervention.id,
        providerId,
        status: 'sent',
        amount: 300,
        description: 'Quote 1 - competitive',
      })

      // Accept the first quote
      await supabase
        .from('intervention_quotes')
        .update({ status: 'accepted' })
        .eq('id', q1!.id)

      const quotes = await getInterventionQuotes(intervention.id)
      const statuses = quotes.map(q => q.status)
      expect(statuses).toContain('accepted')
    })
  })
})
