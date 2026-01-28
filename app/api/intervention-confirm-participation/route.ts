import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { getApiAuthContext } from '@/lib/api-auth-helper'
import { z } from 'zod'

/**
 * POST /api/intervention-confirm-participation
 *
 * Permet à un participant de confirmer ou décliner sa participation
 * à une intervention qui requiert une confirmation.
 */

// Schéma de validation
const confirmParticipationSchema = z.object({
  interventionId: z.string().uuid('ID intervention invalide'),
  confirmed: z.boolean(),
  reason: z.string().max(1000).optional()
})

export async function POST(request: NextRequest) {
  logger.info({}, "📋 [CONFIRM-PARTICIPATION] API route called")

  try {
    // ✅ AUTH: Vérifier l'authentification (tout rôle accepté)
    const authResult = await getApiAuthContext({ requiredRole: undefined })
    if (!authResult.success) {
      return authResult.error
    }

    const { supabase, userProfile } = authResult.data

    // Vérifier que le profil utilisateur existe
    if (!userProfile) {
      logger.error({}, "❌ [CONFIRM-PARTICIPATION] User profile not found")
      return NextResponse.json({
        success: false,
        error: 'Profil utilisateur introuvable'
      }, { status: 401 })
    }

    // Parser et valider le body
    const body = await request.json()
    const validation = confirmParticipationSchema.safeParse(body)

    if (!validation.success) {
      logger.error({
        errors: validation.error.errors
      }, "❌ [CONFIRM-PARTICIPATION] Validation failed")
      return NextResponse.json({
        success: false,
        error: 'Données invalides',
        details: validation.error.errors
      }, { status: 400 })
    }

    const { interventionId, confirmed, reason } = validation.data

    logger.info({
      interventionId,
      confirmed,
      userId: userProfile.id
    }, "📋 [CONFIRM-PARTICIPATION] Processing request")

    // Vérifier que l'utilisateur est bien assigné à cette intervention
    // et que la confirmation est requise
    const { data: assignment, error: assignmentError } = await supabase
      .from('intervention_assignments')
      .select('id, requires_confirmation, confirmation_status')
      .eq('intervention_id', interventionId)
      .eq('user_id', userProfile.id)
      .single()

    if (assignmentError || !assignment) {
      logger.error({
        error: assignmentError,
        interventionId,
        userId: userProfile.id
      }, "❌ [CONFIRM-PARTICIPATION] Assignment not found")
      return NextResponse.json({
        success: false,
        error: 'Vous n\'êtes pas assigné à cette intervention'
      }, { status: 403 })
    }

    // Vérifier que la confirmation est requise
    if (!assignment.requires_confirmation) {
      logger.warn({
        assignmentId: assignment.id
      }, "⚠️ [CONFIRM-PARTICIPATION] Confirmation not required")
      return NextResponse.json({
        success: false,
        error: 'La confirmation n\'est pas requise pour cette intervention'
      }, { status: 400 })
    }

    // Vérifier que le statut est bien 'pending' (pas déjà confirmé/rejeté)
    if (assignment.confirmation_status !== 'pending') {
      logger.warn({
        assignmentId: assignment.id,
        currentStatus: assignment.confirmation_status
      }, "⚠️ [CONFIRM-PARTICIPATION] Already processed")
      return NextResponse.json({
        success: false,
        error: 'Vous avez déjà répondu à cette demande de confirmation'
      }, { status: 400 })
    }

    // Mettre à jour le statut de confirmation
    const newStatus = confirmed ? 'confirmed' : 'rejected'
    const { error: updateError } = await supabase
      .from('intervention_assignments')
      .update({
        confirmation_status: newStatus,
        confirmed_at: new Date().toISOString(),
        confirmation_notes: reason || null
      })
      .eq('id', assignment.id)

    if (updateError) {
      logger.error({
        error: updateError,
        assignmentId: assignment.id
      }, "❌ [CONFIRM-PARTICIPATION] Update failed")
      return NextResponse.json({
        success: false,
        error: 'Erreur lors de la mise à jour du statut'
      }, { status: 500 })
    }

    logger.info({
      assignmentId: assignment.id,
      newStatus,
      userId: userProfile.id
    }, "✅ [CONFIRM-PARTICIPATION] Status updated successfully")

    // ✅ FIX 2026-01-25: Vérifier si TOUTES les confirmations requises sont reçues
    if (confirmed) {
      const { data: allAssignments, error: allAssignmentsError } = await supabase
        .from('intervention_assignments')
        .select('confirmation_status')
        .eq('intervention_id', interventionId)
        .eq('requires_confirmation', true)

      if (!allAssignmentsError && allAssignments) {
        const allConfirmed = allAssignments.every(a => a.confirmation_status === 'confirmed')

        if (allConfirmed) {
          logger.info({ interventionId }, "✅ [CONFIRM-PARTICIPATION] All participants confirmed")

          // 1. Mettre à jour l'intervention vers 'planifiee'
          const { error: updateInterventionError } = await supabase
            .from('interventions')
            .update({ status: 'planifiee' })
            .eq('id', interventionId)
            .eq('status', 'planification') // Seulement si en planification

          if (updateInterventionError) {
            logger.warn({
              error: updateInterventionError,
              interventionId
            }, "⚠️ [CONFIRM-PARTICIPATION] Failed to update intervention status")
          }

          // 2. Mettre à jour le time slot vers 'selected'
          const { error: updateSlotError } = await supabase
            .from('intervention_time_slots')
            .update({
              status: 'selected',
              selected_by_manager: true
            })
            .eq('intervention_id', interventionId)
            .eq('status', 'pending')

          if (updateSlotError) {
            logger.warn({
              error: updateSlotError,
              interventionId
            }, "⚠️ [CONFIRM-PARTICIPATION] Failed to update time slot status")
          }

          logger.info({ interventionId }, "✅ [CONFIRM-PARTICIPATION] Intervention planifiée après confirmation de tous les participants")
        } else {
          const pendingCount = allAssignments.filter(a => a.confirmation_status === 'pending').length
          logger.info({
            interventionId,
            confirmedCount: allAssignments.filter(a => a.confirmation_status === 'confirmed').length,
            pendingCount
          }, "ℹ️ [CONFIRM-PARTICIPATION] Waiting for more confirmations")
        }
      }
    }

    // TODO: Envoyer une notification au créateur de l'intervention
    // pour l'informer de la réponse du participant

    return NextResponse.json({
      success: true,
      data: {
        confirmed,
        status: newStatus
      }
    })

  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : String(error)
    }, "❌ [CONFIRM-PARTICIPATION] Unexpected error")
    return NextResponse.json({
      success: false,
      error: 'Erreur interne du serveur'
    }, { status: 500 })
  }
}
