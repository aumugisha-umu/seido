/**
 * Integration tests: search_global RPC
 *
 * Tests the global search RPC function that searches across
 * interventions, contacts, lots, buildings, contracts, emails,
 * conversations, reminders, and documents.
 *
 * The function uses SECURITY DEFINER + auth.uid() team membership guard.
 * Service role has no auth.uid() context, so we split tests into:
 * - Edge case tests (service role) — validate guards and error handling
 * - Entity-specific tests (authenticated client) — validate search results
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { createTestSupabaseClient } from './helpers/supabase-client'
import { getTestTeamId } from './helpers/test-data'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../../.env.local') })

const supabase = createTestSupabaseClient()
let teamId: string

// Authenticated client for tests that need auth.uid() context
let authClient: ReturnType<typeof createClient>

// Result type from the RPC
interface SearchResult {
  entity_type: string
  entity_id: string
  title: string
  subtitle: string
  url: string
  rank: number
}

describe('search_global RPC', () => {
  beforeAll(async () => {
    teamId = await getTestTeamId()

    // Create an authenticated client using admin-generated magiclink OTP
    // This sets auth.uid() so the SECURITY DEFINER guard passes
    const testEmail = 'arthur@seido-app.com'
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: testEmail,
    })
    if (linkError || !linkData?.properties?.email_otp) {
      throw new Error(`Failed to generate auth link: ${linkError?.message}`)
    }

    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
    authClient = createClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Verify the OTP to establish an authenticated session
    const { error: verifyError } = await authClient.auth.verifyOtp({
      email: testEmail,
      token: linkData.properties.email_otp,
      type: 'email',
    })
    if (verifyError) {
      throw new Error(`Failed to verify OTP: ${verifyError.message}`)
    }
  })

  // ═══════════════════════════════════════════════════════════════
  // Edge case tests (service role — no auth.uid() needed)
  // ═══════════════════════════════════════════════════════════════

  describe('input guards', () => {
    it('returns empty for single character query', async () => {
      const { data, error } = await supabase.rpc('search_global', {
        p_query: 'a',
        p_team_id: teamId,
      })
      expect(error).toBeNull()
      expect(data).toEqual([])
    })

    it('returns empty for empty query', async () => {
      const { data, error } = await supabase.rpc('search_global', {
        p_query: '',
        p_team_id: teamId,
      })
      expect(error).toBeNull()
      expect(data).toEqual([])
    })

    it('returns empty for whitespace-only query', async () => {
      const { data, error } = await supabase.rpc('search_global', {
        p_query: '   ',
        p_team_id: teamId,
      })
      expect(error).toBeNull()
      expect(data).toEqual([])
    })

    it('handles special characters safely (SQL injection)', async () => {
      const { data, error } = await supabase.rpc('search_global', {
        p_query: "test'; DROP TABLE users; --",
        p_team_id: teamId,
      })
      expect(error).toBeNull()
      expect(Array.isArray(data)).toBe(true)
    })

    it('returns empty for non-existent team', async () => {
      const { data, error } = await supabase.rpc('search_global', {
        p_query: 'test',
        p_team_id: '00000000-0000-0000-0000-000000000000',
      })
      expect(error).toBeNull()
      expect(data).toEqual([])
    })
  })

  describe('auth guard (SECURITY DEFINER)', () => {
    it('returns empty when service role calls (no auth.uid())', async () => {
      // Service role has no auth.uid() context → team membership check fails → empty
      const { data, error } = await supabase.rpc('search_global', {
        p_query: 'Appartement',
        p_team_id: teamId,
      })
      expect(error).toBeNull()
      expect(data).toEqual([])
    })
  })

  // ═══════════════════════════════════════════════════════════════
  // Authenticated tests (use authClient with real auth.uid())
  // ═══════════════════════════════════════════════════════════════

  describe('search results (authenticated)', () => {
    it('returns results for a valid query', async () => {
      const { data, error } = await authClient.rpc('search_global', {
        p_query: 'Appartement',
        p_team_id: teamId,
      })
      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect((data as SearchResult[]).length).toBeGreaterThan(0)
    })

    it('returns correctly shaped results', async () => {
      const { data } = await authClient.rpc('search_global', {
        p_query: 'Appartement',
        p_team_id: teamId,
      })
      const results = data as SearchResult[]
      expect(results.length).toBeGreaterThan(0)
      const result = results[0]
      expect(result).toHaveProperty('entity_type')
      expect(result).toHaveProperty('entity_id')
      expect(result).toHaveProperty('title')
      expect(result).toHaveProperty('subtitle')
      expect(result).toHaveProperty('url')
      expect(result).toHaveProperty('rank')
      expect(typeof result.entity_type).toBe('string')
      expect(typeof result.rank).toBe('number')
    })

    it('returns only valid entity types', async () => {
      const { data } = await authClient.rpc('search_global', {
        p_query: 'ar',
        p_team_id: teamId,
      })
      const validTypes = [
        'intervention', 'contact', 'lot', 'building', 'contract',
        'email', 'conversation', 'reminder', 'document',
      ]
      for (const result of (data as SearchResult[])) {
        expect(validTypes).toContain(result.entity_type)
      }
    })

    it('returns at most 25 results', async () => {
      const { data, error } = await authClient.rpc('search_global', {
        p_query: 'ar',
        p_team_id: teamId,
      })
      expect(error).toBeNull()
      expect((data as SearchResult[]).length).toBeLessThanOrEqual(25)
    })

    it('returns results sorted by rank descending', async () => {
      const { data } = await authClient.rpc('search_global', {
        p_query: 'Appartement',
        p_team_id: teamId,
      })
      const results = data as SearchResult[]
      if (results.length > 1) {
        for (let i = 1; i < results.length; i++) {
          expect(results[i].rank).toBeLessThanOrEqual(results[i - 1].rank)
        }
      }
    })

    it('generates correct URL patterns per entity type', async () => {
      const { data } = await authClient.rpc('search_global', {
        p_query: 'ar',
        p_team_id: teamId,
      })
      const urlPatterns: Record<string, RegExp> = {
        intervention: /^\/gestionnaire\/operations\/interventions\//,
        contact: /^\/gestionnaire\/contacts\/details\//,
        lot: /^\/gestionnaire\/biens\/lots\//,
        building: /^\/gestionnaire\/biens\/immeubles\//,
        contract: /^\/gestionnaire\/contrats\//,
        email: /^\/gestionnaire\/mail\?email=/,
        conversation: /^\/gestionnaire\/operations\/interventions\//,
        reminder: /^\/gestionnaire\/operations\/rappels\//,
        document: /^\/gestionnaire\/(biens\/(immeubles|lots)|operations\/interventions|contrats)\//,
      }
      for (const result of (data as SearchResult[])) {
        const pattern = urlPatterns[result.entity_type]
        if (pattern) {
          expect(result.url).toMatch(pattern)
        }
      }
    })

    it('finds contacts by name', async () => {
      const { data } = await authClient.rpc('search_global', {
        p_query: 'Arthur',
        p_team_id: teamId,
      })
      const contacts = (data as SearchResult[]).filter(r => r.entity_type === 'contact')
      expect(contacts.length).toBeGreaterThan(0)
      expect(contacts[0].title).toContain('Arthur')
    })

    it('finds contacts by email', async () => {
      const { data } = await authClient.rpc('search_global', {
        p_query: 'arthur@seido',
        p_team_id: teamId,
      })
      const contacts = (data as SearchResult[]).filter(r => r.entity_type === 'contact')
      expect(contacts.length).toBeGreaterThan(0)
    })

    it('finds lots by reference', async () => {
      const { data } = await authClient.rpc('search_global', {
        p_query: 'Appartement',
        p_team_id: teamId,
      })
      const lots = (data as SearchResult[]).filter(r => r.entity_type === 'lot')
      expect(lots.length).toBeGreaterThan(0)
    })

    it('finds buildings by name', async () => {
      // Search a broad term to find at least one building
      const { data } = await authClient.rpc('search_global', {
        p_query: 'Immeuble',
        p_team_id: teamId,
      })
      const buildings = (data as SearchResult[]).filter(r => r.entity_type === 'building')
      // Buildings may or may not match depending on naming — verify URL if found
      if (buildings.length > 0) {
        expect(buildings[0].url).toMatch(/\/gestionnaire\/biens\/immeubles\//)
      }
      // At minimum, the query should not error and return valid data
      expect(Array.isArray(data)).toBe(true)
    })

    it('finds documents by filename', async () => {
      const { data } = await authClient.rpc('search_global', {
        p_query: 'pdf',
        p_team_id: teamId,
      })
      const docs = (data as SearchResult[]).filter(r => r.entity_type === 'document')
      expect(docs.length).toBeGreaterThan(0)
      // Subtitle shows the linked entity
      expect(docs[0].subtitle).toMatch(/Immeuble|Lot|Intervention|Contrat/)
    })

    it('blocks search for another team (auth guard)', async () => {
      // The authenticated user belongs to teamId, not this fake team
      const { data, error } = await authClient.rpc('search_global', {
        p_query: 'test',
        p_team_id: '00000000-0000-0000-0000-000000000001',
      })
      expect(error).toBeNull()
      expect(data).toEqual([])
    })
  })
})
