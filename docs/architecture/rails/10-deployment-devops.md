> Part of [SEIDO Rails Architecture](../seido-rails-architecture.md)

← Previous: [Testing](09-testing.md) | Next: [Production Quality](11-production-quality.md) →

# Deployment & DevOps

---

# 11. Deployment & Operations

This section covers production deployment, configuration, monitoring, and operational best practices.

## 11.1 Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      PRODUCTION ARCHITECTURE                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                      CDN (Cloudflare/CloudFront)                   │ │
│  │                    - Static assets                                  │ │
│  │                    - DDoS protection                               │ │
│  │                    - SSL termination                               │ │
│  └───────────────────────────┬────────────────────────────────────────┘ │
│                              │                                          │
│                              ▼                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                      Load Balancer (ALB/nginx)                     │ │
│  │                    - Health checks                                 │ │
│  │                    - Request routing                               │ │
│  └───────────────────────────┬────────────────────────────────────────┘ │
│                              │                                          │
│          ┌───────────────────┼───────────────────┐                      │
│          │                   │                   │                      │
│          ▼                   ▼                   ▼                      │
│  ┌───────────────┐   ┌───────────────┐   ┌───────────────┐             │
│  │    Web 1      │   │    Web 2      │   │    Web 3      │             │
│  │   (Puma)      │   │   (Puma)      │   │   (Puma)      │             │
│  │  Rails App    │   │  Rails App    │   │  Rails App    │             │
│  └───────┬───────┘   └───────┬───────┘   └───────┬───────┘             │
│          │                   │                   │                      │
│          └───────────────────┼───────────────────┘                      │
│                              │                                          │
│          ┌───────────────────┼───────────────────┐                      │
│          │                   │                   │                      │
│          ▼                   ▼                   ▼                      │
│  ┌───────────────┐   ┌───────────────┐   ┌───────────────┐             │
│  │  PostgreSQL   │   │    Redis      │   │  ActionCable  │             │
│  │   Primary     │   │   Cluster     │   │   Server      │             │
│  │  + Replica    │   │               │   │               │             │
│  └───────────────┘   └───────────────┘   └───────────────┘             │
│                                                                          │
│          ┌───────────────────────────────────────┐                      │
│          │           Background Workers          │                      │
│          │  ┌─────────┐ ┌─────────┐ ┌─────────┐  │                      │
│          │  │ Sidekiq │ │ Sidekiq │ │ Sidekiq │  │                      │
│          │  │ Worker 1│ │ Worker 2│ │ Worker 3│  │                      │
│          │  └─────────┘ └─────────┘ └─────────┘  │                      │
│          └───────────────────────────────────────┘                      │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                     External Services                              │ │
│  │    ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐     │ │
│  │    │ Stripe │  │ Resend │  │  S3    │  │ Sentry │  │NewRelic│     │ │
│  │    └────────┘  └────────┘  └────────┘  └────────┘  └────────┘     │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 11.2 Environment Configuration

### 11.2.1 Required Environment Variables

