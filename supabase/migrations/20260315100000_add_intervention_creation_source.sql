-- Add creation_source to track how an intervention was created
-- Values: 'manual' (gestionnaire form), 'wizard' (lot/contract wizard), 'tenant' (locataire request)
ALTER TABLE interventions
  ADD COLUMN creation_source TEXT DEFAULT 'manual';

-- Backfill: wizard-created = scheduling_method IS NOT NULL
UPDATE interventions SET creation_source = 'wizard' WHERE scheduling_method IS NOT NULL;

-- Backfill: locataire-created = created_by is a locataire user
UPDATE interventions i SET creation_source = 'tenant'
FROM users u WHERE u.id = i.created_by AND u.role = 'locataire';
