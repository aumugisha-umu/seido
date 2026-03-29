# WhatsApp AI Agent — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sp-executing-plans to implement this plan task-by-task.

**Goal:** Allow tenants to report maintenance issues via WhatsApp; Claude AI collects info + photos, creates SEIDO intervention, notifies the gestionnaire.
**Architecture:** Twilio WhatsApp BSP (not Meta Cloud API direct) + Claude Haiku 4.5 via AI SDK 6.x + Supabase sessions. Twilio handles all WhatsApp infra — SEIDO receives standard Twilio webhook POSTs, responds via `client.messages.create()`.
**Tech Stack:** `twilio` v5.x, `ai` v6.x + `@ai-sdk/anthropic`, Next.js App Router, Supabase (service_role for all writes)

**Pivot from plan v2.1:** Replaced Meta Cloud API direct with Twilio WhatsApp BSP. Eliminates: HMAC-SHA256 verification, Meta Send API wrapper, 2-step Media download API, Meta webhook payload parsing. Twilio webhook format is identical to SMS.

**Existing assets:**
- `app/api/webhooks/whatsapp/route.ts` — GET verification done, POST is stub
- Migration `20260309100000` — `ai_phone_numbers`, `ai_phone_calls`, `ai_phone_usage` tables (channel supports `whatsapp_text`)
- `lib/services/domain/ai-phone/` — phone provisioning + ElevenLabs services (reference pattern)
- `app/api/webhooks/elevenlabs/route.ts` — excellent reference for `after()` pattern, team identification, intervention creation
- `ai@6.0.116`, `@ai-sdk/anthropic@3.0.58` already installed. `twilio` NOT installed.

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Twilio webhook signature validation skipped | Low | High | Implement `validateRequest()` from twilio SDK |
| Session expires mid-conversation (async WhatsApp) | Medium | Medium | 2h timeout + partial intervention creation |
| Claude returns malformed structured output | Low | Medium | Zod validation + fallback to text-only response |
| Photo download from Twilio URL fails | Low | Low | Log error, continue conversation without photo |
| `ai_phone_numbers` schema mismatch for WhatsApp | Medium | Medium | Add `whatsapp_enabled` + `twilio_whatsapp_number` columns |

---

## Stories Overview

| # | Story | Size | Files |
|---|-------|------|-------|
| 1 | Install twilio + DB migration (sessions table + whatsapp columns) | S | 2 files |
| 2 | Twilio WhatsApp service (send message, download media) | S | 1 file |
| 3 | Webhook POST handler (receive, validate, route) | M | 1 file |
| 4 | Conversation engine (session mgmt + Claude AI) | M | 2 files |
| 5 | Photo handling (download from Twilio, store in Supabase, send to Claude) | S | 1 file (extend story 4) |
| 6 | Create intervention from completed session | M | 1 file |
| 7 | Notify gestionnaire (push + email) | S | 1 file (extend story 6) |
| 8 | Manual provisioning (dev mode with DEV_* vars) | XS | 1 file |

**Order:** 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8
**Parallel possible:** Story 2 and Story 8 can run in parallel after Story 1.

---

## Story 1: Install twilio + DB Migration

**Goal:** Add `twilio` package + create `ai_whatsapp_sessions` table + extend `ai_phone_numbers` for WhatsApp.

**Files:**
- Modify: `package.json` (npm install)
- Create: `supabase/migrations/YYYYMMDDHHMMSS_create_whatsapp_sessions.sql`

### Step 1: Install twilio

```bash
npm install twilio
```

### Step 2: Create migration

```sql
-- Migration: WhatsApp AI Agent — sessions table + ai_phone_numbers extension

-- ============================================================================
-- 1. Extend ai_phone_numbers for WhatsApp support
-- ============================================================================
ALTER TABLE ai_phone_numbers
  ADD COLUMN IF NOT EXISTS whatsapp_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS twilio_whatsapp_number TEXT,
  ADD COLUMN IF NOT EXISTS twilio_account_sid TEXT;

COMMENT ON COLUMN ai_phone_numbers.whatsapp_enabled IS 'Whether WhatsApp AI agent is active for this team';
COMMENT ON COLUMN ai_phone_numbers.twilio_whatsapp_number IS 'Twilio WhatsApp number in E.164 format (e.g. +32470123456)';

-- ============================================================================
-- 2. Update interventions.source to include whatsapp_ai
-- ============================================================================
COMMENT ON COLUMN interventions.source IS 'Origin: web, phone_ai, whatsapp_ai, email, import';

-- ============================================================================
-- 3. Table: ai_whatsapp_sessions (conversation state)
-- ============================================================================
CREATE TABLE ai_whatsapp_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  phone_number_id UUID REFERENCES ai_phone_numbers(id) ON DELETE CASCADE,
  contact_phone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'
    CONSTRAINT valid_session_status CHECK (status IN ('active', 'completed', 'expired', 'failed')),
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  extracted_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  identified_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  intervention_id UUID REFERENCES interventions(id) ON DELETE SET NULL,
  language TEXT NOT NULL DEFAULT 'fr'
    CONSTRAINT valid_wa_language CHECK (language IN ('fr', 'nl', 'en')),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE ai_whatsapp_sessions IS 'WhatsApp AI conversation sessions — tracks state between async messages';

-- ============================================================================
-- 4. Indexes
-- ============================================================================
CREATE INDEX idx_wa_sessions_active_contact
  ON ai_whatsapp_sessions (team_id, contact_phone)
  WHERE status = 'active';

CREATE INDEX idx_wa_sessions_last_message
  ON ai_whatsapp_sessions (last_message_at)
  WHERE status = 'active';

CREATE INDEX idx_wa_sessions_team_created
  ON ai_whatsapp_sessions (team_id, created_at DESC);

-- ============================================================================
-- 5. RLS Policies
-- ============================================================================
ALTER TABLE ai_whatsapp_sessions ENABLE ROW LEVEL SECURITY;

-- Gestionnaires can view sessions for their team
CREATE POLICY "wa_sessions_select_team" ON ai_whatsapp_sessions
  FOR SELECT TO authenticated
  USING (
    team_id IN (
      SELECT tm.team_id FROM team_members tm
      JOIN users u ON u.id = tm.user_id
      WHERE u.auth_user_id = auth.uid()
        AND u.deleted_at IS NULL
        AND tm.role IN ('admin', 'gestionnaire')
        AND tm.left_at IS NULL
    )
  );
-- All writes via service_role (webhook handler)

-- ============================================================================
-- 6. Trigger: updated_at
-- ============================================================================
CREATE TRIGGER trg_wa_sessions_updated_at
  BEFORE UPDATE ON ai_whatsapp_sessions
  FOR EACH ROW EXECUTE FUNCTION update_ai_phone_updated_at();
```

