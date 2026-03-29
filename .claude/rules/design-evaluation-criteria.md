---
paths:
  - "components/**/*.tsx"
  - "app/**/page.tsx"
  - "app/**/layout.tsx"
---

# SEIDO Design Evaluation Criteria — Anti-AI-Slop

Used by feature-evaluator agent (Design Quality axis, 30% weight) and sp-quality-gate Lens 3.
Score 1-10 per component/page evaluated.

## Penalties (each occurrence: -2 points)

### Layout Slop
- Generic centered hero section with gradient background
- Uniform card grid with identical structure and no visual hierarchy
- Symmetric layouts where asymmetry would improve scannability (e.g., gestionnaire dashboard with equal-weight cards when "interventions en attente" should dominate)
- Full-width sections with no max-width constraint on content

### Component Slop
- Generic icons that don't map to SEIDO domain concepts (e.g., generic "settings" gear when a wrench icon maps better to interventions)
- Identical card components with no role-based differentiation (gestionnaire cards should feel different from prestataire cards)
- Modal dialogs for simple confirmations — use inline actions or toast instead
- Form fields with no contextual help or placeholder guidance (e.g., "Entrez le montant" without "HT" or "TTC" hint)
- Building custom components when shadcn/ui has equivalents

### Interaction Slop
- Page reload for state changes that should be optimistic (e.g., status transitions)
- Loading spinners where skeleton screens matching final layout shape are appropriate
- No empty state guidance (blank page instead of next-action prompt like "Aucune intervention — Creer une demande")
- Desktop-only interactions on prestataire views (must be mobile-first, thumb-zone friendly)
- Click-to-edit where inline editing is more natural for single fields

### Color/Typography Slop
- Colors not from SEIDO design tokens (`globals.css` CSS variables)
- Hardcoded hex/rgb values instead of Tailwind utility classes
- No visual distinction between roles (gestionnaire = blue accent, prestataire = orange, locataire = green)
- Body text size inconsistency within same view
- Missing dark/light mode awareness when using raw colors

## Bonuses (each occurrence: +1 point)

- Contextual micro-interactions (hover states specific to entity type — building card vs lot card)
- Progressive disclosure (show summary first, details on demand — e.g., intervention timeline collapsed by default)
- Skeleton loading states matching exact final layout shape
- Role-aware empty states ("Aucune intervention" + CTA adapted per role — gestionnaire gets "Creer", locataire gets "Signaler un probleme")
- Mobile gesture support for prestataire (swipe to change status, long-press for quick actions)
- Consistent use of SEIDO shared card patterns (`intervention-card.tsx`, `lot-card.tsx`)
- Breadcrumb/back navigation respecting user's mental model (building > lot > intervention)
- Persona-validated timing (gestionnaire < 30s for key action, prestataire < 3 taps, locataire < 2 min)
- Status badges using consistent color mapping from intervention status flow

## Score Interpretation

| Score | Meaning |
|-------|---------|
| 9-10 | Exceptional — cohesive, role-adapted, delightful |
| 7-8 | Good — follows patterns, minor improvements possible |
| 5-6 | Acceptable — functional but generic, needs refinement |
| 3-4 | Poor — multiple slop patterns, feels auto-generated |
| 1-2 | Unacceptable — no SEIDO identity, pure AI slop |

## Cross-References

- **Design System Rules:** `.claude/rules/design-system-rules.md`
- **UX/UI Decision Guide:** `docs/design/ux-ui-decision-guide.md`
- **Design Tokens:** `app/globals.css` (CSS custom properties)
- **Persona Files:** `docs/design/persona-*.md`
- **UI Rules:** `.claude/rules/ui-rules.md`
