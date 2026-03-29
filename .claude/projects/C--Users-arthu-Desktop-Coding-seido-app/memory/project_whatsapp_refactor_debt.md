---
name: whatsapp-refactor-debt
description: Technical debt to address after WhatsApp config is complete — duplicate intervention creation pattern, reference generation, cross-domain import
type: project
---

## Refactor Debt — Post-WhatsApp Config

**When:** Immediately after WhatsApp configuration is finalized (migration Twilio → Meta direct)

### 1. Extract shared `createAISourcedIntervention()` (~150 lines duplicated)
- `lib/services/domain/ai-whatsapp/intervention-creator.service.ts` (WhatsApp)
- `app/api/webhooks/elevenlabs/route.ts` (voice, lines ~352-490)
- Same 3-step pattern: INSERT intervention → assign tenant+managers → create threads → notify
- Target: shared service in `lib/services/domain/intervention/ai-intervention-factory.ts`

### 2. Extract `generateInterventionReference(prefix: string)`
- 3 locations: intervention-creator.service.ts, elevenlabs webhook, create-intervention API
- Target: `lib/utils/intervention-reference.ts`

### 3. Move `normalizePhoneE164` to shared utils
- Currently in `lib/services/domain/ai-phone/call-transcript-analyzer.service.ts`
- Used by `ai-whatsapp/intervention-creator.service.ts` (cross-domain import)
- Target: `lib/utils/phone.ts`