```bash
# config/application.yml (Figaro) or .env (dotenv)

# ============================================
# APPLICATION
# ============================================
RAILS_ENV=production
SECRET_KEY_BASE=your-secret-key-base-here
RAILS_MASTER_KEY=your-master-key-here
RAILS_LOG_LEVEL=info
RAILS_SERVE_STATIC_FILES=true
RAILS_MAX_THREADS=5

# Application URLs
APP_HOST=app.seido.io
APP_PROTOCOL=https
ALLOWED_HOSTS=app.seido.io,www.seido.io

# ============================================
# DATABASE
# ============================================
DATABASE_URL=postgres://user:password@host:5432/seido_production
DATABASE_POOL_SIZE=25
DATABASE_TIMEOUT=5000

# Read replica (optional)
DATABASE_REPLICA_URL=postgres://user:password@replica-host:5432/seido_production

# ============================================
# REDIS
# ============================================
REDIS_URL=redis://user:password@host:6379/0
REDIS_CACHE_URL=redis://user:password@host:6379/1
REDIS_SIDEKIQ_URL=redis://user:password@host:6379/2
REDIS_CABLE_URL=redis://user:password@host:6379/3

# ============================================
# AUTHENTICATION
# ============================================
DEVISE_JWT_SECRET_KEY=your-jwt-secret-key
DEVISE_SECRET_KEY=your-devise-secret-key

# ============================================
# STRIPE
# ============================================
STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRICE_ID_MONTHLY=price_xxx
STRIPE_PRICE_ID_ANNUAL=price_xxx

# ============================================
# EMAIL (Resend)
# ============================================
RESEND_API_KEY=re_xxx
MAILER_SENDER=notifications@seido.io
MAILER_REPLY_TO=support@seido.io

# ============================================
# FILE STORAGE (S3)
# ============================================
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=xxx
AWS_REGION=eu-west-3
AWS_BUCKET=seido-production
AWS_ENDPOINT=https://s3.eu-west-3.amazonaws.com

# CDN for assets
CDN_HOST=cdn.seido.io

# ============================================
# MONITORING
# ============================================
SENTRY_DSN=https://xxx@sentry.io/xxx
NEW_RELIC_LICENSE_KEY=xxx
NEW_RELIC_APP_NAME=SEIDO Production

# ============================================
# FEATURE FLAGS (Optional)
# ============================================
FEATURE_NEW_DASHBOARD=true
FEATURE_CHAT_ENABLED=true
FEATURE_STRIPE_BILLING=true
```

### 11.2.2 Credentials Configuration

```ruby
# config/credentials.yml.enc (edit with: rails credentials:edit)
# This file is encrypted with config/master.key

# Database
database:
  host: db.seido.io
  username: seido_app
  password: super-secret-password

# JWT Secret
devise_jwt_secret_key: long-random-string-for-jwt-tokens

# Stripe
stripe:
  publishable_key: pk_live_xxx
  secret_key: sk_live_xxx
  webhook_secret: whsec_xxx
  price_monthly: price_xxx
  price_annual: price_xxx

# AWS
aws:
  access_key_id: AKIA...
  secret_access_key: xxx
  region: eu-west-3
  bucket: seido-production

# Email
resend:
  api_key: re_xxx

# Monitoring
sentry:
  dsn: https://xxx@sentry.io/xxx
new_relic:
  license_key: xxx

# Action Cable
action_cable:
  mount_path: /cable
  allowed_origins:
    - https://app.seido.io
```

---

## 11.3 Production Configuration

### 11.3.1 Puma Configuration

```ruby
# config/puma.rb
# Puma configuration for production

# Thread pool
max_threads_count = ENV.fetch("RAILS_MAX_THREADS", 5)
min_threads_count = ENV.fetch("RAILS_MIN_THREADS") { max_threads_count }
threads min_threads_count, max_threads_count

# Workers (processes)
if ENV.fetch("RAILS_ENV", "development") == "production"
  workers ENV.fetch("WEB_CONCURRENCY", 2)
  preload_app!
end

# Port binding
port ENV.fetch("PORT", 3000)

# Environment
environment ENV.fetch("RAILS_ENV", "development")

# PID file
pidfile ENV.fetch("PIDFILE", "tmp/pids/server.pid")

# Bind to unix socket in production
if ENV.fetch("RAILS_ENV", "development") == "production"
  bind "unix://#{ENV.fetch('PUMA_SOCKET', '/var/run/puma/puma.sock')}"
end

# Allow puma to be restarted by `bin/rails restart` command
plugin :tmp_restart

# Worker lifecycle hooks
on_worker_boot do
  ActiveRecord::Base.establish_connection if defined?(ActiveRecord)
end

before_fork do
  ActiveRecord::Base.connection_pool.disconnect! if defined?(ActiveRecord)
end

# Logging
stdout_redirect(
  ENV.fetch("PUMA_STDOUT", "/var/log/puma/stdout.log"),
  ENV.fetch("PUMA_STDERR", "/var/log/puma/stderr.log"),
  true # append mode
) if ENV.fetch("RAILS_ENV", "development") == "production"
```

