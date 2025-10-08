import { NextRequest, NextResponse } from 'next/server'
import { notificationService } from '@/lib/notification-service'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/lib/database.types'

export async function POST(request: NextRequest) {
  console.log("✅ intervention-schedule-accept API route called")

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
    const { interventionId } = body

    if (!interventionId) {
      return NextResponse.json({
        success: false,
        error: 'interventionId est requis'
      }, { status: 400 })
    }

    console.log("📝 Provider accepting schedule for intervention:", interventionId)

    // Get current user from database
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, role, name, email')
      .eq('auth_user_id', authUser.id)
      .single()

    if (userError || !user) {
      console.error("❌ User not found:", userError)
      return NextResponse.json({
        success: false,
        error: 'Utilisateur non trouvé'
      }, { status: 404 })
    }

    // Check if user is prestataire
    if (user.role !== 'prestataire') {
      return NextResponse.json({
        success: false,
        error: 'Seuls les prestataires peuvent accepter un planning'
      }, { status: 403 })
    }

    // Get intervention details
    const { data: intervention, error: interventionError } = await supabase
      .from('interventions')
      .select('id, title, status, scheduled_date, team_id')
      .eq('id', interventionId)
      .single()

    if (interventionError || !intervention) {
      console.error("❌ Intervention not found:", interventionError)
      return NextResponse.json({
        success: false,
        error: 'Intervention non trouvée'
      }, { status: 404 })
    }

    // Check if intervention is in planification status
    if (intervention.status !== 'planification') {
      return NextResponse.json({
        success: false,
        error: `Le planning ne peut être accepté que pour une intervention en planification (statut actuel: ${intervention.status})`
      }, { status: 400 })
    }

    // Check if user is the assigned provider
    const { data: assignedContact } = await supabase
      .from('intervention_contacts')
      .select('user_id, is_primary')
      .eq('intervention_id', interventionId)
      .eq('user_id', user.id)
      .eq('role', 'prestataire')
      .maybeSingle()

    if (!assignedContact) {
      return NextResponse.json({
        success: false,
        error: 'Vous n\'êtes pas le prestataire assigné à cette intervention'
      }, { status: 403 })
    }

    // Check if there's a scheduled date
    if (!intervention.scheduled_date) {
      return NextResponse.json({
        success: false,
        error: 'Aucune date planifiée à accepter'
      }, { status: 400 })
    }

    console.log("🔄 Updating intervention status to 'planifiee'...")

    // Update intervention status to planifiee
    const { data: updatedIntervention, error: updateError } = await supabase
      .from('interventions')
      .update({
        status: 'planifiee',
        updated_at: new Date().toISOString()
      })
      .eq('id', interventionId)
      .select('id, status, title, updated_at')
      .single()

    if (updateError || !updatedIntervention) {
      console.error("❌ Error updating intervention:", updateError)
      return NextResponse.json({
        success: false,
        error: `Erreur lors de la mise à jour de l'intervention: ${updateError?.message || 'Unknown error'}`
      }, { status: 500 })
    }

    console.log("✅ Schedule accepted successfully - intervention now planifiee")

    // Get manager from intervention_contacts for notification
    const { data: managerContact } = await supabase
      .from('intervention_contacts')
      .select('user_id')
      .eq('intervention_id', interventionId)
      .eq('role', 'gestionnaire')
      .eq('is_primary', true)
      .maybeSingle()

    // Send notification to manager
    if (managerContact?.user_id) {
      try {
        await notificationService.create({
          user_id: managerContact.user_id,
          type: 'intervention_schedule_accepted',
          title: 'Planning accepté par le prestataire',
          message: `Le prestataire a accepté le planning proposé pour l'intervention "${intervention.title}"`,
          link: `/gestionnaire/interventions/${interventionId}`,
          metadata: {
            intervention_id: interventionId,
            accepted_by: user.id,
            scheduled_date: intervention.scheduled_date
          }
        })
        console.log("📧 Manager notified of schedule acceptance")
      } catch (notifError) {
        console.warn("⚠️ Could not send notifications:", notifError)
        // Don't fail the acceptance for notification errors
      }
    } else {
      console.warn("⚠️ No primary manager found for notification")
    }

    return NextResponse.json({
      success: true,
      intervention: {
        id: updatedIntervention.id,
        status: updatedIntervention.status,
        title: updatedIntervention.title,
        updated_at: updatedIntervention.updated_at
      },
      message: 'Planning accepté avec succès'
    })

  } catch (error) {
    console.error("❌ Error in intervention-schedule-accept API:", error)
    console.error("❌ Error details:", {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack',
    })

    return NextResponse.json({
      success: false,
      error: 'Erreur lors de l\'acceptation du planning'
    }, { status: 500 })
  }
}
