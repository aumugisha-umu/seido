# AI Intervention Agent — Revue critique du design

**Date de l'analyse :** 2026-03-20  
**Document analysé :** `ai-intervention-agent-design.md`  
**Auteur de l'analyse :** Cursor AI  
**Objectif :** Valider le plan, identifier bugs potentiels, incohérences et optimisations.

---

## Synthèse executive

Le design est **globalement solide** et aligné avec l'architecture SEIDO existante. Les principes (même couche service, RLS, ToolLoopAgent, besoins métier bien capturés) sont corrects. La revue identifie **9 points à corriger ou clarifier**, dont 2 bugs potentiels et plusieurs incohérences avec le codebase actuel.

---

## 1. Points validés / bien conçus

### Architecture & sécurité

- **Même couche service** — Réutilisation des repositories existants, pas de bypass. Cohérent avec AGENTS.md.
- **RLS + authenticated client** pour les lectures — Correct, l'agent ne verra que les données de l'équipe.
- **SECURITY DEFINER pour les écritures** — Bon choix pour conserver les règles métier au niveau DB.
- **7 couches de défense** — Rate limit, cost cap, Zod schemas, stopWhen(10), etc. Bien pensé.
- **Audit via `agent_sessions`** — Structure claire pour traçabilité.
- **Intégration avec `activity_logs`** — Aligné avec le pattern existant (AGENTS.md).

### Référentiels techniques

- **Vercel AI SDK** — ToolLoopAgent, `stopWhen: stepCountIs(10)`, `needsApproval` sont bien documentés et supportés.
- **Supabase Database Webhooks** — Support INSERT/UPDATE/DELETE, pg_net async, conforme au design Phase 2.
- **Document extraction** — Pattern déjà utilisé par `extractInterventionSummary` (call-transcript-analyzer.service.ts) avec `generateObject` + Zod + Haiku 4.5. Cohérent.
- **Modèles** — Sonnet 4.5 pour analyse/plans, Haiku 4.5 pour extraction. Bon compromis coût/qualité.

### Modèle métier

- **Statut `demande`** — Existe bien (intervention_status) et est utilisé pour les créations par locataire (create-intervention, intervention-service).
- **`has_external_party`** pour `needsApproval` — Logique correcte : locataire/prestataire impliqués → confirmation requise.
- **Forbidden actions** — Delete, modification de contrats, actions financières, annulation. Sensé.
- **Outils READ** — Les repositories existent : InterventionRepository, BuildingRepository, LotRepository, SupplierContractRepository, ReminderRepository, EmailLinkRepository.getEmailsByEntity, ConversationRepository, etc.

---

## 2. Bugs et erreurs à corriger

### 2.1 Vector embedding : dimension 1536 inadaptée

**Problème :** Migration 4 utilise `vector(1536)`. 1536 correspond aux embeddings **OpenAI** (text-embedding-ada-002). Anthropic ne propose pas d'embeddings natifs et recommande **Voyage AI**, dont les dimensions typiques sont 1024 (défaut), 256, 512 ou 2048.

**Impact :** Si vous utilisez Voyage (recommandé par Anthropic), la migration échouera ou les embeddings ne seront pas compatibles avec l'index.

**Action :**

- Choisir le provider d'embeddings (OpenAI, Voyage, autre).
- Adapter la migration à la dimension du provider : 1536 pour OpenAI, 1024 ou 2048 pour Voyage.
- Documenter ce choix dans le design.

### 2.2 Document type `contrat` absent de l'enum

**Problème :** Le schéma d'extraction définit un format pour `// contrat (supplier)` mais l'enum `intervention_document_type` ne contient pas `contrat`. Valeurs actuelles : rapport, photo_avant, photo_apres, facture, devis, plan, certificat, garantie, bon_de_commande, autre, email, note_vocale, rapport_appel_ia.

**Constat :** Les contrats fournisseurs sont stockés dans `supplier_contract_documents` (table séparée), pas dans `intervention_documents`. Le design parle d'`UPDATE intervention_documents SET ai_extracted_metadata`, donc uniquement pour `intervention_documents`.

**Action :**

- Supprimer le schéma d'extraction pour `contrat` dans la section 4, ou
- Ajouter `contrat` à `intervention_document_type` si des documents de contrat doivent être attachés aux interventions et extraits par l'IA (à clarifier).

