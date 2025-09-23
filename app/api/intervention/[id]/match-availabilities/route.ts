import { NextRequest, NextResponse } from 'next/server'
import { userService } from '@/lib/database-service'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/lib/database.types'

interface RouteParams {
  params: {
    id: string
  }
}

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
  startTime: string
  endTime: string
  participants: string[]
  overlapDuration: number
  score: number
}

interface MatchingResult {
  success: boolean
  perfectMatch?: MatchedSlot
  partialMatches: MatchedSlot[]
  suggestions: MatchedSlot[]
  message: string
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const resolvedParams = await params
  console.log("🔄 match-availabilities API route called for intervention:", resolvedParams.id)

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

    // Get all availabilities for this intervention
    const { data: allAvailabilities, error: availError } = await supabase
      .from('user_availabilities')
      .select(`
        *,
        user:user_id(id, name, role)
      `)
      .eq('intervention_id', resolvedParams.id)
      .order('date', { ascending: true })
      .order('start_time', { ascending: true })

    if (availError) {
      console.error("❌ Error fetching availabilities:", availError)
      return NextResponse.json({
        success: false,
        error: 'Erreur lors de la récupération des disponibilités'
      }, { status: 500 })
    }

    if (!allAvailabilities || allAvailabilities.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Aucune disponibilité trouvée pour cette intervention'
      })
    }

    console.log("📅 Processing availabilities:", allAvailabilities.length)

    // Group availabilities by user role
    const tenantAvailabilities = allAvailabilities.filter(avail => avail.user.role === 'locataire')
    const providerAvailabilities = allAvailabilities.filter(avail => avail.user.role === 'prestataire')

    if (tenantAvailabilities.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Aucune disponibilité locataire trouvée'
      })
    }

    if (providerAvailabilities.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Aucune disponibilité prestataire trouvée'
      })
    }

    console.log("🏠 Tenant availabilities:", tenantAvailabilities.length)
    console.log("🔧 Provider availabilities:", providerAvailabilities.length)

    // Perform matching algorithm
    const matchingResult = performAvailabilityMatching(tenantAvailabilities, providerAvailabilities)

    // Save the best matches to database for future reference
    if (matchingResult.perfectMatch || matchingResult.partialMatches.length > 0) {
      try {
        const matchesToSave = []

        if (matchingResult.perfectMatch) {
          matchesToSave.push({
            intervention_id: resolvedParams.id,
            matched_date: matchingResult.perfectMatch.date,
            matched_start_time: matchingResult.perfectMatch.startTime,
            matched_end_time: matchingResult.perfectMatch.endTime,
            participant_user_ids: matchingResult.perfectMatch.participants,
            match_score: matchingResult.perfectMatch.score,
            overlap_duration: matchingResult.perfectMatch.overlapDuration
          })
        }

        // Save top 3 partial matches as alternatives
        matchingResult.partialMatches.slice(0, 3).forEach(match => {
          matchesToSave.push({
            intervention_id: resolvedParams.id,
            matched_date: match.date,
            matched_start_time: match.startTime,
            matched_end_time: match.endTime,
            participant_user_ids: match.participants,
            match_score: match.score,
            overlap_duration: match.overlapDuration
          })
        })

        if (matchesToSave.length > 0) {
          // Clear previous matches for this intervention
          await supabase
            .from('availability_matches')
            .delete()
            .eq('intervention_id', resolvedParams.id)

          // Insert new matches
          const { error: saveError } = await supabase
            .from('availability_matches')
            .insert(matchesToSave)

          if (saveError) {
            console.warn("⚠️ Could not save matches to database:", saveError)
          } else {
            console.log("✅ Saved", matchesToSave.length, "matches to database")
          }
        }
      } catch (saveError) {
        console.warn("⚠️ Error saving matches:", saveError)
        // Don't fail the whole operation for this
      }
    }

    return NextResponse.json(matchingResult)

  } catch (error) {
    console.error("❌ Error in match-availabilities API:", error)
    console.error("❌ Error details:", {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack',
    })

    return NextResponse.json({
      success: false,
      error: 'Erreur lors du calcul des créneaux compatibles'
    }, { status: 500 })
  }
}

