import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/lib/database.types'
import { logger, logError } from '@/lib/logger'
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const resolvedParams = await params
    const token = resolvedParams.token

    if (!token) {
      return NextResponse.json({
        success: false,
        error: 'Token manquant'
      }, { status: 400 })
    }

    // Initialize Supabase client (no auth required for magic links)
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

    logger.info({ token: token.substring(0, 8) + '...' }, "🔍 Looking up magic link for token")

    // Fetch magic link with related data
    const { data: magicLink, error: magicLinkError } = await supabase
      .from('intervention_magic_links')
      .select(`
        *,
        intervention:intervention_id(
          id,
          reference,
          title,
          description,
          type,
          urgency,
          status,
          created_at,
          quote_deadline,
          quote_notes,
          lot:lot_id(
            id,
            reference,
            building:building_id(
              name,
              address,
              city,
              postal_code
            )
          )
        )
      `)
      .eq('token', token)
      .single()

    if (magicLinkError || !magicLink) {
      logger.error({ magicLinkError: magicLinkError }, "❌ Magic link not found:")
      return NextResponse.json({
        success: false,
        error: 'Lien non trouvé ou invalide'
      }, { status: 404 })
    }

    // Check if magic link has expired
    const now = new Date()
    const expiresAt = new Date(magicLink.expires_at)

    if (expiresAt < now) {
      // Update status to expired
      await supabase
        .from('intervention_magic_links')
        .update({
          status: 'expired',
          updated_at: new Date().toISOString()
        })
        .eq('id', magicLink.id)

      return NextResponse.json({
        success: false,
        error: 'Ce lien a expiré'
      }, { status: 410 })
    }

    // Mark as accessed if first time
    if (magicLink.status === 'pending') {
      await supabase
        .from('intervention_magic_links')
        .update({
          status: 'accessed',
          accessed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', magicLink.id)
    }

    // Check if provider already submitted a quote
    let existingQuote = null
    if (magicLink.provider_email) {
      const { data: quote } = await supabase
        .from('intervention_quotes')
        .select('*')
        .eq('intervention_id', magicLink.intervention_id)
        .eq('provider_id', magicLink.provider_id)
        .single()

      existingQuote = quote
    }

    logger.info({}, "✅ Magic link found and validated")

    return NextResponse.json({
      success: true,
      data: {
        ...magicLink,
        existingQuote
      }
    })

  } catch (error) {
    logger.error({ error: error }, "❌ Error in magic-link API:")
    return NextResponse.json({
      success: false,
      error: 'Erreur interne du serveur'
    }, { status: 500 })
  }
}