---

## 3. Incohérences et clarifications

### 3.1 `needsApproval` : signature incorrecte

**Problème :** Le design utilise :

```typescript
needsApproval: async (args, context) => {
  if (ALWAYS_SAFE_TOOLS.includes(toolName)) return false
  const hasExternalParty = context.assignments.some(...)
  return hasExternalParty
}
```

Dans l'API Vercel AI SDK, `needsApproval` reçoit uniquement les **arguments du tool** (le `input` parsé), pas un deuxième paramètre `context`. Exemple documenté : `needsApproval: async ({ amount }) => amount > 1000`.

**Action :** Injecter le contexte via **closure** au moment de la création des tools :

```typescript
const createTools = (interventionContext: { assignments: Assignment[] }) => ({
  assignProvider: tool({
    // ...
    needsApproval: async () => {
      return interventionContext.assignments.some(a => a.role !== 'gestionnaire')
    },
    execute: async (args) => { /* ... */ }
  })
})
```

Le design doit être corrigé pour refléter cette approche (factory + closure).

### 3.2 `queryContracts` : tenant vs supplier

**Problème :** Le design mentionne "Lot/building contracts (supplier contracts, clauses, dates)" et `SupplierContractRepository`. En revanche, pour une intervention, les contrats de **bail** (tenant) sont souvent aussi pertinents (qui habite le lot, dates de bail, etc.).

**État du code :**

- `ContractRepository` — contrats de bail (lots, locataires)
- `SupplierContractRepository` — contrats fournisseurs (maintenance, copropriété)

**Action :**

- Préciser si `queryContracts` retourne uniquement les contrats fournisseurs, ou aussi les baux.
- Si besoin des deux, étendre l'outil pour interroger aussi `ContractRepository` (findActiveByBuilding, findActiveByLot, etc.).

### 3.3 `queryReminders` : méthodes manquantes

**Problème :** Le design indique : "Existing reminders on the property/contact/contract". `ReminderRepository` a : `findByTeam`, `findByAssignedTo`, `getStats`. Il n'y a pas de `findByBuilding`, `findByLot`, `findByContact` ou `findByContract`, alors que la table `reminders` contient `building_id`, `lot_id`, `contact_id`, `contract_id`.

**Action :**

- Ajouter à `ReminderRepository` des méthodes du type : `findByBuilding`, `findByLot`, `findByContact`, `findByContract`, ou
- Créer une méthode combinée : `findByInterventionContext({ buildingId?, lotId?, contactIds?, contractIds? })`.
- Mettre à jour le design pour indiquer que ces méthodes doivent être créées.

### 3.4 `queryDocuments` et repository

**Problème :** Le design cite `DocumentRepository`. Il n'existe pas de repository dédié aux `intervention_documents`. L'accès se fait via `supabase.from('intervention_documents')` ou via des jointures dans `InterventionRepository` / services.

**Action :**

- Créer un `InterventionDocumentRepository` (ou équivalent) pour centraliser les opérations sur `intervention_documents`, ou
- Documenter que `queryDocuments` utilise un accès direct à la table / au service existant, si c'est l'approche retenue.
- Le design doit être aligné avec l'implémentation choisie.

---

## 4. Risques et précautions

### 4.1 Webhook auto-analyze : authentification

**Problème :** Le webhook Supabase appelle `POST /api/agent/auto-analyze`. Les Database Webhooks sont exécutés côté DB (pg_net) et n'ont pas de session utilisateur ni de cookies. Le flux doit être authentifié autrement.

**Actions recommandées :**

- Utiliser une clé secrète partagée (header `X-Webhook-Secret` ou équivalent), stockée en variable d'environnement et vérifiée par la route.
- Ou utiliser un JWT signé par un secret connu uniquement du projet.
- Documenter ce mécanisme d'auth dans la section Phase 2 et dans la route `/api/agent/auto-analyze`.

### 4.2 Race condition sur le trigger `demande`

**Problème :** Le webhook se déclenche sur `INSERT interventions (status='demande')`. Or, la création d'une intervention suit souvent un flux en plusieurs étapes (INSERT puis assignations, threads, etc.). Si l'agent analyse trop tôt, il peut manquer des données (assignments, conversations, etc.).

