# SEIDO Active Context

## Focus Actuel
**Objectif:** UX Formulaires Intervention + Cohérence Locataire/Gestionnaire
**Branch:** `preview`
**Sprint:** Multi-Team Support + Google Maps Integration (Jan 2026)
**Dernière analyse:** Formulaire Intervention Locataire + Confirmation Gestionnaire - 2026-01-31

---

## ✅ COMPLETE: Formulaire Intervention Locataire + Confirmation Gestionnaire (2026-01-31 - Session 4)

### 1. Extension Types d'Intervention Locataire

**Problème:** Le formulaire locataire n'affichait que 20 types (catégorie "Bien"), alors que 7 types pertinents étaient masqués (catégorie "Locataire").

**Solution:** Adapter le composant pour accepter un tableau de catégories.

| Fichier | Modification |
|---------|--------------|
| `intervention-type-combobox.tsx` | Type `categoryFilter` étendu : `string \| string[]` + logique filtrage |
| `nouvelle-demande-client.tsx` | Filtre changé : `"bien"` → `["bien", "locataire"]` |

**Résultat:** Le locataire voit maintenant **27 types** (20 Bien + 7 Locataire) au lieu de 20.

### 2. Fix Confirmation Gestionnaire (Header Prématuré)

**Problème:** L'étape 4 du gestionnaire affichait "Intervention créée !" **avant** la création réelle.

**Root Cause:** `showSuccessHeader={true}` dans le composant `InterventionConfirmationSummary`.

| Fichier | Modification |
|---------|--------------|
| `nouvelle-intervention-client.tsx` | `showSuccessHeader={true}` → `showSuccessHeader={false}` |

**Pattern aligné avec locataire:**
```tsx
// Les deux formulaires utilisent maintenant le même pattern
<InterventionConfirmationSummary
  showFooter={false}
  showSuccessHeader={false}  // ← Cohérent
/>
```

---

## ✅ COMPLETE: SWR Server Component Fix + Tenant Dashboard UX (2026-01-31 - Session 3)

### Problème 1: `ReferenceError: window is not defined`

**Root Cause:** SWR accède à `window` au moment de l'import du module. Le hook `use-intervention-types.ts` était importé dans un Server Component via `getInterventionTypesServer()`.

**Solution:** Séparation client/serveur avec fichier dédié.

| Fichier | Action |
|---------|--------|
| `lib/services/domain/intervention-types.server.ts` | **CRÉÉ** - Fonction serveur isolée |
| `app/gestionnaire/.../nouvelle-intervention/page.tsx` | Import mis à jour |
| `hooks/use-intervention-types.ts` | Fonction supprimée, commentaire de redirection |

### Problème 2: Affichage étage/porte mal aligné sur dashboard locataire

**Root Cause:**
1. Bullet `•` affiché même en premier élément
2. Ligne non alignée avec l'adresse au-dessus
3. Champs `rooms`/`surface_area` utilisés mais inexistants en DB

**Solution:**

| Fichier | Modification |
|---------|--------------|
| `tenant.service.ts` | Ajout `description` dans la requête SQL |
| `tenant-transform.ts` | Ajout `description` au type + transformation |
| `use-tenant-data.ts` | Ajout `description` à l'interface `TenantData` |
| `locataire-dashboard-hybrid.tsx` | Affichage: étage → porte → description + `pl-7` alignement |

**Pattern appliqué: Séparateurs conditionnels**
```tsx
{[floor, door, description].filter(Boolean).map((detail, index) => (
  <span key={index}>
    {index > 0 && <span>•</span>}  {/* Seulement après le 1er */}
    <span>{detail}</span>
  </span>
))}
```

---

## ✅ COMPLETE: Auth API Optimization (2026-01-31) - CRITIQUE PERFORMANCE

### Problème
**250+ appels API `/auth/v1/user` en 10 minutes** pour un seul utilisateur connecté.

