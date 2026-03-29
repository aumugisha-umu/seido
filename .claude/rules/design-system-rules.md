---
paths:
  - "components/**/*.tsx"
  - "app/**/page.tsx"
---

# SEIDO Design System — Component Hierarchy

> Enforces consistent UI through a modular 5-level component hierarchy.

## Component Hierarchy (MANDATORY)

All UI follows this 5-level hierarchy. NEVER skip levels.

```
Level 1: PRIMITIVES (atoms)
  → shadcn/ui components: Button, Input, Label, Badge, Icon, Avatar, Card, Dialog
  → Located in: components/ui/
  → NEVER modify directly — wrap if customization needed

Level 2: COMPOSITES (molecules)
  → Combinations of 2-3 primitives with a single purpose
  → Examples: SearchInput, FormField (Label + Input + Error), DateRangePicker
  → Located in: components/shared/, components/forms/
  → Reusable across features, no business logic

Level 3: FEATURES (organisms)
  → Business-aware components combining composites
  → Examples: InterventionCard, LotCard, ContactCard, SupplierContractCard
  → Located in: components/interventions/, components/biens/, components/contacts/
  → Contain SEIDO domain logic, scoped to one domain

Level 4: TEMPLATES (layouts)
  → Page-level layouts that arrange features
  → Examples: DashboardLayout (with-navbar), AuthLayout, SettingsLayout
  → Located in: app/[role]/(with-navbar)/layout.tsx, components/layout/
  → Define grid, sidebar, header/footer — no business logic

Level 5: PAGES
  → Route-level Server Components that compose templates + features
  → Located in: app/[role]/(with-navbar)/[section]/page.tsx
  → Handle auth (getServerAuthContext), data fetching, pass data to Client Components
  → Minimal UI code — delegates to features and templates
```

## Rules

### Before Creating a Component

1. **Check Level 1**: Does shadcn/ui already have this? → `components/ui/`
2. **Check Level 2**: Does a composite already exist? → `components/shared/`, `components/forms/`
3. **Check Level 3**: Is there a feature component to extend? → `components/[domain]/`
4. **Grep the codebase**: `grep -rn "ComponentName" --include="*.tsx"`

### While Creating

- **One level per file**: A composite should NOT contain page-level logic
- **Props over configuration**: Components accept data, not fetch it (except Level 5)
- **Consistent naming**:
  - Primitives: generic (`Button`, `Input`) — from shadcn/ui
  - Composites: descriptive (`SearchInput`, `DateRangePicker`)
  - Features: domain-prefixed (`InterventionCard`, `LotStatusBadge`)
  - Templates: suffix `-layout` (`DashboardLayout`)
- **Max 200 lines** for Level 1-2, **max 400 lines** for Level 3, **max 500 lines** for Level 4-5

### Design Tokens (use, never hardcode)

All visual values come from `app/globals.css`:

```
Colors     → CSS variables: --primary, --secondary, --muted, --accent, --destructive
             Role accents: gestionnaire = blue, prestataire = orange, locataire = green
Spacing    → Dashboard tokens: --dashboard-padding-sm (12px), -md (16px), -lg (24px)
             General: Tailwind scale (p-1=4px, p-2=8px, p-3=12px, p-4=16px, p-6=24px)
Typography → Tailwind type scale (text-sm, text-base, text-lg, text-xl)
Shadows    → 5 levels: shadow-none / shadow-sm / shadow / shadow-md / shadow-lg
Radii      → --radius (0.5rem), rounded-sm, rounded-md, rounded-lg, rounded-full
```

### Anti-Patterns (NEVER)

| Anti-Pattern | Do Instead |
|-------------|-----------|
| Hardcoded colors (`#3b82f6`) | Use design token (`text-primary`) |
| Custom button that duplicates shadcn/ui | Use/extend the shadcn Button |
| Feature component that fetches AND renders | Split: Server Component (fetch) + Client Component (render) |
| Copy-pasting intervention-card for a new entity | Extract shared CardBase, compose with entity-specific content |
| Building a custom modal from scratch | Use Dialog from shadcn/ui |
| One-off responsive breakpoints | Use sm/md/lg/xl breakpoints |
| New card component without checking existing | Grep first: `intervention-card`, `lot-card`, `contact-card` |

## SEIDO Shared Components (Level 3 — Reuse First)

Before creating a new feature component, check these existing ones:

| Component | Domain | Location |
|-----------|--------|----------|
| InterventionCard | Interventions | `components/interventions/` |
| LotCard | Biens | `components/biens/` |
| ContactCard | Contacts | `components/contacts/` |
| SupplierContractCard | Contrats | `components/contract/` |
| DocumentChecklist | Documents | `components/documents/` |
| InterventionPlannerStep | Planning | `components/contract/` (shared reusable) |
| ManagerDashboard | Dashboard | `components/dashboards/manager/` |

## Cross-References

- **Design Evaluation (anti-slop):** `.claude/rules/design-evaluation-criteria.md`
- **UI Rules (tokens, a11y, patterns):** `.claude/rules/ui-rules.md`
- **UX Decision Guide:** `docs/design/ux-ui-decision-guide.md`
- **Personas:** `docs/design/persona-*.md`
