> Part of [SEIDO Rails Architecture](../seido-rails-architecture.md)

---

← Previous: [Overview](01-overview-personas.md) | Next: [Data Models](03-data-models.md) →

---

# 2. Tech Stack

This section describes the recommended technology stack for implementing SEIDO in Ruby on Rails.

## 2.1 Core Versions

> ⚠️ **IMPORTANT: Rails 7.1 End-of-Life**
>
> Rails 7.1 reaches **end-of-security-support on October 1, 2025**.
> For new deployments in 2025+, consider:
> - **Rails 7.2** (requires Ruby 3.1.0+) - Current LTS, security support until 2027
> - **Rails 8.0** (requires Ruby 3.2.0+) - Latest stable, recommended for new projects
>
> This document uses Rails 7.1.3 as reference. All patterns remain compatible with Rails 7.2+ and Rails 8.0.

```ruby
# Gemfile
ruby '3.3.0'

gem 'rails', '~> 7.1.3'      # Upgrade to 7.2+ or 8.0 for new projects
gem 'pg', '~> 1.5'           # PostgreSQL 15+
gem 'redis', '~> 5.0'        # Redis 7.0+
gem 'puma', '~> 7.0'         # Application server (2025 current)
```

### Version Requirements

| Component | Minimum Version | Recommended | Notes |
|-----------|----------------|-------------|-------|
| Ruby | 3.2.0 | 3.3.0 | YJIT enabled for performance |
| Rails | 7.1.0 | 7.2+ / 8.0 | 7.1 EOL Oct 2025 - upgrade recommended |
| PostgreSQL | 14 | 15+ | UUID, JSONB, partial indexes |
| Redis | 6.2 | 7.0+ | ActionCable, Sidekiq, caching |
| Node.js | 18 | 20 LTS | Asset compilation (if using JS) |
| Puma | 6.0 | 7.0+ | Better metrics, improved keepalive |

---

## 2.2 Essential Gems

### 2.2.1 Authentication & Authorization

```ruby
# Authentication
gem 'devise', '~> 4.9'              # User authentication
gem 'devise-jwt', '~> 0.11'         # JWT tokens for API auth
gem 'omniauth', '~> 2.1'            # OAuth providers (optional)
gem 'omniauth-google-oauth2'        # Google login (optional)

# Authorization
gem 'pundit', '~> 2.3'              # Policy-based authorization
```

**Comparison with Next.js/Supabase:**

| Feature | Next.js/Supabase | Rails Equivalent |
|---------|-----------------|------------------|
| User auth | Supabase Auth | Devise |
| JWT tokens | Supabase JWT | devise-jwt |
| Magic links | Supabase magic link | devise-passwordless gem |
| OAuth | Supabase OAuth | OmniAuth |
| Row-level security | PostgreSQL RLS | Pundit policies |

### 2.2.2 Multi-Tenancy

```ruby
# Multi-tenant scoping
gem 'acts_as_tenant', '~> 0.6'      # Automatic team scoping
```

**How it works:**

```ruby
# Model
class Building < ApplicationRecord
  acts_as_tenant(:team)  # Adds automatic WHERE team_id = current_tenant.id
end

# Controller
class ApplicationController < ActionController::Base
  set_current_tenant_through_filter
  before_action :set_tenant

  private

  def set_tenant
    ActsAsTenant.current_tenant = current_user&.current_team
  end
end
```

### 2.2.3 State Machine

```ruby
# State machine for intervention workflow
gem 'aasm', '~> 5.5'
```

**Example usage:**

```ruby
class Intervention < ApplicationRecord
  include AASM

  aasm column: :status, enum: true do
    state :demande, initial: true
    state :approuvee
    state :planifiee
    # ... other states

    event :approve do
      transitions from: :demande, to: :approuvee
      after do
        notify_tenant!
        create_activity_log!
      end
    end
  end
end
```

### 2.2.4 Background Jobs

```ruby
# Background job processing
gem 'sidekiq', '~> 8.0'              # 2025 current - Valkey/Dragonfly support
gem 'sidekiq-cron', '~> 2.0'         # Scheduled jobs (updated for Sidekiq 8)
gem 'sidekiq-unique-jobs', '~> 8.0'  # Prevent duplicate jobs
```

> ⚠️ **Sidekiq 8.0 Breaking Changes**
> - New `Sidekiq::Job` base class (replaces `Sidekiq::Worker`)
> - Redis 6.2+ required, Valkey and Dragonfly officially supported
> - `sidekiq-cron` requires version 2.0+ for Sidekiq 8 compatibility

**Configuration:**

```ruby
# config/sidekiq.yml
#
# IMPORTANT: Concurrency limits
# - Never exceed 50 (Sidekiq OSS limit)
# - Typical production: 5-25 based on workload
# - Must match DATABASE_POOL_SIZE in config/database.yml
# - Formula: pool_size >= sidekiq_concurrency + web_server_threads + 5
#
:concurrency: <%= ENV.fetch('SIDEKIQ_CONCURRENCY', 10) %>
:queues:
  - [critical, 3]
  - [default, 2]
  - [low, 1]

# config/initializers/sidekiq.rb
Sidekiq.configure_server do |config|
  config.redis = { url: ENV['REDIS_URL'] }
end
```

### 2.2.5 Real-time Communication

```ruby
# ActionCable is built into Rails
# Additional gems for WebPush
gem 'web-push', '~> 3.0'           # WebPush notifications
```

**Channels structure:**

```ruby
# app/channels/notifications_channel.rb
class NotificationsChannel < ApplicationCable::Channel
  def subscribed
    stream_for current_user
  end
end

# Broadcasting
NotificationsChannel.broadcast_to(user, {
  type: 'intervention_status',
  intervention_id: intervention.id,
  new_status: intervention.status
})
```

### 2.2.6 API & Serialization

```ruby
# JSON serialization
gem 'alba', '~> 3.0'               # Fast JSON serializer
# OR
gem 'blueprinter', '~> 0.25'       # Simple, fast serialization

# API documentation
gem 'rswag', '~> 2.13'             # OpenAPI/Swagger docs

# Rate limiting
gem 'rack-attack', '~> 6.7'        # Request throttling
```

### 2.2.7 File Storage

```ruby
# ActiveStorage is built into Rails
# Additional for S3
gem 'aws-sdk-s3', '~> 1.146'

# Image processing
gem 'image_processing', '~> 1.12'
```

**Configuration:**

```yaml
# config/storage.yml
amazon:
  service: S3
  access_key_id: <%= ENV['AWS_ACCESS_KEY_ID'] %>
  secret_access_key: <%= ENV['AWS_SECRET_ACCESS_KEY'] %>
  region: eu-west-1
  bucket: seido-production
```

### 2.2.8 Email

```ruby
# ActionMailer is built into Rails
# Resend as provider
gem 'resend', '~> 0.8'

# Email templates (optional)
gem 'mjml-rails', '~> 4.4'         # MJML responsive emails
```

### 2.2.9 Soft Delete

```ruby
# Soft delete (recommended)
gem 'discard', '~> 1.3'
```

**Usage:**

```ruby
class Building < ApplicationRecord
  include Discard::Model
  # Adds discarded_at column, .kept scope, .discarded scope
end

Building.kept          # WHERE discarded_at IS NULL
Building.discarded     # WHERE discarded_at IS NOT NULL
building.discard       # Sets discarded_at = Time.current
building.undiscard     # Sets discarded_at = NULL
```

### 2.2.10 Payments (Stripe)

```ruby
gem 'stripe', '~> 10.0'
gem 'pay', '~> 7.0'                # Stripe subscription helper (optional)
```

### 2.2.11 Testing

```ruby
group :development, :test do
  gem 'rspec-rails', '~> 6.1'
  gem 'factory_bot_rails', '~> 6.4'
  gem 'faker', '~> 3.2'
  gem 'shoulda-matchers', '~> 6.0'
end

group :test do
  gem 'capybara', '~> 3.40'
  gem 'selenium-webdriver', '~> 4.16'
  gem 'webmock', '~> 3.19'
  gem 'vcr', '~> 6.2'
  gem 'simplecov', '~> 0.22'
end
```

### 2.2.12 Development Tools

