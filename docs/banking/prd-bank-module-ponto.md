# PRD: Module Banque — Ponto Connect (Phase 1 MVP)

> **Generated:** 2026-03-26
> **Status:** Draft
> **Author:** Claude (sp-prd)
> **Design doc:** `docs/banking/2026-03-26-bank-module-ponto-integration.md` (v1.2)
> **Branch cible:** `feature/bank-module-ponto`

---

## 1. Introduction

Les gestionnaires immobiliers passent 10h+/mois a reconcilier manuellement les transactions bancaires avec les loyers et factures. Le module Banque connecte les comptes via Ponto Connect (Isabel Group, PSD2), synchronise les transactions, propose des rapprochements intelligents, et permet de payer les prestataires directement depuis SEIDO (SEPA single + bulk).

Ce PRD couvre la **Phase 1 (MVP)** : connexion bancaire, sync transactions, matching manuel, et paiements SEPA. Les phases 2 (auto-matching intelligent, regles, split) et 3 (rapports P&L, exports) sont hors scope.

## 2. Goals

- **Primary:** Connecter un compte bancaire, synchroniser les transactions, et payer les prestataires en < 2 minutes depuis SEIDO
- **Secondary:** Matching intelligent des transactions avec les loyers et factures
- **Non-Goals:** Rapports P&L, auto-matching avance, split transactions, dashboard widgets banque (Phase 2-3)

## 3. User Stories

### Couche 1 — Schema (DB)

---

#### US-001: Migration DB — Renommage colonnes Tink → generiques

As a developer, I want provider-agnostic column names so that the schema supports Ponto without Tink references.

**Acceptance Criteria:**
- [ ] Colonnes `tink_user_id`, `tink_credentials_id`, `tink_account_id`, `tink_access_token_encrypted`, `tink_refresh_token_encrypted` renommees en `provider_*` / generiques sur `bank_connections`
- [ ] Colonne `provider TEXT NOT NULL DEFAULT 'ponto'` ajoutee sur `bank_connections`
- [ ] Colonne `granted_scopes TEXT[]` ajoutee sur `bank_connections` (remplie au callback OAuth)
- [ ] Colonne `provider_transaction_id` dupliquee supprimee puis `tink_transaction_id` renomme sur `bank_transactions`
- [ ] Colonnes `tink_status` renommee en `provider_status` sur `bank_transactions`
- [ ] Colonnes Ponto ajoutees : `remittance_information_type`, `counterpart_name`, `counterpart_reference`, `bank_transaction_code`, `creditor_id` sur `bank_transactions`
- [ ] Index renommes (`idx_bank_transactions_tink_id` → `idx_bank_transactions_provider_id`)
- [ ] Index UNIQUE constraints verifies et renommes apres RENAME COLUMN
- [ ] Comments mis a jour (Tink → Ponto Connect)
- [ ] Migration appliquee sans erreur sur schema vide

**Sizing:** S — 1 fichier migration, ~40 lignes ALTER

**Dependencies:** Aucune

---

#### US-002: Migration DB — Tables paiement + webhook + IBAN + RPC

As a developer, I want payment tables and supporting infrastructure so that PIS and webhook idempotency are possible.

**Acceptance Criteria:**
- [ ] Table `bank_payments` creee (provider_payment_id, payment_type, status, total_amount, intervention_id, redirect_url, etc.)
- [ ] FK `bank_payments.bank_connection_id` avec `ON DELETE RESTRICT`
- [ ] RLS `is_team_manager(team_id)` sur `bank_payments` (SELECT, INSERT, UPDATE)
- [ ] Table `bank_payment_items` creee (bank_payment_id, intervention_id, amount, creditor_name, creditor_iban, etc.)
- [ ] RLS via subquery sur `bank_payment_items` (SELECT, INSERT — pas UPDATE, items immuables)
- [ ] Table `ponto_webhook_events` creee (event_id UNIQUE, event_type, processed_at, payload JSONB)
- [ ] Colonnes `iban_encrypted TEXT` et `iban_last4 TEXT` ajoutees sur `users`
- [ ] Fonction RPC `refresh_bank_token_lock(connection_id UUID)` creee (SELECT FOR UPDATE dans transaction explicite)
- [ ] Triggers `updated_at` sur `bank_payments`
- [ ] Migration appliquee sans erreur

