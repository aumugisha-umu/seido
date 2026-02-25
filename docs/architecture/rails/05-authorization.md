> Part of [SEIDO Rails Architecture](../seido-rails-architecture.md)

← Previous: [Database Migrations](04-database-migrations.md) | Next: [State Machines](06-state-machines.md) →

---

# 5. Authorization (Pundit)

This section describes the authorization architecture for SEIDO using Pundit, replacing the PostgreSQL Row Level Security (RLS) approach used in the Supabase version. Pundit provides a cleaner, more testable, and Rails-idiomatic way to handle authorization.

---

## 5.1 Overview

### 5.1.1 Why Pundit Instead of RLS?

| Aspect | PostgreSQL RLS | Pundit |
|--------|---------------|--------|
| **Location** | Database level | Application level |
| **Testability** | Requires DB queries | Pure Ruby, fast unit tests |
| **Debugging** | Hard (SQL EXPLAIN) | Easy (Ruby debugger) |
| **Flexibility** | SQL-constrained | Full Ruby power |
| **Performance** | Every query filtered | Can optimize (eager load) |
| **Multi-tenant** | Complex functions | acts_as_tenant gem |
| **Learning curve** | PostgreSQL expertise | Rails conventions |

### 5.1.2 Authorization Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      SEIDO AUTHORIZATION ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐         ┌───────────────┐         ┌──────────────────┐   │
│  │   Request    │         │  Controller   │         │     Policy       │   │
│  │   (User)     │  ────▶  │  (authorize)  │  ────▶  │  (Pundit check)  │   │
│  └──────────────┘         └───────────────┘         └────────┬─────────┘   │
│                                                               │              │
│                                                               ▼              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                         AUTHORIZATION CHECKS                          │   │
│  ├──────────────────────────────────────────────────────────────────────┤   │
│  │                                                                       │   │
│  │   1. ROLE CHECK                                                       │   │
│  │      └─▶ user.admin? / user.gestionnaire? / user.prestataire?        │   │
│  │                                                                       │   │
│  │   2. TEAM MEMBERSHIP (via acts_as_tenant)                             │   │
│  │      └─▶ record.team_id == Current.team.id                           │   │
│  │                                                                       │   │
│  │   3. RESOURCE OWNERSHIP                                               │   │
│  │      └─▶ record.created_by == user.id                                │   │
│  │                                                                       │   │
│  │   4. ASSIGNMENT CHECK (Interventions)                                 │   │
│  │      └─▶ user.assigned_to?(intervention)                             │   │
│  │                                                                       │   │
│  │   5. PERMISSION CHECK (RBAC)                                          │   │
│  │      └─▶ user.has_permission?(:buildings, :create)                   │   │
│  │                                                                       │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│                                    │                                         │
│                                    ▼                                         │
│                           ┌───────────────┐                                  │
│                           │   ✅ ALLOW    │                                  │
│                           │   ❌ DENY     │                                  │
│                           └───────────────┘                                  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 5.2 RLS Function to Pundit Mapping

This section shows the conversion from Supabase RLS helper functions to Pundit methods.

### 5.2.1 Identity Functions

| RLS Function | Pundit Equivalent | Description |
|-------------|-------------------|-------------|
| `get_current_user_id()` | `current_user.id` | Current user's ID |
| `get_current_user_role()` | `current_user.role` | Current user's global role |
| `is_admin()` | `user.admin?` | Check if system admin |
| `is_gestionnaire()` | `user.gestionnaire? \|\| user.admin?` | Check if property manager |

### 5.2.2 Team Functions

| RLS Function | Pundit Equivalent | Description |
|-------------|-------------------|-------------|
| `get_user_teams_v2()` | `user.teams` | All user's teams |
| `user_belongs_to_team_v2(team_id)` | `user.member_of?(team)` | Check team membership |
| `is_team_manager(team_id)` | `user.manager_of?(team)` | Check if manager in team |
| `is_active_team_member(team_id)` | `user.active_member_of?(team)` | Check active membership |

### 5.2.3 Property Functions

| RLS Function | Pundit Equivalent | Description |
|-------------|-------------------|-------------|
| `get_building_team_id(id)` | `building.team_id` | Get building's team |
| `get_lot_team_id(id)` | `lot.team_id` | Get lot's team |
| `can_view_building(id)` | `BuildingPolicy#show?` | Can view building |
| `can_view_lot(id)` | `LotPolicy#show?` | Can view lot |

### 5.2.4 Role-Specific Functions

| RLS Function | Pundit Equivalent | Description |
|-------------|-------------------|-------------|
| `is_tenant_of_lot(lot_id)` | `user.tenant_of?(lot)` | Check if tenant of lot |
| `is_proprietaire_of_lot(lot_id)` | `user.owner_of?(lot)` | Check if owner of lot |
| `is_assigned_to_intervention(id)` | `user.assigned_to?(intervention)` | Check assignment |

### 5.2.5 Permission Functions

| RLS Function | Pundit Equivalent | Description |
|-------------|-------------------|-------------|
| `has_permission(team_id, code)` | `user.has_permission?(code, team)` | Check RBAC permission |
| `get_user_permissions(team_id)` | `user.permissions_for(team)` | Get all permissions |
| `is_tenant_of_lot(lot_id)` | `LotPolicy#tenant?` | Check if user is tenant of lot |
| `has_active_subscription()` | `TeamPolicy#active_subscription?` | Check if team has active subscription |
| `get_subscription_status()` | `Team#subscription_status` | Get current subscription status |

### 5.2.6 Permission Helper Implementations

```ruby
# app/models/concerns/permission_helper.rb
module PermissionHelper
  extend ActiveSupport::Concern

  # ============================================================================
  # PERMISSION SYSTEM
  # Replaces RLS has_permission() and get_user_permissions()
  # ============================================================================

  def permissions_for(team)
    return [] unless team

    team_member = team_members.find_by(team: team, discarded_at: nil)
    return [] unless team_member

    # Get explicit permissions from team_member
    explicit = team_member.permissions || []

    # Get role-based default permissions
    defaults = Permission.defaults_for_role(team_member.role)

    # Merge (explicit overrides defaults)
    (defaults + explicit).uniq
  end

  def has_permission?(permission_code, team = nil)
    team ||= current_team
    return false unless team

    permissions_for(team).include?(permission_code.to_s)
  end

  # ============================================================================
  # TENANT CHECK
  # Replaces RLS is_tenant_of_lot()
  # ============================================================================

  def tenant_of?(lot)
    Contract.active
      .where(lot_id: lot.id)
      .joins(:contract_contacts)
      .where(contract_contacts: { user_id: id, role: 'locataire' })
      .exists?
  end

  def tenant_of_lot?(lot_id)
    tenant_of?(Lot.find(lot_id))
  rescue ActiveRecord::RecordNotFound
    false
  end

  # ============================================================================
  # ASSIGNMENT CHECK
  # Replaces RLS is_assigned_to_intervention()
  # ============================================================================

  def assigned_to?(intervention)
    InterventionAssignment.where(
      intervention_id: intervention.id,
      user_id: id
    ).exists?
  end

  # ============================================================================
  # OWNER CHECK
  # Replaces RLS is_proprietaire_of_lot()
  # ============================================================================

  def owner_of?(lot)
    LotContact.where(
      lot_id: lot.id,
      contact_id: contact&.id,
      role: 'proprietaire'
    ).exists?
  end
end

# Include in User model
class User < ApplicationRecord
  include PermissionHelper
  # ...
end
```

### 5.2.7 Subscription Helper Implementations

```ruby
# app/models/concerns/subscription_helper.rb
module SubscriptionHelper
  extend ActiveSupport::Concern

  # ============================================================================
  # SUBSCRIPTION STATUS
  # Replaces RLS has_active_subscription() and get_subscription_status()
  # ============================================================================

  def active_subscription?
    subscriptions.where(status: 'active').exists?
  end

  def subscription_status
    current = subscriptions.order(created_at: :desc).first
    return 'none' unless current

    current.status
  end

  def subscription
    subscriptions.active.first
  end

  def can_access_feature?(feature_code)
    return true if subscription_status == 'active'
    return true if subscription_status == 'trialing'

    # Check if feature is available in free tier
    FREE_TIER_FEATURES.include?(feature_code)
  end

  FREE_TIER_FEATURES = %w[
    view_buildings
    view_interventions
    create_intervention_request
  ].freeze
end

# Include in Team model
class Team < ApplicationRecord
  include SubscriptionHelper
  # ...
end
```

### 5.2.8 LotPolicy Tenant Check

```ruby
# app/policies/lot_policy.rb
class LotPolicy < ApplicationPolicy
  # Check if user is the tenant of this lot
  def tenant?
    Contract.active
      .where(lot_id: record.id)
      .joins(:contract_contacts)
      .where(contract_contacts: { user_id: user.id, role: 'locataire' })
      .exists?
  end

  # Standard policy methods
  def show?
    team_member? || tenant? || owner?
  end

  def create?
    team_member? && (user.gestionnaire? || user.admin?)
  end

  def update?
    team_member? && (user.gestionnaire? || user.admin?)
  end

  def destroy?
    team_member? && user.admin?
  end

  private

  def team_member?
    user.team_member?(record.team)
  end

  def owner?
    return false unless user.contact

    LotContact.where(
      lot_id: record.id,
      contact_id: user.contact.id,
      role: 'proprietaire'
    ).exists?
  end
end
```

### 5.2.9 TeamPolicy Subscription Check

