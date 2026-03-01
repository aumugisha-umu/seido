import { NextRequest, NextResponse, after } from 'next/server'
import { notifyInterventionStatusChange } from '@/app/actions/notification-actions'
import { Database } from '@/lib/database.types'
import { logger } from '@/lib/logger'
import { createServerInterventionService, createServerNotificationRepository } from '@/lib/services'
import { getApiAuthContext } from '@/lib/api-auth-helper'
import { validateQuoteSchema, validateRequest, formatZodErrors } from '@/lib/validation/schemas'
import { NotificationService } from '@/lib/services/domain/notification.service'

export async function POST(request: NextRequest) {
  logger.info({}, "✅ intervention-quote-validate API route called")

  // Initialize services
  const interventionService = await createServerInterventionService()
  const notificationRepository = await createServerNotificationRepository()
  const notificationService = new NotificationService(notificationRepository)

  try {
    // ✅ AUTH + ROLE CHECK: 73 lignes → 3 lignes! (gestionnaire required)
    const authResult = await getApiAuthContext({ requiredRole: 'gestionnaire' })
    if (!authResult.success) return authResult.error

    const { supabase, userProfile: user } = authResult.data

    // Parse request body
    const body = await request.json()

    // ✅ ZOD VALIDATION
    const validation = validateRequest(validateQuoteSchema, { quoteId: body.quoteId, notes: body.comments || body.notes })
    if (!validation.success) {
      logger.warn({ errors: formatZodErrors(validation.errors) }, '⚠️ [QUOTE-VALIDATE] Validation failed')
      return NextResponse.json({
        success: false,
        error: 'Données invalides',
        details: formatZodErrors(validation.errors)
      }, { status: 400 })
    }

    const validatedData = validation.data
    const { quoteId, notes: comments } = validatedData

    // Extract action and rejection reason (not in schema but required by business logic)
    const action = body.action // 'approve' or 'reject'
    const rejectionReason = body.rejectionReason

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({
        success: false,
        error: 'action (approve/reject) est requise'
      }, { status: 400 })
    }

    if (action === 'reject' && !rejectionReason?.trim()) {
      return NextResponse.json({
        success: false,
        error: 'Le motif de rejet est requis'
      }, { status: 400 })
    }

    logger.info(`📝 ${action === 'approve' ? 'Approving' : 'Rejecting'} quote:`, quoteId)

    // Get quote details with intervention and provider info
    const { data: quote, error: quoteError } = await supabase
      .from('intervention_quotes')
      .select(`
        *,
        intervention:intervention_id(
          id,
          title,
          description,
          status,
          team_id,
          lot:lot_id(id, reference, building:building_id(name, address_record:address_id(*)))
        ),
        provider:provider_id(id, name, email, phone, provider_category)
      `)
      .eq('id', quoteId)
      .single()

    if (quoteError || !quote) {
      logger.error({ quoteError: quoteError }, "❌ Quote not found:")
      return NextResponse.json({
        success: false,
        error: 'Estimation non trouvée'
      }, { status: 404 })
    }

    // Check if quote is still pending
    if (quote.status !== 'pending') {
      return NextResponse.json({
        success: false,
        error: `Cette estimation a déjà été traitée (statut: ${quote.status})`
      }, { status: 400 })
    }

    // Check if user belongs to intervention team
    if (quote.intervention.team_id && user.team_id !== quote.intervention.team_id) {
      return NextResponse.json({
        success: false,
        error: 'Vous n\'êtes pas autorisé à traiter ce devis'
      }, { status: 403 })
    }

    // Quote validation checks could be added here if needed

    logger.info({ status: action === 'approve' ? 'accepted' : 'rejected' }, `🔄 Updating quote status to ${action === 'approve' ? 'accepted' : 'rejected'}`)

    // Prepare update data
    const updateData = {
      status: action === 'approve' ? 'accepted' : 'rejected',
      validated_at: new Date().toISOString(),
      validated_by: user.id,
      updated_at: new Date().toISOString()
    }

    // Note: review_comments will be handled in a separate table in the future
    if (action === 'reject' && rejectionReason?.trim()) {
      updateData.rejection_reason = rejectionReason.trim()
    }

    // Update quote status
    const { data: updatedQuote, error: updateError } = await supabase
      .from('intervention_quotes')
      .update(updateData)
      .eq('id', quoteId)
      .select(`
        *,
        provider:provider_id(id, name, email, phone, provider_category)
      `)
      .single()

    if (updateError) {
      logger.error({ error: updateError }, "❌ Error updating quote:")
      return NextResponse.json({
        success: false,
        error: 'Erreur lors de la mise à jour du devis'
      }, { status: 500 })
    }

    logger.info({ status: action === 'approve' ? 'approved' : 'rejected' }, `✅ Quote ${action === 'approve' ? 'approved' : 'rejected'} successfully`)

    // Track rejected quotes for background notifications
    let rejectedOtherQuotes: Array<{ id: string; providerId: string }> = []

    // If quote is approved, update intervention status and reject other pending quotes
    if (action === 'approve') {
      logger.info("🔄 Updating intervention status to 'planifiee'...")

      // Update intervention status
      await interventionService.update(quote.intervention_id, {
        status: 'planifiee' as Database['public']['Enums']['intervention_status'],
        updated_at: new Date().toISOString()
      })

      // Automatically reject other pending quotes for this intervention
      logger.info({}, "🔄 Rejecting other pending quotes for this intervention...")

      const { data: otherQuotes } = await supabase
        .from('intervention_quotes')
        .select('id, provider:provider_id(id, name, email)')
        .eq('intervention_id', quote.intervention_id)
        .eq('status', 'pending')
        .neq('id', quoteId)

      if (otherQuotes && otherQuotes.length > 0) {
        // Capture for background notifications before DB updates
        rejectedOtherQuotes = otherQuotes.map(q => ({
          id: q.id,
          providerId: q.provider.id
        }))

        const rejectPromises = otherQuotes.map(async (otherQuote) => {
          // Update quote status (synchronous — must complete before response)
          await supabase
            .from('intervention_quotes')
            .update({
              status: 'rejected',
              validated_at: new Date().toISOString(),
              validated_by: user.id,
              rejection_reason: 'Un autre devis a été sélectionné pour cette intervention',
              updated_at: new Date().toISOString()
            })
            .eq('id', otherQuote.id)
        })

        await Promise.all(rejectPromises)
        logger.info({ otherQuotes: otherQuotes.length }, "✅ Rejected other pending quote(s)")
      }
    }

    // Build response
    const response = NextResponse.json({
      success: true,
      quote: {
        id: updatedQuote.id,
        status: updatedQuote.status,
        validated_at: updatedQuote.validated_at,
        validated_by: updatedQuote.validated_by,
        rejection_reason: updatedQuote.rejection_reason
      },
      intervention: action === 'approve' ? {
        id: quote.intervention.id,
        status: 'planifiee'
      } : undefined,
      message: action === 'approve'
        ? `Devis de ${quote.provider.name} approuvé avec succès`
        : `Devis de ${quote.provider.name} rejeté`
    })

    // All notifications run in background after response is sent
    after(async () => {
      try {
        // 1. Notify rejected providers (when a quote is approved, others get auto-rejected)
        for (const otherQuote of rejectedOtherQuotes) {
          try {
            const { data: providerAssignment } = await supabase
              .from('intervention_assignments')
              .select('id')
              .eq('intervention_id', quote.intervention_id)
              .eq('user_id', otherQuote.providerId)
              .eq('role', 'prestataire')
              .maybeSingle()

            await notificationService.createNotification({
              userId: otherQuote.providerId,
              teamId: quote.intervention.team_id,
              createdBy: user.id,
              type: 'intervention',
              title: 'Estimation non retenue',
              message: `Votre estimation pour l'intervention "${quote.intervention.title}" n'a pas été retenue. Un autre prestataire a été sélectionné.`,
              isPersonal: !!providerAssignment,
              metadata: {
                interventionId: quote.intervention_id,
                interventionTitle: quote.intervention.title,
                quoteId: otherQuote.id,
                rejectionReason: 'Une autre estimation a été sélectionnée pour cette intervention'
              },
              relatedEntityType: 'intervention',
              relatedEntityId: quote.intervention_id
            })
          } catch (notifError) {
            logger.warn({ notifError, providerId: otherQuote.providerId }, '⚠️ Could not notify rejected provider')
          }
        }

        // 2. Notify the main provider about approval/rejection
        try {
          const { data: providerAssignment } = await supabase
            .from('intervention_assignments')
            .select('id')
            .eq('intervention_id', quote.intervention_id)
            .eq('user_id', quote.provider.id)
            .eq('role', 'prestataire')
            .maybeSingle()

          await notificationService.createNotification({
            userId: quote.provider.id,
            teamId: quote.intervention.team_id,
            createdBy: user.id,
            type: 'intervention',
            title: action === 'approve' ? 'Estimation approuvée !' : 'Estimation rejetée',
            message: action === 'approve'
              ? `Félicitations ! Votre estimation de ${quote.total_amount.toFixed(2)}€ pour l'intervention "${quote.intervention.title}" a été approuvée.`
              : `Votre estimation pour l'intervention "${quote.intervention.title}" a été rejetée. Motif: ${rejectionReason}`,
            isPersonal: !!providerAssignment,
            metadata: {
              interventionId: quote.intervention_id,
              interventionTitle: quote.intervention.title,
              quoteId: quoteId,
              quoteAmount: quote.total_amount,
              validationAction: action,
              ...(action === 'approve' && { actionRequired: 'intervention_planning' }),
              ...(action === 'reject' && { rejectionReason })
            },
            relatedEntityType: 'intervention',
            relatedEntityId: quote.intervention_id
          })
          logger.info({}, "📧 Quote validation notification sent to provider")
        } catch (notifError) {
          logger.warn({ notifError }, '⚠️ Could not send quote validation notification')
        }

        // 3. Status change notification (only when approved)
        if (action === 'approve') {
          try {
            const notifResult = await notifyInterventionStatusChange({
              interventionId: quote.intervention.id,
              oldStatus: 'demande_de_devis',
              newStatus: 'planifiee'
            })

            if (notifResult.success) {
              logger.info({ count: notifResult.data?.length }, "📧 Intervention status change notifications sent")
            } else {
              logger.warn({ error: notifResult.error }, "⚠️ Notifications partially failed")
            }
          } catch (notifError) {
            logger.warn({ notifError }, "⚠️ Could not send status change notifications")
          }
        }
      } catch (error) {
        logger.error({ error }, '⚠️ Background notification error in quote-validate')
      }
    })

    return response

  } catch (error) {
    logger.error({ error }, "❌ Error in intervention-quote-validate API:")
    logger.error({
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack',
    }, "❌ Error details:")

    return NextResponse.json({
      success: false,
      error: 'Erreur lors de la validation du devis'
    }, { status: 500 })
  }
}
