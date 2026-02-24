> Part of [SEIDO Rails Architecture](../seido-rails-architecture.md)

---

← Previous: [Tech Stack](02-tech-stack.md) | Next: [Database Migrations](04-database-migrations.md) →

---

# Section 3: Data Models

## 3.1 Overview

SEIDO's database architecture consists of **44 tables** organized into logical phases, reflecting the application's modular growth. Each phase addresses a specific business domain while maintaining referential integrity across the entire system.

### 3.1.1 Table Summary by Phase

| Phase | Domain | Tables | Description |
|-------|--------|--------|-------------|
| **Phase 1** | Users & Teams | 8 | Authentication, multi-tenant isolation, permissions |
| **Phase CRM** | Contacts & Addresses | 3 | Centralized CRM, address normalization, documents |
| **Phase 2** | Properties | 4 | Buildings, lots, property contacts |
| **Phase 3** | Interventions | 8 | Maintenance workflow, quotes, time slots |
| **Phase 3** | Communication | 4 | Real-time chat, notifications, audit |
| **Phase 3** | Email | 3 | Email connections, synchronized messages |
| **Phase 4** | Contracts | 2 | Lease agreements, tenant associations |
| **Phase 4** | Import | 1 | Bulk data import tracking |
| **Billing** | Stripe | 4 | Subscriptions, invoices, webhook events |
| **Phase 3** | Email Links | 1 | Polymorphic email-entity linking |
| | | **44** | |

### 3.1.2 Database Conventions

| Convention | Implementation |
|------------|----------------|
| **Primary Keys** | UUID (`gen_random_uuid()`) |
| **Timestamps** | `created_at`, `updated_at` (Rails standard) |
| **Soft Delete** | `discarded_at`, `discarded_by` (via Discard gem) |
| **Multi-Tenant** | `team_id` foreign key on all business tables |
| **Naming** | `snake_case` for tables and columns |
| **Foreign Keys** | Explicit with `ON DELETE` constraints |

### 3.1.3 Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    SEIDO DATABASE - 44 TABLES                                        │
├─────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                      │
│  ╔══════════════════════════════════════════════════════════════════════════════════════════════╗   │
│  ║                              PHASE 1: USERS & TEAMS (8 tables)                                ║   │
│  ╠══════════════════════════════════════════════════════════════════════════════════════════════╣   │
│  ║                                                                                              ║   │
│  ║   ┌──────────────┐       ┌──────────────┐       ┌──────────────┐                            ║   │
│  ║   │    users     │  1:N  │ team_members │  N:1  │    teams     │                            ║   │
│  ║   │              │◀─────▶│              │◀─────▶│              │                            ║   │
│  ║   │ • auth_id    │       │ • role       │       │ • name       │                            ║   │
│  ║   │ • email      │       │ • permissions│       │ • settings   │                            ║   │
│  ║   │ • role       │       │ • is_owner   │       │ • created_by │                            ║   │
│  ║   └──────────────┘       │ • discarded_at│      └───────┬──────┘                            ║   │
│  ║                          └──────────────┘               │                                   ║   │
│  ║   ┌──────────────┐       ┌──────────────┐               │ 1:1                               ║   │
│  ║   │  companies   │  1:N  │company_members│              ▼                                   ║   │
│  ║   │              │◀─────▶│              │       ┌──────────────┐                            ║   │
│  ║   └──────────────┘       └──────────────┘       │ subscriptions│                            ║   │
│  ║                                                 │   (Stripe)   │                            ║   │
│  ║   ┌──────────────┐       ┌──────────────┐       └──────────────┘                            ║   │
│  ║   │user_invitations│     │  permissions │                                                   ║   │
│  ║   │              │       │   (system)   │       ┌──────────────┐                            ║   │
│  ║   └──────────────┘       └──────────────┘       │role_default_ │                            ║   │
│  ║                                                 │  permissions │                            ║   │
│  ║                                                 └──────────────┘                            ║   │
│  ╚══════════════════════════════════════════════════════════════════════════════════════════════╝   │
│                                                                                                      │
│  ╔══════════════════════════════════════════════════════════════════════════════════════════════╗   │
│  ║                             PHASE CRM: CONTACTS (3 tables)                                    ║   │
│  ╠══════════════════════════════════════════════════════════════════════════════════════════════╣   │
│  ║                                                                                              ║   │
│  ║   ┌─────────────────────────────────────────────────────────────────────────────────────┐   ║   │
│  ║   │                                   contacts                                           │   ║   │
│  ║   │  • contact_type (person|company)    • category (locataire|proprietaire|prestataire) │   ║   │
│  ║   │  • user_id (optional)               • company_id (optional)                         │   ║   │
│  ║   │  • address_id ──▶ addresses         • speciality (for providers)                    │   ║   │
│  ║   └─────────────────────────────────────────────────────────────────────────────────────┘   ║   │
│  ║                                                                                              ║   │
│  ║   ┌──────────────┐                    ┌──────────────────────────────────────────────────┐  ║   │
│  ║   │  addresses   │                    │                   documents                       │  ║   │
│  ║   │ (centralized)│                    │  (polymorphic: building|lot|intervention|contract)│  ║   │
│  ║   │              │                    │                                                   │  ║   │
│  ║   │ • street     │                    │  • entity_type + entity_id                        │  ║   │
│  ║   │ • city       │                    │  • document_type (24 types)                       │  ║   │
│  ║   │ • lat/lng    │                    │  • visibility_level                               │  ║   │
│  ║   └──────────────┘                    └──────────────────────────────────────────────────┘  ║   │
│  ╚══════════════════════════════════════════════════════════════════════════════════════════════╝   │
│                                                                                                      │
│  ╔══════════════════════════════════════════════════════════════════════════════════════════════╗   │
│  ║                             PHASE 2: PROPERTIES (4 tables)                                    ║   │
│  ╠══════════════════════════════════════════════════════════════════════════════════════════════╣   │
│  ║                                                                                              ║   │
│  ║   ┌──────────────────────┐  1:N   ┌──────────────────────┐                                  ║   │
│  ║   │      buildings       │◀──────▶│        lots          │                                  ║   │
│  ║   │                      │        │                      │                                  ║   │
│  ║   │ • address_id ────────┼───────▶│ • building_id (opt)  │                                  ║   │
│  ║   │ • total_lots         │        │ • address_id (stand) │                                  ║   │
│  ║   │ • occupied_lots      │        │ • category           │                                  ║   │
│  ║   └───────────┬──────────┘        └──────────┬───────────┘                                  ║   │
│  ║               │                              │                                              ║   │
│  ║               │ 1:N                          │ 1:N                                          ║   │
│  ║               ▼                              ▼                                              ║   │
│  ║   ┌──────────────────────┐        ┌──────────────────────┐                                  ║   │
│  ║   │  building_contacts   │        │    lot_contacts      │                                  ║   │
│  ║   │                      │        │                      │                                  ║   │
│  ║   │ • contact_id ────────┼───────▶│ • contact_id         │                                  ║   │
│  ║   │ • role (syndic, etc) │        │ • role (locataire)   │                                  ║   │
│  ║   └──────────────────────┘        └──────────────────────┘                                  ║   │
│  ╚══════════════════════════════════════════════════════════════════════════════════════════════╝   │
│                                                                                                      │
│  ╔══════════════════════════════════════════════════════════════════════════════════════════════╗   │
│  ║                            PHASE 3: INTERVENTIONS (8 tables)                                  ║   │
│  ╠══════════════════════════════════════════════════════════════════════════════════════════════╣   │
│  ║                                                                                              ║   │
│  ║                          ┌──────────────────────────────┐                                   ║   │
│  ║                          │        interventions         │                                   ║   │
│  ║                          │                              │                                   ║   │
│  ║                          │ • status (9 states - AASM)   │                                   ║   │
│  ║                          │ • building_id / lot_id       │                                   ║   │
│  ║                          │ • type / urgency             │                                   ║   │
│  ║                          └──────────────┬───────────────┘                                   ║   │
│  ║                                         │                                                   ║   │
│  ║      ┌──────────────┬──────────────┬────┴────┬──────────────┬──────────────┐               ║   │
│  ║      │              │              │         │              │              │               ║   │
│  ║      ▼              ▼              ▼         ▼              ▼              ▼               ║   │
│  ║ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐             ║   │
│  ║ │assignments│ │time_slots│ │  quotes  │ │ comments │ │ reports  │ │  links   │             ║   │
│  ║ │          │ │          │ │          │ │          │ │          │ │          │             ║   │
│  ║ │• user_id │ │• slot_   │ │• provider│ │• content │ │• photos  │ │• linked_ │             ║   │
│  ║ │• role    │ │  date    │ │• amount  │ │• internal│ │• created │ │  interv. │             ║   │
│  ║ └──────────┘ └────┬─────┘ │• status  │ └──────────┘ │  _by     │ └──────────┘             ║   │
│  ║                   │       └──────────┘              └──────────┘                          ║   │
│  ║                   │ 1:N                                                                   ║   │
│  ║                   ▼                                                                       ║   │
│  ║            ┌──────────────┐                                                               ║   │
│  ║            │time_slot_    │                                                               ║   │
│  ║            │  responses   │                                                               ║   │
│  ║            └──────────────┘                                                               ║   │
│  ╚══════════════════════════════════════════════════════════════════════════════════════════════╝   │
│                                                                                                      │
│  ╔══════════════════════════════════════════════════════════════════════════════════════════════╗   │
│  ║                      PHASE 3: COMMUNICATION & AUDIT (7 tables)                                ║   │
│  ╠══════════════════════════════════════════════════════════════════════════════════════════════╣   │
│  ║                                                                                              ║   │
│  ║   ┌──────────────┐  1:N  ┌──────────────┐       ┌──────────────┐                            ║   │
│  ║   │conversation_ │◀─────▶│conversation_ │       │conversation_ │                            ║   │
│  ║   │   threads    │       │   messages   │       │ participants │                            ║   │
│  ║   └──────────────┘       └──────────────┘       └──────────────┘                            ║   │
│  ║                                                                                              ║   │
│  ║   ┌──────────────┐       ┌──────────────┐       ┌──────────────┐       ┌──────────────┐     ║   │
│  ║   │ notifications│       │ activity_logs│       │push_subscript│       │email_blacklist│    ║   │
│  ║   └──────────────┘       └──────────────┘       └──────────────┘       └──────────────┘     ║   │
│  ╚══════════════════════════════════════════════════════════════════════════════════════════════╝   │
│                                                                                                      │
│  ╔══════════════════════════════════════════════════════════════════════════════════════════════╗   │
│  ║                              PHASE 4: CONTRACTS (2 tables)                                    ║   │
│  ╠══════════════════════════════════════════════════════════════════════════════════════════════╣   │
│  ║                                                                                              ║   │
│  ║   ┌──────────────────────────────┐  1:N  ┌──────────────────────────────┐                   ║   │
│  ║   │          contracts           │◀─────▶│      contract_contacts       │                   ║   │
│  ║   │                              │       │                              │                   ║   │
│  ║   │ • lot_id                     │       │ • contact_id                 │                   ║   │
│  ║   │ • type / status              │       │ • role (locataire, garant)   │                   ║   │
│  ║   │ • rent_amount / charges      │       │ • is_primary                 │                   ║   │
│  ║   │ • start_date / end_date      │       │                              │                   ║   │
│  ║   └──────────────────────────────┘       └──────────────────────────────┘                   ║   │
│  ╚══════════════════════════════════════════════════════════════════════════════════════════════╝   │
│                                                                                                      │
│  ╔══════════════════════════════════════════════════════════════════════════════════════════════╗   │
│  ║                               BILLING: STRIPE (4 tables)                                      ║   │
│  ╠══════════════════════════════════════════════════════════════════════════════════════════════╣   │
│  ║                                                                                              ║   │
│  ║   ┌──────────────┐       ┌──────────────┐       ┌──────────────┐       ┌──────────────┐     ║   │
│  ║   │stripe_customers│     │stripe_products│      │ stripe_prices│       │stripe_invoices│    ║   │
│  ║   │              │       │              │       │              │       │              │     ║   │
│  ║   │ team ◀─────▶ │       │ • name       │  1:N  │ • unit_amount│       │ • amount_due │     ║   │
│  ║   │ Stripe cus_  │       │ • description│◀─────▶│ • interval   │       │ • status     │     ║   │
│  ║   └──────────────┘       └──────────────┘       └──────────────┘       └──────────────┘     ║   │
│  ╚══════════════════════════════════════════════════════════════════════════════════════════════╝   │
│                                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3.2 Phase 1: Users & Teams

