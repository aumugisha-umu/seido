import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { getApiAuthContext } from '@/lib/api-auth-helper'
import { quoteCancelSchema, validateRequest, formatZodErrors } from '@/lib/validation/schemas'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // ✅ AUTH: 33 lignes → 3 lignes! (uniformisation createServerSupabaseClient → getApiAuthContext)
    const authResult = await getApiAuthContext()
    if (!authResult.success) return authResult.error

    const { supabase, userProfile: localUser } = authResult.data

    // Await params pour Next.js 15
    const resolvedParams = await params
    const quoteId = resolvedParams.id

    logger.info({ quoteId, userId: localUser.id }, '🔍 [QUOTE-CANCEL] Attempting to cancel quote')

    // Vérifier que l'estimation existe et appartient à l'utilisateur actuel
    const { data: quote, error: fetchError } = await supabase
      .from('intervention_quotes')
      .select(`
        id,
        status,
        provider_id,
        intervention_id,
        interventions!intervention_quotes_intervention_id_fkey!inner (
          id,
          title,
          reference,
          building_id,
          lot_id,
         intervention_assignments!inner (
            role,
            is_primary,
            user:user_id (
              id,
              name,
              email
            )
          )
        )
      `)
      .eq('id', quoteId)
      .eq('provider_id', localUser.id)
      .single()

    if (fetchError || !quote) {
      logger.info({
        quoteId,
        userId: localUser.id,
        fetchError,
        quoteFound: !!quote
      }, '❌ [QUOTE-CANCEL] Quote not found or unauthorized:')
      return NextResponse.json(
        { error: 'Estimation non trouvée ou non autorisée' },
        { status: 404 }
      )
    }

    logger.info({
      quoteId: quote.id,
      status: quote.status,
      providerId: quote.provider_id,
      currentUserId: localUser.id
    }, '✅ [QUOTE-CANCEL] Quote found:')

    // Vérifier que l'estimation est en attente (peut être annulée)
    if (quote.status !== 'pending') {
      return NextResponse.json(
        { error: 'Cette estimation ne peut plus être annulée' },
        { status: 400 }
      )
    }

    // Annuler l'estimation (la marquer comme annulée)
    const { error: updateError } = await supabase
      .from('intervention_quotes')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', quoteId)

    if (updateError) {
      logger.error({ error: updateError }, '❌ Error cancelling quote:')
      return NextResponse.json(
        { error: 'Erreur lors de l\'annulation de l\'estimation' },
        { status: 500 }
      )
    }

    // Récupérer les informations pour les notifications
    const intervention = quote.interventions

    // Récupérer les gestionnaires de l'équipe et le gestionnaire assigné
    const managersToNotify = new Set<string>()

    // Ajouter les gestionnaires assignés à l'intervention viaintervention_assignments
    if (intervention.intervention_assignments) {
      intervention.intervention_assignments
        .filter(contact => contact.role === 'gestionnaire')
        .forEach(contact => {
          managersToNotify.add(contact.user.id)
        })
    }

    // Si l'intervention est sur un lot, récupérer les gestionnaires du bâtiment
    if (intervention.lot_id) {
      const { data: buildingManagers } = await supabase
        .from('user_buildings')
        .select('user_id')
        .eq('building_id', intervention.building_id)
        .eq('role', 'manager')
      
      buildingManagers?.forEach(manager => managersToNotify.add(manager.user_id))
    }
    // Si l'intervention est sur un bâtiment entier, récupérer aussi les gestionnaires
    else if (intervention.building_id) {
      const { data: buildingManagers } = await supabase
        .from('user_buildings')
        .select('user_id')
        .eq('building_id', intervention.building_id)
        .eq('role', 'manager')
      
      buildingManagers?.forEach(manager => managersToNotify.add(manager.user_id))
    }

    // Créer les notifications pour tous les gestionnaires
    const notificationsToCreate = Array.from(managersToNotify).map(managerId => ({
      user_id: managerId,
      type: 'quote_cancelled',
      title: 'Estimation annulée',
      message: `Une estimation pour l'intervention "${intervention.title}" (${intervention.reference}) a été annulée par le prestataire`,
      metadata: {
        intervention_id: intervention.id,
        quote_id: quoteId,
        action_url: `/gestionnaire/operations/interventions/${intervention.id}`
      },
      created_at: new Date().toISOString()
    }))

    if (notificationsToCreate.length > 0) {
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert(notificationsToCreate)

      if (notificationError) {
        logger.error({ error: notificationError }, '❌ Error creating notifications:')
        // Ne pas faire échouer la requête pour les notifications
      } else {
        logger.info({ notificationCount: notificationsToCreate.length }, '✅ Notifications sent to managers')
      }
    }

    // Log de l'activité
    await supabase
      .from('activity_logs')
      .insert({
        user_id: localUser.id,
        action: 'quote_cancelled',
        resource_type: 'intervention_quote',
        resource_id: quoteId,
        details: {
          intervention_id: intervention.id,
          intervention_reference: intervention.reference,
          intervention_title: intervention.title
        },
        created_at: new Date().toISOString()
      })

    logger.info({ quoteId: quoteId }, '✅ Quote cancelled successfully:')

    return NextResponse.json(
      { 
        success: true,
        message: 'Estimation annulée avec succès'
      },
      { status: 200 }
    )

  } catch (error) {
    logger.error({ error: error }, '❌ Error in quote cancellation:')
    return NextResponse.json(
      { error: 'Erreur serveur lors de l\'annulation de l\'estimation' },
      { status: 500 }
    )
  }
}
