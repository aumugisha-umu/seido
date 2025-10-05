import { NextRequest, NextResponse } from 'next/server'
import { userService } from '@/lib/database-service'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/lib/database.types'
import { logger, logError } from '@/lib/logger'

export async function GET(request: NextRequest) {
  console.log("✅ quote-requests GET API route called")

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

    // Get current user from database
    const user = await userService.findByAuthUserId(authUser.id)
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Utilisateur non trouvé'
      }, { status: 404 })
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const interventionId = searchParams.get('interventionId')
    const providerId = searchParams.get('providerId')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build base query
    let query = supabase
      .from('quote_requests_with_details')
      .select('*')

    // Apply role-based filtering
    if (user.role === 'prestataire') {
      // Providers can only see their own requests
      query = query.eq('provider_id', user.id)
    } else if (user.role === 'gestionnaire') {
      // Managers can see requests for interventions in their team
      // This is already handled by RLS but we can be explicit
      if (user.team_id) {
        // The view already joins with intervention.team_id, so this is handled by RLS
      }
    } else {
      return NextResponse.json({
        success: false,
        error: 'Type d\'utilisateur non autorisé'
      }, { status: 403 })
    }

    // Apply additional filters
    if (interventionId) {
      query = query.eq('intervention_id', interventionId)
    }

    if (providerId && user.role === 'gestionnaire') {
      query = query.eq('provider_id', providerId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    // Apply pagination and ordering
    query = query
      .order('sent_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data: quoteRequests, error: queryError } = await query

    if (queryError) {
      console.error("❌ Error fetching quote requests:", queryError)
      return NextResponse.json({
        success: false,
        error: 'Erreur lors de la récupération des demandes de devis'
      }, { status: 500 })
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('quote_requests')
      .select('id', { count: 'exact', head: true })

    // Apply same filters for count
    if (user.role === 'prestataire') {
      countQuery = countQuery.eq('provider_id', user.id)
    } else if (user.role === 'gestionnaire' && user.team_id) {
      // For count, we need to join with interventions to filter by team
      countQuery = supabase
        .from('quote_requests')
        .select(`
          id,
          intervention:intervention_id!inner(team_id)
        `, { count: 'exact', head: true })
        .eq('intervention.team_id', user.team_id)
    }

    if (interventionId) {
      countQuery = countQuery.eq('intervention_id', interventionId)
    }

    if (providerId && user.role === 'gestionnaire') {
      countQuery = countQuery.eq('provider_id', providerId)
    }

    if (status) {
      countQuery = countQuery.eq('status', status)
    }

    const { count } = await countQuery

    return NextResponse.json({
      success: true,
      quoteRequests: quoteRequests || [],
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit
      }
    })

  } catch (error) {
    console.error("❌ Error in quote-requests GET API:", error)
    return NextResponse.json({
      success: false,
      error: 'Erreur lors de la récupération des demandes de devis'
    }, { status: 500 })
  }
}
