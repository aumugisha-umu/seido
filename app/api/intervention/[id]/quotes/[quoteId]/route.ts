import { NextRequest, NextResponse } from 'next/server'
import { getApiAuthContext } from '@/lib/api-auth-helper'
import { logger } from '@/lib/logger'

/**
 * DELETE /api/intervention/[id]/quotes/[quoteId]
 * Cancel a quote request (soft delete)
 */
export async function DELETE(
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

    logger.info({ interventionId, quoteId, userId: user.id }, "🗑️ Cancelling quote request")

    // Check if user is gestionnaire
    if (user.role !== 'gestionnaire') {
      return NextResponse.json({
        success: false,
        error: 'Seuls les gestionnaires peuvent annuler une demande de devis'
      }, { status: 403 })
    }

    // Get the quote to verify it exists and belongs to this intervention
    const { data: quote, error: quoteError } = await supabase
      .from('intervention_quotes')
      .select('id, intervention_id, status, amount')
      .eq('id', quoteId)
      .eq('intervention_id', interventionId)
      .is('deleted_at', null)
      .single()

    if (quoteError || !quote) {
      return NextResponse.json({
        success: false,
        error: 'Demande de devis non trouvée'
      }, { status: 404 })
    }

    // Check if the quote request can be cancelled (only pending requests with no amount)
    if (quote.status !== 'pending' || (quote.amount && quote.amount > 0)) {
      return NextResponse.json({
        success: false,
        error: 'Cette demande ne peut plus être annulée'
      }, { status: 400 })
    }

    // Cancel the quote request (just update status, don't soft delete)
    const { error: updateError } = await supabase
      .from('intervention_quotes')
      .update({
        status: 'cancelled'
      })
      .eq('id', quoteId)

    if (updateError) {
      logger.error({ error: updateError }, '❌ Error cancelling quote request')
      return NextResponse.json({
        success: false,
        error: 'Erreur lors de l\'annulation de la demande'
      }, { status: 500 })
    }

    logger.info({ quoteId }, "✅ Quote request cancelled successfully")

    return NextResponse.json({
      success: true,
      message: 'Demande de devis annulée avec succès'
    })

  } catch (error) {
    logger.error({ error }, '❌ Error in cancel quote request API')
    return NextResponse.json({
      success: false,
      error: 'Erreur interne du serveur'
    }, { status: 500 })
  }
}
