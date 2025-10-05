import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import { logger, logError } from '@/lib/logger'
// Client Supabase avec permissions admin
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!supabaseServiceRoleKey) {
  logger.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY not configured')
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
    const { token } = body // ✅ Token seul, pas besoin d'email

    logger.info('🔍 [ACCEPT-INVITATION] Validating invitation token:', { token })

    // ✅ ÉTAPE 1: Vérifier le token d'invitation (token seul suffit)
    const { data: invitation, error: invitationError } = await supabaseAdmin
      .from('user_invitations')
      .select('*')
      .eq('invitation_code', token)
      .eq('status', 'pending')
      .single()

    if (invitationError || !invitation) {
      logger.error('❌ [ACCEPT-INVITATION] Invalid or expired token:', invitationError)
      return NextResponse.json(
        { error: 'Token d\'invitation invalide ou expiré' },
        { status: 404 }
      )
    }

    // ✅ Récupérer l'email depuis l'invitation
    const email = invitation.email

    // ✅ Vérifier l'expiration
    if (new Date(invitation.expires_at) < new Date()) {
      logger.error('❌ [ACCEPT-INVITATION] Invitation expired:', invitation.expires_at)
      return NextResponse.json(
        { error: 'Invitation expirée' },
        { status: 410 }
      )
    }

    logger.info('✅ [ACCEPT-INVITATION] Invitation valid:', invitation.id)

    // ✅ ÉTAPE 2: Récupérer le profil utilisateur existant
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', invitation.user_id!)
      .single()

    if (profileError || !userProfile) {
      logger.error('❌ [ACCEPT-INVITATION] User profile not found:', profileError)
      return NextResponse.json(
        { error: 'Profil utilisateur introuvable' },
        { status: 404 }
      )
    }

    logger.info('✅ [ACCEPT-INVITATION] User profile found:', userProfile.id)

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
      logger.error('❌ [ACCEPT-INVITATION] Auth creation failed:', authError)
      return NextResponse.json(
        { error: 'Erreur lors de la création du compte: ' + authError?.message },
        { status: 500 }
      )
    }

    logger.info('✅ [ACCEPT-INVITATION] Auth user created:', authData.user.id)

    // ✅ ÉTAPE 4: Relier l'auth au profil existant
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        auth_user_id: authData.user.id,
        is_active: true
      })
      .eq('id', userProfile.id)

    if (updateError) {
      logger.error('❌ [ACCEPT-INVITATION] Failed to link auth to profile:', updateError)
      // Tenter de supprimer l'auth créé pour éviter les orphelins
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { error: 'Erreur lors de la liaison du compte' },
        { status: 500 }
      )
    }

    logger.info('✅ [ACCEPT-INVITATION] Auth linked to profile')

    // ✅ ÉTAPE 5: Se connecter avec le mot de passe temporaire pour obtenir une session
    // Note: On utilise le client admin pour se connecter (pas le client user)
    const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
      email: email,
      password: tempPassword // Utiliser le mot de passe temporaire créé à l'étape 3
    })

    if (signInError || !signInData?.session) {
      logger.error('❌ [ACCEPT-INVITATION] Failed to sign in with temp password:', signInError)
      return NextResponse.json(
        { error: 'Erreur lors de la création de la session: ' + (signInError?.message || 'Session vide') },
        { status: 500 }
      )
    }

    logger.info('✅ [ACCEPT-INVITATION] User signed in successfully with temp password')

    // ✅ ÉTAPE 6: Marquer l'invitation comme acceptée
    await supabaseAdmin
      .from('user_invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString()
      })
      .eq('id', invitation.id)

    logger.info('✅ [ACCEPT-INVITATION] Invitation marked as accepted')

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
    logger.error('❌ [ACCEPT-INVITATION] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    )
  }
}
