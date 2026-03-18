# PRD: Assignation de personnes aux interventions du bail

## Probleme

Dans le wizard de creation de bail (etape Interventions), le gestionnaire peut activer/desactiver des interventions et choisir leurs dates, mais ne peut pas assigner de personnes. Les interventions sont creees sans assignments — il faut ensuite aller dans chaque intervention individuellement pour ajouter des gestionnaires, prestataires ou locataires.

## Solution

Ajouter un bouton `+` (icone Users) sur chaque ligne d'intervention. Au clic :
1. Un **Popover** s'ouvre avec 3 sections : Gestionnaires, Prestataires, Locataires
2. Les **locataires du bail en cours** sont pre-selectionnes automatiquement au premier clic
3. L'utilisateur peut ajouter/retirer des personnes via checkboxes
4. Les avatars des personnes assignees s'affichent inline sur la ligne
5. A la soumission, `createInterventionAction` cree aussi les `intervention_assignments`

## Donnees disponibles

- `initialContacts: Contact[]` — tous les contacts de l'equipe (id, name, email, phone, role)
- `formData.contacts` — locataires et garants selectionnes pour CE bail (userId, role)
- `Contact.role` — discrimine gestionnaire/locataire/prestataire

## Scope

### Fichiers a modifier

1. **`components/contract/intervention-schedule-row.tsx`** — Ajouter bouton `+`, Popover, avatars inline
2. **`components/contract/intervention-schedule-row.tsx`** — Enrichir `ScheduledInterventionData` avec `assignedUsers`
3. **`components/contract/lease-interventions-step.tsx`** — Propager le handler d'assignation + passer les contacts disponibles
4. **`components/contract/contract-form-container.tsx`** — Initialiser `assignedUsers: []`, passer contacts au step, modifier handleSubmit
5. **`app/actions/intervention-actions.ts`** — Ajouter `assignments` param a `createInterventionAction`, creer les `intervention_assignments` apres creation

### Structure des donnees

```typescript
// Ajout a ScheduledInterventionData
interface InterventionAssignment {
  userId: string
  role: 'gestionnaire' | 'prestataire' | 'locataire'
  name: string
}

// Dans ScheduledInterventionData
assignedUsers: InterventionAssignment[]
```

### Comportement UX

1. Chaque ligne d'intervention a un bouton `+` (icone Users) a gauche du Select de date
2. Clic sur `+` → Popover avec 3 sections (Gestionnaires, Prestataires, Locataires du bail)
3. Au premier clic, les locataires du bail sont auto-selectionnes (pre-coches)
4. Checkbox par personne, avec nom et badge role
5. Fermer le Popover → les avatars (initiales) des assignes s'affichent inline
6. Le bouton `+` devient un compteur si > 0 personnes assignees
7. Les interventions desactivees n'affichent pas le bouton

### Logique de soumission

Dans `handleSubmit`, apres `createInterventionAction` :
- Passer `assignments` au server action
- Le server action insere dans `intervention_assignments` en batch

## Hors scope

- Pas de creation de nouveaux contacts depuis le Popover (redirect vers page contacts)
- Pas de distinction is_primary (tous sont non-primary sauf si un seul locataire)
- Pas de notification push pour les assignments (les notifs de creation suffisent)