**Actions recommandées :**

- Attendre la fin du flux de création (assignations, threads) avant d'appeler l'agent, ou
- Utiliser un trigger `AFTER INSERT` qui vérifie que les données critiques sont présentes, ou
- Déclencher l'agent via un `pg_cron` / job différé (ex. 5–10 s après l'INSERT) pour laisser le temps au flux de se terminer.
- Documenter la stratégie choisie dans le design.

### 4.3 "Approve All" depuis la notification

**Problème :** Le design parle de "One-tap" via magic link pour exécuter toutes les actions sensibles. Cela suppose une validation forte (token unique, usage unique, expiration courte) pour éviter les abus.

**Action :** Vérifier que le pattern existant des magic links (email action links) fournit déjà ces garanties. Si non, définir les règles de sécurité (durée de vie, single-use, scope limité).

---

## 5. Optimisations suggérées

### 5.1 Contexte agent : chargement par vagues

Le design prévoit de nombreux outils READ. Pour limiter la latence et le coût :

- Charger les données de base (intervention, building/lot, contrats) en **premier** (Wave 1).
- Charger l'historique, les documents, les emails, etc. **uniquement si le modèle en a besoin** (Wave 2, via appels d'outils).
- Déjà mentionné implicitement par l'usage des tools ; à rendre explicite dans le prompt ou la doc.

### 5.2 Document extraction : fallback

Comme pour `extractInterventionSummary` (AGENTS.md #127) : en cas d'erreur de l'API Anthropic, éviter de bloquer tout le flux.

**Action :** Envelopper l'appel d'extraction dans un `try/catch` et prévoir un fallback (metadata minimal, ex. `{ error: true }` ou champs vides) pour ne pas faire échouer l'upload.

### 5.3 Index IVFFlat et paramètre `lists`

La migration utilise `USING ivfflat (ai_embedding vector_cosine_ops) WITH (lists = 100)`. La valeur `lists` doit être adaptée à la taille des données. Règle courante : `lists ≈ sqrt(row_count)` pour un bon équilibre précision/performance.

**Action :** Pour un volume faible (ex. < 10k documents), `lists = 100` peut convenir. Documenter que ce paramètre pourra être ajusté en production selon le volume.

---

## 6. Checklist de conformité avec le codebase

| Élément du design | État dans le codebase | Action |
|-------------------|-----------------------|--------|
| `intervention_status` = demande | ✅ Existe | - |
| `intervention_document_type` | ✅ rapport, facture, devis... (sans `contrat`) | Supprimer ou adapter le schéma `contrat` |
| `SupplierContractRepository` | ✅ Existe | - |
| `ReminderRepository` | ✅ Existe | Ajouter findByBuilding/Lot/Contact/Contract ou méthode équivalente |
| `EmailLinkRepository.getEmailsByEntity` | ✅ Existe (entity_type = 'intervention') | - |
| `ContractRepository` (baux) | ✅ Existe | Préciser si `queryContracts` doit inclure les baux |
| `teams` table | ✅ Pas de ai_monthly_budget | Migration 3 conforme |
| `intervention_documents` | ✅ Table existante | Migration 1 conforme |
| Document extraction (Haiku) | ✅ Pattern dans call-transcript-analyzer | Réutiliser le pattern |

---

## 7. Recommandations finales

1. **Avant implémentation :**
   - Corriger la dimension des embeddings (2.1).
   - Supprimer ou adapter le schéma d'extraction pour `contrat` (2.2).
   - Mettre à jour la description de `needsApproval` (3.1).
   - Clarifier l'auth du webhook auto-analyze (4.1).

2. **Pendant l'implémentation :**
   - Étendre `ReminderRepository` pour les recherches par propriété/contact/contrat.
   - Créer ou documenter un repository pour `intervention_documents` si nécessaire.
   - Ajouter un `try/catch` avec fallback autour de l'extraction de documents.
   - Valider la stratégie de déclenchement de l'agent (immédiat vs différé) pour les interventions en statut `demande`.

3. **Le design reste valide pour :**
   - L'architecture globale et les principes de sécurité.
   - L'ordre d'implémentation en phases.
   - La structure des tables et des APIs.
   - L'utilisation du Vercel AI SDK et de Supabase.

---

*Document généré le 2026-03-20*
