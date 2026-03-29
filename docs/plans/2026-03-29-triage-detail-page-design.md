# Design: Triage Detail Page + Layout Harmonization

**Date:** 2026-03-29
**Branch:** `preview`
**Scope:** UI-only (no DB changes, no new server actions)

---

## Problem

1. **Triage "Voir details"** navigates to the full intervention detail page (7 tabs, modals, planning, chat) — overkill for reviewing an AI-created triage candidate
2. The raw WhatsApp transcript is dumped into the Description field as a wall of text
3. No dedicated layout for reviewing AI triage items before converting

## Solution

Create a dedicated triage detail page at `/gestionnaire/operations/triage/[id]` with a single-column stacked card layout (matching the reminder detail pattern).

## Design Decisions

- **Single column, `max-w-3xl`** — consistent with reminder detail, mobile-first
- **No tabs** — triage items are ephemeral, one scroll covers everything
- **"Convertir en intervention" = redirect to edit page** — gestionnaire must add assignees + planning
- **Chat bubble layout** for conversation — visual distinction from raw text dump
- **No activity history card** — YAGNI, triage items get converted or dismissed

## Layout Structure

### Sticky Header (same pattern as reminder-detail-client.tsx)
- Back link: "Retour au triage" → `/gestionnaire/operations?type=assistant_ia`
- Title: problem description (or "Demande via [channel]")
- Channel badge (WhatsApp green / Phone blue / SMS violet) with icon
- Urgency + type badges (reuse existing badge utils)
- Action buttons:
  - **Primary**: "Convertir en intervention" → `/gestionnaire/operations/interventions/modifier/${id}?focus=type`
  - **Secondary**: "Creer rappel" → `/gestionnaire/operations/nouveau-rappel?...prefilled`
  - **Outline**: "Traite" (green) + "Rejeter" (red) — same as current card actions

### Card 1: Informations extraites
- Border-top accent color based on channel (green/blue/violet) — matches CHANNEL_CONFIG
- Rows with icon + label + value (same pattern as reminder Details card):
  - Contact (User icon): name + phone
  - Address (MapPin): extracted address
  - Urgency (AlertTriangle): level with color
  - Type (Wrench): intervention type if extracted
  - Date (Clock): created_at formatted + "il y a X"
  - Reference (Hash): intervention reference

### Card 2: Conversation
- Title: "Conversation [WhatsApp/SMS]" or "Transcription appel"
- Chat bubble layout:
  - User messages: left-aligned, bg-muted rounded bubble
  - AI messages: right-aligned, bg-primary/10 rounded bubble
  - Each bubble: speaker label (Locataire / IA), content, timestamp if available
- For phone transcripts: formatted text with speaker labels (no bubbles)
- Max-height with scroll, but default expanded (this is the primary review content)

### Card 3: Photos / Media (conditional — only if media_urls exist)
- Title: "Photos jointes" with count badge
- Grid of thumbnails (2 columns on mobile, 3 on desktop)
- Click opens lightbox/preview using existing document view pattern
- Uses signed URL from storage (already fixed with teamId prefix)

### Card 4: Reject form (inline, shown on "Rejeter" click)
- Same pattern as current triage card: red border, textarea for reason, confirm/cancel buttons

## Files to Create/Modify

### New files:
1. `app/gestionnaire/(no-navbar)/operations/triage/[id]/page.tsx` — Server component (auth + data fetch)
2. `app/gestionnaire/(no-navbar)/operations/triage/[id]/triage-detail-client.tsx` — Client component
3. `app/gestionnaire/(no-navbar)/operations/triage/[id]/loading.tsx` — Skeleton

### Modified files:
4. `components/operations/use-triage-actions.ts` — Change `handleViewDetails` to navigate to `/triage/[id]` instead of `/interventions/[id]`
5. `components/operations/whatsapp-triage-list-view.tsx` — Update row click navigation

## Data Flow

The triage detail page needs the same data as `WhatsAppTriageItem` + photos. The server component will:
1. Auth via `getServerAuthContext('gestionnaire')`
2. Fetch intervention by ID with `source IN ('whatsapp_ai', 'sms_ai', 'phone_ai')` guard
3. Fetch the matching `ai_whatsapp_sessions` or `ai_phone_calls` record for conversation/transcript
4. Fetch `intervention_documents` for media
5. Pass to client component

## Not in scope
- Reminder detail page redesign (separate task)
- Intervention detail page changes
- New server actions (reuse existing triage actions)
- DB changes
