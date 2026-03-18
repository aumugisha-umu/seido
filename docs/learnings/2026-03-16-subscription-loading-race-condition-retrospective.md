# Retrospective: Subscription Loading Race Condition + Full Audit

**Date:** 2026-03-16
**Duration:** ~2h (debugging + audit + fixes)
**Branch:** preview
**Trigger:** User clicked "Nouvel immeuble" with 14/50 lots, got upgrade modal

## What Went Well
- Systematic debugging traced the exact data flow in 1 pass (button → hook → service → Stripe API)
- Parallel agent exploration (3 agents) completed full audit of 200+ files in ~4 minutes
- Defense-in-depth architecture meant the bug was UX-only, not security (server actions always re-check)
- The `previewUpgrade()` Stripe quantity vs actual count confusion was caught in same session

## What Could Be Improved
- The `?? false` default pattern in `useSubscription` should have been documented as a known footgun from day 1
- No test exists for "click button while hook is loading" — would have caught this earlier
- The `previewUpgrade()` returning Stripe `item.quantity` as `current_lots` was a semantic error that went unnoticed for weeks

## New Learnings Added to AGENTS.md
- Learning #149: Hook `?? false` defaults create loading race conditions on UI gates
- Learning #150: `previewUpgrade().current_lots` was Stripe quantity, not actual DB count
- Learning #151: Server-side subscription gates should be fail-open with try-catch

## Patterns Discovered
- **Fail-open on loading, fail-closed after load** — client UI gates should not block during the ~500ms hook loading window. Server actions are the real security boundary.
- **`!subscriptionLoading && isReadOnly`** — uniform pattern for all disabled buttons and BlockedListOverlay. During loading: condition is `false` (enabled). After loading: delegates to actual `isReadOnly` value.
- **Actual vs subscribed distinction** — `UpgradePreview` now has `current_lots` (actual DB count) + `subscribed_lots` (Stripe quantity). Display as "14 / 50" format.

## Anti-Patterns Avoided (or Encountered)
- **`canAddProperty ?? false` during loading** → blocks valid users (encountered and fixed)
- **`lots.length` as fallback for `actual_lots`** → stale client state, different data source (encountered and fixed)
- **Stripe `item.quantity` labeled as "lots actuels"** → semantic confusion (encountered and fixed)

## Recommendations for Similar Future Work
- When adding a new `useSubscription()` consumer, ALWAYS destructure `loading` and check it before acting on derived booleans
- When displaying subscription counts, always distinguish "actual usage" from "subscription capacity"
- Add E2E test: "click creation button immediately on page load" to catch loading race conditions

## Files Changed
- `app/gestionnaire/(with-navbar)/biens/biens-page-client.tsx` — fail-open loading + fallback fix
- `app/gestionnaire/(no-navbar)/biens/immeubles/[id]/building-details-client.tsx` — fail-open loading
- `app/gestionnaire/(with-navbar)/contacts/contacts-page-client.tsx` — `!subscriptionLoading && isReadOnly`
- `app/gestionnaire/(with-navbar)/interventions/interventions-page-client.tsx` — `!subscriptionLoading && isReadOnly`
- `app/gestionnaire/(no-navbar)/biens/lots/nouveau/page.tsx` — try-catch fail-open
- `lib/services/domain/subscription.service.ts` — `previewUpgrade()` actual vs subscribed
- `components/billing/upgrade-modal.tsx` — display "lots utilises / inclus"
- `components/confirmation/confirmation-document-list.tsx` — chip redesign
- `components/contract/supplier-confirmation-step.tsx` — use shared component