### Step 3: Apply migration + regenerate types

```bash
npx supabase db push --linked
npm run supabase:types
```

### Acceptance Criteria
- [ ] `twilio` package in node_modules
- [ ] `ai_whatsapp_sessions` table exists with RLS enabled
- [ ] `ai_phone_numbers` has `whatsapp_enabled`, `twilio_whatsapp_number` columns
- [ ] `lib/database.types.ts` updated with new table/columns
- [ ] `npm run lint` passes

---

## Story 2: Twilio WhatsApp Service

**Goal:** Thin wrapper around Twilio SDK for sending WhatsApp messages and downloading media.

**Files:**
- Create: `lib/services/domain/ai-whatsapp/twilio-whatsapp.service.ts`
- Create: `lib/services/domain/ai-whatsapp/index.ts`

### Implementation

```typescript
// lib/services/domain/ai-whatsapp/twilio-whatsapp.service.ts

import twilio from 'twilio'
import { logger } from '@/lib/logger'

// ============================================================================
// Client (lazy singleton)
// ============================================================================

let _client: ReturnType<typeof twilio> | null = null

const getClient = () => {
  if (!_client) {
    const sid = process.env.TWILIO_ACCOUNT_SID
    const token = process.env.TWILIO_AUTH_TOKEN
    if (!sid || !token) throw new Error('TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN required')
    _client = twilio(sid, token)
  }
  return _client
}

// ============================================================================
// Send WhatsApp message
// ============================================================================

export const sendWhatsAppMessage = async (
  from: string,
  to: string,
  body: string
): Promise<string> => {
  const client = getClient()
  const message = await client.messages.create({
    from: `whatsapp:${from}`,
    to: `whatsapp:${to}`,
    body,
  })
  logger.info({ sid: message.sid, to }, '[TWILIO-WA] Message sent')
  return message.sid
}

// ============================================================================
// Send WhatsApp message with media
// ============================================================================

export const sendWhatsAppMediaMessage = async (
  from: string,
  to: string,
  body: string,
  mediaUrl: string
): Promise<string> => {
  const client = getClient()
  const message = await client.messages.create({
    from: `whatsapp:${from}`,
    to: `whatsapp:${to}`,
    body,
    mediaUrl: [mediaUrl],
  })
  logger.info({ sid: message.sid, to }, '[TWILIO-WA] Media message sent')
  return message.sid
}

// ============================================================================
// Download media from Twilio URL (authenticated)
// ============================================================================

export const downloadMedia = async (mediaUrl: string): Promise<{
  buffer: Buffer
  contentType: string
}> => {
  const sid = process.env.TWILIO_ACCOUNT_SID!
  const token = process.env.TWILIO_AUTH_TOKEN!
  const authHeader = 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64')

  const response = await fetch(mediaUrl, {
    headers: { Authorization: authHeader },
    redirect: 'follow',
  })

  if (!response.ok) {
    throw new Error(`Failed to download media: ${response.status} ${response.statusText}`)
  }

  const buffer = Buffer.from(await response.arrayBuffer())
  const contentType = response.headers.get('content-type') ?? 'application/octet-stream'

  logger.info({ contentType, size: buffer.length }, '[TWILIO-WA] Media downloaded')
  return { buffer, contentType }
}

// ============================================================================
// Validate Twilio webhook signature
// ============================================================================

export const validateWebhookSignature = (
  url: string,
  params: Record<string, string>,
  signature: string
): boolean => {
  const token = process.env.TWILIO_AUTH_TOKEN
  if (!token) return false
  return twilio.validateRequest(token, signature, url, params)
}
```

```typescript
// lib/services/domain/ai-whatsapp/index.ts
export * from './twilio-whatsapp.service'
```

### Acceptance Criteria
- [ ] `sendWhatsAppMessage()` accepts from/to/body, returns message SID
- [ ] `downloadMedia()` fetches Twilio-hosted media with Basic auth
- [ ] `validateWebhookSignature()` uses `twilio.validateRequest()`
- [ ] `npm run lint` passes

