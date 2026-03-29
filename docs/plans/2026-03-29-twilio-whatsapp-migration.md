# Twilio WhatsApp Migration — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sp-executing-plans to implement this plan task-by-task.

**Goal:** Replace Meta Graph API direct with Twilio WhatsApp API for all WhatsApp messaging — simpler provisioning, single provider, no WABA limits.
**Architecture:** Twilio handles Meta WABA registration behind the scenes. We send/receive WhatsApp messages via Twilio API (same format as SMS but with `whatsapp:` prefix). Webhook validation uses `X-Twilio-Signature` (HMAC-SHA1). No Twilio SDK needed — we already use raw fetch + HMAC in `twilio-number.service.ts`.
**Tech Stack:** Twilio REST API (no SDK), Next.js API routes, Supabase

---

## Acceptance Criteria

- [ ] WhatsApp messages sent via Twilio API (not Meta Graph API)
- [ ] Incoming WhatsApp messages received via Twilio webhook (form-encoded, not Meta JSON)
- [ ] Webhook signature validated with `X-Twilio-Signature` (HMAC-SHA1)
- [ ] Media download works (Twilio provides direct URL, not 2-step resolve)
- [ ] Provisioning flow simplified (no Meta registration steps)
- [ ] `meta-whatsapp.service.ts`, `meta-registration.service.ts`, `meta-graph-api.ts` deleted
- [ ] SMS verification webhook removed (no longer needed)
- [ ] Conversation engine works end-to-end with Twilio
- [ ] Lint passes (`npm run lint`)
- [ ] Existing unit tests pass (`npm test`)

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Twilio WhatsApp sender approval delayed | Medium | High | Test with Twilio Sandbox first |
| Webhook URL mismatch (ngrok/prod) | Low | Medium | Already fixed with X-Forwarded-Host |
| Media URL auth differs | Low | Low | Twilio provides public URLs, simpler than Meta |

## Dependencies

- **External:** Twilio WhatsApp Sender approval for +32 460 25 76 59 (in progress)
- **Env vars:** `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` (already set)
- **No new npm packages** — using raw fetch (same pattern as existing twilio-number.service.ts)
- **No DB migration** — `ai_phone_numbers` schema already has both `phone_number` and `whatsapp_number`

## Story Order

Schema → Backend → UI (no schema or UI changes needed — pure backend)

---

## Task 1: Create `twilio-whatsapp.service.ts` (S)

Replace Meta Graph API messaging with Twilio API calls. Same function signatures for minimal downstream impact.

**Files:**
- Create: `lib/services/domain/ai-whatsapp/twilio-whatsapp.service.ts`
- Delete: `lib/services/domain/ai-whatsapp/meta-whatsapp.service.ts`
- Delete: `lib/services/domain/meta-graph-api.ts`

**Step 1: Create the new service**

```typescript
// lib/services/domain/ai-whatsapp/twilio-whatsapp.service.ts
import { createHmac, timingSafeEqual } from 'crypto'
import { logger } from '@/lib/logger'

// ============================================================================
// Twilio auth (same pattern as twilio-number.service.ts)
// ============================================================================

const getTwilioAuth = () => {
  const sid = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  if (!sid || !token) throw new Error('TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN required')
  return { sid, token, header: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64') }
}

// ============================================================================
// Send WhatsApp text message
// ============================================================================

export const sendWhatsAppMessage = async (
  fromNumber: string,
  to: string,
  body: string
): Promise<string> => {
  const { sid, header } = getTwilioAuth()

  const params = new URLSearchParams({
    From: `whatsapp:${fromNumber}`,
    To: `whatsapp:${to}`,
    Body: body,
  })

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: header,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Twilio WhatsApp send failed (${response.status}): ${error}`)
  }

  const data = await response.json() as { sid: string }
  logger.info({ messageSid: data.sid, to }, '[TWILIO-WA] Message sent')
  return data.sid
}

// ============================================================================
// Send WhatsApp media message
// ============================================================================