### 3.2.1 users

Authentication and profile information for users who can log into the application.

**Key Points:**
- Every user **must** have an authentication reference (Devise `auth_user_id` or similar)
- Global `role` determines application-level access
- `primary_team_id` optimizes common team lookups

```ruby
# app/models/user.rb
class User < ApplicationRecord
  # Authentication
  devise :database_authenticatable, :registerable, :recoverable,
         :rememberable, :validatable, :confirmable, :jwt_authenticatable,
         jwt_revocation_strategy: JwtDenylist

  # Associations
  has_many :team_memberships, class_name: 'TeamMember', dependent: :destroy
  has_many :teams, through: :team_memberships
  belongs_to :primary_team, class_name: 'Team', optional: true
  has_one :contact, dependent: :nullify

  # Validations
  validates :email, presence: true, uniqueness: true, format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :role, presence: true, inclusion: { in: %w[admin gestionnaire locataire prestataire proprietaire] }

  # Enums
  enum :role, {
    admin: 'admin',
    gestionnaire: 'gestionnaire',
    locataire: 'locataire',
    prestataire: 'prestataire',
    proprietaire: 'proprietaire'
  }

  # Scopes
  scope :active, -> { kept.where(is_active: true) }
  scope :admins, -> { where(role: :admin) }
  scope :gestionnaires, -> { where(role: [:admin, :gestionnaire]) }

  # Soft delete via Discard
  include Discard::Model
  self.discard_column = :discarded_at

  # Methods
  def full_name
    [first_name, last_name].compact.join(' ').presence || email
  end

  def admin?
    role == 'admin'
  end

  def gestionnaire?
    role.in?(%w[admin gestionnaire])
  end
end
```

**Schema:**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Primary key |
| `email` | VARCHAR(255) | NOT NULL, UNIQUE | User email |
| `encrypted_password` | VARCHAR(255) | NOT NULL | Devise password |
| `first_name` | VARCHAR(255) | | First name |
| `last_name` | VARCHAR(255) | | Last name |
| `phone` | VARCHAR(50) | | Phone number |
| `avatar_url` | TEXT | | Profile picture URL |
| `role` | ENUM | NOT NULL, DEFAULT 'gestionnaire' | Global role |
| `primary_team_id` | UUID | FK → teams | Most frequently used team |
| `is_active` | BOOLEAN | DEFAULT TRUE | Account active status |
| `password_set` | BOOLEAN | DEFAULT FALSE | Has set custom password |
| `last_login_at` | TIMESTAMP | | Last successful login |
| `discarded_at` | TIMESTAMP | | Soft delete timestamp |
| `discarded_by` | UUID | FK → users | Who deleted |
| `created_at` | TIMESTAMP | NOT NULL | |
| `updated_at` | TIMESTAMP | NOT NULL | |

---

### 3.2.2 teams

Multi-tenant isolation unit. All business data is scoped to a team.

```ruby
# app/models/team.rb
class Team < ApplicationRecord
  # Associations
  has_many :team_members, dependent: :destroy
  has_many :users, through: :team_members
  has_one :subscription, dependent: :destroy
  has_one :stripe_customer, dependent: :destroy

  # Business entities
  has_many :buildings, dependent: :destroy
  has_many :lots, dependent: :destroy
  has_many :contacts, dependent: :destroy
  has_many :interventions, dependent: :destroy
  has_many :contracts, dependent: :destroy

  belongs_to :creator, class_name: 'User', foreign_key: :created_by, optional: true

  # Validations
  validates :name, presence: true, length: { minimum: 2, maximum: 255 }

  # Soft delete
  include Discard::Model

  # Settings stored as JSONB
  store_accessor :settings, :default_language, :timezone, :notification_preferences
end
```

**Schema:**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Primary key |
| `name` | VARCHAR(255) | NOT NULL | Team/agency name |
| `description` | TEXT | | Team description |
| `settings` | JSONB | DEFAULT '{}' | Configuration JSON |
| `created_by` | UUID | FK → users | Team creator |
| `discarded_at` | TIMESTAMP | | Soft delete |
| `discarded_by` | UUID | FK → users | |
| `created_at` | TIMESTAMP | NOT NULL | |
| `updated_at` | TIMESTAMP | NOT NULL | |

---

### 3.2.3 team_members

Junction table with role-based permissions. **Uses soft delete via `discarded_at`** instead of physical deletion to maintain audit history.

```ruby
# app/models/team_member.rb
class TeamMember < ApplicationRecord
  # Associations
  belongs_to :team
  belongs_to :user
  belongs_to :deactivated_by, class_name: 'User', foreign_key: :discarded_by, optional: true

  # Validations
  validates :role, presence: true
  validates :user_id, uniqueness: { scope: :team_id, message: 'already a member of this team' }

  # Enum
  enum :role, {
    admin: 'admin',
    gestionnaire: 'gestionnaire',
    locataire: 'locataire',
    prestataire: 'prestataire',
    proprietaire: 'proprietaire'
  }

  # Soft delete
  include Discard::Model

  # Scopes
  scope :active, -> { kept }
  scope :owners, -> { where(is_team_owner: true) }
  scope :managers, -> { where(role: [:admin, :gestionnaire]) }
  scope :with_permission, ->(perm) { where("? = ANY(permissions)", perm) }

  # Custom soft delete with metadata
  def deactivate!(by:, reason: nil)
    update!(
      discarded_at: Time.current,
      discarded_by: by.id,
      deactivation_reason: reason
    )
  end

  # Check if has specific permission
  def has_permission?(permission_code)
    return true if is_team_owner?
    return permissions.include?(permission_code) if permissions.present?

    # Fall back to role defaults
    RoleDefaultPermission.where(role: role)
                         .joins(:permission)
                         .exists?(permissions: { code: permission_code })
  end
end
```