---

## Story 3: Webhook POST Handler

**Goal:** Receive incoming WhatsApp messages from Twilio, validate signature, identify team, dispatch to conversation engine.

**Files:**
- Modify: `app/api/webhooks/whatsapp/route.ts`

### Key Design Decisions

- **Twilio webhook format:** `application/x-www-form-urlencoded` (NOT JSON). Fields: `From`, `To`, `Body`, `NumMedia`, `MediaUrl0`, `MediaContentType0`.
- **Response:** Return `200` with empty TwiML `<Response></Response>` — we send replies asynchronously via API (not TwiML) to support the multi-turn conversation flow.
- **Pattern:** Mirror ElevenLabs webhook: validate → identify team → return 200 → `after()` does heavy work.

### Implementation

```typescript
// app/api/webhooks/whatsapp/route.ts

import { NextRequest, after } from 'next/server'
import { logger } from '@/lib/logger'
import { createServiceRoleSupabaseClient } from '@/lib/services/core/supabase-client'
import { validateWebhookSignature } from '@/lib/services/domain/ai-whatsapp'

// Existing GET handler stays unchanged

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    // ─── Step 1: Parse form data ──────────────────────────────────
    const formData = await request.formData()
    const params: Record<string, string> = {}
    formData.forEach((value, key) => { params[key] = String(value) })

    const from = params.From?.replace('whatsapp:', '') ?? ''
    const to = params.To?.replace('whatsapp:', '') ?? ''
    const body = params.Body ?? ''
    const numMedia = parseInt(params.NumMedia ?? '0', 10)
    const mediaUrl = params.MediaUrl0 ?? null
    const mediaContentType = params.MediaContentType0 ?? null

    logger.info({ from, to, numMedia, bodyLength: body.length }, '[WA-WEBHOOK] POST received')

    // ─── Step 2: Validate Twilio signature ────────────────────────
    const signature = request.headers.get('X-Twilio-Signature') ?? ''
    const webhookUrl = process.env.TWILIO_WEBHOOK_URL
      ?? `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/whatsapp`

    if (!validateWebhookSignature(webhookUrl, params, signature)) {
      logger.warn({ from }, '[WA-WEBHOOK] Signature validation failed')
      return new Response('<Response></Response>', {
        status: 403,
        headers: { 'Content-Type': 'text/xml' },
      })
    }

    // ─── Step 3: Identify team by "To" number ─────────────────────
    const supabase = createServiceRoleSupabaseClient()
    const { data: phoneConfig } = await supabase
      .from('ai_phone_numbers')
      .select('id, team_id, phone_number, custom_instructions, twilio_whatsapp_number')
      .eq('twilio_whatsapp_number', to)
      .eq('is_active', true)
      .eq('whatsapp_enabled', true)
      .limit(1)
      .maybeSingle()

    if (!phoneConfig) {
      logger.warn({ to }, '[WA-WEBHOOK] No team found for WhatsApp number')
      return new Response('<Response></Response>', {
        status: 200,
        headers: { 'Content-Type': 'text/xml' },
      })
    }

    // ─── Step 4: Return 200 immediately, defer to after() ─────────
    const messageData = {
      from, to, body, numMedia, mediaUrl, mediaContentType,
      teamId: phoneConfig.team_id,
      phoneNumberId: phoneConfig.id,
      phoneNumber: phoneConfig.twilio_whatsapp_number ?? phoneConfig.phone_number,
      customInstructions: phoneConfig.custom_instructions,
    }

    after(async () => {
      try {
        const { handleIncomingWhatsApp } = await import(
          '@/lib/services/domain/ai-whatsapp/conversation-engine.service'
        )
        await handleIncomingWhatsApp(messageData)
      } catch (error) {
        logger.error({ error, from }, '[WA-WEBHOOK] Async processing failed')
      }
    })

    logger.info(
      { from, teamId: phoneConfig.team_id, duration: Date.now() - startTime },
      '[WA-WEBHOOK] Accepted — processing deferred'
    )

    return new Response('<Response></Response>', {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    })

  } catch (error) {
    logger.error({ error, duration: Date.now() - startTime }, '[WA-WEBHOOK] Unexpected error')
    return new Response('<Response></Response>', {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    })
  }
}
```

### Acceptance Criteria
- [ ] Twilio signature validated via `twilio.validateRequest()`
- [ ] Team identified by `twilio_whatsapp_number` in `ai_phone_numbers`
- [ ] 200 returned immediately with empty TwiML
- [ ] Heavy work deferred to `after()`
- [ ] Form data parsed correctly (not JSON)
- [ ] `npm run lint` passes

---

## Story 4: Conversation Engine (Claude AI + Sessions)

**Goal:** Manage multi-turn WhatsApp conversations: load/create session, call Claude with history, extract structured data, send reply via Twilio.

**Files:**
- Create: `lib/services/domain/ai-whatsapp/conversation-engine.service.ts`
- Create: `lib/services/domain/ai-whatsapp/types.ts`

### Types

```typescript
// lib/services/domain/ai-whatsapp/types.ts

export interface IncomingWhatsAppMessage {
  from: string
  to: string
  body: string
  numMedia: number
  mediaUrl: string | null
  mediaContentType: string | null
  teamId: string
  phoneNumberId: string
  phoneNumber: string
  customInstructions: string | null
}

export interface SessionExtractedData {
  caller_name?: string
  address?: string
  problem_description?: string
  urgency?: 'basse' | 'normale' | 'haute' | 'urgente'
  additional_notes?: string
  media_urls?: string[]
}

export interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  media_type?: 'text' | 'image' | 'audio' | 'document'
}

export interface ClaudeResponse {
  text: string
  conversation_complete: boolean
  extracted_data?: Partial<SessionExtractedData>
}
```

