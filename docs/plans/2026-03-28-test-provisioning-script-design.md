# Test Provisioning Script Design

**Date:** 2026-03-28
**Status:** Implemented

## Problem

The existing provisioning has 2 modes:
- `manual` — inserts env var values in DB, no API calls, status=active instantly
- `auto` — buys NEW Twilio number + Meta register + verify

Neither allows testing the real Meta WABA registration flow with an existing Twilio number.

## Solution

`scripts/test-provisioning.mjs` — standalone CLI script with 2 modes:

### Mode: `register-existing`
```
node scripts/test-provisioning.mjs --mode=register-existing --phone=+32460257659
```
1. Upsert `ai_phone_numbers` record (status=registering)
2. Register number on Meta WABA via Graph API
3. Store `meta_phone_number_id` in DB
4. Request SMS verification code from Meta
5. Update status → `pending_verification`
6. Poll DB every 5s for up to 2 minutes
7. Webhook `/api/webhooks/sms-verification` handles auto-verification

### Mode: `full-auto`
```
node scripts/test-provisioning.mjs --mode=full-auto --country=BE
```
Same as above but Step 0 = search + purchase Twilio number.

### Prerequisites
- ngrok running: `ngrok http 3000`
- Next.js dev server running
- Twilio Console: SMS webhook configured to ngrok URL
- `.env.local` with all Meta + Supabase + Twilio credentials

### Design Decisions
- Standalone script (no Next.js imports) — avoids bundling issues
- Follows existing pattern from `create-admin-user.mjs`
- Hardcoded team ID (dev team) with clear constant at top
- Poll-based verification check (simpler than WebSocket subscription)
