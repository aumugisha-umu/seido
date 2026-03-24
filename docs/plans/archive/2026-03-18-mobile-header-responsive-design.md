# Mobile Header Responsive Design

## Context

Le header gestionnaire deborde sur mobile (390px). L'espace disponible dans le portal (~173px) ne peut pas contenir le titre + onboarding pill + PageActions buttons + notification bell. Les boutons avec texte (Importer, Nouveau contact) sont tronques ou invisibles.

## Design

### A. Header mobile epure

**`gestionnaire-topbar.tsx`** : Le slot PageActions devient `hidden sm:flex` (desktop only). Le h1 passe a `min-w-0` pour tronquer naturellement.

Resultat mobile : `[titre] [zap 2/6] [bell]`

### B. FAB global dans le layout

**Deplacer** `GestionnaireFAB` de `manager-dashboard-v2.tsx` vers le layout `(with-navbar)/layout.tsx`.

**Nouveau context** `FABActionsContext` + hook `useFABActions()` dans `components/ui/fab.tsx` pour permettre aux pages d'injecter des actions contextuelles.

Le FAB affiche : actions contextuelles (en haut) + separateur + 5 actions globales.

### C. Actions contextuelles par page

Chaque page appelle `useFABActions([...])` pour enregistrer ses actions specifiques :
- Contacts : + Importer
- Biens : + Importer
- Contrats : + Importer
- Emails : + Synchroniser

Les `<PageActions>` restent pour desktop (hidden sm:flex).

## Files

| Fichier | Modification |
|---------|-------------|
| `components/gestionnaire-topbar.tsx` | PageActions `hidden sm:flex`, h1 `min-w-0` |
| `components/ui/fab.tsx` | + FABActionsContext, FABActionsProvider, useFABActions, separateur |
| `app/gestionnaire/(with-navbar)/layout.tsx` | + FABActionsProvider wrapper + GestionnaireFAB |
| `components/dashboards/manager/manager-dashboard-v2.tsx` | Retirer GestionnaireFAB |
| `app/.../contacts/contacts-page-client.tsx` | + useFABActions([Importer]) |
| `app/.../biens/biens-page-client.tsx` | + useFABActions([Importer]) |
| `app/.../contrats/contrats-page-client.tsx` | + useFABActions([Importer]) |
| `app/.../mail/mail-client.tsx` | + useFABActions([Synchroniser]) |

## Verification

- Mobile : chaque page = header epure + FAB avec actions contextuelles
- Desktop : PageActions visibles dans le header, FAB cache (lg:hidden)
- Onboarding pill : compact sur mobile, full sur desktop