### Conversation Engine

```typescript
// lib/services/domain/ai-whatsapp/conversation-engine.service.ts

import { generateText, Output } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import { createServiceRoleSupabaseClient } from '@/lib/services/core/supabase-client'
import { sendWhatsAppMessage } from './twilio-whatsapp.service'
import type {
  IncomingWhatsAppMessage,
  SessionExtractedData,
  ConversationMessage,
  ClaudeResponse,
} from './types'

// ============================================================================
// Constants
// ============================================================================

const SESSION_TIMEOUT_MS = 2 * 60 * 60 * 1000 // 2 hours
const MAX_MESSAGES_PER_SESSION = 30

// ============================================================================
// Claude response schema (AI SDK 6 — Output.object)
// ============================================================================

const claudeResponseSchema = z.object({
  text: z.string().describe('The message to send to the tenant'),
  conversation_complete: z.boolean().describe('true when step 4 (closure) is done'),
  extracted_data: z.object({
    caller_name: z.string().optional(),
    address: z.string().optional(),
    problem_description: z.string().optional(),
    urgency: z.enum(['basse', 'normale', 'haute', 'urgente']).optional(),
    additional_notes: z.string().optional(),
  }).optional().describe('Data extracted from this message'),
})

// ============================================================================
// Main entry point (called from webhook after())
// ============================================================================

export const handleIncomingWhatsApp = async (
  message: IncomingWhatsAppMessage
): Promise<void> => {
  const supabase = createServiceRoleSupabaseClient()

  // ─── 1. Load or create session ──────────────────────────────────
  let session = await findActiveSession(supabase, message.teamId, message.from)

  if (!session) {
    session = await createSession(supabase, message)
    logger.info({ sessionId: session.id, from: message.from }, '[WA-ENGINE] New session created')
  } else {
    logger.info({ sessionId: session.id, from: message.from }, '[WA-ENGINE] Existing session loaded')
  }

  // ─── 2. Handle media (photo) ────────────────────────────────────
  let imageBase64: string | null = null
  if (message.numMedia > 0 && message.mediaUrl && message.mediaContentType?.startsWith('image/')) {
    try {
      const { downloadMedia } = await import('./twilio-whatsapp.service')
      const { buffer, contentType } = await downloadMedia(message.mediaUrl)

      // Store in Supabase Storage
      const fileName = `whatsapp/${session.id}/${Date.now()}.jpg`
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, buffer, { contentType, upsert: false })

      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('documents').getPublicUrl(fileName)
        const mediaUrls = (session.extracted_data as SessionExtractedData).media_urls ?? []
        mediaUrls.push(urlData.publicUrl)
        session.extracted_data = { ...(session.extracted_data as SessionExtractedData), media_urls: mediaUrls }
      }

      // Prepare for Claude vision
      imageBase64 = buffer.toString('base64')

      logger.info({ fileName }, '[WA-ENGINE] Photo downloaded and stored')
    } catch (err) {
      logger.error({ err }, '[WA-ENGINE] Failed to download/store photo — continuing without it')
    }
  }

  // ─── 3. Add user message to history ─────────────────────────────
  const messages = (session.messages as ConversationMessage[]) ?? []
  messages.push({
    role: 'user',
    content: message.body || (message.numMedia > 0 ? '[photo]' : '[empty]'),
    timestamp: new Date().toISOString(),
    media_type: message.numMedia > 0 ? 'image' : 'text',
  })

  // ─── 4. Call Claude ─────────────────────────────────────────────
  const teamName = await getTeamName(supabase, message.teamId)
  const claudeResponse = await callClaude(
    messages,
    teamName,
    message.customInstructions,
    session.extracted_data as SessionExtractedData,
    imageBase64,
    message.mediaContentType
  )

  // ─── 5. Add assistant response to history ───────────────────────
  messages.push({
    role: 'assistant',
    content: claudeResponse.text,
    timestamp: new Date().toISOString(),
  })

  // ─── 6. Merge extracted data ────────────────────────────────────
  const extractedData: SessionExtractedData = {
    ...(session.extracted_data as SessionExtractedData),
    ...claudeResponse.extracted_data,
  }
  // Preserve media_urls from step 2
  if ((session.extracted_data as SessionExtractedData).media_urls) {
    extractedData.media_urls = (session.extracted_data as SessionExtractedData).media_urls
  }

  // ─── 7. Update session in DB ────────────────────────────────────
  const newStatus = claudeResponse.conversation_complete ? 'completed' : 'active'
  await supabase
    .from('ai_whatsapp_sessions')
    .update({
      messages: messages as unknown as Record<string, unknown>[],
      extracted_data: extractedData as unknown as Record<string, unknown>,
      status: newStatus,
      last_message_at: new Date().toISOString(),
      language: detectLanguage(message.body),
    })
    .eq('id', session.id)

  // ─── 8. Send reply via Twilio ───────────────────────────────────
  await sendWhatsAppMessage(message.phoneNumber, message.from, claudeResponse.text)
  logger.info({ sessionId: session.id, complete: claudeResponse.conversation_complete }, '[WA-ENGINE] Reply sent')

  // ─── 9. If complete → create intervention ───────────────────────
  if (claudeResponse.conversation_complete) {
    try {
      const { createInterventionFromSession } = await import('./intervention-creator.service')
      await createInterventionFromSession(session.id, message.teamId, extractedData, messages)
    } catch (err) {
      logger.error({ err, sessionId: session.id }, '[WA-ENGINE] Failed to create intervention')
    }
  }
}

// ============================================================================
// Session management
// ============================================================================

const findActiveSession = async (
  supabase: ReturnType<typeof createServiceRoleSupabaseClient>,
  teamId: string,
  contactPhone: string
) => {
  const cutoff = new Date(Date.now() - SESSION_TIMEOUT_MS).toISOString()

  const { data } = await supabase
    .from('ai_whatsapp_sessions')
    .select('*')
    .eq('team_id', teamId)
    .eq('contact_phone', contactPhone)
    .eq('status', 'active')
    .gt('last_message_at', cutoff)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return data
}

const createSession = async (
  supabase: ReturnType<typeof createServiceRoleSupabaseClient>,
  message: IncomingWhatsAppMessage
) => {
  const { data, error } = await supabase
    .from('ai_whatsapp_sessions')
    .insert({
      team_id: message.teamId,
      phone_number_id: message.phoneNumberId,
      contact_phone: message.from,
      status: 'active',
      messages: [],
      extracted_data: {},
      language: 'fr',
      last_message_at: new Date().toISOString(),
    })
    .select('*')
    .single()

  if (error || !data) {
    throw new Error(`Failed to create session: ${error?.message ?? 'no data'}`)
  }
  return data
}

// ============================================================================
// Claude AI
// ============================================================================

const callClaude = async (
  messages: ConversationMessage[],
  teamName: string,
  customInstructions: string | null,
  extractedData: SessionExtractedData,
  imageBase64: string | null,
  imageContentType: string | null
): Promise<ClaudeResponse> => {
  const systemPrompt = buildSystemPrompt(teamName, customInstructions, extractedData)

  // Build AI SDK messages from conversation history
  const aiMessages = messages.map((m) => {
    if (m.role === 'user' && imageBase64 && m === messages[messages.length - 1] && m.media_type === 'image') {
      // Last message with image → multimodal
      return {
        role: 'user' as const,
        content: [
          { type: 'text' as const, text: m.content || 'Le locataire a envoye cette photo.' },
          {
            type: 'image' as const,
            image: imageBase64,
            mimeType: imageContentType ?? 'image/jpeg',
          },
        ],
      }
    }
    return { role: m.role, content: m.content }
  })

  const result = await generateText({
    model: anthropic('claude-haiku-4-5'),
    system: systemPrompt,
    messages: aiMessages,
    output: Output.object({ schema: claudeResponseSchema }),
    temperature: 0.2,
    maxTokens: 400,
  })

  if (!result.output) {
    // Fallback: if structured output fails, use raw text
    logger.warn('[WA-ENGINE] Claude structured output failed — using fallback')
    return {
      text: result.text || 'Desole, je rencontre un probleme technique. Veuillez reessayer.',
      conversation_complete: false,
    }
  }

  return result.output
}

// ============================================================================
// System prompt
// ============================================================================

const buildSystemPrompt = (
  teamName: string,
  customInstructions: string | null,
  extractedData: SessionExtractedData
): string => {
  let prompt = `Tu es un assistant WhatsApp de prise de demandes d'intervention pour ${teamName}.

