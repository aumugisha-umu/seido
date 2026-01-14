import { NextRequest, NextResponse } from 'next/server'
import { Database } from '@/lib/database.types'
import { logger } from '@/lib/logger'
import {
  createServerInterventionService,
  createServerNotificationRepository,
  createServerUserRepository,
  createServerBuildingRepository,
  createServerLotRepository,
  createServerInterventionRepository
} from '@/lib/services'
import { getApiAuthContext } from '@/lib/api-auth-helper'
import { interventionCompleteSchema, validateRequest, formatZodErrors } from '@/lib/validation/schemas'
import { NotificationService } from '@/lib/services/domain/notification.service'
import { EmailNotificationService } from '@/lib/services/domain/email-notification.service'
import { EmailService } from '@/lib/services/domain/email.service'

export async function POST(request: NextRequest) {
  logger.info({}, "✅ intervention-complete API route called")

  // Initialize services
  const interventionService = await createServerInterventionService()

  // Initialize notification services
  const notificationRepository = await createServerNotificationRepository()
  const interventionRepository = await createServerInterventionRepository()
  const userRepository = await createServerUserRepository()
  const buildingRepository = await createServerBuildingRepository()
  const lotRepository = await createServerLotRepository()
  const emailService = new EmailService()

  const notificationService = new NotificationService(notificationRepository)
  const emailNotificationService = new EmailNotificationService(
    notificationRepository,
    emailService,
    interventionRepository,
    userRepository,
    buildingRepository,
    lotRepository
  )

  try {
    // ✅ AUTH: 71 lignes → 8 lignes! (gestionnaire OR prestataire)
    const authResult = await getApiAuthContext()
    if (!authResult.success) return authResult.error

    const { supabase, userProfile: user } = authResult.data

    // Check if user is prestataire or gestionnaire (multi-role validation)
    if (!user || !['prestataire', 'gestionnaire', 'admin'].includes(user.role)) {
      return NextResponse.json({
        success: false,
        error: 'Seuls les prestataires et gestionnaires peuvent terminer les interventions'
      }, { status: 403 })
    }

    // Parse request body
    const body = await request.json()

    // ✅ ZOD VALIDATION
    const validation = validateRequest(interventionCompleteSchema, body)
    if (!validation.success) {
      logger.warn({ errors: formatZodErrors(validation.errors) }, '⚠️ [intervention-complete] Validation failed')
      return NextResponse.json({
        success: false,
        error: 'Données invalides',
        details: formatZodErrors(validation.errors)
      }, { status: 400 })
    }

    const validatedData = validation.data
    const {
      interventionId,
      completionNotes
    } = validatedData

    // Additional fields not in schema (backward compatibility)
    const {
      internalComment,
      finalCost, // Montant final (optionnel)
      workDescription // Description des travaux effectués
    } = body

    logger.info({ interventionId: interventionId }, "📝 Completing intervention:")

    // Get intervention details
    const { data: intervention, error: interventionError } = await supabase
      .from('interventions')
      .select(`
        *,
        lot:lot_id(id, reference, building:building_id(name, address, team_id)),
        team:team_id(id, name),
        intervention_assignments(
          role,
          is_primary,
          user:user_id(id, name, email)
        )
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

    // Check if intervention can be completed
    // Interventions can be completed directly from 'planifiee'
    if (intervention.status !== 'planifiee') {
      return NextResponse.json({
        success: false,
        error: `L'intervention ne peut pas être terminée (statut actuel: ${intervention.status})`
      }, { status: 400 })
    }

    // For prestataires, check if they are assigned to this intervention
    if (user.role === 'prestataire') {
      const isAssigned = intervention.intervention_assignments?.some(ic =>
        ic.role === 'prestataire' && ic.user.id === user.id
      )

      if (!isAssigned) {
        return NextResponse.json({
          success: false,
          error: 'Vous n\'êtes pas assigné à cette intervention'
        }, { status: 403 })
      }
    }

    // For gestionnaires, check if they belong to intervention team
    if (user.role === 'gestionnaire' && intervention.team_id && user.team_id !== intervention.team_id) {
      return NextResponse.json({
        success: false,
        error: 'Vous n\'êtes pas autorisé à modifier cette intervention'
      }, { status: 403 })
    }

    logger.info("🔄 Updating intervention status to 'cloturee_par_prestataire'...")

    // Build completion comment
    const commentParts = []
    if (workDescription) {
      commentParts.push(`Travaux effectués: ${workDescription}`)
    }
    if (completionNotes) {
      commentParts.push(`Notes: ${completionNotes}`)
    }
    if (internalComment) {
      commentParts.push(`Note interne: ${internalComment}`)
    }
    if (finalCost) {
      commentParts.push(`Coût final: ${finalCost}€`)
    }
    commentParts.push(`Terminée par ${user.name} (${user.role}) le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`)

    // Note: Comments are now stored in intervention_comments table
    // The completion comment should be saved via the comments system

    // Update intervention status and details
    const updateData = {
      status: 'cloturee_par_prestataire' as Database['public']['Enums']['intervention_status'],
      completed_date: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Add final cost if provided
    if (finalCost && !isNaN(parseFloat(finalCost))) {
      updateData.final_cost = parseFloat(finalCost)
    }

    // Note: Don't pass userId - let RLS handle permissions (like all other endpoints)
    const updateResult = await interventionService.update(interventionId, updateData)

    // Check if update failed
    if (!updateResult || !updateResult.success || updateResult.error) {
      logger.error({
        error: updateResult?.error,
        interventionId
      }, "❌ Failed to update intervention status")

      return NextResponse.json({
        success: false,
        error: updateResult?.error?.message || 'Erreur lors de la mise à jour de l\'intervention',
        details: updateResult?.error
      }, { status: 500 })
    }

    const updatedIntervention = updateResult.data

    logger.info({}, "✅ Intervention status updated successfully")

    // Create intervention report if work description provided
    if (workDescription && intervention.team_id) {
      try {
        const { error: reportError } = await supabase
          .from('intervention_reports')
          .insert({
            intervention_id: interventionId,
            team_id: intervention.team_id,
            report_type: 'provider_report',
            title: `Rapport de fin de travaux - ${intervention.title}`,
            content: workDescription,
            created_by: user.id,
            is_internal: false,
            metadata: {
              completed_date: new Date().toISOString(),
              completed_by_name: user.name,
              completed_by_role: user.role,
              final_cost: finalCost || null,
              has_completion_notes: !!completionNotes,
              lot_reference: intervention.lot?.reference,
              building_name: intervention.lot?.building?.name
            }
          })

        if (reportError) {
          logger.warn({ reportError }, "⚠️ Could not create intervention report:")
        } else {
          logger.info({}, "📝 Intervention report created successfully")
        }
      } catch (reportCreationError) {
        logger.warn({ reportCreationError }, "⚠️ Error creating intervention report:")
      }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // NOTIFICATIONS IN-APP: Locataires + Gestionnaires (si complété par prestataire)
    // ═══════════════════════════════════════════════════════════════════════════

    // Extract locataires from intervention_assignments
    const assignments = intervention.intervention_assignments || []
    const assignedLocataires = assignments
      .filter((a: any) => a.role === 'locataire' && a.user?.id)
      .map((a: any) => a.user)
    const assignedGestionnaires = assignments
      .filter((a: any) => a.role === 'gestionnaire' && a.user?.id)

    const notificationMessage = `L'intervention "${intervention.title}" a été terminée par ${user.name}. Elle est maintenant en attente de votre validation.`

    // Notify locataires for validation
    for (const locataire of assignedLocataires) {
      if (locataire.id === user.id) continue // Don't notify self

      try {
        await notificationService.createNotification({
          userId: locataire.id,
          teamId: intervention.team_id!,
          createdBy: user.id,
          type: 'intervention',
          title: 'Intervention terminée - Validation demandée',
          message: notificationMessage,
          isPersonal: true,
          metadata: {
            interventionId: intervention.id,
            interventionTitle: intervention.title,
            completedBy: user.name,
            completedByRole: user.role,
            finalCost: finalCost || null,
            completionDate: new Date().toISOString(),
            lotReference: intervention.lot?.reference,
            buildingName: intervention.lot?.building?.name
          },
          relatedEntityType: 'intervention',
          relatedEntityId: intervention.id
        })
        logger.info({ locataireId: locataire.id }, "📧 Completion notification sent to locataire for validation")
      } catch (notifError) {
        logger.warn({ locataireName: locataire.name, notifError }, "⚠️ Could not send notification to locataire:")
      }
    }

    // Notify gestionnaires if completed by prestataire
    if (user.role === 'prestataire') {
      for (const assignment of assignedGestionnaires) {
        const manager = assignment.user
        if (!manager?.id) continue

        try {
          await notificationService.createNotification({
            userId: manager.id,
            teamId: intervention.team_id!,
            createdBy: user.id,
            type: 'intervention',
            title: 'Intervention terminée par prestataire',
            message: `L'intervention "${intervention.title}" a été terminée par ${user.name}. En attente de validation par le locataire.`,
            isPersonal: assignment.is_primary ?? false,
            metadata: {
              interventionId: intervention.id,
              interventionTitle: intervention.title,
              completedBy: user.name,
              finalCost: finalCost || null
            },
            relatedEntityType: 'intervention',
            relatedEntityId: intervention.id
          })
          logger.info({ managerId: manager.id }, "📧 Completion notification sent to gestionnaire")
        } catch (notifError) {
          logger.warn({ managerName: manager.name, notifError }, "⚠️ Could not send notification to manager:")
        }
      }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // EMAIL NOTIFICATIONS: Intervention terminée
    // ═══════════════════════════════════════════════════════════════════════════
    try {
      const emailResult = await emailNotificationService.sendInterventionEmails({
        interventionId: intervention.id,
        eventType: 'completed',
        excludeUserId: user.id,  // L'utilisateur qui complète ne reçoit pas d'email
        onlyRoles: ['locataire', 'gestionnaire'],  // Locataire pour validation + gestionnaires info
        excludeNonPersonal: true
      })

      logger.info({
        emailsSent: emailResult.sentCount,
        emailsFailed: emailResult.failedCount
      }, "📧 Completion emails sent")
    } catch (emailError) {
      // Don't fail for email errors
      logger.warn({ emailError }, "⚠️ Could not send completion emails:")
    }

    return NextResponse.json({
      success: true,
      intervention: {
        id: updatedIntervention.id,
        status: updatedIntervention.status,
        title: updatedIntervention.title,
        completed_date: updatedIntervention.completed_date,
        final_cost: updatedIntervention.final_cost,
        updated_at: updatedIntervention.updated_at
      },
      completedBy: {
        name: user.name,
        role: user.role
      },
      message: 'Intervention terminée avec succès'
    })

  } catch (error) {
    logger.error({ error: error }, "❌ Error in intervention-complete API:")
    logger.error({
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack',
    }, "❌ Error details:")

    return NextResponse.json({
      success: false,
      error: 'Erreur lors de la finalisation de l\'intervention'
    }, { status: 500 })
  }
}
