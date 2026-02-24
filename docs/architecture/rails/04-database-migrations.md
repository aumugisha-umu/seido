> Part of [SEIDO Rails Architecture](../seido-rails-architecture.md)

---

← Previous: [Data Models](03-data-models.md) | Next: [Authorization](05-authorization.md) →

---

# Section 4: PostgreSQL Migrations (Raw SQL)

> **SCHEMA UPDATE NOTICE (2026-02-24)**
>
> The current SEIDO application (Next.js/Supabase) has **174 migrations** and **44 tables**.
> Key changes since this section was written:
>
> | Change | Old | Current |
> |--------|-----|---------|
> | Tables | 33+ | **44** |
> | Indexes | 150+ | **209** |
> | Enums | 37 | **42** |
> | Migrations | 146+ | **174** |
> | `intervention_status` | 11 values | **9 values** (removed `demande_de_devis`, `en_cours`) |
>
> **New tables to add:**
> - `addresses` (centralized with Google Maps support)
> - `intervention_types`, `intervention_type_categories`
> - `quote_attachments`, `quote_documents`
> - `email_links`, `push_subscriptions`, `import_jobs`
>
> **For the most accurate schema**, use `npm run supabase:types` to generate from the live database.

## 4.1 Overview

This section contains **raw PostgreSQL SQL** for creating the complete SEIDO database schema. While Rails provides a DSL for migrations, raw SQL offers:

1. **Full PostgreSQL feature access** (ENUM types, generated columns, partial indexes)
2. **Explicit control** over constraint definitions
3. **Performance optimization** with custom index types
4. **Portable documentation** for any PostgreSQL-based system

### 4.1.1 Migration Order

```
1. Enable extensions (uuid-ossp, pgcrypto)
2. Create ENUM types (39 types - updated)
3. Phase 1 tables (users, teams, permissions)
4. Phase CRM tables (addresses, contacts, documents)
5. Phase 2 tables (buildings, lots)
6. Phase 3 tables (interventions, chat, notifications)
7. Phase 4 tables (contracts, imports)
8. Billing tables (stripe_*)
9. Performance indexes (150+)
10. Triggers & functions
```

### 4.1.2 Rails Migration Wrapper

```ruby
# db/migrate/20250101000001_create_seido_schema.rb
class CreateSeidoSchema < ActiveRecord::Migration[7.1]
  def up
    execute <<-SQL
      -- Paste raw SQL here
    SQL
  end

  def down
    # Drop in reverse order
    execute "DROP TABLE IF EXISTS ..."
  end
end
```

---

## 4.2 PostgreSQL Extensions

```sql
-- ============================================================================
-- EXTENSIONS
-- Required for UUID generation and cryptographic functions
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";      -- uuid_generate_v4()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";       -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pg_trgm";        -- Trigram similarity for search
CREATE EXTENSION IF NOT EXISTS "unaccent";       -- Remove accents for search
```

---

## 4.3 ENUM Types (37 Types)

### 4.3.1 Phase 1: Users & Teams

```sql
-- ============================================================================
-- PHASE 1 ENUMS: Users & Teams
-- ============================================================================

CREATE TYPE user_role AS ENUM (
  'admin',
  'gestionnaire',
  'locataire',
  'prestataire',
  'proprietaire'
);

CREATE TYPE team_member_role AS ENUM (
  'admin',
  'gestionnaire',
  'locataire',
  'prestataire',
  'proprietaire'
);

CREATE TYPE invitation_status AS ENUM (
  'pending',
  'accepted',
  'expired',
  'cancelled'
);
```

### 4.3.2 Phase CRM: Contacts & Addresses

```sql
-- ============================================================================
-- PHASE CRM ENUMS: Contacts & Addresses
-- ============================================================================

CREATE TYPE contact_type AS ENUM ('person', 'company');

CREATE TYPE contact_category AS ENUM (
  'locataire',
  'proprietaire',
  'prestataire',
  'syndic',
  'assurance',
  'notaire',
  'banque',
  'administration',
  'autre'
);

CREATE TYPE country AS ENUM (
  'belgique',
  'france',
  'allemagne',
  'pays-bas',
  'suisse',
  'luxembourg',
  'autre'
);

-- Centralized document types (24 types)
CREATE TYPE document_entity_type AS ENUM (
  'building',
  'lot',
  'intervention',
  'contract',
  'contact',
  'company'
);

CREATE TYPE document_type AS ENUM (
  -- Contracts
  'bail', 'avenant', 'etat_des_lieux_entree', 'etat_des_lieux_sortie', 'reglement_copropriete',
  -- Financial
  'facture', 'devis', 'quittance', 'bon_de_commande',
  -- Technical
  'diagnostic', 'plan', 'certificat', 'garantie', 'manuel_utilisation', 'rapport',
  -- Administrative
  'justificatif_identite', 'justificatif_revenus', 'attestation_assurance', 'caution_bancaire',
  -- Photos
  'photo_avant', 'photo_apres', 'photo_compteur', 'photo_generale',
  -- Other
  'autre'
);

CREATE TYPE document_visibility_level AS ENUM (
  'prive',       -- Only uploader
  'equipe',      -- Team managers only
  'locataire',   -- Tenant can view
  'prestataire', -- Provider can view
  'public'       -- All participants
);
```

### 4.3.3 Phase 2: Properties

```sql
-- ============================================================================
-- PHASE 2 ENUMS: Properties
-- ============================================================================

CREATE TYPE lot_category AS ENUM (
  'appartement',
  'collocation',
  'maison',
  'garage',
  'local_commercial',
  'parking',
  'autre'
);
```

### 4.3.4 Phase 3: Interventions

```sql
-- ============================================================================
-- PHASE 3 ENUMS: Interventions
-- ============================================================================

CREATE TYPE intervention_type AS ENUM (
  'plomberie',
  'electricite',
  'chauffage',
  'serrurerie',
  'peinture',
  'menage',
  'jardinage',
  'climatisation',
  'vitrerie',
  'toiture',
  'autre'
);

CREATE TYPE intervention_urgency AS ENUM (
  'basse',
  'normale',
  'haute',
  'urgente'
);

CREATE TYPE intervention_status AS ENUM (
  'demande',                       -- Initial request by tenant
  'rejetee',                       -- Rejected by manager
  'approuvee',                     -- Approved by manager
  'planification',                 -- Finding time slot (quotes via intervention_quotes table)
  'planifiee',                     -- Time slot confirmed
  'cloturee_par_prestataire',      -- Provider marked complete
  'cloturee_par_locataire',        -- Tenant validated
  'cloturee_par_gestionnaire',     -- Manager finalized
  'annulee'                        -- Cancelled
);
-- NOTE: 9 statuses. Quotes managed via intervention_quotes table (requires_quote flag)

CREATE TYPE assignment_role AS ENUM ('gestionnaire', 'prestataire');

CREATE TYPE time_slot_status AS ENUM ('pending', 'selected', 'rejected', 'cancelled');

CREATE TYPE quote_status AS ENUM ('draft', 'sent', 'accepted', 'rejected', 'cancelled', 'expired');
```

### 4.3.5 Phase 3: Communication

```sql
-- ============================================================================
-- PHASE 3 ENUMS: Communication
-- ============================================================================

CREATE TYPE conversation_thread_type AS ENUM (
  'group',                   -- All participants
  'tenant_to_managers',      -- Private: tenant ↔ managers
  'provider_to_managers',    -- Private: provider ↔ managers
  'email_internal',          -- Email thread sync
  'tenants_group',           -- Multiple tenants group
  'providers_group'          -- Multiple providers group
);
-- NOTE: 6 types (updated 2026-02-02)

CREATE TYPE notification_type AS ENUM (
  'intervention',
  'chat',
  'document',
  'system',
  'team_invite',
  'assignment',
  'status_change',
  'reminder',
  'deadline'
);

CREATE TYPE notification_priority AS ENUM ('low', 'normal', 'high', 'urgent');

CREATE TYPE activity_action_type AS ENUM (
  'create', 'update', 'delete', 'view',
  'assign', 'unassign', 'approve', 'reject',
  'upload', 'download', 'share', 'comment',
  'status_change', 'send_notification',
  'login', 'logout'
);

CREATE TYPE activity_entity_type AS ENUM (
  'user', 'team', 'building', 'lot', 'intervention',
  'document', 'contact', 'notification', 'message',
  'quote', 'report', 'contract'
);

CREATE TYPE activity_status AS ENUM ('success', 'failure', 'pending');

CREATE TYPE email_direction AS ENUM ('received', 'sent');

CREATE TYPE email_status AS ENUM ('unread', 'read', 'archived', 'deleted');
```

### 4.3.6 Phase 4: Contracts & Import

```sql
-- ============================================================================
-- PHASE 4 ENUMS: Contracts & Import
-- ============================================================================

CREATE TYPE contract_type AS ENUM ('bail_habitation', 'bail_meuble');

CREATE TYPE contract_status AS ENUM (
  'brouillon',
  'actif',
  'expire',
  'resilie',
  'renouvele'
);

CREATE TYPE guarantee_type AS ENUM (
  'pas_de_garantie',
  'compte_proprietaire',
  'compte_bloque',
  'e_depot',
  'autre'
);

CREATE TYPE payment_frequency AS ENUM (
  'mensuel',
  'trimestriel',
  'semestriel',
  'annuel'
);

CREATE TYPE contract_contact_role AS ENUM (
  'locataire',
  'colocataire',
  'garant',
  'representant_legal',
  'autre'
);

CREATE TYPE import_job_status AS ENUM (
  'pending',
  'validating',
  'importing',
  'completed',
  'failed',
  'cancelled'
);

CREATE TYPE import_entity_type AS ENUM (
  'building',
  'lot',
  'contact',
  'contract',
  'mixed'
);
```

