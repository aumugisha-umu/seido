import { NextRequest, NextResponse } from 'next/server'
import { createServerActionSupabaseClient } from '@/lib/services/core/supabase-client'
import { logger } from '@/lib/logger'

/**
 * Callback route for impersonation magic links
 *
 * Receives the token_hash from the magic link and verifies it
 * to establish a session for the target user.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const tokenHash = searchParams.get('token_hash')
  const next = searchParams.get('next') || '/gestionnaire/dashboard'

  logger.info('[IMPERSONATE-CALLBACK] Processing callback', {
    hasToken: !!tokenHash,
    next
  })

  // Validate token_hash presence
  if (!tokenHash) {
    logger.error('[IMPERSONATE-CALLBACK] Missing token_hash')
    return NextResponse.redirect(
      new URL('/auth/login?error=missing_token&message=Token+manquant', request.url)
    )
  }

  try {
    // Create supabase client that can set cookies
    const supabase = await createServerActionSupabaseClient()

    // Verify the OTP token
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: 'magiclink'
    })

    if (error) {
      logger.error('[IMPERSONATE-CALLBACK] OTP verification failed:', {
        message: error.message,
        status: error.status
      })
      return NextResponse.redirect(
        new URL(`/auth/login?error=invalid_token&message=${encodeURIComponent(error.message)}`, request.url)
      )
    }

    if (!data.session || !data.user) {
      logger.error('[IMPERSONATE-CALLBACK] No session returned after OTP verification')
      return NextResponse.redirect(
        new URL('/auth/login?error=no_session&message=Session+non+etablie', request.url)
      )
    }

    logger.info('[IMPERSONATE-CALLBACK] Session established successfully', {
      userId: data.user.id,
      email: data.user.email,
      role: data.user.user_metadata?.role
    })

    // Redirect to the target page
    return NextResponse.redirect(new URL(next, request.url))

  } catch (error) {
    logger.error('[IMPERSONATE-CALLBACK] Exception:', error)
    return NextResponse.redirect(
      new URL('/auth/login?error=exception&message=Erreur+interne', request.url)
    )
  }
}