### 11.3.2 Database Configuration

```yaml
# config/database.yml
default: &default
  adapter: postgresql
  encoding: unicode
  pool: <%= ENV.fetch("DATABASE_POOL_SIZE", 25) %>
  timeout: <%= ENV.fetch("DATABASE_TIMEOUT", 5000) %>
  prepared_statements: true
  advisory_locks: true

development:
  <<: *default
  database: seido_development

test:
  <<: *default
  database: seido_test

production:
  primary:
    <<: *default
    url: <%= ENV['DATABASE_URL'] %>
    pool: <%= ENV.fetch("DATABASE_POOL_SIZE", 25) %>

  # Read replica for heavy queries
  replica:
    <<: *default
    url: <%= ENV['DATABASE_REPLICA_URL'] %>
    pool: <%= ENV.fetch("DATABASE_REPLICA_POOL_SIZE", 10) %>
    replica: true
```

### 11.3.3 Sidekiq Configuration

> **Concurrency Limits - Critical Production Setting**
>
> | Environment | Concurrency | Database Pool | Notes |
> |-------------|-------------|---------------|-------|
> | Development | 5 | 10 | Low memory usage |
> | Staging | 10 | 20 | Match production behavior |
> | Production | 15-25 | 30-40 | Adjust based on workload |
>
> **Rules:**
> - **Never exceed 50** (Sidekiq OSS hard limit)
> - **Formula**: `pool_size >= concurrency + puma_threads + 5`
> - **Memory**: Each thread uses ~20-50MB additional RAM
> - **CPU**: 1 Sidekiq process per CPU core, ~5-10 concurrency per process

```yaml
# config/sidekiq.yml
---
# CONCURRENCY CONFIGURATION
#
# CRITICAL: Ensure DATABASE_POOL_SIZE >= SIDEKIQ_CONCURRENCY + 5
# CRITICAL: Never exceed 50 for Sidekiq OSS
#
# Recommended values by deployment size:
#   Small (1-2 workers):  concurrency: 5-10
#   Medium (2-4 workers): concurrency: 10-20
#   Large (4+ workers):   concurrency: 20-25
#
:concurrency: <%= ENV.fetch("SIDEKIQ_CONCURRENCY", 10) %>
:timeout: 25
:poll_interval: 5

:queues:
  - [critical, 6]    # Stripe webhooks, urgent notifications
  - [default, 4]     # Standard background jobs
  - [mailers, 3]     # Email sending
  - [low, 1]         # Reports, analytics, cleanup

# Cron jobs (requires sidekiq-cron 2.0+ for Sidekiq 8)
:schedule:
  expire_invitations:
    cron: '0 * * * *'  # Every hour
    class: ExpireInvitationsJob

  contract_expiration_alerts:
    cron: '0 8 * * *'  # Every day at 8am
    class: ContractExpirationAlertJob

  cleanup_old_notifications:
    cron: '0 3 * * 0'  # Every Sunday at 3am
    class: CleanupOldNotificationsJob

  sync_stripe_subscriptions:
    cron: '0 2 * * *'  # Every day at 2am
    class: SyncStripeSubscriptionsJob

  generate_monthly_reports:
    cron: '0 6 1 * *'  # First of each month at 6am
    class: GenerateMonthlyReportsJob
```

**Database Pool Size Configuration:**

