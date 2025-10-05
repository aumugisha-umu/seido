import { NextRequest, NextResponse } from 'next/server'

import { notificationService } from '@/lib/notification-service'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/lib/database.types'
import { logger, logError } from '@/lib/logger'
// TODO: Initialize services for new architecture
// Example: const userService = await createServerUserService()
// Remember to make your function async if it isn't already


/**
 * Identifie les prestataires éligibles pour recevoir une demande de devis
 * Exclut ceux ayant déjà une demande active ou un devis en attente/approuvé
 */
async function getEligibleProviders(
  supabase: ReturnType<typeof createServerClient<Database>>,
  interventionId: string,
  requestedProviderIds: string[]
): Promise<{ eligibleIds: string[], ineligibleIds: string[], ineligibleReasons: Record<string, string> }> {
  // Récupérer les demandes de devis existantes pour cette intervention
  const { data: existingRequests, error: requestsError } = await supabase
    .from('quote_requests')
    .select('provider_id, status')
    .eq('intervention_id', interventionId)
    .in('provider_id', requestedProviderIds)

  if (requestsError) {
    logger.error('❌ Error fetching existing quote requests:', requestsError)
    throw new Error('Erreur lors de la vérification des demandes de devis existantes')
  }

  // Récupérer les devis existants pour cette intervention
  const { data: existingQuotes, error: quotesError } = await supabase
    .from('intervention_quotes')
    .select('provider_id, status')
    .eq('intervention_id', interventionId)
    .in('provider_id', requestedProviderIds)

  if (quotesError) {
    logger.error('❌ Error fetching existing quotes:', quotesError)
    throw new Error('Erreur lors de la vérification des devis existants')
  }

  const ineligibleIds: string[] = []
  const ineligibleReasons: Record<string, string> = {}

  // Identifier les prestataires avec des demandes actives
  if (existingRequests && existingRequests.length > 0) {
    existingRequests.forEach(request => {
      if (['sent', 'viewed', 'responded'].includes(request.status)) {
        ineligibleIds.push(request.provider_id)
        ineligibleReasons[request.provider_id] = request.status === 'sent'
          ? 'a déjà une demande de devis en attente'
          : request.status === 'viewed'
          ? 'a déjà consulté une demande de devis'
          : 'a déjà répondu à une demande de devis'
      }
    })
  }

  // Identifier les prestataires avec des devis en attente ou approuvés
  if (existingQuotes && existingQuotes.length > 0) {
    existingQuotes.forEach(quote => {
      if (!ineligibleIds.includes(quote.provider_id)) { // Éviter les doublons
        if (quote.status === 'pending' || quote.status === 'approved') {
          ineligibleIds.push(quote.provider_id)
          ineligibleReasons[quote.provider_id] = quote.status === 'pending'
            ? 'a déjà un devis en attente'
            : 'a déjà un devis approuvé'
        }
      }
    })
  }

  const eligibleIds = requestedProviderIds.filter(id => !ineligibleIds.includes(id))

  logger.info('🔍 Provider eligibility check:', {
    requested: requestedProviderIds.length,
    eligible: eligibleIds.length,
    ineligible: ineligibleIds.length,
    ineligibleReasons,
    existingRequests: existingRequests?.length || 0,
    existingQuotes: existingQuotes?.length || 0
  })

  return { eligibleIds, ineligibleIds, ineligibleReasons }
}

