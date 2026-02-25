> Part of [SEIDO Rails Architecture](../seido-rails-architecture.md)

← Previous: [State Machines](06-state-machines.md) | Next: [Real-time &amp; API](08-realtime-api.md) →

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
│     Manager clicks Plan -> SubscriptionsController -> CheckoutCreator       │
│                                                                             │
│  2. STRIPE CHECKOUT SESSION                                                 │
│     Stripe::Checkout::Session.create(mode: 'subscription', ...)             │
│                                                                             │
│  3. USER COMPLETES PAYMENT ON STRIPE                                        │
│     Stripe Hosted Checkout Page                                             │
│                                                                             │
│  4. WEBHOOK PROCESSING                                                      │
│     customer.subscription.created -> Subscription.create!                   │
│     checkout.session.completed -> Team.update!(onboarding_complete)         │
│     invoice.paid -> StripeInvoice.create_from_stripe!                       │
│                                                                             │
│  5. REDIRECT TO SUCCESS                                                     │
│     Return from Stripe -> SuccessPage (verify status) -> Dashboard          │
│                                                                             │
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
        create_new_subscription
      end
    end

    def create_new_subscription
      result = SubscriptionCreator.call(
        team: @team,
        price_id: @price_id
      )

      if result.success?
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
      0 # Would need plan change history
    end

    def downgrades_revenue
      0 # Would need plan change history
    end
  end
end
```

---

## 7.5 Email Services

### 7.5.1 Email Sync Service

```ruby
# app/services/emails/sync_service.rb
# Synchronizes emails from IMAP/OAuth connections
class Emails::SyncService < ApplicationService
  def initialize(connection)
    @connection = connection
  end

  def call
    # 1. Connect to IMAP server using stored credentials
    # 2. Fetch new emails since last_sync_at
    # 3. For each email:
    #    - Create Email record with threading headers (message_id, in_reply_to_header, references)
    #    - Download and attach attachments
    #    - Check blacklist (skip if blacklisted sender)
    # 4. Update connection.last_sync_at
    # 5. Return count of synced emails
  end
end
```

### 7.5.2 Email Compose Service

```ruby
# app/services/emails/compose_service.rb
# Sends emails via SMTP (Resend API)
class Emails::ComposeService < ApplicationService
  def initialize(connection:, to:, subject:, body:, in_reply_to: nil)
    @connection = connection
    @to = to
    @subject = subject
    @body = body
    @in_reply_to = in_reply_to
  end

  def call
    # 1. Send via Resend/SMTP
    # 2. Create outbound Email record
    # 3. If in_reply_to: set threading headers (In-Reply-To, References)
    # 4. Return Email record
  end
end
```

### 7.5.3 Email Entity Linker

```ruby
# app/services/emails/entity_linker.rb
# Links emails (or entire conversation threads) to entities
class Emails::EntityLinker < ApplicationService
  def initialize(email_ids:, entity_type:, entity_id:)
    @email_ids = email_ids
    @entity_type = entity_type
    @entity_id = entity_id
  end

  def call
    # Batch-link all emails to entity
    # Use upsert to handle duplicates gracefully (409 tolerance)
    # Pattern: Promise.allSettled equivalent in Ruby
    results = @email_ids.map do |eid|
      EmailLink.find_or_create_by!(
        email_id: eid,
        entity_type: @entity_type,
        entity_id: @entity_id
      )
    rescue ActiveRecord::RecordNotUnique
      # Already linked - ignore
      nil
    end
    ServiceResult.success(linked: results.compact.count)
  end
end
```

---

## 7.6 Background Jobs (Sidekiq)

### 7.6.1 Configuration

```ruby
# config/sidekiq.yml
---
:concurrency: <%= ENV.fetch("SIDEKIQ_CONCURRENCY", 5) %>
:queues:
  - [critical, 4]
  - [mailers, 3]
  - [notifications, 3]
  - [emails, 2]
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

  sync_all_emails:
    cron: '*/5 * * * *'  # Every 5 minutes
    class: EmailSyncAllJob
    queue: emails
```

### 7.6.2 Application Job Base

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

### 7.6.3 Push Notification Job

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

### 7.6.4 Reminder Notification Job

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

### 7.6.5 Scheduled Jobs

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

### 7.6.6 Email Delivery Job

```ruby
# app/jobs/email_delivery_job.rb
class EmailDeliveryJob < ApplicationJob
  queue_as :mailers

  def perform(mailer_class, mailer_method, *args)
    mailer_class.constantize.send(mailer_method, *args).deliver_now
  end
end
```

### 7.6.7 Email Sync Jobs

```ruby
# app/jobs/email_sync_job.rb
class EmailSyncJob < ApplicationJob
  queue_as :emails

  def perform(connection_id)
    connection = TeamEmailConnection.find(connection_id)
    Emails::SyncService.call(connection)
  end
end

# app/jobs/email_sync_all_job.rb
# CRON: Sync all active email connections every 5 minutes
class EmailSyncAllJob < ApplicationJob
  queue_as :emails

  def perform
    TeamEmailConnection.active.needs_sync.find_each do |connection|
      EmailSyncJob.perform_later(connection.id)
    end
  end
end
```

---

## 7.7 File Services (ActiveStorage)

### 7.7.1 Document Uploader

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
