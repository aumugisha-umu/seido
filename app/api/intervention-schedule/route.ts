import { NextRequest, NextResponse } from 'next/server'

import { notificationService } from '@/lib/notification-service'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/lib/database.types'
import { logger } from '@/lib/logger'
import { createServerUserService, createServerInterventionService } from '@/lib/services'

export async function POST(request: NextRequest) {
  logger.info({}, "📅 intervention-schedule API route called")

  // Initialize services
  const userService = await createServerUserService()
  const interventionService = await createServerInterventionService()
  
  try {
    // Initialize Supabase client
    const cookieStore = await cookies()
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // Ignore cookie setting errors in API routes
            }
          },
        },
      }
    )

    // Get current user
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    if (authError || !authUser) {
      return NextResponse.json({ 
        success: false,
        error: 'Non autorisé' 
      }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const {
      interventionId,
      planningType, // 'direct', 'propose', 'organize'
      directSchedule, // { date, startTime, endTime } - pour planningType === 'direct'
      proposedSlots,  // [{ date, startTime, endTime }] - pour planningType === 'propose'
      internalComment
    } = body

    if (!interventionId || !planningType) {
      return NextResponse.json({
        success: false,
        error: 'interventionId et planningType sont requis'
      }, { status: 400 })
    }

    logger.info({ interventionId, planningType }, "📝 Scheduling intervention")

    // Get current user from database
    const user = await userService.findByAuthUserId(authUser.id)
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Utilisateur non trouvé'
      }, { status: 404 })
    }

    // Check if user is gestionnaire
    if (user.role !== 'gestionnaire') {
      return NextResponse.json({
        success: false,
        error: 'Seuls les gestionnaires peuvent planifier les interventions'
      }, { status: 403 })
    }

    // Get intervention details
    const { data: intervention, error: interventionError } = await supabase
      .from('interventions')
      .select(`
        *,
        lot:lot_id(id, reference, building:building_id(name, address, team_id)),
        team:team_id(id, name),
        intervention_contacts(
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
    if (!['approuvee', 'planification'].includes(intervention.status)) {
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
    let scheduledDate: string | null = null
    let notificationMessage = ''

    // Handle different planning types
    switch (planningType) {
      case 'direct':
        // Direct scheduling with fixed date/time
        if (!directSchedule || !directSchedule.date || !directSchedule.startTime || !directSchedule.endTime) {
          return NextResponse.json({
            success: false,
            error: 'Date et heures sont requises pour la planification directe'
          }, { status: 400 })
        }

        newStatus = 'planifiee'
        scheduledDate = `${directSchedule.date}T${directSchedule.startTime}:00.000Z`
        notificationMessage = `Votre intervention "${intervention.title}" a été planifiée pour le ${new Date(directSchedule.date).toLocaleDateString('fr-FR')} de ${directSchedule.startTime} à ${directSchedule.endTime}.`
        
        logger.info({ scheduledDate: scheduledDate }, "📅 Direct scheduling:")
        break

      case 'propose':
        // Propose multiple slots for selection
        if (!proposedSlots || proposedSlots.length === 0) {
          return NextResponse.json({
            success: false,
            error: 'Des créneaux proposés sont requis pour la planification avec choix'
          }, { status: 400 })
        }

        newStatus = 'planification'
        notificationMessage = `Des créneaux ont été proposés pour votre intervention "${intervention.title}". Veuillez choisir celui qui vous convient le mieux.`
        
        // Store proposed time slots
        const timeSlots = proposedSlots.map((slot) => ({
          intervention_id: interventionId,
          slot_date: slot.date,
          start_time: slot.startTime,
          end_time: slot.endTime,
          is_selected: false
        }))

        await supabase
          .from('intervention_time_slots')
          .delete()
          .eq('intervention_id', interventionId)

        const { error: insertSlotsError } = await supabase
          .from('intervention_time_slots')
          .insert(timeSlots)

        if (insertSlotsError) {
          logger.error({ error: insertSlotsError }, "❌ Error inserting time slots:")
          throw new Error('Erreur lors de la création des créneaux')
        }

        logger.info({ timeSlots: timeSlots.length }, "📅 Proposed slots created:")
        break

      case 'organize':
        // Will organize with tenant/provider availability later
        newStatus = 'planification'
        notificationMessage = `Votre intervention "${intervention.title}" est en cours de planification. Nous vous contacterons pour convenir d'un créneau.`
        logger.info({}, "📅 Organization mode - will coordinate later")
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
      managerCommentParts.push(`Planifiée directement pour le ${directSchedule.date} ${directSchedule.startTime}-${directSchedule.endTime}`)
    } else if (planningType === 'propose') {
      managerCommentParts.push(`${proposedSlots.length} créneaux proposés`)
    }

    // Update intervention
    const updateData = {
      status: newStatus,
      updated_at: new Date().toISOString()
    }

    if (scheduledDate) {
      updateData.scheduled_date = scheduledDate
    }

    if (managerCommentParts.length > 0) {
      const existingComment = intervention.manager_comment || ''
      updateData.manager_comment = existingComment + (existingComment ? ' | ' : '') + managerCommentParts.join(' | ')
    }

    const updatedIntervention = await interventionService.update(interventionId, updateData)

    logger.info({}, "✅ Intervention scheduled successfully")

    // Create notification for tenant if exists
    if (intervention.tenant_id && intervention.team_id) {
      try {
        await notificationService.createNotification({
          userId: intervention.tenant_id,
          teamId: intervention.team_id,
          createdBy: user.id,
          type: 'intervention',
          priority: planningType === 'direct' ? 'high' : 'normal',
          title: planningType === 'direct' ? 'Intervention planifiée' : 'Planification en cours',
          message: notificationMessage,
          metadata: {
            interventionId: intervention.id,
            interventionTitle: intervention.title,
            scheduledBy: user.name,
            planningType: planningType,
            scheduledDate: scheduledDate,
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

    // Notify assigned providers if any
    const providers = intervention.intervention_contacts?.filter(ic => ic.role === 'prestataire') || []
    for (const provider of providers) {
      try {
        await notificationService.createNotification({
          userId: provider.user.id,
          teamId: intervention.team_id!,
          createdBy: user.id,
          type: 'intervention',
          priority: 'high',
          title: planningType === 'direct' ? 'Intervention planifiée' : 'Planification en cours',
          message: `Une intervention "${intervention.title}" ${planningType === 'direct' ? 'a été planifiée' : 'est en cours de planification'}.`,
          metadata: {
            interventionId: intervention.id,
            interventionTitle: intervention.title,
            scheduledBy: user.name,
            planningType: planningType,
            scheduledDate: scheduledDate
          },
          relatedEntityType: 'intervention',
          relatedEntityId: intervention.id
        })
      } catch (notifError) {
        logger.warn({ provider: provider.user.name, notifError }, "⚠️ Could not send notification to provider:")
      }
    }

    return NextResponse.json({
      success: true,
      intervention: {
        id: updatedIntervention.id,
        status: updatedIntervention.status,
        title: updatedIntervention.title,
        scheduled_date: updatedIntervention.scheduled_date,
        updated_at: updatedIntervention.updated_at
      },
      planningType,
      scheduledDate,
      message: `Intervention ${planningType === 'direct' ? 'planifiée' : 'en cours de planification'} avec succès`
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
