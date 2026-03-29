# Design: Proportional Consumption Engine + Settings Topup Details

**Date:** 2026-03-29
**Scope:** DB schema, SQL RPCs, TypeScript service, settings UI, landing page constants
**Branch:** preview

## Context

AI tiers include both **minutes** (voice calls) and **conversations** (WhatsApp/SMS). These resources are fungible with a universal ratio of **3 min = 5 conv** (1 min = 1.667 conv). Consuming one resource proportionally deducts from the other.

Currently, only voice minutes are tracked (`ai_phone_usage.minutes_used`). WhatsApp conversations are not metered.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Quota model | Dual counters with cross-deduction | Users see intuitive "45/60 min, 75/100 conv" |
| Exhaustion handling | Auto-topup gate | `auto_topup=true` → charge pack; `false` → hard block |
| Cross-deduction logic | Hybrid SQL + TypeScript | SQL RPCs for atomic counters; TS for Stripe auto-topup |
| Topup pack | Mixed (10 min + 17 conv) | Single Stripe product, maintains ratio balance |
| Conversion ratio | Universal 5/3 (conv per min) | Identical across all tiers — simplifies engine |

## Tier Configuration (updated)

| Tier | Min | Conv | Topup Pack Price | Per Min | Per Conv |
|------|-----|------|-----------------|---------|----------|
| Solo | 60 | 100 | 8,00€ | 0,80€ | 0,47€ |
| Equipe | 180 | 300 | 5,50€ | 0,55€ | 0,32€ |
| Agence | 600 | 1000 | 3,30€ | 0,33€ | 0,19€ |

**Topup pack:** 10 minutes + 17 conversations (10 × 5/3 = 16.67 → 17)

## Architecture

```
Webhook (voice/whatsapp)
  ↓
consumption-engine.service.ts
  ├── record_voice_usage(team_id, minutes)     → SQL RPC (atomic)
  ├── record_conversation_usage(team_id, count) → SQL RPC (atomic)
  ├── check quota remaining (from RPC return)
  └── if exhausted + auto_topup → Stripe charge → apply_topup_credits RPC
```

## Changes

### 1. DB Migration: Add conversation columns to `ai_phone_usage`

```sql
ALTER TABLE ai_phone_usage
  ADD COLUMN conversations_used NUMERIC(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN conversations_included INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN minutes_included INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN topup_minutes_added NUMERIC(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN topup_conversations_added NUMERIC(10, 2) NOT NULL DEFAULT 0;
```

- `conversations_used`: actual WhatsApp/SMS conversations consumed
- `conversations_included` / `minutes_included`: tier quota snapshot (set on first usage of the month)
- `topup_*_added`: cumulative topup credits applied this month

### 2. SQL RPCs (3 new functions)

#### `record_voice_usage(p_team_id, p_month, p_minutes)`
- Upsert `ai_phone_usage` row
- Increment `minutes_used += p_minutes`
- Cross-deduct: `conversations_used += p_minutes * 5/3`
- Increment `calls_count += 1`
- RETURN: `minutes_remaining`, `conversations_remaining`, `quota_exhausted` boolean

#### `record_conversation_usage(p_team_id, p_month, p_conversations)`
- Upsert `ai_phone_usage` row
- Increment `conversations_used += p_conversations`
- Cross-deduct: `minutes_used += p_conversations * 3/5`
- RETURN: `minutes_remaining`, `conversations_remaining`, `quota_exhausted` boolean

#### `apply_topup_credits(p_team_id, p_month, p_minutes, p_conversations)`
- Increment `topup_minutes_added += p_minutes`
- Increment `topup_conversations_added += p_conversations`
- RETURN: new remaining values

**Remaining formula:**
```sql
minutes_remaining = (minutes_included + topup_minutes_added) - minutes_used
conversations_remaining = (conversations_included + topup_conversations_added) - conversations_used
quota_exhausted = minutes_remaining <= 0 AND conversations_remaining <= 0
```

### 3. TypeScript: `consumption-engine.service.ts`

New file: `lib/services/domain/ai-consumption/consumption-engine.service.ts`

```typescript
const CONV_PER_MIN = 5 / 3  // Universal ratio
const TOPUP_MINUTES = 10
const TOPUP_CONVERSATIONS = 17

interface UsageResult {
  minutesRemaining: number
  conversationsRemaining: number
  quotaExhausted: boolean
}

export async function recordVoiceUsage(teamId: string, minutes: number): Promise<UsageResult>
export async function recordConversationUsage(teamId: string, count: number): Promise<UsageResult>
async function handleAutoTopup(teamId: string, month: string): Promise<boolean>
```

