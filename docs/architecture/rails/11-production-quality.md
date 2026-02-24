[← Back to Architecture Hub](../seido-rails-architecture.md) | [Previous: Deployment & DevOps](./10-deployment-devops.md) | [Next: Appendices](./12-appendices.md)

# 11 — Production Quality & Best Practices

> Combines Sections 13-19 from the full architecture document: Performance, CI/CD, Scalability, Security, Frontend, API Best Practices, Code Quality.

---

# 13. Performance Optimization

This section covers performance best practices for a production Rails application based on official Rails documentation and industry standards.

## 13.1 Query Optimization

### 13.1.1 N+1 Query Detection with Bullet

```ruby
# Gemfile
group :development do
  gem 'bullet'
end

# config/environments/development.rb
config.after_initialize do
  Bullet.enable = true
  Bullet.alert = true
  Bullet.bullet_logger = true
  Bullet.console = true
  Bullet.rails_logger = true
  Bullet.add_footer = true

  # Raise in development for CI detection
  Bullet.raise = Rails.env.test?
end
```

### 13.1.2 Eager Loading Patterns

```ruby
# ❌ BAD: N+1 Query Problem
def index
  @interventions = Intervention.all
  # View: intervention.lot.building.name triggers N+1
end

# ✅ GOOD: Eager Loading with includes
def index
  @interventions = Intervention.includes(lot: :building)
                               .includes(:team, :created_by)
end

# ✅ BETTER: Preload vs Includes
# Use preload when you ONLY need associated records (separate queries)
# Use includes when you need to filter/order by association (LEFT JOIN)
# Use eager_load when you ALWAYS want LEFT JOIN

class Intervention < ApplicationRecord
  # Default scope for common includes
  scope :with_associations, -> {
    includes(:team, :lot, :created_by)
      .includes(lot: :building)
  }

  # Specific scopes for different views
  scope :for_list, -> {
    select(:id, :reference, :status, :created_at, :lot_id, :team_id)
      .includes(:lot)
  }

  scope :for_detail, -> {
    includes(:team, :lot, :created_by, :assigned_providers)
      .includes(lot: [:building, :contracts])
      .includes(:quotes, :time_slots, :comments)
  }
end
```

### 13.1.3 Query Counter in Specs

```ruby
# spec/support/query_counter.rb
module QueryCounter
  def count_queries(&block)
    count = 0
    counter = ->(name, start, finish, id, payload) {
      count += 1 unless payload[:name] =~ /SCHEMA|CACHE/
    }

    ActiveSupport::Notifications.subscribed(counter, 'sql.active_record', &block)
    count
  end
end

RSpec.configure do |config|
  config.include QueryCounter
end

# spec/models/intervention_spec.rb
RSpec.describe Intervention do
  describe 'query optimization' do
    it 'loads list view with 2 queries max' do
      create_list(:intervention, 10)

      query_count = count_queries do
        Intervention.for_list.each { |i| i.lot&.address }
      end

      expect(query_count).to be <= 2
    end
  end
end
```

### 13.1.4 Database Indexes Strategy

```ruby
# db/migrate/YYYYMMDD_add_performance_indexes.rb
class AddPerformanceIndexes < ActiveRecord::Migration[7.1]
  def change
    # Covering indexes for common queries
    add_index :interventions, [:team_id, :status, :created_at],
              name: 'idx_interventions_team_status_date',
              order: { created_at: :desc }

    # Partial indexes for active records only
    add_index :contracts, :lot_id,
              where: "status = 'actif' AND deleted_at IS NULL",
              name: 'idx_contracts_active_by_lot'

    # Expression indexes for case-insensitive search
    add_index :contacts, 'LOWER(email)',
              name: 'idx_contacts_email_lower'

    # BRIN indexes for time-series data (very large tables)
    execute <<-SQL
      CREATE INDEX idx_activity_logs_created_at_brin
      ON activity_logs USING BRIN (created_at)
      WITH (pages_per_range = 128);
    SQL
  end
end
```

## 13.2 Caching Strategy

### 13.2.1 Multi-Layer Cache Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CACHING LAYERS                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Layer 1: Process Cache (fastest, per-process)                             │
│  ───────────────────────────────────────────────                           │
│  • Rails.cache.fetch with memory_store (in dev)                            │
│  • RequestStore for request-scoped caching                                 │
│  • Memoization in models (@_cached_value ||= ...)                          │
│                                                                             │
│  Layer 2: Redis Cache (shared across processes)                            │
│  ───────────────────────────────────────────────                           │
│  • Fragment caching for ViewComponents                                      │
│  • Low-level caching for expensive queries                                  │
│  • Session storage                                                          │
│                                                                             │
│  Layer 3: CDN/HTTP Cache (edge, closest to user)                           │
│  ───────────────────────────────────────────────                           │
│  • Static assets (JS, CSS, images)                                          │
│  • ETag/Last-Modified for dynamic content                                   │
│  • Cloudflare/Fastly page rules                                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 13.2.2 Fragment Caching with ViewComponent

```ruby
# app/components/intervention_card_component.rb
class InterventionCardComponent < ViewComponent::Base
  erb_template <<-ERB
    <%# Cache key includes updated_at for auto-invalidation %>
    <% cache [intervention, 'v1'] do %>
      <div class="intervention-card" data-status="<%= intervention.status %>">
        <h3><%= intervention.reference %></h3>
        <p><%= intervention.lot.address %></p>
        <span class="badge <%= status_color %>"><%= intervention.status_label %></span>
      </div>
    <% end %>
  ERB

  def initialize(intervention:)
    @intervention = intervention
  end

  private

  attr_reader :intervention

  def status_color
    case intervention.status
    when 'demande' then 'bg-blue-100'
    when 'approuvee' then 'bg-green-100'
    when 'rejetee' then 'bg-red-100'
    else 'bg-gray-100'
    end
  end
end
```

### 13.2.3 Russian Doll Caching

```erb
<%# app/views/buildings/show.html.erb %>
<% cache @building do %>
  <h1><%= @building.name %></h1>

  <div class="lots">
    <% @building.lots.each do |lot| %>
      <% cache lot do %>
        <%= render LotCardComponent.new(lot: lot) %>

        <div class="interventions">
          <% lot.interventions.recent.each do |intervention| %>
            <% cache intervention do %>
              <%= render InterventionCardComponent.new(intervention: intervention) %>
            <% end %>
          <% end %>
        </div>
      <% end %>
    <% end %>
  </div>
<% end %>
```

### 13.2.4 Low-Level Caching for Expensive Queries

```ruby
# app/services/stats_service.rb
class StatsService
  CACHE_TTL = 5.minutes

  def dashboard_stats(team_id)
    Rails.cache.fetch("team/#{team_id}/dashboard_stats", expires_in: CACHE_TTL) do
      {
        interventions_count: Intervention.where(team_id: team_id).count,
        pending_quotes: InterventionQuote.pending.joins(:intervention)
                          .where(interventions: { team_id: team_id }).count,
        buildings_count: Building.where(team_id: team_id).count,
        lots_count: Lot.where(team_id: team_id).count
      }
    end
  end

  # Invalidate on data changes
  def invalidate_for_team(team_id)
    Rails.cache.delete_matched("team/#{team_id}/*")
  end
end

# app/models/intervention.rb
class Intervention < ApplicationRecord
  after_commit :invalidate_stats_cache

  private

  def invalidate_stats_cache
    StatsService.new.invalidate_for_team(team_id)
  end
end
```

### 13.2.5 HTTP Caching (ETag/Last-Modified)

```ruby
# app/controllers/api/v1/buildings_controller.rb
class Api::V1::BuildingsController < Api::V1::BaseController
  def index
    @buildings = policy_scope(Building).order(:updated_at)

    # ETag based on collection
    fresh_when(
      etag: @buildings,
      last_modified: @buildings.maximum(:updated_at),
      public: false
    )
  end

  def show
    @building = authorize Building.find(params[:id])

    # Conditional GET - returns 304 if not modified
    if stale?(etag: @building, last_modified: @building.updated_at)
      render json: BuildingSerializer.new(@building)
    end
  end
end
```

## 13.3 Database Connection Pooling

### 13.3.1 Pool Sizing Formula

```yaml
# config/database.yml
production:
  adapter: postgresql
  encoding: unicode
  # Formula: (web_concurrency × max_threads) + sidekiq_concurrency + headroom
  # Example: (2 × 5) + 10 + 5 = 25
  pool: <%= ENV.fetch("RAILS_MAX_THREADS") { 5 }.to_i + 5 %>

  # Statement caching for prepared statements
  prepared_statements: true

  # Connection timeout
  connect_timeout: 5
  checkout_timeout: 5

  # Reaping for leaked connections
  reaping_frequency: 10
```

### 13.3.2 PgBouncer Configuration (Production)

```ini
# /etc/pgbouncer/pgbouncer.ini
[databases]
seido_production = host=db.example.com port=5432 dbname=seido_production

[pgbouncer]
listen_addr = 127.0.0.1
listen_port = 6432
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt

# Pool mode: transaction is best for Rails
pool_mode = transaction

# Pool sizing
default_pool_size = 100
max_client_conn = 1000
reserve_pool_size = 25

# Timeouts
server_lifetime = 3600
server_idle_timeout = 600
query_timeout = 30
```

## 13.4 Asset Pipeline Optimization

### 13.4.1 Import Maps Configuration (Recommended for Rails 7+)

```ruby
# config/importmap.rb
pin "application", preload: true
pin "@hotwired/turbo-rails", to: "turbo.min.js", preload: true
pin "@hotwired/stimulus", to: "stimulus.min.js", preload: true
pin "@hotwired/stimulus-loading", to: "stimulus-loading.js", preload: true
pin_all_from "app/javascript/controllers", under: "controllers"

# External libraries from CDN
pin "chart.js", to: "https://ga.jspm.io/npm:chart.js@4.4.0/dist/chart.js"
```

### 13.4.2 CDN Configuration

```ruby
# config/environments/production.rb
config.action_controller.asset_host = ENV.fetch('CDN_HOST') { 'https://cdn.seido.app' }

# Serve compressed assets
config.assets.compress = true
config.assets.css_compressor = :sass
config.assets.js_compressor = :terser

# Cache manifest for fingerprinting
config.assets.digest = true
```

### 13.4.3 Image Optimization with ActiveStorage

```ruby
# app/models/document.rb
class Document < ApplicationRecord
  has_one_attached :file do |attachable|
    # Automatically create optimized variants
    attachable.variant :thumbnail, resize_to_limit: [100, 100], format: :webp
    attachable.variant :medium, resize_to_limit: [500, 500], format: :webp
    attachable.variant :large, resize_to_limit: [1200, 1200], format: :webp
  end
end

# app/helpers/image_helper.rb
module ImageHelper
  def optimized_image_tag(document, variant: :medium, **options)
    return unless document.file.attached?

    # Responsive images with srcset
    image_tag(
      document.file.variant(variant),
      srcset: srcset_for(document),
      loading: 'lazy',
      decoding: 'async',
      **options
    )
  end

  private

  def srcset_for(document)
    {
      rails_blob_path(document.file.variant(:thumbnail)) => '100w',
      rails_blob_path(document.file.variant(:medium)) => '500w',
      rails_blob_path(document.file.variant(:large)) => '1200w'
    }.map { |url, size| "#{url} #{size}" }.join(', ')
  end
end
```

---

*End of Section 13 - Performance Optimization*

---

# 14. CI/CD Pipeline

This section defines the continuous integration and deployment pipeline for SEIDO.

## 14.1 GitHub Actions Workflow

### 14.1.1 Complete CI/CD Pipeline

