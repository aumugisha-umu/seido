# Rapport d'Audit Complet — SEIDO App

**Date :** 2026-03-21 | **Branche :** `preview` | **6 domaines audites**
**Auditeur :** Claude Opus 4.6 (6 agents paralleles)
**Review :** Tous les findings CRITIQUE/HAUT verifies contre le code source — 5 confirmes, 1 partiellement correct

---

## Vue d'ensemble

| Agent | Conformes | Ecarts | Justifies | Total checks |
|-------|-----------|--------|-----------|--------------|
| Next.js 15 + React 19 | 23 | 6 | 2 | 31 |
| Supabase SSR + RLS | 19 | 5 | 2 | 26 |
| Stripe | 15 | 2 | 1 | 18 |
| Architecture & TS | 8 | 7 | 0 | 15 |
| Tailwind v4 + shadcn/ui | 6 | 7 | 5 | 18 |
| Performance & Securite | 12 | 7 | 1 | 20 |
| **TOTAL** | **83** | **34** | **11** | **128** |

**Score global : 83/128 conformes (65%) + 11 justifies = 73% de conformite effective**

---

## Ecarts par severite

### CRITIQUE (1)

| # | Finding | Domaine | Fichier |
|---|---------|---------|---------|
| 1 | **Mass assignment dans `/api/update-contact`** — `...updateData` spread directement dans `.update()` sans whitelist Zod. **Aggravant : utilise `getServiceRoleClient()` (bypass RLS)** | Securite | `app/api/update-contact/route.ts:82` |

### HAUT (5)

| # | Finding | Domaine | Fichier |
|---|---------|---------|---------|
| 2 | **`getSession()` au lieu de `getUser()`** dans auth-dal.ts — base de TOUTE la chaine auth server-side | Supabase | `lib/auth-dal.ts:40` |
| 3 | **10 Server Actions sans validation Zod** — types TS effaces au runtime, payloads arbitraires possibles | Securite | `app/actions/lot-actions.ts` + 9 autres |
| 4 | **6 fichiers > 1000 lignes** (dont `intervention-actions.ts` a 3411 lignes) | Architecture | `app/actions/intervention-actions.ts` |
| 5 | **N+1 query** dans contact.repository — 2 queries par contact dans un `.map()` | Performance | `lib/services/repositories/contact.repository.ts:281` |
| 6 | **Statut fantome `contestee`** dans le type TS (`service-types.ts`) + labels mais absent de la DB et du schema Zod. Code referençant ce statut = branches mortes | Architecture | `lib/services/core/service-types.ts:140` |

### MOYEN (11)

| # | Finding | Domaine | Fichier |
|---|---------|---------|---------|
| 7 | `error.tsx` devrait etre `global-error.tsx` (doublon HTML potentiel) | Next.js | `app/error.tsx` |
| 8 | `as any` dans server-context.ts pour acceder a `team` | Next.js / TS | `lib/server-context.ts:161,351` |
| 9 | 67 occurrences de `any` types en production | Architecture | Multiple fichiers |
| 10 | 4 composants avec appels Supabase directs (bypass Repository Pattern) | Architecture | `components/building-contacts-tab.tsx` + 3 autres |
| 11 | Services domain accedant directement a Supabase (3 services) | Architecture | `notification.service.ts`, `stats.service.ts`, `address.service.ts` |
| 12 | `hsl(var(--primary))` avec valeurs oklch — couleurs invalides | Tailwind | `app/globals.css:708,729` |
| 13 | `tailwind.config.js` orphelin + double-wrapping oklch | Tailwind | `tailwind.config.js` |
| 14 | Z-index non standardises (z-[10000], z-[9999], etc.) | Tailwind | Multiple fichiers |
| 15 | CSP contient `unsafe-eval` en production | Securite | `next.config.js:76` |
| 16 | CORS wildcard `*` sur `/api/company/lookup` | Securite | `app/api/company/lookup/route.ts:310` |
| 17 | `mapStripeStatus` fallback `'active'` sur statuts inconnus (fail-open) | Stripe | `lib/services/domain/subscription.service.ts:617` |

### BAS (17)

| # | Finding | Domaine |
|---|---------|---------|
| 18 | Dead `revalidatePath` (68 appels sur pages force-dynamic) | Performance |
| 19 | `runtime: 'nodejs'` mort dans middleware config | Next.js |
| 20 | `console.warn`/`console.error` dans middleware | Next.js |
| 21 | Dark mode partiel dans composants metier | Tailwind |
| 22 | Double dependance `tailwindcss-animate` + `tw-animate-css` | Tailwind |
| 23 | Couleurs hex hardcodees landing page | Tailwind |
| 24 | 18+ images sans `next/image` | Performance |
| 25 | Vues `_active` quasiment inutilisees (133 filtres manuels) | Supabase |
| 26 | 76 occurrences `.single()` a spot-checker | Supabase |
| 27 | `isAuthenticated()` deprecated mais presente | Supabase |
| 28 | Error boundaries manquants dans sous-sections | Architecture |
| 29 | `components.json` reference `tailwind.config.js` | Tailwind |
| 30 | API routes complexes bypass service layer | Architecture |
| 31 | Middleware skip API routes auth (distribue) | Securite |
| 32 | `getServerSession` legacy (1 consommateur) | Supabase |
| 33 | 12 occurrences `any` dans `biens/page.tsx` | Next.js / TS |
| 34 | PPR commente dans next.config.js | Next.js |

