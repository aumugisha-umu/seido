# Smart Routing v2 — Persistent Phone→Team Mapping

**Date:** 2026-03-29
**Branch:** `preview`
**Status:** Validated design — ready for implementation

## Problem

Today, incoming WhatsApp/SMS/voice contacts are identified per-session via `team_members` lookup (locataire-only). This causes:
1. **No persistence** — routing is lost after session ends; returning contacts restart identification
2. **Role blind spot** — only `locataire` role is matched; prestataires/proprietaires are treated as unknown
3. **No property context** — tenants with multiple properties aren't asked which one is concerned
4. **No provider flow** — prestataires can't signal issues via WhatsApp/SMS
5. **Channel asymmetry** — voice calls match all roles, WhatsApp only matches locataires

## Solution

New `phone_team_mappings` table as **persistent routing cache** + enhanced routing flow with property/intervention context.

---

## 1. Database: `phone_team_mappings` table

```sql
CREATE TABLE phone_team_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_phone TEXT NOT NULL,              -- E.164 (+32470123456)
  team_id UUID NOT NULL REFERENCES teams(id),
  user_id UUID REFERENCES users(id),        -- linked DB profile (nullable if unknown)
  user_role TEXT,                            -- cached role in team: locataire/prestataire/proprietaire/gestionnaire
  source TEXT NOT NULL DEFAULT 'auto',       -- how mapping was created
  -- sources: phone_match, address_match, agency_match, voice_call, manual, orphan
  last_used_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT uq_phone_team UNIQUE (contact_phone, team_id)
);

CREATE INDEX idx_phone_team_mappings_phone ON phone_team_mappings(contact_phone);
CREATE INDEX idx_phone_team_mappings_team ON phone_team_mappings(team_id);
```

### RLS

- Webhook writes via **service role** (no RLS needed)
- Gestionnaire/admin can SELECT mappings for their team (future admin UI)
- Admin global can UPDATE/DELETE (manual management)

```sql
-- SELECT: team managers can view their team's mappings
CREATE POLICY "phone_team_mappings_select_team" ON phone_team_mappings
  FOR SELECT TO authenticated
  USING (team_id IN (
    SELECT tm.team_id FROM team_members tm
    JOIN users u ON u.id = tm.user_id
    WHERE u.auth_user_id = auth.uid()
      AND tm.role IN ('admin', 'gestionnaire')
      AND tm.left_at IS NULL
  ));

-- Service role handles all writes (webhooks)
```

### Backfill

```sql
-- From completed WhatsApp/SMS sessions
INSERT INTO phone_team_mappings (contact_phone, team_id, user_id, source, created_at)
SELECT DISTINCT ON (s.contact_phone, s.team_id)
  s.contact_phone, s.team_id, s.identified_user_id,
  COALESCE(s.identified_via, 'auto'),
  s.created_at
FROM ai_whatsapp_sessions s
WHERE s.team_id IS NOT NULL AND s.status = 'completed'
ORDER BY s.contact_phone, s.team_id, s.last_message_at DESC
ON CONFLICT DO NOTHING;

-- From completed voice calls
INSERT INTO phone_team_mappings (contact_phone, team_id, user_id, source, created_at)
SELECT DISTINCT ON (c.caller_phone, c.team_id)
  c.caller_phone, c.team_id, c.identified_user_id,
  'voice_call',
  c.created_at
FROM ai_phone_calls c
WHERE c.team_id IS NOT NULL AND c.caller_phone IS NOT NULL
ORDER BY c.caller_phone, c.team_id, c.created_at DESC
ON CONFLICT DO NOTHING;
```

---

## 2. Unified Routing Flow (all channels)

```
Message entrant (WhatsApp / SMS / Voice post-call)
│
├─ STEP 1: Lookup phone_team_mappings WHERE contact_phone = $phone
│   │
│   ├─ 0 results → STEP 2: FIRST CONTACT IDENTIFICATION
│   ├─ 1 result  → STEP 3: AUTO-ROUTE (with property/intervention context)
│   └─ 2+ results → STEP 4: MULTI-TEAM CHOICE
│
└─ (After resolution) → Normal conversation engine
```

### Key change vs today

`phone_team_mappings` is the **primary lookup**. `team_members` + `lot_contacts` + `supplier_contracts` are fallbacks for **first contact only**. After first resolution, the mapping persists permanently.