```ruby
group :development do
  gem 'annotate', '~> 3.2'         # Schema annotations in models
  gem 'bullet', '~> 7.1'           # N+1 query detection
  gem 'rubocop-rails', '~> 2.23'   # Linting
  gem 'brakeman', '~> 6.1'         # Security scanner
  gem 'better_errors', '~> 2.10'   # Better error pages
  gem 'binding_of_caller', '~> 1.0'
end
```

---

## 2.3 Complete Gemfile

```ruby
# Gemfile
source 'https://rubygems.org'

ruby '3.3.0'

# Core
gem 'rails', '~> 7.1.3'    # Upgrade to 7.2+ or 8.0 for new projects
gem 'pg', '~> 1.5'
gem 'puma', '~> 7.0'       # 2025 current - better metrics, improved keepalive
gem 'redis', '~> 5.0'
gem 'bootsnap', require: false

# Authentication & Authorization
gem 'devise', '~> 4.9'
gem 'devise-jwt', '~> 0.11'
gem 'pundit', '~> 2.3'

# Multi-tenancy
gem 'acts_as_tenant', '~> 0.6'

# State Machine
gem 'aasm', '~> 5.5'

# Background Jobs
gem 'sidekiq', '~> 8.0'    # 2025 current - Valkey/Dragonfly support
gem 'sidekiq-cron', '~> 2.0'

# API
gem 'alba', '~> 3.0'
gem 'rack-attack', '~> 6.7'
gem 'rack-cors', '~> 2.0'

# Storage
gem 'aws-sdk-s3', '~> 1.146'
gem 'image_processing', '~> 1.12'

# Email
gem 'resend', '~> 0.8'

# Internationalization (i18n)
gem 'rails-i18n', '~> 7.0'     # Common locale data (dates, numbers, validations)
gem 'i18n-tasks', '~> 1.0'     # Translation management and missing key detection

# Soft Delete
gem 'discard', '~> 1.3'

# Payments
gem 'stripe', '~> 10.0'

# Push Notifications
gem 'web-push', '~> 3.0'

# Monitoring (production)
gem 'sentry-ruby', '~> 5.16'
gem 'sentry-rails', '~> 5.16'

group :development, :test do
  gem 'rspec-rails', '~> 6.1'
  gem 'factory_bot_rails', '~> 6.4'
  gem 'faker', '~> 3.2'
  gem 'shoulda-matchers', '~> 6.0'
  gem 'dotenv-rails', '~> 2.8'
  gem 'debug', platforms: %i[mri windows]
end

group :development do
  gem 'annotate', '~> 3.2'
  gem 'bullet', '~> 7.1'
  gem 'rubocop-rails', '~> 2.23'
  gem 'brakeman', '~> 6.1'
  gem 'web-console'
end

group :test do
  gem 'capybara', '~> 3.40'
  gem 'selenium-webdriver', '~> 4.16'
  gem 'webmock', '~> 3.19'
  gem 'simplecov', '~> 0.22', require: false
end
```

---

## 2.4 Application Architecture

### 2.4.1 Directory Structure

```
seido-rails/
├── app/
│   ├── channels/                    # ActionCable channels
│   │   ├── application_cable/
│   │   │   ├── channel.rb
│   │   │   └── connection.rb
│   │   ├── notifications_channel.rb
│   │   ├── conversations_channel.rb
│   │   └── interventions_channel.rb
│   │
│   ├── controllers/
│   │   ├── api/
│   │   │   └── v1/
│   │   │       ├── base_controller.rb
│   │   │       ├── auth_controller.rb
│   │   │       ├── buildings_controller.rb
│   │   │       ├── lots_controller.rb
│   │   │       ├── interventions_controller.rb
│   │   │       ├── quotes_controller.rb
│   │   │       ├── contracts_controller.rb
│   │   │       └── ...
│   │   └── concerns/
│   │       ├── authenticatable.rb
│   │       └── paginatable.rb
│   │
│   ├── jobs/                        # Sidekiq jobs
│   │   ├── application_job.rb
│   │   ├── notification_delivery_job.rb
│   │   ├── email_delivery_job.rb
│   │   ├── stripe_webhook_job.rb
│   │   └── contract_expiration_alert_job.rb
│   │
│   ├── mailers/
│   │   ├── application_mailer.rb
│   │   ├── intervention_mailer.rb
│   │   ├── notification_mailer.rb
│   │   └── contract_mailer.rb
│   │
│   ├── models/
│   │   ├── concerns/
│   │   │   ├── team_scopable.rb     # acts_as_tenant wrapper
│   │   │   ├── soft_deletable.rb    # discard wrapper
│   │   │   └── auditable.rb         # activity logging
│   │   ├── user.rb
│   │   ├── team.rb
│   │   ├── team_member.rb
│   │   ├── building.rb
│   │   ├── lot.rb
│   │   ├── intervention.rb
│   │   ├── contract.rb
│   │   └── ...
│   │
│   ├── policies/                    # Pundit policies
│   │   ├── application_policy.rb
│   │   ├── building_policy.rb
│   │   ├── lot_policy.rb
│   │   ├── intervention_policy.rb
│   │   ├── quote_policy.rb
│   │   └── ...
│   │
│   ├── serializers/                 # JSON serializers (Alba)
│   │   ├── building_serializer.rb
│   │   ├── lot_serializer.rb
│   │   ├── intervention_serializer.rb
│   │   └── ...
│   │
│   └── services/                    # Service Objects
│       ├── interventions/
│       │   ├── creator.rb
│       │   ├── status_updater.rb
│       │   ├── assigner.rb
│       │   └── closer.rb
│       ├── notifications/
│       │   ├── dispatcher.rb
│       │   ├── push_sender.rb
│       │   └── email_sender.rb
│       ├── contracts/
│       │   ├── creator.rb
│       │   ├── status_calculator.rb
│       │   └── renewal_handler.rb
│       └── billing/
│           ├── stripe_customer_creator.rb
│           ├── subscription_manager.rb
│           └── webhook_handler.rb
│
├── config/
│   ├── routes.rb
│   ├── application.rb
│   ├── environments/
│   ├── initializers/
│   │   ├── devise.rb
│   │   ├── pundit.rb
│   │   ├── sidekiq.rb
│   │   ├── stripe.rb
│   │   └── cors.rb
│   ├── cable.yml
│   ├── storage.yml
│   └── sidekiq.yml
│
├── db/
│   ├── migrate/
│   │   ├── 001_enable_extensions.rb
│   │   ├── 002_create_enums.rb
│   │   ├── 010_create_users.rb
│   │   ├── 011_create_teams.rb
│   │   └── ...
│   ├── schema.rb
│   └── seeds.rb
│
├── lib/
│   └── tasks/
│       ├── interventions.rake
│       └── contracts.rake
│
└── spec/
    ├── factories/
    ├── models/
    ├── policies/
    ├── services/
    ├── requests/
    └── system/
```

### 2.4.2 API Versioning Strategy

```ruby
# config/routes.rb
Rails.application.routes.draw do
  namespace :api do
    namespace :v1 do
      # Authentication
      post 'auth/login', to: 'auth#login'
      post 'auth/refresh', to: 'auth#refresh'
      post 'auth/logout', to: 'auth#logout'

      # Core resources
      resources :buildings do
        resources :lots, shallow: true
      end

      resources :lots do
        resources :contracts, shallow: true
      end

      resources :interventions do
        resources :quotes, shallow: true
        resources :time_slots, shallow: true
        resources :comments, shallow: true
        member do
          post :approve
          post :reject
          post :assign
          post :close
        end
      end

      resources :contracts
      resources :notifications, only: [:index, :update]
      resources :conversations, only: [:index, :show] do
        resources :messages, only: [:index, :create]
      end

      # Team management
      resources :teams do
        resources :members, controller: 'team_members', shallow: true
        resources :invitations, only: [:index, :create, :destroy]
      end

      # Current user
      resource :profile, only: [:show, :update]
    end
  end

  # ActionCable mount
  mount ActionCable.server => '/cable'

  # Sidekiq web UI (admin only)
  authenticate :user, ->(u) { u.admin? } do
    mount Sidekiq::Web => '/sidekiq'
  end
end
```

### 2.4.3 Service Object Pattern

All business logic should live in service objects, keeping controllers thin.

