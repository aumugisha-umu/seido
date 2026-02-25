# Retrospective: Onboarding Checklist Redesign + Polish

**Date:** 2026-02-22
**Duration:** ~2 sessions
**Stories Completed:** 4/4 + 3 polish items
**Branch:** feature/stripe-subscription

## What Went Well
- SSR data pass pattern eliminated the client-side fetch waterfall — checklist now renders in initial HTML stream
- Contact creation form already supported `?type=` prefilling — just needed to wire it up from callers
- DropdownMenu removal was clean — all 6 imports removed, no side effects elsewhere
- Step tutorial content (whyItMatters/howItConnects) adds real value without cluttering the UI (progressive disclosure)

## What Could Be Improved
- The contact creation `?type=` param should have been included from the start when creating the onboarding steps (US-002)
- localStorage vs sessionStorage decision should be made upfront when designing dismiss/hide patterns
- The sidebar DropdownMenu was added early in the project when the profile section had more actions — it wasn't re-evaluated as the feature set simplified

## New Learnings Added to AGENTS.md
- Learning #078: sessionStorage for "dismiss until next session" patterns
- Learning #079: Contact creation prefill via ?type= query param
- Learning #080: Sidebar footer — direct actions over nested dropdowns

## Patterns Discovered
- **sessionStorage dismiss**: Perfect for onboarding-style UI that should remind users until they complete the flow, but not nag within a session
- **Existing infrastructure reuse**: Before building new prefill logic, check if the target form already supports query params — `mapContactType()` was already there
- **Fitts's Law in sidebars**: Critical actions (logout) deserve their own visible button, not a nested dropdown

## Anti-Patterns Avoided
- Permanent localStorage dismiss for incomplete onboarding → switched to sessionStorage
- DropdownMenu for 2-action sidebar footer → replaced with direct Link + button
- Missing query params on creation links → added ?type= to all onboarding hrefs

## Recommendations for Similar Future Work
- When linking to any creation form, always check if it supports query params for prefilling (most SEIDO forms do via searchParams)
- For "dismiss" UI patterns, default to sessionStorage unless the dismiss should be permanent
- Review sidebar/navigation components periodically — actions that made sense in a dropdown may now deserve direct buttons

## Files Changed
- components/billing/onboarding-checklist.tsx (sessionStorage + ?type= hrefs + full redesign)
- components/gestionnaire-sidebar.tsx (DropdownMenu → direct layout)
- components/dashboards/manager/manager-dashboard-v2.tsx (SSR props pass-through)
- app/gestionnaire/(with-navbar)/dashboard/components/async-dashboard-content.tsx (SSR onboarding queries)
- app/actions/subscription-actions.ts (OnboardingProgress interface + queries)
