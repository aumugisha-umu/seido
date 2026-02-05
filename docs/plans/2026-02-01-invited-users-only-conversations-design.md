# Design: Conversations et Notifications pour Utilisateurs Invités Uniquement

**Date**: 2026-02-01
**Status**: Validé
**Auteur**: Claude Code + Utilisateur

## Contexte

Le système SEIDO permet d'ajouter des contacts à une intervention même s'ils n'ont pas de compte dans l'application (pas d'`auth_id`). Ces contacts "informatifs" sont utiles pour la traçabilité mais ne doivent pas :
- Avoir de conversation individuelle créée
- Être ajoutés aux participants des conversations
- Recevoir de notifications (in-app ou email)

## Règle Métier

> **Un utilisateur sans `auth_id` (non invité) :**
> - ✅ Peut être affiché dans les listes de sélection (informatif)
> - ✅ Peut être assigné à une intervention (traçabilité)
> - ❌ N'a PAS de conversation individuelle créée
> - ❌ N'est PAS ajouté aux participants des conversations
> - ❌ Ne reçoit PAS de notifications (in-app ou email)

## État Actuel

| Composant | Filtre auth_id | Status |
|-----------|---------------|--------|
| NotificationRepository.getInterventionWithManagers() | ✅ Déjà filtré | OK |
| create-manager-intervention/route.ts (création threads) | ❌ Aucun filtre | À corriger |
| intervention-service.ts (assignUser) | ❌ Aucun filtre | À corriger |
| conversation-actions.ts (lazy creation) | ❌ Aucun filtre | À corriger |
| UI - Wizard de création | ❌ Aucun indicateur | À ajouter |

## Modifications Requises

### 1. Backend - create-manager-intervention/route.ts

**Lignes 426-444** : Ajouter le filtre `auth_id IS NOT NULL` lors de la récupération des tenants et providers pour la création des threads.

```typescript
// Fetch tenants WITH auth accounts only
const { data: tenantUsers } = await supabase
  .from('users')
  .select('id, name, auth_id')
  .in('id', selectedTenantIds)
  .not('auth_id', 'is', null)  // Seulement les utilisateurs invités

// Fetch providers WITH auth accounts only
const { data: providerUsers } = await supabase
  .from('users')
  .select('id, name, auth_id')
  .in('id', selectedProviderIds)
  .not('auth_id', 'is', null)  // Seulement les utilisateurs invités
```

### 2. Backend - intervention-service.ts

Dans la méthode `assignUser()`, vérifier que l'utilisateur a un `auth_id` avant de créer le thread individuel.

```typescript
// Vérifier si l'utilisateur est invité (a un compte)
const { data: userData } = await this.interventionRepo.supabase
  .from('users')
  .select('id, auth_id')
  .eq('id', userId)
  .single()

// Créer le thread individuel SEULEMENT si l'utilisateur est invité
if (userData?.auth_id) {
  await this.conversationRepo.createThread({...})
}
```

### 3. Backend - conversation-actions.ts

Lors de la lazy creation de threads, vérifier `auth_id` :

```typescript
const { data: userToAdd } = await supabase
  .from('users')
  .select('id, name, role, auth_id')
  .eq('id', userId)
  .single()

// Ne créer le thread que si l'utilisateur est invité
if (userToAdd?.auth_id) {
  // Créer le thread individuel...
}
```

### 4. Frontend - Indicateurs visuels

Dans les composants de sélection du wizard, afficher un indicateur pour les contacts sans compte :

| État | Badge/Icône | Tooltip |
|------|-------------|---------|
| Utilisateur invité | ✉️ ou rien | "Recevra les notifications" |
| Contact informatif | 📋 "Non invité" (grisé) | "Ce contact n'a pas de compte. Il ne recevra pas de notifications." |

## Fichiers Impactés

### Backend - Filtrage conversations/notifications
1. `app/api/create-manager-intervention/route.ts` ✅
2. `lib/services/domain/intervention-service.ts` ✅
3. `app/actions/conversation-actions.ts` ✅

### Data Flow - Propagation `has_account`
4. `lib/services/repositories/contract.repository.ts` ✅ (ajout `auth_id` aux selects)
5. `lib/services/domain/contract.service.ts` ✅ (ajout `has_account` aux retours)
6. `app/actions/contract-actions.ts` ✅ (types + mapping)

### UI - Indicateurs visuels
7. `components/intervention/assignment-section-v2.tsx` ✅ (badge "Non invité")
8. `app/gestionnaire/(no-navbar)/interventions/nouvelle-intervention/nouvelle-intervention-client.tsx` ✅
9. `app/gestionnaire/(no-navbar)/interventions/modifier/[id]/intervention-edit-client.tsx` ✅

## Tests à Effectuer

1. Créer une intervention avec un locataire invité et un non-invité
2. Vérifier que seul le locataire invité a un thread individuel
3. Vérifier que seul le locataire invité reçoit des notifications
4. Vérifier l'affichage de l'indicateur "Non invité" dans le wizard
5. Tester en mode édition d'intervention

## Implémentation Complétée

**Date**: 2026-02-01
**Statut**: ✅ Implémenté
