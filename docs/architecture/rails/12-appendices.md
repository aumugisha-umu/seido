> Part of [SEIDO Rails Architecture](../seido-rails-architecture.md)

← Previous: [Production Quality](11-production-quality.md) | Back to: [Index](../seido-rails-architecture.md) →

# Appendices

---

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

## 12.2 Intervention Status Reference (9 Statuses)

| Status | French Name | Description | Who Can Trigger | Next States |
|--------|-------------|-------------|-----------------|-------------|
| `demande` | Demande | Initial request from tenant or manager | Any user | `approuvee`, `rejetee` |
| `rejetee` | Rejetée | Request rejected | Gestionnaire | *Terminal* |
| `approuvee` | Approuvée | Request approved | Gestionnaire | `planification` |
| `planification` | Planification | Finding suitable time slot (quotes via `intervention_quotes`) | System | `planifiee` |
| `planifiee` | Planifiée | Scheduled with confirmed date/time | Gestionnaire/Prestataire | `cloturee_par_prestataire`, `cloturee_par_gestionnaire`, `annulee` |
| `cloturee_par_prestataire` | Clôturée par prestataire | Provider marked complete | Prestataire | `cloturee_par_locataire`, `cloturee_par_gestionnaire` |
| `cloturee_par_locataire` | Clôturée par locataire | Tenant validated work | Locataire | `cloturee_par_gestionnaire` |
| `cloturee_par_gestionnaire` | Clôturée par gestionnaire | Final closure by manager | Gestionnaire | *Terminal* |
| `annulee` | Annulée | Cancelled | Gestionnaire | *Terminal* |

> **NOTE**: Quote management is handled via `intervention_quotes` table with `requires_quote` flag on intervention.
> The old `demande_de_devis` and `en_cours` statuses have been removed.

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

# 9 statuses (removed demande_de_devis, en_cours)
INTERVENTION_STATUSES = %w[
  demande
  approuvee
  planification
  planifiee
  cloturee_par_prestataire
  cloturee_par_locataire
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

  # Add assignment for certain statuses (9 statuses - no en_cours)
  if %w[planifiee cloturee_par_prestataire cloturee_par_locataire cloturee_par_gestionnaire].include?(status)
    InterventionAssignment.create!(
      intervention: intervention,
      user: prestataires.sample,
      assigned_at: intervention.created_at + 1.day,
      role: "prestataire"
    )
  end

  # Add quote for interventions requiring quotes (via requires_quote flag)
  if %w[planification planifiee].include?(status) && rand < 0.5
    intervention.update!(requires_quote: true)
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
  if %w[planification planifiee].include?(status)
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
  status: %w[planifiee cloturee_par_prestataire cloturee_par_locataire]
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