```ruby
# app/policies/team_policy.rb
class TeamPolicy < ApplicationPolicy
  # Subscription checks
  def active_subscription?
    record.active_subscription?
  end

  def can_add_building?
    return true if active_subscription?

    # Free tier limit: 3 buildings
    record.buildings.active.count < 3
  end

  def can_add_user?
    return true if active_subscription?

    # Free tier limit: 2 users
    record.team_members.active.count < 2
  end

  def can_use_email_sync?
    active_subscription?
  end

  def can_export_data?
    active_subscription?
  end

  # Standard policy methods
  def show?
    member?
  end

  def update?
    admin_member?
  end

  def destroy?
    owner?
  end

  def manage_members?
    admin_member?
  end

  def manage_billing?
    owner?
  end

  private

  def member?
    user.team_member?(record)
  end

  def admin_member?
    membership = record.team_members.find_by(user: user, discarded_at: nil)
    membership&.role == 'admin'
  end

  def owner?
    membership = record.team_members.find_by(user: user, discarded_at: nil)
    membership&.is_team_owner?
  end
end
```

### 5.2.10 Permission Model

```ruby
# app/models/permission.rb
class Permission
  PERMISSIONS = {
    # Building permissions
    view_buildings: { roles: %w[admin gestionnaire prestataire locataire] },
    create_buildings: { roles: %w[admin gestionnaire] },
    update_buildings: { roles: %w[admin gestionnaire] },
    delete_buildings: { roles: %w[admin] },

    # Lot permissions
    view_lots: { roles: %w[admin gestionnaire prestataire locataire] },
    create_lots: { roles: %w[admin gestionnaire] },
    update_lots: { roles: %w[admin gestionnaire] },
    delete_lots: { roles: %w[admin] },

    # Intervention permissions
    view_interventions: { roles: %w[admin gestionnaire prestataire locataire] },
    create_interventions: { roles: %w[admin gestionnaire locataire] },
    update_interventions: { roles: %w[admin gestionnaire] },
    approve_interventions: { roles: %w[admin gestionnaire] },
    close_interventions: { roles: %w[admin gestionnaire prestataire] },

    # Quote permissions
    view_quotes: { roles: %w[admin gestionnaire prestataire] },
    create_quotes: { roles: %w[prestataire] },
    approve_quotes: { roles: %w[admin gestionnaire] },

    # Contract permissions
    view_contracts: { roles: %w[admin gestionnaire locataire] },
    create_contracts: { roles: %w[admin gestionnaire] },
    update_contracts: { roles: %w[admin gestionnaire] },
    terminate_contracts: { roles: %w[admin gestionnaire] },

    # Team management
    view_team_members: { roles: %w[admin gestionnaire] },
    invite_team_members: { roles: %w[admin] },
    remove_team_members: { roles: %w[admin] },
    manage_billing: { roles: %w[admin] }
  }.freeze

  def self.defaults_for_role(role)
    PERMISSIONS.select { |_k, v| v[:roles].include?(role.to_s) }.keys.map(&:to_s)
  end

  def self.for_user_in_team(user, team)
    team_member = user.team_members.find_by(team: team, discarded_at: nil)
    return [] unless team_member

    defaults_for_role(team_member.role) + (team_member.permissions || [])
  end
end
```

---

## 5.3 Multi-Tenant Scoping with acts_as_tenant

### 5.3.1 Installation

```ruby
# Gemfile
gem 'acts_as_tenant'
```

### 5.3.2 Configuration

```ruby
# config/initializers/acts_as_tenant.rb
ActsAsTenant.configure do |config|
  config.require_tenant = true  # Raise error if no tenant set
end
```

### 5.3.3 Base Model Configuration

```ruby
# app/models/concerns/team_scoped.rb
module TeamScoped
  extend ActiveSupport::Concern

  included do
    acts_as_tenant(:team)

    # Automatically scope all queries to current team
    # SELECT * FROM buildings WHERE team_id = 'xxx'
  end
end

# app/models/building.rb
class Building < ApplicationRecord
  include TeamScoped
  # All queries now automatically filtered by team_id
end

# app/models/lot.rb
class Lot < ApplicationRecord
  include TeamScoped
end

# app/models/intervention.rb
class Intervention < ApplicationRecord
  include TeamScoped
end

# app/models/contract.rb
class Contract < ApplicationRecord
  include TeamScoped
end

# app/models/contact.rb
class Contact < ApplicationRecord
  include TeamScoped
end
```

### 5.3.4 Setting the Current Tenant

```ruby
# app/controllers/application_controller.rb
class ApplicationController < ActionController::Base
  include Pundit::Authorization

  set_current_tenant_through_filter
  before_action :authenticate_user!
  before_action :set_current_tenant
  after_action :verify_authorized, except: :index
  after_action :verify_policy_scoped, only: :index

  private

  def set_current_tenant
    # Admin can access all tenants (no tenant set)
    return if current_user.admin?

    # Get team from params or session
    team = if params[:team_id]
      current_user.teams.find(params[:team_id])
    else
      current_user.current_team || current_user.teams.first
    end

    ActsAsTenant.current_tenant = team
    Current.team = team  # For access in models/services
  rescue ActiveRecord::RecordNotFound
    redirect_to root_path, alert: "Acces non autorise a cette equipe"
  end

  def pundit_user
    UserContext.new(current_user, ActsAsTenant.current_tenant)
  end
end
```

### 5.3.5 User Context for Pundit

```ruby
# app/models/user_context.rb
class UserContext
  attr_reader :user, :team

  def initialize(user, team)
    @user = user
    @team = team
  end

  # Delegate common methods to user
  delegate :id, :role, :admin?, :gestionnaire?, :prestataire?, :locataire?, to: :user

  def team_membership
    @team_membership ||= user.team_members.find_by(team: team, discarded_at: nil)
  end

  def team_role
    team_membership&.role
  end

  def team_owner?
    team_membership&.is_team_owner?
  end

  def has_permission?(permission_code)
    return true if admin?
    return true if team_owner?

    # Check custom permissions first
    if team_membership&.permissions&.any?
      return team_membership.permissions.include?(permission_code.to_s)
    end

    # Fall back to role default permissions
    default_permissions_for_role.include?(permission_code.to_s)
  end

  def manager_of_team?
    admin? || (team_membership && %w[admin gestionnaire].include?(team_membership.role))
  end

  private

  def default_permissions_for_role
    RoleDefaultPermission
      .joins(:permission)
      .where(role: user.role)
      .pluck('permissions.code')
  end
end
```

---

## 5.4 Application Policy (Base)

```ruby
# app/policies/application_policy.rb
class ApplicationPolicy
  attr_reader :context, :record

  def initialize(context, record)
    @context = context
    @record = record
  end

  # Delegate to context
  delegate :user, :team, to: :context
  delegate :id, :role, :admin?, :gestionnaire?, :prestataire?, :locataire?,
           :team_owner?, :has_permission?, :manager_of_team?, to: :context

  # Default: deny all
  def index?
    false
  end

  def show?
    false
  end

  def create?
    false
  end

  def new?
    create?
  end

  def update?
    false
  end

  def edit?
    update?
  end

  def destroy?
    false
  end

  # Scope class for collections
  class Scope
    attr_reader :context, :scope

    def initialize(context, scope)
      @context = context
      @scope = scope
    end

    delegate :user, :team, to: :context
    delegate :admin?, :gestionnaire?, :prestataire?, :locataire?,
             :manager_of_team?, :has_permission?, to: :context

    def resolve
      raise NotImplementedError, "You must define #resolve in #{self.class}"
    end

    protected

    def admin_scope
      scope.all
    end

    def team_scope
      scope.where(team_id: team.id)
    end
  end

  protected

  # Common checks
  def admin_access?
    admin?
  end

  def team_manager_access?
    admin? || manager_of_team?
  end

  def belongs_to_team?
    return true if admin?
    record.respond_to?(:team_id) && record.team_id == team&.id
  end

  def owns_record?
    record.respond_to?(:created_by) && record.created_by == user.id
  end
end
```

---

## 5.5 Policies by Model

### 5.5.1 Team Policy

```ruby
# app/policies/team_policy.rb
class TeamPolicy < ApplicationPolicy
  def index?
    true  # All users can list their teams
  end

  def show?
    admin? || user.member_of?(record)
  end

  def create?
    admin? || gestionnaire?
  end

  def update?
    admin? || (user.member_of?(record) && has_permission?('team.manage'))
  end

  def destroy?
    admin? || (record.created_by == user.id && has_permission?('team.manage'))
  end

  def invite_member?
    admin? || has_permission?('team.members_invite')
  end

  def manage_members?
    admin? || has_permission?('team.members_manage')
  end

  def invite_manager?
    admin? || has_permission?('team.managers_invite')
  end

  def manage_managers?
    admin? || has_permission?('team.managers_manage')
  end

  class Scope < Scope
    def resolve
      if admin?
        scope.all
      else
        scope.joins(:team_members)
             .where(team_members: { user_id: user.id, discarded_at: nil })
      end
    end
  end
end
```

### 5.5.2 Team Member Policy

```ruby
# app/policies/team_member_policy.rb
class TeamMemberPolicy < ApplicationPolicy
  def index?
    admin? || user.member_of?(record.team)
  end

  def show?
    admin? || user.member_of?(record.team)
  end

  def create?
    admin? || (
      user.member_of?(record.team) &&
      has_permission?(invitation_permission_for(record.role))
    )
  end

  def update?
    return true if admin?
    return false unless user.member_of?(record.team)
    return false if record.user_id == user.id  # Can't change own role

    # Can only update if has appropriate permission
    has_permission?('team.members_manage') ||
      (manager_role?(record.role) && has_permission?('team.managers_manage'))
  end

  def destroy?
    return true if admin?
    return true if record.user_id == user.id  # Can leave team

    # Can deactivate others with permission
    can_deactivate_member?
  end

  class Scope < Scope
    def resolve
      if admin?
        scope.all
      else
        scope.where(team_id: team.id)
      end
    end
  end

  private

  def invitation_permission_for(role)
    if manager_role?(role)
      'team.managers_invite'
    else
      'team.members_invite'
    end
  end

  def manager_role?(role)
    %w[admin gestionnaire].include?(role)
  end

  def can_deactivate_member?
    return false unless user.member_of?(record.team)

    current_membership = context.team_membership
    target_role = record.role

    # Team owner can deactivate anyone
    return true if current_membership.is_team_owner?

    # Can't deactivate team owner
    return false if record.is_team_owner?

    # Admins/gestionnaires can deactivate prestataires/locataires
    if %w[admin gestionnaire].include?(current_membership.role)
      return !manager_role?(target_role)
    end

    false
  end
end
```

