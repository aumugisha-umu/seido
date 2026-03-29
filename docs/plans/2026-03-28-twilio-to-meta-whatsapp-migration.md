# Migration Twilio BSP → Meta WhatsApp Cloud API

**Date:** 2026-03-28
**Branch:** preview
**Motivation:** Eliminer le middleman Twilio, reduire les couts par message, gagner en flexibilite (media, templates, interactive messages).

## Architecture

- **Send messages:** `POST https://graph.facebook.com/v23.0/{phoneNumberId}/messages` avec Bearer token
- **Receive messages:** Webhook POST avec JSON body, signature HMAC-SHA256 via `X-Hub-Signature-256`
- **Download media:** 2-step — `GET /{mediaId}` → URL, puis `GET {url}` → binary
- **Webhook verification:** GET avec `hub.mode`/`hub.verify_token`/`hub.challenge` (deja en place)
- **Types:** `whatsapp-cloud-api-types` pour validation Zod des webhooks

## Env vars

**Supprimer:** `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WEBHOOK_URL`, `DEV_WHATSAPP_PHONE_NUMBER`
**Ajouter:** `META_WHATSAPP_PHONE_NUMBER_ID`
**Garder:** `META_WHATSAPP_ACCESS_TOKEN`, `META_WHATSAPP_APP_SECRET`, `META_WHATSAPP_VERIFY_TOKEN`, `META_WHATSAPP_BUSINESS_ID`

## DB Migration

```sql
ALTER TABLE ai_phone_numbers
  ADD COLUMN IF NOT EXISTS meta_phone_number_id TEXT,
  RENAME COLUMN twilio_whatsapp_number TO whatsapp_number;
-- twilio_account_sid reste nullable (pas de drop)
```

## Files changed

| Action | File |
|--------|------|
| DELETE | `twilio-whatsapp.service.ts` |
| CREATE | `meta-whatsapp.service.ts` |
| REWRITE | `webhooks/whatsapp/route.ts` |
| EDIT | `conversation-engine.service.ts` |
| EDIT | `types.ts` |
| EDIT | `index.ts` |
| EDIT | `phone-provisioning.service.ts` |
| EDIT | `package.json` |
| EDIT | `.env.example` |
| CREATE | Migration SQL |
