# Shared WhatsApp Number — Design Document

> **For Claude:** REQUIRED SUB-SKILL: Use sp-executing-plans to implement this plan task-by-task.

**Goal:** Replace per-team WhatsApp numbers with a single shared Seido number, routing by sender (tenant) phone number.
**Architecture:** Webhook routes by `From` (tenant phone) instead of `To` (team phone). Lookup via `team_members` + `users.phone`. Disambiguation via WhatsApp Quick Reply Buttons. Unknown contacts go through address → agency → orphan ticket fallback.
**Tech Stack:** Twilio WhatsApp API (Senders v2), Next.js API routes, Supabase, Twilio Interactive Messages

---

## Acceptance Criteria

- [ ] Single shared WhatsApp number (`SEIDO_WHATSAPP_NUMBER` env var) serves all teams
- [ ] Incoming messages routed by sender phone (`From`) via `team_members` + `users.phone`
- [ ] 1 team match: conversation starts immediately (zero friction)
- [ ] N team matches: WhatsApp Quick Reply Buttons with property addresses for disambiguation
- [ ] 0 matches (unknown contact): AI asks for address → matches building → resolves team
- [ ] Address not found: AI asks for agency/manager name → fuzzy match on `teams.name`
- [ ] Agency not found: AI accepts ticket anyway ("we'll transfer to the right team") → orphan session
- [ ] Orphan sessions visible in admin dashboard for manual dispatch
- [ ] Provisioning simplified: no Twilio number purchase, just activate AI module
- [ ] `ai_phone_numbers.team_id` UNIQUE constraint relaxed (shared number = many teams)
- [ ] Lint passes (`npm run lint`)
- [ ] Existing unit tests pass (`npm test`)

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| `users.phone` not normalized (E.164) | High | Medium | Use `normalizePhoneE164()` at query time (already in intervention-creator) |
| Tenant phone matches wrong team | Low | High | Scoped to `role='locataire'` + `left_at IS NULL` in team_members |
| Quick Reply Buttons API complexity | Medium | Low | Twilio supports inline interactive messages, no Content API needed |
| Orphan tickets pile up without dispatch | Medium | Medium | Admin notification email on orphan creation |

## Dependencies

- **External:** Twilio WhatsApp Sender approval for +32 460 25 76 59 (in progress, SID: XEe5629bac8c8e58eb62796ddd6c2dfdde)
- **Env vars:** `SEIDO_WHATSAPP_NUMBER` (new), `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` (existing)
- **DB migration:** Relax `ai_phone_numbers.team_id` UNIQUE, add `identified_via` to sessions
- **No new npm packages**

## Story Order

Schema → Backend → UI (no UI changes — pure backend + webhook)

---

## Routing Flow

```
Tenant sends WhatsApp to +32 460 25 76 59
    |
    v
Webhook receives From: whatsapp:+32470123456
    |
    v
Normalize phone → +32470123456
    |
    v
Query: team_members JOIN users WHERE users.phone = normalized AND role = 'locataire' AND left_at IS NULL
    |
    +--- 1 result → route to that team → conversation starts
    |
    +--- N results → fetch building addresses per team
    |                  → send Quick Reply Buttons ("Pour quelle adresse ?")
    |                  → tenant taps button → route to that team
    |
    +--- 0 results (unknown contact)
              |
              v
         AI: "Pouvez-vous me donner l'adresse de votre logement ?"
              |
              +--- Address matches building → team found → conversation starts
              |
              +--- No match
                    |
                    v
               AI: "Quel est le nom de votre agence ou gestionnaire ?"
                    |
                    +--- Fuzzy match on teams.name → team found → conversation starts
                    |
                    +--- No match
                          |
                          v
                     AI: "Merci, je prends votre demande en charge.
                          Notre equipe va la transferer au bon gestionnaire."
                          |
                          v
                     Create orphan session (team_id = null)
                     → Admin notification email
                     → Visible in admin dashboard for manual dispatch
```

---

## Task 1: DB Migration — relax constraints + add columns (XS)

**Files:**
- Create: `supabase/migrations/XXXXXXXX_shared_whatsapp_number.sql` (via `npx supabase migration new`)

**Changes:**

```sql
-- 1. Relax UNIQUE on ai_phone_numbers.team_id (allow shared number)
-- The current isOneToOne relationship is enforced by the Supabase query, not a DB constraint.
-- Verify if there's an actual UNIQUE constraint or index — if so, drop it.

-- 2. Add identified_via to ai_whatsapp_sessions
ALTER TABLE ai_whatsapp_sessions
  ADD COLUMN IF NOT EXISTS identified_via text DEFAULT 'phone_match';
-- Values: 'phone_match', 'address_match', 'agency_match', 'disambiguation', 'orphan'

-- 3. Make team_id nullable on ai_whatsapp_sessions (for orphan tickets)
ALTER TABLE ai_whatsapp_sessions
  ALTER COLUMN team_id DROP NOT NULL;
```

