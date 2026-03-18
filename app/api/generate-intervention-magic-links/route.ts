import { NextRequest, NextResponse } from 'next/server'
import { Database } from '@/lib/database.types'
import { createServerUserService } from '@/lib/services'
import crypto from 'crypto'
import { logger } from '@/lib/logger'
import { getApiAuthContext } from '@/lib/api-auth-helper'
import { isServiceRoleAvailable } from '@/lib/api-service-role-helper'
import { generateMagicLinksSchema, validateRequest, formatZodErrors } from '@/lib/validation/schemas'

export async function POST(request: NextRequest) {
  logger.info({}, "✅ generate-intervention-magic-links API route called")

  try {
    // ✅ AUTH: createServerClient pattern → getApiAuthContext (51 lignes → 6 lignes)
    const authResult = await getApiAuthContext({ requiredRole: 'gestionnaire' })
    if (!authResult.success) return authResult.error

    const { supabase, authUser, userProfile: user } = authResult.data
    const userService = await createServerUserService()

    // Parse request body
    const body = await request.json()

    // ✅ ZOD VALIDATION
    const validation = validateRequest(generateMagicLinksSchema, body)
    if (!validation.success) {
      logger.warn({ errors: formatZodErrors(validation.errors) }, '⚠️ [GENERATE-MAGIC-LINKS] Validation failed')
      return NextResponse.json({
        success: false,
        error: 'Données invalides',
        details: formatZodErrors(validation.errors)
      }, { status: 400 })
    }

    const validatedData = validation.data
    const {
      interventionId,
      providerEmails, // Array of email addresses for external providers
      deadline,
      additionalNotes,
      individualMessages = {}
    } = validatedData

    logger.info({ interventionId, providerEmails }, "📝 Generating magic links for intervention")

    // ✅ Role check already done by getApiAuthContext({ requiredRole: 'gestionnaire' })

    // Get intervention details
    const { data: intervention, error: interventionError } = await supabase
      .from('interventions')
      .select(`
        *,
        lot:lot_id(id, reference, building:building_id(name, team_id, address_record:address_id(*))),
        team:team_id(id, name)
      `)
      .eq('id', interventionId)
      .single()

    if (interventionError || !intervention) {
      logger.error({ interventionError: interventionError }, "❌ Intervention not found:")
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

    logger.info({ providerEmailCount: providerEmails.length }, "🔗 Generating magic links for external providers")

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
        const existingProviderResult = await userService.findByEmail(email)
        const existingProvider = existingProviderResult?.data ?? null

        if (existingProvider) {
          providerId = existingProvider.id
          logger.info({ email, providerId }, "📧 Provider already exists in system with ID:")
        } else {
          logger.info({ email }, "📧 Provider is external, will be created on first access")
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
          logger.error(`❌ Error creating magic link for ${email}:`, linkError)
          errors.push({ email, error: linkError.message })
          continue
        }

        // Generate the actual magic link URL
        const magicLinkUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/prestataire/intervention/${token}`

        logger.info(`✅ Magic link generated for ${email}:`, magicLink.id)

        // Send email notification with magic link
        if (isServiceRoleAvailable()) {
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
              title: 'Demande de devis reçue',
              message: `Nouvelle demande de devis pour "${intervention.title}". Lien d'accès généré.`,
              isPersonal: true, // Notification directe au prestataire (demande de devis)
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

            logger.info({ email }, "📧 Email notification queued for")
          } catch (emailError) {
            logger.warn(`⚠️ Could not send email to ${email}:`, emailError)
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
        logger.error(`❌ Error processing ${email}:`, error)
        errors.push({
          email,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    // Update intervention quote metadata if any links were generated successfully
    // Note: status stays as 'approuvee' — quote tracking is via intervention_quotes table, not status
    if (magicLinkResults.length > 0) {
      logger.info("🔄 Updating intervention quote metadata (requires_quote)...")

      await supabase
        .from('interventions')
        .update({
          requires_quote: true,
          quote_deadline: deadline || null,
          quote_notes: additionalNotes || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', interventionId)

      logger.info({}, "✅ Intervention quote metadata updated")
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
        status: intervention.status,
        quote_deadline: deadline,
        updated_at: new Date().toISOString()
      }
    })

  } catch (error) {
    logger.error({ error }, "❌ Error in generate-intervention-magic-links API:")
    logger.error({
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack',
    }, "❌ Error details:")

    return NextResponse.json({
      success: false,
      error: 'Erreur lors de la génération des liens magiques'
    }, { status: 500 })
  }
}
