# Retrospective: Unify Document Preview & Download across all roles

**Date:** 2026-02-26
**Duration:** ~2h (debugging + unification)
**Stories Completed:** 4 / 4
**Branch:** preview
**Methodology:** Ralph (sp-ralph)

## What Went Well
- Ralph methodology kept scope focused — 4 small stories completed sequentially
- The shared hook pattern (`useDocumentActions`) was clean: 1 hook → 3 consumers, zero wiring
- Reusing existing API routes (`/api/view-intervention-document`, `/api/download-intervention-document`) avoided creating new backend code
- Lint-first validation (no `npx tsc --noEmit` on Windows) saved time

## What Could Be Improved
- The original bug (buttons doing nothing) took longer to diagnose than expected because client-side `createSignedUrl()` fails silently — no error thrown, no console warning
- Should have started with server-side API routes from the beginning instead of trusting client-side storage SDK
- The `download` attribute cross-origin limitation was a surprise — should have been caught in initial implementation

## New Learnings Added to AGENTS.md
- Learning #093: Client-side storage.createSignedUrl() is unreliable — use server-side API routes
- Learning #094: HTML download attribute is ignored for cross-origin URLs
- Learning #095: Hook-as-ReactNode pattern for cross-role modal deduplication

## Patterns Discovered
- **Hook-as-ReactNode**: Return a pre-wired `<Modal />` via `useMemo` from a custom hook. Consumer just renders `{previewModal}`. Works perfectly when all consumers need identical behavior.
- **API route for storage access**: Server-side `getApiAuthContext()` + `createSignedUrl()` is always reliable. Client-side storage SDK is not.

## Anti-Patterns Avoided (or Encountered)
- **Client-side signed URLs**: `createBrowserSupabaseClient().storage.createSignedUrl()` — unreliable JWT, silent failures. Replaced with API route pattern.
- **HTML download attribute on cross-origin**: Doesn't work. Must use `{ download: fileName }` option in `createSignedUrl()` to set `Content-Disposition` header server-side.
- **window.open for document preview**: Breaks UX consistency across roles. Replaced with in-app modal via shared hook.

## Recommendations for Similar Future Work
- When implementing any storage-related feature, always route through API routes, never use client-side storage SDK in onClick handlers
- When unifying behavior across roles, prefer a shared hook that returns ready-to-render ReactNodes over extracting just the logic
- When adding download functionality for external/CDN files, always set `Content-Disposition` server-side — never rely on HTML `download` attribute

## Files Changed
```
 app/api/download-intervention-document/route.ts                          |   5 +-
 app/gestionnaire/(no-navbar)/interventions/[id]/.../detail-client.tsx    | 108 ++---
 app/locataire/(no-navbar)/interventions/[id]/.../detail-client.tsx       |  49 ++--
 app/prestataire/(no-navbar)/interventions/[id]/.../detail-client.tsx     |  48 ++--
 components/interventions/shared/hooks/use-document-actions.tsx           | 128 +++++
 components/interventions/shared/hooks/index.ts                           |   1 +
 components/interventions/shared/index.ts                                 |   5 +
 7 files changed, ~163 insertions(+), ~186 deletions(-)
```
