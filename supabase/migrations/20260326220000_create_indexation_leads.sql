-- Create indexation_leads table for lead magnet email captures
-- No RLS — accessed via service role only (public API route)
-- RGPD: expires_at set to 24 months for automatic cleanup

create table if not exists indexation_leads (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  type text not null check (type in ('lettre_indexation', 'rapport_portfolio')),
  metadata jsonb,
  source text default 'landing_indexation',
  consent_given boolean not null default false,
  ip_address text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 months')
);

-- Index for periodic RGPD cleanup (DELETE WHERE expires_at < now())
create index idx_indexation_leads_expires on indexation_leads (expires_at);

-- Index for analytics queries by type
create index idx_indexation_leads_type on indexation_leads (type);

comment on table indexation_leads is 'Lead captures from the rent indexation calculator on the landing page. No RLS — service role access only.';