### 5.5.3 Building Policy

```ruby
# app/policies/building_policy.rb
class BuildingPolicy < ApplicationPolicy
  def index?
    true  # Scoped by acts_as_tenant
  end

  def show?
    admin? || team_manager_access? || assigned_via_intervention? || tenant_of_building?
  end

  def create?
    admin? || (manager_of_team? && has_permission?('properties.create'))
  end

  def update?
    admin? || (belongs_to_team? && has_permission?('properties.manage'))
  end

  def destroy?
    admin? || (belongs_to_team? && has_permission?('properties.manage'))
  end

  def manage_documents?
    admin? || (belongs_to_team? && has_permission?('properties.documents'))
  end

  class Scope < Scope
    def resolve
      if admin?
        scope.all
      elsif manager_of_team?
        scope.where(team_id: team.id)
      elsif prestataire?
        # Prestataires see buildings via their intervention assignments
        scope.joins(lots: { interventions: :intervention_assignments })
             .where(intervention_assignments: { user_id: user.id })
             .distinct
      elsif locataire?
        # Tenants see buildings of their lots
        scope.joins(lots: { contracts: :contract_contacts })
             .joins('INNER JOIN contacts ON contract_contacts.contact_id = contacts.id')
             .where(contacts: { user_id: user.id })
             .where(contract_contacts: { role: ['locataire', 'colocataire'] })
             .distinct
      else
        scope.none
      end
    end
  end

  private

  def assigned_via_intervention?
    return false unless prestataire?
    record.lots.joins(interventions: :intervention_assignments)
          .where(intervention_assignments: { user_id: user.id })
          .exists?
  end

  def tenant_of_building?
    return false unless locataire?
    record.lots.joins(contracts: :contract_contacts)
          .joins('INNER JOIN contacts ON contract_contacts.contact_id = contacts.id')
          .where(contacts: { user_id: user.id })
          .where(contract_contacts: { role: ['locataire', 'colocataire'] })
          .exists?
  end
end
```

### 5.5.4 Lot Policy

```ruby
# app/policies/lot_policy.rb
class LotPolicy < ApplicationPolicy
  def index?
    true  # Scoped by acts_as_tenant
  end

  def show?
    admin? || team_manager_access? || tenant_of_lot? || owner_of_lot? || assigned_via_intervention?
  end

  def create?
    admin? || (manager_of_team? && has_permission?('properties.create'))
  end

  def update?
    admin? || (belongs_to_team? && has_permission?('properties.manage'))
  end

  def destroy?
    admin? || (belongs_to_team? && has_permission?('properties.manage'))
  end

  def manage_documents?
    admin? || (belongs_to_team? && has_permission?('properties.documents'))
  end

  class Scope < Scope
    def resolve
      if admin?
        scope.all
      elsif manager_of_team?
        scope.where(team_id: team.id)
      elsif prestataire?
        # Prestataires see lots via their intervention assignments
        scope.joins(interventions: :intervention_assignments)
             .where(intervention_assignments: { user_id: user.id })
             .distinct
      elsif locataire?
        # Tenants see their own lots
        scope.joins(contracts: :contract_contacts)
             .joins('INNER JOIN contacts ON contract_contacts.contact_id = contacts.id')
             .where(contacts: { user_id: user.id })
             .where(contract_contacts: { role: ['locataire', 'colocataire'] })
             .distinct
      else
        scope.none
      end
    end
  end

  private

  def tenant_of_lot?
    return false unless user.contact

    record.contracts
          .active
          .joins(:contract_contacts)
          .where(contract_contacts: {
            contact_id: user.contact.id,
            role: ['locataire', 'colocataire']
          })
          .exists?
  end

  def owner_of_lot?
    return false unless user.contact

    record.lot_contacts
          .where(contact_id: user.contact.id, contact_role: 'proprietaire')
          .exists?
  end

  def assigned_via_intervention?
    return false unless prestataire?
    record.interventions
          .joins(:intervention_assignments)
          .where(intervention_assignments: { user_id: user.id })
          .exists?
  end
end
```

### 5.5.5 Intervention Policy

```ruby
# app/policies/intervention_policy.rb
class InterventionPolicy < ApplicationPolicy
  def index?
    true  # Scoped by policy_scope
  end

  def show?
    admin? || team_manager_access? || assigned_to_intervention? || created_by_user? || tenant_of_lot?
  end

  def create?
    admin? ||
      (manager_of_team? && has_permission?('interventions.create')) ||
      (locataire? && tenant_of_intervention_lot?)
  end

  def update?
    return true if admin?
    return false unless belongs_to_team?

    if manager_of_team?
      has_permission?('interventions.manage')
    elsif assigned_to_intervention?
      can_update_as_provider?
    elsif tenant_of_lot?
      can_update_as_tenant?
    else
      false
    end
  end

  def destroy?
    admin? || (belongs_to_team? && has_permission?('interventions.manage'))
  end

  # Custom action policies
  def approve?
    admin? || (manager_of_team? && has_permission?('interventions.manage'))
  end

  def reject?
    admin? || (manager_of_team? && has_permission?('interventions.manage'))
  end

  def assign_provider?
    admin? || (manager_of_team? && has_permission?('interventions.manage'))
  end

  def request_quote?
    admin? || (manager_of_team? && has_permission?('interventions.manage'))
  end

  def schedule?
    admin? || manager_of_team? || assigned_to_intervention?
  end

  def close_as_provider?
    assigned_to_intervention? && record.planifiee?
  end

  def close_as_tenant?
    (tenant_of_lot? || created_by_user?) && record.cloturee_par_prestataire?
  end

  def close_as_manager?
    (admin? || manager_of_team?) &&
      (record.cloturee_par_locataire? || record.cloturee_par_prestataire?) &&
      has_permission?('interventions.close')
  end

  def cancel?
    admin? || (manager_of_team? && has_permission?('interventions.manage'))
  end

  class Scope < Scope
    def resolve
      if admin?
        scope.all
      elsif manager_of_team?
        scope.where(team_id: team.id)
      elsif prestataire?
        # Prestataires see their assigned interventions
        scope.joins(:intervention_assignments)
             .where(intervention_assignments: { user_id: user.id })
      elsif locataire?
        # Tenants see interventions on their lots or created by them
        lots_scope = Lot.joins(contracts: :contract_contacts)
                       .joins('INNER JOIN contacts ON contract_contacts.contact_id = contacts.id')
                       .where(contacts: { user_id: user.id })
                       .where(contract_contacts: { role: ['locataire', 'colocataire'] })

        scope.where(lot_id: lots_scope.select(:id))
             .or(scope.where(created_by: user.id))
      else
        scope.none
      end
    end
  end

  private

  def assigned_to_intervention?
    record.intervention_assignments.exists?(user_id: user.id)
  end

  def created_by_user?
    record.created_by == user.id
  end

  def tenant_of_lot?
    return false unless record.lot && user.contact

    record.lot.contracts
          .active
          .joins(:contract_contacts)
          .where(contract_contacts: {
            contact_id: user.contact.id,
            role: ['locataire', 'colocataire']
          })
          .exists?
  end

  def tenant_of_intervention_lot?
    lot = Lot.find_by(id: record.lot_id)
    return false unless lot && user.contact

    lot.contracts
       .active
       .joins(:contract_contacts)
       .where(contract_contacts: {
         contact_id: user.contact.id,
         role: ['locataire', 'colocataire']
       })
       .exists?
  end

  def can_update_as_provider?
    # Providers can only update status-related fields during workflow
    %w[planification planifiee].include?(record.status)
  end

  def can_update_as_tenant?
    # Tenants can only respond/close
    record.cloturee_par_prestataire?
  end
end
```

### 5.5.6 Intervention Quote Policy

```ruby
# app/policies/intervention_quote_policy.rb
class InterventionQuotePolicy < ApplicationPolicy
  def index?
    true
  end

  def show?
    admin? ||
      team_manager_access? ||
      owns_quote? ||
      (tenant_of_intervention_lot? && record.intervention.approved_quote_id == record.id)
  end

  def create?
    admin? || (assigned_to_intervention? && prestataire?)
  end

  def update?
    return true if admin?
    return owns_quote? && record.status == 'en_attente' if prestataire?
    false
  end

  def destroy?
    admin? || (owns_quote? && record.status == 'en_attente')
  end

  # Custom actions
  def approve?
    admin? || (manager_of_team? && has_permission?('interventions.manage'))
  end

  def reject?
    admin? || (manager_of_team? && has_permission?('interventions.manage'))
  end

  class Scope < Scope
    def resolve
      if admin?
        scope.all
      elsif manager_of_team?
        scope.joins(:intervention).where(interventions: { team_id: team.id })
      elsif prestataire?
        scope.where(provider_id: user.id)
      else
        # Tenants see only approved quotes on their interventions
        scope.joins(intervention: { lot: { contracts: :contract_contacts } })
             .joins('INNER JOIN contacts ON contract_contacts.contact_id = contacts.id')
             .where(contacts: { user_id: user.id })
             .where(status: 'accepte')
      end
    end
  end

  private

  def owns_quote?
    record.provider_id == user.id
  end

  def assigned_to_intervention?
    record.intervention.intervention_assignments.exists?(user_id: user.id)
  end

  def tenant_of_intervention_lot?
    return false unless record.intervention.lot && user.contact

    record.intervention.lot.contracts
          .active
          .joins(:contract_contacts)
          .where(contract_contacts: {
            contact_id: user.contact.id,
            role: ['locataire', 'colocataire']
          })
          .exists?
  end
end
```

