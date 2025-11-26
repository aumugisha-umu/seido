import { NextRequest, NextResponse } from 'next/server'
import { getApiAuthContext } from '@/lib/api-auth-helper'
import { logger } from '@/lib/logger'

/**
 * POST /api/intervention/[id]/quotes/[quoteId]/reject
 * Reject a quote (gestionnaire only)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; quoteId: string }> }
) {
  try {
    const resolvedParams = await params
    const { id: interventionId, quoteId } = resolvedParams

    // Auth check
    const authResult = await getApiAuthContext()
    if (!authResult.success) return authResult.error

    const { supabase, userProfile: user } = authResult.data

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Utilisateur non trouvé'
      }, { status: 404 })
    }

    // Optional: Get rejection reason from body
    let rejectionReason: string | undefined
    try {
      const body = await request.json()
      rejectionReason = body.reason
    } catch {
      // No body or invalid JSON - that's fine
    }

    logger.info({ interventionId, quoteId, userId: user.id, reason: rejectionReason }, "Rejecting quote")

    // Check if user is gestionnaire or admin
    if (!['gestionnaire', 'admin'].includes(user.role)) {
      return NextResponse.json({
        success: false,
        error: 'Seuls les gestionnaires peuvent rejeter un devis'
      }, { status: 403 })
    }

    // Get the quote to verify it exists
    const { data: quote, error: quoteError } = await supabase
      .from('intervention_quotes')
      .select('id, intervention_id, status, amount, provider_id')
      .eq('id', quoteId)
      .eq('intervention_id', interventionId)
      .is('deleted_at', null)
      .single()

    if (quoteError || !quote) {
      return NextResponse.json({
        success: false,
        error: 'Devis non trouvé'
      }, { status: 404 })
    }

    // Check if quote is in a valid state to be rejected
    if (!['pending', 'sent'].includes(quote.status)) {
      return NextResponse.json({
        success: false,
        error: 'Ce devis ne peut pas être rejeté (statut actuel: ' + quote.status + ')'
      }, { status: 400 })
    }

    // Reject the quote
    const { error: updateError } = await supabase
      .from('intervention_quotes')
      .update({
        status: 'rejected'
      })
      .eq('id', quoteId)

    if (updateError) {
      logger.error({ error: updateError }, 'Error rejecting quote')
      return NextResponse.json({
        success: false,
        error: 'Erreur lors du rejet du devis'
      }, { status: 500 })
    }

    // Check if there are any remaining pending/sent quotes
    const { data: remainingQuotes } = await supabase
      .from('intervention_quotes')
      .select('id')
      .eq('intervention_id', interventionId)
      .in('status', ['pending', 'sent'])
      .is('deleted_at', null)

    // If no more pending quotes, update intervention status
    if (!remainingQuotes || remainingQuotes.length === 0) {
      const { error: interventionUpdateError } = await supabase
        .from('interventions')
        .update({ status: 'planification' })
        .eq('id', interventionId)
        .eq('status', 'demande_de_devis')

      if (interventionUpdateError) {
        logger.warn({ error: interventionUpdateError }, 'Warning: Could not update intervention status')
      } else {
        logger.info({ interventionId }, "Intervention status updated to 'planification' (no more pending quotes)")
      }
    }

    logger.info({ quoteId, interventionId }, "Quote rejected successfully")

    return NextResponse.json({
      success: true,
      message: 'Devis rejeté'
    })

  } catch (error) {
    logger.error({ error }, 'Error in reject quote API')
    return NextResponse.json({
      success: false,
      error: 'Erreur interne du serveur'
    }, { status: 500 })
  }
}
