import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { createServiceRoleSupabaseClient } from '@/lib/services/core/supabase-client'
import { StripeWebhookHandler } from '@/lib/services/domain/stripe-webhook.handler'
import { revalidateTag } from 'next/cache'

// Events that change subscription state — invalidate cached subscription info
const SUBSCRIPTION_EVENTS = new Set([
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'customer.subscription.paused',
  'invoice.paid',
  'invoice.payment_failed',
])

export async function POST(req: NextRequest) {
  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  const body = await req.text()

  let event
  try {
    event = getStripe().webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: `Signature verification failed: ${message}` }, { status: 400 })
  }

  const supabase = createServiceRoleSupabaseClient()
  const handler = new StripeWebhookHandler(supabase)
  const result = await handler.handleEvent(event)

  // Invalidate cached subscription info when subscription state changes
  if (SUBSCRIPTION_EVENTS.has(event.type)) {
    revalidateTag('subscription')
  }

  return NextResponse.json({ message: result.message }, { status: result.status })
}
