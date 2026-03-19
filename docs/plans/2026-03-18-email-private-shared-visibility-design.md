# Design: Email Privé / Partagé — Visibilité des boîtes email

**Date:** 2026-03-18
**Status:** Validated
**Inspiration:** Front (shared/individual inboxes), Rooftop

---

## Decisions (Brainstorming)

| # | Question | Choix |
|---|----------|-------|
| 1 | Granularité visibilité | Boîte entière (pas email par email) |
| 2 | Accès via conversation | Section dédiée "Partagés avec moi" |
| 3 | Changement visibilité | Toggle avec confirmation (partagé→privé) |
| 4 | Qui peut ajouter | Tout gestionnaire (privé + partagé) |
| 5 | Portée du partage | Email + thread complet + futurs emails auto |
| 6 | Sidebar | 3 sections séparées (Privées / Partagées / Partagés avec moi) |
| 7 | All emails | Tout ce que l'utilisateur a le droit de voir |
| 8 | Organisation "Partagés avec moi" | Groupés par boîte source |
| 9 | Toggle placement | Directement dans les tabs du formulaire d'ajout |

---

## Architecture Overview

### Principe fondamental

Le filtrage privé/partagé est fait **au niveau applicatif** (API routes), PAS via RLS.
Les routes principales (`/api/emails`, `/api/emails/counts`, `/api/emails/connections`) utilisent `getServiceRoleClient()` qui bypass RLS.
Le RLS sert de filet de sécurité pour les accès directs Supabase (authenticated client).

### Fonction utilitaire centrale

```typescript
// lib/services/domain/email-visibility.service.ts
async function getAccessibleConnectionIds(
  supabase: SupabaseClient,
  teamId: string,
  userId: string
): Promise<string[]> {
  // Shared connections: visibility = 'shared' AND team_id = teamId
  // Own private connections: visibility = 'private' AND added_by_user_id = userId
}
```

Tous les endpoints email utilisent cette fonction pour filtrer les résultats.

---

## 1. Database Changes

### 1.1 — Nouvelles colonnes sur `team_email_connections`

```sql
ALTER TABLE team_email_connections
  ADD COLUMN added_by_user_id UUID REFERENCES users(id),
  ADD COLUMN visibility TEXT DEFAULT 'shared'
    CHECK (visibility IN ('private', 'shared'));

-- Backfill: existing connections → shared, added_by = first team admin
UPDATE team_email_connections tec
SET added_by_user_id = (
  SELECT tm.user_id FROM team_members tm
  WHERE tm.team_id = tec.team_id AND tm.role = 'admin'
  ORDER BY tm.created_at ASC LIMIT 1
);

ALTER TABLE team_email_connections
  ALTER COLUMN added_by_user_id SET NOT NULL;
```

### 1.2 — Nouvelle table `email_shares`

```sql
CREATE TABLE email_shares (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id            UUID NOT NULL REFERENCES emails(id) ON DELETE CASCADE,
  thread_id           UUID NOT NULL REFERENCES conversation_threads(id) ON DELETE CASCADE,
  shared_with_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shared_by_user_id   UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  team_id             UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (email_id, shared_with_user_id)
);

CREATE INDEX idx_email_shares_email_id ON email_shares(email_id);
CREATE INDEX idx_email_shares_shared_with ON email_shares(shared_with_user_id);
CREATE INDEX idx_email_shares_team_id ON email_shares(team_id);
CREATE INDEX idx_team_email_connections_visibility ON team_email_connections(visibility);
CREATE INDEX idx_team_email_connections_added_by ON team_email_connections(added_by_user_id);
```

### 1.3 — RLS on `email_shares`

```sql
ALTER TABLE email_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY email_shares_select ON email_shares FOR SELECT USING (
  shared_with_user_id = get_current_user_id()
  OR shared_by_user_id = get_current_user_id()
  OR is_team_manager(team_id)
);

CREATE POLICY email_shares_insert ON email_shares FOR INSERT WITH CHECK (
  is_team_manager(team_id)
);

CREATE POLICY email_shares_delete ON email_shares FOR DELETE USING (
  shared_by_user_id = get_current_user_id()
  OR is_team_manager(team_id)
);
```