### Root Causes Identifiées
| Cause | Impact |
|-------|--------|
| `getUser()` avec retry loop | Jusqu'à 4 appels réseau par invocation |
| `getSession()` avec double validation | Appelait `getSession()` + `getUser()` |
| `createServerSupabaseClient()` non cached | Nouveau client créé à chaque appel |
| Middleware + Pages = double validation | 2 appels `getUser()` par navigation |

### Solution Appliquée

**Principe clé :** Le middleware fait l'unique appel réseau `getUser()`. Les pages utilisent `getSession()` qui lit le JWT localement.

| Fichier | Changement |
|---------|------------|
| `lib/auth-dal.ts` | `getUser()` utilise `getSession()` au lieu de `supabase.auth.getUser()` |
| `lib/auth-dal.ts` | Suppression du retry loop dans `getUser()` |
| `lib/auth-dal.ts` | `getSession()` n'appelle plus `getUser()` en double |
| `lib/services/core/supabase-client.ts` | Ajout `cache()` wrapper sur `createServerSupabaseClient` |
| `hooks/use-auth.tsx` | Flag `initialSessionHandled` pour éviter appels dupliqués |

### Résultat
- **Avant**: 250+ appels en 10 minutes
- **Après**: 1 appel par navigation (comportement attendu)

### Pattern Appliqué
```typescript
// ✅ CORRECT - Pages/Layouts (lecture JWT locale)
const { data: { session } } = await supabase.auth.getSession()
return session?.user ?? null

// ✅ CORRECT - Middleware seulement (validation réseau)
const { data: { user } } = await supabase.auth.getUser()
```

---

## ✅ COMPLETE: Auth Refactoring (2026-01-31) - MAJEUR

### Objectif
Centraliser l'authentification pour éviter les appels redondants et corriger le bug multi-profil.

### Résumé des Changements (14 fichiers)

| Catégorie | Fichiers | Changement |
|-----------|----------|------------|
| **Hooks (4)** | `use-tenant-data.ts`, `use-contacts-data.ts`, `use-interventions.ts`, `use-prestataire-data.ts` | Suppression session check défensif |
| **Server Actions (7)** | `intervention-actions.ts`, `intervention-comment-actions.ts`, `email-conversation-actions.ts`, `conversation-actions.ts`, `contract-actions.ts`, `building-actions.ts`, `lot-actions.ts` | `getAuthenticatedUser()` → `getServerActionAuthContextOrNull()` |
| **Services (3)** | `intervention-service.ts`, `team.repository.ts`, `supabase-client.ts` | Params explicites + deprecation |

### Nouveau Helper Créé

```typescript
// lib/server-context.ts
export const getServerActionAuthContextOrNull = async (requiredRole?: string)
  : Promise<ServerActionAuthContext | null>
```

### Bug Critique Corrigé (Post-Review)

3 hooks utilisaient `supabase` sans l'avoir déclaré :

| Fichier | Ligne | Fix |
|---------|-------|-----|
| `use-contacts-data.ts` | 112 | `const supabase = createBrowserSupabaseClient()` |
| `use-prestataire-data.ts` | 203 | `const supabase = createBrowserSupabaseClient()` |
| `use-tenant-data.ts` | 212 | `const supabase = createBrowserSupabaseClient()` |

### Bug `.single()` Corrigé (Multi-Profil)

| Fichier | Fix |
|---------|-----|
| `contract-actions.ts` | `.single()` → `.limit(1)` |
| `building-actions.ts` | `.single()` → `.limit(1)` |
| `lot-actions.ts` | `.single()` → `.limit(1)` |

### Migration Complète Auth (2026-01-31 - Session 2)

**Hooks migrés vers `useAuth()` (centralisé):**
| Fichier | Avant | Après |
|---------|-------|-------|
| `use-notifications.ts` | N/A | + `authLoading` Pattern #20 |
| `use-notification-popover.ts` | N/A | + `authLoading` Pattern #20 |
| `use-activity-logs.ts` | N/A | + `authLoading` Pattern #20 |
| `use-realtime-chat-v2.ts` | `supabase.auth.getSession()` | `useAuth()` hook |
| `documents-tab.tsx` (gestionnaire) | `supabase.auth.getUser()` | `useAuth()` hook |
| `documents-tab.tsx` (prestataire) | `supabase.auth.getUser()` | `useAuth()` hook |