### 4.3.7 Billing: Stripe

```sql
-- ============================================================================
-- BILLING ENUMS: Stripe
-- ============================================================================

CREATE TYPE subscription_status AS ENUM (
  'trialing',
  'active',
  'incomplete',
  'incomplete_expired',
  'past_due',
  'unpaid',
  'canceled',
  'paused'
);

CREATE TYPE pricing_type AS ENUM ('one_time', 'recurring');

CREATE TYPE pricing_interval AS ENUM ('day', 'week', 'month', 'year');

CREATE TYPE invoice_status AS ENUM ('draft', 'open', 'paid', 'uncollectible', 'void');
```

---

## 4.4 Phase 1 Tables: Users & Teams

### 4.4.1 teams

```sql
-- ============================================================================
-- TABLE: teams
-- Description: Multi-tenant isolation unit (organizations/agencies)
-- ============================================================================
CREATE TABLE teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  name VARCHAR(255) NOT NULL,
  description TEXT,
  settings JSONB DEFAULT '{}',

  -- Creator reference (becomes team owner)
  created_by UUID,  -- FK added after users table exists

  -- Soft delete
  discarded_at TIMESTAMP WITH TIME ZONE,
  discarded_by UUID,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_teams_name ON teams(name) WHERE discarded_at IS NULL;
CREATE INDEX idx_teams_created_by ON teams(created_by) WHERE discarded_at IS NULL;
```

### 4.4.2 users

```sql
-- ============================================================================
-- TABLE: users
-- Description: Authenticated users (Devise compatible)
-- ============================================================================
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Devise fields
  email VARCHAR(255) NOT NULL,
  encrypted_password VARCHAR(255) NOT NULL DEFAULT '',

  -- Devise recoverable
  reset_password_token VARCHAR(255),
  reset_password_sent_at TIMESTAMP WITH TIME ZONE,

  -- Devise rememberable
  remember_created_at TIMESTAMP WITH TIME ZONE,

  -- Devise confirmable
  confirmation_token VARCHAR(255),
  confirmed_at TIMESTAMP WITH TIME ZONE,
  confirmation_sent_at TIMESTAMP WITH TIME ZONE,
  unconfirmed_email VARCHAR(255),

  -- Profile
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  phone VARCHAR(50),
  avatar_url TEXT,

  -- Internationalization (i18n)
  locale VARCHAR(5) DEFAULT 'fr',  -- 'fr', 'nl', 'en'
  timezone VARCHAR(50) DEFAULT 'Europe/Brussels',

  -- Role
  role user_role NOT NULL DEFAULT 'gestionnaire',

  -- Team optimization
  primary_team_id UUID REFERENCES teams(id) ON DELETE SET NULL,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  password_set BOOLEAN DEFAULT FALSE,
  last_login_at TIMESTAMP WITH TIME ZONE,

  -- Soft delete
  discarded_at TIMESTAMP WITH TIME ZONE,
  discarded_by UUID REFERENCES users(id),

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Unique constraints
CREATE UNIQUE INDEX idx_users_email ON users(email) WHERE discarded_at IS NULL;
CREATE UNIQUE INDEX idx_users_reset_token ON users(reset_password_token);
CREATE UNIQUE INDEX idx_users_confirmation_token ON users(confirmation_token);

-- Other indexes
CREATE INDEX idx_users_role ON users(role) WHERE discarded_at IS NULL;
CREATE INDEX idx_users_primary_team ON users(primary_team_id) WHERE discarded_at IS NULL;
CREATE INDEX idx_users_active ON users(is_active) WHERE discarded_at IS NULL;
CREATE INDEX idx_users_locale ON users(locale) WHERE discarded_at IS NULL;

-- Add FK from teams now that users exists
ALTER TABLE teams ADD CONSTRAINT fk_teams_created_by
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE teams ADD CONSTRAINT fk_teams_discarded_by
  FOREIGN KEY (discarded_by) REFERENCES users(id) ON DELETE SET NULL;
```

### 4.4.3 team_members

```sql
-- ============================================================================
-- TABLE: team_members
-- Description: User-team membership with permissions
-- Uses soft delete via discarded_at (not physical delete)
-- ============================================================================
CREATE TABLE team_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Role in team
  role team_member_role NOT NULL DEFAULT 'gestionnaire',

  -- Permissions (NULL = use role defaults)
  permissions TEXT[],
  is_team_owner BOOLEAN DEFAULT FALSE,

  -- Membership dates
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Soft delete (deactivation)
  discarded_at TIMESTAMP WITH TIME ZONE,
  discarded_by UUID REFERENCES users(id),
  deactivation_reason TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_team_user UNIQUE (team_id, user_id),
  CONSTRAINT valid_deactivation CHECK (
    (discarded_at IS NULL AND discarded_by IS NULL) OR
    (discarded_at IS NOT NULL AND discarded_by IS NOT NULL)
  )
);

-- Critical RLS index
CREATE INDEX idx_team_members_user_team_role
  ON team_members(user_id, team_id, role)
  WHERE discarded_at IS NULL;

-- GIN index for permissions array
CREATE INDEX idx_team_members_permissions
  ON team_members USING GIN(permissions)
  WHERE permissions IS NOT NULL;

-- Other indexes
CREATE INDEX idx_team_members_team_owner ON team_members(team_id) WHERE is_team_owner = TRUE;
CREATE INDEX idx_team_members_active ON team_members(team_id, user_id) WHERE discarded_at IS NULL;
CREATE INDEX idx_team_members_history ON team_members(team_id, discarded_at DESC) WHERE discarded_at IS NOT NULL;
```

### 4.4.4 user_invitations

```sql
-- ============================================================================
-- TABLE: user_invitations
-- Description: Pending invitations to join a team
-- ============================================================================
CREATE TABLE user_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  email VARCHAR(255) NOT NULL,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES users(id),
  contact_id UUID,  -- FK added after contacts table
  user_id UUID REFERENCES users(id),  -- Set after acceptance

  -- Role configuration
  role user_role NOT NULL DEFAULT 'gestionnaire',
  provider_category VARCHAR(50),

  -- Pre-fill data
  first_name VARCHAR(255),
  last_name VARCHAR(255),

  -- Token
  invitation_token VARCHAR(255),
  status invitation_status NOT NULL DEFAULT 'pending',

  -- Dates
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMP WITH TIME ZONE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- One pending invitation per email per team
  CONSTRAINT unique_pending_invitation UNIQUE (email, team_id)
);

-- Indexes
CREATE INDEX idx_invitations_email ON user_invitations(email);
CREATE INDEX idx_invitations_team ON user_invitations(team_id);
CREATE INDEX idx_invitations_status ON user_invitations(status);
CREATE INDEX idx_invitations_token ON user_invitations(invitation_token) WHERE invitation_token IS NOT NULL;
CREATE INDEX idx_invitations_active ON user_invitations(team_id, status, expires_at)
  WHERE status = 'pending' AND expires_at > NOW();
```

### 4.4.5 permissions

```sql
-- ============================================================================
-- TABLE: permissions
-- Description: System permission definitions (28 permissions)
-- ============================================================================
CREATE TABLE permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_admin_only BOOLEAN DEFAULT FALSE,
  is_system BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_permissions_code ON permissions(code);
CREATE INDEX idx_permissions_category ON permissions(category, sort_order);

-- ============================================================================
-- SEED DATA: 28 Permissions
-- ============================================================================
INSERT INTO permissions (code, name, description, category, sort_order, is_system) VALUES
-- Team (6)
('team.view', 'View team', 'View team settings', 'team', 1, true),
('team.manage', 'Manage team', 'Modify team settings', 'team', 2, false),
('team.managers_invite', 'Invite managers', 'Create manager accounts', 'team', 3, false),
('team.managers_manage', 'Manage managers', 'Modify manager permissions', 'team', 4, false),
('team.members_invite', 'Invite members', 'Invite tenants/providers/owners', 'team', 5, false),
('team.members_manage', 'Manage members', 'Modify other member permissions', 'team', 6, false),

-- Properties (4)
('properties.view', 'View properties', 'View buildings/lots', 'properties', 10, true),
('properties.create', 'Create properties', 'Add buildings/lots', 'properties', 11, false),
('properties.manage', 'Manage properties', 'Edit/delete properties', 'properties', 12, false),
('properties.documents', 'Manage documents', 'Upload/delete documents', 'properties', 13, false),

-- Contracts (3)
('contracts.view', 'View contracts', 'View leases', 'contracts', 20, true),
('contracts.create', 'Create contracts', 'Add leases', 'contracts', 21, false),
('contracts.manage', 'Manage contracts', 'Edit/terminate leases', 'contracts', 22, false),

-- Interventions (4)
('interventions.view', 'View interventions', 'View intervention list', 'interventions', 30, true),
('interventions.create', 'Create interventions', 'Create requests', 'interventions', 31, false),
('interventions.manage', 'Manage interventions', 'Approve/assign', 'interventions', 32, false),
('interventions.close', 'Close interventions', 'Finalize interventions', 'interventions', 33, false),

-- Contacts (3)
('contacts.view', 'View contacts', 'View contact list', 'contacts', 40, true),
('contacts.create', 'Create contacts', 'Add contacts', 'contacts', 41, false),
('contacts.manage', 'Manage contacts', 'Edit/delete contacts', 'contacts', 42, false),

-- Reports (3)
('reports.view', 'View reports', 'Access dashboard', 'reports', 50, true),
('reports.export', 'Export data', 'Export CSV/Excel', 'reports', 51, false),
('reports.analytics', 'Analytics', 'Advanced analytics', 'reports', 52, false),

-- Billing (5)
('billing.subscription_view', 'View subscription', 'View plan status', 'billing', 60, false),
('billing.subscription_manage', 'Manage subscription', 'Change plan, cancel', 'billing', 61, false),
('billing.invoices_view', 'View invoices', 'View invoice history', 'billing', 62, false),
('billing.invoices_download', 'Download invoices', 'Export invoice PDFs', 'billing', 63, false),
('billing.payment_method', 'Manage payment', 'Change payment method', 'billing', 64, false);
```

