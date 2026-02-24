> Part of [SEIDO Rails Architecture](../seido-rails-architecture.md)

← Previous: [Authorization](05-authorization.md) | Next: [Services &amp; Jobs](07-services-jobs.md) →

---

# 6. State Machines (AASM)

SEIDO uses AASM (Acts As State Machine) to manage the complex intervention workflow and other status-based entities. This section details all state machines in the system.

> **NOTE (2026-02-02):** This section has been updated to reflect the **9-status workflow**.
> Quotes are managed via the `intervention_quotes` table (not a separate status).

---

## 6.1 Overview

### 6.1.1 Why AASM?

| Feature | Raw Enum | AASM |
|---------|---------|------|
| **Status tracking** | Yes | Yes |
| **Transition validation** | No | Yes |
| **Guards (conditions)** | No | Yes |
| **Callbacks** | No | Yes |
| **Event-driven** | No | Yes |
| **History** | No | Possible |
| **Introspection** | No | Yes |

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

### 6.2.1 State Diagram (9 Statuses)

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           INTERVENTION STATE MACHINE (9 STATES)                          │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                          │
│                              ┌──────────┐                                               │
│                              │ demande  │ (Initial)                                     │
│                              └────┬─────┘                                               │
│                                   │                                                     │
│               ┌───────────────────┴───────────────────┐                                 │
│               │ reject                        approve │                                 │
│               ▼                                       ▼                                 │
│        ┌──────────┐                           ┌──────────┐                              │
│        │ rejetee  │                           │ approuvee│                              │
│        │ (End)    │                           │          │                              │
│        └──────────┘                           └────┬─────┘                              │
│                                                    │ start_scheduling                   │
│                                                    ▼                                    │
│                          ┌─────────────────┐                                            │
│                          │  planification  │  <- Quote handling via intervention_quotes  │
│                          │                 │    (requires_quote flag)                   │
│                          └────────┬────────┘                                            │
│                                   │ schedule                                            │
│                                   ▼                                                     │
│                          ┌─────────────────┐                                            │
│                          │   planifiee     │                                            │
│                          └────────┬────────┘                                            │
│                                   │                                                     │
│               ┌───────────────────┼───────────────────┐                                 │
│               │ close_by_provider │                   │ close_by_manager                │
│               ▼                   │                   ▼                                 │
│    ┌──────────────────────────────┴┐        ┌──────────────────────────────┐            │
│    │  cloturee_par_prestataire    │        │  cloturee_par_gestionnaire   │            │
│    │  Provider finished           │        │  Manager finalized (End)     │            │
│    └──────────────┬───────────────┘        └──────────────────────────────┘            │
│                   │                                   ▲                                 │
│                   │ close_by_tenant                   │                                 │
│                   ▼                                   │                                 │
│    ┌──────────────────────────────┐                   │                                 │
│    │  cloturee_par_locataire      │───────────────────┘                                 │
│    │  Tenant validated            │  close_by_manager                                   │
│    └──────────────────────────────┘                                                     │
│                                                                                          │
│        ┌──────────┐                                                                     │
│        │ annulee  │  <---- Can be reached from: demande, approuvee, planification,     │
│        │ (End)    │        planifiee, cloturee_par_prestataire, cloturee_par_locataire │
│        └──────────┘                                                                     │
│                                                                                          │
│  NOTE: Quotes are NOT a status. They are managed via intervention_quotes table.         │
│        Set requires_quote=true on intervention to request quotes from providers.        │
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

  # AASM State Machine (9 states)
  # NOTE: Quotes managed via intervention_quotes table (requires_quote flag)
  aasm column: :status, enum: true, whiny_persistence: true do
    # ===== STATES (9 total) =====
    state :demande, initial: true
    state :rejetee
    state :approuvee
    state :planification
    state :planifiee
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

    # Move to scheduling phase (quote handling via separate table)
    event :start_scheduling, after: :after_start_scheduling do
      transitions from: :approuvee, to: :planification,
                  after: :log_status_change
    end

    # Time slot is selected, intervention is scheduled
    event :schedule, after: :after_schedule do
      transitions from: :planification, to: :planifiee,
                  guard: :has_selected_time_slot?,
                  after: :log_status_change
    end

    # Provider marks work as complete (direct from planifiee)
    event :close_by_provider, after: :after_close_by_provider do
      transitions from: :planifiee, to: :cloturee_par_prestataire,
                  guard: :has_completion_report?,
                  after: :log_status_change
    end

    # Tenant validates the completed work
    event :close_by_tenant, after: :after_close_by_tenant do
      transitions from: :cloturee_par_prestataire, to: :cloturee_par_locataire,
                  after: :log_status_change
    end

    # Manager finalizes the intervention (final closure, can skip tenant)
    event :close_by_manager, after: :after_close_by_manager do
      transitions from: [:planifiee, :cloturee_par_prestataire, :cloturee_par_locataire], to: :cloturee_par_gestionnaire,
                  guard: :can_be_finalized?,
                  after: :log_status_change
    end

    # Cancel intervention (from any non-terminal state)
    event :cancel, after: :after_cancel do
      transitions from: [:demande, :approuvee, :planification, :planifiee, :cloturee_par_prestataire, :cloturee_par_locataire],
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
    # Quotes are managed via requires_quote flag, not a separate status
    requires_quote? && pending_quotes.any?
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

