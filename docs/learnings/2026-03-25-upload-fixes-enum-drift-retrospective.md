# Retrospective: Upload Fixes + Provider Enum Drift + Annual Cost + Quality Gate Optimization

**Date:** 2026-03-25
**Duration:** ~2h (across 2 sessions)
**Branch:** preview

## What Went Well
- Three-round debugging of contract upload error: server logs from user provided exact root cause each time
- NFD normalization is a clean, portable solution for filename sanitization across languages
- Rate limit tier adjustment solved concurrency without weakening security boundaries
- Quality gate LIGHT/FULL triage was a simple CLAUDE.md change with outsized token savings

## What Could Be Improved
- The 3-layer enum drift (UI/Zod/DB) had existed for weeks unnoticed — should catch during initial feature development
- Error object serialization as `{}` is a well-known pino gotcha — should have been in AGENTS.md already
- Multiple code reverts during the session (by external linter/user) required re-applying all changes — fragile workflow

## New Learnings Added to AGENTS.md
- Learning #190: Supabase Storage rejects non-ASCII filename keys — sanitize with NFD
- Learning #191: Rate limiter tier mismatch — concurrent uploads hit sensitive tier limit
- Learning #192: Zod/DB/UI enum drift — 3-layer validation must stay aligned
- Learning #193: Error object serializes as `{}` in pino logger — log message string instead

## Patterns Discovered
- **NFD + ASCII regex** for filename sanitization: `.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]/g, '-')` — universal solution for any language
- **Rate limit tier as usage-profile**: Consider concurrent usage patterns (multi-file upload = burst), not just security sensitivity
- **3-layer enum grep**: When adding UI enum values → check `z.enum()` in schemas.ts + DB enum type + table config filters

## Anti-Patterns Avoided (or Encountered)
- Logging raw Error objects in structured loggers (pino, winston) → always extract `.message`
- Classifying all `/upload-` routes as "sensitive" without considering concurrent usage → rate limit by usage pattern

## Recommendations for Similar Future Work
- When adding new values to any dropdown/select, run: `grep -rn "z.enum.*providerCategory\|provider_category" lib/validation/`
- When creating upload routes, always test with French filenames (accents, apostrophes, spaces)
- Consider adding a pre-commit hook that checks for new `z.enum()` values against their DB enum counterparts

## Files Changed
- `app/api/upload-contract-document/route.ts` — filename sanitization
- `app/api/upload-intervention-document/route.ts` — filename sanitization
- `app/api/upload-supplier-contract-document/route.ts` — filename sanitization
- `lib/rate-limit.ts` — upload tier: sensitive → api
- `lib/constants/mime-types.ts` — HEIC, CSV, octet-stream
- `lib/validation/schemas.ts` — provider_category 2 → 10 values
- `hooks/use-contract-upload.ts` — error logging fix
- `components/contract/supplier-confirmation-step.tsx` — annual cost display
- `supabase/migrations/20260324100000_expand_provider_category_enum.sql` — DB enum expansion
- `.claude/CLAUDE.md` — LIGHT/FULL gate triage
- `.claude/skills/sp-quality-gate/SKILL.md` — matching triage docs
- `app/actions/subscription-actions.ts` — subscription self-healing fallback