### 4.4.6 role_default_permissions

```sql
-- ============================================================================
-- TABLE: role_default_permissions
-- Description: Default permissions by role
-- ============================================================================
CREATE TABLE role_default_permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  role user_role NOT NULL,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,

  UNIQUE(role, permission_id)
);

CREATE INDEX idx_role_permissions_role ON role_default_permissions(role);

-- ============================================================================
-- SEED DATA: Role defaults
-- ============================================================================

-- Admin: All permissions
INSERT INTO role_default_permissions (role, permission_id)
SELECT 'admin', id FROM permissions;

-- Gestionnaire: Most permissions except admin-only
INSERT INTO role_default_permissions (role, permission_id)
SELECT 'gestionnaire', id FROM permissions
WHERE code NOT IN ('team.managers_manage', 'billing.subscription_manage', 'billing.payment_method');

-- Locataire: View + create interventions
INSERT INTO role_default_permissions (role, permission_id)
SELECT 'locataire', id FROM permissions
WHERE code IN ('interventions.view', 'interventions.create', 'contracts.view');

-- Prestataire: View + work on assigned interventions
INSERT INTO role_default_permissions (role, permission_id)
SELECT 'prestataire', id FROM permissions
WHERE code IN ('interventions.view');

-- Proprietaire: View properties and contracts
INSERT INTO role_default_permissions (role, permission_id)
SELECT 'proprietaire', id FROM permissions
WHERE code IN ('properties.view', 'contracts.view', 'interventions.view', 'reports.view');
```

### 4.4.7 companies & company_members

```sql
-- ============================================================================
-- TABLE: companies
-- Description: Service provider companies
-- ============================================================================
CREATE TABLE companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,

  -- Company info
  name VARCHAR(255) NOT NULL,
  legal_name VARCHAR(255),
  vat_number VARCHAR(50),
  registration_number VARCHAR(50),

  -- Contact
  address_id UUID,  -- FK added after addresses table
  phone VARCHAR(50),
  email VARCHAR(255),
  website VARCHAR(255),

  -- Metadata
  logo_url TEXT,
  notes TEXT,

  -- Soft delete
  discarded_at TIMESTAMP WITH TIME ZONE,
  discarded_by UUID REFERENCES users(id),

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_companies_team ON companies(team_id) WHERE discarded_at IS NULL;
CREATE INDEX idx_companies_vat ON companies(vat_number) WHERE vat_number IS NOT NULL;

-- ============================================================================
-- TABLE: company_members
-- Description: Contact-company associations
-- ============================================================================
CREATE TABLE company_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL,  -- FK added after contacts table

  role VARCHAR(50),
  job_title VARCHAR(100),
  is_primary BOOLEAN DEFAULT FALSE,
  notes TEXT,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_company_contact UNIQUE (company_id, contact_id)
);
```

---

## 4.5 Phase CRM Tables: Contacts & Addresses

### 4.5.1 addresses

```sql
-- ============================================================================
-- TABLE: addresses
-- Description: Centralized address storage (reusable)
-- ============================================================================
CREATE TABLE addresses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,

  -- Label
  label VARCHAR(100),  -- "Headquarters", "Billing address"

  -- Structured address
  street_line_1 TEXT NOT NULL,
  street_line_2 TEXT,
  postal_code VARCHAR(20) NOT NULL,
  city VARCHAR(100) NOT NULL,
  state_province VARCHAR(100),
  country country NOT NULL DEFAULT 'belgique',

  -- Geocoding
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  is_geocoded BOOLEAN DEFAULT FALSE,

  -- Validation
  is_verified BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_addresses_team ON addresses(team_id);
CREATE INDEX idx_addresses_city ON addresses(team_id, city);
CREATE INDEX idx_addresses_postal ON addresses(team_id, postal_code);
CREATE INDEX idx_addresses_geo ON addresses(latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Full-text search
CREATE INDEX idx_addresses_search ON addresses USING GIN (
  to_tsvector('french',
    COALESCE(street_line_1, '') || ' ' ||
    COALESCE(city, '') || ' ' ||
    COALESCE(postal_code, '')
  )
);

-- Add FK from companies
ALTER TABLE companies ADD CONSTRAINT fk_companies_address
  FOREIGN KEY (address_id) REFERENCES addresses(id) ON DELETE SET NULL;
```

### 4.5.2 contacts

```sql
-- ============================================================================
-- TABLE: contacts
-- Description: Unified CRM (persons and companies)
-- ============================================================================
CREATE TABLE contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,

  -- Type
  contact_type contact_type NOT NULL DEFAULT 'person',

  -- Common fields
  email VARCHAR(255),
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  display_name VARCHAR(255),
  phone VARCHAR(50),
  mobile_phone VARCHAR(50),

  -- Company fields (if contact_type = 'company')
  company_name VARCHAR(255),
  vat_number VARCHAR(50),
  registration_number VARCHAR(50),

  -- Associations
  address_id UUID REFERENCES addresses(id) ON DELETE SET NULL,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Categorization
  category contact_category NOT NULL DEFAULT 'autre',
  speciality intervention_type,  -- For providers

  -- Provider stats
  provider_rating DECIMAL(3,2) DEFAULT 0.00,
  total_interventions INTEGER DEFAULT 0,

  -- Metadata
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  source VARCHAR(50),  -- 'manual', 'import', 'api'

  -- Soft delete
  discarded_at TIMESTAMP WITH TIME ZONE,
  discarded_by UUID REFERENCES users(id),

  -- Audit
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_contact_type CHECK (
    (contact_type = 'person' AND (first_name IS NOT NULL OR last_name IS NOT NULL))
    OR
    (contact_type = 'company' AND company_name IS NOT NULL)
  )
);

-- Unique email per team
CREATE UNIQUE INDEX idx_contacts_unique_email ON contacts(team_id, email)
  WHERE email IS NOT NULL AND discarded_at IS NULL;

-- Other indexes
CREATE INDEX idx_contacts_team ON contacts(team_id) WHERE discarded_at IS NULL;
CREATE INDEX idx_contacts_category ON contacts(team_id, category) WHERE discarded_at IS NULL;
CREATE INDEX idx_contacts_user ON contacts(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_contacts_company ON contacts(company_id) WHERE company_id IS NOT NULL;
CREATE INDEX idx_contacts_email ON contacts(team_id, email) WHERE email IS NOT NULL AND discarded_at IS NULL;
CREATE INDEX idx_contacts_phone ON contacts(team_id, phone) WHERE phone IS NOT NULL AND discarded_at IS NULL;

-- Full-text search
CREATE INDEX idx_contacts_search ON contacts USING GIN (
  to_tsvector('french',
    COALESCE(first_name, '') || ' ' ||
    COALESCE(last_name, '') || ' ' ||
    COALESCE(company_name, '') || ' ' ||
    COALESCE(email, '')
  )
) WHERE discarded_at IS NULL;

-- Add FK to other tables
ALTER TABLE user_invitations ADD CONSTRAINT fk_invitations_contact
  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL;
ALTER TABLE company_members ADD CONSTRAINT fk_company_members_contact
  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE;
```

### 4.5.3 documents

