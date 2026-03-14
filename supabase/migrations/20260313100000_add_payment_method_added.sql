-- Add payment_method_added to subscriptions
-- Tracks whether the user has added a payment method during trial
-- Used for conditional messaging (0 EUR banners vs upgrade CTAs)

ALTER TABLE subscriptions
  ADD COLUMN payment_method_added BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN subscriptions.payment_method_added
  IS 'True when user has entered payment info via Stripe Checkout during trial. Controls banner messaging and email suppression.';
