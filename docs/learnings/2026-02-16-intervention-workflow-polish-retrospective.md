# Retrospective: Intervention Workflow Polish (7 Themes)

**Date:** 2026-02-16
**Duration:** Multi-session (2026-02-11 to 2026-02-16)
**Branch:** preview
**Files Changed:** 40 (1034 insertions, 1531 deletions = -497 net)

## Themes

### 1. Suppression `demande_de_devis` status
- Migrated from status-based to flag-based quote actions (`requires_quote`)
- Removed all traces from action-utils, alert-utils, action-styles
- Provider quote actions now live in a post-switch block, not inside a case

### 2. Quote status `approved` -> `accepted`
- Aligned 8 files with actual DB enum
- DbQuoteStatus expanded from 5 to 7 values (added draft, sent, accepted)
- Kept backward-compat `approved -> accepted` mapping in quote-status-mapper only

### 3. Finalization-context API refactoring
- Replaced nested PostgREST select with 6 parallel separate queries
- Follows AGENTS.md Learning #004 (RLS + nested relations)
- Added selected_by_manager to time slots select

### 4. Quote submission simplification
- Removed 726 lines of time slot logic from quote-submission-form
- Time slots exclusively managed via Planning tab + MultiSlotResponseModal
- Removed estimatedDuration from API, added created_by + team_id

### 5. InterventionDetailsCard enrichment
- 6 new props for prestataire interactions
- Sections filter for controlling which sections display
- Planning status expanded with 'responded' value

### 6. Dashboard simplification
- Removed PendingActionsSection from locataire + prestataire dashboards
- Tab "A traiter" in navigator replaces the separate section
- Added "Gerer devis" menu item in list view for providers

### 7. Quote modals + UI polish
- QuoteApprovalModal / QuoteRejectionModal replace direct fetch
- UnifiedModalHeader gains `badge` prop
- All provider labels unified to "Gerer planification"
- Tab labels: "Planning" -> "Planning et Estimations"

## What Went Well
- The flag-based approach (`requires_quote`) is much cleaner than status-based
- Removing 726 lines from quote-submission-form without breaking anything
- Cross-referencing General tab to fix finalization modal bugs
- Separate queries pattern for API consistently prevents RLS silent failures

## What Could Be Improved
- The 40 files were accumulated across sessions without intermediate commits
- Status values should be centralized as TypeScript constants (not magic strings)
- The InterventionDetailsCard is getting prop-heavy (20+ props) — may need composition pattern

## New Learnings Added to AGENTS.md
- Learning #035: Time slot status is 'selected' not 'confirmed'
- Learning #036: Quote actions must be flag-based, not status-based
- Learning #037: DB quote status is 'accepted' not 'approved'
- Learning #038: Separate queries for finalization-context API (RLS safety)

## Anti-Patterns Encountered
- Status-based quote actions coupled to removed status -> flag-based decoupling
- Nested PostgREST selects with RLS -> separate parallel queries
- Magic string 'confirmed' assumed from UI semantics -> check DB schema
- Direct fetch for destructive actions (approve/reject) -> confirmation modals

## Recommendations for Similar Future Work
1. Create `lib/constants/quote-status.ts` and `lib/constants/time-slot-status.ts` for all status values
2. Commit intermediate work more frequently (don't accumulate 40 files)
3. When removing a status value, grep ALL files for it (not just the main utils)
4. InterventionDetailsCard could benefit from a composition pattern (slot panels, quote panels as children)

## Knowledge Base Updates
- **AGENTS.md:** 34 -> 38 learnings
- **progress.txt:** +7 theme entries
- **activeContext.md:** Complete rewrite reflecting current state
- **progress.md:** Updated metrics + milestone entry
- **techContext.md:** Added quote_status enum details
- **systemPatterns.md:** Added 3 anti-patterns
- **MEMORY.md:** Updated project state + 3 new mistakes-to-avoid
- **prd.json:** Already completed (Account Status Indicator feature)