## Ton role
Tu collectes les informations necessaires pour creer une demande d'intervention de maintenance. Tu ne donnes JAMAIS de conseils techniques, d'estimation de prix, ni de decision sur l'urgence ou le prestataire.

## Regles strictes
- Tes reponses font maximum 2-3 phrases. WhatsApp = messages courts.
- Tu reponds dans la langue du locataire (francais, neerlandais ou anglais).
- Si tu ne comprends pas, demande de reformuler.
- Propose d'envoyer une photo quand c'est pertinent (fuite, degat, casse).
- Si le locataire mentionne un danger (gaz, incendie, inondation), dis immediatement : "Si vous etes en danger, appelez le 112." puis continue avec urgence "urgente".
- Si le locataire parle d'un sujet hors-intervention, redirige poliment.
- Si le locataire envoie une note vocale, reponds : "Je ne peux pas ecouter les messages vocaux pour le moment. Pourriez-vous decrire votre probleme par ecrit ? Merci !"

## Script (4 etapes)
ETAPE 1 — IDENTIFICATION : Demande le nom complet et l'adresse du logement.
ETAPE 2 — DESCRIPTION : "Quel est le probleme ?" + propose une photo.
ETAPE 3 — CONFIRMATION : Resume (nom, adresse, probleme) et demande confirmation.
ETAPE 4 — CLOTURE : Confirme l'enregistrement, remercie. Met conversation_complete a true.

