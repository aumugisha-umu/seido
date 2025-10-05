import { NextRequest, NextResponse } from 'next/server'
import { userService } from '@/lib/database-service'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/lib/database.types'
import { logger, logError } from '@/lib/logger'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const resolvedParams = await params
  console.log("✅ tenant-availability API route called for intervention:", resolvedParams.id)

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
    const { tenantAvailabilities = [] } = body

    if (!tenantAvailabilities || !Array.isArray(tenantAvailabilities)) {
      return NextResponse.json({
        success: false,
        error: 'tenantAvailabilities est requis et doit être un tableau'
      }, { status: 400 })
    }

    console.log("📅 Saving tenant availabilities:", tenantAvailabilities.length)

    // Get current user from database
    const user = await userService.findByAuthUserId(authUser.id)
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Utilisateur non trouvé'
      }, { status: 404 })
    }

    // Check if user is locataire
    if (user.role !== 'locataire') {
      return NextResponse.json({
        success: false,
        error: 'Seuls les locataires peuvent renseigner leurs disponibilités'
      }, { status: 403 })
    }

    // Get intervention details to verify status and user access
    const { data: intervention, error: interventionError } = await supabase
      .from('interventions')
      .select(`
        *,
        lot:lot_id(id, tenant_id, building:building_id(name, address))
      `)
      .eq('id', resolvedParams.id)
      .single()

    if (interventionError || !intervention) {
      console.error("❌ Intervention not found:", interventionError)
      return NextResponse.json({
        success: false,
        error: 'Intervention non trouvée'
      }, { status: 404 })
    }

    // Check if intervention is in planification status (quote validated, awaiting tenant availability)
    if (intervention.status !== 'planification') {
      return NextResponse.json({
        success: false,
        error: `Les disponibilités ne peuvent être renseignées que pour les interventions en planification (statut actuel: ${intervention.status})`
      }, { status: 400 })
    }

    // Check if user is the tenant of this lot (security check)
    if (intervention.lot.tenant_id !== user.id) {
      return NextResponse.json({
        success: false,
        error: 'Vous n\'êtes pas autorisé à renseigner les disponibilités pour cette intervention'
      }, { status: 403 })
    }

    // Validate availability data
    for (const avail of tenantAvailabilities) {
      if (!avail.date || !avail.startTime || !avail.endTime) {
        return NextResponse.json({
          success: false,
          error: 'Chaque disponibilité doit contenir une date, heure de début et heure de fin'
        }, { status: 400 })
      }

      // Validate date format and future date
      const availDate = new Date(avail.date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      if (availDate < today) {
        return NextResponse.json({
          success: false,
          error: 'Les disponibilités ne peuvent pas être dans le passé'
        }, { status: 400 })
      }

      // Validate time format and logic
      if (avail.startTime >= avail.endTime) {
        return NextResponse.json({
          success: false,
          error: 'L\'heure de fin doit être après l\'heure de début'
        }, { status: 400 })
      }
    }

    // Remove any existing tenant availabilities for this intervention
    const { error: deleteError } = await supabase
      .from('user_availabilities')
      .delete()
      .eq('user_id', user.id)
      .eq('intervention_id', resolvedParams.id)

    if (deleteError) {
      console.warn("⚠️ Could not delete existing tenant availabilities:", deleteError)
      // Don't fail completely for this
    }

    // Insert new tenant availabilities
    const availabilityData = tenantAvailabilities.map((_avail: unknown) => ({
      user_id: user.id,
      intervention_id: resolvedParams.id,
      date: avail.date,
      start_time: avail.startTime,
      end_time: avail.endTime
    }))

    const { error: insertError } = await supabase
      .from('user_availabilities')
      .insert(availabilityData)

    if (insertError) {
      console.error("❌ Error inserting tenant availabilities:", insertError)
      return NextResponse.json({
        success: false,
        error: 'Erreur lors de la sauvegarde des disponibilités'
      }, { status: 500 })
    }

    console.log("✅ Tenant availabilities saved successfully")

    // Now trigger automatic matching between tenant and provider availabilities
    console.log("🔄 Triggering automatic availability matching...")

    // Get provider availabilities for this intervention
    const { data: providerAvailabilities, error: providerError } = await supabase
      .from('user_availabilities')
      .select(`
        *,
        user:user_id(id, name, role)
      `)
      .eq('intervention_id', resolvedParams.id)
      .neq('user_id', user.id) // Exclude tenant's own availabilities
      .eq('user.role', 'prestataire')

    if (providerError) {
      console.warn("⚠️ Could not fetch provider availabilities for matching:", providerError)
    } else if (providerAvailabilities && providerAvailabilities.length > 0) {
      // Call matching algorithm (we'll implement this next)
      try {
        const matchingResponse = await fetch(`${request.nextUrl.origin}/api/intervention/${resolvedParams.id}/match-availabilities`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': request.headers.get('cookie') || ''
          }
        })

        if (matchingResponse.ok) {
          const matchingResult = await matchingResponse.json()
          console.log("✅ Automatic matching completed:", matchingResult)

          // If we found a perfect match, transition to planifiee status
          if (matchingResult.success && matchingResult.perfectMatch) {
            const { error: statusUpdateError } = await supabase
              .from('interventions')
              .update({
                status: 'planifiee',
                scheduled_date: matchingResult.perfectMatch.date,
                scheduled_time: matchingResult.perfectMatch.startTime,
                updated_at: new Date().toISOString()
              })
              .eq('id', resolvedParams.id)

            if (statusUpdateError) {
              console.warn("⚠️ Could not update intervention status:", statusUpdateError)
            } else {
              console.log("✅ Intervention status updated to 'planifiee' with scheduled date/time")
            }
          }
        } else {
          console.warn("⚠️ Matching API call failed:", await matchingResponse.text())
        }
      } catch (matchingError) {
        console.warn("⚠️ Error during automatic matching:", matchingError)
        // Don't fail the availability save for matching errors
      }
    } else {
      console.log("ℹ️ No provider availabilities found, skipping matching")
    }

    return NextResponse.json({
      success: true,
      message: 'Disponibilités sauvegardées avec succès',
      availabilitiesCount: tenantAvailabilities.length
    })

  } catch (error) {
    console.error("❌ Error in tenant-availability API:", error)
    console.error("❌ Error details:", {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack',
    })

    return NextResponse.json({
      success: false,
      error: 'Erreur lors de la sauvegarde des disponibilités'
    }, { status: 500 })
  }
}

// GET endpoint to retrieve tenant's current availabilities
export async function GET(request: NextRequest, { params }: RouteParams) {
  const resolvedParams = await params
  console.log("✅ GET tenant-availability API route called for intervention:", resolvedParams.id)

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

    // Get tenant's availabilities for this intervention
    const { data: availabilities, error: availError } = await supabase
      .from('user_availabilities')
      .select('*')
      .eq('user_id', user.id)
      .eq('intervention_id', resolvedParams.id)
      .order('date', { ascending: true })
      .order('start_time', { ascending: true })

    if (availError) {
      console.error("❌ Error fetching tenant availabilities:", availError)
      return NextResponse.json({
        success: false,
        error: 'Erreur lors de la récupération des disponibilités'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      availabilities: availabilities || []
    })

  } catch (error) {
    console.error("❌ Error in GET tenant-availability API:", error)
    return NextResponse.json({
      success: false,
      error: 'Erreur lors de la récupération des disponibilités'
    }, { status: 500 })
  }
}