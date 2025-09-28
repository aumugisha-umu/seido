import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/lib/database.types'
import { notificationService } from '@/lib/notification-service'

// TODO: Initialize services for new architecture
// Example: const userService = await createServerUserService()
// Remember to make your function async if it isn't already


export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: interventionId } = await params

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

    // Check if user is prestataire or gestionnaire
    if (user.role !== 'prestataire' && user.role !== 'gestionnaire') {
      return NextResponse.json({
        success: false,
        error: 'Seuls les prestataires et gestionnaires peuvent marquer une intervention comme terminée'
      }, { status: 403 })
    }

    // Parse request body - simplified structure
    const body = await request.json()
    const {
      workReport,
      mediaFiles
    } = body

    // Basic validation - only work report is required
    if (!workReport?.trim()) {
      return NextResponse.json({
        success: false,
        error: 'Le rapport de travaux est obligatoire'
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
    if (intervention.status !== 'en_cours') {
      return NextResponse.json({
        success: false,
        error: `Le rapport ne peut être soumis que pour les interventions en cours (statut actuel: ${intervention.status})`
      }, { status: 400 })
    }

    // Check if user is assigned to this intervention
    // For gestionnaires, we check if they are assigned to the intervention in any capacity
    // For prestataires, we check specifically for prestataire role assignment
    let assignmentQuery = supabase
      .from('intervention_contacts')
      .select('*')
      .eq('intervention_id', interventionId)
      .eq('user_id', user.id)

    if (user.role === 'prestataire') {
      assignmentQuery = assignmentQuery.eq('role', 'prestataire')
    }

    const { data: assignment, error: assignmentError } = await assignmentQuery.single()

    if (assignmentError || !assignment) {
      return NextResponse.json({
        success: false,
        error: 'Vous n\'êtes pas assigné à cette intervention'
      }, { status: 403 })
    }

    console.log(`📝 Processing simple work completion report for intervention: ${interventionId} by ${user.role}: ${user.name}`)

    // Process media files (simplified - just store references)
    const processedMediaFiles = mediaFiles || []

    // Create simplified work completion record
    const workCompletionData = {
      intervention_id: interventionId,
      provider_id: user.id,
      work_summary: workReport.trim(),
      work_details: workReport.trim(), // Use same content for both fields in simplified version
      materials_used: null,
      actual_duration_hours: 1, // Default duration of 1 hour for simplified workflow
      actual_cost: null,
      issues_encountered: null,
      recommendations: null,
      before_photos: JSON.stringify([]), // Empty for simplified version
      after_photos: JSON.stringify(processedMediaFiles), // Put all media files in after_photos
      documents: JSON.stringify([]),
      quality_assurance: JSON.stringify({
        workCompleted: true, // Automatically set to true for simplified version
        areaClean: true,
        clientInformed: true,
        warrantyGiven: true
      }),
      submitted_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Insert work completion record
    const { data: workCompletion, error: insertError } = await supabase
      .from('intervention_work_completions')
      .insert(workCompletionData)
      .select()
      .single()

    if (insertError) {
      console.error("❌ Error creating simple work completion record:", insertError)
      return NextResponse.json({
        success: false,
        error: 'Erreur lors de la sauvegarde du rapport'
      }, { status: 500 })
    }

    // Update intervention status
    const { error: updateError } = await supabase
      .from('interventions')
      .update({
        status: 'cloturee_par_prestataire',
        updated_at: new Date().toISOString()
      })
      .eq('id', interventionId)

    if (updateError) {
      console.error("❌ Error updating intervention status:", updateError)
      return NextResponse.json({
        success: false,
        error: 'Erreur lors de la mise à jour du statut'
      }, { status: 500 })
    }

    console.log("✅ Simple work completion report submitted successfully")

    // Send notifications (same as complex version)
    try {
      // Notify tenant and gestionnaires
      const { data: contacts } = await supabase
        .from('intervention_contacts')
        .select(`
          user:user_id(id, name, email, role)
        `)
        .eq('intervention_id', interventionId)
        .in('role', ['gestionnaire'])

      const tenantNotificationPromise = intervention.tenant_id ?
        notificationService.createNotification({
          userId: intervention.tenant_id,
          teamId: intervention.team_id,
          createdBy: user.id,
          type: 'intervention',
          priority: 'high',
          title: 'Travaux terminés',
          message: `Les travaux pour "${intervention.title}" sont terminés. Veuillez valider la réalisation.`,
          isPersonal: true,
          metadata: {
            interventionId: interventionId,
            interventionTitle: intervention.title,
            providerName: user.name,
            actionRequired: 'tenant_validation'
          },
          relatedEntityType: 'intervention',
          relatedEntityId: interventionId
        }) : Promise.resolve()

      const managerNotificationPromises = contacts?.map(contact =>
        notificationService.createNotification({
          userId: contact.user.id,
          teamId: intervention.team_id,
          createdBy: user.id,
          type: 'intervention',
          priority: 'normal',
          title: 'Rapport de fin de travaux reçu',
          message: `${user.name} a soumis un rapport de fin pour "${intervention.title}"`,
          isPersonal: true,
          metadata: {
            interventionId: interventionId,
            interventionTitle: intervention.title,
            providerName: user.name
          },
          relatedEntityType: 'intervention',
          relatedEntityId: interventionId
        })
      ) || []

      await Promise.all([tenantNotificationPromise, ...managerNotificationPromises])
      console.log("📧 Simple work completion notifications sent")
    } catch (notifError) {
      console.warn("⚠️ Could not send work completion notifications:", notifError)
    }

    return NextResponse.json({
      success: true,
      workCompletion: {
        id: workCompletion.id,
        intervention_id: workCompletion.intervention_id,
        submitted_at: workCompletion.submitted_at
      },
      message: 'Rapport de fin de travaux soumis avec succès'
    })

  } catch (error) {
    console.error("❌ Error in simple work completion API:", error)
    return NextResponse.json({
      success: false,
      error: 'Erreur interne du serveur'
    }, { status: 500 })
  }
}