**Schema:**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Primary key |
| `team_id` | UUID | NOT NULL, FK → teams | Team reference |
| `user_id` | UUID | NOT NULL, FK → users | User reference |
| `role` | ENUM | NOT NULL, DEFAULT 'gestionnaire' | Role in team |
| `permissions` | TEXT[] | | Custom permission overrides |
| `is_team_owner` | BOOLEAN | DEFAULT FALSE | Creator flag (all permissions) |
| `joined_at` | TIMESTAMP | DEFAULT NOW() | Join date |
| `discarded_at` | TIMESTAMP | | Deactivation timestamp |
| `discarded_by` | UUID | FK → users | Who deactivated |
| `deactivation_reason` | TEXT | | Why deactivated |

**Unique Constraint:** `(team_id, user_id)`

---

### 3.2.4 user_invitations

Pending invitations to join a team. Supports pre-populating user information.

```ruby
# app/models/user_invitation.rb
class UserInvitation < ApplicationRecord
  # Associations
  belongs_to :team
  belongs_to :invited_by, class_name: 'User'
  belongs_to :contact, optional: true
  belongs_to :user, optional: true  # Set after acceptance

  # Validations
  validates :email, presence: true, format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :role, presence: true
  validates :email, uniqueness: { scope: :team_id, conditions: -> { where(status: :pending) } }

  # Enums
  enum :status, {
    pending: 'pending',
    accepted: 'accepted',
    expired: 'expired',
    cancelled: 'cancelled'
  }

  enum :role, {
    admin: 'admin',
    gestionnaire: 'gestionnaire',
    locataire: 'locataire',
    prestataire: 'prestataire',
    proprietaire: 'proprietaire'
  }

  # Scopes
  scope :active, -> { pending.where('expires_at > ?', Time.current) }

  # Callbacks
  before_create :generate_token
  before_create :set_expiration

  # Methods
  def expired?
    expires_at < Time.current
  end

  def accept!(user)
    transaction do
      update!(status: :accepted, accepted_at: Time.current, user: user)
      team.team_members.create!(user: user, role: role)
    end
  end

  private

  def generate_token
    self.invitation_token = SecureRandom.urlsafe_base64(32)
  end

  def set_expiration
    self.expires_at ||= 7.days.from_now
  end
end
```

**Schema:**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Primary key |
| `email` | VARCHAR(255) | NOT NULL | Invitee email |
| `team_id` | UUID | NOT NULL, FK → teams | Target team |
| `invited_by` | UUID | NOT NULL, FK → users | Who sent invitation |
| `contact_id` | UUID | FK → contacts | Associated contact |
| `user_id` | UUID | FK → users | Created user (post-accept) |
| `role` | ENUM | NOT NULL | Assigned role |
| `first_name` | VARCHAR(255) | | Pre-fill first name |
| `last_name` | VARCHAR(255) | | Pre-fill last name |
| `invitation_token` | VARCHAR(255) | | Secure token |
| `status` | ENUM | DEFAULT 'pending' | Invitation state |
| `provider_category` | VARCHAR(50) | | If prestataire |
| `expires_at` | TIMESTAMP | | Token expiration |
| `accepted_at` | TIMESTAMP | | When accepted |
| `created_at` | TIMESTAMP | NOT NULL | |

---

### 3.2.5 companies

Service provider companies (prestataires, syndics, etc.).

```ruby
# app/models/company.rb
class Company < ApplicationRecord
  acts_as_tenant(:team)

  # Associations
  belongs_to :team
  belongs_to :address, optional: true
  has_many :company_members, dependent: :destroy
  has_many :contacts, through: :company_members

  # Validations
  validates :name, presence: true

  # Soft delete
  include Discard::Model

  # Scopes
  scope :with_vat, -> { where.not(vat_number: nil) }
end
```

---

### 3.2.6 company_members

Links contacts to companies with their role.

```ruby
# app/models/company_member.rb
class CompanyMember < ApplicationRecord
  belongs_to :company
  belongs_to :contact

  validates :contact_id, uniqueness: { scope: :company_id }

  scope :primary, -> { where(is_primary: true) }
end
```

---

### 3.2.7 permissions

System table defining all available permissions.

```ruby
# app/models/permission.rb
class Permission < ApplicationRecord
  has_many :role_default_permissions, dependent: :destroy

  validates :code, presence: true, uniqueness: true
  validates :name, presence: true
  validates :category, presence: true

  # Categories: team, properties, contracts, interventions, contacts, reports, billing
  scope :by_category, ->(cat) { where(category: cat).order(:sort_order) }
  scope :admin_only, -> { where(is_admin_only: true) }
end
```

**28 Permissions in 7 categories:**
- **team** (6): view, manage, managers_invite, managers_manage, members_invite, members_manage
- **properties** (4): view, create, manage, documents
- **contracts** (3): view, create, manage
- **interventions** (4): view, create, manage, close
- **contacts** (3): view, create, manage
- **reports** (3): view, export, analytics
- **billing** (5): subscription_view, subscription_manage, invoices_view, invoices_download, payment_method

---

### 3.2.8 role_default_permissions

Default permissions for each role. Custom overrides in `team_members.permissions[]`.

```ruby
# app/models/role_default_permission.rb
class RoleDefaultPermission < ApplicationRecord
  belongs_to :permission

  validates :role, presence: true
  validates :permission_id, uniqueness: { scope: :role }

  enum :role, {
    admin: 'admin',
    gestionnaire: 'gestionnaire',
    locataire: 'locataire',
    prestataire: 'prestataire',
    proprietaire: 'proprietaire'
  }
end
```

---

## 3.3 Phase CRM: Contacts & Addresses

### 3.3.1 contacts

Unified CRM table for all people and companies. Can optionally link to a `user` if they have app access.

```ruby
# app/models/contact.rb
class Contact < ApplicationRecord
  acts_as_tenant(:team)

  # Associations
  belongs_to :team
  belongs_to :user, optional: true  # If invited to app
  belongs_to :company, optional: true
  belongs_to :address, optional: true
  belongs_to :creator, class_name: 'User', foreign_key: :created_by, optional: true

  has_many :building_contacts, dependent: :destroy
  has_many :buildings, through: :building_contacts
  has_many :lot_contacts, dependent: :destroy
  has_many :lots, through: :lot_contacts
  has_many :contract_contacts, dependent: :destroy
  has_many :contracts, through: :contract_contacts
  has_many :company_memberships, class_name: 'CompanyMember', dependent: :destroy

  # Validations
  validates :contact_type, presence: true
  validate :valid_contact_type_data

  # Enums
  enum :contact_type, { person: 'person', company: 'company' }

  enum :category, {
    locataire: 'locataire',
    proprietaire: 'proprietaire',
    prestataire: 'prestataire',
    syndic: 'syndic',
    assurance: 'assurance',
    notaire: 'notaire',
    banque: 'banque',
    administration: 'administration',
    autre: 'autre'
  }

  # For providers
  enum :speciality, {
    plomberie: 'plomberie',
    electricite: 'electricite',
    chauffage: 'chauffage',
    serrurerie: 'serrurerie',
    peinture: 'peinture',
    menage: 'menage',
    jardinage: 'jardinage',
    climatisation: 'climatisation',
    vitrerie: 'vitrerie',
    toiture: 'toiture',
    autre: 'autre'
  }, _prefix: true

  # Soft delete
  include Discard::Model

  # Scopes
  scope :people, -> { where(contact_type: :person) }
  scope :companies, -> { where(contact_type: :company) }
  scope :providers, -> { where(category: :prestataire) }
  scope :tenants, -> { where(category: :locataire) }
  scope :with_user, -> { where.not(user_id: nil) }

  # Callbacks
  before_validation :compute_display_name

  # Methods
  def invited_to_app?
    user_id.present?
  end

  private

  def valid_contact_type_data
    if person? && first_name.blank? && last_name.blank?
      errors.add(:base, 'Person must have first name or last name')
    elsif company? && company_name.blank?
      errors.add(:company_name, 'required for company contacts')
    end
  end

  def compute_display_name
    self.display_name = if person?
                          [first_name, last_name].compact.join(' ')
                        else
                          company_name
                        end
  end
end
```

**Schema:**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | |
| `team_id` | UUID | NOT NULL, FK → teams | Multi-tenant |
| `contact_type` | ENUM | NOT NULL | 'person' or 'company' |
| `email` | VARCHAR(255) | | Contact email |
| `first_name` | VARCHAR(255) | | Person first name |
| `last_name` | VARCHAR(255) | | Person last name |
| `display_name` | VARCHAR(255) | | Computed display name |
| `phone` | VARCHAR(50) | | Primary phone |
| `mobile_phone` | VARCHAR(50) | | Mobile phone |
| `company_name` | VARCHAR(255) | | If contact_type='company' |
| `vat_number` | VARCHAR(50) | | VAT number |
| `address_id` | UUID | FK → addresses | Contact address |
| `company_id` | UUID | FK → companies | Employer (if person) |
| `user_id` | UUID | FK → users | If has app access |
| `category` | ENUM | NOT NULL | Contact category |
| `speciality` | ENUM | | Provider specialty |
| `provider_rating` | DECIMAL(3,2) | DEFAULT 0 | Average rating |
| `total_interventions` | INTEGER | DEFAULT 0 | Counter cache |
| `notes` | TEXT | | Internal notes |
| `is_active` | BOOLEAN | DEFAULT TRUE | |
| `source` | VARCHAR(50) | | 'manual', 'import', 'api' |
| `created_by` | UUID | FK → users | |
| `discarded_at` | TIMESTAMP | | Soft delete |

