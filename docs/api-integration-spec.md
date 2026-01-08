# Spécification Technique : API d'Intégration Seido

**Version:** 1.0.0  
**Date:** 8 janvier 2026  
**Statut:** Draft  
**Auteur:** Équipe Seido

---

## Table des matières

1. [Introduction et Objectifs](#1-introduction-et-objectifs)
2. [Analyse des Logiciels Cibles](#2-analyse-des-logiciels-cibles)
3. [Principes Architecturaux](#3-principes-architecturaux)
4. [Spécification de l'API](#4-spécification-de-lapi)
5. [Modèles de Données](#5-modèles-de-données)
6. [Authentification et Sécurité](#6-authentification-et-sécurité)
7. [Système de Mapping de Données](#7-système-de-mapping-de-données)
8. [Webhooks et Événements](#8-webhooks-et-événements)
9. [Documentation OpenAPI](#9-documentation-openapi)
10. [Plan d'Implémentation](#10-plan-dimplémentation)
11. [Checklist de Mise en Production](#11-checklist-de-mise-en-production)
12. [Annexes](#12-annexes)

---

## 1. Introduction et Objectifs

### 1.1 Contexte

Seido est une application de gestion immobilière construite avec Next.js 14 et Supabase. Pour permettre aux gestionnaires immobiliers d'utiliser Seido en complément de leurs outils existants, nous devons créer une API publique permettant la synchronisation bidirectionnelle des données.

### 1.2 Objectifs

| Objectif | Description |
|----------|-------------|
| **Interopérabilité** | Permettre l'échange de données avec les principaux logiciels immobiliers et comptables du marché belge |
| **Simplicité** | API REST standard, facile à intégrer pour les développeurs tiers |
| **Sécurité** | Authentification robuste (OAuth 2.0 / API Keys), conformité RGPD |
| **Évolutivité** | Architecture extensible pour ajouter de nouveaux connecteurs |
| **Temps réel** | Webhooks pour notifier les systèmes externes des changements |

### 1.3 Périmètre fonctionnel

**Données à synchroniser :**
- Biens immobiliers (buildings, lots)
- Contacts (locataires, propriétaires, prestataires)
- Contrats de location
- Interventions et maintenance
- Documents et pièces jointes
- Données financières (loyers, charges, factures)

### 1.4 Hors périmètre (v1)

- Synchronisation des emails
- Messagerie interne
- Calendrier/planning
- Rapports et statistiques avancés

---

## 2. Analyse des Logiciels Cibles

### 2.1 Logiciels de Gestion Immobilière

| Logiciel | Type d'API | Documentation | Priorité |
|----------|-----------|---------------|----------|
| **Smoovin** | REST API (non documentée publiquement) | Contacter support | Haute |
| **Rentio** | Pas d'API publique connue | Contacter support | Moyenne |
| **Up2Rent** | Pas d'API publique connue | Contacter support | Moyenne |
| **Yourent** | REST API basique | [Documentation](https://yourent.immo/en_US/slides/documentation) | Haute |
| **Sogis** | Pas d'API publique connue | Contacter support | Basse |

**Stratégie :** En l'absence d'APIs publiques documentées pour la plupart de ces logiciels, nous créerons une API **générique et standardisée** que ces éditeurs pourront consommer. Notre API servira de **hub central**.

### 2.2 Logiciels de Comptabilité Belge

| Logiciel | Type d'API | Standard supporté | Priorité |
|----------|-----------|-------------------|----------|
| **Odoo** | XML-RPC / JSON-RPC | Propriétaire + UBL | Haute |
| **Winbooks** | API Connect | UBL 2.1 | Haute |
| **Sage BOB** | API REST | Propriétaire | Moyenne |
| **Yuki** | REST API | UBL | Moyenne |
| **Horus** | Import/Export fichiers | CODA, UBL | Basse |
| **Bob Software** | API limitée | Propriétaire | Basse |

### 2.3 Standards à Implémenter

#### UBL (Universal Business Language) 2.1

Standard européen pour l'échange de documents commerciaux (factures, notes de crédit). **Obligatoire** pour la facturation électronique B2G en Belgique via Peppol.

```xml
<!-- Exemple structure UBL Invoice simplifiée -->
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2">
  <ID>INV-2026-0001</ID>
  <IssueDate>2026-01-08</IssueDate>
  <InvoiceTypeCode>380</InvoiceTypeCode>
  <DocumentCurrencyCode>EUR</DocumentCurrencyCode>
  <AccountingSupplierParty>...</AccountingSupplierParty>
  <AccountingCustomerParty>...</AccountingCustomerParty>
  <LegalMonetaryTotal>
    <TaxExclusiveAmount currencyID="EUR">1000.00</TaxExclusiveAmount>
    <TaxInclusiveAmount currencyID="EUR">1210.00</TaxInclusiveAmount>
  </LegalMonetaryTotal>
</Invoice>
```

#### Peppol

Réseau européen d'échange de documents électroniques. Les factures UBL peuvent être envoyées via Peppol aux administrations publiques belges.

---

## 3. Principes Architecturaux

### 3.1 Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────────┐
│                     CLIENTS EXTERNES                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │ Smoovin  │  │  Rentio  │  │   Odoo   │  │ Winbooks │        │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘        │
└───────┼─────────────┼─────────────┼─────────────┼───────────────┘
        │             │             │             │
        ▼             ▼             ▼             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SEIDO PUBLIC API                              │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    API Gateway                           │    │
│  │              /api/v1/* (Next.js API Routes)             │    │
│  └─────────────────────────────────────────────────────────┘    │
│         │              │              │              │           │
│         ▼              ▼              ▼              ▼           │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐     │
│  │   Auth   │   │   Rate   │   │  Mapper  │   │ Webhooks │     │
│  │  Layer   │   │  Limit   │   │ Service  │   │ Manager  │     │
│  └──────────┘   └──────────┘   └──────────┘   └──────────┘     │
└─────────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────┐
│                  ARCHITECTURE EXISTANTE                          │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              lib/services/* (Domain Services)            │    │
│  │   UserService, BuildingService, LotService, etc.        │    │
│  └─────────────────────────────────────────────────────────┘    │
│         │                                                        │
│         ▼                                                        │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                  Supabase (PostgreSQL)                   │    │
│  │            + RLS (Row Level Security)                    │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Principes clés

| Principe | Description |
|----------|-------------|
| **Réutilisation** | L'API publique réutilise les services existants (`lib/services/*`) sans dupliquer la logique métier |
| **Isolation** | Nouvelle couche API dans `app/api/v1/` séparée des APIs internes existantes |
| **Multi-tenant** | Isolation des données par `team_id` (existant), chaque client API appartient à une team |
| **Versioning** | URL versionnée (`/api/v1/`) pour évolutions futures sans casser les intégrations |
| **Stateless** | Chaque requête est auto-suffisante (token dans header) |

### 3.3 Stack technique

| Composant | Technologie | Justification |
|-----------|-------------|---------------|
| Framework | Next.js 14 API Routes | Cohérence avec l'existant |
| Base de données | Supabase (PostgreSQL) | Existant, RLS pour sécurité |
| Auth | OAuth 2.0 + API Keys | Standards industrie |
| Rate Limiting | Upstash Redis | Existant (`lib/rate-limit.ts`) |
| Documentation | OpenAPI 3.0 / Swagger | Standard universel |
| Validation | Zod | Existant (`lib/validation/`) |

---

## 4. Spécification de l'API

### 4.1 Base URL

```
Production:  https://app.seido.be/api/v1
Staging:     https://staging.seido.be/api/v1
Development: http://localhost:3000/api/v1
```

### 4.2 Conventions REST

| Méthode | Usage | Idempotent |
|---------|-------|------------|
| `GET` | Lecture de ressources | Oui |
| `POST` | Création de ressources | Non |
| `PUT` | Mise à jour complète | Oui |
| `PATCH` | Mise à jour partielle | Oui |
| `DELETE` | Suppression (soft delete) | Oui |

### 4.3 Structure des Endpoints

#### 4.3.1 Ressources principales

```
# Buildings (Immeubles)
GET    /api/v1/buildings                    # Liste paginée
POST   /api/v1/buildings                    # Création
GET    /api/v1/buildings/{id}               # Détail
PUT    /api/v1/buildings/{id}               # Mise à jour
DELETE /api/v1/buildings/{id}               # Suppression
GET    /api/v1/buildings/{id}/lots          # Lots d'un immeuble
GET    /api/v1/buildings/{id}/documents     # Documents d'un immeuble

# Lots (Unités locatives)
GET    /api/v1/lots                         # Liste paginée
POST   /api/v1/lots                         # Création
GET    /api/v1/lots/{id}                    # Détail
PUT    /api/v1/lots/{id}                    # Mise à jour
DELETE /api/v1/lots/{id}                    # Suppression
GET    /api/v1/lots/{id}/contracts          # Contrats d'un lot
GET    /api/v1/lots/{id}/interventions      # Interventions d'un lot

# Contacts
GET    /api/v1/contacts                     # Liste paginée
POST   /api/v1/contacts                     # Création
GET    /api/v1/contacts/{id}                # Détail
PUT    /api/v1/contacts/{id}                # Mise à jour
DELETE /api/v1/contacts/{id}                # Suppression

# Contracts (Baux)
GET    /api/v1/contracts                    # Liste paginée
POST   /api/v1/contracts                    # Création
GET    /api/v1/contracts/{id}               # Détail
PUT    /api/v1/contracts/{id}               # Mise à jour
DELETE /api/v1/contracts/{id}               # Résiliation

# Interventions
GET    /api/v1/interventions                # Liste paginée
POST   /api/v1/interventions                # Création
GET    /api/v1/interventions/{id}           # Détail
PUT    /api/v1/interventions/{id}           # Mise à jour
PATCH  /api/v1/interventions/{id}/status    # Changement de statut

# Documents
GET    /api/v1/documents                    # Liste paginée
POST   /api/v1/documents                    # Upload
GET    /api/v1/documents/{id}               # Téléchargement
DELETE /api/v1/documents/{id}               # Suppression

# Invoices (Facturation - sync comptabilité)
GET    /api/v1/invoices                     # Liste paginée
POST   /api/v1/invoices                     # Création
GET    /api/v1/invoices/{id}                # Détail
GET    /api/v1/invoices/{id}/ubl            # Export format UBL
```

#### 4.3.2 Endpoints de synchronisation

```
# Sync bidirectionnelle
POST   /api/v1/sync/pull                    # Récupérer changements depuis Seido
POST   /api/v1/sync/push                    # Envoyer changements vers Seido
GET    /api/v1/sync/status                  # Statut de synchronisation
GET    /api/v1/sync/changelog               # Journal des modifications

# Webhooks
GET    /api/v1/webhooks                     # Liste des webhooks configurés
POST   /api/v1/webhooks                     # Créer un webhook
GET    /api/v1/webhooks/{id}                # Détail d'un webhook
PUT    /api/v1/webhooks/{id}                # Modifier un webhook
DELETE /api/v1/webhooks/{id}                # Supprimer un webhook
POST   /api/v1/webhooks/{id}/test           # Tester un webhook
```

#### 4.3.3 Authentification

```
POST   /api/v1/auth/token                   # Obtenir un token OAuth 2.0
POST   /api/v1/auth/revoke                  # Révoquer un token
GET    /api/v1/auth/me                      # Infos client API connecté
```

### 4.4 Format des réponses

#### Succès (2xx)

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "total": 100,
    "page": 1,
    "per_page": 20,
    "total_pages": 5
  }
}
```

#### Erreur (4xx, 5xx)

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Les données fournies sont invalides",
    "details": [
      {
        "field": "email",
        "message": "Format email invalide"
      }
    ]
  },
  "request_id": "req_abc123"
}
```

### 4.5 Pagination

Toutes les listes sont paginées avec un maximum de 100 éléments par page.

```
GET /api/v1/buildings?page=1&per_page=20&sort=created_at&order=desc
```

| Paramètre | Type | Défaut | Description |
|-----------|------|--------|-------------|
| `page` | integer | 1 | Numéro de page |
| `per_page` | integer | 20 | Éléments par page (max 100) |
| `sort` | string | created_at | Champ de tri |
| `order` | string | desc | Ordre (asc/desc) |

### 4.6 Filtrage

```
GET /api/v1/lots?building_id=xxx&status=occupied&min_rent=500
```

Chaque endpoint documente ses filtres disponibles dans la spec OpenAPI.

### 4.7 Headers requis

| Header | Obligatoire | Description |
|--------|-------------|-------------|
| `Authorization` | Oui | `Bearer {token}` ou via `X-API-Key` |
| `Content-Type` | Oui (POST/PUT) | `application/json` |
| `Accept` | Non | `application/json` (défaut) |
| `X-Request-ID` | Non | ID de requête pour traçabilité |
| `X-External-ID` | Non | ID dans le système externe pour mapping |

---

## 5. Modèles de Données

### 5.1 Entités principales

#### Building (Immeuble)

```typescript
interface PublicBuilding {
  id: string                    // UUID Seido
  external_id?: string          // ID dans le système externe
  name: string                  // Nom de l'immeuble
  address: {
    street: string              // Rue et numéro
    postal_code: string         // Code postal
    city: string                // Ville
    country: 'BE' | 'FR' | 'LU' // Code pays ISO
  }
  description?: string          // Description libre
  total_lots?: number           // Nombre de lots (calculé)
  occupied_lots?: number        // Lots occupés (calculé)
  metadata?: Record<string, unknown>  // Données libres
  created_at: string            // ISO 8601
  updated_at: string            // ISO 8601
}
```

#### Lot (Unité locative)

```typescript
interface PublicLot {
  id: string
  external_id?: string
  building_id: string           // Référence immeuble
  reference: string             // Référence interne (ex: "App 3A")
  type: 'apartment' | 'studio' | 'house' | 'commercial' | 'parking' | 'storage' | 'other'
  floor?: number                // Étage
  surface_area?: number         // Surface en m²
  rooms_count?: number          // Nombre de pièces
  
  // Informations financières
  rent_amount?: number          // Loyer mensuel (EUR)
  charges_amount?: number       // Charges mensuelles (EUR)
  deposit_amount?: number       // Garantie locative (EUR)
  
  status: 'vacant' | 'occupied' | 'reserved' | 'unavailable'
  
  // Équipements (liste libre)
  amenities?: string[]          // Ex: ["parking", "cave", "terrasse"]
  
  metadata?: Record<string, unknown>
  created_at: string
  updated_at: string
}
```

#### Contact

```typescript
interface PublicContact {
  id: string
  external_id?: string
  type: 'individual' | 'company'
  role: 'tenant' | 'owner' | 'provider' | 'manager' | 'other'
  
  // Identité
  first_name?: string
  last_name?: string
  company_name?: string
  
  // Coordonnées
  email?: string
  phone?: string
  mobile?: string
  
  // Adresse
  address?: {
    street: string
    postal_code: string
    city: string
    country: string
  }
  
  // Informations légales (entreprises)
  vat_number?: string           // Numéro TVA (BE0123456789)
  company_number?: string       // Numéro BCE
  
  // Informations bancaires
  iban?: string
  bic?: string
  
  is_active: boolean
  metadata?: Record<string, unknown>
  created_at: string
  updated_at: string
}
```

#### Contract (Bail)

```typescript
interface PublicContract {
  id: string
  external_id?: string
  lot_id: string
  
  type: 'residential' | 'commercial' | 'student' | 'short_term'
  status: 'draft' | 'active' | 'terminated' | 'expired'
  
  // Parties
  tenants: string[]             // IDs contacts locataires
  owners: string[]              // IDs contacts propriétaires
  
  // Durée
  start_date: string            // Date de début
  end_date?: string             // Date de fin (null = indéterminé)
  notice_period_months?: number // Préavis en mois
  
  // Conditions financières
  rent_amount: number           // Loyer mensuel
  charges_amount?: number       // Charges mensuelles
  charges_type: 'fixed' | 'provisions' | 'actual'
  deposit_amount?: number       // Garantie locative
  payment_day?: number          // Jour de paiement (1-28)
  
  // Indexation
  indexation_enabled: boolean
  indexation_base_index?: number
  indexation_month?: number     // Mois anniversaire (1-12)
  
  metadata?: Record<string, unknown>
  created_at: string
  updated_at: string
}
```

#### Intervention

```typescript
interface PublicIntervention {
  id: string
  external_id?: string
  
  // Localisation
  building_id?: string
  lot_id?: string
  location_description?: string
  
  // Description
  title: string
  description?: string
  type: string                  // Type d'intervention
  urgency: 'low' | 'medium' | 'high' | 'urgent'
  
  // Statut
  status: 'pending' | 'assigned' | 'scheduled' | 'in_progress' | 
          'completed' | 'cancelled' | 'on_hold'
  
  // Assignation
  assigned_providers?: string[] // IDs contacts prestataires
  
  // Planning
  scheduled_date?: string
  completed_date?: string
  
  // Financier
  estimated_cost?: number
  actual_cost?: number
  
  metadata?: Record<string, unknown>
  created_at: string
  updated_at: string
}
```

#### Invoice (Facture)

```typescript
interface PublicInvoice {
  id: string
  external_id?: string
  
  // Identification
  invoice_number: string        // Numéro de facture
  type: 'rent' | 'charges' | 'deposit' | 'intervention' | 'credit_note' | 'other'
  
  // Parties
  issuer_id: string             // ID contact émetteur
  recipient_id: string          // ID contact destinataire
  
  // Références
  contract_id?: string          // Bail concerné
  lot_id?: string               // Lot concerné
  intervention_id?: string      // Intervention concernée
  
  // Montants
  subtotal: number              // Montant HT
  vat_rate?: number             // Taux TVA (ex: 21)
  vat_amount?: number           // Montant TVA
  total: number                 // Montant TTC
  currency: 'EUR'
  
  // Dates
  issue_date: string            // Date d'émission
  due_date: string              // Date d'échéance
  period_start?: string         // Début période facturée
  period_end?: string           // Fin période facturée
  
  // Statut
  status: 'draft' | 'sent' | 'paid' | 'partial' | 'overdue' | 'cancelled'
  paid_amount?: number          // Montant payé
  paid_date?: string            // Date de paiement
  
  // UBL / Peppol (comptabilité belge)
  ubl_id?: string               // Identifiant UBL
  peppol_id?: string            // Identifiant Peppol
  
  // Lignes de facture
  lines: InvoiceLine[]
  
  metadata?: Record<string, unknown>
  created_at: string
  updated_at: string
}

interface InvoiceLine {
  description: string
  quantity: number
  unit_price: number
  vat_rate?: number
  total: number
}
```

### 5.2 Mapping avec la base Seido existante

| API Publique | Table Supabase | Notes |
|--------------|----------------|-------|
| `PublicBuilding` | `buildings` | Mapping direct |
| `PublicLot` | `lots` | Mapping direct |
| `PublicContact` | `users` + `companies` | Fusion des deux tables |
| `PublicContract` | `contracts` | Mapping direct |
| `PublicIntervention` | `interventions` | Simplification du workflow 11 statuts |
| `PublicInvoice` | Nouvelle table `invoices` | À créer |

---

## 6. Authentification et Sécurité

### 6.1 Méthodes d'authentification

#### Option 1 : OAuth 2.0 Client Credentials (Recommandé)

Pour les intégrations serveur-à-serveur.

**Flux :**
```
1. Client envoie client_id + client_secret à /api/v1/auth/token
2. Seido retourne un access_token (JWT) valide 1 heure
3. Client utilise le token dans header Authorization: Bearer {token}
4. À expiration, client redemande un nouveau token
```

**Requête token :**
```http
POST /api/v1/auth/token
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials
&client_id=your_client_id
&client_secret=your_client_secret
&scope=read write webhooks
```

**Réponse :**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "read write webhooks"
}
```

#### Option 2 : API Key (Simple)

Pour les intégrations simples ou le développement.

```http
GET /api/v1/buildings
X-API-Key: sk_live_abc123def456...
```

### 6.2 Scopes (Permissions)

| Scope | Description |
|-------|-------------|
| `read` | Lecture de toutes les ressources |
| `write` | Création et modification des ressources |
| `delete` | Suppression des ressources |
| `webhooks` | Gestion des webhooks |
| `invoices` | Accès aux données financières |
| `documents` | Upload/download de documents |

### 6.3 Rate Limiting

| Tier | Requêtes/minute | Requêtes/jour | Usage |
|------|-----------------|---------------|-------|
| `basic` | 60 | 10,000 | Essai, développement |
| `standard` | 300 | 100,000 | Production normale |
| `premium` | 1,000 | 500,000 | Gros volumes |

**Headers de réponse :**
```http
X-RateLimit-Limit: 300
X-RateLimit-Remaining: 299
X-RateLimit-Reset: 2026-01-08T12:00:00Z
```

### 6.4 Nouvelles tables Supabase

```sql
-- Table des clients API
CREATE TABLE api_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Credentials
  client_id VARCHAR(64) UNIQUE NOT NULL,
  client_secret_hash VARCHAR(255) NOT NULL,
  api_key_hash VARCHAR(255),
  
  -- Permissions
  scopes TEXT[] DEFAULT ARRAY['read'],
  rate_limit_tier VARCHAR(20) DEFAULT 'basic',
  
  -- Webhooks
  webhook_url TEXT,
  webhook_secret VARCHAR(255),
  
  -- Statut
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Index pour lookups rapides
CREATE UNIQUE INDEX idx_api_clients_client_id ON api_clients(client_id);
CREATE INDEX idx_api_clients_team_id ON api_clients(team_id);

-- Table des tokens OAuth
CREATE TABLE api_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES api_clients(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  scopes TEXT[] NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_api_tokens_client_id ON api_tokens(client_id);
CREATE INDEX idx_api_tokens_expires_at ON api_tokens(expires_at);

-- Table des webhooks
CREATE TABLE api_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES api_clients(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  events TEXT[] NOT NULL,
  secret VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  
  -- Stats
  last_triggered_at TIMESTAMPTZ,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table de mapping des IDs externes
CREATE TABLE external_id_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  client_id UUID REFERENCES api_clients(id) ON DELETE SET NULL,
  
  entity_type VARCHAR(50) NOT NULL,  -- 'building', 'lot', 'contact', etc.
  internal_id UUID NOT NULL,
  external_id VARCHAR(255) NOT NULL,
  external_system VARCHAR(50) NOT NULL, -- 'smoovin', 'rentio', 'odoo', etc.
  
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(team_id, entity_type, external_id, external_system)
);

CREATE INDEX idx_external_mappings_lookup 
  ON external_id_mappings(team_id, entity_type, internal_id);
CREATE INDEX idx_external_mappings_external 
  ON external_id_mappings(external_system, external_id);

-- Table des logs d'API (audit)
CREATE TABLE api_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES api_clients(id),
  
  method VARCHAR(10) NOT NULL,
  path TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  
  request_id VARCHAR(64),
  ip_address INET,
  user_agent TEXT,
  
  request_body JSONB,
  response_time_ms INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Partitionner par mois pour les performances
CREATE INDEX idx_api_logs_created_at ON api_logs(created_at);
CREATE INDEX idx_api_logs_client_id ON api_logs(client_id);
```

### 6.5 Sécurité RGPD

| Exigence | Implémentation |
|----------|----------------|
| **Consentement** | Acceptation CGU lors création client API |
| **Minimisation** | Ne retourner que les champs demandés (`fields` param) |
| **Droit d'accès** | Endpoint `/api/v1/gdpr/export` |
| **Droit à l'oubli** | Endpoint `/api/v1/gdpr/delete` |
| **Portabilité** | Export JSON/CSV des données |
| **Logs** | Conservation 12 mois, anonymisation après |

---

## 7. Système de Mapping de Données

### 7.1 Principe

Chaque système externe a sa propre structure de données. Le **Data Mapper Service** permet de :
1. Transformer les données Seido vers le format attendu par le système externe
2. Transformer les données reçues vers le format Seido

### 7.2 Architecture du Mapper

```
lib/api/mappers/
├── data-mapper.service.ts      # Service principal
├── mapper.types.ts             # Types TypeScript
├── configs/
│   ├── generic.config.ts       # Configuration par défaut
│   ├── smoovin.config.ts       # Mapping Smoovin
│   ├── rentio.config.ts        # Mapping Rentio
│   ├── odoo.config.ts          # Mapping Odoo
│   ├── winbooks.config.ts      # Mapping Winbooks
│   └── ubl.config.ts           # Standard UBL pour factures
└── transforms/
    ├── address.transform.ts    # Transformation adresses
    ├── date.transform.ts       # Transformation dates
    └── money.transform.ts      # Transformation montants
```

### 7.3 Interface du Mapper

```typescript
interface MappingConfig {
  system: string              // 'smoovin', 'odoo', 'generic'
  version: string             // Version du mapping
  entity: string              // 'building', 'lot', 'contact'
  
  // Mapping des champs
  fieldMappings: {
    [seidoField: string]: string | MappingFunction
  }
  
  // Transformations
  transforms?: {
    inbound?: TransformRule[]   // Externe → Seido
    outbound?: TransformRule[]  // Seido → Externe
  }
  
  // Valeurs par défaut
  defaults?: Record<string, unknown>
  
  // Champs requis
  required?: string[]
}

interface TransformRule {
  field: string
  type: 'rename' | 'format' | 'convert' | 'compute' | 'omit'
  params?: Record<string, unknown>
}
```

### 7.4 Exemple : Mapping Odoo

```typescript
// lib/api/mappers/configs/odoo.config.ts

export const odooContactMapping: MappingConfig = {
  system: 'odoo',
  version: '1.0',
  entity: 'contact',
  
  fieldMappings: {
    // Seido → Odoo
    'id': 'x_seido_id',
    'first_name': (data) => data.type === 'company' ? null : data.first_name,
    'last_name': (data) => data.type === 'company' ? null : data.last_name,
    'company_name': 'name',
    'email': 'email',
    'phone': 'phone',
    'mobile': 'mobile',
    'address.street': 'street',
    'address.postal_code': 'zip',
    'address.city': 'city',
    'address.country': (data) => countryCodeToOdooId(data.address?.country),
    'vat_number': 'vat',
    'role': (data) => {
      // Mapping des rôles Seido vers catégories Odoo
      switch(data.role) {
        case 'owner': return { customer: false, supplier: true }
        case 'tenant': return { customer: true, supplier: false }
        case 'provider': return { customer: false, supplier: true }
        default: return { customer: true, supplier: false }
      }
    }
  },
  
  transforms: {
    outbound: [
      { field: 'vat', type: 'format', params: { pattern: 'BE{value}' } }
    ]
  },
  
  defaults: {
    'is_company': true,
    'lang': 'fr_BE',
    'country_id': 21  // Belgium
  }
}
```

### 7.5 Utilisation

```typescript
// Dans un endpoint API
import { DataMapperService } from '@/lib/api/mappers/data-mapper.service'

const mapper = new DataMapperService()

// Seido → Format externe
const externalData = mapper.toExternal('contact', seidoContact, 'odoo')

// Format externe → Seido
const seidoData = mapper.fromExternal('contact', odooPartner, 'odoo')
```

---

## 8. Webhooks et Événements

### 8.1 Événements disponibles

| Catégorie | Événement | Payload |
|-----------|-----------|---------|
| **Buildings** | `building.created` | PublicBuilding |
| | `building.updated` | PublicBuilding + changes |
| | `building.deleted` | { id, deleted_at } |
| **Lots** | `lot.created` | PublicLot |
| | `lot.updated` | PublicLot + changes |
| | `lot.status_changed` | { id, old_status, new_status } |
| **Contracts** | `contract.created` | PublicContract |
| | `contract.activated` | PublicContract |
| | `contract.terminated` | { id, termination_date, reason } |
| **Interventions** | `intervention.created` | PublicIntervention |
| | `intervention.assigned` | { id, providers } |
| | `intervention.status_changed` | { id, old_status, new_status } |
| | `intervention.completed` | PublicIntervention |
| **Invoices** | `invoice.created` | PublicInvoice |
| | `invoice.sent` | { id, sent_at } |
| | `invoice.paid` | { id, paid_amount, paid_date } |
| | `invoice.overdue` | { id, due_date, amount_due } |

### 8.2 Format du webhook

```http
POST https://your-system.com/webhooks/seido
Content-Type: application/json
X-Seido-Signature: sha256=abc123...
X-Seido-Event: building.created
X-Seido-Delivery: d4e5f6...

{
  "event": "building.created",
  "timestamp": "2026-01-08T12:00:00Z",
  "delivery_id": "d4e5f6...",
  "data": {
    "id": "uuid...",
    "name": "Résidence Les Érables",
    ...
  }
}
```

### 8.3 Signature des webhooks

```typescript
// Vérification côté client
const signature = request.headers['x-seido-signature']
const expectedSignature = 'sha256=' + crypto
  .createHmac('sha256', webhookSecret)
  .update(JSON.stringify(payload))
  .digest('hex')

if (signature !== expectedSignature) {
  throw new Error('Invalid signature')
}
```

### 8.4 Politique de retry

| Tentative | Délai |
|-----------|-------|
| 1 | Immédiat |
| 2 | 1 minute |
| 3 | 5 minutes |
| 4 | 30 minutes |
| 5 | 2 heures |

Après 5 échecs consécutifs, le webhook est désactivé et une notification est envoyée.

---

## 9. Documentation OpenAPI

### 9.1 Génération de la spec

La spécification OpenAPI 3.0 sera générée à partir des types TypeScript et des commentaires JSDoc.

Fichier : `lib/api/openapi/spec.ts`

```typescript
import { OpenAPIV3 } from 'openapi-types'

export const openApiSpec: OpenAPIV3.Document = {
  openapi: '3.0.3',
  info: {
    title: 'Seido Integration API',
    description: 'API REST pour l\'intégration avec des logiciels de gestion immobilière et comptable',
    version: '1.0.0',
    contact: {
      name: 'Support Seido',
      email: 'api@seido.be',
      url: 'https://seido.be/support'
    },
    license: {
      name: 'Proprietary',
      url: 'https://seido.be/terms'
    }
  },
  servers: [
    {
      url: 'https://app.seido.be/api/v1',
      description: 'Production'
    },
    {
      url: 'https://staging.seido.be/api/v1',
      description: 'Staging'
    }
  ],
  tags: [
    { name: 'Authentication', description: 'Authentification OAuth 2.0' },
    { name: 'Buildings', description: 'Gestion des immeubles' },
    { name: 'Lots', description: 'Gestion des unités locatives' },
    { name: 'Contacts', description: 'Gestion des contacts' },
    { name: 'Contracts', description: 'Gestion des baux' },
    { name: 'Interventions', description: 'Gestion des interventions' },
    { name: 'Invoices', description: 'Facturation et comptabilité' },
    { name: 'Webhooks', description: 'Gestion des webhooks' },
    { name: 'Sync', description: 'Synchronisation bidirectionnelle' }
  ],
  // ... paths, components, etc.
}
```

### 9.2 Swagger UI

Endpoint : `GET /api/v1/docs`

Interface interactive permettant de :
- Explorer tous les endpoints
- Tester les requêtes directement
- Voir les schémas de données
- Authentification intégrée

### 9.3 Accès à la spec

```
GET /api/v1/docs              → Swagger UI (HTML)
GET /api/v1/docs/openapi.json → Spec JSON
GET /api/v1/docs/openapi.yaml → Spec YAML
```

---

## 10. Plan d'Implémentation

### Phase 1 : MVP (2-3 semaines)

**Objectif :** API fonctionnelle minimale pour validation du concept

| Tâche | Durée estimée | Dépendances |
|-------|---------------|-------------|
| Structure de base `app/api/v1/` | 2h | - |
| Middleware d'authentification (API Keys) | 4h | Structure |
| Endpoints GET buildings (liste + détail) | 4h | Auth |
| Endpoints GET lots (liste + détail) | 4h | Auth |
| Endpoints GET contacts | 4h | Auth |
| Documentation OpenAPI basique | 4h | Endpoints |
| Swagger UI intégré | 2h | OpenAPI |
| Tests manuels | 4h | Tout |

**Livrables Phase 1 :**
- Endpoints de lecture fonctionnels
- Authentification par API Key
- Documentation interactive

### Phase 2 : Core Features (2-3 semaines)

**Objectif :** API complète avec authentification robuste

| Tâche | Durée estimée | Dépendances |
|-------|---------------|-------------|
| Migration Supabase (tables api_clients, etc.) | 4h | - |
| OAuth 2.0 (token endpoint) | 8h | Migration |
| Endpoints CRUD complets (POST, PUT, DELETE) | 12h | OAuth |
| Endpoints contracts | 6h | CRUD |
| Endpoints interventions | 6h | CRUD |
| Service de mapping générique | 8h | - |
| Webhooks basiques | 8h | Migration |
| Rate limiting par tier | 4h | OAuth |
| Tests d'intégration | 8h | Tout |

**Livrables Phase 2 :**
- API CRUD complète
- OAuth 2.0 fonctionnel
- Webhooks opérationnels
- Rate limiting

### Phase 3 : Intégrations Spécifiques (3-4 semaines)

**Objectif :** Connecteurs prêts à l'emploi pour les principaux systèmes

| Tâche | Durée estimée | Dépendances |
|-------|---------------|-------------|
| Mapping Smoovin | 8h | Mapper générique |
| Mapping Rentio | 8h | Mapper générique |
| Mapping Odoo (XML-RPC) | 12h | Mapper générique |
| Mapping Winbooks | 8h | Mapper générique |
| Export UBL pour factures | 12h | - |
| Endpoints sync bidirectionnelle | 12h | Mappings |
| Dashboard gestion clés API (UI) | 16h | - |
| Tests avec systèmes réels | 16h | Mappings |

**Livrables Phase 3 :**
- Connecteurs Smoovin, Rentio, Odoo, Winbooks
- Export UBL
- Interface de gestion des clés API

### Phase 4 : Production Ready (2 semaines)

**Objectif :** Prêt pour mise en production

| Tâche | Durée estimée | Dépendances |
|-------|---------------|-------------|
| Tests de charge | 8h | - |
| Tests de sécurité (pen testing) | 8h | - |
| Documentation complète | 12h | - |
| Guide de démarrage rapide | 4h | - |
| Environnement sandbox | 8h | - |
| Monitoring et alerting | 8h | - |
| Procédures de rollback | 4h | - |
| Formation équipe support | 4h | Documentation |

**Livrables Phase 4 :**
- API production-ready
- Documentation complète
- Environnement sandbox
- Monitoring opérationnel

### Chronologie globale

```
Semaine 1-3   : Phase 1 (MVP)
Semaine 4-6   : Phase 2 (Core Features)
Semaine 7-10  : Phase 3 (Intégrations)
Semaine 11-12 : Phase 4 (Production)
```

**Durée totale estimée : 12 semaines** (3 mois)

---

## 11. Checklist de Mise en Production

### Sécurité

- [ ] Authentification OAuth 2.0 testée et validée
- [ ] API Keys hashées en base (bcrypt)
- [ ] Rate limiting configuré et testé
- [ ] CORS configuré (domaines autorisés)
- [ ] Headers de sécurité (HSTS, CSP, etc.)
- [ ] Validation des entrées (Zod)
- [ ] Protection injection SQL (préparées via Supabase)
- [ ] Logs d'audit activés
- [ ] Secrets stockés sécurisés (variables d'environnement)
- [ ] Certificat SSL valide

### Performance

- [ ] Pagination obligatoire (max 100 items)
- [ ] Indexes DB créés
- [ ] Cache Redis pour tokens
- [ ] Timeouts configurés (30s max)
- [ ] Gzip activé
- [ ] Tests de charge passés (> 100 req/s)

### Documentation

- [ ] Spec OpenAPI complète et valide
- [ ] Swagger UI accessible
- [ ] Guide de démarrage rapide
- [ ] Exemples pour chaque endpoint
- [ ] Changelog versionné
- [ ] FAQ intégrations

### Monitoring

- [ ] Métriques API (latence, erreurs, volume)
- [ ] Alertes sur erreurs 5xx
- [ ] Alertes sur rate limit exceeded
- [ ] Dashboard usage par client
- [ ] Logs structurés (Pino)
- [ ] Intégration Sentry (optionnel)

### Conformité

- [ ] RGPD : Politique de confidentialité
- [ ] RGPD : Endpoints export/suppression
- [ ] CGU API acceptées par clients
- [ ] Politique de rétention logs (12 mois)
- [ ] SLA documenté (disponibilité 99.9%)

### Opérationnel

- [ ] Procédure de création client API
- [ ] Procédure de révocation urgente
- [ ] Plan de rollback documenté
- [ ] Runbook incidents API
- [ ] Contact support API défini

---

## 12. Annexes

### A. Structure des fichiers à créer

```
app/api/v1/
├── auth/
│   ├── token/route.ts
│   ├── revoke/route.ts
│   └── me/route.ts
├── buildings/
│   ├── route.ts
│   └── [id]/
│       ├── route.ts
│       ├── lots/route.ts
│       └── documents/route.ts
├── lots/
│   ├── route.ts
│   └── [id]/
│       ├── route.ts
│       ├── contracts/route.ts
│       └── interventions/route.ts
├── contacts/
│   ├── route.ts
│   └── [id]/route.ts
├── contracts/
│   ├── route.ts
│   └── [id]/route.ts
├── interventions/
│   ├── route.ts
│   └── [id]/
│       ├── route.ts
│       └── status/route.ts
├── invoices/
│   ├── route.ts
│   └── [id]/
│       ├── route.ts
│       └── ubl/route.ts
├── documents/
│   ├── route.ts
│   └── [id]/route.ts
├── webhooks/
│   ├── route.ts
│   └── [id]/
│       ├── route.ts
│       └── test/route.ts
├── sync/
│   ├── pull/route.ts
│   ├── push/route.ts
│   └── status/route.ts
├── gdpr/
│   ├── export/route.ts
│   └── delete/route.ts
└── docs/
    └── route.ts

lib/api/
├── auth/
│   ├── api-auth.ts
│   ├── oauth.service.ts
│   └── api-key.service.ts
├── types/
│   └── public-api.types.ts
├── mappers/
│   ├── data-mapper.service.ts
│   ├── mapper.types.ts
│   ├── configs/
│   │   ├── generic.config.ts
│   │   ├── smoovin.config.ts
│   │   ├── rentio.config.ts
│   │   ├── odoo.config.ts
│   │   ├── winbooks.config.ts
│   │   └── ubl.config.ts
│   └── transforms/
│       ├── address.transform.ts
│       ├── date.transform.ts
│       └── money.transform.ts
├── webhooks/
│   ├── webhook-dispatcher.service.ts
│   └── webhook.types.ts
├── openapi/
│   ├── spec.ts
│   └── schemas/
│       ├── building.schema.ts
│       ├── lot.schema.ts
│       └── ...
└── middleware/
    └── api-v1-middleware.ts

supabase/migrations/
└── 20260108120000_api_integration_tables.sql
```

### B. Variables d'environnement à ajouter

```env
# API Integration
API_JWT_SECRET=your-jwt-secret-min-32-chars
API_TOKEN_EXPIRY=3600

# Webhooks
WEBHOOK_SIGNING_SECRET=your-webhook-secret
WEBHOOK_TIMEOUT_MS=10000
WEBHOOK_MAX_RETRIES=5

# Rate Limiting (existant, ajuster)
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
```

### C. Dépendances npm à ajouter

```json
{
  "dependencies": {
    "swagger-ui-react": "^5.0.0",
    "yaml": "^2.0.0"
  },
  "devDependencies": {
    "openapi-types": "^12.0.0"
  }
}
```

> Note : `jsonwebtoken` est déjà présent dans le projet.

### D. Exemple de requête complète

```bash
# 1. Obtenir un token
curl -X POST https://app.seido.be/api/v1/auth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials&client_id=xxx&client_secret=yyy"

# Réponse
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 3600
}

# 2. Lister les immeubles
curl https://app.seido.be/api/v1/buildings \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."

# Réponse
{
  "success": true,
  "data": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "name": "Résidence Les Érables",
      "address": {
        "street": "Rue de la Paix 42",
        "postal_code": "1000",
        "city": "Bruxelles",
        "country": "BE"
      },
      "total_lots": 12,
      "occupied_lots": 10,
      "created_at": "2025-01-15T10:00:00Z",
      "updated_at": "2026-01-08T14:30:00Z"
    }
  ],
  "meta": {
    "total": 45,
    "page": 1,
    "per_page": 20,
    "total_pages": 3
  }
}

# 3. Créer un webhook
curl -X POST https://app.seido.be/api/v1/webhooks \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://my-system.com/webhooks/seido",
    "events": ["building.created", "lot.status_changed"],
    "secret": "my-webhook-secret"
  }'
```

### E. Références et ressources

- [OpenAPI 3.0 Specification](https://spec.openapis.org/oas/v3.0.3)
- [OAuth 2.0 RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749)
- [UBL 2.1 Documentation](https://docs.oasis-open.org/ubl/UBL-2.1.html)
- [Peppol Belgium](https://peppol.org/members/belgium/)
- [Supabase Documentation](https://supabase.com/docs)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)

---

**Fin du document de spécification**

*Document généré le 8 janvier 2026*
*Dernière mise à jour : 8 janvier 2026*
