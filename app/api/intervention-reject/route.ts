import { NextRequest, NextResponse } from 'next/server'
import { notificationService } from '@/lib/notification-service'
import { Database } from '@/lib/database.types'
import { logger, logError } from '@/lib/logger'
import { createServerInterventionService } from '@/lib/services'
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
      reason: rejectionReason
    } = validation.data

    // Keep internalComment from body (not in schema)
    const { internalComment } = body

    logger.info({ interventionId, rejectionReason }, "📝 Rejecting intervention")

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

    // Build manager comment with rejection reason and internal comment
    const managerCommentParts = [`REJETÉ: ${rejectionReason}`]
    // Note: Comments (rejection reason, internal notes) are now stored in intervention_comments table
    // The reason and internalComment parameters should be saved as comments via the comments system

    // Update intervention status
    const updatedIntervention = await interventionService.update(interventionId, {
      status: 'rejetee' as Database['public']['Enums']['intervention_status'],
      updated_at: new Date().toISOString()
    })

    logger.info({}, "❌ Intervention rejected successfully")

    // Send notifications with proper logic (personal/team)
    try {
      await notificationService.notifyInterventionStatusChanged(
        intervention, 
        'demande', 
        'rejetee', 
        user.id,
        rejectionReason // Pass the rejection reason
      )
      logger.info({}, "📧 Rejection notifications sent with proper logic")
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
