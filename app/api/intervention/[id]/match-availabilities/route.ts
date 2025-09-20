import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/lib/database.types'
import { userService } from '@/lib/database-service'

interface UserAvailability {
  id: string
  user_id: string
  intervention_id: string
  date: string
  start_time: string
  end_time: string
  user: {
    id: string
    name: string
    role: string
  }
}

interface MatchedSlot {
  date: string
  start_time: string
  end_time: string
  participant_user_ids: string[]
  participant_names: string[]
  match_score: number
  overlap_duration: number // in minutes
}

interface PartialMatch {
  date: string
  start_time: string
  end_time: string
  available_users: Array<{
    user_id: string
    name: string
    role: string
  }>
  missing_users: Array<{
    user_id: string
    name: string
    role: string
  }>
  match_score: number
}

interface MatchingResult {
  perfectMatches: MatchedSlot[]
  partialMatches: PartialMatch[]
  suggestions: Array<{
    date: string
    reason: string
    alternatives: MatchedSlot[]
  }>
  conflicts: Array<{
    user_id: string
    user_name: string
    conflicting_slots: Array<{
      date: string
      slots: Array<{ start_time: string; end_time: string }>
    }>
  }>
  statistics: {
    total_users: number
    users_with_availabilities: number
    total_availability_slots: number
    best_match_score: number
  }
}