**API Routes migrés vers `getApiAuthContext()`:**
| Fichier | Avant | Après |
|---------|-------|-------|
| `app/api/companies/[id]/route.ts` | `createServerSupabaseClient()` + auth manuelle | `getApiAuthContext()` |
| `app/api/emails/[id]/route.ts` | auth manuelle | `getApiAuthContext()` |
| `app/api/emails/send/route.ts` | auth manuelle | `getApiAuthContext()` |
| `app/api/emails/connections/[id]/route.ts` | auth manuelle | `getApiAuthContext()` |
| `app/api/emails/oauth/callback/route.ts` | `createServerSupabaseClient()` | `getApiAuthContext()` |

**Fichiers NON migrés (volontairement):**
| Fichier | Raison |
|---------|--------|
| `hooks/use-auth.tsx` | C'est le provider centralisé lui-même |
| `lib/auth-dal.ts` | C'est le DAL centralisé lui-même |
| `lib/api-auth-helper.ts` | C'est le helper API lui-même |
| `middleware.ts` | Doit valider auth au niveau middleware |
| `app/auth/*` | Pages de flux d'authentification |
| `lib/services/domain/intervention-service.ts` | Code DEPRECATED (fallback) - marqué dans le code |
| `use-session-*.ts` | Gestion session bas niveau |

### Tests Manuels à Effectuer ⏳

- [x] Page Notifications (✅ fix race condition auth - 2026-01-31)
- [x] Realtime Chat (✅ migré vers useAuth - 2026-01-31)
- [ ] Login/logout flow
- [ ] Multi-profile user switching teams
- [ ] Session timeout (wait 60s+ idle)
- [ ] Tab focus refresh
- [ ] Each Server Action with multi-profile user
- [ ] OAuth callback (app/api/emails/oauth/callback)

### Si Bug Trouvé - Checklist Debugging

