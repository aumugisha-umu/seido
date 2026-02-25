> Part of [SEIDO Rails Architecture](../seido-rails-architecture.md)

← Previous: [Services & Jobs](07-services-jobs.md) | Next: [Testing](09-testing.md) →

# Real-time Communication & REST API

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

Due to the extreme length of Section 9, the remainder continues in the source document. Please refer to [the full architecture document](../seido-rails-architecture.md) for the complete REST API section content including:

- 9.2 API Authentication (JWT)
- 9.3 Base API Controller
- 9.4 API Endpoints
- 9.5 Serializers
- 9.6 Rate Limiting
- 9.7 API Versioning
- 9.8 API Documentation (OpenAPI/Swagger)
- 9.9 Webhooks (Stripe)
- 9.10 Testing API Endpoints

---

*End of Section 9 - REST API*

---