### 6.2.3 Status Transitions Summary (9 Statuses)

| From | Event | To | Who | Guard |
|------|-------|-----|-----|-------|
| `demande` | `approve` | `approuvee` | Manager | `can_be_approved?` |
| `demande` | `reject` | `rejetee` | Manager | - |
| `approuvee` | `start_scheduling` | `planification` | Manager | - |
| `planification` | `schedule` | `planifiee` | System/Tenant | `has_selected_time_slot?` |
| `planifiee` | `close_by_provider` | `cloturee_par_prestataire` | Provider | `has_completion_report?` |
| `planifiee` | `close_by_manager` | `cloturee_par_gestionnaire` | Manager | `can_be_finalized?` |
| `cloturee_par_prestataire` | `close_by_tenant` | `cloturee_par_locataire` | Tenant | - |
| `cloturee_par_prestataire`, `cloturee_par_locataire` | `close_by_manager` | `cloturee_par_gestionnaire` | Manager | `can_be_finalized?` |
| `!terminal` | `cancel` | `annulee` | Manager | - |
| `cloturee_par_prestataire`, `cloturee_par_locataire` | `reopen` | `planifiee` | Manager | - |

> **NOTE**: Quote management is handled via `intervention_quotes` table, not status transitions.
> Set `requires_quote=true` on intervention to request quotes from assigned providers.

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
│  │   INCOMPLETE   │ <--- Initial payment fails                              │
│  │  (setup_intent │                                                         │
│  │   pending)     │                                                         │
│  └───────┬────────┘                                                         │
│          │                                                                  │
│          │ payment_succeeds         ┌──────────────────┐                    │
│          │                          │ INCOMPLETE_EXPIRED│ <-- 23h timeout   │
│          ▼                          │     (END)        │                    │
│  ┌────────────────┐                 └──────────────────┘                    │
│  │   TRIALING     │ <--- Trial period active                                │
│  │  (14-30 days)  │                                                         │
│  └───────┬────────┘                                                         │
│          │                                                                  │
│          │ trial_ends / payment_succeeds                                    │
│          ▼                                                                  │
│  ┌────────────────┐     payment_fails      ┌────────────────┐               │
│  │    ACTIVE      │ ───────────────────>   │   PAST_DUE     │               │
│  │  (in good      │                        │  (grace period │               │
│  │   standing)    │ <───────────────────── │   1-7 days)    │               │
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
│  │     CANCELLED      │ <--- From ANY billable state                        │
│  │      (END)         │      (active, trialing, past_due, paused)          │
│  └────────────────────┘                                                     │
│                                                                             │
│  ===========================================================================│
│  Legend:                                                                    │
│  - Green states: Full feature access (trialing, active)                    │
│  - Yellow states: Degraded access (past_due, paused)                       │
│  - Red states: No access (unpaid, cancelled, incomplete_expired)           │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.7.2 Stripe Status Mapping

| Stripe Status | Rails Status | Feature Access | User Action Required |
|---------------|--------------|----------------|---------------------|
| `trialing` | `:trialing` | Full | None |
| `active` | `:active` | Full | None |
| `past_due` | `:past_due` | Full (grace) | Update payment method |
| `unpaid` | `:unpaid` | Read-only | Pay invoice or cancel |
| `canceled` | `:cancelled` | None | Resubscribe |
| `incomplete` | `:incomplete` | None | Complete payment |
| `incomplete_expired` | `:incomplete_expired` | None | Resubscribe |
| `paused` | `:paused` | Read-only | Resume subscription |

### 6.7.3 Full Implementation

