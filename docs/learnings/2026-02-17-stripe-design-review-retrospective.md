# Retrospective: Stripe Subscription Design Review

**Date:** 2026-02-17
**Duration:** ~3 hours (2 audit passes + Ralph review + user stories)
**Stories Created:** 36 user stories in 12 epics
**Branch:** preview (documentation only, no code changes)

## What Went Well
- Double-pass audit (best practices + SaaS benchmarks) identified 16 problems total
- Structured Q&A with user (3 rounds, 11 questions) resolved all ambiguities
- Codebase exploration BEFORE story writing caught 11 corrections (C1-C11)
- Ralph methodology provided clear framework for going from vague docs to precise user stories

## What Could Be Improved
- Original design docs were written WITHOUT verifying actual codebase state (table existence, function names, file paths)
- This caused wasted effort correcting assumptions during the Ralph review
- Should have done the Explore agent check as Step 1, not as a late discovery

## New Learnings Added to AGENTS.md
- Learning #039: Verify codebase state BEFORE writing implementation plans
- Learning #040: App-managed trial vs Stripe-managed trial — choose based on card requirement

## Patterns Discovered
- **App-managed trial pattern:** No Stripe subscription during trial, just DB timestamp + CRON notifications. Simpler than Stripe-managed when no card is required.
- **Annual-aggressive pricing UI:** Pre-select annual everywhere, hide monthly behind small link. Studies show 60-80% choose pre-selected plan.
- **Behavioral triggers complement calendar emails:** Usage-based prompts (38% conversion) vs calendar-only (18%).
- **Double billing page pattern:** Summary card in settings (quick glance) + dedicated billing page (full detail). Common in SaaS apps.

## Anti-Patterns Avoided
- **ALTER TABLE on non-existent table** — Caught before implementation
- **Wrong admin client name** — Would have caused runtime errors
- **Overly broad RLS** — Original plan gave billing access to owner+admin+gestionnaire, narrowed to admin only
- **Stripe-managed trial without card** — Impossible, would have required rearchitecting

## Recommendations for Similar Future Work
1. Always run an Explore agent to verify codebase state before writing implementation plans
2. For Stripe integrations: decide card-required vs no-card FIRST, it determines trial architecture
3. Document decisions with rationale (why 30 days not 14, why app-managed not Stripe-managed)
4. Use corrections table (C1-C11 format) to track discrepancies between plan and reality

## Files Changed
- `docs/stripe/2026-01-30-stripe-subscription-design.md` — Updated (2 audit passes)
- `docs/stripe/2026-01-30-stripe-subscription-implementation-plan.md` — Updated (2 audit passes)
- `docs/stripe/2026-02-17-stripe-user-stories.md` — NEW (36 user stories)
- `docs/stripe/prd.json` — NEW (Ralph-format JSON for future implementation)
- `AGENTS.md` — +2 learnings (#039, #040)
- `tasks/progress.txt` — +1 entry