### 5.5.7 Intervention Time Slot Policy

```ruby
# app/policies/intervention_time_slot_policy.rb
class InterventionTimeSlotPolicy < ApplicationPolicy
  def index?
    true
  end

  def show?
    admin? || team_manager_access? || assigned_to_intervention? || tenant_of_intervention_lot?
  end

  def create?
    admin? ||
      (manager_of_team? && has_permission?('interventions.manage')) ||
      assigned_to_intervention?
  end

  def update?
    admin? || (proposed_by_user? && !record.is_selected?)
  end

  def destroy?
    admin? || (proposed_by_user? && !record.is_selected?)
  end

  # Custom actions
  def select?
    admin? ||
      (manager_of_team? && has_permission?('interventions.manage')) ||
      tenant_of_intervention_lot?
  end

  class Scope < Scope
    def resolve
      if admin?
        scope.all
      elsif manager_of_team?
        scope.joins(:intervention).where(interventions: { team_id: team.id })
      elsif prestataire?
        scope.joins(intervention: :intervention_assignments)
             .where(intervention_assignments: { user_id: user.id })
      elsif locataire?
        scope.joins(intervention: { lot: { contracts: :contract_contacts } })
             .joins('INNER JOIN contacts ON contract_contacts.contact_id = contacts.id')
             .where(contacts: { user_id: user.id })
      else
        scope.none
      end
    end
  end

  private

  def proposed_by_user?
    record.proposed_by == user.id
  end

  def assigned_to_intervention?
    record.intervention.intervention_assignments.exists?(user_id: user.id)
  end

  def tenant_of_intervention_lot?
    return false unless record.intervention.lot && user.contact

    record.intervention.lot.contracts
          .active
          .joins(:contract_contacts)
          .where(contract_contacts: {
            contact_id: user.contact.id,
            role: ['locataire', 'colocataire']
          })
          .exists?
  end
end
```

### 5.5.8 Contract Policy

```ruby
# app/policies/contract_policy.rb
class ContractPolicy < ApplicationPolicy
  def index?
    true
  end

  def show?
    admin? || team_manager_access? || signatory_of_contract?
  end

  def create?
    admin? || (manager_of_team? && has_permission?('contracts.create'))
  end

  def update?
    admin? || (belongs_to_team? && has_permission?('contracts.manage'))
  end

  def destroy?
    admin? || (belongs_to_team? && has_permission?('contracts.manage'))
  end

  def terminate?
    admin? || (belongs_to_team? && has_permission?('contracts.manage'))
  end

  class Scope < Scope
    def resolve
      if admin?
        scope.all
      elsif manager_of_team?
        scope.where(team_id: team.id)
      elsif locataire?
        # Tenants see their own contracts
        scope.joins(:contract_contacts)
             .joins('INNER JOIN contacts ON contract_contacts.contact_id = contacts.id')
             .where(contacts: { user_id: user.id })
      else
        scope.none
      end
    end
  end

  private

  def signatory_of_contract?
    return false unless user.contact

    record.contract_contacts
          .where(contact_id: user.contact.id)
          .exists?
  end
end
```

### 5.5.9 Contact Policy

```ruby
# app/policies/contact_policy.rb
class ContactPolicy < ApplicationPolicy
  def index?
    true
  end

  def show?
    admin? || team_manager_access? || own_contact?
  end

  def create?
    admin? || (manager_of_team? && has_permission?('contacts.create'))
  end

  def update?
    admin? ||
      (belongs_to_team? && has_permission?('contacts.manage')) ||
      own_contact?
  end

  def destroy?
    admin? || (belongs_to_team? && has_permission?('contacts.manage'))
  end

  class Scope < Scope
    def resolve
      if admin?
        scope.all
      elsif manager_of_team?
        scope.where(team_id: team.id)
      else
        # Users see only their own contact
        scope.where(user_id: user.id)
      end
    end
  end

  private

  def own_contact?
    record.user_id == user.id
  end
end
```

### 5.5.10 Notification Policy

```ruby
# app/policies/notification_policy.rb
class NotificationPolicy < ApplicationPolicy
  def index?
    true  # All users can list their notifications
  end

  def show?
    admin? || own_notification?
  end

  def create?
    admin? || manager_of_team?  # Only admins and managers create notifications
  end

  def update?
    admin? || own_notification?  # Mark as read
  end

  def destroy?
    admin? || own_notification?
  end

  def mark_all_as_read?
    true  # Everyone can mark their own as read
  end

  class Scope < Scope
    def resolve
      if admin?
        scope.all
      else
        scope.where(user_id: user.id)
      end
    end
  end

  private

  def own_notification?
    record.user_id == user.id
  end
end
```

### 5.5.11 Conversation Policy

```ruby
# app/policies/conversation_thread_policy.rb
class ConversationThreadPolicy < ApplicationPolicy
  def index?
    true
  end

  def show?
    admin? || participant?
  end

  def create?
    admin? || manager_of_team?
  end

  def send_message?
    admin? || participant?
  end

  class Scope < Scope
    def resolve
      if admin?
        scope.all
      else
        scope.joins(:conversation_participants)
             .where(conversation_participants: { user_id: user.id })
      end
    end
  end

  private

  def participant?
    record.conversation_participants.exists?(user_id: user.id)
  end
end
```

### 5.5.12 Document Policy

```ruby
# app/policies/document_policy.rb
class DocumentPolicy < ApplicationPolicy
  def index?
    true
  end

  def show?
    admin? || can_view_entity?
  end

  def create?
    admin? || can_modify_entity?
  end

  def update?
    admin? || (owns_document? || can_modify_entity?)
  end

  def destroy?
    admin? || (owns_document? || can_modify_entity?)
  end

  def download?
    show?
  end

  class Scope < Scope
    def resolve
      if admin?
        scope.all
      elsif manager_of_team?
        scope.where(team_id: team.id)
      elsif prestataire?
        # Documents on assigned interventions
        scope.where(entity_type: 'intervention')
             .where(entity_id: assigned_intervention_ids)
      elsif locataire?
        # Documents on own lots and interventions
        scope.where(entity_type: 'lot', entity_id: tenant_lot_ids)
             .or(scope.where(entity_type: 'intervention', entity_id: tenant_intervention_ids))
             .where(visibility: ['all', 'tenant'])
      else
        scope.none
      end
    end

    private

    def assigned_intervention_ids
      Intervention.joins(:intervention_assignments)
                  .where(intervention_assignments: { user_id: user.id })
                  .select(:id)
    end

    def tenant_lot_ids
      Lot.joins(contracts: :contract_contacts)
         .joins('INNER JOIN contacts ON contract_contacts.contact_id = contacts.id')
         .where(contacts: { user_id: user.id })
         .select(:id)
    end

    def tenant_intervention_ids
      Intervention.where(lot_id: tenant_lot_ids)
                  .or(Intervention.where(created_by: user.id))
                  .select(:id)
    end
  end

  private

  def owns_document?
    record.uploaded_by == user.id
  end

  def can_view_entity?
    entity_policy&.show?
  end

  def can_modify_entity?
    case record.entity_type
    when 'building'
      Pundit.policy(context, record.entity).manage_documents?
    when 'lot'
      Pundit.policy(context, record.entity).manage_documents?
    when 'intervention'
      Pundit.policy(context, record.entity).update?
    when 'contract'
      Pundit.policy(context, record.entity).update?
    else
      false
    end
  end

  def entity_policy
    return nil unless record.entity
    Pundit.policy(context, record.entity)
  rescue
    nil
  end
end
```

---

## 5.6 Permission Matrix

### 5.6.0 Access Matrix by Database Table

This matrix defines **Pundit policy scoping** for each database table according to user role. Converted from PostgreSQL RLS to Rails Pundit policies.

**Permission Legend:**
| Symbol | Meaning |
|--------|---------|
| CRUD | Create, Read, Update, Delete (full access) |
| R | Read only |
| RU | Read + Update |
| CR | Create + Read |
| RLS | Filtered by `team_id`/`user_id` via `policy_scope` |
| X | No access |
| RBAC | Depends on RBAC permissions |
| Own | Own data only |

#### Phase 1: Users & Teams

| Table | Admin | Gestionnaire | Prestataire | Locataire | Proprietaire | Scope |
|-------|:-----:|:------------:|:-----------:|:---------:|:------------:|-------|
| `users` | CRUD | R team | R assigned | Own self | Own self | `team_members` |
| `teams` | CRUD | RU RBAC | R own | R own | R own | `team_members` |
| `team_members` | CRUD | CRUD RBAC | R own | R own | R own | `team_id` |
| `user_invitations` | CRUD | CRUD RBAC | X | X | X | `team_id` |
| `companies` | CRUD | CRUD | R own | X | R own | `team_id` |
| `company_members` | CRUD | CRUD | R own | X | R own | via `companies` |
| `permissions` | CRUD | R | R | R | R | public |
| `role_default_permissions` | CRUD | R | R | R | R | public |
| `subscriptions` | CRUD | RU RBAC | X | X | X | `team_id` |
| `subscription_invoices` | CRUD | R | X | X | X | via `subscriptions` |

**`team_members` Actions Detail (soft delete with `left_at`):**

| Action | Admin | Gestionnaire | Prestataire | Locataire | Proprietaire |
|--------|:-----:|:------------:|:-----------:|:---------:|:------------:|
| View active members | Yes | Yes team | R self | R self | R self |
| View member history | Yes | Yes team | X | X | X |
| Deactivate member | Yes | Yes non-managers* | X | X | X |
| Reactivate member | Yes | Yes team | X | X | X |

