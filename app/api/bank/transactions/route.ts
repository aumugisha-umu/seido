import { NextResponse } from 'next/server'
import { getApiAuthContext } from '@/lib/api-auth-helper'
import { logger } from '@/lib/logger'
import { BankTransactionRepository } from '@/lib/services/repositories/bank-transaction.repository'
import { transactionFiltersSchema } from '@/lib/validation/bank-schemas'

/**
 * GET /api/bank/transactions
 * List transactions for the authenticated user's team with filters and pagination
 */
export async function GET(request: Request) {
  try {
    const authResult = await getApiAuthContext({ requiredRole: 'gestionnaire' })
    if (!authResult.success) return authResult.error

    const { supabase, userProfile } = authResult.data
    const teamId = userProfile?.team_id
    if (!teamId) {
      return NextResponse.json({ error: 'No team' }, { status: 403 })
    }

    // Parse query params through Zod schema
    const { searchParams } = new URL(request.url)
    const rawFilters: Record<string, string> = {}
    searchParams.forEach((value, key) => {
      rawFilters[key] = value
    })

    const parsed = transactionFiltersSchema.safeParse(rawFilters)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Filtres invalides', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const filters = parsed.data

    logger.info(
      { teamId, filters },
      '[BANK-TRANSACTIONS] GET list'
    )

    const repo = new BankTransactionRepository(supabase)
    const { data, total } = await repo.getTransactionsByTeam(teamId, filters)

    return NextResponse.json({
      success: true,
      transactions: data,
      total,
      page: filters.page,
      page_size: filters.page_size,
    })
  } catch (error) {
    logger.error({ error }, '[BANK-TRANSACTIONS] Unexpected error in GET')
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
