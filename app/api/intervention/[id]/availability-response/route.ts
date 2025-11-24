import { NextRequest, NextResponse } from 'next/server'
import { createServerNotificationService } from '@/lib/services'
import { Database } from '@/lib/database.types'
import { logger, logError } from '@/lib/logger'
import { getApiAuthContext } from '@/lib/api-auth-helper'
import { availabilityResponseSchema, validateRequest, formatZodErrors } from '@/lib/validation/schemas'
interface RouteParams {
  params: Promise<{
    id: string
  }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  logger.info({}, "🚀 [DEBUG] availability-response route started")

  try {
    const resolvedParams = await params
    const id = resolvedParams.id
    logger.info({ id: id }, "✅ [DEBUG] params resolved, intervention ID:")

    if (!id) {
      logger.error({}, "❌ [DEBUG] No intervention ID provided")
      return NextResponse.json({
        success: false,
        error: 'ID d\'intervention manquant'
      }, { status: 400 })
    }

    // ✅ AUTH + ROLE CHECK: 75 lignes → 3 lignes! (locataire required)
    const authResult = await getApiAuthContext({ requiredRole: 'locataire' })
    if (!authResult.success) return authResult.error

    const { supabase, userProfile: user } = authResult.data

    logger.info({ id: user.id, role: user.role }, "✅ [DEBUG] User found:")

    // Verify user is a tenant (already checked by getApiAuthContext, but keeping for clarity)
    if (user.role !== 'locataire' && user.role !== 'admin') {
      logger.error({ user: user.role }, "❌ [DEBUG] User is not a tenant:")
      return NextResponse.json({
        success: false,
        error: 'Seuls les locataires peuvent répondre aux disponibilités'
      }, { status: 403 })
    }

    logger.info({}, "✅ [DEBUG] User role verified: locataire")

    // Parse request body
    logger.info({}, "📝 [DEBUG] Parsing request body")
    const body = await request.json()

    // ✅ ZOD VALIDATION
    const validation = validateRequest(availabilityResponseSchema, body)
    if (!validation.success) {
      logger.warn({ errors: formatZodErrors(validation.errors) }, '⚠️ [AVAILABILITY-RESPONSE] Validation failed')
      return NextResponse.json({
        success: false,
        error: 'Données invalides',
        details: formatZodErrors(validation.errors)
      }, { status: 400 })
    }

    const validatedData = validation.data
    const { available, availabilitySlots, reason } = validatedData

    logger.info({
      available,
      availabilitySlotsCount: availabilitySlots?.length || 0,
      reasonLength: reason?.length || 0
    }, "📝 [DEBUG] Tenant availability response:")

    // Get intervention details
    logger.info({}, "🏠 [DEBUG] Getting intervention details")
    const { data: intervention, error: interventionError } = await supabase
      .from('interventions')
      .select(`
        *,
        lot:lot_id(
          id,
          building:building_id(name, address, team_id),
          lot_contacts(user_id, is_primary)
        )
      `)
      .eq('id', id)
      .single()

    if (interventionError || !intervention) {
      logger.error({ interventionError: interventionError?.message || "No intervention" }, "❌ [DEBUG] Intervention not found")
      return NextResponse.json({
        success: false,
        error: 'Intervention non trouvée'
      }, { status: 404 })
    }

    logger.info({ id: intervention.id, status: intervention.status }, "✅ [DEBUG] Intervention found:")

    // Verify user is the tenant for this intervention
    logger.info({}, "🔐 [DEBUG] Verifying tenant permissions")
    const isUserTenant = intervention.lot?.lot_contacts?.some(
      (contact: { user_id: string; is_primary: boolean }) => contact.user_id === user.id
    )

    if (!isUserTenant) {
      logger.error({
        userId: user.id,
        lotContacts: intervention.lot?.lot_contacts?.map((c: { user_id: string; is_primary: boolean }) => c.user_id) || []
      }, "❌ [DEBUG] User is not a tenant for this intervention")
      return NextResponse.json({
        success: false,
        error: 'Vous n\'êtes pas autorisé pour cette intervention'
      }, { status: 403 })
    }

    logger.info({}, "✅ [DEBUG] Tenant permissions verified")

    // Process response based on availability flag
    let newStatus = intervention.status
    let statusMessage = ''

    if (available && availabilitySlots && availabilitySlots.length > 0) {
      // Tenant is available and provided slots
      newStatus = 'planification'
      statusMessage = 'Le locataire a fourni ses disponibilités - En cours de planification'

      // Save tenant availabilities as user_availabilities
      // First, delete existing tenant availabilities for this intervention
      const { error: deleteError } = await supabase
        .from('user_availabilities')
        .delete()
        .eq('user_id', user.id)
        .eq('intervention_id', id)

      if (deleteError) {
        logger.warn({ deleteError: deleteError }, "⚠️ Could not delete existing tenant availabilities:")
      }

      // Insert new tenant availabilities
      const availabilityData = availabilitySlots.map((slot) => {
        const startDate = new Date(slot.start)
        const endDate = new Date(slot.end)
        return {
          user_id: user.id,
          intervention_id: id,
          date: slot.start.split('T')[0], // Extract date (YYYY-MM-DD)
          start_time: startDate.toISOString().split('T')[1].substring(0, 5), // Extract time (HH:MM)
          end_time: endDate.toISOString().split('T')[1].substring(0, 5) // Extract time (HH:MM)
        }
      })

      const { error: insertError } = await supabase
        .from('user_availabilities')
        .insert(availabilityData)

      if (insertError) {
        logger.error({ error: insertError }, "❌ Error saving tenant availabilities:")
        return NextResponse.json({
          success: false,
          error: 'Erreur lors de la sauvegarde des disponibilités'
        }, { status: 500 })
      }

      logger.info({}, "✅ Tenant availabilities saved successfully")

    } else if (!available) {
      // Tenant is not available
      newStatus = 'planification'
      statusMessage = reason
        ? `Le locataire n'est pas disponible - Raison: ${reason}`
        : 'Le locataire n\'est pas disponible - En attente de nouvelles propositions'
    } else {
      // Available but no slots provided
      newStatus = 'planifiee'
      statusMessage = 'Le locataire a confirmé sa disponibilité'
    }

    // Update intervention status
    const { error: updateError } = await supabase
      .from('interventions')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (updateError) {
      logger.error({ error: updateError }, "❌ Error updating intervention status:")
      return NextResponse.json({
        success: false,
        error: 'Erreur lors de la mise à jour du statut'
      }, { status: 500 })
    }

    logger.info({ newStatus }, "✅ [DEBUG] Intervention status updated to:")

    // Create notification for managers and providers
    logger.info({}, "🔔 [DEBUG] Creating notifications")
    try {
      const notificationService = await createServerNotificationService()

      // Get managers and providers assigned to this intervention
      const { data: assignments } = await supabase
        .from('intervention_assignments')
        .select(`
          user:users!user_id(id, name, email),
          is_primary,
          role
        `)
        .eq('intervention_id', id)
        .in('role', ['gestionnaire', 'prestataire'])

      if (!assignments || assignments.length === 0) {
        logger.warn({}, 'No contacts found for intervention')
      } else {
        // Prepare messages based on response type
        const responseType = available ? 'accept' : 'reject'
        let managerTitle: string, managerMessage: string, providerTitle: string, providerMessage: string

        if (available) {
          managerTitle = `Créneaux acceptés - ${intervention.title || `Intervention ${intervention.type || ''}`}`
          managerMessage = `${user.name} a accepté les créneaux proposés pour l'intervention${intervention.lot?.reference ? ` (${intervention.lot.reference})` : ''}.`
          providerTitle = `Créneaux acceptés - ${intervention.title || `Intervention ${intervention.type || ''}`}`
          providerMessage = `Le locataire ${user.name} a accepté vos créneaux proposés${intervention.lot?.reference ? ` (${intervention.lot.reference})` : ''}.`
        } else {
          managerTitle = `Créneaux rejetés - ${intervention.title || `Intervention ${intervention.type || ''}`}`
          managerMessage = `${user.name} a rejeté tous les créneaux proposés pour l'intervention${intervention.lot?.reference ? ` (${intervention.lot.reference})` : ''}.`
          providerTitle = `Créneaux rejetés - ${intervention.title || `Intervention ${intervention.type || ''}`}`
          providerMessage = `Le locataire ${user.name} a rejeté vos créneaux proposés${intervention.lot?.reference ? ` (${intervention.lot.reference})` : ''}.`
        }

        // Add tenant's message/reason if provided
        const tenantMessage = reason || statusMessage
        if (tenantMessage) {
          managerMessage += ` Message: "${tenantMessage}"`
          providerMessage += ` Message: "${tenantMessage}"`
        }

        // Send notifications to assigned contacts
        const notificationPromises = assignments.map(assignment => {
          const isManager = assignment.role === 'gestionnaire'
          const title = isManager ? managerTitle : providerTitle
          const message = isManager ? managerMessage : providerMessage

          return notificationService.createNotification({
            userId: assignment.user.id,
            teamId: intervention.lot?.building?.team_id,
            createdBy: user.id,
            type: 'intervention',
            title,
            message,
            isPersonal: assignment.is_primary ?? (assignment.role === 'prestataire'), // ✅ Primary ou prestataire assigné
            metadata: {
              interventionId: id,
              interventionTitle: intervention.title || `Intervention ${intervention.type || ''}`,
              responseType,
              tenantName: user.name,
              tenantMessage,
              actionRequired: available ? 'schedule_intervention' : 'review_availability_response'
            },
            relatedEntityType: 'intervention',
            relatedEntityId: id
          })
        })

        await Promise.all(notificationPromises)
        logger.info({ count: assignments.length }, '✅ Availability response notifications sent to contacts')
      }
    } catch (notificationError) {
      logger.error({ error: notificationError }, '❌ Error sending availability response notifications:')
      // Don't fail the request for notification errors
    }

    // If tenant provided availability slots, try to trigger matching with provider availabilities
    if (available && availabilitySlots && availabilitySlots.length > 0) {
      try {
        const matchingResponse = await fetch(`${request.nextUrl.origin}/api/intervention/${id}/match-availabilities`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': request.headers.get('cookie') || ''
          },
        })

        if (matchingResponse.ok) {
          logger.info({}, '✅ Automatic matching triggered for tenant availabilities')
        } else {
          logger.warn({}, '⚠️ Could not trigger automatic matching')
        }
      } catch (matchingError) {
        logger.warn({ error: matchingError }, "⚠️ Error triggering matching:")
        // Don't fail the request for matching errors
      }
    }

    logger.info({}, "🎉 [DEBUG] Route successful, sending response")
    return NextResponse.json({
      success: true,
      message: statusMessage,
      newStatus
    })

  } catch (error) {
    logger.error({ error }, '❌ [DEBUG] Critical error in availability-response route:')
    logger.error({ error: error instanceof Error ? error.stack : 'No stack trace' }, '❌ [DEBUG] Error stack:')
    return NextResponse.json({
      success: false,
      error: 'Erreur serveur'
    }, { status: 500 })
  }
}