*\* Gestionnaires can only deactivate members with role prestataire/locataire, NOT other gestionnaires. Team owner can deactivate all members except themselves. Deactivating the last admin/gestionnaire is forbidden.*

#### Phase CRM: Contacts

| Table | Admin | Gestionnaire | Prestataire | Locataire | Proprietaire | Scope |
|-------|:-----:|:------------:|:-----------:|:---------:|:------------:|-------|
| `contacts` | CRUD | CRUD RBAC | R assigned | Own self | Own self | `team_id` |
| `building_contacts` | CRUD | CRUD | R assigned | X | R own bldg | via `buildings` |
| `lot_contacts` | CRUD | CRUD | R assigned | R own lot | R own lot | via `lots` |
| `contract_contacts` | CRUD | CRUD | X | R own | R own | via `contracts` |

#### Phase 2: Properties

| Table | Admin | Gestionnaire | Prestataire | Locataire | Proprietaire | Scope |
|-------|:-----:|:------------:|:-----------:|:---------:|:------------:|-------|
| `buildings` | CRUD | CRUD RBAC | R assigned | R own | R own | `team_id` |
| `lots` | CRUD | CRUD RBAC | R assigned | R own | R own | `team_id` |

#### Phase 3: Interventions

| Table | Admin | Gestionnaire | Prestataire | Locataire | Proprietaire | Scope |
|-------|:-----:|:------------:|:-----------:|:---------:|:------------:|-------|
| `interventions` | CRUD | CRUD RBAC | RU assigned | CR own | R own | `team_id` + assignments |
| `intervention_assignments` | CRUD | CRUD | R own | X | X | via `interventions` |
| `intervention_time_slots` | CRUD | CRUD | CR own | R own | R own | via `interventions` |
| `time_slot_responses` | CRUD | CRUD | CR own | CR own | X | via `time_slots` |
| `intervention_quotes` | CRUD | CRUD RBAC | CRUD own | R own | R own | via `interventions` |
| `intervention_comments` | CRUD | CRUD | CR own | CR own | R own | via `interventions` |
| `intervention_reports` | CRUD | CRUD | CRUD own | R own | R own | via `interventions` |
| `intervention_links` | CRUD | CRUD | R | X | X | via `interventions` |

#### Phase 3: Chat & Communication

| Table | Admin | Gestionnaire | Prestataire | Locataire | Proprietaire | Scope |
|-------|:-----:|:------------:|:-----------:|:---------:|:------------:|-------|
| `conversation_threads` | CRUD | CRUD | R participant | R participant | R participant | via `participants` |
| `conversation_messages` | CRUD | CRUD | CR own | CR own | CR own | via `threads` |
| `conversation_participants` | CRUD | CRUD | R own | R own | R own | via `threads` |

#### Phase 3: Notifications & Audit

| Table | Admin | Gestionnaire | Prestataire | Locataire | Proprietaire | Scope |
|-------|:-----:|:------------:|:-----------:|:---------:|:------------:|-------|
| `notifications` | CRUD | RU own | RU own | RU own | RU own | `user_id` |
| `activity_logs` | CRUD | R team | X | X | X | `team_id` |
| `push_subscriptions` | CRUD | CRUD own | CRUD own | CRUD own | CRUD own | `user_id` |

#### Phase 3: Email System

| Table | Admin | Gestionnaire | Prestataire | Locataire | Proprietaire | Scope |
|-------|:-----:|:------------:|:-----------:|:---------:|:------------:|-------|
| `team_email_connections` | CRUD | CRUD RBAC | X | X | X | `team_id` |
| `emails` | CRUD | CRUD | R linked | R linked | R linked | via `connections` |
| `email_attachments` | CRUD | CRUD | R linked | R linked | R linked | via `emails` |
| `email_blacklist` | CRUD | CRUD | X | X | X | `team_id` |

#### Phase 4: Contracts & Import

| Table | Admin | Gestionnaire | Prestataire | Locataire | Proprietaire | Scope |
|-------|:-----:|:------------:|:-----------:|:---------:|:------------:|-------|
| `contracts` | CRUD | CRUD RBAC | X | R own | R own | `team_id` |
| `import_jobs` | CRUD | CRUD | X | X | X | `team_id` |

#### Centralized Documents

| Table | Admin | Gestionnaire | Prestataire | Locataire | Proprietaire | Scope |
|-------|:-----:|:------------:|:-----------:|:---------:|:------------:|-------|
| `documents` | CRUD | CRUD RBAC | R via visibility | R via visibility | R via visibility | `team_id` + `entity_type` + `visibility_level` |

**Document Access Rules:**
- **Admin**: Full access to all documents
- **Gestionnaire**: CRUD on team documents (RBAC = audit creator)
- **Prestataire**: Read if `visibility_level IN ('prestataire', 'public')` OR assigned to intervention
- **Locataire**: Read if `visibility_level IN ('locataire', 'public')` OR linked to their lot/contract
- **Proprietaire**: Read if `visibility_level IN ('locataire', 'public')` OR linked to their property

```ruby
# Example Pundit policy for prestataire document access
class DocumentPolicy < ApplicationPolicy
  class Scope < Scope
    def resolve
      if prestataire?
        scope.where(visibility_level: ['prestataire', 'public'])
             .or(scope.where(entity_type: 'intervention', entity_id: assigned_intervention_ids))
      end
    end
  end
end
```

---

### 5.6.1 SEIDO Permission Codes (28 Permissions)

```ruby
# db/seeds/permissions.rb
PERMISSIONS = [
  # Team permissions (6)
  { code: 'team.view', name: 'View team', description: 'View team settings', category: 'team', sort_order: 1, is_system: true },
  { code: 'team.manage', name: 'Manage team', description: 'Modify team settings', category: 'team', sort_order: 2, is_system: false },
  { code: 'team.managers_invite', name: 'Invite managers', description: 'Create manager accounts', category: 'team', sort_order: 3, is_system: false },
  { code: 'team.managers_manage', name: 'Manage managers', description: 'Modify manager permissions', category: 'team', sort_order: 4, is_system: false },
  { code: 'team.members_invite', name: 'Invite members', description: 'Invite providers/tenants', category: 'team', sort_order: 5, is_system: false },
  { code: 'team.members_manage', name: 'Manage members', description: 'Modify other members permissions', category: 'team', sort_order: 6, is_system: false },

  # Properties permissions (4)
  { code: 'properties.view', name: 'View properties', description: 'View buildings/lots', category: 'properties', sort_order: 10, is_system: true },
  { code: 'properties.create', name: 'Create properties', description: 'Add buildings/lots', category: 'properties', sort_order: 11, is_system: false },
  { code: 'properties.manage', name: 'Manage properties', description: 'Edit/delete properties', category: 'properties', sort_order: 12, is_system: false },
  { code: 'properties.documents', name: 'Manage documents', description: 'Upload/delete documents', category: 'properties', sort_order: 13, is_system: false },

  # Contracts permissions (3)
  { code: 'contracts.view', name: 'View contracts', description: 'View leases', category: 'contracts', sort_order: 20, is_system: true },
  { code: 'contracts.create', name: 'Create contracts', description: 'Add leases', category: 'contracts', sort_order: 21, is_system: false },
  { code: 'contracts.manage', name: 'Manage contracts', description: 'Edit/terminate', category: 'contracts', sort_order: 22, is_system: false },

  # Interventions permissions (4)
  { code: 'interventions.view', name: 'View interventions', description: 'View list', category: 'interventions', sort_order: 30, is_system: true },
  { code: 'interventions.create', name: 'Create interventions', description: 'Create requests', category: 'interventions', sort_order: 31, is_system: false },
  { code: 'interventions.manage', name: 'Manage interventions', description: 'Approve/assign', category: 'interventions', sort_order: 32, is_system: false },
  { code: 'interventions.close', name: 'Close interventions', description: 'Finalize interventions', category: 'interventions', sort_order: 33, is_system: false },

  # Contacts permissions (3)
  { code: 'contacts.view', name: 'View contacts', description: 'View list', category: 'contacts', sort_order: 40, is_system: true },
  { code: 'contacts.create', name: 'Create contacts', description: 'Add contacts', category: 'contacts', sort_order: 41, is_system: false },
  { code: 'contacts.manage', name: 'Manage contacts', description: 'Edit/delete', category: 'contacts', sort_order: 42, is_system: false },

  # Reports permissions (3)
  { code: 'reports.view', name: 'View reports', description: 'Dashboard access', category: 'reports', sort_order: 50, is_system: true },
  { code: 'reports.export', name: 'Export', description: 'CSV/Excel export', category: 'reports', sort_order: 51, is_system: false },
  { code: 'reports.analytics', name: 'Analytics', description: 'Advanced analytics', category: 'reports', sort_order: 52, is_system: false },

  # Billing permissions (5)
  { code: 'billing.subscription_view', name: 'View subscription', description: 'View current plan status', category: 'billing', sort_order: 60, is_system: false },
  { code: 'billing.subscription_manage', name: 'Manage subscription', description: 'Change plan, cancel', category: 'billing', sort_order: 61, is_system: false },
  { code: 'billing.invoices_view', name: 'View invoices', description: 'View invoice history', category: 'billing', sort_order: 62, is_system: false },
  { code: 'billing.invoices_download', name: 'Download invoices', description: 'Export invoices as PDF', category: 'billing', sort_order: 63, is_system: false },
  { code: 'billing.payment_method', name: 'Manage payment', description: 'Change card or IBAN', category: 'billing', sort_order: 64, is_system: false }
].freeze
```

### 5.6.2 Role Default Permissions