## Format de reponse
TOUJOURS repondre avec un objet JSON :
- text: le message a envoyer
- conversation_complete: true uniquement apres confirmation a l'etape 3
- extracted_data: donnees extraites de ce message (cumulatif)`

  if (extractedData.caller_name || extractedData.address || extractedData.problem_description) {
    prompt += `\n\n## Donnees deja collectees\n`
    if (extractedData.caller_name) prompt += `- Nom: ${extractedData.caller_name}\n`
    if (extractedData.address) prompt += `- Adresse: ${extractedData.address}\n`
    if (extractedData.problem_description) prompt += `- Probleme: ${extractedData.problem_description}\n`
    if (extractedData.urgency) prompt += `- Urgence: ${extractedData.urgency}\n`
  }

  if (customInstructions) {
    prompt += `\n\n## Instructions specifiques de l'equipe\n${customInstructions}`
  }

  return prompt
}

// ============================================================================
// Helpers
// ============================================================================

const getTeamName = async (
  supabase: ReturnType<typeof createServiceRoleSupabaseClient>,
  teamId: string
): Promise<string> => {
  const { data } = await supabase
    .from('teams')
    .select('name')
    .eq('id', teamId)
    .single()
  return data?.name ?? 'Votre gestionnaire'
}

const detectLanguage = (text: string): 'fr' | 'nl' | 'en' => {
  const lower = text.toLowerCase()
  const nlWords = ['hallo', 'goedendag', 'probleem', 'lekkage', 'verwarming', 'dank', 'huis']
  const enWords = ['hello', 'hi', 'problem', 'leak', 'heating', 'thanks', 'house']
  if (nlWords.some(w => lower.includes(w))) return 'nl'
  if (enWords.some(w => lower.includes(w))) return 'en'
  return 'fr'
}
```

### Acceptance Criteria
- [ ] Session created on first message, reused within 2h window
- [ ] Claude called with full conversation history
- [ ] Structured output (text + conversation_complete + extracted_data) via Zod
- [ ] Fallback if structured output fails
- [ ] Reply sent via Twilio
- [ ] Session updated in DB after each message
- [ ] `npm run lint` passes

---

## Story 5: Photo Handling

**Already integrated in Story 4** — the `handleIncomingWhatsApp` function handles:
1. Download from Twilio `MediaUrl0` (authenticated via Basic auth)
2. Upload to Supabase Storage (`documents` bucket, path `whatsapp/{sessionId}/{timestamp}.jpg`)
3. Pass base64 to Claude as multimodal image content
4. Store public URL in `extracted_data.media_urls[]`

No separate story needed — verify during Story 4 testing.

---

## Story 6: Create Intervention from Completed Session

**Goal:** When Claude sets `conversation_complete: true`, create a SEIDO intervention with the extracted data. Follows the **3-step pattern** from the ElevenLabs webhook (intervention + assignments + threads).

**AUDIT CORRECTIONS APPLIED:**
- BUG 1: `created_by` (not `created_by_user_id` — field doesn't exist)
- BUG 2: `creation_source: 'whatsapp_ai'` added (migration 20260315)
- BUG 3: Uses `InterventionRepository.create()` with `skipInitialSelect: true` (RLS blocks SELECT before assignment)
- BUG 4: Adds `intervention_assignments` + `conversation_threads` + `conversation_participants` (without these, gestionnaire can't see the intervention due to RLS)
- BUG 6: Reuses `normalizePhoneE164` from `call-transcript-analyzer.service.ts`

**Files:**
- Create: `lib/services/domain/ai-whatsapp/intervention-creator.service.ts`

### Implementation

```typescript
// lib/services/domain/ai-whatsapp/intervention-creator.service.ts

import { logger } from '@/lib/logger'
import { createServiceRoleSupabaseClient } from '@/lib/services/core/supabase-client'
import { normalizePhoneE164 } from '@/lib/services/domain/ai-phone/call-transcript-analyzer.service'
import type { SessionExtractedData, ConversationMessage } from './types'

// ============================================================================
// Create intervention from completed WhatsApp session
// ============================================================================