---

## Points forts remarquables

### Supabase (19 conformes)
- Browser client singleton, Server client `cache()`, Service Role isole
- Middleware cookie refresh pattern officiel
- `getUser()` dans middleware (pas `getSession()`)
- Multi-profil `.limit(1)` au lieu de `.single()`
- RLS mature avec SECURITY DEFINER helpers, anti-recursion
- Realtime channel unique chaine + Broadcast invalidation

### Stripe (15 conformes)
- Webhook signature `constructEvent()` + raw body
- Idempotency DB-backed + cleanup CRON
- Metadata sur session ET subscription_data
- Double-sync checkout (webhook + verify)
- Lazy sync self-healing
- RLS strict (service_role only pour ecritures)
- Proration `always_invoice` explicite

### Next.js 15 + React 19 (23 conformes)
- `cache()` React 19 pour deduplication auth
- `after()` pour travail differe post-reponse
- `unstable_cache` + `revalidateTag` pour data cache
- `Promise<params>` sur toutes pages dynamiques
- Metadata/Viewport exports separes
- Error boundaries `'use client'` partout
- `generateStaticParams` pour blog

### Architecture (8 conformes)
- TypeScript strict mode
- BaseRepository generique avec hooks
- Error hierarchy (5 exception types)
- Server Actions pattern `{ success, data/error }` coherent
- Factory functions par contexte d'execution
- Barrel exports structures par phases

---

## Plan de remediation

### Sprint 1 — Securite (urgent, ~4h)

| # | Action | Effort | Ref |
|---|--------|--------|-----|
| 1 | Ajouter Zod whitelist sur `/api/update-contact` | 30min | #1 |
| 2 | Remplacer `getSession()` -> `getUser()` dans `auth-dal.ts` | 15min | #2 |
| 3 | Ajouter Zod sur `lot-actions.ts` + `impersonation-actions.ts` | 1h | #3 |
| 4 | Conditionner `unsafe-eval` au dev uniquement | 15min | #15 |
| 5 | Definir `ALLOWED_ORIGIN` ou utiliser `NEXT_PUBLIC_SITE_URL` | 5min | #16 |
| 6 | Logger warning dans `mapStripeStatus` pour statuts inconnus | 15min | #17 |

### Sprint 2 — Qualite code (~6h)

| # | Action | Effort | Ref |
|---|--------|--------|-----|
| 7 | Supprimer statut `contestee` fantome | 30min | #6 |
| 8 | Renommer `error.tsx` -> `global-error.tsx` + creer `error.tsx` simple | 30min | #7 |
| 9 | Fix `hsl(var(--primary))` -> `oklch(...)` dans globals.css | 15min | #12 |
| 10 | Supprimer `tailwindcss-animate`, garder `tw-animate-css` | 15min | #22 |
| 11 | Migrer tokens `tailwind.config.js` -> `@theme inline` | 2h | #13 |
| 12 | Fix N+1 contact repository (reutiliser batch pattern de `findByTeam()`) | 1h | #5 |

### Sprint 3 — Dette technique (backlog)

| # | Action | Effort | Ref |
|---|--------|--------|-----|
| 13 | Decouper `intervention-actions.ts` (3411 lignes) | 4h | #4 |
| 14 | Supprimer 68 dead `revalidatePath`/`revalidateTag` | 1h | #18 |
| 15 | Migrer 4 composants avec appels Supabase directs | 2h | #10 |
| 16 | Ajouter Zod sur les 8 Server Actions restantes | 3h | #3 |
| 17 | Standardiser echelle z-index | 1h | #14 |
| 18 | Remplacer `any` par types stricts (67 occurrences) | 3h | #9 |

---

## Rapports detailles par agent

Les rapports complets de chaque agent sont disponibles dans les transcripts de la session d'audit :
- **Next.js 15 + React 19** : 31 checks, 14 fichiers audites
- **Supabase SSR + RLS** : 26 checks, middleware + auth-dal + realtime + migrations
- **Stripe** : 18 checks, webhook + service + repository + hook
- **Architecture & TypeScript** : 15 checks, base-repository + services + actions + schemas
- **Tailwind v4 + shadcn/ui** : 18 checks, globals.css + config + composants UI
- **Performance & Securite** : 20 checks, OWASP + N+1 + parallelisation + CSP

---

*Derniere mise a jour: 2026-03-21*
*Methodologie: 6 agents paralleles, docs officielles consultees via context7 MCP*
