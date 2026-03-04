# Retrospective: Remove Card Views from Gestionnaire

**Date:** 2026-03-04
**Duration:** ~1 session
**Stories Completed:** 5 / 5
**Branch:** preview

## What Went Well
- Ralph story-by-story approach made 4 navigator cleanups predictable and fast
- Parallel research agents validated the B2B decision before any code changes
- All navigators follow consistent BEM naming, making the removal pattern identical across files
- Net result: -829 lines, +123 lines — significant complexity reduction

## What Could Be Improved
- `next lint -- components/contacts/contacts-navigator.tsx` doesn't work (throws "couldn't find pages/app directory") — had to run full lint each time, slower feedback loop
- US-005 acceptance criteria said "ViewMode type is 'list' | 'calendar' (no 'cards')" — discovered during implementation that 2 components still need 'cards'. Should scan all consumers before writing ACs
- Could have batched US-003 and US-004 since they followed the exact same pattern

## New Learnings Added to AGENTS.md
- Learning #117: Cards vs Tables — B2B SaaS navigators must use tables, cards reserved for selection UIs

## Patterns Discovered
- **Navigator cleanup checklist** (7 steps): imports → hook state → render branches → toggle UI → BEM classes → config defaults → type definitions. Applied identically across patrimoine, contacts, and contrats navigators.
- **Different integration depths for same feature**: Contracts used `useViewMode` directly (removed entire hook), while contacts/patrimoine used `useDataNavigator` which wraps `useViewMode` (only changed destructured fields). Same feature, different removal scope.
- **Hydration skeleton coupling**: The contracts-navigator `!mounted` skeleton was ONLY needed because `useViewMode` reads localStorage. Removing the hook made the skeleton unnecessary — the component no longer has hydration mismatch risk.

## Anti-Patterns Avoided (or Encountered)
- **Type narrowing without consumer audit**: Almost removed 'cards' from ViewMode union, which would have broken property-selector and intervention-contacts-navigator
- **Config drift**: Table config files (`patrimoine.config.tsx`, `contacts.config.tsx`) had `defaultView: 'cards'` independently from the hook defaults — both needed updating

## Recommendations for Similar Future Work
- When removing a UI feature across multiple navigators, check both the component code AND the config objects (table-configs/)
- Before narrowing a shared TypeScript type, `grep` all consumers to find out-of-scope dependencies
- Consider creating a single "navigator cleanup" script if more view modes are removed in the future
- The card components themselves (ContractCard, BuildingCardExpandable, LotCardUnified, DataCards) still exist — they're dead code for navigators but may be used elsewhere. Future cleanup candidate.

## Files Changed
```
 components/contacts/contacts-navigator.tsx         |  62 +--
 components/contracts/contracts-navigator.tsx       |  98 +---
 components/interventions/interventions-navigator.tsx |  4 +-
 components/interventions/interventions-view-container.tsx | 61 +--
 components/interventions/view-mode-switcher-v1.tsx |  13 +-
 components/patrimoine/patrimoine-navigator.tsx     | 165 +------
 config/table-configs/contacts.config.tsx           |   4 +-
 config/table-configs/patrimoine.config.tsx         |   4 +-
 hooks/use-data-navigator.ts                        |   4 +-
 hooks/use-view-mode.ts                             |  24 +-
 14 files changed, 123 insertions(+), 829 deletions(-)
```
