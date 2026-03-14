# Design: Onboarding contacts merge + Proprietaire frontend cleanup

**Date**: 2026-03-13
**Status**: Validated

---

## Task 1 — Merge onboarding steps into single "Contacts" step

### Changes

**`app/actions/subscription-actions.ts`**
- Remove `hasInvitedProvider` and `hasAddedTenant` from `OnboardingProgress`
- Add `hasContact: boolean`
- Query: `team_members` count > 1 (excludes self) filtered by `team_id`

**`components/billing/onboarding-checklist.tsx`**
- Replace 2 steps (prestataire + locataire) with single step:
  - `id: 'hasContact'`
  - `label: 'Ajouter des contacts'`
  - `icon: Users`
  - `href: '/gestionnaire/contacts/nouveau'`
  - `whyItMatters`: explain roles (prestataire, locataire, gestionnaire) + invite vs no-invite impact
  - `howItConnects`: explain portal access for invited contacts
- Total steps: 7 → 6 (Lot → Email → Contacts → Contrat → Intervention → Cloture)

---

## Task 2 — Remove proprietaire from visible frontend

### Scope: All frontend-visible UI. Keep backend types, DB, RLS untouched.

**A) Pages `/proprietaire/*`** — Redirect to coming-soon or `/`
- `lib/auth-router.ts`: change proprietaire routes

**B) Contact creation** — Remove "Proprietaire" option
- `app/gestionnaire/(no-navbar)/contacts/nouveau/steps/step-1-type.tsx`: remove SelectItem
- `app/gestionnaire/(no-navbar)/contacts/nouveau/contact-creation-client.tsx`: remove from ContactType

**C) Contact sections in lots/buildings**
- `components/building-contacts-tab.tsx`: remove owners section + grouping
- `components/contact-selector.tsx`: remove "owner" from CONTACT_TYPES
- `components/ui/contact-section.tsx`: remove 'owners' config
- `components/ui/contacts-grid-preview.tsx`: remove owner mapping
- `components/ui/lot-contacts-grid-preview.tsx`: remove owner references
- `components/patrimoine/lot-card-unified/lot-card-header.tsx`: remove owners grouping
- `components/building-confirmation-step.tsx`: remove owners extraction + display
- `components/contact-details/entity-link-section.tsx`: remove proprietaire row

**D) Filters/badges/labels
- `components/contact-details/constants.ts`: remove proprietaire from USER_ROLES, getContactTypeLabel, getContactTypeBadgeStyle
- `config/table-configs/contacts.config.tsx`: remove proprietaire filter option
- `components/contacts/contact-card-mobile.tsx`: remove proprietaire label
- `components/contacts/building-contacts-navigator.tsx`: remove owner mapping + badge
- `components/ui/contact-delete-confirm-modal.tsx`: remove proprietaire from type
- `lib/import/constants.ts`: remove proprietaire from VALID_CONTACT_ROLES, ROLE_LABELS, demo data
- `lib/import/validators/contact.validator.ts`: remove proprietaire mappings

**NOT touched**: database.types.ts, Zod schemas, RLS, migrations, invite-user route, backend services