export const createInterventionFromSession = async (
  sessionId: string,
  teamId: string,
  extractedData: SessionExtractedData,
  messages: ConversationMessage[]
): Promise<string | null> => {
  const supabase = createServiceRoleSupabaseClient()

  // ─── 1. Load session data ───────────────────────────────────────
  const { data: session } = await supabase
    .from('ai_whatsapp_sessions')
    .select('contact_phone, identified_user_id, language')
    .eq('id', sessionId)
    .single()

  // ─── 2. Try to match tenant by phone ────────────────────────────
  let identifiedUserId = session?.identified_user_id ?? null
  let identifiedUserName = extractedData.caller_name ?? 'Locataire WhatsApp'

  if (!identifiedUserId && session?.contact_phone) {
    const normalizedPhone = normalizePhoneE164(session.contact_phone)

    // Match within the same team via team_members
    const { data: matchedUser } = await supabase
      .from('users')
      .select('id, first_name, last_name')
      .ilike('phone', `%${normalizedPhone.replace('+', '')}%`)
      .limit(1)
      .maybeSingle()

    if (matchedUser) {
      identifiedUserId = matchedUser.id
      identifiedUserName = [matchedUser.first_name, matchedUser.last_name].filter(Boolean).join(' ') || identifiedUserName
      logger.info({ userId: matchedUser.id }, '[WA-INTERVENTION] Tenant matched by phone')
    }
  }

  // ─── 3. Try to match building by address (best-effort) ─────────
  let buildingId: string | null = null
  let lotId: string | null = null

  if (extractedData.address) {
    const { data: buildings } = await supabase
      .from('buildings_active')
      .select('id, address:addresses!inner(street, city)')
      .eq('team_id', teamId)
      .limit(50)

    if (buildings?.length) {
      const normalizedAddress = extractedData.address.toLowerCase()
      const match = buildings.find((b) => {
        const addr = b.address as { street: string; city: string } | null
        if (!addr) return false
        return normalizedAddress.includes(addr.street.toLowerCase())
          || normalizedAddress.includes(addr.city.toLowerCase())
      })
      if (match) buildingId = match.id
    }
  }

  // ─── 4. Build transcript + description ──────────────────────────
  const transcript = messages
    .map(m => `[${m.role === 'user' ? 'Locataire' : 'IA'}] ${m.content}`)
    .join('\n')

  const urgencyMap: Record<string, string> = {
    basse: 'basse', normale: 'normale', haute: 'haute', urgente: 'urgente',
  }

  const title = extractedData.problem_description
    ? `[WhatsApp] ${extractedData.problem_description.slice(0, 100)}`
    : '[WhatsApp] Demande via WhatsApp'

  const descriptionParts = [
    extractedData.problem_description,
    '',
    '--- Details WhatsApp ---',
    `Signale par : ${identifiedUserName}`,
    session?.contact_phone ? `Telephone : ${session.contact_phone}` : null,
    extractedData.address ? `Adresse : ${extractedData.address}` : null,
    `Urgence : ${extractedData.urgency ?? 'normale'}`,
    extractedData.additional_notes ? `\nNotes : ${extractedData.additional_notes}` : null,
    '',
    '--- Conversation WhatsApp ---',
    transcript,
  ].filter(Boolean).join('\n')

  // ─── STEP 1: INSERT intervention via Repository ─────────────────
  // Uses InterventionRepository.create() with skipInitialSelect: true
  // because RLS blocks SELECT before assignments are created
  const { InterventionRepository } = await import('@/lib/services/repositories/intervention.repository')
  const interventionRepo = new InterventionRepository(supabase)

  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const mins = String(now.getMinutes()).padStart(2, '0')
  const secs = String(now.getSeconds()).padStart(2, '0')
  const randomSuffix = Math.random().toString(36).substring(2, 5).toUpperCase()
  const reference = `INT-${year}${month}${day}${hours}${mins}${secs}-${randomSuffix}`

  const interventionResult = await interventionRepo.create(
    {
      title,
      description: descriptionParts,
      urgency: urgencyMap[extractedData.urgency ?? 'normale'] ?? 'normale',
      reference,
      team_id: teamId,
      building_id: buildingId,
      lot_id: lotId,
      status: 'demande',
      source: 'whatsapp_ai',
      creation_source: 'whatsapp_ai',
      created_by: identifiedUserId, // nullable — OK if tenant not identified
    },
    { skipInitialSelect: true }
  )

  if (!interventionResult.success || !interventionResult.data) {
    logger.error({ error: interventionResult.error, sessionId }, '[WA-INTERVENTION] Failed to create intervention')
    return null
  }

  const interventionId = interventionResult.data.id
  logger.info({ interventionId, sessionId }, '[WA-INTERVENTION] Intervention created (step 1/3)')

  // ─── STEP 2a: ASSIGN tenant (if identified) ────────────────────
  if (identifiedUserId) {
    const { error: assignError } = await supabase
      .from('intervention_assignments')
      .insert({
        intervention_id: interventionId,
        user_id: identifiedUserId,
        role: 'locataire',
        is_primary: true,
        assigned_by: identifiedUserId,
        assigned_at: new Date().toISOString(),
      })

    if (assignError) {
      logger.warn({ error: assignError }, '[WA-INTERVENTION] Failed to assign tenant (non-blocking)')
    }
  }

  // ─── STEP 2b: ASSIGN all team gestionnaires ────────────────────
  const { data: teamManagers } = await supabase
    .from('team_members')
    .select('user_id')
    .eq('team_id', teamId)
    .eq('role', 'gestionnaire')
    .is('left_at', null)

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
        await supabase.from('conversation_threads').insert({
          intervention_id: interventionId,
          thread_type: 'tenant_to_managers',
          title: `Conversation avec ${identifiedUserName}`,
          created_by: identifiedUserId,
          team_id: teamId,
        })

        // Add tenant as participant
        const { data: tenantThread } = await supabase
          .from('conversation_threads')
          .select('id')
          .eq('intervention_id', interventionId)
          .eq('thread_type', 'tenant_to_managers')
          .limit(1)
          .maybeSingle()

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

  // ─── 5. Update session with intervention link ───────────────────
  await supabase
    .from('ai_whatsapp_sessions')
    .update({
      intervention_id: interventionId,
      identified_user_id: identifiedUserId,
    })
    .eq('id', sessionId)

  // ─── 6. Log in ai_phone_calls (unified log) ────────────────────
  // BUG 7: elevenlabs_conversation_id has UNIQUE constraint — wa-{sessionId} is unique per session
  await supabase
    .from('ai_phone_calls')
    .insert({
      team_id: teamId,
      phone_number_id: null,
      elevenlabs_conversation_id: `wa-${sessionId}`,
      caller_phone: session?.contact_phone ?? null,
      channel: 'whatsapp_text',
      identified_user_id: identifiedUserId,
      intervention_id: interventionId,
      transcript,
      structured_summary: extractedData as unknown as Record<string, unknown>,
      language: session?.language ?? 'fr',
      call_status: 'completed',
      media_urls: (extractedData.media_urls ?? []) as unknown as Record<string, unknown>,
    })

  // ─── 7. Notify gestionnaire (push + email) ─────────────────────
  try {
    const { createInterventionNotification } = await import('@/app/actions/notification-actions')
    await createInterventionNotification(interventionId)
    logger.info({ interventionId }, '[WA-INTERVENTION] Gestionnaire notified')
  } catch (err) {
    logger.error({ err }, '[WA-INTERVENTION] Failed to send notification')
  }

  return interventionId
}
```

### Acceptance Criteria
- [ ] Intervention created via `InterventionRepository.create()` with `skipInitialSelect: true`
- [ ] Fields: `source: 'whatsapp_ai'`, `creation_source: 'whatsapp_ai'`, `created_by: identifiedUserId` (nullable)
- [ ] `intervention_assignments` created for tenant (if identified) + all team gestionnaires
- [ ] `conversation_threads` created (group + tenant_to_managers if tenant identified)
- [ ] Tenant matched by phone number using `normalizePhoneE164` (reused from ai-phone)
- [ ] Building matched by address (fuzzy, best-effort)
- [ ] Transcript saved in `ai_phone_calls` with `channel: 'whatsapp_text'`
- [ ] `createInterventionNotification()` called (push + email)
- [ ] Session updated with `intervention_id`
- [ ] `npm run lint` passes

---

## Story 7: Gestionnaire Notifications

**Already integrated in Story 6** — `createInterventionNotification()` handles both push and email notifications using the existing SEIDO notification system. The intervention has `source: 'whatsapp_ai'` so the gestionnaire knows it came from WhatsApp.

No separate story needed.

---

## Story 8: Manual Provisioning (Dev Mode)

**Goal:** Allow local dev/testing with `DEV_*` environment variables.

**Files:**
- Modify: `lib/services/domain/ai-whatsapp/index.ts` (add provisioning helper)

### Implementation

Add to `.env.local`:
```bash
# WhatsApp AI Agent
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_WEBHOOK_URL=https://xxxx.ngrok-free.app/api/webhooks/whatsapp