```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

env:
  RAILS_ENV: test
  DATABASE_URL: postgres://postgres:postgres@localhost:5432/seido_test
  REDIS_URL: redis://localhost:6379/0

jobs:
  # ═══════════════════════════════════════════════════════════════════════════
  # JOB 1: LINTING
  # ═══════════════════════════════════════════════════════════════════════════
  lint:
    name: Code Quality
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Ruby
        uses: ruby/setup-ruby@v1
        with:
          ruby-version: '3.2'
          bundler-cache: true

      - name: Run Rubocop
        run: bundle exec rubocop --format github

      - name: Run Brakeman Security Scanner
        run: bundle exec brakeman -z --format github

  # ═══════════════════════════════════════════════════════════════════════════
  # JOB 2: TESTS
  # ═══════════════════════════════════════════════════════════════════════════
  test:
    name: Tests
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: seido_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:7
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - name: Setup Ruby
        uses: ruby/setup-ruby@v1
        with:
          ruby-version: '3.2'
          bundler-cache: true

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Setup database
        run: |
          bundle exec rails db:create
          bundle exec rails db:schema:load

      - name: Run RSpec
        run: bundle exec rspec --format progress --format RspecJunitFormatter --out tmp/rspec.xml

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: coverage/coverage.xml
          fail_ci_if_error: true

      - name: Check coverage threshold
        run: |
          COVERAGE=$(cat coverage/.last_run.json | jq '.result.line')
          if (( $(echo "$COVERAGE < 80" | bc -l) )); then
            echo "Coverage $COVERAGE% is below 80% threshold"
            exit 1
          fi

  # ═══════════════════════════════════════════════════════════════════════════
  # JOB 3: SECURITY
  # ═══════════════════════════════════════════════════════════════════════════
  security:
    name: Security Scan
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Ruby
        uses: ruby/setup-ruby@v1
        with:
          ruby-version: '3.2'
          bundler-cache: true

      - name: Check for vulnerable gems
        run: bundle exec bundle-audit check --update

      - name: Run Brakeman
        run: bundle exec brakeman -q -w2

  # ═══════════════════════════════════════════════════════════════════════════
  # JOB 4: E2E TESTS (optional, on main only)
  # ═══════════════════════════════════════════════════════════════════════════
  e2e:
    name: E2E Tests
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    needs: [lint, test, security]

    steps:
      - uses: actions/checkout@v4

      - name: Setup Ruby
        uses: ruby/setup-ruby@v1
        with:
          ruby-version: '3.2'
          bundler-cache: true

      - name: Install Playwright
        run: npx playwright install --with-deps chromium

      - name: Run E2E Tests
        run: bundle exec rspec spec/system --format progress

  # ═══════════════════════════════════════════════════════════════════════════
  # JOB 5: DEPLOY TO STAGING
  # ═══════════════════════════════════════════════════════════════════════════
  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    needs: [lint, test, security]
    if: github.ref == 'refs/heads/develop'
    environment: staging

    steps:
      - uses: actions/checkout@v4

      - name: Deploy to Staging
        uses: dokku/github-action@master
        with:
          git_remote_url: 'ssh://dokku@staging.seido.app:22/seido'
          ssh_private_key: ${{ secrets.STAGING_SSH_KEY }}

  # ═══════════════════════════════════════════════════════════════════════════
  # JOB 6: DEPLOY TO PRODUCTION (Blue-Green)
  # ═══════════════════════════════════════════════════════════════════════════
  deploy-production:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: [lint, test, security, e2e]
    if: github.ref == 'refs/heads/main'
    environment: production

    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: eu-west-1

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build and push Docker image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/seido:$IMAGE_TAG .
          docker push $ECR_REGISTRY/seido:$IMAGE_TAG

      - name: Deploy to ECS (Blue-Green)
        run: |
          aws ecs update-service \
            --cluster seido-production \
            --service seido-web \
            --force-new-deployment

      - name: Wait for deployment
        run: |
          aws ecs wait services-stable \
            --cluster seido-production \
            --services seido-web
```

## 14.2 Database Migrations Strategy

### 14.2.1 Zero-Downtime Migrations with Strong Migrations

```ruby
# Gemfile
gem 'strong_migrations'

# config/initializers/strong_migrations.rb
StrongMigrations.start_after = 20240101000000

# Safety checks
StrongMigrations.target_version = 7.1

# Custom error messages
StrongMigrations.error_messages[:add_column_default] =
  "Adding a column with a default value locks the table. " \
  "Instead:\n1. Add column without default\n2. Backfill in batches\n3. Change default"
```

### 14.2.2 Safe Migration Patterns

```ruby
# ❌ UNSAFE: Locks entire table
class AddStatusToInterventions < ActiveRecord::Migration[7.1]
  def change
    add_column :interventions, :priority, :string, default: 'normal'
  end
end

# ✅ SAFE: Three-step migration
class AddPriorityToInterventionsStep1 < ActiveRecord::Migration[7.1]
  def change
    add_column :interventions, :priority, :string
  end
end

class BackfillInterventionsPriority < ActiveRecord::Migration[7.1]
  disable_ddl_transaction!

  def up
    Intervention.unscoped.in_batches(of: 1000) do |batch|
      batch.update_all(priority: 'normal')
      sleep(0.1) # Rate limit to avoid lock contention
    end
  end
end

class AddPriorityToInterventionsStep3 < ActiveRecord::Migration[7.1]
  def change
    change_column_default :interventions, :priority, 'normal'
    change_column_null :interventions, :priority, false
  end
end
```

### 14.2.3 Rollback Procedures

```ruby
# Always implement reversible migrations
class CreateNewFeature < ActiveRecord::Migration[7.1]
  def change
    # This is automatically reversible
    create_table :new_features do |t|
      t.string :name
      t.timestamps
    end
  end
end

# For complex migrations, use up/down
class MigrateDataToNewSchema < ActiveRecord::Migration[7.1]
  def up
    execute <<-SQL
      INSERT INTO new_features (name, created_at, updated_at)
      SELECT title, created_at, updated_at FROM old_features;
    SQL
  end

  def down
    execute "DELETE FROM new_features WHERE id IN (SELECT id FROM old_features)"
  end
end
```

## 14.3 Environment Configuration

### 14.3.1 Rails Credentials (Recommended)

```bash
# Edit credentials for each environment
EDITOR=vim rails credentials:edit --environment production
```

```yaml
# config/credentials/production.yml.enc (decrypted view)
secret_key_base: "..."

database:
  host: db.seido.app
  password: "..."

redis:
  url: redis://redis.seido.app:6379/0

stripe:
  secret_key: sk_live_...
  webhook_secret: whsec_...

resend:
  api_key: re_...

sentry:
  dsn: https://...@sentry.io/...
```

### 14.3.2 Feature Flags with Flipper

```ruby
# Gemfile
gem 'flipper'
gem 'flipper-redis'
gem 'flipper-ui'

# config/initializers/flipper.rb
Flipper.configure do |config|
  config.adapter { Flipper::Adapters::Redis.new(Redis.new(url: ENV['REDIS_URL'])) }
end

# Define features
Flipper.register(:staff) do |actor|
  actor.respond_to?(:admin?) && actor.admin?
end

# Usage in code
if Flipper.enabled?(:new_dashboard, current_user)
  render 'dashboard/v2'
else
  render 'dashboard/v1'
end

# Usage in views
<% if flipper[:new_intervention_form].enabled?(current_user) %>
  <%= render 'interventions/form_v2' %>
<% else %>
  <%= render 'interventions/form_v1' %>
<% end %>

# Mount UI in routes (admin only)
mount Flipper::UI.app(Flipper) => '/admin/flipper', constraints: AdminConstraint.new
```

---

*End of Section 14 - CI/CD Pipeline*

---

# 15. Scalability Patterns

This section covers patterns for scaling SEIDO to handle growth from 100 to 100,000+ users.

## 15.1 Database Read Replicas

### 15.1.1 Configuration with Makara

```ruby
# Gemfile
gem 'makara'

# config/database.yml
production:
  adapter: postgresql_makara
  makara:
    sticky: true
    connections:
      - role: master
        database: seido_production
        host: db-primary.seido.app
        username: <%= ENV['DATABASE_USERNAME'] %>
        password: <%= ENV['DATABASE_PASSWORD'] %>
      - role: slave
        database: seido_production
        host: db-replica-1.seido.app
        username: <%= ENV['DATABASE_USERNAME'] %>
        password: <%= ENV['DATABASE_PASSWORD'] %>
      - role: slave
        database: seido_production
        host: db-replica-2.seido.app
        username: <%= ENV['DATABASE_USERNAME'] %>
        password: <%= ENV['DATABASE_PASSWORD'] %>
```

### 15.1.2 Read/Write Split Patterns

```ruby
# app/controllers/concerns/read_from_replica.rb
module ReadFromReplica
  extend ActiveSupport::Concern

  included do
    around_action :use_replica_for_get_requests, if: :replica_safe_request?
  end

  private

  def use_replica_for_get_requests
    ActiveRecord::Base.connected_to(role: :reading) do
      yield
    end
  end

  def replica_safe_request?
    request.get? && !request.path.start_with?('/api/v1/interventions')
  end
end

# app/models/concerns/replica_queryable.rb
module ReplicaQueryable
  extend ActiveSupport::Concern

  class_methods do
    def from_replica(&block)
      ActiveRecord::Base.connected_to(role: :reading, &block)
    end
  end
end

# Usage
Building.from_replica { Building.where(team_id: team_id).count }
```

## 15.2 Horizontal Scaling

### 15.2.1 Stateless Application Design

```ruby
# config/initializers/session_store.rb
Rails.application.config.session_store :redis_store,
  servers: [ENV.fetch('REDIS_URL') { 'redis://localhost:6379/0/session' }],
  expire_after: 1.day,
  key: '_seido_session',
  secure: Rails.env.production?,
  httponly: true

# config/environments/production.rb
config.cache_store = :redis_cache_store, {
  url: ENV['REDIS_URL'],
  namespace: 'seido_cache',
  expires_in: 1.hour
}
```

### 15.2.2 File Uploads to S3

```ruby
# config/storage.yml
amazon:
  service: S3
  access_key_id: <%= ENV['AWS_ACCESS_KEY_ID'] %>
  secret_access_key: <%= ENV['AWS_SECRET_ACCESS_KEY'] %>
  region: eu-west-1
  bucket: seido-uploads-production

  # Direct upload from browser
  upload:
    cache_control: 'max-age=31536000, public'

# app/models/document.rb
class Document < ApplicationRecord
  has_one_attached :file, service: :amazon

  # Direct upload URL for client
  def direct_upload_url
    file.blob.signed_id
  end
end
```

## 15.3 Background Jobs Architecture

### 15.3.1 Sidekiq Configuration

```ruby
# config/sidekiq.yml
:concurrency: <%= ENV.fetch('SIDEKIQ_CONCURRENCY') { 10 } %>
:timeout: 25
:max_retries: 3

:queues:
  - [critical, 6]      # Payments, auth emails
  - [default, 4]       # Standard jobs
  - [mailers, 3]       # Email sending
  - [low, 1]           # Reports, analytics

:scheduler:
  - cron: '0 2 * * *'  # Daily at 2 AM
    class: CleanupJob
    queue: low

  - cron: '*/5 * * * *'  # Every 5 minutes
    class: SyncEmailsJob
    queue: default
```

### 15.3.2 Bulk Operations Pattern

