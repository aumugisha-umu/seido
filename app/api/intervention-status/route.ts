import { NextRequest, NextResponse } from 'next/server'
import { interventionService, userService } from '@/lib/database-service'
import { notificationService } from '@/lib/notification-service'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/lib/database.types'

export async function POST(request: NextRequest) {
  console.log("🔄 intervention-status API route called")

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
    const { interventionId, status } = body

    if (!interventionId || !status) {
      return NextResponse.json({
        success: false,
        error: 'interventionId et status sont requis'
      }, { status: 400 })
    }

    console.log(`📝 Updating intervention ${interventionId} to status: ${status}`)

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
        error: 'Seuls les gestionnaires peuvent modifier le statut des interventions'
      }, { status: 403 })
    }

    // Get intervention details
    const { data: intervention, error: interventionError } = await supabase
      .from('interventions')
      .select(`
        *,
        lot:lot_id(id, reference, building:building_id(name, address, team_id)),
        team:team_id(id, name)
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

    // Check if user belongs to intervention team
    if (intervention.team_id && user.team_id !== intervention.team_id) {
      return NextResponse.json({
        success: false,
        error: 'Vous n\'êtes pas autorisé à modifier cette intervention'
      }, { status: 403 })
    }

    const oldStatus = intervention.status

    console.log(`🔄 Updating intervention status from '${oldStatus}' to '${status}'...`)

    // Update intervention status
    const updatedIntervention = await interventionService.update(interventionId, {
      status: status as Database['public']['Enums']['intervention_status'],
      updated_at: new Date().toISOString()
    })

    console.log("✅ Intervention status updated successfully")

    // Send notifications
    try {
      await notificationService.notifyInterventionStatusChanged(
        intervention,
        oldStatus,
        status,
        user.id
      )
      console.log("📧 Notifications sent")
    } catch (notifError) {
      console.warn("⚠️ Could not send notifications:", notifError)
      // Don't fail the update for notification errors
    }

    return NextResponse.json({
      success: true,
      intervention: {
        id: updatedIntervention.id,
        status: updatedIntervention.status,
        title: updatedIntervention.title,
        updated_at: updatedIntervention.updated_at
      },
      message: `Intervention mise à jour vers le statut: ${status}`
    })

  } catch (error) {
    console.error("❌ Error in intervention-status API:", error)
    console.error("❌ Error details:", {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack',
    })

    return NextResponse.json({
      success: false,
      error: 'Erreur lors de la mise à jour du statut de l\'intervention'
    }, { status: 500 })
  }
}