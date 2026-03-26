/**
 * API Route: GET /api/search/global?q=...
 *
 * Global cross-entity search for the Cmd+K command palette.
 * Calls the search_global RPC (hybrid FTS + ILIKE, single DB round-trip).
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getApiAuthContext } from '@/lib/api-auth-helper'
import { logger } from '@/lib/logger'

const SearchQuerySchema = z.object({
  q: z.string().min(2, 'Minimum 2 caracteres').max(100, 'Maximum 100 caracteres'),
})

export async function GET(request: NextRequest) {
  try {
    // 1. Auth
    const authResult = await getApiAuthContext({ requiredRole: 'gestionnaire' })
    if (!authResult.success) {
      return authResult.error
    }

    const { supabase, userProfile } = authResult.data

    if (!userProfile?.team_id) {
      return NextResponse.json(
        { success: false, error: 'Equipe introuvable' },
        { status: 400 }
      )
    }

    // 2. Validate query
    const q = request.nextUrl.searchParams.get('q') || ''
    const parsed = SearchQuerySchema.safeParse({ q })

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    // 3. Call RPC
    const { data, error } = await supabase.rpc('search_global', {
      p_query: parsed.data.q,
      p_team_id: userProfile.team_id,
    })

    if (error) {
      logger.error({ error: error.message }, '[SEARCH] RPC search_global failed')
      return NextResponse.json(
        { success: false, error: 'Erreur de recherche' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, results: data || [] })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'unknown_error'
    logger.error({ error: message }, '[SEARCH] Global search error')
    return NextResponse.json(
      { success: false, error: 'Erreur interne' },
      { status: 500 }
    )
  }
}
