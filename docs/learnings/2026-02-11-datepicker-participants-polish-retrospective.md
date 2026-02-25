# Retrospective: DatePicker Enhancement + ParticipantsRow Polish

**Date:** 2026-02-11
**Duration:** ~2 sessions
**Stories Completed:** 3/3 (DatePicker) + 1 polish task (ParticipantsRow)
**Branch:** `preview`

## What Went Well
- DatePicker enhancement via 3 clean stories — each independently testable
- ParticipantsRow plan was precise enough (5 changes, 1 file) to execute in 3 edits with zero rework
- Exported `parseLocalDate` / `formatLocalDate` as shared utilities — immediately reused by 4 consumer files
- react-day-picker v9 native `captionLayout="dropdown"` eliminated need for custom dropdown component

## What Could Be Improved
- `npx tsc --noEmit <single-file>` was misleading — produced false errors. Should always use project-wide check for TSX files with path aliases
- The 40-file working tree makes compound harder — would benefit from smaller, more frequent commits

## New Learnings Added to AGENTS.md
- Learning #027: ISO date string timezone trap — `new Date("YYYY-MM-DD")` creates UTC midnight, shifts day in non-UTC timezones
- Learning #028: react-day-picker v9 captionLayout="dropdown" for efficient month/year navigation

## Patterns Discovered
- **Layered disclosure**: Tooltip for brief section-level explanations + HoverCard for rich interactive content on the same component
- **TooltipProvider isolation**: Each Tooltip gets its own `TooltipProvider` to avoid shared open/close state
- **Auto-mask input**: Strip non-digits then re-insert slashes — simpler than cursor position tracking
- **parseLocalDate/formatLocalDate**: Shared utilities for timezone-safe ISO date ↔ Date conversion

## Anti-Patterns Avoided
- Did NOT use `new Date(isoString)` for display dates — learned from timezone bug
- Did NOT share single TooltipProvider — would cause flicker between adjacent tooltips
- Did NOT force DatePicker into compound Calendar+TimePicker UIs — kept direct Calendar for layout flexibility

## Recommendations for Similar Future Work
- When adding tooltips to section labels, always add `cursor-default` on the trigger div
- For icon sizing consistency: compare visual weight, not just pixel size — denser icons need smaller dimensions
- Always run `npx tsc --noEmit` (project-wide, no file arg) for TSX validation

## Files Changed (key)
- `components/ui/calendar.tsx` — captionLayout dropdown
- `components/ui/date-picker.tsx` — manual input with auto-mask
- `components/ui/time-picker-24h.tsx` — minor polish
- `components/interventions/shared/layout/participants-row.tsx` — tooltips, icon, badge unification
- `components/interventions/intervention-create-form.tsx` — migrated to DatePicker
- `components/interventions/intervention-request-form.tsx` — migrated to DatePicker
- `app/gestionnaire/(with-navbar)/parametres/emails/components/email-connection-form.tsx` — migrated to DatePicker