```ruby
# app/services/bulk_import_service.rb
class BulkImportService
  BATCH_SIZE = 1000

  def import_interventions(csv_path, team_id)
    ImportJob.perform_later(csv_path, team_id)
  end

  class ImportJob < ApplicationJob
    queue_as :low

    def perform(csv_path, team_id)
      total = 0
      errors = []

      CSV.foreach(csv_path, headers: true).each_slice(BATCH_SIZE) do |batch|
        records = batch.map { |row| build_intervention(row, team_id) }

        Intervention.insert_all(
          records.map(&:attributes).map { |a| a.except('id') },
          returning: false
        )

        total += records.size
        broadcast_progress(total)
      end

      ImportMailer.completed(team_id, total, errors).deliver_later
    end

    private

    def broadcast_progress(count)
      ActionCable.server.broadcast("import_#{job_id}", { count: count })
    end
  end
end
```

### 15.3.3 Circuit Breaker for External APIs

```ruby
# app/services/concerns/circuit_breaker.rb
module CircuitBreaker
  extend ActiveSupport::Concern

  THRESHOLD = 5
  TIMEOUT = 30.seconds

  included do
    class_attribute :circuit_name
  end

  def with_circuit(&block)
    state = Rails.cache.read(circuit_key)

    if state == :open
      if Time.current > Rails.cache.read("#{circuit_key}_timeout")
        Rails.cache.write(circuit_key, :half_open)
      else
        raise CircuitOpenError, "Circuit #{circuit_name} is open"
      end
    end

    begin
      result = yield
      reset_circuit if state == :half_open
      result
    rescue => e
      record_failure
      raise
    end
  end

  private

  def circuit_key
    "circuit:#{circuit_name}"
  end

  def record_failure
    failures = Rails.cache.increment("#{circuit_key}_failures", 1, expires_in: 1.minute)

    if failures >= THRESHOLD
      Rails.cache.write(circuit_key, :open, expires_in: TIMEOUT)
      Rails.cache.write("#{circuit_key}_timeout", TIMEOUT.from_now)
      Rails.logger.error("Circuit #{circuit_name} opened after #{failures} failures")
    end
  end

  def reset_circuit
    Rails.cache.delete(circuit_key)
    Rails.cache.delete("#{circuit_key}_failures")
  end
end

# app/services/stripe_service.rb
class StripeService
  include CircuitBreaker
  self.circuit_name = :stripe

  def create_subscription(team, plan)
    with_circuit do
      Stripe::Subscription.create(
        customer: team.stripe_customer_id,
        items: [{ price: plan.stripe_price_id }]
      )
    end
  end
end
```

## 15.4 Database Sharding (Future)

### 15.4.1 Partition Strategy by Team ID

```ruby
# For future growth: partition interventions by team_id
# This allows moving high-volume teams to separate databases

# config/initializers/sharding.rb
# Placeholder for multi-database configuration
if ENV['ENABLE_SHARDING'] == 'true'
  ActiveRecord::Base.connects_to(shards: {
    default: { writing: :primary, reading: :primary_replica },
    shard_one: { writing: :shard_one, reading: :shard_one_replica }
  })
end

# app/models/concerns/shardable.rb
module Shardable
  extend ActiveSupport::Concern

  included do
    # When sharding is enabled, route queries to correct shard
    def self.on_shard_for(team_id, &block)
      shard = determine_shard(team_id)
      ActiveRecord::Base.connected_to(shard: shard, &block)
    end

    def self.determine_shard(team_id)
      # Simple modulo sharding - replace with consistent hashing for production
      team_id.to_i % 4 # Assuming 4 shards
    end
  end
end
```

---

*End of Section 15 - Scalability Patterns*

---

# 16. Security Hardening

This section covers security best practices beyond basic Rails defaults.

## 16.1 Rate Limiting with Rack::Attack

### 16.1.1 Configuration

```ruby
# Gemfile
gem 'rack-attack'

# config/initializers/rack_attack.rb
class Rack::Attack
  # Use Redis for distributed rate limiting
  Rack::Attack.cache.store = ActiveSupport::Cache::RedisCacheStore.new(
    url: ENV['REDIS_URL'],
    namespace: 'rack_attack'
  )

  # ═══════════════════════════════════════════════════════════════════════════
  # SAFELIST
  # ═══════════════════════════════════════════════════════════════════════════
  safelist('allow from localhost') do |req|
    req.ip == '127.0.0.1' || req.ip == '::1'
  end

  safelist('allow health checks') do |req|
    req.path == '/health' || req.path == '/up'
  end

  # ═══════════════════════════════════════════════════════════════════════════
  # THROTTLE BY IP
  # ═══════════════════════════════════════════════════════════════════════════
  throttle('req/ip', limit: 300, period: 1.minute) do |req|
    req.ip unless req.path.start_with?('/assets', '/packs')
  end

  # Stricter limit for API
  throttle('api/ip', limit: 100, period: 1.minute) do |req|
    req.ip if req.path.start_with?('/api/')
  end

  # ═══════════════════════════════════════════════════════════════════════════
  # THROTTLE LOGIN ATTEMPTS
  # ═══════════════════════════════════════════════════════════════════════════
  throttle('logins/email', limit: 5, period: 1.minute) do |req|
    if req.path == '/users/sign_in' && req.post?
      req.params.dig('user', 'email')&.downcase&.strip
    end
  end

  throttle('logins/ip', limit: 20, period: 1.hour) do |req|
    req.ip if req.path == '/users/sign_in' && req.post?
  end

  # ═══════════════════════════════════════════════════════════════════════════
  # THROTTLE PASSWORD RESET
  # ═══════════════════════════════════════════════════════════════════════════
  throttle('password_reset/email', limit: 3, period: 1.hour) do |req|
    if req.path == '/users/password' && req.post?
      req.params.dig('user', 'email')&.downcase&.strip
    end
  end

  # ═══════════════════════════════════════════════════════════════════════════
  # BLOCK SUSPICIOUS REQUESTS
  # ═══════════════════════════════════════════════════════════════════════════
  blocklist('block bad user agents') do |req|
    req.user_agent.blank? ||
      req.user_agent =~ /^(curl|wget|python|java|go-http)/i
  end

  # Block known bad paths
  blocklist('block wordpress probes') do |req|
    req.path =~ /\.(php|asp|aspx)$/ ||
      req.path.include?('wp-admin') ||
      req.path.include?('wp-login')
  end

  # ═══════════════════════════════════════════════════════════════════════════
  # CUSTOM RESPONSES
  # ═══════════════════════════════════════════════════════════════════════════
  self.throttled_responder = lambda do |env|
    retry_after = (env['rack.attack.match_data'] || {})[:period]
    [
      429,
      { 'Content-Type' => 'application/json', 'Retry-After' => retry_after.to_s },
      [{ error: 'Rate limit exceeded. Retry later.', retry_after: retry_after }.to_json]
    ]
  end

  self.blocklisted_responder = lambda do |env|
    [403, { 'Content-Type' => 'text/plain' }, ['Forbidden']]
  end
end
```

## 16.2 Encryption at Rest

### 16.2.1 ActiveRecord Encryption Setup

```ruby
# config/credentials.yml.enc
active_record_encryption:
  primary_key: <%= SecureRandom.alphanumeric(32) %>
  deterministic_key: <%= SecureRandom.alphanumeric(32) %>
  key_derivation_salt: <%= SecureRandom.alphanumeric(32) %>

# config/initializers/active_record_encryption.rb
Rails.application.configure do
  config.active_record.encryption.primary_key = Rails.application.credentials.dig(:active_record_encryption, :primary_key)
  config.active_record.encryption.deterministic_key = Rails.application.credentials.dig(:active_record_encryption, :deterministic_key)
  config.active_record.encryption.key_derivation_salt = Rails.application.credentials.dig(:active_record_encryption, :key_derivation_salt)
end
```

### 16.2.2 Encrypting PII Fields

```ruby
# app/models/contact.rb
class Contact < ApplicationRecord
  # Deterministic encryption - allows querying
  encrypts :email, deterministic: true

  # Non-deterministic encryption - more secure, no querying
  encrypts :phone
  encrypts :address
  encrypts :bank_iban

  # Validate after decryption
  validates :email, format: { with: URI::MailTo::EMAIL_REGEXP }
end

# Querying encrypted fields (only deterministic)
Contact.find_by(email: 'user@example.com')  # Works
Contact.where('phone LIKE ?', '%123%')       # Won't work - use full match only
```

## 16.3 CORS Configuration

### 16.3.1 Rack CORS Setup

```ruby
# Gemfile
gem 'rack-cors'

# config/initializers/cors.rb
Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    # Frontend domains
    origins ENV.fetch('CORS_ORIGINS', 'https://app.seido.app').split(',')

    resource '/api/*',
      headers: :any,
      methods: [:get, :post, :put, :patch, :delete, :options, :head],
      credentials: true,
      max_age: 86400  # Cache preflight for 24 hours

    resource '/cable',
      headers: :any,
      methods: [:get, :post],
      credentials: true
  end
end
```

## 16.4 Dependency Scanning

### 16.4.1 Bundler Audit Configuration

```ruby
# Gemfile
group :development, :test do
  gem 'bundler-audit', require: false
  gem 'ruby_audit', require: false
end

# lib/tasks/security.rake
namespace :security do
  desc 'Run all security checks'
  task audit: :environment do
    puts 'Checking for vulnerable gems...'
    system('bundle audit check --update') || exit(1)

    puts 'Checking for Ruby vulnerabilities...'
    system('bundle exec ruby-audit check') || exit(1)

    puts 'Running Brakeman...'
    system('bundle exec brakeman -q --no-summary -w2') || exit(1)

    puts 'All security checks passed!'
  end
end
```

### 16.4.2 Dependabot Configuration

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: bundler
    directory: /
    schedule:
      interval: weekly
      day: monday
      time: '09:00'
      timezone: Europe/Paris
    open-pull-requests-limit: 10
    groups:
      rails:
        patterns:
          - 'rails*'
          - 'activerecord*'
          - 'actionpack*'
      security:
        patterns:
          - 'devise*'
          - 'rack-attack'
          - 'bcrypt'

  - package-ecosystem: npm
    directory: /
    schedule:
      interval: weekly
```

## 16.5 Input Validation

### 16.5.1 Strong Parameters with Strict Mode

```ruby
# app/controllers/application_controller.rb
class ApplicationController < ActionController::Base
  # Raise on unpermitted parameters in development
  before_action :configure_permitted_parameters, if: :devise_controller?

  rescue_from ActionController::UnpermittedParameters do |e|
    render json: { error: 'Unpermitted parameters', details: e.params }, status: :bad_request
  end

  private

  def configure_permitted_parameters
    devise_parameter_sanitizer.permit(:sign_up, keys: [:first_name, :last_name])
    devise_parameter_sanitizer.permit(:account_update, keys: [:first_name, :last_name, :avatar])
  end
end

# app/controllers/api/v1/interventions_controller.rb
class Api::V1::InterventionsController < Api::V1::BaseController
  def create
    @intervention = authorize Intervention.new(intervention_params)
    @intervention.team = current_team
    @intervention.created_by = current_user

    if @intervention.save
      render json: InterventionSerializer.new(@intervention), status: :created
    else
      render json: { errors: @intervention.errors }, status: :unprocessable_entity
    end
  end

  private

  def intervention_params
    params.require(:intervention).permit(
      :lot_id,
      :category,
      :urgency,
      :description,
      :preferred_date,
      photos: []
    )
  end
end
```

### 16.5.2 Sanitization Helpers

```ruby
# app/models/concerns/sanitizable.rb
module Sanitizable
  extend ActiveSupport::Concern

  included do
    before_validation :sanitize_inputs
  end

  private

  def sanitize_inputs
    self.class.columns.each do |column|
      next unless column.type == :string || column.type == :text

      value = send(column.name)
      next if value.blank?

      # Strip whitespace
      sanitized = value.strip

      # Remove potential XSS (for text fields that allow some HTML)
      if respond_to?(:sanitizable_html_fields) && sanitizable_html_fields.include?(column.name.to_sym)
        sanitized = ActionController::Base.helpers.sanitize(sanitized, tags: %w[b i u strong em p br])
      end

      send("#{column.name}=", sanitized)
    end
  end
