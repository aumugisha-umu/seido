import { NextRequest, NextResponse } from 'next/server'
import { Database } from '@/lib/database.types'
import { logger, logError } from '@/lib/logger'
import { getApiAuthContext } from '@/lib/api-auth-helper'
import { userAvailabilitySchema, validateRequest, formatZodErrors } from '@/lib/validation/schemas'


export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params
  logger.info({ user: resolvedParams.id }, "📅 POST user-availability API called for intervention:")

  try {
    // ✅ AUTH: 45 lignes → 3 lignes! (any authenticated user) + BUG FIX: userService was undefined!
    const authResult = await getApiAuthContext()
    if (!authResult.success) return authResult.error

    const { supabase, userProfile: user } = authResult.data

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Utilisateur non trouvé'
      }, { status: 404 })
    }

    // Parse request body
    const body = await request.json()

    // Transform old format to schema format
    const availabilities = body.availabilities || []
    const transformedSlots = availabilities.map((avail: any) => ({
      start: avail.date && avail.startTime ? `${avail.date}T${avail.startTime}:00.000Z` : '',
      end: avail.date && avail.endTime ? `${avail.date}T${avail.endTime}:00.000Z` : ''
    }))

    // ✅ ZOD VALIDATION
    const validation = validateRequest(userAvailabilitySchema, { slots: transformedSlots })
    if (!validation.success) {
      logger.warn({ errors: formatZodErrors(validation.errors) }, '⚠️ [USER-AVAILABILITY] Validation failed')
      return NextResponse.json({
        success: false,
        error: 'Données invalides',
        details: formatZodErrors(validation.errors)
      }, { status: 400 })
    }

    const validatedData = validation.data

    const interventionId = resolvedParams.id

    // Validate intervention exists and user has access
    const { data: intervention, error: interventionError } = await supabase
      .from('interventions')
      .select(`
        id,
        status,
        tenant_id,
        team_id,
       intervention_assignments!inner(user_id)
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
      intervention.tenant_id === user.id || // User is the tenant
      intervention.intervention_contacts.some(ic => ic.user_id === user.id) || // User is assigned
      user.role === 'gestionnaire' // User is a manager (will be checked with team access later)
    )

    if (!hasAccess) {
      return NextResponse.json({
        success: false,
        error: 'Accès non autorisé à cette intervention'
      }, { status: 403 })
    }

    // Validate availability data
    const validatedAvailabilities = []
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Start of today

    for (const avail of availabilities) {
      const { date, startTime, endTime } = avail

      // Validate required fields
      if (!date || !startTime || !endTime) {
        return NextResponse.json({
          success: false,
          error: 'Champs requis manquants (date, startTime, endTime)'
        }, { status: 400 })
      }

      // Validate date format and not in the past
      const availDate = new Date(date)
      if (isNaN(availDate.getTime()) || availDate < today) {
        return NextResponse.json({
          success: false,
          error: `Date invalide ou dans le passé: ${date}`
        }, { status: 400 })
      }

      // Validate time format and logic
      const [startHour, startMin] = startTime.split(':').map(Number)
      const [endHour, endMin] = endTime.split(':').map(Number)

      if (
        isNaN(startHour) || isNaN(startMin) || isNaN(endHour) || isNaN(endMin) ||
        startHour < 0 || startHour > 23 || endHour < 0 || endHour > 23 ||
        startMin < 0 || startMin > 59 || endMin < 0 || endMin > 59
      ) {
        return NextResponse.json({
          success: false,
          error: `Format d'heure invalide: ${startTime} - ${endTime}`
        }, { status: 400 })
      }

      if (startHour > endHour || (startHour === endHour && startMin >= endMin)) {
        return NextResponse.json({
          success: false,
          error: `L'heure de fin doit être après l'heure de début: ${startTime} - ${endTime}`
        }, { status: 400 })
      }

      // Validate not too far in the future (6 months max)
      const sixMonthsFromNow = new Date()
      sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6)
      if (availDate > sixMonthsFromNow) {
        return NextResponse.json({
          success: false,
          error: `Date trop éloignée dans le futur (max 6 mois): ${date}`
        }, { status: 400 })
      }

      validatedAvailabilities.push({
        user_id: user.id,
        intervention_id: interventionId,
        date: date,
        start_time: startTime,
        end_time: endTime
      })
    }

    logger.info({ validatedAvailabilities: validatedAvailabilities.length, user: user.id }, "📝 Validated availabilities for user")

    // Delete existing availabilities for this user and intervention
    const { error: deleteError } = await supabase
      .from('user_availabilities')
      .delete()
      .eq('user_id', user.id)
      .eq('intervention_id', interventionId)

    if (deleteError) {
      logger.error({ error: deleteError }, "❌ Error deleting existing availabilities:")
      return NextResponse.json({
        success: false,
        error: 'Erreur lors de la suppression des anciennes disponibilités'
      }, { status: 500 })
    }

    // Insert new availabilities
    if (validatedAvailabilities.length > 0) {
      const { data: insertedAvailabilities, error: insertError } = await supabase
        .from('user_availabilities')
        .insert(validatedAvailabilities)
        .select()

      if (insertError) {
        logger.error({ error: insertError }, "❌ Error inserting availabilities:")
        return NextResponse.json({
          success: false,
          error: 'Erreur lors de la sauvegarde des disponibilités'
        }, { status: 500 })
      }

      logger.info({ insertedAvailabilities: insertedAvailabilities.length }, "✅ Successfully saved availabilities")

      return NextResponse.json({
        success: true,
        message: `${insertedAvailabilities.length} disponibilités sauvegardées`,
        availabilities: insertedAvailabilities
      })
    } else {
      logger.info({}, "✅ Successfully cleared all availabilities (empty array provided)")

      return NextResponse.json({
        success: true,
        message: 'Disponibilités supprimées',
        availabilities: []
      })
    }

  } catch (error) {
    logger.error({ error: error }, "❌ Error in user-availability POST API:")
    return NextResponse.json({
      success: false,
      error: 'Erreur serveur lors de la sauvegarde des disponibilités'
    }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params
  logger.info({ user: resolvedParams.id }, "📅 GET user-availability API called for intervention:")

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

    const interventionId = resolvedParams.id

    // Get user's own availabilities for this intervention
    const { data: userAvailabilities, error: userAvailError } = await supabase
      .from('user_availabilities')
      .select('*')
      .eq('user_id', user.id)
      .eq('intervention_id', interventionId)
      .order('date', { ascending: true })

    if (userAvailError) {
      logger.error({ error: userAvailError }, "❌ Error fetching user availabilities:")
      return NextResponse.json({
        success: false,
        error: 'Erreur lors de la récupération des disponibilités'
      }, { status: 500 })
    }

    // Check if user can see other participants' availabilities (gestionnaire or assigned)
    let allAvailabilities = []

    // Verify user has access to this intervention
    const { data: intervention, error: interventionError } = await supabase
      .from('interventions')
      .select(`
        id,
        tenant_id,
        team_id,
       intervention_assignments(user_id)
      `)
      .eq('id', interventionId)
      .single()

    if (!interventionError && intervention) {
      const hasAccess = (
        intervention.tenant_id === user.id ||
        intervention.intervention_contacts.some(ic => ic.user_id === user.id) ||
        user.role === 'gestionnaire'
      )

      if (hasAccess) {
        // Get all availabilities for this intervention (for matching purposes)
        const { data: allUserAvailabilities, error: allAvailError } = await supabase
          .from('user_availabilities')
          .select(`
            *,
            user:user_id(id, name, role)
          `)
          .eq('intervention_id', interventionId)
          .order('date', { ascending: true })

        if (!allAvailError) {
          allAvailabilities = allUserAvailabilities || []
        }
      }
    }

    logger.info({ userAvailabilities: userAvailabilities.length, allAvailabilities: allAvailabilities.length }, "✅ Retrieved user availabilities and total availabilities")

    return NextResponse.json({
      success: true,
      userAvailabilities: userAvailabilities || [],
      allAvailabilities: allAvailabilities,
      canSeeOthers: allAvailabilities.length > 0
    })

  } catch (error) {
    logger.error({ error: error }, "❌ Error in user-availability GET API:")
    return NextResponse.json({
      success: false,
      error: 'Erreur serveur lors de la récupération des disponibilités'
    }, { status: 500 })
  }
}