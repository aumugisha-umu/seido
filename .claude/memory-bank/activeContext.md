# SEIDO Active Context

## Focus Actuel
**Objectif:** Unified Entity Preview Layout + Memory Bank Sync
**Branch:** `preview`
**Sprint:** Multi-Team Support + Google Maps Integration (Jan 2026)
**Dernière analyse:** EntityTabs unification - 2026-01-30

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

---
*Derniere mise a jour: 2026-01-30 12:00*
*Focus: Performance optimization + UX intervention tabs*

## Commits Recents (preview branch)

| Hash | Description |
|------|-------------|
| `e4429f4` | fix(beta-gate): improve form layout and UX |
| `c51b6f4` | feat(landing): optimize B2B copywriting + update pricing free tier to 1-2 biens |
| `46735c9` | feat(addresses): update address handling and UI components for centralized structure |
| `b70f373` | feat(interventions): add dedicated Localisation tab + fix tenant dashboard |

## Files Recently Modified
### 2026-01-30 17:31:04 (Auto-updated)
- `C:/Users/arthu/Desktop/Coding/Seido-app/components/intervention/modals/approval-modal.tsx`
- `C:/Users/arthu/.claude/plans/wiggly-sauteeing-kernighan.md`