```ruby
# app/services/interventions/creator.rb
module Interventions
  class Creator
    def initialize(params:, user:, team:)
      @params = params
      @user = user
      @team = team
    end

    def call
      ActiveRecord::Base.transaction do
        intervention = create_intervention!
        create_conversation_thread!(intervention)
        assign_default_managers!(intervention)
        send_notifications!(intervention)
        log_activity!(intervention)

        ServiceResult.success(intervention)
      end
    rescue ActiveRecord::RecordInvalid => e
      ServiceResult.failure(e.record.errors)
    rescue StandardError => e
      Rails.logger.error("Intervention creation failed: #{e.message}")
      ServiceResult.failure(['An unexpected error occurred'])
    end

    private

    def create_intervention!
      Intervention.create!(
        @params.merge(
          team: @team,
          created_by: @user,
          status: :demande
        )
      )
    end

    def create_conversation_thread!(intervention)
      ConversationThread.create!(
        intervention: intervention,
        team: @team,
        thread_type: :intervention
      )
    end

    def assign_default_managers!(intervention)
      # Assign team managers by default
      @team.managers.each do |manager|
        InterventionAssignment.create!(
          intervention: intervention,
          user: manager,
          role: :gestionnaire
        )
      end
    end

    def send_notifications!(intervention)
      NotificationDeliveryJob.perform_async(
        'intervention_created',
        intervention.id
      )
    end

    def log_activity!(intervention)
      ActivityLog.create!(
        user: @user,
        team: @team,
        action: :create,
        entity_type: 'Intervention',
        entity_id: intervention.id,
        metadata: { status: intervention.status }
      )
    end
  end
end

# ServiceResult helper
class ServiceResult
  attr_reader :data, :errors

  def initialize(success:, data: nil, errors: [])
    @success = success
    @data = data
    @errors = errors
  end

  def success?
    @success
  end

  def failure?
    !@success
  end

  def self.success(data)
    new(success: true, data: data)
  end

  def self.failure(errors)
    new(success: false, errors: Array(errors))
  end
end
```

---

## 2.5 External Services

### 2.5.1 Required Services

| Service | Purpose | Environment Variables |
|---------|---------|----------------------|
| **PostgreSQL** | Primary database | `DATABASE_URL` |
| **Redis** | Caching, ActionCable, Sidekiq | `REDIS_URL` |
| **AWS S3** | File storage | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET` |
| **Resend** | Transactional emails | `RESEND_API_KEY` |
| **Stripe** | Payments & subscriptions | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |
| **Sentry** | Error monitoring | `SENTRY_DSN` |

### 2.5.2 Environment Variables

```bash
# .env.example

# Database
DATABASE_URL=postgres://user:pass@localhost:5432/seido_development

# Redis
REDIS_URL=redis://localhost:6379/0

# Rails
RAILS_ENV=development
SECRET_KEY_BASE=your-secret-key-here
RAILS_MASTER_KEY=your-master-key

# JWT
JWT_SECRET=your-jwt-secret-here

# AWS S3
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=eu-west-1
S3_BUCKET=seido-development

# Email (Resend)
RESEND_API_KEY=re_xxx

# Stripe
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Push Notifications
VAPID_PUBLIC_KEY=xxx
VAPID_PRIVATE_KEY=xxx

# Monitoring
SENTRY_DSN=https://xxx@sentry.io/xxx
```

---

## 2.6 Internationalization (i18n)

SEIDO supports three languages to serve the Belgian market and international clients:

### 2.6.1 Supported Languages

| Code | Language | Status | Region |
|------|----------|--------|--------|
| `fr` | Français | Primary (default) | Belgium (Wallonia), France |
| `nl` | Nederlands | Full support | Belgium (Flanders), Netherlands |
| `en` | English | Full support | International clients |

### 2.6.2 Rails Configuration

```ruby
# config/application.rb
module Seido
  class Application < Rails::Application
    # Available locales
    config.i18n.available_locales = [:fr, :nl, :en]

    # Default locale
    config.i18n.default_locale = :fr

    # Fallback chain
    config.i18n.fallbacks = {
      'nl' => ['nl', 'en', 'fr'],
      'en' => ['en', 'fr'],
      'fr' => ['fr', 'en']
    }

    # Load locale files from nested directories
    config.i18n.load_path += Dir[Rails.root.join('config', 'locales', '**', '*.{rb,yml}')]
  end
end
```

### 2.6.3 Locale Storage

**User-level preference (primary):**
```sql
-- Added to users table
ALTER TABLE users ADD COLUMN locale VARCHAR(5) DEFAULT 'fr';
CREATE INDEX idx_users_locale ON users(locale);
```

**Team-level default (fallback):**
```ruby
# Team model - settings JSONB column
class Team < ApplicationRecord
  store_accessor :settings, :default_language, :timezone

  def default_language
    super || 'fr'
  end
end
```

### 2.6.4 API Locale Detection

The locale is determined using this priority order:

```ruby
# app/controllers/concerns/localizable.rb
module Localizable
  extend ActiveSupport::Concern

  included do
    before_action :set_locale
  end

  private

  def set_locale
    I18n.locale = determine_locale
  end

  def determine_locale
    # Priority 1: X-Locale header (explicit request)
    return params[:locale] if valid_locale?(params[:locale])
    return request.headers['X-Locale'] if valid_locale?(request.headers['X-Locale'])

    # Priority 2: Accept-Language header
    extracted = extract_locale_from_accept_language
    return extracted if valid_locale?(extracted)

    # Priority 3: User preference (authenticated)
    return current_user.locale if current_user&.locale.present?

    # Priority 4: Team default
    return current_team&.default_language if current_team&.default_language.present?

    # Priority 5: Application default
    I18n.default_locale
  end

  def valid_locale?(locale)
    I18n.available_locales.map(&:to_s).include?(locale.to_s)
  end

  def extract_locale_from_accept_language
    accept_language = request.env['HTTP_ACCEPT_LANGUAGE']
    return nil if accept_language.blank?

    accept_language.scan(/[a-z]{2}(?=-|;|,|$)/).find do |lang|
      valid_locale?(lang)
    end
  end
end
```

### 2.6.5 Translation Files Structure

```
config/locales/
├── fr/
│   ├── activerecord.fr.yml      # Model names, attributes, error messages
│   ├── devise.fr.yml            # Authentication messages
│   ├── enums.fr.yml             # Enum translations (intervention_status, etc.)
│   ├── mailers.fr.yml           # Email subjects and bodies
│   ├── notifications.fr.yml     # Push notification messages
│   ├── pundit.fr.yml            # Authorization error messages
│   └── views.fr.yml             # UI labels (if web interface)
├── nl/
│   ├── activerecord.nl.yml
│   ├── devise.nl.yml
│   ├── enums.nl.yml
│   ├── mailers.nl.yml
│   ├── notifications.nl.yml
│   ├── pundit.nl.yml
│   └── views.nl.yml
└── en/
    ├── activerecord.en.yml
    ├── devise.en.yml
    ├── enums.en.yml
    ├── mailers.en.yml
    ├── notifications.en.yml
    ├── pundit.en.yml
    └── views.en.yml
```

### 2.6.6 Enum Translations

```yaml
# config/locales/fr/enums.fr.yml
fr:
  enums:
    intervention:
      status:
        demande: "Nouvelle demande"
        rejetee: "Rejetée"
        approuvee: "Approuvée"
        planification: "En planification"
        planifiee: "Planifiée"
        cloturee_par_prestataire: "Terminée (prestataire)"
        cloturee_par_locataire: "Validée (locataire)"
        cloturee_par_gestionnaire: "Clôturée"
        annulee: "Annulée"
      urgency:
        basse: "Basse"
        normale: "Normale"
        haute: "Haute"
        urgente: "Urgente"
      type:
        reparation: "Réparation"
        maintenance: "Maintenance"
        amelioration: "Amélioration"
        urgence: "Urgence"
        inspection: "Inspection"
    contract:
      status:
        brouillon: "Brouillon"
        actif: "Actif"
        expire: "Expiré"
        resilie: "Résilié"
        renouvele: "Renouvelé"