```sql
-- ============================================================================
-- TABLE: documents
-- Description: Centralized polymorphic document storage
-- Replaces: property_documents, intervention_documents, contract_documents
-- ============================================================================
CREATE TABLE documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,

  -- Polymorphic reference
  entity_type document_entity_type NOT NULL,
  entity_id UUID NOT NULL,

  -- Classification
  document_type document_type NOT NULL DEFAULT 'autre',
  category TEXT,
  tags TEXT[] DEFAULT '{}',

  -- File info
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_size BIGINT NOT NULL CHECK (file_size > 0),
  mime_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  storage_bucket TEXT NOT NULL DEFAULT 'documents',

  -- Metadata
  title TEXT,
  description TEXT,
  document_date DATE,
  expiry_date DATE,
  visibility_level document_visibility_level NOT NULL DEFAULT 'equipe',
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,

  -- Validation workflow
  is_validated BOOLEAN NOT NULL DEFAULT FALSE,
  validated_by UUID REFERENCES users(id),
  validated_at TIMESTAMP WITH TIME ZONE,

  -- Chat attachment link
  message_id UUID,  -- FK added after conversation_messages

  -- Audit
  uploaded_by UUID NOT NULL REFERENCES users(id),
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  discarded_at TIMESTAMP WITH TIME ZONE,
  discarded_by UUID REFERENCES users(id),

  -- Constraints
  CONSTRAINT valid_expiry CHECK (expiry_date IS NULL OR expiry_date >= document_date),
  CONSTRAINT valid_validation CHECK (
    (is_validated = FALSE AND validated_by IS NULL AND validated_at IS NULL) OR
    (is_validated = TRUE AND validated_by IS NOT NULL AND validated_at IS NOT NULL)
  )
);

-- Entity lookup (primary)
CREATE INDEX idx_documents_entity ON documents(entity_type, entity_id) WHERE discarded_at IS NULL;

-- Team isolation
CREATE INDEX idx_documents_team ON documents(team_id) WHERE discarded_at IS NULL;

-- Type filtering
CREATE INDEX idx_documents_type ON documents(team_id, document_type) WHERE discarded_at IS NULL;

-- Entity-specific indexes
CREATE INDEX idx_documents_building ON documents(entity_id)
  WHERE entity_type = 'building' AND discarded_at IS NULL;
CREATE INDEX idx_documents_lot ON documents(entity_id)
  WHERE entity_type = 'lot' AND discarded_at IS NULL;
CREATE INDEX idx_documents_intervention ON documents(entity_id)
  WHERE entity_type = 'intervention' AND discarded_at IS NULL;
CREATE INDEX idx_documents_contract ON documents(entity_id)
  WHERE entity_type = 'contract' AND discarded_at IS NULL;

-- Expiration alerts
CREATE INDEX idx_documents_expiry ON documents(expiry_date)
  WHERE expiry_date IS NOT NULL AND discarded_at IS NULL;

-- Full-text search
CREATE INDEX idx_documents_search ON documents USING GIN (
  to_tsvector('french',
    COALESCE(title, '') || ' ' ||
    COALESCE(description, '') || ' ' ||
    COALESCE(original_filename, '') || ' ' ||
    COALESCE(array_to_string(tags, ' '), '')
  )
) WHERE discarded_at IS NULL;
```

---

## 4.6 Phase 2 Tables: Properties

### 4.6.1 buildings

```sql
-- ============================================================================
-- TABLE: buildings
-- Description: Real estate properties (can contain multiple lots)
-- ============================================================================
CREATE TABLE buildings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  address_id UUID NOT NULL REFERENCES addresses(id) ON DELETE RESTRICT,

  -- Identification
  name TEXT NOT NULL,
  reference VARCHAR(50),
  description TEXT,

  -- Counters (maintained by triggers)
  total_lots INTEGER DEFAULT 0,
  occupied_lots INTEGER DEFAULT 0,
  vacant_lots INTEGER DEFAULT 0,
  total_interventions INTEGER DEFAULT 0,
  active_interventions INTEGER DEFAULT 0,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Soft delete
  discarded_at TIMESTAMP WITH TIME ZONE,
  discarded_by UUID REFERENCES users(id),

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Constraint
  CONSTRAINT valid_lots_count CHECK (occupied_lots + vacant_lots = total_lots)
);

-- Indexes
CREATE INDEX idx_buildings_team ON buildings(team_id) WHERE discarded_at IS NULL;
CREATE INDEX idx_buildings_address ON buildings(address_id) WHERE discarded_at IS NULL;
CREATE INDEX idx_buildings_reference ON buildings(team_id, reference) WHERE reference IS NOT NULL AND discarded_at IS NULL;

-- Full-text search
CREATE INDEX idx_buildings_search ON buildings USING GIN (
  to_tsvector('french', name)
) WHERE discarded_at IS NULL;
```

### 4.6.2 lots

```sql
-- ============================================================================
-- TABLE: lots
-- Description: Individual units (apartments, parking, commercial)
-- Can be standalone or part of a building
-- ============================================================================
CREATE TABLE lots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  building_id UUID REFERENCES buildings(id) ON DELETE SET NULL,  -- NULL = standalone

  -- Identification
  reference TEXT NOT NULL,
  category lot_category NOT NULL DEFAULT 'appartement',

  -- Location in building
  floor INTEGER CHECK (floor >= -5 AND floor <= 100),
  apartment_number TEXT,

  -- Address (for standalone lots)
  address_id UUID REFERENCES addresses(id) ON DELETE SET NULL,

  -- Description
  description TEXT,

  -- Counters
  total_interventions INTEGER DEFAULT 0,
  active_interventions INTEGER DEFAULT 0,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Soft delete
  discarded_at TIMESTAMP WITH TIME ZONE,
  discarded_by UUID REFERENCES users(id),

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Unique reference per team
CREATE UNIQUE INDEX idx_lots_reference ON lots(team_id, reference)
  WHERE discarded_at IS NULL;

-- Other indexes
CREATE INDEX idx_lots_team ON lots(team_id) WHERE discarded_at IS NULL;
CREATE INDEX idx_lots_building ON lots(building_id) WHERE building_id IS NOT NULL AND discarded_at IS NULL;
CREATE INDEX idx_lots_standalone ON lots(team_id) WHERE building_id IS NULL AND discarded_at IS NULL;
CREATE INDEX idx_lots_category ON lots(team_id, category) WHERE discarded_at IS NULL;
```

### 4.6.3 building_contacts & lot_contacts

```sql
-- ============================================================================
-- TABLE: building_contacts
-- Description: Contact-building associations
-- ============================================================================
CREATE TABLE building_contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  team_id UUID NOT NULL,  -- Denormalized for performance

  role TEXT,  -- 'syndic', 'proprietaire', 'gardien'
  is_primary BOOLEAN DEFAULT FALSE,
  notes TEXT,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_building_contact UNIQUE (building_id, contact_id)
);

CREATE INDEX idx_building_contacts_building ON building_contacts(building_id);
CREATE INDEX idx_building_contacts_contact ON building_contacts(contact_id);
CREATE INDEX idx_building_contacts_team ON building_contacts(team_id);

-- ============================================================================
-- TABLE: lot_contacts
-- Description: Contact-lot associations
-- ============================================================================
CREATE TABLE lot_contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  lot_id UUID NOT NULL REFERENCES lots(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  team_id UUID NOT NULL,  -- Denormalized

  role TEXT,  -- 'locataire', 'proprietaire', 'garant'
  is_primary BOOLEAN DEFAULT FALSE,
  notes TEXT,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_lot_contact UNIQUE (lot_id, contact_id)
);

CREATE INDEX idx_lot_contacts_lot ON lot_contacts(lot_id);
CREATE INDEX idx_lot_contacts_contact ON lot_contacts(contact_id);
CREATE INDEX idx_lot_contacts_team ON lot_contacts(team_id);
```

---

## 4.7 Phase 3 Tables: Interventions

Due to document length, the remaining SQL for Phase 3 (interventions, chat, notifications), Phase 4 (contracts, imports), and Billing (Stripe) tables follows the same pattern. Key tables include:

### Summary of Remaining Tables

| Table | Key Columns | Indexes |
|-------|------------|---------|
| `interventions` | status (AASM), team_id, building_id, lot_id | team+status, reference |
| `intervention_assignments` | intervention_id, user_id, role | intervention+user+role |
| `intervention_time_slots` | intervention_id, slot_date, start_time | intervention+date |
| `intervention_quotes` | intervention_id, provider_id, amount, status | intervention+status |
| `intervention_comments` | intervention_id, user_id, content | intervention, is_internal |
| `intervention_reports` | intervention_id, created_by, photos | intervention |
| `intervention_links` | intervention_id, linked_intervention_id | both directions |
| `time_slot_responses` | time_slot_id, user_id, response | time_slot+user |
| `conversation_threads` | intervention_id, thread_type | intervention+type |
| `conversation_messages` | thread_id, user_id, content | thread, team_id |
| `conversation_participants` | thread_id, user_id | thread+user |
| `notifications` | user_id, type, read | user+unread |
| `activity_logs` | team_id, user_id, action_type | team+date, entity |
| `push_subscriptions` | user_id, endpoint, keys | user, endpoint |
| `contracts` | team_id, lot_id, status, dates | team+status, lot |
| `contract_contacts` | contract_id, contact_id, role | contract, role |
| `import_jobs` | team_id, status, entity_type | team+status |
| `stripe_customers` | team_id, stripe_customer_id | both unique |
| `stripe_products` | id (prod_xxx), name, active | active |
| `stripe_prices` | id (price_xxx), product_id | product, active |
| `subscriptions` | id (sub_xxx), team_id, status | team, status |
| `stripe_invoices` | id (in_xxx), team_id, status | team, status |

---

## 4.8 Performance Indexes (130+ Production-Ready)

This section documents all performance indexes required for production deployment, organized by category.

### 4.8.1 Multi-Tenant Isolation Indexes (25 indexes)

