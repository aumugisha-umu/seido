'use server'

/**
 * Server Actions for Admin Team Management
 *
 * Uses service_role key to bypass RLS for admin operations.
 * All actions verify admin role before executing.
 */

import { after } from 'next/server'
import { z } from 'zod'
import { getSupabaseAdmin, isAdminConfigured } from '@/lib/services/core/supabase-admin'
import { getServerAuthContext } from '@/lib/server-context'
import { emailService } from '@/lib/email/email-service'
import { EMAIL_CONFIG } from '@/lib/email/resend-client'
import { logger } from '@/lib/logger'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ActionResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

export interface AdminTeam {
  id: string
  name: string
  created_at: string | null
  admin_name: string | null
  admin_email: string | null
  member_count: number
  lot_count: number
  subscription_status: string | null
  trial_end: string | null
  trial_start: string | null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getAdminContext() {
  const { profile } = await getServerAuthContext('admin')

  if (!isAdminConfigured()) {
    throw new Error('Service admin non configure - verifiez SUPABASE_SERVICE_ROLE_KEY')
  }

  const supabase = getSupabaseAdmin()
  if (!supabase) {
    throw new Error('Client admin non disponible')
  }

  return { profile, supabase }
}

// ---------------------------------------------------------------------------
// 1. Get all teams with subscription data
// ---------------------------------------------------------------------------

export async function getAdminTeamsWithSubscriptions(): Promise<ActionResult<AdminTeam[]>> {
  try {
    const { supabase } = await getAdminContext()

    // Fetch teams with subscription data
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select(`
        id,
        name,
        created_at,
        subscriptions (
          status,
          trial_end,
          trial_start
        )
      `)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (teamsError) {
      logger.error({ error: teamsError }, '[ADMIN-TEAMS] Failed to fetch teams')
      return { success: false, error: teamsError.message }
    }

    if (!teams || teams.length === 0) {
      return { success: true, data: [] }
    }

    const teamIds = teams.map(t => t.id)

    // Fetch team admins, member counts, and lot counts in parallel
    const [adminsResult, membersResult, lotsResult] = await Promise.all([
      // Team admins (role = 'admin' in team_members)
      supabase
        .from('team_members')
        .select('team_id, users!inner(name, email)')
        .in('team_id', teamIds)
        .eq('role', 'admin'),

      // Member counts per team
      supabase
        .from('team_members')
        .select('team_id')
        .in('team_id', teamIds),

      // Lot counts per team (via buildings)
      supabase
        .from('lots')
        .select('id, buildings!inner(team_id)')
        .in('buildings.team_id', teamIds)
        .is('deleted_at', null),
    ])

    // Build lookup maps
    const adminMap = new Map<string, { name: string; email: string }>()
    if (adminsResult.data) {
      for (const row of adminsResult.data) {
        const user = row.users as unknown as { name: string; email: string }
        if (user && !adminMap.has(row.team_id)) {
          adminMap.set(row.team_id, { name: user.name, email: user.email })
        }
      }
    }

    const memberCountMap = new Map<string, number>()
    if (membersResult.data) {
      for (const row of membersResult.data) {
        memberCountMap.set(row.team_id, (memberCountMap.get(row.team_id) || 0) + 1)
      }
    }

    const lotCountMap = new Map<string, number>()
    if (lotsResult.data) {
      for (const row of lotsResult.data) {
        const building = row.buildings as unknown as { team_id: string }
        if (building?.team_id) {
          lotCountMap.set(building.team_id, (lotCountMap.get(building.team_id) || 0) + 1)
        }
      }
    }

    // Assemble result
    const result: AdminTeam[] = teams.map(team => {
      // subscriptions is an array (PostgREST nested), take first
      const sub = Array.isArray(team.subscriptions)
        ? team.subscriptions[0]
        : team.subscriptions
      const admin = adminMap.get(team.id)

      return {
        id: team.id,
        name: team.name,
        created_at: team.created_at,
        admin_name: admin?.name || null,
        admin_email: admin?.email || null,
        member_count: memberCountMap.get(team.id) || 0,
        lot_count: lotCountMap.get(team.id) || 0,
        subscription_status: sub?.status || null,
        trial_end: sub?.trial_end || null,
        trial_start: sub?.trial_start || null,
      }
    })

    return { success: true, data: result }
  } catch (error) {
    logger.error({ error }, '[ADMIN-TEAMS] Unexpected error')
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    }
  }
}

// ---------------------------------------------------------------------------
// 2. Extend team trial
// ---------------------------------------------------------------------------

const ExtendTrialSchema = z.object({
  teamId: z.string().uuid(),
  newTrialEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de date invalide (YYYY-MM-DD)'),
  reason: z.string().max(200).optional(),
})

