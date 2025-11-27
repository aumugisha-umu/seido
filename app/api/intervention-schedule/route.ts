import { NextRequest, NextResponse } from 'next/server'
import { Database } from '@/lib/database.types'
import { logger } from '@/lib/logger'
import { createServerInterventionService } from '@/lib/services'
import { getApiAuthContext } from '@/lib/api-auth-helper'
import { interventionScheduleSchema, validateRequest, formatZodErrors } from '@/lib/validation/schemas'

export async function POST(request: NextRequest) {
  logger.info({}, "📅 intervention-schedule API route called")

  // Initialize services
  const interventionService = await createServerInterventionService()

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

    // Check if intervention can be scheduled
    // Allow 'demande_de_devis' to enable planning while waiting for quote
    if (!['approuvee', 'planification', 'demande_de_devis'].includes(intervention.status)) {
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
          is_selected: false, // Not yet confirmed by tenant/provider
          proposed_by: user.id, // Gestionnaire who proposed it
          notes: 'Rendez-vous fixé par le gestionnaire'
        }

        // Delete any existing slots first
        await supabase
          .from('intervention_time_slots')
          .delete()
          .eq('intervention_id', interventionId)

        // Insert the appointment slot
        const { error: insertSlotError } = await supabase
          .from('intervention_time_slots')
          .insert([directTimeSlot])

        if (insertSlotError) {
          logger.error({ error: insertSlotError }, "❌ Error creating appointment slot:")
          throw new Error('Erreur lors de la création du rendez-vous')
        }

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
          is_selected: false, // Not yet confirmed
          proposed_by: user.id // Gestionnaire who proposed these slots
        }))

        // Delete any existing slots first
        await supabase
          .from('intervention_time_slots')
          .delete()
          .eq('intervention_id', interventionId)

        // Insert the proposed slots
        const { error: insertSlotsError } = await supabase
          .from('intervention_time_slots')
          .insert(timeSlots)

        if (insertSlotsError) {
          logger.error({ error: insertSlotsError }, "❌ Error inserting time slots:")
          throw new Error('Erreur lors de la création des créneaux')
        }

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

    // Note: Manager comments about scheduling are now stored in intervention_comments table
    // The managerCommentParts should be saved via the comments system if needed

    const updatedIntervention = await interventionService.update(interventionId, updateData)

    logger.info({}, "✅ Intervention scheduled successfully")

    // Create notification for tenant if exists
    if (intervention.tenant_id && intervention.team_id) {
      try {
        const notificationTitle = planningType === 'organize'
          ? 'Planification autonome'
          : 'Nouveau créneau proposé'

        await notificationService.createNotification({
          userId: intervention.tenant_id,
          teamId: intervention.team_id,
          createdBy: user.id,
          type: 'intervention',
          title: notificationTitle,
          message: notificationMessage,
          isPersonal: true, // Locataire toujours personnel
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
        logger.info({}, "📧 Scheduling notification sent to tenant")
      } catch (notifError) {
        logger.warn({ notifError: notifError }, "⚠️ Could not send notification to tenant:")
        // Don't fail the scheduling for notification errors
      }
    }

    // Notify assigned providers from intervention_assignments
    try {
      const { data: assignedProviders } = await supabase
        .from('intervention_assignments')
        .select('user:users!user_id(id, name), is_primary')
        .eq('intervention_id', intervention.id)
        .eq('role', 'prestataire')

      for (const assignment of assignedProviders || []) {
        if (!assignment.user) continue

        try {
          const notificationTitle = planningType === 'organize'
            ? 'Planification autonome'
            : 'Nouveau créneau proposé'

          await notificationService.createNotification({
            userId: assignment.user.id,
            teamId: intervention.team_id!,
            createdBy: user.id,
            type: 'intervention',
            title: notificationTitle,
            message: notificationMessage,
            isPersonal: true, // Prestataire assigné toujours personnel
            metadata: {
              interventionId: intervention.id,
              interventionTitle: intervention.title,
              scheduledBy: user.name,
              planningType: planningType
            },
            relatedEntityType: 'intervention',
            relatedEntityId: intervention.id
          })
        } catch (notifError) {
          logger.warn({ provider: assignment.user.name, notifError }, "⚠️ Could not send notification to provider:")
        }
      }
    } catch (queryError) {
      logger.warn({ queryError }, "⚠️ Could not fetch assigned providers")
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