**Unique Constraint:** `(team_id, email)` WHERE email IS NOT NULL

---

### 3.3.2 addresses

Centralized address storage shared by buildings, lots (standalone), contacts, and companies.

```ruby
# app/models/address.rb
class Address < ApplicationRecord
  acts_as_tenant(:team)

  # Associations
  belongs_to :team
  has_many :buildings, dependent: :nullify
  has_many :lots, dependent: :nullify
  has_many :contacts, dependent: :nullify
  has_many :companies, dependent: :nullify

  # Validations
  validates :street_line_1, presence: true
  validates :postal_code, presence: true
  validates :city, presence: true
  validates :country, presence: true

  # Enum
  enum :country, {
    belgique: 'belgique',
    france: 'france',
    allemagne: 'allemagne',
    pays_bas: 'pays-bas',
    suisse: 'suisse',
    luxembourg: 'luxembourg',
    autre: 'autre'
  }

  # Full address helper
  def full_address
    [
      street_line_1,
      street_line_2,
      [postal_code, city].compact.join(' '),
      country.humanize
    ].compact.join(', ')
  end

  # Geocoding (if using geocoder gem)
  geocoded_by :full_address
  after_validation :geocode, if: ->(a) { a.needs_geocoding? }

  def needs_geocoding?
    !is_geocoded && (street_line_1_changed? || city_changed? || postal_code_changed?)
  end
end
```

---

### 3.3.3 documents

Centralized polymorphic document storage. **Replaces** deprecated `property_documents`, `intervention_documents`, `contract_documents`.

```ruby
# app/models/document.rb
class Document < ApplicationRecord
  acts_as_tenant(:team)

  # Polymorphic association via entity_type + entity_id
  # (Not using Rails polymorphic because of explicit type enum)
  belongs_to :team
  belongs_to :uploader, class_name: 'User', foreign_key: :uploaded_by
  belongs_to :validator, class_name: 'User', foreign_key: :validated_by, optional: true
  belongs_to :conversation_message, foreign_key: :message_id, optional: true

  # File attachment (ActiveStorage)
  has_one_attached :file

  # Validations
  validates :entity_type, presence: true
  validates :entity_id, presence: true
  validates :document_type, presence: true
  validates :filename, presence: true
  validates :original_filename, presence: true
  validates :file_size, presence: true, numericality: { greater_than: 0 }
  validates :mime_type, presence: true
  validates :storage_path, presence: true
  validate :valid_validation_state

  # Enums
  enum :entity_type, {
    building: 'building',
    lot: 'lot',
    intervention: 'intervention',
    contract: 'contract',
    contact: 'contact',
    company: 'company'
  }, _prefix: :for

  enum :document_type, {
    # Contracts
    bail: 'bail',
    avenant: 'avenant',
    etat_des_lieux_entree: 'etat_des_lieux_entree',
    etat_des_lieux_sortie: 'etat_des_lieux_sortie',
    reglement_copropriete: 'reglement_copropriete',
    # Financial
    facture: 'facture',
    devis: 'devis',
    quittance: 'quittance',
    bon_de_commande: 'bon_de_commande',
    # Technical
    diagnostic: 'diagnostic',
    plan: 'plan',
    certificat: 'certificat',
    garantie: 'garantie',
    manuel_utilisation: 'manuel_utilisation',
    rapport: 'rapport',
    # Administrative
    justificatif_identite: 'justificatif_identite',
    justificatif_revenus: 'justificatif_revenus',
    attestation_assurance: 'attestation_assurance',
    caution_bancaire: 'caution_bancaire',
    # Photos
    photo_avant: 'photo_avant',
    photo_apres: 'photo_apres',
    photo_compteur: 'photo_compteur',
    photo_generale: 'photo_generale',
    # Other
    autre: 'autre'
  }

  enum :visibility_level, {
    prive: 'prive',          # Only uploader
    equipe: 'equipe',        # Team managers
    locataire: 'locataire',  # Tenant can view
    prestataire: 'prestataire', # Provider can view
    public: 'public'         # All participants
  }

  # Soft delete
  include Discard::Model

  # Scopes
  scope :for_entity, ->(type, id) { where(entity_type: type, entity_id: id) }
  scope :visible_to_tenant, -> { where(visibility_level: [:locataire, :public]) }
  scope :visible_to_provider, -> { where(visibility_level: [:prestataire, :public]) }
  scope :expiring_soon, -> { where('expiry_date <= ?', 30.days.from_now) }
  scope :archived, -> { where(is_archived: true) }
  scope :active, -> { kept.where(is_archived: false) }

  # Dynamic entity association
  def entity
    case entity_type
    when 'building' then Building.find_by(id: entity_id)
    when 'lot' then Lot.find_by(id: entity_id)
    when 'intervention' then Intervention.find_by(id: entity_id)
    when 'contract' then Contract.find_by(id: entity_id)
    when 'contact' then Contact.find_by(id: entity_id)
    when 'company' then Company.find_by(id: entity_id)
    end
  end

  private

  def valid_validation_state
    if is_validated?
      errors.add(:validated_by, "required when validated") if validated_by.blank?
      errors.add(:validated_at, "required when validated") if validated_at.blank?
    else
      errors.add(:validated_by, "must be blank when not validated") if validated_by.present?
      errors.add(:validated_at, "must be blank when not validated") if validated_at.present?
    end
  end
end
```

---

## 3.4 Phase 2: Properties

### 3.4.1 buildings

Real estate properties that can contain multiple lots.

```ruby
# app/models/building.rb
class Building < ApplicationRecord
  acts_as_tenant(:team)

  # Associations
  belongs_to :team
  belongs_to :address
  has_many :lots, dependent: :nullify
  has_many :interventions, dependent: :destroy
  has_many :building_contacts, dependent: :destroy
  has_many :contacts, through: :building_contacts
  has_many :documents, ->(b) { where(entity_type: 'building') },
           foreign_key: :entity_id, dependent: :destroy

  # Validations
  validates :name, presence: true
  validates :address, presence: true
  validate :lots_count_consistency

  # Soft delete
  include Discard::Model

  # Counter caches (maintained by triggers)
  # total_lots, occupied_lots, vacant_lots, total_interventions, active_interventions

  # Scopes
  scope :with_active_interventions, -> { where('active_interventions > 0') }
  scope :with_vacancies, -> { where('vacant_lots > 0') }

  # Callbacks
  after_create :create_default_conversation_threads

  private

  def lots_count_consistency
    if total_lots != (occupied_lots.to_i + vacant_lots.to_i)
      errors.add(:base, 'Lots count mismatch')
    end
  end
end
```

---

### 3.4.2 lots

Individual units (apartments, parking, commercial). Can be **standalone** (no building) or part of a building.

```ruby
# app/models/lot.rb
class Lot < ApplicationRecord
  acts_as_tenant(:team)

  # Associations
  belongs_to :team
  belongs_to :building, optional: true  # nil = standalone
  belongs_to :address, optional: true   # For standalone lots
  has_many :interventions, dependent: :destroy
  has_many :contracts, dependent: :restrict_with_error
  has_many :lot_contacts, dependent: :destroy
  has_many :contacts, through: :lot_contacts
  has_many :documents, ->(l) { where(entity_type: 'lot') },
           foreign_key: :entity_id, dependent: :destroy

  # Validations
  validates :reference, presence: true, uniqueness: { scope: :team_id }
  validates :category, presence: true
  validates :floor, numericality: { greater_than_or_equal_to: -5, less_than_or_equal_to: 100 }, allow_nil: true
  validate :address_or_building_required

  # Enum
  enum :category, {
    appartement: 'appartement',
    collocation: 'collocation',
    maison: 'maison',
    garage: 'garage',
    local_commercial: 'local_commercial',
    parking: 'parking',
    autre: 'autre'
  }

  # Soft delete
  include Discard::Model

  # Scopes
  scope :standalone, -> { where(building_id: nil) }
  scope :in_building, -> { where.not(building_id: nil) }
  scope :apartments, -> { where(category: [:appartement, :collocation, :maison]) }

  # Methods
  def standalone?
    building_id.nil?
  end

  def effective_address
    standalone? ? address : building&.address
  end

  def current_tenant
    contracts.active.includes(:contract_contacts)
             .flat_map { |c| c.contract_contacts.where(role: :locataire) }
             .first&.contact
  end

  private

  def address_or_building_required
    if standalone? && address.nil?
      errors.add(:address, 'required for standalone lots')
    end
  end
end
```

---

### 3.4.3 building_contacts

Junction table linking contacts to buildings with their role.

```ruby
# app/models/building_contact.rb
class BuildingContact < ApplicationRecord
  # team_id is denormalized for RLS performance
  belongs_to :building
  belongs_to :contact

  validates :contact_id, uniqueness: { scope: :building_id }

  scope :primary, -> { where(is_primary: true) }
  scope :syndics, -> { where(role: 'syndic') }
  scope :owners, -> { where(role: 'proprietaire') }

  # Auto-populate team_id from building
  before_validation :set_team_id

  private

  def set_team_id
    self.team_id ||= building&.team_id
  end
end
```

---

### 3.4.4 lot_contacts

Junction table linking contacts to lots with their role (owner, guardian, etc.).