---

## 3. Step 2: First Contact Identification (cascade)

Executed **once** per phone number. All subsequent contacts use the mapping.

```
STEP 2: Identification cascade
│
├─ 2a. team_members JOIN users WHERE users.phone = $phone AND left_at IS NULL
│      *** NO ROLE FILTER — matches locataire, prestataire, proprietaire, gestionnaire ***
│   ├─ 1 match → CREATE mapping (source=phone_match, user_id, user_role) → AUTO-ROUTE
│   ├─ 2+ matches → CREATE ALL mappings → MULTI-TEAM CHOICE
│   └─ 0 → continue
│
├─ 2b. lot_contacts JOIN users JOIN lots WHERE users.phone = $phone
│      AND lots.deleted_at IS NULL AND lots.team_id IS NOT NULL
│      *** JOIN via lots.team_id (NOT NULL), not lot_contacts.team_id (nullable) ***
│   ├─ matches → CREATE mapping(s) per distinct team_id → route/disambiguate
│   └─ 0 → continue
│
├─ 2c. building_contacts JOIN users JOIN buildings WHERE users.phone = $phone
│      AND buildings.deleted_at IS NULL
│   ├─ matches → CREATE mapping(s) → route/disambiguate
│   └─ 0 → continue
│
├─ 2d. supplier_contracts JOIN users WHERE users.phone = $phone
│      AND supplier_contracts.status = 'actif' AND supplier_contracts.deleted_at IS NULL
│   ├─ matches → CREATE mapping(s) (role=prestataire) → route/disambiguate
│   └─ 0 → continue
│
└─ 2e. UNKNOWN CONTACT FLOW (existing, enhanced)
    ├─ Ask address → match building → CREATE mapping (source=address_match)
    ├─ Ask agency → match team → CREATE mapping (source=agency_match)
    └─ No match → SEIDO_FALLBACK_TEAM_ID → CREATE mapping (source=orphan)
```

### Phone normalization

Both raw and E.164-normalized forms are tested (same pattern as current webhook lines 79-86). Mappings store the normalized E.164 form.

---

## 4. Step 3: Auto-route with context

When a mapping exists (1 result), provide contextual greeting based on user role.

### 4a. Locataire / Proprietaire → Property selection

```
Load mapping → { team_id, user_id, user_role }

Query: lot_contacts JOIN lots JOIN addresses
       WHERE lot_contacts.user_id = mapping.user_id
       AND lots.team_id = mapping.team_id
       AND lots.deleted_at IS NULL

       UNION

       building_contacts JOIN buildings JOIN addresses
       WHERE building_contacts.user_id = mapping.user_id
       AND buildings.team_id = mapping.team_id
       AND buildings.deleted_at IS NULL

Results:
├─ 0 properties → Normal conversation ("Bonjour [nom], quel est votre problème ?")
├─ 1 property  → "Bonjour [nom]! Votre message concerne [Apt 3A, Rue de la Loi 42] ?"
│   ├─ Oui → pre-fill lot_id/building_id in extracted_data
│   └─ Non → "D'accord, décrivez votre problème"
└─ 2+ properties → Numbered list:
    "Bonjour [nom]! Quel bien est concerné ?
     1. Apt 3A — Rue de la Loi 42
     2. Studio — Avenue Louise 100
     3. Autre chose"
    ├─ Selection → pre-fill lot_id/building_id
    └─ "Autre" → normal conversation
```

**Pre-fill `extracted_data`** when property selected:
```json
{
  "caller_name": "Jean Dupont",
  "address": "Rue de la Loi 42, Apt 3A",
  "lot_id": "uuid-...",
  "building_id": "uuid-...",
  "pre_identified": true
}
```
→ Intervention creator uses `lot_id`/`building_id` directly instead of fuzzy match.

### 4b. Prestataire → Intervention selection (MVP: info only)

```
Query: intervention_assignments JOIN interventions
       WHERE intervention_assignments.user_id = mapping.user_id
       AND intervention_assignments.role = 'prestataire'
       AND interventions.team_id = mapping.team_id
       AND interventions.status NOT IN ('cloturee_par_gestionnaire', 'annulee', 'rejetee')

Results:
├─ 0 active interventions → "Bonjour [nom], comment puis-je vous aider ?"
└─ 1+ active interventions → Numbered list:
    "Bonjour [nom]! Votre message concerne :
     1. #WA-240329-001 — Fuite salle de bain (Rue de la Loi 42)
     2. #INT-240328-003 — Panne chaudière (Avenue Louise 100)
     3. Autre chose"
    ├─ Selection → pre-fill building_id/lot_id from intervention
    └─ "Autre" → normal conversation (new intervention)
```

