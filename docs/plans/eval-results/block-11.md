# B11 -- Parametres + Profile + Billing

## Files reviewed (10)
- `app/gestionnaire/(with-navbar)/parametres/page.tsx`
- `app/gestionnaire/(with-navbar)/parametres/emails/page.tsx`
- `app/gestionnaire/(with-navbar)/parametres/assistant-ia/page.tsx`
- `app/gestionnaire/(with-navbar)/profile/page.tsx`
- `app/gestionnaire/(with-navbar)/settings/billing/page.tsx`
- `app/gestionnaire/(with-navbar)/settings/billing/billing-page-client.tsx`
- `lib/services/domain/subscription.service.ts` (first 100 lines + grep results)
- `lib/email/resend-client.ts`
- `components/billing/` (14 component files listed)

---

## Security: 8/10

**Positives:**
- `getServerAuthContext('gestionnaire')` in all 5 Server Component pages:
  - parametres/page.tsx:L12
  - parametres/emails/page.tsx:L17
  - parametres/assistant-ia/page.tsx:L29
  - profile/page.tsx:L10
  - settings/billing/page.tsx:L16
- Billing page uses service role for subscription writes (user client can only SELECT) -- correctly documented
- Profile page uses `.limit(1)` for team membership check (profile/page.tsx:L18)
- `SubscriptionService.canAddProperty()` blocks `paused` status alongside `read_only`, `unpaid`, `incomplete_expired` (subscription.service.ts:L152)
- Stripe portal session creation goes through server action (not client-side)
- Lazy sync from Stripe API for self-healing missed webhooks (subscription.service.ts:L88-100)

**Issues:**
- (-1) Email settings page uses `createServiceRoleSupabaseClient()` for blacklist query JOIN on users table (emails/page.tsx:L41) -- while commented, this is a broad bypass. A dedicated RPC function would be more targeted
- (-1) Profile page does raw Supabase query for team membership (profile/page.tsx:L13-19) instead of going through a service/repository

---

## Patterns: 6/10

**Positives:**
- `SubscriptionService` is a proper domain service with DI (constructor injection of Stripe, repos)
- `SubscriptionRepository`, `StripeCustomerRepository` used for DB operations
- `SubscriptionInfo` type is well-defined with all necessary fields (subscription.service.ts:L15-29)
- `FREE_TIER_LIMIT` constant shared between service and UI
- Server actions used for Stripe operations (checkout, portal, verify)
- Billing client component receives initial data from server (SSR + hydration pattern)
- `UpgradePreview` type distinguishes `current_lots` (actual DB count) from `subscribed_lots` (Stripe quantity) -- per memory bank pattern

**Issues:**
- (-1) **`console.error` in parametres/page.tsx:L23**: `console.error('[SETTINGS] Error fetching lot count:', error)` -- should use `logger.error()`
- (-1) **`console.warn` and `console.error` in resend-client.ts:L12,L44**: Already flagged in B10, but EMAIL_CONFIG lives here and is part of B11's scope
- (-1) **Direct Supabase query in profile/page.tsx:L13-19**: Team membership check should go through a repository
- (-1) **Direct Supabase queries in emails/page.tsx:L24-67**: Email connections and blacklist fetched with raw queries instead of repository pattern. Two separate try/catch blocks with inline type casts

**Issues (Design):**
- `paused` status handling in billing UI: The `getStatusBadge` map includes `paused: { label: 'En pause', variant: 'secondary' }` (billing-page-client.tsx:L58) but there's no explicit paused-specific messaging or UI blocking (e.g., "Your account is paused -- contact support"). The canAddProperty gate exists server-side but the client just shows a badge.

---

## Design Quality: 7/10

**Positives:**
- Billing page has clear status display with metrics grid (lots used, plan, renewal date, status)
- Status badges with appropriate colors (active=default, trialing=secondary, canceled=destructive, paused=secondary)
- Checkout success banner with green styling
- Trial reassurance banner when payment method added ("0 EUR maintenant")
- Read-only warning banner with red styling
- Lot count selector with slider + numeric input for pricing
- `PricingCard` component for plan selection
- Stripe Portal integration for subscription management and invoices
- Profile page parses `first_name`/`last_name` from `name` field as fallback
- Team admin detection for role-appropriate UI
- AI assistant page with Suspense boundary and SSR pre-fetch
- Email settings page with SSR pre-fetch for connections and blacklist

**Issues:**
- (-1) **Hardcoded email domain**: `support@seido.be` appears twice in billing-page-client.tsx (L335, L413) instead of using `EMAIL_CONFIG.supportEmail`. This contradicts the recent email config centralization refactor (commit a29871c0)
- (-1) **Loading spinner in AI assistant page** (assistant-ia/page.tsx:L17-26): Uses `animate-spin rounded-full border-b-2` spinner instead of skeleton matching final layout
- (-1) **No explicit paused-status UX**: When account is paused, user sees a "En pause" badge but no actionable guidance. Should display similar to read-only state with CTA to contact support or reactivate

**Bonus:**
- (+1) Trial days countdown with orange warning at <= 7 days

---

## Summary

```
Security:       8/10  ████████░░
Patterns:       6/10  ██████░░░░
Design Quality: 7/10  ███████░░░
━━━━━━━━━━━━━━━━━━━━━━━━━━
Weighted Score: 7.1/10
Result: PASS (borderline)
```

**Blockers:** None

**Improvements:**
1. **HIGH**: Replace `support@seido.be` with `EMAIL_CONFIG.supportEmail` in billing-page-client.tsx (L335, L413). This is inconsistent with the email centralization refactor.
2. **HIGH**: Replace `console.error` with `logger.error` in parametres/page.tsx:L23
3. **HIGH**: Extract direct Supabase queries in profile/page.tsx and emails/page.tsx into repositories
4. **MEDIUM**: Replace `console.warn`/`console.error` with `logger` in resend-client.ts (L12, L44)
5. **MEDIUM**: Add explicit paused-status UX with actionable guidance (similar to read-only banner)
6. **LOW**: Replace spinner with skeleton in AI assistant loading state
7. **LOW**: Consider dedicated RPC for blacklist query instead of service role bypass