```ruby
# app/models/subscription.rb
class Subscription < ApplicationRecord
  include AASM
  include Discard::Model

  # Associations
  belongs_to :team
  belongs_to :stripe_customer, optional: true
  has_many :stripe_invoices, dependent: :destroy
  has_one :stripe_price, through: :stripe_customer

  # Validations
  validates :stripe_subscription_id, presence: true, uniqueness: true
  validates :plan_id, presence: true
  validates :billing_cycle, presence: true, inclusion: { in: %w[monthly annual] }
  validates :team, uniqueness: { conditions: -> { where(discarded_at: nil) },
                                  message: 'already has an active subscription' }

  # Enums
  enum :billing_cycle, {
    monthly: 'monthly',
    annual: 'annual'
  }, prefix: true

  enum :plan_type, {
    starter: 'starter',
    professional: 'professional',
    enterprise: 'enterprise'
  }, prefix: true

  # Scopes
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

  # AASM State Machine
  aasm column: :status, enum: true, whiny_transitions: false do
    state :incomplete, initial: true
    state :trialing
    state :active
    state :past_due
    state :unpaid
    state :cancelled
    state :incomplete_expired
    state :paused

    # Activation Events
    event :start_trial, after: :after_trial_started do
      transitions from: :incomplete, to: :trialing,
                  guard: :has_valid_trial_period?
    end

    event :activate, after: :after_activated do
      transitions from: [:incomplete, :trialing], to: :active,
                  guard: :has_valid_payment_method?
      transitions from: :past_due, to: :active
      transitions from: :paused, to: :active
    end

    # Payment Events
    event :payment_failed, after: :after_payment_failed do
      transitions from: :active, to: :past_due
      transitions from: :trialing, to: :incomplete
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

    # Lifecycle Events
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

    # Reactivation Events
    event :reactivate, after: :after_reactivated do
      transitions from: [:cancelled, :incomplete_expired], to: :active,
                  guard: :can_reactivate?
    end
  end

  # Guard Methods
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

  # Callback Methods
  def after_trial_started
    update!(trial_started_at: Time.current)
    log_activity('subscription_trial_started')
    SubscriptionMailer.trial_started(self).deliver_later
    schedule_trial_reminder
  end

  def after_activated
    update!(activated_at: Time.current, past_due_since: nil)
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
    update!(past_due_since: nil, last_payment_at: Time.current, payment_failure_count: 0)
    log_activity('subscription_payment_succeeded')
    SubscriptionMailer.payment_succeeded(self).deliver_later
  end

  def after_marked_unpaid
    log_activity('subscription_marked_unpaid')
    SubscriptionMailer.subscription_unpaid(self).deliver_later
    restrict_team_features!
  end

  def after_paused
    update!(paused_at: Time.current, last_pause_at: Time.current, pause_count: pause_count.to_i + 1)
    log_activity('subscription_paused')
    SubscriptionMailer.subscription_paused(self).deliver_later
  end

  def after_resumed
    update!(paused_at: nil, resumed_at: Time.current)
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
    update!(cancelled_at: nil, reactivated_at: Time.current)
    log_activity('subscription_reactivated')
    SubscriptionMailer.subscription_reactivated(self).deliver_later
    unlock_team_features!
  end

  # Helper Methods
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
    when ['starter', 'annual'] then 2400
    when ['professional', 'monthly'] then 7900
    when ['professional', 'annual'] then 6500
    when ['enterprise', 'monthly'] then 19900
    when ['enterprise', 'annual'] then 16500
    else 0
    end
  end

  def annual_price_cents
    monthly_price_cents * 12
  end

  # Stripe Synchronization
  def sync_from_stripe!(stripe_subscription)
    target_status = map_stripe_status(stripe_subscription.status)
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
    Stripe::Subscription.update(stripe_subscription_id, cancel_at_period_end: true)
  rescue Stripe::InvalidRequestError => e
    Rails.logger.error("Failed to cancel Stripe subscription: #{e.message}")
  end

  # Class Methods
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
      t.string :plan_type, default: 'starter'
      t.string :billing_cycle, default: 'monthly'
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

    it 'can complete full lifecycle (9 statuses)' do
      # Approve
      intervention.approve!
      expect(intervention).to be_approuvee

      # Start scheduling (quotes handled via requires_quote flag, not status)
      intervention.start_scheduling!
      expect(intervention).to be_planification

      # Select time slot
      time_slot.accept!
      intervention.reload
      expect(intervention).to be_planifiee

      # Provider closes (direct from planifiee)
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
      # 9 statuses: removed demande_de_devis, en_cours
      %i[demande approuvee planification planifiee cloturee_par_prestataire cloturee_par_locataire].each do |state|
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
