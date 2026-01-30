import { NextRequest, NextResponse } from 'next/server'
import { notifyInterventionStatusChange } from '@/app/actions/notification-actions'
import { Database } from '@/lib/database.types'
import { logger, logError } from '@/lib/logger'
import { createServerInterventionService, createServerActionInterventionCommentRepository } from '@/lib/services'
import { getApiAuthContext } from '@/lib/api-auth-helper'
import { interventionRejectSchema, validateRequest, formatZodErrors } from '@/lib/validation/schemas'

export async function POST(request: NextRequest) {
  logger.info({}, "❌ intervention-reject API route called")

  // Initialize services
  const interventionService = await createServerInterventionService()

  try {
    // ✅ AUTH + ROLE CHECK: 65 lignes → 3 lignes! (gestionnaire required)
    const authResult = await getApiAuthContext({ requiredRole: 'gestionnaire' })
    if (!authResult.success) return authResult.error

    const { supabase, userProfile: user } = authResult.data

    // Parse request body
    const body = await request.json()

    // ✅ ZOD VALIDATION
    const validation = validateRequest(interventionRejectSchema, body)
    if (!validation.success) {
      logger.warn({ errors: formatZodErrors(validation.errors) }, '⚠️ [INTERVENTION-REJECT] Validation failed')
      return NextResponse.json({
        success: false,
        error: 'Données invalides',
        details: formatZodErrors(validation.errors)
      }, { status: 400 })
    }

    const {
      interventionId,
      reason: rejectionReason,
      internalComment
    } = validation.data

    logger.info({ interventionId, rejectionReason, internalComment: internalComment || '(empty)' }, "📝 Rejecting intervention")

    // Get intervention details
    const { data: intervention, error: interventionError } = await supabase
      .from('interventions')
      .select(`
        *,
        lot:lot_id(id, reference, building:building_id(name, team_id, address_record:address_id(*))),
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

    // Check if intervention can be rejected
    if (intervention.status !== 'demande') {
      return NextResponse.json({
        success: false,
        error: `L'intervention ne peut pas être rejetée (statut actuel: ${intervention.status})`
      }, { status: 400 })
    }

    // Check if user belongs to intervention team
    if (intervention.team_id && user.team_id !== intervention.team_id) {
      return NextResponse.json({
        success: false,
        error: 'Vous n\'êtes pas autorisé à modifier cette intervention'
      }, { status: 403 })
    }

    logger.info("🔄 Updating intervention status to 'rejetee'...")

    // Update intervention status
    const updatedIntervention = await interventionService.update(interventionId, {
      status: 'rejetee' as Database['public']['Enums']['intervention_status'],
      updated_at: new Date().toISOString()
    })

    logger.info({}, "❌ Intervention rejected successfully")

    // ✅ Save rejection reason as PUBLIC comment (visible to tenant)
    try {
      const commentRepository = await createServerActionInterventionCommentRepository()

      // 1. Save rejection reason as PUBLIC comment (is_internal: false)
      const rejectionCommentContent = `❌ **Demande rejetée**\n\n${rejectionReason}`
      await commentRepository.createComment(interventionId, user.id, rejectionCommentContent, false)
      logger.info({ interventionId }, "💬 Rejection reason saved as public comment")

      // 2. Save internal comment if provided (is_internal: true)
      if (internalComment?.trim()) {
        await commentRepository.createComment(interventionId, user.id, internalComment.trim(), true)
        logger.info({ interventionId }, "💬 Internal comment saved")
      }
    } catch (commentError) {
      logger.warn({ commentError }, "⚠️ Could not save rejection comment (non-blocking)")
    }

    // Send notifications with proper logic (personal/team)
    try {
      const notifResult = await notifyInterventionStatusChange({
        interventionId: intervention.id,
        oldStatus: 'demande',
        newStatus: 'rejetee',
        reason: rejectionReason
      })

      if (notifResult.success) {
        logger.info({ count: notifResult.data?.length }, "📧 Rejection notifications sent successfully")
      } else {
        logger.warn({ error: notifResult.error }, "⚠️ Notifications partially failed")
      }
    } catch (notifError) {
      logger.warn({ notifError: notifError }, "⚠️ Could not send notifications:")
      // Don't fail the rejection for notification errors
    }

    return NextResponse.json({
      success: true,
      intervention: {
        id: updatedIntervention.id,
        status: updatedIntervention.status,
        title: updatedIntervention.title,
        updated_at: updatedIntervention.updated_at,
        rejectionReason: rejectionReason
      },
      message: 'Intervention rejetée avec succès'
    })

  } catch (error) {
    logger.error({ error }, "❌ Error in intervention-reject API:")
    logger.error({
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack',
    }, "❌ Error details:")

    return NextResponse.json({
      success: false,
      error: 'Erreur lors du rejet de l\'intervention'
    }, { status: 500 })
  }
}
