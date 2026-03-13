import { NextRequest, NextResponse } from 'next/server'
import { createServerUserService } from '@/lib/services'
import { logger } from '@/lib/logger'
import { EMAIL_CONFIG } from '@/lib/email/resend-client'
import { getApiAuthContext } from '@/lib/api-auth-helper'
import { getServiceRoleClient, isServiceRoleAvailable } from '@/lib/api-service-role-helper'
import { createProviderAccountSchema, validateRequest, formatZodErrors } from '@/lib/validation/schemas'

export async function POST(request: NextRequest) {
  logger.info({}, "✅ create-provider-account API route called")

  try {
    // ✅ AUTH: Route publique pour magic links, mais vérification token ci-dessous
    // Note: Cette route vérifie le magicLinkToken, pas besoin d'auth utilisateur standard
    const authResult = await getApiAuthContext({ fetchProfile: false })
    // On vérifie juste la session, pas le profil (car nouveau compte)

    if (!isServiceRoleAvailable()) {
      return NextResponse.json({
        success: false,
        error: 'Service de création de compte non configuré'
      }, { status: 503 })
    }

    const supabaseAdmin = getServiceRoleClient()
    const { supabase } = authResult.success ? authResult.data : { supabase: null }

    // Initialize services
    const userService = await createServerUserService()

    // Parse request body
    const body = await request.json()

    // ✅ ZOD VALIDATION
    const validation = validateRequest(createProviderAccountSchema, body)
    if (!validation.success) {
      logger.warn({ errors: formatZodErrors(validation.errors) }, '⚠️ [CREATE-PROVIDER-ACCOUNT] Validation failed')
      return NextResponse.json({
        success: false,
        error: 'Données invalides',
        details: formatZodErrors(validation.errors)
      }, { status: 400 })
    }

    const validatedData = validation.data
    const {
      email,
      magicLinkToken,
      interventionId
    } = validatedData

    logger.info({ email: email }, "📝 Creating provider account for:")

    // Verify magic link exists and is valid
    const { data: magicLink, error: magicLinkError } = await supabase
      .from('intervention_magic_links')
      .select(`
        *,
        intervention:intervention_id(id, title, team_id)
      `)
      .eq('token', magicLinkToken)
      .eq('provider_email', email)
      .eq('intervention_id', interventionId)
      .single()

    if (magicLinkError || !magicLink) {
      logger.error({ magicLinkError: magicLinkError }, "❌ Magic link not found:")
      return NextResponse.json({
        success: false,
        error: 'Lien magique invalide ou expiré'
      }, { status: 404 })
    }

    // Check if magic link has expired
    const now = new Date()
    const expiresAt = new Date(magicLink.expires_at)

    if (expiresAt < now) {
      return NextResponse.json({
        success: false,
        error: 'Ce lien a expiré'
      }, { status: 410 })
    }

    // Check if provider already has an account
    if (magicLink.provider_id) {
      return NextResponse.json({
        success: true,
        message: 'Le compte existe déjà',
        accountExists: true,
        userId: magicLink.provider_id
      })
    }

    // Check if user already exists in our system
    const existingUserResult = await userService.findByEmail(email)
    const existingUser = existingUserResult?.data ?? null
    if (existingUser) {
      // Link existing user to magic link
      await supabase
        .from('intervention_magic_links')
        .update({
          provider_id: existingUser.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', magicLink.id)

      return NextResponse.json({
        success: true,
        message: 'Compte existant lié avec succès',
        accountExists: true,
        userId: existingUser.id
      })
    }

    // Generate a temporary password for the account
    const tempPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12)

    logger.info({}, "🔑 Creating auth user...")

    // Create auth user with admin client
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: tempPassword,
      email_confirm: true, // Auto-confirm email for magic link users
      user_metadata: {
        full_name: `Prestataire ${email.split('@')[0]}`,
        role: 'prestataire',
        provider_category: 'prestataire',
        created_via_magic_link: true,
        magic_link_token: magicLinkToken
      }
    })

    if (authError || !authData.user) {
      logger.error({ error: authError }, "❌ Error creating auth user:")
      return NextResponse.json({
        success: false,
        error: 'Erreur lors de la création du compte: ' + (authError?.message || 'Unknown error')
      }, { status: 500 })
    }

    logger.info({ user: authData.user.id }, "✅ Auth user created:")

    // Create user profile in our database
    const userProfile = await userService.create({
      auth_user_id: authData.user.id,
      email: email,
      name: `Prestataire ${email.split('@')[0]}`, // Default name, can be updated later
      role: 'prestataire' as Database['public']['Enums']['user_role'],
      provider_category: 'prestataire' as Database['public']['Enums']['provider_category'],
      team_id: magicLink.intervention.team_id, // Add to intervention team
      is_active: true
    })

    logger.info({ user: userProfile.id }, "✅ User profile created:")

    // Update magic link with provider ID
    await supabase
      .from('intervention_magic_links')
      .update({
        provider_id: userProfile.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', magicLink.id)

    // Add provider to intervention viaintervention_assignments
    await supabase
      .from('intervention_assignments')
      .upsert({
        intervention_id: interventionId,
        user_id: userProfile.id,
        role: 'prestataire',
        is_primary: false, // Not primary, added via magic link
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'intervention_id,user_id,role'
      })

    logger.info({}, "✅ Provider added to intervention contacts")

    // Send magic link for password setup (they can change password later)
    try {
      const { error: magicLinkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email: email,
        redirectTo: `${EMAIL_CONFIG.appUrl}/auth/reset-password`
      })

      if (magicLinkError) {
        logger.warn({ magicLinkError: magicLinkError }, "⚠️ Could not generate password reset link:")
      } else {
        logger.info({}, "✅ Password reset link generated")
      }
    } catch (linkError) {
      logger.warn({ error: linkError }, "⚠️ Error generating password reset link:")
    }

    return NextResponse.json({
      success: true,
      message: 'Compte créé avec succès',
      accountExists: false,
      userId: userProfile.id,
      authUserId: authData.user.id,
      tempPasswordGenerated: true
    })

  } catch (error) {
    logger.error({ error: error }, "❌ Error in create-provider-account API:")
    logger.error({
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack',
    }, "❌ Error details:")

    return NextResponse.json({
      success: false,
      error: 'Erreur lors de la création du compte'
    }, { status: 500 })
  }
}