1. **"Authentication required"** → `getServerActionAuthContextOrNull()` dans `lib/server-context.ts`
2. **PGRST116 (multiple rows)** → `.single()` non migré vers `.limit(1)`
3. **`supabase is not defined`** → Hook manquant `createBrowserSupabaseClient()`
4. **Session perdue** → `use-session-keepalive.ts`, `use-session-focus-refresh.ts`
5. **Notifications/données ne chargent pas** → Vérifier `authLoading` dans hooks (Pattern #20)

### Design Document

📄 `docs/plans/2026-01-31-auth-refactoring-design.md`

---

## ✅ COMPLETE: Finalization Modal z-index Fix (2026-01-30)

### Problème
La modale de finalisation d'intervention ne s'affichait pas visuellement malgré :
- State React correct (`showFinalizationModal: true`)
- Composant Radix rendant (`open: true`)
- Portal Radix fonctionnel

### Root Cause
**CSS z-index manquant** sur `.unified-modal__content`. L'overlay avait `z-50` mais le contenu n'avait pas de z-index défini, causant un rendu **derrière** l'overlay.

### Solution Appliquée

**1. CSS z-index (globals.css)**
```css
/* AVANT */
.unified-modal__overlay { @apply fixed inset-0 bg-black/50 ... }
.unified-modal__content { @apply fixed bg-background ... }

/* APRÈS */
.unified-modal__overlay { @apply fixed inset-0 z-[9998] bg-black/50 ... }
.unified-modal__content { @apply fixed z-[9999] bg-background ... }
```

**2. useEffect URL action stabilisé (intervention-detail-client.tsx)**
- Ajout `processedUrlActionRef` pour éviter re-triggering
- Lecture URL directe au lieu de `useSearchParams()` instable
- Dépendances minimales avec commentaire explicatif

### Fichiers Modifiés

| Fichier | Modification |
|---------|--------------|
| `app/globals.css` | z-index overlay/content |
| `intervention-detail-client.tsx` | useEffect stabilisé + ref |
| `finalization-modal-live.tsx` | Imports Lucide fusionnés |
| `unified-modal.tsx` | Cleanup debug logs |

### Pattern à Retenir

**Pour les modales Radix avec CSS custom :**
```css
/* L'overlay ET le content doivent avoir des z-index explicites */
.modal__overlay { z-index: 9998; }
.modal__content { z-index: 9999; }
```

---

## ✅ COMPLETE: Accessibility + Card Refactoring (2026-01-30)

### ApprovalModal Accessibility (WCAG AA)
- Touch targets: Back buttons `p-1.5` → `p-2.5` (24px → 40px)
- `aria-hidden="true"` sur 12 icônes décoratives
- Contraste: `text-slate-400` → `text-slate-500/600`
- Focus states: `focus-visible:ring-2` sur tous les boutons
- Loading state: `role="status" aria-live="polite"`

### InterventionCard Refactoring
**Renommage:** `PendingActionsCard` → `InterventionCard`

| Fichier | Changement |
|---------|------------|
| `intervention-card.tsx` | Nouveau fichier, fix sizing (retrait `h-full`) |
| `pending-actions-card.tsx` | **SUPPRIMÉ** |
| `intervention-overview-card.tsx` | **SUPPRIMÉ** (legacy wrapper) |

**Fix sizing grid:**
```typescript
// AVANT - Cards stretched to full height
<div className="grid ... h-full">

// APRÈS - Cards auto-height, aligned per row
<div className="grid ...">
```

**Inline overview content:**
- `overview-tab.tsx` (gestionnaire + prestataire) utilise maintenant directement:
  - `InterventionProviderGuidelines`
  - `InterventionSchedulingPreview`
  - Description inline

---

## ✅ COMPLETE: EntityPreviewLayout + Tabs Unification (2026-01-30)

### Objectif
Unifier les composants de tabs pour toutes les pages preview (Building, Lot, Contract, Contact, Intervention).

### Architecture Unifiée

```
@/components/shared/entity-preview/
├── index.ts                 # Exports centralisés
├── types.ts                 # TabConfig, getInterventionTabsConfig()
├── entity-tabs.tsx          # Composant unifié MD3
├── entity-preview-layout.tsx # Layout wrapper
└── entity-activity-log.tsx  # Timeline d'activité
```

### Migrations Effectuées

| Page | Ancien | Nouveau |
|------|--------|---------|
| Building | Custom tabs | `EntityTabs` |
| Lot | Custom buttons | `EntityTabs` |
| Contract | `Tabs/TabsList` | `EntityTabs` |
| Contact | `ContactTabsNavigation` | `EntityTabs` |
| **Intervention** | `InterventionTabs` | `EntityTabs + getInterventionTabsConfig()` |

### Fichiers Supprimés (code mort)

| Fichier | Raison |
|---------|--------|
| `contact-tabs-navigation.tsx` | Remplacé par EntityTabs |
| `intervention-tabs.tsx` | Unifié avec EntityTabs |
| `intervention-tabs.stories.tsx` | Storybook obsolète |
| `intervention-detail-tabs.tsx` | Legacy non utilisé |
| `preview-designs/*` | Prototypes obsolètes |

### Utilisation

```typescript
// Pour toutes les entités
import { EntityTabs, TabContentWrapper } from '@/components/shared/entity-preview'

// Pour interventions (avec config par rôle)
import { EntityTabs, getInterventionTabsConfig } from '@/components/shared/entity-preview'
const tabs = useMemo(() => getInterventionTabsConfig('manager'), []) // ou 'provider', 'tenant'
```

---

## ✅ COMPLETE: Performance Optimization + UX Interventions (2026-01-30)

### Problemes Identifies
L'application souffrait de lenteurs importantes:
- Chargement infini des pages
- Inputs désactivés pendant le chargement
- Erreurs CSP bloquant les ressources
- Service Worker timeouts causant des échecs réseau

### Root Causes (Analyse 4 Agents)

| Issue | Root Cause | Impact |
|-------|------------|--------|
| **Re-renders infinis** | `useEffect` sans dépendances dans `content-navigator.tsx:137` | 7374ms+ délais |
| **CSP violations** | Domaines manquants dans `connect-src` (vercel-scripts, lh3.googleusercontent, frill-prod) | Requêtes bloquées |
| **SW timeouts** | Timeout 10s trop agressif pour API complexes | Échecs réseau |
| **Double query** | `activity-logs/route.ts` faisait 2 requêtes COUNT séparées | Temps x2 |

### Solutions Appliquées

**1. ContentNavigator useEffect (CRITIQUE)**
```typescript
// AVANT - S'exécutait à CHAQUE render!
useEffect(() => { ... })

// APRÈS - Une seule fois au mount + dev-only
useEffect(() => {
  if (process.env.NODE_ENV !== 'development') return
  // ...
}, [])
```

**2. CSP connect-src étendu**
```javascript
// next.config.js - Ajout domaines manquants
"connect-src 'self' ... https://*.vercel-scripts.com https://frill-prod-app.b-cdn.net https://lh3.googleusercontent.com ..."
```

**3. Service Worker désactivé en dev**
```javascript
// next.config.js
disable: process.env.NODE_ENV === 'development'
```

**4. Activity-logs API optimisé**
```typescript
// Une seule requête avec count intégré
.select('*', { count: 'exact' })
```

### Fichiers Modifiés

| Fichier | Modification |
|---------|--------------|
| `components/content-navigator.tsx` | useEffect avec `[]` + garde NODE_ENV |
| `next.config.js` | SW désactivé en dev + CSP étendu |
| `app/sw.ts` | Timeout API: 10s → 30s |
| `app/api/activity-logs/route.ts` | Query unique avec count intégré |

### UX Intervention Tabs (Material Design)

**Améliorations UI:**
- Tabs: Icônes retirées (texte seul)
- Responsive: Dropdown < 768px, Tabs ≥ 768px
- ParticipantsRow: Nouveau composant chips horizontal
- ConversationSelector: Intégré dans Chat tab

**Fichiers créés:**
- `components/interventions/shared/layout/participants-row.tsx`
- `components/interventions/shared/layout/conversation-selector.tsx`

---

## ✅ COMPLETE: Add Dedicated Localisation Tab in Intervention Preview (2026-01-29)

### Objectif
Créer un onglet "Localisation" dédié dans la prévisualisation d'intervention pour les 3 rôles, avec la carte Google Maps en grand format.

### Solution Implementee

**Nouveau composant partagé :**
```
components/interventions/shared/tabs/localisation-tab.tsx
```

### Nouvelle Structure des Onglets

| Rôle | Onglets |
|------|---------|
| **Gestionnaire** | Général \| **Localisation** \| Conversations \| Planning et Estimations \| Contacts \| Emails |
| **Prestataire** | Général \| **Localisation** \| Conversations \| Planification |
| **Locataire** | Général \| **Localisation** \| Conversations \| Rendez-vous |

---

## Flow des Interventions - Vue Complete

### Statuts (9 actifs)

```
demande -> rejetee (terminal)
        -> approuvee -> planification -> planifiee
                                              |
                                    cloturee_par_prestataire
                                              |
                                    cloturee_par_locataire
                                              |
                                    cloturee_par_gestionnaire (terminal)
        -> annulee (terminal - possible a chaque etape)
```

### Creation Intervention avec Conversations

**Ordre critique:**
1. Creer intervention
2. **Creer threads conversation** (AVANT assignments!)
3. Creer assignments (trigger ajoute participants aux threads)
4. Creer time slots

---

## Multi-Equipe - Etat Actuel

### Corrections Appliquees (Phase 7+)

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 5 | API routes: `.single()` → `.limit(1)` | ✅ |
| Phase 6 | Browser side: auth-service.ts multi-profil | ✅ |
| Phase 7 | RLS: `get_my_profile_ids()` | ✅ |
| Phase 8 | Conversations: `can_view_conversation()` multi-profil | ✅ |
| Phase 9 | Participants: Trigger `thread_add_managers` | ✅ |

---

## Prochaines Etapes

### Performance - A Surveiller
- [ ] Vérifier que SW disabled résout les timeouts en dev
- [ ] Monitorer les erreurs CSP en production
- [ ] Optimiser d'autres API routes si nécessaire

### Google Maps Integration
- [x] Phase 1: Table addresses centralisée ✅
- [x] Phase 4: Map display component (LocalisationTab) ✅
- [ ] Phase 2: Composant AddressInput avec Places API
- [ ] Phase 3: Geocoding service automatique

---

## Metriques Systeme (Mise a jour 2026-01-30)

| Composant | Valeur |
|-----------|--------|
| **Tables DB** | **44** (+1 addresses, +3 quotes) |
| **Migrations** | **145+** |
| **API Routes** | **113** (10 domaines) |
| **Pages** | **87** (5+ route groups) |
| **Composants** | **232+** (+2 participants-row, conversation-selector) |
| **Hooks** | **64** custom hooks |
| **Services domain** | **32** |
| **Repositories** | **22** |
| Statuts intervention | 9 |
| Triggers conversation | 2 |

---

## Points de Vigilance Performance

### Service Worker en Développement
**Pattern recommandé:** Désactiver le SW en dev pour éviter les problèmes de cache/CSP
```javascript
// next.config.js
disable: process.env.NODE_ENV === 'development'
```

### useEffect Dependencies
**Anti-pattern:** useEffect sans tableau de dépendances
```typescript
// ❌ MAUVAIS - s'exécute à CHAQUE render
useEffect(() => { ... })

// ✅ CORRECT - s'exécute une fois au mount
useEffect(() => { ... }, [])
```

### CSP pour Service Worker
**Important:** Le SW intercepte tous les fetch, donc TOUS les domaines doivent être dans `connect-src`, pas seulement dans leur directive spécifique (img-src, font-src, etc.)

### Pattern: Séparation Client/Serveur pour Hooks SWR

**Anti-pattern:** Exporter une fonction serveur depuis un fichier qui importe SWR
```typescript
// ❌ MAUVAIS - use-intervention-types.ts
import useSWR from 'swr/immutable'  // Accède à window!
export function useInterventionTypes() { ... }
export async function getInterventionTypesServer() { ... }  // Exporté mais SWR déjà importé
```

**Pattern correct:** Fichiers séparés
```typescript
// ✅ hooks/use-intervention-types.ts (Client)
import useSWR from 'swr/immutable'
export function useInterventionTypes() { ... }

// ✅ lib/services/domain/intervention-types.server.ts (Server)
export async function getInterventionTypesServer() { ... }
```

---
*Derniere mise a jour: 2026-01-31 22:45*
*Focus: Auth API Optimization - 250+ → 1 appel par navigation*

## Commits Recents (preview branch)

| Hash | Description |
|------|-------------|
| `2431cc3` | perf(auth): reduce auth API calls from 250+ to 1 per navigation |
| `a719010` | refactor(auth): centralize authentication + fix intervention forms UX |
| `e4429f4` | fix(beta-gate): improve form layout and UX |
| `c51b6f4` | feat(landing): optimize B2B copywriting + update pricing free tier to 1-2 biens |

## Files Recently Modified
### 2026-01-31 22:45:00 (Auto-updated)
- `C:/Users/arthu/Desktop/Coding/Seido-app/lib/auth-dal.ts`
- `C:/Users/arthu/Desktop/Coding/Seido-app/lib/services/core/supabase-client.ts`
- `C:/Users/arthu/Desktop/Coding/Seido-app/hooks/use-auth.tsx`
