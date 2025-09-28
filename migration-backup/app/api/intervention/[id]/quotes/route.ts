import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/lib/database.types'
import { userService } from '@/lib/database-service'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const interventionId = resolvedParams.id

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

    // Get current user from database
    const user = await userService.findByAuthUserId(authUser.id)
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Utilisateur non trouvé'
      }, { status: 404 })
    }

    console.log("🔍 Getting quotes for intervention:", interventionId, "by user:", user.role)

    // Get intervention details
    const { data: intervention, error: interventionError } = await supabase
      .from('interventions')
      .select(`
        id,
        title,
        description,
        status,
        team_id
      `)
      .eq('id', interventionId)
      .single()

    if (interventionError || !intervention) {
      return NextResponse.json({
        success: false,
        error: 'Intervention non trouvée'
      }, { status: 404 })
    }

    // Check permissions - only gestionnaires can view all quotes, prestataires can only view their own
    let quotesQuery = supabase
      .from('intervention_quotes')
      .select(`
        id,
        intervention_id,
        provider_id,
        labor_cost,
        materials_cost,
        total_amount,
        description,
        work_details,
        estimated_duration_hours,
        estimated_start_date,
        terms_and_conditions,
        attachments,
        status,
        submitted_at,
        reviewed_at,
        reviewed_by,
        review_comments,
        rejection_reason,
        provider:provider_id(
          id,
          name,
          email,
          phone,
          provider_category,
          speciality
        ),
        reviewer:reviewed_by(
          id,
          name
        )
      `)
      .eq('intervention_id', interventionId)
      .order('submitted_at', { ascending: false })

    // If user is prestataire, only show their own quote
    if (user.role === 'prestataire') {
      quotesQuery = quotesQuery.eq('provider_id', user.id)
    } else if (user.role === 'gestionnaire') {
      // Check if gestionnaire has access to this intervention
      const { data: assignment, error: assignmentError } = await supabase
        .from('intervention_contacts')
        .select('id')
        .eq('intervention_id', interventionId)
        .eq('user_id', user.id)
        .eq('role', 'gestionnaire')
        .single()

      if (assignmentError || !assignment) {
        // Also check if gestionnaire belongs to the same team
        if (intervention.team_id !== user.team_id) {
          return NextResponse.json({
            success: false,
            error: 'Vous n\'êtes pas autorisé à consulter les devis de cette intervention'
          }, { status: 403 })
        }
      }
    } else {
      return NextResponse.json({
        success: false,
        error: 'Seuls les gestionnaires et prestataires peuvent consulter les devis'
      }, { status: 403 })
    }

    const { data: quotes, error: quotesError } = await quotesQuery

    if (quotesError) {
      console.error('❌ Error fetching quotes:', quotesError)
      return NextResponse.json({
        success: false,
        error: 'Erreur lors de la récupération des devis'
      }, { status: 500 })
    }

    console.log(`✅ Found ${quotes?.length || 0} quotes for intervention ${interventionId}`)

    // Parse attachments JSON
    const quotesWithParsedAttachments = quotes?.map(quote => ({
      ...quote,
      attachments: typeof quote.attachments === 'string'
        ? JSON.parse(quote.attachments)
        : quote.attachments || []
    })) || []

    return NextResponse.json({
      success: true,
      quotes: quotesWithParsedAttachments,
      intervention: {
        id: intervention.id,
        title: intervention.title,
        status: intervention.status
      }
    })

  } catch (error) {
    console.error('❌ Error in intervention quotes API:', error)
    return NextResponse.json({
      success: false,
      error: 'Erreur interne du serveur'
    }, { status: 500 })
  }
}