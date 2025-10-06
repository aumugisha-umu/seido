import { NextRequest, NextResponse } from 'next/server'

import { notificationService } from '@/lib/notification-service'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/lib/database.types'
import { logger, logError } from '@/lib/logger'
import { createServerUserService, createServerInterventionService } from '@/lib/services'

export async function POST(request: NextRequest) {
  logger.info({}, "🚀 intervention-start API route called")

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
      startComment,
      internalComment
    } = body

    if (!interventionId) {
      return NextResponse.json({
        success: false,
        error: 'interventionId est requis'
      }, { status: 400 })
    }

    logger.info({ interventionId: interventionId }, "📝 Starting intervention:")

    // Get current user from database
    const user = await userService.findByAuthUserId(authUser.id)
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Utilisateur non trouvé'
      }, { status: 404 })
    }

    // Check if user is gestionnaire or prestataire
    if (!['gestionnaire', 'prestataire'].includes(user.role)) {
      return NextResponse.json({
        success: false,
        error: 'Seuls les gestionnaires et prestataires peuvent démarrer les interventions'
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

    const existingComment = user.role === 'prestataire' ? 
      intervention.provider_comment : 
      intervention.manager_comment

    const updatedComment = existingComment + (existingComment ? ' | ' : '') + commentParts.join(' | ')

    // Update intervention status
    const updateData = {
      status: 'en_cours' as Database['public']['Enums']['intervention_status'],
      updated_at: new Date().toISOString()
    }

    if (user.role === 'prestataire') {
      updateData.provider_comment = updatedComment
    } else {
      updateData.manager_comment = updatedComment
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
