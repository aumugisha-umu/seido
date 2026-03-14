# UX Terminology Refactoring — Design Plan

**Date**: 2026-03-14
**Source**: UX/UI Research agent + brainstorming session
**Scope**: Labels UI, provider categories, intervention category "Rappel"

---

## Context

SEIDO couvre plus que des interventions techniques : rappels, tâches administratives, demandes locataires. Les "prestataires" incluent artisans, fournisseurs d'énergie, administrations, etc.

**Bonne nouvelle** : le locataire utilise déjà "Nouvelle demande" (pas "intervention"). La DB utilise déjà un `provider_category` enum.

---

## 1. Intervention Category Labels (Gestionnaire)

### Current State
- DB: `intervention_type_categories` table with `code` + `label_fr`
- Codes: `bien`, `bail`, `locataire`
- Labels: "Bien", "Bail", "Locataire"
- Display: `intervention-type-combobox.tsx` groups types by category

### Changes
Update `label_fr` in DB migration:

| Code | Current Label | New Label | Rationale |
|------|--------------|-----------|-----------|
| `bien` | "Bien" | "Interventions" | Clair, c'est le technique |
| `bail` | "Bail" | "Gestion locative" | Plus large que "bail", couvre admin |
| `locataire` | "Locataire" | "Demandes" | Réclamations, infos, urgences |

### Files impacted
- New migration: update `label_fr` in `intervention_type_categories`
- `intervention-type-combobox.tsx` — no code change needed (reads labels from DB)

---

## 2. New Intervention Category: "Rappel"

### Rationale
Gestionnaires need reminder-type tasks: contract renewal reminders, insurance expiry, periodic inspections, rent reviews, etc.

### Changes
Add new category + types via migration:

| Code | Label | Category |
|------|-------|----------|
| `rappel` | "Rappels" | New category (sort_order: 4) |

**Types under "Rappels":**

| Code | Label | Description |
|------|-------|-------------|
| `rappel_renouvellement_bail` | Renouvellement de bail | Rappel d'échéance de renouvellement |
| `rappel_assurance` | Échéance assurance | Rappel renouvellement assurance |
| `rappel_controle_periodique` | Contrôle périodique | Vérifications obligatoires (chaudière, électricité...) |
| `rappel_revision_loyer` | Révision de loyer | Rappel de date de révision |
| `rappel_fin_preavis` | Fin de préavis | Rappel d'échéance de préavis |
| `rappel_personnalise` | Rappel personnalisé | Rappel libre défini par le gestionnaire |

### Files impacted
- New migration: insert category + types
- `intervention-type-combobox.tsx` — add color for `rappel` category code
- Type: add `'rappel'` to `CategoryCode` type

---

## 3. Expand Provider Categories

### Current State
```sql
CREATE TYPE provider_category AS ENUM (
    'prestataire',
    'assurance',
    'notaire',
    'syndic',
    'proprietaire',
    'autre'
);
```

### Changes
Add new values to the enum via `ALTER TYPE ... ADD VALUE`:

| New Value | Label FR | Examples |
|-----------|----------|---------|
| `artisan` | Artisan | Plombier, électricien, menuisier |
| `services` | Services | Nettoyage, jardinage, sécurité |
| `energie` | Énergie & Fluides | Eau, gaz, électricité, télécom |
| `administration` | Administration | Commune, urbanisme, cadastre |
| `juridique` | Juridique | Huissier, avocat |

**Keep existing**: `prestataire` (generic fallback), `assurance`, `notaire`, `syndic`, `proprietaire`, `autre`

### Files impacted
- New migration: `ALTER TYPE provider_category ADD VALUE`
- `npm run supabase:types` to regenerate types
- Contact creation form: update provider_category selector options
- Contact list/filters: display new categories with labels + icons

### UI mapping (labels + icons)

| Value | Label FR | Icon (Lucide) |
|-------|----------|---------------|
| `artisan` | Artisan | Wrench |
| `services` | Services | Sparkles |
| `energie` | Énergie & Fluides | Zap |
| `assurance` | Assurance | Shield |
| `administration` | Administration | Building |
| `juridique` | Juridique | Scale |
| `notaire` | Notaire | Stamp |
| `syndic` | Syndic | Users |
| `proprietaire` | Propriétaire | Home |
| `prestataire` | Prestataire (général) | UserCog |
| `autre` | Autre | CircleDot |

---

## 4. Provider Category Display in Contact UI

### Changes needed
- Contact creation wizard (step selecting type): show all categories with icons
- Contact list table: show provider_category as badge/tag
- Contact detail page: display category
- Contact filters: filter by provider_category

### Key files
- `app/gestionnaire/(no-navbar)/contacts/nouveau/` — creation wizard
- `config/table-configs/contacts.config.tsx` — table display
- `components/contact-details/` — detail view

---

## Implementation Order

1. **DB Migration** — category labels + rappel category + provider enum expansion
2. **Type regeneration** — `npm run supabase:types`
3. **Intervention type combobox** — add rappel color + CategoryCode
4. **Provider category UI mapping** — centralized label/icon config
5. **Contact creation form** — update provider_category selector
6. **Contact table + detail** — display provider_category badge
7. **Contact filters** — filter by provider_category

---

## Out of Scope (already done or not needed)
- Locataire "Nouvelle demande" — **already uses correct term**
- Prestataire "Mes interventions" — **already correct**
- Gestionnaire nav "Interventions" — **keep as-is** (generic term fine for nav)
- DB table rename — **not needed** (table stays `interventions`)
