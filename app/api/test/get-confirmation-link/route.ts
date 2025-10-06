/**
 * 🔗 API TEST - Récupérer le lien de confirmation
 *
 * Route API pour récupérer le lien de confirmation d'un utilisateur pour les tests E2E
 * ⚠️ À UTILISER UNIQUEMENT EN ENVIRONNEMENT DE TEST
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin, isAdminConfigured } from '@/lib/services/core/supabase-admin'
import { logger, logError } from '@/lib/logger'

/**
 * POST /api/test/get-confirmation-link
 *
 * Body: { email: string }
 */
export async function POST(request: NextRequest) {
  // ⚠️ SÉCURITÉ: Vérifier qu'on est en environnement de test
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Not allowed in production' },
      { status: 403 }
    )
  }

  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Vérifier que c'est bien un email de test
    if (!email.includes('@seido-test.com') && !email.includes('test-')) {
      return NextResponse.json(
        { error: 'Only test emails allowed' },
        { status: 400 }
      )
    }

    logger.info({ email: email }, '🔍 [GET-CONFIRMATION-LINK] Fetching confirmation link for:')

    // Vérifier que le service admin est configuré
    if (!isAdminConfigured()) {
      logger.error({}, '❌ [GET-CONFIRMATION-LINK] Admin service not configured')
      return NextResponse.json(
        { error: 'Admin service not configured' },
        { status: 500 }
      )
    }

    const supabaseAdmin = getSupabaseAdmin()!

    // Récupérer l'utilisateur
    const { data: authUsers, error: authListError } = await supabaseAdmin.auth.admin.listUsers()

    if (authListError) {
      logger.error({ user: authListError }, '❌ [GET-CONFIRMATION-LINK] Failed to list auth users:')
      return NextResponse.json(
        { error: 'Failed to list users' },
        { status: 500 }
      )
    }

    const authUser = authUsers.users.find((u) => u.email === email)

    if (!authUser) {
      logger.warn({ user: email }, '⚠️  [GET-CONFIRMATION-LINK] User not found:')
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    logger.info({
      id: authUser.id,
      email: authUser.email,
      confirmed: !!authUser.email_confirmed_at,
    }, '✅ [GET-CONFIRMATION-LINK] User found:')

    // Si déjà confirmé, pas besoin de lien
    if (authUser.email_confirmed_at) {
      logger.info({}, '✅ [GET-CONFIRMATION-LINK] Email already confirmed')
      return NextResponse.json({
        confirmed: true,
        confirmationLink: null,
        message: 'Email already confirmed',
      })
    }

    // Générer un lien de confirmation via admin.generateLink()
    logger.info({}, '🔧 [GET-CONFIRMATION-LINK] Generating confirmation link...')

    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'signup',
      email: authUser.email!,
    })

    if (linkError || !linkData) {
      logger.error({ linkError: linkError }, '❌ [GET-CONFIRMATION-LINK] Failed to generate link:')
      return NextResponse.json(
        { error: 'Failed to generate confirmation link' },
        { status: 500 }
      )
    }

    // Extraire le hashed_token et construire l'URL
    const properties = linkData.properties as any
    const hashedToken = properties?.hashed_token
    const actionLink = properties?.action_link

    // Construire l'URL de confirmation interne
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const confirmationUrl = hashedToken
      ? `${baseUrl}/auth/confirm?token_hash=${hashedToken}&type=email`
      : actionLink

    logger.info({ confirmationUrl: confirmationUrl }, '🔗 [GET-CONFIRMATION-LINK] Confirmation link generated:')

    return NextResponse.json({
      confirmed: false,
      confirmationLink: confirmationUrl,
      userId: authUser.id,
      email: authUser.email,
    })
  } catch (error) {
    logger.error({ error: error }, '❌ [GET-CONFIRMATION-LINK] Unexpected error:')
    return NextResponse.json(
      {
        error: 'Failed to get confirmation link',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
