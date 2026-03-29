# Module Banque SEIDO — Ponto Connect (Isabel Group)

**Date**: 2026-03-26
**Auteur**: Claude + Brainstorming Session
**Statut**: Design valide — pret pour PRD
**Branche cible**: `feature/bank-module-ponto`
**Revision**: v1.2 — Adaptation du design Tink v3 vers Ponto Connect (corrections post-double-review)
**Remplace**: `2026-03-19-bank-module-tink-integration.md` (Tink — abandonne, approbation prod bloquee)

---

## Table des matieres

0. [Setup initial — Onboarding Ponto + Env Vars](#0-setup-initial--onboarding-ponto--env-vars)
1. [Pourquoi Ponto (pas Tink)](#1-pourquoi-ponto-pas-tink)
2. [Vision & Objectifs](#2-vision--objectifs)
3. [Architecture technique](#3-architecture-technique)
4. [Client HTTP Ponto (3 couches)](#4-client-http-ponto-3-couches)
5. [Schema DB — Migration](#5-schema-db--migration)
6. [Flows utilisateur](#6-flows-utilisateur)
7. [API Routes](#7-api-routes)
8. [Fonctionnalites detaillees](#8-fonctionnalites-detaillees)
9. [Securite & RGPD](#9-securite--rgpd)
10. [Phases d'implementation](#10-phases-dimplementation)

---

## 0. Setup initial — Onboarding Ponto + Env Vars

### 0.1 Creer un compte Isabel / Ponto Connect

1. Aller sur **[https://www.myponto.com](https://www.myponto.com)** → "Get started" ou "Developer"
2. Creer un compte organisation (email + nom societe SEIDO)
3. Une fois connecte, acceder au **Dashboard developpeur** : `https://dashboard.myponto.com`

### 0.2 Creer une integration Ponto Connect

Dans le dashboard Ponto :

1. **Integrations** (barre laterale) → **"Ajoutez une integration"**
2. Remplir :
   - **Nom** : `SEIDO`
   - **Redirect URIs** :
     - Sandbox : `http://localhost:3000/api/bank/oauth/callback`
     - Production : `https://seido-app.com/api/bank/oauth/callback`
   - **Payment redirect URIs** :
     - Sandbox : `http://localhost:3000/api/bank/payments/callback`
     - Production : `https://seido-app.com/api/bank/payments/callback`
   - **Scopes** : cocher `ai` (Account Information), `pi` (Payment Initiation), `offline_access`, `name`
3. **Sauvegarder** → noter le `Client ID` et `Client Secret` generes

### 0.3 Generer le certificat mTLS

Dans le dashboard Ponto :

1. **Certificates** → "Generate new certificate"
2. Ponto genere une paire :
   - `certificate.pem` — le certificat client
   - `private_key.pem` — la cle privee
3. **Telecharger les deux fichiers immediatement** (la cle privee n'est montree qu'une fois)
4. Encoder en base64 pour les env vars :
   ```bash
   # macOS / Linux
   base64 -i certificate.pem -o cert_b64.txt
   base64 -i private_key.pem -o key_b64.txt

   # Windows (PowerShell)
   [Convert]::ToBase64String([IO.File]::ReadAllBytes("certificate.pem")) | Out-File cert_b64.txt
   [Convert]::ToBase64String([IO.File]::ReadAllBytes("private_key.pem")) | Out-File key_b64.txt
   ```
5. Verifier la taille : le contenu base64 doit faire **< 4KB** (limite Vercel env vars). Un certificat PEM standard fait ~1.5KB en base64.

### 0.4 Configurer le webhook (optionnel Phase 1, recommande)

Dans le dashboard Ponto :

1. **Webhooks** → "Add webhook endpoint"
2. **URL** : `https://seido-app.com/api/bank/webhooks`
3. **Events** : cocher tous les events `pontoConnect.*` disponibles
4. **Signing secret** : noter le secret genere (pour verification signature)

### 0.5 Activer le sandbox

Dans le dashboard Ponto :

1. **Sandbox** → "Enable sandbox mode"
2. Ponto cree automatiquement des comptes bancaires fictifs avec des transactions de test
3. Les URLs sandbox sont :
   - Authorization : `https://sandbox-authorization.myponto.com/oauth2/auth`
   - Token : `https://sandbox-token.myponto.com/oauth2/token`
   - API : `https://api.ibanity.com` (meme URL, le sandbox est gere par le certificat)

### 0.6 Env vars a configurer

| Variable | Ou la trouver | Valeur exemple |
|----------|---------------|----------------|
| `PONTO_CLIENT_ID` | Dashboard Ponto → Integrations → votre integration → Client ID | `b5ddd91d-a600-4268-956f-1dc7023fb6ad` |
| `PONTO_CLIENT_SECRET` | Dashboard Ponto → Integrations → votre integration → Client Secret | `2aa72295-6247-4c18-8cb3-05495b50a344` |
| `PONTO_CLIENT_CERT_B64` | Contenu de `cert_b64.txt` (etape 0.3) | `LS0tLS1CRUdJTi...` (long string base64) |
| `PONTO_CLIENT_KEY_B64` | Contenu de `key_b64.txt` (etape 0.3) | `LS0tLS1CRUdJTi...` (long string base64) |
| `PONTO_SANDBOX` | — | `true` (dev/staging) / `false` (production) |
| `PONTO_REDIRECT_URI` | Doit correspondre exactement a ce qui est dans le dashboard Ponto | `https://seido-app.com/api/bank/oauth/callback` |
| `PONTO_PAYMENT_REDIRECT_URI` | Idem | `https://seido-app.com/api/bank/payments/callback` |
| `PONTO_WEBHOOK_SECRET` | Dashboard Ponto → Webhooks → votre endpoint → Signing secret | `whsec_...` |

**Configuration locale (.env.local) :**
```env
# Ponto Connect (Isabel Group)
PONTO_CLIENT_ID=b5ddd91d-a600-4268-956f-1dc7023fb6ad
PONTO_CLIENT_SECRET=2aa72295-6247-4c18-8cb3-05495b50a344
PONTO_CLIENT_CERT_B64=LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0t...
PONTO_CLIENT_KEY_B64=LS0tLS1CRUdJTiBQUklWQVRFIEtFWS0t...
PONTO_SANDBOX=true
PONTO_REDIRECT_URI=http://localhost:3000/api/bank/oauth/callback
PONTO_PAYMENT_REDIRECT_URI=http://localhost:3000/api/bank/payments/callback
PONTO_WEBHOOK_SECRET=whsec_your_signing_secret
```

**Configuration Vercel (production) :**

1. Aller sur **Vercel Dashboard** → votre projet SEIDO → **Settings** → **Environment Variables**
2. Ajouter chaque variable ci-dessus avec les valeurs production
3. **Scope** : `Production` uniquement (pas Preview, pour eviter les appels sandbox en preview)
4. Pour `PONTO_SANDBOX` : mettre `false` en production, `true` en preview

> **SECURITE** : Ne jamais committer les fichiers `.pem` ou les valeurs des env vars dans le repo. Les fichiers `cert_b64.txt` et `key_b64.txt` doivent etre supprimes apres configuration.

### 0.7 Checklist pre-developpement

- [ ] Compte Ponto cree et integration enregistree
- [ ] Client ID + Client Secret notes
- [ ] Certificat mTLS genere, telecharge, et encode en base64
- [ ] Redirect URIs configurees dans le dashboard Ponto (localhost + prod)
- [ ] Sandbox active et teste (connexion manuelle dans l'interface Ponto)
- [ ] Env vars configurees en local (`.env.local`)
- [ ] Env vars configurees sur Vercel (production)
- [ ] Webhook endpoint configure (optionnel Phase 1)
- [ ] Fichiers PEM supprimes du disque apres encodage

---

## 1. Pourquoi Ponto (pas Tink)

### Decision

| Critere | Tink | Ponto Connect | Verdict |
|---------|------|---------------|---------|
| **Marche belge** | Bon | **Dominant** (Isabel = leader BE) | Ponto |
| **Approbation prod** | **Bloquee** | Processus direct | Ponto |
| **Concurrent direct** | — | Smovin utilise Ponto | Ponto (parite) |
| **SDK Node.js** | **Oui** (officiel) | Non (REST pur) | Tink |
| **Complexite auth** | OAuth2 simple | mTLS + PKCE + certs | Tink |
| **PIS (paiements)** | Oui | **Oui** (single + bulk SEPA) | Egal |
| **Webhooks** | Oui | Oui | Egal |
| **Pricing** | Per-user | ~4€/mois/compte | Egal |
| **Couverture EU** | 6000+ banques | 1800+ banques (15 pays) | Tink |
| **Regulation** | Licensed (Suede) | Licensed AISP+PISP (BNB) | Egal |

**Raison du switch** : L'approbation de l'app Tink en production etait bloquee. Ponto (Isabel Group) est le provider dominant en Belgique, notre marche principal. La complexite technique supplementaire (mTLS, pas de SDK) est compensee par la fiabilite de l'onboarding et la position de marche.

### Ce qui change vs. le design Tink

| Couche | Impact | Detail |
|--------|--------|--------|
| **tink-api.service.ts** | **Remplace** | → 3 fichiers : `ponto-http.client.ts`, `ponto-auth.service.ts`, `ponto-api.service.ts` |
| **DB schema** | **Rename** | Colonnes `tink_*` → noms generiques + ajout `provider` + 2 tables paiement |
| **bank-sync.service.ts** | **Adapte** | Mapping JSON:API → types internes (structure differente de Tink V2) |
| **bank-matching.service.ts** | **Inchange** | 100% provider-agnostic |
| **UI components (10)** | **Inchange** | Zero changement |
| **Types/validation** | **Adapte** | Types API Ponto + types paiement |
| **API routes** | **Adapte** | Endpoints callback + paiements |
| **Scope MVP** | **Elargi** | AIS + PIS (paiements single + bulk) des le MVP |

---

## 2. Vision & Objectifs

### Probleme

Les gestionnaires immobiliers passent **10h+/mois** a reconcilier manuellement les transactions bancaires avec les loyers attendus et les factures d'intervention dans Excel. Ils n'ont aucune vue centralisee sur la rentabilite de leur patrimoine. Le paiement des prestataires necessite de jongler entre l'app bancaire et SEIDO.

### Solution

Un module "Banque" integre dans SEIDO qui :
- Connecte les comptes bancaires via **Ponto Connect** (Open Banking PSD2)
- Synchronise les transactions automatiquement
- Propose des rapprochements intelligents avec les echeances de contrat et les interventions
- Apprend des habitudes pour auto-lier les transactions recurrentes
- **Paie les prestataires directement** (SEPA single + bulk via PIS)
- Produit des rapports de rentabilite par contrat, lot et immeuble

### Objectifs mesurables

| Metrique | Cible |
|----------|-------|
| Temps de reconciliation hebdomadaire (100 lots) | < 8 minutes (vs 2h+ manuellement) |
| Taux d'auto-matching (apres 3 mois d'usage) | > 70% des transactions |
| Adoption du module (gestionnaires actifs) | > 60% dans les 3 mois post-lancement |
| Connexion premiere banque | < 5 minutes |
| Paiement prestataire (intervention → paye) | < 2 minutes |

---

## 3. Architecture technique

```
┌─────────────────────────────────────────────────────────┐
│                    SEIDO App (Vercel)                     │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ UI Components│  │ API Routes   │  │ Cron Jobs     │  │
│  │ (10 existants)│  │ /api/bank/*  │  │ sync-bank-tx  │  │
│  └──────┬───────┘  └──────┬───────┘  └───────┬───────┘  │
│         │                 │                   │          │
│  ┌──────▼─────────────────▼───────────────────▼───────┐  │
│  │              Service Layer                         │  │
│  │  bank-sync.service  ←→  bank-matching.service      │  │
│  │                                                    │  │
│  │  ┌──────────────────────────────────────────────┐  │  │
│  │  │           ponto-api.service.ts               │  │  │
│  │  │   accounts() transactions() payments()       │  │  │
│  │  ├──────────────────────────────────────────────┤  │  │
│  │  │           ponto-auth.service.ts              │  │  │
│  │  │   getAuthUrl() exchangeCode() refreshToken() │  │  │
│  │  ├──────────────────────────────────────────────┤  │  │
│  │  │           ponto-http.client.ts               │  │  │
│  │  │   mTLS agent, JSON:API parser, pagination    │  │  │
│  │  └──────────────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────────┘  │
│                          │                               │
│  ┌───────────────────────▼────────────────────────────┐  │
│  │              Repository Layer                      │  │
│  │  bank-connection.repo  bank-transaction.repo       │  │
│  │  bank-payment.repo (NEW)                           │  │
│  └────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                           │
                    mTLS + OAuth2 PKCE
                           │
               ┌───────────▼───────────┐
               │   Ponto Connect API   │
               │   api.ibanity.com     │
               │                       │
               │  AIS: comptes, tx     │
               │  PIS: single + bulk   │
               │  Webhooks             │
               └───────────────────────┘
```

### Fichiers

| Fichier | Statut | Responsabilite |
|---------|--------|----------------|
| `lib/services/domain/ponto-http.client.ts` | **NOUVEAU** | mTLS agent, JSON:API parsing, pagination curseur |
| `lib/services/domain/ponto-auth.service.ts` | **NOUVEAU** | OAuth2 PKCE flow, token refresh, token storage |
| `lib/services/domain/ponto-api.service.ts` | **NOUVEAU** (remplace `tink-api.service.ts`) | Methodes metier : accounts, transactions, payments, sync |
| `lib/services/domain/bank-sync.service.ts` | **ADAPTE** | Mapping JSON:API → types internes |
| `lib/services/domain/bank-matching.service.ts` | **INCHANGE** | Matching intelligent provider-agnostic |
| `lib/services/repositories/bank-payment.repository.ts` | **NOUVEAU** | CRUD paiements + items |
| `lib/services/repositories/bank-connection.repository.ts` | **ADAPTE** | Colonnes renommees |
| `lib/services/repositories/bank-transaction.repository.ts` | **ADAPTE** | Colonnes renommees |
| `lib/types/bank.types.ts` | **ADAPTE** | Types Ponto + types paiement |
| `lib/validation/bank-schemas.ts` | **ADAPTE** | Schemas Zod adaptes |
| `components/bank/*` | **INCHANGE** | 10 composants UI (1,825 LOC) |
| `app/api/bank/*` | **ADAPTE** | Endpoints callback + paiements |

---

## 4. Client HTTP Ponto (3 couches)

### 4.1 `ponto-http.client.ts` — Transport mTLS + JSON:API

**Responsabilites :**
1. Agent HTTPS mTLS (certificat client)
2. Headers JSON:API (`Accept: application/vnd.api+json`)
3. Parsing des reponses JSON:API (unwrap `data.attributes`, merge `id`)
4. Pagination curseur (`page[after]`, `page[limit]`)
5. Error handling (codes HTTP Ponto, rate limiting)

**mTLS :**
```typescript
import https from 'https'

// Certificat + cle depuis env vars (base64 → Buffer)
const cert = Buffer.from(process.env.PONTO_CLIENT_CERT_B64!, 'base64')
const key = Buffer.from(process.env.PONTO_CLIENT_KEY_B64!, 'base64')
const httpsAgent = new https.Agent({ cert, key, keepAlive: true })
```

**JSON:API parsing :**
```typescript
// Ponto renvoie :
// { "data": { "id": "xxx", "type": "account", "attributes": { ... }, "relationships": { ... } } }
// On transforme en :
// { id: "xxx", type: "account", ...attributes, relationships: { accountId: "xxx" } }

interface JsonApiResource<T> {
  id: string
  type: string
  attributes: T
  relationships?: Record<string, { data: { id: string; type: string } }>
}

function unwrapResource<T>(resource: JsonApiResource<T>): T & { id: string } {
  return { id: resource.id, ...resource.attributes }
}
```

**Pagination curseur :**
```typescript
async function* paginate<T>(endpoint: string, limit = 100): AsyncGenerator<T[]> {
  let after: string | null = null
  do {
    const response = await request<{ data: JsonApiResource<T>[]; meta: { paging: { after: string | null } } }>(
      endpoint,
      { 'page[limit]': limit, ...(after ? { 'page[after]': after } : {}) }
    )
    yield response.data.map(unwrapResource)
    after = response.meta.paging.after
  } while (after)
}
```

**URLs conditionnelles (sandbox vs live) :**

| Service | Sandbox | Live |
|---------|---------|------|
| Authorization | `sandbox-authorization.myponto.com` | `authorization.myponto.com` |
| Token | `sandbox-token.myponto.com` | `token.myponto.com` |
| API | `api.ibanity.com` | `api.ibanity.com` |

> Note : L'API principale utilise la meme URL en sandbox et live. Seuls les endpoints auth different.

### 4.2 `ponto-auth.service.ts` — OAuth2 PKCE

**Flow d'autorisation :**

| Etape | Detail |
|-------|--------|
| **1. Generate PKCE** | `code_verifier` (128 chars random) → SHA256 → base64url = `code_challenge` |
| **2. Authorization URL** | `GET {authBase}/oauth2/auth?client_id=X&redirect_uri=Y&response_type=code&scope=ai%20pi%20offline_access&state=Z&code_challenge=C&code_challenge_method=S256` (scopes URL-encoded : `%20` entre chaque scope) |
| **3. Callback** | Recoit `?code=AUTH_CODE&state=STATE` |
| **4. Token exchange** | `POST {tokenBase}/oauth2/token` avec `grant_type=authorization_code`, `code`, `code_verifier`, `client_id`, `client_secret` |
| **5. Token storage** | `access_token` (30min) + `refresh_token` (30j) → chiffres via EncryptionService → `bank_connections` |
| **6. Auto-refresh** | Avant chaque appel API : check `token_expires_at`. Si expire → `POST /oauth2/token` avec `grant_type=refresh_token` |

**Scopes :**
- `ai` — Account Information Service (lecture comptes + transactions)
- `pi` — Payment Initiation Service (creation paiements SEPA)
- `offline_access` — Refresh token (sync en background sans user present)
- `name` — Nom de l'organisation cliente

**Tokens :**

| Token | Duree | Refresh |
|-------|-------|---------|
| Access token | ~30 min (varie selon `expires_in` dans la reponse — ne pas hardcoder) | Via refresh token |
| Refresh token | ~30 jours | Nouveau refresh token a chaque refresh |

> **Important** : Chaque refresh retourne un NOUVEAU refresh token. L'ancien est invalide. Stocker atomiquement les deux tokens a chaque refresh.

> **Atomicite du refresh** : Risque de race condition si deux workers (cron + API user) refresh le meme token simultanement. Solution : creer une fonction RPC PostgreSQL `refresh_bank_token_lock(connection_id)` qui utilise `SELECT ... FOR UPDATE` dans une transaction explicite. Indispensable car Supabase utilise le connection pooling en mode transaction — un simple `FOR UPDATE` sans transaction explicite cote client serait inefficace. La fonction : (1) verrouille la ligne, (2) check si `token_expires_at > now()` (deja refreshe par un autre worker), (3) si oui retourne le token existant, (4) sinon retourne l'ancien refresh_token pour que le service fasse l'appel Ponto, puis UPDATE atomique.

### 4.3 `ponto-api.service.ts` — Methodes metier

| Methode | Endpoint Ponto | Usage |
|---------|----------------|-------|
| `listAccounts()` | `GET /ponto-connect/accounts` | Apres connexion, lister les comptes du user |
| `getAccount(id)` | `GET /ponto-connect/accounts/{id}` | Detail d'un compte (solde, IBAN) |
| `listIntegrationAccounts()` | `GET /ponto-connect/integration-accounts` | Comptes lies a l'integration (gestion multi-orga) |
| `createSynchronization(accountId)` | `POST /ponto-connect/synchronizations` | Declencher une sync (body JSON:API: `{ data: { type: "synchronization", attributes: { resourceType: "account", resourceId: accountId, subtype: "accountTransactions" } } }`) |
| `listTransactions(accountId)` | `GET /ponto-connect/accounts/{id}/transactions` | Recuperer les transactions (pagine) |
| `getTransaction(accountId, txId)` | `GET /ponto-connect/accounts/{id}/transactions/{txId}` | Detail d'une transaction |
| `createPayment(accountId, payment)` | `POST /ponto-connect/accounts/{id}/payments` | Creer un paiement SEPA single |
| `createBulkPayment(accountId, payments)` | `POST /ponto-connect/accounts/{id}/bulk-payments` | Creer un paiement SEPA bulk |
| `getPayment(accountId, paymentId)` | `GET /ponto-connect/accounts/{id}/payments/{id}` | Status d'un paiement |
| `getBulkPayment(accountId, paymentId)` | `GET /ponto-connect/accounts/{id}/bulk-payments/{id}` | Status d'un bulk payment |
| `revokeToken(refreshToken)` | `POST {tokenBase}/oauth2/revoke` | Deconnexion d'un compte (token server, PAS l'API) |

**Mapping transactions Ponto → SEIDO :**

| Champ Ponto | Champ SEIDO (`bank_transactions`) |
|-------------|-----------------------------------|
| `id` | `provider_transaction_id` |
| `attributes.amount` | `amount` (decimal direct — pas de scale comme Tink) |
| `attributes.currency` | `currency` |
| `attributes.executionDate` | `transaction_date` |
| `attributes.valueDate` | `value_date` |
| `attributes.description` | `description_original` |
| `attributes.remittanceInformation` | `reference` (communication structuree belge ici!) |
| `attributes.remittanceInformationType` | `remittance_information_type` (structured/unstructured) |
| `attributes.counterpartName` | `counterpart_name` (nouveau champ) |
| `attributes.counterpartReference` | `counterpart_reference` (IBAN contrepartie) |
| `attributes.bankTransactionCode` | `bank_transaction_code` (nouveau champ optionnel) |
| `attributes.additionalInformation` | `description_detailed` |
| `attributes.creditorId` | `creditor_id` (nouveau champ optionnel) |

> **Avantage Ponto vs Tink** : Les montants sont des decimals directs (`-85.00`), pas du `unscaledValue/scale`. Plus simple.

---

## 5. Schema DB — Migration

### Strategie

Tables existantes (migration `20260321100000`) : toutes vides en production (module jamais active). On cree une **nouvelle migration** qui :
1. Renomme les colonnes `tink_*` en noms generiques
2. Ajoute les colonnes Ponto-specifiques
3. Cree 2 nouvelles tables pour les paiements

### Migration : `20260326XXXXXX_banking_tink_to_ponto.sql`

#### 5.1 `bank_connections` — Renommage + ajouts

```sql
-- Renommer les colonnes Tink
ALTER TABLE bank_connections RENAME COLUMN tink_user_id TO provider_user_id;
ALTER TABLE bank_connections RENAME COLUMN tink_credentials_id TO provider_credentials_id;
ALTER TABLE bank_connections RENAME COLUMN tink_account_id TO provider_account_id;
ALTER TABLE bank_connections RENAME COLUMN tink_access_token_encrypted TO access_token_encrypted;
ALTER TABLE bank_connections RENAME COLUMN tink_refresh_token_encrypted TO refresh_token_encrypted;

-- Ajouter le provider (future-proof)
ALTER TABLE bank_connections ADD COLUMN provider TEXT NOT NULL DEFAULT 'ponto';

-- Ajouter scope (pour savoir si PIS est autorise)
-- Rempli au callback OAuth depuis le champ `scope` de la reponse token
-- Ex: "ai pi offline_access name" → ARRAY['ai', 'pi', 'offline_access', 'name']
ALTER TABLE bank_connections ADD COLUMN granted_scopes TEXT[];

-- Renommer l'index unique
ALTER INDEX bank_connections_tink_account_id_key RENAME TO bank_connections_provider_account_id_key;

-- Mettre a jour les commentaires
COMMENT ON TABLE bank_connections IS 'Bank accounts connected via Ponto Connect (Isabel Group, PSD2)';
COMMENT ON COLUMN bank_connections.provider IS 'Banking provider: ponto (default). Future-proof for multi-provider.';
```

#### 5.2 `bank_transactions` — Renommage + enrichissement Ponto

```sql
-- ATTENTION: la colonne `provider_transaction_id` existe DEJA (ajoutee dans la migration originale).
-- On doit d'abord la supprimer avant de renommer `tink_transaction_id`.
ALTER TABLE bank_transactions DROP COLUMN IF EXISTS provider_transaction_id;

-- Renommer les colonnes Tink
ALTER TABLE bank_transactions RENAME COLUMN tink_transaction_id TO provider_transaction_id;
ALTER TABLE bank_transactions RENAME COLUMN tink_status TO provider_status;

-- Ajouter les champs Ponto riches
ALTER TABLE bank_transactions ADD COLUMN remittance_information_type TEXT; -- 'structured' ou 'unstructured'
ALTER TABLE bank_transactions ADD COLUMN counterpart_name TEXT;
ALTER TABLE bank_transactions ADD COLUMN counterpart_reference TEXT; -- IBAN contrepartie
ALTER TABLE bank_transactions ADD COLUMN bank_transaction_code TEXT; -- ex: 'PMNT-IRCT-ESCT'
ALTER TABLE bank_transactions ADD COLUMN creditor_id TEXT;

-- Renommer les index (explicit + UNIQUE constraint)
ALTER INDEX idx_bank_transactions_tink_id RENAME TO idx_bank_transactions_provider_id;
-- NOTE: RENAME COLUMN ne renomme PAS l'index de la contrainte UNIQUE automatiquement.
-- Apres la migration, verifier avec \d bank_transactions et renommer si necessaire :
-- ALTER INDEX bank_transactions_tink_transaction_id_key RENAME TO bank_transactions_provider_transaction_id_key;

-- Mettre a jour les commentaires
COMMENT ON TABLE bank_transactions IS 'Transactions synced from Ponto Connect, immutable after import';
```

> **Note post-review v1.1** : La colonne `provider_transaction_id` existait deja dans la migration originale (en doublon avec `tink_transaction_id`). Le DROP est safe car les tables sont vides en production.

> **Note post-review v1.2** : Apres `RENAME COLUMN tink_transaction_id`, PostgreSQL conserve l'ancien nom de l'index UNIQUE (`bank_transactions_tink_transaction_id_key`). Il faut verifier et renommer aussi cet index pour eviter la confusion dans les scripts de maintenance. Meme chose pour `bank_connections_tink_account_id_key`.

#### 5.3 `bank_payments` — NOUVEAU (paiements SEPA)

```sql
CREATE TABLE bank_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  bank_connection_id UUID NOT NULL REFERENCES bank_connections(id) ON DELETE RESTRICT,
  -- RESTRICT: empeche le DELETE physique si des paiements existent (conservation historique).
  -- La "deconnexion" d'un compte = soft delete (deleted_at) ou revoke token, PAS un DELETE ligne.

  -- Ponto payment reference
  provider_payment_id TEXT NOT NULL,
  payment_type TEXT NOT NULL CHECK (payment_type IN ('single', 'bulk')),
  status TEXT NOT NULL DEFAULT 'unsigned'
    CHECK (status IN ('unsigned', 'signing', 'signed', 'accepted', 'rejected', 'error')),

  -- Payment details
  total_amount NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  reference TEXT,
  requested_execution_date DATE,
  redirect_url TEXT,

  -- Linkage to SEIDO entities (for single payments)
  intervention_id UUID REFERENCES interventions(id),

  -- Audit
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  signed_at TIMESTAMPTZ,

  CONSTRAINT unique_provider_payment UNIQUE (provider_payment_id)
);

CREATE INDEX idx_bank_payments_team ON bank_payments(team_id, status);
CREATE INDEX idx_bank_payments_intervention ON bank_payments(intervention_id)
  WHERE intervention_id IS NOT NULL;

ALTER TABLE bank_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bank_payments_select"
  ON bank_payments FOR SELECT
  USING (is_team_manager(team_id));

CREATE POLICY "bank_payments_insert"
  ON bank_payments FOR INSERT
  WITH CHECK (is_team_manager(team_id));

CREATE POLICY "bank_payments_update"
  ON bank_payments FOR UPDATE
  USING (is_team_manager(team_id));

CREATE TRIGGER set_bank_payments_updated_at
  BEFORE UPDATE ON bank_payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE bank_payments IS 'SEPA payments initiated via Ponto Connect PIS (single + bulk)';
```

#### 5.4 `bank_payment_items` — NOUVEAU (lignes de paiement bulk)

```sql
CREATE TABLE bank_payment_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_payment_id UUID NOT NULL REFERENCES bank_payments(id) ON DELETE CASCADE,

  -- Linkage to SEIDO entity
  intervention_id UUID REFERENCES interventions(id),

  -- Payment line details
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  creditor_name TEXT NOT NULL,
  creditor_iban TEXT NOT NULL,
  remittance_information TEXT,
  end_to_end_id TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bank_payment_items_payment ON bank_payment_items(bank_payment_id);
CREATE INDEX idx_bank_payment_items_intervention ON bank_payment_items(intervention_id)
  WHERE intervention_id IS NOT NULL;

ALTER TABLE bank_payment_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bank_payment_items_via_payment"
  ON bank_payment_items FOR SELECT
  USING (bank_payment_id IN (
    SELECT id FROM bank_payments WHERE is_team_manager(team_id)
  ));

CREATE POLICY "bank_payment_items_insert"
  ON bank_payment_items FOR INSERT
  WITH CHECK (bank_payment_id IN (
    SELECT id FROM bank_payments WHERE is_team_manager(team_id)
  ));

-- Pas de policy UPDATE : les items sont immuables (pas de updated_at).
-- Si un paiement est annule, c'est le status de bank_payments qui change, pas les items.

COMMENT ON TABLE bank_payment_items IS 'Line items for bulk SEPA payments (one per intervention in a batch)';
```

### Bilan schema

| Table | Statut | Lignes modifiees |
|-------|--------|-----------------|
| `bank_connections` | Renommee | 5 colonnes rename + 2 ajouts |
| `bank_transactions` | Renommee | 2 colonnes rename + 5 ajouts |
| `bank_payments` | **NOUVELLE** | ~30 lignes |
| `bank_payment_items` | **NOUVELLE** | ~25 lignes |
| `rent_calls` | Inchange | — |
| `property_expenses` | Inchange | — |
| `security_deposits` | Inchange | — |
| `auto_linking_rules` | Inchange | — |
| `transaction_links` | Inchange | — |

**Total : 9 tables bancaires (7 existantes + 2 nouvelles)**

---

## 6. Flows utilisateur

### Flow 1 — Connexion bancaire (OAuth2 PKCE)

```
Gestionnaire                    SEIDO                         Ponto
     │                            │                              │
     ├── Clic "Connecter banque" ─►│                              │
     │                            ├── Generate PKCE verifier     │
     │                            │   + store in encrypted cookie │
     │                            ├── Build auth URL ────────────►│
     │◄── Redirect ───────────────┤                              │
     │                            │                              │
     ├── Login banque + consent ──────────────────────────────────►│
     │                            │                              │
     │◄─────────────── Redirect callback avec ?code= ────────────┤
     │                            │                              │
     │                            ├── POST /oauth2/token ────────►│
     │                            │   (code + verifier + cert     │
     │                            │    + client_id + secret)      │
     │                            │◄── access_token + refresh ───┤
     │                            │                              │
     │                            ├── GET /accounts ─────────────►│
     │                            │◄── Liste comptes ────────────┤
     │                            │                              │
     │                            ├── Encrypt tokens             │
     │                            ├── INSERT bank_connections     │
     │◄── "Compte connecte!" ─────┤                              │
```

### Flow 2 — Synchronisation transactions (cron toutes les 6h + manuel)

```
Cron (toutes les 6h)            SEIDO                         Ponto
     │                            │                              │
     ├── Pour chaque connexion ──►│                              │
     │   (status = 'active')      │                              │
     │                            ├── Refresh token si expire ──►│
     │                            │◄── Nouveau access_token ────┤
     │                            │                              │
     │                            ├── POST /synchronizations ───►│
     │                            │   { data: { type: "synchronization",
     │                            │     attributes: { resourceType:
     │                            │     "account", resourceId: accountId,
     │                            │     subtype: "accountTransactions" }}}
     │                            │◄── synchronization { id } ──┤
     │                            │                              │
     │                            │  ┌─ La sync Ponto est ASYNCHRONE ─┐
     │                            │  │ Deux strategies possibles :     │
     │                            │  │ A) Poll GET /synchronizations/ │
     │                            │  │    {id} jusqu'a status=success │
     │                            │  │ B) Attendre webhook            │
     │                            │  │    synchronization.succeeded   │
     │                            │  │ → Utiliser A (poll) en cron,   │
     │                            │  │   B (webhook) en complement    │
     │                            │  └──────────────────────────────────┘
     │                            │                              │
     │                            ├── Poll sync status ──────────►│
     │                            │   (retry 3x, 2s interval)    │
     │                            │◄── status: "success" ────────┤
     │                            │                              │
     │                            ├── GET /accounts/{id}/        │
     │                            │   transactions?page[limit]=100►│
     │                            │◄── transactions[] (pagine) ──┤
     │                            │                              │
     │                            ├── UPSERT bank_transactions   │
     │                            │   (dedup via provider_transaction_id)
     │                            ├── Run auto-matching rules    │
     │                            ├── Broadcast invalidation     │
     │                            │   ['bank_transactions']      │
```

### Flow 3 — Paiement individuel (depuis intervention cloturee)

```
Gestionnaire                    SEIDO                         Ponto
     │                            │                              │
     ├── Fiche intervention       │                              │
     │   (status: cloturee)       │                              │
     │   Clic "Payer prestataire" ►│                              │
     │                            │                              │
     │                            ├── Verifie: facture validee?  │
     │                            │   IBAN prestataire connu?    │
     │                            │   Compte connecte + PIS?     │
     │                            │                              │
     │                            ├── POST /accounts/{id}/       │
     │                            │   payments ─────────────────►│
     │                            │   { amount, creditorName,    │
     │                            │     creditorAccountReference,│
     │                            │     creditorAccountReferenceType: "IBAN",
     │                            │     remittanceInformation,   │
     │                            │     redirectUri }            │
     │                            │◄── { id, redirect_url } ────┤
     │                            │                              │
     │                            ├── INSERT bank_payments       │
     │                            │   (type='single',            │
     │                            │    intervention_id=X)        │
     │◄── Redirect vers Ponto ────┤                              │
     │                            │                              │
     ├── Signe le paiement (SCA) ────────────────────────────────►│
     │                            │                              │
     │◄──────────── Redirect callback ───────────────────────────┤
     │                            │                              │
     │                            ├── GET /payments/{id} ────────►│
     │                            │◄── status: "accepted" ──────┤
     │                            ├── UPDATE bank_payments       │
     │                            │   status → 'accepted'       │
     │◄── "Paiement effectue!" ───┤                              │
```

### Flow 4 — Paiement batch (page dediee)

```
Gestionnaire                    SEIDO                         Ponto
     │                            │                              │
     ├── Page "Paiements"         │                              │
     │   Liste interventions      │                              │
     │   cloturees + facturees    │                              │
     │                            │                              │
     ├── Coche 5 interventions   │                              │
     │   Clic "Payer (5)" ───────►│                              │
     │                            │                              │
     │                            ├── Construit payments[] ──────│
     │                            │   (5 lignes avec IBAN,       │
     │                            │    montant, reference)       │
     │                            │                              │
     │                            ├── POST /accounts/{id}/       │
     │                            │   bulk-payments ────────────►│
     │                            │   { reference, payments[5],  │
     │                            │     redirectUri }            │
     │                            │◄── { id, redirect_url } ────┤
     │                            │                              │
     │                            ├── INSERT bank_payments       │
     │                            │   (type='bulk')              │
     │                            ├── INSERT bank_payment_items  │
     │                            │   (5 lignes)                 │
     │                            │                              │
     │◄── Redirect Ponto ─────────┤   (UNE seule SCA pour 5)    │
     │                            │                              │
     ├── Signe UNE fois ─────────────────────────────────────────►│
     │◄──────────── Redirect callback ───────────────────────────┤
     │                            │                              │
     │                            ├── GET /bulk-payments/{id} ──►│
     │                            │◄── status: "accepted" ──────┤
     │                            ├── UPDATE bank_payments       │
     │                            │   status → 'accepted'       │
     │◄── "5 paiements effectues!"┤                              │
```

---

## 7. API Routes

### Mapping routes existantes → nouvelles

Les routes Tink existantes sont **conservees** pour minimiser la regression. Les nouvelles routes PIS sont ajoutees.

| Route existante | Nouvelle route | Action |
|-----------------|----------------|--------|
| `/api/bank/oauth/authorize` | **Conservee** | Adapter pour PKCE Ponto |
| `/api/bank/oauth/callback` | **Conservee** | Adapter pour token exchange Ponto |
| `/api/bank/connections` | **Conservee** | Adapter pour colonnes renommees |
| `/api/bank/connections/[id]` | **Conservee** | Idem |
| `/api/bank/connections/[id]/blacklist` | **Conservee** | Inchange |
| `/api/bank/sync` | **Conservee** | Adapter pour sync Ponto |
| `/api/bank/transactions` | **Conservee** | Adapter pour champs Ponto |
| `/api/bank/transactions/[id]/reconcile` | **Conservee** | Inchange (provider-agnostic) |
| `/api/bank/transactions/[id]/ignore` | **Conservee** | Inchange |
| `/api/bank/suggestions/[id]` | **Conservee** | Inchange |
| `/api/bank/reports` | **Conservee** | Inchange |
| `/api/bank/rent-calls/[id]/receipt` | **Conservee** | Inchange |
| — | `/api/bank/payments` (POST) | **NOUVEAU** — Creer paiement SEPA single |
| — | `/api/bank/payments/bulk` (POST) | **NOUVEAU** — Creer paiement SEPA bulk |
| — | `/api/bank/payments/callback` (GET) | **NOUVEAU** — Retour apres signature Ponto (SCA) |
| — | `/api/bank/payments/[id]` (GET) | **NOUVEAU** — Detail + status d'un paiement |
| — | `/api/bank/payments/pending` (GET) | **NOUVEAU** — Interventions payables |
| — | `/api/bank/webhooks` (POST) | **NOUVEAU** — Webhooks Ponto (tx + payment status) |
| `/api/cron/sync-bank-transactions` | **Conservee** | Adapter pour Ponto |
| `/api/cron/check-consent-expiry` | **Conservee** | Inchange (check PSD2 90j) |

> **IMPORTANT — `vercel.json`** : Deux crons bancaires existent comme routes mais ne sont PAS declares dans `vercel.json`. A ajouter en Phase 1 :
> ```json
> { "path": "/api/cron/sync-bank-transactions", "schedule": "0 */6 * * *" },
> { "path": "/api/cron/check-consent-expiry", "schedule": "0 8 * * *" }
> ```

> **IMPORTANT — `PONTO_REDIRECT_URI`** : Doit correspondre a la route existante `/api/bank/oauth/callback` (pas `/api/bank/callback`). Mettre `PONTO_REDIRECT_URI=https://seido-app.com/api/bank/oauth/callback` et `PONTO_PAYMENT_REDIRECT_URI=https://seido-app.com/api/bank/payments/callback`.

---

## 8. Fonctionnalites detaillees

### 8.1 Matching intelligent (provider-agnostic — inchange)

Le `bank-matching.service.ts` applique des criteres de matching dans cet ordre :

1. **Communication structuree belge** (`+++xxx/xxxx/xxxxx+++`) — Signal fort, match direct avec `rent_calls` si la communication contient le ref du contrat
2. **IBAN contrepartie** — Match avec le prestataire (via `users.iban` — **a ajouter**, voir prerequis ci-dessous) ou le locataire
3. **Montant exact** — Match avec `rent_calls.total_expected` ou facture intervention
4. **Montant approximatif** — Tolerance ±5% pour les charges variables
5. **Patterns recurrents** — Meme montant, meme contrepartie, meme jour du mois
6. **Regles auto-linking** — Appliquees en dernier (user-defined)

**Score de confiance** : Chaque critere additionne un score. Au-dessus de 80%, le matching est propose automatiquement. Au-dessus de 95%, il est applique automatiquement (si une regle existe).

### 8.2 Paiements SEPA

**Pre-requis pour payer un prestataire :**
- Intervention au statut `cloturee_par_*`
- Facture/devis accepte avec montant
- IBAN du prestataire renseigne dans sa fiche contact
- Compte bancaire connecte avec scope `pi` (Payment Initiation)

> **PREREQUIS DB** : La table `users` n'a actuellement PAS de colonne `iban`. Une migration prealable doit ajouter `iban_encrypted TEXT` et `iban_last4 TEXT` a la table `users` (chiffrement AES-256-GCM via EncryptionService, meme pattern que `bank_connections.iban_encrypted`). L'IBAN sera saisissable depuis la fiche contact prestataire.

**Communication de paiement** : SEIDO genere une reference en `remittanceInformation` (type `unstructured`) : `SEIDO INV-{intervention_number}`. On n'utilise PAS le format communication structuree belge (`+++xxx/xxxx/xxxxx+++`) car celui-ci requiert un checksum modulo 97 et n'est pas adapte pour des references arbitraires. Les banques acceptent le texte libre en `unstructured`.

### 8.3 Webhooks Ponto

| Webhook | Action SEIDO |
|---------|-------------|
| `pontoConnect.account.transactionsCreated` | Fetch nouvelles transactions + run matching |
| `pontoConnect.account.transactionsUpdated` | Update transactions existantes |
| `pontoConnect.synchronization.succeededWithoutChange` | Update `last_sync_at` |
| `pontoConnect.synchronization.failed` | Set `sync_status = 'error'` + notification |

**Signature des webhooks** : Ponto signe les webhooks. On verifie la signature dans `/api/bank/webhooks` avant traitement.

**Idempotence** : Les webhooks Ponto peuvent etre retransmis (retry). Chaque event a un `id` unique. Creer une table `ponto_webhook_events` (pattern identique a `stripe_webhook_events` existante : `id`, `event_id UNIQUE`, `event_type`, `processed_at`, `payload JSONB`). Ignorer les doublons via `ON CONFLICT (event_id) DO NOTHING`. Cron de nettoyage mensuel (meme pattern que `cleanup-webhook-events`).

> **Note** : Les noms exacts des event types doivent etre verifies dans le dashboard Ponto lors de l'onboarding (la doc API publique ne liste pas exhaustivement tous les types).

### 8.4 Garde-fous PIS

Avant chaque appel paiement Ponto, verifier cote API SEIDO :
1. `bank_connections.sync_status = 'active'` (pas `disconnected`, `error`, ou `blacklisted`)
2. `bank_connections.is_blacklisted = false`
3. `'pi' = ANY(bank_connections.granted_scopes)` (scope PIS accorde)
4. Le token est valide (refresh si necessaire)

Refuser le paiement avec message explicite si une condition n'est pas remplie, avant d'appeler Ponto.

---

## 9. Securite & RGPD

### Stockage des secrets

| Secret | Stockage | Chiffrement |
|--------|----------|-------------|
| Client certificate (PEM) | `PONTO_CLIENT_CERT_B64` (env var Vercel) | Chiffre au repos par Vercel |
| Client private key (PEM) | `PONTO_CLIENT_KEY_B64` (env var Vercel) | Chiffre au repos par Vercel |
| Client ID / Secret | `PONTO_CLIENT_ID`, `PONTO_CLIENT_SECRET` (env vars) | Chiffre au repos par Vercel |
| Access token (per-user) | `bank_connections.access_token_encrypted` | AES-256-GCM (EncryptionService) |
| Refresh token (per-user) | `bank_connections.refresh_token_encrypted` | AES-256-GCM (EncryptionService) |
| IBAN utilisateur | `bank_connections.iban_encrypted` | AES-256-GCM (EncryptionService) |

### Conformite PSD2

- **Consent 90 jours** : PSD2 impose un renouvellement du consentement tous les 90 jours. `consent_expires_at` tracke l'expiration. 7 jours avant : notification au gestionnaire. A expiration : `sync_status → 'disconnected'`.
- **SCA** : Chaque paiement requiert une Strong Customer Authentication (redirect Ponto). Pas de paiement silencieux.
- **Minimal data** : On ne stocke que les donnees necessaires au matching et aux rapports. Pas de donnees personnelles des contreparties au-dela du nom et IBAN.

### RLS

Toutes les tables bancaires utilisent `is_team_manager(team_id)` — seuls les gestionnaires de l'equipe ont acces. Pas de visibilite locataire/prestataire sur les donnees bancaires.

### Failure Modes

| Scenario | Detection | Action |
|----------|-----------|--------|
| **Ponto API down** (sync cron) | HTTP 5xx ou timeout | Retry 3x avec backoff exponentiel (1s, 5s, 15s). Si echec persistant → `sync_status = 'error'` + notification gestionnaire |
| **Refresh token expire/revoque** | HTTP 401 sur refresh | `sync_status = 'disconnected'` + notification "Reconnectez votre banque" |
| **Consent PSD2 expire** (90j) | `consent_expires_at < now()` | 7j avant : notification email. A expiration : `sync_status = 'disconnected'` |
| **Paiement echoue cote Ponto** | Webhook `status: rejected` ou polling | `bank_payments.status = 'rejected'` + toast erreur + notification |
| **DB INSERT echoue apres Ponto accepte** | Try/catch sur INSERT | Log d'erreur critique + retry immediat. Si echec → alerte admin. Le paiement Ponto est irrevocable. |
| **Webhook malformed/signature invalide** | Verification signature | HTTP 400 + log. Ne pas traiter le payload. |
| **Certificat mTLS expire** | Toutes les requetes Ponto echouent (TLS handshake) | Alerte admin. Renouveler le certificat dans le dashboard Isabel + mettre a jour l'env var. |

---

## 10. Phases d'implementation

### Phase 1 — MVP Complet (AIS + PIS) — ~3 semaines

| Semaine | Taches |
|---------|--------|
| **S1** | Migration DB (rename + 2 tables paiement + IBAN sur users) + `ponto-http.client.ts` + `ponto-auth.service.ts` + tests unitaires |
| **S1** | `ponto-api.service.ts` (accounts, transactions) + adaptation `bank-sync.service.ts` |
| **S2** | API routes (oauth/authorize, oauth/callback, sync, transactions, reconcile) + adaptation UI existante |
| **S2** | Crons (`sync-bank-transactions` + `check-consent-expiry` dans `vercel.json`) + webhooks Ponto + `ponto_webhook_events` table |
| **S3** | Paiements single + bulk (API routes + UI "Paiements") |
| **S3** | Tests E2E (sandbox Ponto) + securite review |

### Phase 2 — Intelligence (inchange) — ~1.5 semaines

- Auto-matching intelligent ameliore
- Regles auto-linking (UI CRUD)
- Split transactions
- Dashboard widgets banque

### Phase 3 — Rapports (inchange) — ~1.5 semaines

- P&L par lot, immeuble, contrat
- Taux de collecte des loyers
- Exports PDF/CSV
- Widgets fiche contrat/lot/immeuble

---

## Env vars necessaires

```env
# Ponto Connect (Isabel Group)
PONTO_CLIENT_ID=your-client-id
PONTO_CLIENT_SECRET=your-client-secret
PONTO_CLIENT_CERT_B64=base64-encoded-certificate-pem
PONTO_CLIENT_KEY_B64=base64-encoded-private-key-pem
PONTO_SANDBOX=true
PONTO_REDIRECT_URI=https://seido-app.com/api/bank/oauth/callback
PONTO_PAYMENT_REDIRECT_URI=https://seido-app.com/api/bank/payments/callback
PONTO_WEBHOOK_SECRET=your-webhook-signing-secret
```

---

## Checklist pre-implementation

A verifier dans le dashboard Ponto / la doc officielle avant de coder :

- [ ] Chemins exacts des endpoints (prefixes `/ponto-connect/` vs racine, organisations vs comptes)
- [ ] Mecanisme exact de signature des webhooks (algorithme, headers, payload)
- [ ] Schema reel de `meta.paging` (curseur `after` vs `links.next`)
- [ ] Event types webhooks exacts (verifier dans le dashboard, pas dans la doc publique)
- [ ] Taille max des env vars Vercel (4KB par var — verifier que le PEM tient)
- [ ] Credentials sandbox (financial institution IDs, comptes test)
- [ ] Verifier `\d bank_transactions` et `\d bank_connections` apres migration pour les noms d'index UNIQUE auto-generes

---

## References

- [Ponto Connect API Documentation](https://documentation.ibanity.com/ponto-connect)
- [Ponto Connect API Reference (curl)](https://documentation.ibanity.com/ponto-connect/api/curl)
- [Ponto Products Overview](https://documentation.ibanity.com/ponto-connect/products)
- [Isabel Group](https://www.isabel.eu/)
- Design precedent (abandonne) : `docs/banking/2026-03-19-bank-module-tink-integration.md`
- Schema DB existant : `supabase/migrations/20260321100000_add_banking_schema.sql`
