/**
 * Endpoint de diagnostic pour debug dashboard vide
 * Test l'authentification et les queries RLS team_members
 */

import { NextResponse } from 'next/server'
import { createServerActionSupabaseClient } from '@/lib/services/core/supabase-client'

export async function GET() {
  try {
    const supabase = await createServerActionSupabaseClient()

    // Test 1: Vérifier authentification Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication failed',
        details: authError?.message
      }, { status: 401 })
    }

    // Test 2: Récupérer profile utilisateur depuis table users
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('auth_user_id', user.id)
      .single()

    // Test 3: Query directe sur team_members (bypass service layer)
    const { data: teamMembers, error: teamError } = await supabase
      .from('team_members')
      .select('*')
      .eq('user_id', profile?.id || '')
      .is('left_at', null)

    // Test 4: Tester fonction RLS get_user_teams_v2()
    const { data: rlsTeams, error: rlsError } = await supabase
      .rpc('get_user_teams_v2')

    // Test 5: Query teams avec JOIN
    const { data: teamsWithDetails, error: teamsError } = await supabase
      .from('teams')
      .select(`
        id,
        name,
        description,
        team_members!inner(user_id, role, left_at)
      `)
      .eq('team_members.user_id', profile?.id || '')
      .is('team_members.left_at', null)

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      tests: {
        auth: {
          success: !!user,
          user_email: user.email,
          user_id: user.id,
          error: authError?.message || null
        },
        profile: {
          success: !!profile && !profileError,
          user_id: profile?.id || null,
          role: profile?.role || null,
          team_id: profile?.team_id || null,
          error: profileError?.message || null
        },
        team_members_direct: {
          success: !teamError,
          count: teamMembers?.length || 0,
          data: teamMembers || [],
          error: teamError?.message || null
        },
        rls_function: {
          success: !rlsError,
          teams_count: rlsTeams?.length || 0,
          teams: rlsTeams || [],
          error: rlsError?.message || null
        },
        teams_with_join: {
          success: !teamsError,
          count: teamsWithDetails?.length || 0,
          data: teamsWithDetails || [],
          error: teamsError?.message || null
        }
      },
      diagnostic: {
        auth_working: !!user,
        profile_found: !!profile,
        team_members_found: (teamMembers?.length || 0) > 0,
        rls_function_working: (rlsTeams?.length || 0) > 0,
        teams_accessible: (teamsWithDetails?.length || 0) > 0,
        overall_status:
          !!user && !!profile && (teamMembers?.length || 0) > 0
            ? '✅ All systems working'
            : '❌ Issues detected'
      }
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Diagnostic failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
