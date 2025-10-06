import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/lib/database.types'
import { logger, logError } from '@/lib/logger'
// TODO: Initialize services for new architecture
// Example: const userService = await createServerUserService()
// Remember to make your function async if it isn't already


interface RouteParams {
  params: Promise<{
    id: string
  }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const resolvedParams = await params
  logger.info({ resolvedParams: resolvedParams.id }, "✅ quote-requests/[id] GET API route called for ID:")

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

    // Get current user from database
    const user = await userService.findByAuthUserId(authUser.id)
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Utilisateur non trouvé'
      }, { status: 404 })
    }

    // Get quote request with related data
    const { data: quoteRequest, error: quoteRequestError } = await supabase
      .from('quote_requests_with_details')
      .select('*')
      .eq('id', resolvedParams.id)
      .single()

    if (quoteRequestError || !quoteRequest) {
      logger.error({ quoteRequestError: quoteRequestError }, "❌ Quote request not found:")
      return NextResponse.json({
        success: false,
        error: 'Demande de devis non trouvée'
      }, { status: 404 })
    }

    // Check authorization - provider can view their own request, managers can view team requests
    const canView =
      (user.role === 'prestataire' && quoteRequest.provider_id === user.id) ||
      (user.role === 'gestionnaire' && user.team_id === quoteRequest.team_id)

    if (!canView) {
      return NextResponse.json({
        success: false,
        error: 'Vous n\'êtes pas autorisé à consulter cette demande de devis'
      }, { status: 403 })
    }

    // If provider is viewing their own request, mark it as viewed
    if (user.role === 'prestataire' && quoteRequest.provider_id === user.id && quoteRequest.status === 'sent') {
      const { error: markViewedError } = await supabase.rpc('mark_quote_request_as_viewed', {
        request_id: resolvedParams.id
      })

      if (markViewedError) {
        logger.warn({ markViewedError: markViewedError }, "⚠️ Could not mark quote request as viewed:")
      } else {
        logger.info({}, "✅ Quote request marked as viewed")
      }
    }

    return NextResponse.json({
      success: true,
      quoteRequest
    })

  } catch (error) {
    logger.error({ error: error }, "❌ Error in quote-requests/[id] GET API:")
    return NextResponse.json({
      success: false,
      error: 'Erreur lors de la récupération de la demande de devis'
    }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const resolvedParams = await params
  logger.info({ resolvedParams: resolvedParams.id }, "✅ quote-requests/[id] PATCH API route called for ID:")

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
    const { action, ...updateData } = body

    // Get current user from database
    const user = await userService.findByAuthUserId(authUser.id)
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Utilisateur non trouvé'
      }, { status: 404 })
    }

    // Get quote request
    const { data: quoteRequest, error: quoteRequestError } = await supabase
      .from('quote_requests')
      .select(`
        *,
        intervention:intervention_id(team_id)
      `)
      .eq('id', resolvedParams.id)
      .single()

    if (quoteRequestError || !quoteRequest) {
      return NextResponse.json({
        success: false,
        error: 'Demande de devis non trouvée'
      }, { status: 404 })
    }

    // Check authorization - only managers of the intervention team can modify requests
    if (user.role !== 'gestionnaire' || user.team_id !== quoteRequest.intervention.team_id) {
      return NextResponse.json({
        success: false,
        error: 'Seuls les gestionnaires de l\'équipe peuvent modifier cette demande'
      }, { status: 403 })
    }

    let updateFields = {}

    // Handle specific actions
    if (action === 'cancel') {
      updateFields = {
        status: 'cancelled',
        updated_at: new Date().toISOString()
      }
    } else if (action === 'resend') {
      // Only allow resending of cancelled or expired requests
      if (!['cancelled', 'expired'].includes(quoteRequest.status)) {
        return NextResponse.json({
          success: false,
          error: 'Seules les demandes annulées ou expirées peuvent être renvoyées'
        }, { status: 400 })
      }

      updateFields = {
        status: 'sent',
        sent_at: new Date().toISOString(),
        viewed_at: null,
        responded_at: null,
        updated_at: new Date().toISOString()
      }
    } else {
      // General update
      updateFields = {
        ...updateData,
        updated_at: new Date().toISOString()
      }
    }

    // Update quote request
    const { data: updatedRequest, error: updateError } = await supabase
      .from('quote_requests')
      .update(updateFields)
      .eq('id', resolvedParams.id)
      .select('*')
      .single()

    if (updateError) {
      logger.error({ error: updateError }, "❌ Error updating quote request:")
      return NextResponse.json({
        success: false,
        error: 'Erreur lors de la modification de la demande de devis'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      quoteRequest: updatedRequest,
      message: action === 'cancel'
        ? 'Demande de devis annulée'
        : action === 'resend'
        ? 'Demande de devis renvoyée'
        : 'Demande de devis mise à jour'
    })

  } catch (error) {
    logger.error({ error: error }, "❌ Error in quote-requests/[id] PATCH API:")
    return NextResponse.json({
      success: false,
      error: 'Erreur lors de la modification de la demande de devis'
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const resolvedParams = await params
  logger.info({ resolvedParams: resolvedParams.id }, "✅ quote-requests/[id] DELETE API route called for ID:")

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

    // Get current user from database
    const user = await userService.findByAuthUserId(authUser.id)
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Utilisateur non trouvé'
      }, { status: 404 })
    }

    // Get quote request
    const { data: quoteRequest, error: quoteRequestError } = await supabase
      .from('quote_requests')
      .select(`
        *,
        intervention:intervention_id(team_id)
      `)
      .eq('id', resolvedParams.id)
      .single()

    if (quoteRequestError || !quoteRequest) {
      return NextResponse.json({
        success: false,
        error: 'Demande de devis non trouvée'
      }, { status: 404 })
    }

    // Check authorization - only managers of the intervention team can delete requests
    if (user.role !== 'gestionnaire' || user.team_id !== quoteRequest.intervention.team_id) {
      return NextResponse.json({
        success: false,
        error: 'Seuls les gestionnaires de l\'équipe peuvent supprimer cette demande'
      }, { status: 403 })
    }

    // Check if quote request has been responded to
    if (quoteRequest.status === 'responded') {
      return NextResponse.json({
        success: false,
        error: 'Impossible de supprimer une demande de devis qui a reçu une réponse'
      }, { status: 400 })
    }

    // Delete quote request (CASCADE will handle related data)
    const { error: deleteError } = await supabase
      .from('quote_requests')
      .delete()
      .eq('id', resolvedParams.id)

    if (deleteError) {
      logger.error({ error: deleteError }, "❌ Error deleting quote request:")
      return NextResponse.json({
        success: false,
        error: 'Erreur lors de la suppression de la demande de devis'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Demande de devis supprimée'
    })

  } catch (error) {
    logger.error({ error: error }, "❌ Error in quote-requests/[id] DELETE API:")
    return NextResponse.json({
      success: false,
      error: 'Erreur lors de la suppression de la demande de devis'
    }, { status: 500 })
  }
}