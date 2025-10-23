import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { getApiAuthContext } from '@/lib/api-auth-helper'
import { quoteRejectSchema, validateRequest, formatZodErrors } from '@/lib/validation/schemas'

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