end

# app/models/intervention_comment.rb
class InterventionComment < ApplicationRecord
  include Sanitizable

  def sanitizable_html_fields
    [:content]
  end
end
```

---

*End of Section 16 - Security Hardening*

---

# 17. Frontend Integration

This section covers Hotwire (Turbo + Stimulus) and ViewComponent patterns for building modern Rails UIs.

## 17.1 ViewComponent Architecture

### 17.1.1 Component Organization

```
app/components/
├── application_component.rb          # Base class
├── ui/                               # Generic UI components
│   ├── button_component.rb
│   ├── card_component.rb
│   ├── badge_component.rb
│   └── modal_component.rb
├── interventions/                    # Domain-specific
│   ├── card_component.rb
│   ├── status_badge_component.rb
│   └── timeline_component.rb
└── layouts/                          # Layout components
    ├── header_component.rb
    ├── sidebar_component.rb
    └── navbar_component.rb
```

### 17.1.2 Base Component with Stimulus Integration

```ruby
# app/components/application_component.rb
class ApplicationComponent < ViewComponent::Base
  include Turbo::StreamsHelper

  # Automatically derive Stimulus controller from component name
  def stimulus_controller
    self.class.name.underscore.gsub('/', '--').gsub('_component', '')
  end

  # Helper for component-scoped CSS classes
  def component_class(*classes)
    [stimulus_controller.gsub('--', '-'), *classes].compact.join(' ')
  end
end

# app/components/ui/button_component.rb
class Ui::ButtonComponent < ApplicationComponent
  VARIANTS = {
    primary: 'bg-primary text-white hover:bg-primary/90',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
    outline: 'border border-input bg-background hover:bg-accent',
    ghost: 'hover:bg-accent hover:text-accent-foreground',
    link: 'text-primary underline-offset-4 hover:underline'
  }.freeze

  SIZES = {
    sm: 'h-8 px-3 text-xs',
    md: 'h-10 px-4 py-2',
    lg: 'h-12 px-8 text-lg'
  }.freeze

  def initialize(variant: :primary, size: :md, disabled: false, loading: false, **html_options)
    @variant = variant
    @size = size
    @disabled = disabled
    @loading = loading
    @html_options = html_options
  end

  erb_template <<-ERB
    <button
      class="<%= button_classes %>"
      <%= 'disabled' if @disabled || @loading %>
      <%= tag_options(@html_options) %>
    >
      <% if @loading %>
        <svg class="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
        </svg>
      <% end %>
      <%= content %>
    </button>
  ERB

  private

  def button_classes
    [
      'inline-flex items-center justify-center rounded-md font-medium transition-colors',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
      'disabled:pointer-events-none disabled:opacity-50',
      VARIANTS[@variant],
      SIZES[@size]
    ].compact.join(' ')
  end
end
```

### 17.1.3 Slot Patterns

```ruby
# app/components/ui/card_component.rb
class Ui::CardComponent < ApplicationComponent
  renders_one :header
  renders_one :footer
  renders_many :actions

  def initialize(title: nil, **html_options)
    @title = title
    @html_options = html_options
  end

  erb_template <<-ERB
    <div class="rounded-lg border bg-card text-card-foreground shadow-sm" <%= tag_options(@html_options) %>>
      <% if header || @title %>
        <div class="flex flex-col space-y-1.5 p-6">
          <% if header %>
            <%= header %>
          <% else %>
            <h3 class="text-lg font-semibold leading-none tracking-tight"><%= @title %></h3>
          <% end %>
        </div>
      <% end %>

      <div class="p-6 pt-0">
        <%= content %>
      </div>

      <% if footer || actions.any? %>
        <div class="flex items-center p-6 pt-0 gap-2">
          <% if footer %>
            <%= footer %>
          <% else %>
            <% actions.each do |action| %>
              <%= action %>
            <% end %>
          <% end %>
        </div>
      <% end %>
    </div>
  ERB
end
```

## 17.2 Stimulus Controllers

### 17.2.1 State Management Patterns

```javascript
// app/javascript/controllers/form_controller.js
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["submit", "input", "error"]
  static values = {
    submitText: { type: String, default: "Submit" },
    loadingText: { type: String, default: "Saving..." },
    autoSave: { type: Boolean, default: false },
    autoSaveDelay: { type: Number, default: 1000 }
  }

  connect() {
    this.validateForm()
    if (this.autoSaveValue) {
      this.setupAutoSave()
    }
  }

  // Event handlers
  inputChanged(event) {
    this.validateForm()
    this.clearFieldError(event.target)

    if (this.autoSaveValue) {
      this.scheduleAutoSave()
    }
  }

  submit(event) {
    if (!this.isValid()) {
      event.preventDefault()
      this.showErrors()
      return
    }

    this.setLoading(true)
  }

  // Private methods
  validateForm() {
    const isValid = this.inputTargets.every(input => {
      return input.checkValidity()
    })

    this.submitTarget.disabled = !isValid
    return isValid
  }

  isValid() {
    return this.inputTargets.every(input => input.reportValidity())
  }

  setLoading(loading) {
    this.submitTarget.disabled = loading
    this.submitTarget.textContent = loading ? this.loadingTextValue : this.submitTextValue

    if (loading) {
      this.submitTarget.classList.add('cursor-wait')
    } else {
      this.submitTarget.classList.remove('cursor-wait')
    }
  }

  clearFieldError(input) {
    const errorTarget = this.errorTargets.find(e => e.dataset.field === input.name)
    if (errorTarget) {
      errorTarget.textContent = ''
      errorTarget.classList.add('hidden')
    }
  }

  setupAutoSave() {
    this.autoSaveTimeout = null
  }

  scheduleAutoSave() {
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout)
    }

    this.autoSaveTimeout = setTimeout(() => {
      if (this.isValid()) {
        this.element.requestSubmit()
      }
    }, this.autoSaveDelayValue)
  }

  disconnect() {
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout)
    }
  }
}
```

### 17.2.2 Controller Composition

```javascript
// app/javascript/controllers/dropdown_controller.js
import { Controller } from "@hotwired/stimulus"
import { useClickOutside, useTransition } from "stimulus-use"

export default class extends Controller {
  static targets = ["menu", "button"]
  static values = { open: Boolean }

  connect() {
    useClickOutside(this)
    useTransition(this, { element: this.menuTarget })
  }

  toggle() {
    this.openValue = !this.openValue
  }

  openValueChanged() {
    if (this.openValue) {
      this.enter()
      this.buttonTarget.setAttribute('aria-expanded', 'true')
    } else {
      this.leave()
      this.buttonTarget.setAttribute('aria-expanded', 'false')
    }
  }

  clickOutside() {
    if (this.openValue) {
      this.openValue = false
    }
  }

  // Keyboard navigation
  keydown(event) {
    switch (event.key) {
      case 'Escape':
        this.openValue = false
        this.buttonTarget.focus()
        break
      case 'ArrowDown':
        event.preventDefault()
        this.focusNextItem()
        break
      case 'ArrowUp':
        event.preventDefault()
        this.focusPreviousItem()
        break
    }
  }
}
```

## 17.3 Turbo Frames & Streams

### 17.3.1 Frame Navigation Patterns

```erb
<%# app/views/interventions/index.html.erb %>
<div class="flex gap-4">
  <%# Sidebar with filters %>
  <aside class="w-64">
    <%= turbo_frame_tag "filters" do %>
      <%= render "filters", filters: @filters %>
    <% end %>
  </aside>

  <%# Main content - updates independently %>
  <main class="flex-1">
    <%= turbo_frame_tag "interventions_list" do %>
      <div class="space-y-4">
        <% @interventions.each do |intervention| %>
          <%= render InterventionCardComponent.new(intervention: intervention) %>
        <% end %>
      </div>

      <%# Pagination within frame %>
      <%= turbo_frame_tag "pagination" do %>
        <%= render "shared/pagination", pagy: @pagy %>
      <% end %>
    <% end %>
  </main>

  <%# Detail panel - lazy loaded %>
  <%= turbo_frame_tag "intervention_detail", src: nil, loading: :lazy do %>
    <p class="text-muted-foreground">Select an intervention to view details</p>
  <% end %>
</div>
```

### 17.3.2 Broadcast from Models

```ruby
# app/models/intervention.rb
class Intervention < ApplicationRecord
  include Turbo::Broadcastable

  after_create_commit -> {
    broadcast_prepend_to "team_#{team_id}_interventions",
      target: "interventions_list",
      partial: "interventions/intervention",
      locals: { intervention: self }
  }

  after_update_commit -> {
    broadcast_replace_to "team_#{team_id}_interventions",
      target: dom_id(self),
      partial: "interventions/intervention",
      locals: { intervention: self }
  }

  after_destroy_commit -> {
    broadcast_remove_to "team_#{team_id}_interventions",
      target: dom_id(self)
  }
end

# app/views/interventions/index.html.erb
<%= turbo_stream_from "team_#{current_team.id}_interventions" %>
```

### 17.3.3 Lazy Loading Frames

```erb
<%# Lazy load expensive content %>
<%= turbo_frame_tag "statistics",
      src: team_statistics_path,
      loading: :lazy do %>
  <div class="animate-pulse">
    <div class="h-32 bg-muted rounded"></div>
  </div>
<% end %>

<%# With skeleton component %>
<%= turbo_frame_tag "recent_activity",
      src: recent_activity_path,
      loading: :lazy do %>
  <%= render Ui::SkeletonComponent.new(lines: 5) %>
<% end %>
```

## 17.4 Design System Integration

### 17.4.1 CSS Variables (from Next.js globals.css)

```css
/* app/assets/stylesheets/application.tailwind.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* SEIDO Color System (OKLCH) */
    --background: 0 0% 100%;
    --foreground: 240 10% 3.9%;
    --card: 0 0% 100%;
    --card-foreground: 240 10% 3.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 240 10% 3.9%;
    --primary: 240 5.9% 10%;
    --primary-foreground: 0 0% 98%;
    --secondary: 240 4.8% 95.9%;
    --secondary-foreground: 240 5.9% 10%;
    --muted: 240 4.8% 95.9%;
    --muted-foreground: 240 3.8% 46.1%;
    --accent: 240 4.8% 95.9%;
    --accent-foreground: 240 5.9% 10%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 0 0% 98%;
    --border: 240 5.9% 90%;
    --input: 240 5.9% 90%;
    --ring: 240 5.9% 10%;
    --radius: 0.5rem;

    /* Status colors */
    --status-demande: 217 91% 60%;
    --status-approuvee: 142 71% 45%;
    --status-rejetee: 0 84% 60%;
    --status-en-cours: 38 92% 50%;
    --status-cloturee: 240 5% 64%;

    /* Dashboard variables */
    --header-height: 64px;
    --sidebar-width: 256px;
    --dashboard-padding: 1.5rem;
  }

  .dark {
    --background: 240 10% 3.9%;
    --foreground: 0 0% 98%;
    --card: 240 10% 3.9%;
    --card-foreground: 0 0% 98%;
    /* ... dark mode overrides */
  }
}
```

### 17.4.2 Dark Mode Toggle

```javascript
// app/javascript/controllers/theme_controller.js
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static values = { theme: String }
  static targets = ["icon"]

  connect() {
    this.themeValue = this.getStoredTheme() || this.getSystemTheme()
    this.applyTheme()
  }

  toggle() {
    this.themeValue = this.themeValue === 'dark' ? 'light' : 'dark'
    this.applyTheme()
    localStorage.setItem('theme', this.themeValue)
  }

  applyTheme() {
    document.documentElement.classList.toggle('dark', this.themeValue === 'dark')
    this.updateIcon()
  }

  getStoredTheme() {
    return localStorage.getItem('theme')
  }

  getSystemTheme() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }

  updateIcon() {
    if (this.hasIconTarget) {
      this.iconTarget.innerHTML = this.themeValue === 'dark' ? this.sunIcon : this.moonIcon
    }
  }

  get sunIcon() {
    return '<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>'
  }

  get moonIcon() {
    return '<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>'
  }
}
```

## 17.5 Accessibility (WCAG 2.1 AA)

### 17.5.1 ARIA Labels Helpers

```ruby
# app/helpers/accessibility_helper.rb
module AccessibilityHelper
  # Screen reader only text
  def sr_only(text)
    content_tag(:span, text, class: 'sr-only')
  end

  # Accessible icon button
  def icon_button(icon:, label:, **options)
    button_tag(options.merge('aria-label': label)) do
      concat(icon)
      concat(sr_only(label))
    end
  end

  # Live region for dynamic updates
  def live_region(politeness: 'polite', &block)
    content_tag(:div, 'aria-live': politeness, 'aria-atomic': true, &block)
  end

  # Skip link for keyboard navigation
  def skip_link(target: '#main-content', text: 'Skip to main content')
    link_to text, target, class: 'sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-background focus:text-foreground'
  end
