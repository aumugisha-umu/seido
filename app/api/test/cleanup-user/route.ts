/**
 * 🧹 API CLEANUP - Nettoyer les utilisateurs de test
 *
 * Route API pour supprimer les utilisateurs de test après les tests E2E
 * ⚠️ À UTILISER UNIQUEMENT EN ENVIRONNEMENT DE TEST
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin, isAdminConfigured } from '@/lib/services/core/supabase-admin'
import { logger, logError } from '@/lib/logger'

/**
 * POST /api/test/cleanup-user
 *
 * Body: { email: string }
 */
export async function POST(request: NextRequest) {
  // ⚠️ SÉCURITÉ: Vérifier qu'on est en environnement de test
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Cleanup not allowed in production' },
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
        { error: 'Only test emails can be cleaned up' },
        { status: 400 }
      )
    }

    logger.info({ user: email }, '🧹 [CLEANUP] Starting cleanup for test user:')

    // Vérifier que le service admin est configuré
    if (!isAdminConfigured()) {
      logger.error({}, '❌ [CLEANUP] Admin service not configured')
      return NextResponse.json(
        { error: 'Admin service not configured' },
        { status: 500 }
      )
    }

    const supabaseAdmin = getSupabaseAdmin()!

    // ÉTAPE 1: Trouver l'utilisateur dans auth.users
    const { data: authUsers, error: authListError } = await supabaseAdmin.auth.admin.listUsers()

    if (authListError) {
      logger.error({ user: authListError }, '❌ [CLEANUP] Failed to list auth users:')
      return NextResponse.json(
        { error: 'Failed to list users' },
        { status: 500 }
      )
    }

    const authUser = authUsers.users.find((u) => u.email === email)

    if (!authUser) {
      logger.warn({ user: email }, '⚠️  [CLEANUP] User not found in auth.users:')
      return NextResponse.json(
        { message: 'User not found (already cleaned up?)' },
        { status: 200 }
      )
    }

    logger.info({
      id: authUser.id,
      email: authUser.email,
    }, '🔍 [CLEANUP] Found auth user:')

    // ÉTAPE 2: Trouver le profil dans public.users
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('id, team_id')
      .eq('auth_user_id', authUser.id)
      .single()

    if (profileError && profileError.code !== 'PGRST116') {
      // PGRST116 = not found (acceptable)
      logger.warn({ error: profileError }, '⚠️  [CLEANUP] Error fetching profile:')
    }

    if (profile) {
      logger.info({
        userId: profile.id,
        teamId: profile.team_id,
      }, '🔍 [CLEANUP] Found profile:')

      // ÉTAPE 3: Supprimer les team_members si applicable
      if (profile.team_id) {
        const { error: teamMemberError } = await supabaseAdmin
          .from('team_members')
          .delete()
          .eq('user_id', profile.id)

        if (teamMemberError) {
          logger.warn({ teamMemberError: teamMemberError }, '⚠️  [CLEANUP] Failed to delete team_members:')
        } else {
          logger.info({}, '✅ [CLEANUP] Deleted team_members')
        }

        // ÉTAPE 4: Supprimer l'équipe si c'est le gestionnaire
        const { data: teamMembers } = await supabaseAdmin
          .from('team_members')
          .select('user_id')
          .eq('team_id', profile.team_id)

        // Si plus de membres, supprimer l'équipe
        if (!teamMembers || teamMembers.length === 0) {
          const { error: teamError } = await supabaseAdmin
            .from('teams')
            .delete()
            .eq('id', profile.team_id)

          if (teamError) {
            logger.warn({ teamError: teamError }, '⚠️  [CLEANUP] Failed to delete team:')
          } else {
            logger.info({ profile: profile.team_id }, '✅ [CLEANUP] Deleted team:')
          }
        }
      }

      // ÉTAPE 5: Supprimer le profil
      const { error: deleteProfileError } = await supabaseAdmin
        .from('users')
        .delete()
        .eq('id', profile.id)

      if (deleteProfileError) {
        logger.warn({ deleteProfileError: deleteProfileError }, '⚠️  [CLEANUP] Failed to delete profile:')
      } else {
        logger.info({ profile: profile.id }, '✅ [CLEANUP] Deleted profile:')
      }
    }

    // ÉTAPE 6: Supprimer l'utilisateur de auth.users
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(authUser.id)

    if (deleteAuthError) {
      logger.error({ user: deleteAuthError }, '❌ [CLEANUP] Failed to delete auth user:')
      return NextResponse.json(
        { error: 'Failed to delete auth user' },
        { status: 500 }
      )
    }

    logger.info({ user: authUser.id }, '✅ [CLEANUP] Deleted auth user:')
    logger.info({ email: email }, '✅ [CLEANUP] Cleanup completed for:')

    return NextResponse.json({
      message: 'User cleaned up successfully',
      email,
      deletedAuthUser: authUser.id,
      deletedProfile: profile?.id,
      deletedTeam: profile?.team_id,
    })
  } catch (error) {
    logger.error({ error: error }, '❌ [CLEANUP] Unexpected error:')
    return NextResponse.json(
      {
        error: 'Cleanup failed',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
