import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/services'
import { logger, logError } from '@/lib/logger'
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient()

    // Vérifier l'authentification
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !authUser) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    // Trouver l'utilisateur local correspondant à l'auth user
    const { data: localUser, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', authUser.id)
      .single()

    if (userError || !localUser) {
      logger.error({ user: authUser.id, userError }, '❌ Local user not found for auth user:')
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      )
    }

    // Await params pour Next.js 15
    const resolvedParams = await params
    const quoteId = resolvedParams.id

    logger.info({ quoteId, userId: localUser.id }, '🔍 [QUOTE-CANCEL] Attempting to cancel quote')

    // Vérifier que le devis existe et appartient à l'utilisateur actuel
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
        { error: 'Devis non trouvé ou non autorisé' },
        { status: 404 }
      )
    }

    logger.info({
      quoteId: quote.id,
      status: quote.status,
      providerId: quote.provider_id,
      currentUserId: localUser.id
    }, '✅ [QUOTE-CANCEL] Quote found:')

    // Vérifier que le devis est en attente (peut être annulé)
    if (quote.status !== 'pending') {
      return NextResponse.json(
        { error: 'Ce devis ne peut plus être annulé' },
        { status: 400 }
      )
    }

    // Annuler le devis (le marquer comme annulé)
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
        { error: 'Erreur lors de l\'annulation du devis' },
        { status: 500 }
      )
    }

    // Récupérer les informations pour les notifications
    const intervention = quote.interventions

    // Récupérer les gestionnaires de l'équipe et le gestionnaire assigné
    const managersToNotify = new Set<string>()

    // Ajouter les gestionnaires assignés à l'intervention viaintervention_assignments
    if (intervention.intervention_contacts) {
      intervention.intervention_contacts
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
      title: 'Devis annulé',
      message: `Un devis pour l'intervention "${intervention.title}" (${intervention.reference}) a été annulé par le prestataire`,
      metadata: {
        intervention_id: intervention.id,
        quote_id: quoteId,
        action_url: `/gestionnaire/interventions/${intervention.id}`
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
        message: 'Devis annulé avec succès'
      },
      { status: 200 }
    )

  } catch (error) {
    logger.error({ error: error }, '❌ Error in quote cancellation:')
    return NextResponse.json(
      { error: 'Erreur serveur lors de l\'annulation du devis' },
      { status: 500 }
    )
  }
}
