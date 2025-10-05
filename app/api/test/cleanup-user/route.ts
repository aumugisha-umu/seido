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

    logger.info('🧹 [CLEANUP] Starting cleanup for test user:', email)

    // Vérifier que le service admin est configuré
    if (!isAdminConfigured()) {
      logger.error('❌ [CLEANUP] Admin service not configured')
      return NextResponse.json(
        { error: 'Admin service not configured' },
        { status: 500 }
      )
    }

    const supabaseAdmin = getSupabaseAdmin()!

    // ÉTAPE 1: Trouver l'utilisateur dans auth.users
    const { data: authUsers, error: authListError } = await supabaseAdmin.auth.admin.listUsers()

    if (authListError) {
      logger.error('❌ [CLEANUP] Failed to list auth users:', authListError)
      return NextResponse.json(
        { error: 'Failed to list users' },
        { status: 500 }
      )
    }

    const authUser = authUsers.users.find((u) => u.email === email)

    if (!authUser) {
      logger.warn('⚠️  [CLEANUP] User not found in auth.users:', email)
      return NextResponse.json(
        { message: 'User not found (already cleaned up?)' },
        { status: 200 }
      )
    }

    logger.info('🔍 [CLEANUP] Found auth user:', {
      id: authUser.id,
      email: authUser.email,
    })

    // ÉTAPE 2: Trouver le profil dans public.users
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('id, team_id')
      .eq('auth_user_id', authUser.id)
      .single()

    if (profileError && profileError.code !== 'PGRST116') {
      // PGRST116 = not found (acceptable)
      logger.warn('⚠️  [CLEANUP] Error fetching profile:', profileError)
    }

    if (profile) {
      logger.info('🔍 [CLEANUP] Found profile:', {
        userId: profile.id,
        teamId: profile.team_id,
      })

      // ÉTAPE 3: Supprimer les team_members si applicable
      if (profile.team_id) {
        const { error: teamMemberError } = await supabaseAdmin
          .from('team_members')
          .delete()
          .eq('user_id', profile.id)

        if (teamMemberError) {
          logger.warn('⚠️  [CLEANUP] Failed to delete team_members:', teamMemberError)
        } else {
          logger.info('✅ [CLEANUP] Deleted team_members')
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
            logger.warn('⚠️  [CLEANUP] Failed to delete team:', teamError)
          } else {
            logger.info('✅ [CLEANUP] Deleted team:', profile.team_id)
          }
        }
      }

      // ÉTAPE 5: Supprimer le profil
      const { error: deleteProfileError } = await supabaseAdmin
        .from('users')
        .delete()
        .eq('id', profile.id)

      if (deleteProfileError) {
        logger.warn('⚠️  [CLEANUP] Failed to delete profile:', deleteProfileError)
      } else {
        logger.info('✅ [CLEANUP] Deleted profile:', profile.id)
      }
    }

    // ÉTAPE 6: Supprimer l'utilisateur de auth.users
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(authUser.id)

    if (deleteAuthError) {
      logger.error('❌ [CLEANUP] Failed to delete auth user:', deleteAuthError)
      return NextResponse.json(
        { error: 'Failed to delete auth user' },
        { status: 500 }
      )
    }

    logger.info('✅ [CLEANUP] Deleted auth user:', authUser.id)
    logger.info('✅ [CLEANUP] Cleanup completed for:', email)

    return NextResponse.json({
      message: 'User cleaned up successfully',
      email,
      deletedAuthUser: authUser.id,
      deletedProfile: profile?.id,
      deletedTeam: profile?.team_id,
    })
  } catch (error) {
    logger.error('❌ [CLEANUP] Unexpected error:', error)
    return NextResponse.json(
      {
        error: 'Cleanup failed',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
