import { NextRequest, NextResponse, after } from 'next/server'
import { Database } from '@/lib/database.types'
import { logger } from '@/lib/logger'
import { getApiAuthContext } from '@/lib/api-auth-helper'
import { selectSlotSchema, validateRequest, formatZodErrors } from '@/lib/validation/schemas'
import {
  createServerNotificationRepository,
  createServerUserRepository,
  createServerBuildingRepository,
  createServerLotRepository,
  createServerInterventionRepository,
  createServerActionInterventionCommentRepository
} from '@/lib/services'
import { NotificationService } from '@/lib/services/domain/notification.service'
import { EmailNotificationService } from '@/lib/services/domain/email-notification.service'
import { EmailService } from '@/lib/services/domain/email.service'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  logger.info({ id: id }, "📅 PUT select-slot API called for intervention:")

  try {
    // ✅ AUTH: 45 lignes → 3 lignes! (any authenticated user) + BUG FIX: userService was undefined!
    const authResult = await getApiAuthContext()
    if (!authResult.success) return authResult.error

    const { supabase, userProfile: user } = authResult.data

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Utilisateur non trouvé'
      }, { status: 404 })
    }

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

    const interventionId = id

    // Parse request body
    const body = await request.json()
    logger.info({ body: body }, "📥 [SELECT-SLOT] Request body received:")

    // ✅ ZOD VALIDATION
    const validation = validateRequest(selectSlotSchema, body)
    if (!validation.success) {
      logger.warn({ errors: formatZodErrors(validation.errors) }, '⚠️ [SELECT-SLOT] Validation failed')
      return NextResponse.json({
        success: false,
        error: 'Données invalides',
        details: formatZodErrors(validation.errors)
      }, { status: 400 })
    }

    const validatedData = validation.data
    const { slotStart, slotEnd } = validatedData
    const { comment } = body // comment is not in schema, extract from body

    // Parse ISO date-time strings to extract date and time components
    const startDate = new Date(slotStart)
    const endDate = new Date(slotEnd)
    const selectedSlot = {
      date: slotStart.split('T')[0], // Extract date part (YYYY-MM-DD)
      startTime: startDate.toISOString().split('T')[1].substring(0, 5), // Extract time (HH:MM)
      endTime: endDate.toISOString().split('T')[1].substring(0, 5) // Extract time (HH:MM)
    }
    logger.info({ selectedSlot }, "🔍 [SELECT-SLOT] Parsed slot from validated data:")

    // Verify intervention exists and user has access
    const { data: intervention, error: interventionError } = await supabase
      .from('interventions')
      .select(`
        id,
        title,
        status,
        tenant_id,
        team_id,
        lot:lot_id(
          id,
          lot_contacts(user_id, is_primary)
        ),
       intervention_contacts(
          user_id,
          role,
          user:user_id(id, name, email, role)
        )
      `)
      .eq('id', interventionId)
      .single()

    if (interventionError || !intervention) {
      return NextResponse.json({
        success: false,
        error: 'Intervention non trouvée'
      }, { status: 404 })
    }

    // Check if user has permission to select slot (tenant, assigned participants, or gestionnaire)
    const isUserTenant = intervention.lot?.lot_contacts?.some(
      (contact) => contact.user_id === user.id
    )
    logger.info({ userId: user.id, userRole: user.role, isUserTenant }, "👤 [SELECT-SLOT] User access check:")

    const hasAccess = (
      isUserTenant ||
      intervention.intervention_contacts.some(ic => ic.user_id === user.id) ||
      user.role === 'gestionnaire'
    )

    if (!hasAccess) {
      logger.error({ userId: user.id, userRole: user.role, isUserTenant, interventionContacts: intervention.intervention_contacts.map(ic => ic.user_id) }, "🚫 [SELECT-SLOT] Access denied:")
      return NextResponse.json({
        success: false,
        error: 'Accès non autorisé à cette intervention'
      }, { status: 403 })
    }
    logger.info({}, "✅ [SELECT-SLOT] User has access to intervention")

    // Check if intervention is in correct status for slot selection
    logger.info({ intervention: intervention.status }, "📊 [SELECT-SLOT] Current intervention status:")
    if (!['planification', 'approuvee', 'planifiee'].includes(intervention.status)) {
      logger.error({ currentStatus: intervention.status, allowedStatuses: ['planification', 'approuvee', 'planifiee'] }, "❌ [SELECT-SLOT] Invalid status for slot selection:")
      return NextResponse.json({
        success: false,
        error: `Impossible de planifier: statut actuel "${intervention.status}"`
      }, { status: 400 })
    }
    logger.info({}, "✅ [SELECT-SLOT] Intervention status is valid for slot selection")

    // Log if this is a re-scheduling
    if (intervention.status === 'planifiee') {
      logger.info({}, "🔄 [SELECT-SLOT] Re-scheduling an already planned intervention")
    }

    // Validate the selected slot
    const selectedDate = new Date(selectedSlot.date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    logger.info({ selectedDate: selectedSlot.date, parsedDate: selectedDate, today }, "📅 [SELECT-SLOT] Date validation:")

    if (selectedDate < today) {
      logger.error({ selectedDate, today }, "❌ [SELECT-SLOT] Cannot schedule in the past:")
      return NextResponse.json({
        success: false,
        error: 'Impossible de planifier dans le passé'
      }, { status: 400 })
    }
    logger.info({}, "✅ [SELECT-SLOT] Date is valid (not in the past)")

    // Validate time format
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
    logger.info({ startTime: selectedSlot.startTime, endTime: selectedSlot.endTime }, "🕐 [SELECT-SLOT] Time format validation:")
    if (!timeRegex.test(selectedSlot.startTime) || !timeRegex.test(selectedSlot.endTime)) {
      logger.error({ startTime: selectedSlot.startTime, endTime: selectedSlot.endTime, regex: timeRegex.toString() }, "❌ [SELECT-SLOT] Invalid time format")
      return NextResponse.json({
        success: false,
        error: 'Format d\'heure invalide (HH:MM attendu)'
      }, { status: 400 })
    }
    logger.info({}, "✅ [SELECT-SLOT] Time format is valid")

    // Check if end time is after start time
    const [startHour, startMin] = selectedSlot.startTime.split(':').map(Number)
    const [endHour, endMin] = selectedSlot.endTime.split(':').map(Number)

    if (startHour > endHour || (startHour === endHour && startMin >= endMin)) {
      return NextResponse.json({
        success: false,
        error: 'L\'heure de fin doit être après l\'heure de début'
      }, { status: 400 })
    }

    // Verify that the selected slot matches available slots from participants
    const { data: availabilities, error: availError } = await supabase
      .from('user_availabilities')
      .select(`
        *,
        user:user_id(id, name, role)
      `)
      .eq('intervention_id', interventionId)
      .eq('date', selectedSlot.date)

    if (availError) {
      logger.error({ error: availError }, "❌ Error fetching availabilities:")
      return NextResponse.json({
        success: false,
        error: 'Erreur lors de la vérification des disponibilités'
      }, { status: 500 })
    }

    // Check if the selected slot overlaps with participant availabilities
    const selectedStartMinutes = startHour * 60 + startMin
    const selectedEndMinutes = endHour * 60 + endMin

    const conflictingUsers = []
    const availableUsers = []

    for (const avail of (availabilities || [])) {
      const availStartMinutes = parseInt(avail.start_time.split(':')[0]) * 60 + parseInt(avail.start_time.split(':')[1])
      const availEndMinutes = parseInt(avail.end_time.split(':')[0]) * 60 + parseInt(avail.end_time.split(':')[1])

      // Check if there's an overlap
      if (selectedStartMinutes < availEndMinutes && selectedEndMinutes > availStartMinutes) {
        availableUsers.push(avail.user)
      } else {
        conflictingUsers.push(avail.user)
      }
    }

    // Log the verification result
    logger.info({ availableUsers: availableUsers.length, conflictingUsers: conflictingUsers.length }, "📊 Slot verification: available, conflicts")

    // Create the scheduled date-time
    const scheduledDateTime = `${selectedSlot.date}T${selectedSlot.startTime}:00.000Z`

    // Update the intervention with the selected slot
    const updateData: any = {
      status: 'planifiee' as Database['public']['Enums']['intervention_status'],
      scheduled_date: scheduledDateTime,
      updated_at: new Date().toISOString()
    }

    // Update intervention
    logger.info({ data: updateData }, "💾 [SELECT-SLOT] Updating intervention with data:")
    const { data: updatedIntervention, error: updateInterventionError } = await supabase
      .from('interventions')
      .update(updateData)
      .eq('id', interventionId)
      .select()
      .single()

    if (updateInterventionError || !updatedIntervention) {
      logger.error({ error: updateInterventionError }, "❌ [SELECT-SLOT] Error updating intervention:")
      return NextResponse.json({
        success: false,
        error: 'Erreur lors de la mise à jour de l\'intervention'
      }, { status: 500 })
    }

    logger.info({ id: updatedIntervention.id, status: updatedIntervention.status, scheduled_date: updatedIntervention.scheduled_date }, "💾 [SELECT-SLOT] Intervention updated successfully:")

    logger.info({ interventionId, scheduledDateTime }, "✅ [SELECT-SLOT] Intervention scheduled for")

    // ✅ BUG FIX 2026-01-25: Save slot selection comment in intervention_comments table
    if (comment) {
      try {
        const commentRepository = await createServerActionInterventionCommentRepository()
        const slotComment = `📅 **Créneau confirmé:** ${selectedSlot.date} de ${selectedSlot.startTime} à ${selectedSlot.endTime}\n\n${comment}`
        await commentRepository.createComment(interventionId, user.id, slotComment)
        logger.info({ interventionId }, "💬 Slot selection comment saved")
      } catch (commentError) {
        logger.warn({ commentError }, "⚠️ Could not save slot selection comment (non-blocking)")
      }
    }

    // Clear unselected time slots and matches for this intervention (keep confirmed slot)
    // First, mark the selected slot as confirmed (if it exists in DB)
    const { data: confirmedSlot } = await supabase
      .from('intervention_time_slots')
      .select('id')
      .eq('intervention_id', interventionId)
      .eq('slot_date', selectedSlot.date)
      .eq('start_time', selectedSlot.startTime)
      .single()

    if (confirmedSlot) {
      // Mark this slot as selected (modern status pattern)
      await supabase
        .from('intervention_time_slots')
        .update({ status: 'selected' })
        .eq('id', confirmedSlot.id)

      // Delete other non-selected slots
      await supabase
        .from('intervention_time_slots')
        .delete()
        .eq('intervention_id', interventionId)
        .neq('status', 'selected')
    } else {
      // Slot was custom (not from proposals), delete all previous non-selected slots
      await supabase
        .from('intervention_time_slots')
        .delete()
        .eq('intervention_id', interventionId)
        .neq('status', 'selected')
    }

    // Clear availability matches (these are temporary coordination data)
    await supabase.from('availability_matches').delete().eq('intervention_id', interventionId)

    // Create notifications for all participants
    const notificationPromises = []

    // Find tenant ID from lot_contacts for notifications
    const tenantContact = intervention.lot?.lot_contacts?.find((contact) => contact.is_primary)
    const tenantId = tenantContact?.user_id || intervention.tenant_id // fallback to old structure

    // Notify tenant if they're not the one who selected the slot
    if (tenantId && tenantId !== user.id) {
      notificationPromises.push(
        notificationService.createNotification({
          userId: tenantId,
          teamId: intervention.team_id!,
          createdBy: user.id,
          type: 'intervention',
          title: 'Intervention planifiée',
          message: `Votre intervention "${intervention.title}" a été planifiée pour le ${new Date(selectedSlot.date).toLocaleDateString('fr-FR')} de ${selectedSlot.startTime} à ${selectedSlot.endTime}.`,
          isPersonal: true, // Locataire toujours personnel
          metadata: {
            interventionId: intervention.id,
            interventionTitle: intervention.title,
            scheduledDate: scheduledDateTime,
            scheduledBy: user.name
          },
          relatedEntityType: 'intervention',
          relatedEntityId: intervention.id
        })
      )
    }

    // Notify assigned contacts from intervention_assignments (prestataires/gestionnaires) if they're not the one who selected
    const { data: assignments } = await supabase
      .from('intervention_assignments')
      .select('user_id, role, is_primary')
      .eq('intervention_id', intervention.id)
      .neq('user_id', user.id)

    for (const assignment of assignments || []) {
      notificationPromises.push(
        notificationService.createNotification({
          userId: assignment.user_id,
          teamId: intervention.team_id!,
          createdBy: user.id,
          type: 'intervention',
          title: 'Intervention planifiée',
          message: `L'intervention "${intervention.title}" a été planifiée pour le ${new Date(selectedSlot.date).toLocaleDateString('fr-FR')} de ${selectedSlot.startTime} à ${selectedSlot.endTime}.`,
          isPersonal: assignment.is_primary ?? true, // Assigné = personnel
          metadata: {
            interventionId: intervention.id,
            interventionTitle: intervention.title,
            scheduledDate: scheduledDateTime,
            scheduledBy: user.name,
            userRole: assignment.role
          },
          relatedEntityType: 'intervention',
          relatedEntityId: intervention.id
        })
      )
    }

    // Send all in-app notifications
    try {
      await Promise.all(notificationPromises)
      logger.info({ notificationPromises: notificationPromises.length }, "✅ Sent in-app notifications for slot selection")
    } catch (notificationError) {
      logger.warn({ notificationError: notificationError }, "⚠️ Some in-app notifications failed to send:")
      // Don't fail the API call for notification errors
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // EMAIL NOTIFICATIONS: Créneau confirmé (intervention planifiée) (via after())
    // ═══════════════════════════════════════════════════════════════════════════
    {
      // Capture variables for after() closure
      const emailInterventionId = intervention.id
      const emailExcludeUserId = user.id

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
            eventType: 'scheduled',
            excludeUserId: emailExcludeUserId,
            excludeRoles: ['gestionnaire'],
            excludeNonPersonal: true
          })

          logger.info({
            interventionId: emailInterventionId,
            emailsSent: emailResult.sentCount,
            emailsFailed: emailResult.failedCount
          }, "📧 [API] Scheduled intervention emails sent (via after())")
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
      message: 'Créneau sélectionné et intervention planifiée',
      intervention: {
        id: updatedIntervention.id,
        status: updatedIntervention.status,
        scheduled_date: updatedIntervention.scheduled_date,
        title: updatedIntervention.title
      },
      selectedSlot: {
        date: selectedSlot.date,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime
      },
      verification: {
        availableUsers: availableUsers.map(u => ({ id: u.id, name: u.name, role: u.role })),
        conflictingUsers: conflictingUsers.map(u => ({ id: u.id, name: u.name, role: u.role }))
      }
    })

  } catch (error) {
    logger.error({ error: error }, "💥 [SELECT-SLOT] Unexpected error in select-slot API:")
    logger.error({ stack: error instanceof Error ? error.stack : 'No stack trace available' }, "Stack trace")
    return NextResponse.json({
      success: false,
      error: 'Erreur serveur lors de la sélection du créneau',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}