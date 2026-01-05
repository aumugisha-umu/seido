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
import { interventionValidateTenantSchema, validateRequest, formatZodErrors } from '@/lib/validation/schemas'
import { NotificationService } from '@/lib/services/domain/notification.service'
import { EmailNotificationService } from '@/lib/services/domain/email-notification.service'
import { EmailService } from '@/lib/services/domain/email.service'

export async function POST(request: NextRequest) {
  logger.info({}, "👍 intervention-validate-tenant API route called")

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
    // ✅ AUTH + ROLE CHECK: 74 lignes → 3 lignes! (locataire required)
    const authResult = await getApiAuthContext({ requiredRole: 'locataire' })
    if (!authResult.success) return authResult.error

    const { supabase, userProfile: user } = authResult.data

    // Parse request body
    const body = await request.json()

    // ✅ ZOD VALIDATION
    const validation = validateRequest(interventionValidateTenantSchema, {
      interventionId: body.interventionId,
      validationNotes: body.tenantComment || body.validationNotes
    })
    if (!validation.success) {
      logger.warn({ errors: formatZodErrors(validation.errors) }, '⚠️ [TENANT-VALIDATE] Validation failed')
      return NextResponse.json({
        success: false,
        error: 'Données invalides',
        details: formatZodErrors(validation.errors)
      }, { status: 400 })
    }

    const validatedData = validation.data
    const { interventionId, validationNotes: tenantComment } = validatedData

    // Extract additional fields not in schema but required by business logic
    const validationStatus = body.validationStatus // 'approved' | 'contested'
    const contestReason = body.contestReason
    const satisfactionRating = body.satisfactionRating

    if (!validationStatus || !['approved', 'contested'].includes(validationStatus)) {
      return NextResponse.json({
        success: false,
        error: 'validationStatus (approved/contested) est requis'
      }, { status: 400 })
    }

    if (validationStatus === 'contested' && !contestReason) {
      return NextResponse.json({
        success: false,
        error: 'Le motif de contestation est requis'
      }, { status: 400 })
    }

    logger.info({ interventionId, validationStatus }, "📝 Tenant validating intervention")

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

    // Check if intervention can be validated by tenant
    if (intervention.status !== 'cloturee_par_prestataire') {
      return NextResponse.json({
        success: false,
        error: `L'intervention ne peut pas être validée (statut actuel: ${intervention.status})`
      }, { status: 400 })
    }

    // Check if user is a tenant assigned to this intervention
    const { data: assignment } = await supabase
      .from('intervention_assignments')
      .select('id')
      .eq('intervention_id', interventionId)
      .eq('user_id', user.id)
      .eq('role', 'locataire')
      .single()

    if (!assignment) {
      return NextResponse.json({
        success: false,
        error: 'Vous n\'êtes pas le locataire assigné à cette intervention'
      }, { status: 403 })
    }

    let newStatus: Database['public']['Enums']['intervention_status']
    let notificationTitle = ''
    let notificationMessage = ''

    if (validationStatus === 'approved') {
      newStatus = 'cloturee_par_locataire'
      notificationTitle = 'Intervention validée par le locataire'
      notificationMessage = `L'intervention "${intervention.title}" a été validée par le locataire ${user.name}. Elle peut maintenant être finalisée administrativement.`
    } else if (validationStatus === 'contested') {
      // Note: 'en_cours' is DEPRECATED - return to 'planifiee' for provider to redo work
      newStatus = 'planifiee' // Return to scheduled for provider to redo
      notificationTitle = 'Intervention contestée par le locataire'
      notificationMessage = `L'intervention "${intervention.title}" a été contestée par le locataire ${user.name}. Motif: ${contestReason}`
    } else {
      return NextResponse.json({
        success: false,
        error: 'Statut de validation non reconnu'
      }, { status: 400 })
    }

    logger.info({ newStatus: newStatus }, "🔄 Updating intervention status to:")

    // Build tenant comment
    const commentParts = []
    commentParts.push(`Validation locataire: ${validationStatus === 'approved' ? 'Approuvée' : 'Contestée'}`)
    if (tenantComment) {
      commentParts.push(`Commentaire: ${tenantComment}`)
    }
    if (validationStatus === 'contested' && contestReason) {
      commentParts.push(`Motif contestation: ${contestReason}`)
    }
    if (satisfactionRating) {
      commentParts.push(`Note satisfaction: ${satisfactionRating}/5`)
    }
    commentParts.push(`Par ${user.name} le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`)

    const existingComment = intervention.tenant_comment || ''
    const updatedComment = existingComment + (existingComment ? ' | ' : '') + commentParts.join(' | ')

    // Update intervention
    const updateData = {
      status: newStatus,
      tenant_comment: updatedComment,
      updated_at: new Date().toISOString()
    }

    if (validationStatus === 'approved') {
      updateData.tenant_validated_date = new Date().toISOString()
    }

    if (satisfactionRating && !isNaN(parseInt(satisfactionRating))) {
      updateData.tenant_satisfaction_rating = parseInt(satisfactionRating)
    }

    const updatedIntervention = await interventionService.update(interventionId, updateData)

    logger.info({ validationStatus }, "✅ Intervention by tenant successfully")

    // ═══════════════════════════════════════════════════════════════════════════
    // NOTIFICATIONS IN-APP: Gestionnaires + Prestataires
    // ═══════════════════════════════════════════════════════════════════════════

    // Extract gestionnaires and prestataires from intervention_assignments
    const assignments = intervention.intervention_assignments || []
    const assignedGestionnaires = assignments
      .filter((a: any) => a.role === 'gestionnaire' && a.user?.id)
    const assignedPrestataires = assignments
      .filter((a: any) => a.role === 'prestataire' && a.user?.id)

    // Notify gestionnaires
    for (const assignment of assignedGestionnaires) {
      const manager = assignment.user
      if (!manager?.id) continue

      try {
        await notificationService.createNotification({
          userId: manager.id,
          teamId: intervention.team_id!,
          createdBy: user.id,
          type: 'intervention',
          title: notificationTitle,
          message: notificationMessage,
          isPersonal: assignment.is_primary ?? false,
          metadata: {
            interventionId: intervention.id,
            interventionTitle: intervention.title,
            validatedBy: user.name,
            validationStatus: validationStatus,
            contestReason: contestReason || null,
            satisfactionRating: satisfactionRating || null,
            lotReference: intervention.lot?.reference,
            buildingName: intervention.lot?.building?.name
          },
          relatedEntityType: 'intervention',
          relatedEntityId: intervention.id
        })
        logger.info({ managerId: manager.id }, "📧 Validation notification sent to gestionnaire")
      } catch (notifError) {
        logger.warn({ managerName: manager.name, notifError }, "⚠️ Could not send notification to manager:")
      }
    }

    // Notify prestataires
    for (const assignment of assignedPrestataires) {
      const provider = assignment.user
      if (!provider?.id) continue

      try {
        await notificationService.createNotification({
          userId: provider.id,
          teamId: intervention.team_id!,
          createdBy: user.id,
          type: 'intervention',
          title: notificationTitle,
          message: validationStatus === 'approved' ?
            `L'intervention "${intervention.title}" a été validée par le locataire.` :
            `L'intervention "${intervention.title}" a été contestée par le locataire. Des corrections peuvent être nécessaires.`,
          isPersonal: true,
          metadata: {
            interventionId: intervention.id,
            interventionTitle: intervention.title,
            validationStatus: validationStatus,
            contestReason: contestReason || null
          },
          relatedEntityType: 'intervention',
          relatedEntityId: intervention.id
        })
        logger.info({ providerId: provider.id }, "📧 Validation notification sent to prestataire")
      } catch (notifError) {
        logger.warn({ providerName: provider.name, notifError }, "⚠️ Could not send notification to provider:")
      }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // EMAIL NOTIFICATIONS: Validation locataire
    // ═══════════════════════════════════════════════════════════════════════════
    // Note: Email 'status_changed' not yet implemented - will be logged as warning
    try {
      const emailResult = await emailNotificationService.sendInterventionEmails({
        interventionId: intervention.id,
        eventType: 'status_changed',
        excludeUserId: user.id,
        onlyRoles: ['gestionnaire', 'prestataire'],
        excludeNonPersonal: true,
        statusChange: {
          oldStatus: 'cloturee_par_prestataire',
          newStatus: newStatus,
          reason: contestReason
        }
      })

      logger.info({
        emailsSent: emailResult.sentCount,
        emailsFailed: emailResult.failedCount
      }, "📧 Validation emails sent")
    } catch (emailError) {
      logger.warn({ emailError }, "⚠️ Could not send validation emails:")
    }

    return NextResponse.json({
      success: true,
      intervention: {
        id: updatedIntervention.id,
        status: updatedIntervention.status,
        title: updatedIntervention.title,
        tenant_validated_date: updatedIntervention.tenant_validated_date,
        tenant_satisfaction_rating: updatedIntervention.tenant_satisfaction_rating,
        updated_at: updatedIntervention.updated_at
      },
      validationStatus,
      validatedBy: {
        name: user.name,
        role: user.role
      },
      message: `Intervention ${validationStatus === 'approved' ? 'validée' : 'contestée'} avec succès`
    })

  } catch (error) {
    logger.error({ error }, "❌ Error in intervention-validate-tenant API:")
    logger.error({
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack',
    }, "❌ Error details:")

    return NextResponse.json({
      success: false,
      error: 'Erreur lors de la validation de l\'intervention'
    }, { status: 500 })
  }
}
