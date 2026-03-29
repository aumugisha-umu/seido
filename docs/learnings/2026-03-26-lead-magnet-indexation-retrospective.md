# Retrospective: Lead Magnet — Calculateur d'Indexation de Loyer

**Date:** 2026-03-26
**Stories Completed:** 8 / 8
**Branch:** preview
**Evaluation Score:** 8.3/10 (PASS)

## What Went Well
- **Discriminated union pattern** (`IndexationOutcome`) provided clean error handling across 3 regions with different rules
- **Pure client-side calculation** — no API call needed for the core compute, only for email capture
- **Dual-source update script** — NBB.Stat SDMX as primary, Statbel CSV as fallback, with safe no-overwrite on failure
- **React Email template** reused existing `EmailLayout`/`EmailHeader`/`EmailFooter` pattern seamlessly
- **Dynamic import** kept the landing page bundle lean while adding a 470-line calculator section
- **Single data source** for FAQ (data/faq.ts) driving both UI accordion and JSON-LD schema

## What Could Be Improved
- **Honeypot was cosmetic-only** — the hidden input value was hardcoded to `''` in the fetch body, making the server-side check useless. Caught during feature evaluation.
- **Duplicated `getBaseLegale`** — route.ts reimplemented logic already in calculate.ts. Should have imported from the start.
- **Portfolio email used inline HTML** — while the indexation letter got a proper React Email template, the portfolio lead email remained as a raw HTML string. Could be a React Email template in Phase 2.

## New Learnings Added to AGENTS.md
- Learning #204: Honeypot hidden inputs must be wired via useRef
- Learning #205: Public API routes — security without auth (rate limit + Zod + honeypot)
- Learning #206: Single data source for UI + JSON-LD structured data

## Patterns Discovered
- **Public API route security stack:** rateLimiters.public + Zod strict schema + honeypot + service role client — viable alternative to auth for public-facing endpoints
- **Region-specific strategy pattern:** Each Belgian region has unique indexation rules; the calculate.ts function dispatches to region-specific correction logic based on input
- **Discriminated union for calculation results:** `{ success: true; result } | { success: false; error }` pattern allows type-safe handling of both valid results and domain-specific errors (bail non enregistre, missing indices)

## Anti-Patterns Avoided (or Encountered)
- **Hardcoded honeypot value** — always wire hidden inputs to refs
- **HTML injection in email templates** — always escape user input before HTML interpolation, even with Zod validation
- **Duplicated helper functions** — export and reuse from the canonical source

## Recommendations for Similar Future Work
- For any public-facing calculator/tool: always layer rate limiting + validation + honeypot
- For region-specific Belgian regulations: use a strategy pattern with typed region enum
- For lead capture forms: separate the "compute" (client-side) from the "capture" (API call) concerns
- When adding inline HTML emails, plan to migrate to React Email templates before the feature is complete

## Files Changed
- lib/indexation/ (4 files: types, calculate, index, health-indices.json)
- scripts/update-health-indices.ts
- supabase/migrations/20260326220000_create_indexation_leads.sql
- app/api/lead-magnet/route.ts
- emails/templates/lead-magnet/indexation-letter.tsx
- emails/utils/types.ts
- components/landing/sections/indexation-section.tsx
- components/landing/landing-page.tsx
- data/faq.ts
- blog/articles/calculer-indexation-loyer-belgique.md
- tests/unit/indexation/calculate.test.ts