```ruby
# db/seeds/role_default_permissions.rb
ROLE_DEFAULTS = {
  # Admin has all permissions (handled by bypass)
  admin: Permission.pluck(:code),

  # Gestionnaire (Property Manager) - Full operational access
  gestionnaire: [
    'team.view', 'team.manage', 'team.members_invite', 'team.members_manage',
    'properties.view', 'properties.create', 'properties.manage', 'properties.documents',
    'contracts.view', 'contracts.create', 'contracts.manage',
    'interventions.view', 'interventions.create', 'interventions.manage', 'interventions.close',
    'contacts.view', 'contacts.create', 'contacts.manage',
    'reports.view', 'reports.export',
    'billing.subscription_view', 'billing.invoices_view', 'billing.invoices_download'
  ],

  # Prestataire (Service Provider) - Limited to assigned interventions
  prestataire: [
    'interventions.view'
    # Other actions controlled by assignment checks
  ],

  # Locataire (Tenant) - Limited to own lot and interventions
  locataire: [
    'properties.view',  # Own lot only (scoped)
    'contracts.view',   # Own contract only (scoped)
    'interventions.view', 'interventions.create'
    # Scoped by policy to own data only
  ],

  # Proprietaire (Property Owner) - Read access to their properties
  proprietaire: [
    'properties.view',  # See their owned properties (via lot_contacts with role='proprietaire')
    'contracts.view',   # See leases on their properties
    'reports.view'      # Basic dashboard for their properties
    # Scoped by policy to properties where they are linked as owner
  ]
}.freeze
```

### 5.6.2.1 Separation of Operational vs Billing Permissions

```
┌─────────────────────────────────────────────────────────────────────────────┐
│               PERMISSION SEPARATION BY DOMAIN                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────────────────────┐    ┌───────────────────────────────┐     │
│  │      OPERATIONAL              │    │      BILLING                  │     │
│  │      (17 permissions)         │    │      (5 permissions)          │     │
│  ├───────────────────────────────┤    ├───────────────────────────────┤     │
│  │                               │    │                               │     │
│  │  Properties (4)               │    │  Subscription                 │     │
│  │  * properties.view            │    │  * billing.subscription_view  │     │
│  │  * properties.create          │    │  * billing.subscription_manage│     │
│  │  * properties.manage          │    │                               │     │
│  │  * properties.documents       │    │  Invoices                     │     │
│  │                               │    │  * billing.invoices_view      │     │
│  │  Contracts (3)                │    │  * billing.invoices_download  │     │
│  │  * contracts.view             │    │                               │     │
│  │  * contracts.create           │    │  Payment                      │     │
│  │  * contracts.manage           │    │  * billing.payment_method     │     │
│  │                               │    │                               │     │
│  │  Interventions (4)            │    └───────────────────────────────┘     │
│  │  * interventions.view         │                                          │
│  │  * interventions.create       │    ┌───────────────────────────────┐     │
│  │  * interventions.manage       │    │      TEAM                     │     │
│  │  * interventions.close        │    │      (6 permissions)          │     │
│  │                               │    ├───────────────────────────────┤     │
│  │  Contacts (3)                 │    │  * team.view                  │     │
│  │  * contacts.view              │    │  * team.manage                │     │
│  │  * contacts.create            │    │  * team.managers_invite       │     │
│  │  * contacts.manage            │    │  * team.managers_manage       │     │
│  │                               │    │  * team.members_invite        │     │
│  │  Reports (3)                  │    │  * team.members_manage        │     │
│  │  * reports.view               │    └───────────────────────────────┘     │
│  │  * reports.export             │                                          │
│  │  * reports.analytics          │                                          │
│  └───────────────────────────────┘                                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Key Principle: Separation of Concerns**

> **Billing Admin** can manage subscription and view invoices without touching business data.
> **Operational Admin** can manage all properties/interventions without access to payment information.

This separation enables:
- **Accountant**: access only to `billing.*` -- manages invoices without seeing real estate data
- **Standard Manager**: access to `properties.*`, `contracts.*`, etc. -- works without seeing payment data
- **Team Owner**: TOTAL access via `is_team_owner = TRUE` flag -- automatic bypass

**Privilege Escalation Protection**: `team.managers_*` permissions are HIGH RISK and reserved for Admin/Team Owner only by default. Standard gestionnaires cannot create other gestionnaires.

### 5.6.3 Permission Matrix by Role

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              SEIDO PERMISSION MATRIX                                     │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                          │
│  Permission              | Admin | Gestionnaire | Prestataire | Locataire | Proprietaire │
│  ========================|=======|==============|=============|===========|=============│
│                                                                                          │
│  TEAM                                                                                    │
│  ──────────────────────────────────────────────────────────────────────────────────────  │
│  team.view               |  Yes  |     Yes      |     No      |     No    |     No      │
│  team.manage             |  Yes  |     Yes      |     No      |     No    |     No      │
│  team.managers_invite    |  Yes  |     Cfg      |     No      |     No    |     No      │
│  team.managers_manage    |  Yes  |     Cfg      |     No      |     No    |     No      │
│  team.members_invite     |  Yes  |     Yes      |     No      |     No    |     No      │
│  team.members_manage     |  Yes  |     Yes      |     No      |     No    |     No      │
│                                                                                          │
│  PROPERTIES                                                                              │
│  ──────────────────────────────────────────────────────────────────────────────────────  │
│  properties.view         |  Yes  |     Yes      |     Scoped  |     Scoped|     Scoped  │
│  properties.create       |  Yes  |     Yes      |     No      |     No    |     No      │
│  properties.manage       |  Yes  |     Yes      |     No      |     No    |     No      │
│  properties.documents    |  Yes  |     Yes      |     No      |     No    |     No      │
│                                                                                          │
│  CONTRACTS                                                                               │
│  ──────────────────────────────────────────────────────────────────────────────────────  │
│  contracts.view          |  Yes  |     Yes      |     No      |     Scoped|     Scoped  │
│  contracts.create        |  Yes  |     Yes      |     No      |     No    |     No      │
│  contracts.manage        |  Yes  |     Yes      |     No      |     No    |     No      │
│                                                                                          │
│  INTERVENTIONS                                                                           │
│  ──────────────────────────────────────────────────────────────────────────────────────  │
│  interventions.view      |  Yes  |     Yes      |     Scoped  |     Scoped|     Scoped  │
│  interventions.create    |  Yes  |     Yes      |     No      |     Scoped|     No      │
│  interventions.manage    |  Yes  |     Yes      |     No      |     No    |     No      │
│  interventions.close     |  Yes  |     Yes      |     No      |     No    |     No      │
│                                                                                          │
│  CONTACTS                                                                                │
│  ──────────────────────────────────────────────────────────────────────────────────────  │
│  contacts.view           |  Yes  |     Yes      |     No      |     Scoped|     Scoped  │
│  contacts.create         |  Yes  |     Yes      |     No      |     No    |     No      │
│  contacts.manage         |  Yes  |     Yes      |     No      |     No    |     No      │
│                                                                                          │
│  REPORTS                                                                                 │
│  ──────────────────────────────────────────────────────────────────────────────────────  │
│  reports.view            |  Yes  |     Yes      |     No      |     No    |     No      │
│  reports.export          |  Yes  |     Yes      |     No      |     No    |     No      │
│  reports.analytics       |  Yes  |     Cfg      |     No      |     No    |     No      │
│                                                                                          │
│  BILLING                                                                                 │
│  ──────────────────────────────────────────────────────────────────────────────────────  │
│  billing.subscription_*  |  Yes  |     Cfg      |     No      |     No    |     No      │
│  billing.invoices_*      |  Yes  |     Yes      |     No      |     No    |     No      │
│  billing.payment_method  |  Yes  |     Cfg      |     No      |     No    |     No      │
│                                                                                          │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│  LEGEND:                                                                                 │
│  Yes = Full access (all records)                                                         │
│  Scoped = Scoped access (own records only via policy_scope)                              │
│  Cfg = Configurable via team_members.permissions[] (team owner can grant/revoke)         │
│  No = No access                                                                          │
│                                                                                          │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### 5.6.4 Action Permissions by Role (Intervention Workflow)

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                    INTERVENTION WORKFLOW PERMISSIONS BY ROLE                             │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                          │
│  Action                  | Admin | Gestionnaire | Prestataire | Locataire               │
│  ========================|=======|==============|=============|=========================│
│                                                                                          │
│  CREATE INTERVENTION                                                                     │
│  ──────────────────────────────────────────────────────────────────────────────────────  │
│  Create request          |  Yes  |     Yes      |     No      |  Yes (own lot only)     │
│                                                                                          │
│  STATUS TRANSITIONS                                                                      │
│  ──────────────────────────────────────────────────────────────────────────────────────  │
│  demande -> approuvee    |  Yes  |     Yes      |     No      |     No                  │
│  demande -> rejetee      |  Yes  |     Yes      |     No      |     No                  │
│  approuvee -> devis      |  Yes  |     Yes      |     No      |     No                  │
│  -> planification        |  Yes  |     Yes      |     Yes     |     No                  │
│  -> planifiee            |  Yes  |     Yes      |     Yes     |     Yes (select slot)   │
│  -> cloturee_prestataire |  Yes  |     No       |     Yes     |     No                  │
│  -> cloturee_locataire   |  Yes  |     No       |     No      |     Yes                 │
│  -> cloturee_gestionnaire|  Yes  |     Yes      |     No      |     No                  │
│  ANY -> annulee          |  Yes  |     Yes      |     No      |     No                  │
│                                                                                          │
│  QUOTES                                                                                  │
│  ──────────────────────────────────────────────────────────────────────────────────────  │
│  Create quote            |  Yes  |     No       |  Yes (assigned)|     No               │
│  View all quotes         |  Yes  |     Yes      |  Yes (own only)|     No               │
│  Approve/reject quote    |  Yes  |     Yes      |     No      |     No                  │
│                                                                                          │
│  TIME SLOTS                                                                              │
│  ──────────────────────────────────────────────────────────────────────────────────────  │
│  Propose time slot       |  Yes  |     Yes      |  Yes (assigned)|     No               │
│  Select time slot        |  Yes  |     Yes      |     No      |     Yes                 │
│                                                                                          │
│  CHAT                                                                                    │
│  ──────────────────────────────────────────────────────────────────────────────────────  │
│  Send message            |  Yes  |  Yes (participant)| Yes (participant)| Yes (participant)│
│  View thread             |  Yes  |  Yes (participant)| Yes (participant)| Yes (participant)│
│                                                                                          │
│  DOCUMENTS                                                                               │
│  ──────────────────────────────────────────────────────────────────────────────────────  │
│  Upload document         |  Yes  |     Yes      |  Yes (assigned)|  Yes (own intervention)│
│  View documents          |  Yes  |     Yes      |  Yes (assigned)|  Scoped (visibility)  │
│                                                                                          │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### 5.6.5 Real-World Profile Examples

These examples show how the permission system works in practice with different user configurations.

#### Profile 1: Accountant (Comptable)

```ruby
# Marie is an accountant at "Immo Paris"
team_member = TeamMember.find_by(user: marie, team: immo_paris)
# Configuration:
team_member.role = 'gestionnaire'
team_member.permissions = ['billing.subscription_view', 'billing.subscription_manage',
                            'billing.invoices_view', 'billing.invoices_download',
                            'billing.payment_method']

