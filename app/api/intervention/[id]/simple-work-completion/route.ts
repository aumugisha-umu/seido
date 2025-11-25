import { NextRequest, NextResponse } from 'next/server'
import { Database } from '@/lib/database.types'
import { logger, logError } from '@/lib/logger'
import { getApiAuthContext } from '@/lib/api-auth-helper'
import { workCompletionSchema, validateRequest, formatZodErrors } from '@/lib/validation/schemas'
import { NotificationService } from '@/lib/services/domain/notification.service'
import { NotificationRepository } from '@/lib/services/repositories/notification-repository'
import { createServiceRoleSupabaseClient } from '@/lib/services/core/supabase-client'


export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: interventionId } = await params

    // ✅ AUTH: 50 lignes → 8 lignes! (prestataire OR gestionnaire) + BUG FIX: userService was undefined!
    const authResult = await getApiAuthContext()
    if (!authResult.success) return authResult.error

    const { supabase, userProfile: user } = authResult.data

    // Check if user is prestataire or gestionnaire (multi-role validation)
    if (!user || !['prestataire', 'gestionnaire', 'admin'].includes(user.role)) {
      return NextResponse.json({
        success: false,
        error: 'Seuls les prestataires et gestionnaires peuvent marquer une intervention comme terminée'
      }, { status: 403 })
    }

    // Parse request body - simplified structure
    const body = await request.json()

    // ✅ ZOD VALIDATION
    const validation = validateRequest(workCompletionSchema, body)
    if (!validation.success) {
      logger.warn({ errors: formatZodErrors(validation.errors) }, '⚠️ [SIMPLE-WORK-COMPLETION] Validation failed')
      return NextResponse.json({
        success: false,
        error: 'Données invalides',
        details: formatZodErrors(validation.errors)
      }, { status: 400 })
    }

    const validatedData = validation.data
    const { completionNotes, workQuality, completedAt } = validatedData

    // Additional fields specific to simple workflow
    const {
      workReport,
      mediaFiles
    } = body

    // Basic validation - only work report is required
    if (!workReport?.trim()) {
      return NextResponse.json({
        success: false,
        error: 'Le rapport de travaux est obligatoire'
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
    // Accept both 'planifiee' (scheduled) and 'en_cours' (in progress)
    if (!['planifiee', 'en_cours'].includes(intervention.status)) {
      return NextResponse.json({
        success: false,
        error: `Le rapport ne peut être soumis que pour les interventions planifiées ou en cours (statut actuel: ${intervention.status})`
      }, { status: 400 })
    }

    // Check if user is assigned to this intervention
    // For gestionnaires, we check if they are assigned to the intervention in any capacity
    // For prestataires, we check specifically for prestataire role assignment
    let assignmentQuery = supabase
      .from('intervention_assignments')
      .select('*')
      .eq('intervention_id', interventionId)
      .eq('user_id', user.id)

    if (user.role === 'prestataire') {
      assignmentQuery = assignmentQuery.eq('role', 'prestataire')
    }

    const { data: assignment, error: assignmentError } = await assignmentQuery.maybeSingle()

    if (assignmentError || !assignment) {
      logger.warn({ userId: user.id, interventionId, error: assignmentError }, '⚠️ User not assigned to intervention')
      return NextResponse.json({
        success: false,
        error: 'Vous n\'êtes pas assigné à cette intervention'
      }, { status: 403 })
    }

    logger.info({ interventionId, user: user.role, user: user.name }, "📝 Processing simple work completion report for intervention: by :")

    // Process media files (simplified - just store references)
    const processedMediaFiles = mediaFiles || []

    // Create report record in intervention_reports
    const reportData = {
      intervention_id: interventionId,
      team_id: intervention.team_id,
      report_type: 'provider_report',
      title: 'Rapport de fin de travaux',
      content: workReport.trim(),
      metadata: {
        mediaFiles: processedMediaFiles.map(f => ({
          name: f.name,
          size: f.size,
          type: f.type
        })),
        submitted_at: new Date().toISOString(),
        report_version: 'simple' // Distinguish from detailed reports
      },
      is_internal: false, // Visible to all parties (tenant, manager, provider)
      created_by: user.id
    }

    // Use service role client for inserting and updating (bypasses RLS)
    // This is safe because we've already validated permissions above
    const serviceRoleClient = createServiceRoleSupabaseClient()

    // Insert report record
    const { data: report, error: insertError } = await serviceRoleClient
      .from('intervention_reports')
      .insert(reportData)
      .select()
      .single()

    if (insertError) {
      logger.error({ error: insertError }, "❌ Error creating simple work completion report:")
      return NextResponse.json({
        success: false,
        error: 'Erreur lors de la sauvegarde du rapport'
      }, { status: 500 })
    }

    // Update intervention status
    const { error: updateError } = await serviceRoleClient
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

    logger.info({}, "✅ Simple work completion report submitted successfully")

    // Send notifications (same as complex version)
    try {
      // Notification service already uses the service role client
      const notificationRepository = new NotificationRepository(serviceRoleClient)
      const notificationService = new NotificationService(notificationRepository)

      // Get tenant from intervention_assignments (tenant_id column was removed)
      const { data: tenantAssignments } = await supabase
        .from('intervention_assignments')
        .select('user:users!user_id(id, name, email, role)')
        .eq('intervention_id', interventionId)
        .eq('role', 'locataire')
        .limit(1)

      const tenantNotificationPromises = tenantAssignments?.map(assignment =>
        notificationService.createNotification({
          userId: assignment.user.id,
          teamId: intervention.team_id,
          createdBy: user.id,
          type: 'intervention',
          title: 'Travaux terminés',
          message: `Les travaux pour "${intervention.title}" sont terminés. Veuillez valider la réalisation.`,
          isPersonal: true, // Locataire toujours personnel
          metadata: {
            interventionId: interventionId,
            interventionTitle: intervention.title,
            providerName: user.name,
            actionRequired: 'tenant_validation'
          },
          relatedEntityType: 'intervention',
          relatedEntityId: interventionId
        })
      ) || []

      // Get managers from intervention_assignments instead of intervention_contacts
      const { data: managerAssignments } = await supabase
        .from('intervention_assignments')
        .select('user:users!user_id(id, name, email, role), is_primary')
        .eq('intervention_id', interventionId)
        .eq('role', 'gestionnaire')

      const managerNotificationPromises = managerAssignments?.map(assignment =>
        notificationService.createNotification({
          userId: assignment.user.id,
          teamId: intervention.team_id,
          createdBy: user.id,
          type: 'intervention',
          title: 'Rapport de fin de travaux reçu',
          message: `${user.name} a soumis un rapport de fin pour "${intervention.title}"`,
          isPersonal: assignment.is_primary ?? false, // ✅ Basé sur assignation (FIX du BUG hardcodé)
          metadata: {
            interventionId: interventionId,
            interventionTitle: intervention.title,
            providerName: user.name
          },
          relatedEntityType: 'intervention',
          relatedEntityId: interventionId
        })
      ) || []

      await Promise.all([...tenantNotificationPromises, ...managerNotificationPromises])
      logger.info({}, "📧 Simple work completion notifications sent")
    } catch (notifError) {
      logger.warn({ notifError: notifError }, "⚠️ Could not send work completion notifications:")
    }

    return NextResponse.json({
      success: true,
      report: {
        id: report.id,
        intervention_id: report.intervention_id,
        created_at: report.created_at
      },
      message: 'Rapport de fin de travaux soumis avec succès'
    })

  } catch (error) {
    logger.error({ error: error }, "❌ Error in simple work completion API:")
    return NextResponse.json({
      success: false,
      error: 'Erreur interne du serveur'
    }, { status: 500 })
  }
}