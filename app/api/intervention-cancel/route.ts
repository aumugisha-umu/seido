import { NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/database.types"
import { createServerInterventionService } from '@/lib/services'
import { notifyInterventionStatusChange } from '@/app/actions/notification-actions'
import { logger } from '@/lib/logger'
import { getApiAuthContext } from '@/lib/api-auth-helper'
import { interventionCancelSchema, validateRequest, formatZodErrors } from '@/lib/validation/schemas'

export async function POST(request: NextRequest) {
  // Initialize services
  const interventionService = await createServerInterventionService()

  try {
    // ✅ AUTH: 50 lignes → 3 lignes! (centralisé dans getApiAuthContext)
    const authResult = await getApiAuthContext()
    if (!authResult.success) return authResult.error

    const { supabase, authUser } = authResult.data

    const body = await request.json()

    // ✅ ZOD VALIDATION
    const validation = validateRequest(interventionCancelSchema, body)
    if (!validation.success) {
      logger.warn({ errors: formatZodErrors(validation.errors) }, '⚠️ [INTERVENTION-CANCEL] Validation failed')
      return NextResponse.json({
        success: false,
        error: 'Données invalides',
        details: formatZodErrors(validation.errors)
      }, { status: 400 })
    }

    const { interventionId, cancellationReason } = validation.data
    const { internalComment } = body // Not in schema

    logger.info({ interventionId }, "🚫 API: Cancelling intervention")

    // Validation des données avec logs de debug
    logger.info({
      interventionId,
      cancellationReason,
      trimmed: cancellationReason?.trim(),
      length: cancellationReason?.trim()?.length
    }, '🔍 [API-CANCEL] Validation check')

    if (!interventionId || !cancellationReason?.trim()) {
      logger.info({
        hasInterventionId: !!interventionId,
        hasCancellationReason: !!cancellationReason,
        trimmedLength: cancellationReason?.trim()?.length || 0
      }, '❌ [API-CANCEL] Validation failed')
      return NextResponse.json(
        { success: false, error: "ID d'intervention et motif d'annulation requis" },
        { status: 400 }
      )
    }

    logger.info({ interventionId, authUser: authUser.id }, "🚫 Cancelling intervention by user")

    // D'abord récupérer l'intervention de base sans relations
    const { data: intervention, error: fetchError } = await supabase
      .from("interventions")
      .select("*")
      .eq("id", interventionId)
      .single()

    if (fetchError) {
      logger.error({ error: fetchError }, "❌ Error fetching intervention:")
      return NextResponse.json(
        { success: false, error: `Erreur base de données: ${fetchError.message}` },
        { status: 500 }
      )
    }

    if (!intervention) {
      logger.error({ interventionId: interventionId }, "❌ Intervention not found with ID:")
      return NextResponse.json(
        { success: false, error: "Intervention introuvable" },
        { status: 404 }
      )
    }

    logger.info({ title: intervention.title, status: intervention.status }, `📋 Found intervention "${intervention.title}" with status: ${intervention.status}`)

    // Vérifier que l'intervention peut être annulée
    // Note: 'en_cours' is DEPRECATED - removed from cancellable list
    const cancellableStatuses = [
      "approuvee",
      "demande_de_devis",
      "planification",
      "planifiee"
    ]

    if (!cancellableStatuses.includes(intervention.status)) {
      return NextResponse.json(
        { success: false, error: `Impossible d'annuler une intervention au statut "${intervention.status}"` },
        { status: 400 }
      )
    }

    // Mettre à jour le statut de l'intervention
    const { data: updatedIntervention, error: updateError } = await supabase
      .from("interventions")
      .update({
        status: "annulee",
        updated_at: new Date().toISOString(),
        // Optionnel: ajouter les commentaires dans un champ dédié ou logs
      })
      .eq("id", interventionId)
      .select()
      .single()

    if (updateError) {
      logger.error({ error: updateError }, "❌ Error updating intervention:")
      return NextResponse.json(
        { success: false, error: "Erreur lors de la mise à jour" },
        { status: 500 }
      )
    }

    logger.info({ updatedIntervention: updatedIntervention.status }, "✅ Intervention status updated to:")

    // Créer un log d'activité pour l'annulation
    const { error: logError } = await supabase
      .from("activity_logs")
      .insert({
        entity_type: "intervention",
        entity_id: interventionId,
        action: "cancelled",
        details: {
          previous_status: intervention.status,
          new_status: "annulee",
          cancellation_reason: cancellationReason,
          internal_comment: internalComment,
          cancelled_by: authUser.id,
          cancelled_at: new Date().toISOString()
        },
        user_id: authUser.id,
        created_at: new Date().toISOString()
      })

    if (logError) {
      logger.warn({ error: logError }, "⚠️ Error creating activity log:")
      // Ne pas faire échouer la requête pour un problème de log
    }

    // Envoyer les notifications
    try {
      logger.info({}, "📧 Sending cancellation notifications...")

      const notifResult = await notifyInterventionStatusChange({
        interventionId: updatedIntervention.id,
        oldStatus: intervention.status,
        newStatus: "annulee",
        reason: cancellationReason
      })

      if (notifResult.success) {
        logger.info({ count: notifResult.data?.length }, "✅ Cancellation notifications sent successfully")
      } else {
        logger.warn({ error: notifResult.error }, "⚠️ Notifications partially failed")
      }
    } catch (notificationError) {
      logger.error({ error: notificationError }, "❌ Error sending notifications:")
      // Ne pas faire échouer la requête pour un problème de notification
    }

    return NextResponse.json({
      success: true,
      intervention: updatedIntervention,
      message: "Intervention annulée avec succès"
    })

  } catch (error) {
    logger.error({ error: error }, "❌ API Error:")
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Erreur interne du serveur" 
      },
      { status: 500 }
    )
  }
}
