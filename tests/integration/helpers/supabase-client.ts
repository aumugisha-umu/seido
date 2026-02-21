/**
 * Supabase client for integration tests
 *
 * Uses service role to bypass RLS for test setup/teardown.
 * Loads credentials from .env.local (same as dev server).
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load .env.local from project root
dotenv.config({ path: path.resolve(__dirname, '../../../.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error(
    'Integration tests require NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local'
  )
}

/**
 * Create a service-role Supabase client for test operations.
 * Bypasses RLS — use for setup, teardown, and verification queries.
 */
export function createTestSupabaseClient(): SupabaseClient {
  return createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
