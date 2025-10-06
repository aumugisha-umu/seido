import { NextRequest, NextResponse } from 'next/server'
import { notificationService } from '@/lib/notification-service'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/lib/database.types'
import { createServerUserService } from '@/lib/services'
import { logger, logError } from '@/lib/logger'

export async function POST(request: NextRequest) {
  logger.info({}, "✅ intervention-quote-submit API route called")

  try {
    // Initialize services
    const userService = await createServerUserService()
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
      laborCost,
      materialsCost = 0,
      description,
      workDetails,
      estimatedDurationHours,
      estimatedStartDate,
      termsAndConditions,
      attachments = [],
      providerAvailabilities = [] // Nouvelles disponibilités prestataire
    } = body

    if (!interventionId || !laborCost || !description) {
      return NextResponse.json({
        success: false,
        error: 'interventionId, laborCost et description sont requis'
      }, { status: 400 })
    }

    logger.info({ interventionId: interventionId }, "📝 Submitting quote for intervention:")

    // Get current user from database
    const user = await userService.findByAuthUserId(authUser.id)
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Utilisateur non trouvé'
      }, { status: 404 })
    }

    // Check if user is prestataire
    if (user.role !== 'prestataire') {
      return NextResponse.json({
        success: false,
        error: 'Seuls les prestataires peuvent soumettre des devis'
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
      logger.error({ interventionError: interventionError }, "❌ Intervention not found:")
      return NextResponse.json({
        success: false,
        error: 'Intervention non trouvée'
      }, { status: 404 })
    }

    // Check if intervention is in quote request status
    if (intervention.status !== 'demande_de_devis') {
      return NextResponse.json({
        success: false,
        error: `Un devis ne peut être soumis que pour les interventions en demande de devis (statut actuel: ${intervention.status})`
      }, { status: 400 })
    }

    // Check if user has a quote request for this intervention
    const { data: quoteRequest, error: quoteRequestError } = await supabase
      .from('quote_requests')
      .select('*')
      .eq('intervention_id', interventionId)
      .eq('provider_id', user.id)
      .single()

    if (quoteRequestError || !quoteRequest) {
      return NextResponse.json({
        success: false,
        error: 'Vous n\'avez pas de demande de devis pour cette intervention'
      }, { status: 403 })
    }

    // Check if quote request is still active (not expired or cancelled)
    if (!['sent', 'viewed'].includes(quoteRequest.status)) {
      return NextResponse.json({
        success: false,
        error: `Cette demande de devis n'est plus active (statut: ${quoteRequest.status})`
      }, { status: 400 })
    }

    // Check if deadline has passed
    if (quoteRequest.deadline && new Date(quoteRequest.deadline) < new Date()) {
      return NextResponse.json({
        success: false,
        error: 'La deadline pour cette demande de devis est dépassée'
      }, { status: 400 })
    }

    // Also check legacy assignment for compatibility
    const { data: assignment } = await supabase
      .from('intervention_contacts')
      .select('*')
      .eq('intervention_id', interventionId)
      .eq('user_id', user.id)
      .eq('role', 'prestataire')
      .maybeSingle()

    logger.info({
      id: quoteRequest.id,
      status: quoteRequest.status,
      deadline: quoteRequest.deadline,
      hasLegacyAssignment: !!assignment
    }, "✅ Quote request found:")

    // Validate costs
    const laborCostNum = parseFloat(laborCost)
    const materialsCostNum = parseFloat(materialsCost || 0)

    if (isNaN(laborCostNum) || laborCostNum < 0) {
      return NextResponse.json({
        success: false,
        error: 'Le coût de la main d\'œuvre doit être un nombre positif'
      }, { status: 400 })
    }

    if (isNaN(materialsCostNum) || materialsCostNum < 0) {
      return NextResponse.json({
        success: false,
        error: 'Le coût des matériaux doit être un nombre positif'
      }, { status: 400 })
    }

    logger.info({
      laborCost: laborCostNum,
      materialsCost: materialsCostNum,
      totalAmount: laborCostNum + materialsCostNum
    }, "💰 Quote details:")

    // Create or update quote (upsert based on unique constraint)
    const quoteData = {
      intervention_id: interventionId,
      provider_id: user.id,
      labor_cost: laborCostNum,
      materials_cost: materialsCostNum,
      description: description.trim(),
      work_details: workDetails?.trim() || null,
      estimated_duration_hours: estimatedDurationHours ? parseInt(estimatedDurationHours) : null,
      estimated_start_date: estimatedStartDate || null,
      terms_and_conditions: termsAndConditions?.trim() || null,
      attachments: JSON.stringify(attachments || []),
      status: 'pending' as const,
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      quote_request_id: quoteRequest.id // Link to the quote request
    }

    // Insert or update quote
    const { data: quote, error: quoteError } = await supabase
      .from('intervention_quotes')
      .upsert(quoteData, {
        onConflict: 'intervention_id,provider_id',
        ignoreDuplicates: false
      })
      .select(`
        *,
        provider:provider_id(id, name, email, provider_category)
      `)
      .single()

    if (quoteError) {
      logger.error({ error: quoteError }, "❌ Error creating/updating quote:")
      return NextResponse.json({
        success: false,
        error: 'Erreur lors de la soumission du devis'
      }, { status: 500 })
    }

    logger.info({ quote: quote.id }, "✅ Quote submitted successfully:")

    // Update quote request status to "responded" (this is also handled by the database trigger)
    const { error: updateRequestError } = await supabase
      .from('quote_requests')
      .update({
        status: 'responded',
        responded_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', quoteRequest.id)

    if (updateRequestError) {
      logger.warn({ updateRequestError: updateRequestError }, "⚠️ Could not update quote request status:")
      // Don't fail the quote submission for this
    } else {
      logger.info("✅ Quote request status updated to 'responded'")
    }

    // Save provider availabilities linked to the quote and quote request
    if (providerAvailabilities && providerAvailabilities.length > 0) {
      logger.info({ providerAvailabilities: providerAvailabilities.length }, "📅 Saving provider availabilities:")

      // Strategy: Remove existing availabilities for this provider/quote_request combination
      // This way we preserve availabilities from other quote requests by the same provider
      // but ensure we don't duplicate availabilities for the same quote submission
      const { error: deleteError } = await supabase
        .from('user_availabilities')
        .delete()
        .eq('user_id', user.id)
        .eq('intervention_id', interventionId)
        .or(`quote_id.eq.${quote.id},and(quote_request_id.eq.${quoteRequest.id},quote_id.is.null)`)

      if (deleteError) {
        logger.warn({ deleteError: deleteError }, "⚠️ Could not delete existing provider availabilities for this quote submission:")
        // Don't fail the quote submission for this
      } else {
        logger.info({}, "✅ Cleaned up existing availabilities for this provider/quote combination")
      }

      // Insert new availabilities linked to both quote and quote request
      const availabilityData = providerAvailabilities.map((avail) => ({
        user_id: user.id,
        intervention_id: interventionId,
        date: avail.date,
        start_time: avail.startTime,
        end_time: avail.endTime,
        quote_id: quote.id, // Link to the specific quote
        quote_request_id: quoteRequest.id // Link to the quote request
      }))

      const { error: availError } = await supabase
        .from('user_availabilities')
        .insert(availabilityData)

      if (availError) {
        logger.warn({ availError: availError }, "⚠️ Could not save provider availabilities:")
        logger.warn({ data: availabilityData }, "⚠️ Availability data that failed to insert:")
        // Don't fail the quote submission for this
      } else {
        logger.info(`✅ ${availabilityData.length} provider availabilities saved successfully for quote:`, quote.id)
      }
    } else {
      logger.info({}, "ℹ️ No provider availabilities provided with quote submission")
    }

    // Send notification to gestionnaires responsible for this intervention
    try {
      const { data: responsibleManagers } = await supabase
        .from('intervention_contacts')
        .select(`
          user:user_id(id, name, email)
        `)
        .eq('intervention_id', interventionId)
        .eq('role', 'gestionnaire')

      if (responsibleManagers && responsibleManagers.length > 0) {
        const notificationPromises = responsibleManagers.map(async (manager) => {
          return notificationService.createNotification({
            userId: manager.user.id,
            teamId: intervention.team_id,
            createdBy: user.id,
            type: 'intervention',
            priority: 'high',
            title: 'Nouveau devis reçu',
            message: `${user.name} a soumis un devis de ${(laborCostNum + materialsCostNum).toFixed(2)}€ pour l'intervention "${intervention.title}"`,
            isPersonal: true,
            metadata: {
              interventionId: interventionId,
              interventionTitle: intervention.title,
              quoteId: quote.id,
              quoteAmount: laborCostNum + materialsCostNum,
              providerName: user.name,
              actionRequired: 'quote_review'
            },
            relatedEntityType: 'intervention',
            relatedEntityId: interventionId
          })
        })

        await Promise.all(notificationPromises)
        logger.info({ responsibleManagers: responsibleManagers.length }, "📧 Quote submission notifications sent to gestionnaire(s)")
      }
    } catch (notifError) {
      logger.warn({ notifError: notifError }, "⚠️ Could not send quote submission notifications:")
      // Don't fail the submission for notification errors
    }

    return NextResponse.json({
      success: true,
      quote: {
        id: quote.id,
        intervention_id: quote.intervention_id,
        labor_cost: quote.labor_cost,
        materials_cost: quote.materials_cost,
        total_amount: quote.total_amount,
        description: quote.description,
        work_details: quote.work_details,
        estimated_duration_hours: quote.estimated_duration_hours,
        estimated_start_date: quote.estimated_start_date,
        status: quote.status,
        submitted_at: quote.submitted_at,
        updated_at: quote.updated_at
      },
      message: 'Devis soumis avec succès'
    })

  } catch (error) {
    logger.error({ error: error }, "❌ Error in intervention-quote-submit API:")
    logger.error({
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack',
    }, "❌ Error details:")

    return NextResponse.json({
      success: false,
      error: 'Erreur lors de la soumission du devis'
    }, { status: 500 })
  }
}
