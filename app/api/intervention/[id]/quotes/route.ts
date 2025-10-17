import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/lib/database.types'
import { logger, logError } from '@/lib/logger'
import { createServerUserService } from '@/lib/services'


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

    // Initialize user service
    const userService = await createServerUserService()

    // Get current user from database
    const userResult = await userService.findByAuthUserId(authUser.id)
    const user = userResult?.data ?? null
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Utilisateur non trouvé'
      }, { status: 404 })
    }

    logger.info({ interventionId, userRole: user.role }, "🔍 Getting quotes for intervention")

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
    // Pour l'éligibilité, on a besoin uniquement de : provider_id (identifier le prestataire) et status (vérifier si pending/sent/accepted)
    let quotesQuery = supabase
      .from('intervention_quotes')
      .select('id, provider_id, status')
      .eq('intervention_id', interventionId)

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
      logger.error({ error: quotesError }, '❌ Error fetching quotes:')
      return NextResponse.json({
        success: false,
        error: 'Erreur lors de la récupération des devis'
      }, { status: 500 })
    }

    logger.info({ quotesCount: quotes?.length || 0, interventionId }, "✅ Found quotes for intervention")

    return NextResponse.json({
      success: true,
      quotes: quotes || []
    })

  } catch (error) {
    logger.error({ error: error }, '❌ Error in intervention quotes API:')
    return NextResponse.json({
      success: false,
      error: 'Erreur interne du serveur'
    }, { status: 500 })
  }
}