**MVP scope:** Provider always creates a NEW intervention. Pre-fill lot/building from selected existing intervention for context. Thread reply to existing intervention = future v2.1.

### 4c. Gestionnaire → Normal conversation

Gestionnaires rarely use WhatsApp to report issues. Normal conversation flow.

### 4d. No user_id (orphan resolved, no profile) → Normal flow

Standard identification script (name, address, problem).

---

## 5. Step 4: Multi-team choice (2+ mappings)

```
Sort mappings by last_used_at DESC
Send list:
  "Bonjour [nom]! Vous êtes en contact avec plusieurs gestionnaires.
   À qui souhaitez-vous écrire ?
   1. Agence Dupont (dernier contact: il y a 3 jours)
   2. Régie Martin (dernier contact: il y a 2 semaines)
   3. Autre"

├─ Selection 1/2 → UPDATE last_used_at → continue with Step 3 (auto-route contextualized)
└─ Selection 3 / invalid → "Pouvez-vous préciser le nom de votre agence ?"
    → match team by name → CREATE new mapping if new team
```

### Dynamic mapping growth

When a contact is added to a second team (new lease, new supplier contract), the next first-contact cascade (step 2) detects the new `team_members` entry and creates a second mapping automatically. No manual action needed.

---

## 6. Routing State Machine (updated)

### New RoutingState values

```typescript
export type RoutingState =
  | 'awaiting_address'                // unknown contact: ask address
  | 'resolving_address'               // unknown contact: processing address
  | 'awaiting_agency'                 // unknown contact: ask agency name
  | 'awaiting_disambiguation'         // multi-team: send options
  | 'resolving_disambiguation'        // multi-team: parse reply
  | 'awaiting_property_selection'     // NEW: tenant/owner picks a property
  | 'awaiting_intervention_selection' // NEW: provider picks an intervention
  | 'awaiting_team_selection'         // NEW: multi-team from mappings (replaces disambiguation for mapped contacts)
  | 'resolved'
  | 'orphan'
```

### New RoutingMetadata fields

```typescript
export interface RoutingMetadata {
  routing_state: RoutingState
  original_message?: string
  candidate_teams?: Array<{ teamId: string; userId: string }>
  disambiguation_options?: Array<{ teamId: string; label: string }>
  property_options?: Array<{ lotId?: string; buildingId?: string; label: string }>       // NEW
  intervention_options?: Array<{ interventionId: string; label: string }>                 // NEW
  selected_lot_id?: string       // NEW: pre-filled after property selection
  selected_building_id?: string  // NEW: pre-filled after property selection
}
```

---

## 7. Mapping Lifecycle

| Event | Action |
|---|---|
| First message received (any channel) | CREATE mapping after identification |
| Subsequent message | UPDATE `last_used_at` |
| Session completed with `identified_user_id` | UPDATE `user_id` + `user_role` if previously null |
| Admin manually links contact (future UI) | CREATE/UPDATE with `source=manual` |
| Voice call completed (ElevenLabs) | CREATE mapping if absent |
| User leaves team (`team_members.left_at` set) | Verify on next routing; DELETE mapping if left_at IS NOT NULL |
| Admin deletes mapping (future UI) | DELETE |

### Staleness rule

When `last_used_at` > 7 days, re-verify `team_members` status:
- If `left_at IS NOT NULL` → DELETE mapping, re-run cascade
- If role changed → UPDATE `user_role` in mapping
- Otherwise → UPDATE `last_used_at`, continue

---

## 8. File Modifications