```ruby
# app/models/lot_contact.rb
class LotContact < ApplicationRecord
  belongs_to :lot
  belongs_to :contact

  validates :contact_id, uniqueness: { scope: :lot_id }

  scope :primary, -> { where(is_primary: true) }
  scope :tenants, -> { where(role: 'locataire') }
  scope :owners, -> { where(role: 'proprietaire') }

  before_validation :set_team_id

  private

  def set_team_id
    self.team_id ||= lot&.team_id
  end
end
```

---

## 3.5 Phase 3: Interventions

### 3.5.1 interventions

The heart of SEIDO - maintenance request workflow with 11-state machine.

```ruby
# app/models/intervention.rb
class Intervention < ApplicationRecord
  include AASM
  acts_as_tenant(:team)

  # Associations
  belongs_to :team
  belongs_to :building, optional: true
  belongs_to :lot, optional: true
  belongs_to :tenant_contact, class_name: 'Contact', optional: true
  belongs_to :creator, class_name: 'User', foreign_key: :created_by, optional: true

  has_many :assignments, class_name: 'InterventionAssignment', dependent: :destroy
  has_many :assigned_users, through: :assignments, source: :user
  has_many :time_slots, class_name: 'InterventionTimeSlot', dependent: :destroy
  has_many :quotes, class_name: 'InterventionQuote', dependent: :destroy
  has_many :comments, class_name: 'InterventionComment', dependent: :destroy
  has_many :reports, class_name: 'InterventionReport', dependent: :destroy
  has_many :links, class_name: 'InterventionLink', foreign_key: :intervention_id, dependent: :destroy
  has_one :conversation_thread, dependent: :destroy
  has_many :documents, ->(i) { where(entity_type: 'intervention') },
           foreign_key: :entity_id, dependent: :destroy

  # Validations
  validates :title, presence: true, length: { minimum: 5, maximum: 255 }
  validates :type, presence: true
  validates :urgency, presence: true
  validate :property_required

  # Enums
  enum :type, {
    plomberie: 'plomberie',
    electricite: 'electricite',
    chauffage: 'chauffage',
    serrurerie: 'serrurerie',
    peinture: 'peinture',
    menage: 'menage',
    jardinage: 'jardinage',
    climatisation: 'climatisation',
    vitrerie: 'vitrerie',
    toiture: 'toiture',
    autre: 'autre'
  }, _prefix: true

  enum :urgency, {
    basse: 'basse',
    normale: 'normale',
    haute: 'haute',
    urgente: 'urgente'
  }

  # ═══════════════════════════════════════════════════════════════════════════
  # AASM STATE MACHINE (9 states)
  # NOTE: Quotes managed via intervention_quotes table (requires_quote flag)
  # ═══════════════════════════════════════════════════════════════════════════
  aasm column: :status, enum: true, whiny_persistence: true do
    state :demande, initial: true
    state :rejetee
    state :approuvee
    state :planification
    state :planifiee
    state :cloturee_par_prestataire
    state :cloturee_par_locataire
    state :cloturee_par_gestionnaire
    state :annulee

    # Manager approves request
    event :approve do
      transitions from: :demande, to: :approuvee
      after do
        notify_participants(:approved)
      end
    end

    # Manager rejects request
    event :reject, after: :notify_rejection do
      transitions from: :demande, to: :rejetee
    end

    # Move to scheduling phase (quote handling is done separately)
    event :start_scheduling do
      transitions from: :approuvee, to: :planification
    end

    # Time slot selected, intervention scheduled
    event :schedule do
      transitions from: :planification, to: :planifiee
      after do |scheduled_date|
        update!(scheduled_date: scheduled_date)
        notify_participants(:scheduled)
      end
    end

    # Provider marks complete (direct from planifiee)
    event :complete_by_provider do
      transitions from: :planifiee, to: :cloturee_par_prestataire
      after { notify_tenant(:provider_completed) }
    end

    # Tenant validates quality
    event :validate_by_tenant do
      transitions from: :cloturee_par_prestataire, to: :cloturee_par_locataire
      after { notify_managers(:tenant_validated) }
    end

    # Manager finalizes (can skip tenant validation)
    event :finalize do
      transitions from: [:cloturee_par_prestataire, :cloturee_par_locataire], to: :cloturee_par_gestionnaire
      after do
        update!(completed_date: Time.current)
        notify_all(:completed)
      end
    end

    # Manager can also close directly from planifiee
    event :close_by_manager do
      transitions from: :planifiee, to: :cloturee_par_gestionnaire
      after do
        update!(completed_date: Time.current)
        notify_all(:completed)
      end
    end

    # Cancel (from any active state)
    event :cancel do
      transitions from: [
        :demande, :approuvee, :planification,
        :planifiee, :cloturee_par_prestataire, :cloturee_par_locataire
      ], to: :annulee
      after { notify_all(:cancelled) }
    end
  end

  # Soft delete
  include Discard::Model

  # Scopes
  scope :active, -> { where.not(status: [:rejetee, :cloturee_par_gestionnaire, :annulee]) }
  scope :pending, -> { where(status: :demande) }
  scope :urgent, -> { where(urgency: [:haute, :urgente]) }
  scope :for_building, ->(building_id) { where(building_id: building_id) }
  scope :for_lot, ->(lot_id) { where(lot_id: lot_id) }

  # Callbacks
  before_create :generate_reference
  after_create :create_conversation_thread

  # Methods
  def assigned_providers
    assignments.where(role: :prestataire).includes(:user).map(&:user)
  end

  def assigned_managers
    assignments.where(role: :gestionnaire).includes(:user).map(&:user)
  end

  def selected_quote
    quotes.accepted.first
  end

  def property
    lot || building
  end

  private

  def property_required
    errors.add(:base, 'Building or lot required') if building_id.nil? && lot_id.nil?
  end

  def generate_reference
    date_part = Date.current.strftime('%Y%m%d')
    sequence = Intervention.where('reference LIKE ?', "INT-#{date_part}-%").count + 1
    self.reference = "INT-#{date_part}-#{sequence.to_s.rjust(3, '0')}"
  end

  def create_conversation_thread
    ConversationThread.create!(
      intervention: self,
      team_id: team_id,
      created_by: creator,
      thread_type: :group
    )
  end

  def notify_participants(event)
    InterventionNotifier.call(self, event)
  end
  alias notify_providers notify_participants
  alias notify_tenant notify_participants
  alias notify_managers notify_participants
  alias notify_all notify_participants
  alias notify_rejection notify_participants
end
```

---

### 3.5.2 intervention_assignments

Who is assigned to work on an intervention.

```ruby
# app/models/intervention_assignment.rb
class InterventionAssignment < ApplicationRecord
  belongs_to :intervention
  belongs_to :user
  belongs_to :assigner, class_name: 'User', foreign_key: :assigned_by, optional: true

  validates :role, presence: true
  validates :user_id, uniqueness: { scope: [:intervention_id, :role] }

  enum :role, {
    gestionnaire: 'gestionnaire',
    prestataire: 'prestataire'
  }

  scope :managers, -> { where(role: :gestionnaire) }
  scope :providers, -> { where(role: :prestataire) }
  scope :primary, -> { where(is_primary: true) }
  scope :pending_notification, -> { where(notified: false) }
end
```

---

### 3.5.3 intervention_time_slots

Proposed time windows for scheduling.

```ruby
# app/models/intervention_time_slot.rb
class InterventionTimeSlot < ApplicationRecord
  belongs_to :intervention
  belongs_to :proposer, class_name: 'User', foreign_key: :proposed_by

  has_many :responses, class_name: 'TimeSlotResponse', dependent: :destroy

  validates :slot_date, presence: true
  validates :start_time, presence: true
  validates :end_time, presence: true
  validate :end_after_start
  validates :intervention_id, uniqueness: { scope: [:slot_date, :start_time, :end_time] }

  enum :status, {
    pending: 'pending',
    selected: 'selected',
    rejected: 'rejected',
    cancelled: 'cancelled'
  }

  scope :available, -> { where(status: :pending) }
  scope :upcoming, -> { where('slot_date >= ?', Date.current) }

  before_validation :set_team_id

  def select!
    transaction do
      update!(status: :selected, is_selected: true)
      intervention.time_slots.where.not(id: id).update_all(status: :rejected)
      intervention.schedule!(datetime)
    end
  end

  def datetime
    Time.zone.parse("#{slot_date} #{start_time}")
  end

  private

  def end_after_start
    return unless start_time && end_time
    errors.add(:end_time, 'must be after start time') if end_time <= start_time
  end

  def set_team_id
    self.team_id ||= intervention&.team_id
  end
end
```

---

### 3.5.4 time_slot_responses

User responses to proposed time slots.

```ruby
# app/models/time_slot_response.rb
class TimeSlotResponse < ApplicationRecord
  belongs_to :time_slot, class_name: 'InterventionTimeSlot'
  belongs_to :user

  validates :user_id, uniqueness: { scope: :time_slot_id }

  enum :response, {
    pending: 'pending',
    available: 'available',
    unavailable: 'unavailable',
    maybe: 'maybe'
  }
end
```

---

### 3.5.5 intervention_quotes

Provider quotes/estimates for interventions.

