import { NextRequest, NextResponse } from 'next/server'
import { Database } from '@/lib/database.types'
import { notificationService } from '@/lib/notification-service'
import { logger, logError } from '@/lib/logger'
import { getApiAuthContext } from '@/lib/api-auth-helper'


export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const interventionId = resolvedParams.id

    // ✅ AUTH + ROLE CHECK: 50 lignes → 3 lignes! (prestataire required) + BUG FIX: userService was undefined!
    const authResult = await getApiAuthContext({ requiredRole: 'prestataire' })
    if (!authResult.success) return authResult.error

    const { supabase, userProfile: user } = authResult.data

    // Parse request body
    const body = await request.json()
    const {
      workSummary,
      workDetails,
      materialsUsed,
      actualDurationHours,
      actualCost,
      issuesEncountered,
      recommendations,
      beforePhotos,
      afterPhotos,
      documents,
      qualityAssurance
    } = body

    // Validation
    if (!workSummary?.trim() || !workDetails?.trim() || !actualDurationHours) {
      return NextResponse.json({
        success: false,
        error: 'Les champs requis sont manquants'
      }, { status: 400 })
    }

    if (actualDurationHours <= 0) {
      return NextResponse.json({
        success: false,
        error: 'La durée doit être positive'
      }, { status: 400 })
    }

    // Check QA requirements
    const qaValues = Object.values(qualityAssurance || {})
    if (!qaValues.every(val => val === true)) {
      return NextResponse.json({
        success: false,
        error: 'Tous les points d\'assurance qualité doivent être validés'
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
    if (intervention.status !== 'en_cours') {
      return NextResponse.json({
        success: false,
        error: `Le rapport ne peut être soumis que pour les interventions en cours (statut actuel: ${intervention.status})`
      }, { status: 400 })
    }

    // Check if user is assigned to this intervention
    const { data: assignment, error: assignmentError } = await supabase
      .from('intervention_contacts')
      .select('*')
      .eq('intervention_id', interventionId)
      .eq('user_id', user.id)
      .eq('role', 'prestataire')
      .single()

    if (assignmentError || !assignment) {
      return NextResponse.json({
        success: false,
        error: 'Vous n\'êtes pas assigné à cette intervention'
      }, { status: 403 })
    }

    logger.info({ interventionId: interventionId }, "📝 Processing work completion report for intervention:")

    // TODO: Handle file uploads to Supabase Storage
    // For now, we'll store file references as JSON
    const processedBeforePhotos = beforePhotos || []
    const processedAfterPhotos = afterPhotos || []
    const processedDocuments = documents || []

    // Create work completion record
    const workCompletionData = {
      intervention_id: interventionId,
      provider_id: user.id,
      work_summary: workSummary.trim(),
      work_details: workDetails.trim(),
      materials_used: materialsUsed?.trim() || null,
      actual_duration_hours: actualDurationHours,
      actual_cost: actualCost || null,
      issues_encountered: issuesEncountered?.trim() || null,
      recommendations: recommendations?.trim() || null,
      before_photos: JSON.stringify(processedBeforePhotos),
      after_photos: JSON.stringify(processedAfterPhotos),
      documents: JSON.stringify(processedDocuments),
      quality_assurance: JSON.stringify(qualityAssurance),
      submitted_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Insert work completion record
    const { data: workCompletion, error: insertError } = await supabase
      .from('intervention_work_completions')
      .insert(workCompletionData)
      .select()
      .single()

    if (insertError) {
      logger.error({ error: insertError }, "❌ Error creating work completion record:")
      return NextResponse.json({
        success: false,
        error: 'Erreur lors de la sauvegarde du rapport'
      }, { status: 500 })
    }

    // Update intervention status
    const { error: updateError } = await supabase
      .from('interventions')
      .update({
        status: 'cloturee_par_prestataire',
        updated_at: new Date().toISOString()
      })
      .eq('id', interventionId)

    if (updateError) {
      logger.error({ error: updateError }, "❌ Error updating intervention status:")
      return NextResponse.json({
        success: false,
        error: 'Erreur lors de la mise à jour du statut'
      }, { status: 500 })
    }

    logger.info({}, "✅ Work completion report submitted successfully")

    // Send notifications
    try {
      // Notify tenant and gestionnaires
      const { data: contacts } = await supabase
        .from('intervention_contacts')
        .select(`
          user:user_id(id, name, email, role)
        `)
        .eq('intervention_id', interventionId)
        .in('role', ['gestionnaire'])

      const tenantNotificationPromise = intervention.tenant_id ?
        notificationService.createNotification({
          userId: intervention.tenant_id,
          teamId: intervention.team_id,
          createdBy: user.id,
          type: 'intervention',
          priority: 'high',
          title: 'Travaux terminés',
          message: `Les travaux pour "${intervention.title}" sont terminés. Veuillez valider la réalisation.`,
          isPersonal: true,
          metadata: {
            interventionId: interventionId,
            interventionTitle: intervention.title,
            providerName: user.name,
            actionRequired: 'tenant_validation'
          },
          relatedEntityType: 'intervention',
          relatedEntityId: interventionId
        }) : Promise.resolve()

      const managerNotificationPromises = contacts?.map(contact =>
        notificationService.createNotification({
          userId: contact.user.id,
          teamId: intervention.team_id,
          createdBy: user.id,
          type: 'intervention',
          priority: 'normal',
          title: 'Rapport de fin de travaux reçu',
          message: `${user.name} a soumis un rapport de fin pour "${intervention.title}"`,
          isPersonal: true,
          metadata: {
            interventionId: interventionId,
            interventionTitle: intervention.title,
            providerName: user.name
          },
          relatedEntityType: 'intervention',
          relatedEntityId: interventionId
        })
      ) || []

      await Promise.all([tenantNotificationPromise, ...managerNotificationPromises])
      logger.info({}, "📧 Work completion notifications sent")
    } catch (notifError) {
      logger.warn({ notifError: notifError }, "⚠️ Could not send work completion notifications:")
    }

    return NextResponse.json({
      success: true,
      workCompletion: {
        id: workCompletion.id,
        intervention_id: workCompletion.intervention_id,
        submitted_at: workCompletion.submitted_at
      },
      message: 'Rapport de fin de travaux soumis avec succès'
    })

  } catch (error) {
    logger.error({ error: error }, "❌ Error in work completion API:")
    return NextResponse.json({
      success: false,
      error: 'Erreur interne du serveur'
    }, { status: 500 })
  }
}