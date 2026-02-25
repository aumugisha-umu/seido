> Part of [SEIDO Rails Architecture](../seido-rails-architecture.md)

---

← Previous: [Index](../seido-rails-architecture.md) | Next: [Overview & Personas](01-overview-personas.md) →

---

# 0. Getting Started

Ce guide permet à un développeur de démarrer le projet SEIDO Rails en moins de 30 minutes.

## 0.1 Prerequisites

### Required Software

| Software | Version | Purpose |
|----------|---------|---------|
| **Ruby** | 3.3+ | Language runtime |
| **Rails** | 7.2+ | Web framework |
| **PostgreSQL** | 16+ | Primary database |
| **Redis** | 7+ | Caching, ActionCable, Sidekiq |
| **Node.js** | 20+ | Asset compilation (Tailwind) |

### Installation (macOS/Linux)

```bash
# === Ruby (via rbenv) ===
brew install rbenv ruby-build
rbenv install 3.3.0
rbenv global 3.3.0

# Verify installation
ruby -v  # Should show 3.3.x

# === PostgreSQL ===
brew install postgresql@16
brew services start postgresql@16

# Create your user if needed
createuser -s $USER

# === Redis ===
brew install redis
brew services start redis

# Verify Redis
redis-cli ping  # Should return PONG

# === Node.js (via nvm) ===
brew install nvm
nvm install 20
nvm use 20
```

### Installation (Windows with WSL2)

```bash
# Install WSL2 with Ubuntu 22.04
wsl --install -d Ubuntu-22.04

# Inside WSL2
sudo apt update && sudo apt upgrade -y

# Install rbenv
git clone https://github.com/rbenv/rbenv.git ~/.rbenv
echo 'export PATH="$HOME/.rbenv/bin:$PATH"' >> ~/.bashrc
echo 'eval "$(rbenv init -)"' >> ~/.bashrc
source ~/.bashrc

# Install ruby-build and Ruby
git clone https://github.com/rbenv/ruby-build.git ~/.rbenv/plugins/ruby-build
rbenv install 3.3.0
rbenv global 3.3.0

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib libpq-dev
sudo service postgresql start

# Install Redis
sudo apt install redis-server
sudo service redis-server start

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

---

## 0.2 Project Creation

```bash
# Create the Rails application
rails new seido \
  --database=postgresql \
  --css=tailwind \
  --javascript=importmap \
  --skip-jbuilder \
  --skip-action-mailbox \
  --skip-action-text

cd seido

# Initialize git
git init
git add .
git commit -m "Initial Rails 7.2 application"
```

---

## 0.3 Install Dependencies

### Update Gemfile

Replace your `Gemfile` with the complete one from **Section 2.2**.

```bash
# Install Ruby gems
bundle install

# Install Node dependencies (for Tailwind)
npm install
```

### Install Foreman (for bin/dev)

```bash
gem install foreman
```

---

## 0.4 Database Setup

```bash
# Create databases
rails db:create

# Run migrations (copy SQL from Section 4)
rails db:migrate

# Load seed data
rails db:seed
```

### Quick Database Reset

```bash
# Full reset (drops, creates, migrates, seeds)
rails db:reset

# Or step by step
rails db:drop db:create db:migrate db:seed
```

---

## 0.5 Environment Variables

```bash
# Copy example env file
cp .env.example .env

# Edit with your values
nano .env  # or code .env
```

**Required variables** (see `.env.example` in Section 2.3):

```env
# Database
DATABASE_URL=postgres://localhost/seido_development

# Redis
REDIS_URL=redis://localhost:6379/0

# Rails
RAILS_ENV=development
SECRET_KEY_BASE=your_generated_key_here

# External Services (optional for dev)
# RESEND_API_KEY=re_xxx
# STRIPE_API_KEY=sk_test_xxx
# SENTRY_DSN=https://xxx@sentry.io/xxx
```

Generate a secret key:
```bash
rails secret
```

---

## 0.6 Run Development Server

```bash
# Start all services (Rails + Tailwind CSS)
bin/dev

# Or start individually
rails server           # Port 3000
bin/rails tailwindcss:watch  # CSS compilation
```

**Visit**: http://localhost:3000

### Default Login Credentials (from seeds)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin1@seido-app.com | password123 |
| Gestionnaire | gestionnaire1@seido-app.com | password123 |
| Prestataire | prestataire1@seido-app.com | password123 |
| Locataire | locataire1@seido-app.com | password123 |

---

## 0.7 Run Tests

```bash
# Run all tests
bundle exec rspec

# Run specific test file
bundle exec rspec spec/models/intervention_spec.rb

# Run with coverage
COVERAGE=true bundle exec rspec

# Run system tests (requires Chrome)
bundle exec rspec spec/system/
```

---

## 0.8 Run Background Jobs

```bash
# Start Sidekiq (in separate terminal)
bundle exec sidekiq

# Or with specific queues
bundle exec sidekiq -q default -q mailers -q notifications
```

---

## 0.9 Verify Installation

Run this verification script to confirm everything works:

```bash
# Check Rails console
rails runner "
  puts '=== SEIDO Installation Check ==='
  puts ''
  puts 'Database Connection:'
  puts '  ✅ Connected' if ActiveRecord::Base.connection.active?
  puts ''
  puts 'Tables Created:'
  puts \"  Teams: \#{Team.count}\"
  puts \"  Users: \#{User.count}\"
  puts \"  Buildings: \#{Building.count}\"
  puts \"  Lots: \#{Lot.count}\"
  puts \"  Interventions: \#{Intervention.count}\"
  puts ''
  puts 'Redis Connection:'
  begin
    Redis.new.ping
    puts '  ✅ Connected'
  rescue => e
    puts \"  ❌ Error: \#{e.message}\"
  end
  puts ''
  puts '=== All checks passed! ==='
"
```

Expected output:
```
=== SEIDO Installation Check ===

Database Connection:
  ✅ Connected

Tables Created:
  Teams: 3
  Users: 15
  Buildings: 15
  Lots: 105
  Interventions: 50

Redis Connection:
  ✅ Connected

=== All checks passed! ===
```

---

## 0.10 Common Issues & Solutions

### Issue: `PG::ConnectionBad`

```bash
# PostgreSQL not running
brew services start postgresql@16
# or
sudo service postgresql start
```

### Issue: `Redis::CannotConnectError`

```bash
# Redis not running
brew services start redis
# or
sudo service redis-server start
```

### Issue: `LoadError: cannot load such file -- xxx`

```bash
# Missing gems
bundle install
```

### Issue: Tailwind CSS not compiling

```bash
# Rebuild CSS
bin/rails tailwindcss:build
```

### Issue: Database migrations pending

```bash
rails db:migrate
```

---

*End of Section 0 - Getting Started*

---

← Previous: [Index](../seido-rails-architecture.md) | Next: [Overview & Personas](01-overview-personas.md) →
