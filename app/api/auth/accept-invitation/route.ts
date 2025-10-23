import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import { logger, logError } from '@/lib/logger'
import { acceptInvitationSchema, validateRequest, formatZodErrors } from '@/lib/validation/schemas'
// Client Supabase avec permissions admin
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!supabaseServiceRoleKey) {
  logger.warn({}, '⚠️ SUPABASE_SERVICE_ROLE_KEY not configured')
}

const supabaseAdmin = supabaseServiceRoleKey ? createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseServiceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
) : null

/**
 * ✅ NOUVEAU FLUX INVITATION (Token seul + Session)
 *
 * 1. Utilisateur clique sur lien d'invitation (/auth/callback?token={uuid}&type=invitation)
 * 2. Callback appelle cette API avec token seul
 * 3. Vérifie le token et récupère l'invitation
 * 4. Crée l'auth Supabase avec mot de passe temporaire
 * 5. Relie l'auth au profil existant (UPDATE users.auth_user_id)
 * 6. Génère une session (access_token + refresh_token)
 * 7. Retourne les tokens de session pour établissement client-side
 * 8. Callback redirige vers /auth/set-password avec session active
 */
export async function POST(request: Request) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Service non configuré' },
        { status: 503 }
      )
    }

    const body = await request.json()

    // ✅ ZOD VALIDATION
    const validation = validateRequest(acceptInvitationSchema, body)
    if (!validation.success) {
      logger.warn({ errors: formatZodErrors(validation.errors) }, '⚠️ [ACCEPT-INVITATION] Validation failed')
      return NextResponse.json({
        success: false,
        error: 'Données invalides',
        details: formatZodErrors(validation.errors)
      }, { status: 400 })
    }

    const validatedData = validation.data
    const { token, password } = validatedData // ✅ Token + password from validation

    logger.info({ token }, '🔍 [ACCEPT-INVITATION] Validating invitation token:')

    // ✅ ÉTAPE 1: Vérifier le token d'invitation (token seul suffit)
    const { data: invitation, error: invitationError } = await supabaseAdmin
      .from('user_invitations')
      .select('*')
      .eq('invitation_code', token)
      .eq('status', 'pending')
      .single()

    if (invitationError || !invitation) {
      logger.error({ invitationError: invitationError }, '❌ [ACCEPT-INVITATION] Invalid or expired token:')
      return NextResponse.json(
        { error: 'Token d\'invitation invalide ou expiré' },
        { status: 404 }
      )
    }

    // ✅ Récupérer l'email depuis l'invitation
    const email = invitation.email

    // ✅ Vérifier l'expiration
    if (new Date(invitation.expires_at) < new Date()) {
      logger.error({ invitation: invitation.expires_at }, '❌ [ACCEPT-INVITATION] Invitation expired:')
      return NextResponse.json(
        { error: 'Invitation expirée' },
        { status: 410 }
      )
    }

    logger.info({ invitation: invitation.id }, '✅ [ACCEPT-INVITATION] Invitation valid:')

    // ✅ ÉTAPE 2: Récupérer le profil utilisateur existant
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', invitation.user_id!)
      .single()

    if (profileError || !userProfile) {
      logger.error({ user: profileError }, '❌ [ACCEPT-INVITATION] User profile not found:')
      return NextResponse.json(
        { error: 'Profil utilisateur introuvable' },
        { status: 404 }
      )
    }

    logger.info({ user: userProfile.id }, '✅ [ACCEPT-INVITATION] User profile found:')

    // ✅ ÉTAPE 3: Créer l'auth Supabase avec mot de passe temporaire
    const tempPassword = crypto.randomUUID() // Mot de passe temporaire unique
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: tempPassword, // ✅ Mot de passe temporaire au lieu de generateLink
      email_confirm: true, // Confirmer l'email automatiquement
      user_metadata: {
        full_name: `${invitation.first_name} ${invitation.last_name}`,
        first_name: invitation.first_name,
        last_name: invitation.last_name,
        display_name: `${invitation.first_name} ${invitation.last_name}`,
        role: invitation.role,
        provider_category: invitation.provider_category,
        team_id: invitation.team_id,
        profile_id: userProfile.id // Relier au profil existant
      }
    })

    if (authError || !authData.user) {
      logger.error({ authError: authError }, '❌ [ACCEPT-INVITATION] Auth creation failed:')
      return NextResponse.json(
        { error: 'Erreur lors de la création du compte: ' + authError?.message },
        { status: 500 }
      )
    }

    logger.info({ user: authData.user.id }, '✅ [ACCEPT-INVITATION] Auth user created:')

    // ✅ ÉTAPE 4: Relier l'auth au profil existant
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        auth_user_id: authData.user.id,
        is_active: true
      })
      .eq('id', userProfile.id)

    if (updateError) {
      logger.error({ updateError: updateError }, '❌ [ACCEPT-INVITATION] Failed to link auth to profile:')
      // Tenter de supprimer l'auth créé pour éviter les orphelins
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { error: 'Erreur lors de la liaison du compte' },
        { status: 500 }
      )
    }

    logger.info({}, '✅ [ACCEPT-INVITATION] Auth linked to profile')

    // ✅ ÉTAPE 5: Se connecter avec le mot de passe temporaire pour obtenir une session
    // Note: On utilise le client admin pour se connecter (pas le client user)
    const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
      email: email,
      password: tempPassword // Utiliser le mot de passe temporaire créé à l'étape 3
    })

    if (signInError || !signInData?.session) {
      logger.error({ signInError: signInError }, '❌ [ACCEPT-INVITATION] Failed to sign in with temp password:')
      return NextResponse.json(
        { error: 'Erreur lors de la création de la session: ' + (signInError?.message || 'Session vide') },
        { status: 500 }
      )
    }

    logger.info({}, '✅ [ACCEPT-INVITATION] User signed in successfully with temp password')

    // ✅ ÉTAPE 6: Marquer l'invitation comme acceptée
    await supabaseAdmin
      .from('user_invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString()
      })
      .eq('id', invitation.id)

    logger.info({}, '✅ [ACCEPT-INVITATION] Invitation marked as accepted')

    // ✅ ÉTAPE 7: Retourner les tokens de session pour établissement client-side
    return NextResponse.json({
      success: true,
      message: 'Invitation acceptée avec succès',
      session: {
        access_token: signInData.session.access_token,
        refresh_token: signInData.session.refresh_token
      },
      userProfile: {
        id: userProfile.id,
        email: userProfile.email,
        name: userProfile.name,
        role: userProfile.role
      }
    })

  } catch (error) {
    logger.error({ error: error }, '❌ [ACCEPT-INVITATION] Unexpected error:')
    return NextResponse.json(
      { error: 'Erreur interne du serveur: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    )
  }
}
