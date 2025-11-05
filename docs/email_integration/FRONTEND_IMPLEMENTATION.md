# SEIDO Email Frontend - Implementation Guide

**Date**: 2025-11-05
**Status**: ✅ UI Components Ready (Dummy Data)
**Design Variant**: Variant 2 (Balanced) - Front-inspired

---

## 📋 Table des Matières

1. [Vue d'Ensemble](#vue-densemble)
2. [Architecture des Composants](#architecture-des-composants)
3. [Structure des Pages](#structure-des-pages)
4. [Composants Créés](#composants-créés)
5. [Navigation et Routing](#navigation-et-routing)
6. [Données Dummy](#données-dummy)
7. [Intégration avec le Backend](#intégration-avec-le-backend)
8. [Prochaines Étapes](#prochaines-étapes)

---

## Vue d'Ensemble

### Design Choisi: Variant 2 (Balanced)

Le **Variant 2** (Balanced) a été implémenté avec les caractéristiques suivantes :

✅ **3-Column Layout** (Mailboxes | Email List | Detail + Chat)
✅ **2-Line Email Previews** (optimal information density)
✅ **Filters Always Visible** (Date, Attachments, Building)
✅ **Metadata Badges** (Attachments, Labels, Linked Buildings)
✅ **Link to Building/Lot** (Fuzzy search dropdown)
✅ **Mark as Irrelevant** (2 options: Soft delete vs Blacklist)
✅ **Blacklist Manager** (Settings page)
✅ **Internal Chat Placeholder** (ready for ChatInterface integration)

### Routes Créées

| Route | Description | Status |
|-------|-------------|--------|
| `/gestionnaire/mail/inbox` | Interface email 3-colonnes (liste + détail) | ✅ Ready |
| `/gestionnaire/settings/emails` | Settings avec Blacklist Manager | ✅ Ready |

**Note**: La route `/gestionnaire/mail` existante (preview templates email) est conservée intacte.

---

## Architecture des Composants

### Layout Pattern (3 Colonnes)

```
┌──────────────┬─────────────────────────┬──────────────────────────────────────┐
│ Sidebar      │ Email List              │  Email Detail + Internal Chat        │
│ (250px)      │ (400px)                 │  (Flex)                              │
├──────────────┼─────────────────────────┼──────────────────────────────────────┤
│ [Composer]   │ [🔍 Search emails...]   │  ✉️  Subject: Re: Renewal agreement  │
│              │ [Date ▾][📎][Sort ▾]    │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│ 📥 Inbox (4) │                         │  From: leyton@tier1.com              │
│ ✉️  Sent     │ ☐ Leyton               │  To:   contact@seido.fr              │
│ 📝 Drafts(27)│   Re: Renewal...        │  Date: Nov 5, 2025 3:45 PM           │
│ 📂 Archive   │   Hi there, Can you...  │  📎  2 attachments | 🏢 Link to lot ▾│
│              │   📎 🏢 Paris 10e       │                                      │
│ ━━━━━━━━━━━━ │   26m ago               │  ┌─────────────────────────────────┐ │
│ Buildings    │                         │  │ Email Body (HTML Sanitized)     │ │
│              │ ☐ Sarah Murphy          │  │ Hi there, Can you send over...  │ │
│ 🏢 Paris 10e │   Re: Do you support... │  │                                 │ │
│    (20)      │   Hey Team, I'm eval... │  │ [Reply Box - Toggle]            │ │
│              │   📎 🏷️ Intervention    │  └─────────────────────────────────┘ │
│ 🏢 Lyon 3e   │   26m ago               │                                      │
│    (6)       │                         │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│              │                         │  💬 Internal Team Chat (Placeholder) │
│ 🏷️  Labels    │ Showing 3 of 6 emails   │  [ChatInterface to be integrated]    │
│ ⭐ Urgent    │                         │                                      │
│ 🔧 Interven. │                         │                                      │
│              │                         │                                      │
│ ⚙️  Settings  │                         │                                      │
└──────────────┴─────────────────────────┴──────────────────────────────────────┘
```

### Responsive Behavior

**Desktop (≥1024px)**:
- Full 3-column layout
- All features visible

**Tablet (768-1023px)**:
- Sidebar: 60px (icons only, tooltips on hover)
- Email list: 320px
- Content: Flex
- Chat stacks below (not side-by-side)

**Mobile (<768px)**:
- Single column
- Slide-out sidebar (hamburger menu)
- Email list full width
- Chat as separate tab

---

## Composants Créés

### 1. MailboxSidebar

**Fichier**: `app/gestionnaire/mail/_components/mailbox-sidebar.tsx`

**Fonctionnalités**:
- ✅ Standard folders (Inbox, Sent, Drafts, Archive)
- ✅ Buildings list avec email counts
- ✅ Labels (Urgent, Intervention)
- ✅ Unread badges
- ✅ Settings link

**Props**:
```typescript
interface MailboxSidebarProps {
  currentFolder: string
  onFolderChange: (folder: string) => void
  unreadCounts: {
    inbox: number
    sent: number
    drafts: number
    archive: number
  }
  buildings: DummyBuilding[]
  onBuildingClick: (buildingId: string) => void
}
```

**Usage**:
```tsx
<MailboxSidebar
  currentFolder={currentFolder}
  onFolderChange={handleFolderChange}
  unreadCounts={{ inbox: 4, sent: 0, drafts: 27, archive: 0 }}
  buildings={dummyBuildings}
  onBuildingClick={handleBuildingClick}
/>
```

---

### 2. EmailList

**Fichier**: `app/gestionnaire/mail/_components/email-list.tsx`

**Fonctionnalités**:
- ✅ Search bar (debounced 300ms)
- ✅ Filters toolbar (Date, Attachments, Sort)
- ✅ Scrollable list with 2-line previews
- ✅ Email count indicator
- ✅ Empty state

**Props**:
```typescript
interface EmailListProps {
  emails: DummyEmail[]
  selectedEmailId?: string
  onEmailSelect: (emailId: string) => void
}
```

**Filtres Implémentés**:
- **Date**: All time, Today, This week, This month
- **Has Attachments**: Toggle button
- **Sort**: (Placeholder pour tri futur)

---

### 3. EmailListItem

**Fichier**: `app/gestionnaire/mail/_components/email-list-item.tsx`

**Fonctionnalités**:
- ✅ 2-line preview (sender + subject + snippet)
- ✅ Metadata badges (attachments, building, labels)
- ✅ Unread indicator (blue background)
- ✅ Selected state (border-left blue)
- ✅ Timestamp (formatDistanceToNow - French locale)

**Layout**:
```
Line 1: [Sender Name]                  [26m ago]
Line 2: [Subject]
Line 3: [Snippet preview...]
Line 4: [📎] [🏢 Paris 10e] [Urgent]
```

---

### 4. EmailDetail

**Fichier**: `app/gestionnaire/mail/components/email-detail.tsx`

**Fonctionnalités**:
- ✅ **Fixed header** (subject, sender, date, badges) - always visible
- ✅ **Scrollable content area** (email body, reply box, chat)
- ✅ Action buttons (Reply, Forward, Delete, Mark as Processed, More)
- ✅ **Compact mode** (icons only, text appears on header hover)
- ✅ HTML body rendering (DOMPurify sanitization)
- ✅ Attachments list with download buttons
- ✅ Reply box (toggle on/off)
- ✅ **Conversation thread view** (if parent email selected)
- ✅ Link to Building/Lot (via More actions menu - opens dialog)
- ✅ Mark as Irrelevant (opens dialog, auto-archives)
- ✅ **Mark as Processed** (opens confirmation dialog, auto-archives)
- ✅ Create Intervention (from More menu)
- ✅ Internal chat placeholder

**Header Structure**:
- **Line 1**: Subject (left) + Action buttons (right, compact with hover)
- **Line 2**: From: sender (email) • date/time (responsive format)
- **Line 3**: Badges (attachments, building, labels)

**Actions Disponibles**:
- **Reply**: Opens inline reply box with textarea
- **Forward**: (Placeholder)
- **Mark as Processed**: Opens confirmation dialog, auto-archives
- **Delete**: Dummy toast notification
- **More** → Link to Building (opens dialog)
- **More** → Mark as Processed
- **More** → Create Intervention
- **More** → Mark as irrelevant (opens dialog, auto-archives)

**Conversation Support**:
- If email is a conversation parent (`is_parent: true`), displays full conversation thread
- Otherwise, displays single email content
- Header always shows parent email's subject for conversations

---

### 5. LinkToBuildingDropdown

**Fichier**: `app/gestionnaire/mail/components/link-to-building-dropdown.tsx`

**Fonctionnalités**:
- ✅ Fuzzy search (Command component)
- ✅ Hierarchical view (Buildings → Lots)
- ✅ Current selection indicator (Check icon)
- ✅ Building address displayed
- ✅ Tenant names for lots
- ✅ **Used in Dialog** (accessed via More actions menu)

**UX Pattern**:
```
[More actions menu ▾]
  → Link to Building (opens dialog)
  
[Dialog: Link to Building]
  Search buildings or lots...
  ━━━━━━━━━━━━━━━━━━━━━━━
  🏢 123 Rue de Paris, Paris 10e
     📦 Appartement 4A (M. Dupont)  ✓ (selected)
     📦 Appartement 4B (Mme Martin)

  🏢 45 Avenue de Lyon, Lyon 3e
     📦 Local Commercial (Boulangerie)
```

### 6. ConversationGroup

**Fichier**: `app/gestionnaire/mail/components/conversation-group.tsx`

**Fonctionnalités**:
- ✅ Groups emails by `conversation_id`
- ✅ Shows parent email with expand/collapse chevron
- ✅ **Auto-expands** when parent or child is selected
- ✅ **Displays children** when expanded (indented, compact view)
- ✅ Click on parent → selects parent (shows full thread)
- ✅ Click on child → selects child (shows individual message)
- ✅ Shows message count in conversation
- ✅ Highlights unread conversations

**Visual Structure**:
```
[▶] Leyton
    Re: Renewal agreement for building
    4 messages
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[▼] Leyton (expanded)
    Re: Renewal agreement for building
    4 messages
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    [indented] Vous
               Merci pour votre message...
    [indented] Leyton
               Parfait, merci pour les documents...
    [indented] Vous
               D'accord, n'hésitez pas...
```

### 7. ConversationThread

**Fichier**: `app/gestionnaire/mail/components/conversation-thread.tsx`

**Fonctionnalités**:
- ✅ Displays all messages in a conversation thread
- ✅ Messages in reverse chronological order (latest first)
- ✅ Each message in a card with border
- ✅ **Compact header** (From, date/time only - no subject/badges)
- ✅ HTML body sanitized with DOMPurify
- ✅ Attachments displayed per message
- ✅ Separators between messages

---

### 8. MarkAsIrrelevantDialog

**Fichier**: `app/gestionnaire/mail/components/mark-irrelevant-dialog.tsx`

**Fonctionnalités**:
- ✅ 2 options radio (Soft delete vs Blacklist)
- ✅ Reason textarea (optional, only for blacklist)
- ✅ Loading state
- ✅ Toast notifications
- ✅ **Auto-archives** email after action

**Options**:

**Option 1: Hide this email only**
- Soft delete (moved to Trash, can be restored)
- **Auto-archives** email
- Single email action

**Option 2: Block all future emails from this sender**
- Soft delete current email
- **Auto-archives** email
- Add sender to blacklist table
- Optional reason field
- Future emails auto-blocked

### 9. MarkAsProcessedDialog

**Fichier**: `app/gestionnaire/mail/components/mark-as-processed-dialog.tsx`

**Fonctionnalités**:
- ✅ Confirmation dialog
- ✅ Detects conversation vs single email
- ✅ **Auto-archives** email/conversation after confirmation
- ✅ Toast notification with context (email vs conversation)
- ✅ Green theme (success action)

**Behavior**:
- For single email: "Are you sure you want to mark this email as processed?"
- For conversation: "Are you sure you want to mark this conversation as processed? This will mark all messages in the conversation as processed."

---

### 10. BlacklistManager

**Fichier**: `app/gestionnaire/mail/_components/blacklist-manager.tsx`

**Fonctionnalités**:
- ✅ List of blocked senders
- ✅ Domain blocking indicator ("Entire domain" badge)
- ✅ Reason display
- ✅ Blocked by user + timestamp
- ✅ Unblock button
- ✅ "Add manually" button (placeholder)
- ✅ Empty state

**Usage** (dans Settings):
```tsx
<BlacklistManager
  blacklist={dummyBlacklist}
  onUnblock={handleUnblock}
  onAddManual={handleAddManual}
/>
```

---

## Structure des Pages

### Page Inbox (3-Colonnes)

**Fichier**: `app/gestionnaire/mail/inbox/page.tsx`

**État Géré**:
```typescript
const [currentFolder, setCurrentFolder] = useState('inbox')
const [selectedEmailId, setSelectedEmailId] = useState<string | undefined>()
```

**Logique de Filtrage**:
```typescript
// Détection du type de filtre
if (building.id === currentFolder) {
  return getEmailsByBuilding(currentFolder) // Emails d'un bâtiment
}
if (currentFolder === 'urgent') {
  return emails.filter(e => e.labels.includes('Urgent')) // Label filter
}
// Sinon, folder standard (inbox, sent, drafts, archive)
return getEmailsByFolder(currentFolder)
```

**Handlers Implémentés** (dummy actions avec toast):
- `handleReply(replyText: string)`
- `handleArchive()` (called automatically, not user action)
- `handleDelete()`
- `handleLinkBuilding(buildingId, lotId?)` (opens dialog)
- `handleCreateIntervention()`
- `handleSoftDelete(emailId)` (auto-archives)
- `handleBlacklist(emailId, senderEmail, reason?)` (auto-archives)
- `handleMarkAsProcessed()` (auto-archives)
- `handleConversationSelect(conversationId)` (selects parent email)
- `handleBuildingClick(buildingId)`

---

### Page Settings

**Fichier**: `app/gestionnaire/settings/emails/page.tsx`

**Composants Affichés**:
1. **BlacklistManager** (with dummy data)
2. **Email Connection Settings** (placeholder for future feature)

**État Géré**:
```typescript
const [blacklist, setBlacklist] = useState(dummyBlacklist)
```

**Actions**:
- Unblock sender (remove from blacklist)
- Add manual entry (placeholder)

---

## Données Dummy

**Fichier**: `app/gestionnaire/mail/_components/dummy-data.ts`

### Interfaces TypeScript

```typescript
interface DummyEmail {
  id: string
  sender_email: string
  sender_name: string
  recipient_email: string
  subject: string
  snippet: string
  body_html: string
  received_at: string
  is_read: boolean
  has_attachments: boolean
  attachments: DummyAttachment[]
  building_id?: string
  building_name?: string
  lot_id?: string
  lot_name?: string
  labels: string[]
  direction: 'received' | 'sent'
  status: 'unread' | 'read' | 'archived' | 'deleted'
  conversation_id?: string
  thread_order?: number
  is_parent?: boolean
}

interface DummyBuilding {
  id: string
  name: string
  address: string
  emailCount: number
  lots: DummyLot[]
}

interface DummyBlacklistEntry {
  id: string
  sender_email: string
  sender_domain: string | null
  reason: string | null
  blocked_by_user_name: string
  is_current_user: boolean
  created_at: string
}
```

### Données Fournies

**12 Dummy Emails** (including conversation threads):
1. Leyton - Renewal agreement (conv1, parent, unread, 2 attachments, 4 messages total)
   - 1-1: Reply from Vous (sent)
   - 1-2: Reply from Leyton (received)
   - 1-3: Reply from Vous (sent)
2. Sarah Murphy - Parent child relationships (conv2, parent, unread, 4 messages total)
   - 2-1: Reply from Vous (sent)
   - 2-2: Reply from Sarah (received, unread)
   - 2-3: Reply from Vous (sent)
3. Francis Hyde - Delegated access (conv3, parent, unread, 1 attachment, 3 messages total)
   - 3-1: Reply from Vous (sent)
   - 3-2: Reply from Francis (received, unread)
4. Ahmed Khan - Welcome aboard (read, sent email)
5. Jean Dupont - Devis plomberie (conv4, parent, read, urgent + intervention, 2 messages total)
   - 5-1: Reply from Vous (sent)
6. Marketing Newsletter - Promotional email (unread, spam candidate)
7. Marie Dupont - Problème de chauffage (conv5, parent, unread, 3 messages total)
   - 7-1: Reply from Vous (sent)
   - 7-2: Reply from Marie (received)
8. Tech Support - Mise à jour système (unread, 1 attachment)
9. Client Company - Demande de rendez-vous (conv6, parent, unread, 3 messages total)
   - 9-1: Reply from Vous (sent)
   - 9-2: Reply from Client (received, unread)
10. Maintenance Services - Rapport d'intervention (read, 1 attachment)
11. Admin SEIDO - Réunion d'équipe (read, sent)
12. Vendor Supplier - Commande de matériel (unread)

**Conversations**:
- conv1: 4 messages (Leyton conversation)
- conv2: 4 messages (Sarah Murphy conversation)
- conv3: 3 messages (Francis Hyde conversation)
- conv4: 2 messages (Jean Dupont conversation)
- conv5: 3 messages (Marie Dupont conversation)
- conv6: 3 messages (Client Company conversation)

**3 Dummy Buildings**:
- Paris 10e (20 emails, 3 lots)
- Lyon 3e (6 emails, 2 lots)
- Marseille Centre (3 emails, 1 lot)

**3 Dummy Blacklist Entries**:
- newsletter@marketing.com (by Marc, 2 days ago)
- spam@example.com (by current user, 5 days ago)
- @ads.company.com (entire domain, by Julie, 10 days ago)

### Helper Functions

```typescript
getEmailById(id: string): DummyEmail | undefined
getEmailsByFolder(folder: string): DummyEmail[]
getEmailsByBuilding(buildingId: string): DummyEmail[]
getUnreadCount(folder: string): number
getDraftsCount(): number

// Conversation grouping
interface ConversationGroup {
  parent: DummyEmail
  children: DummyEmail[]
  conversationId: string
}

groupEmailsByConversation(emails: DummyEmail[]): (ConversationGroup | DummyEmail)[]
getConversationEmails(conversationId: string): DummyEmail[]
```

**Conversation Grouping Logic**:
- Groups emails by `conversation_id`
- Identifies parent email (`is_parent: true`)
- Sorts children by `thread_order` or date
- Returns mixed array of `ConversationGroup` and standalone `DummyEmail`

---

## Navigation et Routing

### URLs Implémentées

| URL | Composant | Description |
|-----|-----------|-------------|
| `/gestionnaire/mail/inbox` | EmailInboxPage | Interface 3-colonnes (liste + détail) |
| `/gestionnaire/settings/emails` | EmailSettingsPage | Blacklist manager + connection settings |

### Navigation Interne (Folders)

**Via MailboxSidebar**:
- Click "Inbox" → `currentFolder = 'inbox'`
- Click "Sent" → `currentFolder = 'sent'`
- Click "Paris 10e" → `currentFolder = 'b1'` (building ID)
- Click "Urgent" → `currentFolder = 'urgent'` (label filter)

**Pas de routing Next.js** pour les folders (state géré en local pour performance).

### Navigation Future (Backend Integration)

Quand le backend sera prêt :
- Route `/gestionnaire/mail/inbox` → Page principale (conservée)
- Route `/gestionnaire/mail/inbox/[id]` → **NON** (détail intégré dans page principale)
- Route `/gestionnaire/mail/settings` → Alias vers `/gestionnaire/settings/emails`

---

## Intégration avec le Backend

### Étape 1: Remplacer Dummy Data par API Calls

**Avant** (Dummy):
```typescript
const displayEmails = getEmailsByFolder('inbox')
```

**Après** (API):
```typescript
const { data: emails } = await supabase
  .from('emails')
  .select('*')
  .eq('team_id', team.id)
  .eq('direction', 'received')
  .eq('status', 'unread')
  .order('received_at', { ascending: false })
```

**Utiliser EmailRepository**:
```typescript
const emailRepo = new EmailRepository(supabase)
const emails = await emailRepo.getEmailsByTeam(team.id, {
  limit: 50,
  status: 'unread',
  direction: 'received'
})
```

---

### Étape 2: Implémenter Actions Réelles

**Reply Action**:
```typescript
const handleReply = async (replyText: string) => {
  const response = await fetch('/api/emails/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      emailConnectionId: email.email_connection_id,
      to: email.sender_email,
      subject: `Re: ${email.subject}`,
      text: replyText,
      inReplyToEmailId: email.id
    })
  })

  if (response.ok) {
    toast.success('Reply sent!')
  }
}
```

**Archive Action** (automatic):
```typescript
// Archive is now automatic when:
// 1. Marking as processed
// 2. Marking as irrelevant (soft delete or blacklist)

const handleMarkAsProcessed = async () => {
  const emailRepo = new EmailRepository(supabase)
  await emailRepo.update(email.id, { status: 'processed' })
  await emailRepo.update(email.id, { status: 'archived' }) // Auto-archive
  toast.success('Email marked as processed and archived')
}

const handleMarkAsIrrelevant = async (action: 'soft_delete' | 'blacklist') => {
  if (action === 'soft_delete') {
    await emailRepo.update(email.id, { status: 'deleted' })
    await emailRepo.update(email.id, { status: 'archived' }) // Auto-archive
  } else {
    await blacklistSender(email.sender_email)
    await emailRepo.update(email.id, { status: 'archived' }) // Auto-archive
  }
}
```

**Link to Building**:
```typescript
const handleLinkBuilding = async (buildingId: string, lotId?: string) => {
  const emailRepo = new EmailRepository(supabase)
  await emailRepo.linkToBuilding(email.id, buildingId)
  if (lotId) {
    await emailRepo.update(email.id, { lot_id: lotId })
  }
  toast.success('Email linked')
}
```

**Blacklist**:
```typescript
const handleBlacklist = async (emailId: string, senderEmail: string, reason?: string) => {
  await fetch('/api/emails/blacklist', {
    method: 'POST',
    body: JSON.stringify({ emailId, senderEmail, reason })
  })
  toast.success(`Blacklisted ${senderEmail}`)
}
```

---

### Étape 3: Conversation Threading (Backend)

**Database Schema**:
```sql
ALTER TABLE emails ADD COLUMN conversation_id TEXT;
ALTER TABLE emails ADD COLUMN thread_order INTEGER;
ALTER TABLE emails ADD COLUMN is_parent BOOLEAN DEFAULT false;
```

**Email Parsing**:
- Extract `In-Reply-To` or `References` header to identify conversation
- Generate `conversation_id` (UUID or hash of thread root)
- Set `is_parent: true` for first email in thread
- Increment `thread_order` for replies

**API Endpoints**:
```typescript
// Get conversation thread
GET /api/emails/conversations/:conversationId
// Returns: Array of emails sorted by thread_order

// Get grouped emails for list view
GET /api/emails?folder=inbox&group_by_conversation=true
// Returns: Mixed array of ConversationGroup and standalone emails
```

### Étape 4: Intégrer ChatInterface

**Remplacer le placeholder** dans `EmailDetail`:

```tsx
{/* Internal Team Chat */}
<div className="m-4">
  <div className="flex items-center justify-between mb-4">
    <h2 className="text-lg font-semibold flex items-center gap-2">
      💬 Internal Team Chat
      <Badge variant="secondary">Private</Badge>
    </h2>
  </div>

  {/* Reuse existing ChatInterface component */}
  <ChatInterface
    threadId={`email-${email.id}`}
    currentUserId={currentUserId}
    userRole="gestionnaire"
    className="h-[400px]"
  />
</div>
```

**Créer automatiquement un thread** quand un email est ouvert :
```typescript
// Dans EmailDetail useEffect
useEffect(() => {
  if (email.id) {
    // Create chat thread if not exists
    const threadId = `email-${email.id}`
    // Check if thread exists, if not create it
    // Then load ChatInterface
  }
}, [email.id])
```

---

### Étape 5: HTML Sanitization (Sécurité)

**Installer DOMPurify**:
```bash
npm install isomorphic-dompurify
```

**Remplacer dangerouslySetInnerHTML**:

```tsx
import DOMPurify from 'isomorphic-dompurify'

// Dans EmailDetail
const sanitizedBody = DOMPurify.sanitize(email.body_html, {
  ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3'],
  ALLOWED_ATTR: ['href', 'target']
})

<div
  className="prose prose-sm max-w-none"
  dangerouslySetInnerHTML={{ __html: sanitizedBody }}
/>
```

---

### Étape 6: Real-Time Updates (Supabase Realtime)

**Subscribe to new emails**:
```typescript
useEffect(() => {
  const channel = supabase
    .channel('emails-realtime')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'emails',
        filter: `team_id=eq.${team.id}`
      },
      (payload) => {
        // Add new email to list
        setEmails(prev => [payload.new as Email, ...prev])
        toast.success('New email received!')
      }
    )
    .subscribe()

  return () => {
    channel.unsubscribe()
  }
}, [team.id])
```

---

## Prochaines Étapes

### Phase 1: Backend Integration (Semaine 1-2)

- [ ] Replace dummy data with Supabase queries
- [ ] Implement EmailRepository methods
- [ ] Add API routes for email actions
- [ ] Test with real IMAP/SMTP sync

### Phase 2: Security & Performance (Semaine 3)

- [ ] Add HTML sanitization (DOMPurify)
- [ ] Implement real-time subscriptions (Supabase Realtime)
- [ ] Add email list virtualization (react-window) for 100+ emails
- [ ] Add debounced search (300ms delay)
- [ ] Optimize image lazy loading

### Phase 3: Advanced Features (Semaine 4)

- [x] **Email threading** (conversation view) ✅
- [x] **Conversation grouping** in list view ✅
- [x] **Mark as Processed** with auto-archive ✅
- [x] **Auto-archive** on irrelevant/processed ✅
- [x] **Compact header mode** with hover text ✅
- [ ] Integrate ChatInterface for internal comments
- [ ] Add shared draft feature (real-time collaboration)
- [ ] Implement keyboard shortcuts (R: Reply, D: Delete, P: Processed, etc.)
- [ ] Add bulk actions (select multiple, archive all)

### Phase 4: Polish & Testing

- [ ] Accessibility audit (WCAG 2.1 AA)
- [ ] Mobile responsive testing
- [ ] E2E tests (Playwright)
- [ ] Performance testing (Lighthouse)
- [ ] User training documentation

---

## Checklist Frontend Pré-Production

### Composants

- [x] MailboxSidebar créé et testé
- [x] EmailList créé avec filtres
- [x] EmailListItem avec 2-line preview
- [x] EmailDetail avec actions et header compact
- [x] **ConversationGroup** avec expand/collapse
- [x] **ConversationThread** pour afficher le fil
- [x] LinkToBuildingDropdown avec fuzzy search (dans dialog)
- [x] MarkAsIrrelevantDialog avec 2 options (auto-archive)
- [x] **MarkAsProcessedDialog** avec confirmation (auto-archive)
- [x] BlacklistManager pour Settings
- [x] Dummy data complet (12 emails avec conversations, 3 buildings, 3 blacklist)

### Pages

- [x] `/gestionnaire/mail/inbox` page créée
- [x] `/gestionnaire/settings/emails` page créée
- [ ] Navigation entre folders testée
- [ ] Email selection testée
- [ ] All dummy actions affichent des toasts

### Intégration Backend (À Faire)

- [ ] API calls pour charger emails
- [ ] API calls pour actions (reply, archive, delete)
- [ ] API calls pour blacklist management
- [ ] Supabase Realtime subscriptions
- [ ] ChatInterface integration
- [ ] HTML sanitization

### Sécurité

- [ ] DOMPurify installé et configuré
- [ ] CSRF protection sur API routes
- [ ] RLS policies vérifiées
- [ ] XSS prevention (sanitize HTML)

### Performance

- [ ] Email list virtualization (>100 emails)
- [ ] Image lazy loading
- [ ] Debounced search (300ms)
- [ ] React.memo pour composants lourds
- [ ] Code splitting (dynamic imports)

### Accessibilité

- [ ] Keyboard navigation (Tab, Arrow keys)
- [ ] Screen reader labels (ARIA)
- [ ] Color contrast 4.5:1 minimum
- [ ] Focus indicators visibles
- [ ] Touch targets 44px minimum

### Testing

- [ ] Unit tests pour helper functions
- [ ] E2E tests pour workflow complet
- [ ] Mobile responsive tests
- [ ] Performance tests (Lighthouse)

---

## Ressources

**Documentation Composants**:
- [email-ui-design-variants.mdx](./email-ui-design-variants.mdx) - Full design specs
- [DESIGN_SUMMARY.md](./DESIGN_SUMMARY.md) - Design rationale

**Backend Integration**:
- [email-integration-guide-imap-smtp.md](./email-integration-guide-imap-smtp.md) - Backend guide
- Repository Pattern: `lib/services/repositories/email.repository.ts`
- IMAP Service: `lib/services/domain/imap.service.ts`
- SMTP Service: `lib/services/domain/smtp.service.ts`

**Existing SEIDO Components (Reusable)**:
- `ChatInterface` (`components/chat/chat-interface.tsx`) - 735 lines, ready to integrate
- All shadcn/ui components (50+)
- Tailwind design tokens (colors, spacing, typography)

---

**Version**: 2.0
**Auteur**: SEIDO Frontend Team
**Date**: 2025-11-05
**Status**: ✅ UI Components Ready for Backend Integration

---

## 🆕 Fonctionnalités Ajoutées (Version 2.0)

### Conversation Threading
- ✅ Group emails by `conversation_id`
- ✅ Expand/collapse conversations in list view
- ✅ Display full conversation thread in detail view
- ✅ Auto-expand when parent or child selected
- ✅ Click on child to view individual message
- ✅ Parent email shows full thread, children show individual content

### Header Improvements
- ✅ Fixed header (always visible)
- ✅ Scrollable content area (email body, reply, chat)
- ✅ Compact mode (icons only, text on header hover)
- ✅ Reorganized layout (subject, from/date, badges)
- ✅ Responsive date format (mobile: dd/MM/yy, desktop: full date)

### Actions & Workflow
- ✅ **Mark as Processed** with confirmation dialog
- ✅ **Auto-archive** when marking as processed
- ✅ **Auto-archive** when marking as irrelevant
- ✅ Link to Building moved to More actions menu (dialog)
- ✅ Archive button removed (automatic only)

### Data Structure
- ✅ Added `conversation_id`, `thread_order`, `is_parent` to email interface
- ✅ 12 emails total (6 conversations with multiple messages)
- ✅ Mixed received and sent messages in conversations

---

**🎯 Prochaine Étape**: Remplacer dummy data par API calls Supabase (Semaine 1-2)