| File | Change |
|---|---|
| **NEW: migration** | `phone_team_mappings` table + indexes + RLS + backfill |
| **NEW: `lib/services/domain/ai-whatsapp/phone-mapping.service.ts`** | `lookupMappings()`, `createOrUpdateMapping()`, `fetchUserProperties()`, `fetchProviderInterventions()`, `deleteStaleMappings()` |
| `app/api/webhooks/whatsapp/route.ts` | Replace `team_members` lookup with `phone_team_mappings` lookup. Fallback cascade (2a-2e) for first contact. Remove `role=locataire` filter. Create mapping after resolution. |
| `app/api/webhooks/sms/route.ts` | No change (already delegates to `handleTwilioIncoming`) |
| `app/api/webhooks/elevenlabs/route.ts` | Add `createOrUpdateMapping()` in `processPostCallAsync` after tenant identification (step 4) |
| `lib/services/domain/ai-whatsapp/routing-flow.service.ts` | Add `handlePropertySelectionFlow()`, `handleInterventionSelectionFlow()`, `handleTeamSelectionFlow()`. Wire new states into `handleRoutingFlow()`. |
| `lib/services/domain/ai-whatsapp/conversation-engine.service.ts` | After session complete: update mapping `user_id`/`user_role` if not yet set. Pass `pre_identified` lot/building to intervention creator. |
| `lib/services/domain/ai-whatsapp/intervention-creator.service.ts` | Use `extracted_data.lot_id`/`building_id` directly when `pre_identified=true`, skip fuzzy match. |
| `lib/services/domain/ai-whatsapp/types.ts` | Add new `RoutingState` values, `RoutingMetadata` fields, `PhoneTeamMapping` type. Extend `SessionExtractedData` with `lot_id`, `building_id`, `pre_identified`. |
| `lib/services/domain/ai-whatsapp/claude-ai.service.ts` | Add pre-identified property info to system prompt ("Le locataire habite à [adresse], bien: [référence]") |
| `lib/services/domain/ai-whatsapp/twilio-whatsapp.service.ts` | Add `sendPropertySelectionMessage()`, `sendInterventionSelectionMessage()`, `sendTeamSelectionMessage()` — reuse `parseDisambiguationReply()` for all. |
| `.env.example` | Already has `SEIDO_FALLBACK_TEAM_ID` |

---

## 9. Scenarios

### A — Known tenant, 1 team, 1 property
```
Marie (+32470111111) sends "Bonjour, j'ai une fuite"
→ phone_team_mappings: 1 result (Agence Dupont, user_id=Marie, role=locataire)
→ lot_contacts: 1 lot (Apt 3A, Rue de la Loi 42)
→ "Bonjour Marie! Votre message concerne l'appartement Apt 3A, Rue de la Loi 42?"
→ "Oui" → pre-fill lot_id → conversation AI → intervention linked to Apt 3A
```

### B — Known tenant, 1 team, 3 properties
```
Pierre (+32470222222) sends "J'ai un problème"
→ phone_team_mappings: 1 result (Régie Martin, role=locataire)
→ lot_contacts: 3 lots
→ "Bonjour Pierre! Quel bien est concerné?
   1. Apt 2B — Rue Royale 15
   2. Garage G4 — Rue Royale 15
   3. Studio — Chaussée de Wavre 200
   4. Autre chose"
→ "1" → pre-fill lot_id → conversation AI
```

### C — Known tenant, 2 teams
```
Sophie (+32470333333) sends "Bonjour"
→ phone_team_mappings: 2 results (Agence Dupont + Régie Martin)
→ "Bonjour Sophie! Vous êtes en contact avec:
   1. Agence Dupont
   2. Régie Martin
   À qui souhaitez-vous écrire?"
→ "1" → route to Agence Dupont → property selection → conversation AI
```

### D — Known provider with active interventions
```
Ahmed (+32470444444) sends "Bonjour"
→ phone_team_mappings: 1 result (Agence Dupont, role=prestataire)
→ active interventions: 2
→ "Bonjour Ahmed! Votre message concerne:
   1. #INT-240328-003 — Réparation chaudière (Rue de la Loi 42)
   2. #WA-240329-001 — Fuite robinet (Avenue Louise 100)
   3. Autre chose"
→ "2" → pre-fill lot_id from intervention → new intervention with context
```

### E — Known owner
```
François (+32470555555) sends "Bonjour"
→ phone_team_mappings: 1 result (Régie Martin, role=proprietaire)
→ building_contacts: 2 buildings
→ "Bonjour François! Quel immeuble est concerné?
   1. Résidence du Parc — Rue de la Loi 42 (3 lots)
   2. Villa Louise — Avenue Louise 100
   3. Autre chose"
→ "1" → pre-fill building_id → conversation AI
```

