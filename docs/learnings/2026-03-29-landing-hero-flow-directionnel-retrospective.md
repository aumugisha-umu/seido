# Retrospective: Landing Hero — Flow Directionnel Animation

**Date:** 2026-03-29
**Duration:** ~3h (prototype iterations + React implementation + simplify review)
**Branch:** preview
**Commits:** ac4ab80e, fca39b1e

## What Went Well
- Prototyping in standalone HTML (`hero-final.html`) before React conversion — allowed fast iteration without build cycles
- 3-level visual hierarchy (small inputs → medium AI node → large output card) communicated clearly after multiple failed approaches (orb, laptop mockups)
- The flow directionnel concept (top→down for new data, right→left for context enrichment) tells two stories in one visual
- `/simplify` caught 3 real issues (CSS transform conflict, infinite animation, missing memo) before shipping

## What Could Be Improved
- Initial prototype sizes were too small for the actual layout — should have tested in-context earlier
- Multiple rounds of design exploration (orb → laptop → flow) could have been shorter with upfront UX research
- The HTML prototype used raw `getElementById` while React version uses `data-*` attributes — slight impedance mismatch during conversion

## New Learnings Added to AGENTS.md
- Learning #229: Staggered entrance animation pattern (CSS + JS + React.memo)
- Learning #230: CSS transform visible states must match their animation axis
- Learning #231: Limit CSS infinite animations to N iterations on landing pages

## Patterns Discovered

### Staggered Animation Recipe (reusable)
1. **CSS file** — Define hidden states per animation type:
   - `hero-animate-drop` → `opacity:0; translateY(-12px)`
   - `hero-animate-slide-right` → `opacity:0; translateX(16px)`
   - etc.
2. **Visible class** — Split per axis:
   - `.hero-visible.hero-animate-drop` → `translateY(0)`
   - `.hero-visible.hero-animate-slide-right` → `translateX(0)`
3. **React component** — `data-*` attributes + `useEffect` with setTimeout array:
   ```tsx
   const timers: ReturnType<typeof setTimeout>[] = []
   const t = (fn: () => void, delay: number) => timers.push(setTimeout(fn, delay))
   t(() => showElement('[data-src="0"]'), 600)
   // cleanup: return () => timers.forEach(clearTimeout)
   ```
4. **Guards** — `animatedRef` for StrictMode, `React.memo()` for parent re-renders, `prefers-reduced-motion` for accessibility

### Prototype→React Conversion
- Keep prototype as reference (`docs/prototypes/`)
- Extract constants (delays, colors, content) to top-level `const` arrays
- Use `data-*` attributes instead of IDs for animation targets
- CSS in dedicated file (`app/styles/`) imported via `globals.css`

## Anti-Patterns Avoided
- Laptop mockup frame in CSS — looks amateur, 2015-era pattern (rejected after 3 iterations)
- `animation: infinite` on decorative elements — hidden CPU cost
- Combined `transform: translate(0) scale(1)` for all animation types — fragile axis mixing
- Using SeidoBadge for landing page decorative elements — unnecessary coupling to app component library

## Recommendations for Similar Future Work
- Always prototype in HTML first for animation-heavy landing sections
- Test sizes in-context early (standalone HTML dimensions don't match real layout)
- Use finite iteration counts (`3`) for decorative CSS animations
- Split CSS transform visible states per axis from the start
- `React.memo()` is mandatory for any component embedded in a page with state

## Files Changed
```
 app/globals.css                         |   1 +
 app/styles/hero-flow.css                |  91 +++
 components/landing/hero-flow-visual.tsx  | 254 ++++++++
 components/landing/landing-page.tsx      | 149 ++---
 docs/prototypes/hero-final.html         | 556 +++++++++++++++++
 blog/articles/*.md                      |  24 files (author change)
```
