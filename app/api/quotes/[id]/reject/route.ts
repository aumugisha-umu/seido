import { NextRequest, NextResponse, after } from 'next/server'
import { logger } from '@/lib/logger'
import { getApiAuthContext } from '@/lib/api-auth-helper'
import { quoteRejectSchema, validateRequest, formatZodErrors } from '@/lib/validation/schemas'
import { createEmailNotificationService } from '@/lib/services/domain/email-notification.service'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // ✅ AUTH: 29 lignes → 3 lignes! (uniformisation createServerSupabaseClient → getApiAuthContext)
    const authResult = await getApiAuthContext()
    if (!authResult.success) return authResult.error

    const { supabase, userProfile: userData } = authResult.data

    const body = await request.json()
    const { id } = await params

    // ✅ ZOD VALIDATION
    const validation = validateRequest(quoteRejectSchema, body)
    if (!validation.success) {
      logger.warn({ errors: formatZodErrors(validation.errors) }, '⚠️ [QUOTE-REJECT] Validation failed')
      return NextResponse.json({
        success: false,
        error: 'Données invalides',
        details: formatZodErrors(validation.errors)
      }, { status: 400 })
    }

    const validatedData = validation.data
    const { reason } = validatedData

    // Récupérer le devis par ID seulement
    const { data: quote, error: quoteError } = await supabase
      .from('intervention_quotes')
      .select('*')
      .eq('id', id)
      .single()

    if (quoteError || !quote) {
      return NextResponse.json({
        error: 'Devis non trouvé'
      }, { status: 404 })
    }

    // Vérifier que le devis est en attente (validation JavaScript)
    const isPending = quote.status === 'pending' || quote.status === 'En attente'
    if (!isPending) {
      return NextResponse.json({
        error: `Ce devis a déjà été traité (statut: ${quote.status})`
      }, { status: 400 })
    }

    // Mettre à jour le devis pour le rejeter
    const { error: rejectError } = await supabase
      .from('intervention_quotes')
      .update({
        status: 'rejected',
        validated_at: new Date().toISOString(),
        validated_by: userData.id,
        rejection_reason: reason.trim()
      })
      .eq('id', id)

    if (rejectError) {
      logger.error({ rejectError: rejectError }, 'Erreur lors du rejet du devis:')
      return NextResponse.json({
        error: 'Erreur lors du rejet du devis'
      }, { status: 500 })
    }

    // Send email to provider (via after())
    {
      // Capture variables for after() closure
      const emailQuote = { ...quote }
      const emailManager = { ...userData }
      const emailReason = reason.trim()
      const emailProviderId = quote.provider_id
      const emailInterventionId = quote.intervention_id

      after(async () => {
        try {
          const { createEmailNotificationService } = await import('@/lib/services/domain/email-notification.service')
          const { createServerSupabaseClient } = await import('@/lib/services')

          const emailService = await createEmailNotificationService()
          const supabaseClient = await createServerSupabaseClient()

          // Get provider and intervention
          const { data: provider } = await supabaseClient
            .from('users')
            .select('id, email, first_name, last_name, company_name')
            .eq('id', emailProviderId)
            .single()

          const { data: intervention } = await supabaseClient
            .from('interventions')
            .select(`
              *,
              lot_id,
              building_id,
              lots(buildings(address, city)),
              buildings(address, city)
            `)
            .eq('id', emailInterventionId)
            .single()

          if (provider && intervention) {
            // Get property address
            let propertyAddress = 'Adresse non spécifiée'
            if (intervention.lot_id && intervention.lots) {
              const lot = intervention.lots as any
              const building = lot.buildings
              propertyAddress = building ? `${building.address}, ${building.city}` : propertyAddress
            } else if (intervention.building_id && intervention.buildings) {
              const building = intervention.buildings as any
              propertyAddress = `${building.address}, ${building.city}`
            }

            await emailService.sendQuoteRejected({
              quote: emailQuote,
              intervention: intervention as any,
              property: { address: propertyAddress },
              manager: emailManager,
              provider,
              rejectionReason: emailReason,
              canResubmit: false,
            })
            logger.info({ quoteId: emailQuote.id }, '📧 [API] Quote rejected email sent (via after())')
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
      message: 'Devis rejeté avec succès'
    })

  } catch (error) {
    logger.error({ error: error }, 'Erreur API:')
    return NextResponse.json({
      error: 'Erreur interne du serveur'
    }, { status: 500 })
  }
}