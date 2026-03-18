# PRD: Harmonisation du Systeme de Conversations Interventions

## Contexte et Probleme

### Bug Report Initial
Un prestataire recoit l'erreur `PERMISSION_DENIED` en essayant d'envoyer un message dans sa conversation avec les gestionnaires. De plus, le titre affiche "Discussion generale" au lieu de "Discussion avec les gestionnaires".

### Analyse Root Cause

#### Bug 1: PERMISSION_DENIED pour le prestataire
**Localisation:** `lib/services/domain/conversation-service.ts:889-901`

Dans `checkThreadAccess()`, il existe un cas special pour les locataires mais **PAS pour les prestataires**:

```typescript
// ✅ Locataires ont un fallback (lignes 893-899)
if (thread.data.thread_type === 'tenant_to_managers' && user.role === 'locataire') {
  const tenants = await this.getInterventionTenants(thread.data.intervention_id)
  if (tenants.includes(userId)) return true
}

// ❌ MANQUE: Cas equivalent pour prestataires
```

Le prestataire n'est pas ajoute comme **participant explicite** au thread `provider_to_managers`, donc `isParticipant` retourne `false`.

#### Bug 2: Titre incorrect "Discussion generale"
**Localisation:** `components/chat/chat-interface.tsx:732-735`

Le titre est determine par `getConversationDisplayInfo(thread.thread_type, ...)`. Si `thread` est `null` ou si `thread_type` n'est pas correctement recupere, le fallback est "Conversation".

### Points d'Entree Actuels (Non-Harmonises)

| Point d'Entree | Fichier | Threads Crees | Participants Ajoutes |
|----------------|---------|---------------|---------------------|
| Locataire cree intervention | `api/create-intervention/route.ts` | group, tenant_to_managers | Locataire + managers lot/immeuble |
| Gestionnaire cree intervention | `api/create-manager-intervention/route.ts` | Tous | Locataires + providers + managers assigns |
| Trigger assignment INSERT | `add_assignment_to_conversation_participants` | Cree si manquant | L'utilisateur assigne uniquement |
| Update intervention | `ensureInterventionConversationThreads()` | Tous manquants | Group: oui, Individual: **NON** |
| Service assignUser | `intervention-service.ts:680-765` | Individual | User + managers |

**Probleme Principal:** `ensureInterventionConversationThreads()` cree les threads individuels (`provider_to_managers`) mais **n'ajoute PAS le prestataire comme participant**.

---

## Objectifs

1. **Corriger le bug PERMISSION_DENIED** - Le prestataire doit pouvoir envoyer des messages dans sa conversation
2. **Corriger l'affichage du titre** - Afficher "Gestionnaire" pour le prestataire, pas "Discussion generale"
3. **Harmoniser le systeme** - Un seul point centralise pour gerer la creation des threads et participants
4. **Garantir l'idempotence** - Toutes les operations doivent etre safe a appeler plusieurs fois

---

## Specifications Fonctionnelles

### Regles de Creation de Threads

| Scenario | Threads a Creer |
|----------|-----------------|
| Intervention avec locataire(s) | `group` + `tenant_to_managers` par locataire + `tenants_group` si >1 |
| Intervention avec prestataire(s) | `group` + `provider_to_managers` par prestataire + `providers_group` si grouped mode et >1 |
| Intervention complete | Tous les threads ci-dessus selon les assignments |

### Regles d'Ajout de Participants

| Thread Type | Participants Obligatoires |
|-------------|--------------------------|
| `group` | Tous les locataires + tous les prestataires + gestionnaires actifs (optionnel) |
| `tenant_to_managers` | Le locataire specifique (via `participant_id`) |
| `provider_to_managers` | Le prestataire specifique (via `participant_id`) |
| `tenants_group` | Tous les locataires |
| `providers_group` | Tous les prestataires |

**Note:** Les gestionnaires accedent via RLS (team transparency). Ils deviennent participants explicites uniquement quand ils envoient leur premier message (auto-add existant dans `sendMessage`).

### Point d'Appel Centralise

**Fonction:** `ensureInterventionConversationThreads(interventionId)`
**Fichier:** `app/actions/conversation-actions.ts`

Cette fonction doit etre appelee apres TOUT changement d'assignments:
1. Creation d'intervention par locataire
2. Creation d'intervention par gestionnaire
3. Modification d'intervention (modale planification, page modification)
4. Assignation directe via service

---

## User Stories

### US-001: Fix prestataire thread access
**Priority:** 1 (Critical - Bug fix)
**Size:** S

**As a** prestataire assigne a une intervention
**I want to** envoyer des messages dans ma conversation avec les gestionnaires
**So that** je puisse communiquer sur l'intervention

**Acceptance Criteria:**
- [ ] Le prestataire est ajoute comme participant explicite au thread `provider_to_managers` lors de la creation
- [ ] `checkThreadAccess()` inclut un fallback pour `provider_to_managers` (symetrique au locataire)
- [ ] Le prestataire peut envoyer un message sans erreur PERMISSION_DENIED
- [ ] Typecheck passes (npx tsc --noEmit)

### US-002: Fix conversation title display
**Priority:** 1 (Critical - Bug fix)
**Size:** XS

**As a** prestataire visualisant sa conversation
**I want to** voir le titre "Gestionnaire" ou "Discussion avec les gestionnaires"
**So that** je sache clairement avec qui je communique

**Acceptance Criteria:**
- [ ] Le titre affiche "Gestionnaire" pour un prestataire dans `provider_to_managers`
- [ ] Le thread_type est correctement recupere et passe a `getConversationDisplayInfo()`
- [ ] Typecheck passes (npx tsc --noEmit)