**Sizing:** M — 1 fichier migration, ~120 lignes (3 tables + RLS + RPC)

**Dependencies:** US-001

---

### Couche 2 — Backend Transport (Client Ponto)

---

#### US-003: Client HTTP mTLS + JSON:API

As a developer, I want a transport layer that handles mTLS certificates and JSON:API parsing so that all Ponto API calls go through a single, tested client.

**Acceptance Criteria:**
- [ ] Fichier `lib/services/domain/ponto-http.client.ts` cree
- [ ] Agent HTTPS mTLS configure via `PONTO_CLIENT_CERT_B64` et `PONTO_CLIENT_KEY_B64` (base64 → Buffer)
- [ ] Headers `Accept: application/vnd.api+json` et `Content-Type: application/vnd.api+json` envoyes
- [ ] Fonction `unwrapResource<T>()` qui extrait `id` + `attributes` du format JSON:API
- [ ] Generateur async `paginate<T>()` avec curseur `page[after]` / `page[limit]`
- [ ] URLs conditionnelles sandbox/live via `PONTO_SANDBOX` env var
- [ ] Gestion erreurs HTTP (4xx, 5xx) avec types d'erreur structures
- [ ] Rate limiting handling (429 → retry avec backoff)
- [ ] Tests unitaires (mock HTTP, test pagination, test error handling)

**Sizing:** M — 1 fichier ~150 lignes + tests

**Dependencies:** Aucune (peut etre developpe en parallele de US-001/002)

---

#### US-004: Service OAuth2 PKCE

As a developer, I want an authentication service that manages the full OAuth2 PKCE flow so that users can connect their bank accounts securely.

