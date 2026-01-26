# SEIDO Architecture - Ruby on Rails

> ⚠️ **DOCUMENT POUR LE REBUILD FUTUR**
>
> Ce document décrit l'architecture **Ruby on Rails** prévue pour le **rebuild** futur de SEIDO.
>
> **L'application actuelle** est basée sur **Next.js 15 + Supabase** (voir `.claude/CLAUDE.md`).
>
> Ce document sert de spécification pour une future migration vers Rails si décidée.

---

> **Document Version**: 1.0.0
> **Last Updated**: 2025-12-30
> **Target Framework**: Ruby on Rails 7.1.3 + PostgreSQL 15
> **Language**: English

This document provides a complete architectural specification for building SEIDO from scratch using Ruby on Rails. It is designed for developers who have no prior knowledge of the existing application and need to implement the entire system following best practices.

---

## Table of Contents

### Quick Start
0. [Getting Started](#0-getting-started)

### Core Architecture (Sections 1-12)
1. [SEIDO Overview](#1-seido-overview)
2. [Tech Stack](#2-tech-stack)
3. [Data Models](#3-data-models)
4. [PostgreSQL Migrations](#4-postgresql-migrations)
5. [Authorization (Pundit)](#5-authorization-pundit)
6. [State Machines (AASM)](#6-state-machines-aasm)
7. [Services & Jobs](#7-services--jobs)
8. [Real-time (ActionCable)](#8-real-time-actioncable)
9. [API](#9-api)
10. [Testing](#10-testing)
11. [Deployment](#11-deployment)
12. [Appendices](#12-appendices)

### Production-Ready Enhancements (Sections 13-20)
13. [Performance Optimization](#13-performance-optimization)
14. [CI/CD Pipeline](#14-cicd-pipeline)
15. [Scalability Patterns](#15-scalability-patterns)
16. [Security Hardening](#16-security-hardening)
17. [Frontend Integration (Hotwire)](#17-frontend-integration)
18. [API Best Practices](#18-api-best-practices)
19. [Code Quality Tools](#19-code-quality-tools)
20. [Testing Enhancements](#20-testing-enhancements)

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

# 1. SEIDO Overview

## 1.1 Application Presentation

### What is SEIDO?

**SEIDO** is a multi-tenant SaaS platform for real estate property management, designed to streamline the coordination of maintenance work (interventions) between property managers, service providers, and tenants.

### The Problem SEIDO Solves

Real estate property management involves complex coordination between multiple stakeholders:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     THE COORDINATION PROBLEM                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  TENANT reports          MANAGER must        PROVIDER needs                │
│  a broken pipe    →      find provider   →   schedule visit   →   WORK    │
│                          get quote           confirm time         DONE     │
│                          approve cost        complete job                  │
│                          schedule            invoice                       │
│                                                                             │
│  ════════════════════════════════════════════════════════════════════════  │
│                                                                             │
│  CURRENT REALITY:                                                          │
│  • Phone calls, emails, paper quotes scattered everywhere                  │
│  • No visibility for tenants on repair status                              │
│  • Managers juggling spreadsheets and WhatsApp groups                      │
│  • Providers confused about job details and schedules                      │
│  • Lost quotes, duplicate work, billing chaos                              │
│                                                                             │
│  SEIDO SOLUTION:                                                           │
│  • Single platform for ALL stakeholders                                    │
│  • Real-time status tracking                                               │
│  • Structured workflow with clear responsibilities                         │
│  • Document management (photos, quotes, invoices)                          │
│  • Complete audit trail                                                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Value Proposition

| Stakeholder | Pain Point | SEIDO Solution |
|-------------|-----------|----------------|
| **Property Manager** | Coordination chaos, lost paperwork | Centralized dashboard, workflow automation |
| **Service Provider** | Unclear job scope, scheduling conflicts | Clear job details, calendar integration |
| **Tenant** | No visibility, hard to report issues | Mobile-friendly requests, real-time tracking |
| **Property Owner** | No oversight on costs and work | Reports, cost tracking, transparency |

### Key Statistics (Target Scale)

| Metric | Target |
|--------|--------|
| Teams (agencies) | 1,000+ |
| Buildings per team | 5-50 |
| Lots (units) per team | 50-500 |
| Interventions per month/team | 20-100 |
| Users per team | 10-50 |
| Concurrent users | 5,000+ |

---

## 1.2 User Personas

SEIDO serves four distinct user personas, each with specific needs, workflows, and interface requirements.

### 1.2.1 Thomas - Property Manager (Gestionnaire)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  PERSONA: THOMAS - PROPERTY MANAGER                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  DEMOGRAPHICS                                                               │
│  ─────────────                                                              │
│  • Age: 42 years old                                                        │
│  • Role: Senior Property Manager at "Immobilière ABC"                       │
│  • Experience: 15 years in real estate                                      │
│  • Portfolio: 280 properties across 12 buildings                            │
│  • Team: 3 assistant managers, 10 regular service providers                 │
│                                                                             │
│  TECHNOLOGY PROFILE                                                         │
│  ──────────────────                                                         │
│  • Primary Device: iPhone 14 Pro (80% of usage)                            │
│  • Secondary: MacBook Pro (office work, 20%)                               │
│  • Comfort Level: High - uses multiple apps daily                          │
│  • Preferred Communication: WhatsApp, email                                │
│                                                                             │
│  DAILY WORKFLOW                                                             │
│  ──────────────                                                             │
│  07:30 - Check dashboard for overnight tenant requests                     │
│  08:00-12:00 - Site visits (3-4 buildings), on mobile                      │
│  12:00-14:00 - Office: approve quotes, review reports                      │
│  14:00-17:00 - More site visits, tenant meetings                           │
│  17:00-18:00 - End-of-day review, schedule tomorrow                        │
│                                                                             │
│  PAIN POINTS                                                                │
│  ───────────                                                                │
│  1. "I receive requests via email, phone, WhatsApp - impossible to track"  │
│  2. "Paper quotes get lost, I approve the same work twice sometimes"       │
│  3. "Tenants call constantly asking 'when will it be fixed?'"              │
│  4. "I can't remember which provider is best for what type of work"        │
│  5. "End-of-month reporting is a nightmare - piecing together invoices"    │
│                                                                             │
│  GOALS                                                                      │
│  ─────                                                                      │
│  • Centralize ALL intervention requests in one place                       │
│  • Reduce time spent on coordination by 50%                                │
│  • Provide tenants with self-service status tracking                       │
│  • Have clear cost history per building/lot                                │
│  • Build a reliable provider network with ratings                          │
│                                                                             │
│  SUCCESS METRICS                                                            │
│  ───────────────                                                            │
│  • Time to first response: < 2 hours                                       │
│  • Intervention completion rate: > 95%                                     │
│  • Tenant satisfaction: > 4.5/5                                            │
│  • Quote approval time: < 24 hours                                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Thomas's Key Screens:**
1. **Dashboard**: Overview of all interventions by status
2. **Intervention Detail**: Full history, quotes, documents
3. **Provider Assignment**: Find and assign the right provider
4. **Quote Comparison**: Side-by-side quote analysis
5. **Reporting**: Monthly costs by building/lot

---

### 1.2.2 Marc - Service Provider (Prestataire)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  PERSONA: MARC - SERVICE PROVIDER                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  DEMOGRAPHICS                                                               │
│  ─────────────                                                              │
│  • Age: 38 years old                                                        │
│  • Role: Independent Plumber, "Marc Plomberie SPRL"                        │
│  • Experience: 12 years, licensed master plumber                           │
│  • Coverage: Brussels region + Brabant Wallon                              │
│  • Team: Solo with 1 apprentice                                            │
│                                                                             │
│  TECHNOLOGY PROFILE                                                         │
│  ──────────────────                                                         │
│  • Primary Device: Samsung Galaxy S23 (95% of usage)                       │
│  • Secondary: Old laptop (invoicing only)                                  │
│  • Comfort Level: Medium - prefers simple interfaces                       │
│  • Preferred Communication: Phone calls, SMS                               │
│                                                                             │
│  DAILY WORKFLOW                                                             │
│  ──────────────                                                             │
│  07:00 - Load van, check day's schedule on phone                           │
│  07:30-18:00 - On-site jobs (4-6 per day)                                  │
│  Between jobs - Answer calls, review new requests                          │
│  18:00-19:00 - Send quotes, update job status                              │
│  Weekend - Invoicing, ordering supplies                                    │
│                                                                             │
│  PAIN POINTS                                                                │
│  ───────────                                                                │
│  1. "I get jobs via WhatsApp without clear addresses or details"           │
│  2. "Managers call asking for status - I'm under a sink!"                  │
│  3. "Double-booked because different managers don't coordinate"            │
│  4. "I forget to send the quote, then lose the job"                        │
│  5. "Payment takes 60+ days, I have to chase invoices"                     │
│                                                                             │
│  GOALS                                                                      │
│  ─────                                                                      │
│  • Get clear job details with photos BEFORE arriving                       │
│  • One place to see ALL my assigned jobs                                   │
│  • Easy quote submission from phone                                        │
│  • Automatic status updates (no calls from managers)                       │
│  • Faster payment cycle                                                    │
│                                                                             │
│  SUCCESS METRICS                                                            │
│  ───────────────                                                            │
│  • Jobs completed per day: 5-6                                             │
│  • Quote acceptance rate: > 70%                                            │
│  • Average payment time: < 30 days                                         │
│  • Return visits (quality): < 5%                                           │
│                                                                             │
│  MOBILE-FIRST REQUIREMENTS                                                  │
│  ─────────────────────────                                                  │
│  • Large touch targets (working with gloves)                               │
│  • Works offline (basement/parking jobs)                                   │
│  • Quick photo upload                                                      │
│  • Voice notes for job updates                                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Marc's Key Screens:**
1. **My Jobs**: List of assigned interventions
2. **Job Detail**: Address, description, photos, history
3. **Time Slot Proposal**: Calendar to propose availability
4. **Quote Submission**: Simple form with line items
5. **Job Completion**: Before/after photos, notes

---

### 1.2.3 Emma - Tenant (Locataire)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  PERSONA: EMMA - TENANT                                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  DEMOGRAPHICS                                                               │
│  ─────────────                                                              │
│  • Age: 29 years old                                                        │
│  • Role: Marketing Manager at a startup                                    │
│  • Living Situation: Renting 2BR apartment in Brussels                     │
│  • Lease Duration: 2 years (1 year remaining)                              │
│                                                                             │
│  TECHNOLOGY PROFILE                                                         │
│  ──────────────────                                                         │
│  • Primary Device: iPhone 15 (100% mobile for personal)                    │
│  • Comfort Level: Very high - digital native                               │
│  • Expectations: Instant feedback, app-like experience                     │
│  • Preferred Communication: In-app notifications, email                    │
│                                                                             │
│  INTERACTION PATTERN                                                        │
│  ───────────────────                                                        │
│  • Frequency: 2-3 intervention requests per year                           │
│  • Urgency: Usually non-urgent (except emergencies)                        │
│  • Expectation: Report problem → Get ETA → Done                            │
│  • Follow-up: Checks status daily when waiting                             │
│                                                                             │
│  PAIN POINTS                                                                │
│  ───────────                                                                │
│  1. "I emailed the agency 3 times, no response"                            │
│  2. "The plumber came when I wasn't home, no coordination"                 │
│  3. "I have no idea if my request was even received"                       │
│  4. "Had to take a day off work waiting for repair"                        │
│  5. "Different people ask me the same questions about the problem"         │
│                                                                             │
│  GOALS                                                                      │
│  ─────                                                                      │
│  • Report problems in 2 minutes from phone                                 │
│  • See clear status updates without calling                                │
│  • Choose convenient time slots for visits                                 │
│  • Communicate with everyone in one place                                  │
│  • Confirm work is done properly                                           │
│                                                                             │
│  SUCCESS METRICS                                                            │
│  ───────────────                                                            │
│  • Request submission time: < 3 minutes                                    │
│  • Time to acknowledgment: < 4 hours                                       │
│  • Scheduling convenience: Can choose from 3+ options                      │
│  • Overall satisfaction: > 4/5                                             │
│                                                                             │
│  SIMPLIFIED INTERFACE REQUIREMENTS                                          │
│  ────────────────────────────────                                           │
│  • Wizard-style request flow (step by step)                                │
│  • Photo upload with annotation                                            │
│  • Clear status badges (Pending, In Progress, Done)                        │
│  • Push notifications for updates                                          │
│  • Minimal required fields                                                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Emma's Key Screens:**
1. **My Unit**: Overview of her apartment
2. **Report Issue**: Wizard to submit intervention request
3. **My Requests**: List of all her interventions
4. **Request Detail**: Status, timeline, communication
5. **Time Slot Selection**: Choose preferred visit times

---

### 1.2.4 System Administrator

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  PERSONA: ADMIN - SYSTEM ADMINISTRATOR                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  DEMOGRAPHICS                                                               │
│  ─────────────                                                              │
│  • Role: SEIDO Platform Support Engineer                                   │
│  • Responsibility: Multi-tenant system administration                      │
│  • Access: All teams, all data (with audit logging)                        │
│                                                                             │
│  TECHNOLOGY PROFILE                                                         │
│  ──────────────────                                                         │
│  • Primary Device: Desktop workstation                                     │
│  • Tools: Admin dashboard, database access, logs                           │
│  • Comfort Level: Expert - technical background                            │
│                                                                             │
│  KEY RESPONSIBILITIES                                                       │
│  ────────────────────                                                       │
│  • User management (activation, deactivation, password resets)             │
│  • Team onboarding and subscription management                             │
│  • Bug investigation and data fixes                                        │
│  • Performance monitoring                                                  │
│  • Security incident response                                              │
│                                                                             │
│  REQUIRED FEATURES                                                          │
│  ─────────────────                                                          │
│  • User impersonation (support debugging)                                  │
│  • Cross-team search                                                       │
│  • Subscription management                                                 │
│  • Activity logs viewer                                                    │
│  • System health dashboard                                                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 1.3 The Intervention Workflow

The **Intervention** is the central entity in SEIDO. It represents a maintenance request that moves through a defined lifecycle from initial request to final closure.

### 1.3.1 Status Overview

SEIDO uses **11 intervention statuses** in French (matching the existing database):

| Status | English Translation | Stage |
|--------|-------------------|-------|
| `demande` | Request | Initial |
| `rejetee` | Rejected | Terminal |
| `approuvee` | Approved | Processing |
| `demande_de_devis` | Quote Requested | Processing |
| `planification` | Scheduling | Processing |
| `planifiee` | Scheduled | Processing |
| `en_cours` | In Progress | Processing (deprecated) |
| `cloturee_par_prestataire` | Closed by Provider | Closing |
| `cloturee_par_locataire` | Closed by Tenant | Closing |
| `cloturee_par_gestionnaire` | Closed by Manager | Terminal |
| `annulee` | Cancelled | Terminal |

### 1.3.2 Visual State Machine

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      INTERVENTION LIFECYCLE                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                              ┌──────────────┐                               │
│                              │              │                               │
│                              │   demande    │  ← TENANT CREATES             │
│                              │   (request)  │                               │
│                              │              │                               │
│                              └──────┬───────┘                               │
│                                     │                                       │
│                        ┌────────────┴────────────┐                          │
│                        │                         │                          │
│                        ▼                         ▼                          │
│               ┌──────────────┐          ┌──────────────┐                    │
│               │              │          │              │                    │
│               │   rejetee    │          │  approuvee   │                    │
│               │  (rejected)  │          │  (approved)  │                    │
│               │              │          │              │                    │
│               │    [END]     │          └──────┬───────┘                    │
│               └──────────────┘                 │                            │
│                                                │                            │
│                              ┌─────────────────┴─────────────────┐          │
│                              │                                   │          │
│                              ▼                                   ▼          │
│                   ┌──────────────────┐              ┌──────────────────┐    │
│                   │                  │              │                  │    │
│                   │ demande_de_devis │              │  planification   │    │
│                   │ (quote request)  │              │   (scheduling)   │    │
│                   │                  │              │                  │    │
│                   └────────┬─────────┘              └────────┬─────────┘    │
│                            │                                 │              │
│                            └─────────────┬───────────────────┘              │
│                                          │                                  │
│                                          ▼                                  │
│                               ┌──────────────────┐                          │
│                               │                  │                          │
│                               │    planifiee     │                          │
│                               │   (scheduled)    │                          │
│                               │                  │                          │
│                               └────────┬─────────┘                          │
│                                        │                                    │
│                                        ▼                                    │
│                          ┌──────────────────────────┐                       │
│                          │                          │                       │
│                          │ cloturee_par_prestataire │ ← PROVIDER COMPLETES  │
│                          │   (closed by provider)   │                       │
│                          │                          │                       │
│                          └────────────┬─────────────┘                       │
│                                       │                                     │
│                                       ▼                                     │
│                          ┌──────────────────────────┐                       │
│                          │                          │                       │
│                          │  cloturee_par_locataire  │ ← TENANT VALIDATES    │
│                          │   (closed by tenant)     │                       │
│                          │                          │                       │
│                          └────────────┬─────────────┘                       │
│                                       │                                     │
│                                       ▼                                     │
│                        ┌────────────────────────────┐                       │
│                        │                            │                       │
│                        │ cloturee_par_gestionnaire  │ ← MANAGER FINALIZES   │
│                        │   (closed by manager)      │                       │
│                        │                            │                       │
│                        │           [END]            │                       │
│                        └────────────────────────────┘                       │
│                                                                             │
│  ┌──────────────┐                                                           │
│  │              │                                                           │
│  │   annulee    │  ◀─────── Can be reached from ANY non-terminal state     │
│  │ (cancelled)  │                                                           │
│  │              │                                                           │
│  │    [END]     │                                                           │
│  └──────────────┘                                                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.3.3 Status Transitions Table

| Current Status | Next Status | Who Can Trigger | Conditions | Actions |
|----------------|-------------|-----------------|------------|---------|
| `demande` | `approuvee` | Gestionnaire | Valid request | Notify tenant, log activity |
| `demande` | `rejetee` | Gestionnaire | Invalid/duplicate | Notify tenant with reason |
| `approuvee` | `demande_de_devis` | Gestionnaire | Needs external quote | Notify assigned providers |
| `approuvee` | `planification` | Gestionnaire | No quote needed | Create time slots |
| `demande_de_devis` | `planification` | System/Gestionnaire | Quote approved | Create time slots |
| `planification` | `planifiee` | System | Time slot confirmed | Notify all parties |
| `planifiee` | `cloturee_par_prestataire` | Prestataire | Work completed | Request photos, notify tenant |
| `cloturee_par_prestataire` | `cloturee_par_locataire` | Locataire | Validates quality | Notify manager |
| `cloturee_par_locataire` | `cloturee_par_gestionnaire` | Gestionnaire | Final review | Archive, update costs |
| ANY (non-terminal) | `annulee` | Gestionnaire | Cancel decision | Notify all, log reason |

### 1.3.4 Detailed Workflow by Phase

#### Phase 1: Request Submission (Tenant)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          PHASE 1: REQUEST SUBMISSION                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  TENANT ACTIONS:                                                            │
│  ───────────────                                                            │
│  1. Select property type (common areas / private unit)                      │
│  2. Choose intervention category:                                           │
│     • plomberie (plumbing)                                                 │
│     • electricite (electrical)                                             │
│     • chauffage (heating)                                                  │
│     • serrurerie (locksmith)                                               │
│     • peinture (painting)                                                  │
│     • menage (cleaning)                                                    │
│     • jardinage (gardening)                                                │
│     • climatisation (air conditioning)                                     │
│     • vitrerie (glazing)                                                   │
│     • toiture (roofing)                                                    │
│     • autre (other)                                                        │
│                                                                             │
│  3. Set urgency level:                                                      │
│     • basse (low) - Can wait 2+ weeks                                      │
│     • normale (normal) - Within 1 week                                     │
│     • haute (high) - Within 48 hours                                       │
│     • urgente (urgent) - Same day (emergency)                              │
│                                                                             │
│  4. Describe the problem (free text)                                        │
│  5. Upload photos (optional but encouraged)                                 │
│  6. Confirm availability for visits                                         │
│                                                                             │
│  SYSTEM ACTIONS:                                                            │
│  ───────────────                                                            │
│  • Create intervention with status = 'demande'                             │
│  • Create conversation thread linked to intervention                        │
│  • Notify gestionnaire(s) of new request                                   │
│  • Log activity                                                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Phase 2: Triage & Assignment (Manager)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          PHASE 2: TRIAGE & ASSIGNMENT                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  GESTIONNAIRE REVIEWS:                                                      │
│  ─────────────────────                                                      │
│  • Is this a valid request?                                                │
│  • Is it a duplicate of existing intervention?                             │
│  • Does it fall under building maintenance or tenant responsibility?       │
│                                                                             │
│  DECISION TREE:                                                             │
│                                                                             │
│                    ┌─────────────────┐                                      │
│                    │ Valid Request?  │                                      │
│                    └────────┬────────┘                                      │
│                             │                                               │
│              ┌──────────────┴──────────────┐                                │
│              │                             │                                │
│              ▼                             ▼                                │
│         ┌────────┐                   ┌──────────┐                           │
│         │   NO   │                   │   YES    │                           │
│         └────┬───┘                   └─────┬────┘                           │
│              │                             │                                │
│              ▼                             ▼                                │
│    ┌─────────────────┐          ┌─────────────────┐                         │
│    │ Reject with     │          │ Needs external  │                         │
│    │ reason          │          │ quote?          │                         │
│    │ → 'rejetee'     │          └────────┬────────┘                         │
│    └─────────────────┘                   │                                  │
│                                ┌─────────┴─────────┐                        │
│                                │                   │                        │
│                                ▼                   ▼                        │
│                           ┌────────┐          ┌────────┐                    │
│                           │  YES   │          │   NO   │                    │
│                           └────┬───┘          └────┬───┘                    │
│                                │                   │                        │
│                                ▼                   ▼                        │
│                    ┌─────────────────┐   ┌─────────────────┐                │
│                    │ Assign provider │   │ Assign provider │                │
│                    │ Request quote   │   │ Skip to         │                │
│                    │ →'demande_devis'│   │ scheduling      │                │
│                    └─────────────────┘   │ →'planification'│                │
│                                          └─────────────────┘                │
│                                                                             │
│  ASSIGNMENT CREATES:                                                        │
│  ───────────────────                                                        │
│  • intervention_assignments record with role = 'prestataire'               │
│  • Notification to provider                                                │
│  • Activity log entry                                                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Phase 3: Quote Process (Provider)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          PHASE 3: QUOTE PROCESS                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PRESTATAIRE RECEIVES ASSIGNMENT:                                           │
│  ─────────────────────────────────                                          │
│  • Push notification + email                                               │
│  • Job appears in "My Jobs" list                                           │
│                                                                             │
│  PRESTATAIRE ACTIONS:                                                       │
│  ────────────────────                                                       │
│  1. Review job details (description, photos, location)                      │
│  2. Option A: Submit quote directly                                         │
│     • Amount (€)                                                           │
│     • Description of work                                                  │
│     • Validity period (default: 30 days)                                   │
│     • Optional: Line items breakdown                                        │
│                                                                             │
│  3. Option B: Request site visit first                                      │
│     • Propose time slots for assessment visit                              │
│     • Submit quote after visit                                              │
│                                                                             │
│  QUOTE WORKFLOW:                                                            │
│                                                                             │
│         Provider               Manager                  System              │
│            │                      │                        │                │
│            │ Submit quote         │                        │                │
│            │─────────────────────▶│                        │                │
│            │                      │                        │                │
│            │                      │ Review quote           │                │
│            │                      │────────┐               │                │
│            │                      │        │               │                │
│            │                      │◀───────┘               │                │
│            │                      │                        │                │
│            │                      │ Approve/Reject         │                │
│            │                      │───────────────────────▶│                │
│            │                      │                        │                │
│            │                      │                        │ Update status  │
│            │◀─────────────────────│◀───────────────────────│                │
│            │   Notification       │                        │                │
│                                                                             │
│  QUOTE STATUSES:                                                            │
│  ───────────────                                                            │
│  • draft - Being prepared                                                  │
│  • sent - Submitted to manager                                             │
│  • accepted - Approved, work can proceed                                   │
│  • rejected - Declined with reason                                         │
│  • expired - Validity period passed                                        │
│  • cancelled - Withdrawn by provider                                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Phase 4: Scheduling (All Parties)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          PHASE 4: SCHEDULING                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  TIME SLOT PROPOSAL FLOW:                                                   │
│  ────────────────────────                                                   │
│                                                                             │
│  1. PROVIDER PROPOSES SLOTS                                                 │
│     ┌─────────────────────────────────────────┐                             │
│     │ Provider proposes 3 time slots:         │                             │
│     │                                         │                             │
│     │ □ Mon 15/01 - 09:00-12:00              │                             │
│     │ □ Tue 16/01 - 14:00-17:00              │                             │
│     │ □ Thu 18/01 - 09:00-12:00              │                             │
│     └─────────────────────────────────────────┘                             │
│                     │                                                       │
│                     ▼                                                       │
│  2. TENANT RESPONDS                                                         │
│     ┌─────────────────────────────────────────┐                             │
│     │ Tenant marks availability:              │                             │
│     │                                         │                             │
│     │ ✓ Mon 15/01 - 09:00-12:00 (available)  │                             │
│     │ ✗ Tue 16/01 - 14:00-17:00 (unavailable)│                             │
│     │ ✓ Thu 18/01 - 09:00-12:00 (available)  │                             │
│     └─────────────────────────────────────────┘                             │
│                     │                                                       │
│                     ▼                                                       │
│  3. MANAGER CONFIRMS                                                        │
│     ┌─────────────────────────────────────────┐                             │
│     │ Manager selects final slot:             │                             │
│     │                                         │                             │
│     │ ✓ Mon 15/01 - 09:00-12:00 [SELECTED]   │                             │
│     │                                         │                             │
│     │ Status → 'planifiee'                    │                             │
│     └─────────────────────────────────────────┘                             │
│                                                                             │
│  TIME SLOT STATUSES:                                                        │
│  ───────────────────                                                        │
│  • pending - Proposed, awaiting responses                                  │
│  • selected - Confirmed as final schedule                                  │
│  • rejected - Not suitable for one party                                   │
│  • cancelled - Withdrawn                                                   │
│                                                                             │
│  RESPONSE TRACKING:                                                         │
│  ──────────────────                                                         │
│  time_slot_responses table tracks each user's response to each slot        │
│  • user_id, time_slot_id, response ('accepted'/'rejected'), timestamp      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Phase 5: Work Execution & Closure

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          PHASE 5: EXECUTION & CLOSURE                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PROVIDER COMPLETES WORK:                                                   │
│  ────────────────────────                                                   │
│  1. Mark status as 'cloturee_par_prestataire'                              │
│  2. Upload completion photos                                                │
│  3. Add work notes/report                                                  │
│  4. Optionally: Request signature from tenant                              │
│                                                                             │
│  TENANT VALIDATES:                                                          │
│  ─────────────────                                                          │
│  1. Review work quality                                                    │
│  2. Options:                                                               │
│     • Approve → Status becomes 'cloturee_par_locataire'                    │
│     • Report issue → Stays in current status, comment added                │
│  3. Optional: Rate provider (1-5 stars)                                    │
│                                                                             │
│  MANAGER FINALIZES:                                                         │
│  ─────────────────                                                          │
│  1. Review all documentation                                               │
│  2. Enter final cost (may differ from quote)                               │
│  3. Mark as 'cloturee_par_gestionnaire'                                    │
│  4. Intervention archived but accessible                                   │
│                                                                             │
│  CLOSURE TIMELINE:                                                          │
│                                                                             │
│  Provider       Tenant        Manager        System                         │
│     │              │              │              │                          │
│     │ Complete     │              │              │                          │
│     │─────────────▶│              │              │                          │
│     │              │              │              │ Notify tenant            │
│     │              │◀─────────────│──────────────│                          │
│     │              │              │              │                          │
│     │              │ Validate     │              │                          │
│     │              │─────────────▶│              │                          │
│     │              │              │              │ Notify manager           │
│     │              │              │◀─────────────│                          │
│     │              │              │              │                          │
│     │              │              │ Finalize     │                          │
│     │              │              │─────────────▶│                          │
│     │              │              │              │                          │
│     │              │              │              │ Archive                  │
│     │◀─────────────│◀─────────────│◀─────────────│                          │
│     │   Done       │   Done       │   Done       │                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 1.4 Multi-Tenant Architecture

SEIDO is built as a **multi-tenant SaaS platform** where each tenant (called a "Team") has completely isolated data.

### 1.4.1 Tenant Model

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          MULTI-TENANT ARCHITECTURE                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                         ┌──────────────────────┐                            │
│                         │   SEIDO PLATFORM     │                            │
│                         │   (Single Database)  │                            │
│                         └──────────┬───────────┘                            │
│                                    │                                        │
│          ┌─────────────────────────┼─────────────────────────┐              │
│          │                         │                         │              │
│          ▼                         ▼                         ▼              │
│  ┌───────────────┐        ┌───────────────┐        ┌───────────────┐        │
│  │    TEAM A     │        │    TEAM B     │        │    TEAM C     │        │
│  │ (Agency ABC)  │        │ (Property Co) │        │ (Syndic XYZ)  │        │
│  ├───────────────┤        ├───────────────┤        ├───────────────┤        │
│  │               │        │               │        │               │        │
│  │ • 5 Buildings │        │ • 12 Buildings│        │ • 3 Buildings │        │
│  │ • 45 Lots     │        │ • 180 Lots    │        │ • 28 Lots     │        │
│  │ • 58 Users    │        │ • 213 Users   │        │ • 35 Users    │        │
│  │               │        │               │        │               │        │
│  │ team_id: A123 │        │ team_id: B456 │        │ team_id: C789 │        │
│  │               │        │               │        │               │        │
│  └───────────────┘        └───────────────┘        └───────────────┘        │
│                                                                             │
│  ════════════════════════════════════════════════════════════════════════  │
│                           DATA ISOLATION                                    │
│                                                                             │
│  • Team A CANNOT see Team B's buildings, lots, interventions               │
│  • Team A CANNOT see Team C's users (except shared providers)              │
│  • All queries automatically scoped by team_id                             │
│  • Admin users can access all teams (for support)                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.4.2 Team Membership Model

Users belong to teams through the `team_members` junction table, which allows:
- A user to belong to **multiple teams** (e.g., a provider working with several agencies)
- Different **roles per team** (e.g., manager in Team A, viewer in Team B)
- **Soft delete** for membership history (using `discarded_at`)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          TEAM MEMBERSHIP MODEL                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                              ┌─────────┐                                    │
│                              │  User   │                                    │
│                              │ (Marc)  │                                    │
│                              └────┬────┘                                    │
│                                   │                                         │
│              ┌────────────────────┼────────────────────┐                    │
│              │                    │                    │                    │
│              ▼                    ▼                    ▼                    │
│       ┌─────────────┐      ┌─────────────┐      ┌─────────────┐            │
│       │ TeamMember  │      │ TeamMember  │      │ TeamMember  │            │
│       ├─────────────┤      ├─────────────┤      ├─────────────┤            │
│       │ team: A     │      │ team: B     │      │ team: C     │            │
│       │ role: presta│      │ role: presta│      │ role: presta│            │
│       │ joined: 2023│      │ joined: 2024│      │ left: 2024  │            │
│       └─────────────┘      └─────────────┘      └─────────────┘            │
│                                                  (soft deleted)             │
│                                                                             │
│  Marc can:                                                                  │
│  • See interventions assigned to him in Team A and Team B                  │
│  • NOT see anything in Team C (membership ended)                           │
│  • Have different notification preferences per team                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.4.3 Data Scoping Pattern

In Ruby on Rails, we use the `acts_as_tenant` gem to automatically scope all queries:

```ruby
# Every model that belongs to a team
class Building < ApplicationRecord
  acts_as_tenant(:team)
  # All queries automatically add: WHERE team_id = current_team.id
end

# In controllers
class BuildingsController < ApplicationController
  before_action :set_current_tenant  # Sets ActsAsTenant.current_tenant

  def index
    @buildings = Building.all  # Automatically scoped to current team
  end
end

# The resulting SQL:
# SELECT * FROM buildings WHERE team_id = '...' AND discarded_at IS NULL
```

---

## 1.5 Core Features

### 1.5.1 Properties Module

Manages the real estate portfolio: buildings and individual lots (units).

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          PROPERTIES MODULE                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                              ┌─────────────┐                                │
│                              │    Team     │                                │
│                              └──────┬──────┘                                │
│                                     │ has_many                              │
│                                     ▼                                       │
│                              ┌─────────────┐                                │
│                              │  Building   │                                │
│                              │ (Immeuble)  │                                │
│                              ├─────────────┤                                │
│                              │ • name      │                                │
│                              │ • address   │──────────▶ Address             │
│                              │ • contacts  │──────────▶ BuildingContacts    │
│                              │ • documents │──────────▶ Documents           │
│                              └──────┬──────┘                                │
│                                     │ has_many                              │
│                                     ▼                                       │
│                              ┌─────────────┐                                │
│                              │    Lot      │                                │
│                              │ (Unit)      │                                │
│                              ├─────────────┤                                │
│                              │ • reference │                                │
│                              │ • category  │ appartement, maison, garage... │
│                              │ • floor     │                                │
│                              │ • contacts  │──────────▶ LotContacts         │
│                              │ • contracts │──────────▶ Contracts           │
│                              └─────────────┘                                │
│                                                                             │
│  LOT CATEGORIES:                                                            │
│  ───────────────                                                            │
│  • appartement (apartment)                                                 │
│  • collocation (shared housing)                                            │
│  • maison (house)                                                          │
│  • garage (garage)                                                         │
│  • local_commercial (commercial space)                                     │
│  • parking (parking spot)                                                  │
│  • autre (other)                                                           │
│                                                                             │
│  KEY FEATURES:                                                              │
│  ─────────────                                                              │
│  • Hierarchical: Building → Lots                                           │
│  • Standalone lots supported (no building parent)                          │
│  • Multiple contacts per building/lot (owner, guardian, etc.)              │
│  • Document storage with versioning                                        │
│  • Soft delete for audit trail                                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.5.2 Contracts Module

Manages lease agreements with automatic status calculation.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          CONTRACTS MODULE                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  CONTRACT LIFECYCLE:                                                        │
│  ───────────────────                                                        │
│                                                                             │
│     ┌─────────────┐                                                         │
│     │  brouillon  │  Draft - being prepared                                │
│     │   (draft)   │                                                         │
│     └──────┬──────┘                                                         │
│            │ sign                                                           │
│            ▼                                                                │
│     ┌─────────────┐     ┌─────────────┐                                    │
│     │   a_venir   │────▶│    actif    │  Active lease                      │
│     │  (upcoming) │     │   (active)  │                                    │
│     └─────────────┘     └──────┬──────┘                                    │
│                                │                                            │
│               ┌────────────────┼────────────────┐                          │
│               │                │                │                          │
│               ▼                ▼                ▼                          │
│        ┌───────────┐    ┌───────────┐    ┌───────────┐                     │
│        │  expire   │    │  resilie  │    │ renouvele │                     │
│        │ (expired) │    │(terminated│    │ (renewed) │                     │
│        │           │    │           │    │           │                     │
│        └───────────┘    └───────────┘    └───────────┘                     │
│                                                                             │
│  STATUS CALCULATION (automatic based on dates):                             │
│  ───────────────────────────────────────────────                            │
│  • a_venir: start_date > today                                             │
│  • actif: start_date <= today <= end_date                                  │
│  • expire: end_date < today                                                │
│  • resilie: terminated_at IS NOT NULL                                      │
│  • renouvele: renewed_to_contract_id IS NOT NULL                           │
│                                                                             │
│  CONTRACT TYPES:                                                            │
│  ───────────────                                                            │
│  • bail_habitation - Residential lease                                     │
│  • bail_meuble - Furnished lease                                           │
│                                                                             │
│  KEY FIELDS:                                                                │
│  ───────────                                                                │
│  • title, contract_type                                                    │
│  • start_date, duration_months, end_date                                   │
│  • rent_amount, charges_amount                                             │
│  • payment_frequency (mensuel, trimestriel, semestriel, annuel)           │
│  • guarantee_type, guarantee_amount                                        │
│  • signed_date                                                             │
│                                                                             │
│  CONTRACT CONTACTS (junction table):                                        │
│  ───────────────────────────────────                                        │
│  Roles: locataire, colocataire, garant, representant_legal, autre          │
│                                                                             │
│  FEATURES:                                                                  │
│  ─────────                                                                  │
│  • 5-step creation wizard                                                  │
│  • Automatic expiration alerts (30 days, 7 days before)                    │
│  • Contract renewal linking                                                │
│  • Document attachments (lease PDF, amendments, etc.)                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.5.3 Communication Module

Real-time chat and notifications.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          COMMUNICATION MODULE                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  CONVERSATION THREADS:                                                      │
│  ─────────────────────                                                      │
│  Each intervention has ONE conversation thread linking all participants:    │
│  • Gestionnaire(s)                                                         │
│  • Prestataire(s)                                                          │
│  • Locataire                                                               │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     INTERVENTION #1234                               │   │
│  │                     "Fuite dans la salle de bain"                   │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │                                                                     │   │
│  │  [Emma - Tenant]                              14:32                 │   │
│  │  La fuite continue, j'ai mis une bassine     │                     │   │
│  │  📎 photo_fuite.jpg                                                │   │
│  │                                                                     │   │
│  │                              [Thomas - Manager]   14:45             │   │
│  │                              │ Marc va passer demain matin          │   │
│  │                                                                     │   │
│  │  [Marc - Provider]                            15:02                 │   │
│  │  Je serai là entre 9h et 12h                  │                     │   │
│  │                                                                     │   │
│  │  [System]                                     15:02                 │   │
│  │  ✓ Time slot confirmed: Tomorrow 09:00-12:00                       │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  NOTIFICATIONS:                                                             │
│  ─────────────                                                              │
│  Types:                                                                     │
│  • intervention - New request, status change                               │
│  • chat - New message in conversation                                      │
│  • document - New document uploaded                                        │
│  • system - Platform announcements                                         │
│  • team_invite - Invitation to join team                                   │
│  • assignment - Assigned to intervention                                   │
│  • status_change - Intervention status updated                             │
│  • reminder - Upcoming deadlines                                           │
│  • deadline - Contract expiration, etc.                                    │
│                                                                             │
│  Delivery Channels:                                                         │
│  • In-app (real-time via ActionCable)                                      │
│  • Push notifications (WebPush)                                            │
│  • Email (for important events)                                            │
│                                                                             │
│  ACTIVITY LOGS:                                                             │
│  ──────────────                                                             │
│  Immutable audit trail of ALL significant actions:                         │
│  • Who did what, when, on which entity                                     │
│  • IP address and user agent                                               │
│  • Before/after values for updates                                         │
│  • Cannot be modified or deleted                                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.5.4 Billing Module (Stripe)

Subscription management for teams.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          BILLING MODULE (STRIPE)                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  SUBSCRIPTION MODEL:                                                        │
│  ───────────────────                                                        │
│                                                                             │
│                    ┌────────────────┐                                       │
│                    │     Team       │                                       │
│                    └───────┬────────┘                                       │
│                            │                                                │
│                            ▼                                                │
│                    ┌────────────────┐                                       │
│                    │StripeCustomer  │                                       │
│                    │ stripe_id: xxx │                                       │
│                    └───────┬────────┘                                       │
│                            │                                                │
│                            ▼                                                │
│                    ┌────────────────┐                                       │
│                    │  Subscription  │                                       │
│                    ├────────────────┤                                       │
│                    │ status: active │                                       │
│                    │ plan: pro      │                                       │
│                    │ seats: 10      │                                       │
│                    └───────┬────────┘                                       │
│                            │                                                │
│                            ▼                                                │
│                    ┌────────────────┐                                       │
│                    │ StripeInvoice  │                                       │
│                    │ (history)      │                                       │
│                    └────────────────┘                                       │
│                                                                             │
│  SUBSCRIPTION STATUSES:                                                     │
│  ──────────────────────                                                     │
│  • trialing - Free trial period                                            │
│  • active - Paid and current                                               │
│  • incomplete - Payment pending                                            │
│  • incomplete_expired - Payment failed                                     │
│  • past_due - Payment overdue                                              │
│  • unpaid - Multiple failed payments                                       │
│  • canceled - Subscription ended                                           │
│  • paused - Temporarily suspended                                          │
│                                                                             │
│  PRICING MODEL (suggested):                                                 │
│  ──────────────────────────                                                 │
│  • Free: 1 building, 10 lots, 1 user                                       │
│  • Pro: Unlimited buildings/lots, 10 users, €49/month                      │
│  • Enterprise: Unlimited everything, custom pricing                        │
│                                                                             │
│  STRIPE WEBHOOKS:                                                           │
│  ────────────────                                                           │
│  • customer.subscription.created                                           │
│  • customer.subscription.updated                                           │
│  • customer.subscription.deleted                                           │
│  • invoice.paid                                                            │
│  • invoice.payment_failed                                                  │
│  • checkout.session.completed                                              │
│                                                                             │
│  WEBHOOK SECURITY:                                                          │
│  ─────────────────                                                          │
│  • Verify Stripe signature (STRIPE_WEBHOOK_SECRET)                         │
│  • Idempotency handling (store event IDs)                                  │
│  • Retry logic for failed processing                                       │
│  • Async processing via Sidekiq                                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 1.6 Entity Relationship Diagram

### 1.6.1 High-Level Domain Model

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     SEIDO ENTITY RELATIONSHIP DIAGRAM                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                                                                             │
│                              ┌─────────────┐                                │
│                              │    Team     │                                │
│                              │ (tenant)    │                                │
│                              └──────┬──────┘                                │
│                                     │                                       │
│        ┌────────────────────────────┼────────────────────────────┐          │
│        │                            │                            │          │
│        ▼                            ▼                            ▼          │
│  ┌───────────┐              ┌───────────────┐             ┌───────────┐     │
│  │   User    │◀────────────▶│ TeamMember    │             │ Building  │     │
│  │           │              │               │             │           │     │
│  └─────┬─────┘              └───────────────┘             └─────┬─────┘     │
│        │                                                        │           │
│        │ creates                                                │ has_many  │
│        ▼                                                        ▼           │
│  ┌───────────────┐                                        ┌───────────┐     │
│  │ Intervention  │◀───────────────────────────────────────│    Lot    │     │
│  │               │                belongs_to              │           │     │
│  └───────┬───────┘                                        └─────┬─────┘     │
│          │                                                      │           │
│          │                                                      │           │
│   ┌──────┼──────┬──────────────┬──────────────┐                │           │
│   │      │      │              │              │                │           │
│   ▼      ▼      ▼              ▼              ▼                ▼           │
│ ┌────┐┌─────┐┌──────┐    ┌──────────┐   ┌─────────┐     ┌───────────┐      │
│ │Assi││Quote││Time  │    │Conversa- │   │Document │     │ Contract  │      │
│ │gnmt││     ││Slot  │    │tion      │   │(poly)   │     │           │      │
│ └────┘└─────┘└──────┘    │Thread    │   └─────────┘     └───────────┘      │
│                          └────┬─────┘                                       │
│                               │                                             │
│                               ▼                                             │
│                          ┌──────────┐                                       │
│                          │ Message  │                                       │
│                          └──────────┘                                       │
│                                                                             │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════   │
│                               LEGEND                                        │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  ───────▶  has_many / has_one                                              │
│  ◀──────▶  many_to_many (through junction table)                           │
│  - - - -▶  polymorphic association                                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.6.2 Complete Table Relationships

The complete database schema includes **33+ tables** organized in phases:

| Phase | Tables | Description |
|-------|--------|-------------|
| **Phase 1** | users, teams, team_members, companies, company_members, user_invitations | Authentication & multi-tenancy |
| **Phase CRM** | addresses, contacts, documents | Centralized CRM |
| **Phase 2** | buildings, lots, building_contacts, lot_contacts | Properties |
| **Phase 3a** | interventions, intervention_assignments, intervention_time_slots, time_slot_responses, intervention_quotes, intervention_comments, intervention_reports, intervention_links | Interventions |
| **Phase 3b** | conversation_threads, conversation_messages, conversation_participants | Chat |
| **Phase 3c** | notifications, activity_logs, push_subscriptions | Notifications & Audit |
| **Phase 4** | contracts, contract_contacts | Contracts |
| **Billing** | stripe_customers, subscriptions, stripe_invoices, stripe_prices | Stripe integration |

---

*End of Section 1 - SEIDO Overview*

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
        demande_de_devis: "Devis demandé"
        planification: "En planification"
        planifiee: "Planifiée"
        en_cours: "En cours"
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
        demande_de_devis: "Offerte aangevraagd"
        planification: "In planning"
        planifiee: "Gepland"
        en_cours: "In uitvoering"
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
        demande_de_devis: "Quote requested"
        planification: "Scheduling"
        planifiee: "Scheduled"
        en_cours: "In progress"
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
| **Installable** | Lighthouse > PWA | ✅ Pass |
| **Fast and reliable** | < 3s FCP, < 5s LCP | > 90 |
| **Optimized** | Assets compressed | > 90 |
| **Works offline** | Airplane mode test | ✅ Pass |

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

# Section 3: Data Models

## 3.1 Overview

SEIDO's database architecture consists of **37 tables** organized into logical phases, reflecting the application's modular growth. Each phase addresses a specific business domain while maintaining referential integrity across the entire system.

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
| **Billing** | Stripe | 4 | Subscriptions, invoices, products |

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
│                                    SEIDO DATABASE - 37 TABLES                                        │
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
│  ║                          │ • status (11 states - AASM)  │                                   ║   │
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
  # AASM STATE MACHINE (11 states)
  # ═══════════════════════════════════════════════════════════════════════════
  aasm column: :status, enum: true, whiny_persistence: true do
    state :demande, initial: true
    state :rejetee
    state :approuvee
    state :demande_de_devis
    state :planification
    state :planifiee
    state :en_cours
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

    # Request quotes from providers
    event :request_quote do
      transitions from: :approuvee, to: :demande_de_devis
      after { notify_providers(:quote_requested) }
    end

    # Move to scheduling phase
    event :start_scheduling do
      transitions from: [:approuvee, :demande_de_devis], to: :planification
    end

    # Time slot selected, intervention scheduled
    event :schedule do
      transitions from: :planification, to: :planifiee
      after do |scheduled_date|
        update!(scheduled_date: scheduled_date)
        notify_participants(:scheduled)
      end
    end

    # Provider starts work
    event :start_work do
      transitions from: :planifiee, to: :en_cours
    end

    # Provider marks complete
    event :complete_by_provider do
      transitions from: [:planifiee, :en_cours], to: :cloturee_par_prestataire
      after { notify_tenant(:provider_completed) }
    end

    # Tenant validates quality
    event :validate_by_tenant do
      transitions from: :cloturee_par_prestataire, to: :cloturee_par_locataire
      after { notify_managers(:tenant_validated) }
    end

    # Manager finalizes
    event :finalize do
      transitions from: :cloturee_par_locataire, to: :cloturee_par_gestionnaire
      after do
        update!(completed_date: Time.current)
        notify_all(:completed)
      end
    end

    # Cancel (from any state)
    event :cancel do
      transitions from: [
        :demande, :approuvee, :demande_de_devis, :planification,
        :planifiee, :en_cours, :cloturee_par_prestataire, :cloturee_par_locataire
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

  enum :thread_type, {
    group: 'group',
    tenant_to_managers: 'tenant_to_managers',
    provider_to_managers: 'provider_to_managers'
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

  -- Email content
  subject TEXT NOT NULL,
  body_text TEXT,
  body_html TEXT,

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
```

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

#### 3.6.7.5 Email ENUMs

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

# Section 4: PostgreSQL Migrations (Raw SQL)

## 4.1 Overview

This section contains **raw PostgreSQL SQL** for creating the complete SEIDO database schema. While Rails provides a DSL for migrations, raw SQL offers:

1. **Full PostgreSQL feature access** (ENUM types, generated columns, partial indexes)
2. **Explicit control** over constraint definitions
3. **Performance optimization** with custom index types
4. **Portable documentation** for any PostgreSQL-based system

### 4.1.1 Migration Order

```
1. Enable extensions (uuid-ossp, pgcrypto)
2. Create ENUM types (37 types)
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
  'demande_de_devis',              -- Quote requested
  'planification',                 -- Finding time slot
  'planifiee',                     -- Time slot confirmed
  'en_cours',                      -- Work in progress
  'cloturee_par_prestataire',      -- Provider marked complete
  'cloturee_par_locataire',        -- Tenant validated
  'cloturee_par_gestionnaire',     -- Manager finalized
  'annulee'                        -- Cancelled
);

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
  'group',
  'tenant_to_managers',
  'provider_to_managers'
);

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

-- Interventions awaiting quote
CREATE INDEX idx_interventions_awaiting_quote ON interventions(team_id, created_at)
  WHERE discarded_at IS NULL AND status = 'demande_de_devis';

-- Interventions in planning
CREATE INDEX idx_interventions_planning ON interventions(team_id, created_at)
  WHERE discarded_at IS NULL AND status IN ('planification', 'planifiee');

-- Interventions in progress
CREATE INDEX idx_interventions_in_progress ON interventions(team_id, created_at)
  WHERE discarded_at IS NULL AND status = 'en_cours';

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
    "approuvee": ["demande_de_devis", "planification", "annulee"],
    "rejetee": [],
    "demande_de_devis": ["planification", "annulee"],
    "planification": ["planifiee", "annulee"],
    "planifiee": ["en_cours", "annulee"],
    "en_cours": ["cloturee_par_prestataire", "annulee"],
    "cloturee_par_prestataire": ["cloturee_par_locataire", "annulee"],
    "cloturee_par_locataire": ["cloturee_par_gestionnaire", "annulee"],
    "cloturee_par_gestionnaire": [],
    "annulee": []
  }';
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
    redirect_to root_path, alert: "Accès non autorisé à cette équipe"
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
| ✅ CRUD | Create, Read, Update, Delete (full access) |
| 📖 R | Read only |
| ✏️ RU | Read + Update |
| ➕ CR | Create + Read |
| 🔒 RLS | Filtered by `team_id`/`user_id` via `policy_scope` |
| ❌ | No access |
| 🔑 | Depends on RBAC permissions |
| 👤 | Own data only |

#### Phase 1: Users & Teams

| Table | Admin | Gestionnaire | Prestataire | Locataire | Propriétaire | Scope |
|-------|:-----:|:------------:|:-----------:|:---------:|:------------:|-------|
| `users` | ✅ CRUD | 📖 R team | 📖 R assigned | 👤 self | 👤 self | `team_members` |
| `teams` | ✅ CRUD | ✏️ RU 🔑 | 📖 R own | 📖 R own | 📖 R own | `team_members` |
| `team_members` | ✅ CRUD | ✅ CRUD 🔑 | 📖 R own | 📖 R own | 📖 R own | `team_id` |
| `user_invitations` | ✅ CRUD | ✅ CRUD 🔑 | ❌ | ❌ | ❌ | `team_id` |
| `companies` | ✅ CRUD | ✅ CRUD | 📖 R own | ❌ | 📖 R own | `team_id` |
| `company_members` | ✅ CRUD | ✅ CRUD | 📖 R own | ❌ | 📖 R own | via `companies` |
| `permissions` | ✅ CRUD | 📖 R | 📖 R | 📖 R | 📖 R | public |
| `role_default_permissions` | ✅ CRUD | 📖 R | 📖 R | 📖 R | 📖 R | public |
| `subscriptions` | ✅ CRUD | ✏️ RU 🔑 | ❌ | ❌ | ❌ | `team_id` |
| `subscription_invoices` | ✅ CRUD | 📖 R | ❌ | ❌ | ❌ | via `subscriptions` |

**`team_members` Actions Detail (soft delete with `left_at`):**

| Action | Admin | Gestionnaire | Prestataire | Locataire | Propriétaire |
|--------|:-----:|:------------:|:-----------:|:---------:|:------------:|
| View active members | ✅ | ✅ team | 📖 R self | 📖 R self | 📖 R self |
| View member history | ✅ | ✅ team | ❌ | ❌ | ❌ |
| Deactivate member | ✅ | ✅ non-managers* | ❌ | ❌ | ❌ |
| Reactivate member | ✅ | ✅ team | ❌ | ❌ | ❌ |

*\* Gestionnaires can only deactivate members with role prestataire/locataire, NOT other gestionnaires. Team owner can deactivate all members except themselves. Deactivating the last admin/gestionnaire is forbidden.*

#### Phase CRM: Contacts

| Table | Admin | Gestionnaire | Prestataire | Locataire | Propriétaire | Scope |
|-------|:-----:|:------------:|:-----------:|:---------:|:------------:|-------|
| `contacts` | ✅ CRUD | ✅ CRUD 🔑 | 📖 R assigned | 👤 self | 👤 self | `team_id` |
| `building_contacts` | ✅ CRUD | ✅ CRUD | 📖 R assigned | ❌ | 📖 R own bldg | via `buildings` |
| `lot_contacts` | ✅ CRUD | ✅ CRUD | 📖 R assigned | 📖 R own lot | 📖 R own lot | via `lots` |
| `contract_contacts` | ✅ CRUD | ✅ CRUD | ❌ | 📖 R own | 📖 R own | via `contracts` |

#### Phase 2: Properties

| Table | Admin | Gestionnaire | Prestataire | Locataire | Propriétaire | Scope |
|-------|:-----:|:------------:|:-----------:|:---------:|:------------:|-------|
| `buildings` | ✅ CRUD | ✅ CRUD 🔑 | 📖 R assigned | 📖 R own | 📖 R own | `team_id` |
| `lots` | ✅ CRUD | ✅ CRUD 🔑 | 📖 R assigned | 📖 R own | 📖 R own | `team_id` |

#### Phase 3: Interventions

| Table | Admin | Gestionnaire | Prestataire | Locataire | Propriétaire | Scope |
|-------|:-----:|:------------:|:-----------:|:---------:|:------------:|-------|
| `interventions` | ✅ CRUD | ✅ CRUD 🔑 | ✏️ RU assigned | ➕ CR own | 📖 R own | `team_id` + assignments |
| `intervention_assignments` | ✅ CRUD | ✅ CRUD | 📖 R own | ❌ | ❌ | via `interventions` |
| `intervention_time_slots` | ✅ CRUD | ✅ CRUD | ➕ CR own | 📖 R own | 📖 R own | via `interventions` |
| `time_slot_responses` | ✅ CRUD | ✅ CRUD | ➕ CR own | ➕ CR own | ❌ | via `time_slots` |
| `intervention_quotes` | ✅ CRUD | ✅ CRUD 🔑 | ✅ CRUD own | 📖 R own | 📖 R own | via `interventions` |
| `intervention_comments` | ✅ CRUD | ✅ CRUD | ➕ CR own | ➕ CR own | 📖 R own | via `interventions` |
| `intervention_reports` | ✅ CRUD | ✅ CRUD | ✅ CRUD own | 📖 R own | 📖 R own | via `interventions` |
| `intervention_links` | ✅ CRUD | ✅ CRUD | 📖 R | ❌ | ❌ | via `interventions` |

#### Phase 3: Chat & Communication

| Table | Admin | Gestionnaire | Prestataire | Locataire | Propriétaire | Scope |
|-------|:-----:|:------------:|:-----------:|:---------:|:------------:|-------|
| `conversation_threads` | ✅ CRUD | ✅ CRUD | 📖 R participant | 📖 R participant | 📖 R participant | via `participants` |
| `conversation_messages` | ✅ CRUD | ✅ CRUD | ➕ CR own | ➕ CR own | ➕ CR own | via `threads` |
| `conversation_participants` | ✅ CRUD | ✅ CRUD | 📖 R own | 📖 R own | 📖 R own | via `threads` |

#### Phase 3: Notifications & Audit

| Table | Admin | Gestionnaire | Prestataire | Locataire | Propriétaire | Scope |
|-------|:-----:|:------------:|:-----------:|:---------:|:------------:|-------|
| `notifications` | ✅ CRUD | ✏️ RU own | ✏️ RU own | ✏️ RU own | ✏️ RU own | `user_id` |
| `activity_logs` | ✅ CRUD | 📖 R team | ❌ | ❌ | ❌ | `team_id` |
| `push_subscriptions` | ✅ CRUD | ✅ CRUD own | ✅ CRUD own | ✅ CRUD own | ✅ CRUD own | `user_id` |

#### Phase 3: Email System

| Table | Admin | Gestionnaire | Prestataire | Locataire | Propriétaire | Scope |
|-------|:-----:|:------------:|:-----------:|:---------:|:------------:|-------|
| `team_email_connections` | ✅ CRUD | ✅ CRUD 🔑 | ❌ | ❌ | ❌ | `team_id` |
| `emails` | ✅ CRUD | ✅ CRUD | 📖 R linked | 📖 R linked | 📖 R linked | via `connections` |
| `email_attachments` | ✅ CRUD | ✅ CRUD | 📖 R linked | 📖 R linked | 📖 R linked | via `emails` |
| `email_blacklist` | ✅ CRUD | ✅ CRUD | ❌ | ❌ | ❌ | `team_id` |

#### Phase 4: Contracts & Import

| Table | Admin | Gestionnaire | Prestataire | Locataire | Propriétaire | Scope |
|-------|:-----:|:------------:|:-----------:|:---------:|:------------:|-------|
| `contracts` | ✅ CRUD | ✅ CRUD 🔑 | ❌ | 📖 R own | 📖 R own | `team_id` |
| `import_jobs` | ✅ CRUD | ✅ CRUD | ❌ | ❌ | ❌ | `team_id` |

#### Centralized Documents

| Table | Admin | Gestionnaire | Prestataire | Locataire | Propriétaire | Scope |
|-------|:-----:|:------------:|:-----------:|:---------:|:------------:|-------|
| `documents` | ✅ CRUD | ✅ CRUD 🔑 | 📖 R via visibility | 📖 R via visibility | 📖 R via visibility | `team_id` + `entity_type` + `visibility_level` |

**Document Access Rules:**
- **Admin**: Full access to all documents
- **Gestionnaire**: CRUD on team documents (🔑 = audit creator)
- **Prestataire**: Read if `visibility_level IN ('prestataire', 'public')` OR assigned to intervention
- **Locataire**: Read if `visibility_level IN ('locataire', 'public')` OR linked to their lot/contract
- **Propriétaire**: Read if `visibility_level IN ('locataire', 'public')` OR linked to their property

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

  # Propriétaire (Property Owner) - Read access to their properties
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
│  │      🔧 OPERATIONAL           │    │      💰 BILLING               │     │
│  │      (17 permissions)         │    │      (5 permissions)          │     │
│  ├───────────────────────────────┤    ├───────────────────────────────┤     │
│  │                               │    │                               │     │
│  │  📍 Properties (4)            │    │  💳 Subscription              │     │
│  │  • properties.view            │    │  • billing.subscription_view  │     │
│  │  • properties.create          │    │  • billing.subscription_manage│     │
│  │  • properties.manage          │    │                               │     │
│  │  • properties.documents       │    │  🧾 Invoices                  │     │
│  │                               │    │  • billing.invoices_view      │     │
│  │  📋 Contracts (3)             │    │  • billing.invoices_download  │     │
│  │  • contracts.view             │    │                               │     │
│  │  • contracts.create           │    │  💳 Payment                   │     │
│  │  • contracts.manage           │    │  • billing.payment_method     │     │
│  │                               │    │                               │     │
│  │  🔨 Interventions (4)         │    └───────────────────────────────┘     │
│  │  • interventions.view         │                                          │
│  │  • interventions.create       │    ┌───────────────────────────────┐     │
│  │  • interventions.manage       │    │      ⚙️ TEAM                  │     │
│  │  • interventions.close        │    │      (6 permissions)          │     │
│  │                               │    ├───────────────────────────────┤     │
│  │  👥 Contacts (3)              │    │  • team.view                  │     │
│  │  • contacts.view              │    │  • team.manage                │     │
│  │  • contacts.create            │    │  • team.managers_invite ⚠️    │     │
│  │  • contacts.manage            │    │  • team.managers_manage ⚠️    │     │
│  │                               │    │  • team.members_invite        │     │
│  │  📊 Reports (3)               │    │  • team.members_manage        │     │
│  │  • reports.view               │    └───────────────────────────────┘     │
│  │  • reports.export             │                                          │
│  │  • reports.analytics          │                                          │
│  └───────────────────────────────┘                                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Key Principle: Separation of Concerns**

> 🔐 **Billing Admin** can manage subscription and view invoices without touching business data.
> 🔧 **Operational Admin** can manage all properties/interventions without access to payment information.

This separation enables:
- **Accountant**: access only to `billing.*` → manages invoices without seeing real estate data
- **Standard Manager**: access to `properties.*`, `contracts.*`, etc. → works without seeing payment data
- **Team Owner**: TOTAL access via `is_team_owner = TRUE` flag → automatic bypass

⚠️ **Privilege Escalation Protection**: `team.managers_*` permissions are HIGH RISK and reserved for Admin/Team Owner only by default. Standard gestionnaires cannot create other gestionnaires.

### 5.6.3 Permission Matrix by Role

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              SEIDO PERMISSION MATRIX                                     │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                          │
│  Permission              │ Admin │ Gestionnaire │ Prestataire │ Locataire │ Propriétaire│
│  ═══════════════════════╪═══════╪══════════════╪═════════════╪═══════════╪═════════════│
│                                                                                          │
│  TEAM                                                                                    │
│  ──────────────────────────────────────────────────────────────────────────────────────  │
│  team.view               │  ✅   │     ✅       │     ❌      │     ❌    │     ❌      │
│  team.manage             │  ✅   │     ✅       │     ❌      │     ❌    │     ❌      │
│  team.managers_invite    │  ✅   │     ⚙️       │     ❌      │     ❌    │     ❌      │
│  team.managers_manage    │  ✅   │     ⚙️       │     ❌      │     ❌    │     ❌      │
│  team.members_invite     │  ✅   │     ✅       │     ❌      │     ❌    │     ❌      │
│  team.members_manage     │  ✅   │     ✅       │     ❌      │     ❌    │     ❌      │
│                                                                                          │
│  PROPERTIES                                                                              │
│  ──────────────────────────────────────────────────────────────────────────────────────  │
│  properties.view         │  ✅   │     ✅       │     🔒      │     🔒    │     🔒      │
│  properties.create       │  ✅   │     ✅       │     ❌      │     ❌    │     ❌      │
│  properties.manage       │  ✅   │     ✅       │     ❌      │     ❌    │     ❌      │
│  properties.documents    │  ✅   │     ✅       │     ❌      │     ❌    │     ❌      │
│                                                                                          │
│  CONTRACTS                                                                               │
│  ──────────────────────────────────────────────────────────────────────────────────────  │
│  contracts.view          │  ✅   │     ✅       │     ❌      │     🔒    │     🔒      │
│  contracts.create        │  ✅   │     ✅       │     ❌      │     ❌    │     ❌      │
│  contracts.manage        │  ✅   │     ✅       │     ❌      │     ❌    │     ❌      │
│                                                                                          │
│  INTERVENTIONS                                                                           │
│  ──────────────────────────────────────────────────────────────────────────────────────  │
│  interventions.view      │  ✅   │     ✅       │     🔒      │     🔒    │     🔒      │
│  interventions.create    │  ✅   │     ✅       │     ❌      │     🔒    │     ❌      │
│  interventions.manage    │  ✅   │     ✅       │     ❌      │     ❌    │     ❌      │
│  interventions.close     │  ✅   │     ✅       │     ❌      │     ❌    │     ❌      │
│                                                                                          │
│  CONTACTS                                                                                │
│  ──────────────────────────────────────────────────────────────────────────────────────  │
│  contacts.view           │  ✅   │     ✅       │     ❌      │     🔒    │     🔒      │
│  contacts.create         │  ✅   │     ✅       │     ❌      │     ❌    │     ❌      │
│  contacts.manage         │  ✅   │     ✅       │     ❌      │     ❌    │     ❌      │
│                                                                                          │
│  REPORTS                                                                                 │
│  ──────────────────────────────────────────────────────────────────────────────────────  │
│  reports.view            │  ✅   │     ✅       │     ❌      │     ❌    │     ❌      │
│  reports.export          │  ✅   │     ✅       │     ❌      │     ❌    │     ❌      │
│  reports.analytics       │  ✅   │     ⚙️       │     ❌      │     ❌    │     ❌      │
│                                                                                          │
│  BILLING                                                                                 │
│  ──────────────────────────────────────────────────────────────────────────────────────  │
│  billing.subscription_*  │  ✅   │     ⚙️       │     ❌      │     ❌    │     ❌      │
│  billing.invoices_*      │  ✅   │     ✅       │     ❌      │     ❌    │     ❌      │
│  billing.payment_method  │  ✅   │     ⚙️       │     ❌      │     ❌    │     ❌      │
│                                                                                          │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│  LEGEND:                                                                                 │
│  ✅ = Full access (all records)                                                          │
│  🔒 = Scoped access (own records only via policy_scope)                                  │
│  ⚙️ = Configurable via team_members.permissions[] (team owner can grant/revoke)          │
│  ❌ = No access                                                                          │
│                                                                                          │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### 5.6.4 Action Permissions by Role (Intervention Workflow)

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                    INTERVENTION WORKFLOW PERMISSIONS BY ROLE                             │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                          │
│  Action                  │ Admin │ Gestionnaire │ Prestataire │ Locataire               │
│  ═══════════════════════╪═══════╪══════════════╪═════════════╪═════════════════════════│
│                                                                                          │
│  CREATE INTERVENTION                                                                     │
│  ──────────────────────────────────────────────────────────────────────────────────────  │
│  Create request          │  ✅   │     ✅       │     ❌      │  ✅ (own lot only)       │
│                                                                                          │
│  STATUS TRANSITIONS                                                                      │
│  ──────────────────────────────────────────────────────────────────────────────────────  │
│  demande → approuvee     │  ✅   │     ✅       │     ❌      │     ❌                   │
│  demande → rejetee       │  ✅   │     ✅       │     ❌      │     ❌                   │
│  approuvee → devis       │  ✅   │     ✅       │     ❌      │     ❌                   │
│  → planification         │  ✅   │     ✅       │     ✅      │     ❌                   │
│  → planifiee             │  ✅   │     ✅       │     ✅      │     ✅ (select slot)     │
│  → cloturee_prestataire  │  ✅   │     ❌       │     ✅      │     ❌                   │
│  → cloturee_locataire    │  ✅   │     ❌       │     ❌      │     ✅                   │
│  → cloturee_gestionnaire │  ✅   │     ✅       │     ❌      │     ❌                   │
│  ANY → annulee           │  ✅   │     ✅       │     ❌      │     ❌                   │
│                                                                                          │
│  QUOTES                                                                                  │
│  ──────────────────────────────────────────────────────────────────────────────────────  │
│  Create quote            │  ✅   │     ❌       │  ✅ (assigned)│     ❌                  │
│  View all quotes         │  ✅   │     ✅       │  ✅ (own only)│     ❌                  │
│  Approve/reject quote    │  ✅   │     ✅       │     ❌      │     ❌                   │
│                                                                                          │
│  TIME SLOTS                                                                              │
│  ──────────────────────────────────────────────────────────────────────────────────────  │
│  Propose time slot       │  ✅   │     ✅       │  ✅ (assigned)│     ❌                  │
│  Select time slot        │  ✅   │     ✅       │     ❌      │     ✅                   │
│                                                                                          │
│  CHAT                                                                                    │
│  ──────────────────────────────────────────────────────────────────────────────────────  │
│  Send message            │  ✅   │  ✅ (participant)│ ✅ (participant)│ ✅ (participant) │
│  View thread             │  ✅   │  ✅ (participant)│ ✅ (participant)│ ✅ (participant) │
│                                                                                          │
│  DOCUMENTS                                                                               │
│  ──────────────────────────────────────────────────────────────────────────────────────  │
│  Upload document         │  ✅   │     ✅       │  ✅ (assigned)│  ✅ (own intervention)  │
│  View documents          │  ✅   │     ✅       │  ✅ (assigned)│  🔒 (visibility='all')  │
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
# → Full billing access
# → NO access to properties/interventions/contacts (custom permissions override defaults)
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
# → Fallback to role_default_permissions for 'gestionnaire'
# → Full operational access (properties, interventions, contacts, contracts)
# → CAN invite prestataires, locataires, propriétaires (team.members_invite)
# → CANNOT create other gestionnaires (team.managers_invite = not granted)
# → NO billing access
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
# → Full operational access (via role defaults, since custom doesn't include properties.*)
# → Invoice viewing access (via explicit custom permissions)
# → NO subscription management
```

⚠️ **Note**: When `permissions[]` is set (non-NULL), it **REPLACES** defaults unless explicitly merged. For additive permissions, include all needed codes.

#### Profile 4: Team Owner

```ruby
# Thomas created the "Immo Paris" team
team_member = TeamMember.find_by(user: thomas, team: immo_paris)
# Configuration:
team_member.is_team_owner = true

# Result:
# → has_permission?(ANY_CODE, immo_paris) = TRUE (always)
# → TOTAL access (operational + billing + team)
# → Complete bypass, no permission checks needed
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
# → CAN invite gestionnaires (explicit team.managers_invite)
# → CAN manage gestionnaire permissions (explicit team.managers_manage)
# → Full operational access via role defaults (properties, interventions, etc.)
# → CAN also invite field members via defaults (team.members_invite)
# → NO billing access
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

# 6. State Machines (AASM)

SEIDO uses AASM (Acts As State Machine) to manage the complex intervention workflow and other status-based entities. This section details all state machines in the system.

---

## 6.1 Overview

### 6.1.1 Why AASM?

| Feature | Raw Enum | AASM |
|---------|---------|------|
| **Status tracking** | ✅ | ✅ |
| **Transition validation** | ❌ | ✅ |
| **Guards (conditions)** | ❌ | ✅ |
| **Callbacks** | ❌ | ✅ |
| **Event-driven** | ❌ | ✅ |
| **History** | ❌ | Possible |
| **Introspection** | ❌ | ✅ |

### 6.1.2 Installation

```ruby
# Gemfile
gem 'aasm'
```

### 6.1.3 Configuration

```ruby
# config/initializers/aasm.rb
AASM::Configuration.hide_warnings = Rails.env.production?
```

---

## 6.2 Intervention State Machine

The intervention state machine is the heart of SEIDO, managing the complete lifecycle from tenant request to final closure.

### 6.2.1 State Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           INTERVENTION STATE MACHINE                                     │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                          │
│                              ┌──────────┐                                               │
│                              │ demande  │ (Initial)                                     │
│                              │ 📝       │                                               │
│                              └────┬─────┘                                               │
│                                   │                                                     │
│               ┌───────────────────┼───────────────────┐                                 │
│               │                   │                   │                                 │
│               ▼                   ▼                   ▼                                 │
│        ┌──────────┐        ┌──────────┐        ┌─────────────────┐                      │
│        │ rejetee  │        │ approuvee│        │ demande_de_devis│                      │
│        │ ❌ (End) │        │ ✅       │        │ 💰              │                      │
│        └──────────┘        └────┬─────┘        └────────┬────────┘                      │
│                                 │                       │                               │
│                                 │     ┌─────────────────┘                               │
│                                 │     │                                                 │
│                                 ▼     ▼                                                 │
│                          ┌─────────────────┐                                            │
│                          │  planification  │                                            │
│                          │  📅             │                                            │
│                          └────────┬────────┘                                            │
│                                   │                                                     │
│                                   ▼                                                     │
│                          ┌─────────────────┐                                            │
│                          │   planifiee     │                                            │
│                          │   ✔️             │                                            │
│                          └────────┬────────┘                                            │
│                                   │                                                     │
│                                   ▼                                                     │
│                          ┌─────────────────┐                                            │
│                          │    en_cours     │ (Optional)                                 │
│                          │    🔧           │                                            │
│                          └────────┬────────┘                                            │
│                                   │                                                     │
│                                   ▼                                                     │
│                    ┌──────────────────────────────┐                                     │
│                    │  cloturee_par_prestataire    │                                     │
│                    │  🏁 Provider finished        │                                     │
│                    └──────────────┬───────────────┘                                     │
│                                   │                                                     │
│                                   ▼                                                     │
│                    ┌──────────────────────────────┐                                     │
│                    │  cloturee_par_locataire      │                                     │
│                    │  ✅ Tenant validated         │                                     │
│                    └──────────────┬───────────────┘                                     │
│                                   │                                                     │
│                                   ▼                                                     │
│                    ┌──────────────────────────────┐                                     │
│                    │  cloturee_par_gestionnaire   │                                     │
│                    │  ✅ Manager finalized (End)  │                                     │
│                    └──────────────────────────────┘                                     │
│                                                                                          │
│        ┌──────────┐                                                                     │
│        │ annulee  │  ◀──── Can be reached from ANY state (except End states)            │
│        │ 🚫 (End) │                                                                     │
│        └──────────┘                                                                     │
│                                                                                          │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### 6.2.2 Full Implementation

```ruby
# app/models/intervention.rb
class Intervention < ApplicationRecord
  include AASM
  include TeamScoped
  include Discard::Model

  # Associations
  belongs_to :team
  belongs_to :building, optional: true
  belongs_to :lot, optional: true
  belongs_to :creator, class_name: 'User', foreign_key: :created_by
  has_many :intervention_assignments, dependent: :destroy
  has_many :assigned_users, through: :intervention_assignments, source: :user
  has_many :intervention_quotes, dependent: :destroy
  has_many :intervention_time_slots, dependent: :destroy
  has_many :intervention_documents, dependent: :destroy
  has_many :intervention_comments, dependent: :destroy
  has_many :intervention_reports, dependent: :destroy
  has_one :conversation_thread, dependent: :destroy
  belongs_to :approved_quote, class_name: 'InterventionQuote', optional: true
  belongs_to :selected_time_slot, class_name: 'InterventionTimeSlot', optional: true

  # Validations
  validates :title, presence: true, length: { maximum: 255 }
  validates :description, presence: true
  validates :priority, presence: true
  validates :intervention_type, presence: true
  validate :lot_or_building_required

  # Enums
  enum :priority, {
    basse: 'basse',
    normale: 'normale',
    haute: 'haute',
    urgente: 'urgente'
  }, prefix: true

  enum :intervention_type, {
    plomberie: 'plomberie',
    electricite: 'electricite',
    chauffage: 'chauffage',
    serrurerie: 'serrurerie',
    menuiserie: 'menuiserie',
    peinture: 'peinture',
    nettoyage: 'nettoyage',
    jardinage: 'jardinage',
    autre: 'autre'
  }, prefix: true

  enum :access_type, {
    libre: 'libre',
    sur_rdv: 'sur_rdv',
    gardien: 'gardien',
    code: 'code',
    cle: 'cle'
  }, prefix: true

  # AASM State Machine
  aasm column: :status, enum: true, whiny_persistence: true do
    # ===== STATES =====
    state :demande, initial: true
    state :rejetee
    state :approuvee
    state :demande_de_devis
    state :planification
    state :planifiee
    state :en_cours
    state :cloturee_par_prestataire
    state :cloturee_par_locataire
    state :cloturee_par_gestionnaire
    state :annulee

    # ===== EVENTS =====

    # Manager approves the request
    event :approve, after: :after_approve do
      transitions from: :demande, to: :approuvee,
                  guard: :can_be_approved?,
                  after: :log_status_change
    end

    # Manager rejects the request
    event :reject, after: :after_reject do
      transitions from: :demande, to: :rejetee,
                  after: :log_status_change
    end

    # Manager requests quotes from providers
    event :request_quote, after: :after_request_quote do
      transitions from: :approuvee, to: :demande_de_devis,
                  guard: :has_assigned_providers?,
                  after: :log_status_change
    end

    # Manager accepts a quote and moves to planning
    event :accept_quote, after: :after_accept_quote do
      transitions from: :demande_de_devis, to: :planification,
                  guard: :has_approved_quote?,
                  after: :log_status_change
    end

    # Skip quote phase (direct work or internal provider)
    event :skip_quote, after: :after_skip_quote do
      transitions from: :approuvee, to: :planification,
                  after: :log_status_change
    end

    # Time slot is selected, intervention is scheduled
    event :schedule, after: :after_schedule do
      transitions from: :planification, to: :planifiee,
                  guard: :has_selected_time_slot?,
                  after: :log_status_change
    end

    # Provider starts working (optional state)
    event :start_work, after: :after_start_work do
      transitions from: :planifiee, to: :en_cours,
                  after: :log_status_change
    end

    # Provider marks work as complete
    event :close_by_provider, after: :after_close_by_provider do
      transitions from: [:planifiee, :en_cours], to: :cloturee_par_prestataire,
                  guard: :has_completion_report?,
                  after: :log_status_change
    end

    # Tenant validates the completed work
    event :close_by_tenant, after: :after_close_by_tenant do
      transitions from: :cloturee_par_prestataire, to: :cloturee_par_locataire,
                  after: :log_status_change
    end

    # Manager finalizes the intervention (final closure)
    event :close_by_manager, after: :after_close_by_manager do
      transitions from: [:cloturee_par_prestataire, :cloturee_par_locataire], to: :cloturee_par_gestionnaire,
                  guard: :can_be_finalized?,
                  after: :log_status_change
    end

    # Cancel intervention (from any non-terminal state)
    event :cancel, after: :after_cancel do
      transitions from: [:demande, :approuvee, :demande_de_devis, :planification, :planifiee, :en_cours],
                  to: :annulee,
                  after: :log_status_change
    end

    # Reopen a closed intervention (exceptional case)
    event :reopen, after: :after_reopen do
      transitions from: [:cloturee_par_prestataire, :cloturee_par_locataire],
                  to: :planifiee,
                  after: :log_status_change
    end
  end

  # ===== GUARD METHODS =====

  def can_be_approved?
    title.present? && description.present?
  end

  def has_assigned_providers?
    intervention_assignments.where(assignment_role: 'prestataire').exists?
  end

  def has_approved_quote?
    approved_quote_id.present?
  end

  def has_selected_time_slot?
    selected_time_slot_id.present?
  end

  def has_completion_report?
    # Allow closure without report for now, make configurable
    true
  end

  def can_be_finalized?
    # Manager must have reviewed
    true
  end

  # ===== CALLBACK METHODS =====

  def after_approve
    notify_tenant_approval
    create_conversation_thread
  end

  def after_reject
    notify_tenant_rejection
  end

  def after_request_quote
    notify_providers_quote_request
  end

  def after_accept_quote
    notify_provider_quote_accepted
    notify_tenant_quote_accepted
  end

  def after_skip_quote
    notify_provider_direct_assignment
  end

  def after_schedule
    notify_all_parties_scheduled
    schedule_reminder_notifications
  end

  def after_start_work
    notify_tenant_work_started
  end

  def after_close_by_provider
    notify_tenant_work_complete
    notify_manager_pending_validation
  end

  def after_close_by_tenant
    notify_manager_tenant_validated
  end

  def after_close_by_manager
    notify_all_parties_closure
    update_statistics
  end

  def after_cancel
    self.cancelled_at = Time.current
    save!
    notify_all_parties_cancellation
    release_time_slot
  end

  def after_reopen
    notify_all_parties_reopened
  end

  # ===== STATUS LOGGING =====

  def log_status_change
    ActivityLog.create!(
      team: team,
      user: Current.user,
      entity_type: 'intervention',
      entity_id: id,
      action: 'status_change',
      details: {
        from_status: aasm.from_state,
        to_status: aasm.to_state,
        event: aasm.current_event
      }
    )
  end

  # ===== HELPER METHODS =====

  def terminal_state?
    %w[rejetee cloturee_par_gestionnaire annulee].include?(status)
  end

  def active?
    !terminal_state?
  end

  def awaiting_tenant_response?
    planification? && time_slots_pending_response.any?
  end

  def awaiting_quote_response?
    demande_de_devis? && pending_quotes.any?
  end

  def time_slots_pending_response
    intervention_time_slots.where(is_selected: false)
  end

  def pending_quotes
    intervention_quotes.where(status: 'en_attente')
  end

  def primary_provider
    intervention_assignments.find_by(assignment_role: 'prestataire', is_primary: true)&.user
  end

  private

  def lot_or_building_required
    unless lot_id.present? || building_id.present?
      errors.add(:base, 'Either lot or building must be specified')
    end
  end

  def notify_tenant_approval
    Interventions::Notifiers::ApprovalNotifier.call(self)
  end

  def notify_tenant_rejection
    Interventions::Notifiers::RejectionNotifier.call(self, rejection_reason)
  end

  def notify_providers_quote_request
    intervention_assignments.prestataire.each do |assignment|
      Interventions::Notifiers::QuoteRequestNotifier.call(self, assignment.user)
    end
  end

  def notify_provider_quote_accepted
    Interventions::Notifiers::QuoteAcceptedNotifier.call(self, approved_quote.provider)
  end

  def notify_tenant_quote_accepted
    Interventions::Notifiers::QuoteAcceptedTenantNotifier.call(self)
  end

  def notify_provider_direct_assignment
    Interventions::Notifiers::DirectAssignmentNotifier.call(self)
  end

  def notify_all_parties_scheduled
    Interventions::Notifiers::ScheduledNotifier.call(self)
  end

  def schedule_reminder_notifications
    return unless selected_time_slot&.slot_start

    # Schedule 24h reminder
    ReminderNotificationJob.set(
      wait_until: selected_time_slot.slot_start - 24.hours
    ).perform_later(id, '24h')

    # Schedule 1h reminder
    ReminderNotificationJob.set(
      wait_until: selected_time_slot.slot_start - 1.hour
    ).perform_later(id, '1h')
  end

  def notify_tenant_work_started
    Interventions::Notifiers::WorkStartedNotifier.call(self)
  end

  def notify_tenant_work_complete
    Interventions::Notifiers::WorkCompleteNotifier.call(self)
  end

  def notify_manager_pending_validation
    Interventions::Notifiers::PendingValidationNotifier.call(self)
  end

  def notify_manager_tenant_validated
    Interventions::Notifiers::TenantValidatedNotifier.call(self)
  end

  def notify_all_parties_closure
    Interventions::Notifiers::ClosureNotifier.call(self)
  end

  def notify_all_parties_cancellation
    Interventions::Notifiers::CancellationNotifier.call(self)
  end

  def notify_all_parties_reopened
    Interventions::Notifiers::ReopenedNotifier.call(self)
  end

  def release_time_slot
    return unless selected_time_slot
    selected_time_slot.update!(is_selected: false)
    self.selected_time_slot = nil
  end

  def update_statistics
    Stats::InterventionStatsUpdater.call(self)
  end

  def create_conversation_thread
    return if conversation_thread.present?

    ConversationThread.create!(
      intervention: self,
      team: team,
      created_by: Current.user&.id || created_by
    )
  end
end
```

### 6.2.3 Status Transitions Summary

| From | Event | To | Who | Guard |
|------|-------|-----|-----|-------|
| `demande` | `approve` | `approuvee` | Manager | `can_be_approved?` |
| `demande` | `reject` | `rejetee` | Manager | - |
| `approuvee` | `request_quote` | `demande_de_devis` | Manager | `has_assigned_providers?` |
| `approuvee` | `skip_quote` | `planification` | Manager | - |
| `demande_de_devis` | `accept_quote` | `planification` | Manager | `has_approved_quote?` |
| `planification` | `schedule` | `planifiee` | System/Tenant | `has_selected_time_slot?` |
| `planifiee` | `start_work` | `en_cours` | Provider | - |
| `planifiee`, `en_cours` | `close_by_provider` | `cloturee_par_prestataire` | Provider | `has_completion_report?` |
| `cloturee_par_prestataire` | `close_by_tenant` | `cloturee_par_locataire` | Tenant | - |
| `cloturee_*` | `close_by_manager` | `cloturee_par_gestionnaire` | Manager | `can_be_finalized?` |
| `!terminal` | `cancel` | `annulee` | Manager | - |
| `cloturee_par_*` | `reopen` | `planifiee` | Manager | - |

---

## 6.3 Intervention Quote State Machine

```ruby
# app/models/intervention_quote.rb
class InterventionQuote < ApplicationRecord
  include AASM

  belongs_to :intervention
  belongs_to :provider, class_name: 'User'

  validates :amount, presence: true, numericality: { greater_than: 0 }
  validates :description, presence: true
  validates :valid_until, presence: true

  enum :quote_type, {
    devis_simple: 'devis_simple',
    devis_detaille: 'devis_detaille',
    forfait: 'forfait'
  }, prefix: true

  aasm column: :status, enum: true do
    state :en_attente, initial: true
    state :accepte
    state :refuse
    state :expire
    state :annule

    event :accept, after: :after_accept do
      transitions from: :en_attente, to: :accepte,
                  guard: :still_valid?,
                  after: :reject_other_quotes
    end

    event :reject, after: :after_reject do
      transitions from: :en_attente, to: :refuse
    end

    event :expire do
      transitions from: :en_attente, to: :expire
    end

    event :cancel do
      transitions from: :en_attente, to: :annule
    end
  end

  # Scopes
  scope :pending, -> { where(status: 'en_attente') }
  scope :valid, -> { where('valid_until >= ?', Date.current) }
  scope :expired, -> { where('valid_until < ? AND status = ?', Date.current, 'en_attente') }

  def still_valid?
    valid_until >= Date.current
  end

  private

  def after_accept
    intervention.update!(approved_quote: self)
    intervention.accept_quote! if intervention.may_accept_quote?
    notify_provider_accepted
  end

  def after_reject
    notify_provider_rejected
  end

  def reject_other_quotes
    intervention.intervention_quotes
                .where.not(id: id)
                .pending
                .find_each(&:reject!)
  end

  def notify_provider_accepted
    Quotes::AcceptedNotifier.call(self)
  end

  def notify_provider_rejected
    Quotes::RejectedNotifier.call(self)
  end
end
```

---

## 6.4 Intervention Time Slot State Machine

```ruby
# app/models/intervention_time_slot.rb
class InterventionTimeSlot < ApplicationRecord
  include AASM

  belongs_to :intervention
  belongs_to :proposer, class_name: 'User', foreign_key: :proposed_by

  validates :slot_start, presence: true
  validates :slot_end, presence: true
  validate :end_after_start
  validate :not_in_past

  aasm column: :slot_status, enum: true do
    state :proposed, initial: true
    state :accepted
    state :rejected
    state :cancelled

    event :accept, after: :after_accept do
      transitions from: :proposed, to: :accepted,
                  guard: :can_be_accepted?
    end

    event :reject, after: :after_reject do
      transitions from: :proposed, to: :rejected
    end

    event :cancel do
      transitions from: [:proposed, :accepted], to: :cancelled
    end
  end

  scope :upcoming, -> { where('slot_start > ?', Time.current) }
  scope :for_intervention, ->(intervention_id) { where(intervention_id: intervention_id) }

  def can_be_accepted?
    slot_start > Time.current && !intervention.intervention_time_slots.accepted.exists?
  end

  def duration_minutes
    ((slot_end - slot_start) / 60).to_i
  end

  private

  def after_accept
    update!(is_selected: true)
    intervention.update!(selected_time_slot: self)
    reject_other_slots
    intervention.schedule! if intervention.may_schedule?
    notify_parties_slot_selected
  end

  def after_reject
    notify_proposer_rejection
  end

  def reject_other_slots
    intervention.intervention_time_slots
                .where.not(id: id)
                .proposed
                .find_each(&:reject!)
  end

  def notify_parties_slot_selected
    TimeSlots::SelectedNotifier.call(self)
  end

  def notify_proposer_rejection
    TimeSlots::RejectedNotifier.call(self)
  end

  def end_after_start
    return unless slot_start && slot_end
    if slot_end <= slot_start
      errors.add(:slot_end, 'must be after slot start')
    end
  end

  def not_in_past
    return unless slot_start
    if slot_start < Time.current
      errors.add(:slot_start, 'cannot be in the past')
    end
  end
end
```

---

## 6.5 User Invitation State Machine

```ruby
# app/models/user_invitation.rb
class UserInvitation < ApplicationRecord
  include AASM

  belongs_to :team
  belongs_to :inviter, class_name: 'User', foreign_key: :invited_by
  belongs_to :accepted_user, class_name: 'User', optional: true

  validates :email, presence: true, format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :role, presence: true
  validates :token, presence: true, uniqueness: true

  before_validation :generate_token, on: :create
  before_validation :set_expiration, on: :create

  enum :role, {
    gestionnaire: 'gestionnaire',
    prestataire: 'prestataire',
    locataire: 'locataire'
  }, prefix: true

  aasm column: :status, enum: true do
    state :pending, initial: true
    state :accepted
    state :declined
    state :expired
    state :cancelled

    event :accept, after: :after_accept do
      transitions from: :pending, to: :accepted,
                  guard: :not_expired?
    end

    event :decline, after: :after_decline do
      transitions from: :pending, to: :declined
    end

    event :expire do
      transitions from: :pending, to: :expired
    end

    event :cancel do
      transitions from: :pending, to: :cancelled
    end

    event :resend, after: :after_resend do
      transitions from: [:expired, :cancelled], to: :pending
    end
  end

  scope :active, -> { where(status: 'pending').where('expires_at > ?', Time.current) }
  scope :for_email, ->(email) { where(email: email.downcase) }

  def not_expired?
    expires_at > Time.current
  end

  def days_until_expiry
    return 0 unless not_expired?
    ((expires_at - Time.current) / 1.day).ceil
  end

  private

  def after_accept
    self.accepted_at = Time.current
    save!
    create_team_membership
    notify_inviter_accepted
  end

  def after_decline
    notify_inviter_declined
  end

  def after_resend
    self.expires_at = 7.days.from_now
    self.token = SecureRandom.urlsafe_base64(32)
    save!
    send_invitation_email
  end

  def generate_token
    self.token ||= SecureRandom.urlsafe_base64(32)
  end

  def set_expiration
    self.expires_at ||= 7.days.from_now
  end

  def create_team_membership
    TeamMember.create!(
      team: team,
      user: accepted_user,
      role: role,
      permissions: default_permissions_for_role
    )
  end

  def default_permissions_for_role
    # Return nil to use role defaults
    nil
  end

  def send_invitation_email
    InvitationMailer.invitation_email(self).deliver_later
  end

  def notify_inviter_accepted
    Invitations::AcceptedNotifier.call(self)
  end

  def notify_inviter_declined
    Invitations::DeclinedNotifier.call(self)
  end
end
```

---

## 6.6 Contract Status (Calculated, Not AASM)

Contracts don't use AASM because their status is derived from dates:

```ruby
# app/models/contract.rb
class Contract < ApplicationRecord
  include TeamScoped
  include Discard::Model

  belongs_to :team
  belongs_to :lot
  has_many :contract_contacts, dependent: :destroy
  has_many :contacts, through: :contract_contacts
  has_many :contract_documents, dependent: :destroy

  validates :lot_id, presence: true
  validates :start_date, presence: true
  validates :monthly_rent, numericality: { greater_than_or_equal_to: 0 }, allow_nil: true
  validate :end_date_after_start_date

  enum :contract_type, {
    bail_habitation: 'bail_habitation',
    bail_commercial: 'bail_commercial',
    bail_professionnel: 'bail_professionnel',
    bail_meuble: 'bail_meuble',
    bail_etudiant: 'bail_etudiant',
    bail_mobilite: 'bail_mobilite'
  }, prefix: true

  # Scopes
  scope :active, -> { where(terminated_at: nil).where('start_date <= ? AND (end_date IS NULL OR end_date >= ?)', Date.current, Date.current) }
  scope :upcoming, -> { where('start_date > ?', Date.current) }
  scope :expired, -> { where('end_date < ? AND terminated_at IS NULL', Date.current) }
  scope :terminated, -> { where.not(terminated_at: nil) }
  scope :expiring_soon, ->(days = 30) { where('end_date BETWEEN ? AND ?', Date.current, days.days.from_now) }

  # Calculated status (not stored)
  def status
    return 'resilie' if terminated_at.present?
    return 'a_venir' if start_date > Date.current
    return 'expire' if end_date.present? && end_date < Date.current
    return 'renouvellement' if end_date.present? && end_date <= 3.months.from_now
    'actif'
  end

  def status_label
    {
      'actif' => 'Active',
      'a_venir' => 'Upcoming',
      'expire' => 'Expired',
      'resilie' => 'Terminated',
      'renouvellement' => 'Renewal Due'
    }[status]
  end

  def active?
    status == 'actif'
  end

  def days_until_expiry
    return nil unless end_date
    (end_date - Date.current).to_i
  end

  def terminate!(reason: nil, terminated_by: nil)
    update!(
      terminated_at: Time.current,
      termination_reason: reason,
      terminated_by: terminated_by&.id
    )
    notify_termination
  end

  def renew!(new_end_date:, new_rent: nil)
    update!(
      end_date: new_end_date,
      monthly_rent: new_rent || monthly_rent,
      renewed_at: Time.current
    )
    log_renewal
  end

  private

  def end_date_after_start_date
    return unless start_date && end_date
    if end_date < start_date
      errors.add(:end_date, 'must be after start date')
    end
  end

  def notify_termination
    Contracts::TerminationNotifier.call(self)
  end

  def log_renewal
    ActivityLog.create!(
      team: team,
      user: Current.user,
      entity_type: 'contract',
      entity_id: id,
      action: 'renewal',
      details: { new_end_date: end_date, new_rent: monthly_rent }
    )
  end
end
```

---

## 6.7 Subscription State Machine (Stripe)

### 6.7.1 State Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       SUBSCRIPTION LIFECYCLE                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌────────────────┐                                                         │
│  │   INCOMPLETE   │ ◀─── Initial payment fails                              │
│  │  (setup_intent │                                                         │
│  │   pending)     │                                                         │
│  └───────┬────────┘                                                         │
│          │                                                                  │
│          │ payment_succeeds         ┌──────────────────┐                    │
│          │                          │ INCOMPLETE_EXPIRED│ ◀── 23h timeout   │
│          ▼                          │     (END)        │                    │
│  ┌────────────────┐                 └──────────────────┘                    │
│  │   TRIALING     │ ◀─── Trial period active                                │
│  │  (14-30 days)  │                                                         │
│  └───────┬────────┘                                                         │
│          │                                                                  │
│          │ trial_ends / payment_succeeds                                    │
│          ▼                                                                  │
│  ┌────────────────┐     payment_fails      ┌────────────────┐               │
│  │    ACTIVE      │ ───────────────────▶   │   PAST_DUE     │               │
│  │  (in good      │                        │  (grace period │               │
│  │   standing)    │ ◀───────────────────── │   1-7 days)    │               │
│  └───────┬────────┘     payment_succeeds   └───────┬────────┘               │
│          │                                         │                        │
│          │                                         │ 7 days no payment      │
│          │ pause                                   ▼                        │
│          ▼                                 ┌────────────────┐               │
│  ┌────────────────┐                        │     UNPAID     │               │
│  │    PAUSED      │                        │  (restricted   │               │
│  │  (temporary    │                        │   access)      │               │
│  │   halt)        │                        └───────┬────────┘               │
│  └───────┬────────┘                                │                        │
│          │                                         │                        │
│          │ resume                                  │                        │
│          │         ┌───────────────────────────────┘                        │
│          ▼         ▼                                                        │
│  ┌────────────────────┐                                                     │
│  │     CANCELLED      │ ◀─── From ANY billable state                        │
│  │      (END)         │      (active, trialing, past_due, paused)          │
│  └────────────────────┘                                                     │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════   │
│  Legend:                                                                    │
│  ├─ Green states: Full feature access (trialing, active)                   │
│  ├─ Yellow states: Degraded access (past_due, paused)                       │
│  └─ Red states: No access (unpaid, cancelled, incomplete_expired)          │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.7.2 Stripe Status Mapping

| Stripe Status | Rails Status | Feature Access | User Action Required |
|---------------|--------------|----------------|---------------------|
| `trialing` | `:trialing` | ✅ Full | None |
| `active` | `:active` | ✅ Full | None |
| `past_due` | `:past_due` | ⚠️ Full (grace) | Update payment method |
| `unpaid` | `:unpaid` | ❌ Read-only | Pay invoice or cancel |
| `canceled` | `:cancelled` | ❌ None | Resubscribe |
| `incomplete` | `:incomplete` | ❌ None | Complete payment |
| `incomplete_expired` | `:incomplete_expired` | ❌ None | Resubscribe |
| `paused` | `:paused` | ⚠️ Read-only | Resume subscription |

### 6.7.3 Full Implementation

```ruby
# app/models/subscription.rb
class Subscription < ApplicationRecord
  include AASM
  include Discard::Model

  # ═══════════════════════════════════════════════════════════════════════════
  # Associations
  # ═══════════════════════════════════════════════════════════════════════════

  belongs_to :team
  belongs_to :stripe_customer, optional: true
  has_many :stripe_invoices, dependent: :destroy
  has_one :stripe_price, through: :stripe_customer

  # ═══════════════════════════════════════════════════════════════════════════
  # Validations
  # ═══════════════════════════════════════════════════════════════════════════

  validates :stripe_subscription_id, presence: true, uniqueness: true
  validates :plan_id, presence: true
  validates :billing_cycle, presence: true, inclusion: { in: %w[monthly annual] }
  validates :team, uniqueness: { conditions: -> { where(discarded_at: nil) },
                                  message: 'already has an active subscription' }

  # ═══════════════════════════════════════════════════════════════════════════
  # Enums
  # ═══════════════════════════════════════════════════════════════════════════

  enum :billing_cycle, {
    monthly: 'monthly',
    annual: 'annual'
  }, prefix: true

  enum :plan_type, {
    starter: 'starter',       # Up to 5 buildings
    professional: 'professional', # Up to 20 buildings
    enterprise: 'enterprise'  # Unlimited
  }, prefix: true

  # ═══════════════════════════════════════════════════════════════════════════
  # Scopes
  # ═══════════════════════════════════════════════════════════════════════════

  scope :active_or_trialing, -> { where(status: [:active, :trialing]) }
  scope :needs_attention, -> { where(status: [:past_due, :incomplete]) }
  scope :billable, -> { where(status: [:active, :trialing, :past_due, :paused]) }
  scope :churned, -> { where(status: [:cancelled, :unpaid]) }
  scope :expiring_trials, ->(days = 3) {
    where(status: :trialing)
      .where('trial_end_at <= ?', days.days.from_now)
      .where('trial_end_at > ?', Time.current)
  }
  scope :by_plan, ->(plan) { where(plan_type: plan) }
  scope :by_billing_cycle, ->(cycle) { where(billing_cycle: cycle) }
  scope :mrr_contributors, -> { active_or_trialing.kept }

  # ═══════════════════════════════════════════════════════════════════════════
  # AASM State Machine
  # ═══════════════════════════════════════════════════════════════════════════

  aasm column: :status, enum: true, whiny_transitions: false do
    state :incomplete, initial: true
    state :trialing
    state :active
    state :past_due
    state :unpaid
    state :cancelled
    state :incomplete_expired
    state :paused

    # ─────────────────────────────────────────────────────────────────────────
    # Activation Events
    # ─────────────────────────────────────────────────────────────────────────

    event :start_trial, after: :after_trial_started do
      transitions from: :incomplete, to: :trialing,
                  guard: :has_valid_trial_period?
    end

    event :activate, after: :after_activated do
      transitions from: [:incomplete, :trialing], to: :active,
                  guard: :has_valid_payment_method?
      transitions from: :past_due, to: :active  # Payment succeeded
      transitions from: :paused, to: :active    # Resumed
    end

    # ─────────────────────────────────────────────────────────────────────────
    # Payment Events
    # ─────────────────────────────────────────────────────────────────────────

    event :payment_failed, after: :after_payment_failed do
      transitions from: :active, to: :past_due
      transitions from: :trialing, to: :incomplete  # Trial payment setup failed
    end

    event :payment_succeeded, after: :after_payment_succeeded do
      transitions from: :past_due, to: :active
      transitions from: :incomplete, to: :trialing,
                  guard: :has_valid_trial_period?
      transitions from: :incomplete, to: :active
    end

    event :mark_unpaid, after: :after_marked_unpaid do
      transitions from: :past_due, to: :unpaid,
                  guard: :past_due_exceeded?
    end

    # ─────────────────────────────────────────────────────────────────────────
    # Lifecycle Events
    # ─────────────────────────────────────────────────────────────────────────

    event :pause, after: :after_paused do
      transitions from: :active, to: :paused,
                  guard: :pause_allowed?
    end

    event :resume, after: :after_resumed do
      transitions from: :paused, to: :active,
                  guard: :has_valid_payment_method?
    end

    event :cancel, after: :after_cancelled do
      transitions from: [:trialing, :active, :past_due, :paused], to: :cancelled
    end

    event :expire_incomplete, after: :after_incomplete_expired do
      transitions from: :incomplete, to: :incomplete_expired
    end

    # ─────────────────────────────────────────────────────────────────────────
    # Reactivation Events
    # ─────────────────────────────────────────────────────────────────────────

    event :reactivate, after: :after_reactivated do
      transitions from: [:cancelled, :incomplete_expired], to: :active,
                  guard: :can_reactivate?
    end
  end

  # ═══════════════════════════════════════════════════════════════════════════
  # Guard Methods
  # ═══════════════════════════════════════════════════════════════════════════

  def has_valid_trial_period?
    trial_end_at.present? && trial_end_at > Time.current
  end

  def has_valid_payment_method?
    stripe_customer&.default_payment_method_id.present?
  end

  def past_due_exceeded?
    past_due_since.present? && past_due_since < 7.days.ago
  end

  def pause_allowed?
    pause_count.to_i < max_pauses_per_year &&
      last_pause_at.nil? || last_pause_at < 30.days.ago
  end

  def can_reactivate?
    cancelled_at.nil? || cancelled_at > 90.days.ago
  end

  # ═══════════════════════════════════════════════════════════════════════════
  # Callback Methods (AASM after hooks)
  # ═══════════════════════════════════════════════════════════════════════════

  def after_trial_started
    update!(trial_started_at: Time.current)
    log_activity('subscription_trial_started')
    SubscriptionMailer.trial_started(self).deliver_later
    schedule_trial_reminder
  end

  def after_activated
    update!(
      activated_at: Time.current,
      past_due_since: nil
    )
    log_activity('subscription_activated')
    SubscriptionMailer.subscription_activated(self).deliver_later
    unlock_team_features!
  end

  def after_payment_failed
    update!(
      past_due_since: past_due_since || Time.current,
      last_payment_failure_at: Time.current,
      payment_failure_count: payment_failure_count.to_i + 1
    )
    log_activity('subscription_payment_failed')
    SubscriptionMailer.payment_failed(self).deliver_later
    schedule_payment_retry_reminder
  end

  def after_payment_succeeded
    update!(
      past_due_since: nil,
      last_payment_at: Time.current,
      payment_failure_count: 0
    )
    log_activity('subscription_payment_succeeded')
    SubscriptionMailer.payment_succeeded(self).deliver_later
  end

  def after_marked_unpaid
    log_activity('subscription_marked_unpaid')
    SubscriptionMailer.subscription_unpaid(self).deliver_later
    restrict_team_features!
  end

  def after_paused
    update!(
      paused_at: Time.current,
      last_pause_at: Time.current,
      pause_count: pause_count.to_i + 1
    )
    log_activity('subscription_paused')
    SubscriptionMailer.subscription_paused(self).deliver_later
  end

  def after_resumed
    update!(
      paused_at: nil,
      resumed_at: Time.current
    )
    log_activity('subscription_resumed')
    SubscriptionMailer.subscription_resumed(self).deliver_later
    unlock_team_features!
  end

  def after_cancelled
    update!(cancelled_at: Time.current)
    log_activity('subscription_cancelled')
    cancel_on_stripe!
    SubscriptionMailer.subscription_cancelled(self).deliver_later
    schedule_churned_survey
    restrict_team_features!
  end

  def after_incomplete_expired
    log_activity('subscription_incomplete_expired')
    SubscriptionMailer.subscription_expired(self).deliver_later
  end

  def after_reactivated
    update!(
      cancelled_at: nil,
      reactivated_at: Time.current
    )
    log_activity('subscription_reactivated')
    SubscriptionMailer.subscription_reactivated(self).deliver_later
    unlock_team_features!
  end

  # ═══════════════════════════════════════════════════════════════════════════
  # Helper Methods
  # ═══════════════════════════════════════════════════════════════════════════

  def trial_days_remaining
    return 0 unless trialing? && trial_end_at
    [(trial_end_at - Time.current) / 1.day, 0].max.ceil
  end

  def days_until_renewal
    return nil unless current_period_end
    [(current_period_end - Time.current) / 1.day, 0].max.ceil
  end

  def past_due_days
    return 0 unless past_due_since
    ((Time.current - past_due_since) / 1.day).ceil
  end

  def can_use_features?
    %w[trialing active].include?(status) ||
      (past_due? && past_due_days <= 7)
  end

  def read_only_access?
    %w[past_due paused unpaid].include?(status) && !can_use_features?
  end

  def no_access?
    %w[cancelled incomplete_expired].include?(status)
  end

  def max_buildings
    case plan_type
    when 'starter' then 5
    when 'professional' then 20
    when 'enterprise' then Float::INFINITY
    else 0
    end
  end

  def max_team_members
    case plan_type
    when 'starter' then 3
    when 'professional' then 10
    when 'enterprise' then Float::INFINITY
    else 0
    end
  end

  def monthly_price_cents
    case [plan_type, billing_cycle]
    when ['starter', 'monthly'] then 2900
    when ['starter', 'annual'] then 2400      # 17% discount
    when ['professional', 'monthly'] then 7900
    when ['professional', 'annual'] then 6500  # 18% discount
    when ['enterprise', 'monthly'] then 19900
    when ['enterprise', 'annual'] then 16500   # 17% discount
    else 0
    end
  end

  def annual_price_cents
    monthly_price_cents * 12
  end

  # ═══════════════════════════════════════════════════════════════════════════
  # Stripe Synchronization
  # ═══════════════════════════════════════════════════════════════════════════

  def sync_from_stripe!(stripe_subscription)
    target_status = map_stripe_status(stripe_subscription.status)

    # Use AASM events when possible for proper callbacks
    transition_to_status!(target_status)

    update!(
      current_period_start: Time.at(stripe_subscription.current_period_start),
      current_period_end: Time.at(stripe_subscription.current_period_end),
      cancel_at_period_end: stripe_subscription.cancel_at_period_end,
      cancelled_at: stripe_subscription.canceled_at ? Time.at(stripe_subscription.canceled_at) : nil,
      trial_end_at: stripe_subscription.trial_end ? Time.at(stripe_subscription.trial_end) : nil,
      quantity: stripe_subscription.quantity
    )
  end

  def cancel_on_stripe!
    return unless stripe_subscription_id.present?

    Stripe::Subscription.update(
      stripe_subscription_id,
      cancel_at_period_end: true
    )
  rescue Stripe::InvalidRequestError => e
    Rails.logger.error("Failed to cancel Stripe subscription: #{e.message}")
  end

  # ═══════════════════════════════════════════════════════════════════════════
  # Class Methods
  # ═══════════════════════════════════════════════════════════════════════════

  class << self
    def mrr_cents
      mrr_contributors.sum do |sub|
        case sub.billing_cycle
        when 'monthly' then sub.monthly_price_cents
        when 'annual' then (sub.annual_price_cents / 12.0).ceil
        else 0
        end
      end
    end

    def arr_cents
      mrr_cents * 12
    end

    def churn_rate(period = 30.days)
      start_active = where(status: [:active, :trialing])
                      .where('activated_at < ?', period.ago)
                      .count
      return 0 if start_active.zero?

      churned = where(status: [:cancelled, :unpaid])
                 .where('cancelled_at >= ?', period.ago)
                 .count

      (churned.to_f / start_active * 100).round(2)
    end

    def trial_to_paid_conversion_rate(period = 90.days)
      total_trials = where('trial_started_at >= ?', period.ago).count
      return 0 if total_trials.zero?

      converted = where(status: :active)
                   .where('trial_started_at >= ?', period.ago)
                   .where.not(activated_at: nil)
                   .count

      (converted.to_f / total_trials * 100).round(2)
    end
  end

  private

  def transition_to_status!(target_status)
    return if status == target_status

    case target_status
    when 'trialing' then start_trial! if may_start_trial?
    when 'active' then activate! if may_activate?
    when 'past_due' then payment_failed! if may_payment_failed?
    when 'unpaid' then mark_unpaid! if may_mark_unpaid?
    when 'cancelled' then cancel! if may_cancel?
    when 'paused' then pause! if may_pause?
    when 'incomplete_expired' then expire_incomplete! if may_expire_incomplete?
    end
  end

  def map_stripe_status(stripe_status)
    {
      'trialing' => 'trialing',
      'active' => 'active',
      'past_due' => 'past_due',
      'unpaid' => 'unpaid',
      'canceled' => 'cancelled',
      'incomplete' => 'incomplete',
      'incomplete_expired' => 'incomplete_expired',
      'paused' => 'paused'
    }[stripe_status] || 'incomplete'
  end

  def log_activity(action)
    ActivityLog.create!(
      team: team,
      user: team.owner,
      action: action,
      resource_type: 'Subscription',
      resource_id: id,
      metadata: {
        plan_type: plan_type,
        billing_cycle: billing_cycle,
        status: status,
        previous_status: aasm.from_state
      }
    )
  end

  def schedule_trial_reminder
    TrialReminderJob.set(wait_until: trial_end_at - 3.days).perform_later(id)
  end

  def schedule_payment_retry_reminder
    PaymentRetryReminderJob.set(wait: 24.hours).perform_later(id)
  end

  def schedule_churned_survey
    ChurnedSurveyJob.set(wait: 24.hours).perform_later(id)
  end

  def unlock_team_features!
    team.update!(features_locked: false)
  end

  def restrict_team_features!
    team.update!(features_locked: true)
  end

  def max_pauses_per_year
    2
  end
end
```

### 6.7.4 Subscription Migration

```ruby
# db/migrate/YYYYMMDDHHMMSS_create_subscriptions.rb
class CreateSubscriptions < ActiveRecord::Migration[7.1]
  def change
    create_table :subscriptions, id: :uuid do |t|
      t.references :team, null: false, foreign_key: true, type: :uuid, index: { unique: true, where: 'discarded_at IS NULL' }
      t.references :stripe_customer, foreign_key: true, type: :uuid

      # Stripe identifiers
      t.string :stripe_subscription_id, null: false, index: { unique: true }
      t.string :stripe_price_id
      t.string :plan_id, null: false

      # Plan details
      t.string :plan_type, default: 'starter'  # starter, professional, enterprise
      t.string :billing_cycle, default: 'monthly'  # monthly, annual
      t.integer :quantity, default: 1

      # Status (AASM)
      t.string :status, default: 'incomplete', null: false, index: true

      # Period tracking
      t.datetime :current_period_start
      t.datetime :current_period_end
      t.datetime :trial_started_at
      t.datetime :trial_end_at

      # Lifecycle timestamps
      t.datetime :activated_at
      t.datetime :cancelled_at
      t.datetime :paused_at
      t.datetime :resumed_at
      t.datetime :reactivated_at
      t.boolean :cancel_at_period_end, default: false

      # Payment tracking
      t.datetime :last_payment_at
      t.datetime :last_payment_failure_at
      t.datetime :past_due_since
      t.integer :payment_failure_count, default: 0

      # Pause tracking
      t.datetime :last_pause_at
      t.integer :pause_count, default: 0

      # Soft delete
      t.datetime :discarded_at, index: true

      t.timestamps
    end

    # Performance indexes
    add_index :subscriptions, :plan_type
    add_index :subscriptions, :billing_cycle
    add_index :subscriptions, [:status, :current_period_end], name: 'idx_subscriptions_renewals'
    add_index :subscriptions, [:status, :trial_end_at], name: 'idx_subscriptions_expiring_trials'
    add_index :subscriptions, :cancel_at_period_end, where: 'cancel_at_period_end = true'
  end
end
```

### 6.7.5 Subscription Webhook Events

| Stripe Event | Rails Action | Description |
|--------------|--------------|-------------|
| `customer.subscription.created` | `Subscription.create!` | New subscription from checkout |
| `customer.subscription.updated` | `sync_from_stripe!` | Status, period, quantity changes |
| `customer.subscription.deleted` | `cancel!` | Subscription ended |
| `customer.subscription.trial_will_end` | Send reminder | 3 days before trial ends |
| `customer.subscription.paused` | `pause!` | Subscription paused (if enabled) |
| `customer.subscription.resumed` | `resume!` | Subscription resumed |
| `invoice.payment_succeeded` | `payment_succeeded!` | Successful payment |
| `invoice.payment_failed` | `payment_failed!` | Failed payment attempt |
| `invoice.upcoming` | Send reminder | Upcoming invoice notification |

### 6.7.6 Testing Subscriptions

```ruby
# spec/models/subscription_spec.rb
require 'rails_helper'

RSpec.describe Subscription, type: :model do
  let(:team) { create(:team) }
  let(:subscription) { create(:subscription, team: team, status: 'incomplete') }

  describe 'AASM state machine' do
    describe 'start_trial' do
      context 'with valid trial period' do
        before { subscription.update!(trial_end_at: 14.days.from_now) }

        it 'transitions from incomplete to trialing' do
          expect { subscription.start_trial! }
            .to change(subscription, :status).from('incomplete').to('trialing')
        end

        it 'sends trial started email' do
          expect { subscription.start_trial! }
            .to have_enqueued_mail(SubscriptionMailer, :trial_started)
        end
      end

      context 'without valid trial period' do
        it 'does not transition' do
          expect(subscription.may_start_trial?).to be false
        end
      end
    end

    describe 'payment flow' do
      let(:active_subscription) { create(:subscription, team: team, status: 'active') }

      it 'transitions active to past_due on payment failure' do
        expect { active_subscription.payment_failed! }
          .to change(active_subscription, :status).from('active').to('past_due')
      end

      it 'tracks payment failure count' do
        expect { active_subscription.payment_failed! }
          .to change(active_subscription, :payment_failure_count).by(1)
      end

      it 'recovers to active on payment success' do
        active_subscription.payment_failed!
        expect { active_subscription.payment_succeeded! }
          .to change(active_subscription, :status).from('past_due').to('active')
      end
    end

    describe 'cancel' do
      let(:active_subscription) { create(:subscription, team: team, status: 'active') }

      it 'transitions to cancelled' do
        expect { active_subscription.cancel! }
          .to change(active_subscription, :status).from('active').to('cancelled')
      end

      it 'restricts team features' do
        active_subscription.cancel!
        expect(team.reload.features_locked).to be true
      end
    end
  end

  describe '#can_use_features?' do
    it 'returns true for trialing' do
      subscription.update!(status: 'trialing')
      expect(subscription.can_use_features?).to be true
    end

    it 'returns true for active' do
      subscription.update!(status: 'active')
      expect(subscription.can_use_features?).to be true
    end

    it 'returns true for past_due within 7 days' do
      subscription.update!(status: 'past_due', past_due_since: 3.days.ago)
      expect(subscription.can_use_features?).to be true
    end

    it 'returns false for past_due after 7 days' do
      subscription.update!(status: 'past_due', past_due_since: 10.days.ago)
      expect(subscription.can_use_features?).to be false
    end

    it 'returns false for cancelled' do
      subscription.update!(status: 'cancelled')
      expect(subscription.can_use_features?).to be false
    end
  end

  describe '.mrr_cents' do
    before do
      create(:subscription, team: create(:team), status: 'active', plan_type: 'starter', billing_cycle: 'monthly')
      create(:subscription, team: create(:team), status: 'active', plan_type: 'professional', billing_cycle: 'annual')
    end

    it 'calculates MRR correctly' do
      # 2900 (starter monthly) + 6500 (professional annual / 12)
      expect(Subscription.mrr_cents).to eq(2900 + 6500)
    end
  end
end
```

---

## 6.8 Testing State Machines

### 6.8.1 RSpec Examples for Interventions

```ruby
# spec/models/intervention_spec.rb
require 'rails_helper'

RSpec.describe Intervention, type: :model do
  let(:team) { create(:team) }
  let(:lot) { create(:lot, team: team) }
  let(:intervention) { create(:intervention, team: team, lot: lot) }
  let(:provider) { create(:user, :prestataire) }

  describe 'AASM states' do
    it 'starts in demande state' do
      expect(intervention).to be_demande
    end

    it 'has correct initial state' do
      expect(intervention.status).to eq('demande')
    end
  end

  describe 'approve event' do
    it 'transitions from demande to approuvee' do
      expect { intervention.approve! }.to change(intervention, :status)
        .from('demande').to('approuvee')
    end

    it 'creates activity log' do
      expect { intervention.approve! }.to change(ActivityLog, :count).by(1)
    end

    context 'when already approved' do
      before { intervention.approve! }

      it 'raises error' do
        expect { intervention.approve! }.to raise_error(AASM::InvalidTransition)
      end
    end
  end

  describe 'reject event' do
    it 'transitions from demande to rejetee' do
      intervention.rejection_reason = 'Duplicate request'
      expect { intervention.reject! }.to change(intervention, :status)
        .from('demande').to('rejetee')
    end
  end

  describe 'complete workflow' do
    let!(:assignment) { create(:intervention_assignment, intervention: intervention, user: provider, assignment_role: 'prestataire') }
    let!(:quote) { create(:intervention_quote, intervention: intervention, provider: provider) }
    let!(:time_slot) { create(:intervention_time_slot, intervention: intervention, proposed_by: provider) }

    it 'can complete full lifecycle' do
      # Approve
      intervention.approve!
      expect(intervention).to be_approuvee

      # Request quote
      intervention.request_quote!
      expect(intervention).to be_demande_de_devis

      # Accept quote
      quote.accept!
      intervention.reload
      expect(intervention).to be_planification

      # Select time slot
      time_slot.accept!
      intervention.reload
      expect(intervention).to be_planifiee

      # Provider closes
      intervention.close_by_provider!
      expect(intervention).to be_cloturee_par_prestataire

      # Tenant validates
      intervention.close_by_tenant!
      expect(intervention).to be_cloturee_par_locataire

      # Manager finalizes
      intervention.close_by_manager!
      expect(intervention).to be_cloturee_par_gestionnaire

      # Verify terminal state
      expect(intervention).to be_terminal_state
    end
  end

  describe 'cancel event' do
    context 'from various states' do
      %i[demande approuvee demande_de_devis planification planifiee en_cours].each do |state|
        it "can cancel from #{state}" do
          intervention.update_column(:status, state.to_s)
          intervention.reload

          expect { intervention.cancel! }.not_to raise_error
          expect(intervention).to be_annulee
        end
      end
    end

    context 'from terminal states' do
      %i[rejetee cloturee_par_gestionnaire annulee].each do |state|
        it "cannot cancel from #{state}" do
          intervention.update_column(:status, state.to_s)
          intervention.reload

          expect { intervention.cancel! }.to raise_error(AASM::InvalidTransition)
        end
      end
    end
  end

  describe 'guards' do
    describe '#has_assigned_providers?' do
      it 'returns false without assignments' do
        expect(intervention.has_assigned_providers?).to be false
      end

      it 'returns true with provider assignment' do
        create(:intervention_assignment, intervention: intervention, user: provider, assignment_role: 'prestataire')
        expect(intervention.has_assigned_providers?).to be true
      end
    end

    describe '#has_selected_time_slot?' do
      it 'returns false without selected slot' do
        expect(intervention.has_selected_time_slot?).to be false
      end

      it 'returns true with selected slot' do
        time_slot = create(:intervention_time_slot, intervention: intervention, proposed_by: provider)
        intervention.update!(selected_time_slot: time_slot)
        expect(intervention.has_selected_time_slot?).to be true
      end
    end
  end

  describe 'callbacks' do
    describe 'after_approve' do
      it 'creates conversation thread' do
        expect { intervention.approve! }.to change(ConversationThread, :count).by(1)
      end

      it 'enqueues notification' do
        expect(Interventions::Notifiers::ApprovalNotifier).to receive(:call).with(intervention)
        intervention.approve!
      end
    end
  end
end
```

---

*End of Section 6 - State Machines (AASM)*

---

# 7. Services & Background Jobs

This section describes the service object pattern used in SEIDO and the background job infrastructure with Sidekiq.

---

## 7.1 Service Object Pattern

### 7.1.1 Why Service Objects?

| Pattern | Controller Logic | Service Objects |
|---------|-----------------|-----------------|
| **Testability** | Complex | Pure Ruby, easy |
| **Reusability** | Low | High |
| **Readability** | Long controllers | Focused classes |
| **Dependency** | HTTP context | Standalone |
| **Composition** | Difficult | Natural |

### 7.1.2 Base Service Class

```ruby
# app/services/application_service.rb
class ApplicationService
  def self.call(*args, **kwargs, &block)
    new(*args, **kwargs, &block).call
  end

  def initialize(*args, **kwargs)
    # Override in subclasses
  end

  def call
    raise NotImplementedError, "#{self.class} must implement #call"
  end

  protected

  def success(data = nil, message: nil)
    ServiceResult.success(data: data, message: message)
  end

  def failure(error, code: nil, details: {})
    ServiceResult.failure(error: error, code: code, details: details)
  end
end

# app/services/service_result.rb
class ServiceResult
  attr_reader :data, :error, :code, :message, :details

  def initialize(success:, data: nil, error: nil, code: nil, message: nil, details: {})
    @success = success
    @data = data
    @error = error
    @code = code
    @message = message
    @details = details
  end

  def self.success(data: nil, message: nil)
    new(success: true, data: data, message: message)
  end

  def self.failure(error:, code: nil, details: {})
    new(success: false, error: error, code: code, details: details)
  end

  def success?
    @success
  end

  def failure?
    !@success
  end

  def on_success
    yield(data, message) if success? && block_given?
    self
  end

  def on_failure
    yield(error, code, details) if failure? && block_given?
    self
  end
end
```

---

## 7.2 Intervention Services

### 7.2.1 Intervention Creator

```ruby
# app/services/interventions/creator.rb
module Interventions
  class Creator < ApplicationService
    def initialize(params:, user:, team:)
      @params = params
      @user = user
      @team = team
    end

    def call
      ActiveRecord::Base.transaction do
        intervention = build_intervention
        return failure(intervention.errors.full_messages.join(', ')) unless intervention.save

        create_assignment if @user.locataire?
        create_notification(intervention)
        log_creation(intervention)

        success(intervention, message: 'Intervention created successfully')
      end
    rescue StandardError => e
      Rails.logger.error("[Interventions::Creator] Error: #{e.message}")
      failure(e.message, code: 'creation_error')
    end

    private

    def build_intervention
      Intervention.new(
        **@params.slice(:lot_id, :building_id, :title, :description, :priority, :intervention_type, :access_type, :access_details),
        team: @team,
        created_by: @user.id,
        status: 'demande'
      )
    end

    def create_assignment
      # Auto-assign tenant as participant
      intervention.intervention_assignments.create!(
        user: @user,
        assignment_role: 'locataire',
        assigned_by: @user.id
      )
    end

    def create_notification(intervention)
      Notifications::Creator.call(
        type: 'intervention_created',
        team: @team,
        entity: intervention,
        recipients: team_managers
      )
    end

    def log_creation(intervention)
      ActivityLog.create!(
        team: @team,
        user: @user,
        entity_type: 'intervention',
        entity_id: intervention.id,
        action: 'created',
        details: { title: intervention.title }
      )
    end

    def team_managers
      @team.team_members.where(role: %w[admin gestionnaire]).includes(:user).map(&:user)
    end
  end
end
```

### 7.2.2 Intervention Status Updater

```ruby
# app/services/interventions/status_updater.rb
module Interventions
  class StatusUpdater < ApplicationService
    VALID_EVENTS = %w[
      approve reject request_quote accept_quote skip_quote
      schedule start_work close_by_provider close_by_tenant
      close_by_manager cancel reopen
    ].freeze

    def initialize(intervention:, event:, user:, params: {})
      @intervention = intervention
      @event = event.to_s
      @user = user
      @params = params
    end

    def call
      return failure('Invalid event', code: 'invalid_event') unless valid_event?
      return failure('Transition not allowed', code: 'invalid_transition') unless can_transition?

      ActiveRecord::Base.transaction do
        update_intervention_attributes
        perform_transition
        send_notifications
        success(@intervention, message: "Status changed to #{@intervention.status}")
      end
    rescue AASM::InvalidTransition => e
      failure("Cannot #{@event} from #{@intervention.status}", code: 'transition_error')
    rescue StandardError => e
      Rails.logger.error("[StatusUpdater] Error: #{e.message}")
      failure(e.message, code: 'update_error')
    end

    private

    def valid_event?
      VALID_EVENTS.include?(@event)
    end

    def can_transition?
      @intervention.send("may_#{@event}?")
    end

    def update_intervention_attributes
      case @event
      when 'reject'
        @intervention.rejection_reason = @params[:reason]
        @intervention.rejected_at = Time.current
        @intervention.rejected_by = @user.id
      when 'close_by_manager'
        @intervention.actual_cost = @params[:actual_cost]
        @intervention.gestionnaire_notes = @params[:notes]
        @intervention.closed_at = Time.current
        @intervention.closed_by = @user.id
      when 'cancel'
        @intervention.cancellation_reason = @params[:reason]
      end
    end

    def perform_transition
      Current.user = @user
      @intervention.send("#{@event}!")
    end

    def send_notifications
      Interventions::Notifiers::StatusChangeNotifier.call(
        intervention: @intervention,
        event: @event,
        user: @user
      )
    end
  end
end
```

### 7.2.3 Provider Assignment Service

```ruby
# app/services/interventions/provider_assigner.rb
module Interventions
  class ProviderAssigner < ApplicationService
    def initialize(intervention:, provider:, assigned_by:, is_primary: false)
      @intervention = intervention
      @provider = provider
      @assigned_by = assigned_by
      @is_primary = is_primary
    end

    def call
      return failure('Provider not found') unless @provider
      return failure('Provider is not a prestataire') unless @provider.prestataire?
      return failure('Already assigned') if already_assigned?

      ActiveRecord::Base.transaction do
        assignment = create_assignment
        add_to_conversation
        send_notification

        success(assignment, message: 'Provider assigned successfully')
      end
    rescue StandardError => e
      failure(e.message, code: 'assignment_error')
    end

    private

    def already_assigned?
      @intervention.intervention_assignments.exists?(user: @provider)
    end

    def create_assignment
      @intervention.intervention_assignments.create!(
        user: @provider,
        assignment_role: 'prestataire',
        assigned_by: @assigned_by.id,
        is_primary: @is_primary,
        assigned_at: Time.current
      )
    end

    def add_to_conversation
      return unless @intervention.conversation_thread

      @intervention.conversation_thread.conversation_participants.find_or_create_by!(
        user: @provider
      )
    end

    def send_notification
      Interventions::Notifiers::AssignmentNotifier.call(
        intervention: @intervention,
        provider: @provider,
        assigned_by: @assigned_by
      )
    end
  end
end
```

---

## 7.3 Notification Services

### 7.3.1 Notification Creator

```ruby
# app/services/notifications/creator.rb
module Notifications
  class Creator < ApplicationService
    def initialize(type:, team:, entity:, recipients:, data: {})
      @type = type
      @team = team
      @entity = entity
      @recipients = Array(recipients)
      @data = data
    end

    def call
      return failure('No recipients') if @recipients.empty?

      notifications = @recipients.map do |recipient|
        create_notification(recipient)
      end.compact

      send_push_notifications(notifications)
      send_email_notifications(notifications) if requires_email?

      success(notifications, message: "Created #{notifications.size} notifications")
    rescue StandardError => e
      Rails.logger.error("[Notifications::Creator] Error: #{e.message}")
      failure(e.message)
    end

    private

    def create_notification(recipient)
      Notification.create!(
        team: @team,
        user: recipient,
        notification_type: @type,
        entity_type: @entity.class.name.underscore,
        entity_id: @entity.id,
        title: notification_title,
        message: notification_message,
        data: @data,
        priority: notification_priority
      )
    end

    def notification_title
      I18n.t("notifications.#{@type}.title", default: @type.titleize)
    end

    def notification_message
      I18n.t("notifications.#{@type}.message", **message_params, default: '')
    end

    def message_params
      case @entity
      when Intervention
        { title: @entity.title, status: @entity.status }
      when InterventionQuote
        { amount: @entity.amount, intervention: @entity.intervention.title }
      else
        {}
      end
    end

    def notification_priority
      case @type
      when /urgent/, /emergency/
        'high'
      when /reminder/
        'medium'
      else
        'normal'
      end
    end

    def requires_email?
      %w[
        intervention_created
        intervention_scheduled
        intervention_completed
        quote_received
        quote_accepted
      ].include?(@type)
    end

    def send_push_notifications(notifications)
      notifications.each do |notification|
        PushNotificationJob.perform_later(notification.id)
      end
    end

    def send_email_notifications(notifications)
      notifications.each do |notification|
        NotificationMailer.notification_email(notification).deliver_later
      end
    end
  end
end
```

### 7.3.2 Push Notification Sender

```ruby
# app/services/notifications/push_sender.rb
module Notifications
  class PushSender < ApplicationService
    def initialize(notification:)
      @notification = notification
    end

    def call
      return failure('Notification not found') unless @notification
      return success(nil, message: 'No subscriptions') unless subscriptions.any?

      results = subscriptions.map { |sub| send_to_subscription(sub) }
      successful = results.count(&:itself)

      success({ sent: successful, total: results.size })
    rescue StandardError => e
      Rails.logger.error("[PushSender] Error: #{e.message}")
      failure(e.message)
    end

    private

    def subscriptions
      @subscriptions ||= @notification.user.push_subscriptions.active
    end

    def send_to_subscription(subscription)
      payload = build_payload
      WebPush.payload_send(
        message: payload.to_json,
        endpoint: subscription.endpoint,
        p256dh: subscription.p256dh,
        auth: subscription.auth,
        vapid: vapid_keys
      )
      true
    rescue WebPush::ExpiredSubscription
      subscription.destroy
      false
    rescue WebPush::InvalidSubscription
      subscription.update!(active: false)
      false
    rescue StandardError => e
      Rails.logger.error("[PushSender] Subscription error: #{e.message}")
      false
    end

    def build_payload
      {
        title: @notification.title,
        body: @notification.message,
        icon: '/icons/notification-icon.png',
        badge: '/icons/badge-icon.png',
        data: {
          notification_id: @notification.id,
          entity_type: @notification.entity_type,
          entity_id: @notification.entity_id,
          url: notification_url
        }
      }
    end

    def notification_url
      case @notification.entity_type
      when 'intervention'
        "/interventions/#{@notification.entity_id}"
      when 'intervention_quote'
        "/interventions/#{@notification.entity.intervention_id}/quotes"
      else
        '/notifications'
      end
    end

    def vapid_keys
      {
        subject: Rails.application.credentials.dig(:vapid, :subject),
        public_key: Rails.application.credentials.dig(:vapid, :public_key),
        private_key: Rails.application.credentials.dig(:vapid, :private_key)
      }
    end
  end
end
```

---

## 7.4 Stripe Services

### 7.4.1 Customer Creator

```ruby
# app/services/stripe/customer_creator.rb
module Stripe
  class CustomerCreator < ApplicationService
    def initialize(team:, email:, name: nil)
      @team = team
      @email = email
      @name = name || @team.name
    end

    def call
      return failure('Team already has Stripe customer') if @team.stripe_customer.present?

      customer = create_stripe_customer
      stripe_customer = save_local_customer(customer)

      success(stripe_customer, message: 'Stripe customer created')
    rescue ::Stripe::StripeError => e
      Rails.logger.error("[Stripe::CustomerCreator] Error: #{e.message}")
      failure(e.message, code: 'stripe_error')
    end

    private

    def create_stripe_customer
      ::Stripe::Customer.create(
        email: @email,
        name: @name,
        metadata: {
          team_id: @team.id,
          team_name: @team.name
        }
      )
    end

    def save_local_customer(stripe_customer)
      StripeCustomer.create!(
        team: @team,
        stripe_customer_id: stripe_customer.id,
        email: @email
      )
    end
  end
end
```

### 7.4.2 Subscription Creator

```ruby
# app/services/stripe/subscription_creator.rb
module Stripe
  class SubscriptionCreator < ApplicationService
    def initialize(team:, price_id:, payment_method_id: nil, trial_days: nil)
      @team = team
      @price_id = price_id
      @payment_method_id = payment_method_id
      @trial_days = trial_days
    end

    def call
      return failure('No Stripe customer') unless stripe_customer

      attach_payment_method if @payment_method_id
      subscription = create_stripe_subscription
      local_subscription = save_local_subscription(subscription)

      success(local_subscription, message: 'Subscription created')
    rescue ::Stripe::StripeError => e
      Rails.logger.error("[Stripe::SubscriptionCreator] Error: #{e.message}")
      failure(e.message, code: 'stripe_error')
    end

    private

    def stripe_customer
      @stripe_customer ||= @team.stripe_customer
    end

    def attach_payment_method
      ::Stripe::PaymentMethod.attach(
        @payment_method_id,
        customer: stripe_customer.stripe_customer_id
      )

      ::Stripe::Customer.update(
        stripe_customer.stripe_customer_id,
        invoice_settings: { default_payment_method: @payment_method_id }
      )
    end

    def create_stripe_subscription
      params = {
        customer: stripe_customer.stripe_customer_id,
        items: [{ price: @price_id }],
        expand: ['latest_invoice.payment_intent']
      }

      params[:trial_period_days] = @trial_days if @trial_days

      ::Stripe::Subscription.create(params)
    end

    def save_local_subscription(stripe_subscription)
      Subscription.create!(
        team: @team,
        stripe_customer: stripe_customer,
        stripe_subscription_id: stripe_subscription.id,
        plan_id: @price_id,
        status: stripe_subscription.status,
        current_period_start: Time.at(stripe_subscription.current_period_start),
        current_period_end: Time.at(stripe_subscription.current_period_end),
        trial_end_at: stripe_subscription.trial_end ? Time.at(stripe_subscription.trial_end) : nil
      )
    end
  end
end
```

### 7.4.3 Webhook Handler

```ruby
# app/services/stripe/webhook_handler.rb
module Stripe
  class WebhookHandler < ApplicationService
    HANDLED_EVENTS = %w[
      customer.subscription.created
      customer.subscription.updated
      customer.subscription.deleted
      invoice.paid
      invoice.payment_failed
      payment_intent.succeeded
      payment_intent.payment_failed
    ].freeze

    def initialize(payload:, signature:)
      @payload = payload
      @signature = signature
    end

    def call
      event = verify_webhook
      return failure('Unhandled event type') unless handled_event?(event.type)

      process_event(event)
      success(event.type, message: 'Webhook processed')
    rescue ::Stripe::SignatureVerificationError => e
      Rails.logger.error("[Stripe::WebhookHandler] Invalid signature: #{e.message}")
      failure('Invalid signature', code: 'invalid_signature')
    rescue StandardError => e
      Rails.logger.error("[Stripe::WebhookHandler] Error: #{e.message}")
      failure(e.message, code: 'webhook_error')
    end

    private

    def verify_webhook
      ::Stripe::Webhook.construct_event(
        @payload,
        @signature,
        webhook_secret
      )
    end

    def webhook_secret
      Rails.application.credentials.dig(:stripe, :webhook_secret)
    end

    def handled_event?(type)
      HANDLED_EVENTS.include?(type)
    end

    def process_event(event)
      case event.type
      when 'customer.subscription.created', 'customer.subscription.updated'
        handle_subscription_update(event.data.object)
      when 'customer.subscription.deleted'
        handle_subscription_deleted(event.data.object)
      when 'invoice.paid'
        handle_invoice_paid(event.data.object)
      when 'invoice.payment_failed'
        handle_invoice_payment_failed(event.data.object)
      end
    end

    def handle_subscription_update(stripe_subscription)
      subscription = Subscription.find_by(stripe_subscription_id: stripe_subscription.id)
      return unless subscription

      subscription.sync_from_stripe!(stripe_subscription)
    end

    def handle_subscription_deleted(stripe_subscription)
      subscription = Subscription.find_by(stripe_subscription_id: stripe_subscription.id)
      return unless subscription

      subscription.cancel! if subscription.may_cancel?
    end

    def handle_invoice_paid(invoice)
      StripeInvoice.create_or_update_from_stripe!(invoice)
    end

    def handle_invoice_payment_failed(invoice)
      subscription = Subscription.find_by(stripe_subscription_id: invoice.subscription)
      return unless subscription

      subscription.payment_failed! if subscription.may_payment_failed?
      notify_payment_failure(subscription)
    end

    def notify_payment_failure(subscription)
      PaymentFailedNotifier.call(subscription: subscription)
    end
  end
end
```

### 7.4.4 Billing Flows (Complete Workflows)

This section documents the complete end-to-end billing flows for SEIDO, including user interactions, service calls, and webhook handling.

#### 7.4.4.1 New Subscription Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       NEW SUBSCRIPTION FLOW                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. CHECKOUT INITIATION                                                     │
│     ┌─────────────┐     ┌────────────────────┐     ┌────────────────────┐  │
│     │   Manager   │────▶│  SubscriptionsController │────▶│ CheckoutCreator  │  │
│     │ clicks Plan │     │   #new action          │     │ Service Object   │  │
│     └─────────────┘     └────────────────────┘     └─────────┬──────────┘  │
│                                                               │             │
│  2. STRIPE CHECKOUT SESSION                                   ▼             │
│     ┌────────────────────────────────────────────────────────────────────┐ │
│     │ Stripe::Checkout::Session.create(                                  │ │
│     │   mode: 'subscription',                                             │ │
│     │   customer: stripe_customer_id,  # or create new                   │ │
│     │   line_items: [{ price: 'price_xxx', quantity: 1 }],               │ │
│     │   subscription_data: { trial_period_days: 14 },                    │ │
│     │   success_url: 'https://app/subscriptions/success?session_id=...',  │ │
│     │   cancel_url: 'https://app/subscriptions/cancel'                    │ │
│     │ )                                                                   │ │
│     └─────────────────────────────────────────────────────────┬──────────┘ │
│                                                               │             │
│  3. USER COMPLETES PAYMENT ON STRIPE                          ▼             │
│     ┌─────────────┐     ┌────────────────────┐                             │
│     │   Stripe    │────▶│ Stripe Hosted      │                             │
│     │   Redirect  │     │ Checkout Page      │                             │
│     └─────────────┘     └─────────┬──────────┘                             │
│                                   │                                        │
│  4. WEBHOOK PROCESSING            ▼                                        │
│     ┌───────────────────────────────────────────────────────────────────┐  │
│     │ customer.subscription.created → Subscription.create!               │  │
│     │ checkout.session.completed → Team.update!(onboarding_complete)     │  │
│     │ invoice.paid → StripeInvoice.create_from_stripe!                   │  │
│     └───────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  5. REDIRECT TO SUCCESS                                                     │
│     ┌─────────────┐     ┌────────────────────┐     ┌────────────────────┐  │
│     │   Return    │────▶│   SuccessPage      │────▶│  Dashboard with    │  │
│     │   from      │     │   (verify status)  │     │  active features   │  │
│     │   Stripe    │     └────────────────────┘     └────────────────────┘  │
│     └─────────────┘                                                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

```ruby
# app/services/stripe/checkout_creator.rb
module Stripe
  class CheckoutCreator < ApplicationService
    TRIAL_DAYS = 14

    def initialize(team:, price_id:, success_url:, cancel_url:)
      @team = team
      @price_id = price_id
      @success_url = success_url
      @cancel_url = cancel_url
    end

    def call
      ensure_stripe_customer!
      session = create_checkout_session
      success(session, message: 'Checkout session created')
    rescue ::Stripe::StripeError => e
      Rails.logger.error("[Stripe::CheckoutCreator] Error: #{e.message}")
      failure(e.message, code: 'stripe_error')
    end

    private

    def ensure_stripe_customer!
      return if @team.stripe_customer.present?

      CustomerCreator.call(
        team: @team,
        email: @team.owner.email,
        name: @team.name
      )
    end

    def create_checkout_session
      ::Stripe::Checkout::Session.create(
        customer: @team.stripe_customer.stripe_customer_id,
        mode: 'subscription',
        line_items: [{ price: @price_id, quantity: 1 }],
        subscription_data: {
          trial_period_days: TRIAL_DAYS,
          metadata: { team_id: @team.id }
        },
        success_url: @success_url,
        cancel_url: @cancel_url,
        allow_promotion_codes: true,
        billing_address_collection: 'required',
        customer_update: {
          address: 'auto',
          name: 'auto'
        }
      )
    end
  end
end
```

#### 7.4.4.2 Upgrade/Downgrade Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       PLAN CHANGE FLOW                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐                                                        │
│  │ Current Plan:   │   UPGRADE                 DOWNGRADE                    │
│  │ Professional    │   ┌───────────────┐       ┌────────────────────┐       │
│  │ $79/month       │   │ Enterprise    │       │ Starter            │       │
│  └────────┬────────┘   │ $199/month    │       │ $29/month          │       │
│           │            └───────┬───────┘       └─────────┬──────────┘       │
│           │                    │                         │                  │
│           ▼                    ▼                         ▼                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                    PlanChanger Service                                  ││
│  │                                                                         ││
│  │  UPGRADE:                                                               ││
│  │  • Immediate effect                                                     ││
│  │  • Prorate charges (charge difference now)                              ││
│  │  • New features unlocked immediately                                    ││
│  │                                                                         ││
│  │  DOWNGRADE:                                                             ││
│  │  • Effect at period end (graceful)                                      ││
│  │  • No immediate charge change                                           ││
│  │  • Current features remain until period ends                            ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                             │
│  Stripe Subscription Update:                                                │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ ::Stripe::Subscription.update(subscription_id, {                        ││
│  │   items: [{ id: item_id, price: new_price_id }],                       ││
│  │   proration_behavior: upgrade? ? 'create_prorations' : 'none',          ││
│  │   billing_cycle_anchor: downgrade? ? 'unchanged' : 'now'                ││
│  │ })                                                                      ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
```

```ruby
# app/services/stripe/plan_changer.rb
module Stripe
  class PlanChanger < ApplicationService
    def initialize(subscription:, new_price_id:)
      @subscription = subscription
      @new_price_id = new_price_id
    end

    def call
      return failure('No active subscription') unless @subscription.billable?
      return failure('Same plan') if same_plan?

      update_stripe_subscription
      update_local_subscription
      notify_plan_change

      success(@subscription.reload, message: "Plan changed to #{new_plan_name}")
    rescue ::Stripe::StripeError => e
      Rails.logger.error("[Stripe::PlanChanger] Error: #{e.message}")
      failure(e.message, code: 'stripe_error')
    end

    private

    def same_plan?
      @subscription.plan_id == @new_price_id
    end

    def upgrade?
      new_plan_rank > current_plan_rank
    end

    def current_plan_rank
      plan_ranks[@subscription.plan_type] || 0
    end

    def new_plan_rank
      plan_ranks[new_plan_type] || 0
    end

    def plan_ranks
      { 'starter' => 1, 'professional' => 2, 'enterprise' => 3 }
    end

    def new_plan_type
      # Extract plan type from price ID (e.g., 'price_starter_monthly' -> 'starter')
      @new_price_id.split('_')[1]
    end

    def new_plan_name
      new_plan_type.capitalize
    end

    def update_stripe_subscription
      stripe_subscription = ::Stripe::Subscription.retrieve(@subscription.stripe_subscription_id)
      item_id = stripe_subscription.items.data.first.id

      ::Stripe::Subscription.update(
        @subscription.stripe_subscription_id,
        items: [{ id: item_id, price: @new_price_id }],
        proration_behavior: upgrade? ? 'create_prorations' : 'none',
        metadata: {
          plan_change_at: Time.current.iso8601,
          previous_plan: @subscription.plan_type,
          new_plan: new_plan_type
        }
      )
    end

    def update_local_subscription
      @subscription.update!(
        plan_id: @new_price_id,
        plan_type: new_plan_type,
        plan_changed_at: Time.current
      )
    end

    def notify_plan_change
      if upgrade?
        SubscriptionMailer.plan_upgraded(@subscription).deliver_later
        log_activity('subscription_upgraded')
      else
        SubscriptionMailer.plan_downgraded(@subscription).deliver_later
        log_activity('subscription_downgraded')
      end
    end

    def log_activity(action)
      ActivityLog.create!(
        team: @subscription.team,
        user: @subscription.team.owner,
        action: action,
        resource_type: 'Subscription',
        resource_id: @subscription.id,
        metadata: {
          previous_plan: @subscription.plan_type_before_last_save,
          new_plan: @subscription.plan_type,
          immediate: upgrade?
        }
      )
    end
  end
end
```

#### 7.4.4.3 Payment Failure & Recovery Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       PAYMENT FAILURE RECOVERY                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  DAY 0: INVOICE DUE                                                         │
│  ┌─────────────┐     ┌───────────────┐     ┌────────────────────┐          │
│  │   Stripe    │────▶│ invoice.      │────▶│  Subscription      │          │
│  │   attempts  │     │ payment_failed│     │  → past_due        │          │
│  │   charge    │     └───────────────┘     └────────────────────┘          │
│  └─────────────┘                                                           │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ SMART RETRIES (Stripe handles automatically)                            ││
│  │                                                                         ││
│  │ Day 1:  Retry #1 + Email "Payment failed"                               ││
│  │ Day 3:  Retry #2 + Email "Action required"                              ││
│  │ Day 5:  Retry #3 + Email "Account at risk"                              ││
│  │ Day 7:  Final retry + Email "Service suspended"                         ││
│  │                                                                         ││
│  │ ─────────────────────────────────────────────────────────────────────── ││
│  │                                                                         ││
│  │ RECOVERY ACTIONS (User-initiated):                                      ││
│  │                                                                         ││
│  │ Option A: Update Payment Method                                         ││
│  │   1. User clicks "Update Payment" from email/dashboard                  ││
│  │   2. Stripe Billing Portal opens                                        ││
│  │   3. New card added → Automatic retry                                   ││
│  │   4. invoice.paid → subscription.payment_succeeded!                     ││
│  │                                                                         ││
│  │ Option B: Pay Outstanding Invoice                                       ││
│  │   1. User clicks "Pay Now" from email                                   ││
│  │   2. Stripe Invoice page opens                                          ││
│  │   3. Payment completed                                                  ││
│  │   4. invoice.paid → subscription.payment_succeeded!                     ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                             │
│  DAY 7+ (NO RECOVERY):                                                      │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ subscription.mark_unpaid!                                               ││
│  │   → Team features restricted (read-only)                                ││
│  │   → Dashboard shows "Payment Required" banner                           ││
│  │   → Only billing actions allowed                                        ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
```

```ruby
# app/services/stripe/payment_recovery.rb
module Stripe
  class PaymentRecovery < ApplicationService
    def initialize(subscription:)
      @subscription = subscription
    end

    def call
      return failure('Subscription not past due') unless @subscription.past_due?

      portal_session = create_billing_portal_session
      success(portal_session, message: 'Recovery portal ready')
    rescue ::Stripe::StripeError => e
      Rails.logger.error("[Stripe::PaymentRecovery] Error: #{e.message}")
      failure(e.message, code: 'stripe_error')
    end

    private

    def create_billing_portal_session
      ::Stripe::BillingPortal::Session.create(
        customer: @subscription.stripe_customer.stripe_customer_id,
        return_url: return_url,
        flow_data: {
          type: 'payment_method_update',
          after_completion: {
            type: 'redirect',
            redirect: { return_url: return_url }
          }
        }
      )
    end

    def return_url
      Rails.application.routes.url_helpers.billing_url(host: default_host)
    end

    def default_host
      Rails.application.config.action_mailer.default_url_options[:host]
    end
  end
end

# app/services/stripe/payment_failed_notifier.rb
module Stripe
  class PaymentFailedNotifier < ApplicationService
    def initialize(subscription:)
      @subscription = subscription
      @team = subscription.team
    end

    def call
      send_email_notification
      create_in_app_notification
      log_failure

      success(nil, message: 'Payment failure notifications sent')
    end

    private

    def send_email_notification
      email_class = case @subscription.past_due_days
                    when 0..1 then :payment_failed_initial
                    when 2..4 then :payment_failed_reminder
                    when 5..6 then :payment_failed_urgent
                    else :payment_failed_final
                    end

      SubscriptionMailer.send(email_class, @subscription).deliver_later
    end

    def create_in_app_notification
      Notification.create!(
        user: @team.owner,
        team: @team,
        title: notification_title,
        message: notification_message,
        notification_type: 'billing',
        priority: notification_priority,
        action_url: billing_update_url,
        action_label: I18n.t('notifications.update_payment_method')
      )
    end

    def notification_title
      if @subscription.past_due_days <= 3
        I18n.t('notifications.payment_failed_title')
      else
        I18n.t('notifications.payment_failed_urgent_title')
      end
    end

    def notification_message
      I18n.t(
        'notifications.payment_failed_message',
        days_remaining: 7 - @subscription.past_due_days
      )
    end

    def notification_priority
      @subscription.past_due_days > 5 ? 'critical' : 'high'
    end

    def billing_update_url
      Rails.application.routes.url_helpers.billing_update_path
    end

    def log_failure
      ActivityLog.create!(
        team: @team,
        action: 'payment_failed_notification_sent',
        resource_type: 'Subscription',
        resource_id: @subscription.id,
        metadata: {
          past_due_days: @subscription.past_due_days,
          attempt_count: @subscription.payment_failure_count
        }
      )
    end
  end
end
```

#### 7.4.4.4 Cancellation Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       CANCELLATION FLOW                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. USER INITIATES CANCELLATION                                             │
│     ┌─────────────┐     ┌────────────────────┐     ┌────────────────────┐  │
│     │  Manager    │────▶│ SubscriptionsController │────▶│ CancellationFlow │  │
│     │ clicks      │     │  #destroy               │     │ Service          │  │
│     │ "Cancel"    │     └────────────────────┘     └─────────┬──────────┘  │
│     └─────────────┘                                          │             │
│                                                               ▼             │
│  2. RETENTION FLOW (Optional)                                               │
│     ┌─────────────────────────────────────────────────────────────────────┐ │
│     │ Before cancellation, offer:                                         │ │
│     │                                                                     │ │
│     │ ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐      │ │
│     │ │ Downgrade to    │  │ Pause for       │  │ Discount offer  │      │ │
│     │ │ cheaper plan    │  │ 1-3 months      │  │ (20% off next   │      │ │
│     │ │ ($29/mo)        │  │                 │  │ 3 months)       │      │ │
│     │ └─────────────────┘  └─────────────────┘  └─────────────────┘      │ │
│     │                                                                     │ │
│     │ If declined → Continue to step 3                                    │ │
│     └─────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  3. CONFIRM CANCELLATION                                                    │
│     ┌─────────────────────────────────────────────────────────────────────┐ │
│     │ • Set cancel_at_period_end = true (graceful cancellation)           │ │
│     │ • Keep access until current_period_end                              │ │
│     │ • Show countdown in dashboard                                        │ │
│     │ • Send confirmation email                                            │ │
│     └─────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  4. AT PERIOD END                                                           │
│     ┌─────────────────────────────────────────────────────────────────────┐ │
│     │ Stripe webhook: customer.subscription.deleted                       │ │
│     │   → subscription.cancel!                                            │ │
│     │   → Team features locked                                            │ │
│     │   → Data preserved (90 days)                                        │ │
│     │   → Send "We're sorry to see you go" email                          │ │
│     │   → Schedule churn survey (24h later)                               │ │
│     └─────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  5. REACTIVATION WINDOW (90 DAYS)                                           │
│     ┌─────────────────────────────────────────────────────────────────────┐ │
│     │ User can:                                                           │ │
│     │   • Resubscribe with same data                                      │ │
│     │   • Resume interrupted billing                                      │ │
│     │   • Access read-only during grace period                            │ │
│     │                                                                     │ │
│     │ After 90 days:                                                      │ │
│     │   • Data anonymized (GDPR compliance)                               │ │
│     │   • Resubscription creates fresh account                            │ │
│     └─────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

```ruby
# app/services/stripe/cancellation_flow.rb
module Stripe
  class CancellationFlow < ApplicationService
    def initialize(subscription:, reason: nil, feedback: nil, immediate: false)
      @subscription = subscription
      @reason = reason
      @feedback = feedback
      @immediate = immediate
    end

    def call
      return failure('Subscription not cancellable') unless @subscription.may_cancel?

      if @immediate
        cancel_immediately
      else
        schedule_cancellation
      end

      record_cancellation_reason
      send_notifications

      success(@subscription.reload, message: cancellation_message)
    rescue ::Stripe::StripeError => e
      Rails.logger.error("[Stripe::CancellationFlow] Error: #{e.message}")
      failure(e.message, code: 'stripe_error')
    end

    private

    def schedule_cancellation
      ::Stripe::Subscription.update(
        @subscription.stripe_subscription_id,
        cancel_at_period_end: true
      )

      @subscription.update!(
        cancel_at_period_end: true,
        cancellation_requested_at: Time.current,
        cancellation_reason: @reason
      )
    end

    def cancel_immediately
      ::Stripe::Subscription.cancel(@subscription.stripe_subscription_id)
      @subscription.cancel!
    end

    def record_cancellation_reason
      CancellationFeedback.create!(
        subscription: @subscription,
        team: @subscription.team,
        reason: @reason,
        feedback: @feedback,
        plan_type: @subscription.plan_type,
        months_active: months_active,
        total_paid_cents: total_paid
      )
    end

    def months_active
      return 0 unless @subscription.activated_at
      ((Time.current - @subscription.activated_at) / 1.month).floor
    end

    def total_paid
      @subscription.stripe_invoices.paid.sum(:amount_paid_cents)
    end

    def send_notifications
      if @immediate
        SubscriptionMailer.cancellation_confirmed(@subscription).deliver_later
      else
        SubscriptionMailer.cancellation_scheduled(@subscription).deliver_later
      end

      ChurnedSurveyJob.set(wait: 24.hours).perform_later(@subscription.id)
    end

    def cancellation_message
      if @immediate
        'Subscription cancelled immediately'
      else
        "Subscription will cancel on #{@subscription.current_period_end.strftime('%B %d, %Y')}"
      end
    end
  end
end

# app/models/cancellation_feedback.rb
class CancellationFeedback < ApplicationRecord
  belongs_to :subscription
  belongs_to :team

  REASONS = %w[
    too_expensive
    not_using
    missing_features
    found_alternative
    temporary_pause
    company_closed
    other
  ].freeze

  validates :reason, inclusion: { in: REASONS }

  scope :by_reason, ->(reason) { where(reason: reason) }
  scope :recent, ->(days = 30) { where('created_at >= ?', days.days.ago) }

  def self.reason_breakdown(period = 30.days)
    recent(period)
      .group(:reason)
      .count
      .transform_keys { |k| I18n.t("cancellation_reasons.#{k}") }
  end
end
```

#### 7.4.4.5 Reactivation Flow

```ruby
# app/services/stripe/reactivation_flow.rb
module Stripe
  class ReactivationFlow < ApplicationService
    def initialize(subscription: nil, team:, price_id: nil)
      @subscription = subscription
      @team = team
      @price_id = price_id || @subscription&.plan_id
    end

    def call
      if within_grace_period?
        reactivate_existing
      else
        create_new_subscription
      end
    rescue ::Stripe::StripeError => e
      Rails.logger.error("[Stripe::ReactivationFlow] Error: #{e.message}")
      failure(e.message, code: 'stripe_error')
    end

    private

    def within_grace_period?
      @subscription.present? &&
        @subscription.cancelled? &&
        @subscription.cancelled_at > 90.days.ago
    end

    def reactivate_existing
      # Undo scheduled cancellation if still within period
      if @subscription.cancel_at_period_end? && @subscription.current_period_end > Time.current
        ::Stripe::Subscription.update(
          @subscription.stripe_subscription_id,
          cancel_at_period_end: false
        )

        @subscription.update!(
          cancel_at_period_end: false,
          cancellation_requested_at: nil,
          cancellation_reason: nil
        )

        @subscription.activate! if @subscription.may_activate?
        SubscriptionMailer.reactivation_confirmed(@subscription).deliver_later

        success(@subscription.reload, message: 'Subscription reactivated')
      else
        # Subscription already cancelled, create new one
        create_new_subscription
      end
    end

    def create_new_subscription
      # Use the standard subscription creator
      result = SubscriptionCreator.call(
        team: @team,
        price_id: @price_id
      )

      if result.success?
        # Link to old subscription for analytics
        result.data.update!(
          previous_subscription_id: @subscription&.id,
          reactivated_at: Time.current
        )

        SubscriptionMailer.new_subscription_after_churn(result.data).deliver_later
        log_reactivation(result.data)
      end

      result
    end

    def log_reactivation(new_subscription)
      ActivityLog.create!(
        team: @team,
        user: @team.owner,
        action: 'subscription_reactivated',
        resource_type: 'Subscription',
        resource_id: new_subscription.id,
        metadata: {
          previous_subscription_id: @subscription&.id,
          days_since_cancellation: days_since_cancellation,
          new_plan_type: new_subscription.plan_type
        }
      )
    end

    def days_since_cancellation
      return nil unless @subscription&.cancelled_at
      ((Time.current - @subscription.cancelled_at) / 1.day).floor
    end
  end
end
```

#### 7.4.4.6 Billing Portal Integration

```ruby
# app/services/stripe/billing_portal.rb
module Stripe
  class BillingPortal < ApplicationService
    def initialize(team:, return_url:)
      @team = team
      @return_url = return_url
    end

    def call
      return failure('No Stripe customer') unless @team.stripe_customer.present?

      session = create_portal_session
      success(session, message: 'Billing portal ready')
    rescue ::Stripe::StripeError => e
      Rails.logger.error("[Stripe::BillingPortal] Error: #{e.message}")
      failure(e.message, code: 'stripe_error')
    end

    private

    def create_portal_session
      ::Stripe::BillingPortal::Session.create(
        customer: @team.stripe_customer.stripe_customer_id,
        return_url: @return_url,
        configuration: billing_portal_configuration_id
      )
    end

    def billing_portal_configuration_id
      # Created via Stripe Dashboard or API
      # Allows: Update payment method, view invoices, cancel subscription
      Rails.application.credentials.dig(:stripe, :billing_portal_config_id)
    end
  end
end

# app/controllers/billing_controller.rb
class BillingController < ApplicationController
  before_action :authenticate_user!
  before_action :require_team_owner!

  def show
    @subscription = current_team.subscription
    @invoices = current_team.stripe_invoices.recent(10)
    @upcoming_invoice = fetch_upcoming_invoice
  end

  def portal
    result = Stripe::BillingPortal.call(
      team: current_team,
      return_url: billing_url
    )

    if result.success?
      redirect_to result.data.url, allow_other_host: true
    else
      redirect_to billing_path, alert: result.error
    end
  end

  def update_payment
    result = Stripe::PaymentRecovery.call(subscription: current_subscription)

    if result.success?
      redirect_to result.data.url, allow_other_host: true
    else
      redirect_to billing_path, alert: result.error
    end
  end

  private

  def fetch_upcoming_invoice
    return nil unless current_subscription&.active?

    ::Stripe::Invoice.upcoming(
      customer: current_team.stripe_customer.stripe_customer_id
    )
  rescue ::Stripe::InvalidRequestError
    nil
  end

  def require_team_owner!
    unless current_user == current_team.owner
      redirect_to dashboard_path, alert: t('billing.owner_required')
    end
  end
end
```

#### 7.4.4.7 Billing Metrics Dashboard

```ruby
# app/services/billing/metrics_calculator.rb
module Billing
  class MetricsCalculator < ApplicationService
    def initialize(period: 30.days)
      @period = period
      @period_start = @period.ago
    end

    def call
      success(calculate_all_metrics)
    end

    private

    def calculate_all_metrics
      {
        revenue: revenue_metrics,
        subscriptions: subscription_metrics,
        churn: churn_metrics,
        growth: growth_metrics
      }
    end

    def revenue_metrics
      {
        mrr_cents: Subscription.mrr_cents,
        arr_cents: Subscription.arr_cents,
        mrr_growth_percent: mrr_growth,
        arpu_cents: average_revenue_per_user
      }
    end

    def subscription_metrics
      {
        total_active: Subscription.active_or_trialing.count,
        total_trialing: Subscription.where(status: :trialing).count,
        total_past_due: Subscription.where(status: :past_due).count,
        by_plan: Subscription.active_or_trialing.group(:plan_type).count,
        by_billing_cycle: Subscription.active_or_trialing.group(:billing_cycle).count
      }
    end

    def churn_metrics
      {
        churn_rate: Subscription.churn_rate(@period),
        churned_count: Subscription.churned.where('cancelled_at >= ?', @period_start).count,
        churn_reasons: CancellationFeedback.reason_breakdown(@period),
        revenue_churn_cents: churned_revenue
      }
    end

    def growth_metrics
      {
        new_subscriptions: Subscription.where('created_at >= ?', @period_start).count,
        trial_to_paid_rate: Subscription.trial_to_paid_conversion_rate(@period),
        net_revenue_retention: net_revenue_retention,
        upgrades_count: upgrades_count,
        downgrades_count: downgrades_count
      }
    end

    def mrr_growth
      current_mrr = Subscription.mrr_cents
      previous_mrr = calculate_mrr_at(@period_start)
      return 0 if previous_mrr.zero?

      ((current_mrr - previous_mrr).to_f / previous_mrr * 100).round(2)
    end

    def calculate_mrr_at(date)
      # This would require historical data or invoice analysis
      # Simplified version using current subscriptions that existed at that date
      Subscription.where('created_at < ?', date)
                  .where('cancelled_at IS NULL OR cancelled_at > ?', date)
                  .sum { |s| s.monthly_price_cents }
    end

    def average_revenue_per_user
      active_count = Subscription.active_or_trialing.count
      return 0 if active_count.zero?

      (Subscription.mrr_cents / active_count).round
    end

    def churned_revenue
      Subscription.churned
                  .where('cancelled_at >= ?', @period_start)
                  .sum { |s| s.monthly_price_cents }
    end

    def net_revenue_retention
      # (Starting MRR + Expansion - Contraction - Churn) / Starting MRR
      starting_mrr = calculate_mrr_at(@period_start)
      return 100 if starting_mrr.zero?

      expansion = upgrades_revenue - downgrades_revenue
      churn = churned_revenue

      ((starting_mrr + expansion - churn).to_f / starting_mrr * 100).round(2)
    end

    def upgrades_count
      Subscription.where('plan_changed_at >= ?', @period_start)
                  .where('plan_type > plan_type_was')
                  .count
    end

    def downgrades_count
      Subscription.where('plan_changed_at >= ?', @period_start)
                  .where('plan_type < plan_type_was')
                  .count
    end

    def upgrades_revenue
      # Difference in MRR from upgrades
      0 # Would need plan change history
    end

    def downgrades_revenue
      # Difference in MRR from downgrades
      0 # Would need plan change history
    end
  end
end
```

---

## 7.5 Background Jobs (Sidekiq)

### 7.5.1 Configuration

```ruby
# config/sidekiq.yml
---
:concurrency: <%= ENV.fetch("SIDEKIQ_CONCURRENCY", 5) %>
:queues:
  - [critical, 4]
  - [mailers, 3]
  - [notifications, 3]
  - [default, 2]
  - [low, 1]
  - [scheduled, 1]

:schedule:
  expire_invitations:
    cron: '0 * * * *'  # Every hour
    class: ExpireInvitationsJob
    queue: scheduled

  expire_quotes:
    cron: '0 2 * * *'  # Daily at 2 AM
    class: ExpireQuotesJob
    queue: scheduled

  send_reminders:
    cron: '*/15 * * * *'  # Every 15 minutes
    class: SendRemindersJob
    queue: scheduled

  sync_stripe_subscriptions:
    cron: '0 3 * * *'  # Daily at 3 AM
    class: SyncStripeSubscriptionsJob
    queue: scheduled

  cleanup_old_notifications:
    cron: '0 4 * * 0'  # Weekly on Sunday at 4 AM
    class: CleanupNotificationsJob
    queue: scheduled
```

### 7.5.2 Application Job Base

```ruby
# app/jobs/application_job.rb
class ApplicationJob < ActiveJob::Base
  queue_as :default

  # Retry with exponential backoff
  retry_on StandardError, wait: :polynomially_longer, attempts: 5

  # Don't retry on these errors
  discard_on ActiveJob::DeserializationError
  discard_on ActiveRecord::RecordNotFound

  # Log all job executions
  around_perform do |job, block|
    Rails.logger.info("[#{job.class.name}] Starting with args: #{job.arguments.inspect}")
    start_time = Time.current
    block.call
    duration = Time.current - start_time
    Rails.logger.info("[#{job.class.name}] Completed in #{duration.round(2)}s")
  rescue StandardError => e
    Rails.logger.error("[#{job.class.name}] Failed: #{e.message}")
    raise
  end
end
```

### 7.5.3 Push Notification Job

```ruby
# app/jobs/push_notification_job.rb
class PushNotificationJob < ApplicationJob
  queue_as :notifications

  def perform(notification_id)
    notification = Notification.find(notification_id)
    Notifications::PushSender.call(notification: notification)
  end
end
```

### 7.5.4 Reminder Notification Job

```ruby
# app/jobs/reminder_notification_job.rb
class ReminderNotificationJob < ApplicationJob
  queue_as :notifications

  def perform(intervention_id, reminder_type)
    intervention = Intervention.find(intervention_id)
    return unless intervention.planifiee?  # Only for scheduled interventions

    case reminder_type
    when '24h'
      send_24h_reminder(intervention)
    when '1h'
      send_1h_reminder(intervention)
    end
  end

  private

  def send_24h_reminder(intervention)
    recipients = [intervention.creator] + intervention.assigned_users
    recipients.uniq.each do |user|
      Notifications::Creator.call(
        type: 'intervention_reminder_24h',
        team: intervention.team,
        entity: intervention,
        recipients: [user],
        data: { time_slot: intervention.selected_time_slot&.slot_start }
      )
    end
  end

  def send_1h_reminder(intervention)
    recipients = [intervention.creator] + intervention.assigned_users
    recipients.uniq.each do |user|
      Notifications::Creator.call(
        type: 'intervention_reminder_1h',
        team: intervention.team,
        entity: intervention,
        recipients: [user],
        data: { time_slot: intervention.selected_time_slot&.slot_start }
      )
    end
  end
end
```

### 7.5.5 Scheduled Jobs

```ruby
# app/jobs/expire_invitations_job.rb
class ExpireInvitationsJob < ApplicationJob
  queue_as :scheduled

  def perform
    UserInvitation.pending.where('expires_at < ?', Time.current).find_each do |invitation|
      invitation.expire! if invitation.may_expire?
    end
  end
end

# app/jobs/expire_quotes_job.rb
class ExpireQuotesJob < ApplicationJob
  queue_as :scheduled

  def perform
    InterventionQuote.pending.where('valid_until < ?', Date.current).find_each do |quote|
      quote.expire! if quote.may_expire?
    end
  end
end

# app/jobs/sync_stripe_subscriptions_job.rb
class SyncStripeSubscriptionsJob < ApplicationJob
  queue_as :scheduled

  def perform
    Subscription.where(status: %w[active past_due trialing]).find_each do |subscription|
      begin
        stripe_sub = Stripe::Subscription.retrieve(subscription.stripe_subscription_id)
        subscription.sync_from_stripe!(stripe_sub)
      rescue Stripe::InvalidRequestError => e
        Rails.logger.warn("[SyncStripeSubscriptions] Subscription not found: #{subscription.id}")
      end
    end
  end
end

# app/jobs/cleanup_notifications_job.rb
class CleanupNotificationsJob < ApplicationJob
  queue_as :scheduled

  RETENTION_DAYS = 90

  def perform
    Notification
      .where(read_at: ...RETENTION_DAYS.days.ago)
      .where.not(read_at: nil)
      .delete_all
  end
end
```

### 7.5.6 Email Delivery Job

```ruby
# app/jobs/email_delivery_job.rb
class EmailDeliveryJob < ApplicationJob
  queue_as :mailers

  def perform(mailer_class, mailer_method, *args)
    mailer_class.constantize.send(mailer_method, *args).deliver_now
  end
end
```

---

## 7.6 File Services (ActiveStorage)

### 7.6.1 Document Uploader

```ruby
# app/services/documents/uploader.rb
module Documents
  class Uploader < ApplicationService
    ALLOWED_TYPES = %w[
      image/jpeg image/png image/gif image/webp
      application/pdf
      application/msword application/vnd.openxmlformats-officedocument.wordprocessingml.document
      application/vnd.ms-excel application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
    ].freeze

    MAX_SIZE = 25.megabytes

    def initialize(file:, entity:, uploaded_by:, document_type: nil, visibility: 'internal')
      @file = file
      @entity = entity
      @uploaded_by = uploaded_by
      @document_type = document_type
      @visibility = visibility
    end

    def call
      return failure('No file provided') unless @file
      return failure('File type not allowed') unless valid_type?
      return failure('File too large') unless valid_size?

      document = create_document
      attach_file(document)
      process_metadata(document)

      success(document, message: 'Document uploaded successfully')
    rescue StandardError => e
      Rails.logger.error("[Documents::Uploader] Error: #{e.message}")
      failure(e.message)
    end

    private

    def valid_type?
      ALLOWED_TYPES.include?(@file.content_type)
    end

    def valid_size?
      @file.size <= MAX_SIZE
    end

    def create_document
      Document.create!(
        team: @entity.team,
        entity_type: @entity.class.name.underscore,
        entity_id: @entity.id,
        document_type: @document_type,
        original_filename: @file.original_filename,
        content_type: @file.content_type,
        file_size: @file.size,
        uploaded_by: @uploaded_by.id,
        visibility: @visibility
      )
    end

    def attach_file(document)
      document.file.attach(@file)
    end

    def process_metadata(document)
      ProcessDocumentMetadataJob.perform_later(document.id)
    end
  end
end
```

---

*End of Section 7 - Services & Background Jobs*

---

# 8. Real-time Communication (ActionCable)

ActionCable provides WebSocket support for real-time features in Rails. SEIDO uses it for:
- Live notifications
- Intervention status updates
- Chat messaging between stakeholders
- Real-time dashboard updates

## 8.1 ActionCable Configuration

### 8.1.1 Cable Configuration

```yaml
# config/cable.yml
development:
  adapter: redis
  url: redis://localhost:6379/1
  channel_prefix: seido_development

test:
  adapter: test

production:
  adapter: redis
  url: <%= ENV.fetch("REDIS_URL") { "redis://localhost:6379/1" } %>
  channel_prefix: seido_production
  ssl_params:
    verify_mode: <%= OpenSSL::SSL::VERIFY_NONE %>
```

### 8.1.2 Connection Authentication

> ⚠️ **Security Note: JWT Token Transmission Methods**
>
> There are two ways to send JWT tokens for WebSocket authentication:
>
> | Method | Implementation | Pros | Cons |
> |--------|---------------|------|------|
> | **Query Parameter** | `wss://app.com/cable?token=xxx` | Simple, works everywhere | Token in logs, browser history |
> | **Sec-WebSocket-Protocol** | `new WebSocket(url, ['actioncable-v1-json', jwt])` | RFC 6455 compliant, not logged | More complex |
>
> **Recommendation**: Use Sec-WebSocket-Protocol for production. See Option B below.

```ruby
# app/channels/application_cable/connection.rb
module ApplicationCable
  class Connection < ActionCable::Connection::Base
    identified_by :current_user, :current_team

    def connect
      self.current_user = find_verified_user
      self.current_team = find_current_team

      logger.add_tags 'ActionCable', "User:#{current_user.id}", "Team:#{current_team&.id}"
    end

    private

    def find_verified_user
      # Option 1: Session-based (web app)
      if (user = User.find_by(id: cookies.encrypted[:user_id]))
        user
      # Option 2: JWT-based (mobile/API)
      elsif (user = authenticate_with_jwt)
        user
      else
        reject_unauthorized_connection
      end
    end

    # ═══════════════════════════════════════════════════════════════════════════
    # OPTION A: JWT via Query Parameter (Simple, but less secure)
    # Client: new WebSocket(`wss://app.com/cable?token=${jwt}`)
    # ═══════════════════════════════════════════════════════════════════════════
    def authenticate_with_jwt
      # Try Sec-WebSocket-Protocol first (Option B)
      token = extract_jwt_from_protocol || request.params[:token]
      return nil unless token

      decoded = JWT.decode(
        token,
        Rails.application.credentials.secret_key_base,
        true,
        algorithm: 'HS256'
      ).first

      User.find_by(id: decoded['user_id'])
    rescue JWT::DecodeError
      nil
    end

    # ═══════════════════════════════════════════════════════════════════════════
    # OPTION B: JWT via Sec-WebSocket-Protocol Header (Recommended)
    # Client: new WebSocket('wss://app.com/cable', ['actioncable-v1-json', jwt])
    # ═══════════════════════════════════════════════════════════════════════════
    def extract_jwt_from_protocol
      # Sec-WebSocket-Protocol header contains: "actioncable-v1-json, eyJhbGci..."
      protocols = request.headers['Sec-WebSocket-Protocol']&.split(', ')
      return nil unless protocols

      # Find the JWT (starts with eyJ for base64-encoded JSON)
      jwt = protocols.find { |p| p.start_with?('eyJ') }

      # IMPORTANT: Echo back the protocol so the handshake succeeds
      if jwt
        response.headers['Sec-WebSocket-Protocol'] = 'actioncable-v1-json'
      end

      jwt
    end

    def find_current_team
      team_id = request.params[:team_id] || cookies.encrypted[:current_team_id]
      return nil unless team_id

      # Verify user has access to this team
      team = Team.find_by(id: team_id)
      return nil unless team && current_user.member_of?(team)

      team
    end
  end
end
```

**Client-Side Implementation (JavaScript):**

```javascript
// Option A: Query Parameter (less secure - token visible in logs)
const cable = new WebSocket(`wss://app.seido.be/cable?token=${jwtToken}`);

// Option B: Sec-WebSocket-Protocol Header (recommended)
const cable = new WebSocket(
  'wss://app.seido.be/cable',
  ['actioncable-v1-json', jwtToken]  // JWT as second protocol
);

// ActionCable consumer with Sec-WebSocket-Protocol
import { createConsumer } from '@rails/actioncable'

const createSecureConsumer = (jwtToken) => {
  return createConsumer({
    url: 'wss://app.seido.be/cable',
    // Custom WebSocket factory
    webSocketFactory: (url) => {
      return new WebSocket(url, ['actioncable-v1-json', jwtToken]);
    }
  });
};
```

### 8.1.3 Base Channel

```ruby
# app/channels/application_cable/channel.rb
module ApplicationCable
  class Channel < ActionCable::Channel::Base
    # Shared authorization helpers

    protected

    def authorize_team_access!(team_id)
      team = Team.find(team_id)
      reject unless current_user.member_of?(team)
      team
    end

    def authorize_intervention_access!(intervention_id)
      intervention = Intervention.find(intervention_id)
      policy = InterventionPolicy.new(user_context, intervention)
      reject unless policy.show?
      intervention
    end

    def user_context
      @user_context ||= UserContext.new(current_user, current_team)
    end

    def broadcast_to_team(event, data)
      ActionCable.server.broadcast(
        "team_#{current_team.id}",
        { event: event, data: data, timestamp: Time.current.iso8601 }
      )
    end
  end
end
```

---

## 8.2 Notification Channel

Real-time notifications pushed to individual users.

```ruby
# app/channels/notifications_channel.rb
class NotificationsChannel < ApplicationCable::Channel
  def subscribed
    stream_for current_user

    # Also stream team-wide notifications
    stream_from "team_#{current_team.id}_notifications" if current_team

    # Send unread count on connection
    transmit_unread_count
  end

  def unsubscribed
    stop_all_streams
  end

  # Client can mark notification as read
  def mark_as_read(data)
    notification = current_user.notifications.find_by(id: data['notification_id'])
    return unless notification

    notification.mark_as_read!
    transmit_unread_count
  end

  # Client can mark all as read
  def mark_all_as_read
    current_user.notifications.unread.update_all(read_at: Time.current)
    transmit_unread_count
  end

  private

  def transmit_unread_count
    count = current_user.notifications.unread.count
    transmit({ event: 'unread_count', count: count })
  end
end
```

### 8.2.1 Broadcasting Notifications

```ruby
# app/services/notifications/broadcaster.rb
module Notifications
  class Broadcaster
    def self.broadcast(notification)
      new(notification).broadcast
    end

    def initialize(notification)
      @notification = notification
    end

    def broadcast
      # Broadcast to specific user
      NotificationsChannel.broadcast_to(
        @notification.user,
        notification_payload
      )

      # If team-wide notification, broadcast to team channel
      if @notification.team_wide?
        broadcast_to_team
      end
    end

    private

    def notification_payload
      {
        event: 'new_notification',
        notification: {
          id: @notification.id,
          type: @notification.notification_type,
          title: @notification.title,
          body: @notification.body,
          action_url: @notification.action_url,
          read_at: @notification.read_at,
          created_at: @notification.created_at.iso8601,
          metadata: @notification.metadata
        }
      }
    end

    def broadcast_to_team
      ActionCable.server.broadcast(
        "team_#{@notification.team_id}_notifications",
        notification_payload
      )
    end
  end
end
```

---

## 8.3 Intervention Channel

Real-time updates for intervention status changes.

```ruby
# app/channels/intervention_channel.rb
class InterventionChannel < ApplicationCable::Channel
  def subscribed
    @intervention = authorize_intervention_access!(params[:intervention_id])

    stream_for @intervention

    # Notify others that user joined
    broadcast_presence(:joined)
  end

  def unsubscribed
    broadcast_presence(:left) if @intervention
    stop_all_streams
  end

  # Client requests current state
  def request_state
    transmit({
      event: 'state',
      intervention: intervention_state
    })
  end

  private

  def broadcast_presence(action)
    InterventionChannel.broadcast_to(
      @intervention,
      {
        event: 'presence',
        action: action,
        user: {
          id: current_user.id,
          name: current_user.full_name,
          role: current_user.role
        },
        timestamp: Time.current.iso8601
      }
    )
  end

  def intervention_state
    {
      id: @intervention.id,
      status: @intervention.status,
      priority: @intervention.priority,
      assigned_users: @intervention.assigned_users.map { |u| { id: u.id, name: u.full_name } },
      quotes_count: @intervention.quotes.count,
      comments_count: @intervention.comments.count,
      updated_at: @intervention.updated_at.iso8601
    }
  end
end
```

### 8.3.1 Intervention Status Broadcaster

```ruby
# app/services/interventions/status_broadcaster.rb
module Interventions
  class StatusBroadcaster
    def self.broadcast(intervention, old_status, new_status, changed_by)
      new(intervention, old_status, new_status, changed_by).broadcast
    end

    def initialize(intervention, old_status, new_status, changed_by)
      @intervention = intervention
      @old_status = old_status
      @new_status = new_status
      @changed_by = changed_by
    end

    def broadcast
      # Broadcast to intervention channel (all viewers)
      broadcast_to_intervention

      # Broadcast to team dashboard
      broadcast_to_team_dashboard

      # Broadcast to assigned users
      broadcast_to_assigned_users
    end

    private

    def broadcast_to_intervention
      InterventionChannel.broadcast_to(
        @intervention,
        {
          event: 'status_changed',
          old_status: @old_status,
          new_status: @new_status,
          changed_by: {
            id: @changed_by.id,
            name: @changed_by.full_name
          },
          intervention: intervention_summary,
          timestamp: Time.current.iso8601
        }
      )
    end

    def broadcast_to_team_dashboard
      ActionCable.server.broadcast(
        "team_#{@intervention.team_id}_dashboard",
        {
          event: 'intervention_updated',
          intervention: intervention_summary
        }
      )
    end

    def broadcast_to_assigned_users
      @intervention.assigned_users.each do |user|
        NotificationsChannel.broadcast_to(
          user,
          {
            event: 'intervention_status_changed',
            intervention_id: @intervention.id,
            reference: @intervention.reference,
            old_status: @old_status,
            new_status: @new_status
          }
        )
      end
    end

    def intervention_summary
      {
        id: @intervention.id,
        reference: @intervention.reference,
        title: @intervention.title,
        status: @new_status,
        priority: @intervention.priority,
        lot_id: @intervention.lot_id,
        building_id: @intervention.lot&.building_id
      }
    end
  end
end
```

---

## 8.4 Conversation Channel (Chat)

Real-time chat for intervention discussions.

```ruby
# app/channels/conversation_channel.rb
class ConversationChannel < ApplicationCable::Channel
  def subscribed
    @thread = find_and_authorize_thread

    stream_for @thread

    # Mark user as active in this conversation
    mark_as_active

    # Send recent messages
    transmit_recent_messages
  end

  def unsubscribed
    mark_as_inactive if @thread
    stop_all_streams
  end

  # Client sends a message
  def send_message(data)
    message = @thread.messages.create!(
      sender: current_user,
      team: current_team,
      content: data['content'],
      message_type: data['type'] || 'text'
    )

    # Broadcast to all participants
    ConversationChannel.broadcast_to(
      @thread,
      {
        event: 'new_message',
        message: message_payload(message)
      }
    )

    # Mark sender's view as read
    mark_thread_as_read
  end

  # Client is typing
  def typing(data)
    ConversationChannel.broadcast_to(
      @thread,
      {
        event: 'typing',
        user: { id: current_user.id, name: current_user.full_name },
        is_typing: data['is_typing']
      }
    )
  end

  # Client marks as read
  def mark_as_read
    mark_thread_as_read
    transmit({ event: 'marked_as_read' })
  end

  private

  def find_and_authorize_thread
    thread = ConversationThread.find(params[:thread_id])

    # Verify user can access this thread
    unless thread.participants.exists?(user_id: current_user.id) ||
           InterventionPolicy.new(user_context, thread.intervention).show?
      reject
      return nil
    end

    thread
  end

  def mark_as_active
    participant = @thread.participants.find_or_create_by(user: current_user)
    participant.update!(last_active_at: Time.current, is_online: true)

    broadcast_presence_update
  end

  def mark_as_inactive
    participant = @thread.participants.find_by(user: current_user)
    participant&.update!(is_online: false)

    broadcast_presence_update
  end

  def broadcast_presence_update
    online_users = @thread.participants.where(is_online: true).includes(:user)

    ConversationChannel.broadcast_to(
      @thread,
      {
        event: 'presence_update',
        online_users: online_users.map { |p| { id: p.user_id, name: p.user.full_name } }
      }
    )
  end

  def transmit_recent_messages
    messages = @thread.messages
                      .includes(:sender)
                      .order(created_at: :desc)
                      .limit(50)
                      .reverse

    transmit({
      event: 'recent_messages',
      messages: messages.map { |m| message_payload(m) },
      thread: thread_payload
    })
  end

  def mark_thread_as_read
    participant = @thread.participants.find_by(user: current_user)
    participant&.update!(last_read_at: Time.current)
  end

  def message_payload(message)
    {
      id: message.id,
      content: message.content,
      message_type: message.message_type,
      sender: {
        id: message.sender_id,
        name: message.sender.full_name,
        avatar_url: message.sender.avatar_url
      },
      created_at: message.created_at.iso8601,
      attachments: message.attachments.map { |a| attachment_payload(a) }
    }
  end

  def attachment_payload(attachment)
    {
      id: attachment.id,
      filename: attachment.filename.to_s,
      content_type: attachment.content_type,
      url: Rails.application.routes.url_helpers.rails_blob_url(attachment, only_path: true)
    }
  end

  def thread_payload
    {
      id: @thread.id,
      intervention_id: @thread.intervention_id,
      intervention_reference: @thread.intervention.reference,
      participants_count: @thread.participants.count,
      messages_count: @thread.messages.count
    }
  end
end
```

---

## 8.5 Dashboard Channel

Real-time dashboard updates for managers.

```ruby
# app/channels/dashboard_channel.rb
class DashboardChannel < ApplicationCable::Channel
  def subscribed
    return reject unless current_user.gestionnaire? || current_user.admin?

    stream_from "team_#{current_team.id}_dashboard"

    # Send initial stats
    transmit_dashboard_stats
  end

  def unsubscribed
    stop_all_streams
  end

  # Client requests refresh
  def refresh_stats
    transmit_dashboard_stats
  end

  private

  def transmit_dashboard_stats
    stats = Dashboard::StatsCalculator.call(team: current_team)

    transmit({
      event: 'stats_update',
      stats: stats.data,
      timestamp: Time.current.iso8601
    })
  end
end
```

### 8.5.1 Dashboard Stats Calculator

```ruby
# app/services/dashboard/stats_calculator.rb
module Dashboard
  class StatsCalculator < ApplicationService
    def initialize(team:)
      @team = team
    end

    def call
      success(calculate_stats)
    end

    private

    def calculate_stats
      {
        interventions: intervention_stats,
        buildings: building_stats,
        quotes: quote_stats,
        recent_activity: recent_activity
      }
    end

    def intervention_stats
      interventions = @team.interventions

      {
        total: interventions.count,
        pending: interventions.pending_statuses.count,
        in_progress: interventions.in_progress_statuses.count,
        completed_this_month: interventions.completed.where('completed_at >= ?', Time.current.beginning_of_month).count,
        by_status: interventions.group(:status).count,
        by_priority: interventions.group(:priority).count
      }
    end

    def building_stats
      {
        total: @team.buildings.kept.count,
        total_lots: @team.lots.kept.count,
        occupied_lots: @team.lots.kept.joins(:contracts).merge(Contract.active).distinct.count
      }
    end

    def quote_stats
      quotes = InterventionQuote.joins(:intervention).where(interventions: { team_id: @team.id })

      {
        pending: quotes.pending.count,
        total_this_month: quotes.where('created_at >= ?', Time.current.beginning_of_month).count,
        average_amount: quotes.accepted.average(:amount)&.round(2)
      }
    end

    def recent_activity
      ActivityLog
        .where(team_id: @team.id)
        .includes(:user)
        .order(created_at: :desc)
        .limit(10)
        .map { |log| activity_payload(log) }
    end

    def activity_payload(log)
      {
        id: log.id,
        action: log.action,
        entity_type: log.entity_type,
        entity_id: log.entity_id,
        user: log.user ? { id: log.user.id, name: log.user.full_name } : nil,
        metadata: log.metadata,
        created_at: log.created_at.iso8601
      }
    end
  end
end
```

---

## 8.6 Client-Side Integration

### 8.6.1 JavaScript Consumer (Stimulus)

```javascript
// app/javascript/controllers/notifications_controller.js
import { Controller } from "@hotwired/stimulus"
import consumer from "../channels/consumer"

export default class extends Controller {
  static targets = ["badge", "list"]
  static values = { userId: String }

  connect() {
    this.subscription = consumer.subscriptions.create(
      { channel: "NotificationsChannel" },
      {
        connected: () => this.connected(),
        disconnected: () => this.disconnected(),
        received: (data) => this.received(data)
      }
    )
  }

  disconnect() {
    if (this.subscription) {
      this.subscription.unsubscribe()
    }
  }

  connected() {
    console.log("Connected to NotificationsChannel")
  }

  disconnected() {
    console.log("Disconnected from NotificationsChannel")
  }

  received(data) {
    switch (data.event) {
      case "new_notification":
        this.handleNewNotification(data.notification)
        break
      case "unread_count":
        this.updateBadge(data.count)
        break
    }
  }

  handleNewNotification(notification) {
    // Update badge
    this.incrementBadge()

    // Add to list if visible
    if (this.hasListTarget) {
      this.prependToList(notification)
    }

    // Show toast notification
    this.showToast(notification)

    // Play sound if enabled
    if (this.soundEnabled) {
      this.playNotificationSound()
    }
  }

  updateBadge(count) {
    if (this.hasBadgeTarget) {
      this.badgeTarget.textContent = count > 99 ? "99+" : count
      this.badgeTarget.classList.toggle("hidden", count === 0)
    }
  }

  incrementBadge() {
    if (this.hasBadgeTarget) {
      const current = parseInt(this.badgeTarget.textContent) || 0
      this.updateBadge(current + 1)
    }
  }

  prependToList(notification) {
    const html = this.notificationHTML(notification)
    this.listTarget.insertAdjacentHTML("afterbegin", html)
  }

  showToast(notification) {
    // Dispatch custom event for toast system
    window.dispatchEvent(new CustomEvent("notification:received", {
      detail: notification
    }))
  }

  markAsRead(event) {
    const notificationId = event.currentTarget.dataset.notificationId
    this.subscription.perform("mark_as_read", { notification_id: notificationId })
  }

  markAllAsRead() {
    this.subscription.perform("mark_all_as_read")
  }

  notificationHTML(notification) {
    return `
      <div class="notification-item unread" data-notification-id="${notification.id}">
        <div class="notification-content">
          <h4>${notification.title}</h4>
          <p>${notification.body}</p>
          <time datetime="${notification.created_at}">
            ${this.formatTime(notification.created_at)}
          </time>
        </div>
        <button data-action="click->notifications#markAsRead"
                data-notification-id="${notification.id}">
          Mark as read
        </button>
      </div>
    `
  }

  formatTime(isoString) {
    return new Date(isoString).toLocaleString()
  }
}
```

### 8.6.2 React/Hotwire Consumer

```javascript
// app/javascript/channels/intervention_channel.js
import consumer from "./consumer"

export function subscribeToIntervention(interventionId, callbacks) {
  return consumer.subscriptions.create(
    {
      channel: "InterventionChannel",
      intervention_id: interventionId
    },
    {
      connected() {
        console.log(`Connected to Intervention ${interventionId}`)
        callbacks.onConnected?.()
      },

      disconnected() {
        console.log(`Disconnected from Intervention ${interventionId}`)
        callbacks.onDisconnected?.()
      },

      received(data) {
        switch (data.event) {
          case "status_changed":
            callbacks.onStatusChanged?.(data)
            break
          case "presence":
            callbacks.onPresence?.(data)
            break
          case "state":
            callbacks.onState?.(data)
            break
        }
      },

      requestState() {
        this.perform("request_state")
      }
    }
  )
}
```

### 8.6.3 Chat Controller

```javascript
// app/javascript/controllers/chat_controller.js
import { Controller } from "@hotwired/stimulus"
import consumer from "../channels/consumer"

export default class extends Controller {
  static targets = ["messages", "input", "typingIndicator"]
  static values = { threadId: String }

  connect() {
    this.typingTimeout = null
    this.isTyping = false

    this.subscription = consumer.subscriptions.create(
      {
        channel: "ConversationChannel",
        thread_id: this.threadIdValue
      },
      {
        connected: () => this.connected(),
        received: (data) => this.received(data)
      }
    )
  }

  disconnect() {
    this.subscription?.unsubscribe()
  }

  connected() {
    this.scrollToBottom()
  }

  received(data) {
    switch (data.event) {
      case "new_message":
        this.appendMessage(data.message)
        this.scrollToBottom()
        break
      case "recent_messages":
        this.renderMessages(data.messages)
        this.scrollToBottom()
        break
      case "typing":
        this.handleTyping(data)
        break
      case "presence_update":
        this.updatePresence(data.online_users)
        break
    }
  }

  sendMessage(event) {
    event.preventDefault()

    const content = this.inputTarget.value.trim()
    if (!content) return

    this.subscription.perform("send_message", { content })
    this.inputTarget.value = ""
    this.stopTyping()
  }

  handleInput() {
    if (!this.isTyping) {
      this.isTyping = true
      this.subscription.perform("typing", { is_typing: true })
    }

    clearTimeout(this.typingTimeout)
    this.typingTimeout = setTimeout(() => this.stopTyping(), 2000)
  }

  stopTyping() {
    if (this.isTyping) {
      this.isTyping = false
      this.subscription.perform("typing", { is_typing: false })
    }
  }

  handleTyping(data) {
    if (data.user.id === this.currentUserId) return

    if (data.is_typing) {
      this.typingIndicatorTarget.textContent = `${data.user.name} is typing...`
      this.typingIndicatorTarget.classList.remove("hidden")
    } else {
      this.typingIndicatorTarget.classList.add("hidden")
    }
  }

  appendMessage(message) {
    const html = this.messageHTML(message)
    this.messagesTarget.insertAdjacentHTML("beforeend", html)
  }

  renderMessages(messages) {
    this.messagesTarget.innerHTML = messages
      .map(m => this.messageHTML(m))
      .join("")
  }

  messageHTML(message) {
    const isOwn = message.sender.id === this.currentUserId
    return `
      <div class="message ${isOwn ? 'own' : 'other'}">
        <div class="message-header">
          <span class="sender">${message.sender.name}</span>
          <time>${this.formatTime(message.created_at)}</time>
        </div>
        <div class="message-content">${this.escapeHtml(message.content)}</div>
      </div>
    `
  }

  scrollToBottom() {
    this.messagesTarget.scrollTop = this.messagesTarget.scrollHeight
  }

  formatTime(isoString) {
    return new Date(isoString).toLocaleTimeString()
  }

  escapeHtml(text) {
    const div = document.createElement("div")
    div.textContent = text
    return div.innerHTML
  }

  get currentUserId() {
    return document.body.dataset.currentUserId
  }
}
```

---

## 8.7 Testing ActionCable

```ruby
# spec/channels/notifications_channel_spec.rb
require 'rails_helper'

RSpec.describe NotificationsChannel, type: :channel do
  let(:user) { create(:user) }
  let(:team) { create(:team) }

  before do
    stub_connection(current_user: user, current_team: team)
  end

  describe '#subscribed' do
    it 'successfully subscribes' do
      subscribe

      expect(subscription).to be_confirmed
      expect(subscription).to have_stream_for(user)
    end

    it 'streams team notifications' do
      subscribe

      expect(subscription).to have_stream_from("team_#{team.id}_notifications")
    end

    it 'transmits unread count on subscribe' do
      create_list(:notification, 3, user: user, read_at: nil)

      subscribe

      expect(transmissions.last).to include(
        'event' => 'unread_count',
        'count' => 3
      )
    end
  end

  describe '#mark_as_read' do
    let!(:notification) { create(:notification, user: user, read_at: nil) }

    it 'marks notification as read' do
      subscribe

      expect {
        perform :mark_as_read, notification_id: notification.id
      }.to change { notification.reload.read_at }.from(nil)
    end

    it 'transmits updated unread count' do
      subscribe
      perform :mark_as_read, notification_id: notification.id

      expect(transmissions.last).to include(
        'event' => 'unread_count',
        'count' => 0
      )
    end
  end
end

# spec/channels/conversation_channel_spec.rb
RSpec.describe ConversationChannel, type: :channel do
  let(:user) { create(:user, :gestionnaire) }
  let(:team) { create(:team) }
  let(:intervention) { create(:intervention, team: team) }
  let(:thread) { create(:conversation_thread, intervention: intervention) }

  before do
    create(:team_member, team: team, user: user)
    create(:conversation_participant, thread: thread, user: user)
    stub_connection(current_user: user, current_team: team)
  end

  describe '#subscribed' do
    it 'subscribes to thread' do
      subscribe(thread_id: thread.id)

      expect(subscription).to be_confirmed
      expect(subscription).to have_stream_for(thread)
    end

    it 'rejects unauthorized users' do
      other_thread = create(:conversation_thread)

      subscribe(thread_id: other_thread.id)

      expect(subscription).to be_rejected
    end
  end

  describe '#send_message' do
    it 'creates and broadcasts message' do
      subscribe(thread_id: thread.id)

      expect {
        perform :send_message, content: 'Hello!'
      }.to change(ConversationMessage, :count).by(1)

      expect(transmissions.last['event']).to eq('new_message')
    end
  end
end
```

---

*End of Section 8 - Real-time Communication (ActionCable)*

---

# 9. REST API

SEIDO provides a RESTful API for mobile apps and third-party integrations. This section covers API design, authentication, versioning, and best practices.

## 9.1 API Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           API ARCHITECTURE                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────────────┐    ┌────────────┐    ┌────────────┐    ┌────────────┐   │
│  │   Mobile   │    │   Web SPA  │    │  Third-    │    │  Webhooks  │   │
│  │    Apps    │    │   (React)  │    │   Party    │    │  (Stripe)  │   │
│  └─────┬──────┘    └─────┬──────┘    └─────┬──────┘    └─────┬──────┘   │
│        │                 │                 │                 │          │
│        └─────────────────┼─────────────────┼─────────────────┘          │
│                          │                 │                            │
│                          ▼                 ▼                            │
│                ┌─────────────────────────────────────┐                  │
│                │         API Gateway (Rack)          │                  │
│                │  • Rate Limiting (Rack::Attack)     │                  │
│                │  • Request Logging                  │                  │
│                │  • CORS                             │                  │
│                └───────────────┬─────────────────────┘                  │
│                                │                                        │
│                                ▼                                        │
│                ┌─────────────────────────────────────┐                  │
│                │       Authentication Layer          │                  │
│                │  • JWT (devise-jwt)                 │                  │
│                │  • API Key (for webhooks)           │                  │
│                └───────────────┬─────────────────────┘                  │
│                                │                                        │
│                                ▼                                        │
│                ┌─────────────────────────────────────┐                  │
│                │       Authorization Layer           │                  │
│                │  • Pundit Policies                  │                  │
│                │  • Scope Filtering                  │                  │
│                └───────────────┬─────────────────────┘                  │
│                                │                                        │
│                                ▼                                        │
│           ┌────────────────────────────────────────────┐                │
│           │              API Controllers               │                │
│           │  /api/v1/interventions                     │                │
│           │  /api/v1/buildings                         │                │
│           │  /api/v1/quotes                            │                │
│           └────────────────────────────────────────────┘                │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 9.2 API Authentication (JWT)

### 9.2.1 Devise JWT Configuration

```ruby
# Gemfile
gem 'devise-jwt'

# config/initializers/devise.rb
Devise.setup do |config|
  config.jwt do |jwt|
    jwt.secret = Rails.application.credentials.devise_jwt_secret_key!
    jwt.dispatch_requests = [
      ['POST', %r{^/api/v1/auth/sign_in$}],
      ['POST', %r{^/api/v1/auth/refresh$}]
    ]
    jwt.revocation_requests = [
      ['DELETE', %r{^/api/v1/auth/sign_out$}]
    ]
    jwt.expiration_time = 1.day.to_i
  end
end
```

### 9.2.2 JWT Denylist Model

```ruby
# app/models/jwt_denylist.rb
class JwtDenylist < ApplicationRecord
  include Devise::JWT::RevocationStrategies::Denylist

  self.table_name = 'jwt_denylists'
end

# Migration
class CreateJwtDenylists < ActiveRecord::Migration[7.1]
  def change
    create_table :jwt_denylists do |t|
      t.string :jti, null: false
      t.datetime :exp, null: false

      t.timestamps
    end

    add_index :jwt_denylists, :jti, unique: true
    add_index :jwt_denylists, :exp
  end
end
```

### 9.2.3 User Model JWT Integration

```ruby
# app/models/user.rb
class User < ApplicationRecord
  include Devise::JWT::RevocationStrategies::JTIMatcher

  devise :database_authenticatable, :registerable,
         :recoverable, :rememberable, :validatable,
         :jwt_authenticatable, jwt_revocation_strategy: self

  def jwt_payload
    {
      'user_id' => id,
      'email' => email,
      'role' => role,
      'team_ids' => team_ids
    }
  end

  def team_ids
    team_memberships.kept.pluck(:team_id)
  end
end
```

### 9.2.4 Authentication Controller

```ruby
# app/controllers/api/v1/auth/sessions_controller.rb
module Api
  module V1
    module Auth
      class SessionsController < Devise::SessionsController
        respond_to :json

        private

        def respond_with(resource, _opts = {})
          render json: {
            status: 'success',
            data: {
              user: UserSerializer.new(resource).as_json,
              token: request.env['warden-jwt_auth.token']
            }
          }
        end

        def respond_to_on_destroy
          if current_user
            render json: { status: 'success', message: 'Signed out successfully' }
          else
            render json: { status: 'error', message: 'No active session' }, status: :unauthorized
          end
        end
      end
    end
  end
end
```

### 9.2.5 Token Refresh

```ruby
# app/controllers/api/v1/auth/tokens_controller.rb
module Api
  module V1
    module Auth
      class TokensController < Api::V1::BaseController
        skip_before_action :authenticate_user!, only: [:refresh]

        def refresh
          token = request.headers['Authorization']&.split(' ')&.last
          return render_unauthorized('No token provided') unless token

          begin
            decoded = JWT.decode(
              token,
              Rails.application.credentials.devise_jwt_secret_key!,
              true,
              { algorithm: 'HS256', verify_expiration: false }
            ).first

            user = User.find(decoded['user_id'])

            # Check if token is within refresh window (expired < 7 days ago)
            exp_time = Time.at(decoded['exp'])
            if exp_time < 7.days.ago
              return render_unauthorized('Token too old to refresh')
            end

            # Generate new token
            new_token = Warden::JWTAuth::UserEncoder.new.call(user, :user, nil).first

            render json: {
              status: 'success',
              data: {
                token: new_token,
                expires_at: 1.day.from_now.iso8601
              }
            }
          rescue JWT::DecodeError
            render_unauthorized('Invalid token')
          rescue ActiveRecord::RecordNotFound
            render_unauthorized('User not found')
          end
        end
      end
    end
  end
end
```

---

## 9.3 Base API Controller

```ruby
# app/controllers/api/v1/base_controller.rb
module Api
  module V1
    class BaseController < ActionController::API
      include Pundit::Authorization

      before_action :authenticate_user!
      before_action :set_current_team
      around_action :set_time_zone

      rescue_from ActiveRecord::RecordNotFound, with: :render_not_found
      rescue_from ActiveRecord::RecordInvalid, with: :render_unprocessable_entity
      rescue_from Pundit::NotAuthorizedError, with: :render_forbidden
      rescue_from ActionController::ParameterMissing, with: :render_bad_request

      protected

      def set_current_team
        team_id = request.headers['X-Team-ID'] || params[:team_id]

        if team_id
          @current_team = current_user.teams.find_by(id: team_id)
          ActsAsTenant.current_tenant = @current_team
        else
          # Default to first team
          @current_team = current_user.teams.first
          ActsAsTenant.current_tenant = @current_team
        end

        render_forbidden('No team access') unless @current_team
      end

      def set_time_zone(&block)
        time_zone = current_user.time_zone || 'Paris'
        Time.use_zone(time_zone, &block)
      end

      def pundit_user
        UserContext.new(current_user, @current_team)
      end

      # Pagination helpers
      def page
        (params[:page] || 1).to_i
      end

      def per_page
        [(params[:per_page] || 25).to_i, 100].min
      end

      def pagination_meta(collection)
        {
          current_page: collection.current_page,
          total_pages: collection.total_pages,
          total_count: collection.total_count,
          per_page: collection.limit_value
        }
      end

      # Response helpers
      def render_success(data, status: :ok, meta: {})
        render json: {
          status: 'success',
          data: data,
          meta: meta
        }, status: status
      end

      def render_created(data, location: nil)
        response = {
          status: 'success',
          data: data
        }
        render json: response, status: :created, location: location
      end

      def render_no_content
        head :no_content
      end

      def render_not_found(exception = nil)
        render json: {
          status: 'error',
          error: {
            code: 'NOT_FOUND',
            message: exception&.message || 'Resource not found'
          }
        }, status: :not_found
      end

      def render_unprocessable_entity(exception)
        render json: {
          status: 'error',
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: exception.record.errors.full_messages
          }
        }, status: :unprocessable_entity
      end

      def render_forbidden(message = 'Access denied')
        render json: {
          status: 'error',
          error: {
            code: 'FORBIDDEN',
            message: message
          }
        }, status: :forbidden
      end

      def render_unauthorized(message = 'Unauthorized')
        render json: {
          status: 'error',
          error: {
            code: 'UNAUTHORIZED',
            message: message
          }
        }, status: :unauthorized
      end

      def render_bad_request(exception)
        render json: {
          status: 'error',
          error: {
            code: 'BAD_REQUEST',
            message: exception.message
          }
        }, status: :bad_request
      end
    end
  end
end
```

---

## 9.4 API Endpoints

### 9.4.1 Routes Configuration

```ruby
# config/routes.rb
Rails.application.routes.draw do
  namespace :api do
    namespace :v1 do
      # Authentication
      devise_for :users,
        path: 'auth',
        controllers: {
          sessions: 'api/v1/auth/sessions',
          registrations: 'api/v1/auth/registrations'
        }

      post 'auth/refresh', to: 'auth/tokens#refresh'

      # User
      resource :me, only: [:show, :update], controller: 'users/me'

      # Teams
      resources :teams, only: [:index, :show] do
        resources :members, only: [:index, :create, :destroy], controller: 'teams/members'
        resources :invitations, only: [:index, :create], controller: 'teams/invitations'
      end

      # Properties
      resources :buildings do
        resources :lots, only: [:index, :create]
        resources :contacts, only: [:index], controller: 'buildings/contacts'
        resources :documents, only: [:index, :create], controller: 'buildings/documents'
      end

      resources :lots do
        resources :contacts, only: [:index], controller: 'lots/contacts'
        resources :contracts, only: [:index], controller: 'lots/contracts'
        resources :interventions, only: [:index], controller: 'lots/interventions'
      end

      # Interventions
      resources :interventions do
        member do
          post :approve
          post :reject
          post :request_quote
          post :schedule
          post :start
          post :complete
          post :validate
          post :close
          post :cancel
        end

        resources :quotes, only: [:index, :create, :show], controller: 'interventions/quotes' do
          member do
            post :accept
            post :reject
          end
        end

        resources :time_slots, only: [:index, :create], controller: 'interventions/time_slots' do
          member do
            post :respond
          end
        end

        resources :comments, only: [:index, :create], controller: 'interventions/comments'
        resources :documents, only: [:index, :create], controller: 'interventions/documents'
        resource :conversation, only: [:show], controller: 'interventions/conversation' do
          resources :messages, only: [:index, :create]
        end
      end

      # Contacts
      resources :contacts do
        resources :buildings, only: [:index], controller: 'contacts/buildings'
        resources :lots, only: [:index], controller: 'contacts/lots'
      end

      # Contracts
      resources :contracts, only: [:index, :show, :create, :update] do
        resources :documents, only: [:index, :create], controller: 'contracts/documents'
      end

      # Notifications
      resources :notifications, only: [:index, :show] do
        collection do
          post :mark_all_read
        end
        member do
          post :mark_read
        end
      end

      # Dashboard
      resource :dashboard, only: [:show], controller: 'dashboard'

      # Search
      post 'search', to: 'search#search'
    end
  end

  # Stripe webhooks (outside API namespace - no auth required)
  post 'webhooks/stripe', to: 'webhooks/stripe#create'
end
```

### 9.4.2 Interventions Controller

```ruby
# app/controllers/api/v1/interventions_controller.rb
module Api
  module V1
    class InterventionsController < BaseController
      before_action :set_intervention, only: [:show, :update, :destroy, :approve, :reject,
                                              :request_quote, :schedule, :start, :complete,
                                              :validate, :close, :cancel]

      def index
        @interventions = policy_scope(Intervention)
                          .includes(:lot, :building, :assigned_users, :quotes)
                          .order(created_at: :desc)

        # Filters
        @interventions = @interventions.where(status: params[:status]) if params[:status]
        @interventions = @interventions.where(priority: params[:priority]) if params[:priority]
        @interventions = @interventions.where(lot_id: params[:lot_id]) if params[:lot_id]

        # Date range
        if params[:from_date]
          @interventions = @interventions.where('created_at >= ?', Date.parse(params[:from_date]))
        end
        if params[:to_date]
          @interventions = @interventions.where('created_at <= ?', Date.parse(params[:to_date]).end_of_day)
        end

        @interventions = @interventions.page(page).per(per_page)

        render_success(
          @interventions.map { |i| InterventionSerializer.new(i).as_json },
          meta: pagination_meta(@interventions)
        )
      end

      def show
        authorize @intervention
        render_success(InterventionSerializer.new(@intervention, include_details: true).as_json)
      end

      def create
        @intervention = Intervention.new(intervention_params)
        @intervention.team = @current_team
        @intervention.created_by = current_user

        authorize @intervention

        result = Interventions::Creator.call(
          intervention: @intervention,
          user: current_user
        )

        if result.success?
          render_created(
            InterventionSerializer.new(result.data).as_json,
            location: api_v1_intervention_url(result.data)
          )
        else
          render json: {
            status: 'error',
            error: { code: 'CREATION_FAILED', message: result.error }
          }, status: :unprocessable_entity
        end
      end

      def update
        authorize @intervention

        if @intervention.update(intervention_params)
          render_success(InterventionSerializer.new(@intervention).as_json)
        else
          render json: {
            status: 'error',
            error: {
              code: 'VALIDATION_ERROR',
              details: @intervention.errors.full_messages
            }
          }, status: :unprocessable_entity
        end
      end

      def destroy
        authorize @intervention

        @intervention.discard!
        render_no_content
      end

      # Status transitions
      def approve
        authorize @intervention, :approve?
        transition_intervention(:approve, comment: params[:comment])
      end

      def reject
        authorize @intervention, :reject?
        transition_intervention(:reject, reason: params[:reason])
      end

      def request_quote
        authorize @intervention, :request_quote?
        transition_intervention(:request_quote, provider_ids: params[:provider_ids])
      end

      def schedule
        authorize @intervention, :schedule?
        transition_intervention(:schedule, scheduled_at: params[:scheduled_at])
      end

      def start
        authorize @intervention, :start?
        transition_intervention(:start)
      end

      def complete
        authorize @intervention, :complete?
        transition_intervention(:complete_by_provider, report: params[:report])
      end

      def validate
        authorize @intervention, :validate?
        transition_intervention(:validate_by_tenant, rating: params[:rating], feedback: params[:feedback])
      end

      def close
        authorize @intervention, :close?
        transition_intervention(:close, final_cost: params[:final_cost])
      end

      def cancel
        authorize @intervention, :cancel?
        transition_intervention(:cancel, reason: params[:reason])
      end

      private

      def set_intervention
        @intervention = policy_scope(Intervention).find(params[:id])
      end

      def intervention_params
        params.require(:intervention).permit(
          :lot_id, :title, :description, :priority, :category,
          :requires_tenant_presence, :estimated_cost,
          :scheduled_date, :scheduled_time_start, :scheduled_time_end
        )
      end

      def transition_intervention(event, **options)
        result = Interventions::StatusUpdater.call(
          intervention: @intervention,
          event: event,
          user: current_user,
          **options
        )

        if result.success?
          render_success(InterventionSerializer.new(@intervention.reload).as_json)
        else
          render json: {
            status: 'error',
            error: {
              code: 'TRANSITION_FAILED',
              message: result.error,
              current_status: @intervention.status,
              available_events: @intervention.aasm.events.map(&:name)
            }
          }, status: :unprocessable_entity
        end
      end
    end
  end
end
```

### 9.4.3 Buildings Controller

```ruby
# app/controllers/api/v1/buildings_controller.rb
module Api
  module V1
    class BuildingsController < BaseController
      before_action :set_building, only: [:show, :update, :destroy]

      def index
        @buildings = policy_scope(Building)
                      .includes(:lots, :contacts)
                      .kept
                      .order(:name)

        # Search
        if params[:q].present?
          @buildings = @buildings.where(
            'name ILIKE :q OR address ILIKE :q OR city ILIKE :q',
            q: "%#{params[:q]}%"
          )
        end

        @buildings = @buildings.page(page).per(per_page)

        render_success(
          @buildings.map { |b| BuildingSerializer.new(b).as_json },
          meta: pagination_meta(@buildings)
        )
      end

      def show
        authorize @building
        render_success(BuildingSerializer.new(@building, include_details: true).as_json)
      end

      def create
        @building = Building.new(building_params)
        @building.team = @current_team

        authorize @building

        if @building.save
          render_created(
            BuildingSerializer.new(@building).as_json,
            location: api_v1_building_url(@building)
          )
        else
          render json: {
            status: 'error',
            error: {
              code: 'VALIDATION_ERROR',
              details: @building.errors.full_messages
            }
          }, status: :unprocessable_entity
        end
      end

      def update
        authorize @building

        if @building.update(building_params)
          render_success(BuildingSerializer.new(@building).as_json)
        else
          render json: {
            status: 'error',
            error: {
              code: 'VALIDATION_ERROR',
              details: @building.errors.full_messages
            }
          }, status: :unprocessable_entity
        end
      end

      def destroy
        authorize @building

        @building.discard!
        render_no_content
      end

      private

      def set_building
        @building = policy_scope(Building).find(params[:id])
      end

      def building_params
        params.require(:building).permit(
          :name, :address, :postal_code, :city, :country,
          :building_type, :construction_year, :total_floors,
          :has_elevator, :has_parking, :has_garden,
          :notes
        )
      end
    end
  end
end
```

---

## 9.5 Serializers

### 9.5.1 Base Serializer

```ruby
# app/serializers/base_serializer.rb
class BaseSerializer
  attr_reader :object, :options

  def initialize(object, **options)
    @object = object
    @options = options
  end

  def as_json
    raise NotImplementedError, 'Subclasses must implement as_json'
  end

  protected

  def include_details?
    options[:include_details] == true
  end

  def current_user
    options[:current_user]
  end

  def format_datetime(datetime)
    datetime&.iso8601
  end

  def format_date(date)
    date&.strftime('%Y-%m-%d')
  end

  def format_money(amount)
    return nil unless amount
    {
      cents: (amount * 100).to_i,
      currency: 'EUR',
      formatted: format('€%.2f', amount)
    }
  end
end
```

### 9.5.2 Intervention Serializer

```ruby
# app/serializers/intervention_serializer.rb
class InterventionSerializer < BaseSerializer
  def as_json
    base_attributes.merge(include_details? ? detail_attributes : {})
  end

  private

  def base_attributes
    {
      id: object.id,
      reference: object.reference,
      title: object.title,
      description: object.description,
      status: object.status,
      priority: object.priority,
      category: object.category,
      lot_id: object.lot_id,
      building_id: object.lot&.building_id,
      requires_tenant_presence: object.requires_tenant_presence,
      scheduled_date: format_date(object.scheduled_date),
      scheduled_time: scheduled_time_range,
      estimated_cost: format_money(object.estimated_cost),
      final_cost: format_money(object.final_cost),
      created_at: format_datetime(object.created_at),
      updated_at: format_datetime(object.updated_at),
      _links: links
    }
  end

  def detail_attributes
    {
      lot: lot_summary,
      building: building_summary,
      created_by: user_summary(object.created_by_user),
      assigned_users: object.assigned_users.map { |u| user_summary(u) },
      quotes_summary: quotes_summary,
      comments_count: object.comments.count,
      documents_count: object.documents.count,
      available_actions: available_actions,
      timeline: timeline
    }
  end

  def scheduled_time_range
    return nil unless object.scheduled_time_start
    {
      start: object.scheduled_time_start.strftime('%H:%M'),
      end: object.scheduled_time_end&.strftime('%H:%M')
    }
  end

  def lot_summary
    return nil unless object.lot
    {
      id: object.lot.id,
      reference: object.lot.reference,
      lot_type: object.lot.lot_type,
      floor: object.lot.floor
    }
  end

  def building_summary
    return nil unless object.lot&.building
    building = object.lot.building
    {
      id: building.id,
      name: building.name,
      address: building.full_address
    }
  end

  def user_summary(user)
    return nil unless user
    {
      id: user.id,
      name: user.full_name,
      role: user.role,
      avatar_url: user.avatar_url
    }
  end

  def quotes_summary
    {
      total: object.quotes.count,
      pending: object.quotes.pending.count,
      accepted: object.quotes.accepted.first&.then { |q| QuoteSerializer.new(q).as_json }
    }
  end

  def available_actions
    object.aasm.events(permitted: true).map(&:name)
  end

  def timeline
    object.activity_logs
          .order(created_at: :desc)
          .limit(10)
          .map { |log| activity_log_summary(log) }
  end

  def activity_log_summary(log)
    {
      action: log.action,
      user: user_summary(log.user),
      metadata: log.metadata,
      created_at: format_datetime(log.created_at)
    }
  end

  def links
    {
      self: Rails.application.routes.url_helpers.api_v1_intervention_path(object),
      lot: object.lot_id ? Rails.application.routes.url_helpers.api_v1_lot_path(object.lot_id) : nil,
      quotes: Rails.application.routes.url_helpers.api_v1_intervention_quotes_path(object),
      comments: Rails.application.routes.url_helpers.api_v1_intervention_comments_path(object)
    }
  end
end
```

### 9.5.3 Building Serializer

```ruby
# app/serializers/building_serializer.rb
class BuildingSerializer < BaseSerializer
  def as_json
    base_attributes.merge(include_details? ? detail_attributes : {})
  end

  private

  def base_attributes
    {
      id: object.id,
      name: object.name,
      address: object.address,
      postal_code: object.postal_code,
      city: object.city,
      country: object.country,
      building_type: object.building_type,
      lots_count: object.lots.kept.count,
      created_at: format_datetime(object.created_at),
      updated_at: format_datetime(object.updated_at),
      _links: links
    }
  end

  def detail_attributes
    {
      construction_year: object.construction_year,
      total_floors: object.total_floors,
      has_elevator: object.has_elevator,
      has_parking: object.has_parking,
      has_garden: object.has_garden,
      notes: object.notes,
      lots: object.lots.kept.map { |l| LotSerializer.new(l).as_json },
      contacts: object.contacts.map { |c| ContactSerializer.new(c).as_json },
      documents: object.documents.map { |d| DocumentSerializer.new(d).as_json },
      stats: building_stats
    }
  end

  def building_stats
    {
      total_lots: object.lots.kept.count,
      occupied_lots: object.lots.kept.joins(:contracts).merge(Contract.active).distinct.count,
      active_interventions: object.interventions.active.count,
      total_interventions: object.interventions.count
    }
  end

  def links
    {
      self: Rails.application.routes.url_helpers.api_v1_building_path(object),
      lots: Rails.application.routes.url_helpers.api_v1_building_lots_path(object),
      contacts: Rails.application.routes.url_helpers.api_v1_building_contacts_path(object),
      documents: Rails.application.routes.url_helpers.api_v1_building_documents_path(object)
    }
  end
end
```

### 9.5.4 User Serializer

```ruby
# app/serializers/user_serializer.rb
class UserSerializer < BaseSerializer
  def as_json
    {
      id: object.id,
      email: object.email,
      first_name: object.first_name,
      last_name: object.last_name,
      full_name: object.full_name,
      role: object.role,
      phone: object.phone,
      avatar_url: object.avatar_url,
      time_zone: object.time_zone,
      locale: object.locale,
      teams: teams,
      permissions: permissions,
      created_at: format_datetime(object.created_at)
    }
  end

  private

  def teams
    object.teams.map do |team|
      membership = object.team_memberships.find_by(team: team)
      {
        id: team.id,
        name: team.name,
        role: membership&.role
      }
    end
  end

  def permissions
    return [] unless current_user == object || current_user&.admin?

    object.effective_permissions.map do |key, value|
      { permission: key, granted: value }
    end
  end
end
```

---

## 9.6 Rate Limiting

### 9.6.1 Rack::Attack Configuration

```ruby
# config/initializers/rack_attack.rb
class Rack::Attack
  ### Throttle Rules ###

  # Limit general API requests by IP
  throttle('api/ip', limit: 300, period: 5.minutes) do |req|
    req.ip if req.path.start_with?('/api/')
  end

  # Limit authentication attempts
  throttle('api/auth/ip', limit: 5, period: 20.seconds) do |req|
    req.ip if req.path.include?('/auth/') && req.post?
  end

  # Stricter limit for sign_in attempts by email
  throttle('api/auth/email', limit: 5, period: 1.minute) do |req|
    if req.path == '/api/v1/auth/sign_in' && req.post?
      # Normalize email
      req.params.dig('user', 'email')&.downcase&.strip
    end
  end

  # Limit requests per authenticated user
  throttle('api/user', limit: 1000, period: 1.hour) do |req|
    if req.path.start_with?('/api/') && req.env['warden']&.user
      req.env['warden'].user.id
    end
  end

  # Limit file uploads
  throttle('api/uploads', limit: 20, period: 1.hour) do |req|
    if req.path.include?('/documents') && req.post?
      req.env['warden']&.user&.id || req.ip
    end
  end

  ### Blocklists ###

  # Block bad user agents
  blocklist('block/bad-ua') do |req|
    bad_agents = ['curl', 'wget', 'python-requests']
    bad_agents.any? { |ua| req.user_agent&.downcase&.include?(ua) } unless Rails.env.development?
  end

  ### Custom Responses ###

  self.throttled_responder = lambda do |env|
    retry_after = (env['rack.attack.match_data'] || {})[:period]

    [
      429,
      {
        'Content-Type' => 'application/json',
        'Retry-After' => retry_after.to_s
      },
      [{
        status: 'error',
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many requests. Please retry later.',
          retry_after: retry_after
        }
      }.to_json]
    ]
  end

  self.blocklisted_responder = lambda do |_env|
    [
      403,
      { 'Content-Type' => 'application/json' },
      [{
        status: 'error',
        error: {
          code: 'BLOCKED',
          message: 'Access denied'
        }
      }.to_json]
    ]
  end
end

# Enable caching for Rack::Attack
Rack::Attack.cache.store = ActiveSupport::Cache::RedisCacheStore.new(
  url: ENV.fetch('REDIS_URL', 'redis://localhost:6379/2')
)
```

---

## 9.7 API Versioning

### 9.7.1 Version Routing

```ruby
# config/routes.rb
Rails.application.routes.draw do
  namespace :api do
    namespace :v1 do
      # Current version routes (see 9.4.1)
    end

    # Future version
    namespace :v2 do
      # V2 routes when needed
    end
  end

  # Version header routing (optional)
  scope module: 'api' do
    scope module: 'v1', constraints: ApiVersion.new(version: 1, default: true) do
      # Default version routes
    end
  end
end

# lib/api_version.rb
class ApiVersion
  def initialize(version:, default: false)
    @version = version
    @default = default
  end

  def matches?(request)
    @default || check_version(request)
  end

  private

  def check_version(request)
    accept_header = request.headers['Accept']
    accept_header&.include?("application/vnd.seido.v#{@version}")
  end
end
```

### 9.7.2 Deprecation Headers

```ruby
# app/controllers/api/v1/base_controller.rb
module Api
  module V1
    class BaseController < ActionController::API
      # Add deprecation warning for old endpoints
      def add_deprecation_warning(message, sunset_date)
        response.headers['Deprecation'] = "true"
        response.headers['Sunset'] = sunset_date.httpdate
        response.headers['X-Deprecation-Notice'] = message
      end
    end
  end
end
```

---

## 9.8 API Documentation (OpenAPI/Swagger)

### 9.8.1 rswag Configuration

```ruby
# Gemfile
gem 'rswag-api'
gem 'rswag-ui'
gem 'rswag-specs', group: [:development, :test]

# config/initializers/rswag.rb
Rswag::Api.configure do |c|
  c.openapi_root = Rails.root.to_s + '/swagger'
end

Rswag::Ui.configure do |c|
  c.openapi_endpoint '/api-docs/v1/swagger.yaml', 'API V1 Docs'
end
```

### 9.8.2 API Spec Example

```ruby
# spec/requests/api/v1/interventions_spec.rb
require 'swagger_helper'

RSpec.describe 'Interventions API', type: :request do
  path '/api/v1/interventions' do
    get 'List interventions' do
      tags 'Interventions'
      description 'Returns a paginated list of interventions for the current team'
      operationId 'listInterventions'
      produces 'application/json'
      security [bearer_auth: []]

      parameter name: 'X-Team-ID', in: :header, type: :string, required: false,
                description: 'Team UUID (defaults to first team)'
      parameter name: :status, in: :query, type: :string, required: false,
                description: 'Filter by status',
                enum: Intervention.statuses.keys
      parameter name: :priority, in: :query, type: :string, required: false,
                description: 'Filter by priority',
                enum: Intervention.priorities.keys
      parameter name: :page, in: :query, type: :integer, required: false,
                description: 'Page number (default: 1)'
      parameter name: :per_page, in: :query, type: :integer, required: false,
                description: 'Items per page (default: 25, max: 100)'

      response '200', 'interventions found' do
        schema type: :object,
          properties: {
            status: { type: :string, example: 'success' },
            data: {
              type: :array,
              items: { '$ref' => '#/components/schemas/Intervention' }
            },
            meta: { '$ref' => '#/components/schemas/PaginationMeta' }
          }

        let(:Authorization) { "Bearer #{jwt_token}" }
        run_test!
      end

      response '401', 'unauthorized' do
        schema '$ref' => '#/components/schemas/Error'
        run_test!
      end
    end

    post 'Create intervention' do
      tags 'Interventions'
      description 'Creates a new intervention request'
      operationId 'createIntervention'
      consumes 'application/json'
      produces 'application/json'
      security [bearer_auth: []]

      parameter name: :intervention, in: :body, schema: {
        type: :object,
        properties: {
          intervention: {
            type: :object,
            required: [:lot_id, :title, :description, :priority],
            properties: {
              lot_id: { type: :string, format: :uuid },
              title: { type: :string, maxLength: 255 },
              description: { type: :string },
              priority: { type: :string, enum: %w[low normal high urgent] },
              category: { type: :string },
              requires_tenant_presence: { type: :boolean, default: false }
            }
          }
        }
      }

      response '201', 'intervention created' do
        schema type: :object,
          properties: {
            status: { type: :string, example: 'success' },
            data: { '$ref' => '#/components/schemas/Intervention' }
          }

        let(:intervention) { { intervention: attributes_for(:intervention) } }
        run_test!
      end

      response '422', 'validation error' do
        schema '$ref' => '#/components/schemas/ValidationError'
        run_test!
      end
    end
  end

  path '/api/v1/interventions/{id}' do
    parameter name: :id, in: :path, type: :string, format: :uuid,
              description: 'Intervention UUID'

    get 'Get intervention' do
      tags 'Interventions'
      description 'Returns detailed information about an intervention'
      operationId 'getIntervention'
      produces 'application/json'
      security [bearer_auth: []]

      response '200', 'intervention found' do
        schema type: :object,
          properties: {
            status: { type: :string },
            data: { '$ref' => '#/components/schemas/InterventionDetail' }
          }

        let(:id) { create(:intervention).id }
        run_test!
      end

      response '404', 'intervention not found' do
        schema '$ref' => '#/components/schemas/Error'

        let(:id) { 'non-existent-uuid' }
        run_test!
      end
    end
  end
end
```

### 9.8.3 Schema Components

```yaml
# swagger/v1/swagger.yaml (generated + customized)
openapi: 3.0.1
info:
  title: SEIDO API
  version: v1
  description: |
    API for SEIDO property management platform.

    ## Authentication
    All endpoints require JWT authentication via Bearer token.

    ## Rate Limiting
    - 300 requests per 5 minutes per IP
    - 1000 requests per hour per authenticated user

    ## Pagination
    List endpoints support `page` and `per_page` parameters.

servers:
  - url: https://api.seido.app
    description: Production
  - url: https://staging-api.seido.app
    description: Staging
  - url: http://localhost:3000
    description: Development

components:
  securitySchemes:
    bearer_auth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  schemas:
    Intervention:
      type: object
      properties:
        id:
          type: string
          format: uuid
        reference:
          type: string
          example: "INT-2024-001234"
        title:
          type: string
        description:
          type: string
        status:
          type: string
          enum: [demande, rejetee, approuvee, demande_de_devis, planification,
                 planifiee, en_cours, cloturee_par_prestataire,
                 cloturee_par_locataire, cloturee_par_gestionnaire, annulee]
        priority:
          type: string
          enum: [low, normal, high, urgent]
        lot_id:
          type: string
          format: uuid
        created_at:
          type: string
          format: date-time
        updated_at:
          type: string
          format: date-time
        _links:
          $ref: '#/components/schemas/Links'

    PaginationMeta:
      type: object
      properties:
        current_page:
          type: integer
        total_pages:
          type: integer
        total_count:
          type: integer
        per_page:
          type: integer

    Error:
      type: object
      properties:
        status:
          type: string
          example: error
        error:
          type: object
          properties:
            code:
              type: string
            message:
              type: string

    ValidationError:
      type: object
      properties:
        status:
          type: string
          example: error
        error:
          type: object
          properties:
            code:
              type: string
              example: VALIDATION_ERROR
            message:
              type: string
            details:
              type: array
              items:
                type: string
```

---

## 9.9 Webhooks (Stripe)

### 9.9.1 Webhook Controller

```ruby
# app/controllers/webhooks/stripe_controller.rb
module Webhooks
  class StripeController < ActionController::API
    before_action :verify_signature

    def create
      event_type = @event.type
      data = @event.data.object

      case event_type
      when 'customer.subscription.created'
        handle_subscription_created(data)
      when 'customer.subscription.updated'
        handle_subscription_updated(data)
      when 'customer.subscription.deleted'
        handle_subscription_deleted(data)
      when 'invoice.payment_succeeded'
        handle_payment_succeeded(data)
      when 'invoice.payment_failed'
        handle_payment_failed(data)
      else
        Rails.logger.info("[Stripe Webhook] Unhandled event: #{event_type}")
      end

      render json: { received: true }, status: :ok
    rescue Stripe::SignatureVerificationError
      render json: { error: 'Invalid signature' }, status: :bad_request
    rescue StandardError => e
      Rails.logger.error("[Stripe Webhook] Error: #{e.message}")
      render json: { error: 'Webhook processing failed' }, status: :internal_server_error
    end

    private

    def verify_signature
      payload = request.body.read
      sig_header = request.headers['Stripe-Signature']
      endpoint_secret = Rails.application.credentials.dig(:stripe, :webhook_secret)

      @event = Stripe::Webhook.construct_event(payload, sig_header, endpoint_secret)
    end

    def handle_subscription_created(subscription)
      StripeWebhookProcessorJob.perform_later('subscription_created', subscription.to_hash)
    end

    def handle_subscription_updated(subscription)
      StripeWebhookProcessorJob.perform_later('subscription_updated', subscription.to_hash)
    end

    def handle_subscription_deleted(subscription)
      StripeWebhookProcessorJob.perform_later('subscription_deleted', subscription.to_hash)
    end

    def handle_payment_succeeded(invoice)
      StripeWebhookProcessorJob.perform_later('payment_succeeded', invoice.to_hash)
    end

    def handle_payment_failed(invoice)
      StripeWebhookProcessorJob.perform_later('payment_failed', invoice.to_hash)
    end
  end
end
```

---

## 9.10 Testing API Endpoints

```ruby
# spec/support/api_helpers.rb
module ApiHelpers
  def json_response
    JSON.parse(response.body, symbolize_names: true)
  end

  def auth_headers(user)
    token = Warden::JWTAuth::UserEncoder.new.call(user, :user, nil).first
    { 'Authorization' => "Bearer #{token}" }
  end

  def team_headers(team)
    { 'X-Team-ID' => team.id }
  end

  def api_headers(user, team = nil)
    headers = auth_headers(user)
    headers.merge!(team_headers(team)) if team
    headers.merge!('Content-Type' => 'application/json')
    headers
  end
end

RSpec.configure do |config|
  config.include ApiHelpers, type: :request
end

# spec/requests/api/v1/interventions_spec.rb
RSpec.describe 'Interventions API', type: :request do
  let(:user) { create(:user, :gestionnaire) }
  let(:team) { create(:team) }
  let!(:membership) { create(:team_member, user: user, team: team) }
  let(:headers) { api_headers(user, team) }

  describe 'GET /api/v1/interventions' do
    let!(:interventions) { create_list(:intervention, 3, team: team) }
    let!(:other_intervention) { create(:intervention) }

    it 'returns team interventions' do
      get '/api/v1/interventions', headers: headers

      expect(response).to have_http_status(:ok)
      expect(json_response[:status]).to eq('success')
      expect(json_response[:data].length).to eq(3)
    end

    it 'filters by status' do
      create(:intervention, team: team, status: :planifiee)

      get '/api/v1/interventions', params: { status: 'planifiee' }, headers: headers

      expect(json_response[:data].length).to eq(1)
      expect(json_response[:data].first[:status]).to eq('planifiee')
    end

    it 'paginates results' do
      create_list(:intervention, 30, team: team)

      get '/api/v1/interventions', params: { page: 2, per_page: 10 }, headers: headers

      expect(json_response[:data].length).to eq(10)
      expect(json_response[:meta][:current_page]).to eq(2)
      expect(json_response[:meta][:total_pages]).to eq(4) # 33 total
    end
  end

  describe 'POST /api/v1/interventions' do
    let(:lot) { create(:lot, team: team) }
    let(:valid_params) do
      {
        intervention: {
          lot_id: lot.id,
          title: 'Fuite d\'eau',
          description: 'Fuite sous l\'évier de la cuisine',
          priority: 'high',
          category: 'plomberie'
        }
      }
    end

    it 'creates an intervention' do
      expect {
        post '/api/v1/interventions', params: valid_params.to_json, headers: headers
      }.to change(Intervention, :count).by(1)

      expect(response).to have_http_status(:created)
      expect(json_response[:data][:title]).to eq('Fuite d\'eau')
    end

    it 'returns validation errors' do
      invalid_params = { intervention: { title: '' } }

      post '/api/v1/interventions', params: invalid_params.to_json, headers: headers

      expect(response).to have_http_status(:unprocessable_entity)
      expect(json_response[:error][:code]).to eq('VALIDATION_ERROR')
    end
  end

  describe 'POST /api/v1/interventions/:id/approve' do
    let(:intervention) { create(:intervention, team: team, status: :demande) }

    it 'approves the intervention' do
      post "/api/v1/interventions/#{intervention.id}/approve",
           params: { comment: 'Approved' }.to_json,
           headers: headers

      expect(response).to have_http_status(:ok)
      expect(intervention.reload.status).to eq('approuvee')
    end

    context 'when transition is invalid' do
      let(:intervention) { create(:intervention, team: team, status: :planifiee) }

      it 'returns error with available actions' do
        post "/api/v1/interventions/#{intervention.id}/approve", headers: headers

        expect(response).to have_http_status(:unprocessable_entity)
        expect(json_response[:error][:available_events]).to be_present
      end
    end
  end
end
```

---

*End of Section 9 - REST API*

---

# 10. Testing Strategy

A comprehensive testing strategy ensures reliability and confidence when deploying changes. SEIDO follows a testing pyramid approach with emphasis on model and policy specs.

## 10.1 Testing Philosophy

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         TESTING PYRAMID                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│                              ▲                                           │
│                             / \                                          │
│                            /   \                                         │
│                           / E2E \     5% - Critical user flows           │
│                          /───────\                                       │
│                         /         \                                      │
│                        / Integration\   15% - API, controllers           │
│                       /─────────────\                                    │
│                      /               \                                   │
│                     /     Unit        \   80% - Models, services,        │
│                    /                   \       policies, jobs            │
│                   /─────────────────────\                                │
│                                                                          │
│  Coverage Targets:                                                       │
│  • Models: 95%+ (validations, scopes, state machines)                   │
│  • Policies: 100% (authorization is critical)                           │
│  • Services: 90%+ (business logic)                                      │
│  • Controllers: 80%+ (happy path + errors)                              │
│  • System: Critical workflows only                                       │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 10.2 RSpec Configuration

### 10.2.1 Gemfile Test Group

```ruby
# Gemfile
group :development, :test do
  gem 'rspec-rails', '~> 6.1'
  gem 'factory_bot_rails'
  gem 'faker'
  gem 'shoulda-matchers', '~> 5.0'
  gem 'database_cleaner-active_record'
end

group :test do
  gem 'capybara'
  gem 'selenium-webdriver'
  gem 'webmock'
  gem 'vcr'
  gem 'simplecov', require: false
  gem 'pundit-matchers', '~> 3.1'
  gem 'rspec-sidekiq'
  gem 'timecop'
end
```

### 10.2.2 RSpec Rails Helper

```ruby
# spec/rails_helper.rb
require 'spec_helper'
ENV['RAILS_ENV'] ||= 'test'
require_relative '../config/environment'

abort("The Rails environment is running in production mode!") if Rails.env.production?

require 'rspec/rails'
require 'pundit/matchers'

# Require support files
Dir[Rails.root.join('spec', 'support', '**', '*.rb')].sort.each { |f| require f }

begin
  ActiveRecord::Migration.maintain_test_schema!
rescue ActiveRecord::PendingMigrationError => e
  abort e.to_s.strip
end

RSpec.configure do |config|
  # Include FactoryBot methods
  config.include FactoryBot::Syntax::Methods

  # Include Devise test helpers
  config.include Devise::Test::IntegrationHelpers, type: :request
  config.include Devise::Test::ControllerHelpers, type: :controller

  # Include custom helpers
  config.include ApiHelpers, type: :request
  config.include AuthHelpers
  config.include PunditHelpers, type: :policy

  # Use transactional fixtures
  config.use_transactional_fixtures = true

  # Infer spec type from file location
  config.infer_spec_type_from_file_location!

  # Filter Rails from backtraces
  config.filter_rails_from_backtrace!

  # Configure Sidekiq testing mode
  config.before(:each) do
    Sidekiq::Worker.clear_all
  end

  # Configure database cleaner for system specs
  config.before(:each, type: :system) do
    driven_by(:selenium_chrome_headless)
  end

  # Multi-tenant setup
  config.around(:each) do |example|
    ActsAsTenant.with_tenant(nil) do
      example.run
    end
  end
end

# Shoulda matchers configuration
Shoulda::Matchers.configure do |config|
  config.integrate do |with|
    with.test_framework :rspec
    with.library :rails
  end
end
```

### 10.2.3 SimpleCov Configuration

```ruby
# spec/spec_helper.rb
require 'simplecov'

SimpleCov.start 'rails' do
  add_filter '/spec/'
  add_filter '/config/'
  add_filter '/vendor/'
  add_filter '/db/'

  add_group 'Models', 'app/models'
  add_group 'Policies', 'app/policies'
  add_group 'Services', 'app/services'
  add_group 'Jobs', 'app/jobs'
  add_group 'Controllers', 'app/controllers'
  add_group 'Channels', 'app/channels'
  add_group 'Serializers', 'app/serializers'
  add_group 'Mailers', 'app/mailers'

  minimum_coverage 80
  minimum_coverage_by_file 70
end

RSpec.configure do |config|
  config.expect_with :rspec do |expectations|
    expectations.include_chain_clauses_in_custom_matcher_descriptions = true
  end

  config.mock_with :rspec do |mocks|
    mocks.verify_partial_doubles = true
  end

  config.shared_context_metadata_behavior = :apply_to_host_groups
  config.filter_run_when_matching :focus
  config.example_status_persistence_file_path = "spec/examples.txt"
  config.disable_monkey_patching!
  config.order = :random
  Kernel.srand config.seed
end
```

---

## 10.3 FactoryBot Factories

### 10.3.1 User Factory

```ruby
# spec/factories/users.rb
FactoryBot.define do
  factory :user do
    email { Faker::Internet.unique.email }
    password { 'password123' }
    password_confirmation { 'password123' }
    first_name { Faker::Name.first_name }
    last_name { Faker::Name.last_name }
    phone { Faker::PhoneNumber.phone_number }
    role { :gestionnaire }
    confirmed_at { Time.current }

    trait :admin do
      role { :admin }
    end

    trait :gestionnaire do
      role { :gestionnaire }
    end

    trait :prestataire do
      role { :prestataire }
    end

    trait :locataire do
      role { :locataire }
    end

    trait :unconfirmed do
      confirmed_at { nil }
    end

    trait :with_avatar do
      after(:build) do |user|
        user.avatar.attach(
          io: File.open(Rails.root.join('spec/fixtures/files/avatar.jpg')),
          filename: 'avatar.jpg',
          content_type: 'image/jpeg'
        )
      end
    end

    trait :with_team do
      transient do
        team { nil }
        team_role { 'member' }
      end

      after(:create) do |user, evaluator|
        team = evaluator.team || create(:team)
        create(:team_member, user: user, team: team, role: evaluator.team_role)
      end
    end
  end
end
```

### 10.3.2 Team Factory

```ruby
# spec/factories/teams.rb
FactoryBot.define do
  factory :team do
    name { Faker::Company.unique.name }
    description { Faker::Lorem.paragraph }

    trait :with_members do
      transient do
        members_count { 3 }
      end

      after(:create) do |team, evaluator|
        create_list(:team_member, evaluator.members_count, team: team)
      end
    end

    trait :with_buildings do
      transient do
        buildings_count { 2 }
      end

      after(:create) do |team, evaluator|
        create_list(:building, evaluator.buildings_count, team: team)
      end
    end
  end

  factory :team_member do
    association :team
    association :user
    role { 'member' }

    trait :admin do
      role { 'admin' }
    end
  end
end
```

### 10.3.3 Intervention Factory

```ruby
# spec/factories/interventions.rb
FactoryBot.define do
  factory :intervention do
    association :team
    association :lot
    association :created_by_user, factory: :user

    title { Faker::Lorem.sentence(word_count: 5) }
    description { Faker::Lorem.paragraph(sentence_count: 3) }
    priority { [:low, :normal, :high, :urgent].sample }
    category { ['plomberie', 'electricite', 'serrurerie', 'chauffage', 'autre'].sample }
    status { :demande }
    requires_tenant_presence { [true, false].sample }

    sequence(:reference) { |n| "INT-#{Date.current.year}-#{n.to_s.rjust(6, '0')}" }

    trait :approved do
      status { :approuvee }
    end

    trait :scheduled do
      status { :planifiee }
      scheduled_date { 1.week.from_now.to_date }
      scheduled_time_start { '09:00' }
      scheduled_time_end { '12:00' }
    end

    trait :completed do
      status { :cloturee_par_gestionnaire }
      completed_at { Time.current }
      final_cost { Faker::Commerce.price(range: 50..500) }
    end

    trait :urgent do
      priority { :urgent }
    end

    trait :with_quotes do
      transient do
        quotes_count { 2 }
      end

      after(:create) do |intervention, evaluator|
        create_list(:intervention_quote, evaluator.quotes_count, intervention: intervention)
      end
    end

    trait :with_time_slots do
      transient do
        slots_count { 3 }
      end

      after(:create) do |intervention, evaluator|
        create_list(:intervention_time_slot, evaluator.slots_count, intervention: intervention)
      end
    end

    trait :with_comments do
      transient do
        comments_count { 3 }
      end

      after(:create) do |intervention, evaluator|
        create_list(:intervention_comment, evaluator.comments_count, intervention: intervention)
      end
    end
  end

  factory :intervention_quote do
    association :intervention
    association :provider, factory: [:user, :prestataire]

    amount { Faker::Commerce.price(range: 100..2000) }
    description { Faker::Lorem.paragraph }
    status { :pending }
    valid_until { 30.days.from_now }

    trait :accepted do
      status { :accepted }
      accepted_at { Time.current }
    end

    trait :rejected do
      status { :rejected }
      rejected_at { Time.current }
    end
  end

  factory :intervention_time_slot do
    association :intervention
    association :proposed_by, factory: :user

    proposed_date { Faker::Date.forward(days: 14) }
    start_time { '09:00' }
    end_time { '12:00' }
    status { :proposed }

    trait :selected do
      status { :selected }
    end
  end

  factory :intervention_comment do
    association :intervention
    association :user

    content { Faker::Lorem.paragraph }
    comment_type { :internal }

    trait :public do
      comment_type { :public }
    end
  end
end
```

### 10.3.4 Building & Lot Factories

```ruby
# spec/factories/buildings.rb
FactoryBot.define do
  factory :building do
    association :team

    name { Faker::Address.street_name }
    address { Faker::Address.street_address }
    postal_code { Faker::Address.zip_code }
    city { Faker::Address.city }
    country { 'France' }
    building_type { ['residential', 'commercial', 'mixed'].sample }
    construction_year { rand(1960..2023) }
    total_floors { rand(1..10) }
    has_elevator { [true, false].sample }
    has_parking { [true, false].sample }
    has_garden { [true, false].sample }

    trait :with_lots do
      transient do
        lots_count { 5 }
      end

      after(:create) do |building, evaluator|
        create_list(:lot, evaluator.lots_count, building: building, team: building.team)
      end
    end
  end

  factory :lot do
    association :building
    association :team

    lot_type { ['apartment', 'commercial', 'parking', 'storage'].sample }
    floor { rand(0..10) }
    door_number { Faker::Alphanumeric.alphanumeric(number: 3).upcase }
    surface_area { rand(20..150) }

    sequence(:reference) { |n| "LOT-#{n.to_s.rjust(5, '0')}" }

    trait :apartment do
      lot_type { 'apartment' }
      rooms_count { rand(1..5) }
    end

    trait :commercial do
      lot_type { 'commercial' }
    end

    trait :with_contract do
      after(:create) do |lot|
        create(:contract, lot: lot, team: lot.team)
      end
    end
  end
end
```

### 10.3.5 Contract Factory

```ruby
# spec/factories/contracts.rb
FactoryBot.define do
  factory :contract do
    association :lot
    association :team

    start_date { 1.year.ago.to_date }
    end_date { 2.years.from_now.to_date }
    rent_amount { Faker::Commerce.price(range: 500..2500) }
    charges_amount { Faker::Commerce.price(range: 50..200) }
    deposit_amount { rent_amount * 2 }
    contract_type { 'bail_habitation' }
    payment_day { rand(1..28) }

    trait :expired do
      start_date { 2.years.ago.to_date }
      end_date { 1.month.ago.to_date }
    end

    trait :upcoming do
      start_date { 1.month.from_now.to_date }
      end_date { 1.year.from_now.to_date }
    end

    trait :terminated do
      terminated_at { 1.week.ago }
    end

    trait :with_tenant do
      after(:create) do |contract|
        tenant = create(:user, :locataire)
        create(:contract_contact, contract: contract, contact: create(:contact, user: tenant), role: 'tenant')
      end
    end
  end

  factory :contract_contact do
    association :contract
    association :contact
    role { 'tenant' }
  end
end
```

---

## 10.4 Model Specs

### 10.4.1 Intervention Model Spec

```ruby
# spec/models/intervention_spec.rb
require 'rails_helper'

RSpec.describe Intervention, type: :model do
  subject { build(:intervention) }

  describe 'associations' do
    it { is_expected.to belong_to(:team) }
    it { is_expected.to belong_to(:lot) }
    it { is_expected.to belong_to(:created_by_user).class_name('User') }
    it { is_expected.to have_many(:quotes).class_name('InterventionQuote') }
    it { is_expected.to have_many(:time_slots).class_name('InterventionTimeSlot') }
    it { is_expected.to have_many(:comments).class_name('InterventionComment') }
    it { is_expected.to have_many(:assignments).class_name('InterventionAssignment') }
    it { is_expected.to have_many(:assigned_users).through(:assignments) }
    it { is_expected.to have_many(:documents) }
    it { is_expected.to have_one(:conversation_thread) }
  end

  describe 'validations' do
    it { is_expected.to validate_presence_of(:title) }
    it { is_expected.to validate_presence_of(:description) }
    it { is_expected.to validate_presence_of(:priority) }
    it { is_expected.to validate_length_of(:title).is_at_most(255) }
  end

  describe 'enums' do
    it do
      is_expected.to define_enum_for(:status).with_values(
        demande: 'demande',
        rejetee: 'rejetee',
        approuvee: 'approuvee',
        demande_de_devis: 'demande_de_devis',
        planification: 'planification',
        planifiee: 'planifiee',
        en_cours: 'en_cours',
        cloturee_par_prestataire: 'cloturee_par_prestataire',
        cloturee_par_locataire: 'cloturee_par_locataire',
        cloturee_par_gestionnaire: 'cloturee_par_gestionnaire',
        annulee: 'annulee'
      ).backed_by_column_of_type(:string)
    end

    it do
      is_expected.to define_enum_for(:priority).with_values(
        low: 'low',
        normal: 'normal',
        high: 'high',
        urgent: 'urgent'
      ).backed_by_column_of_type(:string)
    end
  end

  describe 'scopes' do
    let(:team) { create(:team) }

    describe '.pending_statuses' do
      it 'returns interventions with pending statuses' do
        pending = create(:intervention, team: team, status: :demande)
        approved = create(:intervention, team: team, status: :approuvee)
        completed = create(:intervention, team: team, status: :cloturee_par_gestionnaire)

        expect(Intervention.pending_statuses).to include(pending, approved)
        expect(Intervention.pending_statuses).not_to include(completed)
      end
    end

    describe '.completed' do
      it 'returns completed interventions' do
        completed = create(:intervention, team: team, status: :cloturee_par_gestionnaire)
        pending = create(:intervention, team: team, status: :demande)

        expect(Intervention.completed).to include(completed)
        expect(Intervention.completed).not_to include(pending)
      end
    end

    describe '.urgent' do
      it 'returns urgent interventions' do
        urgent = create(:intervention, team: team, priority: :urgent)
        normal = create(:intervention, team: team, priority: :normal)

        expect(Intervention.urgent).to include(urgent)
        expect(Intervention.urgent).not_to include(normal)
      end
    end
  end

  describe 'state machine (AASM)' do
    let(:intervention) { create(:intervention, status: :demande) }

    describe '#approve' do
      it 'transitions from demande to approuvee' do
        expect { intervention.approve! }
          .to change(intervention, :status)
          .from('demande').to('approuvee')
      end

      it 'raises error when not in demande status' do
        intervention.update!(status: :planifiee)
        expect { intervention.approve! }.to raise_error(AASM::InvalidTransition)
      end
    end

    describe '#reject' do
      it 'transitions from demande to rejetee' do
        expect { intervention.reject! }
          .to change(intervention, :status)
          .from('demande').to('rejetee')
      end
    end

    describe '#request_quote' do
      it 'transitions from approuvee to demande_de_devis' do
        intervention.approve!

        expect { intervention.request_quote! }
          .to change(intervention, :status)
          .from('approuvee').to('demande_de_devis')
      end
    end

    describe '#cancel' do
      it 'can be cancelled from any state except terminal states' do
        [:demande, :approuvee, :planifiee, :en_cours].each do |state|
          intervention = create(:intervention, status: state)
          expect { intervention.cancel! }.to change(intervention, :status).to('annulee')
        end
      end

      it 'cannot be cancelled from terminal states' do
        intervention = create(:intervention, status: :cloturee_par_gestionnaire)
        expect { intervention.cancel! }.to raise_error(AASM::InvalidTransition)
      end
    end

    describe 'full workflow' do
      it 'completes the entire intervention lifecycle' do
        intervention = create(:intervention, status: :demande)

        # Approval
        intervention.approve!
        expect(intervention).to be_approuvee

        # Request quote
        intervention.request_quote!
        expect(intervention).to be_demande_de_devis

        # Enter planning
        intervention.enter_planning!
        expect(intervention).to be_planification

        # Schedule
        intervention.schedule!
        expect(intervention).to be_planifiee

        # Start work
        intervention.start!
        expect(intervention).to be_en_cours

        # Provider completes
        intervention.complete_by_provider!
        expect(intervention).to be_cloturee_par_prestataire

        # Tenant validates
        intervention.validate_by_tenant!
        expect(intervention).to be_cloturee_par_locataire

        # Manager closes
        intervention.close!
        expect(intervention).to be_cloturee_par_gestionnaire
      end
    end
  end

  describe 'callbacks' do
    describe 'before_create' do
      it 'generates a reference' do
        intervention = create(:intervention, reference: nil)
        expect(intervention.reference).to match(/INT-\d{4}-\d{6}/)
      end
    end
  end

  describe 'instance methods' do
    describe '#assigned_provider' do
      it 'returns the assigned prestataire' do
        intervention = create(:intervention)
        provider = create(:user, :prestataire)
        create(:intervention_assignment, intervention: intervention, user: provider, role: 'prestataire')

        expect(intervention.assigned_provider).to eq(provider)
      end
    end

    describe '#pending?' do
      it 'returns true for non-terminal statuses' do
        expect(build(:intervention, status: :demande).pending?).to be true
        expect(build(:intervention, status: :planifiee).pending?).to be true
      end

      it 'returns false for terminal statuses' do
        expect(build(:intervention, status: :cloturee_par_gestionnaire).pending?).to be false
        expect(build(:intervention, status: :annulee).pending?).to be false
      end
    end
  end
end
```

### 10.4.2 User Model Spec

```ruby
# spec/models/user_spec.rb
require 'rails_helper'

RSpec.describe User, type: :model do
  subject { build(:user) }

  describe 'associations' do
    it { is_expected.to have_many(:team_memberships).class_name('TeamMember') }
    it { is_expected.to have_many(:teams).through(:team_memberships) }
    it { is_expected.to have_many(:notifications) }
    it { is_expected.to have_many(:intervention_assignments) }
    it { is_expected.to have_many(:assigned_interventions).through(:intervention_assignments) }
  end

  describe 'validations' do
    it { is_expected.to validate_presence_of(:email) }
    it { is_expected.to validate_presence_of(:first_name) }
    it { is_expected.to validate_presence_of(:last_name) }
    it { is_expected.to validate_uniqueness_of(:email).case_insensitive }
  end

  describe 'enums' do
    it do
      is_expected.to define_enum_for(:role).with_values(
        admin: 'admin',
        gestionnaire: 'gestionnaire',
        prestataire: 'prestataire',
        locataire: 'locataire'
      ).backed_by_column_of_type(:string)
    end
  end

  describe 'instance methods' do
    describe '#full_name' do
      it 'returns first and last name' do
        user = build(:user, first_name: 'Jean', last_name: 'Dupont')
        expect(user.full_name).to eq('Jean Dupont')
      end
    end

    describe '#member_of?' do
      let(:user) { create(:user) }
      let(:team) { create(:team) }

      it 'returns true if user is member of team' do
        create(:team_member, user: user, team: team)
        expect(user.member_of?(team)).to be true
      end

      it 'returns false if user is not member of team' do
        expect(user.member_of?(team)).to be false
      end

      it 'returns false for discarded memberships' do
        create(:team_member, user: user, team: team, discarded_at: Time.current)
        expect(user.member_of?(team)).to be false
      end
    end

    describe '#admin_of?' do
      let(:user) { create(:user) }
      let(:team) { create(:team) }

      it 'returns true if user is admin of team' do
        create(:team_member, user: user, team: team, role: 'admin')
        expect(user.admin_of?(team)).to be true
      end

      it 'returns false if user is regular member' do
        create(:team_member, user: user, team: team, role: 'member')
        expect(user.admin_of?(team)).to be false
      end
    end
  end
end
```

---

## 10.5 Policy Specs

### 10.5.1 Intervention Policy Spec

```ruby
# spec/policies/intervention_policy_spec.rb
require 'rails_helper'

RSpec.describe InterventionPolicy, type: :policy do
  subject { described_class.new(user_context, intervention) }

  let(:team) { create(:team) }
  let(:building) { create(:building, team: team) }
  let(:lot) { create(:lot, building: building, team: team) }
  let(:intervention) { create(:intervention, lot: lot, team: team) }

  def user_context_for(user)
    UserContext.new(user, team)
  end

  describe 'as admin' do
    let(:user) { create(:user, :admin) }
    let(:user_context) { user_context_for(user) }

    it { is_expected.to permit_action(:index) }
    it { is_expected.to permit_action(:show) }
    it { is_expected.to permit_action(:create) }
    it { is_expected.to permit_action(:update) }
    it { is_expected.to permit_action(:destroy) }
    it { is_expected.to permit_action(:approve) }
    it { is_expected.to permit_action(:reject) }
    it { is_expected.to permit_action(:cancel) }
  end

  describe 'as gestionnaire (team member)' do
    let(:user) { create(:user, :gestionnaire) }
    let!(:membership) { create(:team_member, user: user, team: team) }
    let(:user_context) { user_context_for(user) }

    it { is_expected.to permit_action(:index) }
    it { is_expected.to permit_action(:show) }
    it { is_expected.to permit_action(:create) }
    it { is_expected.to permit_action(:update) }
    it { is_expected.to permit_action(:approve) }
    it { is_expected.to permit_action(:reject) }

    context 'for intervention in another team' do
      let(:other_team) { create(:team) }
      let(:other_intervention) { create(:intervention, team: other_team) }
      subject { described_class.new(user_context, other_intervention) }

      it { is_expected.not_to permit_action(:show) }
      it { is_expected.not_to permit_action(:update) }
    end
  end

  describe 'as prestataire (assigned)' do
    let(:user) { create(:user, :prestataire) }
    let(:user_context) { user_context_for(user) }

    before do
      create(:intervention_assignment, intervention: intervention, user: user, role: 'prestataire')
    end

    it { is_expected.to permit_action(:show) }
    it { is_expected.to permit_action(:complete) }
    it { is_expected.not_to permit_action(:approve) }
    it { is_expected.not_to permit_action(:reject) }
    it { is_expected.not_to permit_action(:cancel) }

    context 'for unassigned intervention' do
      let(:unassigned_intervention) { create(:intervention, team: team) }
      subject { described_class.new(user_context, unassigned_intervention) }

      it { is_expected.not_to permit_action(:show) }
    end
  end

  describe 'as locataire' do
    let(:user) { create(:user, :locataire) }
    let(:user_context) { user_context_for(user) }

    context 'as tenant of the lot' do
      before do
        contract = create(:contract, lot: lot, team: team)
        contact = create(:contact, user: user)
        create(:contract_contact, contract: contract, contact: contact, role: 'tenant')
      end

      it { is_expected.to permit_action(:show) }
      it { is_expected.to permit_action(:create) }
      it { is_expected.not_to permit_action(:approve) }
      it { is_expected.not_to permit_action(:reject) }

      context 'when intervention is ready for tenant validation' do
        let(:intervention) { create(:intervention, lot: lot, team: team, status: :cloturee_par_prestataire) }

        it { is_expected.to permit_action(:validate) }
      end
    end

    context 'not tenant of the lot' do
      it { is_expected.not_to permit_action(:show) }
      it { is_expected.not_to permit_action(:create) }
    end
  end

  describe 'Scope' do
    let!(:team_intervention) { create(:intervention, team: team) }
    let!(:other_intervention) { create(:intervention) }

    describe 'for gestionnaire' do
      let(:user) { create(:user, :gestionnaire) }
      let!(:membership) { create(:team_member, user: user, team: team) }
      let(:user_context) { user_context_for(user) }

      it 'returns only team interventions' do
        scope = described_class::Scope.new(user_context, Intervention).resolve
        expect(scope).to include(team_intervention)
        expect(scope).not_to include(other_intervention)
      end
    end

    describe 'for prestataire' do
      let(:user) { create(:user, :prestataire) }
      let(:user_context) { user_context_for(user) }

      before do
        create(:intervention_assignment, intervention: team_intervention, user: user)
      end

      it 'returns only assigned interventions' do
        scope = described_class::Scope.new(user_context, Intervention).resolve
        expect(scope).to include(team_intervention)
        expect(scope).not_to include(other_intervention)
      end
    end

    describe 'for admin' do
      let(:user) { create(:user, :admin) }
      let(:user_context) { user_context_for(user) }

      it 'returns all interventions' do
        scope = described_class::Scope.new(user_context, Intervention).resolve
        expect(scope).to include(team_intervention, other_intervention)
      end
    end
  end
end
```

### 10.5.2 Building Policy Spec

```ruby
# spec/policies/building_policy_spec.rb
require 'rails_helper'

RSpec.describe BuildingPolicy, type: :policy do
  subject { described_class.new(user_context, building) }

  let(:team) { create(:team) }
  let(:building) { create(:building, team: team) }

  def user_context_for(user)
    UserContext.new(user, team)
  end

  describe 'as team gestionnaire' do
    let(:user) { create(:user, :gestionnaire) }
    let!(:membership) { create(:team_member, user: user, team: team) }
    let(:user_context) { user_context_for(user) }

    it { is_expected.to permit_actions([:index, :show, :create, :update]) }

    context 'with properties.delete permission' do
      before { membership.update!(permissions: { 'properties.delete' => true }) }
      it { is_expected.to permit_action(:destroy) }
    end

    context 'without properties.delete permission' do
      it { is_expected.not_to permit_action(:destroy) }
    end
  end

  describe 'as locataire (tenant of building)' do
    let(:user) { create(:user, :locataire) }
    let(:lot) { create(:lot, building: building, team: team) }
    let(:user_context) { user_context_for(user) }

    before do
      contract = create(:contract, lot: lot, team: team)
      contact = create(:contact, user: user)
      create(:contract_contact, contract: contract, contact: contact, role: 'tenant')
    end

    it { is_expected.to permit_action(:show) }
    it { is_expected.not_to permit_actions([:create, :update, :destroy]) }
  end
end
```

---

## 10.6 Service Specs

```ruby
# spec/services/interventions/creator_spec.rb
require 'rails_helper'

RSpec.describe Interventions::Creator do
  describe '.call' do
    let(:team) { create(:team) }
    let(:lot) { create(:lot, team: team) }
    let(:user) { create(:user, :gestionnaire) }
    let!(:membership) { create(:team_member, user: user, team: team) }

    let(:valid_attributes) do
      {
        lot: lot,
        team: team,
        title: 'Fuite d\'eau',
        description: 'Fuite sous l\'évier',
        priority: 'high',
        category: 'plomberie',
        created_by_user: user
      }
    end

    subject { described_class.call(intervention: Intervention.new(valid_attributes), user: user) }

    context 'with valid attributes' do
      it 'creates an intervention' do
        expect { subject }.to change(Intervention, :count).by(1)
      end

      it 'returns success result' do
        result = subject
        expect(result).to be_success
        expect(result.data).to be_a(Intervention)
      end

      it 'generates a reference' do
        result = subject
        expect(result.data.reference).to be_present
      end

      it 'creates an activity log' do
        expect { subject }.to change(ActivityLog, :count).by(1)
      end

      it 'sends notifications' do
        expect { subject }.to have_enqueued_job(NotificationDeliveryJob)
      end

      it 'creates a conversation thread' do
        result = subject
        expect(result.data.conversation_thread).to be_present
      end
    end

    context 'with invalid attributes' do
      before { valid_attributes[:title] = '' }

      it 'does not create an intervention' do
        expect { subject }.not_to change(Intervention, :count)
      end

      it 'returns failure result' do
        result = subject
        expect(result).to be_failure
        expect(result.error).to include('Title')
      end
    end

    context 'when user lacks permission' do
      let(:other_team) { create(:team) }
      let(:other_lot) { create(:lot, team: other_team) }

      before { valid_attributes[:lot] = other_lot }

      it 'returns failure result' do
        result = subject
        expect(result).to be_failure
        expect(result.code).to eq(:unauthorized)
      end
    end
  end
end

# spec/services/interventions/status_updater_spec.rb
RSpec.describe Interventions::StatusUpdater do
  describe '.call' do
    let(:team) { create(:team) }
    let(:intervention) { create(:intervention, team: team, status: :demande) }
    let(:user) { create(:user, :gestionnaire) }
    let!(:membership) { create(:team_member, user: user, team: team) }

    subject { described_class.call(intervention: intervention, event: :approve, user: user) }

    context 'with valid transition' do
      it 'updates the status' do
        expect { subject }.to change { intervention.reload.status }
          .from('demande').to('approuvee')
      end

      it 'returns success' do
        expect(subject).to be_success
      end

      it 'creates activity log' do
        expect { subject }.to change(ActivityLog, :count).by(1)
      end

      it 'broadcasts status change' do
        expect(Interventions::StatusBroadcaster).to receive(:broadcast)
        subject
      end
    end

    context 'with invalid transition' do
      let(:intervention) { create(:intervention, team: team, status: :planifiee) }

      it 'does not update status' do
        expect { subject }.not_to change { intervention.reload.status }
      end

      it 'returns failure' do
        result = subject
        expect(result).to be_failure
        expect(result.code).to eq(:invalid_transition)
      end
    end
  end
end
```

---

## 10.7 Request Specs

```ruby
# spec/requests/api/v1/buildings_spec.rb
require 'rails_helper'

RSpec.describe 'Buildings API', type: :request do
  let(:user) { create(:user, :gestionnaire) }
  let(:team) { create(:team) }
  let!(:membership) { create(:team_member, user: user, team: team) }
  let(:headers) { api_headers(user, team) }

  describe 'GET /api/v1/buildings' do
    let!(:buildings) { create_list(:building, 3, team: team) }
    let!(:other_building) { create(:building) }

    it 'returns team buildings only' do
      get '/api/v1/buildings', headers: headers

      expect(response).to have_http_status(:ok)
      expect(json_response[:data].length).to eq(3)
      expect(json_response[:data].map { |b| b[:id] }).not_to include(other_building.id)
    end

    it 'supports search' do
      searchable = create(:building, team: team, name: 'Résidence Les Mimosas')

      get '/api/v1/buildings', params: { q: 'Mimosas' }, headers: headers

      expect(json_response[:data].length).to eq(1)
      expect(json_response[:data].first[:name]).to eq('Résidence Les Mimosas')
    end

    it 'paginates results' do
      create_list(:building, 30, team: team)

      get '/api/v1/buildings', params: { page: 2, per_page: 10 }, headers: headers

      expect(json_response[:data].length).to eq(10)
      expect(json_response[:meta][:current_page]).to eq(2)
    end
  end

  describe 'POST /api/v1/buildings' do
    let(:valid_params) do
      {
        building: {
          name: 'Résidence Test',
          address: '123 Rue de Test',
          postal_code: '75001',
          city: 'Paris',
          country: 'France',
          building_type: 'residential'
        }
      }
    end

    it 'creates a building' do
      expect {
        post '/api/v1/buildings', params: valid_params.to_json, headers: headers
      }.to change(Building, :count).by(1)

      expect(response).to have_http_status(:created)
      expect(json_response[:data][:name]).to eq('Résidence Test')
    end

    it 'assigns to current team' do
      post '/api/v1/buildings', params: valid_params.to_json, headers: headers

      building = Building.last
      expect(building.team).to eq(team)
    end

    context 'with invalid params' do
      let(:invalid_params) { { building: { name: '' } } }

      it 'returns validation errors' do
        post '/api/v1/buildings', params: invalid_params.to_json, headers: headers

        expect(response).to have_http_status(:unprocessable_entity)
        expect(json_response[:error][:code]).to eq('VALIDATION_ERROR')
      end
    end
  end

  describe 'DELETE /api/v1/buildings/:id' do
    let!(:building) { create(:building, team: team) }

    context 'with delete permission' do
      before { membership.update!(permissions: { 'properties.delete' => true }) }

      it 'soft deletes the building' do
        delete "/api/v1/buildings/#{building.id}", headers: headers

        expect(response).to have_http_status(:no_content)
        expect(building.reload.discarded?).to be true
      end
    end

    context 'without delete permission' do
      it 'returns forbidden' do
        delete "/api/v1/buildings/#{building.id}", headers: headers

        expect(response).to have_http_status(:forbidden)
      end
    end
  end
end
```

---

## 10.8 System Specs (E2E)

```ruby
# spec/system/intervention_workflow_spec.rb
require 'rails_helper'

RSpec.describe 'Intervention Workflow', type: :system do
  let(:team) { create(:team) }
  let(:gestionnaire) { create(:user, :gestionnaire) }
  let(:prestataire) { create(:user, :prestataire) }
  let(:locataire) { create(:user, :locataire) }
  let(:building) { create(:building, team: team) }
  let(:lot) { create(:lot, building: building, team: team) }

  before do
    create(:team_member, user: gestionnaire, team: team, role: 'admin')
    create(:team_member, user: prestataire, team: team)

    # Setup tenant
    contract = create(:contract, lot: lot, team: team)
    contact = create(:contact, user: locataire)
    create(:contract_contact, contract: contract, contact: contact, role: 'tenant')
  end

  scenario 'complete intervention workflow from request to closure' do
    # Step 1: Tenant creates intervention request
    sign_in locataire
    visit new_tenant_intervention_path

    fill_in 'Titre', with: 'Fuite d\'eau cuisine'
    fill_in 'Description', with: 'Fuite importante sous l\'évier'
    select 'Urgent', from: 'Priorité'
    select lot.reference, from: 'Logement'
    click_button 'Soumettre'

    expect(page).to have_content('Demande enregistrée')
    intervention = Intervention.last
    expect(intervention.status).to eq('demande')

    # Step 2: Gestionnaire approves
    sign_out locataire
    sign_in gestionnaire
    visit gestionnaire_intervention_path(intervention)

    click_button 'Approuver'
    expect(page).to have_content('Intervention approuvée')
    expect(intervention.reload.status).to eq('approuvee')

    # Step 3: Request quote
    click_button 'Demander un devis'
    check prestataire.full_name
    click_button 'Envoyer'
    expect(intervention.reload.status).to eq('demande_de_devis')

    # Step 4: Provider submits quote
    sign_out gestionnaire
    sign_in prestataire
    visit prestataire_intervention_path(intervention)

    click_link 'Soumettre un devis'
    fill_in 'Montant', with: '250'
    fill_in 'Description', with: 'Remplacement du siphon'
    click_button 'Envoyer le devis'

    expect(page).to have_content('Devis envoyé')
    expect(intervention.quotes.count).to eq(1)

    # Step 5: Manager accepts quote and schedules
    sign_out prestataire
    sign_in gestionnaire
    visit gestionnaire_intervention_path(intervention)

    within('.quote-card') do
      click_button 'Accepter'
    end

    click_button 'Planifier'
    fill_in 'Date', with: 1.week.from_now.strftime('%Y-%m-%d')
    select '09:00', from: 'Heure de début'
    select '12:00', from: 'Heure de fin'
    click_button 'Confirmer'

    expect(intervention.reload.status).to eq('planifiee')

    # Step 6: Provider completes work
    sign_out gestionnaire
    sign_in prestataire
    visit prestataire_intervention_path(intervention)

    click_button 'Démarrer l\'intervention'
    expect(intervention.reload.status).to eq('en_cours')

    click_button 'Terminer l\'intervention'
    fill_in 'Rapport', with: 'Siphon remplacé avec succès'
    click_button 'Valider'

    expect(intervention.reload.status).to eq('cloturee_par_prestataire')

    # Step 7: Tenant validates
    sign_out prestataire
    sign_in locataire
    visit tenant_intervention_path(intervention)

    click_button 'Valider l\'intervention'
    choose '5 étoiles'
    fill_in 'Commentaire', with: 'Excellent travail!'
    click_button 'Confirmer'

    expect(intervention.reload.status).to eq('cloturee_par_locataire')

    # Step 8: Manager closes
    sign_out locataire
    sign_in gestionnaire
    visit gestionnaire_intervention_path(intervention)

    click_button 'Clôturer'
    fill_in 'Coût final', with: '250'
    click_button 'Confirmer'

    expect(intervention.reload.status).to eq('cloturee_par_gestionnaire')
    expect(page).to have_content('Intervention clôturée')
  end
end
```

---

## 10.9 Test Helpers

```ruby
# spec/support/auth_helpers.rb
module AuthHelpers
  def sign_in_as(user)
    sign_in(user)
    user
  end

  def sign_in_with_team(user, team)
    sign_in(user)
    cookies.encrypted[:current_team_id] = team.id
    user
  end
end

# spec/support/pundit_helpers.rb
module PunditHelpers
  extend RSpec::Matchers::DSL

  def permit_action(action)
    permit_actions([action])
  end

  def permit_actions(actions)
    PunditActionsMatcher.new(actions, true)
  end

  def forbid_actions(actions)
    PunditActionsMatcher.new(actions, false)
  end

  class PunditActionsMatcher
    def initialize(actions, expected)
      @actions = Array(actions)
      @expected = expected
    end

    def matches?(policy)
      @policy = policy
      @failed_actions = @actions.reject do |action|
        policy.public_send("#{action}?") == @expected
      end
      @failed_actions.empty?
    end

    def failure_message
      verb = @expected ? 'permit' : 'forbid'
      "expected policy to #{verb} #{@failed_actions.join(', ')}"
    end

    def failure_message_when_negated
      verb = @expected ? 'forbid' : 'permit'
      "expected policy to #{verb} #{@actions.join(', ')}"
    end
  end
end

# spec/support/api_helpers.rb (extended)
module ApiHelpers
  def json_response
    @json_response ||= JSON.parse(response.body, symbolize_names: true)
  end

  def auth_headers(user)
    token = generate_jwt_token(user)
    { 'Authorization' => "Bearer #{token}", 'Content-Type' => 'application/json' }
  end

  def api_headers(user, team = nil)
    headers = auth_headers(user)
    headers['X-Team-ID'] = team.id if team
    headers
  end

  private

  def generate_jwt_token(user)
    Warden::JWTAuth::UserEncoder.new.call(user, :user, nil).first
  end
end
```

---

*End of Section 10 - Testing Strategy*

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

> ⚠️ **Concurrency Limits - Critical Production Setting**
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
# ⚠️ CRITICAL: Ensure DATABASE_POOL_SIZE >= SIDEKIQ_CONCURRENCY + 5
# ⚠️ CRITICAL: Never exceed 50 for Sidekiq OSS
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

echo "🚀 Starting deployment..."

# Variables
APP_NAME="seido"
DEPLOY_USER="deploy"
DEPLOY_HOST="app.seido.io"
DEPLOY_PATH="/var/www/seido"
CURRENT_RELEASE=$(date +%Y%m%d%H%M%S)

# Build Docker image
echo "📦 Building Docker image..."
docker build -t $APP_NAME:$CURRENT_RELEASE .
docker tag $APP_NAME:$CURRENT_RELEASE registry.seido.io/$APP_NAME:$CURRENT_RELEASE
docker tag $APP_NAME:$CURRENT_RELEASE registry.seido.io/$APP_NAME:latest

# Push to registry
echo "📤 Pushing to registry..."
docker push registry.seido.io/$APP_NAME:$CURRENT_RELEASE
docker push registry.seido.io/$APP_NAME:latest

# Deploy to servers
echo "🌐 Deploying to servers..."
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
echo "✅ Verifying deployment..."
curl -sf https://app.seido.io/health_check > /dev/null && echo "Deployment successful!" || echo "Deployment verification failed!"

# Notify team
echo "📢 Notifying team..."
curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"🚀 SEIDO deployed successfully to production!"}' \
  $SLACK_WEBHOOK_URL

echo "🎉 Deployment complete!"
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

# 12. Appendices

## 12.1 Glossary

| Term | French | Definition |
|------|--------|------------|
| **Gestionnaire** | Property Manager | User role responsible for managing buildings, lots, and coordinating interventions |
| **Prestataire** | Service Provider | User role for contractors who perform maintenance work |
| **Locataire** | Tenant | User role for people living in managed properties |
| **Intervention** | Work Order | A maintenance request or repair job |
| **Lot** | Unit | An individual apartment, commercial space, or parking spot within a building |
| **Immeuble** | Building | A property containing multiple lots |
| **Devis** | Quote | Price estimate from a service provider for an intervention |
| **Bail** | Lease | Rental contract between property owner and tenant |
| **Syndic** | Property Management Company | Organization managing multiple buildings |
| **Créneau** | Time Slot | Proposed availability window for scheduling interventions |
| **AASM** | Acts As State Machine | Ruby gem for implementing finite state machines |
| **Pundit** | - | Ruby gem for authorization (replacing RLS) |
| **RLS** | Row Level Security | PostgreSQL feature for data isolation (reference only) |
| **Multi-tenant** | - | Architecture where one application serves multiple isolated organizations |

---

## 12.2 Intervention Status Reference

| Status | French Name | Description | Who Can Trigger | Next States |
|--------|-------------|-------------|-----------------|-------------|
| `demande` | Demande | Initial request from tenant or manager | Any user | `approuvee`, `rejetee` |
| `rejetee` | Rejetée | Request rejected | Gestionnaire | *Terminal* |
| `approuvee` | Approuvée | Request approved | Gestionnaire | `demande_de_devis`, `planification` |
| `demande_de_devis` | Demande de devis | Waiting for provider quotes | Gestionnaire | `planification` |
| `planification` | Planification | Finding suitable time slot | System | `planifiee` |
| `planifiee` | Planifiée | Scheduled with confirmed date/time | Gestionnaire/Prestataire | `en_cours`, `annulee` |
| `en_cours` | En cours | Work in progress | Prestataire | `cloturee_par_prestataire` |
| `cloturee_par_prestataire` | Clôturée par prestataire | Provider marked complete | Prestataire | `cloturee_par_locataire` |
| `cloturee_par_locataire` | Clôturée par locataire | Tenant validated work | Locataire | `cloturee_par_gestionnaire` |
| `cloturee_par_gestionnaire` | Clôturée par gestionnaire | Final closure by manager | Gestionnaire | *Terminal* |
| `annulee` | Annulée | Cancelled | Gestionnaire | *Terminal* |

---

## 12.3 Permission Reference

### 12.3.1 Role Default Permissions

| Permission | Admin | Gestionnaire | Prestataire | Locataire |
|------------|:-----:|:------------:|:-----------:|:---------:|
| `properties.read` | ✓ | ✓ | ○ | ○ |
| `properties.create` | ✓ | ✓ | ✗ | ✗ |
| `properties.update` | ✓ | ✓ | ✗ | ✗ |
| `properties.delete` | ✓ | ○ | ✗ | ✗ |
| `interventions.read` | ✓ | ✓ | ○ | ○ |
| `interventions.create` | ✓ | ✓ | ✗ | ✓ |
| `interventions.update` | ✓ | ✓ | ○ | ✗ |
| `interventions.approve` | ✓ | ✓ | ✗ | ✗ |
| `interventions.assign` | ✓ | ✓ | ✗ | ✗ |
| `interventions.complete` | ✓ | ✓ | ✓ | ✗ |
| `interventions.validate` | ✓ | ✓ | ✗ | ✓ |
| `quotes.create` | ✓ | ✗ | ✓ | ✗ |
| `quotes.accept` | ✓ | ✓ | ✗ | ✗ |
| `contracts.read` | ✓ | ✓ | ✗ | ○ |
| `contracts.create` | ✓ | ✓ | ✗ | ✗ |
| `contracts.update` | ✓ | ✓ | ✗ | ✗ |
| `team.manage` | ✓ | ○ | ✗ | ✗ |
| `team.invite` | ✓ | ○ | ✗ | ✗ |
| `reports.view` | ✓ | ✓ | ○ | ✗ |
| `billing.manage` | ✓ | ○ | ✗ | ✗ |

**Legend:**
- ✓ = Always granted
- ○ = Conditionally granted (depends on context)
- ✗ = Never granted

---

## 12.4 Database Table Reference

### 12.4.1 Table Categories

| Phase | Tables | Description |
|-------|--------|-------------|
| **Phase 1** | `users`, `teams`, `team_members`, `companies`, `company_members`, `user_invitations` | Identity & Access |
| **Phase CRM** | `contacts`, `addresses`, `documents` | Contact Management |
| **Phase 2** | `buildings`, `lots`, `building_contacts`, `lot_contacts`, `property_documents` | Property Management |
| **Phase 3** | `interventions`, `intervention_assignments`, `intervention_quotes`, `intervention_time_slots`, `intervention_comments`, `intervention_documents`, `intervention_links` | Intervention Workflow |
| **Phase 3 (Chat)** | `conversation_threads`, `conversation_messages`, `conversation_participants` | Real-time Chat |
| **Phase 3 (Notifications)** | `notifications`, `activity_logs`, `push_subscriptions` | Communication |
| **Phase 4** | `contracts`, `contract_contacts`, `contract_documents` | Contract Management |
| **Billing** | `stripe_customers`, `subscriptions`, `stripe_invoices`, `stripe_prices` | Stripe Integration |

### 12.4.2 Table Row Counts (Typical Production)

| Table | Expected Rows | Growth Rate |
|-------|---------------|-------------|
| `users` | 1,000 - 10,000 | Linear |
| `teams` | 100 - 500 | Slow |
| `buildings` | 500 - 5,000 | Linear |
| `lots` | 5,000 - 50,000 | Linear |
| `interventions` | 10,000 - 500,000 | Fast |
| `conversation_messages` | 100,000 - 10M | Very Fast |
| `notifications` | 1M - 50M | Very Fast |
| `activity_logs` | 5M - 100M | Very Fast |

---

## 12.5 API Quick Reference

### 12.5.1 Authentication

```bash
# Login
curl -X POST https://api.seido.io/api/v1/auth/sign_in \
  -H "Content-Type: application/json" \
  -d '{"user": {"email": "user@example.com", "password": "password"}}'

# Response
{
  "status": "success",
  "data": {
    "user": { "id": "...", "email": "...", "role": "gestionnaire" },
    "token": "eyJhbGciOiJIUzI1NiJ9..."
  }
}

# Use token in subsequent requests
curl https://api.seido.io/api/v1/interventions \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..." \
  -H "X-Team-ID: team-uuid-here"
```

### 12.5.2 Common Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/interventions` | List interventions |
| `POST` | `/api/v1/interventions` | Create intervention |
| `GET` | `/api/v1/interventions/:id` | Get intervention details |
| `POST` | `/api/v1/interventions/:id/approve` | Approve intervention |
| `POST` | `/api/v1/interventions/:id/schedule` | Schedule intervention |
| `GET` | `/api/v1/buildings` | List buildings |
| `GET` | `/api/v1/buildings/:id/lots` | List lots in building |
| `GET` | `/api/v1/notifications` | List notifications |
| `POST` | `/api/v1/notifications/mark_all_read` | Mark all as read |

---

## 12.6 Migration Checklist

Use this checklist when migrating from the existing Next.js/Supabase architecture:

### 12.6.1 Pre-Migration

- [ ] Backup existing Supabase database
- [ ] Export all file storage (Supabase Storage → S3)
- [ ] Document current RLS policies
- [ ] List all Supabase Edge Functions to convert to Rails jobs
- [ ] Identify all real-time subscriptions to convert to ActionCable

### 12.6.2 Schema Migration

- [ ] Run Phase 1 migrations (Users, Teams)
- [ ] Run Phase CRM migrations (Contacts, Addresses)
- [ ] Run Phase 2 migrations (Buildings, Lots)
- [ ] Run Phase 3 migrations (Interventions, Chat, Notifications)
- [ ] Run Phase 4 migrations (Contracts)
- [ ] Run Billing migrations (Stripe)
- [ ] Create indexes (150+)
- [ ] Set up database triggers

### 12.6.3 Data Migration

- [ ] Migrate users (map auth.users to users table)
- [ ] Migrate teams and memberships
- [ ] Migrate buildings and lots
- [ ] Migrate interventions with status history
- [ ] Migrate documents (update file paths for S3)
- [ ] Migrate contracts
- [ ] Migrate Stripe customer data

### 12.6.4 Application Migration

- [ ] Implement Devise authentication
- [ ] Implement Pundit policies (convert from RLS)
- [ ] Implement AASM state machines
- [ ] Implement service objects
- [ ] Implement ActionCable channels
- [ ] Implement Sidekiq jobs
- [ ] Implement API controllers
- [ ] Implement serializers

### 12.6.5 Testing & Verification

- [ ] Run full test suite
- [ ] Verify authorization for all roles
- [ ] Test intervention workflow end-to-end
- [ ] Test real-time features
- [ ] Performance testing
- [ ] Security audit

### 12.6.6 Go-Live

- [ ] Set up production infrastructure
- [ ] Configure monitoring (Sentry, APM)
- [ ] Set up backups
- [ ] DNS cutover
- [ ] Post-migration data verification

---

## 12.7 Complete Seed Data

Ce script de seed génère des données de test complètes pour le développement local.

### 12.7.1 db/seeds.rb

```ruby
# frozen_string_literal: true

# db/seeds.rb
# Complete seed data for SEIDO development environment
#
# Usage:
#   rails db:seed           # Run seeds
#   rails db:seed:replant   # Clear and reseed
#
# This creates:
#   - 3 teams (agencies)
#   - 15 users (3 per role)
#   - 15 buildings (5 per team)
#   - ~105 lots
#   - 50 interventions in various statuses
#   - Notifications, conversations, quotes

puts "🌱 SEIDO Database Seeding Started..."
puts "=" * 50

# ============================================================
# CLEANUP (Development only)
# ============================================================

if Rails.env.development?
  puts "\n🧹 Cleaning existing data..."

  # Delete in order to respect foreign keys
  [
    Notification,
    ConversationMessage,
    ConversationThread,
    InterventionQuote,
    InterventionTimeSlot,
    InterventionAssignment,
    InterventionDocument,
    Intervention,
    PropertyDocument,
    LotContact,
    BuildingContact,
    Lot,
    Building,
    TeamMember,
    UserPermission,
    User,
    Team
  ].each do |model|
    model.delete_all
    puts "   ✓ Cleared #{model.table_name}"
  end
end

# ============================================================
# 1. TEAMS
# ============================================================

puts "\n📁 Creating teams..."

teams_data = [
  {
    name: "Agence Centrale Paris",
    subdomain: "centrale",
    settings: { timezone: "Europe/Paris", locale: "fr" }
  },
  {
    name: "Gestion Immobilière Nord",
    subdomain: "nord",
    settings: { timezone: "Europe/Paris", locale: "fr" }
  },
  {
    name: "Sud Immobilier",
    subdomain: "sud",
    settings: { timezone: "Europe/Paris", locale: "fr" }
  }
]

teams = teams_data.map { |data| Team.create!(data) }
puts "   ✅ Created #{Team.count} teams"

# ============================================================
# 2. USERS
# ============================================================

puts "\n👥 Creating users..."

# Shared password for all seed users
DEFAULT_PASSWORD = "password123"

# Role configuration
ROLES = {
  admin: { count: 2, team_role: nil },
  gestionnaire: { count: 3, team_role: "manager" },
  prestataire: { count: 4, team_role: "member" },
  locataire: { count: 4, team_role: "member" },
  proprietaire: { count: 2, team_role: "member" }
}

created_users = { admin: [], gestionnaire: [], prestataire: [], locataire: [], proprietaire: [] }

ROLES.each do |role, config|
  config[:count].times do |i|
    user = User.create!(
      email: "#{role}#{i + 1}@seido-app.com",
      password: DEFAULT_PASSWORD,
      password_confirmation: DEFAULT_PASSWORD,
      first_name: Faker::Name.first_name,
      last_name: Faker::Name.last_name,
      role: role.to_s,
      phone: Faker::PhoneNumber.cell_phone,
      confirmed_at: Time.current
    )

    created_users[role] << user

    # Add to team (except admin)
    if config[:team_role] && role != :admin
      TeamMember.create!(
        team: teams.sample,
        user: user,
        role: config[:team_role],
        joined_at: Time.current
      )
    end
  end
end

puts "   ✅ Created #{User.count} users"
puts "      - Admins: #{created_users[:admin].count}"
puts "      - Gestionnaires: #{created_users[:gestionnaire].count}"
puts "      - Prestataires: #{created_users[:prestataire].count}"
puts "      - Locataires: #{created_users[:locataire].count}"
puts "      - Propriétaires: #{created_users[:proprietaire].count}"

# ============================================================
# 3. BUILDINGS & LOTS
# ============================================================

puts "\n🏢 Creating buildings and lots..."

BUILDING_TYPES = %w[apartment house commercial mixed]
LOT_TYPES = %w[apartment studio t2 t3 t4 parking storage commercial]

teams.each do |team|
  5.times do
    building = Building.create!(
      team: team,
      name: "Résidence #{Faker::Address.community}",
      address: Faker::Address.street_address,
      city: Faker::Address.city,
      postal_code: Faker::Address.zip_code,
      country: "France",
      building_type: BUILDING_TYPES.sample,
      floors: rand(2..8),
      construction_year: rand(1960..2020),
      notes: Faker::Lorem.paragraph
    )

    # Create 4-10 lots per building
    rand(4..10).times do |lot_index|
      Lot.create!(
        building: building,
        team: team,
        reference: "#{building.name.parameterize}-#{lot_index + 1}",
        lot_type: LOT_TYPES.sample,
        surface: rand(15..150),
        floor: rand(0..building.floors),
        rooms: rand(1..5),
        rent_amount: rand(500..2500),
        charges_amount: rand(50..300)
      )
    end
  end
end

puts "   ✅ Created #{Building.count} buildings"
puts "   ✅ Created #{Lot.count} lots"

# ============================================================
# 4. INTERVENTIONS
# ============================================================

puts "\n🔧 Creating interventions..."

INTERVENTION_STATUSES = %w[
  demande
  approuvee
  demande_de_devis
  planification
  planifiee
  en_cours
  cloturee_par_prestataire
  cloturee_par_gestionnaire
]

PRIORITIES = %w[basse normale haute urgente]
URGENCY_LEVELS = %w[standard urgent tres_urgent]

INTERVENTION_TYPES = [
  "Plomberie - Fuite d'eau",
  "Électricité - Panne",
  "Chauffage - Radiateur",
  "Serrurerie - Porte bloquée",
  "Vitrerie - Carreau cassé",
  "Peinture - Rafraîchissement",
  "Toiture - Infiltration",
  "Ascenseur - Panne",
  "Interphone - Dysfonctionnement",
  "Ventilation - VMC"
]

lots = Lot.all.to_a
gestionnaires = created_users[:gestionnaire]
prestataires = created_users[:prestataire]
locataires = created_users[:locataire]

50.times do |i|
  lot = lots.sample
  status = INTERVENTION_STATUSES.sample
  created_at = rand(30).days.ago

  intervention = Intervention.create!(
    team: lot.team,
    lot: lot,
    building: lot.building,
    title: INTERVENTION_TYPES.sample,
    description: Faker::Lorem.paragraph(sentence_count: 3),
    priority: PRIORITIES.sample,
    urgency_level: URGENCY_LEVELS.sample,
    status: status,
    created_by: gestionnaires.sample,
    created_at: created_at,
    updated_at: created_at + rand(1..10).days
  )

  # Add assignment for certain statuses
  if %w[planifiee en_cours cloturee_par_prestataire cloturee_par_gestionnaire].include?(status)
    InterventionAssignment.create!(
      intervention: intervention,
      user: prestataires.sample,
      assigned_at: intervention.created_at + 1.day,
      role: "prestataire"
    )
  end

  # Add quote for quote-related statuses
  if %w[demande_de_devis planification planifiee].include?(status)
    InterventionQuote.create!(
      intervention: intervention,
      provider: prestataires.sample,
      amount_cents: rand(5000..500000),  # 50€ - 5000€
      description: Faker::Lorem.sentence,
      status: %w[en_attente accepte refuse].sample,
      valid_until: 30.days.from_now
    )
  end

  # Add time slots for scheduled interventions
  if %w[planification planifiee en_cours].include?(status)
    3.times do |slot_index|
      InterventionTimeSlot.create!(
        intervention: intervention,
        proposed_by: prestataires.sample,
        start_time: (slot_index + 1).days.from_now.change(hour: rand(8..16)),
        end_time: (slot_index + 1).days.from_now.change(hour: rand(17..19)),
        status: slot_index == 0 ? "confirmed" : "proposed"
      )
    end
  end
end

puts "   ✅ Created #{Intervention.count} interventions"
puts "   ✅ Created #{InterventionAssignment.count} assignments"
puts "   ✅ Created #{InterventionQuote.count} quotes"
puts "   ✅ Created #{InterventionTimeSlot.count} time slots"

# ============================================================
# 5. NOTIFICATIONS
# ============================================================

puts "\n🔔 Creating notifications..."

NOTIFICATION_TYPES = %w[
  intervention_created
  intervention_updated
  intervention_assigned
  quote_received
  quote_accepted
  slot_proposed
  slot_confirmed
  intervention_completed
]

User.find_each do |user|
  rand(5..15).times do
    Notification.create!(
      user: user,
      title: Faker::Lorem.sentence(word_count: 4),
      body: Faker::Lorem.paragraph,
      notification_type: NOTIFICATION_TYPES.sample,
      read_at: [nil, nil, nil, Time.current].sample,  # 75% unread
      created_at: rand(14).days.ago
    )
  end
end

puts "   ✅ Created #{Notification.count} notifications"

# ============================================================
# 6. CONVERSATIONS
# ============================================================

puts "\n💬 Creating conversations..."

interventions_with_chat = Intervention.where(
  status: %w[planifiee en_cours cloturee_par_prestataire]
).limit(20)

interventions_with_chat.each do |intervention|
  thread = ConversationThread.create!(
    intervention: intervention,
    subject: "Discussion - #{intervention.title}"
  )

  # Add 3-8 messages per thread
  participants = [
    intervention.created_by,
    intervention.assignments.first&.user,
    locataires.sample
  ].compact

  rand(3..8).times do |msg_index|
    ConversationMessage.create!(
      conversation_thread: thread,
      user: participants.sample,
      content: Faker::Lorem.paragraph,
      created_at: intervention.created_at + (msg_index * rand(1..12)).hours
    )
  end
end

puts "   ✅ Created #{ConversationThread.count} conversation threads"
puts "   ✅ Created #{ConversationMessage.count} messages"

# ============================================================
# SUMMARY
# ============================================================

puts "\n" + "=" * 50
puts "🎉 SEIDO Seeding Complete!"
puts "=" * 50
puts ""
puts "📊 Summary:"
puts "   Teams:         #{Team.count}"
puts "   Users:         #{User.count}"
puts "   Buildings:     #{Building.count}"
puts "   Lots:          #{Lot.count}"
puts "   Interventions: #{Intervention.count}"
puts "   Quotes:        #{InterventionQuote.count}"
puts "   Time Slots:    #{InterventionTimeSlot.count}"
puts "   Notifications: #{Notification.count}"
puts "   Conversations: #{ConversationThread.count}"
puts "   Messages:      #{ConversationMessage.count}"
puts ""
puts "🔐 Login Credentials:"
puts "   All users: password123"
puts ""
puts "   Admins:"
created_users[:admin].each { |u| puts "     - #{u.email}" }
puts "   Gestionnaires:"
created_users[:gestionnaire].each { |u| puts "     - #{u.email}" }
puts "   Prestataires:"
created_users[:prestataire].first(2).each { |u| puts "     - #{u.email}" }
puts "   Locataires:"
created_users[:locataire].first(2).each { |u| puts "     - #{u.email}" }
puts ""
puts "🚀 Ready to go! Run: bin/dev"
```

### 12.7.2 Quick Seed Commands

```bash
# Full seed
rails db:seed

# Reset and reseed
rails db:seed:replant

# Seed specific data (if using separate seed files)
rails db:seed:teams
rails db:seed:users
rails db:seed:interventions

# Verify seeding worked
rails runner "
  puts 'Teams: ' + Team.count.to_s
  puts 'Users: ' + User.count.to_s
  puts 'Interventions: ' + Intervention.count.to_s
"
```

### 12.7.3 FactoryBot Alternative

For tests, use FactoryBot instead of seeds:

```ruby
# spec/factories/interventions.rb
FactoryBot.define do
  factory :intervention do
    association :team
    association :lot
    association :created_by, factory: :user

    title { "#{Faker::House.furniture} - Réparation" }
    description { Faker::Lorem.paragraph }
    priority { %w[basse normale haute urgente].sample }
    status { "demande" }

    trait :with_quote do
      after(:create) do |intervention|
        create(:intervention_quote, intervention: intervention)
      end
    end

    trait :scheduled do
      status { "planifiee" }
      after(:create) do |intervention|
        create(:intervention_assignment, intervention: intervention)
        create(:intervention_time_slot, intervention: intervention, status: "confirmed")
      end
    end
  end
end
```

---

## 12.8 References

### 12.8.1 Official Documentation

- [Ruby on Rails Guides](https://guides.rubyonrails.org/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Devise Documentation](https://github.com/heartcombo/devise)
- [Pundit Documentation](https://github.com/varvet/pundit)
- [AASM Documentation](https://github.com/aasm/aasm)
- [Sidekiq Documentation](https://github.com/mperham/sidekiq)
- [ActionCable Guide](https://guides.rubyonrails.org/action_cable_overview.html)
- [Stripe Ruby SDK](https://stripe.com/docs/api?lang=ruby)

### 12.7.2 Related Project Documents

- `docs/design/persona-gestionnaire-unifie.md` - Gestionnaire user persona
- `docs/design/persona-locataire.md` - Locataire user persona
- `docs/design/persona-prestataire.md` - Prestataire user persona
- `docs/design/ux-ui-decision-guide.md` - UX/UI guidelines
- `docs/troubleshooting-checklist.md` - Common issues and solutions

### 12.7.3 Source Document

This architecture document was created based on:
- `docs/architecture/optimal-database-architecture-rbac-subscriptions.md` (6,577 lines)

---

## 12.9 Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-12-30 | Claude | Initial creation from Next.js/Supabase architecture |
| 1.1 | 2024-12-30 | Claude | Added Section 0 (Getting Started) and Section 12.7 (Seed Data) |

---

*End of Section 12 - Appendices*

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
    puts '🔍 Checking for vulnerable gems...'
    system('bundle audit check --update') || exit(1)

    puts '🔍 Checking for Ruby vulnerabilities...'
    system('bundle exec ruby-audit check') || exit(1)

    puts '🔍 Running Brakeman...'
    system('bundle exec brakeman -q --no-summary -w2') || exit(1)

    puts '✅ All security checks passed!'
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

Cette section définit les conventions et patterns pour une API REST robuste, scalable et facile à maintenir.

## 18.1 Pagination Strategy

### 18.1.1 Cursor-Based Pagination (Recommandé)

**Avantages** : Performance constante O(1), pas de problème de "page drift" lors d'insertions/suppressions.

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

**Usage dans un contrôleur** :

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

**Usage** : Pour les petites collections ou quand le numéro de page est requis.

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
      title: "Session expirée"
      detail: "Votre session a expiré. Veuillez vous reconnecter."
    AUTH_002:
      title: "Token invalide"
      detail: "Le token d'authentification est invalide."
    AUTHZ_001:
      title: "Accès non autorisé"
      detail: "Vous n'avez pas les permissions nécessaires."
    VALIDATION_001:
      title: "Données invalides"
      detail: "Les données fournies ne sont pas valides."
    RESOURCE_001:
      title: "Ressource introuvable"
      detail: "La ressource demandée n'existe pas."
    CONFLICT_003:
      title: "Transition invalide"
      detail: "Cette action n'est pas possible dans l'état actuel."

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
        description: 'API de gestion immobilière SEIDO',
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

Cette section établit les standards de qualité de code et les outils pour les maintenir.

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

### 19.1.3 Intégration CI

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

# Modèles: max 200 lignes
# Si plus → extraire en concerns

# Contrôleurs: max 100 lignes
# Si plus → extraire en concerns ou services

# Services: max 100 lignes
# Si plus → découper en services plus petits

# Méthodes: max 20 lignes
# Complexité cyclomatique: max 7

# ========== Script de vérification ==========
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
        puts "⚠️  #{file}: #{lines} lines (max: #{max})"
      end
    end

    puts "\n=== Complexity Check (Flog) ==="
    flog = Flog.new
    flog.flog('app/')

    flog.totals.select { |_, score| score > 20 }.each do |method, score|
      puts "⚠️  #{method}: #{score.round(1)} complexity"
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
  # Service pour créer une nouvelle intervention
  #
  # Ce service gère la création d'une intervention avec toutes les
  # validations métier et les notifications associées.
  #
  # @example Création basique
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
  # @example Avec fichiers attachés
  #   result = Interventions::CreateService.call(
  #     params: intervention_params.merge(documents: uploaded_files),
  #     user: current_user,
  #     team: current_team
  #   )
  #
  # @see InterventionPolicy#create? pour les règles d'autorisation
  # @see Intervention::STATUSES pour les statuts disponibles
  #
  # @author SEIDO Team
  # @since 1.0.0
  class CreateService < ApplicationService
    # @!attribute [r] params
    #   @return [Hash] paramètres de l'intervention
    # @!attribute [r] user
    #   @return [User] utilisateur créateur
    # @!attribute [r] team
    #   @return [Team] équipe propriétaire

    # Crée une nouvelle intervention
    #
    # @param params [Hash] les paramètres de l'intervention
    # @option params [String] :title titre de l'intervention
    # @option params [String] :description description détaillée
    # @option params [String] :priority niveau de priorité
    # @option params [UUID] :lot_id identifiant du lot concerné
    # @option params [UUID] :building_id identifiant de l'immeuble (optionnel)
    # @option params [Array<ActionDispatch::Http::UploadedFile>] :documents fichiers joints
    #
    # @param user [User] l'utilisateur qui crée l'intervention
    # @param team [Team] l'équipe propriétaire de l'intervention
    #
    # @return [ServiceResult] résultat avec l'intervention ou l'erreur
    #   - success: true si création réussie
    #   - data: l'objet Intervention créé
    #   - error: message d'erreur si échec
    #
    # @raise [Pundit::NotAuthorizedError] si l'utilisateur n'a pas le droit de créer
    # @raise [ActiveRecord::RecordInvalid] si les validations échouent
    #
    # @note Cette méthode envoie des notifications aux gestionnaires
    # @todo Ajouter le support des interventions récurrentes
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

### 19.4.3 Génération Documentation

```bash
# Générer la documentation
bundle exec yard doc

# Serveur local
bundle exec yard server --reload

# Vérifier la couverture
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
      puts '✅ No dead code detected!'
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

# 20. Testing Enhancements

Cette section couvre les pratiques avancées de testing pour garantir la qualité et la fiabilité du code.

## 20.1 Coverage Enforcement

### 20.1.1 SimpleCov Configuration

```ruby
# spec/support/simplecov.rb
require 'simplecov'
require 'simplecov-lcov'
require 'simplecov-json'

SimpleCov.start 'rails' do
  # Minimum coverage thresholds
  minimum_coverage 80
  minimum_coverage_by_file 60

  # Fail the build if coverage drops
  refuse_coverage_drop

  # Coverage groups
  add_group 'Models', 'app/models'
  add_group 'Controllers', 'app/controllers'
  add_group 'Services', 'app/services'
  add_group 'Policies', 'app/policies'
  add_group 'Jobs', 'app/jobs'
  add_group 'Channels', 'app/channels'
  add_group 'Components', 'app/components'
  add_group 'Mailers', 'app/mailers'
  add_group 'Serializers', 'app/serializers'

  # Exclude non-testable files
  add_filter '/spec/'
  add_filter '/config/'
  add_filter '/db/'
  add_filter '/vendor/'
  add_filter 'app/admin/'  # ActiveAdmin views

  # Track which files have no coverage
  track_files 'app/**/*.rb'

  # Multiple formatters
  formatter SimpleCov::Formatter::MultiFormatter.new([
    SimpleCov::Formatter::HTMLFormatter,
    SimpleCov::Formatter::LcovFormatter,
    SimpleCov::Formatter::JSONFormatter
  ])
end

# For parallel tests (parallel_tests gem)
if ENV['TEST_ENV_NUMBER']
  SimpleCov.command_name "rspec-#{ENV['TEST_ENV_NUMBER']}"
end
```

### 20.1.2 Per-File Minimum Coverage

```ruby
# spec/support/coverage_check.rb
RSpec.configure do |config|
  config.after(:suite) do
    # Custom per-directory thresholds
    thresholds = {
      'app/models' => 90,
      'app/services' => 95,
      'app/policies' => 100,
      'app/controllers/api' => 85
    }

    SimpleCov.result.groups.each do |name, files|
      threshold = thresholds[name] || 80
      coverage = files.covered_percent

      if coverage < threshold
        warn "⚠️  Coverage for #{name} is #{coverage.round(1)}% (minimum: #{threshold}%)"
      end
    end
  end
end
```

### 20.1.3 CI Integration

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v4

      - name: Set up Ruby
        uses: ruby/setup-ruby@v1
        with:
          ruby-version: 3.3
          bundler-cache: true

      - name: Setup Database
        env:
          RAILS_ENV: test
          DATABASE_URL: postgres://postgres:postgres@localhost:5432/seido_test
        run: |
          bundle exec rails db:create db:schema:load

      - name: Run Tests with Coverage
        env:
          RAILS_ENV: test
          DATABASE_URL: postgres://postgres:postgres@localhost:5432/seido_test
          REDIS_URL: redis://localhost:6379
          COVERAGE: true
        run: bundle exec rspec --format documentation --format RspecJunitFormatter --out tmp/rspec.xml

      - name: Upload Coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: coverage/lcov.info
          fail_ci_if_error: true

      - name: Check Coverage Threshold
        run: |
          COVERAGE=$(cat coverage/.last_run.json | jq '.result.covered_percent')
          if (( $(echo "$COVERAGE < 80" | bc -l) )); then
            echo "Coverage is $COVERAGE% which is below 80%"
            exit 1
          fi
          echo "Coverage is $COVERAGE%"

      - name: Upload Test Results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: test-results
          path: tmp/rspec.xml
```

---

## 20.2 Performance Testing

### 20.2.1 Query Count Assertions

```ruby
# spec/support/query_counter.rb
module QueryCounter
  class Counter
    attr_reader :queries

    def initialize
      @queries = []
    end

    def call(name, _started, _finished, _unique_id, payload)
      return if %w[CACHE SCHEMA].include?(payload[:name])
      return if payload[:sql]&.match?(/\A(BEGIN|COMMIT|ROLLBACK|SAVEPOINT|RELEASE)/i)

      @queries << {
        name: payload[:name],
        sql: payload[:sql],
        binds: payload[:binds]&.map { |b| [b.name, b.value] }
      }
    end

    def count
      queries.size
    end

    def reset!
      @queries.clear
    end
  end

  def self.counter
    @counter ||= Counter.new
  end

  def self.count(&block)
    counter.reset!
    ActiveSupport::Notifications.subscribed(counter, 'sql.active_record', &block)
    counter.count
  end

  def self.queries(&block)
    counter.reset!
    ActiveSupport::Notifications.subscribed(counter, 'sql.active_record', &block)
    counter.queries
  end
end

# RSpec matcher
RSpec::Matchers.define :execute_queries do |expected_count|
  supports_block_expectations

  match do |block|
    @actual_count = QueryCounter.count(&block)
    @actual_count == expected_count
  end

  match_when_negated do |block|
    @actual_count = QueryCounter.count(&block)
    @actual_count != expected_count
  end

  failure_message do
    queries = QueryCounter.counter.queries.map { |q| "  - #{q[:sql]}" }.join("\n")
    "expected #{expected_count} queries, got #{@actual_count}:\n#{queries}"
  end

  chain :or_fewer do
    @or_fewer = true
  end

  match do |block|
    @actual_count = QueryCounter.count(&block)
    if @or_fewer
      @actual_count <= expected_count
    else
      @actual_count == expected_count
    end
  end
end

# Usage in specs
RSpec.describe InterventionsController do
  describe 'GET #index' do
    let!(:interventions) { create_list(:intervention, 10) }

    it 'does not produce N+1 queries' do
      expect {
        get :index
      }.to execute_queries(3).or_fewer  # SELECT interventions, lots, buildings
    end
  end
end
```

### 20.2.2 Benchmark Specs

```ruby
# spec/support/benchmark_helper.rb
module BenchmarkHelper
  def benchmark_operation(name:, iterations: 100, &block)
    require 'benchmark/ips'

    Benchmark.ips do |x|
      x.config(time: 5, warmup: 2)

      x.report(name) do
        block.call
      end

      x.compare!
    end
  end

  def expect_to_complete_within(seconds, &block)
    start_time = Process.clock_gettime(Process::CLOCK_MONOTONIC)
    block.call
    elapsed = Process.clock_gettime(Process::CLOCK_MONOTONIC) - start_time

    expect(elapsed).to be < seconds,
      "Expected operation to complete within #{seconds}s, but took #{elapsed.round(3)}s"
  end
end

RSpec.configure do |config|
  config.include BenchmarkHelper, type: :benchmark
end

# spec/benchmarks/intervention_list_spec.rb
RSpec.describe 'Intervention list performance', type: :benchmark do
  let!(:team) { create(:team) }
  let!(:interventions) { create_list(:intervention, 1000, team: team) }

  it 'loads 1000 interventions in under 200ms' do
    expect_to_complete_within(0.2) do
      Intervention.where(team: team).includes(:lot, :building, :assignments).to_a
    end
  end

  it 'filters by status efficiently' do
    expect_to_complete_within(0.1) do
      Intervention.where(team: team, status: 'planifiee').count
    end
  end
end
```

### 20.2.3 Memory Profiling

```ruby
# spec/support/memory_profiler_helper.rb
require 'memory_profiler'

module MemoryProfilerHelper
  def profile_memory(&block)
    report = MemoryProfiler.report(&block)
    {
      total_allocated: report.total_allocated,
      total_retained: report.total_retained,
      allocated_memory: report.total_allocated_memsize,
      retained_memory: report.total_retained_memsize
    }
  end

  def expect_memory_allocation_under(max_bytes, &block)
    result = profile_memory(&block)
    expect(result[:allocated_memory]).to be < max_bytes,
      "Expected memory allocation under #{max_bytes} bytes, got #{result[:allocated_memory]}"
  end
end

RSpec.configure do |config|
  config.include MemoryProfilerHelper, type: :memory
end

# spec/memory/intervention_export_spec.rb
RSpec.describe 'Intervention export memory', type: :memory do
  let!(:interventions) { create_list(:intervention, 1000) }

  it 'exports without excessive memory allocation' do
    # 50MB limit for exporting 1000 records
    expect_memory_allocation_under(50.megabytes) do
      Interventions::ExportService.call(
        interventions: Intervention.all,
        format: :csv
      )
    end
  end
end
```

---

## 20.3 External API Mocking

### 20.3.1 VCR Configuration

```ruby
# spec/support/vcr.rb
require 'vcr'

VCR.configure do |config|
  config.cassette_library_dir = 'spec/cassettes'
  config.hook_into :webmock
  config.configure_rspec_metadata!

  # Filter sensitive data
  config.filter_sensitive_data('<STRIPE_API_KEY>') { ENV['STRIPE_API_KEY'] }
  config.filter_sensitive_data('<RESEND_API_KEY>') { ENV['RESEND_API_KEY'] }
  config.filter_sensitive_data('<SENTRY_DSN>') { ENV['SENTRY_DSN'] }

  # Allow localhost connections (for Capybara)
  config.ignore_localhost = true

  # Ignore specific hosts
  config.ignore_hosts(
    'chromedriver.storage.googleapis.com',
    'selenium-release.storage.googleapis.com'
  )

  # Default cassette options
  config.default_cassette_options = {
    record: :new_episodes,
    match_requests_on: [:method, :uri, :body],
    allow_playback_repeats: true,
    decode_compressed_response: true
  }

  # Custom request matcher for multipart
  config.register_request_matcher :multipart_body do |request_1, request_2|
    if request_1.headers['Content-Type']&.first&.include?('multipart/form-data')
      # For multipart, just check the method and path match
      true
    else
      VCR.default_cassette_options[:match_requests_on].all? do |matcher|
        VCR.request_matchers[matcher].match?(request_1, request_2)
      end
    end
  end
end

# Disable VCR for certain tests
RSpec.configure do |config|
  config.around(:each, :vcr_off) do |example|
    VCR.turn_off!
    example.run
    VCR.turn_on!
  end
end
```

### 20.3.2 WebMock Configuration

```ruby
# spec/support/webmock.rb
require 'webmock/rspec'

WebMock.disable_net_connect!(
  allow_localhost: true,
  allow: [
    /chromedriver/,
    /selenium/,
    'codeclimate.com'
  ]
)

# Stub common external services
RSpec.configure do |config|
  config.before(:each) do
    # Stub Stripe
    stub_request(:any, /api.stripe.com/)
      .to_return(status: 200, body: '{}', headers: { 'Content-Type' => 'application/json' })

    # Stub Resend
    stub_request(:post, /api.resend.com/)
      .to_return(status: 200, body: '{"id": "test-email-id"}', headers: { 'Content-Type' => 'application/json' })

    # Stub Sentry
    stub_request(:post, /sentry.io/)
      .to_return(status: 200)
  end
end
```

### 20.3.3 Stripe Test Mode

```ruby
# spec/support/stripe.rb
require 'stripe_mock'

RSpec.configure do |config|
  config.before(:each, :stripe) do
    StripeMock.start
  end

  config.after(:each, :stripe) do
    StripeMock.stop
  end
end

# Stripe test helpers
module StripeTestHelper
  def create_stripe_customer(email: 'test@example.com')
    Stripe::Customer.create(email: email)
  end

  def create_stripe_subscription(customer_id:, price_id:)
    Stripe::Subscription.create(
      customer: customer_id,
      items: [{ price: price_id }]
    )
  end

  def mock_successful_payment(amount: 1000)
    StripeMock.create_test_helper.create_payment_intent(
      amount: amount,
      currency: 'eur',
      status: 'succeeded'
    )
  end

  def mock_failed_payment(error_code: 'card_declined')
    StripeMock.prepare_card_error(error_code)
  end
end

RSpec.configure do |config|
  config.include StripeTestHelper, :stripe
end

# Usage
RSpec.describe SubscriptionService, :stripe do
  describe '#create' do
    it 'creates a subscription successfully' do
      customer = create_stripe_customer
      result = described_class.new(customer.id).create(price_id: 'price_monthly')

      expect(result).to be_success
      expect(result.subscription).to be_present
    end

    it 'handles payment failure' do
      customer = create_stripe_customer
      mock_failed_payment(error_code: 'insufficient_funds')

      result = described_class.new(customer.id).create(price_id: 'price_monthly')

      expect(result).to be_failure
      expect(result.error).to include('insufficient_funds')
    end
  end
end
```

---

## 20.4 Visual Regression Testing

### 20.4.1 Percy Configuration

```ruby
# Gemfile (test group)
gem 'percy-capybara', '~> 5.0'

# spec/support/percy.rb
require 'percy/capybara'

Percy.config.enabled = ENV['PERCY_TOKEN'].present?

module PercyHelper
  def percy_snapshot(name, options = {})
    return unless Percy.enabled?

    Percy::Capybara.snapshot(page, name: name, **options)
  end

  def percy_responsive_snapshot(name, widths: [375, 768, 1280])
    widths.each do |width|
      page.driver.browser.manage.window.resize_to(width, 1024)
      percy_snapshot("#{name} - #{width}px")
    end
  end
end

RSpec.configure do |config|
  config.include PercyHelper, type: :system
end
```

### 20.4.2 Screenshot Comparison

```ruby
# spec/support/screenshot_testing.rb
require 'chunky_png'
require 'fileutils'

module ScreenshotTesting
  BASELINE_DIR = Rails.root.join('spec/fixtures/screenshots/baseline')
  DIFF_DIR = Rails.root.join('tmp/screenshot_diffs')
  THRESHOLD = 0.01  # 1% difference allowed

  def capture_and_compare(name)
    current_path = capture_screenshot(name)
    baseline_path = BASELINE_DIR.join("#{name}.png")

    unless File.exist?(baseline_path)
      FileUtils.cp(current_path, baseline_path)
      return { status: :new_baseline, message: "Created baseline for #{name}" }
    end

    diff_percentage = compare_images(baseline_path, current_path)

    if diff_percentage > THRESHOLD
      save_diff_image(baseline_path, current_path, name)
      { status: :failed, diff: diff_percentage, message: "Visual difference: #{diff_percentage.round(2)}%" }
    else
      { status: :passed, diff: diff_percentage }
    end
  end

  private

  def capture_screenshot(name)
    path = Rails.root.join("tmp/screenshots/#{name}.png")
    FileUtils.mkdir_p(File.dirname(path))
    page.save_screenshot(path, full: true)
    path
  end

  def compare_images(baseline_path, current_path)
    baseline = ChunkyPNG::Image.from_file(baseline_path)
    current = ChunkyPNG::Image.from_file(current_path)

    return 1.0 if baseline.dimension != current.dimension

    diff_pixels = 0
    total_pixels = baseline.width * baseline.height

    baseline.height.times do |y|
      baseline.width.times do |x|
        diff_pixels += 1 if baseline[x, y] != current[x, y]
      end
    end

    diff_pixels.to_f / total_pixels
  end

  def save_diff_image(baseline_path, current_path, name)
    FileUtils.mkdir_p(DIFF_DIR)

    baseline = ChunkyPNG::Image.from_file(baseline_path)
    current = ChunkyPNG::Image.from_file(current_path)

    diff = ChunkyPNG::Image.new(baseline.width, baseline.height)

    baseline.height.times do |y|
      baseline.width.times do |x|
        if baseline[x, y] != current[x, y]
          diff[x, y] = ChunkyPNG::Color.rgb(255, 0, 0)  # Red for differences
        else
          diff[x, y] = ChunkyPNG::Color.grayscale(
            ChunkyPNG::Color.r(baseline[x, y])
          )
        end
      end
    end

    diff.save(DIFF_DIR.join("#{name}_diff.png"))
  end
end

RSpec.configure do |config|
  config.include ScreenshotTesting, type: :system
end
```

### 20.4.3 CI Workflow for Visual Testing

```yaml
# .github/workflows/visual.yml
name: Visual Regression

on:
  push:
    branches: [main, develop]
  pull_request:

jobs:
  visual-test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Set up Ruby
        uses: ruby/setup-ruby@v1
        with:
          ruby-version: 3.3
          bundler-cache: true

      - name: Install Chrome
        uses: browser-actions/setup-chrome@v1

      - name: Setup Database
        env:
          RAILS_ENV: test
          DATABASE_URL: postgres://postgres:postgres@localhost:5432/seido_test
        run: bundle exec rails db:create db:schema:load

      - name: Run Visual Tests
        env:
          RAILS_ENV: test
          PERCY_TOKEN: ${{ secrets.PERCY_TOKEN }}
        run: |
          bundle exec rspec spec/system --tag visual

      - name: Upload Diff Artifacts
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: visual-diffs
          path: tmp/screenshot_diffs/
```

---

## 20.5 Contract Testing

### 20.5.1 Pact Configuration

```ruby
# Gemfile (test group)
gem 'pact', '~> 1.64'

# spec/pacts/provider_spec.rb
require 'pact/provider/rspec'

Pact.service_provider 'SEIDO API' do
  honours_pact_with 'SEIDO Mobile App' do
    pact_uri 'spec/pacts/seido_mobile_app-seido_api.json'
  end

  honours_pact_with 'SEIDO Web Client' do
    pact_uri 'spec/pacts/seido_web_client-seido_api.json'
  end
end

# Configure provider states
Pact.provider_states_for 'SEIDO Mobile App' do
  provider_state 'an intervention exists' do
    set_up do
      @intervention = create(:intervention, id: 'test-uuid', title: 'Test Intervention')
    end

    tear_down do
      @intervention&.destroy
    end
  end

  provider_state 'user is authenticated' do
    set_up do
      @user = create(:user)
      allow_any_instance_of(ApplicationController).to receive(:current_user).and_return(@user)
    end
  end
end
```

### 20.5.2 Consumer Contract

```ruby
# spec/pacts/seido_api_consumer_spec.rb
require 'pact/consumer/rspec'

Pact.service_consumer 'SEIDO Web Client' do
  has_pact_with 'SEIDO API' do
    mock_service :seido_api do
      port 1234
    end
  end
end

RSpec.describe 'SEIDO API Contract', pact: true do
  describe 'GET /api/v1/interventions/:id' do
    before do
      seido_api
        .given('an intervention exists')
        .upon_receiving('a request for an intervention')
        .with(
          method: :get,
          path: '/api/v1/interventions/test-uuid',
          headers: { 'Authorization' => 'Bearer token123' }
        )
        .will_respond_with(
          status: 200,
          headers: { 'Content-Type' => 'application/json' },
          body: {
            data: {
              id: Pact.like('test-uuid'),
              type: 'intervention',
              attributes: {
                title: Pact.like('Test Intervention'),
                status: Pact.term(
                  generate: 'approuvee',
                  matcher: /^(demande|approuvee|planifiee|en_cours|cloturee)$/
                ),
                priority: Pact.term(
                  generate: 'normale',
                  matcher: /^(basse|normale|haute|urgente)$/
                ),
                created_at: Pact.like('2025-01-01T00:00:00Z')
              }
            }
          }
        )
    end

    it 'returns the intervention' do
      response = HTTParty.get(
        'http://localhost:1234/api/v1/interventions/test-uuid',
        headers: { 'Authorization' => 'Bearer token123' }
      )

      expect(response.code).to eq(200)
      expect(response.parsed_response['data']['attributes']['title']).to eq('Test Intervention')
    end
  end
end
```

---

## 20.6 Mutation Testing

### 20.6.1 Mutant Configuration

```ruby
# Gemfile (test group)
gem 'mutant-rspec', '~> 0.12'

# .mutant.yml
integration: rspec

includes:
  - 'app/services/**/*.rb'
  - 'app/models/**/*.rb'

excludes:
  - 'app/models/application_record.rb'

mutation:
  timeout: 10.0

matcher:
  subjects:
    - 'Interventions::CreateService'
    - 'Interventions::UpdateStatusService'
    - 'Intervention'

jobs: 4  # Parallel mutation testing
```

### 20.6.2 Rake Task

```ruby
# lib/tasks/mutation.rake
namespace :test do
  desc 'Run mutation testing on critical services'
  task mutation: :environment do
    critical_subjects = [
      'Interventions::CreateService',
      'Interventions::UpdateStatusService',
      'Notifications::SendService',
      'Payments::ProcessService'
    ]

    critical_subjects.each do |subject|
      puts "=== Mutation testing: #{subject} ==="
      system("bundle exec mutant run --use rspec '#{subject}'")
    end
  end

  desc 'Run mutation testing with coverage threshold'
  task mutation_check: :environment do
    result = `bundle exec mutant run --use rspec 'Interventions::*'`

    # Parse mutation score
    match = result.match(/Mutation score: (\d+\.\d+)%/)
    if match
      score = match[1].to_f
      if score < 80
        abort "Mutation score #{score}% is below threshold of 80%"
      else
        puts "✅ Mutation score: #{score}%"
      end
    end
  end
end
```

---

## 20.7 Flaky Test Detection

### 20.7.1 RSpec Retry Configuration

```ruby
# spec/support/rspec_retry.rb
require 'rspec/retry'

RSpec.configure do |config|
  # Retry failed examples up to 3 times
  config.around :each, :js do |example|
    example.run_with_retry retry: 3
  end

  # Log retried examples
  config.around :each do |example|
    example.run

    if example.exception && !example.metadata[:retry_count].nil?
      puts "⚠️  Flaky test detected: #{example.full_description}"
      puts "   Retried #{example.metadata[:retry_count]} times"
    end
  end
end
```

### 20.7.2 Flaky Test Reporter

```ruby
# spec/support/flaky_reporter.rb
class FlakyTestReporter
  def initialize
    @flaky_tests = []
  end

  def example_failed(notification)
    example = notification.example
    if example.metadata[:retry_count]&.positive?
      @flaky_tests << {
        description: example.full_description,
        location: example.location,
        retry_count: example.metadata[:retry_count],
        exception: notification.exception.message
      }
    end
  end

  def close(_notification)
    return if @flaky_tests.empty?

    File.open('tmp/flaky_tests.json', 'w') do |f|
      f.write(JSON.pretty_generate(@flaky_tests))
    end

    puts "\n⚠️  #{@flaky_tests.size} flaky tests detected!"
    puts "Report saved to tmp/flaky_tests.json"
  end
end

RSpec.configure do |config|
  config.reporter.register_listener(
    FlakyTestReporter.new,
    :example_failed,
    :close
  )
end
```

### 20.7.3 CI Quarantine

```yaml
# .github/workflows/test.yml (addition)
- name: Run Quarantined Tests
  continue-on-error: true
  env:
    QUARANTINE: true
  run: |
    bundle exec rspec --tag quarantine --format json --out tmp/quarantine.json

- name: Report Quarantined Tests
  if: always()
  run: |
    if [ -f tmp/quarantine.json ]; then
      FAILED=$(cat tmp/quarantine.json | jq '.summary.failure_count')
      if [ "$FAILED" -gt 0 ]; then
        echo "::warning::$FAILED quarantined tests still failing"
      fi
    fi
```

```ruby
# Usage in specs
RSpec.describe 'Flaky integration', :quarantine do
  it 'sometimes fails due to timing' do
    # Test that needs investigation
  end
end
```

---

*End of Section 20 - Testing Enhancements*

---

**SEIDO Architecture - Ruby on Rails**

This document provides a complete architectural blueprint for rebuilding SEIDO as a Ruby on Rails application. It covers:

### Core Architecture (Sections 1-12)
1. **SEIDO Overview** - Application context, personas, and workflows
2. **Tech Stack** - Rails gems and infrastructure choices
3. **Data Models** - 33+ tables across 7 phases
4. **PostgreSQL Migrations** - Raw SQL schema with 150+ indexes
5. **Authorization** - Pundit policies replacing Supabase RLS
6. **State Machines** - AASM for intervention workflow
7. **Services & Jobs** - Business logic and background processing
8. **Real-time** - ActionCable channels for live updates
9. **REST API** - JWT authentication and versioned endpoints
10. **Testing** - RSpec strategy with 80%+ coverage
11. **Deployment** - Docker, monitoring, and security
12. **Appendices** - Glossary, references, and migration checklist

### Production-Ready Enhancements (Sections 13-20)
13. **Performance Optimization** - N+1 detection, caching, connection pooling
14. **CI/CD Pipeline** - GitHub Actions, zero-downtime migrations, feature flags
15. **Scalability Patterns** - Read replicas, horizontal scaling, background jobs
16. **Security Hardening** - Rate limiting, encryption, CORS, dependency scanning
17. **Frontend Integration** - ViewComponent, Stimulus, Turbo, accessibility
18. **API Best Practices** - Pagination, error handling, filtering, versioning
19. **Code Quality Tools** - Rubocop, Brakeman, YARD documentation
20. **Testing Enhancements** - Coverage, performance testing, visual regression

**Total Estimated Implementation Time**: 12-16 weeks with a team of 2-3 Rails developers.

**Document Statistics**:
- **Total Lines**: ~25,500
- **Sections**: 20
- **Code Examples**: 300+
- **Gems Referenced**: 50+

---