```sql
-- ============================================================================
-- MULTI-TENANT (team_id) INDEXES
-- These are CRITICAL for RLS-like performance with acts_as_tenant
-- ============================================================================

-- Phase 1: Users & Teams
CREATE INDEX idx_team_members_team ON team_members(team_id) WHERE discarded_at IS NULL;
CREATE INDEX idx_team_members_user ON team_members(user_id) WHERE discarded_at IS NULL;
CREATE INDEX idx_team_members_team_user ON team_members(team_id, user_id) WHERE discarded_at IS NULL;
CREATE INDEX idx_user_invitations_team ON user_invitations(team_id);
CREATE INDEX idx_user_invitations_email ON user_invitations(email);
CREATE INDEX idx_companies_team ON companies(team_id) WHERE discarded_at IS NULL;
CREATE INDEX idx_company_members_company ON company_members(company_id);
CREATE INDEX idx_company_members_user ON company_members(user_id);

-- Phase CRM: Contacts & Addresses
CREATE INDEX idx_contacts_team ON contacts(team_id) WHERE discarded_at IS NULL;
CREATE INDEX idx_contacts_type ON contacts(team_id, contact_type) WHERE discarded_at IS NULL;
CREATE INDEX idx_contacts_category ON contacts(team_id, category) WHERE discarded_at IS NULL;
CREATE INDEX idx_addresses_addressable ON addresses(addressable_type, addressable_id);

-- Phase 2: Properties
CREATE INDEX idx_buildings_team ON buildings(team_id) WHERE discarded_at IS NULL;
CREATE INDEX idx_lots_team ON lots(team_id) WHERE discarded_at IS NULL;
CREATE INDEX idx_lots_building ON lots(building_id) WHERE discarded_at IS NULL;
CREATE INDEX idx_building_contacts_building ON building_contacts(building_id);
CREATE INDEX idx_building_contacts_contact ON building_contacts(contact_id);
CREATE INDEX idx_building_contacts_team ON building_contacts(team_id);
CREATE INDEX idx_lot_contacts_lot ON lot_contacts(lot_id);
CREATE INDEX idx_lot_contacts_contact ON lot_contacts(contact_id);
CREATE INDEX idx_lot_contacts_team ON lot_contacts(team_id);

-- Phase 3: Interventions
CREATE INDEX idx_interventions_team ON interventions(team_id) WHERE discarded_at IS NULL;
CREATE INDEX idx_interventions_building ON interventions(building_id) WHERE discarded_at IS NULL;
CREATE INDEX idx_interventions_lot ON interventions(lot_id) WHERE discarded_at IS NULL;

-- Phase 4: Contracts
CREATE INDEX idx_contracts_team ON contracts(team_id) WHERE discarded_at IS NULL;
CREATE INDEX idx_contracts_lot ON contracts(lot_id) WHERE discarded_at IS NULL;
```

### 4.8.2 Full-Text Search Indexes (15 indexes)

```sql
-- ============================================================================
-- FULL-TEXT SEARCH (FTS) INDEXES
-- Using French text configuration for primary content
-- ============================================================================

-- Buildings search
CREATE INDEX idx_buildings_fts ON buildings USING GIN(
  to_tsvector('french', COALESCE(name, '') || ' ' || COALESCE(description, '') || ' ' || COALESCE(reference, ''))
);

-- Lots search
CREATE INDEX idx_lots_fts ON lots USING GIN(
  to_tsvector('french', COALESCE(reference, '') || ' ' || COALESCE(description, ''))
);

-- Contacts search (person)
CREATE INDEX idx_contacts_person_fts ON contacts USING GIN(
  to_tsvector('french', COALESCE(first_name, '') || ' ' || COALESCE(last_name, '') || ' ' || COALESCE(email, ''))
) WHERE contact_type = 'person';

-- Contacts search (company)
CREATE INDEX idx_contacts_company_fts ON contacts USING GIN(
  to_tsvector('french', COALESCE(company_name, '') || ' ' || COALESCE(vat_number, '') || ' ' || COALESCE(email, ''))
) WHERE contact_type = 'company';

-- Interventions search
CREATE INDEX idx_interventions_fts ON interventions USING GIN(
  to_tsvector('french', COALESCE(title, '') || ' ' || COALESCE(description, '') || ' ' || COALESCE(reference, ''))
);

-- Contracts search
CREATE INDEX idx_contracts_fts ON contracts USING GIN(
  to_tsvector('french', COALESCE(reference, '') || ' ' || COALESCE(notes, ''))
);

-- Conversation messages search
CREATE INDEX idx_conversation_messages_fts ON conversation_messages USING GIN(
  to_tsvector('french', COALESCE(content, ''))
);

-- Emails search
CREATE INDEX idx_emails_fts ON emails USING GIN(
  to_tsvector('french', COALESCE(subject, '') || ' ' || COALESCE(body_text, ''))
) WHERE discarded_at IS NULL;

-- Notifications search
CREATE INDEX idx_notifications_fts ON notifications USING GIN(
  to_tsvector('french', COALESCE(title, '') || ' ' || COALESCE(message, ''))
);

-- Activity logs search
CREATE INDEX idx_activity_logs_fts ON activity_logs USING GIN(
  to_tsvector('french', COALESCE(description, ''))
);

-- Intervention comments search
CREATE INDEX idx_intervention_comments_fts ON intervention_comments USING GIN(
  to_tsvector('french', COALESCE(content, ''))
);

-- Intervention reports search
CREATE INDEX idx_intervention_reports_fts ON intervention_reports USING GIN(
  to_tsvector('french', COALESCE(summary, '') || ' ' || COALESCE(work_description, '') || ' ' || COALESCE(observations, ''))
);

-- Companies search
CREATE INDEX idx_companies_fts ON companies USING GIN(
  to_tsvector('french', COALESCE(name, '') || ' ' || COALESCE(legal_name, '') || ' ' || COALESCE(vat_number, ''))
) WHERE discarded_at IS NULL;

-- Users search
CREATE INDEX idx_users_fts ON users USING GIN(
  to_tsvector('french', COALESCE(first_name, '') || ' ' || COALESCE(last_name, '') || ' ' || COALESCE(email, ''))
) WHERE discarded_at IS NULL;

-- Documents search
CREATE INDEX idx_documents_fts ON documents USING GIN(
  to_tsvector('french', COALESCE(title, '') || ' ' || COALESCE(description, ''))
) WHERE discarded_at IS NULL;
```

### 4.8.3 Dashboard & Common Query Indexes (30 indexes)

```sql
-- ============================================================================
-- DASHBOARD QUERIES
-- Optimized for the most common page loads
-- ============================================================================

-- Gestionnaire Dashboard: Open interventions
CREATE INDEX idx_interventions_dashboard ON interventions(team_id, status, urgency, created_at DESC)
  WHERE discarded_at IS NULL
  AND status NOT IN ('rejetee', 'cloturee_par_gestionnaire', 'annulee');

-- Gestionnaire Dashboard: Recent interventions
CREATE INDEX idx_interventions_recent ON interventions(team_id, created_at DESC)
  WHERE discarded_at IS NULL;

-- Gestionnaire Dashboard: By building
CREATE INDEX idx_interventions_by_building ON interventions(building_id, status, created_at DESC)
  WHERE discarded_at IS NULL;

-- Gestionnaire Dashboard: By lot
CREATE INDEX idx_interventions_by_lot ON interventions(lot_id, status, created_at DESC)
  WHERE discarded_at IS NULL;

-- Provider Dashboard: Assigned interventions
CREATE INDEX idx_assignments_provider ON intervention_assignments(user_id, created_at DESC)
  WHERE role = 'prestataire';

-- Provider Dashboard: Pending assignments
CREATE INDEX idx_assignments_pending ON intervention_assignments(user_id, notified)
  WHERE notified = FALSE;

-- Tenant Dashboard: My interventions
CREATE INDEX idx_interventions_tenant ON interventions(created_by, status, created_at DESC)
  WHERE discarded_at IS NULL;

-- Buildings list with lot count
CREATE INDEX idx_buildings_list ON buildings(team_id, name, created_at DESC)
  WHERE discarded_at IS NULL;

-- Lots by building
CREATE INDEX idx_lots_by_building ON lots(building_id, floor, reference)
  WHERE discarded_at IS NULL;

-- Contracts by lot
CREATE INDEX idx_contracts_by_lot ON contracts(lot_id, status, start_date)
  WHERE discarded_at IS NULL;

-- Active contracts
CREATE INDEX idx_contracts_active ON contracts(team_id, status, end_date)
  WHERE discarded_at IS NULL AND status = 'actif';

-- Expiring contracts (next 90 days)
CREATE INDEX idx_contracts_expiring ON contracts(team_id, end_date)
  WHERE discarded_at IS NULL
  AND status = 'actif';

-- Notifications by user
CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);

-- Unread notifications count
CREATE INDEX idx_notifications_unread ON notifications(user_id, created_at DESC)
  WHERE read = FALSE AND archived = FALSE;

-- Activity logs by team
CREATE INDEX idx_activity_logs_team ON activity_logs(team_id, created_at DESC);

-- Activity logs by entity
CREATE INDEX idx_activity_logs_entity ON activity_logs(entity_type, entity_id, created_at DESC);

-- Conversation threads by intervention
CREATE INDEX idx_threads_intervention ON conversation_threads(intervention_id);

-- Messages by thread
CREATE INDEX idx_messages_thread ON conversation_messages(thread_id, created_at ASC);

-- Quotes by intervention
CREATE INDEX idx_quotes_intervention ON intervention_quotes(intervention_id, status);

-- Accepted quotes
CREATE INDEX idx_quotes_accepted ON intervention_quotes(intervention_id)
  WHERE status = 'accepte';

-- Time slots by intervention
CREATE INDEX idx_time_slots_intervention ON intervention_time_slots(intervention_id, status);

-- Selected time slots
CREATE INDEX idx_time_slots_selected ON intervention_time_slots(intervention_id)
  WHERE selected = TRUE;

-- Documents by entity
CREATE INDEX idx_documents_entity ON documents(entity_type, entity_id, created_at DESC)
  WHERE discarded_at IS NULL;

-- Team members by role
CREATE INDEX idx_team_members_role ON team_members(team_id, role)
  WHERE discarded_at IS NULL;

-- Users by team (via team_members)
CREATE INDEX idx_users_by_role ON users(role, created_at DESC)
  WHERE discarded_at IS NULL AND is_active = TRUE;

-- Building contacts by role
CREATE INDEX idx_building_contacts_role ON building_contacts(building_id, role);

-- Lot contacts by role
CREATE INDEX idx_lot_contacts_role ON lot_contacts(lot_id, role);

-- Contract contacts by role
CREATE INDEX idx_contract_contacts_role ON contract_contacts(contract_id, role);

-- Emails by team
CREATE INDEX idx_emails_by_team ON emails(team_id, received_at DESC)
  WHERE discarded_at IS NULL;
```

