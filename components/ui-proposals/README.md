# UI Proposals - Composants en Review

Ce dossier contient les propositions de refonte de composants UI en attente de validation.

---

## Composants Actuels

### 1. Tenant Header Redesign (2025-10-27) ⭐ NOUVEAU
**Statut:** En review
**Objectif:** Réduire de 40-55% l'espace vertical du header dashboard locataire

**Fichiers:**
- `tenant-header-v1.tsx` - Horizontal Ultra-Compact ⭐ (recommandé)
- `tenant-header-v2.tsx` - Grid Split avec Accent Visuel
- `tenant-header-v3.tsx` - Card Premium avec Badges

**Page de démo:** [localhost:3000/ui-preview/tenant-header](http://localhost:3000/ui-preview/tenant-header)
**Documentation:** `docs/tenant-header-redesign-analysis.md`
**Livrables:** `docs/tenant-header-redesign-deliverables.md`

**Recommandation:** Version 1 (gain espace 55%, performance optimale)

---

### 2. Pending Actions Redesign (2025-10-27)
**Statut:** En review
**Objectif:** Réduire de 50%+ l'espace vertical de la section "Actions en attente"

## Contexte

**Date**: 2025-10-27
**Objectif**: Réduire de 50%+ l'espace vertical occupé par les actions en attente
**Problème actuel**: ~400px pour 3 actions → interventions repoussées hors viewport

## Propositions créées

### Version 1: List compacte avec badges inline
**Fichier**: `pending-actions-compact-v1.tsx`

**Concept**: Liste minimale sans Cards, séparateurs fins uniquement. Icon + Infos + Action alignés sur une ligne.

**Métriques**:
- Hauteur: ~120px pour 3 actions
- Gain: -70% vs actuel
- Style: Minimal, notification list

**Avantages**:
- Densité maximale
- Excellent mobile
- Scan rapide

**Inconvénients**:
- Moins de hiérarchie visuelle
- Infos secondaires tronquées

---

### Version 2: Cards condensées avec layout 2-colonnes ⭐ RECOMMANDÉ
**Fichier**: `pending-actions-compact-v2.tsx`

**Concept**: Cards ultra-fines (32px) en grid 2 colonnes desktop. Hover révèle détails via tooltip.

**Métriques**:
- Hauteur: ~80px pour 3 actions
- Gain: -80% vs actuel
- Style: Cards fines, moderne, tooltips

**Avantages**:
- Compacité maximale (-80%)
- Cards matérialisées (hiérarchie)
- Tooltips innovants
- Animations premium
- Scalabilité (12 actions visibles)

**Inconvénients**:
- Nécessite hover pour détails
- Mobile: retombe en 1 colonne

**Pourquoi recommandé ?**
- Meilleur ratio compacité/lisibilité
- UX moderne B2B (hover tooltips)
- Scalabilité exceptionnelle
- Design tendances 2025

---

### Version 3: Timeline verticale avec accordéon
**Fichier**: `pending-actions-compact-v3.tsx`

**Concept**: Timeline visuelle (ligne + dots colorés). Actions collapsées par défaut, expandables au clic.

**Métriques**:
- Hauteur collapsée: ~180px pour 3 actions
- Gain: -55% vs actuel
- Style: Timeline, interactif, unique

**Avantages**:
- Métaphore temporelle claire
- Progressive disclosure
- Design unique
- Excellent listes longues

**Inconvénients**:
- Nécessite interaction (clic)
- Moins compact que V1/V2

---

## Page de démo

**URL locale**: `http://localhost:3000/ui-preview/pending-actions`
**Fichier**: `app/ui-preview/pending-actions/page.tsx`

Comparaison interactive des 3 versions avec:
- Design actuel (référence)
- Métriques (hauteur, gains)
- Avantages/Inconvénients
- Recommandation finale

## Documentation

### Comparaison détaillée
**Fichier**: `docs/pending-actions-design-comparison.md`

Contient:
- Matrice comparative complète
- Justifications UX détaillées
- Caractéristiques techniques
- Cas d'usage recommandés

### Rapport d'amélioration
**Fichier**: `docs/rapport-amelioration-pending-actions.md`

Contient:
- Contexte et problématique
- Méthodologie
- Analyse comparative
- Plan d'implémentation (4 phases)
- Success metrics
- Risks et mitigation

## Utilisation

### Import
```tsx
// Version recommandée (V2)
import { PendingActionsCompactV2 } from '@/components/ui-proposals/pending-actions-compact-v2'

// Alternatives
import { PendingActionsCompactV1 } from '@/components/ui-proposals/pending-actions-compact-v1'
import { PendingActionsCompactV3 } from '@/components/ui-proposals/pending-actions-compact-v3'
```

### Exemple d'usage
```tsx
<PendingActionsCompactV2
  actions={mockActions}
  userRole="locataire"
  onActionClick={(action) => {
    router.push(action.actionUrl)
  }}
/>
```

### Props interface
```typescript
interface PendingAction {
  id: string
  type: string
  title: string
  description?: string
  status: string
  reference?: string
  priority?: string
  location?: {
    building?: string
    lot?: string
  }
  contact?: {
    name: string
    role: string
  }
  metadata?: Record<string, unknown>
  actionUrl: string
}

interface Props {
  actions: PendingAction[]
  userRole: 'locataire' | 'prestataire' | 'gestionnaire'
  onActionClick?: (action: PendingAction) => void
}
```

## Prochaines étapes

1. **Review**: Tester page démo avec équipe UX
2. **Validation**: Confirmer choix Version 2 avec stakeholders
3. **Implémentation**: Finaliser V2 + tests (1 semaine)
4. **Test A/B**: 20% users pendant 2 semaines
5. **Rollout**: Déploiement graduel 50% → 100%

## Ressources

- **Demo page**: [localhost:3000/ui-preview/pending-actions](http://localhost:3000/ui-preview/pending-actions)
- **Composant actuel**: `components/shared/pending-actions-card.tsx`
- **Documentation complète**: `docs/pending-actions-design-comparison.md`
- **Rapport détaillé**: `docs/rapport-amelioration-pending-actions.md`

---

**Status**: ✅ Propositions complètes - Prêt pour review
**Recommandation**: Version 2 (Grid 2-colonnes)