**Acceptance Criteria:**
- [ ] Fichier `lib/services/domain/ponto-auth.service.ts` cree
- [ ] `generateAuthUrl()` : genere `code_verifier` + `code_challenge` (SHA256, S256), construit l'URL d'autorisation avec scopes URL-encodes (`ai%20pi%20offline_access`)
- [ ] `exchangeCode(code, codeVerifier)` : POST vers `{tokenBase}/oauth2/token` avec `grant_type=authorization_code`
- [ ] `refreshToken(refreshToken)` : POST vers `{tokenBase}/oauth2/token` avec `grant_type=refresh_token`, retourne nouveau access + refresh token
- [ ] `revokeToken(refreshToken)` : POST vers `{tokenBase}/oauth2/revoke` (token server, PAS l'API)
- [ ] Toutes les requetes utilisent le `httpsAgent` mTLS de US-003
- [ ] `getValidToken(connectionId)` : verifie expiration, refresh si necessaire via RPC `refresh_bank_token_lock` (US-002)
- [ ] Tokens chiffres via `EncryptionService` (AES-256-GCM) avant stockage
- [ ] `granted_scopes` parse depuis la reponse token et stocke en array
- [ ] Tests unitaires (mock HTTP, test PKCE generation, test refresh flow)

**Sizing:** M — 1 fichier ~120 lignes + tests

**Dependencies:** US-003

---

#### US-005: Service API Ponto (methodes metier)

As a developer, I want business-level API methods so that services can call Ponto without knowing the transport details.

**Acceptance Criteria:**
- [ ] Fichier `lib/services/domain/ponto-api.service.ts` cree (remplace `tink-api.service.ts`)
- [ ] AIS : `listAccounts()`, `getAccount(id)`, `listIntegrationAccounts()`
- [ ] AIS : `createSynchronization(accountId)` avec body JSON:API complet (`resourceType`, `resourceId`, `subtype`)
- [ ] AIS : `listTransactions(accountId)`, `getTransaction(accountId, txId)` avec pagination
- [ ] PIS : `createPayment(accountId, payment)` — SEPA single
- [ ] PIS : `createBulkPayment(accountId, payments)` — SEPA bulk avec `batchBookingPreferred`
- [ ] PIS : `getPayment(accountId, paymentId)`, `getBulkPayment(accountId, paymentId)` — polling status
- [ ] Sync : `pollSynchronizationStatus(syncId)` avec retry (3x, 2s interval) pour attendre `status: "success"`
- [ ] Mapping transactions Ponto → types internes (montants decimaux directs, pas de scale)
- [ ] Tests unitaires avec responses JSON:API mockees

**Sizing:** M — 1 fichier ~200 lignes + tests

**Dependencies:** US-003, US-004

---

### Couche 3 — Backend Services + Repositories

---

#### US-006: Adaptation services et repositories existants

As a developer, I want existing bank services and repositories adapted to use Ponto data structures so that the sync and matching pipelines work with the new provider.

**Acceptance Criteria:**
- [ ] `bank-sync.service.ts` adapte : mapping JSON:API → types internes (remittanceInformation → reference, counterpartName → counterpart_name, etc.)
- [ ] `bank-connection.repository.ts` adapte : colonnes renommees (provider_* au lieu de tink_*)
- [ ] `bank-transaction.repository.ts` adapte : colonnes renommees + nouveaux champs Ponto
- [ ] `lib/types/bank.types.ts` adapte : types Ponto + types paiement (PontoAccount, PontoTransaction, PontoPayment, etc.)
- [ ] `lib/validation/bank-schemas.ts` adapte : schemas Zod pour validation API Ponto
- [ ] `tink-api.service.ts` supprime (remplace par `ponto-api.service.ts`)
- [ ] `bank-matching.service.ts` inchange (verification : toujours provider-agnostic)
- [ ] Aucun import `tink` restant dans le codebase (`grep -r "tink" lib/` = 0 resultats hors docs)
- [ ] `npm run lint` passe sans erreur

**Sizing:** M — 5-6 fichiers modifies, ~200 lignes de changements

**Dependencies:** US-001, US-002, US-005

---

#### US-007: Repository paiements

As a developer, I want a payment repository so that payment records can be created and queried.

**Acceptance Criteria:**
- [ ] Fichier `lib/services/repositories/bank-payment.repository.ts` cree
- [ ] `create(payment)` : INSERT bank_payments + bank_payment_items (pour bulk)
- [ ] `updateStatus(id, status, signedAt?)` : UPDATE status + signed_at
- [ ] `findById(id)` : SELECT avec JOIN payment_items
- [ ] `findByTeam(teamId, filters?)` : Liste paginee (status, date range)
- [ ] `findPendingInterventions(teamId)` : Interventions cloturees + facturees + prestataire avec IBAN
- [ ] Repository Pattern SEIDO respecte (Supabase client, pas d'acces direct)
- [ ] Tests unitaires

**Sizing:** S — 1 fichier ~100 lignes + tests

**Dependencies:** US-002

---

### Couche 4 — API Routes

---

#### US-008: Routes OAuth (authorize + callback)

As a gestionnaire, I want to connect my bank account through Ponto so that my transactions sync automatically.

**Acceptance Criteria:**
- [ ] `GET /api/bank/oauth/authorize` adapte : genere PKCE, stocke verifier en cookie chiffre, redirect vers Ponto authorization URL
- [ ] `GET /api/bank/oauth/callback` adapte : echange code, stocke tokens chiffres, fetch comptes Ponto, INSERT bank_connections
- [ ] Scopes demandes : `ai pi offline_access name`
- [ ] `granted_scopes` parse et stocke sur bank_connections
- [ ] Gestion erreur : Ponto refuse, user annule, token invalide → redirect avec message
- [ ] Connexion visible dans l'UI existante apres callback

**Sizing:** S — 2 fichiers modifies, ~80 lignes de changements

**Dependencies:** US-004, US-006

---

#### US-009: Routes sync + transactions

As a gestionnaire, I want my bank transactions to sync automatically so that I can reconcile them with my rent calls and invoices.

**Acceptance Criteria:**
- [ ] `POST /api/bank/sync` adapte : appelle Ponto createSynchronization (JSON:API), poll status, fetch transactions
- [ ] Sync asynchrone : poll `GET /synchronizations/{id}` (3x, 2s) avant de fetch les transactions
- [ ] UPSERT transactions via `provider_transaction_id` (dedup)
- [ ] `GET /api/bank/transactions` adapte : filtres sur nouveaux champs (counterpart_name, remittance_information_type)
- [ ] `POST /api/bank/transactions/[id]/reconcile` inchange (provider-agnostic)
- [ ] `POST /api/bank/transactions/[id]/ignore` inchange
- [ ] Broadcast invalidation `['bank_transactions']` apres sync
- [ ] Gestion erreur : Ponto down → retry 3x backoff, token revoque → sync_status = 'disconnected'

**Sizing:** S — 3 fichiers modifies, ~100 lignes de changements

**Dependencies:** US-005, US-006

---

#### US-010: Routes paiements (single + bulk + callback)

As a gestionnaire, I want to pay service providers directly from SEIDO so that I don't need to switch to my banking app.

**Acceptance Criteria:**
- [ ] `POST /api/bank/payments` : cree paiement SEPA single via Ponto, INSERT bank_payments, retourne redirect_url
- [ ] `POST /api/bank/payments/bulk` : cree bulk payment via Ponto (N lignes), INSERT bank_payments + bank_payment_items, retourne redirect_url
- [ ] `GET /api/bank/payments/callback` : recoit redirect apres SCA, poll status Ponto, UPDATE bank_payments.status
- [ ] `GET /api/bank/payments/[id]` : detail + status d'un paiement
- [ ] `GET /api/bank/payments/pending` : liste interventions payables (cloturees + facturees + IBAN prestataire connu)
- [ ] Garde-fous PIS verifies AVANT appel Ponto : `sync_status = 'active'`, `is_blacklisted = false`, `'pi' IN granted_scopes`, token valide
- [ ] Communication de paiement : `remittanceInformation` type `unstructured` avec `SEIDO INV-{number}`
- [ ] Champs Ponto corrects : `creditorAccountReference` + `creditorAccountReferenceType: "IBAN"` (pas `creditorIBAN`)

**Sizing:** M — 5 nouveaux fichiers route, ~250 lignes

**Dependencies:** US-005, US-007

---

#### US-011: Route webhooks Ponto + idempotence

As a developer, I want Ponto webhooks handled so that new transactions are synced in near-realtime and payment statuses update automatically.

**Acceptance Criteria:**
- [ ] `POST /api/bank/webhooks` cree : recoit webhooks Ponto
- [ ] Signature webhook verifiee avant traitement
- [ ] Idempotence via `ponto_webhook_events` : `INSERT ON CONFLICT (event_id) DO NOTHING`
- [ ] Event `pontoConnect.account.transactionsCreated` → fetch nouvelles transactions + run matching
- [ ] Event `pontoConnect.account.transactionsUpdated` → update transactions existantes
- [ ] Event `pontoConnect.synchronization.failed` → `sync_status = 'error'` + notification
- [ ] Erreurs non-bloquantes (webhook process failure ne crash pas le endpoint)

**Sizing:** S — 1 fichier route + 1 table deja creee (US-002), ~80 lignes

**Dependencies:** US-002, US-005

---

#### US-012: Crons dans vercel.json

As a developer, I want bank cron jobs registered in Vercel so that transactions sync and consent expiry checks run automatically.

**Acceptance Criteria:**
- [ ] `vercel.json` mis a jour avec : `{ "path": "/api/cron/sync-bank-transactions", "schedule": "0 */6 * * *" }`
- [ ] `vercel.json` mis a jour avec : `{ "path": "/api/cron/check-consent-expiry", "schedule": "0 8 * * *" }`
- [ ] `sync-bank-transactions` route adapte pour Ponto (appelle ponto-api.service au lieu de tink-api)
- [ ] `check-consent-expiry` route existante fonctionne avec colonnes renommees

**Sizing:** XS — 2 fichiers, ~20 lignes de changements

**Dependencies:** US-009

---

### Couche 5 — UI

---

#### US-013: Champ IBAN sur fiche contact prestataire

As a gestionnaire, I want to add a provider's IBAN on their contact page so that I can pay them from SEIDO.

**Acceptance Criteria:**
- [ ] Champ IBAN ajoute au formulaire de creation/edition contact (role prestataire)
- [ ] Validation IBAN (format, longueur, checksum mod 97)
- [ ] IBAN chiffre via EncryptionService avant stockage (`iban_encrypted`)
- [ ] Affichage masque en lecture (`****XXXX` avec 4 derniers caracteres)
- [ ] `iban_last4` stocke pour affichage sans dechiffrement
- [ ] Visible uniquement pour les gestionnaires (pas les prestataires eux-memes)

**Sizing:** S — 2-3 fichiers (form + server action), ~100 lignes

**Dependencies:** US-002

---

#### US-014: Bouton "Payer" sur intervention cloturee

As a gestionnaire, I want a "Pay provider" button on closed interventions so that I can initiate payment in one click.

**Acceptance Criteria:**
- [ ] Bouton "Payer le prestataire" visible sur les interventions au statut `cloturee_par_*`
- [ ] Bouton desactive avec tooltip si : pas d'IBAN prestataire, pas de compte connecte avec PIS, pas de facture
- [ ] Clic → confirmation modal (montant, IBAN, reference) → POST `/api/bank/payments` → redirect Ponto
- [ ] Retour apres SCA : toast "Paiement effectue" ou "Paiement refuse"
- [ ] Badge "Paye le XX/XX" affiche apres paiement accepte
- [ ] Etat de chargement pendant le redirect

**Sizing:** M — 3-4 fichiers (composant + modal + server action), ~150 lignes

**Dependencies:** US-010, US-013

---

#### US-015: Page "Paiements" (batch)

As a gestionnaire, I want a batch payment page so that I can pay multiple providers in one bank signature.

**Acceptance Criteria:**
- [ ] Page `/gestionnaire/banque/paiements` (ou onglet dans la section Banque existante)
- [ ] Liste des interventions payables : cloturees + facturees + IBAN prestataire connu
- [ ] Checkboxes pour selection multiple
- [ ] Bouton "Payer (N)" avec resume : total, nombre de prestataires
- [ ] Confirmation modal avec liste detaillee (prestataire, montant, IBAN masque)
- [ ] POST `/api/bank/payments/bulk` → redirect Ponto → UNE seule SCA pour N paiements
- [ ] Historique des paiements passes (status, date, montant)
- [ ] Filtre par status (en attente, accepte, rejete)

**Sizing:** M — 4-5 fichiers (page + composants + server action), ~250 lignes

**Dependencies:** US-010, US-013

---

## 4. Functional Requirements

| ID | Requirement | Priority | Story |
|----|-------------|----------|-------|
| FR-001 | Colonnes DB renommees tink_* → provider_* | Must | US-001 |
| FR-002 | Tables bank_payments + bank_payment_items creees avec RLS | Must | US-002 |
| FR-003 | Client HTTP mTLS avec certificat PEM en env var base64 | Must | US-003 |
| FR-004 | OAuth2 PKCE avec rotation de refresh token atomique | Must | US-004 |
| FR-005 | Sync asynchrone : POST sync → poll status → fetch tx | Must | US-005, US-009 |
| FR-006 | Paiement SEPA single depuis intervention cloturee | Must | US-010, US-014 |
| FR-007 | Paiement SEPA bulk (N interventions, 1 SCA) | Must | US-010, US-015 |
| FR-008 | Webhooks Ponto avec idempotence par event_id | Must | US-011 |
| FR-009 | IBAN prestataire chiffre AES-256-GCM | Must | US-013 |
| FR-010 | Garde-fous PIS (sync_status, blacklist, scope pi) | Must | US-010 |
| FR-011 | Crons sync + consent expiry dans vercel.json | Must | US-012 |
| FR-012 | Communication paiement en unstructured (pas +++...+++) | Must | US-010 |

## 5. Non-Goals (Out of Scope — Phase 2/3)

- Auto-matching intelligent ameliore (regles apprises)
- UI CRUD regles auto-linking
- Split transactions
- Dashboard widgets banque (solde, cash flow, collecte)
- Rapports P&L par lot, immeuble, contrat
- Taux de collecte des loyers
- Exports PDF/CSV
- Decomptes proprietaires
- GoCardless / prelevement SEPA

## 6. Design Considerations

- **UI/UX:** Les 10 composants UI existants (`components/bank/*`) sont inchanges. Nouveaux composants pour paiements uniquement (bouton, modal, page batch).
- **Mobile:** Le paiement depuis mobile est supporte (redirect Ponto fonctionne en mobile browser). La page batch est responsive.
- **Redirect UX:** Apres signature SCA chez Ponto, l'utilisateur revient sur SEIDO via callback. Prevoir un etat "verification en cours" pendant le poll du status.

## 7. Technical Considerations

- **Database:** 1 migration (rename + 3 nouvelles tables + ALTER users + RPC). 9 tables bancaires au total.
- **API:** 12 routes existantes conservees + 6 nouvelles routes paiement/webhook. 2 crons a ajouter dans vercel.json.
- **External:** Ponto Connect API (mTLS, JSON:API, OAuth2 PKCE). Sandbox disponible pour tests.
- **Security:** Certificats PEM en env var base64 (Vercel), tokens chiffres AES-256-GCM, IBAN chiffre, webhook signatures verifiees, RPC lock pour refresh concurrent.
- **Dependencies:** Aucun nouveau package npm (https.Agent natif, crypto natif).

## 8. Success Metrics

| Metric | Target | Measure |
|--------|--------|---------|
| Connexion premiere banque | < 5 min | Temps OAuth flow complet |
| Sync transactions | < 30s pour 100 tx | Temps cron job |
| Paiement prestataire (clic → signe) | < 2 min | Temps flow complet |
| Reconciliation hebdo (100 lots) | < 8 min | vs 2h+ manuellement |
| Taux d'erreur sync | < 1% | Ratio sync error / total |

## 9. Open Questions

- [ ] Taille max env var Vercel pour le certificat PEM (verifier < 4KB)
- [ ] Mecanisme exact de signature des webhooks Ponto (a verifier dans le dashboard Isabel)
- [ ] Credentials sandbox Ponto (financial institution IDs, comptes test)
- [ ] Certificat mTLS : duree de validite et process de renouvellement

## 10. Dependency Graph

```
US-001 (rename columns)
  └── US-002 (new tables + RPC)
        ├── US-007 (payment repo)
        │     └── US-010 (payment routes) ──┐
        ├── US-013 (IBAN contact UI)         │
        │     ├── US-014 (pay button) ◄──────┘
        │     └── US-015 (batch page) ◄──────┘
        └── US-011 (webhooks)

US-003 (HTTP client) ─── parallel ───┐
  └── US-004 (auth service)          │
        └── US-005 (API service)     │
              ├── US-006 (adapt services) ◄── US-001
              ├── US-009 (sync routes)
              │     └── US-012 (crons)
              └── US-010 (payment routes)
```

## 11. Execution Order

| Order | Story | Layer | Size | Parallel? |
|-------|-------|-------|------|-----------|
| 1 | US-001 | Schema | S | |
| 2 | US-002 | Schema | M | |
| 3a | US-003 | Backend | M | Parallel avec 1-2 |
| 3b | US-004 | Backend | M | Apres 3a |
| 4 | US-005 | Backend | M | Apres 3b |
| 5 | US-006 | Backend | M | Apres 1, 2, 4 |
| 5p | US-007 | Backend | S | Parallel avec 5 |
| 6a | US-008 | API | S | Apres 5 |
| 6b | US-009 | API | S | Parallel avec 6a |
| 6c | US-010 | API | M | Apres 5, 5p |
| 6d | US-011 | API | S | Parallel avec 6c |
| 7 | US-012 | Config | XS | Apres 6b |
| 8a | US-013 | UI | S | Apres 2 |
| 8b | US-014 | UI | M | Apres 6c, 8a |
| 8c | US-015 | UI | M | Apres 6c, 8a |

---

**Total:** 15 stories (1 XS, 5 S, 9 M)

**Estimated Phase 1 scope:** ~3 semaines (aligné avec le design doc)

**Next step:** Run `/ralph` to implement story-by-story, or convert to `prd.json` for tracking.
