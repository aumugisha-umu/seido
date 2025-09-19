import { NextRequest, NextResponse } from 'next/server'
import { interventionService, userService } from '@/lib/database-service'
import { notificationService } from '@/lib/notification-service'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/lib/database.types'

export async function POST(request: NextRequest) {
  console.log("✅ intervention-quote-request API route called")

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
    const {
      interventionId,
      providerId,      // Compatibilité mono-prestataire (legacy)
      providerIds,     // Nouveau: support multi-prestataires
      deadline,        // Date limite pour le devis
      additionalNotes, // Notes générales
      individualMessages = {} // Nouveau: messages individualisés par prestataire
    } = body

    // Support legacy (providerId) ET nouveau format (providerIds)
    const targetProviderIds = providerIds || (providerId ? [providerId] : [])

    if (!interventionId || !targetProviderIds || targetProviderIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'interventionId et au moins un prestataire sont requis'
      }, { status: 400 })
    }

    console.log("📝 Requesting quote for intervention:", interventionId, "from providers:", targetProviderIds)

    // Get current user from database
    const user = await userService.findByAuthUserId(authUser.id)
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Utilisateur non trouvé'
      }, { status: 404 })
    }

    // Check if user is gestionnaire
    if (user.role !== 'gestionnaire') {
      return NextResponse.json({
        success: false,
        error: 'Seuls les gestionnaires peuvent demander des devis'
      }, { status: 403 })
    }

    // Get intervention details
    const { data: intervention, error: interventionError } = await supabase
      .from('interventions')
      .select(`
        *,
        lot:lot_id(id, reference, building:building_id(name, address, team_id)),
        team:team_id(id, name)
      `)
      .eq('id', interventionId)
      .single()

    if (interventionError || !intervention) {
      console.error("❌ Intervention not found:", interventionError)
      return NextResponse.json({
        success: false,
        error: 'Intervention non trouvée'
      }, { status: 404 })
    }

    // Check if intervention can receive quote request
    if (intervention.status !== 'approuvee') {
      return NextResponse.json({
        success: false,
        error: `Une demande de devis ne peut être faite que pour les interventions approuvées (statut actuel: ${intervention.status})`
      }, { status: 400 })
    }

    // Check if user belongs to intervention team
    if (intervention.team_id && user.team_id !== intervention.team_id) {
      return NextResponse.json({
        success: false,
        error: 'Vous n\'êtes pas autorisé à modifier cette intervention'
      }, { status: 403 })
    }

    // Verify all providers exist and have proper role
    const { data: providers, error: providerError } = await supabase
      .from('users')
      .select('id, name, email, role, provider_category')
      .in('id', targetProviderIds)

    if (providerError) {
      console.error("❌ Error fetching providers:", providerError)
      return NextResponse.json({
        success: false,
        error: 'Erreur lors de la vérification des prestataires'
      }, { status: 500 })
    }

    if (!providers || providers.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Aucun prestataire trouvé'
      }, { status: 404 })
    }

    // Check that all users are prestataires
    const invalidProviders = providers.filter(p => p.role !== 'prestataire')
    if (invalidProviders.length > 0) {
      return NextResponse.json({
        success: false,
        error: `Les utilisateurs suivants ne sont pas des prestataires: ${invalidProviders.map(p => p.name).join(', ')}`
      }, { status: 400 })
    }

    // Check that all requested provider IDs were found
    const foundIds = providers.map(p => p.id)
    const missingIds = targetProviderIds.filter(id => !foundIds.includes(id))
    if (missingIds.length > 0) {
      return NextResponse.json({
        success: false,
        error: `Prestataires non trouvés: ${missingIds.join(', ')}`
      }, { status: 404 })
    }

    console.log("🔄 Updating intervention status to 'demande_de_devis'...")

    // Update intervention status and add quote information
    const updatedIntervention = await interventionService.update(interventionId, {
      status: 'demande_de_devis' as Database['public']['Enums']['intervention_status'],
      quote_deadline: deadline || null,
      quote_notes: additionalNotes || null,
      updated_at: new Date().toISOString()
    })

    // Assign multiple providers to intervention via intervention_contacts
    console.log("🔗 Assigning providers to intervention...")

    const assignmentPromises = providers.map(async (provider, index) => {
      const individualMessage = individualMessages[provider.id] || additionalNotes || null

      return supabase
        .from('intervention_contacts')
        .upsert({
          intervention_id: interventionId,
          user_id: provider.id,
          role: 'prestataire',
          is_primary: index === 0, // Premier prestataire = primary pour compatibilité
          individual_message: individualMessage,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'intervention_id,user_id,role'
        })
    })

    try {
      const assignmentResults = await Promise.all(assignmentPromises)
      const failedAssignments = assignmentResults.filter(result => result.error)

      if (failedAssignments.length > 0) {
        console.error("❌ Some provider assignments failed:", failedAssignments)
        // Continue anyway, don't fail the entire request
      } else {
        console.log(`✅ Successfully assigned ${providers.length} providers to intervention`)
      }
    } catch (assignmentError) {
      console.error("❌ Error during provider assignments:", assignmentError)
      // Don't fail the entire request, continue with notifications
    }

    console.log("✅ Intervention updated to quote request successfully")

    // Send notifications to all providers about quote request
    try {
      const notificationPromises = providers.map(provider => {
        const individualMessage = individualMessages[provider.id] || additionalNotes

        return notificationService.notifyQuoteRequest(
          intervention,
          provider,
          user.id,
          deadline,
          individualMessage
        )
      })

      await Promise.all(notificationPromises)
      console.log(`📧 Quote request notifications sent to ${providers.length} provider(s)`)
    } catch (notifError) {
      console.warn("⚠️ Could not send quote request notifications:", notifError)
      // Don't fail the request for notification errors
    }

    // Send status change notifications
    try {
      await notificationService.notifyInterventionStatusChanged(
        intervention,
        'approuvee',
        'demande_de_devis',
        user.id
      )
      console.log("📧 Status change notifications sent")
    } catch (notifError) {
      console.warn("⚠️ Could not send status notifications:", notifError)
    }

    return NextResponse.json({
      success: true,
      intervention: {
        id: updatedIntervention.id,
        status: updatedIntervention.status,
        title: updatedIntervention.title,
        quote_deadline: updatedIntervention.quote_deadline,
        updated_at: updatedIntervention.updated_at
      },
      providers: providers.map(provider => ({
        id: provider.id,
        name: provider.name,
        email: provider.email,
        provider_category: provider.provider_category
      })),
      message: `Demande de devis envoyée à ${providers.length} prestataire(s) avec succès: ${providers.map(p => p.name).join(', ')}`
    })

  } catch (error) {
    console.error("❌ Error in intervention-quote-request API:", error)
    console.error("❌ Error details:", {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack',
    })

    return NextResponse.json({
      success: false,
      error: 'Erreur lors de la demande de devis'
    }, { status: 500 })
  }
}