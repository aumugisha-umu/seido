/**
 * Cron Job - Recurrence Occurrence Scanner
 *
 * Scans pending recurrence occurrences within a 7-day look-ahead window.
 * For each pending occurrence:
 *   - auto_create = true:  Creates a reminder from source_template, links occurrence
 *   - auto_create = false: Creates in-app notifications for team managers
 *
 * Frequency: Daily at 06:00 UTC (0 6 * * *)
 */

import { NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/** Shape returned by the scan_pending_recurrences RPC */
interface PendingOccurrence {
  rule_id: string
  team_id: string
  source_type: string
  source_template: Record<string, unknown>
  occurrence_id: string
  occurrence_date: string
  notify_days_before: number
  auto_create: boolean
}

/** Insert shape for the reminders table (created_by is required — use rule creator) */
interface ReminderInsert {
  team_id: string
  title: string
  description: string | null
  priority: string
  status: string
  due_date: string
  assigned_to: string | null
  building_id: string | null
  lot_id: string | null
  contact_id: string | null
  contract_id: string | null
  recurrence_rule_id: string
  parent_occurrence_id: string
  created_by: string
}

const LOOK_AHEAD_DAYS = 7

/**
 * Auto-create a reminder from the recurrence template and link the occurrence.
 */
async function handleAutoCreate(
  supabase: SupabaseClient,
  occ: PendingOccurrence
): Promise<boolean> {
  const template = occ.source_template

  // Resolve created_by: use template.assigned_to, or fall back to rule creator
  const { data: rule } = await supabase
    .from('recurrence_rules')
    .select('created_by')
    .eq('id', occ.rule_id)
    .limit(1)

  const createdBy = (rule?.[0]?.created_by as string) || (template.assigned_to as string)

  if (!createdBy) {
    logger.error(
      { ruleId: occ.rule_id, occurrenceId: occ.occurrence_id },
      '[RECURRENCE-SCAN] Cannot resolve created_by for reminder — skipping'
    )
    return false
  }

  const reminderData: ReminderInsert = {
    team_id: occ.team_id,
    title: (template.title as string) || 'Rappel recurrent',
    description: (template.description as string) || null,
    priority: (template.priority as string) || 'normale',
    status: 'en_attente',
    due_date: occ.occurrence_date,
    assigned_to: (template.assigned_to as string) || null,
    building_id: (template.building_id as string) || null,
    lot_id: (template.lot_id as string) || null,
    contact_id: (template.contact_id as string) || null,
    contract_id: (template.contract_id as string) || null,
    recurrence_rule_id: occ.rule_id,
    parent_occurrence_id: occ.occurrence_id,
    created_by: createdBy,
  }

  const { data: reminder, error: insertError } = await supabase
    .from('reminders')
    .insert(reminderData)
    .select('id')
    .limit(1)

  if (insertError || !reminder || reminder.length === 0) {
    logger.error(
      { insertError, occurrenceId: occ.occurrence_id },
      '[RECURRENCE-SCAN] Failed to create reminder'
    )
    return false
  }

  // Link occurrence to the generated reminder
  const { error: updateError } = await supabase
    .from('recurrence_occurrences')
    .update({
      status: 'confirmed',
      confirmed_at: new Date().toISOString(),
      generated_entity_type: 'reminder',
      generated_entity_id: reminder[0].id,
    })
    .eq('id', occ.occurrence_id)

  if (updateError) {
    logger.error(
      { updateError, occurrenceId: occ.occurrence_id },
      '[RECURRENCE-SCAN] Failed to update occurrence status'
    )
    return false
  }

  return true
}

/**
 * Notify team managers about a pending occurrence (manual confirmation mode).
 */
async function handleNotify(
  supabase: SupabaseClient,
  occ: PendingOccurrence
): Promise<boolean> {
  // Find team managers to notify
  const { data: managers, error: managerError } = await supabase
    .from('team_members')
    .select('user_id')
    .eq('team_id', occ.team_id)
    .in('role', ['admin', 'gestionnaire'])

  if (managerError) {
    logger.error(
      { managerError, occurrenceId: occ.occurrence_id },
      '[RECURRENCE-SCAN] Failed to fetch team managers'
    )
    return false
  }

  if (!managers || managers.length === 0) {
    logger.warn(
      { teamId: occ.team_id, occurrenceId: occ.occurrence_id },
      '[RECURRENCE-SCAN] No managers found for team — skipping notification'
    )
    return false
  }

  const formattedDate = new Date(occ.occurrence_date).toLocaleDateString('fr-FR')
  const template = occ.source_template
  const templateTitle = (template.title as string) || 'Rappel recurrent'

  const notifications = managers.map((m) => ({
    user_id: m.user_id,
    team_id: occ.team_id,
    type: 'reminder' as const,
    title: 'Rappel recurrent a venir',
    message: `"${templateTitle}" est prevu pour le ${formattedDate}. Action requise.`,
    is_personal: false,
    metadata: {
      rule_id: occ.rule_id,
      occurrence_id: occ.occurrence_id,
      source_type: occ.source_type,
    },
    related_entity_type: 'recurrence_rule',
    related_entity_id: occ.rule_id,
    read: false,
  }))

  const { error: notifError } = await supabase
    .from('notifications')
    .insert(notifications)

  if (notifError) {
    logger.error(
      { notifError, occurrenceId: occ.occurrence_id },
      '[RECURRENCE-SCAN] Failed to insert notifications'
    )
    return false
  }

  // Update occurrence status
  const { error: updateError } = await supabase
    .from('recurrence_occurrences')
    .update({ status: 'notified' })
    .eq('id', occ.occurrence_id)

  if (updateError) {
    logger.error(
      { updateError, occurrenceId: occ.occurrence_id },
      '[RECURRENCE-SCAN] Failed to update occurrence to notified'
    )
    return false
  }

  return true
}

export async function GET(request: Request) {
  const startTime = Date.now()

  // 1. Auth: verify CRON_SECRET
  const authHeader = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  try {
    // Service role client to bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 2. Call RPC to find pending occurrences within look-ahead window
    const { data: pendingOccurrences, error: rpcError } = await supabase
      .rpc('scan_pending_recurrences', { look_ahead_days: LOOK_AHEAD_DAYS })
      .limit(500)

    if (rpcError) {
      logger.error({ error: rpcError }, '[RECURRENCE-SCAN] RPC failed')
      return NextResponse.json({ error: 'RPC failed' }, { status: 500 })
    }

    const occurrences = (pendingOccurrences ?? []) as PendingOccurrence[]

    if (occurrences.length === 0) {
      return NextResponse.json({
        message: 'No pending occurrences',
        elapsed: `${Date.now() - startTime}ms`,
      })
    }

    logger.info(
      { count: occurrences.length },
      '[RECURRENCE-SCAN] Found pending occurrences'
    )

    let created = 0
    let notified = 0
    let errors = 0

    // 3. Process each occurrence — one failure should not block others
    for (const occ of occurrences) {
      try {
        if (occ.auto_create) {
          const success = await handleAutoCreate(supabase, occ)
          if (success) {
            created++
          } else {
            errors++
          }
        } else {
          const success = await handleNotify(supabase, occ)
          if (success) {
            notified++
          } else {
            errors++
          }
        }
      } catch (err) {
        logger.error(
          { err, occurrenceId: occ.occurrence_id },
          '[RECURRENCE-SCAN] Error processing occurrence'
        )
        errors++
      }
    }

    const elapsed = `${Date.now() - startTime}ms`
    logger.info(
      { total: occurrences.length, created, notified, errors, elapsed },
      '[RECURRENCE-SCAN] Scan complete'
    )

    return NextResponse.json({
      message: 'Recurrence scan complete',
      total: occurrences.length,
      created,
      notified,
      errors,
      elapsed,
    })
  } catch (err) {
    logger.error({ err }, '[RECURRENCE-SCAN] Unexpected error')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
