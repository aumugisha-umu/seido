import { NextRequest, NextResponse } from 'next/server'

import { notificationService } from '@/lib/notification-service'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/lib/database.types'
import { logger, logError } from '@/lib/logger'
import { createServerUserService, createServerInterventionService } from '@/lib/services'

export async function POST(request: NextRequest) {
  logger.info({}, "✅ intervention-complete API route called")

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
      completionNotes,
      internalComment,
      finalCost, // Montant final (optionnel)
      workDescription // Description des travaux effectués
    } = body

    if (!interventionId) {
      return NextResponse.json({
        success: false,
        error: 'interventionId est requis'
      }, { status: 400 })
    }

    logger.info({ interventionId: interventionId }, "📝 Completing intervention:")

    // Get current user from database
    const user = await userService.findByAuthUserId(authUser.id)
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Utilisateur non trouvé'
      }, { status: 404 })
    }

    // Check if user is prestataire (mainly prestataires complete work)
    if (!['prestataire', 'gestionnaire'].includes(user.role)) {
      return NextResponse.json({
        success: false,
        error: 'Seuls les prestataires et gestionnaires peuvent terminer les interventions'
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

    // Check if intervention can be completed
    if (intervention.status !== 'en_cours') {
      return NextResponse.json({
        success: false,
        error: `L'intervention ne peut pas être terminée (statut actuel: ${intervention.status})`
      }, { status: 400 })
    }

    // For prestataires, check if they are assigned to this intervention
    if (user.role === 'prestataire') {
      const isAssigned = intervention.intervention_contacts?.some(ic => 
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

    const existingComment = user.role === 'prestataire' ? 
      intervention.provider_comment : 
      intervention.manager_comment

    const updatedComment = existingComment + (existingComment ? ' | ' : '') + commentParts.join(' | ')

    // Update intervention status and details
    const updateData = {
      status: 'cloturee_par_prestataire' as Database['public']['Enums']['intervention_status'],
      completed_date: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    if (user.role === 'prestataire') {
      updateData.provider_comment = updatedComment
    } else {
      updateData.manager_comment = updatedComment
    }

    // Add final cost if provided
    if (finalCost && !isNaN(parseFloat(finalCost))) {
      updateData.final_cost = parseFloat(finalCost)
    }

    const updatedIntervention = await interventionService.update(interventionId, updateData)

    logger.info({}, "✅ Intervention completed successfully")

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
          priority: 'high',
          title: 'Intervention terminée - Validation demandée',
          message: notificationMessage,
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
      const managers = intervention.intervention_contacts?.filter(ic => 
        ic.role === 'gestionnaire'
      ) || []

      for (const manager of managers) {
        try {
          await notificationService.createNotification({
            userId: manager.user.id,
            teamId: intervention.team_id!,
            createdBy: user.id,
            type: 'intervention',
            priority: 'normal',
            title: 'Intervention terminée par prestataire',
            message: `L'intervention "${intervention.title}" a été terminée par ${user.name}. En attente de validation par le locataire.`,
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