```yaml
# config/database.yml
production:
  <<: *default
  # Pool size must accommodate:
  # - Puma threads (RAILS_MAX_THREADS)
  # - Sidekiq concurrency (SIDEKIQ_CONCURRENCY)
  # - Buffer (+5 for safety)
  pool: <%= ENV.fetch("DATABASE_POOL_SIZE") { ENV.fetch("RAILS_MAX_THREADS", 5).to_i + ENV.fetch("SIDEKIQ_CONCURRENCY", 10).to_i + 5 } %>
```

### 11.3.4 Production Environment

```ruby
# config/environments/production.rb
Rails.application.configure do
  # Code is not reloaded between requests
  config.enable_reloading = false
  config.eager_load = true

  # Full error reports are disabled
  config.consider_all_requests_local = false
  config.action_controller.perform_caching = true

  # Cache store
  config.cache_store = :redis_cache_store, {
    url: ENV['REDIS_CACHE_URL'],
    namespace: 'seido_cache',
    expires_in: 1.hour,
    compress: true,
    compress_threshold: 1.kilobyte,
    pool_size: ENV.fetch('RAILS_MAX_THREADS', 5).to_i,
    pool_timeout: 5,
    error_handler: -> (method:, returning:, exception:) {
      Sentry.capture_exception(exception, tags: { cache_method: method })
    }
  }

  # Serve static files with proper headers
  config.public_file_server.enabled = ENV['RAILS_SERVE_STATIC_FILES'].present?
  config.public_file_server.headers = {
    'Cache-Control' => 'public, s-maxage=31536000, max-age=31536000',
    'Expires' => 1.year.from_now.to_formatted_s(:rfc822)
  }

  # Asset host (CDN)
  config.asset_host = ENV['CDN_HOST'] if ENV['CDN_HOST'].present?

  # ActiveStorage
  config.active_storage.service = :amazon
  config.active_storage.variant_processor = :mini_magick

  # Force SSL
  config.force_ssl = true
  config.ssl_options = { redirect: { exclude: -> request { request.path =~ /health_check/ } } }

  # Logging
  config.log_level = ENV.fetch('RAILS_LOG_LEVEL', 'info').to_sym
  config.log_tags = [:request_id, :remote_ip]
  config.log_formatter = ::Logger::Formatter.new

  if ENV['RAILS_LOG_TO_STDOUT'].present?
    logger = ActiveSupport::Logger.new(STDOUT)
    logger.formatter = config.log_formatter
    config.logger = ActiveSupport::TaggedLogging.new(logger)
  end

  # Action Mailer
  config.action_mailer.perform_caching = false
  config.action_mailer.delivery_method = :smtp
  config.action_mailer.smtp_settings = {
    address: 'smtp.resend.com',
    port: 465,
    authentication: :plain,
    user_name: 'resend',
    password: ENV['RESEND_API_KEY'],
    enable_starttls: false,
    tls: true
  }
  config.action_mailer.default_url_options = {
    host: ENV.fetch('APP_HOST', 'app.seido.io'),
    protocol: ENV.fetch('APP_PROTOCOL', 'https')
  }

  # Active Job
  config.active_job.queue_adapter = :sidekiq

  # Action Cable
  config.action_cable.mount_path = '/cable'
  config.action_cable.url = "wss://#{ENV['APP_HOST']}/cable"
  config.action_cable.allowed_request_origins = [
    "https://#{ENV['APP_HOST']}",
    /https:\/\/.*\.seido\.io/
  ]

  # I18n
  config.i18n.fallbacks = true

  # Active Record
  config.active_record.dump_schema_after_migration = false
  config.active_record.encryption.primary_key = ENV['ACTIVE_RECORD_ENCRYPTION_PRIMARY_KEY']
  config.active_record.encryption.deterministic_key = ENV['ACTIVE_RECORD_ENCRYPTION_DETERMINISTIC_KEY']
  config.active_record.encryption.key_derivation_salt = ENV['ACTIVE_RECORD_ENCRYPTION_KEY_DERIVATION_SALT']
end
```

---

## 11.4 Deployment Process

### 11.4.1 Docker Configuration