export async function POST(request: NextRequest) {
  logger.info("✅ intervention-quote-request API route called")

  try {
    // Initialize Supabase client
    const cookieStore = await cookies()
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // Ignore cookie setting errors in API routes
            }
          },
        },
      }
    )

    // Get current user
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    if (authError || !authUser) {
      return NextResponse.json({
        success: false,
        error: 'Non autorisé'
      }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const {
      interventionId,
      providerId,      // Compatibilité mono-prestataire (legacy)
      providerIds,     // Nouveau: support multi-prestataires
      deadline,        // Date limite pour le devis
      additionalNotes, // Notes générales
      individualMessages = {} // Nouveau: messages individualisés par prestataire
    } = body

    // Support legacy (providerId) ET nouveau format (providerIds)
    const targetProviderIds = providerIds || (providerId ? [providerId] : [])

    if (!interventionId || !targetProviderIds || targetProviderIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'interventionId et au moins un prestataire sont requis'
      }, { status: 400 })
    }

    logger.info("📝 Requesting quote for intervention:", interventionId, "from providers:", targetProviderIds)

    // Get current user from database
    const user = await userService.findByAuthUserId(authUser.id)
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Utilisateur non trouvé'
      }, { status: 404 })
    }

    // Check if user is gestionnaire
    if (user.role !== 'gestionnaire') {
      return NextResponse.json({
        success: false,
        error: 'Seuls les gestionnaires peuvent demander des devis'
      }, { status: 403 })
    }

    // Get intervention details
    const { data: intervention, error: interventionError } = await supabase
      .from('interventions')
      .select(`
        *,
        lot:lot_id(id, reference, building:building_id(name, address, team_id)),
        team:team_id(id, name)
      `)
      .eq('id', interventionId)
      .single()

    if (interventionError || !intervention) {
      logger.error("❌ Intervention not found:", interventionError)
      return NextResponse.json({
        success: false,
        error: 'Intervention non trouvée'
      }, { status: 404 })
    }

    // Check if intervention can receive quote request
    if (intervention.status !== 'approuvee' && intervention.status !== 'demande_de_devis') {
      return NextResponse.json({
        success: false,
        error: `Une demande de devis ne peut être faite que pour les interventions approuvées ou en demande de devis (statut actuel: ${intervention.status})`
      }, { status: 400 })
    }

    // Check if user belongs to intervention team
    if (intervention.team_id && user.team_id !== intervention.team_id) {
      return NextResponse.json({
        success: false,
        error: 'Vous n\'êtes pas autorisé à modifier cette intervention'
      }, { status: 403 })
    }

    // Verify all providers exist and have proper role
    const { data: providers, error: providerError } = await supabase
      .from('users')
      .select('id, name, email, role, provider_category')
      .in('id', targetProviderIds)

    if (providerError) {
      logger.error("❌ Error fetching providers:", providerError)
      return NextResponse.json({
        success: false,
        error: 'Erreur lors de la vérification des prestataires'
      }, { status: 500 })
    }

    if (!providers || providers.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Aucun prestataire trouvé'
      }, { status: 404 })
    }

    // Check that all users are prestataires
    const invalidProviders = providers.filter(p => p.role !== 'prestataire')
    if (invalidProviders.length > 0) {
      return NextResponse.json({
        success: false,
        error: `Les utilisateurs suivants ne sont pas des prestataires: ${invalidProviders.map(p => p.name).join(', ')}`
      }, { status: 400 })
    }

    // Check that all requested provider IDs were found
    const foundIds = providers.map(p => p.id)
    const missingIds = targetProviderIds.filter(id => !foundIds.includes(id))
    if (missingIds.length > 0) {
      return NextResponse.json({
        success: false,
        error: `Prestataires non trouvés: ${missingIds.join(', ')}`
      }, { status: 404 })
    }

    // Check eligibility of requested providers (exclude those with pending/approved quotes)
    const { eligibleIds, ineligibleReasons } = await getEligibleProviders(
      supabase,
      interventionId,
      targetProviderIds
    )

    if (eligibleIds.length === 0) {
      const reasonsList = Object.entries(ineligibleReasons)
        .map(([id, reason]) => {
          const provider = providers.find(p => p.id === id)
          return `${provider?.name || id} (${reason})`
        })
        .join(', ')

      return NextResponse.json({
        success: false,
        error: `Aucun prestataire éligible pour recevoir une demande de devis. ${reasonsList}`
      }, { status: 400 })
    }

    // Filter providers to only include eligible ones
    const eligibleProviders = providers.filter(p => eligibleIds.includes(p.id))

    // Update intervention status and add quote information (only if not already in quote request status)
    let updatedIntervention = intervention
    if (intervention.status === 'approuvee') {
      logger.info("🔄 Updating intervention status to 'demande_de_devis'...")
      updatedIntervention = await interventionService.update(interventionId, {
        status: 'demande_de_devis' as Database['public']['Enums']['intervention_status'],
        quote_deadline: deadline || null,
        quote_notes: additionalNotes || null,
        updated_at: new Date().toISOString()
      })
    } else {
      logger.info("ℹ️ Intervention already in 'demande_de_devis' status, updating quote information...")
      updatedIntervention = await interventionService.update(interventionId, {
        quote_deadline: deadline || null,
        quote_notes: additionalNotes || null,
        updated_at: new Date().toISOString()
      })
    }

    // Create individual quote requests for each provider
    logger.info("📋 Creating individual quote requests...")

    const quoteRequestPromises = eligibleProviders.map(async (provider) => {
      const individualMessage = individualMessages[provider.id] || additionalNotes || null

      // Create quote request
      const { data: quoteRequest, error: quoteRequestError } = await supabase
        .from('quote_requests')
        .insert({
          intervention_id: interventionId,
          provider_id: provider.id,
          status: 'sent',
          individual_message: individualMessage,
          deadline: deadline ? new Date(deadline).toISOString() : null,
          sent_at: new Date().toISOString(),
          created_by: user.id
        })
        .select()
        .single()

      if (quoteRequestError) {
        logger.error(`❌ Error creating quote request for provider ${provider.name}:`, quoteRequestError)
        return { provider, error: quoteRequestError }
      }

      // Also maintain compatibility with intervention_contacts for existing functionality
      const { error: assignmentError } = await supabase
        .from('intervention_contacts')
        .upsert({
          intervention_id: interventionId,
          user_id: provider.id,
          role: 'prestataire',
          is_primary: false, // Not needed anymore with individual requests
          individual_message: individualMessage,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'intervention_id,user_id,role'
        })

      if (assignmentError) {
        logger.warn(`⚠️ Error updating intervention_contacts for provider ${provider.name}:`, assignmentError)
      }

      return { provider, quoteRequest, error: null }
    })

    let createdQuoteRequests = []

    try {
      const quoteRequestResults = await Promise.all(quoteRequestPromises)
      const failedRequests = quoteRequestResults.filter(result => result.error)
      createdQuoteRequests = quoteRequestResults.filter(result => !result.error).map(result => result.quoteRequest)

      if (failedRequests.length > 0) {
        logger.error("❌ Some quote request creations failed:", failedRequests)

        // If all failed, return error
        if (failedRequests.length === eligibleProviders.length) {
          return NextResponse.json({
            success: false,
            error: 'Échec de la création des demandes de devis pour tous les prestataires'
          }, { status: 500 })
        }
      }

      logger.info(`✅ Successfully created ${createdQuoteRequests.length} quote requests`)
    } catch (requestError) {
      logger.error("❌ Error during quote request creation:", requestError)
      return NextResponse.json({
        success: false,
        error: 'Erreur lors de la création des demandes de devis'
      }, { status: 500 })
    }

    logger.info("✅ Intervention updated to quote request successfully")

    // Send notifications to all providers about quote request
    try {
      const notificationPromises = eligibleProviders.map(provider => {
        const individualMessage = individualMessages[provider.id] || additionalNotes

        return notificationService.notifyQuoteRequest(
          intervention,
          provider,
          user.id,
          deadline,
          individualMessage
        )
      })

      await Promise.all(notificationPromises)
      logger.info(`📧 Quote request notifications sent to ${eligibleProviders.length} provider(s)`)
    } catch (notifError) {
      logger.warn("⚠️ Could not send quote request notifications:", notifError)
      // Don't fail the request for notification errors
    }

    // Send status change notifications (only if status actually changed)
    if (intervention.status === 'approuvee') {
      try {
        await notificationService.notifyInterventionStatusChanged(
          intervention,
          'approuvee',
          'demande_de_devis',
          user.id
        )
        logger.info("📧 Status change notifications sent")
      } catch (notifError) {
        logger.warn("⚠️ Could not send status notifications:", notifError)
      }
    }

    return NextResponse.json({
      success: true,
      intervention: {
        id: updatedIntervention.id,
        status: updatedIntervention.status,
        title: updatedIntervention.title,
        quote_deadline: updatedIntervention.quote_deadline,
        updated_at: updatedIntervention.updated_at
      },
      providers: eligibleProviders.map(provider => ({
        id: provider.id,
        name: provider.name,
        email: provider.email,
        provider_category: provider.provider_category
      })),
      message: `Demande de devis envoyée à ${eligibleProviders.length} prestataire(s) avec succès: ${eligibleProviders.map(p => p.name).join(', ')}`
    })

  } catch (error) {
    logger.error("❌ Error in intervention-quote-request API:", error)
    logger.error("❌ Error details:", {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack',
    })

    return NextResponse.json({
      success: false,
      error: 'Erreur lors de la demande de devis'
    }, { status: 500 })
  }
}
