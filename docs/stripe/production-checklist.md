# Production Deployment Checklist — Stripe

## Pre-requisites
- [ ] All test mode verification complete
- [ ] Feature branch merged to main

## Stripe Dashboard (Production Mode)

### 1. Product + Prices
- [ ] Create product "SEIDO Subscription"
- [ ] Annual price: 50.00 EUR HT per unit (lot), recurring/year
- [ ] Monthly price: 5.00 EUR HT per unit (lot), recurring/month
- [ ] Note both Price IDs for env vars

### 2. Webhook Endpoint
- [ ] URL: `https://seido.app/api/stripe/webhook`
- [ ] Events to listen:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `customer.subscription.paused`
  - `invoice.paid`
  - `invoice.payment_failed`
  - `charge.refunded`
- [ ] Note webhook signing secret for env vars

### 3. Smart Retries
- [ ] Settings > Billing > Subscription and emails > Smart Retries: ON

### 4. Dunning Emails
- [ ] Stripe-managed dunning emails: ON
- [ ] Custom branding: SEIDO logo + colors

### 5. Customer Portal
- [ ] Payment methods: Update card
- [ ] Cancel subscription: Allowed (immediate or end of period)
- [ ] Invoices: Visible and downloadable
- [ ] Switch plan: Disabled (managed in-app)

### 6. Stripe Tax
- [ ] Tax: Automatic
- [ ] Belgium: 21% VAT exclusive
- [ ] Product tax code: Software as a Service (SaaS)

### 7. Coupons (Production)
- [ ] EARLY2026: 100% off, repeating 3 months, expires 30 June 2026
- [ ] REFERRAL: 100% off, once, no expiration
- [ ] ANNUAL20: 20% off, forever, no expiration
- [ ] Create promotion codes for each coupon

## Vercel Environment Variables

```
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ANNUAL=price_...
STRIPE_PRICE_MONTHLY=price_...
```

## Post-Deployment Verification

- [ ] Create a test checkout session
- [ ] Verify webhook events received
- [ ] Verify subscription record in DB
- [ ] Verify trial flow (new signup → 30 day trial)
- [ ] Verify billing page renders correctly
- [ ] Test with 3D Secure card (if available)
