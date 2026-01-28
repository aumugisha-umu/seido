import { NextRequest, NextResponse, after } from 'next/server'
import { createCustomNotification } from '@/app/actions/notification-actions'
import { logger } from '@/lib/logger'
import { getApiAuthContext } from '@/lib/api-auth-helper'
import { submitQuoteSchema, validateRequest, formatZodErrors } from '@/lib/validation/schemas'

export async function POST(request: NextRequest) {
  logger.info({}, "✅ intervention-quote-submit API route called")

  try {
    // ✅ AUTH + ROLE CHECK: 85 lignes → 3 lignes! (prestataire required)
    const authResult = await getApiAuthContext({ requiredRole: 'prestataire' })
    if (!authResult.success) return authResult.error

    const { supabase, userProfile: user } = authResult.data

    logger.info({ authUserId: user.id, email: user.email }, "🔍 Auth user found")

    // Parse request body
    const body = await request.json()

    // Prepare data for validation - adapt from old format to schema format
    const validationData = {
      interventionId: body.interventionId,
      providerId: user.id, // Current user is the provider
      amount: body.laborCost ? parseFloat(body.laborCost) + (body.materialsCost ? parseFloat(body.materialsCost) : 0) : 0,
      description: body.description,
      estimatedDuration: body.estimatedDurationHours ? Math.round(body.estimatedDurationHours * 60) : undefined, // Convert hours to minutes
    }

    // ✅ ZOD VALIDATION
    const validation = validateRequest(submitQuoteSchema, validationData)
    if (!validation.success) {
      logger.warn({ errors: formatZodErrors(validation.errors) }, '⚠️ [QUOTE-SUBMIT] Validation failed')
      return NextResponse.json({
        success: false,
        error: 'Données invalides',
        details: formatZodErrors(validation.errors)
      }, { status: 400 })
    }

    const validatedData = validation.data
    const {
      interventionId,
      amount: totalAmount,
      description,
      estimatedDuration,
    } = validatedData

    // Extract original values for line items
    const laborCostNum = body.laborCost ? parseFloat(body.laborCost) : 0
    const materialsCostNum = body.materialsCost ? parseFloat(body.materialsCost) : 0
    const estimatedDurationHours = body.estimatedDurationHours
    const providerAvailabilities = body.providerAvailabilities || []

    logger.info({
      interventionId,
      laborCost: laborCostNum,
      materialsCost: materialsCostNum,
      totalAmount,
      hasDescription: !!description,
      availabilitiesCount: providerAvailabilities.length
    }, "📝 Quote submission data received and validated")

    // Get intervention details
    const { data: intervention, error: interventionError } = await supabase
      .from('interventions')
      .select('id, title, status, team_id')
      .eq('id', interventionId)
      .single()

    if (interventionError || !intervention) {
      logger.error({ interventionError }, "❌ Intervention not found")
      return NextResponse.json({
        success: false,
        error: 'Intervention non trouvée'
      }, { status: 404 })
    }

    // Build line items
    const lineItems: any[] = [{
      description: 'Main d\'œuvre',
      quantity: estimatedDurationHours || 1,
      unit_price: laborCostNum / (estimatedDurationHours || 1),
      total: laborCostNum
    }]

    if (materialsCostNum > 0) {
      lineItems.push({
        description: 'Matériaux',
        quantity: 1,
        unit_price: materialsCostNum,
        total: materialsCostNum
      })
    }

    // Determine if we're updating an existing quote or creating a new one
    const quoteId = body.quoteId
    let existingQuote: any = null

    logger.info({ 
      quoteId, 
      hasQuoteId: !!quoteId,
      interventionId 
    }, "🔍 Checking for quote to update or create")

    // If quoteId is provided, verify it exists and belongs to this provider
    if (quoteId) {
      const { data: quote, error: quoteError } = await supabase
        .from('intervention_quotes')
        .select('id, status, provider_id')
        .eq('id', quoteId)
        .eq('provider_id', user.id)
        .is('deleted_at', null)
        .single()

      if (quoteError || !quote) {
        logger.error({ quoteError, quoteId }, "❌ Quote not found or doesn't belong to provider")
        return NextResponse.json({
          success: false,
          error: 'Estimation non trouvée ou non autorisée'
        }, { status: 404 })
      }

      existingQuote = quote
      logger.info({ quoteId }, "📝 Updating existing quote")
    } else {
      // Check if there's an existing quote for this intervention and provider
      const { data: existingQuoteData, error: existingQuoteError } = await supabase
        .from('intervention_quotes')
        .select('id, status')
        .eq('intervention_id', interventionId)
        .eq('provider_id', user.id)
        .is('deleted_at', null)
        .maybeSingle()

      if (existingQuoteError && existingQuoteError.code !== 'PGRST116') {
        logger.error({ existingQuoteError }, "❌ Error checking for existing quote")
        return NextResponse.json({
          success: false,
          error: 'Erreur lors de la vérification de l\'estimation existante'
        }, { status: 500 })
      }

      if (existingQuoteData) {
        existingQuote = existingQuoteData
        logger.info({ quoteId: existingQuote.id }, "📝 Found existing quote, will update")
      }
    }

    let finalQuote: any

    // Update existing quote or create new one
    if (existingQuote) {
      const { data: updatedQuote, error: updateError } = await supabase
        .from('intervention_quotes')
        .update({
          amount: totalAmount,
          description: description.trim(),
          line_items: lineItems,
          status: 'sent',
          updated_at: new Date().toISOString()
        })
        .eq('id', existingQuote.id)
        .select('*')
        .single()

      if (updateError) {
        logger.error({ updateError }, "❌ Error updating quote")
        return NextResponse.json({
          success: false,
          error: 'Erreur lors de la mise à jour de l\'estimation'
        }, { status: 500 })
      }

      finalQuote = updatedQuote
      logger.info({ quoteId: finalQuote.id }, "✅ Quote updated successfully")
    } else {
      // Create new quote
      const { data: newQuote, error: createError } = await supabase
        .from('intervention_quotes')
        .insert({
          intervention_id: interventionId,
          provider_id: user.id,
          amount: totalAmount,
          description: description.trim(),
          line_items: lineItems,
          status: 'sent',
          quote_type: 'estimation',
          estimated_duration: estimatedDuration,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('*')
        .single()

      if (createError) {
        logger.error({ createError }, "❌ Error creating quote")
        return NextResponse.json({
          success: false,
          error: 'Erreur lors de la création de l\'estimation'
        }, { status: 500 })
      }

      finalQuote = newQuote
      logger.info({ quoteId: finalQuote.id }, "✅ Quote created successfully")
    }

    // Create intervention_time_slots if provider provided availabilities
    if (providerAvailabilities && providerAvailabilities.length > 0) {
      logger.info({ count: providerAvailabilities.length }, "📅 Creating intervention time slots")

      // First, delete existing slots proposed by this provider for this intervention
      await supabase
        .from('intervention_time_slots')
        .delete()
        .eq('intervention_id', interventionId)
        .eq('proposed_by', user.id)

      // Insert new time slots
      const timeSlotData = providerAvailabilities
        .filter((avail: any) => avail.date && avail.startTime && avail.endTime)
        .map((avail: any) => ({
          intervention_id: interventionId,
          slot_date: avail.date,
          start_time: avail.startTime,
          end_time: avail.endTime,
          proposed_by: user.id,
          status: 'proposed'
        }))

      if (timeSlotData.length > 0) {
        const { error: slotError } = await supabase
          .from('intervention_time_slots')
          .insert(timeSlotData)

        if (slotError) {
          logger.warn({ slotError }, "⚠️ Could not create intervention time slots")
          // Don't fail the submission for this
        } else {
          logger.info({ count: timeSlotData.length }, "✅ Intervention time slots created")
        }
      }
    }

    // Send notification to gestionnaires
    try {
      const { data: managers } = await supabase
        .from('intervention_assignments')
        .select('user:users!user_id(id, name, email), is_primary')
        .eq('intervention_id', interventionId)
        .eq('role', 'gestionnaire')

      if (managers && managers.length > 0) {
        const notificationPromises = managers.map(async (manager) => {
          if (!manager.user) return
          return createCustomNotification({
            userId: manager.user.id,
            teamId: intervention.team_id,
            type: 'intervention',
            title: 'Nouvelle estimation reçue',
            message: `${user.name} a soumis une estimation de ${totalAmount.toFixed(2)}€ pour l'intervention "${intervention.title}"`,
            isPersonal: manager.is_primary ?? true,
            metadata: {
              interventionId,
              interventionTitle: intervention.title,
              quoteId: finalQuote.id,
              quoteAmount: totalAmount,
              providerName: user.name,
              actionRequired: 'quote_review'
            },
            relatedEntityType: 'intervention',
            relatedEntityId: interventionId
          })
        })

        await Promise.all(notificationPromises)
        logger.info({ managersCount: managers.length }, "📧 Quote submission notifications sent")
      }
    } catch (notifError) {
      logger.warn({ notifError }, "⚠️ Could not send notifications")
    }

    // Send email to manager (via after())
    {
      // Capture variables for after() closure
      const emailQuote = { ...finalQuote }
      const emailIntervention = { ...intervention }
      const emailInterventionId = interventionId
      const emailProvider = { ...user }
      const emailTeamId = intervention.team_id

      after(async () => {
        try {
          const { createEmailNotificationService } = await import('@/lib/services/domain/email-notification.factory')
          const { createServerSupabaseClient } = await import('@/lib/services')

          const emailService = await createEmailNotificationService()
          const supabaseClient = await createServerSupabaseClient()

          // Get manager (first one found)
          const { data: teamMembers } = await supabaseClient
            .from('team_members')
            .select('users(id, email, first_name, last_name)')
            .eq('team_id', emailTeamId)
            .eq('role', 'gestionnaire')
            .limit(1)
            .single()

          if (teamMembers && teamMembers.users) {
            const manager = teamMembers.users as any

            // Get property address
            const { data: interventionDetails } = await supabaseClient
              .from('interventions')
              .select(`
                lot_id,
                building_id,
                lots(reference, address_record:address_id(*), buildings(address_record:address_id(*))),
                buildings(address_record:address_id(*))
              `)
              .eq('id', emailInterventionId)
              .single()

            // Helper to format address from address_record
            const formatAddr = (rec: any) => {
              if (!rec) return null
              if (rec.formatted_address) return rec.formatted_address
              const parts = [rec.street, rec.postal_code, rec.city].filter(Boolean)
              return parts.length > 0 ? parts.join(', ') : null
            }

            let propertyAddress = 'Adresse non spécifiée'
            if (interventionDetails) {
              if (interventionDetails.lot_id && interventionDetails.lots) {
                const lot = interventionDetails.lots as any
                const lotAddr = lot.address_record
                const buildingAddr = lot.buildings?.address_record
                propertyAddress = formatAddr(lotAddr) || formatAddr(buildingAddr) || propertyAddress
              } else if (interventionDetails.building_id && interventionDetails.buildings) {
                const building = interventionDetails.buildings as any
                propertyAddress = formatAddr(building.address_record) || propertyAddress
              }
            }

            await emailService.sendQuoteSubmitted({
              quote: emailQuote,
              intervention: emailIntervention as any,
              property: { address: propertyAddress },
              manager,
              provider: emailProvider,
            })
            logger.info({ quoteId: emailQuote.id }, '📧 [API] Quote submitted email sent (via after())')
          }
        } catch (emailError) {
          logger.error({
            quoteId: emailQuote.id,
            error: emailError instanceof Error ? emailError.message : String(emailError)
          }, '⚠️ [API] Email notifications failed (via after())')
        }
      })
    }

    return NextResponse.json({
      success: true,
      quote: {
        id: finalQuote.id,
        intervention_id: finalQuote.intervention_id,
        amount: finalQuote.amount,
        description: finalQuote.description,
        line_items: finalQuote.line_items,
        status: finalQuote.status,
        updated_at: finalQuote.updated_at
      },
      message: existingQuote ? 'Estimation modifiée avec succès' : 'Estimation soumise avec succès'
    })

  } catch (error) {
    logger.error({ error, message: error instanceof Error ? error.message : 'Unknown' }, "❌ Error in intervention-quote-submit API")

    return NextResponse.json({
      success: false,
      error: 'Erreur lors de la soumission de l\'estimation'
    }, { status: 500 })
  }
}