### 1.4 — RLS on `team_email_connections` (update SELECT policy)

```sql
-- Drop existing SELECT policy
DROP POLICY "Team members can view their email connections" ON team_email_connections;

-- New: see shared connections OR own private connections
CREATE POLICY "Team members can view accessible email connections"
  ON team_email_connections FOR SELECT
  USING (
    is_team_manager(team_id)
    AND (
      visibility = 'shared'
      OR added_by_user_id = get_current_user_id()
    )
  );
```

**IMPORTANT: RLS policies on `emails` table remain UNCHANGED.**

### 1.5 — Trigger: auto-share thread emails

```sql
CREATE OR REPLACE FUNCTION auto_share_thread_emails()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process emails on private connections
  IF EXISTS (
    SELECT 1 FROM team_email_connections tec
    WHERE tec.id = NEW.email_connection_id
      AND tec.visibility = 'private'
  ) THEN
    -- Propagate shares from existing thread emails to this new email
    INSERT INTO email_shares (email_id, thread_id, shared_with_user_id, shared_by_user_id, team_id)
    SELECT
      NEW.id,
      es.thread_id,
      es.shared_with_user_id,
      es.shared_by_user_id,
      es.team_id
    FROM emails existing_email
    JOIN email_shares es ON es.email_id = existing_email.id
    WHERE existing_email.email_connection_id = NEW.email_connection_id
      AND (
        NEW.in_reply_to_header = existing_email.message_id
        OR existing_email.message_id = ANY(string_to_array(NEW.references, ' '))
      )
    ON CONFLICT (email_id, shared_with_user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_auto_share_thread_emails
  AFTER INSERT ON emails
  FOR EACH ROW EXECUTE FUNCTION auto_share_thread_emails();
```

---

## 2. Service Layer Changes

### 2.1 — New: `email-visibility.service.ts`

```typescript
// lib/services/domain/email-visibility.service.ts

export class EmailVisibilityService {
  /**
   * Returns connection IDs the user can access:
   * - All shared connections for the team
   * - User's own private connections
   */
  static async getAccessibleConnectionIds(
    supabase: SupabaseClient,
    teamId: string,
    userId: string
  ): Promise<string[]> {
    const { data } = await supabase
      .from('team_email_connections')
      .select('id')
      .eq('team_id', teamId)
      .or(`visibility.eq.shared,added_by_user_id.eq.${userId}`);
    return (data || []).map(c => c.id);
  }

  /**
   * Returns emails shared with the user via conversations,
   * grouped by source connection for sidebar display.
   */
  static async getSharedWithMeGroups(
    supabase: SupabaseClient,
    userId: string,
    teamId: string
  ): Promise<SharedWithMeGroup[]> {
    // Query email_shares joined with emails and connections
    // Group by email_connection_id
  }

  /**
   * Check if a connection is private
   */
  static async isPrivateConnection(
    supabase: SupabaseClient,
    connectionId: string
  ): Promise<boolean> { ... }
}
```

### 2.2 — New: `email-share.repository.ts`

```typescript
// lib/services/repositories/email-share.repository.ts

export class EmailShareRepository extends BaseRepository<EmailShare> {
  async createSharesForThread(
    emailId: string,
    conversationThreadId: string,
    participantUserIds: string[],
    sharedByUserId: string,
    teamId: string,
    connectionId: string
  ): Promise<void> {
    // 1. Find all emails in the same thread (via message_id/references/in_reply_to_header)
    // 2. Create email_shares for each email × each participant
    // ON CONFLICT DO NOTHING for idempotency
  }

  async getSharedWithUser(userId: string, teamId: string): Promise<EmailShareWithDetails[]> {
    // Returns shares with email + connection details
    // Grouped by connection for sidebar
  }

  async getSharedEmailIds(userId: string, teamId: string): Promise<string[]> {
    // Quick list of email IDs shared with user (for filtering)
  }
}
```

