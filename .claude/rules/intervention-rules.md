---
paths:
  - "lib/services/domain/intervention*"
  - "lib/services/repositories/intervention*"
  - "app/api/intervention*"
  - "components/intervention/**"
  - "app/**/interventions/**"
---

# Règles Intervention - SEIDO

> Ces règles s'appliquent UNIQUEMENT quand tu travailles sur des fichiers
> correspondant aux patterns ci-dessus.

## Transitions de Statut Valides

```
demande → approuvee (gestionnaire uniquement)
demande → rejetee (gestionnaire uniquement)
approuvee → demande_de_devis (gestionnaire)
demande_de_devis → planification (après devis approuvé)
planification → planifiee (après time slot confirmé)
planifiee → en_cours (début intervention)
en_cours → cloturee_par_prestataire (prestataire termine)
cloturee_par_prestataire → cloturee_par_locataire (locataire valide)
cloturee_par_locataire → cloturee_par_gestionnaire (gestionnaire finalise)

Tout statut → annulee (gestionnaire uniquement)
```

## Avant Toute Modification

1. **Lire** `lib/services/domain/intervention-service.ts`
2. **Vérifier** les RLS policies dans les migrations
3. **Utiliser** notification server actions pour changements de statut

## Notifications Obligatoires

Utiliser les Server Actions pour notifier les changements :

```typescript
import {
  createInterventionNotification,
  notifyInterventionStatusChange
} from '@/app/actions/notification-actions'

// À la création
await createInterventionNotification(interventionId)

// Au changement de statut
await notifyInterventionStatusChange({
  interventionId,
  oldStatus,
  newStatus,
  reason // optionnel pour rejet/annulation
})
```

## Tables Associées

| Table | Description | Relation |
|-------|-------------|----------|
| interventions | Table principale | - |
| intervention_assignments | Affectations prestataires | intervention_id |
| intervention_quotes | Devis | intervention_id |
| intervention_time_slots | Créneaux | intervention_id (team_id auto) |
| intervention_documents | Documents | intervention_id |
| intervention_comments | Commentaires | intervention_id |
| intervention_links | Liens | intervention_id |
| conversation_threads | Threads chat | intervention_id |

## Fichiers de Référence

- Service: `lib/services/domain/intervention-service.ts`
- Repository: `lib/services/repositories/intervention.repository.ts`
- Actions: `app/actions/notification-actions.ts`
- Guide: `docs/guides/cycle-complet-intervention.md`
- Types: `lib/database.types.ts` (InterventionStatus enum)

## Anti-Patterns à Éviter

❌ Changer le statut sans vérifier les droits du rôle
❌ Oublier de notifier les parties prenantes
❌ Accéder directement à la table sans passer par le repository
❌ Ignorer le workflow de statuts (sauter des étapes)

---

## Skills pour Interventions

**Avant modification workflow interventions**:

| Etape | Skill | Pourquoi |
|-------|-------|----------|
| 1 | `sp-brainstorming` | Comprendre l'impact sur les 4 roles |
| 2 | `sp-test-driven-development` | Tests des transitions de statut |
| 3 | `sp-verification-before-completion` | Apres modification |

### Red Flags Intervention

| Pensee | Skill |
|--------|-------|
| "Je vais modifier une transition..." | `sp-brainstorming` |
| "Bug sur le statut..." | `sp-systematic-debugging` |
| "Nouvelle etape workflow..." | `sp-brainstorming` + `sp-writing-plans` |
