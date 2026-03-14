# PRD: Confirmation Pages Harmonization

## Problem
The 6 creation wizards (Immeuble, Lot, Bail, Contrat fournisseur, Contact, Intervention) each have a different confirmation page design. Inconsistent layouts, missing data (lots don't show documents/interventions), and varying empty states create cognitive load for users.

## Solution
Create a small set of reusable confirmation components that harmonize all 6 pages. Show ALL fields including empty ones ("Non renseigne"). Responsive from mobile to large screens.

## Design Principles
1. **Show everything, even empty** — "Non renseigne" / "Aucun" instead of hiding
2. **Minimal wrappers** — only components that are reused 3+ times
3. **Responsive** — mobile-first, adapt to tablet and desktop
4. **Consistent vocabulary** — same section headers, same contact grid, same document list everywhere
5. **Stay within SEIDO design system** — shadcn/ui, Tailwind, Lucide icons, OKLCH tokens

## Reusable Components (8 total)
1. `ConfirmationPageShell` — animated wrapper with max-width
2. `ConfirmationEntityHeader` — icon + title + badges + "Pret a confirmer"
3. `ConfirmationSummaryBanner` — metrics grid (lots, contacts, total...)
4. `ConfirmationSection` — titled section with separator
5. `ConfirmationKeyValueGrid` — label/value pairs grid (1-4 cols)
6. `ConfirmationFinancialHighlight` — primary/5 box for finances
7. `ConfirmationContactGrid` — contacts by type with empty states
8. `ConfirmationDocumentList` — uploaded files + missing recommended

## Pages to Migrate
1. Immeuble: `building-confirmation-step.tsx`
2. Lot: `lot-creation-form.tsx` (step 5) — ADD documents + interventions
3. Bail: `contract-form-container.tsx` (case 4)
4. Contrat fournisseur: `supplier-confirmation-step.tsx`
5. Contact: `step-4-confirmation.tsx`
6. Intervention: `intervention-confirmation-summary.tsx`

## Out of Scope
- Changing form logic or data collection
- Changing wizard step navigation
- Adding new fields to forms
- Dark mode specifics