export async function extendTeamTrialAction(
  teamId: string,
  newTrialEnd: string,
  reason?: string
): Promise<ActionResult> {
  try {
    // Validate inputs
    const parsed = ExtendTrialSchema.safeParse({ teamId, newTrialEnd, reason })
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message || 'Donnees invalides' }
    }

    const { profile, supabase } = await getAdminContext()

    // 1. Load current subscription
    const { data: sub, error: subError } = await supabase
      .from('subscriptions')
      .select('id, status, trial_end, team_id')
      .eq('team_id', teamId)
      .limit(1)
      .maybeSingle()

    if (subError || !sub) {
      return { success: false, error: 'Abonnement introuvable pour cette equipe' }
    }

    // 2. Verify status is trialing
    if (sub.status !== 'trialing') {
      return { success: false, error: `Impossible d'etendre: le statut est "${sub.status}", pas "trialing"` }
    }

    const oldEnd = sub.trial_end
    const newEnd = new Date(newTrialEnd)
    const oldEndDate = oldEnd ? new Date(oldEnd) : new Date()
    const daysAdded = Math.round((newEnd.getTime() - oldEndDate.getTime()) / (1000 * 60 * 60 * 24))

    if (daysAdded <= 0) {
      return { success: false, error: 'La nouvelle date doit etre apres la date actuelle de fin de trial' }
    }

    // 3. Update trial_end
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({ trial_end: newTrialEnd })
      .eq('id', sub.id)

    if (updateError) {
      logger.error({ error: updateError }, '[ADMIN-TEAMS] Failed to update trial_end')
      return { success: false, error: 'Erreur lors de la mise a jour' }
    }

    // 4. Activity log
    await supabase.from('activity_logs').insert({
      action_type: 'update' as const,
      entity_type: 'team' as const,
      entity_id: teamId,
      entity_name: `Trial extension (+${daysAdded}j)`,
      description: `Trial etendu: ${oldEnd || 'N/A'} → ${newTrialEnd}${reason ? ` — ${reason}` : ''}`,
      user_id: profile.id,
      team_id: teamId,
      metadata: {
        old_end: oldEnd,
        new_end: newTrialEnd,
        days_added: daysAdded,
        reason: reason || null,
      },
    })

    logger.info({ teamId, oldEnd, newTrialEnd, daysAdded }, '[ADMIN-TEAMS] Trial extended')

    // 5. Send email notification (deferred — after response)
    after(async () => {
      try {
        // Get team name + admin info for email
        const { data: team } = await supabase
          .from('teams')
          .select('name')
          .eq('id', teamId)
          .single()

        const { data: adminMember } = await supabase
          .from('team_members')
          .select('users!inner(name, email)')
          .eq('team_id', teamId)
          .eq('role', 'admin')
          .limit(1)
          .maybeSingle()

        const adminUser = adminMember?.users as unknown as { name: string; email: string } | null

        if (adminUser?.email && team?.name) {
          await emailService.sendTrialExtendedEmail(
            adminUser.email,
            {
              firstName: adminUser.name?.split(' ')[0] || 'Bonjour',
              teamName: team.name,
              newTrialEnd: new Date(newTrialEnd),
              daysAdded,
              dashboardUrl: `${EMAIL_CONFIG.appUrl}/gestionnaire/dashboard`,
            }
          )
        }
      } catch (emailError) {
        logger.error({ emailError }, '[ADMIN-TEAMS] Failed to send trial extension email')
      }
    })

    return { success: true }
  } catch (error) {
    logger.error({ error }, '[ADMIN-TEAMS] Unexpected error extending trial')
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    }
  }
}

// ---------------------------------------------------------------------------
// 3. Get admin dashboard stats
// ---------------------------------------------------------------------------

export async function getAdminDashboardStats(): Promise<ActionResult<{
  activeUsers: number
  totalTeams: number
  activeSubscriptions: number
  recentInterventions: number
}>> {
  try {
    const { supabase } = await getAdminContext()

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    const [usersResult, teamsResult, subsResult, interventionsResult] = await Promise.all([
      // Active users (logged in within 30 days)
      supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('last_login', thirtyDaysAgo),

      // Total teams (not deleted)
      supabase
        .from('teams')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null),

      // Active subscriptions
      supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active'),

      // Interventions created in last 30 days
      supabase
        .from('interventions')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', thirtyDaysAgo),
    ])

    return {
      success: true,
      data: {
        activeUsers: usersResult.count || 0,
        totalTeams: teamsResult.count || 0,
        activeSubscriptions: subsResult.count || 0,
        recentInterventions: interventionsResult.count || 0,
      },
    }
  } catch (error) {
    logger.error({ error }, '[ADMIN-TEAMS] Failed to get dashboard stats')
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    }
  }
}
