# Design: AI Add-on Billing — Single Subscription Model

**Date:** 2026-03-28
**Status:** Validated
**Branch:** preview

---

## Context

SEIDO has two billing products:
- **Main subscription**: per-lot pricing (monthly/annual), created when user subscribes after trial
- **AI WhatsApp Assistant**: flat-rate add-on (Solo 49€, Equipe 99€, Agence 149€/month)

Currently these are **separate Stripe subscriptions** with independent billing cycles. This design unifies them into a **single Stripe subscription** with multiple items.

## Goals

1. Single invoice, single billing cycle for both products
2. AI add-on can be added/removed anytime with prorated credit
3. During trial: AI checkout aligns billing cycle to trial end date
4. Auto-conversion: when trial expires with AI active + >2 lots → main item added automatically
5. AI + free tier (≤2 lots) is allowed — user pays only for AI
6. Annual main subscription: AI follows the same interval, removable anytime with prorated refund

## Non-Goals

- Changing the trial duration (stays 30 days)
- Changing per-lot pricing
- AI-specific trial/free tier

---

## Architecture

### Stripe Model

One `Subscription` per customer with 1-2 items:

| Item | Price ID | Quantity | When present |
|------|----------|----------|--------------|
| Main (per-lot) | `STRIPE_PRICE_ANNUAL` or `STRIPE_PRICE_MONTHLY` | lot count (min 3) | After trial ends (or immediately if user subscribes first) |
| AI add-on | `STRIPE_AI_PRICES[tier][interval]` | 1 | When AI is active |

### Stripe Prices Required

Existing:
- `STRIPE_PRICE_ANNUAL` (per-lot, yearly)
- `STRIPE_PRICE_MONTHLY` (per-lot, monthly)
- `STRIPE_PRICE_AI_SOLO` (monthly)
- `STRIPE_PRICE_AI_EQUIPE` (monthly)
- `STRIPE_PRICE_AI_AGENCE` (monthly)

New (to create in Stripe Dashboard):
- `STRIPE_PRICE_AI_SOLO_ANNUAL` (588€/year)
- `STRIPE_PRICE_AI_EQUIPE_ANNUAL` (1188€/year)
- `STRIPE_PRICE_AI_AGENCE_ANNUAL` (1788€/year)

### Price Config (`lib/stripe.ts`)

```typescript
export const STRIPE_AI_PRICES = {
  solo:   { month: process.env.STRIPE_PRICE_AI_SOLO ?? '',   year: process.env.STRIPE_PRICE_AI_SOLO_ANNUAL ?? '' },
  equipe: { month: process.env.STRIPE_PRICE_AI_EQUIPE ?? '', year: process.env.STRIPE_PRICE_AI_EQUIPE_ANNUAL ?? '' },
  agence: { month: process.env.STRIPE_PRICE_AI_AGENCE ?? '', year: process.env.STRIPE_PRICE_AI_AGENCE_ANNUAL ?? '' },
} as const

export const AI_PRICE_IDS = new Set(
  Object.values(STRIPE_AI_PRICES).flatMap(t => [t.month, t.year]).filter(Boolean)
)
export const isAiPrice = (priceId: string) => AI_PRICE_IDS.has(priceId)
```

---

## Scenarios

### Scenario 1: Main subscription only (no AI) — NO CHANGE

User trial ends → subscribes via existing checkout → 1 item (per-lot). Unchanged from today.

### Scenario 2: AI during trial

**Flow:**
1. User on trial (no Stripe subscription) clicks "Activate AI"
2. UI shows billing interval toggle (monthly/annual) + tier selection
3. Banner: "À la fin de votre essai (JJ/MM), votre abonnement SEIDO sera activé automatiquement si vous avez plus de 2 biens. Vous pouvez annuler à tout moment."
4. Stripe Checkout with:
   - `line_items`: AI price only (1 item)
   - `subscription_data.billing_cycle_anchor`: trial end timestamp
   - `subscription_data.metadata`: `{ team_id, source: 'ai_during_trial' }`
5. Stripe charges prorated amount (now → trial end) immediately
6. Provisioning triggered on webhook

**At trial end (cron job):**
- If AI subscription exists AND lotCount > FREE_TIER_LIMIT:
  - `stripe.subscriptions.update()` to add main per-lot item
  - Update `subscriptions` table: `status: 'active'`
