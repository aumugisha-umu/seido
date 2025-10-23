import { NextRequest, NextResponse } from 'next/server'
import { Database } from '@/lib/database.types'
import { logger, logError } from '@/lib/logger'
import { getApiAuthContext } from '@/lib/api-auth-helper'


interface RouteParams {
  params: Promise<{
    id: string
  }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const resolvedParams = await params
  logger.info({ resolvedParams: resolvedParams.id }, "✅ intervention/[id]/quote-requests GET API route called for intervention:")

  try {
    // ✅ AUTH: 50 lignes → 3 lignes! (any authenticated user) + BUG FIX: userService was undefined!
    const authResult = await getApiAuthContext()
    if (!authResult.success) return authResult.error

    const { supabase, userProfile: user } = authResult.data

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Utilisateur non trouvé'
      }, { status: 404 })
    }

    // Get intervention to check permissions
    const { data: intervention, error: interventionError } = await supabase
      .from('interventions')
      .select('id, team_id, tenant_id')
      .eq('id', resolvedParams.id)
      .single()

    if (interventionError || !intervention) {
      return NextResponse.json({
        success: false,
        error: 'Intervention non trouvée'
      }, { status: 404 })
    }

    // Check authorization
    const canAccess =
      // Gestionnaires of the team
      (user.role === 'gestionnaire' && user.team_id === intervention.team_id) ||
      // Tenant who created the intervention
      (user.role === 'locataire' && user.id === intervention.tenant_id) ||
      // Prestataires assigned to this intervention (handled by RLS)
      user.role === 'prestataire'

    if (!canAccess) {
      return NextResponse.json({
        success: false,
        error: 'Vous n\'êtes pas autorisé à consulter les demandes de devis de cette intervention'
      }, { status: 403 })
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const includeQuotes = searchParams.get('includeQuotes') === 'true'

    // Build query for quote requests
    let query = supabase
      .from('quote_requests_with_details')
      .select('*')
      .eq('intervention_id', params.id)

    // Filter by status if provided
    if (status) {
      query = query.eq('status', status)
    }

    // If user is a provider, only show their own requests
    if (user.role === 'prestataire') {
      query = query.eq('provider_id', user.id)
    }

    // Order by creation date
    query = query.order('sent_at', { ascending: false })

    const { data: quoteRequests, error: queryError } = await query

    if (queryError) {
      logger.error({ error: queryError }, "❌ Error fetching quote requests:")
      return NextResponse.json({
        success: false,
        error: 'Erreur lors de la récupération des demandes de devis'
      }, { status: 500 })
    }

    const result = {
      success: true,
      quoteRequests: quoteRequests || []
    }

    // Optionally include associated quotes
    if (includeQuotes && quoteRequests && quoteRequests.length > 0) {
      const { data: quotes, error: quotesError } = await supabase
        .from('intervention_quotes')
        .select(`
          *,
          provider:provider_id(id, name, email, provider_category)
        `)
        .eq('intervention_id', resolvedParams.id)
        .in('provider_id', quoteRequests.map(qr => qr.provider_id))

      if (!quotesError) {
        result.quotes = quotes || []
      } else {
        logger.warn({ quotesError: quotesError }, "⚠️ Could not fetch associated quotes:")
      }

      // Also include availabilities if requested
      const { data: availabilities, error: availError } = await supabase
        .from('user_availabilities')
        .select(`
          *,
          user:user_id(id, name)
        `)
        .eq('intervention_id', resolvedParams.id)
        .in('user_id', quoteRequests.map(qr => qr.provider_id))
        .not('quote_request_id', 'is', null) // Only availabilities linked to quote requests

      if (!availError) {
        result.availabilities = availabilities || []
      } else {
        logger.warn({ availError: availError }, "⚠️ Could not fetch associated availabilities:")
      }
    }

    // Add summary statistics
    const stats = {
      total: quoteRequests?.length || 0,
      sent: quoteRequests?.filter(qr => qr.status === 'sent').length || 0,
      viewed: quoteRequests?.filter(qr => qr.status === 'viewed').length || 0,
      responded: quoteRequests?.filter(qr => qr.status === 'responded').length || 0,
      expired: quoteRequests?.filter(qr => qr.status === 'expired').length || 0,
      cancelled: quoteRequests?.filter(qr => qr.status === 'cancelled').length || 0
    }

    result.stats = stats

    return NextResponse.json(result)

  } catch (error) {
    logger.error({ error: error }, "❌ Error in intervention/[id]/quote-requests GET API:")
    return NextResponse.json({
      success: false,
      error: 'Erreur lors de la récupération des demandes de devis'
    }, { status: 500 })
  }
}