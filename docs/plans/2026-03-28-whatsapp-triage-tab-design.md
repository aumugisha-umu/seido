# Design: Onglet "Assistant IA" — Triage WhatsApp

**Date**: 2026-03-28
**Status**: Validated
**Branch**: preview

## Context

WhatsApp AI agent creates interventions with `type: 'demande_whatsapp'` and `status: 'demande'`. The gestionnaire needs a dedicated triage UI to classify these into proper interventions, reminders, or reject them.

## Architecture

### Tab Bar — 3 pills in TaskTypeSegment

```
[Bot Assistant IA 3] [Wrench Interventions 47] [Bell Rappels 12]
 ^emerald-600         ^primary (bleu)            ^amber-500
```

- Type union: `TaskType = 'assistant_ia' | 'intervention' | 'rappel'`
- Icon: `Bot` (Lucide) with `emerald-600` active color
- Badge: `bg-emerald-600 text-white` when count > 0 on inactive tab
- Position: first (triage = priority action)

### WhatsApp Triage Card

```
border-l-2 border-emerald-500
[Bot] Caller Name
+32 474 02 88 38 · il y a 12 min   [···]
---
"AI-extracted problem description (2 lines max)"
[MapPin] Address if known
[!] Urgency badge (only if != normale)
---
[Convertir intervention] [Convertir rappel]  (grid-cols-2)
[Marquer traite]         [Rejeter]
```

Button variants:
- Convertir intervention: `variant="default"` (primary)
- Convertir rappel: `variant="outline"`
- Marquer traite: `variant="outline"`
- Rejeter: `variant="ghost"` + `text-destructive`

Dot menu [···]: "Voir conversation" (expand transcript), "Voir le locataire" (if identified)

### Action Flows

| Action | Behavior |
|--------|----------|
| Convertir en intervention | `router.push(/gestionnaire/operations/interventions/modifier/[id]?focus=type)` — existing edit page, type selector focused |
| Convertir en rappel | `router.push(/gestionnaire/operations/nouveau-rappel?title=...&building_id=...&notes=Source+WhatsApp...)` — pre-filled |
| Marquer traite | Optimistic remove + toast → server action: `status = 'cloturee_par_gestionnaire'` |
| Rejeter | Inline expand (optional reason) + "Confirmer rejet" → server action: `status = 'rejetee'` + optimistic remove |

### Empty State

```
[Bot icon 40px]
Aucune demande en attente
Les messages WhatsApp de vos locataires apparaitront ici.
```

No CTA — passive queue, empty = success.

## Data

### Server query
```sql
interventions WHERE type = 'demande_whatsapp' AND status = 'demande' AND deleted_at IS NULL
JOIN ai_whatsapp_sessions ON intervention_id = interventions.id
```

### Props shape
```typescript
interface WhatsAppTriageItem {
  id: string                    // intervention id
  reference: string             // WA-YYYYMMDD-XXX
  title: string
  description: string
  urgency: string
  created_at: string
  building_id: string | null
  lot_id: string | null
  // From ai_whatsapp_sessions join
  callerPhone: string
  callerName: string | null     // from extracted_data or identified user
  address: string | null        // from extracted_data
  problemSummary: string | null // from extracted_data.problem_description
  messages: ConversationMessage[]
  sessionId: string
}
```

### Reused utilities
- `getPriorityColor` / `getPriorityLabel` from `lib/intervention-utils.ts`
- `formatDistanceToNow` from `date-fns`

## Files to Create/Modify

### New files
1. `components/operations/whatsapp-triage-navigator.tsx` — list wrapper + empty state
2. `components/operations/whatsapp-triage-card.tsx` — individual card with actions
3. `app/actions/whatsapp-triage-actions.ts` — server actions (mark treated, reject)

### Modified files
1. `components/operations/task-type-segment.tsx` — add `'assistant_ia'` type + Bot icon + emerald color
2. `components/dashboards/manager/manager-dashboard-v2.tsx` — add whatsapp data prop + conditional rendering
3. `app/gestionnaire/(with-navbar)/dashboard/components/async-dashboard-content.tsx` — fetch whatsapp triage data
4. `components/operations/operations-page-client.tsx` — same tab switching for Operations page

## Mobile Considerations

- Touch targets: 44px minimum on all 4 action buttons
- Grid: `grid-cols-2 gap-2` for action buttons
- Conversation transcript: expandable via dot menu, max-height 200px with scroll
- Bottom sheet pattern for dot menu on mobile (DropdownMenu adapts)
