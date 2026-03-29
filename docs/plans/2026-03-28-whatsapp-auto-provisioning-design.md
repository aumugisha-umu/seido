# Auto-Provisioning WhatsApp: Twilio Buy + Meta Register + Auto-Verify

**Date:** 2026-03-28
**Branch:** preview

## Flow

```
Stripe checkout success → provision()
  1. Buy Twilio number (raw fetch API)
  2. Configure SMS webhook on number → /api/webhooks/sms-verification
  3. Register number on Meta WABA
  4. request_code (SMS) → status: pending_verification

SMS arrives on Twilio number
  → /api/webhooks/sms-verification
  1. Validate Twilio signature (manual HMAC-SHA1)
  2. Parse 6-digit code from SMS body
  3. verify_code on Meta
  4. status: active → team operationnelle

UI polls getProvisioningStatus() every 3s
  → When "active" → refresh page
  → When "failed" → show error + retry
```

## Files

| Action | File |
|--------|------|
| CREATE | `twilio-number.service.ts` — buy/release numbers |
| CREATE | `meta-registration.service.ts` — register/verify on Meta |
| CREATE | `/api/webhooks/sms-verification/route.ts` — auto-verify |
| EDIT | `phone-provisioning.service.ts` — orchestrate full flow |
| EDIT | `ai-subscription-actions.ts` — adapt verify + add polling |
| EDIT | `assistant-ia-settings-client.tsx` — polling UI |
| EDIT | `stripe-webhook.handler.ts` — handle async provision |
| EDIT | `.env.example` — re-add Twilio for number purchasing |
| CREATE | Migration SQL — provisioning_status columns |

## Provisioning Status Lifecycle

pending → purchasing → registering → pending_verification → active
                                                          → failed
