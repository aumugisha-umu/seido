import { logger } from '@/lib/logger'
import { createServiceRoleSupabaseClient } from '@/lib/services/core/supabase-client'
import { normalizePhoneE164 } from '@/lib/services/domain/ai-phone/call-transcript-analyzer.service'
import type { SessionExtractedData, ConversationMessage } from './types'

// ============================================================================
// Input type — session data passed from conversation engine (avoids re-query)
// ============================================================================

interface CreateInterventionInput {
  sessionId: string
  teamId: string
  extractedData: SessionExtractedData
  messages: ConversationMessage[]
  contactPhone: string
  identifiedUserId: string | null
  language: string
  channel?: string
}

// ============================================================================
// Create intervention from completed WhatsApp session
// ============================================================================

export const createInterventionFromSession = async (
  input: CreateInterventionInput
): Promise<string | null> => {
  const { sessionId, teamId, extractedData, messages, contactPhone, language, channel } = input
  const supabase = createServiceRoleSupabaseClient()

  // ─── 1. Try to match tenant by phone (scoped to team) ──────────
  let identifiedUserId = input.identifiedUserId
  let identifiedUserName = extractedData.caller_name ?? 'Locataire WhatsApp'

  if (!identifiedUserId && contactPhone) {
    const normalizedPhone = normalizePhoneE164(contactPhone)

    // Match within same team via team_members join (prevents cross-team leak)
    const { data: matchedUser } = await supabase
      .from('team_members')
      .select('user_id, users!inner(id, first_name, last_name, phone)')
      .eq('team_id', teamId)
      .eq('role', 'locataire')
      .is('left_at', null)
      .eq('users.phone', normalizedPhone)
      .limit(1)
      .maybeSingle()

    if (matchedUser) {
      const user = matchedUser.users as unknown as { id: string; first_name: string | null; last_name: string | null }
      identifiedUserId = user.id
      identifiedUserName = [user.first_name, user.last_name].filter(Boolean).join(' ') || identifiedUserName
      logger.info({ userId: user.id }, '[WA-INTERVENTION] Tenant matched by phone')
    }
  }

  // ─── 2. Match building/lot ──────────────────────────────────────
  let buildingId: string | null = null
  let lotId: string | null = null

  if (extractedData.pre_identified && (extractedData.lot_id || extractedData.building_id)) {
    // Pre-identified from property selection → use directly, skip fuzzy match
    lotId = extractedData.lot_id ?? null
    buildingId = extractedData.building_id ?? null
    logger.info({ lotId, buildingId }, '[WA-INTERVENTION] Using pre-identified property')
  } else if (extractedData.address) {
    // Fuzzy address matching (existing behavior)
    const { data: buildings } = await supabase
      .from('buildings')
      .select('id, addresses!inner(street, city)')
      .eq('team_id', teamId)
      .is('deleted_at', null)
      .limit(50)

    if (buildings?.length) {
      const normalizedAddress = extractedData.address.toLowerCase()
      const match = buildings.find((b) => {
        const addr = b.addresses as unknown as { street: string; city: string } | null
        if (!addr) return false
        return normalizedAddress.includes(addr.street.toLowerCase())
          || normalizedAddress.includes(addr.city.toLowerCase())
      })
      if (match) buildingId = match.id
    }
  }

  // ─── 3. Build transcript + description ──────────────────────────
  const transcript = messages
    .map(m => `[${m.role === 'user' ? 'Locataire' : 'IA'}] ${m.content}`)
    .join('\n')

  const channelLabel = channel === 'sms' ? 'SMS' : 'WhatsApp'
  const title = extractedData.problem_description
    ? `[${channelLabel}] ${extractedData.problem_description.slice(0, 100)}`
    : `[${channelLabel}] Demande via ${channelLabel}`

  const descriptionParts = [
    extractedData.problem_description,
    '',
    `--- Details ${channelLabel} ---`,
    `Signale par : ${identifiedUserName}`,
    contactPhone ? `Telephone : ${contactPhone}` : null,
    extractedData.address ? `Adresse : ${extractedData.address}` : null,
    `Urgence : ${extractedData.urgency ?? 'normale'}`,
    extractedData.additional_notes ? `\nNotes : ${extractedData.additional_notes}` : null,
    '',
    `--- Conversation ${channelLabel} ---`,
    transcript,
  ].filter(Boolean).join('\n')

  // ─── STEP 1: INSERT intervention via Repository ─────────────────
  const { InterventionRepository } = await import('@/lib/services/repositories/intervention.repository')
  const interventionRepo = new InterventionRepository(supabase)

  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const randomSuffix = Math.random().toString(36).substring(2, 5).toUpperCase()
  const refPrefix = channel === 'sms' ? 'SMS' : 'WA'
  const reference = `${refPrefix}-${year}${month}${day}-${randomSuffix}`

  const interventionResult = await interventionRepo.create(
    {
      title,
      description: descriptionParts,
      type: 'demande_whatsapp',
      urgency: extractedData.urgency ?? 'normale',
      reference,
      team_id: teamId,
      building_id: buildingId,
      lot_id: lotId,
      status: 'demande',
      source: channel === 'sms' ? 'sms_ai' : 'whatsapp_ai',
      creation_source: channel === 'sms' ? 'sms_ai' : 'whatsapp_ai',
      created_by: identifiedUserId,
    },
    { skipInitialSelect: true }
  )

  if (!interventionResult.success || !interventionResult.data) {
    logger.error({ error: interventionResult.error, sessionId }, '[WA-INTERVENTION] Failed to create intervention')
    return null
  }

  const interventionId = interventionResult.data.id
  logger.info({ interventionId, sessionId }, '[WA-INTERVENTION] Intervention created (step 1/3)')

  // ─── STEP 2: ASSIGN tenant + gestionnaires (parallel) ──────────
  const [, { data: teamManagers }] = await Promise.all([
    // 2a: Assign tenant (if identified)
    identifiedUserId
      ? supabase.from('intervention_assignments').insert({
          intervention_id: interventionId,
          user_id: identifiedUserId,
          role: 'locataire',
          is_primary: true,
          assigned_by: identifiedUserId,
          assigned_at: new Date().toISOString(),
        }).then(({ error }) => {
          if (error) logger.warn({ error }, '[WA-INTERVENTION] Failed to assign tenant (non-blocking)')
        })
      : Promise.resolve(),
    // 2b: Query team managers — include 'admin' role (team admins are gestionnaires)
    supabase.from('team_members').select('user_id')
      .eq('team_id', teamId)
      .in('role', ['gestionnaire', 'admin'])
      .is('left_at', null),
  ])

  if (teamManagers && teamManagers.length > 0) {
    const managerAssignments = teamManagers.map((m) => ({
      intervention_id: interventionId,
      user_id: m.user_id,
      role: 'gestionnaire' as const,
      is_primary: false,
      assigned_by: identifiedUserId,
      assigned_at: new Date().toISOString(),
    }))

    const { error: managerAssignError } = await supabase
      .from('intervention_assignments')
      .insert(managerAssignments)

    if (managerAssignError) {
      logger.warn({ error: managerAssignError }, '[WA-INTERVENTION] Failed to assign managers (non-blocking)')
    } else {
      logger.info({ count: teamManagers.length }, '[WA-INTERVENTION] Managers assigned (step 2/3)')
    }
  }

  // ─── STEP 3: Create conversation threads ────────────────────────
  try {
    const threadCreatedBy = identifiedUserId ?? teamManagers?.[0]?.user_id ?? null

    if (threadCreatedBy) {
      // GROUP thread
      await supabase.from('conversation_threads').insert({
        intervention_id: interventionId,
        thread_type: 'group',
        title: 'Discussion generale',
        created_by: threadCreatedBy,
        team_id: teamId,
      })

      // TENANT_TO_MANAGERS thread (only if tenant identified)
      if (identifiedUserId) {
        const { data: tenantThread } = await supabase
          .from('conversation_threads')
          .insert({
            intervention_id: interventionId,
            thread_type: 'tenant_to_managers',
            title: `Conversation avec ${identifiedUserName}`,
            created_by: identifiedUserId,
            team_id: teamId,
          })
          .select('id')
          .single()

        if (tenantThread) {
          await supabase.from('conversation_participants').insert({
            thread_id: tenantThread.id,
            user_id: identifiedUserId,
            role: 'locataire',
          })
        }
      }

      logger.info({ interventionId }, '[WA-INTERVENTION] Conversation threads created (step 3/3)')
    }
  } catch (threadError) {
    logger.warn({ error: threadError }, '[WA-INTERVENTION] Thread creation failed (non-blocking)')
  }

  // ─── 4. Attach media files as intervention documents ────────────
  const mediaUrls = extractedData.media_urls ?? []
  if (mediaUrls.length > 0) {
    try {
      const uploaderId = identifiedUserId ?? teamManagers?.[0]?.user_id
      if (uploaderId) {
        const docInserts = mediaUrls.map((storagePath, i) => {
          const filename = storagePath.split('/').pop() ?? `photo-${i + 1}.jpg`
          const ext = filename.split('.').pop()?.toLowerCase() ?? 'jpg'
          const mimeMap: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', pdf: 'application/pdf' }
          return {
            intervention_id: interventionId,
            team_id: teamId,
            storage_path: storagePath,
            storage_bucket: 'documents',
            filename,
            original_filename: filename,
            mime_type: mimeMap[ext] ?? 'image/jpeg',
            file_size: 0, // actual size not tracked during upload
            document_type: 'photo_avant' as const,
            uploaded_by: uploaderId,
            description: `Photo envoyee via WhatsApp/SMS`,
          }
        })

        const { error: docError } = await supabase
          .from('intervention_documents')
          .insert(docInserts)

        if (docError) {
          logger.warn({ error: docError }, '[WA-INTERVENTION] Failed to link media documents')
        } else {
          logger.info({ count: docInserts.length, interventionId }, '[WA-INTERVENTION] Media documents linked')
        }
      }
    } catch (err) {
      logger.warn({ err }, '[WA-INTERVENTION] Media document linking failed (non-blocking)')
    }
  }

  // ─── 5. Session update + audit log (parallel — independent writes)
  const [sessionUpdateResult, callLogResult] = await Promise.all([
    supabase.from('ai_whatsapp_sessions').update({
      intervention_id: interventionId,
      identified_user_id: identifiedUserId,
    }).eq('id', sessionId),

    supabase.from('ai_phone_calls').insert({
      team_id: teamId,
      phone_number_id: null,
      elevenlabs_conversation_id: `wa-${sessionId}`,
      caller_phone: contactPhone ?? null,
      channel: channel ?? 'whatsapp',
      identified_user_id: identifiedUserId,
      intervention_id: interventionId,
      transcript,
      structured_summary: extractedData as unknown as Record<string, unknown>, // Supabase Json column
      language: language ?? 'fr',
      call_status: 'completed',
      media_urls: (extractedData.media_urls ?? []) as unknown as Json, // Supabase Json column
    }),
  ])

  if (sessionUpdateResult.error) {
    logger.warn({ error: sessionUpdateResult.error }, '[WA-INTERVENTION] Session update failed')
  }
  if (callLogResult.error) {
    logger.warn({ error: callLogResult.error }, '[WA-INTERVENTION] Call log insert failed')
  }

  // ─── 6. Notify gestionnaire (push + email) ─────────────────────
  try {
    const { createInterventionNotification } = await import('@/app/actions/notification-actions')
    await createInterventionNotification(interventionId)
    logger.info({ interventionId }, '[WA-INTERVENTION] Gestionnaire notified')
  } catch (err) {
    logger.error({ err }, '[WA-INTERVENTION] Failed to send notification')
  }

  return interventionId
}

// Supabase Json type alias for casts
type Json = string | number | boolean | null | { [key: string]: Json } | Json[]