### F — First contact, unknown
```
(+32470666666) sends "Bonjour j'ai un problème"
→ phone_team_mappings: 0 results
→ Cascade 2a-2d: 0 matches
→ UNKNOWN flow: "Pouvez-vous me donner l'adresse?"
→ "Rue de la Loi 42" → match building → Agence Dupont
→ CREATE mapping (source=address_match) → conversation AI
→ NEXT MESSAGE from same number → auto-route to Agence Dupont (no re-identification)
```

### G — Orphan → Admin
```
(+32470777777) sends "Allo?"
→ phone_team_mappings: 0 results → cascade: 0 matches
→ Unknown flow: address? "je sais pas" → agency? "aucune idée"
→ SEIDO_FALLBACK_TEAM_ID → CREATE mapping (source=orphan)
→ Conversation with admin AI
```

### H — Voice call then WhatsApp
```
Jean (+32470888888) CALLS Agence Dupont voice number
→ ElevenLabs agent_id → team_id (direct)
→ Post-call: CREATE mapping (source=voice_call, user_id=Jean)
→ 2 days later: Jean sends WhatsApp
→ phone_team_mappings: 1 result → auto-route to Agence Dupont with property context
```

### I — Contact added to 2nd team later
```
Marie has mapping: Agence Dupont only
→ Marie signs lease with Régie Martin → added as locataire in team_members
→ Marie sends WhatsApp → phone_team_mappings: 1 result (Agence Dupont)
→ Auto-route to Agence Dupont (existing mapping)
→ BUT: after routing, step 2a detects new team_members match → CREATE 2nd mapping
→ NEXT message: phone_team_mappings: 2 results → MULTI-TEAM CHOICE
```

### J — SMS with 160 char limit
```
Pierre sends SMS (not WhatsApp)
→ Same routing, but property list condensed:
  "Quel bien? 1.Apt2B-RueRoyale15 2.GarageG4 3.Studio-ChWavre200 4.Autre"
```

---

## 10. Security & Edge Cases

| Edge case | Treatment |
|---|---|
| Phone number recycled (new owner) | Mapping persists. New owner hits unknown flow → admin can delete old mapping manually |
| User leaves team | Mapping kept. On next routing, verify `team_members.left_at IS NULL`. If left → DELETE mapping, re-run cascade |
| Role change in team | Detected on 7-day staleness check. UPDATE `user_role` in mapping |
| Invalid reply to selection | "Répondez avec le numéro correspondant (1-N)." Max 2 retries then normal conversation |
| ILIKE injection | Already escaped in `matchTeamByName` (existing). New queries use parameterized `eq()` — no injection risk |
| Same phone, different channels | One mapping per (phone, team). SMS and WhatsApp share the same mapping |
| Concurrent messages | UNIQUE constraint on (contact_phone, team_id) prevents duplicates. Upsert pattern |
| Mapping without user_id (orphan) | Normal conversation with identification script. `user_id` updated after session completes if matched |

---

## 11. Implementation Stories

| # | Story | Files | Depends on |
|---|---|---|---|
| 1 | Migration: create `phone_team_mappings` + indexes + RLS + backfill | migration SQL | — |
| 2 | `phone-mapping.service.ts`: CRUD + lookup + property/intervention queries | new service file | 1 |
| 3 | Webhook refactor: replace `team_members` lookup with mapping lookup + cascade fallback | `route.ts` | 1, 2 |
| 4 | Property selection flow: new routing states + messages | `routing-flow.service.ts`, `twilio-whatsapp.service.ts`, `types.ts` | 2, 3 |
| 5 | Intervention selection flow (provider MVP) | `routing-flow.service.ts`, `twilio-whatsapp.service.ts` | 2, 3 |
| 6 | Multi-team selection from mappings | `routing-flow.service.ts`, `twilio-whatsapp.service.ts` | 2, 3 |
| 7 | Pre-identified property in conversation engine + Claude prompt | `conversation-engine.service.ts`, `claude-ai.service.ts`, `types.ts` | 4 |
| 8 | Pre-identified property in intervention creator | `intervention-creator.service.ts` | 7 |
| 9 | ElevenLabs webhook: upsert mapping after call | `elevenlabs/route.ts` | 2 |
| 10 | Mapping lifecycle: staleness check + cleanup on team leave | `phone-mapping.service.ts`, `conversation-engine.service.ts` | 2 |

---

*Design validated 2026-03-29 — corrections from code verification applied*
