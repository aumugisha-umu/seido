# Design: Multi-Slot Response Modal

**Date**: 2026-02-03
**Status**: Implemented
**Author**: Claude (UI Designer Agent)

## Overview

Fusion de deux modales existantes en une modale unifiée pour répondre aux créneaux proposés :
- `TimeSlotResponseModal` → Gère un seul créneau (accept/reject)
- `TenantSlotConfirmationModal` → Sélection parmi plusieurs créneaux (locataire)

## Problème

Les utilisateurs devaient ouvrir plusieurs modales pour répondre à plusieurs créneaux, créant une UX fragmentée. De plus, `RejectSlotModal` était redondant avec `TimeSlotResponseModal`.

## Solution

### Nouvelle modale : `MultiSlotResponseModal`

**Fichier** : `components/intervention/modals/multi-slot-response-modal.tsx`

### Fonctionnalités

| Feature | Description |
|---------|-------------|
| **Multi-créneaux** | Affiche tous les créneaux proposés groupés par date |
| **Auto-fill** | Accepter un créneau → auto-reject des autres (modifiable) |
| **Commentaire global** | Toujours visible, obligatoire si tous refusés |
| **Proposer créneaux** | Section optionnelle si tous les créneaux sont refusés |
| **Responsive** | Mobile-first avec touch targets ≥ 44px |

### Comportement Auto-Fill

```
Utilisateur accepte Créneau A
    ↓
Créneaux B, C, D (qui étaient "pending") → passent à "reject"
    ↓
Utilisateur peut encore modifier B, C, D avant de confirmer
```

### Props Interface

```typescript
interface MultiSlotResponseModalProps {
  isOpen: boolean
  onClose: () => void
  slots: TimeSlot[]
  interventionId: string
  existingResponses?: Record<string, { response: SlotResponseType; reason?: string }>
  onSuccess?: () => void
}
```

### État interne

```typescript
const [slotResponses, setSlotResponses] = useState<Record<string, SlotResponse>>({})
const [globalComment, setGlobalComment] = useState('')
const [proposedSlots, setProposedSlots] = useState<ProposedSlot[]>([])
```

## Migration

### Fichiers supprimés

- `components/intervention/modals/reject-slot-modal.tsx` ✅ SUPPRIMÉ

### Fichiers à migrer (Phase 2)

- `components/intervention/tenant-slot-confirmation-modal.tsx` → Remplacer par `MultiSlotResponseModal`

### Fichiers mis à jour

| Fichier | Changement |
|---------|------------|
| `app/prestataire/.../intervention-detail-client.tsx` | Import `TimeSlotResponseModal` au lieu de `RejectSlotModal` |
| `app/locataire/.../intervention-detail-client.tsx` | Idem |
| `app/gestionnaire/.../intervention-detail-client.tsx` | Idem |
| `components/intervention/quote-submission-form.tsx` | Idem |

## Tests

Page de test : `/test/modals-audit`

- Affiche toutes les modales de planification et devis
- Permet de tester visuellement chaque modale
- Identifie les redondances

## Design Tokens

| Element | Style |
|---------|-------|
| Accept | `border-green-500 bg-green-100 text-green-700` |
| Reject | `border-orange-500 bg-orange-100 text-orange-700` |
| Pending | `border-slate-400 bg-slate-100 text-slate-700` |
| Info box | `bg-blue-500/10 border-blue-500/20 text-blue-700` |

## Accessibilité

- Labels explicites avec `htmlFor`
- Touch targets minimum 44px
- Couleurs avec contraste suffisant (3:1 ratio)
- Focus management à l'ouverture

## Prochaines étapes

1. [ ] Remplacer les usages de `TenantSlotConfirmationModal` par `MultiSlotResponseModal`
2. [ ] Supprimer `TenantSlotConfirmationModal` après migration
3. [ ] Unifier `CancelQuoteRequestModal` et `CancelQuoteConfirmModal`
