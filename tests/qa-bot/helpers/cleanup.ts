/**
 * QA Bot post-run cleanup script.
 *
 * Deletes entities created during the test run (interventions, reminders, documents)
 * while keeping base seed data (building, lots, contacts, contracts) intact.
 *
 * Usage: npx tsx tests/qa-bot/helpers/cleanup.ts
 *
 * Env vars:
 *   SUPABASE_URL — Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY — Service role key (bypasses RLS)
 *   QA_TEAM_ID — QA team UUID
 *   RUN_START_TIME — ISO timestamp of run start (optional, defaults to 1 hour ago)
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const QA_TEAM_ID = process.env.QA_TEAM_ID || ''

interface CleanupResult {
  table: string
  deleted: number
  error?: string
}

export async function cleanup(): Promise<CleanupResult[]> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.log('[Cleanup] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — skipping cleanup')
    return []
  }

  if (!QA_TEAM_ID) {
    console.log('[Cleanup] Missing QA_TEAM_ID — skipping cleanup')
    return []
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  const runStartTime = process.env.RUN_START_TIME || new Date(Date.now() - 60 * 60 * 1000).toISOString()

  console.log(`[Cleanup] Cleaning QA team ${QA_TEAM_ID} entities created after ${runStartTime}`)

  const results: CleanupResult[] = []

  // Order matters: delete dependent entities first (foreign keys)
  const tablesToClean = [
    // Intervention-related (most dependent)
    'intervention_quotes',
    'intervention_time_slots',
    'intervention_assignments',
    'conversation_messages',
    'conversation_participants',
    'conversation_threads',
    'activity_logs',
    'documents',
    // Main entities
    'interventions',
    // Recurrence (FK references reminders — must delete before reminders)
    'recurrence_occurrences',
    'recurrence_rules',
    'reminders',
  ]

  for (const table of tablesToClean) {
    try {
      const { data, error } = await supabase
        .from(table)
        .delete()
        .eq('team_id', QA_TEAM_ID)
        .gte('created_at', runStartTime)
        .select('id')

      if (error) {
        // Some tables might not have team_id — try without it
        if (error.message.includes('team_id')) {
          console.log(`[Cleanup] ${table}: no team_id column, skipping`)
          results.push({ table, deleted: 0, error: 'no team_id column' })
          continue
        }
        console.error(`[Cleanup] ${table}: ${error.message}`)
        results.push({ table, deleted: 0, error: error.message })
      } else {
        const count = data?.length || 0
        if (count > 0) {
          console.log(`[Cleanup] ${table}: deleted ${count} rows`)
        }
        results.push({ table, deleted: count })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error(`[Cleanup] ${table}: ${message}`)
      results.push({ table, deleted: 0, error: message })
    }
  }

  const totalDeleted = results.reduce((sum, r) => sum + r.deleted, 0)
  console.log(`[Cleanup] Done. Total rows deleted: ${totalDeleted}`)

  return results
}

// Run if called directly
cleanup().catch(console.error)
