import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/services'
import { logger, logError } from '@/lib/logger'
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient()
    const { reason } = await request.json()
    const { id } = await params

    if (!reason || reason.trim().length === 0) {
      return NextResponse.json({
        error: 'Un motif de rejet est requis'
      }, { status: 400 })
    }

    // Vérifier l'authentification
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Récupérer l'ID utilisateur depuis la table users
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (userError || !userData) {
      logger.error({ user: userError }, '❌ [API-REJECT] User not found in users table:')
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 401 })
    }

    // Récupérer le devis par ID seulement
    const { data: quote, error: quoteError } = await supabase
      .from('intervention_quotes')
      .select('*')
      .eq('id', id)
      .single()

    if (quoteError || !quote) {
      return NextResponse.json({
        error: 'Devis non trouvé'
      }, { status: 404 })
    }

    // Vérifier que le devis est en attente (validation JavaScript)
    const isPending = quote.status === 'pending' || quote.status === 'En attente'
    if (!isPending) {
      return NextResponse.json({
        error: `Ce devis a déjà été traité (statut: ${quote.status})`
      }, { status: 400 })
    }

    // Mettre à jour le devis pour le rejeter
    const { error: rejectError } = await supabase
      .from('intervention_quotes')
      .update({
        status: 'rejected',
        validated_at: new Date().toISOString(),
        validated_by: userData.id,
        rejection_reason: reason.trim()
      })
      .eq('id', id)

    if (rejectError) {
      logger.error({ rejectError: rejectError }, 'Erreur lors du rejet du devis:')
      return NextResponse.json({
        error: 'Erreur lors du rejet du devis'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Devis rejeté avec succès'
    })

  } catch (error) {
    logger.error({ error: error }, 'Erreur API:')
    return NextResponse.json({
      error: 'Erreur interne du serveur'
    }, { status: 500 })
  }
}