### 4.8.4 Partial Indexes for Status Filtering (25 indexes)

```sql
-- ============================================================================
-- PARTIAL INDEXES
-- Filter by common status values to reduce index size
-- ============================================================================

-- Active users only
CREATE INDEX idx_users_active_only ON users(id, email, role)
  WHERE discarded_at IS NULL AND is_active = TRUE;

-- Active team members only
CREATE INDEX idx_team_members_active_only ON team_members(team_id, user_id, role)
  WHERE discarded_at IS NULL;

-- Active buildings only
CREATE INDEX idx_buildings_active_only ON buildings(team_id, name)
  WHERE discarded_at IS NULL;

-- Active lots only
CREATE INDEX idx_lots_active_only ON lots(team_id, building_id, reference)
  WHERE discarded_at IS NULL;

-- Open interventions (not closed/cancelled)
CREATE INDEX idx_interventions_open ON interventions(team_id, status, created_at)
  WHERE discarded_at IS NULL
  AND status NOT IN ('cloturee_par_gestionnaire', 'annulee', 'rejetee');

-- Interventions requiring quotes (via requires_quote flag)
CREATE INDEX idx_interventions_requiring_quote ON interventions(team_id, created_at)
  WHERE discarded_at IS NULL AND requires_quote = true
  AND status IN ('approuvee', 'planification');

-- Interventions in planning or scheduled
CREATE INDEX idx_interventions_planning ON interventions(team_id, created_at)
  WHERE discarded_at IS NULL AND status IN ('planification', 'planifiee');

-- Urgent interventions
CREATE INDEX idx_interventions_urgent ON interventions(team_id, created_at)
  WHERE discarded_at IS NULL
  AND urgency IN ('haute', 'urgente')
  AND status NOT IN ('cloturee_par_gestionnaire', 'annulee', 'rejetee');

-- Pending quotes
CREATE INDEX idx_quotes_pending ON intervention_quotes(intervention_id, created_at)
  WHERE status = 'en_attente';

-- Available time slots
CREATE INDEX idx_time_slots_available ON intervention_time_slots(intervention_id, start_datetime)
  WHERE status = 'propose';

-- Confirmed time slots
CREATE INDEX idx_time_slots_confirmed ON intervention_time_slots(intervention_id)
  WHERE status = 'confirme';

-- Active contracts only
CREATE INDEX idx_contracts_active_only ON contracts(team_id, lot_id)
  WHERE discarded_at IS NULL AND status = 'actif';

-- Draft contracts
CREATE INDEX idx_contracts_draft ON contracts(team_id, created_at)
  WHERE discarded_at IS NULL AND status = 'brouillon';

-- Pending invitations
CREATE INDEX idx_invitations_pending ON user_invitations(team_id, email)
  WHERE status = 'pending' AND expires_at > NOW();

-- Accepted invitations (for tracking)
CREATE INDEX idx_invitations_accepted ON user_invitations(team_id, accepted_at)
  WHERE status = 'accepted';

-- Unread notifications
CREATE INDEX idx_notifications_unread_only ON notifications(user_id, created_at DESC)
  WHERE read = FALSE;

-- Unarchived notifications
CREATE INDEX idx_notifications_active ON notifications(user_id, created_at DESC)
  WHERE archived = FALSE;

-- Active email connections
CREATE INDEX idx_email_connections_active ON team_email_connections(team_id)
  WHERE discarded_at IS NULL AND sync_enabled = TRUE;

-- Email connections needing sync
CREATE INDEX idx_email_connections_needs_sync ON team_email_connections(last_sync_at)
  WHERE discarded_at IS NULL
  AND sync_enabled = TRUE
  AND sync_status IN ('pending', 'error');

-- Unread emails
CREATE INDEX idx_emails_unread_only ON emails(team_id, received_at DESC)
  WHERE discarded_at IS NULL AND read_at IS NULL;

-- Active subscriptions
CREATE INDEX idx_subscriptions_active_only ON subscriptions(team_id)
  WHERE status = 'active';

-- Past due subscriptions
CREATE INDEX idx_subscriptions_past_due ON subscriptions(team_id, current_period_end)
  WHERE status = 'past_due';

-- Unpaid invoices
CREATE INDEX idx_invoices_unpaid ON stripe_invoices(team_id, due_date)
  WHERE status IN ('open', 'uncollectible');
```

### 4.8.5 Composite Indexes for JOIN Optimization (25 indexes)

```sql
-- ============================================================================
-- COMPOSITE INDEXES
-- Optimized for common JOIN patterns
-- ============================================================================

-- User lookup with team membership
CREATE INDEX idx_team_members_lookup ON team_members(user_id, team_id, role)
  WHERE discarded_at IS NULL;

-- User lookup by team (reverse)
CREATE INDEX idx_team_members_by_team ON team_members(team_id, user_id, role)
  WHERE discarded_at IS NULL;

-- Building with team context
CREATE INDEX idx_buildings_team_context ON buildings(team_id, id, name)
  WHERE discarded_at IS NULL;

-- Lot with building context
CREATE INDEX idx_lots_building_context ON lots(building_id, team_id, id, reference)
  WHERE discarded_at IS NULL;

-- Intervention with building context
CREATE INDEX idx_interventions_building_context ON interventions(building_id, team_id, status, id)
  WHERE discarded_at IS NULL;

-- Intervention with lot context
CREATE INDEX idx_interventions_lot_context ON interventions(lot_id, team_id, status, id)
  WHERE discarded_at IS NULL;

-- Assignment with user context
CREATE INDEX idx_assignments_user_context ON intervention_assignments(user_id, intervention_id, role);

-- Assignment with intervention context
CREATE INDEX idx_assignments_intervention_context ON intervention_assignments(intervention_id, user_id, role);

-- Quote with intervention context
CREATE INDEX idx_quotes_intervention_context ON intervention_quotes(intervention_id, provider_id, status);

-- Quote with provider context
CREATE INDEX idx_quotes_provider_context ON intervention_quotes(provider_id, intervention_id, status);

-- Time slot with intervention context
CREATE INDEX idx_time_slots_context ON intervention_time_slots(intervention_id, status, start_datetime);

-- Contract with lot context
CREATE INDEX idx_contracts_lot_context ON contracts(lot_id, team_id, status, start_date)
  WHERE discarded_at IS NULL;

-- Contract contact lookup
CREATE INDEX idx_contract_contacts_lookup ON contract_contacts(contract_id, user_id, role);

-- Contract contact by user
CREATE INDEX idx_contract_contacts_user ON contract_contacts(user_id, contract_id, role);

-- Building contact lookup
CREATE INDEX idx_building_contacts_lookup ON building_contacts(building_id, contact_id, role);

-- Lot contact lookup
CREATE INDEX idx_lot_contacts_lookup ON lot_contacts(lot_id, contact_id, role);

-- Contact by team and type
CREATE INDEX idx_contacts_team_type ON contacts(team_id, contact_type, last_name, first_name)
  WHERE discarded_at IS NULL;

-- Notification with user context
CREATE INDEX idx_notifications_user_context ON notifications(user_id, notification_type, read, created_at DESC);

-- Activity log context
CREATE INDEX idx_activity_logs_context ON activity_logs(entity_type, entity_id, action_type, created_at DESC);

-- Thread with intervention context
CREATE INDEX idx_threads_context ON conversation_threads(intervention_id, thread_type);

-- Message with sender context
CREATE INDEX idx_messages_sender ON conversation_messages(sender_id, thread_id, created_at DESC);

-- Document with entity context
CREATE INDEX idx_documents_context ON documents(entity_type, entity_id, document_type, created_at DESC)
  WHERE discarded_at IS NULL;

-- Email with connection context
CREATE INDEX idx_emails_connection_context ON emails(team_email_connection_id, direction, received_at DESC)
  WHERE discarded_at IS NULL;

-- Email with intervention link
CREATE INDEX idx_emails_intervention_context ON emails(intervention_id, team_id, received_at DESC)
  WHERE discarded_at IS NULL AND intervention_id IS NOT NULL;

-- Import job tracking
CREATE INDEX idx_import_jobs_context ON import_jobs(team_id, entity_type, status, created_at DESC);
```

### 4.8.6 Covering Indexes (10 indexes)

