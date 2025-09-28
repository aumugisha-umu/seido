import { NextRequest, NextResponse } from 'next/server'
import { interventionService, userService } from '@/lib/database-service'
import { notificationService } from '@/lib/notification-service'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/lib/database.types'

export async function POST(request: NextRequest) {
  console.log("👍 intervention-validate-tenant API route called")
  
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
      validationStatus, // 'approved' | 'contested'
      tenantComment, // Commentaire du locataire
      contestReason, // Si contested, raison de la contestation
      satisfactionRating // Note de satisfaction (1-5) (optionnel)
    } = body

    if (!interventionId || !validationStatus) {
      return NextResponse.json({
        success: false,
        error: 'interventionId et validationStatus sont requis'
      }, { status: 400 })
    }

    if (validationStatus === 'contested' && !contestReason) {
      return NextResponse.json({
        success: false,
        error: 'Le motif de contestation est requis'
      }, { status: 400 })
    }

    console.log("📝 Tenant validating intervention:", interventionId, "Status:", validationStatus)

    // Get current user from database
    const user = await userService.findByAuthUserId(authUser.id)
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Utilisateur non trouvé'
      }, { status: 404 })
    }

    // Check if user is locataire
    if (user.role !== 'locataire') {
      return NextResponse.json({
        success: false,
        error: 'Seuls les locataires peuvent valider les interventions'
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

    // Check if intervention can be validated by tenant
    if (intervention.status !== 'cloturee_par_prestataire') {
      return NextResponse.json({
        success: false,
        error: `L'intervention ne peut pas être validée (statut actuel: ${intervention.status})`
      }, { status: 400 })
    }

    // Check if user is the tenant assigned to this intervention
    if (intervention.tenant_id !== user.id) {
      return NextResponse.json({
        success: false,
        error: 'Vous n\'êtes pas le locataire assigné à cette intervention'
      }, { status: 403 })
    }

    let newStatus: Database['public']['Enums']['intervention_status']
    let notificationTitle = ''
    let notificationMessage = ''

    if (validationStatus === 'approved') {
      newStatus = 'cloturee_par_locataire'
      notificationTitle = 'Intervention validée par le locataire'
      notificationMessage = `L'intervention "${intervention.title}" a été validée par le locataire ${user.name}. Elle peut maintenant être finalisée administrativement.`
    } else if (validationStatus === 'contested') {
      newStatus = 'en_cours' // Return to in progress for resolution
      notificationTitle = 'Intervention contestée par le locataire'
      notificationMessage = `L'intervention "${intervention.title}" a été contestée par le locataire ${user.name}. Motif: ${contestReason}`
    } else {
      return NextResponse.json({
        success: false,
        error: 'Statut de validation non reconnu'
      }, { status: 400 })
    }

    console.log("🔄 Updating intervention status to:", newStatus)

    // Build tenant comment
    const commentParts = []
    commentParts.push(`Validation locataire: ${validationStatus === 'approved' ? 'Approuvée' : 'Contestée'}`)
    if (tenantComment) {
      commentParts.push(`Commentaire: ${tenantComment}`)
    }
    if (validationStatus === 'contested' && contestReason) {
      commentParts.push(`Motif contestation: ${contestReason}`)
    }
    if (satisfactionRating) {
      commentParts.push(`Note satisfaction: ${satisfactionRating}/5`)
    }
    commentParts.push(`Par ${user.name} le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`)

    const existingComment = intervention.tenant_comment || ''
    const updatedComment = existingComment + (existingComment ? ' | ' : '') + commentParts.join(' | ')

    // Update intervention
    const updateData: any = {
      status: newStatus,
      tenant_comment: updatedComment,
      updated_at: new Date().toISOString()
    }

    if (validationStatus === 'approved') {
      updateData.tenant_validated_date = new Date().toISOString()
    }

    if (satisfactionRating && !isNaN(parseInt(satisfactionRating))) {
      updateData.tenant_satisfaction_rating = parseInt(satisfactionRating)
    }

    const updatedIntervention = await interventionService.update(interventionId, updateData)

    console.log(`✅ Intervention ${validationStatus} by tenant successfully`)

    // Create notifications for stakeholders
    const priority = validationStatus === 'contested' ? 'high' : 'normal'

    // Notify gestionnaires
    if (intervention.team_id) {
      const managers = intervention.intervention_contacts?.filter(ic => 
        ic.role === 'gestionnaire'
      ) || []

      for (const manager of managers) {
        try {
          await notificationService.createNotification({
            userId: manager.user.id,
            teamId: intervention.team_id,
            createdBy: user.id,
            type: 'intervention',
            priority: priority,
            title: notificationTitle,
            message: notificationMessage,
            metadata: {
              interventionId: intervention.id,
              interventionTitle: intervention.title,
              validatedBy: user.name,
              validationStatus: validationStatus,
              contestReason: contestReason || null,
              satisfactionRating: satisfactionRating || null,
              lotReference: intervention.lot?.reference,
              buildingName: intervention.lot?.building?.name
            },
            relatedEntityType: 'intervention',
            relatedEntityId: intervention.id
          })
        } catch (notifError) {
          console.warn("⚠️ Could not send notification to manager:", manager.user.name, notifError)
        }
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
          priority: priority,
          title: notificationTitle,
          message: validationStatus === 'approved' ? 
            `L'intervention "${intervention.title}" a été validée par le locataire.` :
            `L'intervention "${intervention.title}" a été contestée par le locataire. Des corrections peuvent être nécessaires.`,
          metadata: {
            interventionId: intervention.id,
            interventionTitle: intervention.title,
            validationStatus: validationStatus,
            contestReason: contestReason || null
          },
          relatedEntityType: 'intervention',
          relatedEntityId: intervention.id
        })
      } catch (notifError) {
        console.warn("⚠️ Could not send notification to provider:", provider.user.name, notifError)
      }
    }

    return NextResponse.json({
      success: true,
      intervention: {
        id: updatedIntervention.id,
        status: updatedIntervention.status,
        title: updatedIntervention.title,
        tenant_validated_date: updatedIntervention.tenant_validated_date,
        tenant_satisfaction_rating: updatedIntervention.tenant_satisfaction_rating,
        updated_at: updatedIntervention.updated_at
      },
      validationStatus,
      validatedBy: {
        name: user.name,
        role: user.role
      },
      message: `Intervention ${validationStatus === 'approved' ? 'validée' : 'contestée'} avec succès`
    })

  } catch (error) {
    console.error("❌ Error in intervention-validate-tenant API:", error)
    console.error("❌ Error details:", {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack',
    })

    return NextResponse.json({
      success: false,
      error: 'Erreur lors de la validation de l\'intervention'
    }, { status: 500 })
  }
}
