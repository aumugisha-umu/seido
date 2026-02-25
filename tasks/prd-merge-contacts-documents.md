# PRD: Fusionner Contacts & Documents dans un seul Step

## Contexte
Actuellement, les wizards de création d'immeuble et de lot ont 5 étapes dont "Contacts" et "Documents" sont 2 étapes séparées. L'utilisateur veut fusionner ces 2 étapes en une seule "Contacts & Documents" avec une sous-navigation par onglets (tabs) à l'intérieur du step.

## Objectifs
1. **Réduire le nombre d'étapes** de 5 à 4 (supprimer l'étape Documents séparée)
2. **Sous-navigation par tabs** dans le step fusionné (onglet Contacts / onglet Documents)
3. **Documents au niveau immeuble ET lots** dans le flow building creation
4. **Documents au niveau lot** dans le flow lot creation
5. **UX Material Design 3** : tabs segmentés, transition fluide

## Design UX

### Step Header (4 étapes)
- Building: `Info → Lots → Contacts & Documents → Confirmation`
- Lot: `Immeuble → Lot → Contacts & Documents → Confirmation`

### Sub-tabs dans le step "Contacts & Documents"
```
┌─────────────────────────────────────────────┐
│  [👥 Contacts]    [📎 Documents]            │
├─────────────────────────────────────────────┤
│                                             │
│  (Contenu de l'onglet actif)                │
│                                             │
└─────────────────────────────────────────────┘
```

### Onglet Contacts (existant)
- Building contacts (gestionnaires, prestataires, propriétaires, autres)
- Per-lot contacts dans les accordion cards

### Onglet Documents
- **Niveau immeuble** : DocumentChecklistGeneric avec BUILDING_DOCUMENT_SLOTS
- **Niveau lot** : Chaque lot en accordion card avec DocumentChecklistGeneric + LOT_DOCUMENT_SLOTS
- Progress bar des documents recommandés (existant dans DocumentChecklistGeneric)

## Architecture technique

### Fichiers impactés
- `lib/step-configurations.ts` — Réduire à 4 étapes, renommer step 3
- `components/building-contacts-step-v3.tsx` → Ajouter sub-tabs + documents section
- `app/gestionnaire/(no-navbar)/biens/immeubles/nouveau/building-creation-form.tsx` — Supprimer step 4 (documents), ajuster step numbers
- `app/gestionnaire/(no-navbar)/biens/lots/nouveau/page.tsx` — Idem pour lots
- `app/gestionnaire/(no-navbar)/biens/immeubles/[id]/building-details-client.tsx` — Ajuster si tabs existent
- `app/gestionnaire/(no-navbar)/biens/lots/[id]/lot-details-client.tsx` — Ajuster si tabs existent

### Composants nouveaux
- Sub-tab component réutilisable (ou utiliser shadcn Tabs)

## Hors scope
- Modification des composants de documents eux-mêmes (déjà génériques)
- Modification de l'upload API
- Modification des pages de détails (lots/immeubles) — celles-ci gardent leurs onglets séparés
