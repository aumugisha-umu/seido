# Retrospective: AI Triage Card Redesign + ElevenLabs Voice Fixes

**Date:** 2026-03-29
**Duration:** ~4h (voice fixes + triage redesign + simplify)
**Branch:** preview

## What Went Well
- Brainstorming skill produced a clear design doc before implementation — zero rework
- The ContentNavigator + ViewContainer + Card/ListView pattern from Rappels/Interventions was directly reusable
- /simplify pass caught 6 concrete issues and resulted in cleaner, DRYer code
- Debug metadata dump (JSON.stringify in webhook) instantly revealed the correct ElevenLabs payload paths

## What Could Be Improved
- The `Intervention` TypeScript interface should have included `source` when the column was first added (migration 2026-03)
- The `type = 'demande_whatsapp'` filter was wrong from the start — should have been `source`-based from day 1
- ElevenLabs documentation for Twilio-registered call webhooks is missing — we had to discover the metadata structure empirically

## New Learnings Added to AGENTS.md
- Learning #225: Filter AI-sourced interventions by `source` column, not `type`
- Learning #226: ElevenLabs post-call webhook metadata structure for Twilio-registered calls
- Learning #227: Card + ListView pairs should share actions via a hook
- Learning #228: TypeScript interface must mirror DB columns used in runtime filters

## Patterns Discovered
- **Shared triage hook pattern**: `useTriageActions(item, onRemoved)` encapsulates all action handlers for both card and list views
- **Single-pass grouping**: Replace multiple `.filter()` calls with one loop that groups by key
- **ContentNavigator reuse**: Channel-based tabs (Toutes/WhatsApp/Appels/SMS) follow the exact same API as status-based tabs

## Anti-Patterns Encountered
- **Duplicate constants**: `AI_SOURCES` was defined 3 times — extracted to shared export
- **Missing TypeScript field**: DB column existed but interface lacked it, forcing `as any` casts
- **Double filtering**: Dashboard filtered AI sources twice in different code blocks — consolidated to filter once and reuse

## Recommendations for Similar Future Work
- When adding a new DB column, immediately add it to the TypeScript interface in `service-types.ts`
- When creating card + list view pairs, start with the shared hook and config — don't copy-paste then refactor
- Always filter by `source` column for AI-originated data, never by `type` (type is user-facing classification)
- Use debug metadata dumps early when working with undocumented webhook payloads

## Files Changed (18 files, +1040/-510)
- app/actions/whatsapp-triage-actions.ts (triage query rewrite)
- app/api/webhooks/elevenlabs/route.ts (post-call webhook fixes)
- app/api/webhooks/voice/route.ts (dynamic variable for caller phone)
- app/api/webhooks/whatsapp/route.ts (SMS agent + file split)
- app/gestionnaire/(with-navbar)/dashboard/components/async-dashboard-content.tsx (AI filter)
- components/operations/triage-shared.ts (NEW — shared channel config)
- components/operations/use-triage-actions.ts (NEW — shared actions hook)
- components/operations/whatsapp-triage-card.tsx (card redesign)
- components/operations/whatsapp-triage-list-view.tsx (NEW — list view)
- components/operations/whatsapp-triage-navigator.tsx (ContentNavigator integration)
- lib/services/core/service-types.ts (added source field)
- lib/services/domain/ai-phone/elevenlabs-agent.service.ts (Telnyx removal)
- lib/services/domain/ai-whatsapp/types.ts (shared AI_SOURCES constant)