**Step 1:** Check if `ai_phone_numbers.team_id` has a UNIQUE constraint or index in existing migrations
**Step 2:** Create migration with `npx supabase migration new shared_whatsapp_number`
**Step 3:** Apply changes
**Step 4:** Regenerate types: `npm run supabase:types`

---

## Task 2: Webhook — route by `From` instead of `To` (M)

**Files:**
- Modify: `app/api/webhooks/whatsapp/route.ts`

**Step 1: Replace Step 3 (team lookup)**

Current code (lookup by `To` in `ai_phone_numbers`):
```typescript
const { data: phoneConfig } = await supabase
  .from('ai_phone_numbers')
  .select('id, team_id, phone_number, whatsapp_number, custom_instructions')
  .or(`whatsapp_number.eq.${to},phone_number.eq.${to}`)
  .eq('is_active', true)
  .eq('whatsapp_enabled', true)
  .limit(1)
  .maybeSingle()
```

New code (lookup by `From` in `team_members` + `users.phone`):
```typescript
import { normalizePhoneE164 } from '@/lib/services/domain/ai-phone/call-transcript-analyzer.service'

// Normalize sender phone
const normalizedFrom = normalizePhoneE164(from)

// Find teams this contact belongs to
const { data: teamMatches } = await supabase
  .from('team_members')
  .select('team_id, users!inner(id, first_name, last_name, phone)')
  .eq('role', 'locataire')
  .is('left_at', null)
  .eq('users.phone', normalizedFrom)

// Also check with raw phone (in case DB has non-normalized phones)
let matches = teamMatches ?? []
if (matches.length === 0) {
  const { data: rawMatches } = await supabase
    .from('team_members')
    .select('team_id, users!inner(id, first_name, last_name, phone)')
    .eq('role', 'locataire')
    .is('left_at', null)
    .eq('users.phone', from)
  matches = rawMatches ?? []
}
```

**Step 2: Handle 0/1/N results**

```typescript
if (matches.length === 1) {
  // Direct route — most common case
  const teamId = matches[0].team_id
  const user = matches[0].users
  // ... defer to conversation engine with teamId
} else if (matches.length > 1) {
  // Multi-team: send disambiguation Quick Reply
  // ... fetch building addresses per team, send interactive message
  // Store pending disambiguation in session
} else {
  // Unknown contact: start "address discovery" flow
  // ... defer to conversation engine with teamId = null
}
```

**Step 3: Load shared number config**

Replace per-team `phoneConfig` with shared config:
```typescript
// Get the shared Seido WhatsApp number config
const sharedNumber = process.env.SEIDO_WHATSAPP_NUMBER ?? ''
const { data: sharedConfig } = await supabase
  .from('ai_phone_numbers')
  .select('id, custom_instructions')
  .eq('phone_number', sharedNumber)
  .eq('is_active', true)
  .limit(1)
  .maybeSingle()
```

**Step 4: Lint**

---

## Task 3: Twilio Interactive Messages — Quick Reply Buttons (S)

**Files:**
- Modify: `lib/services/domain/ai-whatsapp/twilio-whatsapp.service.ts`

**Add `sendWhatsAppQuickReply()` function:**

Twilio supports interactive messages via the `ContentSid` approach or inline via `persistent_action`. For simplicity, use the body + buttons approach:

```typescript
export const sendWhatsAppQuickReply = async (
  fromNumber: string,
  to: string,
  bodyText: string,
  buttons: Array<{ id: string; title: string }>
): Promise<string> => {
  const { sid } = getTwilioAuth()
  const header = getTwilioAuth().header

  // Twilio supports Quick Reply via ContentVariables + ContentSid
  // OR via the simpler approach: send as regular message with numbered options
  // For v1, use the Twilio Content Template API or inline interactive format

  // Interactive message JSON for Twilio WhatsApp
  const interactiveBody = {
    type: 'button',
    body: { text: bodyText },
    action: {
      buttons: buttons.slice(0, 3).map(b => ({
        type: 'reply',
        reply: { id: b.id, title: b.title.slice(0, 20) }
      }))
    }
  }

  const params = new URLSearchParams({
    From: `whatsapp:${fromNumber}`,
    To: `whatsapp:${to}`,
    Body: bodyText,
    // Twilio interactive message via persistent_action header
  })

  // Note: Twilio WhatsApp interactive messages require ContentSid
  // If Content Template API not available, fall back to text-based "Reply 1 or 2"
  // Implementation will be determined by Twilio API availability

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
    throw new Error(`Twilio WhatsApp quick reply failed (${response.status}): ${error}`)
  }

  const data = await response.json() as { sid: string }
  return data.sid
}
```

**Note:** Research exact Twilio Content API format during implementation. May need Content Template creation via API first, then reference by ContentSid.

**Step 1:** Research Twilio Content API / Interactive Messages exact format (context7)
**Step 2:** Implement `sendWhatsAppQuickReply()`
**Step 3:** Lint

---

## Task 4: Conversation engine — unknown contact flow (S)

