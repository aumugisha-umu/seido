import { NextRequest, NextResponse } from 'next/server'
import { Database } from '@/lib/database.types'
import { logger, logError } from '@/lib/logger'
import { getApiAuthContext } from '@/lib/api-auth-helper'
import { managerFinalizationSchema, validateRequest, formatZodErrors } from '@/lib/validation/schemas'
import { notifyInterventionStatusChange } from '@/app/actions/notifications'


export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const interventionId = resolvedParams.id

    // ✅ AUTH + ROLE CHECK: 50 lignes → 3 lignes! (gestionnaire required) + BUG FIX: userService was undefined!
    const authResult = await getApiAuthContext({ requiredRole: 'gestionnaire' })
    if (!authResult.success) return authResult.error

    const { supabase, userProfile: user } = authResult.data

    // Parse request body
    const body = await request.json()

    // ✅ ZOD VALIDATION
    const validation = validateRequest(managerFinalizationSchema, body)
    if (!validation.success) {
      logger.warn({ errors: formatZodErrors(validation.errors) }, '⚠️ [MANAGER-FINALIZATION] Validation failed')
      return NextResponse.json({
        success: false,
        error: 'Données invalides',
        details: formatZodErrors(validation.errors)
      }, { status: 400 })
    }

    const validatedData = validation.data
    const { status: finalStatus, notes: adminComments, finalCost } = validatedData

    // Additional validation for complex nested data (not covered by schema)
    const {
      qualityControl,
      financialSummary,
      documentation,
      archivalData,
      followUpActions,
      additionalDocuments
    } = body

    // Check quality control requirements
    const qcValues = Object.values(qualityControl || {})
    if (!qcValues.every(val => val === true)) {
      return NextResponse.json({
        success: false,
        error: 'Tous les points de contrôle qualité doivent être validés'
      }, { status: 400 })
    }

    // Check documentation requirements
    const docValues = Object.values(documentation || {})
    if (!docValues.every(val => val === true)) {
      return NextResponse.json({
        success: false,
        error: 'Tous les documents doivent être confirmés'
      }, { status: 400 })
    }

    // Validate financial data
    if (!financialSummary?.finalCost || financialSummary.finalCost <= 0) {
      return NextResponse.json({
        success: false,
        error: 'Le coût final doit être positif'
      }, { status: 400 })
    }

    if (Math.abs(financialSummary.budgetVariance || 0) > 20 && !financialSummary.costJustification?.trim()) {
      return NextResponse.json({
        success: false,
        error: 'Une justification est requise pour une variance budgétaire > 20%'
      }, { status: 400 })
    }

    // Get intervention
    const { data: intervention, error: interventionError } = await supabase
      .from('interventions')
      .select('*')
      .eq('id', interventionId)
      .single()

    if (interventionError || !intervention) {
      return NextResponse.json({
        success: false,
        error: 'Intervention non trouvée'
      }, { status: 404 })
    }

    // Check if intervention is in correct status
    if (!['cloturee_par_locataire', 'contestee'].includes(intervention.status)) {
      return NextResponse.json({
        success: false,
        error: `La finalisation ne peut être faite que pour les interventions validées par le locataire ou contestées (statut actuel: ${intervention.status})`
      }, { status: 400 })
    }

    // Check if user belongs to intervention team
    if (intervention.team_id && user.team_id !== intervention.team_id) {
      return NextResponse.json({
        success: false,
        error: 'Vous n\'êtes pas autorisé à finaliser cette intervention'
      }, { status: 403 })
    }

    logger.info(`📝 Processing manager finalization (${finalStatus}) for intervention:`, interventionId)

    // TODO: Handle additional documents upload to Supabase Storage
    const processedDocuments = additionalDocuments || []

    // Create manager finalization record
    const finalizationData = {
      intervention_id: interventionId,
      manager_id: user.id,
      final_status: finalStatus,
      admin_comments: adminComments.trim(),
      quality_control: JSON.stringify(qualityControl || {}),
      financial_summary: JSON.stringify(financialSummary || {}),
      documentation: JSON.stringify(documentation || {}),
      archival_data: JSON.stringify(archivalData || {}),
      follow_up_actions: JSON.stringify(followUpActions || {}),
      additional_documents: JSON.stringify(processedDocuments),
      finalized_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Insert finalization record
    const { data: finalization, error: insertError } = await supabase
      .from('intervention_manager_finalizations')
      .insert(finalizationData)
      .select()
      .single()

    if (insertError) {
      logger.error({ error: insertError }, "❌ Error creating manager finalization record:")
      return NextResponse.json({
        success: false,
        error: 'Erreur lors de la sauvegarde de la finalisation'
      }, { status: 500 })
    }

    // Update intervention status and financial data
    const newInterventionStatus = finalStatus === 'completed' ? 'cloturee_par_gestionnaire' : finalStatus
    const { error: updateError } = await supabase
      .from('interventions')
      .update({
        status: newInterventionStatus,
        final_cost: financialSummary.finalCost,
        updated_at: new Date().toISOString(),
        finalized_at: new Date().toISOString()
      })
      .eq('id', interventionId)

    if (updateError) {
      logger.error({ error: updateError }, "❌ Error updating intervention:")
      return NextResponse.json({
        success: false,
        error: 'Erreur lors de la mise à jour de l\'intervention'
      }, { status: 500 })
    }

    logger.info({ finalStatus }, "✅ Manager finalization () completed successfully")

    // Send final notifications via server action (handles in-app, push, and email)
    try {
      const notifResult = await notifyInterventionStatusChange({
        interventionId: interventionId,
        oldStatus: intervention.status,
        newStatus: newInterventionStatus
      })

      if (notifResult.success) {
        logger.info({ count: notifResult.data?.length }, "📧 Finalization notifications sent")
      } else {
        logger.warn({ error: notifResult.error }, "⚠️ Notifications partially failed")
      }
    } catch (notifError) {
      logger.warn({ notifError: notifError }, "⚠️ Could not send finalization notifications:")
    }

    // Schedule follow-up actions if needed
    if (followUpActions?.warrantyReminder || followUpActions?.maintenanceSchedule || followUpActions?.feedbackRequest) {
      logger.info({ followUpActions: followUpActions }, "📅 Follow-up actions scheduled:")
      // TODO: Implement follow-up scheduling system
    }

    return NextResponse.json({
      success: true,
      finalization: {
        id: finalization.id,
        intervention_id: finalization.intervention_id,
        final_status: finalization.final_status,
        finalized_at: finalization.finalized_at
      },
      message: 'Intervention finalisée avec succès'
    })

  } catch (error) {
    logger.error({ error: error }, "❌ Error in manager finalization API:")
    return NextResponse.json({
      success: false,
      error: 'Erreur interne du serveur'
    }, { status: 500 })
  }
}