```

```yaml
# config/locales/nl/enums.nl.yml
nl:
  enums:
    intervention:
      status:
        demande: "Nieuwe aanvraag"
        rejetee: "Afgewezen"
        approuvee: "Goedgekeurd"
        planification: "In planning"
        planifiee: "Gepland"
        cloturee_par_prestataire: "Afgerond (dienstverlener)"
        cloturee_par_locataire: "Gevalideerd (huurder)"
        cloturee_par_gestionnaire: "Afgesloten"
        annulee: "Geannuleerd"
      urgency:
        basse: "Laag"
        normale: "Normaal"
        haute: "Hoog"
        urgente: "Dringend"
      type:
        reparation: "Reparatie"
        maintenance: "Onderhoud"
        amelioration: "Verbetering"
        urgence: "Noodgeval"
        inspection: "Inspectie"
    contract:
      status:
        brouillon: "Concept"
        actif: "Actief"
        expire: "Verlopen"
        resilie: "Opgezegd"
        renouvele: "Vernieuwd"
```

```yaml
# config/locales/en/enums.en.yml
en:
  enums:
    intervention:
      status:
        demande: "New request"
        rejetee: "Rejected"
        approuvee: "Approved"
        planification: "Scheduling"
        planifiee: "Scheduled"
        cloturee_par_prestataire: "Completed (provider)"
        cloturee_par_locataire: "Validated (tenant)"
        cloturee_par_gestionnaire: "Closed"
        annulee: "Cancelled"
      urgency:
        basse: "Low"
        normale: "Normal"
        haute: "High"
        urgente: "Urgent"
      type:
        reparation: "Repair"
        maintenance: "Maintenance"
        amelioration: "Improvement"
        urgence: "Emergency"
        inspection: "Inspection"
    contract:
      status:
        brouillon: "Draft"
        actif: "Active"
        expire: "Expired"
        resilie: "Terminated"
        renouvele: "Renewed"
```

### 2.6.7 Model Integration

```ruby
# app/models/concerns/translatable_enum.rb
module TranslatableEnum
  extend ActiveSupport::Concern

  class_methods do
    def translatable_enum(attribute, values, **options)
      enum attribute, values, **options

      define_method "#{attribute}_translated" do
        I18n.t("enums.#{self.class.name.underscore}.#{attribute}.#{send(attribute)}")
      end
    end
  end
end

# Usage in model
class Intervention < ApplicationRecord
  include TranslatableEnum

  translatable_enum :status, {
    demande: 'demande',
    rejetee: 'rejetee',
    approuvee: 'approuvee',
    # ...
  }

  translatable_enum :urgency, {
    basse: 'basse',
    normale: 'normale',
    haute: 'haute',
    urgente: 'urgente'
  }
end

# In serializer or view
intervention.status_translated  # => "Nouvelle demande" (fr) / "New request" (en)
```

### 2.6.8 Mailer i18n

```ruby
# app/mailers/intervention_mailer.rb
class InterventionMailer < ApplicationMailer
  def status_changed(intervention, recipient)
    @intervention = intervention
    @recipient = recipient

    # Set locale for this email
    I18n.with_locale(recipient.locale || 'fr') do
      mail(
        to: recipient.email,
        subject: t('mailers.intervention.status_changed.subject',
                   reference: intervention.reference,
                   status: intervention.status_translated)
      )
    end
  end
end
```

```yaml
# config/locales/fr/mailers.fr.yml
fr:
  mailers:
    intervention:
      status_changed:
        subject: "Intervention %{reference} - Statut: %{status}"
        greeting: "Bonjour %{name},"
        body: "Le statut de l'intervention a été modifié."
        action: "Voir l'intervention"
      new_intervention:
        subject: "Nouvelle intervention #%{reference}"
        greeting: "Bonjour %{name},"
        body: "Une nouvelle intervention a été créée pour votre bien."
        action: "Consulter"
```

```yaml
# config/locales/nl/mailers.nl.yml
nl:
  mailers:
    intervention:
      status_changed:
        subject: "Interventie %{reference} - Status: %{status}"
        greeting: "Beste %{name},"
        body: "De status van de interventie is gewijzigd."
        action: "Bekijk interventie"
      new_intervention:
        subject: "Nieuwe interventie #%{reference}"
        greeting: "Beste %{name},"
        body: "Er is een nieuwe interventie aangemaakt voor uw woning."
        action: "Bekijken"
```

```yaml
# config/locales/en/mailers.en.yml
en:
  mailers:
    intervention:
      status_changed:
        subject: "Intervention %{reference} - Status: %{status}"
        greeting: "Hello %{name},"
        body: "The intervention status has been updated."
        action: "View intervention"
      new_intervention:
        subject: "New intervention #%{reference}"
        greeting: "Hello %{name},"
        body: "A new intervention has been created for your property."
        action: "View"
```

### 2.6.9 Notification i18n

```ruby
# app/services/notifications/dispatcher.rb
module Notifications
  class Dispatcher
    def dispatch(notification)
      I18n.with_locale(notification.user.locale || 'fr') do
        notification.update!(
          title: I18n.t("notifications.#{notification.notification_type}.title", **title_params),
          message: I18n.t("notifications.#{notification.notification_type}.message", **message_params)
        )

        broadcast_to_user(notification)
        send_push_if_enabled(notification)
      end
    end
  end
end
```

```yaml
# config/locales/fr/notifications.fr.yml
fr:
  notifications:
    intervention_created:
      title: "Nouvelle intervention"
      message: "Intervention #%{reference} créée par %{creator}"
    intervention_status_changed:
      title: "Statut modifié"
      message: "Intervention #%{reference}: %{old_status} → %{new_status}"
    quote_received:
      title: "Devis reçu"
      message: "%{provider} a soumis un devis de %{amount}€"
    time_slot_proposed:
      title: "Créneau proposé"
      message: "Nouveau créneau disponible: %{date}"
```

### 2.6.10 API Locale Endpoint

```ruby
# app/controllers/api/v1/users_controller.rb
class Api::V1::UsersController < Api::V1::BaseController
  # PATCH /api/v1/users/locale
  def update_locale
    if valid_locale?(params[:locale])
      current_user.update!(locale: params[:locale])
      render json: {
        locale: current_user.locale,
        message: I18n.t('users.locale_updated')
      }
    else
      render json: {
        error: I18n.t('users.invalid_locale'),
        available_locales: I18n.available_locales
      }, status: :unprocessable_entity
    end
  end

  private

  def valid_locale?(locale)
    I18n.available_locales.map(&:to_s).include?(locale.to_s)
  end
end
```

### 2.6.11 Translation Management (i18n-tasks)

```bash
# Check for missing translations
bundle exec i18n-tasks missing

# Check for unused translations
bundle exec i18n-tasks unused

# Add missing keys to all locale files
bundle exec i18n-tasks add-missing

# Normalize and sort translation files
bundle exec i18n-tasks normalize
```

```yaml
# config/i18n-tasks.yml
i18n-tasks:
  locales:
    - fr
    - nl
    - en
  base_locale: fr

  search:
    paths:
      - app/

  ignore_missing:
    - 'devise.*'
    - 'errors.messages.*'
```

---

## 2.7 Progressive Web App (PWA)

SEIDO is designed as a **mobile-first Progressive Web App**, providing native app-like experiences on mobile devices without requiring app store distribution. This is critical for the 80% of users (gestionnaires, prestataires) who primarily use mobile devices, and especially for service providers who work in offline-prone environments (basements, parking garages).

### 2.7.1 PWA Requirements for SEIDO

| Requirement | Business Justification | Technical Solution |
|-------------|----------------------|-------------------|
| **Installable** | Users launch SEIDO like a native app | Web App Manifest |
| **Offline-capable** | Prestataires work in basements/garages | Service Worker + Cache API |
| **Push notifications** | Real-time alerts for interventions | Web Push API + VAPID |
| **Fast loading** | Mobile users expect < 3s load | Caching strategies |
| **Full-screen** | Professional app experience | `display: standalone` |
| **Mobile-first** | 80% mobile usage for key personas | Responsive design |

### 2.7.2 Web Manifest Configuration

```ruby
# Gemfile
gem 'serviceworker-rails', '~> 0.6'  # Service worker and manifest support
```

```ruby
# config/initializers/serviceworker.rb
Rails.application.configure do
  config.serviceworker.routes.draw do
    # Cache the manifest
    match '/manifest.json'

    # Register the service worker
    match '/serviceworker.js', asset: 'serviceworker.js'
  end
