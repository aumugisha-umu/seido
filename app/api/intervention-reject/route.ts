import { NextRequest, NextResponse } from 'next/server'
import { interventionService, userService, notificationService } from '@/lib/database-service'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/lib/database.types'

export async function POST(request: NextRequest) {
  console.log("❌ intervention-reject API route called")
  
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
      rejectionReason,
      internalComment
    } = body

    if (!interventionId || !rejectionReason) {
      return NextResponse.json({
        success: false,
        error: 'interventionId et rejectionReason sont requis'
      }, { status: 400 })
    }

    console.log("📝 Rejecting intervention:", interventionId, "Reason:", rejectionReason)

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
        error: 'Seuls les gestionnaires peuvent rejeter les interventions'
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

    // Check if intervention can be rejected
    if (intervention.status !== 'demande') {
      return NextResponse.json({
        success: false,
        error: `L'intervention ne peut pas être rejetée (statut actuel: ${intervention.status})`
      }, { status: 400 })
    }

    // Check if user belongs to intervention team
    if (intervention.team_id && user.team_id !== intervention.team_id) {
      return NextResponse.json({
        success: false,
        error: 'Vous n\'êtes pas autorisé à modifier cette intervention'
      }, { status: 403 })
    }

    console.log("🔄 Updating intervention status to 'rejetee'...")

    // Build manager comment with rejection reason and internal comment
    const managerCommentParts = [`REJETÉ: ${rejectionReason}`]
    if (internalComment) {
      managerCommentParts.push(`Note interne: ${internalComment}`)
    }
    const fullManagerComment = managerCommentParts.join(' | ')

    // Update intervention status and add rejection reason
    const updatedIntervention = await interventionService.update(interventionId, {
      status: 'rejetee' as Database['public']['Enums']['intervention_status'],
      manager_comment: fullManagerComment,
      updated_at: new Date().toISOString()
    })

    console.log("❌ Intervention rejected successfully")

    // Send notifications with proper logic (personal/team)
    try {
      await notificationService.notifyInterventionStatusChanged(
        intervention, 
        'demande', 
        'rejetee', 
        user.id,
        rejectionReason // Pass the rejection reason
      )
      console.log("📧 Rejection notifications sent with proper logic")
    } catch (notifError) {
      console.warn("⚠️ Could not send notifications:", notifError)
      // Don't fail the rejection for notification errors
    }

    return NextResponse.json({
      success: true,
      intervention: {
        id: updatedIntervention.id,
        status: updatedIntervention.status,
        title: updatedIntervention.title,
        updated_at: updatedIntervention.updated_at,
        rejectionReason: rejectionReason
      },
      message: 'Intervention rejetée avec succès'
    })

  } catch (error) {
    console.error("❌ Error in intervention-reject API:", error)
    console.error("❌ Error details:", {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack',
    })

    return NextResponse.json({
      success: false,
      error: 'Erreur lors du rejet de l\'intervention'
    }, { status: 500 })
  }
}
