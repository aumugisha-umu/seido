import { NextRequest, NextResponse } from 'next/server'
import { notificationService } from '@/lib/notification-service'
import { Database } from '@/lib/database.types'
import { logger, logError } from '@/lib/logger'
import { getApiAuthContext } from '@/lib/api-auth-helper'
interface RouteParams {
  params: Promise<{
    id: string
  }>
}

interface TenantCounterProposal {
  date: string
  startTime: string
  endTime: string
}

interface AvailabilityResponsePayload {
  responseType: 'accept' | 'reject' | 'counter'
  message?: string
  selectedSlots?: string[] // Pour l'acceptation
  counterProposals?: TenantCounterProposal[] // Pour les contre-propositions
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
    const body: AvailabilityResponsePayload = await request.json()
    const { responseType, message, selectedSlots, counterProposals } = body

    logger.info({
      responseType,
      messageLength: message?.length || 0,
      selectedSlotsCount: selectedSlots?.length || 0,
      counterProposalsCount: counterProposals?.length || 0
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

    // Process response based on type
    let newStatus = intervention.status
    let statusMessage = ''

    if (responseType === 'accept') {
      newStatus = 'planifiee'
      statusMessage = 'Le locataire a accepté les créneaux proposés - Intervention planifiée'

      // TODO: Save selected slots for future scheduling
      // For now, we'll update the intervention status

    } else if (responseType === 'reject') {
      newStatus = 'planification'
      statusMessage = 'Le locataire a rejeté les créneaux proposés - En attente de nouvelles propositions'

    } else if (responseType === 'counter') {
      newStatus = 'planification'
      statusMessage = 'Le locataire a proposé d\'autres créneaux - En cours de planification'

      // Save tenant counter-proposals as user_availabilities
      if (counterProposals && counterProposals.length > 0) {
        // First, delete existing tenant availabilities for this intervention
        const { error: deleteError } = await supabase
          .from('user_availabilities')
          .delete()
          .eq('user_id', user.id)
          .eq('intervention_id', id)

        if (deleteError) {
          logger.warn({ deleteError: deleteError }, "⚠️ Could not delete existing tenant availabilities:")
        }

        // Insert new tenant counter-proposals
        const availabilityData = counterProposals.map((proposal) => ({
          user_id: user.id,
          intervention_id: id,
          date: proposal.date,
          start_time: proposal.startTime,
          end_time: proposal.endTime
        }))

        const { error: insertError } = await supabase
          .from('user_availabilities')
          .insert(availabilityData)

        if (insertError) {
          logger.error({ error: insertError }, "❌ Error saving tenant counter-proposals:")
          return NextResponse.json({
            success: false,
            error: 'Erreur lors de la sauvegarde des contre-propositions'
          }, { status: 500 })
        }

        logger.info({}, "✅ Tenant counter-proposals saved successfully")
      }
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
      await notificationService.notifyAvailabilityResponse({
        interventionId: id,
        interventionTitle: intervention.title || `Intervention ${intervention.type || ''}`,
        responseType,
        tenantName: user.name,
        message: message || '',
        teamId: intervention.lot?.building?.team_id,
        lotReference: intervention.lot?.reference
      })
      logger.info({}, '✅ Availability response notifications sent')
    } catch (notificationError) {
      logger.error({ error: notificationError }, '❌ Error sending availability response notifications:')
      // Don't fail the request for notification errors
    }

    // If it's a counter-proposal, try to trigger matching with provider availabilities
    if (responseType === 'counter') {
      try {
        const matchingResponse = await fetch(`${request.nextUrl.origin}/api/intervention/${id}/match-availabilities`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': request.headers.get('cookie') || ''
          },
        })

        if (matchingResponse.ok) {
          logger.info({}, '✅ Automatic matching triggered for counter-proposals')
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