### 2.3 — Modified: `email-connection.repository.ts`

```typescript
// Add to CreateEmailConnectionDTO:
interface CreateEmailConnectionDTO {
  // ... existing fields ...
  added_by_user_id: string;
  visibility: 'private' | 'shared';
}

// Add method:
async getAccessibleConnections(teamId: string, userId: string): Promise<TeamEmailConnection[]> {
  const { data } = await this.supabase
    .from(this.tableName)
    .select('*')
    .eq('team_id', teamId)
    .or(`visibility.eq.shared,added_by_user_id.eq.${userId}`);
  return data || [];
}

// Add method:
async updateVisibility(connectionId: string, visibility: 'private' | 'shared'): Promise<void> {
  await this.supabase
    .from(this.tableName)
    .update({ visibility })
    .eq('id', connectionId);
}
```

---

## 3. API Route Changes

### 3.1 — `GET /api/emails` — Add visibility filtering

```typescript
// After auth validation, before email query:
const accessibleIds = await EmailVisibilityService.getAccessibleConnectionIds(
  supabaseAdmin, teamId, userProfile.id
);

// For folder=shared-with-me: query email_shares instead
if (folder === 'shared-with-me') {
  const shareRepo = new EmailShareRepository(supabaseAdmin);
  const sharedEmailIds = await shareRepo.getSharedEmailIds(userProfile.id, teamId);
  // Query emails WHERE id IN sharedEmailIds, with pagination
} else {
  // Existing query + filter: .in('email_connection_id', accessibleIds)
}
```

### 3.2 — `GET /api/emails/counts` — User-aware counting

```typescript
// After auth: get accessible connection IDs
const accessibleIds = await EmailVisibilityService.getAccessibleConnectionIds(
  supabaseAdmin, teamId, userProfile.id
);

// All count queries add: .in('email_connection_id', accessibleIds)
// Add shared-with-me count:
const sharedCount = await supabaseAdmin
  .from('email_shares')
  .select('id', { count: 'exact', head: true })
  .eq('shared_with_user_id', userProfile.id)
  .eq('team_id', teamId);
```

### 3.3 — `GET /api/emails/connections` — Filter by visibility

```typescript
// Replace current query with:
const { data: connections } = await supabase
  .from('team_email_connections')
  .select('id, provider, email_address, is_active, ..., visibility, added_by_user_id')
  .eq('team_id', userProfile.team_id)
  .or(`visibility.eq.shared,added_by_user_id.eq.${userProfile.id}`)
  .order('created_at', { ascending: false });
```

### 3.4 — `POST /api/emails/connections` — Accept new fields

```typescript
const { ..., visibility } = body;

const connection = await connectionRepo.createConnection({
  // ... existing fields ...
  added_by_user_id: userProfile.id,
  visibility: visibility || 'shared',
});
```

### 3.5 — New: `GET /api/emails/shared-with-me/groups`

```typescript
// Returns grouped structure for sidebar:
// { groups: [{ connection: {...}, threads: [...] }] }
```

---

## 4. Server Action Changes

### 4.1 — `email-conversation-actions.ts`

**`createEmailConversationAction`** — After creating conversation:
```typescript
// Check if email belongs to private connection
const isPrivate = await EmailVisibilityService.isPrivateConnection(supabase, email.email_connection_id);
if (isPrivate) {
  const shareRepo = new EmailShareRepository(serviceRoleClient);
  await shareRepo.createSharesForThread(
    emailId, threadId, participantIds, user.id, teamId, email.email_connection_id
  );
}
```

**`addEmailConversationParticipantsAction`** — Same logic for new participants.

---

## 5. UI Changes

### 5.1 — `email-connection-prompt.tsx` — Toggle in tabs

- Add `Switch` component (shadcn/ui) in each tab (Gmail OAuth + IMAP/SMTP)
- Labels: "Privé" / "Partagé" with contextual help text
- Default: Partagé
- Value passed to POST `/api/emails/connections`

### 5.2 — `email-connection-list.tsx` — Badge + visibility toggle