```ruby
# app/models/intervention_quote.rb
class InterventionQuote < ApplicationRecord
  belongs_to :intervention
  belongs_to :provider, class_name: 'User'
  belongs_to :creator, class_name: 'User', foreign_key: :created_by, optional: true
  belongs_to :validator, class_name: 'User', foreign_key: :validated_by, optional: true

  validates :amount, presence: true, numericality: { greater_than: 0 }
  validates :provider_id, presence: true

  enum :status, {
    draft: 'draft',
    sent: 'sent',
    accepted: 'accepted',
    rejected: 'rejected',
    cancelled: 'cancelled',
    expired: 'expired'
  }

  # Soft delete
  include Discard::Model

  # Scopes
  scope :active, -> { kept.where.not(status: [:cancelled, :expired]) }
  scope :pending, -> { where(status: [:draft, :sent]) }

  # Line items stored as JSONB
  # Format: [{ description: '', quantity: 1, unit: 'h', unit_price: 50, total: 50 }]

  def accept!(by:)
    transaction do
      update!(status: :accepted, validated_by: by.id, validated_at: Time.current)
      intervention.quotes.where.not(id: id).pending.update_all(status: :rejected)
    end
  end

  def reject!(by:, reason: nil)
    update!(status: :rejected, validated_by: by.id, validated_at: Time.current, rejection_reason: reason)
  end

  def expired?
    valid_until.present? && valid_until < Date.current
  end
end
```

---

### 3.5.6 intervention_comments

Discussion thread on interventions.

```ruby
# app/models/intervention_comment.rb
class InterventionComment < ApplicationRecord
  belongs_to :intervention
  belongs_to :user

  validates :content, presence: true

  scope :internal, -> { where(is_internal: true) }
  scope :public_visible, -> { where(is_internal: false) }
  scope :recent, -> { order(created_at: :desc) }
end
```

---

### 3.5.7 intervention_reports

Completion reports with photos.

```ruby
# app/models/intervention_report.rb
class InterventionReport < ApplicationRecord
  belongs_to :intervention
  belongs_to :creator, class_name: 'User', foreign_key: :created_by

  validates :content, presence: true

  # Photos stored as JSONB array of URLs
  # photos: ['url1', 'url2']
end
```

---

### 3.5.8 intervention_links

Links between related interventions.

```ruby
# app/models/intervention_link.rb
class InterventionLink < ApplicationRecord
  belongs_to :intervention
  belongs_to :linked_intervention, class_name: 'Intervention'

  validates :linked_intervention_id, uniqueness: { scope: :intervention_id }

  enum :link_type, {
    related: 'related',
    duplicate: 'duplicate',
    follow_up: 'follow_up',
    parent: 'parent'
  }
end
```

---

## 3.6 Phase 3: Communication

### 3.6.1 conversation_threads

Chat threads linked to interventions.

```ruby
# app/models/conversation_thread.rb
class ConversationThread < ApplicationRecord
  belongs_to :intervention
  belongs_to :creator, class_name: 'User', foreign_key: :created_by

  has_many :messages, class_name: 'ConversationMessage', dependent: :destroy
  has_many :participants, class_name: 'ConversationParticipant', dependent: :destroy

  validates :intervention_id, uniqueness: { scope: :thread_type }

  # 6 thread types (updated 2026-02-02)
  enum :thread_type, {
    group: 'group',                           # All participants
    tenant_to_managers: 'tenant_to_managers', # Private: tenant ↔ managers
    provider_to_managers: 'provider_to_managers', # Private: provider ↔ managers
    email_internal: 'email_internal',         # Email thread sync
    tenants_group: 'tenants_group',           # Multiple tenants group
    providers_group: 'providers_group'        # Multiple providers group
  }

  # Counter cache for messages
  def update_message_count!
    update_columns(
      message_count: messages.count,
      last_message_at: messages.maximum(:created_at)
    )
  end
end
```

---

### 3.6.2 conversation_messages

Individual messages in threads.

```ruby
# app/models/conversation_message.rb
class ConversationMessage < ApplicationRecord
  belongs_to :thread, class_name: 'ConversationThread'
  belongs_to :sender, class_name: 'User', foreign_key: :user_id, optional: true

  has_many :documents, foreign_key: :message_id, dependent: :nullify

  validates :content, presence: true

  # Soft delete
  include Discard::Model

  # Metadata: { mentions: ['user_id'], reactions: { '👍': ['user_id'] }, attachments: [...] }

  after_create :update_thread_stats
  after_create :broadcast_to_participants

  private

  def update_thread_stats
    thread.update_message_count!
  end

  def broadcast_to_participants
    ConversationChannel.broadcast_to(thread, message: self.as_json)
  end
end
```

---

### 3.6.3 conversation_participants

Who can see a thread and read tracking.

```ruby
# app/models/conversation_participant.rb
class ConversationParticipant < ApplicationRecord
  belongs_to :thread, class_name: 'ConversationThread'
  belongs_to :user
  belongs_to :last_read_message, class_name: 'ConversationMessage', optional: true

  validates :user_id, uniqueness: { scope: :thread_id }

  def mark_as_read!(message)
    update!(last_read_message: message, last_read_at: Time.current)
  end

  def unread_count
    return 0 unless last_read_message_id
    thread.messages.where('id > ?', last_read_message_id).count
  end
end
```

---

### 3.6.4 notifications

In-app notifications with real-time push support.

```ruby
# app/models/notification.rb
class Notification < ApplicationRecord
  belongs_to :user
  belongs_to :team, optional: true
  belongs_to :creator, class_name: 'User', foreign_key: :created_by, optional: true

  validates :title, presence: true
  validates :message, presence: true
  validates :type, presence: true

  enum :type, {
    intervention: 'intervention',
    chat: 'chat',
    document: 'document',
    system: 'system',
    team_invite: 'team_invite',
    assignment: 'assignment',
    status_change: 'status_change',
    reminder: 'reminder',
    deadline: 'deadline'
  }, _prefix: true

  enum :priority, {
    low: 'low',
    normal: 'normal',
    high: 'high',
    urgent: 'urgent'
  }

  # Metadata: { entity_type: 'intervention', entity_id: 'uuid', action_url: '/...' }

  scope :unread, -> { where(read: false) }
  scope :recent, -> { order(created_at: :desc).limit(50) }

  after_create :broadcast_to_user
  after_create :send_push_notification

  def mark_as_read!
    update!(read: true, read_at: Time.current)
  end

  private

  def broadcast_to_user
    NotificationsChannel.broadcast_to(user, notification: self.as_json)
  end

  def send_push_notification
    return unless priority.in?(%w[high urgent])
    PushNotificationJob.perform_later(user_id, title, message)
  end
end
```

---

### 3.6.5 activity_logs

Complete audit trail for compliance.

```ruby
# app/models/activity_log.rb
class ActivityLog < ApplicationRecord
  belongs_to :team
  belongs_to :user

  validates :action_type, presence: true
  validates :entity_type, presence: true
  validates :entity_id, presence: true

  enum :action_type, {
    create: 'create',
    update: 'update',
    delete: 'delete',
    view: 'view',
    assign: 'assign',
    unassign: 'unassign',
    approve: 'approve',
    reject: 'reject',
    upload: 'upload',
    download: 'download',
    share: 'share',
    comment: 'comment',
    status_change: 'status_change',
    send_notification: 'send_notification',
    login: 'login',
    logout: 'logout'
  }

  enum :entity_type, {
    user: 'user',
    team: 'team',
    building: 'building',
    lot: 'lot',
    intervention: 'intervention',
    document: 'document',
    contact: 'contact',
    notification: 'notification',
    message: 'message',
    quote: 'quote',
    report: 'report',
    contract: 'contract'
  }, _prefix: true

  enum :status, {
    success: 'success',
    failure: 'failure',
    pending: 'pending'
  }

  # Metadata: { old_values: {}, new_values: {}, changes: [] }

  scope :recent, -> { order(created_at: :desc) }
  scope :for_entity, ->(type, id) { where(entity_type: type, entity_id: id) }

  # Class method for easy logging
  def self.log!(team:, user:, action:, entity:, **options)
    create!(
      team: team,
      user: user,
      action_type: action,
      entity_type: entity.class.name.underscore,
      entity_id: entity.id,
      entity_name: entity.try(:name) || entity.try(:title) || entity.try(:reference),
      status: options[:status] || :success,
      description: options[:description],
      metadata: options[:metadata] || {},
      ip_address: options[:ip_address],
      user_agent: options[:user_agent]
    )
  end
end
```

---

### 3.6.6 push_subscriptions

WebPush subscriptions for PWA notifications.

```ruby
# app/models/push_subscription.rb
class PushSubscription < ApplicationRecord
  belongs_to :user

  validates :endpoint, presence: true, uniqueness: true
  validates :keys, presence: true

  # keys: { p256dh: '...', auth: '...' }

  def push!(title:, body:, **options)
    WebPush.payload_send(
      endpoint: endpoint,
      message: { title: title, body: body, **options }.to_json,
      p256dh: keys['p256dh'],
      auth: keys['auth'],
      vapid: Rails.application.credentials.vapid
    )
  rescue WebPush::ExpiredSubscription
    destroy
  end
end
```

---

### 3.6.7 Email System Tables

The email system enables synchronized email management per team.

#### 3.6.7.1 emails

Synchronized email messages.

