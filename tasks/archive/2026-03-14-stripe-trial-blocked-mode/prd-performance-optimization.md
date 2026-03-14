# PRD: Optimisation des Performances de Navigation SEIDO

## Contexte

L'application SEIDO souffre de lenteurs de navigation perceptibles par les utilisateurs. Une analyse approfondie a identifié **5 catégories majeures** de problèmes de performance.

## Analyse des Causes Racines

### 1. Client Components Excessifs (Impact: CRITIQUE)

| Metrique | Valeur |
|----------|--------|
| Fichiers avec 'use client' | 409/719 (57%) |
| Pages entieres en 'use client' | 12 pages |
| Bundle JS client estime | 40-55 MB |

**Pages critiques:**
- `/gestionnaire/mail/page.tsx` (856 lignes en 'use client')
- 3 pages `/notifications` en 'use client'
- Pages auth (`callback`, `set-password`, `update-password`)

### 2. Data Fetching Inefficace (Impact: CRITIQUE)

| Anti-Pattern | Occurrences | Impact |
|--------------|-------------|--------|
| N+1 queries | 3 fichiers critiques | +30-300 queries/page |
| Client-side fetch (hooks) | 5 hooks majeurs | +800ms latence |
| Absence de cache | Donnees statiques | +50-100ms/requete |

**Fichiers critiques:**
- `hooks/use-tenant-data.ts` (N+1 avec 3 queries x N interventions)
- `hooks/use-interventions.ts` (fetch client au lieu de SSR)
- `app/gestionnaire/dashboard/page.tsx` (enrichissement N+1)

### 3. Navigation Anti-Patterns (Impact: ELEVE)

| Pattern | Occurrences | Impact |
|---------|-------------|--------|
| `router.push()` au lieu de `<Link>` | 212 | Pas de prefetch |
| `window.location.href` | 50+ | Reload complet |
| `window.location.reload()` | 15+ | Perte cache |

### 4. Bundle Size (Impact: MOYEN-ELEVE)

| Bibliotheque | Taille | Probleme |
|--------------|--------|----------|
| recharts | ~150KB | Import complet (`* as`) |
| xlsx | ~500KB | Pas de lazy load |
| react-big-calendar | ~100KB | Pas de lazy load |
| @faker-js/faker | ~500KB | En production deps |

### 5. Re-renders Excessifs (Impact: MOYEN)

| Probleme | Occurrences | Impact |
|----------|-------------|--------|
| Context value inline | 2 fichiers | Re-render tous enfants |
| Callbacks inline onClick | 100+ | Re-render composants |
| Absence React.memo | 0 usage | Re-renders inutiles |
| useState excessifs | 32 dans 1 composant | Cascades |

---

## Objectifs de Performance

| Metrique | Actuel (estime) | Cible | Gain |
|----------|-----------------|-------|------|
| First Contentful Paint | 2.5s | 1.2s | -52% |
| Largest Contentful Paint | 4.0s | 2.0s | -50% |
| Time to Interactive | 3.5s | 2.0s | -43% |
| Total Blocking Time | 800ms | 200ms | -75% |
| First Load JS | ~350KB | ~200KB | -43% |
| Queries par page dashboard | 50-100 | 10-15 | -80% |

---

## Stories d'Implementation

### Phase 1: Quick Wins Data Fetching (Jour 1)

**US-001: Fix N+1 dans use-tenant-data**
- Remplacer boucle Promise.all par batch queries avec `.in()`
- Gain: 30-300 queries reduites a 3

**US-002: Fix N+1 dans dashboard gestionnaire**
- Batch queries pour quotes et time_slots
- Gain: 20-200 queries reduites a 2

**US-003: Activer cache sur donnees statiques**
- Utiliser `unstable_cache` pour intervention types
- Gain: 1 query/5min au lieu de 1 query/page

### Phase 2: Bundle Optimization (Jour 1-2)

**US-004: Ajouter recharts a optimizePackageImports**
- 1 ligne dans next.config.js
- Gain: -50KB bundle

**US-005: Lazy load BigCalendarWrapper**
- Dynamic import avec fallback skeleton
- Gain: -100KB initial load

**US-006: Lazy load XLSX**
- Dynamic import dans template-generator
- Gain: -500KB initial load

**US-007: Deplacer faker vers devDependencies**
- npm uninstall + install --save-dev
- Gain: -500KB production

### Phase 3: Navigation Patterns (Jour 2-3)

**US-008: Remplacer window.location.href critiques**
- intervention-action-buttons.tsx (5 occurrences)
- auth/callback (4 occurrences)
- Gain: -500ms par navigation

**US-009: Remplacer router.push par Link (composants cards)**
- intervention-card.tsx, lot-card-actions.tsx
- Gain: Prefetch automatique

**US-010: Remplacer window.location.reload par router.refresh**
- documents-tab.tsx, quotes-tab.tsx, profile-page.tsx
- Gain: -1s par mutation

### Phase 4: Re-renders Optimization (Jour 3)

**US-011: Fix Context Providers value inline**
- carousel.tsx, pwa-banner-context.tsx
- Wrap value dans useMemo
- Gain: -50% re-renders enfants

**US-012: Memoiser callbacks router.push**
- Creer pattern useCallback pour navigation
- Appliquer aux dashboards et cards

**US-013: Ajouter React.memo aux composants cards**
- InterventionCard, StatsCard, KPICard
- Gain: -30% re-renders listes

### Phase 5: Server Components Migration (Jour 4-5)

**US-014: Migrer page notifications gestionnaire**
- Fetch cote serveur, passer initialData au client
- Gain: SSR complet, -800ms

**US-015: Migrer page mail**
- Pattern Server + Client hybrid
- 856 lignes a refactorer
- Gain: -40% JS initial

**US-016: Creer pattern de migration pour hooks data**
- Template pour migrer use-interventions, use-contacts-data
- Documentation pour futurs developpements

---

## Criteres de Succes

1. **Lighthouse Performance Score** > 80 (mobile)
2. **First Contentful Paint** < 1.5s
3. **Queries Supabase par page** < 15
4. **Bundle size First Load JS** < 250KB
5. **Zero `window.location` dans intervention flows**

---

## Risques et Mitigations

| Risque | Probabilite | Mitigation |
|--------|-------------|------------|
| Regression fonctionnelle | Moyenne | Tests manuels apres chaque phase |
| Cache stale data | Faible | Revalidation tags sur mutations |
| SSR hydration mismatch | Moyenne | Verifier 'use client' boundaries |

---

## Hors Scope

- Refactoring intervention-detail-client.tsx (2480 lignes) - Tache separee
- Migration complete de tous les hooks vers SSR - Incremental
- Optimisation images (WebP/AVIF) - Tache separee

---

**Auteur:** Ralph (Claude)
**Date:** 2026-02-08
**Version:** 1.0
