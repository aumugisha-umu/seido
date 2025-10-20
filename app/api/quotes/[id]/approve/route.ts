import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/services'
import { logger, logError } from '@/lib/logger'
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  logger.info({}, '🚀 [API-APPROVE] Starting quote approval API')

  try {
    const supabase = await createServerSupabaseClient()
    const { comments } = await request.json()
    const { id } = await params

    logger.info({
      quoteId: id,
      comments: comments,
      timestamp: new Date().toISOString()
    }, '📋 [API-APPROVE] Request details')

    // Vérifier l'authentification
    logger.info({}, '🔐 [API-APPROVE] Checking authentication...')
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError) {
      logger.error({ error: authError }, '❌ [API-APPROVE] Auth error:')
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    if (!user) {
      logger.error({}, '❌ [API-APPROVE] No user found')
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Récupérer l'ID utilisateur depuis la table users
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (userError || !userData) {
      logger.error({ user: userError }, '❌ [API-APPROVE] User not found in users table:')
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 401 })
    }

    logger.info({
      authUserId: user.id,
      userId: userData.id,
      email: user.email
    }, '✅ [API-APPROVE] User authenticated:')

    // Récupérer le devis par ID seulement
    logger.info({ id: id }, '🔍 [API-APPROVE] Searching for quote with ID:')

    const { data: quote, error: quoteError } = await supabase
      .from('intervention_quotes')
      .select(`
        *,
        intervention:interventions!intervention_quotes_intervention_id_fkey(*)
      `)
      .eq('id', id)
      .single()

    logger.info({
      found: !!quote,
      error: quoteError,
      quoteData: quote ? {
        id: quote.id,
        status: quote.status,
        provider_id: quote.provider_id,
        intervention_id: quote.intervention_id
      } : null
    }, '📊 [API-APPROVE] Quote query result:')

    if (quoteError) {
      logger.error({ error: quoteError }, '❌ [API-APPROVE] Database error while fetching quote:')
      return NextResponse.json({
        error: 'Devis non trouvé',
        debug: { quoteError }
      }, { status: 404 })
    }

    if (!quote) {
      logger.error({ id: id }, '❌ [API-APPROVE] Quote not found with ID:')
      return NextResponse.json({
        error: 'Devis non trouvé',
        debug: { searchedId: id }
      }, { status: 404 })
    }

    // Vérifier que le devis est en attente (validation JavaScript)
    logger.info({ quote: quote.status }, '🔍 [API-APPROVE] Checking quote status:')

    // Accepter les statuts "pending" (anglais), "En attente" (français legacy), et "sent" (soumis par prestataire)
    const isApprovable = quote.status === 'pending' || quote.status === 'En attente' || quote.status === 'sent'

    if (!isApprovable) {
      logger.error({ quote: quote.status }, '❌ [API-APPROVE] Quote not in approvable status:')
      return NextResponse.json({
        error: `Ce devis ne peut pas être approuvé (statut actuel: ${quote.status})`,
        debug: { currentStatus: quote.status, allowedStatuses: ['pending', 'En attente', 'sent'] }
      }, { status: 400 })
    }

    logger.info({
      id: quote.id,
      status: quote.status,
      interventionId: quote.intervention_id
    }, '✅ [API-APPROVE] Quote found successfully:')

    // Démarrer une transaction pour mettre à jour le devis et l'intervention
    logger.info({}, '💾 [API-APPROVE] Updating quote status to accepted...')
    const updateData = {
      status: 'accepted',
      validated_at: new Date().toISOString(),
      validated_by: userData.id
      // Note: review_comments will be handled in a separate table in the future
    }
    logger.info({ data: updateData }, '💾 [API-APPROVE] Update data:')

    const { error: approveError } = await supabase
      .from('intervention_quotes')
      .update(updateData)
      .eq('id', id)

    if (approveError) {
      logger.error({ error: approveError }, '❌ [API-APPROVE] Error updating quote:')
      return NextResponse.json({
        error: 'Erreur lors de l\'approbation du devis',
        debug: { approveError }
      }, { status: 500 })
    }

    logger.info({}, '✅ [API-APPROVE] Quote updated successfully')

    // Mettre à jour le statut de l'intervention vers "planification"
    const { error: interventionError } = await supabase
      .from('interventions')
      .update({
        status: 'planification',
        updated_at: new Date().toISOString()
      })
      .eq('id', quote.intervention_id)

    if (interventionError) {
      logger.error({ interventionError: interventionError }, 'Erreur lors de la mise à jour de l\'intervention:')
      return NextResponse.json({
        error: 'Erreur lors de la mise à jour de l\'intervention'
      }, { status: 500 })
    }

    // Rejeter automatiquement tous les autres devis en attente pour cette intervention
    const { error: rejectOthersError } = await supabase
      .from('intervention_quotes')
      .update({
        status: 'rejected',
        validated_at: new Date().toISOString(),
        validated_by: userData.id,
        rejection_reason: 'Autre devis sélectionné'
      })
      .eq('intervention_id', quote.intervention_id)
      .in('status', ['pending', 'En attente', 'sent'])
      .neq('id', id)

    if (rejectOthersError) {
      logger.error({ error: rejectOthersError }, '⚠️ [API-APPROVE] Error rejecting other quotes (non-critical):')
      // On continue même si cette étape échoue
    } else {
      logger.info({}, '✅ [API-APPROVE] Other pending quotes rejected successfully')
    }

    logger.info({}, '🎉 [API-APPROVE] Process completed successfully!')
    return NextResponse.json({
      success: true,
      message: 'Devis approuvé avec succès'
    })

  } catch (error) {
    logger.error({ error: error }, '💥 [API-APPROVE] Unexpected error:')
    logger.error({ error: error instanceof Error ? error.stack : 'No stack trace' }, '💥 [API-APPROVE] Error stack:')
    return NextResponse.json({
      error: 'Erreur interne du serveur',
      debug: { error: error instanceof Error ? error.message : 'Unknown error' }
    }, { status: 500 })
  }
}