end
```

```ruby
# app/controllers/manifest_controller.rb
class ManifestController < ApplicationController
  skip_before_action :authenticate_user!

  def show
    render json: manifest_json
  end

  private

  def manifest_json
    {
      name: 'SEIDO',
      short_name: 'SEIDO',
      description: 'Gestion immobilière multi-acteurs',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      orientation: 'portrait-primary',
      background_color: '#ffffff',
      theme_color: '#1e40af',  # Primary blue
      categories: ['business', 'productivity'],
      lang: 'fr',
      dir: 'ltr',
      icons: icons_array,
      screenshots: screenshots_array,
      shortcuts: shortcuts_array,
      related_applications: [],
      prefer_related_applications: false
    }
  end

  def icons_array
    [
      { src: '/icons/icon-72x72.png', sizes: '72x72', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-96x96.png', sizes: '96x96', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-128x128.png', sizes: '128x128', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-144x144.png', sizes: '144x144', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-152x152.png', sizes: '152x152', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
      { src: '/icons/icon-384x384.png', sizes: '384x384', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
    ]
  end

  def screenshots_array
    [
      {
        src: '/screenshots/dashboard-wide.png',
        sizes: '1920x1080',
        type: 'image/png',
        form_factor: 'wide',
        label: 'Dashboard gestionnaire'
      },
      {
        src: '/screenshots/mobile-home.png',
        sizes: '750x1334',
        type: 'image/png',
        form_factor: 'narrow',
        label: 'Vue mobile'
      }
    ]
  end

  def shortcuts_array
    [
      {
        name: 'Nouvelle intervention',
        short_name: 'Nouvelle',
        description: 'Créer une nouvelle intervention',
        url: '/interventions/new',
        icons: [{ src: '/icons/shortcut-new.png', sizes: '96x96' }]
      },
      {
        name: 'Mes interventions',
        short_name: 'Interventions',
        description: 'Voir mes interventions',
        url: '/interventions',
        icons: [{ src: '/icons/shortcut-list.png', sizes: '96x96' }]
      }
    ]
  end
end
```

```ruby
# config/routes.rb
Rails.application.routes.draw do
  get '/manifest.json', to: 'manifest#show', as: :manifest
  # ... other routes
end
```

```erb
<!-- app/views/layouts/application.html.erb -->
<head>
  <!-- PWA Manifest -->
  <link rel="manifest" href="<%= manifest_path %>" crossorigin="use-credentials">

  <!-- iOS PWA Meta Tags -->
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="default">
  <meta name="apple-mobile-web-app-title" content="SEIDO">
  <link rel="apple-touch-icon" href="/icons/icon-192x192.png">

  <!-- Theme Color -->
  <meta name="theme-color" content="#1e40af">
  <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#1e293b">

  <!-- MS Tile -->
  <meta name="msapplication-TileColor" content="#1e40af">
  <meta name="msapplication-TileImage" content="/icons/icon-144x144.png">
</head>
```

### 2.7.3 Service Worker Architecture

```javascript
// app/assets/javascripts/serviceworker.js

const CACHE_VERSION = 'seido-v1';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;
const API_CACHE = `${CACHE_VERSION}-api`;

// Assets to cache immediately on install
const STATIC_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// API routes to cache with NetworkFirst strategy
const API_ROUTES = [
  '/api/v1/interventions',
  '/api/v1/buildings',
  '/api/v1/lots',
  '/api/v1/users/me'
];

// ═══════════════════════════════════════════════════════════════════════════════
// INSTALL EVENT - Cache static assets
// ═══════════════════════════════════════════════════════════════════════════════

self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');

  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Static assets cached');
        return self.skipWaiting(); // Activate immediately
      })
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// ACTIVATE EVENT - Clean old caches
// ═══════════════════════════════════════════════════════════════════════════════

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');

  event.waitUntil(
    caches.keys()
      .then((keys) => {
        return Promise.all(
          keys
            .filter((key) => key !== STATIC_CACHE && key !== DYNAMIC_CACHE && key !== API_CACHE)
            .map((key) => {
              console.log('[SW] Deleting old cache:', key);
              return caches.delete(key);
            })
        );
      })
      .then(() => {
        console.log('[SW] Service worker activated');
        return self.clients.claim(); // Take control of all clients
      })
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// FETCH EVENT - Caching strategies
// ═══════════════════════════════════════════════════════════════════════════════

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests (POST, PUT, DELETE should always go to network)
  if (request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests
  if (url.origin !== self.location.origin) {
    return;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Strategy 1: NETWORK FIRST (API calls)
  // Try network, fall back to cache, useful for fresh data
  // ─────────────────────────────────────────────────────────────────────────────
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request, API_CACHE));
    return;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Strategy 2: CACHE FIRST (Static assets)
  // Return cached version, update in background
  // ─────────────────────────────────────────────────────────────────────────────
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Strategy 3: STALE WHILE REVALIDATE (HTML pages)
  // Return cached, then update cache in background
  // ─────────────────────────────────────────────────────────────────────────────
  event.respondWith(staleWhileRevalidate(request, DYNAMIC_CACHE));
});

// ═══════════════════════════════════════════════════════════════════════════════
// CACHING STRATEGY IMPLEMENTATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Network First Strategy
 * @param {Request} request
 * @param {string} cacheName
 * @returns {Promise<Response>}
 */
async function networkFirst(request, cacheName) {
  try {
    const networkResponse = await fetch(request);

    // Only cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache for:', request.url);
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/offline.html');
    }

    throw error;
  }
}

/**
 * Cache First Strategy
 * @param {Request} request
 * @param {string} cacheName
 * @returns {Promise<Response>}
 */
async function cacheFirst(request, cacheName) {
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    // Update cache in background
    fetch(request).then((networkResponse) => {
      if (networkResponse.ok) {
        caches.open(cacheName).then((cache) => {
          cache.put(request, networkResponse);
        });
      }
    }).catch(() => { /* Ignore network errors */ });

    return cachedResponse;
  }

  // Not in cache, fetch from network
  const networkResponse = await fetch(request);

  if (networkResponse.ok) {
    const cache = await caches.open(cacheName);
    cache.put(request, networkResponse.clone());
  }

  return networkResponse;
}

/**
 * Stale While Revalidate Strategy
 * @param {Request} request
 * @param {string} cacheName
 * @returns {Promise<Response>}
 */
async function staleWhileRevalidate(request, cacheName) {
  const cachedResponse = await caches.match(request);

  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse.ok) {
        caches.open(cacheName).then((cache) => {
          cache.put(request, networkResponse.clone());
        });
      }
      return networkResponse;
    })
    .catch(() => cachedResponse);

  return cachedResponse || fetchPromise;
}

/**
 * Check if URL is a static asset
 * @param {string} pathname
 * @returns {boolean}
 */
function isStaticAsset(pathname) {
  return /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/.test(pathname);
}

// ═══════════════════════════════════════════════════════════════════════════════
// PUSH NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════════

self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');

  let data = { title: 'SEIDO', body: 'Nouvelle notification' };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/',
      notificationId: data.id
    },
    actions: data.actions || [
      { action: 'open', title: 'Ouvrir' },
      { action: 'dismiss', title: 'Ignorer' }
    ],
    tag: data.tag || 'seido-notification',
    renotify: !!data.renotify,
    requireInteraction: !!data.requireInteraction
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);

  event.notification.close();

  const url = event.notification.data?.url || '/';

  if (event.action === 'dismiss') {
    return;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Focus existing window if available
        for (const client of clientList) {
          if (client.url === url && 'focus' in client) {
            return client.focus();
          }
        }
        // Open new window
        return clients.openWindow(url);
      })
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  const notificationId = event.notification.data?.notificationId;
  if (notificationId) {
    // Track dismissed notifications (analytics)
    console.log('[SW] Notification dismissed:', notificationId);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// BACKGROUND SYNC
// ═══════════════════════════════════════════════════════════════════════════════

self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);

  if (event.tag === 'sync-interventions') {
    event.waitUntil(syncInterventions());
  }

  if (event.tag === 'sync-comments') {
    event.waitUntil(syncComments());
  }
});

