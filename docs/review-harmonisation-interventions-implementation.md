# Review complète – Implémentation harmonisation vues détail interventions

## 1. Conformité au plan

| Point du plan | Statut | Détail |
|---------------|--------|--------|
| Supprimer la sidebar (colonne gauche) pour locataire et prestataire | ✅ | `PreviewHybridLayout` + `InterventionSidebar` retirés ; layout = `EntityTabs` seul en pleine largeur. |
| Garder la ligne Participants dans l’onglet Général | ✅ | `participants` toujours calculé et passé à `InterventionDetailsCard` ; pas de `showParticipants={false}`. |
| Ajouter l’onglet Activité pour locataire et prestataire | ✅ | `getInterventionTabsConfig` renvoie `{ value: 'activity', label: 'Activité' }` pour `tenant` et `provider` ; `TabsContent value="activity"` + `ActivityTab` + `useActivityLogs` dans les deux clients. |
| Déplacer ActivityTab en partagé | ✅ | Fichier unique : `components/interventions/activity-tab.tsx` ; gestionnaire importe depuis `@/components/interventions/activity-tab`. |
| Nettoyage sidebar : supprimer composants et exports | ✅ | Fichiers sidebar supprimés ; `sidebar/index.ts` ne réexporte plus ; `shared/index.ts` sans `export * from './sidebar'`. |
| Nettoyage types : InterventionSidebarProps, ParticipantsListProps | ✅ | Les deux interfaces supprimées de `intervention-preview.types.ts`. `ParticipantsGroup` conservé (utilisé par `InterventionPreviewProps`). |

---

## 2. Fichiers modifiés / créés / supprimés

### Créés
- `components/interventions/activity-tab.tsx` – Composant partagé (Progression + Historique d’activité), avec gestion des statuts API `failed` / `in_progress` / `cancelled`.

### Modifiés
- **Locataire** – `app/locataire/(no-navbar)/interventions/[id]/components/intervention-detail-client.tsx`  
  Imports allégés (plus de `PreviewHybridLayout`, `InterventionSidebar`, `TimelineEventData`). State/handlers sidebar retirés (`activeConversation`, `handleConversationClick`, `handleGroupConversationClick`, `timelineEvents`). Layout = `EntityTabs` seul. Ajout de `useActivityLogs`, `ActivityTab` et onglet Activité. Ligne Participants conservée via `participants` → `InterventionDetailsCard`.
- **Prestataire** – `app/prestataire/(no-navbar)/interventions/[id]/components/intervention-detail-client.tsx`  
  Même schéma : plus de sidebar, layout pleine largeur, onglet Activité, `participants` conservés.
- **Gestionnaire** – `app/gestionnaire/(no-navbar)/interventions/[id]/components/intervention-detail-client.tsx`  
  Import ActivityTab depuis `@/components/interventions/activity-tab`. Commentaires mis à jour (Participants, AssignmentModeBadge).
- **Entity-preview types** – `components/shared/entity-preview/types.ts`  
  `getInterventionTabsConfig` : onglet Activité déjà présent pour `tenant` et `provider` (aucune modification nécessaire pour cette revue).
- **Shared index** – `components/interventions/shared/index.ts`  
  Suppression de `export * from './sidebar'` ; commentaires/exemples mis à jour (plus de référence à `InterventionSidebar`).
- **Sidebar index** – `components/interventions/shared/sidebar/index.ts`  
  Fichier vidé des exports ; commentaire explicatif sur la suppression de la sidebar.
- **Types intervention-preview** – `components/interventions/shared/types/intervention-preview.types.ts`  
  Suppression de `ParticipantsListProps` et `InterventionSidebarProps` ; conservation de `ParticipantsGroup` et `AssignmentMode`.

### Supprimés
- `app/gestionnaire/(no-navbar)/interventions/[id]/components/activity-tab.tsx` (remplacé par le partagé).
- `components/interventions/shared/sidebar/conversation-button.tsx` (+ stories).
- `components/interventions/shared/sidebar/participants-list.tsx` (+ stories).
- `components/interventions/shared/sidebar/progression-timeline.tsx` (+ stories).
- `components/interventions/shared/sidebar/intervention-sidebar.tsx` (+ stories).

---

## 3. Points positifs

