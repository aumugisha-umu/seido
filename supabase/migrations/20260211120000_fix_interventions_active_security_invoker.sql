-- Fix: interventions_active was missed in 20260211100000
-- Switches from SECURITY DEFINER (default) to SECURITY INVOKER
-- so the view respects the querying user's RLS policies.
ALTER VIEW public.interventions_active SET (security_invoker = on);