# Result:
# -> Full billing access
# -> NO access to properties/interventions/contacts (custom permissions override defaults)
```

**Use Case**: Company needs a dedicated accountant with access to invoices only, without seeing real estate data.

#### Profile 2: Standard Property Manager (Gestionnaire Standard)

```ruby
# Jean is a property manager at "Immo Paris"
team_member = TeamMember.find_by(user: jean, team: immo_paris)
# Configuration:
team_member.role = 'gestionnaire'
team_member.permissions = nil  # Uses role defaults

# Result:
# -> Fallback to role_default_permissions for 'gestionnaire'
# -> Full operational access (properties, interventions, contacts, contracts)
# -> CAN invite prestataires, locataires, proprietaires (team.members_invite)
# -> CANNOT create other gestionnaires (team.managers_invite = not granted)
# -> NO billing access
```

**Use Case**: Standard property manager handling day-to-day operations.

#### Profile 3: Property Manager + Invoice Access (Gestionnaire + Finance)

```ruby
# Sophie is a senior property manager at "Immo Paris"
team_member = TeamMember.find_by(user: sophie, team: immo_paris)
# Configuration:
team_member.role = 'gestionnaire'
team_member.permissions = ['billing.invoices_view', 'billing.invoices_download']

# Result:
# -> Full operational access (via role defaults, since custom doesn't include properties.*)
# -> Invoice viewing access (via explicit custom permissions)
# -> NO subscription management
```

**Note**: When `permissions[]` is set (non-NULL), it **REPLACES** defaults unless explicitly merged. For additive permissions, include all needed codes.

#### Profile 4: Team Owner

```ruby
# Thomas created the "Immo Paris" team
team_member = TeamMember.find_by(user: thomas, team: immo_paris)
# Configuration:
team_member.is_team_owner = true

# Result:
# -> has_permission?(ANY_CODE, immo_paris) = TRUE (always)
# -> TOTAL access (operational + billing + team)
# -> Complete bypass, no permission checks needed
```

**Use Case**: Business owner or primary administrator with full control.

#### Profile 5: HR Manager (Gestionnaire RH)

```ruby
# Lucie handles recruitment at "Immo Paris"
team_member = TeamMember.find_by(user: lucie, team: immo_paris)
# Configuration:
team_member.role = 'gestionnaire'
team_member.permissions = ['team.managers_invite', 'team.managers_manage']

# Result:
# -> CAN invite gestionnaires (explicit team.managers_invite)
# -> CAN manage gestionnaire permissions (explicit team.managers_manage)
# -> Full operational access via role defaults (properties, interventions, etc.)
# -> CAN also invite field members via defaults (team.members_invite)
# -> NO billing access
```

**Use Case**: HR person dedicated to recruiting and managing gestionnaires without full owner access.

#### Permission Resolution Flow

```ruby
# lib/services/permission_resolver.rb
class PermissionResolver
  def has_permission?(user, permission_code, team)
    membership = user.team_members.find_by(team: team)
    return false unless membership

    # Step 1: Admin bypass
    return true if user.admin?

    # Step 2: Team Owner bypass
    return true if membership.is_team_owner?

    # Step 3: Custom permissions (if set)
    if membership.permissions.present?
      return membership.permissions.include?(permission_code)
    end

    # Step 4: Role defaults fallback
    role_defaults = RoleDefaultPermission.where(role: membership.role).pluck(:permission_code)
    role_defaults.include?(permission_code)
  end
end
```

---

## 5.7 User Model Authorization Methods

Add these methods to the User model for convenient authorization checks:

```ruby
# app/models/user.rb
class User < ApplicationRecord
  include Discard::Model

  # Associations
  has_many :team_members, dependent: :destroy
  has_many :teams, through: :team_members
  has_one :contact, dependent: :nullify
  has_many :created_interventions, class_name: 'Intervention', foreign_key: :created_by
  has_many :intervention_assignments
  has_many :assigned_interventions, through: :intervention_assignments, source: :intervention

  # Devise
  devise :database_authenticatable, :registerable, :recoverable, :rememberable, :validatable,
         :jwt_authenticatable, jwt_revocation_strategy: JwtDenylist

  # Enums
  enum :role, { admin: 'admin', gestionnaire: 'gestionnaire', prestataire: 'prestataire', locataire: 'locataire' }

  # Role checks
  def admin?
    role == 'admin'
  end

  def gestionnaire?
    role == 'gestionnaire'
  end

  def prestataire?
    role == 'prestataire'
  end

  def locataire?
    role == 'locataire'
  end

  # Team methods
  def member_of?(team)
    team_members.where(team: team, discarded_at: nil).exists?
  end

  def active_member_of?(team)
    team_members.kept.where(team: team).exists?
  end

  def manager_of?(team)
    return true if admin?
    team_members.kept.where(team: team, role: %w[admin gestionnaire]).exists?
  end

  def team_owner_of?(team)
    team_members.kept.where(team: team, is_team_owner: true).exists?
  end

  def current_team
    @current_team ||= teams.kept.first
  end

  def current_team=(team)
    @current_team = team
  end

  # Permission checks
  def has_permission?(permission_code, team = current_team)
    return true if admin?
    return false unless team

    membership = team_members.kept.find_by(team: team)
    return false unless membership
    return true if membership.is_team_owner?

    # Check custom permissions
    if membership.permissions&.any?
      return membership.permissions.include?(permission_code.to_s)
    end

    # Check role defaults
    default_permissions.include?(permission_code.to_s)
  end

  def permissions_for(team)
    return Permission.pluck(:code) if admin?

    membership = team_members.kept.find_by(team: team)
    return [] unless membership
    return Permission.pluck(:code) if membership.is_team_owner?

    membership.permissions.presence || default_permissions
  end

  # Intervention assignment checks
  def assigned_to?(intervention)
    intervention_assignments.where(intervention: intervention).exists?
  end

  # Property access checks
  def tenant_of?(lot)
    return false unless contact

    lot.contracts.active
       .joins(:contract_contacts)
       .where(contract_contacts: { contact_id: contact.id, role: %w[locataire colocataire] })
       .exists?
  end

  def owner_of?(lot)
    return false unless contact

    lot.lot_contacts
       .where(contact_id: contact.id, contact_role: 'proprietaire')
       .exists?
  end

  private

  def default_permissions
    RoleDefaultPermission
      .joins(:permission)
      .where(role: role)
      .pluck('permissions.code')
  end
end
```

---

## 5.8 Controller Authorization Pattern

### 5.8.1 Standard Controller Pattern

```ruby
# app/controllers/api/v1/buildings_controller.rb
module Api
  module V1
    class BuildingsController < ApplicationController
      def index
        @buildings = policy_scope(Building).includes(:lots, :building_contacts)
        render json: BuildingSerializer.new(@buildings)
      end

      def show
        @building = Building.find(params[:id])
        authorize @building
        render json: BuildingSerializer.new(@building)
      end

      def create
        @building = Building.new(building_params)
        authorize @building

        if @building.save
          render json: BuildingSerializer.new(@building), status: :created
        else
          render json: { errors: @building.errors }, status: :unprocessable_entity
        end
      end

      def update
        @building = Building.find(params[:id])
        authorize @building

        if @building.update(building_params)
          render json: BuildingSerializer.new(@building)
        else
          render json: { errors: @building.errors }, status: :unprocessable_entity
        end
      end

      def destroy
        @building = Building.find(params[:id])
        authorize @building

        @building.discard
        head :no_content
      end

      private

      def building_params
        params.require(:building).permit(:name, :address, :city, :postal_code, :description)
      end
    end
  end
