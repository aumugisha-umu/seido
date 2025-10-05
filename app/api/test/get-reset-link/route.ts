/**
 * 🧪 API TEST - Récupérer le lien de réinitialisation de mot de passe
 *
 * Cette route permet aux tests E2E de récupérer le lien de reset
 * généré par Supabase pour un email donné.
 *
 * ⚠️  IMPORTANT: Cette route doit UNIQUEMENT être accessible en environnement de test
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { logger, logError } from '@/lib/logger'

export async function POST(request: NextRequest) {
  // ✅ SÉCURITÉ: Vérifier qu'on est bien en environnement de test
  if (process.env.NODE_ENV === 'production') {
    logger.error('🚨 [GET-RESET-LINK] Attempted access in production - BLOCKED')
    return NextResponse.json(
      { error: 'This endpoint is only available in development/test environments' },
      { status: 403 }
    )
  }

  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    logger.info('🧪 [GET-RESET-LINK] Generating reset link for:', email)

    // Créer client Supabase Admin
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    if (!supabaseUrl || !supabaseServiceKey) {
      logger.error('❌ [GET-RESET-LINK] Missing Supabase credentials')
      return NextResponse.json(
        { error: 'Supabase credentials not configured' },
        { status: 500 }
      )
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Vérifier que l'utilisateur existe
    const { data: authUser, error: getUserError } =
      await supabaseAdmin.auth.admin.getUserByEmail(email)

    if (getUserError || !authUser.user) {
      logger.warn('⚠️  [GET-RESET-LINK] User not found:', email)
      return NextResponse.json(
        { error: 'User not found', resetLink: null },
        { status: 404 }
      )
    }

    logger.info('✅ [GET-RESET-LINK] User found:', authUser.user.id)

    // Générer le lien de réinitialisation
    const { data: linkData, error: linkError } =
      await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email: email,
      })

    if (linkError) {
      logger.error('❌ [GET-RESET-LINK] Error generating link:', linkError)
      return NextResponse.json(
        { error: 'Failed to generate reset link' },
        { status: 500 }
      )
    }

    logger.info('✅ [GET-RESET-LINK] Link generated successfully')

    // Extraire l'action_link depuis les propriétés
    // Supabase génère directement un lien avec tous les tokens nécessaires
    const properties = linkData.properties as {
      action_link?: string
      email_otp?: string
      hashed_token?: string
      redirect_to?: string
      verification_type?: string
    }

    const actionLink = properties?.action_link

    if (!actionLink) {
      logger.error(
        '❌ [GET-RESET-LINK] No action_link in response:',
        linkData
      )
      return NextResponse.json(
        { error: 'Failed to extract reset link' },
        { status: 500 }
      )
    }

    logger.info('🔗 [GET-RESET-LINK] Reset URL (action_link):', actionLink)

    // Le action_link de Supabase pointe vers leur URL avec redirect
    // Pour les tests, on peut rediriger directement vers /auth/update-password
    // en extrayant les tokens du hash

    // Parser l'URL action_link pour extraire les tokens
    try {
      const actionUrl = new URL(actionLink)
      const hash = actionUrl.hash

      // Le hash contient: #access_token=...&refresh_token=...&type=recovery
      // On veut rediriger vers notre page avec ces tokens
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
      const resetUrl = `${baseUrl}/auth/update-password${hash}`

      logger.info('🔗 [GET-RESET-LINK] Final reset URL:', resetUrl)

      return NextResponse.json({
        success: true,
        resetLink: resetUrl,
        email: email,
      })
    } catch (error) {
      // Fallback: retourner action_link tel quel
      logger.warn('⚠️ [GET-RESET-LINK] Could not parse action_link, using as-is')
      return NextResponse.json({
        success: true,
        resetLink: actionLink,
        email: email,
      })
    }
  } catch (error) {
    logger.error('❌ [GET-RESET-LINK] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
