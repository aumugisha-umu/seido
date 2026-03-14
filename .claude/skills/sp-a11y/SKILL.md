---
name: sp-a11y
description: WCAG 2.1 AA accessibility audit per SEIDO role. Use when creating UI components, before releases, or when accessibility is mentioned.
---

# Accessibility Audit (WCAG 2.1 AA)

## Overview

Ensure SEIDO is usable by everyone. B2B SaaS must meet WCAG 2.1 AA — it's both legal compliance and good business (gestionnaires may have vision/motor impairments).

**Core principle:** Accessibility is not optional. If a user can't use it, it's broken.

## Auto-Invocation Triggers

- "accessibility", "a11y", "wcag"
- "screen reader", "keyboard navigation"
- Before any sp-release deployment (quick audit)
- When creating new UI components

## Quick Audit Checklist (Per Component)

### Perceivable
- [ ] Text contrast >= 4.5:1 (regular text) / >= 3:1 (large text, UI components)
- [ ] Images have meaningful `alt` text (or `alt=""` for decorative)
- [ ] Form inputs have visible labels (not just placeholders)
- [ ] Error messages are text, not just color (red + icon + text)
- [ ] Focus indicators visible (not just browser default)

### Operable
- [ ] All interactive elements reachable via keyboard (Tab/Shift+Tab)
- [ ] No keyboard traps (can always escape modals, dropdowns)
- [ ] Touch targets >= 44x44px on mobile (prestataire = 75% mobile)
- [ ] Skip navigation link present on main pages
- [ ] No content that flashes > 3 times per second

### Understandable
- [ ] Language attribute set (`lang="fr"` / `lang="en"` / `lang="nl"`)
- [ ] Form validation errors are clear and specific
- [ ] Consistent navigation across pages
- [ ] No jargon for locataire views (simple language)

### Robust
- [ ] Valid HTML (no duplicate IDs, proper nesting)
- [ ] ARIA roles used correctly (not overused)
- [ ] Works with screen readers (VoiceOver, NVDA)
- [ ] Responsive from 320px to 1920px

## SEIDO Role-Specific A11y

### Gestionnaire (Desktop-Primary)
- Dense information layouts must have proper heading hierarchy (h1->h2->h3)
- Data tables need `<th scope="col/row">` and `<caption>`
- Dashboard cards: each must be keyboard-navigable
- Bulk action checkboxes: group with `role="group"` + `aria-label`

### Prestataire (Mobile-Primary — 75%)
- Bottom sheets: trap focus when open, return focus on close
- Swipe actions: must have button alternative (not swipe-only)
- GPS/location features: text input fallback
- Large touch targets (44px minimum — already in design system)

### Locataire (Occasional User)
- Wizard forms: announce step progress (`aria-live="polite"`)
- Status timeline: use ordered list with `aria-current="step"`
- Simple vocabulary (no technical jargon in labels)
- Auto-save or "are you sure" on form abandonment

## Testing Commands

```bash
# Lighthouse accessibility audit
npx lighthouse http://localhost:3000/gestionnaire/dashboard --only-categories=accessibility --output=json

# axe-core (via browser extension or CLI)
# Install: npm install -D @axe-core/cli
npx axe http://localhost:3000/gestionnaire/dashboard
```

## Common A11y Fixes in SEIDO

| Issue | Fix |
|-------|-----|
| Icon-only button | Add `aria-label="Action name"` |
| Color-only status indicator | Add text label or icon |
| Missing form label | Add `<Label htmlFor="id">` or `aria-label` |
| Modal doesn't trap focus | Use Radix Dialog (already does this) |
| No skip nav | Add `<a href="#main" className="sr-only focus:not-sr-only">` |
| Table without headers | Add `<th scope="col">` |

## Skills Integration

| Situation | Skill |
|-----------|-------|
| New UI component | Check a11y during `sp-brainstorming` |
| Before release | Quick audit in `sp-release` |
| A11y bug reported | `sp-systematic-debugging` |
| Component review | Include in `sp-quality-gate` Lens 3 |