- If AI subscription exists AND lotCount ≤ FREE_TIER_LIMIT:
  - No main item added. AI continues alone.
  - Update `subscriptions` table: `status: 'free_tier'`
- If no AI subscription:
  - Existing behavior: `trialing → free_tier` or `read_only`

### Scenario 3: AI after main subscription active

**Flow:**
1. User has active main subscription (Stripe sub exists)
2. User clicks "Activate AI" on settings page
3. UI detects existing subscription interval (monthly/annual)
4. Confirmation modal: "X€/[interval]. Facturé immédiatement au prorata. Annulable à tout moment avec remboursement proportionnel."
5. Server action: `stripe.subscriptions.update()` adds AI item
6. No checkout needed — payment method already on file
7. Provisioning triggered

### Scenario 4: Remove AI add-on

**Flow:**
1. User clicks "Résilier l'assistant IA"
2. Confirmation modal with estimated prorated credit (via `stripe.invoices.createPreview()`)
3. Server action: `stripe.subscriptionItems.del(aiItemId, { proration_behavior: 'create_prorations' })`
4. Deprovision WhatsApp
5. Prorated credit applied to next invoice

### Scenario 5: User subscribes to main while AI already active (during trial)

User has AI subscription (from Scenario 2) and clicks "S'abonner" on main pricing page BEFORE trial ends.

**Flow:**
1. Detect existing AI Stripe subscription
2. Instead of new checkout: `stripe.subscriptions.update()` to add main per-lot item
3. Prorated charge for main (now → next billing cycle)
4. Update `subscriptions` table: `status: 'active'`

### Scenario 6: Billing cycle anchor edge case

If trial has already expired when user takes AI (`trial_end < now`):
- No `billing_cycle_anchor` — standard checkout (immediate billing, normal cycle)
- This is the same as Scenario 3 (post-trial)

---

## File Changes

### 1. `lib/stripe.ts` — Price config restructure

- `STRIPE_AI_PRICES` → nested `{ month, year }` per tier
- Add `AI_PRICE_IDS` Set + `isAiPrice()` helper
- Add `getTierFromPriceId(priceId)` reverse lookup
- Add env vars: `STRIPE_PRICE_AI_SOLO_ANNUAL`, `STRIPE_PRICE_AI_EQUIPE_ANNUAL`, `STRIPE_PRICE_AI_AGENCE_ANNUAL`

### 2. `app/actions/ai-subscription-actions.ts` — Major refactor

**`createAiCheckoutAction(tier, billingInterval)`:**
- If trial (no Stripe sub): Checkout Session with AI item + `billing_cycle_anchor: trialEnd`
- If active Stripe sub exists: `subscriptions.update()` to add AI item (no checkout)
- Returns `{ immediate: true }` for update path, `{ url }` for checkout path

**New `previewAiAddonAction(tier)`:**
- Calls `stripe.invoices.createPreview()` to show prorated amount in confirmation modal

**New `removeAiAddonAction()`:**
- Finds AI subscription item ID from subscription items
- Removes via `stripe.subscriptionItems.del(itemId, { proration_behavior: 'create_prorations' })`
- Triggers deprovision

**`getProvisioningStatus()`** — unchanged

### 3. `lib/services/domain/stripe-webhook.handler.ts` — Items-based detection

**`handleSubscriptionCreatedOrUpdated()`:**
- Scan `subscription.items.data` for AI price IDs via `isAiPrice()`
- If AI item found → `ensureAiProvisioned(teamId, tier, priceId, subscriptionId)`
- If AI item absent but was previously active → `ensureAiDeprovisioned(teamId)`
- Handle main item as before (per-lot quantity update)
- Keep `metadata.addon_type === 'ai_voice'` as fallback for legacy subs

**`handleSubscriptionDeleted()`:**
- Handles both main + AI teardown (single sub deleted = everything gone)

### 4. `lib/services/domain/subscription.service.ts` — Trial auto-conversion

**New `autoConvertTrialWithAi(teamId)`:**
- Called by trial-expiry cron
- Finds AI Stripe subscription for team
- If exists AND lotCount > FREE_TIER_LIMIT: add main per-lot item
- If exists AND lotCount ≤ FREE_TIER_LIMIT: no-op (free tier + AI)