- `recordVoiceUsage`: calls `record_voice_usage` RPC → if `quota_exhausted` + `auto_topup` → charge Stripe → `apply_topup_credits`
- `recordConversationUsage`: same flow for conversations
- `handleAutoTopup`: creates Stripe invoice item → applies credits

### 4. Webhook Integration

#### `app/api/webhooks/elevenlabs/route.ts`
Replace direct `upsert_ai_phone_usage` RPC call with:
```typescript
import { recordVoiceUsage } from '@/lib/services/domain/ai-consumption/consumption-engine.service'
await recordVoiceUsage(teamId, minutesUsed)
```

#### `app/api/webhooks/whatsapp/route.ts` (+ conversation-engine.service.ts)
Add at end of successful AI conversation:
```typescript
import { recordConversationUsage } from '@/lib/services/domain/ai-consumption/consumption-engine.service'
await recordConversationUsage(teamId, 1)
```

### 5. Update `lib/stripe.ts` — AI_TIER_CONFIG

```typescript
export const AI_TIER_CONFIG = {
  solo:   { minutes: 60,  conversations: 100,  price: 4900,  topupPrice: 800,  topupMinutes: 10, topupConversations: 17 },
  equipe: { minutes: 180, conversations: 300,  price: 9900,  topupPrice: 550,  topupMinutes: 10, topupConversations: 17 },
  agence: { minutes: 600, conversations: 1000, price: 19900, topupPrice: 330,  topupMinutes: 10, topupConversations: 17 },
} as const

export const CONV_PER_MIN = 5 / 3  // Universal ratio
```

### 6. Update `ai-constants.ts`

```typescript
export const PRICING_TIERS: PricingTier[] = [
  { id: 'solo',   name: 'Solo',   monthlyPrice: 49,  annualPrice: 499,  popular: false },
  { id: 'equipe', name: 'Equipe', monthlyPrice: 99,  annualPrice: 999,  popular: true },
  { id: 'agence', name: 'Agence', monthlyPrice: 199, annualPrice: 1999, popular: false },
]
```

### 7. Update `AiSubscriptionInfo` type

Add to interface:
```typescript
conversationsUsed: number
conversationsIncluded: number
topupMinutesAdded: number
topupConversationsAdded: number
```

### 8. Settings Page — Usage Card Redesign

Replace single progress bar with **dual counters**:

```
┌─────────────────────────────────────────┐
│ 📊 Utilisation ce mois                  │
│                                         │
│ 💬 Conversations                        │
│ ████████████░░░░░░  75 / 100  (75%)    │
│                                         │
│ 📞 Minutes d'appels                     │
│ ████████████░░░░░░  45 / 60   (75%)    │
│                                         │
│ ℹ️ 1 minute d'appel = 1,67 conversations│
│ Les quotas évoluent ensemble.            │
│                                         │
│ Pack recharge : 10 min + 17 conv — 8€  │
└─────────────────────────────────────────┘
```

### 9. Landing Page — Update `ai-pricing-addon.tsx`

Update topup display prices to match new formula:
- Solo: +0,80€/min, +0,47€/conv
- Equipe: +0,55€/min, +0,32€/conv
- Agence: +0,33€/min, +0,19€/conv

## Files to Change

| File | Change |
|------|--------|
| `supabase/migrations/new` | Add columns + 3 RPCs |
| `lib/stripe.ts` | Update AI_TIER_CONFIG + add CONV_PER_MIN |
| `lib/services/domain/ai-consumption/consumption-engine.service.ts` | NEW — consumption engine |
| `app/api/webhooks/elevenlabs/route.ts` | Use consumption engine |
| `app/api/webhooks/whatsapp/route.ts` | Add conversation metering |
| `lib/services/domain/ai-whatsapp/conversation-engine.service.ts` | Call recordConversationUsage |
| `app/actions/ai-subscription-actions.ts` | Extend AiSubscriptionInfo + query new columns |
| `app/gestionnaire/.../ai-active-subscription.tsx` | Dual progress bars + topup info |
| `app/gestionnaire/.../ai-constants.ts` | Fix annual prices |
| `components/landing/ai-pricing-addon.tsx` | Update topup display prices |

## Out of Scope

- Overage billing (soft block, not metered billing)
- Per-property or per-user usage breakdown
- Usage alerts/notifications (email when 80% quota)
- Usage history chart (month-over-month)