```sql
-- ============================================================================
-- COVERING INDEXES
-- Include frequently accessed columns to avoid table lookups
-- ============================================================================

-- Notifications list (avoid table lookup)
CREATE INDEX idx_notifications_covering ON notifications(user_id, read, created_at DESC)
  INCLUDE (title, notification_type, priority, link);

-- Interventions list (avoid table lookup)
CREATE INDEX idx_interventions_list_covering ON interventions(team_id, status, created_at DESC)
  INCLUDE (title, reference, urgency, building_id, lot_id);

-- Buildings list (avoid table lookup)
CREATE INDEX idx_buildings_list_covering ON buildings(team_id, name)
  INCLUDE (address, lot_count, created_at)
  WHERE discarded_at IS NULL;

-- Lots list (avoid table lookup)
CREATE INDEX idx_lots_list_covering ON lots(building_id, floor, reference)
  INCLUDE (lot_type, surface_area, monthly_rent)
  WHERE discarded_at IS NULL;

-- Contracts list (avoid table lookup)
CREATE INDEX idx_contracts_list_covering ON contracts(team_id, status, start_date)
  INCLUDE (reference, lot_id, monthly_rent, end_date)
  WHERE discarded_at IS NULL;

-- Quotes list (avoid table lookup)
CREATE INDEX idx_quotes_list_covering ON intervention_quotes(intervention_id, status)
  INCLUDE (provider_id, amount_ht, amount_ttc, valid_until);

-- Time slots list (avoid table lookup)
CREATE INDEX idx_time_slots_list_covering ON intervention_time_slots(intervention_id, status)
  INCLUDE (start_datetime, end_datetime, proposed_by_id);

-- Assignments list (avoid table lookup)
CREATE INDEX idx_assignments_list_covering ON intervention_assignments(intervention_id)
  INCLUDE (user_id, role, assigned_by_id, notified);

-- Team members list (avoid table lookup)
CREATE INDEX idx_team_members_list_covering ON team_members(team_id)
  INCLUDE (user_id, role, joined_at)
  WHERE discarded_at IS NULL;

-- Activity logs list (avoid table lookup)
CREATE INDEX idx_activity_logs_list_covering ON activity_logs(team_id, created_at DESC)
  INCLUDE (actor_id, action_type, entity_type, entity_id, description);
```

### 4.8.7 Foreign Key Indexes (automatically created, but documented)

```sql
-- ============================================================================
-- FOREIGN KEY INDEXES
-- PostgreSQL doesn't auto-create these; Rails does in migrations
-- These should be verified to exist
-- ============================================================================

-- Note: Most FK indexes are already covered by composite indexes above.
-- The following are standalone FK indexes for tables not yet covered:

CREATE INDEX idx_push_subscriptions_user ON push_subscriptions(user_id);
CREATE INDEX idx_intervention_comments_intervention ON intervention_comments(intervention_id);
CREATE INDEX idx_intervention_comments_user ON intervention_comments(user_id);
CREATE INDEX idx_intervention_reports_intervention ON intervention_reports(intervention_id);
CREATE INDEX idx_intervention_reports_user ON intervention_reports(created_by);
CREATE INDEX idx_intervention_links_source ON intervention_links(source_intervention_id);
CREATE INDEX idx_intervention_links_linked ON intervention_links(linked_intervention_id);
CREATE INDEX idx_time_slot_responses_slot ON time_slot_responses(time_slot_id);
CREATE INDEX idx_time_slot_responses_user ON time_slot_responses(user_id);
CREATE INDEX idx_conversation_participants_thread ON conversation_participants(thread_id);
CREATE INDEX idx_conversation_participants_user ON conversation_participants(user_id);
CREATE INDEX idx_stripe_customers_team ON stripe_customers(team_id);
CREATE INDEX idx_subscriptions_team ON subscriptions(team_id);
CREATE INDEX idx_subscriptions_price ON subscriptions(stripe_price_id);
CREATE INDEX idx_stripe_invoices_team ON stripe_invoices(team_id);
CREATE INDEX idx_stripe_invoices_subscription ON stripe_invoices(subscription_id);
CREATE INDEX idx_stripe_prices_product ON stripe_prices(stripe_product_id);
```

### 4.8.8 Index Statistics Summary

| Category | Count | Purpose |
|----------|-------|---------|
| Multi-Tenant (team_id) | 25 | RLS-like isolation performance |
| Full-Text Search (GIN) | 15 | French text search across all searchable entities |
| Dashboard Queries | 30 | Common page load optimization |
| Partial Indexes | 25 | Status-based filtering efficiency |
| Composite Indexes | 25 | JOIN pattern optimization |
| Covering Indexes | 10 | Eliminate table lookups |
| Foreign Key Indexes | 17 | Ensure all FKs are indexed |
| **TOTAL** | **147** | |

### 4.8.9 Index Maintenance

```sql
-- Check unused indexes (run after 1 month of production)
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY tablename, indexname;

-- Check index bloat
SELECT
  indexrelname AS index_name,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
  idx_scan AS number_of_scans
FROM pg_stat_user_indexes
ORDER BY pg_relation_size(indexrelid) DESC
LIMIT 20;

-- Rebuild bloated indexes
REINDEX INDEX CONCURRENTLY idx_name;

-- Analyze table statistics after bulk operations
ANALYZE tablename;
```

---

## 4.9 Triggers & Functions

### 4.9.1 Denormalization Triggers

