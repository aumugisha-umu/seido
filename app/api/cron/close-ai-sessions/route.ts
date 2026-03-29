/**
 * CRON — Close AI Sessions (WhatsApp/SMS)
 *
 * Closes active AI sessions that have been idle for 30+ minutes.
 * For sessions with enough data, creates an intervention ticket.
 * Also enriches phone→team mappings and appends conversation history.
 *
 * Frequency: Every minute (* * * * *)
 */

import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { createServiceRoleSupabaseClient } from '@/lib/services/core/supabase-client'
import { completeSession } from '@/lib/services/domain/ai-whatsapp/session-completion.service'
import type { CompletableSession } from '@/lib/services/domain/ai-whatsapp/session-completion.service'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const SESSION_TIMEOUT_MINUTES = 30

export async function GET(request: Request) {
  const startTime = Date.now()

  // Auth
  const authHeader = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const supabase = createServiceRoleSupabaseClient()

  try {
    // Find active sessions idle for 30+ minutes
    const cutoff = new Date(Date.now() - SESSION_TIMEOUT_MINUTES * 60 * 1000).toISOString()

    const { data: staleSessions, error: queryError } = await supabase
      .from('ai_whatsapp_sessions')
      .select('id, team_id, contact_phone, identified_user_id, identified_via, language, channel, messages, extracted_data')
      .eq('status', 'active')
      .lt('last_message_at', cutoff)
      .limit(50)

    if (queryError) {
      logger.error({ error: queryError }, '[CRON-AI-SESSIONS] Query failed')
      return NextResponse.json({ success: false, error: queryError.message }, { status: 500 })
    }

    if (!staleSessions?.length) {
      return NextResponse.json({ success: true, closed: 0, timing: Date.now() - startTime })
    }

    logger.info({ count: staleSessions.length }, '[CRON-AI-SESSIONS] Found stale sessions')

    // Batch-close all sessions in one query
    const sessionIds = staleSessions.map(s => s.id)
    await supabase
      .from('ai_whatsapp_sessions')
      .update({ status: 'completed' })
      .in('id', sessionIds)

    // Process completions in parallel (intervention + mapping + history)
    const results = await Promise.allSettled(
      staleSessions.map(async (raw) => {
        const session = raw as unknown as CompletableSession
        if (!session.team_id) return 'skipped'
        await completeSession(supabase, session)
        return 'completed'
      })
    )

    const completed = results.filter(r => r.status === 'fulfilled' && r.value === 'completed').length
    const failed = results.filter(r => r.status === 'rejected').length

    if (failed > 0) {
      logger.warn({ failed }, '[CRON-AI-SESSIONS] Some sessions failed completion')
    }

    const timing = Date.now() - startTime
    logger.info({ closed: sessionIds.length, completed, failed, timing }, '[CRON-AI-SESSIONS] Complete')

    return NextResponse.json({ success: true, closed: sessionIds.length, completed, failed, timing })
  } catch (error) {
    logger.error({ error }, '[CRON-AI-SESSIONS] Unexpected error')
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 },
    )
  }
}
