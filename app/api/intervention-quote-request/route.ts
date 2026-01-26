import { NextRequest, NextResponse } from 'next/server'
import { notifyInterventionStatusChange } from '@/app/actions/notification-actions'
import { Database } from '@/lib/database.types'
import { logger } from '@/lib/logger'
import { createServerInterventionService } from '@/lib/services'
import { createQuoteRequestsForProviders } from '../create-manager-intervention/create-quote-requests'
import { getApiAuthContext } from '@/lib/api-auth-helper'
import { createServerClient } from '@supabase/ssr'
import { interventionQuoteRequestSchema, validateRequest, formatZodErrors } from '@/lib/validation/schemas'

/**
 * Identifie les prestataires éligibles pour recevoir une demande d'estimation
 * Exclut ceux ayant déjà une estimation pending/accepted
 */
async function getEligibleProviders(
  supabase: ReturnType<typeof createServerClient<Database>>,
  interventionId: string,
  requestedProviderIds: string[]
): Promise<{ eligibleIds: string[], ineligibleIds: string[], ineligibleReasons: Record<string, string> }> {
  // Récupérer les estimations existantes pour cette intervention
  const { data: existingQuotes, error: quotesError } = await supabase
    .from('intervention_quotes')
    .select('provider_id, status, amount')
    .eq('intervention_id', interventionId)
    .in('provider_id', requestedProviderIds)

  if (quotesError) {
    logger.error({ error: quotesError }, '❌ Error fetching existing quotes:')
    throw new Error('Erreur lors de la vérification des estimations existantes')
  }

  const ineligibleIds: string[] = []
  const ineligibleReasons: Record<string, string> = {}

  // Identifier les prestataires avec des estimations pending/sent/accepted
  if (existingQuotes && existingQuotes.length > 0) {
    existingQuotes.forEach(quote => {
      if (quote.status === 'pending' || quote.status === 'sent' || quote.status === 'accepted') {
        ineligibleIds.push(quote.provider_id)
        ineligibleReasons[quote.provider_id] =
          quote.status === 'pending' ? 'a déjà une demande en attente' :
          quote.status === 'sent' ? 'a déjà soumis une estimation en attente de validation' :
          'a déjà une estimation approuvée'
      }
    })
  }

  const eligibleIds = requestedProviderIds.filter(id => !ineligibleIds.includes(id))

  logger.info({
    requested: requestedProviderIds.length,
    eligible: eligibleIds.length,
    ineligible: ineligibleIds.length,
    ineligibleReasons,
    existingQuotes: existingQuotes?.length || 0
  }, '🔍 Provider eligibility check:')

  return { eligibleIds, ineligibleIds, ineligibleReasons }
}

export async function POST(request: NextRequest) {
  logger.info({}, "✅ intervention-quote-request API route called")

  // Initialize services
  const interventionService = await createServerInterventionService()

  try {
    // ✅ AUTH + ROLE CHECK: 73 lignes → 3 lignes! (gestionnaire required)
    const authResult = await getApiAuthContext({ requiredRole: 'gestionnaire' })
    if (!authResult.success) return authResult.error

    const { supabase, userProfile: user } = authResult.data

    // Parse request body
    const body = await request.json()

    // ✅ ZOD VALIDATION
    const validation = validateRequest(interventionQuoteRequestSchema, body)
    if (!validation.success) {
      logger.warn({ errors: formatZodErrors(validation.errors) }, '⚠️ [QUOTE-REQUEST] Validation failed')
      return NextResponse.json({
        success: false,
        error: 'Données invalides',
        details: formatZodErrors(validation.errors)
      }, { status: 400 })
    }

    const validatedData = validation.data
    const {
      interventionId,
      providerIds: targetProviderIds,
      message: additionalNotes,
      deadline,
    } = validatedData

    // Support legacy individualMessages if needed (not in schema but used in code)
    const individualMessages = (body as any).individualMessages || {}

    logger.info({ interventionId, targetProviderIds }, "📝 Requesting quote for intervention")

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
      logger.error({ interventionError: interventionError }, "❌ Intervention not found:")
      return NextResponse.json({
        success: false,
        error: 'Intervention non trouvée'
      }, { status: 404 })
    }

    // Check if intervention can receive quote request
    // Note: demande_de_devis status removed - quote requests can be made from approuvee or planification
    const allowedStatuses = ['approuvee', 'planification']
    if (!allowedStatuses.includes(intervention.status)) {
      return NextResponse.json({
        success: false,
        error: `Une demande d'estimation ne peut être faite que pour les interventions approuvées ou en planification (statut actuel: ${intervention.status})`
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
      logger.error({ error: providerError }, "❌ Error fetching providers:")
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
        error: `Aucun prestataire éligible pour recevoir une demande d'estimation. ${reasonsList}`
      }, { status: 400 })
    }

    // Filter providers to only include eligible ones
    const eligibleProviders = providers.filter(p => eligibleIds.includes(p.id))

    // Update intervention to set requires_quote flag and quote information
    // Note: We no longer change status to demande_de_devis - quote status is tracked via intervention_quotes
    logger.info("🔄 Setting requires_quote=true and updating quote information...")
    const updatedIntervention = await interventionService.update(interventionId, {
      requires_quote: true,
      quote_deadline: deadline || null,
      quote_notes: additionalNotes || null,
      updated_at: new Date().toISOString()
    })

    // Create intervention_quotes using the clean helper function
    const quoteResult = await createQuoteRequestsForProviders({
      interventionId,
      teamId: intervention.team_id,
      providerIds: eligibleIds,
      createdBy: user.id,
      messageType: 'individual',
      individualMessages,
      globalMessage: additionalNotes,
      supabase
    })

    if (!quoteResult.success) {
      return NextResponse.json({
        success: false,
        error: 'Échec de la création des demandes d\'estimation'
      }, { status: 500 })
    }

    logger.info({}, "✅ Quote request created successfully (status unchanged, quote tracked via intervention_quotes)")

    // Note: Status change notifications removed since status no longer changes
    // Quote request notifications to providers are handled directly via the quote creation process

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
      message: `Demande d'estimation envoyée à ${eligibleProviders.length} prestataire(s) avec succès: ${eligibleProviders.map(p => p.name).join(', ')}`
    })

  } catch (error) {
    logger.error({ error }, "❌ Error in intervention-quote-request API:")
    logger.error({
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack',
    }, "❌ Error details:")

    return NextResponse.json({
      success: false,
      error: 'Erreur lors de la demande d\'estimation'
    }, { status: 500 })
  }
}