**Files:**
- Modify: `lib/services/domain/ai-whatsapp/conversation-engine.service.ts`
- Modify: `lib/services/domain/ai-whatsapp/types.ts`

**Changes:**

1. **types.ts**: Add `teamId` as optional (`string | null`) in `IncomingWhatsAppMessage`

2. **conversation-engine.service.ts**: Add pre-conversation routing when `teamId` is null:

```typescript
// Before creating/resuming session:
if (!message.teamId) {
  // Unknown contact — start address discovery flow
  return handleUnknownContactFlow(supabase, message)
}
```

The `handleUnknownContactFlow` is a mini state machine:
- State 1: Ask for address → match building → if found, set teamId + continue
- State 2: Ask for agency name → fuzzy match teams.name → if found, set teamId + continue
- State 3: Accept ticket as orphan → create session with team_id = null, send confirmation

Each state transition persists in the session's `messages` array. The flow re-enters the normal conversation engine once `teamId` is resolved.

**Step 1:** Add `handleUnknownContactFlow()` function
**Step 2:** Update `handleIncomingWhatsApp()` to handle null teamId
**Step 3:** Lint

---

## Task 5: Simplify provisioning (S)

**Files:**
- Modify: `lib/services/domain/ai-phone/phone-provisioning.service.ts`

**Changes:**

`provisionAuto()` no longer buys a Twilio number. It becomes:

```typescript
const provisionAuto = async (teamId: string): Promise<ProvisioningResult> => {
  const sharedNumber = process.env.SEIDO_WHATSAPP_NUMBER
  if (!sharedNumber) throw new ProvisioningError('SEIDO_WHATSAPP_NUMBER not configured', 'database')

  const supabase = createServiceRoleSupabaseClient()

  // Upsert team's AI config pointing to the shared number
  const { data, error } = await supabase
    .from('ai_phone_numbers')
    .upsert({
      team_id: teamId,
      phone_number: sharedNumber,
      whatsapp_number: sharedNumber,
      whatsapp_enabled: true,
      is_active: true,
      provisioning_status: 'active',
    }, { onConflict: 'team_id' })
    .select('id')
    .single()

  if (error) throw new ProvisioningError(`DB upsert failed: ${error.message}`, 'database')

  return {
    phoneNumber: sharedNumber,
    elevenlabsAgentId: null,
    elevenlabsPhoneNumberId: null,
    aiPhoneNumberId: data.id,
    provisioningStatus: 'active',
  }
}
```

`provisionManual()` does the same with `DEV_WHATSAPP_PHONE_NUMBER`.

**Step 1:** Rewrite `provisionAuto()`
**Step 2:** Update `provisionManual()`
**Step 3:** Remove `purchaseNumber` import if no longer used
**Step 4:** Lint

---

## Task 6: Env vars + cleanup (XS)

**Files:**
- Modify: `.env.example`

**Changes:**

Add:
```bash
# Shared WhatsApp number — single number for all teams (Twilio WhatsApp Sender)
SEIDO_WHATSAPP_NUMBER=+32460257659
```

**Step 1:** Update `.env.example`
**Step 2:** Add `SEIDO_WHATSAPP_NUMBER` to `.env.local`
**Step 3:** Grep for any remaining references to per-team number assumptions
**Step 4:** Lint

---

## Summary

| Task | Size | Files | Description |
|------|------|-------|-------------|
| 1 | XS | 1 migration | Relax constraints, add columns |
| 2 | M | 1 modify | Webhook: route by From, handle 0/1/N |
| 3 | S | 1 modify | Quick Reply Buttons for disambiguation |
| 4 | S | 2 modify | Conversation engine: unknown contact flow |
| 5 | S | 1 modify | Provisioning: remove number purchase |
| 6 | XS | 1 modify | Env vars + cleanup |

**Total: ~6 tasks, ~400 lines changed, 1 DB migration**

## Unknown Contact Flow (detailed)

```
Tenant (unknown phone) → WhatsApp message
    |
    v
AI: "Bonjour, je suis l'assistant Seido. Je ne trouve pas votre dossier.
     Pouvez-vous me donner l'adresse de votre logement ?"
    |
    v (tenant replies with address)
    |
    +--- Match building (fuzzy on street + city)
    |     → team found → "Parfait, je vous mets en contact avec [team.name]."
    |     → conversation continues normally
    |
    +--- No building match
          |
          v
     AI: "Je ne trouve pas cette adresse. Quel est le nom de votre
          agence immobiliere ou gestionnaire ?"
          |
          v (tenant replies with agency name)
          |
          +--- Fuzzy match teams.name (ILIKE '%name%')
          |     → team found → conversation continues
          |
          +--- No match
                |
                v
           AI: "Merci pour ces informations. Je prends votre demande
                en charge et notre equipe va la transmettre au bon
                gestionnaire dans les plus brefs delais."
                |
                v
           Create orphan session (team_id = null, identified_via = 'orphan')
           Send admin notification email
           → Visible in admin for manual dispatch
```