### US-003: Add participant to individual threads in ensureInterventionConversationThreads
**Priority:** 2 (Fix - Harmonization)
**Size:** S

**As a** systeme SEIDO
**I want to** ajouter automatiquement l'utilisateur concerne comme participant a son thread individuel
**So that** les permissions soient correctement configurees

**Acceptance Criteria:**
- [ ] Lors de la creation d'un thread `provider_to_managers`, le prestataire est ajoute comme participant
- [ ] Lors de la creation d'un thread `tenant_to_managers`, le locataire est ajoute comme participant
- [ ] L'operation est idempotente (pas d'erreur si participant existe deja)
- [ ] Typecheck passes (npx tsc --noEmit)

### US-004: Ensure ensureInterventionConversationThreads is called after tenant creates intervention
**Priority:** 2 (Harmonization)
**Size:** S

**As a** systeme SEIDO
**I want to** appeler `ensureInterventionConversationThreads` apres la creation d'intervention par un locataire
**So that** le systeme soit coherent quel que soit le createur

**Acceptance Criteria:**
- [ ] `api/create-intervention/route.ts` appelle `ensureInterventionConversationThreads` apres creation
- [ ] Les threads et participants sont correctement crees pour le locataire
- [ ] Typecheck passes (npx tsc --noEmit)

### US-005: Add integration test for conversation permissions
**Priority:** 3 (Quality)
**Size:** M

**As a** developpeur SEIDO
**I want to** avoir des tests automatises pour les permissions de conversation
**So that** les regressions soient detectees

**Acceptance Criteria:**
- [ ] Test: Locataire peut envoyer dans `tenant_to_managers`
- [ ] Test: Prestataire peut envoyer dans `provider_to_managers`
- [ ] Test: Locataire ne peut PAS envoyer dans `provider_to_managers`
- [ ] Test: Prestataire ne peut PAS envoyer dans `tenant_to_managers`
- [ ] Tests pass (npm test)
- [ ] Typecheck passes (npx tsc --noEmit)

### US-006: Cleanup duplicate trigger logic
**Priority:** 4 (Tech debt)
**Size:** S

**As a** developpeur SEIDO
**I want to** simplifier le trigger `add_assignment_to_conversation_participants`
**So that** la logique ne soit pas dupliquee entre trigger et application

**Acceptance Criteria:**
- [ ] Evaluer si le trigger peut etre simplifie ou supprime
- [ ] Si conserve, documenter clairement son role vs `ensureInterventionConversationThreads`
- [ ] Typecheck passes (npx tsc --noEmit)

---

## Architecture Cible

```
┌─────────────────────────────────────────────────────────────────────┐
│                    POINT D'ENTREE UNIQUE                            │
│         ensureInterventionConversationThreads(interventionId)       │
├─────────────────────────────────────────────────────────────────────┤
│  1. Fetch intervention + assignments                                │
│  2. Fetch existing threads                                          │
│  3. Pour chaque type de thread requis:                              │
│     - Creer si n'existe pas                                         │
│     - Ajouter les participants requis (idempotent)                  │
│  4. Return { created: N }                                           │
└─────────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐   ┌─────────────────┐   ┌─────────────────┐
│ Tenant creates│   │ Manager creates │   │ Update/Planning │
│ intervention  │   │ intervention    │   │ modal           │
└───────────────┘   └─────────────────┘   └─────────────────┘
        │                     │                     │
        └─────────────────────┴─────────────────────┘
                              │
                              ▼
              Trigger add_assignment_to_conversation_participants
              (backup - cree threads si manquants, ajoute participant)
```

---

## Fichiers Impactes

| Fichier | Modifications |
|---------|---------------|
| `lib/services/domain/conversation-service.ts` | Ajouter fallback `provider_to_managers` dans `checkThreadAccess()` |
| `app/actions/conversation-actions.ts` | Ajouter participant au thread individuel dans `ensureInterventionConversationThreads()` |
| `app/api/create-intervention/route.ts` | Appeler `ensureInterventionConversationThreads()` |
| `components/chat/chat-interface.tsx` | Debug si necessaire pour le titre |

---

## Criteres de Succes

1. **Zero erreur PERMISSION_DENIED** pour prestataires/locataires dans leurs threads respectifs
2. **Titres corrects** affiches selon le role du viewer
3. **Tous les tests passent** (existants + nouveaux)
4. **Typecheck clean** (0 erreurs TypeScript)

---

## Risques et Mitigations

| Risque | Mitigation |
|--------|------------|
| Regression sur locataires | US-005 inclut tests pour locataires |
| Double ajout de participants | Toutes les operations sont idempotentes (ON CONFLICT DO NOTHING) |
| Performance (requetes multiples) | `ensureInterventionConversationThreads` utilise deja service role client pour batch |

---

## Timeline Estimee

- US-001 + US-002: Bug fixes critiques (~30 min)
- US-003 + US-004: Harmonisation (~45 min)
- US-005: Tests (~30 min)
- US-006: Tech debt (optionnel)

**Total:** ~2h pour les stories prioritaires

---

## References

- `lib/services/domain/conversation-service.ts:862-906` - checkThreadAccess
- `app/actions/conversation-actions.ts:797-1002` - ensureInterventionConversationThreads
- `supabase/migrations/20260206100000_remove_auto_add_all_managers_trigger.sql` - Latest migration
- `components/chat/chat-interface.tsx:732-755` - Title display logic
