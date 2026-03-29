# AI Triage Card Redesign — Design Doc

## Date: 2026-03-29

## Context

The gestionnaire dashboard has 3 tabs: Assistant IA, Interventions, Rappels. Three issues:

1. AI-sourced interventions (WhatsApp, Phone, SMS) leak into the Interventions tab
2. No channel origin indicator on AI triage cards
3. AI triage cards use a flat layout vs rich cards in Interventions/Rappels tabs

## Changes

### 1. Data Layer — `app/actions/whatsapp-triage-actions.ts`

- Query filter: `source IN ('whatsapp_ai', 'sms_ai', 'phone_ai')` instead of `type = 'demande_whatsapp'`
- LEFT JOIN `ai_phone_calls` for phone_ai sources (in addition to existing `ai_whatsapp_sessions`)
- Add `channel: 'whatsapp' | 'sms' | 'phone'` to returned type (derived from `source`)
- Add `transcript: string | null` for phone calls

### 2. Interventions Tab Filter — `async-dashboard-content.tsx`

Filter out AI-sourced interventions before passing to dashboard:
```typescript
const regularInterventions = allInterventions.filter(
  i => !['whatsapp_ai', 'sms_ai', 'phone_ai'].includes(i.source)
)
```

### 3. Card Redesign — `components/operations/whatsapp-triage-card.tsx`

Same shell as intervention-card.tsx:
- Channel icon: WhatsApp (green), Phone (blue), SMS (purple)
- Badges: urgency + type (extracted by AI)
- Caller name/phone
- Description = problem summary (2-line clamp)
- Location with MapPin
- Expandable conversation transcript
- NO status banner (all items are pending triage by definition)

Actions:
- Buttons: "Traité" (green outline) + "Rejeter" (red outline)
- Dot menu (header): "Convertir en intervention" / "Convertir en rappel" / "Voir détails"

## Card Layout

```
┌──────────────────────────────────────────────┐
│ 🟢   Arthur (+32474028838)       il y a 2h ⋮│
│      ┌──────────┐ ┌────────────┐             │
│      │🔥 Urgente│ │🔧 Plomberie│             │
│      └──────────┘ └────────────┘             │
│                                              │
│ Fuite d'eau importante au plafond du salon   │
│ avec un grand trou qui laisse passer l'eau...│
│                                              │
│ 📍 rue Marconi 8, 1190 Forest               │
│                                              │
│ ▸ Voir conversation (14 messages)            │
│                                              │
│  ┌─────────────┐  ┌─────────────┐           │
│  │ ✓  Traité   │  │ ✕  Rejeter  │           │
│  └─────────────┘  └─────────────┘           │
└──────────────────────────────────────────────┘
```

## No DB migration needed
