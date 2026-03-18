# Retrospective: Stripe Trial Payment Collection & Blocked Mode

**Date:** 2026-03-14
**Duration:** ~2 sessions (2026-03-13 to 2026-03-14)
**Stories Completed:** 11 / 11
**Branch:** preview

## What Went Well
- Ralph methodology worked smoothly for a feature touching 85+ files across all 3 roles
- Story-by-story approach prevented scope creep — each story was independently testable
- Existing `SubscriptionBanners` / `ReadOnlyBanner` architecture made role variants easy
- `BlockedListOverlay` wrapper pattern avoided modifying individual card components
- `unstable_cache` with `['subscription']` tag ensures webhook invalidation works across roles
- Simplify review caught a semantic bug (missing `paused` status) before production

## What Could Be Improved
- The initial implementation duplicated `isTeamNotificationsBlocked` in 3 files — should have extracted to `lib/` from the start
- `getCachedSubscriptionInfo` was copy-pasted to 3 layouts before being consolidated — could have been shared from the beginning
- Migration had a conflict with remote (20260311130000 not in local) — `migration repair --status reverted` workflow is still needed frequently

## New Learnings Added to AGENTS.md
- Learning #138: Stripe trial checkout returns `no_payment_required` not `paid`
- Learning #139: Status constant sets must match canonical service
- Learning #140: `unstable_cache` wrappers should be shared utilities
- Learning #141: `'use server'` file helpers can't be imported cross-file — extract to `lib/`

## Patterns Discovered
- **Tiered dismissibility**: Different urgency levels warrant different dismiss behaviors (localStorage 24h / sessionStorage session / non-dismissible)
- **BlockedListOverlay wrapper**: Cheaper than modifying each list component — `opacity-60 pointer-events-none` + invisible `cursor-not-allowed` overlay
- **Role-specific exceptions in blocked mode**: Prestataire can access in-progress interventions even when team is blocked — explicit `IN_PROGRESS_STATUSES` set
- **Shared subscription cache**: One `lib/subscription-cache.ts` with `unstable_cache` wrapping, imported by all role layouts

## Anti-Patterns Avoided (or Encountered)
- **Duplicate helper in 'use server' files** — can't import between 'use server' files; must extract to `lib/`
- **Status set drift** — `BLOCKED_STATUSES` omitted `paused` in 3 files while service treated it as blocked
- **Hardcoded map height** — `height={252}` instead of using the `mapHeight` prop (caught by efficiency review)

## Recommendations for Similar Future Work
- When adding a business rule status set (blocked, active, etc.), immediately check the canonical service that defines the behavior
- When a helper is needed in 2+ server action files, create it in `lib/` from the start — never duplicate
- Use `unstable_cache` wrappers in shared `lib/` files, not in individual layouts
- For multi-role features, start with the gestionnaire implementation, then extend to locataire/prestataire with role-specific exceptions

## Files Changed (91 files)
- Migration: 1 new SQL file
- New components: blocked-list-overlay.tsx, trial-upgrade-modal.tsx
- New utilities: subscription-guard.ts, subscription-cache.ts
- Modified layouts: gestionnaire, locataire, prestataire (all 3)
- Modified actions: subscription-actions, notification-actions, conversation-notification-actions
- Modified components: trial-banner, read-only-banner, subscription-banners, onboarding-checklist, manager-dashboard
- Modified pages: detail page guards for 6+ entity types across 3 roles
- Modified CRONs: trial-notifications, trial-expiration
- Modified emails: trial-ending, trial-expired
- Proprietaire cleanup: ~40 files (contact type removal from UI)
