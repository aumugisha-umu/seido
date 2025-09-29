import { NextRequest, NextResponse } from 'next/server'
import { interventionService, userService } from '@/lib/database-service'
import { notificationService } from '@/lib/notification-service'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/lib/database.types'

export async function POST(request: NextRequest) {
  console.log("🏁 intervention-finalize API route called")
  
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
      finalizationComment,
      paymentStatus, // 'pending' | 'approved' | 'paid' | 'disputed'
      finalAmount, // Montant final validé (peut différer du coût initial)
      paymentMethod, // Mode de paiement (optionnel)
      adminNotes // Notes administratives (optionnel)
    } = body

    if (!interventionId) {
      return NextResponse.json({
        success: false,
        error: 'interventionId est requis'
      }, { status: 400 })
    }

    console.log("📝 Finalizing intervention:", interventionId)

    // Get current user from database
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
      console.error("❌ Intervention not found:", interventionError)
      return NextResponse.json({
        success: false,
        error: 'Intervention non trouvée'
      }, { status: 404 })
    }

    // Check if intervention can be finalized
    if (intervention.status !== 'cloturee_par_locataire') {
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

    console.log("🔄 Updating intervention status to 'cloturee_par_gestionnaire'...")

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

    const existingComment = intervention.manager_comment || ''
    const updatedComment = existingComment + (existingComment ? ' | ' : '') + commentParts.join(' | ')

    // Update intervention to final status
    const updateData: unknown = {
      status: 'cloturee_par_gestionnaire' as Database['public']['Enums']['intervention_status'],
      manager_comment: updatedComment,
      finalized_date: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Set payment information
    if (paymentStatus) {
      updateData.payment_status = paymentStatus
    }

    if (finalAmount !== undefined && finalAmount !== null && !isNaN(parseFloat(finalAmount.toString()))) {
      updateData.final_amount = parseFloat(finalAmount.toString())
    }

    if (paymentMethod) {
      updateData.payment_method = paymentMethod
    }

    const updatedIntervention = await interventionService.update(interventionId, updateData)

    console.log("🏁 Intervention finalized successfully")

    // Create notifications for all stakeholders
    const notificationTitle = 'Intervention finalisée'
    const baseMessage = `L'intervention "${intervention.title}" a été finalisée administrativement par ${user.name}.`

    // Notify tenant
    if (intervention.tenant_id && intervention.team_id) {
      try {
        await notificationService.createNotification({
          userId: intervention.tenant_id,
          teamId: intervention.team_id,
          createdBy: user.id,
          type: 'intervention',
          priority: 'normal',
          title: notificationTitle,
          message: `${baseMessage} L'intervention est maintenant complètement clôturée.`,
          metadata: {
            interventionId: intervention.id,
            interventionTitle: intervention.title,
            finalizedBy: user.name,
            finalAmount: updateData.final_amount || null,
            paymentStatus: paymentStatus || null,
            finalizationDate: updateData.finalized_date,
            lotReference: intervention.lot?.reference,
            buildingName: intervention.lot?.building?.name
          },
          relatedEntityType: 'intervention',
          relatedEntityId: intervention.id
        })
        console.log("📧 Finalization notification sent to tenant")
      } catch (notifError) {
        console.warn("⚠️ Could not send notification to tenant:", notifError)
      }
    }

    // Notify prestataires
    const providers = intervention.intervention_contacts?.filter(ic => 
      ic.role === 'prestataire'
    ) || []

    for (const provider of providers) {
      try {
        await notificationService.createNotification({
          userId: provider.user.id,
          teamId: intervention.team_id!,
          createdBy: user.id,
          type: 'intervention',
          priority: 'normal',
          title: notificationTitle,
          message: `${baseMessage} ${paymentStatus === 'paid' || paymentStatus === 'approved' ? 'Le paiement a été traité.' : 'Le statut du paiement sera mis à jour prochainement.'}`,
          metadata: {
            interventionId: intervention.id,
            interventionTitle: intervention.title,
            finalAmount: updateData.final_amount || null,
            paymentStatus: paymentStatus || null
          },
          relatedEntityType: 'intervention',
          relatedEntityId: intervention.id
        })
      } catch (notifError) {
        console.warn("⚠️ Could not send notification to provider:", provider.user.name, notifError)
      }
    }

    // Create activity log entry for closure
    try {
      const { error: activityError } = await supabase
        .from('activity_logs')
        .insert({
          team_id: intervention.team_id,
          user_id: user.id,
          entity_type: 'intervention',
          entity_id: intervention.id,
          action: 'finalized',
          details: {
            interventionTitle: intervention.title,
            finalAmount: updateData.final_amount || intervention.final_cost,
            paymentStatus: paymentStatus,
            duration: intervention.completed_date && intervention.created_at ? 
              Math.ceil((new Date(intervention.completed_date).getTime() - new Date(intervention.created_at).getTime()) / (1000 * 60 * 60 * 24)) : 
              null
          },
          metadata: {
            lotReference: intervention.lot?.reference,
            buildingName: intervention.lot?.building?.name
          }
        })

      if (activityError) {
        console.warn("⚠️ Could not create activity log:", activityError)
      }
    } catch (logError) {
      console.warn("⚠️ Error creating activity log:", logError)
    }

    return NextResponse.json({
      success: true,
      intervention: {
        id: updatedIntervention.id,
        status: updatedIntervention.status,
        title: updatedIntervention.title,
        finalized_date: updatedIntervention.finalized_date,
        final_amount: updatedIntervention.final_amount,
        payment_status: updatedIntervention.payment_status,
        payment_method: updatedIntervention.payment_method,
        updated_at: updatedIntervention.updated_at
      },
      finalizedBy: {
        name: user.name,
        role: user.role
      },
      paymentStatus,
      message: 'Intervention finalisée avec succès'
    })

  } catch (error) {
    console.error("❌ Error in intervention-finalize API:", error)
    console.error("❌ Error details:", {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack',
    })

    return NextResponse.json({
      success: false,
      error: 'Erreur lors de la finalisation de l\'intervention'
    }, { status: 500 })
  }
}