```sql
-- ============================================================================
-- TRIGGER: Sync team_id on building_contacts
-- ============================================================================
CREATE OR REPLACE FUNCTION sync_building_contact_team_id()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.team_id := (SELECT team_id FROM buildings WHERE id = NEW.building_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_building_contacts_team_id
BEFORE INSERT ON building_contacts
FOR EACH ROW EXECUTE FUNCTION sync_building_contact_team_id();

-- ============================================================================
-- TRIGGER: Sync team_id on lot_contacts
-- ============================================================================
CREATE OR REPLACE FUNCTION sync_lot_contact_team_id()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.team_id := (SELECT team_id FROM lots WHERE id = NEW.lot_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_lot_contacts_team_id
BEFORE INSERT ON lot_contacts
FOR EACH ROW EXECUTE FUNCTION sync_lot_contact_team_id();

-- ============================================================================
-- TRIGGER: Generate intervention reference
-- ============================================================================
CREATE OR REPLACE FUNCTION generate_intervention_reference()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  date_part TEXT;
  sequence_num INTEGER;
BEGIN
  date_part := to_char(CURRENT_DATE, 'YYYYMMDD');

  SELECT COUNT(*) + 1 INTO sequence_num
  FROM interventions
  WHERE reference LIKE 'INT-' || date_part || '-%';

  NEW.reference := 'INT-' || date_part || '-' || LPAD(sequence_num::TEXT, 3, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_intervention_reference
BEFORE INSERT ON interventions
FOR EACH ROW
WHEN (NEW.reference IS NULL)
EXECUTE FUNCTION generate_intervention_reference();

-- ============================================================================
-- TRIGGER: Update building counters
-- ============================================================================
CREATE OR REPLACE FUNCTION update_building_lot_counts()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF NEW.building_id IS NOT NULL THEN
      UPDATE buildings
      SET total_lots = (
        SELECT COUNT(*) FROM lots
        WHERE building_id = NEW.building_id AND discarded_at IS NULL
      ),
      updated_at = NOW()
      WHERE id = NEW.building_id;
    END IF;
  END IF;

  IF TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN
    IF OLD.building_id IS NOT NULL AND (TG_OP = 'DELETE' OR OLD.building_id != NEW.building_id) THEN
      UPDATE buildings
      SET total_lots = (
        SELECT COUNT(*) FROM lots
        WHERE building_id = OLD.building_id AND discarded_at IS NULL
      ),
      updated_at = NOW()
      WHERE id = OLD.building_id;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER tr_lots_building_counts
AFTER INSERT OR UPDATE OF building_id, discarded_at OR DELETE ON lots
FOR EACH ROW EXECUTE FUNCTION update_building_lot_counts();

-- ============================================================================
-- TRIGGER: Prevent physical deletion of team_members
-- ============================================================================
CREATE OR REPLACE FUNCTION prevent_team_member_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.discarded_at IS NULL THEN
    RAISE EXCEPTION 'Physical deletion not allowed. Use UPDATE discarded_at = NOW()';
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER tr_prevent_team_member_delete
BEFORE DELETE ON team_members
FOR EACH ROW EXECUTE FUNCTION prevent_team_member_delete();

-- ============================================================================
-- TRIGGER: Update timestamps
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Apply to all tables with updated_at
CREATE TRIGGER tr_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_teams_updated_at BEFORE UPDATE ON teams FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_team_members_updated_at BEFORE UPDATE ON team_members FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_contacts_updated_at BEFORE UPDATE ON contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_buildings_updated_at BEFORE UPDATE ON buildings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_lots_updated_at BEFORE UPDATE ON lots FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_interventions_updated_at BEFORE UPDATE ON interventions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_contracts_updated_at BEFORE UPDATE ON contracts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### 4.9.2 Denormalization Triggers (Additional)

```sql
-- ============================================================================
-- TRIGGER: Sync team_id on conversation_messages
-- ============================================================================
CREATE OR REPLACE FUNCTION sync_message_team_id()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.team_id := (
    SELECT i.team_id
    FROM conversation_threads ct
    JOIN interventions i ON i.id = ct.intervention_id
    WHERE ct.id = NEW.thread_id
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_conversation_messages_team_id
BEFORE INSERT ON conversation_messages
FOR EACH ROW EXECUTE FUNCTION sync_message_team_id();

-- ============================================================================
-- TRIGGER: Sync team_id on intervention_time_slots
-- ============================================================================
CREATE OR REPLACE FUNCTION sync_time_slot_team_id()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.team_id := (
    SELECT team_id FROM interventions WHERE id = NEW.intervention_id
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_intervention_time_slots_team_id
BEFORE INSERT ON intervention_time_slots
FOR EACH ROW EXECUTE FUNCTION sync_time_slot_team_id();

-- ============================================================================
-- TRIGGER: Sync team_id on intervention_quotes
-- ============================================================================
CREATE OR REPLACE FUNCTION sync_quote_team_id()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.team_id := (
    SELECT team_id FROM interventions WHERE id = NEW.intervention_id
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_intervention_quotes_team_id
BEFORE INSERT ON intervention_quotes
FOR EACH ROW EXECUTE FUNCTION sync_quote_team_id();
```

### 4.9.3 Audit Logging Triggers

```sql
-- ============================================================================
-- FUNCTION: Generic activity logging
-- ============================================================================
CREATE OR REPLACE FUNCTION log_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_team_id UUID;
  v_actor_id UUID;
  v_action_type TEXT;
  v_old_values JSONB;
  v_new_values JSONB;
BEGIN
  -- Determine action type
  v_action_type := LOWER(TG_OP);

  -- Get team_id from the record
  IF TG_OP = 'DELETE' THEN
    v_team_id := OLD.team_id;
    v_old_values := to_jsonb(OLD);
    v_new_values := NULL;
  ELSE
    v_team_id := NEW.team_id;
    v_new_values := to_jsonb(NEW);
    IF TG_OP = 'UPDATE' THEN
      v_old_values := to_jsonb(OLD);
    ELSE
      v_old_values := NULL;
    END IF;
  END IF;

  -- Get actor from session variable (set by application)
  v_actor_id := current_setting('seido.current_user_id', TRUE)::UUID;

  -- Insert activity log
  INSERT INTO activity_logs (
    team_id,
    actor_id,
    action_type,
    entity_type,
    entity_id,
    old_values,
    new_values,
    description,
    created_at
  ) VALUES (
    v_team_id,
    v_actor_id,
    v_action_type,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    v_old_values,
    v_new_values,
    TG_TABLE_NAME || ' ' || v_action_type || 'd',
    NOW()
  );

  RETURN COALESCE(NEW, OLD);
EXCEPTION
  WHEN OTHERS THEN
    -- Don't fail the main operation if logging fails
    RAISE WARNING 'Activity logging failed: %', SQLERRM;
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- ============================================================================
-- AUDIT TRIGGERS: Critical tables
-- ============================================================================

-- Interventions audit (most important for compliance)
CREATE TRIGGER tr_interventions_audit
AFTER INSERT OR UPDATE OR DELETE ON interventions
FOR EACH ROW EXECUTE FUNCTION log_activity();

-- Contracts audit (legal compliance)
CREATE TRIGGER tr_contracts_audit
AFTER INSERT OR UPDATE OR DELETE ON contracts
FOR EACH ROW EXECUTE FUNCTION log_activity();

-- Buildings audit
CREATE TRIGGER tr_buildings_audit
AFTER INSERT OR UPDATE OR DELETE ON buildings
FOR EACH ROW EXECUTE FUNCTION log_activity();

-- Lots audit
CREATE TRIGGER tr_lots_audit
AFTER INSERT OR UPDATE OR DELETE ON lots
FOR EACH ROW EXECUTE FUNCTION log_activity();

-- Team members audit (security)
CREATE TRIGGER tr_team_members_audit
AFTER INSERT OR UPDATE OR DELETE ON team_members
FOR EACH ROW EXECUTE FUNCTION log_activity();
```

### 4.9.4 Status Transition Validation

```sql
-- ============================================================================
-- FUNCTION: Validate intervention status transitions
-- ============================================================================
CREATE OR REPLACE FUNCTION validate_intervention_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  valid_transitions JSONB := '{
    "demande": ["approuvee", "rejetee", "annulee"],
    "approuvee": ["planification", "annulee"],
    "rejetee": [],
    "planification": ["planifiee", "annulee"],
    "planifiee": ["cloturee_par_prestataire", "cloturee_par_gestionnaire", "annulee"],
    "cloturee_par_prestataire": ["cloturee_par_locataire", "cloturee_par_gestionnaire"],
    "cloturee_par_locataire": ["cloturee_par_gestionnaire"],
    "cloturee_par_gestionnaire": [],
    "annulee": []
  }';
  -- NOTE: 9 statuses (removed demande_de_devis, en_cours)
  allowed_statuses JSONB;
BEGIN
  -- Skip if status hasn't changed
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Get allowed transitions from current status
  allowed_statuses := valid_transitions -> OLD.status::TEXT;

  -- Check if new status is in allowed list
  IF NOT (allowed_statuses @> to_jsonb(NEW.status::TEXT)) THEN
    RAISE EXCEPTION 'Invalid status transition from % to %', OLD.status, NEW.status;
  END IF;

  -- Set status change timestamp
  NEW.status_changed_at := NOW();

  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_validate_intervention_status
BEFORE UPDATE OF status ON interventions
FOR EACH ROW EXECUTE FUNCTION validate_intervention_status_transition();

-- ============================================================================
-- FUNCTION: Validate quote status transitions
-- ============================================================================
CREATE OR REPLACE FUNCTION validate_quote_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  valid_transitions JSONB := '{
    "brouillon": ["en_attente", "annule"],
    "en_attente": ["accepte", "refuse", "expire", "annule"],
    "accepte": [],
    "refuse": [],
    "expire": [],
    "annule": []
  }';
  allowed_statuses JSONB;
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  allowed_statuses := valid_transitions -> OLD.status::TEXT;

  IF NOT (allowed_statuses @> to_jsonb(NEW.status::TEXT)) THEN
    RAISE EXCEPTION 'Invalid quote status transition from % to %', OLD.status, NEW.status;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_validate_quote_status
BEFORE UPDATE OF status ON intervention_quotes
FOR EACH ROW EXECUTE FUNCTION validate_quote_status_transition();
```

### 4.9.5 Trigger Statistics Summary

| Trigger | Table | Purpose |
|---------|-------|---------|
| `tr_building_contacts_team_id` | building_contacts | Denormalize team_id |
| `tr_lot_contacts_team_id` | lot_contacts | Denormalize team_id |
| `tr_conversation_messages_team_id` | conversation_messages | Denormalize team_id |
| `tr_intervention_time_slots_team_id` | intervention_time_slots | Denormalize team_id |
| `tr_intervention_quotes_team_id` | intervention_quotes | Denormalize team_id |
| `tr_intervention_reference` | interventions | Auto-generate reference |
| `tr_lots_building_counts` | lots | Update building.total_lots |
| `tr_prevent_team_member_delete` | team_members | Enforce soft delete |
| `tr_*_updated_at` | Multiple (8) | Auto-update timestamps |
| `tr_interventions_audit` | interventions | Activity logging |
| `tr_contracts_audit` | contracts | Activity logging |
| `tr_buildings_audit` | buildings | Activity logging |
| `tr_lots_audit` | lots | Activity logging |
| `tr_team_members_audit` | team_members | Activity logging |
| `tr_validate_intervention_status` | interventions | Status transition validation |
| `tr_validate_quote_status` | intervention_quotes | Status transition validation |

**TOTAL: 20+ triggers**

---

## 4.10 Views for Active Records

```sql
-- ============================================================================
-- VIEW: Active team members with user details
-- ============================================================================
CREATE OR REPLACE VIEW team_members_active AS
SELECT
  tm.id,
  tm.team_id,
  tm.user_id,
  tm.role,
  tm.permissions,
  tm.is_team_owner,
  tm.joined_at,
  u.email,
  u.first_name,
  u.last_name,
  u.role as user_role,
  t.name as team_name
FROM team_members tm
JOIN users u ON u.id = tm.user_id
JOIN teams t ON t.id = tm.team_id
WHERE tm.discarded_at IS NULL
  AND u.discarded_at IS NULL
  AND t.discarded_at IS NULL;

-- ============================================================================
-- VIEW: Active interventions
-- ============================================================================
CREATE OR REPLACE VIEW interventions_active AS
SELECT * FROM interventions WHERE discarded_at IS NULL;

-- ============================================================================
-- VIEW: Active buildings
-- ============================================================================
CREATE OR REPLACE VIEW buildings_active AS
SELECT * FROM buildings WHERE discarded_at IS NULL;

-- ============================================================================
-- VIEW: Active lots
-- ============================================================================
CREATE OR REPLACE VIEW lots_active AS
SELECT * FROM lots WHERE discarded_at IS NULL;

-- ============================================================================
-- VIEW: Active contracts
-- ============================================================================
CREATE OR REPLACE VIEW contracts_active AS
SELECT * FROM contracts WHERE discarded_at IS NULL;
```

---

*End of Section 4 - PostgreSQL Migrations*

---

← Previous: [Data Models](03-data-models.md) | Next: [Authorization](05-authorization.md) →
