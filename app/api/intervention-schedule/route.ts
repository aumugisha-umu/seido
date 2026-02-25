import { NextRequest, NextResponse, after } from 'next/server'
import { Database } from '@/lib/database.types'
import { logger } from '@/lib/logger'
import {
  createServerInterventionService,
  createServerNotificationRepository,
  createServerUserRepository,
  createServerBuildingRepository,
  createServerLotRepository,
  createServerInterventionRepository,
  createServerActionInterventionCommentRepository
} from '@/lib/services'
import { getApiAuthContext } from '@/lib/api-auth-helper'
import { interventionScheduleSchema, validateRequest, formatZodErrors } from '@/lib/validation/schemas'
import { NotificationService } from '@/lib/services/domain/notification.service'
import { EmailNotificationService } from '@/lib/services/domain/email-notification.service'
import { EmailService } from '@/lib/services/domain/email.service'

export async function POST(request: NextRequest) {
  logger.info({}, "📅 intervention-schedule API route called")

  // Initialize services
  const interventionService = await createServerInterventionService()

  // Initialize notification services with repositories
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
    // ✅ AUTH + ROLE CHECK: 83 lignes → 3 lignes! (gestionnaire required)
    const authResult = await getApiAuthContext({ requiredRole: 'gestionnaire' })
    if (!authResult.success) return authResult.error

    const { supabase, userProfile: user } = authResult.data

    // Parse request body
    const body = await request.json()

    // ✅ ZOD VALIDATION
    const validation = validateRequest(interventionScheduleSchema, body)
    if (!validation.success) {
      logger.warn({ errors: formatZodErrors(validation.errors) }, '⚠️ [intervention-schedule] Validation failed')
      return NextResponse.json({
        success: false,
        error: 'Données invalides',
        details: formatZodErrors(validation.errors)
      }, { status: 400 })
    }

    const validatedData = validation.data
    const {
      interventionId,
      planningType, // 'direct', 'propose', 'organize'
      directSchedule, // { date, startTime, endTime } - pour planningType === 'direct'
      proposedSlots,  // [{ date, startTime, endTime }] - pour planningType === 'propose'
      internalComment
    } = validatedData

    logger.info({ interventionId, planningType }, "📝 Scheduling intervention")

    // Get intervention details
    const { data: intervention, error: interventionError } = await supabase
      .from('interventions')
      .select(`
        *,
        lot:lot_id(id, reference, building:building_id(name, team_id, address_record:address_id(*))),
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

    // Check if intervention can be scheduled
    // Allow 'demande_de_devis' to enable planning while waiting for quote
    // planifiee allowed for re-planning (modify planning from scheduled state)
    if (!['approuvee', 'planification', 'planifiee', 'demande_de_devis'].includes(intervention.status)) {
      return NextResponse.json({
        success: false,
        error: `L'intervention ne peut pas être planifiée (statut actuel: ${intervention.status})`
      }, { status: 400 })
    }

    // Check if user belongs to intervention team
    if (intervention.team_id && user.team_id !== intervention.team_id) {
      return NextResponse.json({
        success: false,
        error: 'Vous n\'êtes pas autorisé à modifier cette intervention'
      }, { status: 403 })
    }

    let newStatus: Database['public']['Enums']['intervention_status']
    let notificationMessage = ''

    // Handle different planning types
    switch (planningType) {
      case 'direct':
        // Direct appointment - create time slot, wait for confirmation
        if (!directSchedule || !directSchedule.date || !directSchedule.startTime) {
          return NextResponse.json({
            success: false,
            error: 'Date et heure sont requises pour fixer le rendez-vous'
          }, { status: 400 })
        }

        // Stay in 'planification' status - not 'planifiee' yet
        newStatus = 'planification'

        // Create ONE time slot for the fixed appointment
        // Calculate end_time as 1 hour after start_time to satisfy CHECK constraint (end_time > start_time)
        const [hours, minutes] = directSchedule.startTime.split(':').map(Number)
        const endHours = (hours + 1) % 24
        const endTime = `${endHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`

        const directTimeSlot = {
          intervention_id: interventionId,
          slot_date: directSchedule.date,
          start_time: directSchedule.startTime,
          end_time: endTime, // Set to 1 hour after start_time to satisfy CHECK constraint
          status: 'pending', // Modern status pattern (not yet confirmed)
          proposed_by: user.id, // Gestionnaire who proposed it
          notes: 'Rendez-vous fixé par le gestionnaire'
        }

        // Check if any slot is already selected (confirmed) before replacing
        const { data: existingSelectedSlots } = await supabase
          .from('intervention_time_slots')
          .select('id, status')
          .eq('intervention_id', interventionId)
          .eq('status', 'selected')

        if (existingSelectedSlots && existingSelectedSlots.length > 0) {
          logger.warn({ count: existingSelectedSlots.length }, "⚠️ Cannot replace slots - confirmed slot exists")
          return NextResponse.json({
            success: false,
            error: 'Un créneau a déjà été confirmé. Impossible de modifier la planification.'
          }, { status: 400 })
        }

        // Delete any existing non-selected slots for this intervention
        await supabase
          .from('intervention_time_slots')
          .delete()
          .eq('intervention_id', interventionId)
          .neq('status', 'selected')

        // Insert the appointment slot and get back the ID
        const { data: insertedDirectSlot, error: insertSlotError } = await supabase
          .from('intervention_time_slots')
          .insert([directTimeSlot])
          .select('id, slot_date, start_time, end_time')
          .single()

        if (insertSlotError) {
          logger.error({ error: insertSlotError }, "❌ Error creating appointment slot:")
          throw new Error('Erreur lors de la création du rendez-vous')
        }

        // Store for email generation (used in after() closure)
        // @ts-ignore - Used in after() closure
        var insertedDirectSlotWithId = insertedDirectSlot

        notificationMessage = `Un rendez-vous a été proposé pour votre intervention "${intervention.title}" le ${new Date(directSchedule.date).toLocaleDateString('fr-FR')} à ${directSchedule.startTime}. Veuillez confirmer votre disponibilité.`

        logger.info({ directTimeSlot }, "📅 Direct appointment slot created (awaiting confirmation)")
        break

      case 'propose':
        // Propose multiple slots for tenant/provider selection
        if (!proposedSlots || proposedSlots.length === 0) {
          return NextResponse.json({
            success: false,
            error: 'Des créneaux proposés sont requis pour la planification avec choix'
          }, { status: 400 })
        }

        newStatus = 'planification'
        notificationMessage = `Des créneaux ont été proposés pour votre intervention "${intervention.title}". Veuillez indiquer vos préférences.`

        // Store proposed time slots with proposed_by field
        const timeSlots = proposedSlots.map((slot) => ({
          intervention_id: interventionId,
          slot_date: slot.date,
          start_time: slot.startTime,
          end_time: slot.endTime,
          status: 'pending', // Modern status pattern (not yet confirmed)
          proposed_by: user.id // Gestionnaire who proposed these slots
        }))

        // Check if any slot is already selected (confirmed) before replacing
        const { data: existingSelectedSlotsPropose } = await supabase
          .from('intervention_time_slots')
          .select('id, status')
          .eq('intervention_id', interventionId)
          .eq('status', 'selected')

        if (existingSelectedSlotsPropose && existingSelectedSlotsPropose.length > 0) {
          logger.warn({ count: existingSelectedSlotsPropose.length }, "⚠️ Cannot replace slots - confirmed slot exists")
          return NextResponse.json({
            success: false,
            error: 'Un créneau a déjà été confirmé. Impossible de modifier la planification.'
          }, { status: 400 })
        }

        // Delete any existing non-selected slots for this intervention
        await supabase
          .from('intervention_time_slots')
          .delete()
          .eq('intervention_id', interventionId)
          .neq('status', 'selected')

        // Insert the proposed slots and get back their IDs
        const { data: insertedSlots, error: insertSlotsError } = await supabase
          .from('intervention_time_slots')
          .insert(timeSlots)
          .select('id, slot_date, start_time, end_time')

        if (insertSlotsError) {
          logger.error({ error: insertSlotsError }, "❌ Error inserting time slots:")
          throw new Error('Erreur lors de la création des créneaux')
        }

        // Store inserted slots with IDs for email generation
        // @ts-ignore - Used in after() closure
        var insertedSlotsWithIds = insertedSlots

        logger.info({ slotsCount: timeSlots.length }, "📅 Proposed slots created (awaiting preferences):")
        break

      case 'organize':
        // Autonomous organization - tenant and provider coordinate directly
        newStatus = 'planification'
        notificationMessage = `Votre intervention "${intervention.title}" est en cours de planification. Le locataire et le prestataire peuvent proposer des créneaux et s'organiser directement.`
        logger.info({}, "📅 Organization mode - autonomous coordination between parties")
        break

      default:
        return NextResponse.json({
          success: false,
          error: 'Type de planification non reconnu'
        }, { status: 400 })
    }

    logger.info({ newStatus: newStatus }, "🔄 Updating intervention status to:")

    // Build manager comment
    const managerCommentParts = []
    if (internalComment) {
      managerCommentParts.push(`Planification: ${internalComment}`)
    }
    if (planningType === 'direct') {
      managerCommentParts.push(`Rendez-vous proposé pour le ${directSchedule.date} à ${directSchedule.startTime}`)
    } else if (planningType === 'propose') {
      managerCommentParts.push(`${proposedSlots.length} créneaux proposés`)
    } else if (planningType === 'organize') {
      managerCommentParts.push(`Planification autonome activée`)
    }

    // Update intervention - no scheduled_date for any mode (set only after confirmation)
    const updateData: any = {
      status: newStatus,
      updated_at: new Date().toISOString()
    }

    const updatedIntervention = await interventionService.update(interventionId, updateData)

    logger.info({}, "✅ Intervention scheduled successfully")

    // ✅ BUG FIX 2026-01-25: Save scheduling comment in intervention_comments table
    if (managerCommentParts.length > 0) {
      try {
        const commentRepository = await createServerActionInterventionCommentRepository()
        const schedulingComment = `📅 **Planification:** ${managerCommentParts.join(' | ')}`
        await commentRepository.createComment(interventionId, user.id, schedulingComment)
        logger.info({ interventionId }, "💬 Scheduling comment saved")
      } catch (commentError) {
        logger.warn({ commentError }, "⚠️ Could not save scheduling comment (non-blocking)")
      }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // NOTIFICATIONS: In-App + Email pour locataires et prestataires assignés
    // ═══════════════════════════════════════════════════════════════════════════

    // Extract assigned users from intervention_assignments (already fetched in query)
    const assignments = intervention.intervention_assignments || []
    const assignedLocataires = assignments
      .filter((a: any) => a.role === 'locataire' && a.user?.id)
      .map((a: any) => a.user)
    const assignedPrestataires = assignments
      .filter((a: any) => a.role === 'prestataire' && a.user?.id)
      .map((a: any) => a.user)

    const notificationTitle = planningType === 'organize'
      ? 'Planification autonome'
      : 'Nouveau créneau proposé'

    const recipientCount = assignedLocataires.length + assignedPrestataires.length
    logger.info({
      locatairesCount: assignedLocataires.length,
      prestatairesCount: assignedPrestataires.length
    }, `📧 Sending scheduling notifications to ${recipientCount} recipients`)

    // Send notifications to locataires
    for (const locataire of assignedLocataires) {
      try {
        await notificationService.createNotification({
          userId: locataire.id,
          teamId: intervention.team_id!,
          createdBy: user.id,
          type: 'intervention',
          title: notificationTitle,
          message: notificationMessage,
          isPersonal: true,
          metadata: {
            interventionId: intervention.id,
            interventionTitle: intervention.title,
            scheduledBy: user.name,
            planningType: planningType,
            lotReference: intervention.lot?.reference,
            buildingName: intervention.lot?.building?.name
          },
          relatedEntityType: 'intervention',
          relatedEntityId: intervention.id
        })
        logger.info({ locataireId: locataire.id }, "📧 Scheduling notification sent to locataire")
      } catch (notifError) {
        logger.warn({ locataireName: locataire.name, notifError }, "⚠️ Could not send notification to locataire:")
      }
    }

    // Send notifications to prestataires
    for (const prestataire of assignedPrestataires) {
      try {
        await notificationService.createNotification({
          userId: prestataire.id,
          teamId: intervention.team_id!,
          createdBy: user.id,
          type: 'intervention',
          title: notificationTitle,
          message: notificationMessage,
          isPersonal: true,
          metadata: {
            interventionId: intervention.id,
            interventionTitle: intervention.title,
            scheduledBy: user.name,
            planningType: planningType
          },
          relatedEntityType: 'intervention',
          relatedEntityId: intervention.id
        })
        logger.info({ prestataireId: prestataire.id }, "📧 Scheduling notification sent to prestataire")
      } catch (notifError) {
        logger.warn({ prestataireName: prestataire.name, notifError }, "⚠️ Could not send notification to prestataire:")
      }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // EMAIL NOTIFICATIONS: Utilise le service unifié avec filtrage (via after())
    // ═══════════════════════════════════════════════════════════════════════════
    {
      // Capture variables for after() closure
      const emailInterventionId = intervention.id
      const emailExcludeUserId = user.id
      const emailPlanningType = planningType
      const emailManagerName = user.name || `${user.first_name} ${user.last_name}`

      // Construire la liste des créneaux proposés pour l'email (avec IDs pour emails interactifs)
      let emailSlots: Array<{ id?: string; date: string; startTime: string; endTime: string }> = []

      if (planningType === 'direct' && directSchedule) {
        // Un seul créneau fixé - utiliser l'ID de la DB si disponible
        // @ts-ignore - Variable set in switch case above
        if (typeof insertedDirectSlotWithId !== 'undefined' && insertedDirectSlotWithId) {
          emailSlots = [{
            id: insertedDirectSlotWithId.id,
            date: insertedDirectSlotWithId.slot_date,
            startTime: insertedDirectSlotWithId.start_time,
            endTime: insertedDirectSlotWithId.end_time
          }]
        } else {
          // Fallback without ID (non-interactive)
          const [hours, minutes] = directSchedule.startTime.split(':').map(Number)
          const endHours = (hours + 1) % 24
          const endTime = `${endHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`

          emailSlots = [{
            date: directSchedule.date,
            startTime: directSchedule.startTime,
            endTime: endTime
          }]
        }
      } else if (planningType === 'propose' && proposedSlots) {
        // Plusieurs créneaux proposés - utiliser les slots insérés avec leurs IDs
        // @ts-ignore - Variable set in switch case above
        if (typeof insertedSlotsWithIds !== 'undefined' && insertedSlotsWithIds) {
          // Use IDs from database for interactive email buttons
          emailSlots = insertedSlotsWithIds.map((slot: any) => ({
            id: slot.id,
            date: slot.slot_date,
            startTime: slot.start_time,
            endTime: slot.end_time
          }))
        } else {
          // Fallback without IDs (non-interactive)
          emailSlots = proposedSlots.map(slot => ({
            date: slot.date,
            startTime: slot.startTime,
            endTime: slot.endTime
          }))
        }
      }
      // Note: planningType === 'organize' n'a pas de créneaux prédéfinis

      after(async () => {
        try {
          // Re-initialize email service inside after()
          const { EmailNotificationService } = await import('@/lib/services/domain/email-notification.service')
          const { EmailService } = await import('@/lib/services/domain/email.service')
          const {
            createServerNotificationRepository,
            createServerInterventionRepository,
            createServerUserRepository,
            createServerBuildingRepository,
            createServerLotRepository
          } = await import('@/lib/services')

          const notificationRepo = await createServerNotificationRepository()
          const interventionRepo = await createServerInterventionRepository()
          const userRepo = await createServerUserRepository()
          const buildingRepo = await createServerBuildingRepository()
          const lotRepo = await createServerLotRepository()
          const emailSvc = new EmailService()

          const emailNotificationSvc = new EmailNotificationService(
            notificationRepo,
            emailSvc,
            interventionRepo,
            userRepo,
            buildingRepo,
            lotRepo
          )

          const emailResult = await emailNotificationSvc.sendInterventionEmails({
            interventionId: emailInterventionId,
            eventType: 'time_slots_proposed',
            excludeUserId: emailExcludeUserId,
            excludeRoles: ['gestionnaire'],
            excludeNonPersonal: true,
            schedulingContext: {
              planningType: emailPlanningType,
              managerName: emailManagerName,
              proposedSlots: emailSlots
            }
          })

          logger.info({
            interventionId: emailInterventionId,
            emailsSent: emailResult.sentCount,
            emailsFailed: emailResult.failedCount,
            planningType: emailPlanningType
          }, "📧 [API] Time slots proposed emails sent (via after())")
        } catch (emailError) {
          logger.error({
            interventionId: emailInterventionId,
            error: emailError instanceof Error ? emailError.message : String(emailError)
          }, "⚠️ [API] Email notifications failed (via after())")
        }
      })
    }

    return NextResponse.json({
      success: true,
      intervention: {
        id: updatedIntervention.id,
        status: updatedIntervention.status, // Always 'planification'
        title: updatedIntervention.title,
        updated_at: updatedIntervention.updated_at
      },
      planningType,
      message: planningType === 'organize'
        ? 'Planification autonome activée'
        : 'Créneaux proposés avec succès. En attente de confirmation.'
    })

  } catch (error) {
    logger.error({ error }, "❌ Error in intervention-schedule API:")
    logger.error({
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack',
    }, "❌ Error details:")

    return NextResponse.json({
      success: false,
      error: 'Erreur lors de la planification de l\'intervention'
    }, { status: 500 })
  }
}
