import { NextRequest, NextResponse } from 'next/server'
import { getApiAuthContext } from '@/lib/api-auth-helper'
import { logger } from '@/lib/logger'

/**
 * POST /api/intervention/[id]/quotes/[quoteId]/approve
 * Approve a quote (gestionnaire only)
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

    logger.info({ interventionId, quoteId, userId: user.id }, "Approving quote")

    // Check if user is gestionnaire or admin
    if (!['gestionnaire', 'admin'].includes(user.role)) {
      return NextResponse.json({
        success: false,
        error: 'Seuls les gestionnaires peuvent approuver une estimation'
      }, { status: 403 })
    }

    // Get the quote to verify it exists and has an amount
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
        error: 'Estimation non trouvée'
      }, { status: 404 })
    }

    // Check if the quote has an amount (it's a real quote, not just a request)
    if (!quote.amount || quote.amount <= 0) {
      return NextResponse.json({
        success: false,
        error: 'Cette estimation n\'a pas encore de montant'
      }, { status: 400 })
    }

    // Check if quote is in a valid state to be approved
    if (!['pending', 'sent'].includes(quote.status)) {
      return NextResponse.json({
        success: false,
        error: 'Cette estimation ne peut pas être approuvée (statut actuel: ' + quote.status + ')'
      }, { status: 400 })
    }

    // Approve the quote
    const { error: updateError } = await supabase
      .from('intervention_quotes')
      .update({
        status: 'accepted'
      })
      .eq('id', quoteId)

    if (updateError) {
      logger.error({ error: updateError }, 'Error approving quote')
      return NextResponse.json({
        success: false,
        error: 'Erreur lors de l\'approbation de l\'estimation'
      }, { status: 500 })
    }

    // Reject all other pending quotes for this intervention
    const { error: rejectOthersError } = await supabase
      .from('intervention_quotes')
      .update({ status: 'rejected' })
      .eq('intervention_id', interventionId)
      .neq('id', quoteId)
      .in('status', ['pending', 'sent'])

    if (rejectOthersError) {
      logger.warn({ error: rejectOthersError }, 'Warning: Could not reject other quotes')
    }

    // Update intervention status to 'planification' (ready to schedule)
    const { error: interventionUpdateError } = await supabase
      .from('interventions')
      .update({ status: 'planification' })
      .eq('id', interventionId)
      .eq('status', 'demande_de_devis')

    if (interventionUpdateError) {
      logger.warn({ error: interventionUpdateError }, 'Warning: Could not update intervention status')
    }

    logger.info({ quoteId, interventionId }, "Quote approved successfully")

    return NextResponse.json({
      success: true,
      message: 'Estimation approuvée avec succès'
    })

  } catch (error) {
    logger.error({ error }, 'Error in approve quote API')
    return NextResponse.json({
      success: false,
      error: 'Erreur interne du serveur'
    }, { status: 500 })
  }
}
