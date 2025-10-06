import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/services'
import { logger, logError } from '@/lib/logger'
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  logger.info('🚀 [API-APPROVE] Starting quote approval API')

  try {
    const supabase = await createServerSupabaseClient()
    const { comments } = await request.json()
    const { id } = await params

    logger.info('📋 [API-APPROVE] Request details:', {
      quoteId: id,
      comments: comments,
      timestamp: new Date().toISOString()
    })

    // Vérifier l'authentification
    logger.info('🔐 [API-APPROVE] Checking authentication...')
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError) {
      logger.error('❌ [API-APPROVE] Auth error:', authError)
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    if (!user) {
      logger.error('❌ [API-APPROVE] No user found')
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Récupérer l'ID utilisateur depuis la table users
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (userError || !userData) {
      logger.error('❌ [API-APPROVE] User not found in users table:', userError)
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 401 })
    }

    logger.info('✅ [API-APPROVE] User authenticated:', {
      authUserId: user.id,
      userId: userData.id,
      email: user.email
    })

    // Récupérer le devis par ID seulement
    logger.info('🔍 [API-APPROVE] Searching for quote with ID:', id)

    const { data: quote, error: quoteError } = await supabase
      .from('intervention_quotes')
      .select(`
        *,
        intervention:interventions!intervention_quotes_intervention_id_fkey(*)
      `)
      .eq('id', id)
      .single()

    logger.info('📊 [API-APPROVE] Quote query result:', {
      found: !!quote,
      error: quoteError,
      quoteData: quote ? {
        id: quote.id,
        status: quote.status,
        provider_id: quote.provider_id,
        intervention_id: quote.intervention_id
      } : null
    })

    if (quoteError) {
      logger.error('❌ [API-APPROVE] Database error while fetching quote:', quoteError)
      return NextResponse.json({
        error: 'Devis non trouvé',
        debug: { quoteError }
      }, { status: 404 })
    }

    if (!quote) {
      logger.error('❌ [API-APPROVE] Quote not found with ID:', id)
      return NextResponse.json({
        error: 'Devis non trouvé',
        debug: { searchedId: id }
      }, { status: 404 })
    }

    // Vérifier que le devis est en attente (validation JavaScript)
    logger.info('🔍 [API-APPROVE] Checking quote status:', quote.status)

    // Accepter les statuts "pending" (anglais) et "En attente" (français legacy)
    const isPending = quote.status === 'pending' || quote.status === 'En attente'

    if (!isPending) {
      logger.error('❌ [API-APPROVE] Quote not in pending status:', quote.status)
      return NextResponse.json({
        error: `Ce devis a déjà été traité (statut: ${quote.status})`,
        debug: { currentStatus: quote.status }
      }, { status: 400 })
    }

    logger.info('✅ [API-APPROVE] Quote found successfully:', {
      id: quote.id,
      status: quote.status,
      interventionId: quote.intervention_id
    })

    // Démarrer une transaction pour mettre à jour le devis et l'intervention
    logger.info('💾 [API-APPROVE] Updating quote status to approved...')
    const updateData = {
      status: 'approved',
      reviewed_at: new Date().toISOString(),
      reviewed_by: userData.id,
      review_comments: comments || null
    }
    logger.info('💾 [API-APPROVE] Update data:', updateData)

    const { error: approveError } = await supabase
      .from('intervention_quotes')
      .update(updateData)
      .eq('id', id)

    if (approveError) {
      logger.error('❌ [API-APPROVE] Error updating quote:', approveError)
      return NextResponse.json({
        error: 'Erreur lors de l\'approbation du devis',
        debug: { approveError }
      }, { status: 500 })
    }

    logger.info('✅ [API-APPROVE] Quote updated successfully')

    // Mettre à jour le statut de l'intervention vers "planification"
    const { error: interventionError } = await supabase
      .from('interventions')
      .update({
        status: 'planification',
        selected_quote_id: id,
        updated_at: new Date().toISOString()
      })
      .eq('id', quote.intervention_id)

    if (interventionError) {
      logger.error('Erreur lors de la mise à jour de l\'intervention:', interventionError)
      return NextResponse.json({
        error: 'Erreur lors de la mise à jour de l\'intervention'
      }, { status: 500 })
    }

    // Rejeter automatiquement tous les autres devis en attente pour cette intervention
    const { error: rejectOthersError } = await supabase
      .from('intervention_quotes')
      .update({
        status: 'rejected',
        reviewed_at: new Date().toISOString(),
        reviewed_by: userData.id,
        rejection_reason: 'Autre devis sélectionné'
      })
      .eq('intervention_id', quote.intervention_id)
      .in('status', ['pending', 'En attente'])
      .neq('id', id)

    if (rejectOthersError) {
      logger.error('⚠️ [API-APPROVE] Error rejecting other quotes (non-critical):', rejectOthersError)
      // On continue même si cette étape échoue
    } else {
      logger.info('✅ [API-APPROVE] Other pending quotes rejected successfully')
    }

    logger.info('🎉 [API-APPROVE] Process completed successfully!')
    return NextResponse.json({
      success: true,
      message: 'Devis approuvé avec succès'
    })

  } catch (error) {
    logger.error('💥 [API-APPROVE] Unexpected error:', error)
    logger.error('💥 [API-APPROVE] Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json({
      error: 'Erreur interne du serveur',
      debug: { error: error instanceof Error ? error.message : 'Unknown error' }
    }, { status: 500 })
  }
}