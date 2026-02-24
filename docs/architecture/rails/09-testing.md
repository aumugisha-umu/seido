[← Back to Architecture Hub](../seido-rails-architecture.md) | [Previous: Real-time & API](./08-realtime-api.md) | [Next: Deployment & DevOps](./10-deployment-devops.md)

# 09 — Testing Strategy & Enhancements

> Combines Section 10 (Core Testing) and Section 20 (Testing Enhancements) from the full architecture document.

---

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
      # 9 statuses (removed demande_de_devis, en_cours)
      is_expected.to define_enum_for(:status).with_values(
        demande: 'demande',
        rejetee: 'rejetee',
        approuvee: 'approuvee',
        planification: 'planification',
        planifiee: 'planifiee',
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

    describe '#start_scheduling' do
      it 'transitions from approuvee to planification' do
        intervention.approve!

        # Start scheduling (quotes handled via requires_quote flag, not status)
        expect { intervention.start_scheduling! }
          .to change(intervention, :status)
          .from('approuvee').to('planification')
      end
    end

    describe '#cancel' do
      it 'can be cancelled from any state except terminal states' do
        # 9 statuses: removed demande_de_devis, en_cours
        [:demande, :approuvee, :planification, :planifiee].each do |state|
          intervention = create(:intervention, status: state)
          expect { intervention.cancel! }.to change(intervention, :status).to('annulee')
        end
      end

      it 'cannot be cancelled from terminal states' do
        intervention = create(:intervention, status: :cloturee_par_gestionnaire)
        expect { intervention.cancel! }.to raise_error(AASM::InvalidTransition)
      end
    end

    describe 'full workflow (9 statuses)' do
      it 'completes the entire intervention lifecycle' do
        intervention = create(:intervention, status: :demande)

        # Approval
        intervention.approve!
        expect(intervention).to be_approuvee

        # Enter planning (quotes handled via requires_quote flag, not status)
        intervention.start_scheduling!
        expect(intervention).to be_planification

        # Schedule
        intervention.schedule!
        expect(intervention).to be_planifiee

        # Provider completes (direct from planifiee)
        intervention.close_by_provider!
        expect(intervention).to be_cloturee_par_prestataire

        # Tenant validates
        intervention.close_by_tenant!
        expect(intervention).to be_cloturee_par_locataire

        # Manager closes
        intervention.close_by_manager!
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

    # Step 3: Start scheduling (quotes handled via requires_quote flag)
    click_button 'Planifier'
    check prestataire.full_name
    click_button 'Assigner'
    expect(intervention.reload.status).to eq('planification')

    # Step 4: Provider submits quote (via intervention_quotes table)
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

    # Step 6: Provider completes work (direct from planifiee - no en_cours status)
    sign_out gestionnaire
    sign_in prestataire
    visit prestataire_intervention_path(intervention)

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

# Section 20 — Testing Enhancements

---

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
        warn "Coverage for #{name} is #{coverage.round(1)}% (minimum: #{threshold}%)"
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
                  # 9 statuses (removed demande_de_devis, en_cours)
                  matcher: /^(demande|rejetee|approuvee|planification|planifiee|cloturee_par_prestataire|cloturee_par_locataire|cloturee_par_gestionnaire|annulee)$/
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
        puts "Mutation score: #{score}%"
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
      puts "Flaky test detected: #{example.full_description}"
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

    puts "\n#{@flaky_tests.size} flaky tests detected!"
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

[← Back to Architecture Hub](../seido-rails-architecture.md) | [Previous: Real-time & API](./08-realtime-api.md) | [Next: Deployment & DevOps](./10-deployment-devops.md)
