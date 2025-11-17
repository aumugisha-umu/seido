# Email Routes Structure

Interface email complète pour la gestion des emails IMAP/SMTP dans SEIDO.

## 📧 Routes Disponibles

### 1. `/gestionnaire/mail` - Email Client Interface (Production)

**Fichier**: `page.tsx`
**Purpose**: Interface email IMAP/SMTP 3-colonnes (Variant 2 - Balanced)
**Status**: ✅ Prêt pour intégration backend

**Fonctionnalités**:
- 3-column layout (Mailboxes | Email List | Detail + Chat)
- 2-line email previews
- Filters (Date, Attachments, Sort)
- **Conversation threading** (group by conversation_id)
- **Expand/collapse conversations** in list
- **Conversation thread view** in detail
- Link to Building/Lot (via More actions menu)
- Mark as Irrelevant / Blacklist (auto-archives)
- **Mark as Processed** (auto-archives)
- Internal team chat (placeholder)
- Reply/Forward/Delete actions
- **Compact header mode** (text on hover)

**Dummy Data**: Utilise `_components/dummy-data.ts` pour tests

**Prochaine étape**: Remplacer dummy data par API calls Supabase

---

### 2. `/gestionnaire/settings/emails` - Email Settings

**Fichier**: `../../settings/emails/page.tsx`
**Purpose**: Configuration email + Blacklist Manager
**Status**: ✅ Prêt pour intégration backend

**Fonctionnalités**:
- Blacklist Manager (list, unblock, add manual)
- Email connection settings (placeholder pour future feature)

---

### 3. `/gestionnaire/mail/archives/*` - Dev Tools (Archivé)

**Fichier**: `archives/page-email-preview-templates.tsx`
**Purpose**: Preview des templates email Resend (archivé)
**Status**: 📦 Archivé (référence uniquement)

**Voir**: [archives/README.md](./archives/README.md) pour plus de détails

---

## 📂 Structure des Composants

```
app/gestionnaire/mail/
├── page.tsx                          # Email client interface (3-column layout)
├── README.md                         # Ce fichier
├── components/                       # Composants email
│   ├── dummy-data.ts                 # Test data (12 emails with conversations, 3 buildings, 3 blacklist)
│   ├── mailbox-sidebar.tsx           # 3-column layout: Sidebar
│   ├── email-list.tsx                # 3-column layout: List (with conversation grouping)
│   ├── email-list-item.tsx           # Email preview (2-line)
│   ├── email-detail.tsx              # 3-column layout: Detail + Chat (with conversation thread)
│   ├── conversation-group.tsx        # Conversation grouping with expand/collapse
│   ├── conversation-thread.tsx       # Display conversation thread
│   ├── link-to-building-dropdown.tsx # Fuzzy search dropdown (used in dialog)
│   ├── mark-irrelevant-dialog.tsx    # Soft delete vs Blacklist (auto-archives)
│   ├── mark-as-processed-dialog.tsx   # Mark as processed confirmation (auto-archives)
│   └── blacklist-manager.tsx         # Settings: Blacklist UI
└── archives/                         # Dev tools archivés
    ├── README.md                     # Documentation archives
    ├── page-email-preview-templates.tsx
    └── email-preview-client.tsx
```

---

## 🔄 Migration Path

**Phase 1** (Actuel): Dummy data + UI components
- `/mail` interface complète avec données statiques
- Tous les composants visuels prêts
- Actions affichent des toasts (dummy)

**Phase 2** (Semaine 1-2): Backend integration
- Remplacer `dummy-data.ts` par API calls
- Implémenter EmailRepository queries
- Connecter actions réelles (reply, archive, etc.)

**Phase 3** (Semaine 3): Advanced features
- Intégrer ChatInterface pour internal chat
- Real-time updates (Supabase Realtime)
- Shared drafts collaboration

**Phase 4** (Semaine 4): Production ready
- HTML sanitization (DOMPurify)
- Accessibility audit
- E2E tests
- Performance optimization

---

## 📖 Documentation

**Design Specs**:
- [email-ui-design-variants.mdx](../../../docs/email_integration/email-ui-design-variants.mdx)
- [DESIGN_SUMMARY.md](../../../docs/email_integration/DESIGN_SUMMARY.md)

**Implementation Guide**:
- [FRONTEND_IMPLEMENTATION.md](../../../docs/email_integration/FRONTEND_IMPLEMENTATION.md) ⭐ Complete guide

**Backend Integration**:
- [email-integration-guide-imap-smtp.md](../../../docs/email_integration/email-integration-guide-imap-smtp.md)

---

## 🚀 Quickstart

### Tester l'interface email (dummy data)

1. Naviguer vers `/gestionnaire/mail`
2. Utiliser la sidebar pour filtrer (Inbox, Sent, Buildings, Labels)
3. Cliquer sur un email pour voir les détails
4. Tester les actions (Reply, Archive, Link to Building, etc.)
5. Voir les toasts de confirmation (dummy actions)

### Tester la blacklist

1. Naviguer vers `/gestionnaire/settings/emails`
2. Voir la liste des senders bloqués (3 entries)
3. Cliquer "Unblock" pour retirer
4. Cliquer "Add manually" (placeholder)

---

**Last Updated**: 2025-11-05
**Status**: ✅ UI Ready for Backend Integration

---

## 🆕 Features Added (v2.0)

### Conversation System
- ✅ Emails grouped by `conversation_id`
- ✅ Expand/collapse in list view
- ✅ Full thread view when parent selected
- ✅ Individual message view when child selected
- ✅ Auto-expand when selected

### Header Improvements
- ✅ Fixed header (subject, from/date, badges)
- ✅ Compact mode (icons only, text on hover)
- ✅ Scrollable content area
- ✅ Responsive date format

### Actions
- ✅ Mark as Processed (with confirmation, auto-archives)
- ✅ Auto-archive on processed/irrelevant
- ✅ Link to Building in More menu (dialog)
- ✅ Archive button removed (automatic only)

### Data
- ✅ 12 emails (6 conversations with multiple messages)
- ✅ Mixed received/sent in conversations
- ✅ Conversation grouping functions