```dockerfile
# Dockerfile
FROM ruby:3.3.0-alpine AS base

# Install dependencies
RUN apk add --no-cache \
    build-base \
    postgresql-dev \
    nodejs \
    yarn \
    git \
    tzdata \
    curl \
    imagemagick \
    vips-dev

WORKDIR /app

# Install gems
COPY Gemfile Gemfile.lock ./
RUN bundle config set --local deployment 'true' && \
    bundle config set --local without 'development test' && \
    bundle install --jobs 4 --retry 3

# Install JS dependencies
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production

# Copy application code
COPY . .

# Precompile assets
RUN SECRET_KEY_BASE=dummy RAILS_ENV=production bundle exec rails assets:precompile

# Remove unnecessary files
RUN rm -rf node_modules tmp/cache spec

# Production stage
FROM ruby:3.3.0-alpine AS production

RUN apk add --no-cache \
    postgresql-client \
    tzdata \
    curl \
    imagemagick \
    vips

WORKDIR /app

# Copy from build stage
COPY --from=base /usr/local/bundle /usr/local/bundle
COPY --from=base /app /app

# Create non-root user
RUN addgroup -g 1000 -S app && \
    adduser -u 1000 -S app -G app && \
    chown -R app:app /app

USER app

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health_check || exit 1

# Default command
CMD ["bundle", "exec", "puma", "-C", "config/puma.rb"]
```

### 11.4.2 Docker Compose (Development/Staging)

```yaml
# docker-compose.yml
version: '3.8'

services:
  web:
    build: .
    ports:
      - "3000:3000"
    environment:
      - RAILS_ENV=production
      - DATABASE_URL=postgres://postgres:password@db:5432/seido
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - db
      - redis
    volumes:
      - storage:/app/storage

  sidekiq:
    build: .
    command: bundle exec sidekiq -C config/sidekiq.yml
    environment:
      - RAILS_ENV=production
      - DATABASE_URL=postgres://postgres:password@db:5432/seido
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - db
      - redis

  cable:
    build: .
    command: bundle exec puma -p 28080 cable/config.ru
    ports:
      - "28080:28080"
    environment:
      - RAILS_ENV=production
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - redis

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=seido
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
  storage:
```

### 11.4.3 Deployment Script

```bash
#!/bin/bash
# bin/deploy

set -e

echo "Starting deployment..."

# Variables
APP_NAME="seido"
DEPLOY_USER="deploy"
DEPLOY_HOST="app.seido.io"
DEPLOY_PATH="/var/www/seido"
CURRENT_RELEASE=$(date +%Y%m%d%H%M%S)

# Build Docker image
echo "Building Docker image..."
docker build -t $APP_NAME:$CURRENT_RELEASE .
docker tag $APP_NAME:$CURRENT_RELEASE registry.seido.io/$APP_NAME:$CURRENT_RELEASE
docker tag $APP_NAME:$CURRENT_RELEASE registry.seido.io/$APP_NAME:latest

# Push to registry
echo "Pushing to registry..."
docker push registry.seido.io/$APP_NAME:$CURRENT_RELEASE
docker push registry.seido.io/$APP_NAME:latest

# Deploy to servers
echo "Deploying to servers..."
ssh $DEPLOY_USER@$DEPLOY_HOST << 'ENDSSH'
  cd /var/www/seido

  # Pull latest image
  docker pull registry.seido.io/seido:latest

  # Run migrations
  docker compose run --rm web bundle exec rails db:migrate

  # Restart services
  docker compose up -d --force-recreate web sidekiq cable

  # Cleanup old images
  docker image prune -f
ENDSSH

# Verify deployment
echo "Verifying deployment..."
curl -sf https://app.seido.io/health_check > /dev/null && echo "Deployment successful!" || echo "Deployment verification failed!"

# Notify team
echo "Notifying team..."
curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"SEIDO deployed successfully to production!"}' \
  $SLACK_WEBHOOK_URL

echo "Deployment complete!"
```

