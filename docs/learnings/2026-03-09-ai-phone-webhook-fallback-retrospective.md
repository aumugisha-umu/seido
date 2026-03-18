# Retrospective: AI Phone Webhook Fallback

**Date:** 2026-03-09
**Duration:** ~30 min (diagnosis + fix)
**Branch:** feature/ai-phone-assistant
**Trigger:** Production webhook failure — Anthropic API credit balance error

## What Went Well
- The existing `after()` + per-step try/catch pattern (steps 8-12) was already resilient — only step 5 was unprotected
- The fallback fix was minimal (~10 lines) and non-disruptive
- The constraint relaxation migration was clean and backwards-compatible
- Call log was saved even when intervention creation failed (existing defensive code)

## What Could Be Improved
- AI extraction should have had a fallback from day 1 — any external API call in a zero-retry webhook is a single point of failure
- The Anthropic credit balance issue (HTTP 400 with "credit balance too low" despite having $5) was an external platform issue, but our code should never depend on external API availability for core operations
- PostgREST's generic "Value does not meet constraints" error made debugging harder — consider adding application-level validation before INSERT to give better error messages

## New Learnings Added to AGENTS.md
- Learning #127: Webhook AI extraction must have fallback
- Learning #128: CHECK constraints designed for web flows break webhook/AI flows
- Learning #129: PostgREST constraint errors don't name the constraint

## Patterns Discovered
- **Graceful degradation for enrichment**: AI extraction is an enrichment step, not a core operation. Design it as optional: `try { enriched } catch { raw }`. The core pipeline (create entity, assign, notify) must never depend on enrichment succeeding.
- **"At most one" vs XOR constraint**: When a table gains new creation channels, XOR constraints (`exactly one of A/B`) often need relaxing to "at most one" (`NOT (A AND B)`). The entity can start unassigned and be completed later.
- **Type inference from dynamic imports**: `type T = Awaited<ReturnType<typeof fn>>` avoids separate type imports when using dynamic `import()`.

## Anti-Patterns Avoided
- Did NOT make location required by picking a random lot as fallback (would be misleading)
- Did NOT add a separate "AI-only" creation path — the existing path just needed to handle NULL location
- Did NOT remove the CHECK constraint entirely — still prevents the invalid state of both building AND lot being set

## Recommendations for Similar Future Work
1. When integrating ANY external API in a webhook/background job, always wrap in try/catch with a meaningful fallback
2. When adding new entity creation channels (import, webhook, AI, API), audit ALL CHECK constraints on the target table
3. For PostgREST constraint errors, grep migration files for `CONSTRAINT` + table name to map error to specific constraint

## Files Changed
- `app/api/webhooks/elevenlabs/route.ts` — AI extraction try/catch with fallback summary
- `supabase/migrations/20260309120000_relax_intervention_location_constraint.sql` — XOR → at-most-one
