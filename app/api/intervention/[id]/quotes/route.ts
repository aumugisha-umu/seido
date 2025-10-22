import { NextRequest, NextResponse } from 'next/server'
import { Database } from '@/lib/database.types'
import { logger, logError } from '@/lib/logger'
import { getApiAuthContext } from '@/lib/api-auth-helper'


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const interventionId = resolvedParams.id

    // ✅ AUTH: 45 lignes → 3 lignes! (any authenticated user)
    const authResult = await getApiAuthContext()
    if (!authResult.success) return authResult.error

    const { supabase, userProfile: user } = authResult.data

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Utilisateur non trouvé'
      }, { status: 404 })
    }

    logger.info({ interventionId, userRole: user.role }, "🔍 Getting quotes for intervention")

    // Get intervention details
    const { data: intervention, error: interventionError } = await supabase
      .from('interventions')
      .select(`
        id,
        title,
        description,
        status,
        team_id
      `)
      .eq('id', interventionId)
      .single()

    if (interventionError || !intervention) {
      return NextResponse.json({
        success: false,
        error: 'Intervention non trouvée'
      }, { status: 404 })
    }

    // Check permissions - only gestionnaires can view all quotes, prestataires can only view their own
    // Pour l'éligibilité, on a besoin uniquement de : provider_id (identifier le prestataire) et status (vérifier si pending/sent/accepted)
    let quotesQuery = supabase
      .from('intervention_quotes')
      .select('id, provider_id, status')
      .eq('intervention_id', interventionId)

    // If user is prestataire, only show their own quote
    if (user.role === 'prestataire') {
      quotesQuery = quotesQuery.eq('provider_id', user.id)
    } else if (user.role === 'gestionnaire') {
      // Check if gestionnaire has access to this intervention
      const { data: assignment, error: assignmentError } = await supabase
        .from('intervention_contacts')
        .select('id')
        .eq('intervention_id', interventionId)
        .eq('user_id', user.id)
        .eq('role', 'gestionnaire')
        .single()

      if (assignmentError || !assignment) {
        // Also check if gestionnaire belongs to the same team
        if (intervention.team_id !== user.team_id) {
          return NextResponse.json({
            success: false,
            error: 'Vous n\'êtes pas autorisé à consulter les devis de cette intervention'
          }, { status: 403 })
        }
      }
    } else {
      return NextResponse.json({
        success: false,
        error: 'Seuls les gestionnaires et prestataires peuvent consulter les devis'
      }, { status: 403 })
    }

    const { data: quotes, error: quotesError } = await quotesQuery

    if (quotesError) {
      logger.error({ error: quotesError }, '❌ Error fetching quotes:')
      return NextResponse.json({
        success: false,
        error: 'Erreur lors de la récupération des devis'
      }, { status: 500 })
    }

    logger.info({ quotesCount: quotes?.length || 0, interventionId }, "✅ Found quotes for intervention")

    return NextResponse.json({
      success: true,
      quotes: quotes || []
    })

  } catch (error) {
    logger.error({ error: error }, '❌ Error in intervention quotes API:')
    return NextResponse.json({
      success: false,
      error: 'Erreur interne du serveur'
    }, { status: 500 })
  }
}