**Modify main checkout flow:**
- If AI subscription already exists → `subscriptions.update()` to add main item instead of new checkout

### 5. Trial expiry cron — Add auto-conversion step

Before the existing `trialing → free_tier/read_only` transition:
- Check if team has an active AI Stripe subscription
- If yes + lotCount > 2: call `autoConvertTrialWithAi()` → status becomes `active`
- If yes + lotCount ≤ 2: status becomes `free_tier` (AI continues independently)
- If no: existing behavior unchanged

### 6. `assistant-ia-settings-client.tsx` — UI changes

**Trial mode:**
- Billing interval toggle (monthly/annual) above tier cards
- Banner: trial conversion notice with trial end date
- Prices on cards adapt to selected interval

**Active subscription mode (no AI yet):**
- No interval toggle (follows existing sub interval)
- Confirmation modal with prorated amount (from `previewAiAddonAction`)
- Direct activation (no Stripe redirect)

**Active AI:**
- New "Résilier l'assistant IA" button in Actions section
- Confirmation modal with prorated credit estimate

### 7. `settings-page.tsx` — Enhanced AI card

**Not active:**
- Compact card with price anchor + CTA "Découvrir les plans →"

**Active:**
- Status badge, phone number, minutes progress bar (X/Y), conversations count, recharge auto status
- Link "Gérer →" to full settings page

### 8. Dashboard — Tab "Assistant IA" always visible

- `task-type-segment.tsx`: remove condition hiding tab when count = 0
- New empty state component for non-subscribed users (conversion CTA)

### 9. `.env.example` — New env vars

```
STRIPE_PRICE_AI_SOLO_ANNUAL=price_xxx
STRIPE_PRICE_AI_EQUIPE_ANNUAL=price_xxx
STRIPE_PRICE_AI_AGENCE_ANNUAL=price_xxx
```

### 10. DB migration — None required

Existing `ai_phone_numbers` table already has all needed columns. The `stripe_ai_subscription_id` will now point to the same subscription as the main one (when both items are on the same sub).

---

## Edge Cases

| # | Case | Resolution |
|---|------|------------|
| 1 | User cancels AI during trial | AI deprovision. Stripe sub cancelled. Trial continues normally. At trial end: standard `trialing → free_tier/read_only`. |
| 2 | Trial expires + AI active + >2 lots | Auto-conversion: main item added to AI subscription. User notified at AI purchase time. |
| 3 | Trial expires + AI active + ≤2 lots | Free tier + AI. No main item added. AI subscription continues with AI item only. |
| 4 | User subscribes to main before trial ends (while AI active) | Add main item to existing AI subscription (no new checkout). |
| 5 | User removes AI then re-adds | Remove: prorated credit. Re-add: `subscriptions.update()` adds item back, prorated charge. |
| 6 | Trial already expired when taking AI | No `billing_cycle_anchor`. Standard checkout, normal billing cycle. |
| 7 | Annual main + AI removal | Prorated refund for remaining months of AI. Main subscription unaffected. |
| 8 | User has ≤2 lots, takes AI, then adds more lots | AI active + free tier → user passes FREE_TIER_LIMIT → need to add main item. Handled by existing lot-creation gate: "Vous avez dépassé 2 biens, veuillez souscrire." |
| 9 | Double webhook/verify race | Idempotence guard in `ensureAiProvisioned()` — checks `ai_phone_numbers.is_active` before provisioning. |
| 10 | Legacy separate AI subscriptions | Fallback: `metadata.addon_type === 'ai_voice'` still detected in webhook handler during transition period. |

---

## UI Copy — Trial + AI Checkout Banner

**French:**
> À la fin de votre essai le **{date}**, votre abonnement SEIDO ({lotCount} biens × {price}€/{interval}) sera activé automatiquement si vous avez plus de 2 biens. Vous pouvez annuler l'assistant IA et l'abonnement à tout moment.

**Active subscription + AI confirmation modal:**
> **Activer l'Assistant IA — Plan {tier}**
>
> Montant : {price}€/{interval}
> Prorata aujourd'hui : ~{prorata}€ ({daysRemaining} jours restants sur votre cycle)
>
> Vous pouvez résilier à tout moment. Le montant non utilisé sera crédité sur votre prochaine facture.

---

## Stripe API Verification Notes (2026-03-28)

