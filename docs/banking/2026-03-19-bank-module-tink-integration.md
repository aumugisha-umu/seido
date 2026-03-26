# Module Banque SEIDO — Document de Conception Complet

**Date**: 2026-03-19
**Auteur**: Claude + UX Researcher + UI Designer + Security Auditor
**Statut**: Revise apres audit complet — pret pour PRD
**Branche cible**: `feature/bank-module`
**Revision**: v3 — Corrections post-audit securite, API Tink V2, integration codebase, revue doc officielle Tink (MCP context7), analyse UX/UI Researcher, gaps metier BE/FR

---

## Table des matieres

1. [Vision & Objectifs](#1-vision--objectifs)
2. [Benchmark Concurrentiel](#2-benchmark-concurrentiel)
3. [Architecture d'Information](#3-architecture-dinformation)
4. [Modele de Donnees](#4-modele-de-donnees)
5. [Integration Tink (V2 API)](#5-integration-tink-v2-api)
6. [User Journeys](#6-user-journeys)
7. [Fonctionnalites Detaillees](#7-fonctionnalites-detaillees)
8. [Specifications UI](#8-specifications-ui)
9. [Rapports & Rentabilite](#9-rapports--rentabilite)
10. [Edge Cases & Regles Metier](#10-edge-cases--regles-metier)
11. [Mobile](#11-mobile)
12. [Securite & RGPD](#12-securite--rgpd)
13. [Points d'Integration Codebase](#13-points-dintegration-codebase)
14. [API Routes](#14-api-routes)
15. [Cron Jobs](#15-cron-jobs)
16. [Phases d'Implementation](#16-phases-dimplementation)
17. [Ajouts v3 — Gaps metier et conformite BE/FR](#17-ajouts-v3--gaps-metier-et-conformite-befr)

---

## 1. Vision & Objectifs

### Probleme

Les gestionnaires immobiliers passent **10h+/mois** a reconcilier manuellement les transactions bancaires avec les loyers attendus et les factures d'intervention dans Excel. Ils n'ont aucune vue centralisee sur la rentabilite de leur patrimoine.

### Solution

Un module "Banque" integre dans SEIDO qui :
- Connecte les comptes bancaires via **Tink** (Open Banking PSD2)
- Synchronise les transactions automatiquement
- Propose des rapprochements intelligents avec les echeances de contrat et les interventions
- Apprend des habitudes pour auto-lier les transactions recurrentes
- Produit des rapports de rentabilite par contrat, lot et immeuble

### Objectifs mesurables

| Metrique | Cible |
|----------|-------|
| Temps de reconciliation hebdomadaire (100 lots) | < 8 minutes (vs 2h+ manuellement) |
| Taux d'auto-matching (apres 3 mois d'usage) | > 70% des transactions |
| Adoption du module (gestionnaires actifs) | > 60% dans les 3 mois post-lancement |
| Connexion premiere banque | < 5 minutes |

---

## 2. Benchmark Concurrentiel

### Matrice comparative

| Feature | Smovin | Rentila | Rentio | Stessa | Baselane | **SEIDO (cible)** |
|---------|--------|---------|--------|--------|----------|-------------------|
| **Sync bancaire API** | PSD2/Ponto | Non (CSV) | Direct Debit | Plaid | Native+Plaid | **Tink PSD2** |
| **Auto-match loyers** | Oui (comm. structuree) | Non | N/A | Oui (patterns) | Oui (built-in) | **Oui (multi-criteres)** |
| **Categories transactions** | Predefinies+custom | Predefinies+custom | Limitees | IRS Schedule E | Schedule E | **Predefinies immobilier** |
| **Regles automatiques** | Oui (apprises) | Non | N/A | Oui (vendor) | Oui (vendor) | **Oui (prompt post-link)** |
| **Split transactions** | Oui | Non | Non | Oui | Oui | **Phase 2** |
| **Ignorer/Exclure** | Oui | Manuel | N/A | Oui | Oui | **Oui + blacklist compte** |
| **P&L par lot** | Oui | Oui | Limite | Oui | Oui | **Oui** |
| **P&L par immeuble** | Oui | Non | Non | Non | Non | **Oui (differenciateur)** |
| **P&L par contrat** | Non | Non | Non | Non | Non | **Oui (differenciateur)** |
| **Taux de collecte** | Oui | Non | Oui | Non | Non | **Oui** |
| **Dashboard widgets** | Oui | Basique | Oui | Oui | Oui | **Oui (3 widgets)** |
| **Mobile** | Web only | Web only | App native | App | App | **Web responsive** |
| **Marche** | BE/EU | FR | BE | US | US | **BE/FR** |

### Insights cles du benchmark

1. **Communication structuree belge** ("+++xxx/xxxx/xxxxx+++") est le signal principal de matching chez Smovin — a implementer en priorite pour le marche belge
2. **Stessa/Baselane** (US) sont les plus avances en UX de reconciliation — inspirer les patterns bulk et auto-rules
3. **P&L par immeuble ET par contrat** n'existe chez aucun concurrent europeen — differenciateur fort pour SEIDO
4. **Smovin** propose des "decomptes proprietaires" — a considerer pour Phase 3 (rapports pour les proprietaires mandants)
5. **Rentio** elimine la reconciliation revenus via le prelevement SEPA — GoCardless Payments en Phase Future pourrait offrir cette option

---

## 3. Architecture d'Information

### Position dans la navigation

"Banque" est un item de **premier niveau** dans la sidebar, positionne entre Interventions et Emails :

```
Dashboard
Patrimoine       (Immeubles, Lots)
Contacts
Contrats
Interventions
Banque           <-- NOUVEAU (icone: Landmark)
Emails
---
Parametres
Aides
```

**Fichier a modifier** : `components/gestionnaire-sidebar.tsx`
- Ajouter `Landmark` aux imports Lucide (ligne ~6-18)
- Inserer dans `mainNavItems` a l'index 5 (entre Interventions et Emails, lignes 75-76)
- Structure: `{ href: "/gestionnaire/banque", label: "Banque", icon: Landmark }`
- Badge support pour le count de transactions non reconciliees

### Sous-navigation interne (Tabs)

```
/gestionnaire/banque
  /transactions          (vue par defaut — workspace reconciliation)
  /comptes               (gestion comptes connectes, blacklisting)
  /regles                (regles d'auto-liaison)
  /rapports              (P&L, taux de collecte, exports)
```

### Liens bidirectionnels avec les modules existants

| Depuis | Vers Banque | Affichage | Fichier a modifier |
|--------|-------------|-----------|-------------------|
| Fiche Contrat | Widget "Derniers paiements" | Statut reconcile/en attente des 3 derniers mois | `app/gestionnaire/(no-navbar)/contrats/[id]/contract-details-client.tsx` |
| Fiche Intervention | Widget "Paiements lies" | Transaction(s) liee(s) avec montant et date | `app/gestionnaire/(with-navbar)/interventions/[id]/...` |
| Fiche Lot | Widget "Flux financiers" | Resume entrees/sorties du mois | `app/gestionnaire/(no-navbar)/biens/lots/[id]/page.tsx` |
| Fiche Immeuble | Widget "Rentabilite" | Mini P&L du mois courant | `app/gestionnaire/(no-navbar)/biens/immeubles/[id]/building-details-client.tsx` |
| Dashboard | 3 widgets banque | Voir section 8.6 | `app/gestionnaire/(with-navbar)/dashboard/components/async-dashboard-content.tsx` |

---

## 4. Modele de Donnees

### Nouvelles tables

#### 4.1 `bank_connections` — Comptes bancaires connectes

```sql
CREATE TABLE bank_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,

  -- Tink data
  tink_user_id TEXT NOT NULL,                -- Tink permanent user ID
  tink_credentials_id TEXT,                  -- Tink credentials ID (per bank connection)
  tink_account_id TEXT NOT NULL UNIQUE,      -- Tink account identifier

  -- Account info (cached from Tink)
  bank_name TEXT NOT NULL,                   -- Ex: "Credit Agricole"
  bank_logo_url TEXT,                        -- URL logo banque (Tink)
  account_name TEXT,                         -- Ex: "Compte courant"
  account_type TEXT,                         -- CHECKING, SAVINGS, CREDIT_CARD, etc.
  iban_encrypted TEXT,                       -- Chiffre via EncryptionService
  iban_last4 TEXT,                           -- "8821" pour affichage masque
  currency TEXT NOT NULL DEFAULT 'EUR',

  -- Tokens (chiffres via EncryptionService AES-256-GCM)
  tink_access_token_encrypted TEXT,          -- Expire en 30 min (v3: corrige de 2h)
  tink_refresh_token_encrypted TEXT,         -- Long-lived
  token_expires_at TIMESTAMPTZ,              -- Quand l'access token expire

  -- Sync state
  balance DECIMAL(12,2),                     -- Dernier solde connu
  last_sync_at TIMESTAMPTZ,                  -- Derniere sync reussie
  sync_status TEXT NOT NULL DEFAULT 'active'
    CHECK (sync_status IN ('active', 'error', 'disconnected', 'blacklisted')),
  sync_error_message TEXT,

  -- Consent (PSD2 90-day limit)
  consent_expires_at TIMESTAMPTZ,

  -- AJOUT v3: Typage du compte (conformite Loi Alur — fonds mandants separes)
  account_purpose TEXT NOT NULL DEFAULT 'operating'
    CHECK (account_purpose IN ('operating', 'client_funds', 'security_deposits')),

  -- Blacklisting
  is_blacklisted BOOLEAN NOT NULL DEFAULT false,
  blacklisted_at TIMESTAMPTZ,
  blacklisted_by UUID REFERENCES users(id),

  -- Audit
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES users(id)
);

-- Index partiel (pattern SEIDO standard)
CREATE INDEX idx_bank_connections_team
  ON bank_connections(team_id)
  WHERE deleted_at IS NULL;

-- IMPORTANT: RLS utilise is_team_manager() — PAS get_my_profile_ids() directement
-- Raison: get_my_profile_ids() retourne des users.id, pas des team_id
-- is_team_manager() fait le join correct team_members -> users -> auth.uid()
ALTER TABLE bank_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bank_connections_select"
  ON bank_connections FOR SELECT
  USING (is_team_manager(team_id) AND deleted_at IS NULL);

CREATE POLICY "bank_connections_insert"
  ON bank_connections FOR INSERT
  WITH CHECK (is_team_manager(team_id));

CREATE POLICY "bank_connections_update"
  ON bank_connections FOR UPDATE
  USING (is_team_manager(team_id) AND deleted_at IS NULL);

CREATE POLICY "bank_connections_delete"
  ON bank_connections FOR DELETE
  USING (is_team_manager(team_id));
```

#### 4.2 `bank_transactions` — Transactions synchronisees

```sql
CREATE TABLE bank_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  bank_connection_id UUID NOT NULL REFERENCES bank_connections(id),

  -- Tink V2 data (immutable after import)
  tink_transaction_id TEXT NOT NULL UNIQUE,   -- Dedoublonnage
  transaction_date DATE NOT NULL,             -- dates.booked (YYYY-MM-DD)
  value_date DATE,                            -- dates.value (nullable)
  amount DECIMAL(12,2) NOT NULL,              -- Converti depuis unscaledValue/scale
  currency TEXT NOT NULL DEFAULT 'EUR',
  description_original TEXT NOT NULL,         -- descriptions.original (brut banque)
  description_display TEXT,                   -- descriptions.display (nettoye par Tink)
  -- CORRECTION v3: structure counterparties riche (payer + payee avec nom et IBAN)
  payer_name TEXT,                            -- counterparties.payer.name
  payer_account_number TEXT,                  -- counterparties.payer.identifiers.financialInstitution.accountNumber
  payee_name TEXT,                            -- counterparties.payee.name
  payee_account_number TEXT,                  -- counterparties.payee.identifiers.financialInstitution.accountNumber
  reference TEXT,                             -- Communication structuree belge
  description_detailed TEXT,                  -- descriptions.detailed.unstructured (v3: utile pour matching)
  tink_status TEXT,                           -- BOOKED, PENDING
  merchant_name TEXT,                         -- merchantInformation.merchantName (enrichment)
  merchant_category_code TEXT,                -- MCC code (enrichment)
  provider_transaction_id TEXT,               -- identifiers.providerTransactionId

  -- Reconciliation state
  status TEXT NOT NULL DEFAULT 'to_reconcile'
    CHECK (status IN ('to_reconcile', 'reconciled', 'ignored')),
  reconciled_at TIMESTAMPTZ,
  reconciled_by UUID REFERENCES users(id),
  ignored_at TIMESTAMPTZ,
  ignored_by UUID REFERENCES users(id),

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index pour le listing et le filtrage
CREATE INDEX idx_bank_transactions_team_status
  ON bank_transactions(team_id, status, transaction_date DESC);
CREATE INDEX idx_bank_transactions_tink_id
  ON bank_transactions(tink_transaction_id);
CREATE INDEX idx_bank_transactions_connection
  ON bank_transactions(bank_connection_id, transaction_date DESC);

-- RLS: policies separees par action (pattern SEIDO — evite FOR ALL)
ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bank_transactions_select"
  ON bank_transactions FOR SELECT
  USING (is_team_manager(team_id));

CREATE POLICY "bank_transactions_insert"
  ON bank_transactions FOR INSERT
  WITH CHECK (is_team_manager(team_id));

CREATE POLICY "bank_transactions_update"
  ON bank_transactions FOR UPDATE
  USING (is_team_manager(team_id));
```

#### 4.3 `transaction_links` — Liens transaction <-> entite

```sql
CREATE TABLE transaction_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  bank_transaction_id UUID NOT NULL REFERENCES bank_transactions(id),

  -- AJOUT v3: categorie de transaction (6 types au lieu de 3)
  -- Permet les charges recurrentes, depots de garantie, honoraires
  entity_type TEXT NOT NULL CHECK (entity_type IN (
    'rent_call',           -- Loyer (entree)
    'intervention',        -- Intervention SEIDO (depense)
    'supplier_contract',   -- Contrat fournisseur (depense)
    'property_expense',    -- Charge recurrente: syndic, taxe, assurance (depense)
    'security_deposit',    -- Depot de garantie (neutre — PAS un revenu)
    'management_fee'       -- Honoraires de gestion (depense agence)
  )),

  -- Entite liee (polymorphique — un seul non-null selon entity_type)
  rent_call_id UUID REFERENCES rent_calls(id),
  intervention_id UUID REFERENCES interventions(id),
  supplier_contract_id UUID REFERENCES supplier_contracts(id),
  property_expense_id UUID REFERENCES property_expenses(id),  -- AJOUT v3
  security_deposit_id UUID REFERENCES security_deposits(id),  -- AJOUT v3

  -- Check: exactement un lien parmi les FK, OU entity_type = 'management_fee' (pas de FK)
  CONSTRAINT exactly_one_link CHECK (
    (CASE WHEN rent_call_id IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN intervention_id IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN supplier_contract_id IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN property_expense_id IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN security_deposit_id IS NOT NULL THEN 1 ELSE 0 END) =
    CASE WHEN entity_type = 'management_fee' THEN 0 ELSE 1 END
  ),

  -- Matching metadata
  match_confidence DECIMAL(5,2),             -- Score de confiance (0-100)
  match_method TEXT NOT NULL DEFAULT 'manual'
    CHECK (match_method IN ('manual', 'auto_rule', 'suggestion_accepted')),
  auto_rule_id UUID REFERENCES auto_linking_rules(id),

  -- Audit
  linked_by UUID NOT NULL REFERENCES users(id),
  linked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  unlinked_at TIMESTAMPTZ,                   -- Soft unlink (garde l'historique)
  unlinked_by UUID REFERENCES users(id),

  -- Phase 1: 1 lien par transaction. Phase 2: multiple.
  -- CORRECTION v3: UNIQUE avec NULLs ne fonctionne pas en PostgreSQL (NULL != NULL)
  -- Utiliser des index uniques partiels a la place
);

-- Index uniques partiels: empechent 2 liens vers la meme entite pour la meme transaction
CREATE UNIQUE INDEX idx_transaction_links_rent_call
  ON transaction_links(bank_transaction_id, rent_call_id)
  WHERE rent_call_id IS NOT NULL AND unlinked_at IS NULL;

CREATE UNIQUE INDEX idx_transaction_links_intervention
  ON transaction_links(bank_transaction_id, intervention_id)
  WHERE intervention_id IS NOT NULL AND unlinked_at IS NULL;

CREATE UNIQUE INDEX idx_transaction_links_supplier_contract
  ON transaction_links(bank_transaction_id, supplier_contract_id)
  WHERE supplier_contract_id IS NOT NULL AND unlinked_at IS NULL;

ALTER TABLE transaction_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "transaction_links_select"
  ON transaction_links FOR SELECT
  USING (is_team_manager(team_id));

CREATE POLICY "transaction_links_insert"
  ON transaction_links FOR INSERT
  WITH CHECK (is_team_manager(team_id));

CREATE POLICY "transaction_links_update"
  ON transaction_links FOR UPDATE
  USING (is_team_manager(team_id));
```

#### 4.4 `rent_calls` — Echeances de loyer (appels de loyer)

```sql
CREATE TABLE rent_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  contract_id UUID NOT NULL REFERENCES contracts(id),
  lot_id UUID NOT NULL REFERENCES lots(id),           -- Denormalise pour queries rapides
  building_id UUID REFERENCES buildings(id),           -- Denormalise (nullable si lot independant)

  -- Echeance
  due_date DATE NOT NULL,                              -- Date d'echeance
  period_start DATE NOT NULL,                          -- Debut periode (ex: 1er mars)
  period_end DATE NOT NULL,                            -- Fin periode (ex: 31 mars)

  -- Montants attendus
  rent_amount DECIMAL(10,2) NOT NULL,                  -- Loyer hors charges
  charges_amount DECIMAL(10,2) NOT NULL DEFAULT 0,     -- Charges
  total_expected DECIMAL(10,2) GENERATED ALWAYS AS (rent_amount + charges_amount) STORED,

  -- Statut de paiement
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'partial', 'paid', 'overdue', 'cancelled')),
  total_received DECIMAL(10,2) NOT NULL DEFAULT 0,     -- Somme des transactions liees

  -- Auto-generation
  is_auto_generated BOOLEAN NOT NULL DEFAULT true,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index
CREATE INDEX idx_rent_calls_contract ON rent_calls(contract_id, due_date);
CREATE INDEX idx_rent_calls_team_status ON rent_calls(team_id, status, due_date);
CREATE INDEX idx_rent_calls_lot ON rent_calls(lot_id, due_date);

ALTER TABLE rent_calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rent_calls_select"
  ON rent_calls FOR SELECT
  USING (is_team_manager(team_id));

CREATE POLICY "rent_calls_insert"
  ON rent_calls FOR INSERT
  WITH CHECK (is_team_manager(team_id));

CREATE POLICY "rent_calls_update"
  ON rent_calls FOR UPDATE
  USING (is_team_manager(team_id));
```

#### 4.5 `auto_linking_rules` — Regles d'auto-liaison

```sql
CREATE TABLE auto_linking_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,

  -- Nom et description
  name TEXT NOT NULL,                                  -- Ex: "Loyer Martin Jean"

  -- Conditions de matching (toutes doivent etre vraies)
  conditions JSONB NOT NULL,
  -- Structure:
  -- {
  --   "counterparty_name": { "operator": "contains", "value": "Martin Jean" },
  --   "bank_connection_id": "uuid-du-compte",
  --   "amount": { "min": 1100, "max": 1300 },
  --   "reference_pattern": "+++xxx/xxxx/xxxxx+++"
  -- }

  -- Cible de liaison
  target_type TEXT NOT NULL CHECK (target_type IN ('rent_call', 'intervention', 'supplier_contract')),
  target_contract_id UUID REFERENCES contracts(id),    -- Pour rent_calls : lie au prochain appel du contrat
  target_intervention_id UUID REFERENCES interventions(id),
  target_supplier_contract_id UUID REFERENCES supplier_contracts(id),

  -- Etat
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Stats
  times_applied INTEGER NOT NULL DEFAULT 0,
  last_applied_at TIMESTAMPTZ,

  -- Audit
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES users(id)
);

ALTER TABLE auto_linking_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auto_linking_rules_select"
  ON auto_linking_rules FOR SELECT
  USING (is_team_manager(team_id) AND deleted_at IS NULL);

CREATE POLICY "auto_linking_rules_insert"
  ON auto_linking_rules FOR INSERT
  WITH CHECK (is_team_manager(team_id));

CREATE POLICY "auto_linking_rules_update"
  ON auto_linking_rules FOR UPDATE
  USING (is_team_manager(team_id) AND deleted_at IS NULL);
```

### Table existante modifiee

#### `contracts` — Ajout du flag auto-generation d'echeances

```sql
ALTER TABLE contracts ADD COLUMN auto_rent_calls BOOLEAN NOT NULL DEFAULT true;
-- L'utilisateur ne peut PAS desactiver ce flag (business rule enforced in UI)
-- Les echeances sont generees automatiquement a la creation du contrat
-- et en rolling (cron job mensuel ou trigger)
```

### Diagramme des relations

```
bank_connections ──< bank_transactions ──< transaction_links >── rent_calls
     │                                          │                    │
     │                                          ├── interventions    │
     │                                          │                    │
     │                                          └── supplier_contracts
     │
     └── auto_linking_rules ──> contracts (target)

contracts ──< rent_calls ──> lots ──> buildings
```

### Generation automatique des rent_calls

**Declencheur** : Creation d'un contrat (status = `actif` ou `a_venir`)

**Logique** :
1. A la creation du contrat → generer les echeances pour les 3 prochains mois
2. Cron job mensuel (route `/api/cron/generate-rent-calls`) → generer le mois suivant
3. `due_date` calcule selon `payment_frequency` :
   - `mensuel` → 1er de chaque mois (ou date configuree)
   - `trimestriel` → 1er du trimestre
   - `semestriel` / `annuel` → idem logique
4. `rent_amount` et `charges_amount` copies depuis le contrat au moment de la generation
5. Si le contrat est `resilie` ou `expire` → ne plus generer de nouvelles echeances

**Regle metier** : L'utilisateur ne peut PAS desactiver la generation automatique. Les echeances sont la base du suivi financier. Il peut en revanche marquer une echeance comme `cancelled` (ex: mois de gratuite).

---

## 5. Integration Tink (V2 API)

### Architecture API Tink

**Base URL** : `https://api.tink.com`

Tink utilise **OAuth 2.0 exclusivement** — pas de cles API. Deux types de tokens :

| Token | Usage | Duree | Refresh |
|-------|-------|-------|---------|
| **Client Token** | Operations app-level (creer users, grants) | 30 min (`expires_in: 1800`) | Non (re-demander) |
| **User Token** | Acceder aux donnees bancaires d'un user | **30 min** (`expires_in: 1800`) | Oui (refresh_token) |

> **CORRECTION v3** : Le token utilisateur expire en **30 min** (1800s), PAS 2h. Confirme par la doc officielle Tink (`POST /api/v1/oauth/token` response). La strategie de refresh doit anticiper cette duree courte.

### Flux technique detaille

```
                    SEIDO                                    Tink
                      │                                        │
  1. Client Token     │── POST /api/v1/oauth/token ──────────>│
     (server-side)    │   grant_type=client_credentials        │
                      │   scope=authorization:grant,user:create│
                      │<── { access_token, expires_in: 1800 } ─│
                      │                                        │
  2. Creer Tink User  │── POST /api/v1/user/create ──────────>│
     (1 par team)     │   Authorization: Bearer {client_token} │
                      │   { market: "FR", locale: "fr_FR" }    │
                      │<── { userId: "tink_user_xxx" } ────────│
                      │                                        │
  3. Redirect vers    │── Construire URL Tink Link: ──────────>│
     Tink Link        │   https://link.tink.com/1.0/           │
                      │   transactions/connect-accounts         │
                      │   ?client_id={TINK_CLIENT_ID}           │
                      │   &redirect_uri={TINK_REDIRECT_URI}     │
                      │   &market=FR&locale=fr_FR               │
                      │   &scope=accounts:read,transactions:read│
                      │                                        │
  4. User auth        │   (l'utilisateur choisit sa banque,    │
                      │    s'authentifie, donne son             │
                      │    consentement PSD2)                   │
                      │                                        │
  5. Callback         │<── GET /api/bank/oauth/callback ───────│
                      │    ?code=AUTH_CODE&state=STATE          │
                      │                                        │
  6. Exchange code    │── POST /api/v1/oauth/token ──────────>│
                      │   grant_type=authorization_code         │
                      │   code={AUTH_CODE}                      │
                      │   client_id + client_secret             │
                      │<── { access_token (30 min),             │
                      │      refresh_token,                     │
                      │      scope: "accounts:read,..." }      │
                      │                                        │
  7. Fetch accounts   │── GET /data/v2/accounts ──────────────>│
     (V2 API)         │   Authorization: Bearer {user_token}   │
                      │<── { accounts: [...], nextPageToken }  │
                      │                                        │
  8. Fetch txns       │── GET /data/v2/transactions ──────────>│
     (V2 API)         │   ?pageSize=100&accountIdIn={id}       │
                      │<── { transactions: [...],              │
                      │      nextPageToken }                   │
                      │                                        │
  9. Store            │── EncryptionService.encrypt(tokens) ───│ (Application)
                      │── INSERT bank_connections ─────────────│ (Supabase)
                      │── INSERT bank_transactions ────────────│
```

### Format des montants Tink V2

**ATTENTION** : Tink V2 n'utilise PAS des decimals — il utilise `unscaledValue` + `scale` :

```json
{
  "amount": {
    "currencyCode": "EUR",
    "value": {
      "unscaledValue": "-4500",
      "scale": "2"
    }
  }
}
```

**Conversion** : `Number(unscaledValue) / Math.pow(10, Number(scale))`
→ `-4500 / 100 = -45.00 EUR`

```typescript
// CORRECTION v3: unscaledValue et scale peuvent etre string OU number selon l'endpoint Tink
// La doc montre les deux formats: { "scale": "1", "unscaledValue": "-1300" } (strings)
// et { "scale": 2, "unscaledValue": 1050 } (numbers)
function parseTinkAmount(value: { unscaledValue: string | number; scale: string | number }): number {
  return Number(value.unscaledValue) / Math.pow(10, Number(value.scale))
}
```

### Format des transactions Tink V2

| Champ Tink | Champ SEIDO | Garanti? |
|-----------|-------------|----------|
| `id` | `tink_transaction_id` | Oui |
| `accountId` | `bank_connection_id` (via mapping) | Oui |
| `amount.value` | `amount` (converti via `parseTinkAmount`) | Oui |
| `amount.currencyCode` | `currency` | Oui |
| `dates.booked` | `transaction_date` | Oui |
| `dates.value` | `value_date` | Non |
| `descriptions.original` | `description_original` | Oui |
| `descriptions.display` | `description_display` | Non |
| `descriptions.detailed.unstructured` | `description_detailed` | Non (v3) |
| `status` | `tink_status` (BOOKED/PENDING) | Oui |
| `reference` | `reference` | Non |
| `counterparties.payer.name` | `payer_name` | Non (v3) |
| `counterparties.payer.identifiers.financialInstitution.accountNumber` | `payer_account_number` | Non (v3) |
| `counterparties.payee.name` | `payee_name` | Non (v3) |
| `counterparties.payee.identifiers.financialInstitution.accountNumber` | `payee_account_number` | Non (v3) |
| `merchantInformation.merchantName` | `merchant_name` | Non (enrichment) |
| `merchantInformation.merchantCategoryCode` | `merchant_category_code` | Non (enrichment) |
| `identifiers.providerTransactionId` | `provider_transaction_id` | Non |

### Pagination

- Default: **10 transactions/page**, max: **100**
- Cursor-based via `nextPageToken`
- Quand `nextPageToken` est vide → fin de la liste
- Lors de la sync initiale, paginer jusqu'a epuisement

### Cles a stocker

| Donnee | Stockage | Chiffrement |
|--------|----------|-------------|
| `TINK_CLIENT_ID` | Variable d'env serveur | N/A |
| `TINK_CLIENT_SECRET` | Variable d'env serveur | N/A |
| `TINK_REDIRECT_URI` | Variable d'env serveur | N/A |
| `TINK_ENVIRONMENT` | Variable d'env (`sandbox` / `production`) | N/A |
| `access_token` (30 min) | `bank_connections.tink_access_token_encrypted` | **EncryptionService** (AES-256-GCM) |
| `refresh_token` | `bank_connections.tink_refresh_token_encrypted` | **EncryptionService** (AES-256-GCM) |
| IBAN complet | `bank_connections.iban_encrypted` | **EncryptionService** (AES-256-GCM) |

> **IMPORTANT** : Utiliser `EncryptionService` de `lib/services/domain/encryption.service.ts`
> (meme pattern que `email-connection.repository.ts` pour `imap_password_encrypted`).
> NE PAS utiliser Supabase Vault (non configure dans le projet).

### Scopes OAuth necessaires

**Client token scopes** (operations app-level) :
```
authorization:grant    — Generer des authorization codes server-side
user:create            — Creer un Tink permanent user
```

**User token scopes** (acces donnees bancaires) :
```
accounts:read          — Lister les comptes
balances:read          — Lire les soldes (REQUIS — absent en v2)
transactions:read      — Lister les transactions
credentials:read       — Lire le statut des connexions
provider-consents:read — Lire le statut du consentement PSD2
```

> **CORRECTION v3** : `balances:read` est OBLIGATOIRE pour obtenir les soldes bancaires. Confirme par la doc Tink (response scope: `"accounts:read,balances:read,transactions:read"`). Les scopes client token (`authorization:grant`, `user:create`) etaient implicites mais doivent etre documentes.

### Refresh Token Strategy

```typescript
async function getValidUserToken(connection: BankConnection): Promise<string> {
  const accessToken = EncryptionService.decrypt(connection.tink_access_token_encrypted)

  // Token encore valide? (ATTENTION: expire en 30 min, pas 2h)
  // Rafraichir 2 min avant expiration pour eviter les race conditions
  const bufferMs = 2 * 60 * 1000
  if (connection.token_expires_at && new Date(connection.token_expires_at).getTime() - bufferMs > Date.now()) {
    return accessToken
  }

  // Refresh
  const refreshToken = EncryptionService.decrypt(connection.tink_refresh_token_encrypted)
  const response = await fetch('https://api.tink.com/api/v1/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.TINK_CLIENT_ID!,
      client_secret: process.env.TINK_CLIENT_SECRET!,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  })

  const data = await response.json()

  // Stocker les nouveaux tokens chiffres
  await bankConnectionRepo.updateTokens(connection.id, {
    tink_access_token_encrypted: EncryptionService.encrypt(data.access_token),
    tink_refresh_token_encrypted: data.refresh_token
      ? EncryptionService.encrypt(data.refresh_token)
      : connection.tink_refresh_token_encrypted,
    token_expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
  })

  return data.access_token
}
```

### Consentement PSD2

- Expire tous les **90 jours** — stocke dans `consent_expires_at`
- Continuous Access (necessite permanent users — verifier tier) : background refresh **4x/jour** pendant les 90 jours
- 7 jours avant expiration → notification email + badge alerte dans l'UI
- A expiration → `sync_status = 'disconnected'` + banner dans le module
- Re-authentification via le meme flux Tink Link (redirect, pas iframe)

### Webhooks Tink

Evenements confirmes :
- `account:updated` — compte mis a jour
- `reports-generation:completed` — rapport genere

```
POST https://api.tink.com/events/v1/webhook
Authorization: Bearer {client_token}
```

**Strategie** : Utiliser les webhooks en complement du cron (pas en remplacement).
Le cron est le filet de securite, les webhooks accelerent la detection.

### Sandbox / Test

- Meme URL API, ajouter `&test=true` dans l'URL Tink Link
- Provider de test: `se-test-bankid-successful`
- Console Tink : `console.tink.com` (inscription gratuite)
- Donnees simulees : comptes, transactions, authentification bancaire realiste

---

## 6. User Journeys

### Journey 1 — Premiere connexion (onboarding)

```
Etape 1: DECOUVERTE
  Dashboard → Widget "Connecter votre banque" (non-intrusif)
  OU Sidebar → Banque → Empty state avec CTA
  Message: "Reconciliez loyers et charges automatiquement"
  Temps estime affiche: "Connexion en 3 minutes"

Etape 2: SELECTION BANQUE
  Page /banque/comptes → Clic "Connecter un compte"
  → Redirect vers Tink Link (full page redirect — PAS iframe)
  → Liste banques avec logos, champ de recherche
  → Message securite: "Connexion en lecture seule via Tink. SEIDO ne stocke jamais vos identifiants."

Etape 3: AUTHENTIFICATION BANCAIRE
  → L'utilisateur choisit sa banque dans Tink Link
  → Redirect vers la banque (OAuth PSD2)
  → L'utilisateur s'authentifie avec ses identifiants bancaires
  → Consent screen (90 jours d'acces en lecture)

Etape 4: RETOUR DANS SEIDO
  → Callback /api/bank/oauth/callback?code=xxx
  → Server-side : exchange code, fetch accounts, encrypt tokens
  → Redirect vers /banque/comptes avec liste des comptes detectes
  → Toggle "Inclure / Exclure" par compte
  → Comptes courants pre-selectionnes, epargne desactivee par defaut
  → Bouton "Synchroniser ces comptes"

Etape 5: PREMIERE SYNC
  → Skeleton loader + message "Import des 90 derniers jours..."
  → Resultat: "142 transactions importees"
  → CTA: "Commencer a reconcilier" → /banque/transactions
```

### Journey 2 — Reconciliation hebdomadaire

```
DECLENCHEUR: Badge sidebar [14] + Widget dashboard "14 transactions a reconcilier"

Etape A: VUE LISTE (filtre "A reconcilier" par defaut)
  → Chaque transaction montre: date, montant, libelle, suggestion
  → Suggestions haute confiance (>85%): chip vert + bouton "Valider"
  → Confiance moyenne (50-85%): chip orange + bouton "Verifier"
  → Pas de suggestion: chip gris + bouton "Lier manuellement"

Etape B: BULK RECONCILIATION
  → Select all suggestions haute confiance → "Valider tout"
  → Toast: "12 transactions reconciliees" + undo 10s
  → Reste: 2 transactions a traitement manuel

Etape C: RECONCILIATION MANUELLE
  → Clic transaction → Sheet lateral (480px desktop, bottom sheet mobile)
  → Suggestions triees par confiance
  → Recherche manuelle: autocomplete contrat/intervention/lot
  → Bouton "Ignorer" si non pertinent

Etape D: PROMPT AUTO-RULE
  → Apres liaison manuelle: toast "Lier automatiquement les futurs virements de ce compte?"
  → Si accepte: Dialog de configuration (expediteur, montant min/max, cible)
```

### Journey 3 — Reporting mensuel

```
DECLENCHEUR: 1er du mois, notification "Rapport financier disponible"

/banque/rapports
  → 4 KPI widgets: Revenus, Depenses, Taux de collecte, Transactions en attente
  → Graphique P&L 12 mois (recharts BarChart)
  → Table P&L par entite (immeuble / lot / contrat — tabs)
  → Export PDF / CSV
```

### Journey 4 — Gestion d'erreur

| Situation | Reponse UX |
|-----------|-----------|
| Echec sync bancaire | Banner persistant + bouton "Reessayer" + support |
| Transaction doublon | Detection auto via tink_transaction_id UNIQUE + skip silencieux |
| Montant different du loyer attendu | Flag "Ecart: -150EUR" + champ motif |
| Consentement expire (90j) | Badge rouge sidebar + email + banner re-auth via Tink Link |
| Compte deconnecte | Statut "disconnected" + CTA reconnexion |
| Token refresh echoue | `sync_status = 'error'` + retry cron |
| Rate limit Tink (HTTP 429) | Exponential backoff + Retry-After header |

---

## 7. Fonctionnalites Detaillees

### 7.1 Statuts de transaction

```
to_reconcile ──> reconciled     (via liaison a une entite)
to_reconcile ──> ignored        (via action "Ignorer")
reconciled   ──> to_reconcile   (via "Supprimer le lien")
ignored      ──> to_reconcile   (via "Restaurer")
```

### 7.2 Algorithme de matching (suggestions)

Scoring multi-criteres (somme ponderee, seuil 20% pour affichage) :

| Critere | Poids | Logique |
|---------|-------|---------|
| Communication structuree belge | 40% | Regex `\+{3}\d{3}/\d{4}/\d{5}\+{3}` → match contrat |
| Montant exact | 25% | `abs(transaction.amount - rent_call.total_expected) < 0.01` |
| Montant approchant (+-5%) | 15% | Tolerance pour frais bancaires |
| Nom expediteur | 15% | Fuzzy match sur `payer_name` (v3: ex-counterparty_name) vs noms locataires du contrat |
| Date proche echeance (+-15j) | 5% | Proximite avec `rent_call.due_date` |

**Pour les depenses (interventions)** :

| Critere | Poids | Logique |
|---------|-------|---------|
| Montant match devis accepte | 35% | `abs(amount) matches intervention_quotes.amount WHERE status='accepted'` |
| Nom prestataire | 30% | Fuzzy match `payee_name` (v3: ex-counterparty_name) vs prestataire assigne |
| Date post-cloture | 15% | Transaction apres `cloturee_par_*` |
| Meme compte que paiements precedents | 20% | Historique de ce prestataire |

### 7.3 Auto-linking rules

**Creation** : Proposee automatiquement apres chaque liaison manuelle si aucune regle existante ne matche

**Conditions configurables** :
- `counterparty_name` : contient / est exactement / commence par
- `bank_connection_id` : compte specifique / tous les comptes
- `amount` : entre min et max (tolerance configurable)
- `reference_pattern` : pattern de communication structuree

**Execution** : A chaque sync, les nouvelles transactions sont testees contre les regles actives. Si match → `status = 'reconciled'` + `match_method = 'auto_rule'`.

**Gestion** :
- Activer / desactiver (toggle)
- Modifier les conditions
- Supprimer (soft delete avec confirmation)
- Stats : nombre de fois appliquee, derniere application

### 7.4 Blacklisting de compte

- Un compte connecte peut etre "blackliste" → les transactions ne sont plus synchronisees
- Les transactions deja importees restent visibles mais marquees visuellement
- Cas d'usage : compte perso connecte par erreur, compte cloture
- Reversible : "Retirer du blacklist" reprend la sync

### 7.5 Suppression de lien

- Une transaction reconciliee peut etre "deliee" a tout moment
- Confirmation simple (pas de modale lourde)
- La transaction repasse en `to_reconcile`
- L'echeance recalcule son `total_received` et son statut
- Historique conserve (`unlinked_at`, `unlinked_by` dans `transaction_links`)

### 7.6 Liens multiples par transaction

- Phase 1 : **1 lien par transaction** (simplifie)
- Phase 2 : liens multiples avec split montants (ex: virement couvrant loyer + charges d'intervention)

### 7.7 Alerte loyer non reconcilie (J+2) & Relance locataire

**Declencheur** : Cron quotidien (`/api/cron/check-unpaid-rent-calls`), execute chaque jour a 9h.

**Logique** :
1. Query `rent_calls WHERE status = 'pending' AND due_date <= NOW() - INTERVAL '2 days'`
2. Pour chaque echeance non reconciliee depuis 2 jours :
   - Envoyer une notification au gestionnaire (in-app + push + email)
   - Message : "Loyer de mars pour [Lot 12B — M. Jean] : aucune transaction liee. Verifiez manuellement ou envoyez un rappel au locataire."

**Notification gestionnaire (3 canaux)** :
- **In-app** : Badge sur le widget "Loyers en retard" du dashboard + entree dans le centre de notifications
- **Push native** : "[SEIDO] Loyer non recu — Lot 12B, M. Jean (echeance 01/03)"
- **Email** : Via Resend, resume quotidien de toutes les echeances non reconciliees (batch, 1 email max/jour)

**CTA dans la notification** : 2 actions en 1 clic :
1. **"Reconcilier"** → ouvre `/banque/transactions` filtre sur le montant et la periode + sheet de reconciliation
2. **"Envoyer un rappel"** → ouvre la modale de relance locataire (voir ci-dessous)

**Modale de relance locataire** :

```
┌── RELANCE LOCATAIRE ──────────────────────────────────────────┐
│                                                            [x] │
│  Rappel de paiement — Loyer mars 2026                         │
│  ─────────────────────────────────────────────────────────── │
│                                                               │
│  Destinataire: Martin Jean (martin.jean@email.com)            │
│  Lot: 12B, Residence Gambetta                                 │
│  Montant du: 1 200,00 EUR     Echeance: 01/03/2026            │
│                                                               │
│  Canaux de notification:                                      │
│  [x] Notification in-app (portail locataire)                  │
│  [x] Notification push (mobile)                               │
│  [x] Email                                                    │
│                                                               │
│  Message (pre-rempli, modifiable):                             │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ Bonjour Martin,                                          │ │
│  │                                                          │ │
│  │ Nous n'avons pas encore recu votre loyer de mars 2026    │ │
│  │ d'un montant de 1 200,00 EUR pour le lot 12B,            │ │
│  │ Residence Gambetta.                                       │ │
│  │                                                          │ │
│  │ Merci de proceder au reglement dans les meilleurs delais.│ │
│  │                                                          │ │
│  │ Cordialement,                                            │ │
│  │ [Nom du gestionnaire]                                     │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                               │
│  [Annuler]                         [Envoyer le rappel]        │
└───────────────────────────────────────────────────────────────┘
```

**Comportement** :
- Message pre-rempli avec template parametrise (locataire, montant, lot, echeance, nom gestionnaire)
- Le gestionnaire peut modifier le message avant envoi
- Les 3 canaux sont coches par defaut, decochables individuellement
- L'envoi utilise le systeme de notification existant (`createInterventionNotification` pattern) + Resend pour l'email
- Historique : la relance est tracee dans `activity_logs` (entity_type: 'rent_call', action: 'reminder_sent')
- Anti-spam : 1 relance max par echeance par jour (cooldown 24h)

**Relance depuis la vue Banque** :
- Dans la liste des transactions, les echeances `overdue` affichent un bouton "Relancer" en bout de ligne
- Clic → meme modale de relance
- Possible aussi depuis le widget "Loyers en retard" du dashboard

**Relance en masse** :
- Dans `/banque/rapports` > section "Loyers en retard", checkbox par echeance
- Bouton "Relancer les selectionnes" → envoi batch de rappels
- Toast de confirmation : "4 rappels envoyes"

**Schema de donnees supplementaire** (tracking des relances) :

```sql
-- Ajout a rent_calls pour tracker la derniere relance
ALTER TABLE rent_calls ADD COLUMN last_reminder_sent_at TIMESTAMPTZ;
ALTER TABLE rent_calls ADD COLUMN reminder_count INTEGER NOT NULL DEFAULT 0;
```

---

## 8. Specifications UI

### 8.1 Vue Transactions (workspace principal)

**Desktop (>= 1024px)** : Table avec colonnes Date, Description, Montant, Compte, Statut

```
┌─────────────────────────────────────────────────────────────────────┐
│ Banque                                    [+ Connecter un compte]   │
│ [Transactions]  [Comptes]  [Regles]  [Rapports]                    │
├─────────────────────────────────────────────────────────────────────┤
│ [Search...]  [Compte v]  [Statut v]  [Periode v]  [>= EUR v]       │
├─────────────────────────────────────────────────────────────────────┤
│ [ ] Date     Description              Montant    Compte     Statut │
│ [ ] 15 mars  Virement Martin JEAN     +1 200 EUR CA ***8821  [A reconcilier] │
│ [ ] 14 mars  EDF HABITAT PRO          -342 EUR   BNP ***4412 [Reconcilie]    │
│ [ ] 13 mars  Prelevement MAIF         -89 EUR    CA ***8821  [Ignore]        │
├─────────────────────────────────────────────────────────────────────┤
│ < Precedent   Page 1 / 12   Suivant >              [25 v par page] │
└─────────────────────────────────────────────────────────────────────┘
```

**Mobile (< 768px)** : Cards empilees au lieu de table, filtres dans bottom sheet

### 8.2 Panel de reconciliation (Sheet lateral)

- **Desktop** : Sheet droite 480px, la table se compresse (`grid-cols-[1fr_480px]`)
- **Mobile** : Bottom sheet 85vh avec drag handle
- **Contenu** : Details transaction + suggestions triees + recherche manuelle + actions

### 8.3 Badges de statut

| Statut | Couleur | Icone Lucide | Tailwind |
|--------|---------|-------------|----------|
| A reconcilier | Ambre | `CircleDashed` | `border-amber-400 text-amber-700 bg-amber-50` |
| Reconcilie | Vert | `CircleCheck` | `border-emerald-400 text-emerald-700 bg-emerald-50` |
| Ignore | Gris | `CircleMinus` | `text-muted-foreground bg-muted` |

### 8.4 Formatage montants

- **Positif** : `+1 200,00 EUR` en `text-emerald-700 font-semibold tabular-nums`
- **Negatif** : `−342,50 EUR` en `text-rose-600 font-semibold tabular-nums` (U+2212 minus)
- Toujours `tabular-nums` pour alignement colonne
- **Conversion Tink** : `parseTinkAmount(value)` avant stockage

### 8.5 Score de confiance (suggestions)

| Niveau | Seuil | UI |
|--------|-------|-----|
| Haute confiance | >85% | Chip vert, bouton "Valider" primary |
| Moyenne | 50-85% | Chip ambre, bouton "Verifier" |
| Faible | 20-50% | Chip gris, affiche mais pas de CTA |
| < 20% | | Non affiche |

**Anti-pattern** : Ne PAS afficher le pourcentage numerique. Vert/ambre/gris suffit.

### 8.6 Widgets Dashboard

**Fichier** : `app/gestionnaire/(with-navbar)/dashboard/components/async-dashboard-content.tsx`
**Pattern** : Ajouter services dans le cache Promise.all (lignes 27-32), puis passer en props a `ManagerDashboardV2`

**Widget 1 — Transactions a reconcilier**
```
[CircleDashed]  7 transactions a reconcilier
                [Reconcilier maintenant ->]
```

**Widget 2 — Cash flow du mois**
```
[TrendingUp]  Cash flow — Mars 2026
              Entrees: +28 400 EUR
              Sorties:  -6 230 EUR
              Net:     +22 170 EUR
```

**Widget 3 — Loyers en retard**
```
[AlertCircle]  3 loyers en retard (−3 600 EUR)
               Martin Jean — Lot 12B    +30j
               Dupont Marie — Lot 3A    +15j
```

### 8.7 Empty states

| Vue | Icone | Message | CTA |
|-----|-------|---------|-----|
| Transactions (pas de compte) | `Landmark` | "Aucun compte connecte" | "Connecter un compte" |
| Transactions (0 resultats filtre) | `SearchX` | "Aucun resultat" | "Effacer les filtres" |
| Comptes | `Landmark` | "Aucun compte connecte" | "Connecter mon premier compte" |
| Regles | `Zap` | "Aucune regle configuree" | "Creer ma premiere regle" |
| Rapports | `BarChart3` | "Aucune donnee" | "Connecter un compte" |
| Tout reconcilie | `CircleCheck` (vert) | "Aucune transaction en attente" | "Voir toutes les transactions" |

### 8.8 Composants shadcn/ui utilises

`Table` `Checkbox` `Badge` `Button` `Input` `Select` `Sheet` `Card` `Tabs` `Progress` `Switch` `Dialog` `AlertDialog` `Toast` `Pagination` `DropdownMenu` `Tooltip` `Skeleton`

### 8.9 Icones Lucide

`Landmark` `CircleDashed` `CircleCheck` `CircleMinus` `Search` `SearchX` `FileX` `Zap` `BarChart3` `TrendingUp` `AlertCircle` `AlertTriangle` `RefreshCw` `Settings` `Trash2` `Pencil` `ArrowRight` `X` `Plus`

---

## 9. Rapports & Rentabilite

### 9.1 KPI widgets (haut de page rapports)

| Widget | Calcul | Visuel |
|--------|--------|--------|
| Revenus du mois | SUM(amount) WHERE amount > 0 AND reconciled | Card + delta vs mois precedent |
| Depenses du mois | SUM(amount) WHERE amount < 0 AND reconciled | Card + delta |
| Taux de collecte | rent_calls(paid+partial) / rent_calls(total) x 100 | Progress bar |
| A reconcilier | COUNT WHERE status = 'to_reconcile' | Chiffre + lien |

### 9.2 Graphique P&L (12 mois glissants)

- **Composant** : `recharts` BarChart (deja utilise dans SEIDO)
- **Series** : Revenus (vert emerald) + Depenses (rose) + Net (bleu primary)
- **Granularite** : mensuelle
- **Filtrable** : par immeuble, par lot

### 9.3 Table P&L par entite

Trois vues (tabs) :

**Par immeuble** :
```
Immeuble            | Revenus    | Depenses   | Net        | Taux collecte
Residence Gambetta  | +18 200 EUR | -2 100 EUR  | +16 100 EUR | 95%
Residence Voltaire  | +10 200 EUR | -4 130 EUR  | +6 070 EUR  | 88%
```

**Par lot** :
```
Lot                 | Immeuble   | Revenus   | Depenses  | Net       | Locataire
Lot 12B, 3e etage   | Gambetta   | +1 200 EUR | -150 EUR   | +1 050 EUR | M. Jean
Lot 3A, RDC         | Voltaire   | +850 EUR   | -890 EUR   | -40 EUR    | Mme Dupont
```

**Par contrat** :
```
Contrat             | Lot        | Periode         | Attendu    | Recu       | Ecart
BAL-2024-015        | Lot 12B    | Jan-Mar 2026    | +3 600 EUR  | +3 600 EUR  | 0 EUR
BAL-2024-022        | Lot 3A     | Jan-Mar 2026    | +2 550 EUR  | +1 700 EUR  | -850 EUR
```

### 9.4 Export

- **PDF** : Rapport formate avec en-tete SEIDO, periode, logo equipe
- **CSV** : Donnees brutes pour import dans logiciel comptable
- **Filtre** : la periode selectionnee s'applique a l'export

---

## 10. Edge Cases & Regles Metier

### 10.1 Regles critiques

| Regle | Implementation |
|-------|---------------|
| Les echeances sont TOUJOURS generees automatiquement | `auto_rent_calls = true` non modifiable en UI |
| Le lien peut toujours etre supprime | `unlinked_at/unlinked_by` dans `transaction_links` |
| L'historique des liens est conserve | Soft unlink, jamais de hard delete |
| Le blacklist d'un compte arrete la sync | `is_blacklisted = true` + `sync_status = 'blacklisted'` |
| Les transactions d'un compte blackliste restent visibles | Filtrables mais pas supprimees |
| Les suggestions < 20% ne sont pas affichees | Seuil configurable cote serveur |
| Consentement PSD2 expire a 90 jours | Notification J-7, badge alerte, statut disconnected |
| Phase 1: 1 lien par transaction | CHECK constraint ou validation applicative |
| Alerte J+2 si loyer non reconcilie | Cron quotidien, notification gestionnaire 3 canaux |
| Relance locataire anti-spam | Max 1 rappel par echeance par jour (cooldown 24h) |
| Relance tracee dans activity_logs | entity_type: 'rent_call', action: 'reminder_sent' |

### 10.2 Paiements partiels

- Si `amount < rent_call.total_expected` → echeance passe en statut `partial`
- `total_received` est incremente du montant lie
- Affichage: "Recu 850 EUR / 1 200 EUR attendu — Ecart: -350 EUR"
- L'echeance reste ouverte pour recevoir des paiements supplementaires

### 10.3 Trop-percu

- Si `total_received > total_expected` → alerte visuelle (badge orange "Trop-percu")
- Pas de blocage — le gestionnaire decide quoi faire (avoir, erreur, etc.)

### 10.4 Transactions doublons

- Detection via `tink_transaction_id` (UNIQUE constraint)
- Si Tink renvoie une transaction deja connue → skip silencieux (ON CONFLICT DO NOTHING)
- Si meme montant/date/description mais ID different → alerte "Possible doublon" dans l'UI

### 10.5 Multi-equipe

- Toutes les tables ont `team_id` + RLS via `is_team_manager(team_id)`
- Un utilisateur multi-equipe voit uniquement les comptes/transactions de l'equipe active
- Les tokens Tink sont lies a `bank_connections.team_id`
- `tink_user_id` est cree par equipe (1 user Tink par equipe SEIDO)

---

## 11. Mobile

### Fonctionnalites disponibles sur mobile

| Fonctionnalite | Disponible | Justification |
|----------------|-----------|---------------|
| Consulter soldes | Oui | "Le loyer est-il arrive?" en mobilite |
| Voir transactions du jour | Oui | Verification rapide |
| Valider suggestion haute confiance | Oui | 1 tap depuis notification |
| Voir loyers en retard | Oui | Alertes proactives |
| Rapports lecture seule | Oui (simplifie) | Consultation occasionnelle |
| Reconciliation manuelle en masse | Non | Trop de precision requise |
| Configuration comptes/blacklist | Non | Action administrative rare |
| Export comptable | Non | Desktop uniquement |

### Pattern mobile specifique

Notification push pour validation rapide :
```
[SEIDO] Loyer recu: +1 250 EUR — Lier a M. Dupont, Lot 3B?
→ Tap → Bottom sheet: [Valider] [Voir detail] [Ignorer]
```

---

## 12. Securite & RGPD

### Donnees sensibles

| Donnee | Classification | Protection |
|--------|---------------|------------|
| IBAN | Donnee personnelle | `EncryptionService.encrypt()` + masquage UI (***8821) + `data-cs-mask` |
| Tokens Tink | Secret | `EncryptionService.encrypt()` (AES-256-GCM, meme cle que email) |
| Transactions | Donnee financiere | RLS team-based via `is_team_manager()`, audit trail |
| Noms contreparties | Donnee personnelle | RLS team-based, `data-cs-mask` dans Contentsquare |

### Pattern d'encryption (aligne sur email-connection.repository.ts)

```typescript
// Repository: createConnection()
const encrypted = {
  ...dto,
  tink_access_token_encrypted: EncryptionService.encrypt(dto.tink_access_token),
  tink_refresh_token_encrypted: EncryptionService.encrypt(dto.tink_refresh_token),
  iban_encrypted: EncryptionService.encrypt(dto.iban),
}
// Supprimer les valeurs en clair
delete encrypted.tink_access_token
delete encrypted.tink_refresh_token
delete encrypted.iban

// Repository: getConnection() — decrypter pour usage
const connection = data
connection.tink_access_token = EncryptionService.decrypt(data.tink_access_token_encrypted)
```

### RLS — Pattern corrige (post-audit)

**IMPORTANT** : Toutes les policies utilisent `is_team_manager(team_id)` et NON `get_my_profile_ids()` directement.

Raison : `get_my_profile_ids()` retourne des `users.id` (PK DB). L'ancien pattern `team_id IN (SELECT team_id FROM team_members WHERE user_id = get_my_profile_ids())` est fonctionnellement correct mais non-standard dans SEIDO. Le pattern standard utilise `is_team_manager()` qui fait le join en interne avec `team_members.role IN ('gestionnaire', 'admin')` et `left_at IS NULL`.

### Service-Role Client

Le cron de sync Tink s'execute **sans contexte utilisateur**. Il DOIT utiliser `createServiceRoleSupabaseClient()` :

```typescript
// /api/cron/sync-bank-transactions/route.ts
import { createServiceRoleSupabaseClient } from '@/lib/services'

export async function GET() {
  const supabase = createServiceRoleSupabaseClient() // Bypasse RLS

  const { data: connections } = await supabase
    .from('bank_connections')
    .select('*')
    .eq('sync_status', 'active')
    .eq('is_blacklisted', false)
    .is('deleted_at', null)

  for (const connection of connections) {
    // Decrypt token, call Tink, insert transactions...
  }
}
```

### Principes RGPD

1. **Lecture seule** : Tink Bank Account Data = AISP. Aucune ecriture sur les comptes bancaires.
2. **Consentement explicite** : L'utilisateur connecte sa banque via OAuth avec ecran de consentement PSD2.
3. **Minimisation** : Ne stocker que les champs necessaires.
4. **Droit a l'effacement** : Suppression du compte → suppression de `bank_connections` + `bank_transactions` + tokens + revocation Tink.
5. **Audit trail** : Tous les liens/unlins traces (`linked_by`, `unlinked_by`, timestamps).
6. **Masquage** : IBAN masque dans l'UI (`data-cs-mask` pour Contentsquare).

---

## 13. Points d'Integration Codebase

### Fichiers a modifier (existants)

| Fichier | Modification | Complexite |
|---------|-------------|-----------|
| `components/gestionnaire-sidebar.tsx` | Ajouter nav item Banque + icone Landmark + badge | Faible |
| `app/gestionnaire/(with-navbar)/dashboard/components/async-dashboard-content.tsx` | Ajouter services bank dans cache + 3 widgets | Moyenne |
| `components/dashboards/manager/manager-dashboard-v2.tsx` | Ajouter props + rendu 3 widgets bank | Moyenne |
| `app/gestionnaire/(no-navbar)/contrats/[id]/contract-details-client.tsx` | Widget "Derniers paiements" | Moyenne |
| `app/gestionnaire/(no-navbar)/biens/lots/[id]/page.tsx` | Widget "Flux financiers" | Moyenne |
| `app/gestionnaire/(no-navbar)/biens/immeubles/[id]/building-details-client.tsx` | Widget "Rentabilite" | Moyenne |
| `lib/database.types.ts` | Regenerer apres migration (`npm run supabase:types`) | Auto |
| `.env.example` | Ajouter TINK_CLIENT_ID, TINK_CLIENT_SECRET, TINK_REDIRECT_URI, TINK_ENVIRONMENT | Faible |

### Nouveaux fichiers a creer

```
app/gestionnaire/(with-navbar)/banque/
├── page.tsx                          — Server Component (getServerAuthContext)
├── banque-client.tsx                 — Client principal ('use client')
├── layout.tsx                        — Layout avec sous-nav Tabs
├── components/
│   ├── transactions/
│   │   ├── transaction-list.tsx
│   │   ├── transaction-row.tsx
│   │   ├── transaction-filters.tsx
│   │   ├── transaction-empty.tsx
│   │   └── bulk-action-bar.tsx
│   ├── reconciliation/
│   │   ├── reconciliation-panel.tsx
│   │   ├── match-suggestion-card.tsx
│   │   ├── manual-search.tsx
│   │   ├── auto-rule-prompt.tsx
│   │   └── rent-reminder-dialog.tsx  — Modale relance locataire (3 canaux)
│   ├── accounts/
│   │   ├── account-list.tsx
│   │   ├── account-card.tsx
│   │   ├── tink-connect-button.tsx
│   │   └── account-empty.tsx
│   ├── rules/
│   │   ├── rules-list.tsx
│   │   ├── rule-row.tsx
│   │   └── rules-empty.tsx
│   └── reports/
│       ├── reports-dashboard.tsx
│       ├── pnl-chart.tsx
│       ├── rent-collection-rate.tsx
│       └── export-button.tsx

lib/services/
├── domain/
│   ├── bank.service.ts               — Logique metier bank
│   ├── tink-api.service.ts           — Client Tink API V2
│   └── bank-matching.service.ts      — Algorithme de matching
├── repositories/
│   ├── bank-connection.repository.ts — CRUD bank_connections + encryption
│   ├── bank-transaction.repository.ts— CRUD bank_transactions
│   ├── transaction-link.repository.ts— CRUD transaction_links
│   ├── rent-call.repository.ts       — CRUD rent_calls
│   └── auto-linking-rule.repository.ts— CRUD auto_linking_rules

lib/types/
└── bank.types.ts                     — Types TypeScript

app/api/bank/
├── oauth/
│   ├── authorize/route.ts            — Initier Tink Link redirect
│   └── callback/route.ts             — Callback OAuth Tink
├── connections/
│   ├── route.ts                      — GET list, POST create
│   └── [id]/
│       ├── route.ts                  — DELETE (soft), PATCH
│       └── blacklist/route.ts        — PATCH toggle blacklist
├── transactions/
│   ├── route.ts                      — GET list (filtres, pagination)
│   └── [id]/
│       ├── reconcile/route.ts        — POST link, DELETE unlink
│       └── ignore/route.ts           — PATCH ignore/restore
├── rules/
│   ├── route.ts                      — GET list, POST create
│   └── [id]/route.ts                 — PATCH update, DELETE
├── sync/route.ts                     — POST manual sync
├── reports/route.ts                  — GET reports data
└── webhooks/
    └── tink/route.ts                 — POST webhook handler

app/api/cron/
├── sync-bank-transactions/route.ts   — Cron: sync toutes les 4h
├── generate-rent-calls/route.ts      — Cron: generation mensuelle echeances
├── check-consent-expiry/route.ts     — Cron: alerte expiration PSD2
└── check-unpaid-rent-calls/route.ts  — Cron: alerte J+2 + passage overdue (quotidien 9h)

app/actions/
├── bank-actions.ts                   — Server actions (link, unlink, ignore)
└── rent-reminder-actions.ts          — Server actions (envoyer relance locataire)

supabase/migrations/
└── 20260319100000_add_banking_schema.sql — Migration complete
```

---

## 14. API Routes

Toutes les routes suivent le pattern existant avec `getApiAuthContext()` :

```typescript
// Pattern standard (aligne sur /api/emails/connections/route.ts)
export async function GET() {
  const authResult = await getApiAuthContext()
  if (!authResult.success) return authResult.error

  const { supabase, userProfile } = authResult.data
  if (!userProfile?.team_id) {
    return NextResponse.json({ connections: [] })
  }

  const service = createServerBankService(supabase)
  const result = await service.getConnections(userProfile.team_id)

  return NextResponse.json({ success: true, data: result })
}
```

| Route | Methode | Auth | Usage |
|-------|---------|------|-------|
| `/api/bank/oauth/authorize` | GET | `getApiAuthContext()` | Generer URL Tink Link |
| `/api/bank/oauth/callback` | GET | `getApiAuthContext()` (via state/cookie) | Echanger code, creer connection |
| `/api/bank/connections` | GET/POST | `getApiAuthContext()` | Lister/creer connections |
| `/api/bank/connections/[id]` | DELETE/PATCH | `getApiAuthContext()` | Supprimer/modifier connection |
| `/api/bank/connections/[id]/blacklist` | PATCH | `getApiAuthContext()` | Toggle blacklist |
| `/api/bank/transactions` | GET | `getApiAuthContext()` | Lister avec filtres |
| `/api/bank/transactions/[id]/reconcile` | POST/DELETE | `getApiAuthContext()` | Lier/delier |
| `/api/bank/transactions/[id]/ignore` | PATCH | `getApiAuthContext()` | Ignorer/restaurer |
| `/api/bank/rules` | GET/POST | `getApiAuthContext()` | Lister/creer regles |
| `/api/bank/rules/[id]` | PATCH/DELETE | `getApiAuthContext()` | Modifier/supprimer regle |
| `/api/bank/sync` | POST | `getApiAuthContext()` | Sync manuelle |
| `/api/bank/reports` | GET | `getApiAuthContext()` | Donnees rapports |
| `/api/bank/webhooks/tink` | POST | Signature Tink | Webhook handler |

---

## 15. Cron Jobs

### 15.1 Sync Tink (toutes les 4h)

**Route** : `/api/cron/sync-bank-transactions`
**Auth** : Service-role (`createServiceRoleSupabaseClient()`)
**Logique** :
1. Lister toutes les `bank_connections` actives et non-blacklistees
2. Pour chaque connection: refresh token si expire → fetch transactions V2 → insert avec dedoublonnage
3. Appliquer les auto-linking rules sur les nouvelles transactions
4. Mettre a jour `last_sync_at`, `balance`, `sync_status`
5. En cas d'erreur : `sync_status = 'error'`, `sync_error_message`, log

### 15.2 Generation echeances (mensuel, 1er du mois)

**Route** : `/api/cron/generate-rent-calls`
**Auth** : Service-role
**Logique** :
1. Lister tous les contrats actifs (`status IN ('actif', 'a_venir')`)
2. Pour chaque contrat: generer les `rent_calls` pour le mois suivant
3. Verifier qu'aucun doublon n'existe (UNIQUE contract_id + due_date)
4. Calculer `due_date` selon `payment_frequency`
5. Marquer les echeances passees non-payees comme `overdue`

### 15.3 Alerte expiration PSD2 (quotidien)

**Route** : `/api/cron/check-consent-expiry`
**Auth** : Service-role
**Logique** :
1. Query `bank_connections WHERE consent_expires_at <= NOW() + INTERVAL '7 days'`
2. Envoyer notification email via Resend (pattern existant)
3. Si expire: `sync_status = 'disconnected'`

### 15.4 Alerte loyer non reconcilie J+2 & passage overdue (quotidien, 9h)

**Route** : `/api/cron/check-unpaid-rent-calls`
**Auth** : Service-role
**Logique** :
1. **Passage overdue** : `UPDATE rent_calls SET status = 'overdue' WHERE status = 'pending' AND due_date < NOW() - INTERVAL '2 days'`
2. **Detection echeances non reconciliees** : Query `rent_calls WHERE status = 'overdue' AND last_reminder_sent_at IS NULL` (premiere alerte) OU `last_reminder_sent_at < NOW() - INTERVAL '7 days'` (relance hebdomadaire)
3. **Grouper par equipe** pour envoyer 1 email batch par gestionnaire (pas 1 email par echeance)
4. **Notification gestionnaire** (3 canaux) :
   - In-app : entree dans le centre de notifications SEIDO
   - Push : "[SEIDO] X loyer(s) non recu(s) — Verifiez ou relancez"
   - Email (Resend) : resume quotidien avec tableau des echeances en attente et CTA par echeance
5. **NE PAS notifier le locataire automatiquement** — le gestionnaire decide de relancer via la modale

**Frequence des alertes gestionnaire** :
- J+2 : premiere alerte
- Puis toutes les semaines tant que l'echeance reste `overdue` et non reconciliee
- Stop quand le gestionnaire reconcilie, ignore, ou annule l'echeance

---

## 16. Phases d'Implementation

### Phase 1 — MVP (6-8 semaines)

**Objectif** : Connexion bancaire + sync + reconciliation manuelle + echeances auto

| Composant | Estimation |
|-----------|-----------|
| Migration DB (5 tables + RLS + indexes) | 1 semaine |
| Integration Tink (OAuth + sync + cron + encryption) | 2 semaines |
| Generation auto echeances (rent_calls) | 1 semaine |
| UI Transactions (liste + filtres + sheet reconciliation) | 2 semaines |
| UI Comptes (connexion + liste + blacklist) | 1 semaine |
| Navigation (sidebar + dashboard widgets) | 0.5 semaine |
| Tests integration + E2E | 1 semaine |

**Livrable** : Un gestionnaire peut connecter sa banque, voir ses transactions, les lier manuellement aux echeances de loyer et aux interventions, et voir les loyers en retard.

### Phase 2 — Intelligence (4-6 semaines)

| Composant | Estimation |
|-----------|-----------|
| Algorithme de matching (suggestions auto) | 2 semaines |
| Auto-linking rules (creation + execution) | 1.5 semaines |
| Bulk reconciliation | 1 semaine |
| Rapports P&L (par immeuble/lot/contrat) | 1.5 semaines |

**Livrable** : Le systeme propose des suggestions, apprend des habitudes, et genere des rapports de rentabilite.

### Phase 3 — Excellence (3-4 semaines)

| Composant | Estimation |
|-----------|-----------|
| Export PDF/CSV | 1 semaine |
| Notifications push (mobile) | 0.5 semaine |
| Split transactions (liens multiples) | 1.5 semaines |
| Communication structuree belge (matching) | 1 semaine |
| Widgets contrat/intervention/lot (bidirectionnels) | 1 semaine |

### Phase Future — Paiements (GoCardless)

- Integration GoCardless Payments pour prelevement SEPA
- Mandats de prelevement digital
- Collection automatique des loyers → elimination totale de la reconciliation revenus
- Relance automatique des impayes

---

## Decisions (validees v3 — 2026-03-21)

| # | Question | **Decision** | Justification |
|---|----------|-------------|---------------|
| 1 | Tink tier | **Enterprise** (permanent users) | Sans persistence >24h, aucun MVP viable. Confirmer avec Tink sales en parallele. |
| 2 | Generation echeances | **Trigger + cron** | Plus reactif a la creation de contrat |
| 3 | Liens Phase 1 | **1 lien/transaction** avec `entity_type` des Phase 1 | Simplifie le MVP, 6 categories disponibles |
| 4 | Historique transactions | **90 jours** (defaut PSD2) | Suffisant pour le lancement |
| 5 | Communication structuree | **Phase 3** | Matching basique suffisant pour MVP |
| 6 | Cle de chiffrement | **Renommer `EMAIL_ENCRYPTION_KEY` → `ENCRYPTION_KEY`** | Cle generique, migration one-shot |
| 7 | Tink Link | **Redirect** + URL `/1.0/transactions/connect-accounts` | Configurable via env var `TINK_LINK_URL`, tester en sandbox |
| 8 | Tink user | **1 par equipe** | Alignement `team_id` |
| 9 | Mandants | **Phase 2** | MVP fonctionne pour gestionnaires solo |
| 10 | Indexation BE | **Phase 2** | Important mais pas bloquant MVP |

---

## Corrections post-audit (v2)

| Bug | Gravite | Correction |
|-----|---------|-----------|
| RLS `get_my_profile_ids()` en comparaison directe avec `team_id` | **Critique** | Remplace par `is_team_manager(team_id)` sur toutes les tables |
| "Supabase Vault" reference mais non configure | **Haute** | Utiliser `EncryptionService` (AES-256-GCM) comme email module |
| Tink API V1 reference pour accounts/transactions | **Haute** | Utiliser `/data/v2/accounts` et `/data/v2/transactions` |
| Montants Tink en decimal direct | **Haute** | Convertir `unscaledValue/scale` via `parseTinkAmount()` |
| Pas de service-role pour cron sync | **Haute** | Ajouter `createServiceRoleSupabaseClient()` dans les cron routes |
| Tokens non chiffres dans le schema initial | **Haute** | Colonnes `*_encrypted` + `EncryptionService` dans le repository |
| FOR ALL dans les policies RLS | **Moyenne** | Policies separees par action (SELECT/INSERT/UPDATE/DELETE) |
| Pas de `ON DELETE CASCADE` sur team_id | **Moyenne** | Ajouter `REFERENCES teams(id) ON DELETE CASCADE` |
| `deleted_at` manquant sur `auto_linking_rules` | **Moyenne** | Ajoute avec `deleted_by` |
| Token Tink expire en 30 min, pas 24h ni 2h | **Critique** | Corrige dans le doc (v1: "24h", v2: "2h", v3: "30 min" confirme par doc officielle) |
| Tink Link iframe deprecated | **Faible** | Utiliser redirect (meilleur taux de completion) |
| `account_type` manquant | **Faible** | Ajoute (CHECKING, SAVINGS, etc.) |

---

## References

- **Tink API V2** : `https://api.tink.com/data/v2/` (accounts, transactions)
- **Tink OAuth** : `https://api.tink.com/api/v1/oauth/token`
- **Tink Link** : `https://link.tink.com/1.0/transactions/connect-accounts`
- **Tink Console** : `https://console.tink.com` (sandbox + cles)
- **PSD2 consent** : 90 jours, AISP scope, continuous access 4x/jour
- **Smovin** : https://smovin.be/fr/fonctionnalites (benchmark principal BE)
- **Stessa** : https://stessa.com/features (benchmark UX US)
- **SEIDO patterns** : `lib/services/domain/encryption.service.ts`, `lib/api-auth-helper.ts`, `lib/server-context.ts`
- **SEIDO email module** (pattern parallele) : `lib/services/repositories/email-connection.repository.ts`

---

## 17. Ajouts v3 — Gaps metier et conformite BE/FR

### 17.1 Nouvelles tables (Phase 2)

#### `property_expenses` — Charges recurrentes par bien

```sql
CREATE TABLE property_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,

  -- Bien concerne (XOR pattern SEIDO)
  building_id UUID REFERENCES buildings(id),
  lot_id UUID REFERENCES lots(id),
  CONSTRAINT property_expense_xor CHECK (
    (building_id IS NOT NULL)::int + (lot_id IS NOT NULL)::int = 1
  ),

  -- Categorie
  category TEXT NOT NULL CHECK (category IN (
    'syndic',              -- Charges copropriete / syndic
    'property_tax',        -- Taxe fonciere / precompte immobilier (BE)
    'insurance',           -- Assurance PNO
    'utilities',           -- Eau, electricite parties communes
    'maintenance',         -- Entretien courant hors intervention
    'other'
  )),

  -- Details
  label TEXT NOT NULL,                        -- Ex: "Appel de fonds T1 2026 — Syndic Gambetta"
  amount DECIMAL(10,2) NOT NULL,
  due_date DATE NOT NULL,
  period_start DATE,
  period_end DATE,

  -- Recurrence (optionnel)
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  recurrence_frequency TEXT CHECK (recurrence_frequency IN ('monthly', 'quarterly', 'annually')),

  -- Statut
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),

  -- Audit
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES users(id)
);

CREATE INDEX idx_property_expenses_team ON property_expenses(team_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_property_expenses_lot ON property_expenses(lot_id, due_date);
CREATE INDEX idx_property_expenses_building ON property_expenses(building_id, due_date);

ALTER TABLE property_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "property_expenses_select" ON property_expenses FOR SELECT USING (is_team_manager(team_id) AND deleted_at IS NULL);
CREATE POLICY "property_expenses_insert" ON property_expenses FOR INSERT WITH CHECK (is_team_manager(team_id));
CREATE POLICY "property_expenses_update" ON property_expenses FOR UPDATE USING (is_team_manager(team_id) AND deleted_at IS NULL);
```

#### `security_deposits` — Depots de garantie (obligation legale BE/FR)

```sql
CREATE TABLE security_deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  contract_id UUID NOT NULL REFERENCES contracts(id),
  lot_id UUID NOT NULL REFERENCES lots(id),

  -- Montant
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',

  -- Type (specifique Belgique: 3 formes possibles)
  deposit_type TEXT NOT NULL DEFAULT 'bank_account'
    CHECK (deposit_type IN (
      'bank_account',      -- Compte bancaire bloque (BE + FR)
      'bank_guarantee',    -- Garantie bancaire (BE)
      'cpas_guarantee',    -- Garantie CPAS (BE)
      'cash'               -- Versement direct (FR)
    )),

  -- Compte de consignation
  bank_name TEXT,
  account_reference TEXT,           -- Numero de compte bloque

  -- Cycle de vie
  status TEXT NOT NULL DEFAULT 'held'
    CHECK (status IN ('pending', 'held', 'partial_return', 'returned', 'disputed')),
  received_at DATE,
  return_due_date DATE,             -- Date limite restitution (1-2 mois apres fin bail FR)
  returned_at DATE,
  returned_amount DECIMAL(10,2),
  deductions JSONB,                 -- [{ reason: "Reparation mur", amount: 150, intervention_id: "..." }]

  -- Audit
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_security_deposits_contract ON security_deposits(contract_id);
CREATE INDEX idx_security_deposits_team ON security_deposits(team_id, status);

ALTER TABLE security_deposits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "security_deposits_select" ON security_deposits FOR SELECT USING (is_team_manager(team_id));
CREATE POLICY "security_deposits_insert" ON security_deposits FOR INSERT WITH CHECK (is_team_manager(team_id));
CREATE POLICY "security_deposits_update" ON security_deposits FOR UPDATE USING (is_team_manager(team_id));
```

> **ATTENTION** : Un depot de garantie n'est PAS un revenu. Il ne doit JAMAIS apparaitre dans le P&L. C'est une erreur fiscale classique.

#### `owners` et `owner_properties` — Proprietaires mandants (Phase 2)

```sql
CREATE TABLE owners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES users(id),   -- Lien vers le contact existant

  -- Gestion
  commission_rate DECIMAL(5,2),                     -- Taux d'honoraires de gestion (ex: 7.5%)
  iban_virement TEXT,                               -- IBAN pour virement mandant
  payment_frequency TEXT DEFAULT 'monthly'
    CHECK (payment_frequency IN ('monthly', 'quarterly')),

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE owner_properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,

  -- Bien possede (XOR)
  building_id UUID REFERENCES buildings(id),
  lot_id UUID REFERENCES lots(id),
  CONSTRAINT owner_property_xor CHECK (
    (building_id IS NOT NULL)::int + (lot_id IS NOT NULL)::int = 1
  ),

  ownership_percentage DECIMAL(5,2) NOT NULL DEFAULT 100,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Prerequis pour: releves de gestion, P&L par proprietaire, conformite art. 1993 CC (FR)
```

### 17.2 Rapports manquants (a ajouter a la Section 9)

| Rapport | Phase | Calcul | Obligation |
|---------|-------|--------|------------|
| **Quittance de loyer PDF** | **Phase 1** | Template parametrise (locataire, montant, lot, periode) | **Legale** (loi 6/7/1989 FR) |
| **P&L par proprietaire** | Phase 2 | Loyers percus − charges − honoraires = net mandant | **Legale** (art. 1993 CC FR) |
| **Releve de gestion mensuel PDF** | Phase 2 | Resume operations du mois par mandant, envoi auto | **Legale** (max 60j FR) |
| **Taux de vacance locative** | Phase 3 | Jours vacant / jours total × 100, par lot/immeuble | Analytics |
| **Rendement brut/net par lot** | Phase 3 | Loyers annuels / valeur bien × 100 | Differenciateur |
| **Cash-flow previsionnel 90j** | Phase 3 | Baux actifs × montant − charges recurrentes connues | **Differenciateur fort** (aucun concurrent BE/FR) |
| **Decompte annuel charges** | Phase 3 | Provisions versees vs charges reelles → regularisation | **Legale** (BE/FR) |

### 17.3 Indexation automatique des loyers (Belgique) — Phase 2

Formule legale belge (index sante) :
```
nouveau_loyer = loyer_base × nouvel_index / index_depart
```

- **Declencheur** : date anniversaire du bail
- **Source** : Statbel (SPF Economie) — API ou scraping mensuel
- **Impact DB** : ajouter `rent_amount_indexed` a `rent_calls`, `index_base` et `index_reference_date` a `contracts`
- **UX** : Notification gestionnaire "Loyer indexe automatiquement pour [Lot] : 850 → 868 EUR (+2.1%)"
- **Priorite** : HAUTE pour le marche belge (Smovin le fait, dealbreaker si absent)

### 17.4 Integration Data Invalidation Broadcast

**Fichier** : `lib/data-invalidation.ts` + `contexts/realtime-context.tsx`

Les mutations bank doivent broadcaster pour rafraichir les dashboards en temps reel :

```typescript
// Apres une reconciliation ou sync
realtime?.broadcastInvalidation(['bank_transactions', 'stats'])

// Apres creation/modification d'echeance
realtime?.broadcastInvalidation(['rent_calls', 'stats'])
```

**Nouveau entity type** a ajouter dans `data-invalidation.ts` :
- `bank_transactions`
- `bank_connections`
- `rent_calls`
- `property_expenses`

### 17.5 Phases d'implementation mises a jour (v3)

#### Phase 1 — MVP Bancaire (6-8 semaines)

*Inchange* + ajouts :
- **Quittances de loyer PDF** (obligation legale, effort faible)
- **`counterparties` structure riche** (payer/payee, pas juste counterparty_name)
- **Data Invalidation Broadcast** pour mutations bank
- **Token refresh strategy corrigee** (30 min, pas 2h)

#### Phase 2 — Conformite metier et mandants (6-8 semaines) — NOUVEAU

| Composant | Estimation |
|-----------|-----------|
| Entite `owners` + `owner_properties` + releve de gestion | 2 semaines |
| Table `security_deposits` + workflow depot garantie | 1.5 semaines |
| Table `property_expenses` + 5 categories etendues | 1 semaine |
| Indexation loyers Belgique (index sante) | 1 semaine |
| `account_purpose` typage comptes (Loi Alur) | 0.5 semaine |
| Portail locataire — section Finances (quittances, historique) | 1.5 semaines |

#### Phase 3 — Intelligence et reporting (4-6 semaines)

*Globalement inchange* + ajouts :
- **P&L par proprietaire** (mandant)
- **Taux de vacance locative**
- **Rendement brut/net par lot**
- **Cash-flow previsionnel 90 jours** (differenciateur unique BE/FR)
- **Decompte annuel charges** avec regularisation

#### Phase 4 — Excellence (3-4 semaines)

*Inchange* (export PDF/CSV, split transactions, communication structuree belge)

### 17.6 Decisions — toutes validees (2026-03-21)

Voir section "Decisions (validees v3)" ci-dessus. Toutes les decisions ouvertes ont ete tranchees. Seul le point #1 (tier Tink Enterprise) necessite une confirmation commerciale avec Tink — mais l'implementation code la meme API dans les deux cas.

### 17.7 Corrections post-audit (v3)

| Bug | Gravite | Correction |
|-----|---------|-----------|
| Token utilisateur expire en 30 min, pas 2h | **CRITIQUE** | `expires_in: 1800` confirme par doc Tink MCP. Refresh strategy corrigee. |
| Scope `balances:read` manquant | **CRITIQUE** | Ajoute aux scopes OAuth necessaires |
| UNIQUE constraint `transaction_links` cassee avec NULLs | **HAUTE** | Remplacee par 3 index uniques partiels |
| `unscaledValue`/`scale` types mixtes (string/number) | **HAUTE** | `parseTinkAmount` accepte `string \| number` |
| `counterparty_name`/`counterparty_iban` trop simples | **MOYENNE** | Structure `counterparties` riche (payer/payee) |
| Entite mandant absente | **CRITIQUE metier** | Nouvelles tables `owners`, `owner_properties` en Phase 2 |
| Depot de garantie non modelise | **HAUTE metier** | Nouvelle table `security_deposits` en Phase 2 |
| 5 categories transactions manquantes | **HAUTE metier** | `entity_type` + table `property_expenses` |
| Quittances PDF absentes | **HAUTE legal** | Ajoutees en Phase 1 |
| Indexation loyers BE absente | **HAUTE marche** | Ajoutee en Phase 2 |
| Typage comptes bancaires absent | **MOYENNE legal** | `account_purpose` sur `bank_connections` |
| Data Invalidation Broadcast absent | **MOYENNE** | Entity types bank ajoutes |
| `descriptions.detailed` non capture | **FAIBLE** | Champ `description_detailed` ajoute |