end
```

### 17.5.2 Focus Management

```javascript
// app/javascript/controllers/focus_trap_controller.js
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["container"]

  connect() {
    this.focusableElements = this.getFocusableElements()
    this.firstElement = this.focusableElements[0]
    this.lastElement = this.focusableElements[this.focusableElements.length - 1]

    // Store previously focused element
    this.previouslyFocused = document.activeElement

    // Focus first element
    this.firstElement?.focus()
  }

  disconnect() {
    // Restore focus when trap is removed
    this.previouslyFocused?.focus()
  }

  trapFocus(event) {
    if (event.key !== 'Tab') return

    if (event.shiftKey) {
      // Shift + Tab
      if (document.activeElement === this.firstElement) {
        event.preventDefault()
        this.lastElement?.focus()
      }
    } else {
      // Tab
      if (document.activeElement === this.lastElement) {
        event.preventDefault()
        this.firstElement?.focus()
      }
    }
  }

  getFocusableElements() {
    const selector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    return [...this.containerTarget.querySelectorAll(selector)].filter(el => !el.disabled)
  }
}
```

---

*End of Section 17 - Frontend Integration*

---

# 18. API Best Practices

Cette section definit les conventions et patterns pour une API REST robuste, scalable et facile a maintenir.

## 18.1 Pagination Strategy

### 18.1.1 Cursor-Based Pagination (Recommande)

**Avantages** : Performance constante O(1), pas de probleme de "page drift" lors d'insertions/suppressions.

```ruby
# app/controllers/concerns/cursor_paginated.rb
module CursorPaginated
  extend ActiveSupport::Concern

  CURSOR_PARAM = :cursor
  PER_PAGE_PARAM = :per_page
  DEFAULT_PER_PAGE = 25
  MAX_PER_PAGE = 100

  included do
    helper_method :pagination_metadata if respond_to?(:helper_method)
  end

  private

  def paginate_with_cursor(scope, order_column: :id, order_direction: :desc)
    per_page = [(params[PER_PAGE_PARAM] || DEFAULT_PER_PAGE).to_i, MAX_PER_PAGE].min
    cursor = params[CURSOR_PARAM]

    if cursor.present?
      decoded_cursor = decode_cursor(cursor)
      scope = apply_cursor_condition(scope, decoded_cursor, order_column, order_direction)
    end

    # Fetch one extra to determine if there's a next page
    records = scope
      .order(order_column => order_direction)
      .limit(per_page + 1)
      .to_a

    has_next_page = records.size > per_page
    records = records.first(per_page)

    {
      records: records,
      pagination: build_pagination_metadata(records, has_next_page, order_column)
    }
  end

  def apply_cursor_condition(scope, cursor_value, column, direction)
    operator = direction == :desc ? '<' : '>'
    scope.where("#{column} #{operator} ?", cursor_value)
  end

  def encode_cursor(value)
    Base64.urlsafe_encode64(value.to_s)
  end

  def decode_cursor(cursor)
    Base64.urlsafe_decode64(cursor)
  rescue ArgumentError
    nil
  end

  def build_pagination_metadata(records, has_next_page, column)
    {
      has_next_page: has_next_page,
      has_previous_page: params[CURSOR_PARAM].present?,
      next_cursor: has_next_page ? encode_cursor(records.last&.send(column)) : nil,
      count: records.size
    }
  end
end
```

**Usage dans un controleur** :

```ruby
# app/controllers/api/v1/interventions_controller.rb
class Api::V1::InterventionsController < Api::V1::BaseController
  include CursorPaginated

  def index
    interventions = policy_scope(Intervention)
      .includes(:lot, :building, :assignments)

    result = paginate_with_cursor(
      interventions,
      order_column: :created_at,
      order_direction: :desc
    )

    render json: {
      data: InterventionSerializer.render_as_hash(result[:records]),
      meta: {
        pagination: result[:pagination]
      }
    }
  end
end
```

### 18.1.2 Offset Pagination (Cas Simples)

**Usage** : Pour les petites collections ou quand le numero de page est requis.

```ruby
# app/controllers/concerns/offset_paginated.rb
module OffsetPaginated
  extend ActiveSupport::Concern

  DEFAULT_PAGE = 1
  DEFAULT_PER_PAGE = 25
  MAX_PER_PAGE = 100

  private

  def paginate_with_offset(scope)
    page = [params[:page].to_i, DEFAULT_PAGE].max
    per_page = [[params[:per_page].to_i, DEFAULT_PER_PAGE].max, MAX_PER_PAGE].min

    total_count = scope.count
    total_pages = (total_count.to_f / per_page).ceil

    records = scope
      .offset((page - 1) * per_page)
      .limit(per_page)

    {
      records: records,
      pagination: {
        current_page: page,
        per_page: per_page,
        total_count: total_count,
        total_pages: total_pages,
        has_next_page: page < total_pages,
        has_previous_page: page > 1
      }
    }
  end
end
```

### 18.1.3 Headers de Pagination

```ruby
# app/controllers/concerns/pagination_headers.rb
module PaginationHeaders
  extend ActiveSupport::Concern

  private

  def set_pagination_headers(pagination)
    response.headers['X-Total-Count'] = pagination[:total_count].to_s if pagination[:total_count]
    response.headers['X-Total-Pages'] = pagination[:total_pages].to_s if pagination[:total_pages]
    response.headers['X-Current-Page'] = pagination[:current_page].to_s if pagination[:current_page]
    response.headers['X-Per-Page'] = pagination[:per_page].to_s if pagination[:per_page]
    response.headers['X-Has-Next-Page'] = pagination[:has_next_page].to_s
    response.headers['X-Next-Cursor'] = pagination[:next_cursor] if pagination[:next_cursor]

    # Link header (RFC 5988)
    links = build_link_header(pagination)
    response.headers['Link'] = links.join(', ') if links.present?
  end

  def build_link_header(pagination)
    links = []
    base_url = request.url.split('?').first

    if pagination[:has_next_page] && pagination[:next_cursor]
      links << "<#{base_url}?cursor=#{pagination[:next_cursor]}>; rel=\"next\""
    end

    if pagination[:current_page]
      links << "<#{base_url}?page=1>; rel=\"first\""
      links << "<#{base_url}?page=#{pagination[:total_pages]}>; rel=\"last\"" if pagination[:total_pages]
    end

    links
  end
end
```

---

## 18.2 Error Response Format

### 18.2.1 Standardized Error Schema (JSON:API Compatible)

```ruby
# app/lib/api_error.rb
class ApiError
  attr_reader :code, :title, :detail, :status, :source, :meta

  def initialize(code:, title:, detail: nil, status: 400, source: nil, meta: {})
    @code = code
    @title = title
    @detail = detail
    @status = status
    @source = source
    @meta = meta
  end

  def to_hash
    {
      code: code,
      title: title,
      detail: detail,
      status: status.to_s,
      source: source,
      meta: meta.presence
    }.compact
  end
end

# app/lib/error_registry.rb
class ErrorRegistry
  ERRORS = {
    # Authentication errors (401xx)
    'AUTH_001' => { title: 'Token expired', status: 401 },
    'AUTH_002' => { title: 'Invalid token', status: 401 },
    'AUTH_003' => { title: 'Missing authentication', status: 401 },

    # Authorization errors (403xx)
    'AUTHZ_001' => { title: 'Insufficient permissions', status: 403 },
    'AUTHZ_002' => { title: 'Resource access denied', status: 403 },
    'AUTHZ_003' => { title: 'Team membership required', status: 403 },

    # Validation errors (400xx)
    'VALIDATION_001' => { title: 'Invalid input', status: 400 },
    'VALIDATION_002' => { title: 'Missing required field', status: 400 },
    'VALIDATION_003' => { title: 'Invalid format', status: 400 },

    # Resource errors (404xx)
    'RESOURCE_001' => { title: 'Resource not found', status: 404 },
    'RESOURCE_002' => { title: 'Resource deleted', status: 410 },

    # Conflict errors (409xx)
    'CONFLICT_001' => { title: 'Resource already exists', status: 409 },
    'CONFLICT_002' => { title: 'Concurrent modification', status: 409 },
    'CONFLICT_003' => { title: 'Invalid state transition', status: 409 },

    # Rate limiting (429xx)
    'RATE_001' => { title: 'Rate limit exceeded', status: 429 },

    # Server errors (500xx)
    'SERVER_001' => { title: 'Internal server error', status: 500 },
    'SERVER_002' => { title: 'Service unavailable', status: 503 }
  }.freeze

  def self.build(code, detail: nil, source: nil, meta: {})
    template = ERRORS[code] || { title: 'Unknown error', status: 500 }

    ApiError.new(
      code: code,
      title: template[:title],
      detail: detail,
      status: template[:status],
      source: source,
      meta: meta
    )
  end
end
```

### 18.2.2 Error Rendering Concern

```ruby
# app/controllers/concerns/api_error_handler.rb
module ApiErrorHandler
  extend ActiveSupport::Concern

  included do
    rescue_from StandardError, with: :handle_standard_error
    rescue_from ActiveRecord::RecordNotFound, with: :handle_not_found
    rescue_from ActiveRecord::RecordInvalid, with: :handle_validation_error
    rescue_from Pundit::NotAuthorizedError, with: :handle_unauthorized
    rescue_from ActionController::ParameterMissing, with: :handle_parameter_missing
  end

  private

  def render_error(error_or_code, detail: nil, source: nil, meta: {})
    error = if error_or_code.is_a?(ApiError)
              error_or_code
            else
              ErrorRegistry.build(error_or_code, detail: detail, source: source, meta: meta)
            end

    render json: { errors: [error.to_hash] }, status: error.status
  end

  def render_errors(errors)
    render json: { errors: errors.map(&:to_hash) }, status: errors.first.status
  end

  def handle_not_found(exception)
    render_error('RESOURCE_001', detail: exception.message)
  end

  def handle_validation_error(exception)
    errors = exception.record.errors.map do |error|
      ErrorRegistry.build(
        'VALIDATION_001',
        detail: error.full_message,
        source: { pointer: "/data/attributes/#{error.attribute}" }
      )
    end
    render_errors(errors)
  end

  def handle_unauthorized(exception)
    render_error(
      'AUTHZ_001',
      detail: "You are not authorized to #{exception.query.to_s.delete('?')} this #{exception.record.class.name.underscore}"
    )
  end

  def handle_parameter_missing(exception)
    render_error(
      'VALIDATION_002',
      detail: exception.message,
      source: { parameter: exception.param }
    )
  end

  def handle_standard_error(exception)
    Rails.logger.error("Unhandled exception: #{exception.class} - #{exception.message}")
    Rails.logger.error(exception.backtrace.first(10).join("\n"))

    if Rails.env.production?
      render_error('SERVER_001')
    else
      render_error('SERVER_001', detail: exception.message, meta: { backtrace: exception.backtrace.first(5) })
    end
  end
