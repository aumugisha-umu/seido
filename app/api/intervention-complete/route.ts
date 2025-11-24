import { NextRequest, NextResponse } from 'next/server'
import { Database } from '@/lib/database.types'
import { logger, logError } from '@/lib/logger'
import { createServerInterventionService } from '@/lib/services'
import { getApiAuthContext } from '@/lib/api-auth-helper'
import { interventionCompleteSchema, validateRequest, formatZodErrors } from '@/lib/validation/schemas'

export async function POST(request: NextRequest) {
  logger.info({}, "✅ intervention-complete API route called")

  // Initialize services
  const interventionService = await createServerInterventionService()

  try {
    // ✅ AUTH: 71 lignes → 8 lignes! (gestionnaire OR prestataire)
    const authResult = await getApiAuthContext()
    if (!authResult.success) return authResult.error

    const { supabase, userProfile: user } = authResult.data

    // Check if user is prestataire or gestionnaire (multi-role validation)
    if (!user || !['prestataire', 'gestionnaire', 'admin'].includes(user.role)) {
      return NextResponse.json({
        success: false,
        error: 'Seuls les prestataires et gestionnaires peuvent terminer les interventions'
      }, { status: 403 })
    }

    // Parse request body
    const body = await request.json()

    // ✅ ZOD VALIDATION
    const validation = validateRequest(interventionCompleteSchema, body)
    if (!validation.success) {
      logger.warn({ errors: formatZodErrors(validation.errors) }, '⚠️ [intervention-complete] Validation failed')
      return NextResponse.json({
        success: false,
        error: 'Données invalides',
        details: formatZodErrors(validation.errors)
      }, { status: 400 })
    }

    const validatedData = validation.data
    const {
      interventionId,
      completionNotes
    } = validatedData

    // Additional fields not in schema (backward compatibility)
    const {
      internalComment,
      finalCost, // Montant final (optionnel)
      workDescription // Description des travaux effectués
    } = body

    logger.info({ interventionId: interventionId }, "📝 Completing intervention:")

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

    // Check if intervention can be completed
    // Allow completion from 'en_cours' OR 'planifiee' (direct completion without starting)
    if (!['en_cours', 'planifiee'].includes(intervention.status)) {
      return NextResponse.json({
        success: false,
        error: `L'intervention ne peut pas être terminée (statut actuel: ${intervention.status})`
      }, { status: 400 })
    }

    // For prestataires, check if they are assigned to this intervention
    if (user.role === 'prestataire') {
      const isAssigned = intervention.intervention_assignments?.some(ic =>
        ic.role === 'prestataire' && ic.user.id === user.id
      )

      if (!isAssigned) {
        return NextResponse.json({
          success: false,
          error: 'Vous n\'êtes pas assigné à cette intervention'
        }, { status: 403 })
      }
    }

    // For gestionnaires, check if they belong to intervention team
    if (user.role === 'gestionnaire' && intervention.team_id && user.team_id !== intervention.team_id) {
      return NextResponse.json({
        success: false,
        error: 'Vous n\'êtes pas autorisé à modifier cette intervention'
      }, { status: 403 })
    }

    logger.info("🔄 Updating intervention status to 'cloturee_par_prestataire'...")

    // Build completion comment
    const commentParts = []
    if (workDescription) {
      commentParts.push(`Travaux effectués: ${workDescription}`)
    }
    if (completionNotes) {
      commentParts.push(`Notes: ${completionNotes}`)
    }
    if (internalComment) {
      commentParts.push(`Note interne: ${internalComment}`)
    }
    if (finalCost) {
      commentParts.push(`Coût final: ${finalCost}€`)
    }
    commentParts.push(`Terminée par ${user.name} (${user.role}) le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`)

    // Note: Comments are now stored in intervention_comments table
    // The completion comment should be saved via the comments system

    // Update intervention status and details
    const updateData = {
      status: 'cloturee_par_prestataire' as Database['public']['Enums']['intervention_status'],
      completed_date: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Add final cost if provided
    if (finalCost && !isNaN(parseFloat(finalCost))) {
      updateData.final_cost = parseFloat(finalCost)
    }

    // Note: Don't pass userId - let RLS handle permissions (like all other endpoints)
    const updateResult = await interventionService.update(interventionId, updateData)

    // Check if update failed
    if (!updateResult || !updateResult.success || updateResult.error) {
      logger.error({
        error: updateResult?.error,
        interventionId
      }, "❌ Failed to update intervention status")

      return NextResponse.json({
        success: false,
        error: updateResult?.error?.message || 'Erreur lors de la mise à jour de l\'intervention',
        details: updateResult?.error
      }, { status: 500 })
    }

    const updatedIntervention = updateResult.data

    logger.info({}, "✅ Intervention status updated successfully")

    // Create intervention report if work description provided
    if (workDescription && intervention.team_id) {
      try {
        const { error: reportError } = await supabase
          .from('intervention_reports')
          .insert({
            intervention_id: interventionId,
            team_id: intervention.team_id,
            report_type: 'provider_report',
            title: `Rapport de fin de travaux - ${intervention.title}`,
            content: workDescription,
            created_by: user.id,
            is_internal: false,
            metadata: {
              completed_date: new Date().toISOString(),
              completed_by_name: user.name,
              completed_by_role: user.role,
              final_cost: finalCost || null,
              has_completion_notes: !!completionNotes,
              lot_reference: intervention.lot?.reference,
              building_name: intervention.lot?.building?.name
            }
          })

        if (reportError) {
          logger.warn({ reportError }, "⚠️ Could not create intervention report:")
        } else {
          logger.info({}, "📝 Intervention report created successfully")
        }
      } catch (reportCreationError) {
        logger.warn({ reportCreationError }, "⚠️ Error creating intervention report:")
      }
    }

    // Create notifications
    const notificationMessage = `L'intervention "${intervention.title}" a été terminée par ${user.name}. Elle est maintenant en attente de votre validation.`

    // Notify tenant for validation
    if (intervention.tenant_id && intervention.team_id) {
      try {
        await notificationService.createNotification({
          userId: intervention.tenant_id,
          teamId: intervention.team_id,
          createdBy: user.id,
          type: 'intervention',
          title: 'Intervention terminée - Validation demandée',
          message: notificationMessage,
          isPersonal: true, // Locataire toujours personnel
          metadata: {
            interventionId: intervention.id,
            interventionTitle: intervention.title,
            completedBy: user.name,
            completedByRole: user.role,
            finalCost: finalCost || null,
            completionDate: new Date().toISOString(),
            lotReference: intervention.lot?.reference,
            buildingName: intervention.lot?.building?.name
          },
          relatedEntityType: 'intervention',
          relatedEntityId: intervention.id
        })
        logger.info({}, "📧 Completion notification sent to tenant for validation")
      } catch (notifError) {
        logger.warn({ notifError: notifError }, "⚠️ Could not send notification to tenant:")
      }
    }

    // Notify gestionnaires if completed by prestataire
    if (user.role === 'prestataire') {
      const managers = intervention.intervention_assignments?.filter(ic =>
        ic.role === 'gestionnaire'
      ) || []

      for (const manager of managers) {
        try {
          await notificationService.createNotification({
            userId: manager.user.id,
            teamId: intervention.team_id!,
            createdBy: user.id,
            type: 'intervention',
            title: 'Intervention terminée par prestataire',
            message: `L'intervention "${intervention.title}" a été terminée par ${user.name}. En attente de validation par le locataire.`,
            isPersonal: manager.is_primary ?? false, // Basé sur assignation
            metadata: {
              interventionId: intervention.id,
              interventionTitle: intervention.title,
              completedBy: user.name,
              finalCost: finalCost || null
            },
            relatedEntityType: 'intervention',
            relatedEntityId: intervention.id
          })
        } catch (notifError) {
          logger.warn({ manager: manager.user.name, notifError }, "⚠️ Could not send notification to manager:")
        }
      }
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
      completedBy: {
        name: user.name,
        role: user.role
      },
      message: 'Intervention terminée avec succès'
    })

  } catch (error) {
    logger.error({ error: error }, "❌ Error in intervention-complete API:")
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