class AvailabilityMatcher {
  /**
   * Converts time string (HH:MM) to minutes since midnight
   */
  private timeToMinutes(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number)
    return hours * 60 + minutes
  }

  /**
   * Converts minutes since midnight back to time string (HH:MM)
   */
  private minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
  }

  /**
   * Find all overlapping time segments for a given date
   */
  private findOverlapsForDate(availabilities: UserAvailability[], targetDate: string): MatchedSlot[] {
    const dayAvailabilities = availabilities.filter(a => a.date === targetDate)

    if (dayAvailabilities.length < 2) {
      return [] // Need at least 2 users for a match
    }

    // Convert to time ranges with user info
    const timeRanges = dayAvailabilities.map(avail => ({
      start: this.timeToMinutes(avail.start_time),
      end: this.timeToMinutes(avail.end_time),
      user_id: avail.user_id,
      user_name: avail.user.name,
      user_role: avail.user.role
    }))

    // Sort by start time
    timeRanges.sort((a, b) => a.start - b.start)

    const matches: MatchedSlot[] = []

    // Find overlaps using sweep line algorithm
    for (let i = 0; i < timeRanges.length; i++) {
      for (let j = i + 1; j < timeRanges.length; j++) {
        const range1 = timeRanges[i]
        const range2 = timeRanges[j]

        // Check if there's an overlap
        const overlapStart = Math.max(range1.start, range2.start)
        const overlapEnd = Math.min(range1.end, range2.end)

        if (overlapStart < overlapEnd) {
          const overlapDuration = overlapEnd - overlapStart

          // Only consider overlaps of at least 30 minutes
          if (overlapDuration >= 30) {
            // Check if we can extend this overlap with other users
            const participatingUsers = [range1, range2]
            let extendedStart = overlapStart
            let extendedEnd = overlapEnd

            // Try to include more users in this time slot
            for (let k = 0; k < timeRanges.length; k++) {
              if (k === i || k === j) continue

              const range3 = timeRanges[k]
              const newOverlapStart = Math.max(extendedStart, range3.start)
              const newOverlapEnd = Math.min(extendedEnd, range3.end)

              if (newOverlapStart < newOverlapEnd && (newOverlapEnd - newOverlapStart) >= 30) {
                participatingUsers.push(range3)
                extendedStart = newOverlapStart
                extendedEnd = newOverlapEnd
              }
            }

            // Calculate match score (percentage of required participants available)
            const totalUsers = new Set(dayAvailabilities.map(a => a.user_id)).size
            const matchScore = Math.round((participatingUsers.length / totalUsers) * 100)

            matches.push({
              date: targetDate,
              start_time: this.minutesToTime(extendedStart),
              end_time: this.minutesToTime(extendedEnd),
              participant_user_ids: participatingUsers.map(u => u.user_id),
              participant_names: participatingUsers.map(u => u.user_name),
              match_score: matchScore,
              overlap_duration: extendedEnd - extendedStart
            })
          }
        }
      }
    }

    // Remove duplicates and sort by match score
    const uniqueMatches = matches.filter((match, index, self) =>
      index === self.findIndex(m =>
        m.date === match.date &&
        m.start_time === match.start_time &&
        m.end_time === match.end_time &&
        m.participant_user_ids.length === match.participant_user_ids.length &&
        m.participant_user_ids.every(id => match.participant_user_ids.includes(id))
      )
    )

    return uniqueMatches.sort((a, b) => b.match_score - a.match_score || b.overlap_duration - a.overlap_duration)
  }

  /**
   * Main matching function
   */
  public findMatches(availabilities: UserAvailability[]): MatchingResult {
    if (availabilities.length === 0) {
      return {
        perfectMatches: [],
        partialMatches: [],
        suggestions: [],
        conflicts: [],
        statistics: {
          total_users: 0,
          users_with_availabilities: 0,
          total_availability_slots: 0,
          best_match_score: 0
        }
      }
    }

    // Get all unique dates
    const uniqueDates = [...new Set(availabilities.map(a => a.date))].sort()

    // Get all unique users
    const allUsers = new Map()
    availabilities.forEach(a => {
      if (!allUsers.has(a.user_id)) {
        allUsers.set(a.user_id, {
          id: a.user_id,
          name: a.user.name,
          role: a.user.role
        })
      }
    })

    const allMatches: MatchedSlot[] = []
    const partialMatches: PartialMatch[] = []

    // Find matches for each date
    for (const date of uniqueDates) {
      const dayMatches = this.findOverlapsForDate(availabilities, date)
      allMatches.push(...dayMatches)

      // Create partial matches for dates where not everyone is available
      const dayAvailabilities = availabilities.filter(a => a.date === date)
      const usersWithAvailability = new Set(dayAvailabilities.map(a => a.user_id))
      const usersWithoutAvailability = Array.from(allUsers.values()).filter(u => !usersWithAvailability.has(u.id))

      if (usersWithoutAvailability.length > 0 && dayMatches.length > 0) {
        // Take the best match of the day and mark it as partial
        const bestMatch = dayMatches[0]
        partialMatches.push({
          date: date,
          start_time: bestMatch.start_time,
          end_time: bestMatch.end_time,
          available_users: bestMatch.participant_user_ids.map(id => {
            const user = allUsers.get(id)
            return { user_id: id, name: user.name, role: user.role }
          }),
          missing_users: usersWithoutAvailability,
          match_score: bestMatch.match_score
        })
      }
    }

    // Separate perfect matches (100% score) from partial matches
    const perfectMatches = allMatches.filter(m => m.match_score === 100)
    const imperfectMatches = allMatches.filter(m => m.match_score < 100)

    // Generate suggestions
    const suggestions = []
    if (perfectMatches.length === 0 && imperfectMatches.length > 0) {
      suggestions.push({
        date: imperfectMatches[0].date,
        reason: "Aucun créneau parfait trouvé, mais des créneaux partiels sont disponibles",
        alternatives: imperfectMatches.slice(0, 3) // Top 3 alternatives
      })
    }

    // Detect conflicts (overlapping slots for same user)
    const conflicts = []
    for (const [userId, user] of allUsers.entries()) {
      const userAvails = availabilities.filter(a => a.user_id === userId)
      const conflictingSlots = new Map()

      for (const avail of userAvails) {
        const date = avail.date
        if (!conflictingSlots.has(date)) {
          conflictingSlots.set(date, [])
        }
        conflictingSlots.get(date).push({
          start_time: avail.start_time,
          end_time: avail.end_time
        })
      }

      // Check for overlaps within same date
      for (const [date, slots] of conflictingSlots.entries()) {
        if (slots.length > 1) {
          // Check for overlapping slots
          const hasOverlap = slots.some((slot1, i) =>
            slots.some((slot2, j) => {
              if (i >= j) return false
              const start1 = this.timeToMinutes(slot1.start_time)
              const end1 = this.timeToMinutes(slot1.end_time)
              const start2 = this.timeToMinutes(slot2.start_time)
              const end2 = this.timeToMinutes(slot2.end_time)
              return start1 < end2 && start2 < end1
            })
          )

          if (hasOverlap) {
            conflicts.push({
              user_id: userId,
              user_name: user.name,
              conflicting_slots: [{ date, slots }]
            })
          }
        }
      }
    }

    const statistics = {
      total_users: allUsers.size,
      users_with_availabilities: new Set(availabilities.map(a => a.user_id)).size,
      total_availability_slots: availabilities.length,
      best_match_score: allMatches.length > 0 ? Math.max(...allMatches.map(m => m.match_score)) : 0
    }

    return {
      perfectMatches: perfectMatches.slice(0, 10), // Limit to top 10
      partialMatches: partialMatches.slice(0, 10),
      suggestions,
      conflicts,
      statistics
    }
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log("🔍 POST match-availabilities API called for intervention:", params.id)

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

    // Verify user has access to this intervention and is a gestionnaire
    const { data: intervention, error: interventionError } = await supabase
      .from('interventions')
      .select(`
        id,
        status,
        tenant_id,
        team_id,
        intervention_contacts(user_id)
      `)
      .eq('id', interventionId)
      .single()

    if (interventionError || !intervention) {
      return NextResponse.json({
        success: false,
        error: 'Intervention non trouvée'
      }, { status: 404 })
    }

    // Check if user has permission to run matching (gestionnaire or assigned)
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
    const { data: availabilities, error: availError } = await supabase
      .from('user_availabilities')
      .select(`
        *,
        user:user_id(id, name, role)
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

    if (!availabilities || availabilities.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Aucune disponibilité trouvée pour cette intervention',
        result: {
          perfectMatches: [],
          partialMatches: [],
          suggestions: [{
            date: new Date().toISOString().split('T')[0],
            reason: "Aucune disponibilité saisie",
            alternatives: []
          }],
          conflicts: [],
          statistics: {
            total_users: 0,
            users_with_availabilities: 0,
            total_availability_slots: 0,
            best_match_score: 0
          }
        }
      })
    }

    console.log(`📊 Running matching algorithm on ${availabilities.length} availability slots`)

    // Run the matching algorithm
    const matcher = new AvailabilityMatcher()
    const matchingResult = matcher.findMatches(availabilities)

    // Save the best matches to the database for persistence
    if (matchingResult.perfectMatches.length > 0 || matchingResult.partialMatches.length > 0) {
      const matchesToSave = []

      // Save perfect matches
      for (const match of matchingResult.perfectMatches.slice(0, 5)) { // Top 5
        matchesToSave.push({
          intervention_id: interventionId,
          matched_date: match.date,
          matched_start_time: match.start_time,
          matched_end_time: match.end_time,
          participant_user_ids: match.participant_user_ids,
          match_score: match.match_score,
          overlap_duration: match.overlap_duration
        })
      }

      // Save best partial matches
      for (const match of matchingResult.partialMatches.slice(0, 3)) { // Top 3
        matchesToSave.push({
          intervention_id: interventionId,
          matched_date: match.date,
          matched_start_time: match.start_time,
          matched_end_time: match.end_time,
          participant_user_ids: match.available_users.map(u => u.user_id),
          match_score: match.match_score,
          overlap_duration: 60 // Default duration for partial matches
        })
      }

      if (matchesToSave.length > 0) {
        // Clear existing matches for this intervention
        await supabase
          .from('availability_matches')
          .delete()
          .eq('intervention_id', interventionId)

        // Insert new matches
        const { error: insertError } = await supabase
          .from('availability_matches')
          .insert(matchesToSave)

        if (insertError) {
          console.warn("⚠️ Could not save matches to database:", insertError)
          // Don't fail the API call, just warn
        } else {
          console.log(`✅ Saved ${matchesToSave.length} matches to database`)
        }
      }
    }

    console.log(`✅ Matching completed: ${matchingResult.perfectMatches.length} perfect, ${matchingResult.partialMatches.length} partial`)

    return NextResponse.json({
      success: true,
      message: 'Matching des disponibilités terminé',
      result: matchingResult
    })

  } catch (error) {
    console.error("❌ Error in match-availabilities API:", error)
    return NextResponse.json({
      success: false,
      error: 'Erreur serveur lors du matching des disponibilités'
    }, { status: 500 })
  }
}