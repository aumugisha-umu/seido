# Retrospective: Rename Contact Type "Autre" → "Garant" + Proprietaire Fixes

**Date:** 2026-03-17
**Stories Completed:** 3 / 3
**Branch:** preview

## What Went Well
- Code review before implementation caught the critical Zod schema gap (would have caused 400 errors)
- User's "pas plus simple d'adapter zod?" prevented over-engineering (was about to use customRoleDescription as a signal hack)
- 0 migrations needed — the mapping layer (`mapContactTypeToRoleAndCategory`) absorbed the change entirely
- `contract_contact_role` enum already had `'garant'` from Phase 4 contracts migration — no DB work needed
- Clean separation: 9 files changed, each with a clear single responsibility

## What Could Be Improved
- Should have run code reviewer earlier in the brainstorming phase, not after the full design was "validated"
- Initial design had 3 iterations (remove customRoleDescription → use it as signal → just add to Zod) — could have been 1 if we'd checked Zod first
- The `'autre'` type's true nature (mapped to prestataire) wasn't immediately obvious from the UI code — had to trace through the API

## New Learnings Added to AGENTS.md
- Learning #152: Zod schema as API contract layer, independent of DB enums
- Learning #153: Contact type "autre" was never a real DB role — mapped to prestataire

## Patterns Discovered
- **Zod ≠ DB enum pattern:** Zod validates what the API accepts, the mapper converts to what the DB stores. They can diverge safely when a mapping function bridges them.
- **UI-only contact types:** Frontend can have contact types that don't exist in DB enums, as long as the API mapper handles them before any DB write.

## Anti-Patterns Avoided
- **Signal field hack:** Almost used `customRoleDescription` to carry the "garant" signal from client to API — added complexity for no benefit when Zod extension was simpler
- **Unnecessary migration:** Could have added `'garant'` to `user_role` DB enum — would have required migration + RLS changes + layout routing for no real benefit

## Recommendations for Similar Future Work
- Before adding/renaming contact types, trace the full data flow: form → Zod → mapper → DB columns
- Always check existing DB enums (especially `contract_contact_role`) before assuming migration is needed
- Run code reviewer on the design plan BEFORE implementation, not just on code after

## Files Changed
- `lib/validation/schemas.ts` — Added 'garant' to 2 Zod role enums
- `app/api/invite-user/route.ts` — Added garant mapping + smart contract linking
- `contact-creation-client.tsx` — Type union, mapContactType, inviteToApp forcing
- `step-1-type.tsx` — SelectItem, Shield icon, amber card, removed customRoleDescription field
- `step-3-contact.tsx` — Amber non-invitable card for garant
- `step-4-confirmation.tsx` — Garant label/colors, amber confirmation card
- `edit-contact-client.tsx` — Added proprietaire+garant to union, fixed legacy mappings
- `contact-details/constants.ts` — Added proprietaire+garant to USER_ROLES
- `lot-creation-form.tsx` — Fallback 'autre' → 'prestataire'
