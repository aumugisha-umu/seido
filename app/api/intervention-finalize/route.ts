import { NextRequest, NextResponse } from 'next/server'
import { Database } from '@/lib/database.types'
import { logger } from '@/lib/logger'
import { createServerInterventionService } from '@/lib/services'
import { getApiAuthContext } from '@/lib/api-auth-helper'
import { interventionFinalizeSchema, validateRequest, formatZodErrors } from '@/lib/validation/schemas'

export async function POST(request: NextRequest) {
  logger.info({}, "🏁 intervention-finalize API route called")

  // Initialize services
  const interventionService = await createServerInterventionService()

  try {
    // ✅ AUTH + ROLE CHECK: 68 lignes → 3 lignes! (gestionnaire required)
    const authResult = await getApiAuthContext({ requiredRole: 'gestionnaire' })
    if (!authResult.success) return authResult.error

    const { supabase, userProfile: user } = authResult.data

    // Parse request body
    const body = await request.json()

    // ✅ ZOD VALIDATION
    const validation = validateRequest(interventionFinalizeSchema, body)
    if (!validation.success) {
      logger.warn({ errors: formatZodErrors(validation.errors) }, '⚠️ [intervention-finalize] Validation failed')
      return NextResponse.json({
        success: false,
        error: 'Données invalides',
        details: formatZodErrors(validation.errors)
      }, { status: 400 })
    }

    const validatedData = validation.data
    const {
      interventionId,
      finalizationComment,
      managerReport, // Rapport de clôture gestionnaire (optionnel)
      paymentStatus, // 'pending' | 'approved' | 'paid' | 'disputed'
      finalAmount, // Montant final validé (peut différer du coût initial)
      paymentMethod, // Mode de paiement (optionnel)
      adminNotes // Notes administratives (optionnel)
    } = validatedData

    logger.info({ interventionId: interventionId }, "📝 Finalizing intervention:")

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

    // Check if intervention can be finalized
    const finalizableStatuses = ['cloturee_par_prestataire', 'cloturee_par_locataire', 'contestee']
    if (!finalizableStatuses.includes(intervention.status)) {
      return NextResponse.json({
        success: false,
        error: `L'intervention ne peut pas être finalisée (statut actuel: ${intervention.status})`
      }, { status: 400 })
    }

    // Check if user belongs to intervention team
    if (intervention.team_id && user.team_id !== intervention.team_id) {
      return NextResponse.json({
        success: false,
        error: 'Vous n\'êtes pas autorisé à modifier cette intervention'
      }, { status: 403 })
    }

    logger.info("🔄 Updating intervention status to 'cloturee_par_gestionnaire'...")

    // Build finalization comment
    const commentParts = []
    commentParts.push('Finalisation administrative')
    
    if (finalizationComment) {
      commentParts.push(`Commentaire: ${finalizationComment}`)
    }
    
    if (paymentStatus) {
      const statusLabels = {
        pending: 'En attente',
        approved: 'Approuvé',
        paid: 'Payé',
        disputed: 'Contesté'
      }
      commentParts.push(`Statut paiement: ${statusLabels[paymentStatus as keyof typeof statusLabels] || paymentStatus}`)
    }
    
    if (finalAmount !== undefined && finalAmount !== null) {
      commentParts.push(`Montant final validé: ${finalAmount}€`)
    }
    
    if (paymentMethod) {
      commentParts.push(`Mode de paiement: ${paymentMethod}`)
    }
    
    if (adminNotes) {
      commentParts.push(`Notes admin: ${adminNotes}`)
    }
    
    commentParts.push(`Finalisée par ${user.name} le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`)

    // Note: Comments (finalization notes, admin notes) are now stored in intervention_comments table

    // Update intervention to final status
    // Note: Using existing columns only (completed_date, final_cost)
    // payment_status, payment_method don't exist in the schema
    const updateData: Record<string, any> = {
      status: 'cloturee_par_gestionnaire' as Database['public']['Enums']['intervention_status'],
      completed_date: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Set final cost if provided
    if (finalAmount !== undefined && finalAmount !== null && !isNaN(parseFloat(finalAmount.toString()))) {
      updateData.final_cost = parseFloat(finalAmount.toString())
    }

    const updatedIntervention = await interventionService.update(interventionId, updateData)

    logger.info({}, "🏁 Intervention finalized successfully")

    // Create manager report if provided
    if (managerReport?.trim()) {
      try {
        const { error: reportError } = await supabase
          .from('intervention_reports')
          .insert({
            intervention_id: interventionId,
            team_id: intervention.team_id,
            report_type: 'manager_report',
            title: 'Rapport de clôture - Gestionnaire',
            content: managerReport.trim(),
            metadata: {
              finalization: true,
              finalized_at: new Date().toISOString(),
              finalized_by: user.name
            },
            is_internal: false,
            created_by: user.id
          })

        if (reportError) {
          logger.warn({ reportError }, '⚠️ Could not create manager report:')
        } else {
          logger.info({}, '📝 Manager report created successfully')
        }
      } catch (reportErr) {
        logger.warn({ error: reportErr }, '⚠️ Error creating manager report:')
      }
    }

    // TODO: Add notifications later via Server Actions pattern
    // See: app/actions/notification-actions.ts

    // Create activity log entry for closure
    try {
      const { error: activityError } = await supabase
        .from('activity_logs')
        .insert({
          team_id: intervention.team_id,
          user_id: user.id,
          entity_type: 'intervention' as Database['public']['Enums']['activity_entity_type'],
          entity_id: intervention.id,
          intervention_id: intervention.id,
          action_type: 'update' as Database['public']['Enums']['activity_action_type'],
          description: `Intervention "${intervention.title}" finalisée par ${user.name}`,
          status: 'success' as Database['public']['Enums']['activity_status'],
          metadata: {
            interventionTitle: intervention.title,
            finalCost: updateData.final_cost || intervention.final_cost,
            lotReference: intervention.lot?.reference,
            buildingName: intervention.lot?.building?.name
          }
        })

      if (activityError) {
        logger.warn({ activityError: activityError }, "⚠️ Could not create activity log:")
      }
    } catch (logError) {
      logger.warn({ error: logError }, "⚠️ Error creating activity log:")
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
      finalizedBy: {
        name: user.name,
        role: user.role
      },
      message: 'Intervention finalisée avec succès'
    })

  } catch (error) {
    logger.error({ error: error }, "❌ Error in intervention-finalize API:")
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