### Confirmed by docs

1. **`billing_cycle_anchor` in Checkout Session**: Supported via `subscription_data.billing_cycle_anchor`. First period is prorated automatically from creation to anchor date. `proration_behavior: 'none'` makes initial period free.
2. **`DELETE /v1/subscription_items/:id`**: Removes an item without cancelling the subscription. Supports `proration_behavior` param. **Use this instead of `subscriptions.update()` for removing AI item** — cleaner API.
3. **`stripe.invoices.createPreview()`**: Pass `subscription_details.proration_date` to preview prorations. Use the same `proration_date` when actually updating for consistency.
4. **Proration gotcha**: If customer has an **unpaid invoice** for current period and modifies subscription, credits may be issued for amounts never paid. Mitigate: check invoice status before allowing changes, or use `proration_behavior: 'none'`.
5. **Discount interaction**: Proration items are marked `discountable=false` — subscription-level discounts don't apply to prorated line items.

### Stripe "Trial Offers" (per-item trials) — DEFERRED

Stripe has a newer API ("Trial Offers") that supports per-item trials within a single subscription: one item charges immediately while another has a free trial. This would allow creating a subscription with AI (no trial) + Main (trial until trial end) in one shot.

**Why deferred:** Requires API version `2026-03-25.preview` + "flexible billing mode". Too new/unstable. Our `billing_cycle_anchor` approach is production-ready. Can migrate to Trial Offers in a future iteration if Stripe graduates it to stable.

### Constraint confirmed

- **Same billing interval required**: All recurring items in a subscription must share the same interval. Annual AI prices are needed.
- **Checkout does not support combining `trial_end` with `billing_cycle_anchor`**: Not a problem — our trial is app-managed, not Stripe-managed.
- **`billing_cycle_anchor` cannot be backdated** via `billing_cycle_anchor_config`: Use raw timestamp instead (works for future dates).

### Feature Evaluation Corrections (score: 73/100 → target: 85+)

**HIGH #7 — `items.data[0]` assumption breaks with multi-item subscriptions:**

All code that accesses `subscription.items.data[0]` must be refactored to find items by price ID:

```typescript
const mainItem = items.find(i => !isAiPrice(i.price.id))
const aiItem = items.find(i => isAiPrice(i.price.id))
```

Affected locations (5+):
- `subscription.service.ts`: `upgradeSubscriptionDirect()`, `previewUpgrade()`, `syncPeriodDatesFromStripe()`
- `stripe-webhook.handler.ts`: `handleSubscriptionCreated()`, `handleSubscriptionUpdated()`
- Any other location using `items.data[0]?.quantity` or `items.data[0]?.price`

**HIGH #8 — `price_id` column in `subscriptions` table:**

Store only the MAIN price ID (per-lot). The AI price is already tracked in `ai_phone_numbers.stripe_ai_price_id`. When writing to `subscriptions.stripe_price_id`, filter to `mainItem.price.id`.

**HIGH #1 — Double-click guard for AI addition:**

Before calling `stripe.subscriptions.update()` to add AI item:
```typescript
const existingAiItem = subscription.items.data.find(i => isAiPrice(i.price.id))
if (existingAiItem) return { success: false, error: 'L\'assistant IA est déjà actif' }
```

**MEDIUM #14 — Cron trial-expiry guard:**

The trial expiry cron must NOT transition teams that have an active AI Stripe subscription. Add guard:
```sql
-- Skip teams with active AI subscription (they have their own billing)
AND NOT EXISTS (
  SELECT 1 FROM ai_phone_numbers
  WHERE team_id = s.team_id
  AND is_active = true
  AND stripe_ai_subscription_id IS NOT NULL
)
```
For these teams: call `autoConvertTrialWithAi()` instead.

**MEDIUM #2 — Unpaid invoice guard:**

Before any subscription modification (add/remove AI item):
```typescript
const invoice = await stripe.invoices.retrieve(subscription.latest_invoice as string)
if (invoice.status === 'open' || invoice.status === 'past_due') {
  return { success: false, error: 'Veuillez régler votre facture en cours avant de modifier votre abonnement.' }
}
```

**MEDIUM #6 — Centralize tier detection:**

Replace `detectAiTier()` in webhook handler with `getTierFromPriceId()` from `lib/stripe.ts`. Single source of truth for price → tier mapping.