end
```

### 5.8.2 Intervention Controller with Custom Actions

```ruby
# app/controllers/api/v1/interventions_controller.rb
module Api
  module V1
    class InterventionsController < ApplicationController
      def index
        @interventions = policy_scope(Intervention)
                          .includes(:lot, :building, :intervention_assignments)
        render json: InterventionSerializer.new(@interventions)
      end

      def show
        @intervention = Intervention.find(params[:id])
        authorize @intervention
        render json: InterventionSerializer.new(@intervention, include: [:quotes, :time_slots])
      end

      def create
        @intervention = Intervention.new(intervention_params)
        @intervention.created_by = current_user.id
        authorize @intervention

        if @intervention.save
          Interventions::CreatedNotifier.call(@intervention)
          render json: InterventionSerializer.new(@intervention), status: :created
        else
          render json: { errors: @intervention.errors }, status: :unprocessable_entity
        end
      end

      # Custom workflow actions
      def approve
        @intervention = Intervention.find(params[:id])
        authorize @intervention

        if @intervention.may_approve? && @intervention.approve!
          render json: InterventionSerializer.new(@intervention)
        else
          render json: { error: 'Cannot approve intervention' }, status: :unprocessable_entity
        end
      end

      def reject
        @intervention = Intervention.find(params[:id])
        authorize @intervention

        if @intervention.may_reject? && @intervention.reject!
          render json: InterventionSerializer.new(@intervention)
        else
          render json: { error: 'Cannot reject intervention' }, status: :unprocessable_entity
        end
      end

      def assign_provider
        @intervention = Intervention.find(params[:id])
        authorize @intervention

        provider = User.find(params[:provider_id])
        assignment = @intervention.intervention_assignments.build(
          user: provider,
          assignment_role: 'prestataire',
          assigned_by: current_user.id
        )

        if assignment.save
          Interventions::AssignedNotifier.call(@intervention, provider)
          render json: InterventionSerializer.new(@intervention)
        else
          render json: { errors: assignment.errors }, status: :unprocessable_entity
        end
      end

      def close_as_provider
        @intervention = Intervention.find(params[:id])
        authorize @intervention

        if @intervention.may_close_by_provider? && @intervention.close_by_provider!
          render json: InterventionSerializer.new(@intervention)
        else
          render json: { error: 'Cannot close intervention' }, status: :unprocessable_entity
        end
      end

      def close_as_tenant
        @intervention = Intervention.find(params[:id])
        authorize @intervention

        if @intervention.may_close_by_tenant? && @intervention.close_by_tenant!
          render json: InterventionSerializer.new(@intervention)
        else
          render json: { error: 'Cannot validate intervention' }, status: :unprocessable_entity
        end
      end

      def close_as_manager
        @intervention = Intervention.find(params[:id])
        authorize @intervention

        @intervention.assign_attributes(closure_params)
        if @intervention.may_close_by_manager? && @intervention.close_by_manager!
          render json: InterventionSerializer.new(@intervention)
        else
          render json: { error: 'Cannot finalize intervention' }, status: :unprocessable_entity
        end
      end

      def cancel
        @intervention = Intervention.find(params[:id])
        authorize @intervention

        if @intervention.may_cancel? && @intervention.cancel!
          render json: InterventionSerializer.new(@intervention)
        else
          render json: { error: 'Cannot cancel intervention' }, status: :unprocessable_entity
        end
      end

      private

      def intervention_params
        params.require(:intervention).permit(
          :lot_id, :building_id, :title, :description, :priority,
          :intervention_type, :access_type, :access_details
        )
      end

      def closure_params
        params.require(:intervention).permit(:actual_cost, :gestionnaire_notes)
      end
    end
  end
end
```

---

## 5.9 Testing Pundit Policies

### 5.9.1 RSpec Configuration

```ruby
# spec/support/pundit.rb
require 'pundit/rspec'

RSpec.configure do |config|
  config.include Pundit::RSpec::Matchers
end
```

### 5.9.2 Policy Spec Example

```ruby
# spec/policies/building_policy_spec.rb
require 'rails_helper'

RSpec.describe BuildingPolicy, type: :policy do
  subject { described_class }

  let(:team) { create(:team) }
  let(:other_team) { create(:team) }
  let(:building) { create(:building, team: team) }
  let(:other_building) { create(:building, team: other_team) }

  let(:admin) { create(:user, :admin) }
  let(:manager) { create(:user, :gestionnaire) }
  let(:manager_membership) { create(:team_member, user: manager, team: team, role: 'gestionnaire') }
  let(:provider) { create(:user, :prestataire) }
  let(:tenant) { create(:user, :locataire) }

  def context_for(user, team = nil)
    UserContext.new(user, team)
  end

  describe '#index?' do
    it { expect(subject.new(context_for(admin, team), Building)).to permit_action(:index) }
    it { expect(subject.new(context_for(manager, team), Building)).to permit_action(:index) }
    it { expect(subject.new(context_for(provider, team), Building)).to permit_action(:index) }
    it { expect(subject.new(context_for(tenant, team), Building)).to permit_action(:index) }
  end

  describe '#show?' do
    context 'admin' do
      it 'permits access to any building' do
        expect(subject.new(context_for(admin, team), building)).to permit_action(:show)
        expect(subject.new(context_for(admin, team), other_building)).to permit_action(:show)
      end
    end

    context 'manager in team' do
      before { manager_membership }

      it 'permits access to team buildings' do
        expect(subject.new(context_for(manager, team), building)).to permit_action(:show)
      end

      it 'forbids access to other team buildings' do
        expect(subject.new(context_for(manager, team), other_building)).to forbid_action(:show)
      end
    end

    context 'provider' do
      let(:intervention) { create(:intervention, lot: create(:lot, building: building)) }

      before do
        create(:intervention_assignment, intervention: intervention, user: provider)
      end

      it 'permits access to buildings with assigned interventions' do
        expect(subject.new(context_for(provider, team), building)).to permit_action(:show)
      end

      it 'forbids access to buildings without assigned interventions' do
        expect(subject.new(context_for(provider, team), other_building)).to forbid_action(:show)
      end
    end
  end

  describe '#create?' do
    context 'admin' do
      it { expect(subject.new(context_for(admin, team), Building.new)).to permit_action(:create) }
    end

    context 'manager with permission' do
      before do
        manager_membership
        manager_membership.update!(permissions: ['properties.create'])
      end

      it { expect(subject.new(context_for(manager, team), Building.new)).to permit_action(:create) }
    end

    context 'manager without permission' do
      before do
        manager_membership
        manager_membership.update!(permissions: ['properties.view'])
      end

      it { expect(subject.new(context_for(manager, team), Building.new)).to forbid_action(:create) }
    end

    context 'provider' do
      it { expect(subject.new(context_for(provider, team), Building.new)).to forbid_action(:create) }
    end

    context 'tenant' do
      it { expect(subject.new(context_for(tenant, team), Building.new)).to forbid_action(:create) }
    end
  end

  describe 'Scope' do
    before do
      building
      other_building
      manager_membership
    end

    context 'admin' do
      it 'returns all buildings' do
        scope = described_class::Scope.new(context_for(admin, team), Building)
        expect(scope.resolve).to include(building, other_building)
      end
    end

    context 'manager' do
      it 'returns only team buildings' do
        scope = described_class::Scope.new(context_for(manager, team), Building)
        expect(scope.resolve).to include(building)
        expect(scope.resolve).not_to include(other_building)
      end
    end
  end
end
```

### 5.9.3 Controller Spec with Authorization

```ruby
# spec/requests/api/v1/buildings_spec.rb
require 'rails_helper'

RSpec.describe 'Api::V1::Buildings', type: :request do
  let(:team) { create(:team) }
  let(:manager) { create(:user, :gestionnaire) }
  let!(:membership) { create(:team_member, user: manager, team: team, role: 'gestionnaire', is_team_owner: true) }
  let(:building) { create(:building, team: team) }
  let(:headers) { { 'Authorization' => "Bearer #{jwt_for(manager)}" } }

  describe 'GET /api/v1/buildings' do
    before { building }

    it 'returns team buildings' do
      get '/api/v1/buildings', headers: headers

      expect(response).to have_http_status(:ok)
      expect(json_response['data'].size).to eq(1)
    end
  end

  describe 'POST /api/v1/buildings' do
    let(:valid_params) do
      {
        building: {
          name: 'New Building',
          address: '123 Test St',
          city: 'Paris',
          postal_code: '75001'
        }
      }
    end

    context 'with permission' do
      it 'creates a building' do
        expect {
          post '/api/v1/buildings', params: valid_params, headers: headers
        }.to change(Building, :count).by(1)

        expect(response).to have_http_status(:created)
      end
    end

    context 'without permission' do
      before do
        membership.update!(permissions: ['properties.view'], is_team_owner: false)
      end

      it 'returns forbidden' do
        post '/api/v1/buildings', params: valid_params, headers: headers
        expect(response).to have_http_status(:forbidden)
      end
    end
  end
end
```

---

## 5.10 Error Handling

### 5.10.1 Pundit Error Handler

```ruby
# app/controllers/application_controller.rb
class ApplicationController < ActionController::Base
  include Pundit::Authorization

  rescue_from Pundit::NotAuthorizedError, with: :user_not_authorized

  private

  def user_not_authorized(exception)
    policy_name = exception.policy.class.to_s.underscore
    action = exception.query.to_s.delete('?')

    error_message = I18n.t(
      "pundit.#{policy_name}.#{action}",
      default: I18n.t('pundit.default', default: 'You are not authorized to perform this action.')
    )

    respond_to do |format|
      format.json { render json: { error: error_message }, status: :forbidden }
      format.html { redirect_back fallback_location: root_path, alert: error_message }
    end
  end
end
```

### 5.10.2 Internationalization

```yaml
# config/locales/pundit.en.yml
en:
  pundit:
    default: "You are not authorized to perform this action."
    building_policy:
      show?: "You don't have access to view this building."
      create?: "You don't have permission to create buildings."
      update?: "You don't have permission to modify this building."
      destroy?: "You don't have permission to delete this building."
    intervention_policy:
      show?: "You don't have access to view this intervention."
      approve?: "Only property managers can approve interventions."
      close_as_provider?: "Only assigned service providers can mark work as complete."
      close_as_tenant?: "Only tenants can validate completed work."
      close_as_manager?: "Only property managers can finalize interventions."
```

---

*End of Section 5 - Authorization (Pundit)*

---