---

## 11.5 Monitoring & Observability

### 11.5.1 Sentry Configuration

```ruby
# config/initializers/sentry.rb
Sentry.init do |config|
  config.dsn = ENV['SENTRY_DSN']
  config.breadcrumbs_logger = [:active_support_logger, :http_logger]
  config.environment = Rails.env
  config.release = ENV.fetch('GIT_SHA', `git rev-parse HEAD`.strip)

  # Performance monitoring
  config.traces_sample_rate = Rails.env.production? ? 0.1 : 1.0
  config.profiles_sample_rate = 0.1

  # Filter sensitive data
  config.before_send = lambda do |event, hint|
    # Remove sensitive params
    if event.request.present?
      event.request.data = filter_params(event.request.data)
    end
    event
  end

  # Set user context
  config.before_send = lambda do |event, hint|
    if RequestStore.store[:current_user]
      Sentry.set_user(
        id: RequestStore.store[:current_user].id,
        email: RequestStore.store[:current_user].email,
        role: RequestStore.store[:current_user].role
      )
    end
    event
  end

  # Ignore common exceptions
  config.excluded_exceptions += [
    'ActionController::RoutingError',
    'ActiveRecord::RecordNotFound',
    'ActionController::BadRequest'
  ]
end

def filter_params(params)
  return params unless params.is_a?(Hash)
  params.except('password', 'password_confirmation', 'token', 'api_key')
end
```

### 11.5.2 Health Check Endpoint

```ruby
# app/controllers/health_check_controller.rb
class HealthCheckController < ActionController::API
  def show
    checks = {
      status: 'ok',
      timestamp: Time.current.iso8601,
      version: ENV.fetch('GIT_SHA', 'unknown')[0..7],
      checks: {
        database: check_database,
        redis: check_redis,
        sidekiq: check_sidekiq,
        storage: check_storage
      }
    }

    overall_status = checks[:checks].values.all? { |c| c[:status] == 'ok' } ? :ok : :service_unavailable

    render json: checks, status: overall_status
  end

  private

  def check_database
    ActiveRecord::Base.connection.execute('SELECT 1')
    { status: 'ok', response_time: measure { ActiveRecord::Base.connection.execute('SELECT 1') } }
  rescue StandardError => e
    { status: 'error', message: e.message }
  end

  def check_redis
    Redis.current.ping
    { status: 'ok', response_time: measure { Redis.current.ping } }
  rescue StandardError => e
    { status: 'error', message: e.message }
  end

  def check_sidekiq
    stats = Sidekiq::Stats.new
    {
      status: 'ok',
      queues: Sidekiq::Queue.all.map { |q| { name: q.name, size: q.size } },
      processed: stats.processed,
      failed: stats.failed,
      workers: stats.workers_size
    }
  rescue StandardError => e
    { status: 'error', message: e.message }
  end

  def check_storage
    ActiveStorage::Blob.service.exist?('health_check_test')
    { status: 'ok' }
  rescue StandardError => e
    { status: 'error', message: e.message }
  end

  def measure
    start = Process.clock_gettime(Process::CLOCK_MONOTONIC)
    yield
    ((Process.clock_gettime(Process::CLOCK_MONOTONIC) - start) * 1000).round(2)
  end
end

# config/routes.rb
get '/health_check', to: 'health_check#show'
```

### 11.5.3 Structured Logging