- **Cohérence des trois rôles** : locataire et prestataire ont la même structure que le gestionnaire (pleine largeur, ligne Participants dans Général, onglet Activité).
- **Un seul ActivityTab** : une seule source dans `components/interventions/activity-tab.tsx`, utilisé par les trois vues.
- **Typage ActivityTab** : prise en charge des statuts API (`failed`, `in_progress`, `cancelled`) en plus de `success` / `failure` / `pending`.
- **Pas de régression sur la carte Général** : `InterventionDetailsCard` inchangée ; `participants` toujours passé ; pas de prop `showParticipants`.
- **PreviewHybridLayout** : toujours exporté par `shared/layout` et utilisé par `preview-hybrid-building.tsx` et `preview-hybrid-lot.tsx` (hors interventions) – non impacté.

---

## 4. Points d’attention et améliorations possibles

### 4.1 Onglet Localisation non exposé dans la config des tabs
- **Constat** : `getInterventionTabsConfig('tenant')` et `getInterventionTabsConfig('provider')` ne renvoient pas d’entrée `{ value: 'localisation', label: '...' }`. Les deux clients ont bien un `<TabsContent value="localisation">` avec `LocalisationTab`, mais aucun onglet « Localisation » n’apparaît dans la barre d’onglets.
- **Impact** : l’onglet Localisation n’est pas accessible pour locataire et prestataire (comportement probablement préexistant).
- **Recommandation** : si la localisation doit être visible, ajouter dans `getInterventionTabsConfig` pour `tenant` et `provider` une entrée `{ value: 'localisation', label: 'Localisation' }` à l’endroit souhaité (ex. après Conversations ou avant Planning). Sinon, supprimer le `TabsContent value="localisation"` et l’import `LocalisationTab` pour éviter du code mort.

### 4.2 Imports inutilisés
- **Locataire et prestataire** : `TabContentWrapper` est importé depuis `@/components/shared/entity-preview` mais n’est pas utilisé.
- **Recommandation** : retirer `TabContentWrapper` des imports dans les deux fichiers.

### 4.3 Typage du mapping des activity logs
- **Constat** : dans locataire et prestataire, le mapping des logs pour `ActivityTab` utilise `(log as any).user_name`, etc. Le hook `useActivityLogs` retourne des activités avec `user_name`, `user_email`, `user_avatar_url` (cf. `hooks/use-activity-logs.ts`).
- **Recommandation** : typer explicitement (interface ou type dérivé du retour de `useActivityLogs`) et utiliser `log.user_name` sans `as any`, ou centraliser ce mapping dans un helper partagé pour éviter la duplication et les casts.

### 4.4 team_id null pour les activity logs
- **Constat** : `useActivityLogs({ teamId: intervention.team_id ?? undefined, ... })` ; si `intervention.team_id` est null, le hook ne fait pas de fetch (comportement actuel du hook).
- **Impact** : onglet Activité vide pour les interventions sans `team_id`. Acceptable si le modèle métier garantit toujours un `team_id` pour les interventions affichées ; sinon, à documenter ou à gérer (message explicite, fallback, etc.).

---

## 5. Récapitulatif des recommandations

| Priorité | Action |
|----------|--------|
| Moyenne | Décider du sort de l’onglet Localisation : soit l’ajouter à `getInterventionTabsConfig` pour tenant/provider, soit retirer le `TabsContent` et `LocalisationTab` correspondants. |
| Faible | Retirer l’import inutilisé `TabContentWrapper` (locataire + prestataire). |
| Faible | Typer le mapping des activity logs (ou helper partagé) et éviter `(log as any)` dans les deux clients. |

---

## 6. Vérifications techniques suggérées

- Lancer `npm run build` pour confirmer l’absence d’erreurs de compilation et d’imports manquants.
- Tester en navigation réelle :  
  - Locataire : détail intervention → onglets Général (avec ligne Participants), Conversations, Rendez-vous, Documents, Activité.  
  - Prestataire : idem (avec onglet Planning / Devis selon la config).  
- Vérifier que les pages building/lot qui utilisent `PreviewHybridLayout` (sans sidebar intervention) fonctionnent toujours.

---

*Review générée après implémentation du plan d’harmonisation (sidebar retirée pour locataire/prestataire, onglet Activité ajouté, ActivityTab partagé, nettoyage sidebar et types).*