**MEDIUM #13 — Auto-conversion notification email:**

When cron auto-adds main item at trial end, send email via existing `SubscriptionEmailService.sendSubscriptionActivated()`. User was warned at AI purchase time but deserves a confirmation at conversion.

**MEDIUM #10 — Free tier + AI lot gate message:**

When `status === 'free_tier'` AND AI is active AND `lotCount >= FREE_TIER_LIMIT`:
> "Vous avez dépassé 2 biens. Souscrivez à l'abonnement SEIDO pour continuer à ajouter des biens."
> [Link to pricing page]

**LOW #16 — Update `verifyAiCheckoutSession`:**

This function is a webhook fallback for local dev. Update it to handle the new single-subscription model (AI-only checkout during trial).

---

### Correction: Remove AI action

Change from `subscriptions.update()` to dedicated endpoint:

```typescript
// Better: dedicated delete endpoint
await stripe.subscriptionItems.del(aiSubscriptionItemId, {
  proration_behavior: 'create_prorations',
})
```

---

## Implementation Order (with E2E checkpoints)

### Phase 1: Stripe Config + Core Logic (backend)

**Step 1** — Stripe Dashboard: create 3 annual AI prices (manual)
**Step 2** — `lib/stripe.ts`: restructure `STRIPE_AI_PRICES`, add helpers
**Step 3** — `ai-subscription-actions.ts`: refactor checkout + add/remove/preview actions
**Step 4** — `stripe-webhook.handler.ts`: items-based AI detection

**E2E Checkpoint 1 — Integration tests:**
- `tests/integration/ai-subscription-billing.test.ts`
- Test `isAiPrice()` and `getTierFromPriceId()` helpers
- Test `createAiCheckoutAction()` returns correct checkout URL (mock Stripe)
- Test `removeAiAddonAction()` calls `subscriptionItems.del()` (mock Stripe)
- Test webhook handler correctly detects AI items in subscription
- Test webhook handler triggers provisioning/deprovisioning based on item presence
- Test idempotence: double webhook doesn't double-provision

### Phase 2: Trial Auto-Conversion (backend)

**Step 5** — `subscription.service.ts`: `autoConvertTrialWithAi()` method
**Step 6** — Trial expiry cron: add auto-conversion step

**E2E Checkpoint 2 — Integration tests:**
- `tests/integration/trial-auto-conversion.test.ts`
- Test: trial + AI active + >2 lots → main item added to subscription
- Test: trial + AI active + ≤2 lots → no main item, status = free_tier
- Test: trial + no AI → existing behavior unchanged
- Test: trial + AI cancelled before expiry → standard trial transition

### Phase 3: UI — AI Settings Page (frontend)

**Step 7** — `assistant-ia-settings-client.tsx`: interval toggle, confirmation modals, removal

**E2E Checkpoint 3 — Playwright tests:**
- `tests/e2e/ai-subscription-ui.spec.ts`
- Test: trial user sees interval toggle + banner with trial end date
- Test: active user sees confirmation modal with prorated amount
- Test: active AI user sees "Résilier" button + confirmation modal
- Test: provisioning progress states render correctly (purchasing → active)
- Test: failed provisioning shows error + retry button

### Phase 4: UI — Settings Card + Dashboard Tab (frontend)

**Step 8** — `settings-page.tsx`: enhanced AI card (compact + contextual)
**Step 9** — Dashboard tab: always-visible + empty state CTA

**E2E Checkpoint 4 — Playwright tests:**
- `tests/e2e/ai-dashboard-discovery.spec.ts`
- Test: non-subscribed user sees AI tab in dashboard → empty state CTA
- Test: subscribed user sees AI tab with badge count
- Test: settings page shows compact AI card with correct state (not active / active with usage)
- Test: settings AI card links to full AI settings page

### Phase 5: Config + Quality Gates

**Step 10** — `.env.example` + Vercel env vars

**Final Quality Gates:**
1. `npm run lint` — zero new warnings
2. `npm run test:integration` — all integration tests pass
3. `npm run test:e2e` — all Playwright tests pass
4. **`feature-evaluator` agent** — 3-axis evaluation (Security 40%, Patterns 30%, Design Quality 30%)
5. **`simplify` skill** — code reuse, quality, and efficiency review across all changed files
