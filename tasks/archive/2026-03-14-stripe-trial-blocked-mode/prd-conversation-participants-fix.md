# PRD: Fix Conversation Participants Management

## Contexte

Actuellement, lors de la création d'une intervention, **tous les gestionnaires** de l'équipe sont automatiquement ajoutés comme participants à la conversation générale. Ce comportement est problématique car :

1. Les locataires ne devraient pas voir tous les gestionnaires dans la conversation
2. Seuls les gestionnaires assignés devraient être participants
3. Les autres gestionnaires ont accès via RLS mais ne devraient devenir participants qu'à leur premier message

## Comportement Souhaité

### Création par un Locataire
- **Participants ajoutés** : AUCUN gestionnaire
- **Accès** : Les gestionnaires ont accès via RLS (pas besoin d'être participant)
- **Premier message** : Si un gestionnaire envoie un message alors qu'il n'est pas participant, il est ajouté automatiquement

### Création par un Gestionnaire
- **Participants ajoutés** : UNIQUEMENT les gestionnaires assignés à l'intervention
- **Accès** : Les autres gestionnaires ont accès via RLS
- **Premier message** : Même logique d'ajout automatique

## User Stories

### US-001: Modifier le trigger SQL (XS)
**En tant que** système
**Je veux** que le trigger `add_team_managers_to_thread()` n'ajoute plus tous les gestionnaires
**Afin que** seuls les participants légitimes soient dans la conversation

**Critères d'acceptation:**
- [ ] Le trigger est modifié ou supprimé
- [ ] La migration s'applique sans erreur
- [ ] Typecheck passes (npx tsc --noEmit)

### US-002: Modifier la création d'intervention par locataire (S)
**En tant que** locataire
**Je veux** que ma création d'intervention n'ajoute aucun gestionnaire comme participant
**Afin que** la conversation reste privée jusqu'à leur intervention

**Critères d'acceptation:**
- [ ] À la création, seul le locataire est participant (créateur du thread)
- [ ] Les gestionnaires ont toujours accès via RLS
- [ ] Typecheck passes

### US-003: Modifier la création d'intervention par gestionnaire (S)
**En tant que** gestionnaire
**Je veux** que seuls les gestionnaires assignés soient ajoutés comme participants
**Afin que** la liste des participants reflète les responsables réels

**Critères d'acceptation:**
- [ ] Seuls les gestionnaires avec `intervention_assignments` sont ajoutés
- [ ] Les autres gestionnaires ont accès via RLS mais ne sont pas participants
- [ ] Typecheck passes

### US-004: Ajout automatique au premier message (M)
**En tant que** gestionnaire non-participant
**Je veux** être ajouté comme participant quand j'envoie mon premier message
**Afin que** je puisse suivre la conversation après ma première intervention

**Critères d'acceptation:**
- [ ] Avant l'envoi, vérifier si l'utilisateur est déjà participant
- [ ] Si non-participant, l'ajouter automatiquement
- [ ] Le message est envoyé normalement
- [ ] Typecheck passes
- [ ] Tests passent

## Dépendances

```
US-001 (Schema)
   ↓
US-002 (Backend) ← US-003 (Backend)
   ↓                    ↓
         US-004 (Backend)
```

## Fichiers Concernés

- `supabase/migrations/20260129200005_add_managers_to_conversation_participants.sql` (trigger actuel)
- Nouvelle migration pour modifier le trigger
- `lib/services/domain/intervention/intervention.service.ts`
- `app/actions/intervention-actions.ts`
- `app/actions/message-actions.ts` ou service de messages

## Notes Techniques

- RLS permet déjà aux gestionnaires d'accéder aux conversations de leur équipe
- Le trigger actuel `add_team_managers_to_thread()` est le problème principal
- La table `intervention_assignments` contient les assignations gestionnaire-intervention