export const sendWhatsAppMediaMessage = async (
  fromNumber: string,
  to: string,
  caption: string,
  mediaUrl: string
): Promise<string> => {
  const { sid, header } = getTwilioAuth()

  const params = new URLSearchParams({
    From: `whatsapp:${fromNumber}`,
    To: `whatsapp:${to}`,
    Body: caption,
    MediaUrl: mediaUrl,
  })

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: header,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Twilio WhatsApp media send failed (${response.status}): ${error}`)
  }

  const data = await response.json() as { sid: string }
  logger.info({ messageSid: data.sid, to }, '[TWILIO-WA] Media message sent')
  return data.sid
}

// ============================================================================
// Download media (Twilio provides direct authenticated URL)
// ============================================================================

export const downloadMedia = async (mediaUrl: string): Promise<{
  buffer: Buffer
  contentType: string
}> => {
  const { header } = getTwilioAuth()

  const response = await fetch(mediaUrl, {
    headers: { Authorization: header },
  })

  if (!response.ok) {
    throw new Error(`Failed to download media: ${response.status}`)
  }

  const buffer = Buffer.from(await response.arrayBuffer())
  const contentType = response.headers.get('content-type') ?? 'application/octet-stream'

  logger.info({ contentType, size: buffer.length }, '[TWILIO-WA] Media downloaded')
  return { buffer, contentType }
}

// ============================================================================
// Validate Twilio webhook signature (HMAC-SHA1)
// Re-exports from twilio-number.service for convenience
// ============================================================================

export { validateTwilioSignature } from '@/lib/services/domain/ai-phone/twilio-number.service'
```

**Step 2: Delete old files**
- Delete `lib/services/domain/ai-whatsapp/meta-whatsapp.service.ts`
- Delete `lib/services/domain/meta-graph-api.ts`

**Step 3: Update barrel export**

```typescript
// lib/services/domain/ai-whatsapp/index.ts
export * from './twilio-whatsapp.service'
export * from './conversation-engine.service'
```

**Step 4: Lint**
```bash
npm run lint
```

---

## Task 2: Update conversation engine imports + params (XS)

Update `conversation-engine.service.ts` to use the new Twilio service. Key change: the `fromNumber` param is now the Twilio phone number (stored in DB as `whatsapp_number` or `phone_number`), not Meta's `phone_number_id`.

**Files:**
- Modify: `lib/services/domain/ai-whatsapp/conversation-engine.service.ts`
- Modify: `lib/services/domain/ai-whatsapp/types.ts`

**Step 1: Update types.ts**

Remove `metaPhoneNumberId` from `IncomingWhatsAppMessage`. The `phoneNumberId` (DB record ID) is sufficient for lookups.

**Step 2: Update conversation-engine.service.ts**

- Change import from `./meta-whatsapp.service` → `./twilio-whatsapp.service`
- Where `sendWhatsAppMessage(message.metaPhoneNumberId, ...)` is called, replace with `sendWhatsAppMessage(phoneConfig.whatsapp_number ?? phoneConfig.phone_number, ...)`
- Where `downloadMedia(message.mediaId)` is called, replace with `downloadMedia(message.mediaUrl)` (Twilio provides full URL via `MediaUrl0`)

**Step 3: Lint**

---

## Task 3: Rewrite WhatsApp webhook for Twilio format (S)

The webhook switches from Meta JSON format to Twilio form-encoded format. Same structure as the SMS webhook.

**Files:**
- Modify: `app/api/webhooks/whatsapp/route.ts`

**Step 1: Rewrite POST handler**

Key differences from Meta webhook:
- **No GET handler** (Twilio doesn't need subscription verification handshake)
- **Form-encoded body** (not JSON) — same as SMS: `Body`, `From`, `To`, `NumMedia`, `MediaUrl0`, `ProfileName`
- **`From`/`To` have `whatsapp:` prefix** — strip before use
- **Signature validation**: `X-Twilio-Signature` with `validateTwilioSignature(url, params, signature)` (already working in SMS webhook)
- **DB lookup**: by `phone_number` or `whatsapp_number` (from `To` field), not `meta_phone_number_id`
- **Response**: TwiML `<Response></Response>` (empty = no auto-reply, we reply via API)

```typescript
// Webhook payload fields (Twilio WhatsApp):
// From: "whatsapp:+32470123456" (sender)
// To: "whatsapp:+32460257659" (our number)
// Body: "Bonjour, j'ai une fuite" (message text)
// NumMedia: "1" (number of media attachments)
// MediaUrl0: "https://api.twilio.com/..." (media URL, auth required)
// MediaContentType0: "image/jpeg"
// ProfileName: "Jean Dupont" (WhatsApp display name)
// WaId: "32470123456" (WhatsApp ID without +)
// MessageSid: "SM..." (unique message ID)
```

**Step 2: Lint**

---

## Task 4: Simplify provisioning — remove Meta registration (S)

Remove the Meta WABA registration steps from auto-provisioning. Twilio handles Meta registration when you configure a number as a WhatsApp Sender.

**Files:**
- Modify: `lib/services/domain/ai-phone/phone-provisioning.service.ts`
- Delete: `lib/services/domain/ai-phone/meta-registration.service.ts`

**Step 1: Update `provisionAuto()`**

Remove steps 2-3 (Meta register + request verification). The flow becomes:
1. Buy Twilio number (with SMS webhook)
2. Configure as WhatsApp sender (Twilio Console — manual for now)
3. Insert DB record with status `active` (or `pending_whatsapp_approval` if we want to track)

For now, the auto flow just purchases the Twilio number and sets up SMS. WhatsApp sender approval is done via Twilio Console (async, hours-to-days). The `provisionManual()` function stays as-is for dev mode.

**Step 2: Update `provisionManual()`**

Remove dependency on `META_WHATSAPP_PHONE_NUMBER_ID`. Use `DEV_PHONE_NUMBER` or `DEV_WHATSAPP_PHONE_NUMBER` only.

**Step 3: Delete `meta-registration.service.ts`**

**Step 4: Lint**

---

## Task 5: Remove SMS verification webhook + cleanup (XS)

The SMS verification webhook was only needed for Meta WABA phone number verification. With Twilio handling registration, it's no longer needed.

**Files:**
- Delete: `app/api/webhooks/sms-verification/route.ts` (entire directory)
- Modify: `.env.example` (remove Meta-only vars, add comments)
- Modify: `lib/services/domain/ai-phone/index.ts` (remove meta-registration export if any)

**Step 1: Delete SMS verification webhook**

Remove `app/api/webhooks/sms-verification/` directory entirely.

**Step 2: Update `.env.example`**

Remove:
```
META_WHATSAPP_VERIFY_TOKEN
META_WHATSAPP_APP_SECRET
META_WHATSAPP_PHONE_NUMBER_ID
DEV_WHATSAPP_PHONE_NUMBER
```

Keep (still needed if manually registering with Meta WABA in future):
```
META_WHATSAPP_ACCESS_TOKEN
META_WHATSAPP_BUSINESS_ID
```

**Step 3: Clean up any remaining imports of deleted files**

```bash
npm run lint
```

---

## Task 6: Update Twilio Console + end-to-end test (XS)

**Step 1: Configure Twilio webhook**

In Twilio Console → Phone Numbers → +32 460 25 76 59:
- **When a message comes in**: `https://<ngrok-or-prod>/api/webhooks/whatsapp` (POST)
- This handles BOTH SMS and WhatsApp messages (Twilio sends both to the same endpoint)

**Step 2: Test with ngrok**

```bash
# Terminal 1
ngrok http 3000

# Terminal 2
npm run dev

# Terminal 3 — send test message from phone to +32 460 25 76 59 via WhatsApp
# Check Next.js logs for [TWILIO-WA] entries
```

**Step 3: Verify conversation flow**

Send a WhatsApp message describing a problem → AI should respond → intervention should be created.

---

## Summary

| Task | Size | Files | Description |
|------|------|-------|-------------|
| 1 | S | 3 create/delete | Create Twilio WhatsApp service, delete Meta services |
| 2 | XS | 2 modify | Update conversation engine imports + params |
| 3 | S | 1 modify | Rewrite WhatsApp webhook for Twilio format |
| 4 | S | 2 modify/delete | Simplify provisioning, remove Meta registration |
| 5 | XS | 3 delete/modify | Remove SMS verification webhook + env cleanup |
| 6 | XS | 0 code | Twilio Console config + E2E test |

**Total: ~6 tasks, ~500 lines changed, no DB migration**