function performAvailabilityMatching(
  tenantAvailabilities: UserAvailability[],
  providerAvailabilities: UserAvailability[]
): MatchingResult {
  const matches: MatchedSlot[] = []

  console.log("🔍 Starting availability matching algorithm...")

  // For each tenant availability, find overlapping provider availabilities
  for (const tenantAvail of tenantAvailabilities) {
    for (const providerAvail of providerAvailabilities) {
      // Same date required
      if (tenantAvail.date !== providerAvail.date) continue

      const overlap = calculateTimeOverlap(
        tenantAvail.start_time,
        tenantAvail.end_time,
        providerAvail.start_time,
        providerAvail.end_time
      )

      if (overlap.duration > 0) {
        const score = calculateMatchScore(overlap.duration, tenantAvail.date)

        matches.push({
          date: tenantAvail.date,
          startTime: overlap.startTime,
          endTime: overlap.endTime,
          participants: [tenantAvail.user_id, providerAvail.user_id],
          overlapDuration: overlap.duration,
          score: score
        })

        console.log(`✨ Found overlap on ${tenantAvail.date}: ${overlap.duration} minutes (score: ${score})`)
      }
    }
  }

  // Sort matches by score (highest first)
  matches.sort((a, b) => b.score - a.score)

  // Determine result
  const perfectMatch = matches.find(match => match.score >= 85 && match.overlapDuration >= 120) // 2+ hours with high score
  const partialMatches = matches.filter(match => match.score >= 60 && match.overlapDuration >= 60) // 1+ hour with decent score
  const suggestions = matches.filter(match => match.overlapDuration >= 30) // Any 30+ minute overlap

  let message = ''
  if (perfectMatch) {
    message = `Créneau optimal trouvé le ${formatDate(perfectMatch.date)} de ${perfectMatch.startTime} à ${perfectMatch.endTime} (${perfectMatch.overlapDuration} minutes)`
  } else if (partialMatches.length > 0) {
    message = `${partialMatches.length} créneaux compatibles trouvés, validation manuelle recommandée`
  } else if (suggestions.length > 0) {
    message = `${suggestions.length} créneaux courts disponibles, négociation nécessaire`
  } else {
    message = 'Aucun créneau compatible trouvé, veuillez ajuster vos disponibilités'
  }

  console.log("📊 Matching results:", {
    perfectMatch: !!perfectMatch,
    partialMatches: partialMatches.length,
    suggestions: suggestions.length,
    totalMatches: matches.length
  })

  return {
    success: matches.length > 0,
    perfectMatch,
    partialMatches: partialMatches.slice(0, 5), // Top 5 partial matches
    suggestions: suggestions.slice(0, 10), // Top 10 suggestions
    message
  }
}

function calculateTimeOverlap(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): { startTime: string; endTime: string; duration: number } {
  // Convert times to minutes for easier calculation
  const start1Minutes = timeToMinutes(start1)
  const end1Minutes = timeToMinutes(end1)
  const start2Minutes = timeToMinutes(start2)
  const end2Minutes = timeToMinutes(end2)

  // Calculate overlap
  const overlapStart = Math.max(start1Minutes, start2Minutes)
  const overlapEnd = Math.min(end1Minutes, end2Minutes)
  const duration = Math.max(0, overlapEnd - overlapStart)

  return {
    startTime: minutesToTime(overlapStart),
    endTime: minutesToTime(overlapEnd),
    duration
  }
}

function calculateMatchScore(overlapDuration: number, date: string): number {
  let score = 0

  // Base score from duration (0-60 points)
  if (overlapDuration >= 240) score += 60      // 4+ hours: excellent
  else if (overlapDuration >= 180) score += 50 // 3+ hours: very good
  else if (overlapDuration >= 120) score += 40 // 2+ hours: good
  else if (overlapDuration >= 60) score += 25  // 1+ hour: acceptable
  else score += 10                             // <1 hour: minimal

  // Date proximity bonus (0-25 points)
  const daysDiff = Math.abs(new Date(date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  if (daysDiff <= 7) score += 25       // Within week: urgent
  else if (daysDiff <= 14) score += 20 // Within 2 weeks: soon
  else if (daysDiff <= 30) score += 15 // Within month: normal
  else score += 5                      // Later: low priority

  // Time of day preference (0-15 points) - simplified
  // Note: This is a basic scoring, could be enhanced with actual start time from availability
  const dateObj = new Date(date)
  const hour = dateObj.getHours() || 10 // Default to 10am if no time info
  if (hour >= 9 && hour <= 17) score += 15  // Business hours
  else if (hour >= 8 && hour <= 18) score += 10  // Extended hours
  else score += 5  // Early/late hours

  return Math.min(100, score) // Cap at 100
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  })
}