import { NextRequest, NextResponse } from 'next/server'
import { getApiAuthContext } from '@/lib/api-auth-helper'
import { logger } from '@/lib/logger'

/**
 * POST /api/intervention/[id]/quotes/cancel-all
 * Cancel ALL pending/sent quotes for an intervention at once.
 * Also sets requires_quote = false on the intervention.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const interventionId = resolvedParams.id

    const authResult = await getApiAuthContext()
    if (!authResult.success) return authResult.error

    const { supabase, userProfile: user } = authResult.data

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Utilisateur non trouvé'
      }, { status: 404 })
    }

    if (user.role !== 'gestionnaire') {
      return NextResponse.json({
        success: false,
        error: 'Seuls les gestionnaires peuvent annuler les demandes de devis'
      }, { status: 403 })
    }

    logger.info({ interventionId, userId: user.id }, '🗑️ Cancelling all pending quotes')

    // Find all cancellable quotes: pending or sent, not soft-deleted, no amount submitted
    const { data: pendingQuotes, error: fetchError } = await supabase
      .from('intervention_quotes')
      .select('id, status, amount, provider_id')
      .eq('intervention_id', interventionId)
      .in('status', ['pending', 'sent'])
      .is('deleted_at', null)

    if (fetchError) {
      logger.error({ error: fetchError }, '❌ Error fetching pending quotes')
      return NextResponse.json({
        success: false,
        error: 'Erreur lors de la récupération des devis'
      }, { status: 500 })
    }

    // Filter: only cancel quotes that have no amount (same logic as single cancel)
    const cancellableQuotes = (pendingQuotes || []).filter(
      q => !q.amount || q.amount <= 0
    )

    if (cancellableQuotes.length === 0) {
      // No quotes to cancel — still update requires_quote flag
      await supabase
        .from('interventions')
        .update({ requires_quote: false })
        .eq('id', interventionId)

      return NextResponse.json({
        success: true,
        cancelledCount: 0,
        message: 'Aucune demande à annuler'
      })
    }

    const quoteIds = cancellableQuotes.map(q => q.id)

    // Bulk cancel all matching quotes
    const { error: updateError } = await supabase
      .from('intervention_quotes')
      .update({ status: 'cancelled' })
      .in('id', quoteIds)

    if (updateError) {
      logger.error({ error: updateError }, '❌ Error bulk-cancelling quotes')
      return NextResponse.json({
        success: false,
        error: "Erreur lors de l'annulation des demandes"
      }, { status: 500 })
    }

    // Update intervention: requires_quote = false
    const { error: interventionUpdateError } = await supabase
      .from('interventions')
      .update({ requires_quote: false })
      .eq('id', interventionId)

    if (interventionUpdateError) {
      logger.error({ error: interventionUpdateError }, '❌ Error updating intervention requires_quote')
    }

    logger.info(
      { interventionId, cancelledCount: quoteIds.length },
      '✅ All pending quotes cancelled'
    )

    return NextResponse.json({
      success: true,
      cancelledCount: quoteIds.length,
      message: `${quoteIds.length} demande(s) annulée(s) avec succès`
    })
  } catch (error) {
    logger.error({ error }, '❌ Error in cancel-all quotes API')
    return NextResponse.json({
      success: false,
      error: 'Erreur interne du serveur'
    }, { status: 500 })
  }
}