async function syncInterventions() {
  const db = await openIndexedDB();
  const pendingInterventions = await db.getAll('pending-interventions');

  for (const intervention of pendingInterventions) {
    try {
      await fetch('/api/v1/interventions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(intervention)
      });
      await db.delete('pending-interventions', intervention.id);
      console.log('[SW] Synced intervention:', intervention.id);
    } catch (error) {
      console.error('[SW] Failed to sync intervention:', error);
    }
  }
}

async function syncComments() {
  // Similar pattern for comments
}

function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('seido-offline', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}
```

### 2.7.4 Offline Support

#### IndexedDB Schema for Offline Data

```javascript
// app/javascript/offline/database.js

const DB_NAME = 'seido-offline';
const DB_VERSION = 1;

const STORES = {
  INTERVENTIONS: 'interventions',
  PENDING_MUTATIONS: 'pending-mutations',
  USER_PROFILE: 'user-profile',
  BUILDINGS: 'buildings',
  LOTS: 'lots'
};

class OfflineDatabase {
  constructor() {
    this.db = null;
  }

  async open() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Interventions store
        if (!db.objectStoreNames.contains(STORES.INTERVENTIONS)) {
          const store = db.createObjectStore(STORES.INTERVENTIONS, { keyPath: 'id' });
          store.createIndex('status', 'status', { unique: false });
          store.createIndex('team_id', 'team_id', { unique: false });
          store.createIndex('updated_at', 'updated_at', { unique: false });
        }

        // Pending mutations store
        if (!db.objectStoreNames.contains(STORES.PENDING_MUTATIONS)) {
          const store = db.createObjectStore(STORES.PENDING_MUTATIONS, { keyPath: 'id', autoIncrement: true });
          store.createIndex('entity_type', 'entity_type', { unique: false });
          store.createIndex('created_at', 'created_at', { unique: false });
        }

        // Buildings store
        if (!db.objectStoreNames.contains(STORES.BUILDINGS)) {
          const store = db.createObjectStore(STORES.BUILDINGS, { keyPath: 'id' });
          store.createIndex('team_id', 'team_id', { unique: false });
        }

        // Lots store
        if (!db.objectStoreNames.contains(STORES.LOTS)) {
          const store = db.createObjectStore(STORES.LOTS, { keyPath: 'id' });
          store.createIndex('building_id', 'building_id', { unique: false });
        }

        // User profile store
        if (!db.objectStoreNames.contains(STORES.USER_PROFILE)) {
          db.createObjectStore(STORES.USER_PROFILE, { keyPath: 'id' });
        }
      };
    });
  }

  async get(storeName, key) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAll(storeName, indexName = null, query = null) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const target = indexName ? store.index(indexName) : store;
      const request = query ? target.getAll(query) : target.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async put(storeName, data) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async delete(storeName, key) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clear(storeName) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

export const offlineDB = new OfflineDatabase();
export { STORES };
```

#### Sync Queue for Offline Mutations

```javascript
// app/javascript/offline/sync-queue.js

import { offlineDB, STORES } from './database';

class SyncQueue {
  constructor() {
    this.isOnline = navigator.onLine;
    this.setupListeners();
  }

  setupListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.processPendingMutations();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  /**
   * Queue a mutation for later sync
   * @param {string} entityType - 'intervention', 'comment', etc.
   * @param {string} action - 'create', 'update', 'delete'
   * @param {object} data - The mutation data
   * @param {string} endpoint - API endpoint
   */
  async queue(entityType, action, data, endpoint) {
    const mutation = {
      entity_type: entityType,
      action: action,
      data: data,
      endpoint: endpoint,
      created_at: new Date().toISOString(),
      retry_count: 0
    };

    await offlineDB.put(STORES.PENDING_MUTATIONS, mutation);
    console.log('[SyncQueue] Queued mutation:', mutation);

    // Request background sync if available
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register(`sync-${entityType}s`);
    }
  }

  /**
   * Process all pending mutations
   */
  async processPendingMutations() {
    if (!this.isOnline) return;

    const pending = await offlineDB.getAll(STORES.PENDING_MUTATIONS);
    console.log('[SyncQueue] Processing', pending.length, 'pending mutations');

    for (const mutation of pending) {
      try {
        await this.executeMutation(mutation);
        await offlineDB.delete(STORES.PENDING_MUTATIONS, mutation.id);
        console.log('[SyncQueue] Mutation synced:', mutation.id);
      } catch (error) {
        console.error('[SyncQueue] Mutation failed:', error);
        mutation.retry_count++;
        mutation.last_error = error.message;

        if (mutation.retry_count >= 3) {
          mutation.status = 'failed';
          // Notify user of failed sync
          this.notifyFailedSync(mutation);
        }

        await offlineDB.put(STORES.PENDING_MUTATIONS, mutation);
      }
    }
  }

  async executeMutation(mutation) {
    const { endpoint, action, data } = mutation;

    const method = {
      create: 'POST',
      update: 'PATCH',
      delete: 'DELETE'
    }[action];

    const response = await fetch(endpoint, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]')?.content
      },
      body: action !== 'delete' ? JSON.stringify(data) : undefined
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  notifyFailedSync(mutation) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Synchronisation échouée', {
        body: `La modification de ${mutation.entity_type} n'a pas pu être synchronisée`,
        icon: '/icons/icon-192x192.png'
      });
    }
  }
}

export const syncQueue = new SyncQueue();
```

#### Offline-First API Wrapper

```javascript
// app/javascript/offline/api-wrapper.js

import { offlineDB, STORES } from './database';
import { syncQueue } from './sync-queue';

class OfflineAPIWrapper {
  constructor() {
    this.isOnline = navigator.onLine;
    window.addEventListener('online', () => this.isOnline = true);
    window.addEventListener('offline', () => this.isOnline = false);
  }

  /**
   * GET request with offline fallback
   */
  async get(endpoint, options = {}) {
    const cacheKey = this.getCacheKey(endpoint);
    const storeName = this.getStoreForEndpoint(endpoint);

    if (this.isOnline) {
      try {
        const response = await fetch(endpoint, {
          method: 'GET',
          headers: this.getHeaders(),
          ...options
        });

        if (response.ok) {
          const data = await response.json();

          // Cache the response
          if (storeName) {
            await this.cacheData(storeName, data);
          }

          return data;
        }
      } catch (error) {
        console.log('[OfflineAPI] Network error, falling back to cache');
      }
    }

    // Return cached data
    if (storeName) {
      const cached = await this.getCachedData(storeName, endpoint);
      if (cached) {
        return { ...cached, _offline: true };
      }
    }

    throw new Error('No cached data available');
  }

  /**
   * POST/PATCH/DELETE with offline queue
   */
  async mutate(method, endpoint, data, entityType) {
    if (this.isOnline) {
      try {
        const response = await fetch(endpoint, {
          method: method,
          headers: this.getHeaders(),
          body: JSON.stringify(data)
        });

        if (response.ok) {
          return await response.json();
        }
      } catch (error) {
        console.log('[OfflineAPI] Network error, queuing mutation');
      }
    }

    // Queue for later sync
    const action = method === 'POST' ? 'create' : method === 'PATCH' ? 'update' : 'delete';
    await syncQueue.queue(entityType, action, data, endpoint);

    // Return optimistic response
    return {
      ...data,
      _offline: true,
      _pending_sync: true
    };
  }

  getHeaders() {
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]')?.content
    };
  }

  getStoreForEndpoint(endpoint) {
    if (endpoint.includes('/interventions')) return STORES.INTERVENTIONS;
    if (endpoint.includes('/buildings')) return STORES.BUILDINGS;
    if (endpoint.includes('/lots')) return STORES.LOTS;
    return null;
  }

  getCacheKey(endpoint) {
    return endpoint.replace(/[^a-zA-Z0-9]/g, '_');
  }

  async cacheData(storeName, data) {
    if (Array.isArray(data)) {
      for (const item of data) {
        await offlineDB.put(storeName, item);
      }
    } else {
      await offlineDB.put(storeName, data);
    }
  }

  async getCachedData(storeName, endpoint) {
    // Extract ID from endpoint if present
    const idMatch = endpoint.match(/\/([a-f0-9-]{36})$/);
    if (idMatch) {
      return await offlineDB.get(storeName, idMatch[1]);
    }
    return await offlineDB.getAll(storeName);
  }
}