```ruby
# config/initializers/lograge.rb
Rails.application.configure do
  config.lograge.enabled = true
  config.lograge.formatter = Lograge::Formatters::Json.new
  config.lograge.base_controller_class = ['ActionController::API', 'ActionController::Base']

  config.lograge.custom_options = lambda do |event|
    {
      time: Time.current.iso8601,
      request_id: event.payload[:request_id],
      user_id: event.payload[:user_id],
      team_id: event.payload[:team_id],
      remote_ip: event.payload[:remote_ip],
      user_agent: event.payload[:user_agent],
      params: event.payload[:params].except('controller', 'action', 'password', 'token'),
      exception: event.payload[:exception]&.first,
      exception_message: event.payload[:exception_object]&.message
    }.compact
  end

  config.lograge.custom_payload do |controller|
    {
      request_id: controller.request.request_id,
      user_id: controller.try(:current_user)&.id,
      team_id: controller.try(:current_team)&.id,
      remote_ip: controller.request.remote_ip,
      user_agent: controller.request.user_agent
    }
  end
end
```

### 11.5.4 Application Performance Monitoring (APM)

```ruby
# config/initializers/new_relic.rb (if using New Relic)
# newrelic.yml handles most configuration

# Custom instrumentation
ActiveSupport::Notifications.subscribe('intervention.status_changed') do |*args|
  event = ActiveSupport::Notifications::Event.new(*args)
  NewRelic::Agent.record_custom_event('InterventionStatusChange', {
    intervention_id: event.payload[:intervention_id],
    old_status: event.payload[:old_status],
    new_status: event.payload[:new_status],
    user_id: event.payload[:user_id],
    duration: event.duration
  })
end
```

---

## 11.6 Backup & Recovery

### 11.6.1 Database Backup Script

```bash
#!/bin/bash
# bin/backup_database

set -e

# Configuration
BACKUP_DIR="/backups/postgres"
RETENTION_DAYS=30
S3_BUCKET="seido-backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="seido_${TIMESTAMP}.sql.gz"

# Create backup
echo "Creating database backup..."
pg_dump $DATABASE_URL | gzip > "${BACKUP_DIR}/${BACKUP_FILE}"

# Upload to S3
echo "Uploading to S3..."
aws s3 cp "${BACKUP_DIR}/${BACKUP_FILE}" "s3://${S3_BUCKET}/database/${BACKUP_FILE}"

# Cleanup old backups
echo "Cleaning up old backups..."
find $BACKUP_DIR -name "seido_*.sql.gz" -mtime +$RETENTION_DAYS -delete

# Cleanup old S3 backups
aws s3 ls "s3://${S3_BUCKET}/database/" | while read -r line; do
  createDate=$(echo $line | awk {'print $1" "$2'})
  createDate=$(date -d "$createDate" +%s)
  olderThan=$(date -d "-$RETENTION_DAYS days" +%s)
  if [[ $createDate -lt $olderThan ]]; then
    fileName=$(echo $line | awk {'print $4'})
    if [[ $fileName != "" ]]; then
      aws s3 rm "s3://${S3_BUCKET}/database/$fileName"
    fi
  fi
done

echo "Backup completed: ${BACKUP_FILE}"
```

### 11.6.2 Disaster Recovery Procedure

```markdown
# Disaster Recovery Runbook

## Database Recovery

1. **Identify latest backup:**
   ```bash
   aws s3 ls s3://seido-backups/database/ --recursive | sort | tail -1
   ```

2. **Download backup:**
   ```bash
   aws s3 cp s3://seido-backups/database/seido_YYYYMMDD_HHMMSS.sql.gz /tmp/
   ```

3. **Restore database:**
   ```bash
   gunzip -c /tmp/seido_YYYYMMDD_HHMMSS.sql.gz | psql $DATABASE_URL
   ```

4. **Verify restoration:**
   ```bash
   psql $DATABASE_URL -c "SELECT COUNT(*) FROM users;"
   ```

## Application Recovery

1. **Pull latest image:**
   ```bash
   docker pull registry.seido.io/seido:latest
   ```

2. **Start services:**
   ```bash
   docker compose up -d
   ```

3. **Run migrations if needed:**
   ```bash
   docker compose run --rm web rails db:migrate
   ```

4. **Verify health:**
   ```bash
   curl https://app.seido.io/health_check
   ```

## Communication

- Notify team in #incidents Slack channel
- Update status page at status.seido.io
- Post incident report within 24 hours
```