end
```

### 18.2.3 I18n Error Messages

```yaml
# config/locales/api_errors.fr.yml
fr:
  api_errors:
    AUTH_001:
      title: "Session expiree"
      detail: "Votre session a expire. Veuillez vous reconnecter."
    AUTH_002:
      title: "Token invalide"
      detail: "Le token d'authentification est invalide."
    AUTHZ_001:
      title: "Acces non autorise"
      detail: "Vous n'avez pas les permissions necessaires."
    VALIDATION_001:
      title: "Donnees invalides"
      detail: "Les donnees fournies ne sont pas valides."
    RESOURCE_001:
      title: "Ressource introuvable"
      detail: "La ressource demandee n'existe pas."
    CONFLICT_003:
      title: "Transition invalide"
      detail: "Cette action n'est pas possible dans l'etat actuel."

# config/locales/api_errors.en.yml
en:
  api_errors:
    AUTH_001:
      title: "Session expired"
      detail: "Your session has expired. Please log in again."
    # ... etc
```

---

## 18.3 Filtering & Sorting

### 18.3.1 Query Parameter Conventions

```
GET /api/v1/interventions
  ?filter[status]=approuvee,planifiee
  &filter[priority]=urgente
  &filter[created_at][gte]=2025-01-01
  &filter[created_at][lte]=2025-12-31
  &sort=-created_at,priority
  &include=lot,building,assignments
```

### 18.3.2 Ransack Integration

```ruby
# Gemfile
gem 'ransack', '~> 4.0'

# app/controllers/concerns/filterable.rb
module Filterable
  extend ActiveSupport::Concern

  ALLOWED_OPERATORS = %w[eq not_eq lt lteq gt gteq cont start end in not_in null not_null].freeze

  private

  def apply_filters(scope, allowed_filters:)
    return scope if filter_params.blank?

    ransack_params = build_ransack_params(filter_params, allowed_filters)
    scope.ransack(ransack_params).result
  end

  def filter_params
    params[:filter]&.to_unsafe_h || {}
  end

  def build_ransack_params(filters, allowed)
    filters.each_with_object({}) do |(key, value), result|
      next unless allowed.include?(key.to_sym)

      if value.is_a?(Hash)
        # Nested operators: filter[created_at][gte]=2025-01-01
        value.each do |operator, val|
          next unless ALLOWED_OPERATORS.include?(operator.to_s)
          result["#{key}_#{operator}"] = val
        end
      elsif value.include?(',')
        # Multiple values: filter[status]=approuvee,planifiee
        result["#{key}_in"] = value.split(',')
      else
        result["#{key}_eq"] = value
      end
    end
  end
end
```

### 18.3.3 Multi-Field Sorting

```ruby
# app/controllers/concerns/sortable.rb
module Sortable
  extend ActiveSupport::Concern

  DEFAULT_SORT = '-created_at'.freeze
  MAX_SORT_FIELDS = 3

  private

  def apply_sorting(scope, allowed_fields:, default: DEFAULT_SORT)
    sort_param = params[:sort].presence || default
    sort_fields = parse_sort_fields(sort_param, allowed_fields)

    return scope.order(created_at: :desc) if sort_fields.empty?

    order_hash = sort_fields.each_with_object({}) do |(field, direction), hash|
      hash[field] = direction
    end

    scope.order(order_hash)
  end

  def parse_sort_fields(sort_param, allowed)
    sort_param
      .split(',')
      .first(MAX_SORT_FIELDS)
      .filter_map do |field|
        direction = field.start_with?('-') ? :desc : :asc
        clean_field = field.delete_prefix('-').to_sym

        [clean_field, direction] if allowed.include?(clean_field)
      end
  end
end
```

### 18.3.4 Usage Complet

```ruby
# app/controllers/api/v1/interventions_controller.rb
class Api::V1::InterventionsController < Api::V1::BaseController
  include CursorPaginated
  include Filterable
  include Sortable

  ALLOWED_FILTERS = %i[status priority urgency_level lot_id building_id created_at updated_at].freeze
  ALLOWED_SORTS = %i[created_at updated_at priority status].freeze

  def index
    interventions = policy_scope(Intervention)
    interventions = apply_filters(interventions, allowed_filters: ALLOWED_FILTERS)
    interventions = apply_sorting(interventions, allowed_fields: ALLOWED_SORTS)
    interventions = interventions.includes(:lot, :building, :assignments)

    result = paginate_with_cursor(interventions, order_column: :created_at)

    render json: {
      data: InterventionSerializer.render_as_hash(result[:records]),
      meta: { pagination: result[:pagination] }
    }
  end
end
```

---

## 18.4 Bulk Operations

### 18.4.1 Batch Create/Update Endpoints

```ruby
# app/controllers/api/v1/interventions/bulk_controller.rb
module Api::V1::Interventions
  class BulkController < Api::V1::BaseController
    MAX_BATCH_SIZE = 100

    # POST /api/v1/interventions/bulk
    def create
      validate_batch_size!
      authorize Intervention, :create?

      results = process_batch(:create)
      render_batch_response(results, :created)
    end

    # PATCH /api/v1/interventions/bulk
    def update
      validate_batch_size!

      results = process_batch(:update)
      render_batch_response(results, :ok)
    end

    # DELETE /api/v1/interventions/bulk
    def destroy
      validate_batch_size!

      results = batch_params.map do |item|
        intervention = find_and_authorize(item[:id], :destroy?)
        { id: item[:id], success: intervention&.destroy.present? }
      end

      render json: { data: results }
    end

    private

    def batch_params
      params.require(:data).map do |item|
        item.permit(:id, :title, :description, :priority, :status, :lot_id, :building_id)
      end
    end

    def validate_batch_size!
      if batch_params.size > MAX_BATCH_SIZE
        render_error(
          'VALIDATION_001',
          detail: "Batch size exceeds maximum of #{MAX_BATCH_SIZE}"
        )
      end
    end

    def process_batch(action)
      batch_params.map do |item_params|
        process_single_item(item_params, action)
      end
    end

    def process_single_item(item_params, action)
      ActiveRecord::Base.transaction do
        case action
        when :create
          intervention = current_team.interventions.new(item_params)
          intervention.created_by = current_user
          intervention.save!
          { id: intervention.id, success: true }
        when :update
          intervention = find_and_authorize(item_params[:id], :update?)
          intervention.update!(item_params.except(:id))
          { id: intervention.id, success: true }
        end
      end
    rescue ActiveRecord::RecordInvalid => e
      { id: item_params[:id], success: false, errors: e.record.errors.full_messages }
    rescue Pundit::NotAuthorizedError
      { id: item_params[:id], success: false, errors: ['Not authorized'] }
    end

    def find_and_authorize(id, action)
      intervention = current_team.interventions.find(id)
      authorize intervention, action
      intervention
    end

    def render_batch_response(results, success_status)
      all_successful = results.all? { |r| r[:success] }
      status = all_successful ? success_status : :multi_status

      render json: {
        data: results,
        meta: {
          total: results.size,
          successful: results.count { |r| r[:success] },
          failed: results.count { |r| !r[:success] }
        }
      }, status: status
    end
  end
end
```

### 18.4.2 Idempotency Keys

```ruby
# app/controllers/concerns/idempotent.rb
module Idempotent
  extend ActiveSupport::Concern

  IDEMPOTENCY_HEADER = 'Idempotency-Key'.freeze
  IDEMPOTENCY_TTL = 24.hours

  included do
    before_action :check_idempotency, only: %i[create update]
    after_action :store_idempotency_response, only: %i[create update]
  end

  private

  def idempotency_key
    request.headers[IDEMPOTENCY_HEADER]
  end

  def check_idempotency
    return unless idempotency_key.present?

    cached_response = Rails.cache.read(idempotency_cache_key)
    if cached_response
      render json: cached_response[:body], status: cached_response[:status]
    end
  end

  def store_idempotency_response
    return unless idempotency_key.present?
    return unless response.successful?

    Rails.cache.write(
      idempotency_cache_key,
      { body: response.body, status: response.status },
      expires_in: IDEMPOTENCY_TTL
    )
  end

  def idempotency_cache_key
    "idempotency:#{current_user.id}:#{idempotency_key}"
  end
end
```

### 18.4.3 Transaction Handling

```ruby
# app/services/bulk_operation_service.rb
class BulkOperationService
  include Dry::Monads[:result]

  MAX_RETRIES = 3
  RETRY_DELAY = 0.1

  def initialize(items:, operation:, context:)
    @items = items
    @operation = operation
    @context = context
    @results = []
  end

  def execute
    @items.each_with_index do |item, index|
      result = execute_with_retry(item, index)
      @results << result
    end

    build_response
  end

  private

  def execute_with_retry(item, index)
    retries = 0

    begin
      ActiveRecord::Base.transaction(requires_new: true) do
        execute_operation(item, index)
      end
    rescue ActiveRecord::Deadlocked, ActiveRecord::LockWaitTimeout => e
      retries += 1
      if retries <= MAX_RETRIES
        sleep(RETRY_DELAY * retries)
        retry
      end
      Failure(index: index, error: "Transaction failed after #{MAX_RETRIES} retries")
    end
  end

  def execute_operation(item, index)
    case @operation
    when :create
      create_item(item, index)
    when :update
      update_item(item, index)
    when :delete
      delete_item(item, index)
    end
  end

  def build_response
    successful = @results.select { |r| r.success? }
    failed = @results.select { |r| r.failure? }

    {
      successful: successful.map(&:value!),
      failed: failed.map(&:failure),
      summary: {
        total: @items.size,
        successful: successful.size,
        failed: failed.size
      }
    }
  end
end
```

---

## 18.5 API Versioning

### 18.5.1 URL Versioning Strategy

```ruby
# config/routes.rb
Rails.application.routes.draw do
  namespace :api do
    namespace :v1 do
      resources :interventions do
        collection do
          post :bulk, to: 'interventions/bulk#create'
          patch :bulk, to: 'interventions/bulk#update'
          delete :bulk, to: 'interventions/bulk#destroy'
        end
      end
      resources :buildings
      resources :lots
      resources :contacts
      resources :teams
    end

    namespace :v2 do
      # Future breaking changes go here
      resources :interventions
    end
  end
end
```

### 18.5.2 Base Controllers Per Version

```ruby
# app/controllers/api/v1/base_controller.rb
module Api::V1
  class BaseController < ApplicationController
    include ApiErrorHandler
    include CursorPaginated
    include Filterable
    include Sortable
    include Idempotent

    skip_before_action :verify_authenticity_token
    before_action :authenticate_api_user!
    before_action :set_default_response_format

    respond_to :json

    private

    def set_default_response_format
      request.format = :json unless params[:format]
    end

    def authenticate_api_user!
      # JWT authentication logic
    end

    def current_team
      @current_team ||= ActsAsTenant.current_tenant
    end
  end
end

# app/controllers/api/v2/base_controller.rb
module Api::V2
  class BaseController < Api::V1::BaseController
    # V2 specific changes
    # - Different serialization format
    # - New default behaviors
  end