```ruby
# app/models/email.rb
class Email < ApplicationRecord
  acts_as_tenant(:team)

  # Associations
  belongs_to :team
  belongs_to :team_email_connection
  belongs_to :intervention, optional: true
  has_many :attachments, class_name: 'EmailAttachment', dependent: :destroy
  has_many :email_links, dependent: :destroy

  # Validations
  validates :external_id, presence: true, uniqueness: { scope: :team_email_connection_id }
  validates :subject, presence: true
  validates :from_address, presence: true

  # Enums
  enum :direction, { inbound: 'inbound', outbound: 'outbound' }
  enum :status, { pending: 'pending', sent: 'sent', delivered: 'delivered', failed: 'failed', bounced: 'bounced' }

  # Scopes
  scope :unread, -> { where(read_at: nil) }
  scope :linked_to_intervention, -> { where.not(intervention_id: nil) }
end
```

```sql
-- ============================================================================
-- TABLE: emails
-- Description: Synchronized email messages
-- ============================================================================
CREATE TABLE emails (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Associations
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  team_email_connection_id UUID NOT NULL REFERENCES team_email_connections(id) ON DELETE CASCADE,
  intervention_id UUID REFERENCES interventions(id) ON DELETE SET NULL,

  -- External sync
  external_id VARCHAR(255) NOT NULL,  -- ID from email provider (Microsoft Graph, IMAP, etc.)
  thread_id VARCHAR(255),              -- Conversation thread ID

  -- RFC 5322 Headers (conversation threading)
  message_id VARCHAR(255),             -- RFC 5322 Message-ID header
  in_reply_to_header VARCHAR(255),     -- RFC 5322 In-Reply-To header
  references TEXT,                      -- RFC 5322 References header (space-separated message IDs)

  -- Email content
  subject TEXT NOT NULL,
  body_text TEXT,
  body_html TEXT,
  snippet TEXT,                         -- Short preview of email body

  -- Addresses
  from_address VARCHAR(255) NOT NULL,
  from_name VARCHAR(255),
  to_addresses JSONB DEFAULT '[]',      -- Array of {email, name}
  cc_addresses JSONB DEFAULT '[]',
  bcc_addresses JSONB DEFAULT '[]',
  reply_to VARCHAR(255),

  -- Metadata
  direction email_direction NOT NULL DEFAULT 'inbound',
  status email_status NOT NULL DEFAULT 'pending',
  received_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE,
  importance VARCHAR(20) DEFAULT 'normal',  -- low, normal, high
  has_attachments BOOLEAN DEFAULT FALSE,

  -- Soft delete
  discarded_at TIMESTAMP WITH TIME ZONE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT uq_emails_external UNIQUE (team_email_connection_id, external_id)
);

-- Indexes
CREATE INDEX idx_emails_team ON emails(team_id) WHERE discarded_at IS NULL;
CREATE INDEX idx_emails_connection ON emails(team_email_connection_id) WHERE discarded_at IS NULL;
CREATE INDEX idx_emails_intervention ON emails(intervention_id) WHERE discarded_at IS NULL;
CREATE INDEX idx_emails_thread ON emails(thread_id) WHERE discarded_at IS NULL;
CREATE INDEX idx_emails_direction ON emails(direction, received_at DESC) WHERE discarded_at IS NULL;
CREATE INDEX idx_emails_unread ON emails(team_id, read_at) WHERE discarded_at IS NULL AND read_at IS NULL;
CREATE INDEX idx_emails_received ON emails(team_id, received_at DESC) WHERE discarded_at IS NULL;
CREATE INDEX idx_emails_message_id ON emails(message_id) WHERE message_id IS NOT NULL AND discarded_at IS NULL;
```

> **Note on conversation threading fields:** The `message_id`, `in_reply_to_header`, `references`, and `snippet` columns are used by the conversation grouping algorithm to thread emails into conversations. The `message_id` is the RFC 5322 Message-ID header, `in_reply_to_header` is the In-Reply-To header pointing to the parent message, and `references` contains space-separated message IDs forming the complete thread chain.

#### 3.6.7.2 team_email_connections

Email account connections per team (Microsoft 365, Google Workspace, IMAP).

```ruby
# app/models/team_email_connection.rb
class TeamEmailConnection < ApplicationRecord
  acts_as_tenant(:team)

  # Associations
  belongs_to :team
  belongs_to :created_by, class_name: 'User', optional: true
  has_many :emails, dependent: :destroy

  # Validations
  validates :email_address, presence: true, format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :provider, presence: true, inclusion: { in: %w[microsoft google imap] }
  validates :email_address, uniqueness: { scope: :team_id }

  # Encrypted credentials
  encrypts :credentials

  # Enums
  enum :sync_status, { pending: 'pending', syncing: 'syncing', synced: 'synced', error: 'error' }

  # Scopes
  scope :active, -> { where(sync_enabled: true) }
  scope :needs_sync, -> { active.where(sync_status: %w[pending error]) }

  def sync!
    Emails::SyncJob.perform_later(self)
  end
end
```

```sql
-- ============================================================================
-- TABLE: team_email_connections
-- Description: Team email account connections
-- ============================================================================
CREATE TABLE team_email_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Associations
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Connection details
  email_address VARCHAR(255) NOT NULL,
  display_name VARCHAR(255),
  provider VARCHAR(50) NOT NULL,  -- 'microsoft', 'google', 'imap'

  -- OAuth / Credentials (encrypted)
  credentials_encrypted TEXT,       -- Encrypted JSONB: { access_token, refresh_token, ... }

  -- Sync configuration
  sync_enabled BOOLEAN DEFAULT TRUE,
  sync_folder VARCHAR(255) DEFAULT 'INBOX',
  sync_since TIMESTAMP WITH TIME ZONE,  -- Only sync emails after this date

  -- Sync status
  sync_status VARCHAR(20) DEFAULT 'pending',
  last_sync_at TIMESTAMP WITH TIME ZONE,
  last_sync_error TEXT,
  emails_synced_count INTEGER DEFAULT 0,

  -- Soft delete
  discarded_at TIMESTAMP WITH TIME ZONE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT uq_team_email_connections_email UNIQUE (team_id, email_address)
);

-- Indexes
CREATE INDEX idx_team_email_connections_team ON team_email_connections(team_id) WHERE discarded_at IS NULL;
CREATE INDEX idx_team_email_connections_active ON team_email_connections(team_id, sync_enabled) WHERE discarded_at IS NULL AND sync_enabled = TRUE;
CREATE INDEX idx_team_email_connections_provider ON team_email_connections(provider) WHERE discarded_at IS NULL;
CREATE INDEX idx_team_email_connections_status ON team_email_connections(sync_status) WHERE discarded_at IS NULL;
```

#### 3.6.7.3 email_attachments

Attachments for synchronized emails.

```ruby
# app/models/email_attachment.rb
class EmailAttachment < ApplicationRecord
  belongs_to :email

  # ActiveStorage
  has_one_attached :file

  # Validations
  validates :filename, presence: true
  validates :content_type, presence: true

  # Delegate team check to parent email
  delegate :team_id, to: :email
end
```

```sql
-- ============================================================================
-- TABLE: email_attachments
-- Description: Email file attachments
-- ============================================================================
CREATE TABLE email_attachments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Associations
  email_id UUID NOT NULL REFERENCES emails(id) ON DELETE CASCADE,

  -- File info
  filename VARCHAR(255) NOT NULL,
  content_type VARCHAR(100),
  size_bytes BIGINT,

  -- Storage (ActiveStorage compatible)
  storage_key VARCHAR(255),        -- ActiveStorage blob key
  storage_url TEXT,                -- Direct URL (if stored externally)

  -- External sync
  external_id VARCHAR(255),        -- ID from email provider

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_email_attachments_email ON email_attachments(email_id);
CREATE INDEX idx_email_attachments_content_type ON email_attachments(content_type);
```

#### 3.6.7.4 email_blacklist

Blacklisted email addresses/domains per team (spam filtering).

```ruby
# app/models/email_blacklist.rb
class EmailBlacklist < ApplicationRecord
  acts_as_tenant(:team)

  # Associations
  belongs_to :team
  belongs_to :created_by, class_name: 'User', optional: true

  # Validations
  validates :email_pattern, presence: true
  validates :email_pattern, uniqueness: { scope: :team_id }

  # Scopes
  scope :domains, -> { where("email_pattern LIKE '@%'") }
  scope :addresses, -> { where("email_pattern NOT LIKE '@%'") }

  # Check if an email matches this blacklist entry
  def matches?(email_address)
    if email_pattern.start_with?('@')
      # Domain blacklist
      email_address.downcase.end_with?(email_pattern.downcase)
    else
      # Exact email match
      email_address.downcase == email_pattern.downcase
    end
  end

  # Class method to check if email is blacklisted
  def self.blacklisted?(email_address, team_id)
    where(team_id: team_id).any? { |entry| entry.matches?(email_address) }
  end
end
```

```sql
-- ============================================================================
-- TABLE: email_blacklist
-- Description: Blacklisted email addresses/domains
-- ============================================================================
CREATE TABLE email_blacklist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Associations
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Blacklist entry
  email_pattern VARCHAR(255) NOT NULL,  -- Can be email or @domain.com
  reason TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT uq_email_blacklist_pattern UNIQUE (team_id, email_pattern)
);

-- Indexes
CREATE INDEX idx_email_blacklist_team ON email_blacklist(team_id);
CREATE INDEX idx_email_blacklist_pattern ON email_blacklist(email_pattern);
```

#### 3.6.7.5 email_links

