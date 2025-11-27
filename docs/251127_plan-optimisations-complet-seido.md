# Plan d'Optimisations SEIDO - Audit Complet

> **Date d'analyse** : 2025-11-27
> **Version** : 1.0
> **Lighthouse Score Actuel** : Performance 60/100, Accessibility 90/100, Best Practices 100/100, SEO 100/100

---

## Table des Matières

1. [Résumé Exécutif](#1-résumé-exécutif)
2. [Performance - Data Fetching](#2-performance---data-fetching)
3. [Performance - Caching](#3-performance---caching)
4. [Performance - Rendering](#4-performance---rendering)
5. [Performance - Bundle & Assets](#5-performance---bundle--assets)
6. [Sécurité](#6-sécurité)
7. [Architecture & Structure](#7-architecture--structure)
8. [Types & Validation](#8-types--validation)
9. [Best Practices Next.js 15](#9-best-practices-nextjs-15)
10. [Best Practices Supabase](#10-best-practices-supabase)
11. [Plan d'Action Priorisé](#11-plan-daction-priorisé)

---

## 1. Résumé Exécutif

### Métriques Actuelles (Lighthouse Dev Mode)

| Métrique | Valeur | Seuil Bon | Status |
|----------|--------|-----------|--------|
| FCP | 1.1s | < 1.8s | ✅ |
| LCP | 3.7s | < 2.5s | ⚠️ |
| TBT | 3960ms | < 200ms | ❌ (dev) |
| CLS | 0 | < 0.1 | ✅ |
| Speed Index | 1.6s | < 3.4s | ✅ |

> **Note** : Le TBT élevé est dû au mode développement (pas de minification). Les métriques production seront meilleures.

### Points Forts Identifiés

- ✅ Architecture Repository Pattern bien établie
- ✅ Authentification centralisée (`getApiAuthContext()`)
- ✅ Validation Zod exhaustive sur inputs critiques
- ✅ RLS multi-tenant avec helpers SQL
- ✅ Rate limiting en middleware
- ✅ Logger sécurisé (pas de leak données sensibles)

### Zones de Friction Principales

| Catégorie | Problèmes | Impact Estimé |
|-----------|-----------|---------------|
| Data Fetching | Requêtes séquentielles, N+1 | +2-3s latence |
| Caching | Pas de cache headers API | Requêtes répétées |
| Architecture | 244+ accès directs Supabase | Maintenance difficile |
| Types | 4-5 définitions Intervention différentes | Erreurs runtime |
| Duplication | ~3500 lignes auth redondantes | Dette technique |

---

## 2. Performance - Data Fetching

### 2.1 Requêtes Séquentielles Critiques

#### HAUTE: getManagerStats() - 4 requêtes séquentielles

**Fichier**: `lib/services/domain/stats.service.ts` (lignes 555-669)

```typescript
// ❌ ACTUEL: Séquentiel
const user = await this.userService.getById(userId)           // 1
const teamStats = await this.repository.getTeamStats(teamId)  // 2
const buildings = await this.repository.supabase...            // 3
const interventions = await this.interventionRepository...     // 4

// ✅ SOLUTION: Paralléliser après obtention teamId
const [teamStats, buildings, interventions] = await Promise.all([
  this.repository.getTeamStats(teamId),
  this.repository.supabase.from('buildings')...,
  this.interventionRepository.findAllWithRelations(...)
])
```

**Impact**: Dashboard gestionnaire 2-3x plus rapide

---

#### HAUTE: getTeamStats() - 5ème requête séquentielle

**Fichier**: `lib/services/repositories/stats.repository.ts` (lignes 258-297)

```typescript
// ❌ Requête séparée après Promise.all
const { data: lastActivity } = await this.supabase
  .from('activity_logs').select('created_at')...

// ✅ Ajouter au Promise.all existant
```

---

#### HAUTE: Cron sync-emails - Boucle séquentielle

**Fichier**: `app/api/cron/sync-emails/route.ts` (ligne 42)

```typescript
// ❌ for await séquentiel
for (const connection of connections) {
  await syncConnection(connection)  // 5 min pour 10 connections
}

// ✅ Promise.all parallèle
await Promise.all(connections.map(c => syncConnection(c)))  // 30s pour 10 connections
```

---

#### HAUTE: Match Availabilities - O(n²)

**Fichier**: `app/api/intervention/[id]/match-availabilities/route.ts` (lignes 184-185)

```typescript
// ❌ Double boucle O(n²)
for (const tenantAvail of tenantAvailabilities) {
  for (const providerAvail of providerAvailabilities) {
    // 5×10 = 50 itérations, 100×100 = 10000 itérations
  }
}

// ✅ Algorithme O(n log n) avec tri + binary search ou Map lookup
```

---

### 2.2 Session Check Inutile

**Fichier**: `hooks/use-manager-stats.ts` (lignes 90-100)

```typescript
// ❌ Double appel inutile (Supabase gère automatiquement)
const { data: sessionRes } = await supabase.auth.getSession()
if (!sessionRes?.session) {
  await supabase.auth.refreshSession()
}

// ✅ Supprimer ce bloc (économise ~100-200ms par fetch)
```

---

## 3. Performance - Caching

### 3.1 Cache Headers API Manquants

| Route | Cache Recommandé | Raison |
|-------|------------------|--------|
| `GET /api/buildings` | `max-age=300` | Liste biens (5min) |
| `GET /api/notifications` | `max-age=60, stale-while-revalidate=300` | Données dynamiques |
| `GET /api/activity-stats` | `max-age=600` | Agrégations (10min) |
| `GET /api/user-teams` | `private, max-age=3600` | Contexte user (1h) |
| `GET /api/lots` | `max-age=300` | Liste lots (5min) |
| `GET /api/team-contacts` | `max-age=180` | Contacts (3min) |

**Pattern d'implémentation**:

```typescript
return NextResponse.json(data, {
  headers: {
    'Cache-Control': 'public, max-age=300, stale-while-revalidate=600'
  }
})
```

---

### 3.2 React.cache() Non Utilisé pour Données Métier

**Fichier**: `lib/server-context.ts`

- ✅ `getServerAuthContext()` utilise React.cache()
- ❌ Pas de cache pour données métier (buildings, interventions)

**Solution**: Créer des fonctions cachées pour données fréquentes

```typescript
import { cache } from 'react'

export const getCachedBuildings = cache(async (teamId: string) => {
  const service = await createServerBuildingService()
  return service.getByTeam(teamId)
})
```

---

### 3.3 useMemo/useCallback Manquants

**Fichiers affectés**: 48 hooks clients

- Callbacks non mémorisés → re-création à chaque render
- Données non mémorisées → nouvelles références inutiles

---

## 4. Performance - Rendering

### 4.1 Modals Toujours dans le DOM

**Fichier**: `app/gestionnaire/(with-navbar)/interventions/interventions-page-client.tsx`

```typescript
// ❌ 9 modals rendus même si fermés
return (
  <>
    <ApprovalModal isOpen={...} />
    <RejectConfirmationModal isOpen={...} />
    // ... 7 autres modals
  </>
)

// ✅ Conditional rendering ou dynamic imports
{showApprovalModal && <ApprovalModal />}
// ou
const ApprovalModal = dynamic(() => import('./ApprovalModal'), { ssr: false })
```

**Impact**: ~50-100KB JS non utilisé au chargement

---

### 4.2 Listes Sans Virtualisation

**Fichier**: `interventions-page-client.tsx`

Pour listes > 100 items, utiliser `react-window` ou `@tanstack/react-virtual`

---

### 4.3 Realtime Subscriptions Non Batchées

**Fichier**: `hooks/use-supabase.ts` (lignes 203-221)

```typescript
// ❌ Chaque composant crée sa propre subscription
export function useRealtimeSubscription(table, callback) {
  useEffect(() => {
    const subscription = supabase.channel(`public:${table}`)...
  }, [])
}

// ✅ Centraliser via Context Provider
<RealtimeProvider tables={['interventions', 'notifications']}>
  {children}
</RealtimeProvider>
```

---

## 5. Performance - Bundle & Assets

### 5.1 Images Non Optimisées

- ✅ `mockup_desktop.webp` créé (Phase 4 complétée - réduction 65%)
- ❌ Avatars/logos pas via `next/image`
- ❌ Pas de `sizes` prop sur toutes les images

### 5.2 Fonts

- ⚠️ `geist` dans dépendances mais usage `next/font` à vérifier
- Recommandé: `font-display: swap` explicite

### 5.3 Dépendances Lourdes (côté serveur OK)

- `ioredis` (1.2MB) - serveur uniquement ✅
- `recharts` (2.15MB) - importer sélectivement
- `mailparser`, `node-imap` - serveur uniquement ✅

---

## 6. Sécurité

### 6.1 Points Forts ✅

- Pattern auth centralisé `getApiAuthContext()` (50+ routes)
- Validation Zod exhaustive sur tous inputs critiques
- RLS avec helpers (`is_admin()`, `is_team_manager()`, etc.)
- Rate limiting middleware sur /api/*
- Logger sécurisé (pas de leak données sensibles)
- 0 occurrences de `dangerouslySetInnerHTML`

### 6.2 Risques Identifiés

| # | Sévérité | Fichier | Problème | Solution |
|---|----------|---------|----------|----------|
| 1 | HAUTE | `api/team-invitations/route.ts:9` | Service role bypass RLS | Documenter intention + commentaire sécurité |
| 2 | HAUTE | `api/reset-password/route.ts:20` | Service role bypass RLS | Documenter intention |
| 3 | MOYENNE | `api/buildings/route.ts:34-36` | Team ID fallback risqué | Valider accès au queryTeamId |
| 4 | MOYENNE | `api/intervention/[id]/quotes/route.ts:70-78` | Null check sur team_id | Ajouter explicit null check |
| 5 | BASSE | Global | Manque CSP, HSTS, X-Frame-Options | Ajouter headers middleware |
| 6 | BASSE | 11 API routes | console.log vs logger | Uniformiser |

### 6.3 Headers de Sécurité à Ajouter

```typescript
// middleware.ts
response.headers.set('X-Content-Type-Options', 'nosniff')
response.headers.set('X-Frame-Options', 'DENY')
response.headers.set('X-XSS-Protection', '1; mode=block')
response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
```

---

## 7. Architecture & Structure

### 7.1 Accès Direct Supabase (244+ occurrences)

**Problème majeur**: API routes contournent Repository Pattern

```typescript
// ❌ Pattern actuel (244+ fois)
const { data } = await supabase.from('interventions').select('*')...

// ✅ Via Service/Repository
const interventionService = await createServerInterventionService()
const result = await interventionService.getById(id)
```

**Impact**:

- Logique RLS/multi-tenant dispersée
- Impossible de monitorer/optimiser centralement
- Difficile à tester

**Plan de migration**:

1. Routes interventions (20 routes) → InterventionService
2. Routes devis (8 routes) → QuoteRepository
3. Routes notifications (5 routes) → NotificationRepository
4. Routes buildings/lots (12 routes) → BuildingService/LotService

---

### 7.2 Patterns Auth Incohérents

3 patterns différents au lieu de 1:

```typescript
// Pattern 1 (ancien): ~18 routes
const supabase = await createServerClient(...)
const { data: { user } } = await supabase.auth.getUser()

// Pattern 2 (moyen): ~30 routes
const authResult = await getApiAuthContext()

// Pattern 3 (nouveau): ~15 routes
const authResult = await requireApiRole('gestionnaire')
```

**Solution**: Standardiser 100% sur `requireApiRole()` + `getApiAuthContext()`

---

### 7.3 Duplication Code

| Type | Occurrences | Solution |
|------|-------------|----------|
| Auth patterns | ~3500 lignes | Centraliser sur 1 pattern |
| Session check hooks | 3+ hooks | Créer `useSessionCheck()` |
| FormData parsing | 15+ routes | Créer `parseApiRequest()` |
| Mapping functions | 3-4 fichiers | Créer `lib/utils/intervention-mappers.ts` |
| Error handling | 198 catch blocks | Créer `createApiErrorHandler()` |

---

## 8. Types & Validation

### 8.1 Types Éparpillés

4-5 définitions différentes de "Intervention":

- `lib/services/core/service-types.ts` - Types maestros
- `hooks/use-prestataire-data.ts` - Redéfini localement
- `hooks/use-intervention-workflow.ts` - TimeSlotInput redéfini
- `app/actions/intervention-actions.ts` - Schemas Zod locaux

**Solution**:

```typescript
// Centraliser dans service-types.ts
export interface Intervention { ... }
export interface InterventionWithEnriched extends Intervention { ... }

// Exporter types inférés des Zod schemas
export type CreateInterventionInput = z.infer<typeof createInterventionSchema>
```

---

### 8.2 Types `any` Non-Contrôlés

**Fichiers affectés**: 4 hooks

- `hooks/use-auth.tsx`
- `hooks/use-tenant-data.ts`
- `hooks/use-realtime-notifications.ts`
- `hooks/use-contacts-data.ts`

---

### 8.3 Zod Schemas Dupliqués

Mêmes schemas définis 2-3 fois dans différents fichiers

**Solution**: Tout centraliser dans `lib/validation/schemas.ts`

---

## 9. Best Practices Next.js 15

### 9.1 Revalidation Manquante

**Fichier**: `app/actions/intervention-actions.ts`

```typescript
// ❌ Import présent mais jamais utilisé
import { revalidatePath } from 'next/cache'

// ✅ Ajouter après chaque mutation
export async function approveInterventionAction(interventionId: string) {
  // ... update ...
  revalidateTag(`intervention_${interventionId}`)
  revalidatePath('/gestionnaire/interventions')
  revalidatePath(`/gestionnaire/interventions/${interventionId}`)
}
```

---

### 9.2 Migration Notification Service

- ✅ 12 fichiers migrés vers Server Actions
- ⏳ 15 fichiers encore sur legacy singleton

---

### 9.3 Dynamic Imports Manquants

Modals et composants lourds à charger dynamiquement:

```typescript
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <Skeleton />,
  ssr: false
})
```

---

## 10. Best Practices Supabase

### 10.1 Supabase Client Usage

- ✅ `createServerSupabaseClient()` pour Server Components
- ✅ `createBrowserSupabaseClient()` pour Client Components
- ⚠️ 18 anciennes routes utilisent patterns manuels

### 10.2 Batch Operations

Utiliser `.in()` au lieu de boucles:

```typescript
// ❌ N+1
for (const id of ids) {
  await supabase.from('table').select().eq('id', id)
}

// ✅ Batch
await supabase.from('table').select().in('id', ids)
```

### 10.3 RLS Policies

- ✅ 22+ migrations SQL avec RLS
- ✅ Helpers: `is_admin()`, `is_gestionnaire()`, `is_team_manager()`
- ⚠️ 4 usages de `service_role` à documenter

---

## 11. Plan d'Action Priorisé

### Phase 1: Quick Wins (3-5 heures) ⭐⭐⭐

| # | Tâche | Fichiers | Impact |
|---|-------|----------|--------|
| 1.1 | Paralléliser getManagerStats() | `stats.service.ts` | -2s latence |
| 1.2 | Paralléliser cron sync-emails | `sync-emails/route.ts` | -4min exécution |
| 1.3 | Supprimer session check inutile | `use-manager-stats.ts` | -200ms |
| 1.4 | Créer `intervention-mappers.ts` | Nouveau fichier | Réduire duplication |
| 1.5 | Typer les `any` dans hooks | 4 fichiers hooks | Type safety |

---

### Phase 2: Caching & Headers (4-6 heures) ⭐⭐⭐

| # | Tâche | Fichiers | Impact |
|---|-------|----------|--------|
| 2.1 | Cache headers sur 6+ routes GET | API routes | Réduire requêtes |
| 2.2 | React.cache() pour données métier | `server-context.ts` | Déduplication |
| 2.3 | Headers sécurité middleware | `middleware.ts` | Sécurité |

---

### Phase 3: Rendering Optimization (6-8 heures) ⭐⭐

| # | Tâche | Fichiers | Impact |
|---|-------|----------|--------|
| 3.1 | Conditional rendering modals | `interventions-page-client.tsx` | -50KB JS |
| 3.2 | Dynamic imports composants lourds | Plusieurs | Bundle size |
| 3.3 | Centraliser realtime subscriptions | `use-supabase.ts` + Context | -100 WS connections |
| 3.4 | Ajouter revalidatePath aux Server Actions | `intervention-actions.ts` | Cache invalidation |

---

### Phase 4: Architecture Refactoring (15-20 heures) ⭐⭐

| # | Tâche | Fichiers | Impact |
|---|-------|----------|--------|
| 4.1 | Centraliser types dans `service-types.ts` | Multiple | Cohérence types |
| 4.2 | Créer `parseApiRequest()` utility | Nouveau + 15 routes | -300 lignes |
| 4.3 | Créer `useSessionCheck()` hook | Nouveau + 3 hooks | -100 lignes |
| 4.4 | Standardiser auth sur 1 pattern | 18 anciennes routes | Cohérence |
| 4.5 | Compléter migration notifications | 15 fichiers | Architecture moderne |

---

### Phase 5: Major Repository Refactoring (20-25 heures) ⭐

| # | Tâche | Fichiers | Impact |
|---|-------|----------|--------|
| 5.1 | Migrer routes interventions vers Service | 20 routes | Architecture propre |
| 5.2 | Migrer routes devis vers Repository | 8 routes | Centralisation |
| 5.3 | Migrer routes buildings/lots | 12 routes | Cohérence |
| 5.4 | Créer `createApiErrorHandler()` | Nouveau + 88 routes | -2000 lignes |

---

### Phase 6: Testing & Validation (5-10 heures) ⭐⭐

| # | Tâche | Impact |
|---|-------|--------|
| 6.1 | Unit tests nouvelles utilities | Fiabilité |
| 6.2 | E2E tests multi-tenant isolation | Sécurité |
| 6.3 | Tests performance (no regression) | Validation |
| 6.4 | Lighthouse production | Métriques finales |

---

## Estimation Totale

| Phase | Durée | Priorité |
|-------|-------|----------|
| Phase 1: Quick Wins | 3-5h | ⭐⭐⭐ Immédiat |
| Phase 2: Caching | 4-6h | ⭐⭐⭐ Court terme |
| Phase 3: Rendering | 6-8h | ⭐⭐ Moyen terme |
| Phase 4: Architecture | 15-20h | ⭐⭐ Moyen terme |
| Phase 5: Repository | 20-25h | ⭐ Long terme |
| Phase 6: Testing | 5-10h | ⭐⭐ Continu |

**Total estimé**: 53-74 heures de travail

---

## Fichiers Critiques à Modifier

### Performance

- `lib/services/domain/stats.service.ts`
- `lib/services/repositories/stats.repository.ts`
- `app/api/cron/sync-emails/route.ts`
- `app/api/intervention/[id]/match-availabilities/route.ts`
- `hooks/use-manager-stats.ts`

### Sécurité

- `middleware.ts`
- `app/api/team-invitations/route.ts`
- `app/api/buildings/route.ts`

### Architecture

- `lib/services/core/service-types.ts`
- `lib/validation/schemas.ts`
- 88 API routes (migration progressive)

### Rendering

- `app/gestionnaire/(with-navbar)/interventions/interventions-page-client.tsx`
- `hooks/use-supabase.ts`
- `app/actions/intervention-actions.ts`

---

## Historique des Optimisations Déjà Réalisées

### Phase 4 - Complétée (2025-11-27)

| Tâche | Status | Impact |
|-------|--------|--------|
| Button `isLoading` prop | ✅ | Prévient double-clics |
| Image WebP conversion | ✅ | -65% taille (LCP) |
| N+1 Query fix `use-prestataire-data.ts` | ✅ | -90% requêtes DB |
| Parallélisation `activity-stats` route | ✅ | -50% latence |
| Parallélisation `finalization-context` route | ✅ | -40% latence |
| Parallélisation `availabilities` route | ✅ | -50% latence |
| Cache headers (4 routes) | ✅ | Réduit requêtes HTTP |

### Phase 1-3 - Complétée (session précédente)

| Tâche | Status | Impact |
|-------|--------|--------|
| GlobalLoadingIndicator optimization | ✅ | UX navigation |
| Auth delay reduction | ✅ | -500ms login |
| useNavigationPending hook | ✅ | Loading states |
| Context memoization | ✅ | Réduit re-renders |

---

*Document généré automatiquement par analyse Claude Code - 2025-11-27*
