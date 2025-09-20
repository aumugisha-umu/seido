import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/lib/database.types'
import { userService } from '@/lib/database-service'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log("📅 GET availabilities API called for intervention:", params.id)

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

    // Get user data from database
    const user = await userService.findByAuthUserId(authUser.id)
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Utilisateur non trouvé'
      }, { status: 404 })
    }

    const interventionId = params.id

    // Verify intervention exists and user has access
    const { data: intervention, error: interventionError } = await supabase
      .from('interventions')
      .select(`
        id,
        title,
        status,
        tenant_id,
        team_id,
        scheduled_date,
        intervention_contacts(
          user_id,
          role,
          user:user_id(id, name, role)
        )
      `)
      .eq('id', interventionId)
      .single()

    if (interventionError || !intervention) {
      return NextResponse.json({
        success: false,
        error: 'Intervention non trouvée'
      }, { status: 404 })
    }

    // Check if user has access to this intervention
    const hasAccess = (
      intervention.tenant_id === user.id ||
      intervention.intervention_contacts.some(ic => ic.user_id === user.id) ||
      user.role === 'gestionnaire'
    )

    if (!hasAccess) {
      return NextResponse.json({
        success: false,
        error: 'Accès non autorisé à cette intervention'
      }, { status: 403 })
    }

    // Get all availabilities for this intervention
    const { data: allAvailabilities, error: availError } = await supabase
      .from('user_availabilities')
      .select(`
        id,
        user_id,
        date,
        start_time,
        end_time,
        created_at,
        updated_at,
        user:user_id(
          id,
          name,
          role,
          provider_category
        )
      `)
      .eq('intervention_id', interventionId)
      .order('date', { ascending: true })

    if (availError) {
      console.error("❌ Error fetching availabilities:", availError)
      return NextResponse.json({
        success: false,
        error: 'Erreur lors de la récupération des disponibilités'
      }, { status: 500 })
    }

    // Get existing time slots (créneaux proposés par gestionnaire)
    const { data: timeSlots, error: timeSlotsError } = await supabase
      .from('intervention_time_slots')
      .select('*')
      .eq('intervention_id', interventionId)
      .order('slot_date', { ascending: true })

    if (timeSlotsError) {
      console.warn("⚠️ Error fetching time slots:", timeSlotsError)
    }

    // Get existing matches (résultats du matching automatique)
    const { data: matches, error: matchesError } = await supabase
      .from('availability_matches')
      .select('*')
      .eq('intervention_id', interventionId)
      .order('match_score', { ascending: false })

    if (matchesError) {
      console.warn("⚠️ Error fetching matches:", matchesError)
    }

    // Group availabilities by user
    const availabilitiesByUser = new Map()
    const userSummary = new Map()

    for (const avail of (allAvailabilities || [])) {
      const userId = avail.user_id

      if (!availabilitiesByUser.has(userId)) {
        availabilitiesByUser.set(userId, [])
        userSummary.set(userId, {
          user_id: userId,
          name: avail.user.name,
          role: avail.user.role,
          provider_category: avail.user.provider_category,
          total_slots: 0,
          date_range: { start: null, end: null }
        })
      }

      availabilitiesByUser.get(userId).push({
        id: avail.id,
        date: avail.date,
        start_time: avail.start_time,
        end_time: avail.end_time,
        created_at: avail.created_at,
        updated_at: avail.updated_at
      })

      // Update summary
      const summary = userSummary.get(userId)
      summary.total_slots++

      if (!summary.date_range.start || avail.date < summary.date_range.start) {
        summary.date_range.start = avail.date
      }
      if (!summary.date_range.end || avail.date > summary.date_range.end) {
        summary.date_range.end = avail.date
      }
    }

    // Convert to arrays for response
    const userAvailabilities = Array.from(availabilitiesByUser.entries()).map(([userId, slots]) => ({
      user: userSummary.get(userId),
      availabilities: slots
    }))

    // Get current user's availabilities
    const currentUserAvailabilities = (allAvailabilities || [])
      .filter(avail => avail.user_id === user.id)
      .map(avail => ({
        id: avail.id,
        date: avail.date,
        start_time: avail.start_time,
        end_time: avail.end_time,
        created_at: avail.created_at,
        updated_at: avail.updated_at
      }))

    // Calculate statistics
    const stats = {
      total_participants: intervention.intervention_contacts.length + (intervention.tenant_id ? 1 : 0),
      participants_with_availabilities: userSummary.size,
      total_availability_slots: allAvailabilities?.length || 0,
      total_time_slots: timeSlots?.length || 0,
      total_matches: matches?.length || 0,
      best_match_score: matches && matches.length > 0 ? matches[0].match_score : 0,
      intervention_status: intervention.status,
      is_scheduled: !!intervention.scheduled_date
    }

    // Check if matching is recommended
    const shouldRunMatching = (
      stats.participants_with_availabilities >= 2 &&
      stats.total_availability_slots >= 2 &&
      !stats.is_scheduled &&
      ['planification', 'approuvee'].includes(intervention.status)
    )

    console.log(`✅ Retrieved availabilities: ${stats.total_availability_slots} slots from ${stats.participants_with_availabilities} users`)

    return NextResponse.json({
      success: true,
      intervention: {
        id: intervention.id,
        title: intervention.title,
        status: intervention.status,
        scheduled_date: intervention.scheduled_date
      },
      userAvailabilities: currentUserAvailabilities,
      allParticipantAvailabilities: userAvailabilities,
      timeSlots: timeSlots || [],
      matches: matches || [],
      statistics: stats,
      recommendations: {
        shouldRunMatching,
        canSelectSlot: stats.total_matches > 0 || stats.total_time_slots > 0,
        nextAction: shouldRunMatching
          ? 'run_matching'
          : stats.is_scheduled
            ? 'intervention_scheduled'
            : 'need_more_availabilities'
      }
    })

  } catch (error) {
    console.error("❌ Error in availabilities GET API:", error)
    return NextResponse.json({
      success: false,
      error: 'Erreur serveur lors de la récupération des disponibilités'
    }, { status: 500 })
  }
}