export const offlineAPI = new OfflineAPIWrapper();
```

### 2.7.5 PWA Installation Flow

#### Install Banner Component (Stimulus)

```javascript
// app/javascript/controllers/pwa_install_controller.js

import { Controller } from '@hotwired/stimulus'

export default class extends Controller {
  static targets = ['banner', 'modal']
  static values = {
    dismissed: { type: Boolean, default: false },
    installed: { type: Boolean, default: false }
  }

  connect() {
    this.deferredPrompt = null

    // Check if already installed
    if (this.isInstalled()) {
      this.installedValue = true
      return
    }

    // Check if recently dismissed
    if (this.wasRecentlyDismissed()) {
      return
    }

    // Listen for install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault()
      this.deferredPrompt = e
      this.showBanner()
    })

    // Listen for successful install
    window.addEventListener('appinstalled', () => {
      this.installedValue = true
      this.hideBanner()
      this.trackEvent('pwa_installed')
    })
  }

  isInstalled() {
    // Check if running as PWA
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone === true ||
           document.referrer.includes('android-app://')
  }

  wasRecentlyDismissed() {
    const dismissedAt = localStorage.getItem('pwa_banner_dismissed')
    if (!dismissedAt) return false

    const dismissedDate = new Date(dismissedAt)
    const daysSinceDismiss = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24)

    return daysSinceDismiss < 7 // Show again after 7 days
  }

  showBanner() {
    if (this.hasBannerTarget) {
      this.bannerTarget.classList.remove('hidden')
      this.bannerTarget.classList.add('animate-slide-up')
    }
  }

  hideBanner() {
    if (this.hasBannerTarget) {
      this.bannerTarget.classList.add('hidden')
    }
  }

  dismiss() {
    this.hideBanner()
    localStorage.setItem('pwa_banner_dismissed', new Date().toISOString())
    this.trackEvent('pwa_banner_dismissed')
  }

  showInstallModal() {
    if (this.hasModalTarget) {
      this.modalTarget.classList.remove('hidden')
    }
  }

  hideModal() {
    if (this.hasModalTarget) {
      this.modalTarget.classList.add('hidden')
    }
  }

  async install() {
    if (!this.deferredPrompt) {
      console.log('[PWA] No install prompt available')
      return
    }

    // Show the install prompt
    this.deferredPrompt.prompt()

    // Wait for user response
    const { outcome } = await this.deferredPrompt.userChoice

    if (outcome === 'accepted') {
      this.trackEvent('pwa_install_accepted')
      this.hideBanner()
      this.hideModal()

      // Ask for notification permission after install
      setTimeout(() => {
        this.requestNotificationPermission()
      }, 2000)
    } else {
      this.trackEvent('pwa_install_dismissed')
    }

    this.deferredPrompt = null
  }

  async requestNotificationPermission() {
    if (!('Notification' in window)) return

    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission()
      this.trackEvent('notification_permission', { result: permission })
    }
  }

  trackEvent(eventName, data = {}) {
    // Send to analytics (Plausible, Google Analytics, etc.)
    if (window.plausible) {
      window.plausible(eventName, { props: data })
    }
  }
}
```

#### Install Banner View

```erb
<!-- app/views/shared/_pwa_install_banner.html.erb -->
<div data-controller="pwa-install"
     data-pwa-install-dismissed-value="false"
     data-pwa-install-installed-value="false">

  <!-- Install Banner (Bottom of screen) -->
  <div data-pwa-install-target="banner"
       class="hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t
              border-gray-200 dark:border-gray-700 p-4 shadow-lg z-50
              md:bottom-4 md:left-4 md:right-auto md:w-96 md:rounded-lg md:border">

    <div class="flex items-center space-x-4">
      <img src="/icons/icon-96x96.png" alt="SEIDO" class="w-12 h-12 rounded-lg">

      <div class="flex-1">
        <h3 class="font-semibold text-gray-900 dark:text-white">
          Installer SEIDO
        </h3>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          Accès rapide depuis votre écran d'accueil
        </p>
      </div>

      <div class="flex space-x-2">
        <button data-action="click->pwa-install#dismiss"
                class="text-gray-400 hover:text-gray-600 p-2"
                aria-label="Fermer">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>

        <button data-action="click->pwa-install#showInstallModal"
                class="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg
                       text-sm font-medium transition-colors">
          Installer
        </button>
      </div>
    </div>
  </div>

  <!-- Install Modal (Detailed info) -->
  <div data-pwa-install-target="modal"
       class="hidden fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">

    <div class="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 space-y-6">
      <div class="text-center">
        <img src="/icons/icon-192x192.png" alt="SEIDO" class="w-20 h-20 mx-auto rounded-2xl shadow-lg">
        <h2 class="mt-4 text-xl font-bold text-gray-900 dark:text-white">
          Installer SEIDO
        </h2>
        <p class="mt-2 text-gray-500 dark:text-gray-400">
          Profitez d'une expérience optimale
        </p>
      </div>

      <ul class="space-y-3">
        <li class="flex items-center space-x-3">
          <svg class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
          </svg>
          <span class="text-gray-700 dark:text-gray-300">Accès instantané depuis l'écran d'accueil</span>
        </li>
        <li class="flex items-center space-x-3">
          <svg class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
          </svg>
          <span class="text-gray-700 dark:text-gray-300">Fonctionne hors connexion</span>
        </li>
        <li class="flex items-center space-x-3">
          <svg class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
          </svg>
          <span class="text-gray-700 dark:text-gray-300">Notifications push en temps réel</span>
        </li>
        <li class="flex items-center space-x-3">
          <svg class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
          </svg>
          <span class="text-gray-700 dark:text-gray-300">Expérience plein écran</span>
        </li>
      </ul>

      <div class="flex space-x-3">
        <button data-action="click->pwa-install#hideModal"
                class="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600
                       rounded-lg text-gray-700 dark:text-gray-300 font-medium
                       hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
          Plus tard
        </button>
        <button data-action="click->pwa-install#install"
                class="flex-1 px-4 py-3 bg-primary-600 hover:bg-primary-700
                       rounded-lg text-white font-medium transition-colors">
          Installer
        </button>
      </div>
    </div>
  </div>
</div>
```

### 2.7.6 Push Notifications (Enhanced)

#### VAPID Key Configuration

```ruby
# config/credentials.yml.enc (edit with: rails credentials:edit)
webpush:
  public_key: <%= ENV['VAPID_PUBLIC_KEY'] %>
  private_key: <%= ENV['VAPID_PRIVATE_KEY'] %>
  subject: mailto:support@seido.app

# Generate keys with:
# webpush generate_key
```

```ruby
# config/initializers/webpush.rb
Rails.application.configure do
  config.webpush = {
    public_key: Rails.application.credentials.dig(:webpush, :public_key),
    private_key: Rails.application.credentials.dig(:webpush, :private_key),
    subject: Rails.application.credentials.dig(:webpush, :subject)
  }
end
```

#### Push Subscription Model

```ruby
# app/models/push_subscription.rb
class PushSubscription < ApplicationRecord
  belongs_to :user

  # Subscription JSON structure:
  # {
  #   endpoint: "https://fcm.googleapis.com/fcm/send/...",
  #   keys: {
  #     p256dh: "public_key",
  #     auth: "auth_secret"
  #   }
  # }

  validates :endpoint, presence: true, uniqueness: { scope: :user_id }
  validates :keys, presence: true

  encrypts :keys  # Rails 7+ encryption

  scope :active, -> { where(active: true) }

  def deliver(title:, body:, data: {})
    message = {
      title: title,
      body: body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      data: data.merge(url: data[:url] || '/')
    }

    Webpush.payload_send(
      message: message.to_json,
      endpoint: endpoint,
      p256dh: keys['p256dh'],
      auth: keys['auth'],
      vapid: Rails.application.config.webpush
    )
  rescue Webpush::ExpiredSubscription, Webpush::InvalidSubscription
    update!(active: false)
  end
