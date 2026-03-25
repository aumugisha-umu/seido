import { NextRequest, NextResponse, after } from 'next/server'
import { notifyQuoteApproved } from '@/app/actions/notifications'
import { logger } from '@/lib/logger'
import { getApiAuthContext } from '@/lib/api-auth-helper'
import { quoteApproveSchema, validateRequest, formatZodErrors } from '@/lib/validation/schemas'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  logger.info({}, '🚀 [API-APPROVE] Starting quote approval API')

  try {
    // ✅ AUTH: 51 lignes → 3 lignes! (uniformisation createServerSupabaseClient → getApiAuthContext)
    const authResult = await getApiAuthContext()
    if (!authResult.success) return authResult.error

    const { supabase, userProfile: userData, authUser: user } = authResult.data

    const body = await request.json()
    const { id } = await params

    // ✅ ZOD VALIDATION
    const validation = validateRequest(quoteApproveSchema, body)
    if (!validation.success) {
      logger.warn({ errors: formatZodErrors(validation.errors) }, '⚠️ [QUOTE-APPROVE] Validation failed')
      return NextResponse.json({
        success: false,
        error: 'Données invalides',
        details: formatZodErrors(validation.errors)
      }, { status: 400 })
    }

    const validatedData = validation.data
    const { notes: comments } = validatedData

    logger.info({
      quoteId: id,
      comments: comments,
      timestamp: new Date().toISOString()
    }, '📋 [API-APPROVE] Request details')

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
        error: 'Estimation non trouvée',
        debug: { quoteError }
      }, { status: 404 })
    }

    if (!quote) {
      logger.error({ id: id }, '❌ [API-APPROVE] Quote not found with ID:')
      return NextResponse.json({
        error: 'Estimation non trouvée',
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

    // ═══════════════════════════════════════════════════════════════════════════
    // NOTIFICATIONS: Send in-app + push + email to provider
    // ═══════════════════════════════════════════════════════════════════════════
    {
      // Capture variables for after() closure
      const emailQuote = { ...quote }
      const emailIntervention = quote.intervention
      const emailManager = { ...userData }
      const emailComments = comments
      const emailProviderId = quote.provider_id
      const emailInterventionId = quote.intervention_id

      after(async () => {
        try {
          const { createEmailNotificationService } = await import('@/lib/services/domain/email-notification.factory')
          const { createServerSupabaseClient } = await import('@/lib/services')

          const emailService = await createEmailNotificationService()
          const supabaseClient = await createServerSupabaseClient()

          // Get provider
          const { data: provider } = await supabaseClient
            .from('users')
            .select('id, email, first_name, last_name, company_name')
            .eq('id', emailProviderId)
            .single()

          // Get intervention details for team_id
          const { data: interventionDetails } = await supabaseClient
            .from('interventions')
            .select(`
              id,
              title,
              team_id,
              lot_id,
              building_id,
              lots(address_record:address_id(*), buildings(address_record:address_id(*))),
              buildings(address_record:address_id(*))
            `)
            .eq('id', emailInterventionId)
            .single()

          if (provider && interventionDetails) {
            // 1. In-app + Push notification
            await notifyQuoteApproved({
              quoteId: emailQuote.id,
              interventionId: emailInterventionId,
              interventionTitle: interventionDetails.title || 'Intervention',
              providerId: provider.id,
              providerName: provider.first_name || provider.company_name || 'Prestataire',
              teamId: interventionDetails.team_id,
              approvedBy: emailManager.id,
              approvedByName: emailManager.name || 'Gestionnaire',
              amount: emailQuote.amount || 0,
              notes: emailComments
            })

            // 2. Email notification
            // Helper to format address from address_record
            const formatAddr = (rec: any) => {
              if (!rec) return null
              if (rec.formatted_address) return rec.formatted_address
              const parts = [rec.street, rec.postal_code, rec.city].filter(Boolean)
              return parts.length > 0 ? parts.join(', ') : null
            }

            let propertyAddress = 'Adresse non spécifiée'
            if (interventionDetails.lot_id && interventionDetails.lots) {
              const lot = interventionDetails.lots as any
              const lotAddr = lot.address_record
              const buildingAddr = lot.buildings?.address_record
              propertyAddress = formatAddr(lotAddr) || formatAddr(buildingAddr) || propertyAddress
            } else if (interventionDetails.building_id && interventionDetails.buildings) {
              const building = interventionDetails.buildings as any
              propertyAddress = formatAddr(building.address_record) || propertyAddress
            }

            await emailService.sendQuoteApproved({
              quote: emailQuote,
              intervention: emailIntervention as any,
              property: { address: propertyAddress },
              manager: emailManager,
              provider,
              approvalNotes: emailComments,
            })
            logger.info({ quoteId: emailQuote.id }, '📧 [API] Quote approved notifications sent (in-app + push + email)')
          }
        } catch (emailError) {
          logger.error({
            quoteId: emailQuote.id,
            error: emailError instanceof Error ? emailError.message : String(emailError)
          }, '⚠️ [API] Quote approval notifications failed (via after())')
        }
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Estimation approuvée avec succès'
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