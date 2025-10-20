import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/services'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
    logger.info("Starting debug-interventions API")

    // Create Supabase client
    const supabase = await createServerSupabaseClient()

    // 1. Check auth user
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

    if (authError || !authUser) {
      return NextResponse.json({
        error: 'Not authenticated',
        authError
      }, { status: 401 })
    }

    logger.info({ authUserId: authUser.id, authEmail: authUser.email }, "Auth user found")

    // 2. Get user from database
    const { data: dbUser, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('auth_user_id', authUser.id)
      .single()

    if (userError || !dbUser) {
      return NextResponse.json({
        error: 'User not found in database',
        userError,
        authUserId: authUser.id
      }, { status: 404 })
    }

    logger.info({
      userId: dbUser.id,
      userName: dbUser.name,
      userRole: dbUser.role,
      teamId: dbUser.team_id
    }, "Database user found")

    // 3. Get all interventions for the team
    const { data: interventions, error: interventionsError } = await supabase
      .from('interventions')
      .select(`
        *,
        building:building_id(id, name, address),
        lot:lot_id(id, reference),
        intervention_assignments(
          id,
          user_id,
          role,
          assigned_at,
          user:user_id(id, name, email)
        )
      `)
      .eq('team_id', dbUser.team_id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (interventionsError) {
      return NextResponse.json({
        error: 'Failed to fetch interventions',
        interventionsError,
        teamId: dbUser.team_id
      }, { status: 500 })
    }

    logger.info({ count: interventions?.length || 0 }, "Interventions fetched")

    // 4. Get the specific intervention we created
    const specificIntervention = '2245179e-ef11-44e2-91b7-e613ff23ee2'
    const { data: targetIntervention, error: targetError } = await supabase
      .from('interventions')
      .select(`
        *,
        intervention_assignments(*)
      `)
      .eq('id', specificIntervention)
      .single()

    // 5. Check intervention assignments for the user
    const { data: userAssignments, error: assignmentsError } = await supabase
      .from('intervention_assignments')
      .select('*')
      .eq('user_id', dbUser.id)

    logger.info({
      userAssignmentsCount: userAssignments?.length || 0
    }, "User assignments fetched")

    // 6. Test if RLS is blocking
    const { data: allInterventions, error: allError } = await supabase
      .from('interventions')
      .select('id, reference, title, team_id')
      .limit(10)

    return NextResponse.json({
      success: true,
      debug: {
        authUser: {
          id: authUser.id,
          email: authUser.email
        },
        dbUser: {
          id: dbUser.id,
          name: dbUser.name,
          role: dbUser.role,
          team_id: dbUser.team_id
        },
        interventions: {
          teamCount: interventions?.length || 0,
          teamInterventions: interventions?.slice(0, 3).map((i: any) => ({
            id: i.id,
            reference: i.reference,
            title: i.title,
            status: i.status,
            team_id: i.team_id,
            assignments: i.intervention_assignments?.length || 0
          }))
        },
        targetIntervention: targetIntervention ? {
          id: targetIntervention.id,
          reference: targetIntervention.reference,
          title: targetIntervention.title,
          team_id: targetIntervention.team_id,
          status: targetIntervention.status,
          assignments: targetIntervention.intervention_assignments
        } : null,
        targetError,
        userAssignments: {
          count: userAssignments?.length || 0,
          assignments: userAssignments?.slice(0, 3)
        },
        allInterventionsTest: {
          count: allInterventions?.length || 0,
          error: allError
        }
      }
    })

  } catch (error) {
    logger.error({ error }, "Error in debug-interventions")
    return NextResponse.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}