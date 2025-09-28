import { NextRequest, NextResponse } from 'next/server'
import { notificationService } from '@/lib/notification-service'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/lib/database.types'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'


// Admin client for sending emails
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabaseAdmin = supabaseServiceRoleKey ? createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseServiceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
) : null

export async function POST(request: NextRequest) {
  console.log("✅ generate-intervention-magic-links API route called")

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
      providerEmails, // Array of email addresses for external providers
      deadline,
      additionalNotes,
      individualMessages = {}
    } = body

    if (!interventionId || !providerEmails || !Array.isArray(providerEmails) || providerEmails.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'interventionId et providerEmails (array) sont requis'
      }, { status: 400 })
    }

    console.log("📝 Generating magic links for intervention:", interventionId, "for emails:", providerEmails)

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
        error: 'Seuls les gestionnaires peuvent générer des liens magiques'
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

    // Check if intervention can receive magic links
    if (intervention.status !== 'approuvee') {
      return NextResponse.json({
        success: false,
        error: `Des liens magiques ne peuvent être générés que pour les interventions approuvées (statut actuel: ${intervention.status})`
      }, { status: 400 })
    }

    // Check if user belongs to intervention team
    if (intervention.team_id && user.team_id !== intervention.team_id) {
      return NextResponse.json({
        success: false,
        error: 'Vous n\'êtes pas autorisé à modifier cette intervention'
      }, { status: 403 })
    }

    console.log("🔗 Generating magic links for", providerEmails.length, "external providers...")

    // Generate magic links for each provider email
    const magicLinkResults = []
    const errors = []

    for (const email of providerEmails) {
      try {
        // Generate secure token
        const token = crypto.randomBytes(32).toString('hex')
        const expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + 7) // 7 days expiration

        // Check if provider already exists in our system
        let providerId = null
        const existingProvider = await userService.findByEmail(email)

        if (existingProvider) {
          providerId = existingProvider.id
          console.log(`📧 Provider ${email} already exists in system with ID: ${providerId}`)
        } else {
          console.log(`📧 Provider ${email} is external, will be created on first access`)
        }

        // Create magic link record
        const { data: magicLink, error: linkError } = await supabase
          .from('intervention_magic_links')
          .insert({
            intervention_id: interventionId,
            provider_email: email,
            provider_id: providerId, // null if external
            token: token,
            expires_at: expiresAt.toISOString(),
            individual_message: individualMessages[email] || additionalNotes || null,
            created_by: user.id,
            status: 'pending'
          })
          .select()
          .single()

        if (linkError) {
          console.error(`❌ Error creating magic link for ${email}:`, linkError)
          errors.push({ email, error: linkError.message })
          continue
        }

        // Generate the actual magic link URL
        const magicLinkUrl = `${process.env.NEXT_PUBLIC_APP_URL}/prestataire/intervention/${token}`

        console.log(`✅ Magic link generated for ${email}:`, magicLink.id)

        // Send email notification with magic link
        if (supabaseAdmin) {
          try {
            // const individualMessage = individualMessages[email] || additionalNotes || ''

            // Email content would be sent here
            // TODO: Implement email sending when ready

            // Use Supabase Edge Function or email service to send the email
            // For now, we'll create a notification in the system
            await notificationService.createNotification({
              userId: providerId || null, // null for external providers
              teamId: intervention.team_id,
              createdBy: user.id,
              type: 'intervention',
              priority: 'high',
              title: 'Demande de devis reçue',
              message: `Nouvelle demande de devis pour "${intervention.title}". Lien d'accès généré.`,
              isPersonal: true,
              metadata: {
                interventionId: interventionId,
                interventionTitle: intervention.title,
                magicLinkToken: token,
                providerEmail: email,
                deadline: deadline,
                actionRequired: 'quote_submission'
              },
              relatedEntityType: 'intervention',
              relatedEntityId: interventionId
            })

            console.log(`📧 Email notification queued for ${email}`)
          } catch (emailError) {
            console.warn(`⚠️ Could not send email to ${email}:`, emailError)
            // Don't fail the magic link generation for email errors
          }
        }

        magicLinkResults.push({
          email,
          token,
          magicLinkUrl,
          providerId,
          magicLinkId: magicLink.id,
          expiresAt: expiresAt.toISOString(),
          isExistingProvider: !!providerId
        })

      } catch (error) {
        console.error(`❌ Error processing ${email}:`, error)
        errors.push({
          email,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    // Update intervention status to quote request if any links were generated successfully
    if (magicLinkResults.length > 0) {
      console.log("🔄 Updating intervention status to 'demande_de_devis'...")

      await supabase
        .from('interventions')
        .update({
          status: 'demande_de_devis' as Database['public']['Enums']['intervention_status'],
          quote_deadline: deadline || null,
          quote_notes: additionalNotes || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', interventionId)

      console.log("✅ Intervention status updated to quote request")

      // Send status change notification
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
    }

    const successCount = magicLinkResults.length
    const errorCount = errors.length

    return NextResponse.json({
      success: true,
      message: `${successCount} lien(s) magique(s) généré(s) avec succès${errorCount > 0 ? `, ${errorCount} erreur(s)` : ''}`,
      results: {
        magicLinks: magicLinkResults,
        errors: errors,
        successCount,
        errorCount
      },
      intervention: {
        id: intervention.id,
        status: 'demande_de_devis',
        quote_deadline: deadline,
        updated_at: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error("❌ Error in generate-intervention-magic-links API:", error)
    console.error("❌ Error details:", {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack',
    })

    return NextResponse.json({
      success: false,
      error: 'Erreur lors de la génération des liens magiques'
    }, { status: 500 })
  }
}
