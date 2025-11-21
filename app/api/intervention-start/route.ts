import { NextRequest, NextResponse } from 'next/server'
import { notificationService } from '@/lib/notification-service'
import { Database } from '@/lib/database.types'
import { logger, logError } from '@/lib/logger'
import { createServerInterventionService } from '@/lib/services'
import { getApiAuthContext } from '@/lib/api-auth-helper'
import { interventionStartSchema, validateRequest, formatZodErrors } from '@/lib/validation/schemas'

export async function POST(request: NextRequest) {
  logger.info({}, "🚀 intervention-start API route called")

  // Initialize services
  const interventionService = await createServerInterventionService()

  try {
    // ✅ AUTH: 65 lignes → 8 lignes! (gestionnaire OR prestataire)
    const authResult = await getApiAuthContext()
    if (!authResult.success) return authResult.error

    const { supabase, userProfile: user } = authResult.data

    // Check if user is gestionnaire or prestataire (multi-role validation)
    if (!user || !['gestionnaire', 'prestataire', 'admin'].includes(user.role)) {
      return NextResponse.json({
        success: false,
        error: 'Seuls les gestionnaires et prestataires peuvent démarrer les interventions'
      }, { status: 403 })
    }

    // Parse request body
    const body = await request.json()

    // ✅ ZOD VALIDATION
    const validation = validateRequest(interventionStartSchema, body)
    if (!validation.success) {
      logger.warn({ errors: formatZodErrors(validation.errors) }, '⚠️ [INTERVENTION-START] Validation failed')
      return NextResponse.json({
        success: false,
        error: 'Données invalides',
        details: formatZodErrors(validation.errors)
      }, { status: 400 })
    }

    const { interventionId, startedAt } = validation.data
    const { startComment, internalComment } = body // Not in schema

    if (!interventionId) {
      return NextResponse.json({
        success: false,
        error: 'interventionId est requis'
      }, { status: 400 })
    }

    logger.info({ interventionId: interventionId }, "📝 Starting intervention:")

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

    // Check if intervention can be started
    if (intervention.status !== 'planifiee') {
      return NextResponse.json({
        success: false,
        error: `L'intervention ne peut pas être démarrée (statut actuel: ${intervention.status})`
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

    logger.info("🔄 Updating intervention status to 'en_cours'...")

    // Build appropriate comment
    const commentParts = []
    if (startComment) {
      commentParts.push(`Démarrage: ${startComment}`)
    }
    if (internalComment) {
      commentParts.push(`Note interne: ${internalComment}`)
    }
    commentParts.push(`Démarrée par ${user.name} (${user.role}) le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`)

    // Note: Comments are now stored in intervention_comments table

    // Update intervention status
    const updateData = {
      status: 'en_cours' as Database['public']['Enums']['intervention_status'],
      updated_at: new Date().toISOString()
    }

    const updatedIntervention = await interventionService.update(interventionId, updateData)

    logger.info({}, "✅ Intervention started successfully")

    // Create notifications
    const notificationMessage = `L'intervention "${intervention.title}" a été démarrée par ${user.name}.`

    // Notify tenant if exists
    if (intervention.tenant_id && intervention.team_id) {
      try {
        await notificationService.createNotification({
          userId: intervention.tenant_id,
          teamId: intervention.team_id,
          createdBy: user.id,
          type: 'intervention',
          priority: 'high',
          title: 'Intervention démarrée',
          message: notificationMessage,
          metadata: {
            interventionId: intervention.id,
            interventionTitle: intervention.title,
            startedBy: user.name,
            startedByRole: user.role,
            lotReference: intervention.lot?.reference,
            buildingName: intervention.lot?.building?.name
          },
          relatedEntityType: 'intervention',
          relatedEntityId: intervention.id
        })
        logger.info({}, "📧 Start notification sent to tenant")
      } catch (notifError) {
        logger.warn({ notifError: notifError }, "⚠️ Could not send notification to tenant:")
      }
    }

    // Notify other stakeholders (gestionnaires if started by prestataire, or prestataires if started by gestionnaire)
    const notifyRoles = user.role === 'prestataire' ? ['gestionnaire'] : ['prestataire']
    const stakeholders = intervention.intervention_contacts?.filter(ic => 
      notifyRoles.includes(ic.role) && ic.user.id !== user.id
    ) || []

    for (const stakeholder of stakeholders) {
      try {
        await notificationService.createNotification({
          userId: stakeholder.user.id,
          teamId: intervention.team_id!,
          createdBy: user.id,
          type: 'intervention',
          priority: 'normal',
          title: 'Intervention démarrée',
          message: notificationMessage,
          metadata: {
            interventionId: intervention.id,
            interventionTitle: intervention.title,
            startedBy: user.name,
            startedByRole: user.role
          },
          relatedEntityType: 'intervention',
          relatedEntityId: intervention.id
        })
      } catch (notifError) {
        logger.warn({ stakeholder: stakeholder.user.name, notifError }, "⚠️ Could not send notification to stakeholder:")
      }
    }

    return NextResponse.json({
      success: true,
      intervention: {
        id: updatedIntervention.id,
        status: updatedIntervention.status,
        title: updatedIntervention.title,
        updated_at: updatedIntervention.updated_at
      },
      startedBy: {
        name: user.name,
        role: user.role
      },
      message: 'Intervention démarrée avec succès'
    })

  } catch (error) {
    logger.error({ error: error }, "❌ Error in intervention-start API:")
    logger.error({
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack',
    }, "❌ Error details:")

    return NextResponse.json({
      success: false,
      error: 'Erreur lors du démarrage de l\'intervention'
    }, { status: 500 })
  }
}
