# Unread Messages Dashboard Section

**Date**: 2026-03-01
**Status**: Design validated

## Overview

Add an "unread messages" section to all 3 role dashboards (gestionnaire, locataire, prestataire) that shows unread conversation threads from interventions. Users can mark threads as read or navigate directly to the intervention's conversation tab.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Placement | Between stats and interventions | High visibility, doesn't disrupt main workflow |
| Card style | Compact list rows | Scannable, efficient for many threads |
| Real-time | SSR only (page load) | Simple, consistent with stats cards |
| Mark-as-read animation | Smooth fade-out (300ms) | Polished, clear visual feedback |
| Max visible | 5 threads | Prevents section from dominating dashboard |
| Zero state | Hidden | No empty state — section doesn't render |

## Data Layer

### New repository method: `getUnreadThreadsForDashboard(userId, role)`

Returns:
```typescript
interface UnreadThread {
  threadId: string
  threadType: 'group' | 'tenants_group' | 'providers_group' | 'tenant_to_managers' | 'provider_to_managers'
  interventionId: string
  interventionTitle: string
  interventionReference: string
  unreadCount: number
  lastMessage: {
    content: string
    senderName: string
    createdAt: string
  }
}
```

Query strategy (3 queries, batched):
1. Get all `conversation_participants` for user where `last_read_message_id` is behind latest message
2. Batch-fetch thread + intervention details (join `conversation_threads` → `interventions`)
3. Get last message per thread

Role-based filtering:
- Gestionnaire: all 5 thread types
- Locataire: group, tenants_group, tenant_to_managers
- Prestataire: group, providers_group, provider_to_managers

### Server action: `markThreadAsReadAction(threadId)`

- Reuses `conversationRepository.markAsRead(threadId, userId, latestMessageId)`
- Called via `useTransition` for optimistic UI

## UI Component

### `components/dashboards/shared/unread-messages-section.tsx`

**Props:**
```typescript
interface UnreadMessagesSectionProps {
  threads: UnreadThread[]
  role: 'gestionnaire' | 'locataire' | 'prestataire'
  totalCount: number  // for "voir tous" link when > 5
}
```

**Layout:**
- Header: MessageSquare icon + "Messages non lus" + Badge(count) + "Tout marquer comme lu" button
- List: Max 5 rows, each with:
  - Blue dot (unread indicator)
  - Intervention title + reference (truncated)
  - Thread type chip (colored per ConversationSelector config)
  - Relative time ("il y a 2h")
  - Last message: "Sender: content..." (1 line truncated)
  - Action buttons: Check (mark read) + ExternalLink (go to intervention)
- Footer: "Voir tous" link when totalCount > 5
- Hidden when 0 threads

**Navigation URL:**
```
/${role}/interventions/${interventionId}?tab=conversations&thread=${threadType}
```

**Mark-as-read interaction:**
1. Click check button → row fades out (opacity 0, 150ms)
2. Row collapses (height 0, 150ms)
3. Count badge decrements
4. Last row dismissed → entire section slides away

**Responsive:**
- Desktop: full row with all info inline
- Mobile: title on first line, message preview on second, icon-only buttons

## Integration Points

### Gestionnaire
- `app/gestionnaire/(with-navbar)/dashboard/page.tsx` — SSR fetch
- `components/dashboards/manager/manager-dashboard-v2.tsx` — render after stats, before interventions

### Locataire
- `app/locataire/(with-navbar)/dashboard/page.tsx` — SSR fetch
- `components/dashboards/locataire-dashboard-hybrid.tsx` — render after property cards

### Prestataire
- `app/prestataire/(with-navbar)/dashboard/page.tsx` — SSR fetch
- `components/dashboards/provider/provider-dashboard-v2.tsx` — render above interventions

## Files to Modify

| File | Action |
|------|--------|
| `components/dashboards/shared/unread-messages-section.tsx` | CREATE |
| `lib/services/repositories/conversation-repository.ts` | MODIFY — add `getUnreadThreadsForDashboard()` |
| `app/actions/conversation-actions.ts` | MODIFY — add `markThreadAsReadAction()` |
| `app/gestionnaire/(with-navbar)/dashboard/page.tsx` | MODIFY — SSR fetch |
| `components/dashboards/manager/manager-dashboard-v2.tsx` | MODIFY — render section |
| `app/locataire/(with-navbar)/dashboard/page.tsx` | MODIFY — SSR fetch |
| `components/dashboards/locataire-dashboard-hybrid.tsx` | MODIFY — render section |
| `app/prestataire/(with-navbar)/dashboard/page.tsx` | MODIFY — SSR fetch |
| `components/dashboards/provider/provider-dashboard-v2.tsx` | MODIFY — render section |