end
```

#### Push Subscription API

```ruby
# app/controllers/api/v1/push_subscriptions_controller.rb
class Api::V1::PushSubscriptionsController < Api::V1::BaseController
  # POST /api/v1/push_subscriptions
  def create
    subscription = current_user.push_subscriptions.find_or_initialize_by(
      endpoint: subscription_params[:endpoint]
    )

    subscription.assign_attributes(
      keys: subscription_params[:keys],
      user_agent: request.user_agent,
      active: true
    )

    if subscription.save
      render json: { status: 'subscribed' }, status: :created
    else
      render json: { errors: subscription.errors }, status: :unprocessable_entity
    end
  end

  # DELETE /api/v1/push_subscriptions
  def destroy
    subscription = current_user.push_subscriptions.find_by(
      endpoint: params[:endpoint]
    )

    if subscription&.destroy
      render json: { status: 'unsubscribed' }
    else
      render json: { error: 'Subscription not found' }, status: :not_found
    end
  end

  # GET /api/v1/push_subscriptions/vapid_public_key
  def vapid_public_key
    render json: {
      publicKey: Rails.application.config.webpush[:public_key]
    }
  end

  private

  def subscription_params
    params.require(:subscription).permit(:endpoint, keys: [:p256dh, :auth])
  end
end
```

#### Client-Side Push Subscription

```javascript
// app/javascript/controllers/push_notification_controller.js

import { Controller } from '@hotwired/stimulus'

export default class extends Controller {
  static targets = ['status', 'button']
  static values = { enabled: Boolean }

  async connect() {
    this.updateUI()

    // Check current permission state
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        await this.ensureSubscription()
      }
    }
  }

  async toggle() {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      this.showError('Notifications non supportées sur ce navigateur')
      return
    }

    if (Notification.permission === 'denied') {
      this.showError('Notifications bloquées. Veuillez les autoriser dans les paramètres du navigateur.')
      return
    }

    if (this.enabledValue) {
      await this.unsubscribe()
    } else {
      await this.subscribe()
    }

    this.updateUI()
  }

  async subscribe() {
    try {
      // Request notification permission
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        this.showError('Permission refusée')
        return
      }

      // Get VAPID public key from server
      const response = await fetch('/api/v1/push_subscriptions/vapid_public_key')
      const { publicKey } = await response.json()

      // Subscribe to push
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(publicKey)
      })

      // Send subscription to server
      await fetch('/api/v1/push_subscriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': this.csrfToken
        },
        body: JSON.stringify({ subscription: subscription.toJSON() })
      })

      this.enabledValue = true
      this.showSuccess('Notifications activées')
    } catch (error) {
      console.error('[Push] Subscription failed:', error)
      this.showError('Erreur lors de l\'activation')
    }
  }

  async unsubscribe() {
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      if (subscription) {
        // Notify server
        await fetch('/api/v1/push_subscriptions', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': this.csrfToken
          },
          body: JSON.stringify({ endpoint: subscription.endpoint })
        })

        // Unsubscribe locally
        await subscription.unsubscribe()
      }

      this.enabledValue = false
      this.showSuccess('Notifications désactivées')
    } catch (error) {
      console.error('[Push] Unsubscribe failed:', error)
      this.showError('Erreur lors de la désactivation')
    }
  }

  async ensureSubscription() {
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      this.enabledValue = !!subscription
    } catch (error) {
      this.enabledValue = false
    }
  }

  updateUI() {
    if (this.hasButtonTarget) {
      this.buttonTarget.textContent = this.enabledValue ? 'Désactiver' : 'Activer'
      this.buttonTarget.classList.toggle('bg-primary-600', !this.enabledValue)
      this.buttonTarget.classList.toggle('bg-red-600', this.enabledValue)
    }

    if (this.hasStatusTarget) {
      this.statusTarget.textContent = this.enabledValue ? 'Activées' : 'Désactivées'
      this.statusTarget.classList.toggle('text-green-600', this.enabledValue)
      this.statusTarget.classList.toggle('text-gray-500', !this.enabledValue)
    }
  }

  showSuccess(message) {
    // Use your toast/flash system
    console.log('[Push] Success:', message)
  }

  showError(message) {
    console.error('[Push] Error:', message)
  }

  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }

    return outputArray
  }

  get csrfToken() {
    return document.querySelector('meta[name="csrf-token"]')?.content
  }
}
```

### 2.7.7 Testing PWA

#### Lighthouse PWA Audit Checklist

| Requirement | Test Method | Expected Score |
|-------------|-------------|----------------|
| **Installable** | Lighthouse > PWA | Pass |
| **Fast and reliable** | < 3s FCP, < 5s LCP | > 90 |
| **Optimized** | Assets compressed | > 90 |
| **Works offline** | Airplane mode test | Pass |

```bash
# Run Lighthouse in CI
lighthouse https://app.seido.be \
  --output=json \
  --output-path=./lighthouse-report.json \
  --chrome-flags="--headless"

# PWA-specific audit
npx pwa-audit https://app.seido.be
```

#### Service Worker Tests (RSpec)

```ruby
# spec/requests/serviceworker_spec.rb
require 'rails_helper'

RSpec.describe 'Service Worker', type: :request do
  describe 'GET /serviceworker.js' do
    it 'returns JavaScript content' do
      get '/serviceworker.js'

      expect(response).to have_http_status(:ok)
      expect(response.content_type).to include('application/javascript')
    end

    it 'includes correct caching headers' do
      get '/serviceworker.js'

      # Service worker should not be cached by browser
      expect(response.headers['Cache-Control']).to include('no-cache')
    end
  end

  describe 'GET /manifest.json' do
    it 'returns valid JSON manifest' do
      get '/manifest.json'

      expect(response).to have_http_status(:ok)
      expect(response.content_type).to include('application/json')

      manifest = JSON.parse(response.body)

      expect(manifest['name']).to eq('SEIDO')
      expect(manifest['display']).to eq('standalone')
      expect(manifest['icons'].length).to be >= 4
    end
  end
end
```

#### E2E PWA Tests (Playwright)

```javascript
// spec/e2e/pwa.spec.js

const { test, expect } = require('@playwright/test');

test.describe('PWA Features', () => {
  test('manifest is accessible', async ({ page }) => {
    const response = await page.goto('/manifest.json');
    expect(response.status()).toBe(200);

    const manifest = await response.json();
    expect(manifest.name).toBe('SEIDO');
    expect(manifest.display).toBe('standalone');
  });

  test('service worker registers', async ({ page }) => {
    await page.goto('/');

    // Wait for service worker to register
    const swRegistered = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return false;

      const registration = await navigator.serviceWorker.ready;
      return !!registration.active;
    });

    expect(swRegistered).toBe(true);
  });

  test('app works offline', async ({ page, context }) => {
    // Load the page first (populates cache)
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Go offline
    await context.setOffline(true);

    // Navigate should still work
    await page.goto('/interventions');

    // Should show cached content or offline page
    const content = await page.content();
    expect(content).toContain('SEIDO');
  });

  test('install prompt appears on mobile', async ({ browser }) => {
    const context = await browser.newContext({
      ...devices['iPhone 12'],
    });
    const page = await context.newPage();

    await page.goto('/');

    // Check for install banner
    await page.waitForSelector('[data-pwa-install-target="banner"]', {
      state: 'visible',
      timeout: 5000
    }).catch(() => null);

    // Banner may not appear immediately, but should be in DOM
    const bannerExists = await page.$('[data-pwa-install-target="banner"]');
    expect(bannerExists).not.toBeNull();

    await context.close();
  });
});
```

#### Push Notification Tests

```ruby
# spec/models/push_subscription_spec.rb
require 'rails_helper'

RSpec.describe PushSubscription, type: :model do
  let(:user) { create(:user) }
  let(:subscription) { create(:push_subscription, user: user) }

  describe 'validations' do
    it { should belong_to(:user) }
    it { should validate_presence_of(:endpoint) }
    it { should validate_presence_of(:keys) }
  end

  describe '#deliver' do
    it 'sends notification via webpush' do
      allow(Webpush).to receive(:payload_send)

      subscription.deliver(
        title: 'Test',
        body: 'Test message'
      )

      expect(Webpush).to have_received(:payload_send)
    end

    it 'deactivates on expired subscription' do
      allow(Webpush).to receive(:payload_send)
        .and_raise(Webpush::ExpiredSubscription)

      subscription.deliver(title: 'Test', body: 'Test')

      expect(subscription.reload.active).to be false
    end
  end
end
```

---

*End of Section 2 - Tech Stack*

---

← Previous: [Overview](01-overview-personas.md) | Next: [Data Models](03-data-models.md) →