Polymorphic linking of emails to business entities (buildings, lots, interventions, contracts, contacts).

```ruby
# app/models/email_link.rb
class EmailLink < ApplicationRecord
  belongs_to :email

  # Polymorphic entity reference
  validates :entity_type, presence: true, inclusion: { in: %w[building lot intervention contract contact] }
  validates :entity_id, presence: true
  validates :email_id, uniqueness: { scope: [:entity_type, :entity_id] }

  # Scopes
  scope :for_entity, ->(type, id) { where(entity_type: type, entity_id: id) }
  scope :for_email, ->(email_id) { where(email_id: email_id) }
end
```

```sql
CREATE TABLE email_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email_id UUID NOT NULL REFERENCES emails(id) ON DELETE CASCADE,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_email_links UNIQUE (email_id, entity_type, entity_id)
);
CREATE INDEX idx_email_links_email ON email_links(email_id);
CREATE INDEX idx_email_links_entity ON email_links(entity_type, entity_id);
```

#### 3.6.7.6 Email ENUMs

```sql
-- Email direction
CREATE TYPE email_direction AS ENUM ('inbound', 'outbound');

-- Email status
CREATE TYPE email_status AS ENUM ('pending', 'sent', 'delivered', 'failed', 'bounced');
```

---

## 3.7 Phase 4: Contracts

### 3.7.1 contracts

Lease agreements with automatic status calculation.

```ruby
# app/models/contract.rb
class Contract < ApplicationRecord
  acts_as_tenant(:team)

  # Associations
  belongs_to :team
  belongs_to :lot
  belongs_to :creator, class_name: 'User', foreign_key: :created_by, optional: true
  belongs_to :renewed_from, class_name: 'Contract', optional: true
  has_one :renewed_to, class_name: 'Contract', foreign_key: :renewed_from_id

  has_many :contract_contacts, dependent: :destroy
  has_many :contacts, through: :contract_contacts
  has_many :documents, ->(c) { where(entity_type: 'contract') },
           foreign_key: :entity_id, dependent: :destroy

  # Validations
  validates :start_date, presence: true
  validates :duration_months, presence: true, numericality: { greater_than: 0, less_than_or_equal_to: 120 }
  validates :rent_amount, presence: true, numericality: { greater_than: 0 }
  validates :contract_type, presence: true

  # Enums
  enum :contract_type, {
    bail_habitation: 'bail_habitation',
    bail_meuble: 'bail_meuble'
  }

  enum :status, {
    brouillon: 'brouillon',
    actif: 'actif',
    expire: 'expire',
    resilie: 'resilie',
    renouvele: 'renouvele'
  }

  enum :guarantee_type, {
    pas_de_garantie: 'pas_de_garantie',
    compte_proprietaire: 'compte_proprietaire',
    compte_bloque: 'compte_bloque',
    e_depot: 'e_depot',
    autre: 'autre'
  }

  enum :payment_frequency, {
    mensuel: 'mensuel',
    trimestriel: 'trimestriel',
    semestriel: 'semestriel',
    annuel: 'annuel'
  }

  # Soft delete
  include Discard::Model

  # Scopes
  scope :active, -> { where(status: :actif) }
  scope :expiring_soon, -> { where('end_date <= ?', 60.days.from_now).where(status: :actif) }

  # Computed end_date (can also be a generated column in PostgreSQL)
  def end_date
    start_date + duration_months.months
  end

  # Calculated status (alternative to stored status)
  def calculated_status
    return 'resilie' if terminated_at.present?
    return 'renouvele' if renewed_to.present?
    return 'brouillon' if signed_date.blank?
    return 'expire' if end_date < Date.current
    return 'actif' if start_date <= Date.current
    'a_venir'
  end

  # Main tenant
  def primary_tenant
    contract_contacts.joins(:contact)
                     .where(role: :locataire, is_primary: true)
                     .first&.contact
  end

  # Total monthly payment
  def total_monthly
    rent_amount + (charges_amount || 0)
  end
end
```

---

### 3.7.2 contract_contacts

People associated with a contract (tenants, guarantors, etc.).

```ruby
# app/models/contract_contact.rb
class ContractContact < ApplicationRecord
  belongs_to :contract
  belongs_to :contact

  validates :role, presence: true
  validates :contact_id, uniqueness: { scope: [:contract_id, :role] }

  enum :role, {
    locataire: 'locataire',
    colocataire: 'colocataire',
    garant: 'garant',
    representant_legal: 'representant_legal',
    autre: 'autre'
  }

  scope :tenants, -> { where(role: [:locataire, :colocataire]) }
  scope :guarantors, -> { where(role: :garant) }
  scope :primary, -> { where(is_primary: true) }
end
```

---

## 3.8 Phase 4: Import System

### 3.8.1 import_jobs

Tracking for bulk Excel/CSV imports.

```ruby
# app/models/import_job.rb
class ImportJob < ApplicationRecord
  acts_as_tenant(:team)

  belongs_to :team
  belongs_to :user, optional: true

  validates :filename, presence: true
  validates :entity_type, presence: true

  enum :status, {
    pending: 'pending',
    validating: 'validating',
    importing: 'importing',
    completed: 'completed',
    failed: 'failed',
    cancelled: 'cancelled'
  }

  enum :entity_type, {
    building: 'building',
    lot: 'lot',
    contact: 'contact',
    contract: 'contract',
    mixed: 'mixed'
  }, _prefix: true

  # errors: [{ row: 5, field: 'email', message: 'invalid format' }]
  # created_ids: { buildings: ['uuid1'], lots: ['uuid2'] }

  def progress_percentage
    return 0 if total_rows.zero?
    (processed_rows.to_f / total_rows * 100).round(1)
  end

  def complete!
    update!(
      status: :completed,
      completed_at: Time.current
    )
  end

  def fail!(error_message)
    update!(
      status: :failed,
      errors: errors + [{ row: nil, message: error_message }]
    )
  end
end
```

---

## 3.9 Billing: Stripe Integration

### 3.9.1 stripe_customers

Maps SEIDO teams to Stripe customers.

```ruby
# app/models/stripe_customer.rb
class StripeCustomer < ApplicationRecord
  belongs_to :team

  validates :stripe_customer_id, presence: true, uniqueness: true
  validates :team_id, uniqueness: true

  # Stripe customer ID format: cus_xxx
end
```

---

### 3.9.2 stripe_products

Product catalog synced from Stripe.

```ruby
# app/models/stripe_product.rb
class StripeProduct < ApplicationRecord
  self.primary_key = :id  # Stripe ID as PK (prod_xxx)

  has_many :prices, class_name: 'StripePrice', foreign_key: :product_id

  scope :active, -> { where(active: true) }
end
```

---

### 3.9.3 stripe_prices

Pricing plans synced from Stripe.

```ruby
# app/models/stripe_price.rb
class StripePrice < ApplicationRecord
  self.primary_key = :id  # Stripe ID as PK (price_xxx)

  belongs_to :product, class_name: 'StripeProduct'
  has_many :subscriptions

  enum :type, { one_time: 'one_time', recurring: 'recurring' }, _prefix: true
  enum :interval, { day: 'day', week: 'week', month: 'month', year: 'year' }

  scope :active, -> { where(active: true) }
  scope :recurring, -> { where(type: :recurring) }

  # Amount in cents
  def amount_in_euros
    (unit_amount.to_f / 100).round(2)
  end
end
```

---

### 3.9.4 subscriptions

Active subscriptions synced from Stripe.

```ruby
# app/models/subscription.rb
class Subscription < ApplicationRecord
  self.primary_key = :id  # Stripe ID as PK (sub_xxx)

  belongs_to :team
  belongs_to :price, class_name: 'StripePrice', optional: true
  has_many :invoices, class_name: 'StripeInvoice'

  enum :status, {
    trialing: 'trialing',
    active: 'active',
    incomplete: 'incomplete',
    incomplete_expired: 'incomplete_expired',
    past_due: 'past_due',
    unpaid: 'unpaid',
    canceled: 'canceled',
    paused: 'paused'
  }

  scope :active_or_trialing, -> { where(status: [:trialing, :active, :past_due]) }

  # Check if subscription allows access
  def allows_access?
    status.in?(%w[trialing active past_due])
  end

  # Days until trial ends
  def trial_days_remaining
    return nil unless trialing? && trial_end
    (trial_end.to_date - Date.current).to_i
  end

  # SEIDO-specific: billable properties count
  # Updated by trigger when buildings/lots change
end
```

---

### 3.9.5 stripe_invoices

Invoice history synced from Stripe.

```ruby
# app/models/stripe_invoice.rb
class StripeInvoice < ApplicationRecord
  self.primary_key = :id  # Stripe ID as PK (in_xxx)

  belongs_to :team
  belongs_to :subscription, optional: true

  enum :status, {
    draft: 'draft',
    open: 'open',
    paid: 'paid',
    uncollectible: 'uncollectible',
    void: 'void'
  }

  scope :paid, -> { where(status: :paid) }
  scope :open, -> { where(status: :open) }
  scope :recent, -> { order(created_at: :desc) }

  # Amount in cents
  def amount_due_in_euros
    (amount_due.to_f / 100).round(2)
  end
end
```

---

*End of Section 3 - Data Models*

---

← Previous: [Tech Stack](02-tech-stack.md) | Next: [Database Migrations](04-database-migrations.md) →
