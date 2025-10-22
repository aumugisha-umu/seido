import { NextRequest, NextResponse } from 'next/server'
import { Database } from '@/lib/database.types'
import { logger, logError } from '@/lib/logger'
import { getApiAuthContext } from '@/lib/api-auth-helper'
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  logger.info({ id: id }, "📅 GET availabilities API called for intervention:")

  try {
    // ✅ AUTH: 45 lignes → 3 lignes! (any authenticated user)
    const authResult = await getApiAuthContext()
    if (!authResult.success) return authResult.error

    const { supabase, userProfile: user } = authResult.data

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Utilisateur non trouvé'
      }, { status: 404 })
    }

    const interventionId = id

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
       intervention_assignments(
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
      logger.error({ error: availError }, "❌ Error fetching availabilities:")
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
      logger.warn({ error: timeSlotsError }, "⚠️ Error fetching time slots:")
    }

    // Get existing matches (résultats du matching automatique)
    const { data: matches, error: matchesError } = await supabase
      .from('availability_matches')
      .select('*')
      .eq('intervention_id', interventionId)
      .order('match_score', { ascending: false })

    if (matchesError) {
      logger.warn({ error: matchesError }, "⚠️ Error fetching matches:")
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

    logger.info({ stats: stats.total_availability_slots, stats: stats.participants_with_availabilities }, "✅ Retrieved availabilities: slots from users")

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
        nextAction: stats.is_scheduled
          ? 'intervention_scheduled'
          : 'need_more_availabilities'
      }
    })

  } catch (error) {
    logger.error({ error: error }, "❌ Error in availabilities GET API:")
    return NextResponse.json({
      success: false,
      error: 'Erreur serveur lors de la récupération des disponibilités'
    }, { status: 500 })
  }
}