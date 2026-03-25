import { NextRequest, NextResponse, after } from 'next/server'
import { notifyInterventionStatusChange } from '@/app/actions/notifications'
import { Database } from '@/lib/database.types'
import { logger } from '@/lib/logger'
import { createServerInterventionService, createServerActionInterventionCommentRepository } from '@/lib/services'
import { requireApiRole } from '@/lib/api-auth-helper'
import { interventionApproveSchema, validateRequest, formatZodErrors } from '@/lib/validation/schemas'

export async function POST(request: NextRequest) {
  logger.info({}, "✅ intervention-approve API route called")

  // Initialize services
  const interventionService = await createServerInterventionService()

  try {
    // ✅ AUTH + ROLE CHECK: 62 lignes → 3 lignes! (gestionnaire required)
    const authResult = await requireApiRole('gestionnaire')
    if (!authResult.success) return authResult.error

    const { supabase, userProfile: user } = authResult.data

    // Parse request body
    const body = await request.json()

    // ✅ ZOD VALIDATION
    const validation = validateRequest(interventionApproveSchema, body)
    if (!validation.success) {
      logger.warn({ errors: formatZodErrors(validation.errors) }, '⚠️ [INTERVENTION-APPROVE] Validation failed')
      return NextResponse.json({
        success: false,
        error: 'Données invalides',
        details: formatZodErrors(validation.errors)
      }, { status: 400 })
    }

    const {
      interventionId,
      notes: internalComment
    } = validation.data

    // 🔍 DEBUG: Log received data for troubleshooting
    logger.info({
      interventionId,
      hasNotes: !!internalComment,
      notesLength: internalComment?.length || 0,
      notesPreview: internalComment ? internalComment.substring(0, 50) : '(empty)',
      rawBody: JSON.stringify(body).substring(0, 200)
    }, "📝 Approving intervention - DEBUG data received")

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

    // Check if intervention can be approved
    if (intervention.status !== 'demande') {
      return NextResponse.json({
        success: false,
        error: `L'intervention ne peut pas être approuvée (statut actuel: ${intervention.status})`
      }, { status: 400 })
    }

    // Check if user belongs to intervention team
    if (intervention.team_id && user.team_id !== intervention.team_id) {
      return NextResponse.json({
        success: false,
        error: 'Vous n\'êtes pas autorisé à modifier cette intervention'
      }, { status: 403 })
    }

    logger.info("🔄 Updating intervention status to 'approuvee'...")

    // Update intervention status
    // Note: Comments are now stored in intervention_comments table
    const updatedIntervention = await interventionService.update(interventionId, {
      status: 'approuvee' as Database['public']['Enums']['intervention_status'],
      updated_at: new Date().toISOString()
    })

    logger.info({}, "✅ Intervention approved successfully")

    // ✅ Save internal comment if provided (is_internal: true)
    // 🔍 DEBUG: Always log comment handling for troubleshooting
    logger.info({
      interventionId,
      userId: user.id,
      hasInternalComment: !!internalComment,
      trimmedHasContent: !!internalComment?.trim(),
      internalCommentLength: internalComment?.length || 0,
      trimmedLength: internalComment?.trim().length || 0
    }, "💬 [DEBUG] Comment handling - checking conditions")

    if (internalComment?.trim()) {
      try {
        logger.info({ interventionId, userId: user.id }, "💬 [DEBUG] About to create comment repository")
        const commentRepository = await createServerActionInterventionCommentRepository()

        logger.info({
          interventionId,
          userId: user.id,
          contentPreview: internalComment.trim().substring(0, 50),
          isInternal: true
        }, "💬 [DEBUG] About to call createComment")

        const result = await commentRepository.createComment(interventionId, user.id, internalComment.trim(), true)

        logger.info({
          interventionId,
          success: result?.success,
          hasData: !!result?.data,
          error: result?.error
        }, "💬 Internal comment saved for approval - RESULT")
      } catch (commentError) {
        logger.error({
          commentError,
          errorMessage: commentError instanceof Error ? commentError.message : 'Unknown error',
          errorStack: commentError instanceof Error ? commentError.stack : undefined,
          interventionId,
          userId: user.id
        }, "❌ [DEBUG] Could not save internal comment - EXCEPTION")
      }
    } else {
      logger.info({ interventionId }, "💬 [DEBUG] No internal comment to save (empty or missing)")
    }

    // Build response FIRST
    const response = NextResponse.json({
      success: true,
      intervention: {
        id: updatedIntervention.id,
        status: updatedIntervention.status,
        title: updatedIntervention.title,
        updated_at: updatedIntervention.updated_at
      },
      message: 'Intervention approuvée avec succès'
    })

    // Run notifications after response is sent
    after(async () => {
      try {
        const notifResult = await notifyInterventionStatusChange({
          interventionId: intervention.id,
          oldStatus: 'demande',
          newStatus: 'approuvee'
        })

        if (notifResult.success) {
          logger.info({ count: notifResult.data?.length }, "📧 Notifications sent successfully")
        } else {
          logger.warn({ error: notifResult.error }, "⚠️ Notifications partially failed")
        }
      } catch (notifError) {
        logger.warn({ notifError: notifError }, "⚠️ Could not send notifications:")
      }
    })

    return response

  } catch (error) {
    logger.error({ error: error }, "❌ Error in intervention-approve API:")
    logger.error({
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack',
    }, "❌ Error details:")

    return NextResponse.json({
      success: false,
      error: 'Erreur lors de l\'approbation de l\'intervention'
    }, { status: 500 })
  }
}
