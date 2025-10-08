import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/lib/database.types'
import { userService } from '@/lib/database-service'
import { notificationService } from '@/lib/notification-service'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const interventionId = (await params).id

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

    // Get user from database
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
        error: 'Seuls les gestionnaires peuvent finaliser les interventions'
      }, { status: 403 })
    }

    // Parse request body
    const body = await request.json()
    const {
      finalStatus,
      adminComments,
      qualityControl,
      financialSummary,
      documentation,
      archivalData,
      followUpActions,
      additionalDocuments
    } = body

    // Validation
    if (!finalStatus || !['completed', 'archived_with_issues', 'cancelled'].includes(finalStatus)) {
      return NextResponse.json({
        success: false,
        error: 'Statut final invalide'
      }, { status: 400 })
    }

    // Validate financial data
    if (!financialSummary?.finalCost || financialSummary.finalCost <= 0) {
      return NextResponse.json({
        success: false,
        error: 'Le coût final doit être positif'
      }, { status: 400 })
    }

    if (Math.abs(financialSummary.budgetVariance || 0) > 20 && !financialSummary.costJustification?.trim()) {
      return NextResponse.json({
        success: false,
        error: 'Une justification est requise pour une variance budgétaire > 20%'
      }, { status: 400 })
    }

    // Get intervention
    const { data: intervention, error: interventionError } = await supabase
      .from('interventions')
      .select('*')
      .eq('id', interventionId)
      .single()

    if (interventionError || !intervention) {
      return NextResponse.json({
        success: false,
        error: 'Intervention non trouvée'
      }, { status: 404 })
    }

    // Check if intervention is in correct status
    if (!['cloturee_par_locataire', 'contestee'].includes(intervention.status)) {
      return NextResponse.json({
        success: false,
        error: `La finalisation ne peut être faite que pour les interventions validées par le locataire ou contestées (statut actuel: ${intervention.status})`
      }, { status: 400 })
    }

    // Check if user belongs to intervention team
    if (intervention.team_id && user.team_id !== intervention.team_id) {
      return NextResponse.json({
        success: false,
        error: 'Vous n\'êtes pas autorisé à finaliser cette intervention'
      }, { status: 403 })
    }

    console.log(`📝 Processing manager finalization (${finalStatus}) for intervention:`, interventionId)

    // TODO: Handle additional documents upload to Supabase Storage
    const processedDocuments = additionalDocuments || []

    // Create manager finalization record
    const finalizationData = {
      intervention_id: interventionId,
      manager_id: user.id,
      final_status: finalStatus,
      admin_comments: adminComments?.trim() || '',
      quality_control: JSON.stringify(qualityControl || {}),
      financial_summary: JSON.stringify(financialSummary || {}),
      documentation: JSON.stringify(documentation || {}),
      archival_data: JSON.stringify(archivalData || {}),
      follow_up_actions: JSON.stringify(followUpActions || {}),
      additional_documents: JSON.stringify(processedDocuments),
      finalized_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Insert finalization record
    const { data: finalization, error: insertError } = await supabase
      .from('intervention_manager_finalizations')
      .insert(finalizationData)
      .select()
      .single()

    if (insertError) {
      console.error("❌ Error creating manager finalization record:", insertError)
      return NextResponse.json({
        success: false,
        error: 'Erreur lors de la sauvegarde de la finalisation'
      }, { status: 500 })
    }

    // Update intervention status and financial data
    const newInterventionStatus = finalStatus === 'completed' ? 'cloturee_par_gestionnaire' : finalStatus
    const { error: updateError } = await supabase
      .from('interventions')
      .update({
        status: newInterventionStatus,
        final_cost: financialSummary.finalCost,
        updated_at: new Date().toISOString(),
        finalized_at: new Date().toISOString()
      })
      .eq('id', interventionId)

    if (updateError) {
      console.error("❌ Error updating intervention:", updateError)
      return NextResponse.json({
        success: false,
        error: 'Erreur lors de la mise à jour de l\'intervention'
      }, { status: 500 })
    }

    console.log(`✅ Manager finalization (${finalStatus}) completed successfully`)

    // Send final notifications
    try {
      // Notify all participants
      const { data: contacts } = await supabase
        .from('intervention_contacts')
        .select(`
          user:user_id(id, name, email, role)
        `)
        .eq('intervention_id', interventionId)

      const tenantNotificationPromise = intervention.tenant_id ?
        notificationService.createNotification({
          userId: intervention.tenant_id,
          teamId: intervention.team_id,
          createdBy: user.id,
          type: 'intervention',
          priority: 'normal',
          title: 'Intervention finalisée',
          message: `L'intervention "${intervention.title}" a été finalisée par l'administration.`,
          isPersonal: true,
          metadata: {
            interventionId: interventionId,
            interventionTitle: intervention.title,
            finalStatus,
            managerName: user.name
          },
          relatedEntityType: 'intervention',
          relatedEntityId: interventionId
        }) : Promise.resolve()

      const contactNotificationPromises = contacts?.map(contact =>
        notificationService.createNotification({
          userId: contact.user.id,
          teamId: intervention.team_id,
          createdBy: user.id,
          type: 'intervention',
          priority: 'normal',
          title: 'Intervention finalisée',
          message: `${user.name} a finalisé l'intervention "${intervention.title}"`,
          isPersonal: true,
          metadata: {
            interventionId: interventionId,
            interventionTitle: intervention.title,
            finalStatus,
            managerName: user.name
          },
          relatedEntityType: 'intervention',
          relatedEntityId: interventionId
        })
      ) || []

      await Promise.all([tenantNotificationPromise, ...contactNotificationPromises])
      console.log("📧 Finalization notifications sent")
    } catch (notifError) {
      console.warn("⚠️ Could not send finalization notifications:", notifError)
    }

    // Schedule follow-up actions if needed
    if (followUpActions?.warrantyReminder || followUpActions?.maintenanceSchedule || followUpActions?.feedbackRequest) {
      console.log("📅 Follow-up actions scheduled:", followUpActions)
      // TODO: Implement follow-up scheduling system
    }

    return NextResponse.json({
      success: true,
      finalization: {
        id: finalization.id,
        intervention_id: finalization.intervention_id,
        final_status: finalization.final_status,
        finalized_at: finalization.finalized_at
      },
      message: 'Intervention finalisée avec succès'
    })

  } catch (error) {
    console.error("❌ Error in manager finalization API:", error)
    return NextResponse.json({
      success: false,
      error: 'Erreur interne du serveur'
    }, { status: 500 })
  }
}