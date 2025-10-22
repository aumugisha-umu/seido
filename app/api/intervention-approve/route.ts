import { NextRequest, NextResponse } from 'next/server'
import { notificationService } from '@/lib/notification-service'
import { Database } from '@/lib/database.types'
import { logger } from '@/lib/logger'
import { createServerInterventionService } from '@/lib/services'
import { requireApiRole } from '@/lib/api-auth-helper'

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
    const {
      interventionId,
      internalComment
    } = body

    if (!interventionId) {
      return NextResponse.json({
        success: false,
        error: 'interventionId est requis'
      }, { status: 400 })
    }

    logger.info({ interventionId }, "📝 Approving intervention:")

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

    // Update intervention status and add internal comment
    const updatedIntervention = await interventionService.update(interventionId, {
      status: 'approuvee' as Database['public']['Enums']['intervention_status'],
      manager_comment: internalComment || null,
      updated_at: new Date().toISOString()
    })

    logger.info({}, "✅ Intervention approved successfully")

    // Send notifications with proper logic (personal/team)
    try {
      await notificationService.notifyInterventionStatusChanged(
        intervention, 
        'demande', 
        'approuvee', 
        user.id
      )
      logger.info({}, "📧 Notifications sent with proper logic")
    } catch (notifError) {
      logger.warn({ notifError: notifError }, "⚠️ Could not send notifications:")
      // Don't fail the approval for notification errors
    }

    return NextResponse.json({
      success: true,
      intervention: {
        id: updatedIntervention.id,
        status: updatedIntervention.status,
        title: updatedIntervention.title,
        updated_at: updatedIntervention.updated_at
      },
      message: 'Intervention approuvée avec succès'
    })

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
