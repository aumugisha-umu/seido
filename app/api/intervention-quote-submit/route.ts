import { NextRequest, NextResponse } from 'next/server'
import { notificationService } from '@/lib/notification-service'
import { Database } from '@/lib/database.types'
import { logger } from '@/lib/logger'
import { getApiAuthContext } from '@/lib/api-auth-helper'

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
    const {
      interventionId,
      laborCost,
      materialsCost = 0,
      description,
      estimatedDurationHours,
      providerAvailabilities = []
    } = body

    logger.info({
      interventionId,
      laborCost,
      materialsCost,
      hasDescription: !!description,
      availabilitiesCount: providerAvailabilities.length
    }, "📝 Quote submission data received")

    if (!interventionId || !laborCost || !description) {
      return NextResponse.json({
        success: false,
        error: 'interventionId, laborCost et description sont requis'
      }, { status: 400 })
    }

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

    // Check if intervention is in quote request status
    if (intervention.status !== 'demande_de_devis') {
      return NextResponse.json({
        success: false,
        error: `Un devis ne peut être soumis que pour les interventions en demande de devis (statut actuel: ${intervention.status})`
      }, { status: 400 })
    }

    // Check if a quote request exists for this provider
    const { data: existingQuote, error: quoteError } = await supabase
      .from('intervention_quotes')
      .select('*')
      .eq('intervention_id', interventionId)
      .eq('provider_id', user.id)
      .single()

    if (quoteError || !existingQuote) {
      logger.error({ quoteError, interventionId, providerId: user.id }, "❌ No existing quote found")
      return NextResponse.json({
        success: false,
        error: 'Aucune demande de devis trouvée pour ce prestataire'
      }, { status: 404 })
    }

    logger.info({ quoteId: existingQuote.id, currentStatus: existingQuote.status }, "✅ Found existing quote to update")

    // Validate costs
    const laborCostNum = parseFloat(laborCost)
    const materialsCostNum = parseFloat(materialsCost || 0)
    const totalAmount = laborCostNum + materialsCostNum

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

    logger.info({ laborCost: laborCostNum, materialsCost: materialsCostNum, totalAmount }, "💰 Quote costs validated")

    // Prepare line_items JSONB with breakdown
    const lineItems = [
      {
        description: 'Main d\'œuvre',
        quantity: estimatedDurationHours || 1,
        unit_price: laborCostNum / (estimatedDurationHours || 1),
        total: laborCostNum
      }
    ]

    if (materialsCostNum > 0) {
      lineItems.push({
        description: 'Matériaux',
        quantity: 1,
        unit_price: materialsCostNum,
        total: materialsCostNum
      })
    }

    // Update the existing quote
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
        error: 'Erreur lors de la mise à jour du devis'
      }, { status: 500 })
    }

    logger.info({ quoteId: updatedQuote.id }, "✅ Quote updated successfully")

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
        .select('user:users!user_id(id, name, email)')
        .eq('intervention_id', interventionId)
        .eq('role', 'gestionnaire')

      if (managers && managers.length > 0) {
        const notificationPromises = managers.map(async (manager) => {
          if (!manager.user) return
          return notificationService.createNotification({
            userId: manager.user.id,
            teamId: intervention.team_id,
            createdBy: user.id,
            type: 'intervention',
            priority: 'high',
            title: 'Nouveau devis reçu',
            message: `${user.name} a soumis un devis de ${totalAmount.toFixed(2)}€ pour l'intervention "${intervention.title}"`,
            isPersonal: true,
            metadata: {
              interventionId,
              interventionTitle: intervention.title,
              quoteId: updatedQuote.id,
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

    return NextResponse.json({
      success: true,
      quote: {
        id: updatedQuote.id,
        intervention_id: updatedQuote.intervention_id,
        amount: updatedQuote.amount,
        description: updatedQuote.description,
        line_items: updatedQuote.line_items,
        status: updatedQuote.status,
        updated_at: updatedQuote.updated_at
      },
      message: 'Devis soumis avec succès'
    })

  } catch (error) {
    logger.error({ error, message: error instanceof Error ? error.message : 'Unknown' }, "❌ Error in intervention-quote-submit API")

    return NextResponse.json({
      success: false,
      error: 'Erreur lors de la soumission du devis'
    }, { status: 500 })
  }
}