end
```

### 18.5.3 Deprecation Policy

```ruby
# app/controllers/concerns/api_deprecation.rb
module ApiDeprecation
  extend ActiveSupport::Concern

  DEPRECATION_HEADER = 'Deprecation'.freeze
  SUNSET_HEADER = 'Sunset'.freeze
  LINK_HEADER = 'Link'.freeze

  included do
    after_action :set_deprecation_headers
  end

  class_methods do
    def deprecated!(sunset_date:, successor: nil)
      @deprecated = true
      @sunset_date = sunset_date
      @successor = successor
    end

    def deprecated?
      @deprecated || false
    end

    def sunset_date
      @sunset_date
    end

    def successor
      @successor
    end
  end

  private

  def set_deprecation_headers
    return unless self.class.deprecated?

    response.headers[DEPRECATION_HEADER] = 'true'
    response.headers[SUNSET_HEADER] = self.class.sunset_date.httpdate if self.class.sunset_date

    if self.class.successor
      response.headers[LINK_HEADER] = [
        response.headers[LINK_HEADER],
        "<#{self.class.successor}>; rel=\"successor-version\""
      ].compact.join(', ')
    end
  end
end

# Usage
class Api::V1::LegacyController < Api::V1::BaseController
  include ApiDeprecation

  deprecated!(
    sunset_date: Date.new(2025, 6, 1),
    successor: '/api/v2/resources'
  )
end
```

### 18.5.4 Documentation avec OpenAPI

```ruby
# Gemfile
gem 'rswag', '~> 2.10'

# spec/swagger_helper.rb
RSpec.configure do |config|
  config.openapi_root = Rails.root.join('swagger').to_s

  config.openapi_specs = {
    'v1/swagger.yaml' => {
      openapi: '3.0.1',
      info: {
        title: 'SEIDO API V1',
        version: 'v1',
        description: 'API de gestion immobiliere SEIDO',
        contact: {
          name: 'SEIDO Support',
          email: 'support@seido-app.com'
        }
      },
      servers: [
        { url: 'https://api.seido.pm', description: 'Production' },
        { url: 'https://staging-api.seido.pm', description: 'Staging' },
        { url: 'http://localhost:3000', description: 'Development' }
      ],
      components: {
        securitySchemes: {
          bearer_auth: {
            type: :http,
            scheme: :bearer,
            bearerFormat: :JWT
          }
        },
        schemas: {
          Intervention: {
            type: :object,
            properties: {
              id: { type: :string, format: :uuid },
              title: { type: :string },
              status: { type: :string, enum: Intervention::STATUSES },
              priority: { type: :string, enum: Intervention::PRIORITIES },
              created_at: { type: :string, format: 'date-time' },
              updated_at: { type: :string, format: 'date-time' }
            },
            required: %w[id title status]
          },
          Error: {
            type: :object,
            properties: {
              code: { type: :string },
              title: { type: :string },
              detail: { type: :string },
              status: { type: :string }
            }
          },
          Pagination: {
            type: :object,
            properties: {
              has_next_page: { type: :boolean },
              has_previous_page: { type: :boolean },
              next_cursor: { type: :string, nullable: true },
              count: { type: :integer }
            }
          }
        }
      },
      security: [{ bearer_auth: [] }]
    }
  }

  config.openapi_format = :yaml
end
```

---

*End of Section 18 - API Best Practices*

---

# 19. Code Quality Tools

Cette section etablit les standards de qualite de code et les outils pour les maintenir.

## 19.1 Rubocop Configuration

### 19.1.1 Configuration de Base

```yaml
# .rubocop.yml
require:
  - rubocop-rails
  - rubocop-rspec
  - rubocop-performance
  - rubocop-factory_bot

AllCops:
  TargetRubyVersion: 3.3
  NewCops: enable
  Exclude:
    - 'db/schema.rb'
    - 'db/migrate/*.rb'
    - 'bin/**/*'
    - 'node_modules/**/*'
    - 'vendor/**/*'
    - 'tmp/**/*'
    - 'coverage/**/*'

# --- Metrics ---
Metrics/ClassLength:
  Max: 200
  CountAsOne:
    - array
    - hash
    - heredoc
  Exclude:
    - 'app/models/intervention.rb'  # State machine makes this large

Metrics/MethodLength:
  Max: 20
  CountAsOne:
    - array
    - hash
    - heredoc
  Exclude:
    - 'db/seeds.rb'

Metrics/AbcSize:
  Max: 25
  Exclude:
    - 'app/services/**/*'

Metrics/CyclomaticComplexity:
  Max: 7

Metrics/PerceivedComplexity:
  Max: 8

Metrics/BlockLength:
  Exclude:
    - 'spec/**/*'
    - 'config/routes.rb'
    - 'config/environments/*.rb'
    - 'lib/tasks/**/*'

# --- Style ---
Style/Documentation:
  Enabled: false  # We use YARD instead

Style/FrozenStringLiteralComment:
  EnforcedStyle: always

Style/StringLiterals:
  EnforcedStyle: single_quotes

Style/SymbolArray:
  EnforcedStyle: brackets

Style/WordArray:
  EnforcedStyle: brackets

Style/TrailingCommaInArrayLiteral:
  EnforcedStyleForMultiline: consistent_comma

Style/TrailingCommaInHashLiteral:
  EnforcedStyleForMultiline: consistent_comma

Style/TrailingCommaInArguments:
  EnforcedStyleForMultiline: consistent_comma

Style/HashSyntax:
  EnforcedShorthandSyntax: never  # Ruby 3.1 shorthand is less readable

# --- Layout ---
Layout/LineLength:
  Max: 120
  AllowedPatterns:
    - '^\s*#'  # Comments can be longer
    - 'https?://'  # URLs

Layout/EmptyLinesAroundClassBody:
  EnforcedStyle: empty_lines_except_namespace

Layout/EmptyLinesAroundModuleBody:
  EnforcedStyle: empty_lines_except_namespace

Layout/MultilineMethodCallIndentation:
  EnforcedStyle: indented

# --- Naming ---
Naming/PredicateName:
  ForbiddenPrefixes:
    - is_
  Exclude:
    - 'spec/**/*'

Naming/MethodParameterName:
  AllowedNames:
    - e
    - id
    - ip
    - to

# --- Rails ---
Rails/FilePath:
  EnforcedStyle: arguments

Rails/HttpStatus:
  EnforcedStyle: symbolic

Rails/I18nLocaleTexts:
  Enabled: true

Rails/InverseOf:
  Enabled: true

Rails/UniqueValidationWithoutIndex:
  Enabled: true

Rails/BulkChangeTable:
  Enabled: true

Rails/SkipsModelValidations:
  AllowedMethods:
    - touch
    - update_column  # Used for specific performance cases

# --- RSpec ---
RSpec/ExampleLength:
  Max: 15

RSpec/MultipleExpectations:
  Max: 5

RSpec/NestedGroups:
  Max: 4

RSpec/LetSetup:
  Enabled: false  # let! is sometimes necessary

RSpec/MultipleMemoizedHelpers:
  Max: 10

RSpec/DescribeClass:
  Exclude:
    - 'spec/requests/**/*'
    - 'spec/system/**/*'
    - 'spec/features/**/*'

# --- Performance ---
Performance/Casecmp:
  Enabled: true

Performance/CollectionLiteralInLoop:
  Enabled: true

Performance/Count:
  Enabled: true

Performance/Detect:
  Enabled: true

Performance/FlatMap:
  Enabled: true

Performance/MapCompact:
  Enabled: true

Performance/RedundantBlockCall:
  Enabled: true

Performance/RedundantMatch:
  Enabled: true

Performance/RedundantMerge:
  Enabled: true

Performance/StringReplacement:
  Enabled: true
```

### 19.1.2 Custom Cops pour SEIDO

```ruby
# lib/rubocop/cop/seido/service_inheritance.rb
# frozen_string_literal: true

module RuboCop
  module Cop
    module Seido
      # Ensures all services inherit from ApplicationService
      #
      # @example
      #   # bad
      #   class InterventionService
      #     def call; end
      #   end
      #
      #   # good
      #   class InterventionService < ApplicationService
      #     def call; end
      #   end
      class ServiceInheritance < Base
        MSG = 'Service classes must inherit from ApplicationService.'

        def_node_matcher :service_class?, <<~PATTERN
          (class (const nil? /\w+Service$/) nil? ...)
        PATTERN

        def on_class(node)
          return unless service_class?(node)
          return if inherits_from_application_service?(node)

          add_offense(node)
        end

        private

        def inherits_from_application_service?(node)
          parent = node.children[1]
          return false unless parent

          parent.source == 'ApplicationService'
        end
      end
    end
  end
end

# lib/rubocop/cop/seido/policy_authorization.rb
# frozen_string_literal: true

module RuboCop
  module Cop
    module Seido
      # Ensures controller actions call authorize
      #
      # @example
      #   # bad
      #   def show
      #     @intervention = Intervention.find(params[:id])
      #   end
      #
      #   # good
      #   def show
      #     @intervention = Intervention.find(params[:id])
      #     authorize @intervention
      #   end
      class PolicyAuthorization < Base
        MSG = 'Controller actions must call `authorize` for Pundit authorization.'

        RESTFUL_ACTIONS = %i[show edit update destroy].freeze

        def on_def(node)
          return unless in_controller?
          return unless RESTFUL_ACTIONS.include?(node.method_name)
          return if calls_authorize?(node)

          add_offense(node, message: MSG)
        end

        private

        def in_controller?
          processed_source.file_path.include?('app/controllers/')
        end

        def calls_authorize?(node)
          node.body&.each_descendant(:send)&.any? do |send_node|
            send_node.method_name == :authorize
          end
        end
      end
    end
  end
end
```

### 19.1.3 Integration CI

```yaml
# .github/workflows/lint.yml
name: Lint

on: [push, pull_request]

jobs:
  rubocop:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Ruby
        uses: ruby/setup-ruby@v1
        with:
          ruby-version: 3.3
          bundler-cache: true

      - name: Run Rubocop
        run: bundle exec rubocop --parallel --format github

  erblint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Ruby
        uses: ruby/setup-ruby@v1
        with:
          ruby-version: 3.3
          bundler-cache: true

      - name: Run ERB Lint
        run: bundle exec erblint --lint-all
```

---

## 19.2 Brakeman Security Scanner

### 19.2.1 Configuration

```yaml
# config/brakeman.yml
---
:skip_checks:
  # Skip checks that don't apply to our architecture
  # - CheckForgerySetting  # We handle CSRF differently for API

:skip_files:
  - lib/tasks/
  - db/seeds.rb

:rails:
  version: "7.2"

:confidence:
  medium  # Report medium and high confidence warnings

:output_format:
  json

:output_file:
  tmp/brakeman_output.json

:ignore_file:
  config/brakeman.ignore

:report_progress: true

:assume_routes: true

:combine_locations: true

:highlight_user_input: true
```

### 19.2.2 Ignore File pour Faux Positifs

```json
// config/brakeman.ignore
{
  "ignored_warnings": [
    {
      "warning_type": "Mass Assignment",
      "fingerprint": "abc123...",
      "note": "Strong parameters properly configured in controller"
    }
  ],
  "updated": "2025-01-01",
  "brakeman_version": "6.1.0"
}
```

### 19.2.3 CI Integration

```yaml
# .github/workflows/security.yml
name: Security

on: [push, pull_request]