---

## 11.7 Security Hardening

### 11.7.1 Security Headers

```ruby
# config/initializers/secure_headers.rb
SecureHeaders::Configuration.default do |config|
  config.cookies = {
    secure: true,
    httponly: true,
    samesite: {
      lax: true
    }
  }

  config.hsts = "max-age=31536000; includeSubDomains"
  config.x_frame_options = "DENY"
  config.x_content_type_options = "nosniff"
  config.x_xss_protection = "1; mode=block"
  config.x_download_options = "noopen"
  config.x_permitted_cross_domain_policies = "none"
  config.referrer_policy = %w[strict-origin-when-cross-origin]

  config.csp = {
    default_src: %w['self'],
    script_src: %w['self' 'unsafe-inline' https://js.stripe.com],
    style_src: %w['self' 'unsafe-inline' https://fonts.googleapis.com],
    img_src: %w['self' data: https: blob:],
    font_src: %w['self' https://fonts.gstatic.com],
    connect_src: %w['self' wss: https://api.stripe.com https://sentry.io],
    frame_src: %w['self' https://js.stripe.com],
    object_src: %w['none'],
    base_uri: %w['self'],
    form_action: %w['self'],
    frame_ancestors: %w['none'],
    upgrade_insecure_requests: true
  }
end
```

### 11.7.2 Secret Rotation

```ruby
# lib/tasks/security.rake
namespace :security do
  desc "Rotate application secrets"
  task rotate_secrets: :environment do
    puts "Rotating secrets..."

    # Generate new JWT secret
    new_jwt_secret = SecureRandom.hex(64)

    # Update credentials (requires manual key entry)
    puts "New JWT secret generated. Update credentials manually:"
    puts "rails credentials:edit"
    puts "devise_jwt_secret_key: #{new_jwt_secret}"

    # Invalidate all existing JWT tokens
    JwtDenylist.delete_all
    puts "All existing JWT tokens invalidated."

    puts "Secret rotation complete. Users will need to re-authenticate."
  end

  desc "Audit user permissions"
  task audit_permissions: :environment do
    puts "Auditing user permissions..."

    # Find admin users
    admin_users = User.where(role: 'admin')
    puts "Admin users: #{admin_users.count}"
    admin_users.each { |u| puts "  - #{u.email}" }

    # Find users with elevated team permissions
    elevated_members = TeamMember.where("permissions @> ?", { 'properties.delete' => true }.to_json)
    puts "Users with delete permissions: #{elevated_members.count}"

    # Find inactive users with access
    inactive_users = User.where('last_sign_in_at < ?', 90.days.ago)
                         .joins(:team_memberships)
                         .where(team_memberships: { discarded_at: nil })
    puts "Inactive users with team access: #{inactive_users.count}"
    inactive_users.each { |u| puts "  - #{u.email} (last login: #{u.last_sign_in_at})" }
  end
end
```

---

*End of Section 11 - Deployment & Operations*

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
  # ===================================================================
  # JOB 1: LINTING
  # ===================================================================
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

  # ===================================================================
  # JOB 2: TESTS
  # ===================================================================
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

  # ===================================================================
  # JOB 3: SECURITY
  # ===================================================================
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

  # ===================================================================
  # JOB 4: E2E TESTS (optional, on main only)
  # ===================================================================
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

  # ===================================================================
  # JOB 5: DEPLOY TO STAGING
  # ===================================================================
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

  # ===================================================================
  # JOB 6: DEPLOY TO PRODUCTION (Blue-Green)
  # ===================================================================
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
# UNSAFE: Locks entire table
class AddStatusToInterventions < ActiveRecord::Migration[7.1]
  def change
    add_column :interventions, :priority, :string, default: 'normal'
  end
end

# SAFE: Three-step migration
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