# Dev mode — manual WhatsApp provisioning
DEV_WHATSAPP_PHONE_NUMBER=+32470XXXXXX
```

Add a seed script or manual DB insert:
```sql
-- Run once in Supabase SQL editor to enable WhatsApp for a team
UPDATE ai_phone_numbers
SET whatsapp_enabled = true,
    twilio_whatsapp_number = '+32470XXXXXX'
WHERE team_id = 'YOUR_TEAM_ID';

-- Or INSERT if no ai_phone_numbers row exists yet:
INSERT INTO ai_phone_numbers (team_id, phone_number, whatsapp_enabled, twilio_whatsapp_number, is_active)
VALUES ('YOUR_TEAM_ID', '+32470XXXXXX', true, '+32470XXXXXX', true);
```

### Acceptance Criteria
- [ ] `DEV_WHATSAPP_PHONE_NUMBER` used for local testing
- [ ] `ai_phone_numbers` row with `whatsapp_enabled=true` routes messages to conversation engine
- [ ] End-to-end test: send WhatsApp to number → receive AI reply

---

## Environment Variables — Complete List

```bash
# === SEIDO WhatsApp AI Agent ===

# Twilio (BSP for WhatsApp)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_WEBHOOK_URL=https://seido-app.com/api/webhooks/whatsapp  # or ngrok in dev

# Anthropic (already exists for AI phone)
ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxxx

# Dev mode
DEV_WHATSAPP_PHONE_NUMBER=+32470XXXXXX

# Keep existing Meta vars for webhook GET verification
META_WHATSAPP_VERIFY_TOKEN=seido-whatsapp-verify-2026
```

---

## Testing Strategy

### Manual E2E Test (with Twilio Sandbox)

1. Join Twilio WhatsApp sandbox: send `join <keyword>` to sandbox number
2. Configure sandbox webhook → ngrok URL → `/api/webhooks/whatsapp`
3. Send "Bonjour, j'ai une fuite" → verify Claude responds
4. Complete 4-step script → verify intervention created in SEIDO
5. Send a photo → verify it appears in Supabase Storage

### Unit Tests (Vitest)

| Test | File |
|------|------|
| Claude prompt building | `tests/unit/ai-whatsapp/conversation-engine.test.ts` |
| Language detection | `tests/unit/ai-whatsapp/conversation-engine.test.ts` |
| Session timeout logic | `tests/unit/ai-whatsapp/conversation-engine.test.ts` |

### Integration Tests

| Test | File |
|------|------|
| Session CRUD (create, find, update) | `tests/integration/ai-whatsapp/sessions.test.ts` |
| Intervention creation from session | `tests/integration/ai-whatsapp/intervention-creator.test.ts` |

---

## File Tree Summary

```
lib/services/domain/ai-whatsapp/
  index.ts                           # Re-exports
  types.ts                           # Shared types
  twilio-whatsapp.service.ts         # Twilio SDK wrapper (send, download, validate)
  conversation-engine.service.ts     # Session mgmt + Claude AI + reply
  intervention-creator.service.ts    # Session → SEIDO intervention

app/api/webhooks/whatsapp/
  route.ts                           # POST handler (modified) + existing GET

supabase/migrations/
  YYYYMMDDHHMMSS_create_whatsapp_sessions.sql
```

**Total new files:** 5 + 1 migration
**Modified files:** 1 (webhook route)
**Estimated total lines:** ~600