jobs:
  brakeman:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Ruby
        uses: ruby/setup-ruby@v1
        with:
          ruby-version: 3.3
          bundler-cache: true

      - name: Run Brakeman
        run: |
          bundle exec brakeman -o tmp/brakeman.json -o tmp/brakeman.html --no-exit-on-warn

      - name: Upload Brakeman Report
        uses: actions/upload-artifact@v4
        with:
          name: brakeman-report
          path: tmp/brakeman.html

      - name: Check for High Severity Issues
        run: |
          HIGH_COUNT=$(cat tmp/brakeman.json | jq '.warnings | map(select(.confidence == "High")) | length')
          if [ "$HIGH_COUNT" -gt 0 ]; then
            echo "Found $HIGH_COUNT high severity security issues!"
            exit 1
          fi

  bundler-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Ruby
        uses: ruby/setup-ruby@v1
        with:
          ruby-version: 3.3
          bundler-cache: true

      - name: Run Bundler Audit
        run: bundle exec bundler-audit check --update
```

---

## 19.3 Code Organization

### 19.3.1 Directory Structure Standards

```plaintext
app/
├── channels/           # ActionCable channels
├── components/         # ViewComponents
│   ├── application_component.rb
│   ├── intervention/
│   │   ├── card_component.rb
│   │   ├── status_badge_component.rb
│   │   └── timeline_component.rb
│   └── shared/
│       ├── pagination_component.rb
│       └── empty_state_component.rb
├── controllers/
│   ├── api/
│   │   ├── v1/
│   │   │   ├── base_controller.rb
│   │   │   └── interventions_controller.rb
│   │   └── v2/
│   └── concerns/
│       ├── authenticatable.rb
│       ├── authorizable.rb
│       └── team_scoped.rb
├── helpers/            # View helpers (minimize usage)
├── javascript/         # Stimulus controllers
│   └── controllers/
│       ├── application.js
│       ├── dropdown_controller.js
│       └── modal_controller.js
├── jobs/              # ActiveJob classes
│   ├── application_job.rb
│   ├── notification_job.rb
│   └── email_delivery_job.rb
├── lib/               # Application-specific libraries
│   └── seido/
│       ├── error_codes.rb
│       └── constants.rb
├── mailers/           # ActionMailer classes
├── models/
│   ├── concerns/
│   │   ├── auditable.rb
│   │   ├── soft_deletable.rb
│   │   └── team_scoped.rb
│   ├── application_record.rb
│   ├── intervention.rb
│   └── user.rb
├── policies/          # Pundit policies
│   ├── application_policy.rb
│   ├── intervention_policy.rb
│   └── building_policy.rb
├── serializers/       # Blueprinter serializers
│   ├── intervention_serializer.rb
│   └── user_serializer.rb
├── services/          # Business logic
│   ├── application_service.rb
│   ├── interventions/
│   │   ├── create_service.rb
│   │   ├── update_status_service.rb
│   │   └── assign_provider_service.rb
│   └── notifications/
│       ├── send_service.rb
│       └── batch_service.rb
└── views/
    ├── components/    # ViewComponent templates
    ├── layouts/
    └── shared/
        └── _flash.html.erb
```

### 19.3.2 Naming Conventions

```ruby
# frozen_string_literal: true

# ========== Models ==========
# Singular, PascalCase
class Intervention < ApplicationRecord; end
class InterventionQuote < ApplicationRecord; end
class User < ApplicationRecord; end

# ========== Controllers ==========
# Plural, PascalCase, Controller suffix
class InterventionsController < ApplicationController; end
class Api::V1::InterventionsController < Api::V1::BaseController; end

# ========== Services ==========
# Domain/Action pattern, Service suffix
module Interventions
  class CreateService < ApplicationService; end
  class UpdateStatusService < ApplicationService; end
  class AssignProviderService < ApplicationService; end
end

# ========== Jobs ==========
# Action, Job suffix
class SendNotificationJob < ApplicationJob; end
class ProcessImportJob < ApplicationJob; end
class CleanupExpiredTokensJob < ApplicationJob; end

# ========== Policies ==========
# Model name, Policy suffix
class InterventionPolicy < ApplicationPolicy; end
class BuildingPolicy < ApplicationPolicy; end

# ========== Serializers ==========
# Model name, Serializer suffix
class InterventionSerializer < ApplicationSerializer; end
class UserSerializer < ApplicationSerializer; end

# ========== Components ==========
# Domain::Type pattern, Component suffix
module Intervention
  class CardComponent < ApplicationComponent; end
  class StatusBadgeComponent < ApplicationComponent; end
end

module Shared
  class PaginationComponent < ApplicationComponent; end
end

# ========== Concerns ==========
# Adjective or capability name
module Auditable; end
module SoftDeletable; end
module TeamScoped; end
```

### 19.3.3 File Size Guidelines

```ruby
# ========== Limites de taille ==========

# Modeles: max 200 lignes
# Si plus -> extraire en concerns

# Controleurs: max 100 lignes
# Si plus -> extraire en concerns ou services

# Services: max 100 lignes
# Si plus -> decouper en services plus petits

# Methodes: max 20 lignes
# Complexite cyclomatique: max 7

# ========== Script de verification ==========
# lib/tasks/code_metrics.rake

namespace :code do
  desc 'Check file sizes and complexity'
  task metrics: :environment do
    require 'flog'
    require 'flay'

    puts '=== File Size Check ==='

    Dir['app/**/*.rb'].each do |file|
      lines = File.readlines(file).size

      max = case file
            when /models/ then 200
            when /controllers/ then 100
            when /services/ then 100
            else 150
            end

      if lines > max
        puts "  #{file}: #{lines} lines (max: #{max})"
      end
    end

    puts "\n=== Complexity Check (Flog) ==="
    flog = Flog.new
    flog.flog('app/')

    flog.totals.select { |_, score| score > 20 }.each do |method, score|
      puts "  #{method}: #{score.round(1)} complexity"
    end

    puts "\n=== Duplication Check (Flay) ==="
    flay = Flay.new(mass: 32)
    flay.process('app/')
    flay.report
  end
end
```

---

## 19.4 YARD Documentation

### 19.4.1 Documentation Standards

```ruby
# frozen_string_literal: true

module Interventions
  # Service pour creer une nouvelle intervention
  #
  # Ce service gere la creation d'une intervention avec toutes les
  # validations metier et les notifications associees.
  #
  # @example Creation basique
  #   result = Interventions::CreateService.call(
  #     params: intervention_params,
  #     user: current_user,
  #     team: current_team
  #   )
  #   if result.success?
  #     redirect_to result.data
  #   else
  #     render :new, alert: result.error
  #   end
  #
  # @example Avec fichiers attaches
  #   result = Interventions::CreateService.call(
  #     params: intervention_params.merge(documents: uploaded_files),
  #     user: current_user,
  #     team: current_team
  #   )
  #
  # @see InterventionPolicy#create? pour les regles d'autorisation
  # @see Intervention::STATUSES pour les statuts disponibles
  #
  # @author SEIDO Team
  # @since 1.0.0
  class CreateService < ApplicationService
    # @!attribute [r] params
    #   @return [Hash] parametres de l'intervention
    # @!attribute [r] user
    #   @return [User] utilisateur createur
    # @!attribute [r] team
    #   @return [Team] equipe proprietaire

    # Cree une nouvelle intervention
    #
    # @param params [Hash] les parametres de l'intervention
    # @option params [String] :title titre de l'intervention
    # @option params [String] :description description detaillee
    # @option params [String] :priority niveau de priorite
    # @option params [UUID] :lot_id identifiant du lot concerne
    # @option params [UUID] :building_id identifiant de l'immeuble (optionnel)
    # @option params [Array<ActionDispatch::Http::UploadedFile>] :documents fichiers joints
    #
    # @param user [User] l'utilisateur qui cree l'intervention
    # @param team [Team] l'equipe proprietaire de l'intervention
    #
    # @return [ServiceResult] resultat avec l'intervention ou l'erreur
    #   - success: true si creation reussie
    #   - data: l'objet Intervention cree
    #   - error: message d'erreur si echec
    #
    # @raise [Pundit::NotAuthorizedError] si l'utilisateur n'a pas le droit de creer
    # @raise [ActiveRecord::RecordInvalid] si les validations echouent
    #
    # @note Cette methode envoie des notifications aux gestionnaires
    # @todo Ajouter le support des interventions recurrentes
    def call(params:, user:, team:)
      # Implementation
    end
  end
end
```

### 19.4.2 Configuration YARD

```ruby
# .yardopts
--output-dir doc/api
--readme README.md
--title 'SEIDO API Documentation'
--markup markdown
--protected
--no-private
--embed-mixins

app/**/*.rb
lib/**/*.rb

# Exclusions
--exclude app/views
--exclude app/javascript
--exclude db/
```

### 19.4.3 Generation Documentation

```bash
# Generer la documentation
bundle exec yard doc

# Serveur local
bundle exec yard server --reload

# Verifier la couverture
bundle exec yard stats --list-undoc
```

---

## 19.5 Dead Code Detection

### 19.5.1 Debride Configuration

```ruby
# Gemfile (development group)
gem 'debride', require: false

# .debride.yaml
exclude:
  - db/
  - vendor/
  - tmp/
  - coverage/

whitelist:
  # Framework methods called dynamically
  - perform
  - call
  - run
  # Pundit methods
  - show?
  - create?
  - update?
  - destroy?
  # Serializer attributes
  - identifier
  - type
```

### 19.5.2 Rake Task

```ruby
# lib/tasks/dead_code.rake
namespace :code do
  desc 'Find potentially unused code'
  task dead_code: :environment do
    require 'debride'

    puts '=== Dead Code Detection ==='

    debride = Debride.new
    debride.process_rb(Dir['app/**/*.rb'])

    potentially_dead = debride.missing.select do |method, _|
      # Filter out known dynamic methods
      !method.to_s.end_with?('?') &&
        !method.to_s.start_with?('before_', 'after_', 'around_')
    end

    if potentially_dead.any?
      puts "Found #{potentially_dead.size} potentially unused methods:"
      potentially_dead.each do |method, locations|
        puts "  - #{method}"
        locations.each { |loc| puts "      #{loc}" }
      end
    else
      puts 'No dead code detected!'
    end
  end
end
```

---

## 19.6 Pre-commit Hooks

### 19.6.1 Lefthook Configuration

```yaml
# lefthook.yml
pre-commit:
  parallel: true
  commands:
    rubocop:
      glob: "*.rb"
      run: bundle exec rubocop --force-exclusion {staged_files}
      stage_fixed: true

    erblint:
      glob: "*.html.erb"
      run: bundle exec erblint {staged_files}

    prettier:
      glob: "*.{js,css,json,yml,md}"
      run: npx prettier --check {staged_files}

pre-push:
  parallel: true
  commands:
    rspec:
      run: bundle exec rspec --fail-fast

    brakeman:
      run: bundle exec brakeman -q --no-pager

commit-msg:
  commands:
    commitlint:
      run: npx commitlint --edit {1}
```

### 19.6.2 Commitlint Configuration

```javascript
// commitlint.config.js
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',     // New feature
        'fix',      // Bug fix
        'docs',     // Documentation
        'style',    // Formatting
        'refactor', // Code restructuring
        'perf',     // Performance
        'test',     // Tests
        'chore',    // Maintenance
        'revert',   // Revert commit
        'ci',       // CI/CD
        'build',    // Build system
      ],
    ],
    'subject-max-length': [2, 'always', 72],
    'body-max-line-length': [2, 'always', 100],
  },
};
```

### 19.6.3 Installation

```bash
# Install lefthook
gem install lefthook

# Initialize in project
lefthook install

# Install commitlint
npm install --save-dev @commitlint/cli @commitlint/config-conventional
```

---

*End of Section 19 - Code Quality Tools*

---

[← Back to Architecture Hub](../seido-rails-architecture.md) | [Previous: Deployment & DevOps](./10-deployment-devops.md) | [Next: Appendices](./12-appendices.md)
