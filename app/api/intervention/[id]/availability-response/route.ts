import { NextRequest, NextResponse } from 'next/server'
import { interventionService } from '@/lib/database-service'
import { notificationService } from '@/lib/notification-service'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/lib/database.types'

interface RouteParams {
  params: {
    id: string
  }
}

interface TenantCounterProposal {
  date: string
  startTime: string
  endTime: string
}

interface AvailabilityResponsePayload {
  responseType: 'accept' | 'reject' | 'counter'
  message?: string
  selectedSlots?: string[] // Pour l'acceptation
  counterProposals?: TenantCounterProposal[] // Pour les contre-propositions
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  console.log("🚀 [DEBUG] availability-response route started")

  try {
    const resolvedParams = await params
    const id = resolvedParams.id
    console.log("✅ [DEBUG] params resolved, intervention ID:", id)

    if (!id) {
      console.error("❌ [DEBUG] No intervention ID provided")
      return NextResponse.json({
        success: false,
        error: 'ID d\'intervention manquant'
      }, { status: 400 })
    }
    // Initialize Supabase client
    console.log("🔧 [DEBUG] Initializing Supabase client")
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
    console.log("✅ [DEBUG] Supabase client initialized")

    // Get current user
    console.log("👤 [DEBUG] Getting authenticated user")
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    if (authError || !authUser) {
      console.error("❌ [DEBUG] Auth error or no user:", authError?.message || "No user")
      return NextResponse.json({
        success: false,
        error: 'Non autorisé'
      }, { status: 401 })
    }
    console.log("✅ [DEBUG] User authenticated:", authUser.id)

    // Get user details
    console.log("👤 [DEBUG] Getting user details from database")
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('auth_user_id', authUser.id)
      .single()

    if (userError || !user) {
      console.error("❌ [DEBUG] User not found in database:", userError?.message || "No user")
      return NextResponse.json({
        success: false,
        error: 'Utilisateur non trouvé'
      }, { status: 401 })
    }

    console.log("✅ [DEBUG] User found:", { id: user.id, role: user.role })

    // Verify user is a tenant
    if (user.role !== 'locataire') {
      console.error("❌ [DEBUG] User is not a tenant:", user.role)
      return NextResponse.json({
        success: false,
        error: 'Seuls les locataires peuvent répondre aux disponibilités'
      }, { status: 403 })
    }

    console.log("✅ [DEBUG] User role verified: locataire")

    // Parse request body
    console.log("📝 [DEBUG] Parsing request body")
    const body: AvailabilityResponsePayload = await request.json()
    const { responseType, message, selectedSlots, counterProposals } = body

    console.log("📝 [DEBUG] Tenant availability response:", {
      responseType,
      messageLength: message?.length || 0,
      selectedSlotsCount: selectedSlots?.length || 0,
      counterProposalsCount: counterProposals?.length || 0
    })

    // Get intervention details
    console.log("🏠 [DEBUG] Getting intervention details")
    const { data: intervention, error: interventionError } = await supabase
      .from('interventions')
      .select(`
        *,
        lot:lot_id(
          id,
          building:building_id(name, address, team_id),
          lot_contacts(user_id, is_primary)
        )
      `)
      .eq('id', id)
      .single()

    if (interventionError || !intervention) {
      console.error("❌ [DEBUG] Intervention not found:", interventionError?.message || "No intervention")
      return NextResponse.json({
        success: false,
        error: 'Intervention non trouvée'
      }, { status: 404 })
    }

    console.log("✅ [DEBUG] Intervention found:", { id: intervention.id, status: intervention.status })

    // Verify user is the tenant for this intervention
    console.log("🔐 [DEBUG] Verifying tenant permissions")
    const isUserTenant = intervention.lot?.lot_contacts?.some(
      (contact: any) => contact.user_id === user.id
    )

    if (!isUserTenant) {
      console.error("❌ [DEBUG] User is not a tenant for this intervention:", {
        userId: user.id,
        lotContacts: intervention.lot?.lot_contacts?.map((c: any) => c.user_id) || []
      })
      return NextResponse.json({
        success: false,
        error: 'Vous n\'êtes pas autorisé pour cette intervention'
      }, { status: 403 })
    }

    console.log("✅ [DEBUG] Tenant permissions verified")

    // Process response based on type
    let newStatus = intervention.status
    let statusMessage = ''

    if (responseType === 'accept') {
      newStatus = 'planifiee'
      statusMessage = 'Le locataire a accepté les créneaux proposés - Intervention planifiée'

      // TODO: Save selected slots for future scheduling
      // For now, we'll update the intervention status

    } else if (responseType === 'reject') {
      newStatus = 'planification'
      statusMessage = 'Le locataire a rejeté les créneaux proposés - En attente de nouvelles propositions'

    } else if (responseType === 'counter') {
      newStatus = 'planification'
      statusMessage = 'Le locataire a proposé d\'autres créneaux - En cours de planification'

      // Save tenant counter-proposals as user_availabilities
      if (counterProposals && counterProposals.length > 0) {
        // First, delete existing tenant availabilities for this intervention
        const { error: deleteError } = await supabase
          .from('user_availabilities')
          .delete()
          .eq('user_id', user.id)
          .eq('intervention_id', id)

        if (deleteError) {
          console.warn("⚠️ Could not delete existing tenant availabilities:", deleteError)
        }

        // Insert new tenant counter-proposals
        const availabilityData = counterProposals.map((proposal) => ({
          user_id: user.id,
          intervention_id: id,
          date: proposal.date,
          start_time: proposal.startTime,
          end_time: proposal.endTime
        }))

        const { error: insertError } = await supabase
          .from('user_availabilities')
          .insert(availabilityData)

        if (insertError) {
          console.error("❌ Error saving tenant counter-proposals:", insertError)
          return NextResponse.json({
            success: false,
            error: 'Erreur lors de la sauvegarde des contre-propositions'
          }, { status: 500 })
        }

        console.log("✅ Tenant counter-proposals saved successfully")
      }
    }

    // Update intervention status
    const { error: updateError } = await supabase
      .from('interventions')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (updateError) {
      console.error("❌ Error updating intervention status:", updateError)
      return NextResponse.json({
        success: false,
        error: 'Erreur lors de la mise à jour du statut'
      }, { status: 500 })
    }

    console.log(`✅ [DEBUG] Intervention status updated to: ${newStatus}`)

    // Create notification for managers and providers
    console.log("🔔 [DEBUG] Creating notifications")
    try {
      await notificationService.notifyAvailabilityResponse({
        interventionId: id,
        interventionTitle: intervention.title || `Intervention ${intervention.type || ''}`,
        responseType,
        tenantName: user.name,
        message: message || '',
        teamId: intervention.lot?.building?.team_id,
        lotReference: intervention.lot?.reference
      })
      console.log('✅ Availability response notifications sent')
    } catch (notificationError) {
      console.error('❌ Error sending availability response notifications:', notificationError)
      // Don't fail the request for notification errors
    }

    // If it's a counter-proposal, try to trigger matching with provider availabilities
    if (responseType === 'counter') {
      try {
        const matchingResponse = await fetch(`${request.nextUrl.origin}/api/intervention/${id}/match-availabilities`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': request.headers.get('cookie') || ''
          },
        })

        if (matchingResponse.ok) {
          console.log('✅ Automatic matching triggered for counter-proposals')
        } else {
          console.warn('⚠️ Could not trigger automatic matching')
        }
      } catch (matchingError) {
        console.warn("⚠️ Error triggering matching:", matchingError)
        // Don't fail the request for matching errors
      }
    }

    console.log("🎉 [DEBUG] Route successful, sending response")
    return NextResponse.json({
      success: true,
      message: statusMessage,
      newStatus
    })

  } catch (error) {
    console.error('❌ [DEBUG] Critical error in availability-response route:', error)
    console.error('❌ [DEBUG] Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json({
      success: false,
      error: 'Erreur serveur'
    }, { status: 500 })
  }
}