- Badge "Privé" (🔒) or "Partagé" (👥) next to connection name
- "Changer la visibilité" in action dropdown
- Confirmation dialog when switching Partagé → Privé:
  > "Les autres gestionnaires n'auront plus accès à cette boîte. Les emails déjà partagés via conversation resteront accessibles."

### 5.3 — `mailbox-sidebar.tsx` — 3 sections

```
▾ Mes boîtes privées
  🔒 arthur@gmail.com (3)

▾ Boîtes partagées
  👥 contact@immo.be (12)
  👥 gestion@immo.be (5)

▾ Partagés avec moi
  └ marie@gmail.com
     └ Thread "Chaudière" (3)
  └ paul@outlook.com
     └ Thread "Facture" (1)
```

### 5.4 — `mail-client.tsx` — New state + fetch

- Add `sharedWithMeGroups` state
- Fetch from `/api/emails/shared-with-me/groups` on mount
- Handle `folder=shared-with-me` selection
- Pass sections data to sidebar

### 5.5 — `mail/page.tsx` (SSR) — Pass user context

- Pre-fetch accessible connections (not all team connections)
- Pre-fetch shared-with-me groups
- Pass to `<MailClient>` as initial props

---

## 6. Files Summary

| Domain | File | Change |
|--------|------|--------|
| **DB** | `supabase/migrations/NEW` | Full migration |
| **Types** | `lib/database.types.ts` | Regenerate |
| **Types** | `lib/types/email-integration.ts` | Add visibility, added_by_user_id |
| **Service** | **NEW** `lib/services/domain/email-visibility.service.ts` | Central visibility logic |
| **Repo** | **NEW** `lib/services/repositories/email-share.repository.ts` | CRUD email_shares |
| **Repo** | `lib/services/repositories/email-connection.repository.ts` | Add visibility fields + methods |
| **API** | `app/api/emails/route.ts` | Add connection filter + shared-with-me folder |
| **API** | `app/api/emails/counts/route.ts` | User-aware counting |
| **API** | `app/api/emails/connections/route.ts` | Filter by visibility + accept new fields |
| **API** | **NEW** `app/api/emails/shared-with-me/groups/route.ts` | Sidebar groups |
| **Actions** | `app/actions/email-conversation-actions.ts` | Create email_shares on participant add |
| **UI** | `components/email/email-connection-prompt.tsx` | Toggle in tabs |
| **UI** | `parametres/emails/components/email-connection-list.tsx` | Badge + toggle action |
| **UI** | `mail/components/mailbox-sidebar.tsx` | 3 sections |
| **UI** | `mail/mail-client.tsx` | Shared-with-me state + fetch |
| **UI** | `mail/page.tsx` | User-aware SSR pre-fetch |
| **Client** | `lib/services/client/email-client.service.ts` | getSharedWithMeGroups() |

**Total: ~17 files (5 new, 12 modified)**

---

## 7. What Does NOT Change

- **Email sync (IMAP cron)**: Unchanged — emails arrive on connections, visibility handled downstream
- **Email sending (SMTP)**: Unchanged — send is per-connection
- **Email links (entity linking)**: Unchanged — works on accessible emails
- **Email blacklist**: Unchanged — remains team-level
- **Prestataire/Locataire access**: Unchanged — via intervention assignments
- **RLS policies on `emails` table**: UNCHANGED — no regression risk
- **`get_email_counts` RPC**: Unchanged — API route handles user-aware filtering

---

## 8. Edge Cases

1. **Team with only shared connections**: Behaves exactly like today (backward-compat)
2. **User leaves team**: CASCADE on team_members handles access. email_shares with deleted user are orphaned but harmless.
3. **Connection deleted**: CASCADE deletes emails → CASCADE deletes email_shares
4. **Thread spanning multiple connections**: Trigger filters by `email_connection_id` — no cross-connection leakage
5. **Switching Partagé → Privé**: Existing conversations/shares remain. Only new access is restricted.
6. **Switching Privé → Partagé**: All gestionnaires gain access immediately. email_shares become redundant but harmless.
