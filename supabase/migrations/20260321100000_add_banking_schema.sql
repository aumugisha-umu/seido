-- =============================================================================
-- Module Banque — Phase 1 MVP Schema
-- Design doc: docs/banking/2026-03-19-bank-module-tink-integration.md (v3)
-- Tables: bank_connections, bank_transactions, transaction_links,
--         rent_calls, auto_linking_rules, property_expenses, security_deposits
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. bank_connections — Comptes bancaires connectes via Tink
-- ---------------------------------------------------------------------------
CREATE TABLE bank_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,

  -- Tink data
  tink_user_id TEXT NOT NULL,
  tink_credentials_id TEXT,
  tink_account_id TEXT NOT NULL UNIQUE,

  -- Account info (cached from Tink)
  bank_name TEXT NOT NULL,
  bank_logo_url TEXT,
  account_name TEXT,
  account_type TEXT,
  iban_encrypted TEXT,
  iban_last4 TEXT,
  currency TEXT NOT NULL DEFAULT 'EUR',

  -- Typage du compte (conformite Loi Alur — fonds mandants separes)
  account_purpose TEXT NOT NULL DEFAULT 'operating'
    CHECK (account_purpose IN ('operating', 'client_funds', 'security_deposits')),

  -- Tokens (chiffres via EncryptionService AES-256-GCM)
  tink_access_token_encrypted TEXT,
  tink_refresh_token_encrypted TEXT,
  token_expires_at TIMESTAMPTZ,

  -- Sync state
  balance DECIMAL(12,2),
  last_sync_at TIMESTAMPTZ,
  sync_status TEXT NOT NULL DEFAULT 'active'
    CHECK (sync_status IN ('active', 'error', 'disconnected', 'blacklisted')),
  sync_error_message TEXT,

  -- Consent (PSD2 90-day limit)
  consent_expires_at TIMESTAMPTZ,

  -- Blacklisting
  is_blacklisted BOOLEAN NOT NULL DEFAULT false,
  blacklisted_at TIMESTAMPTZ,
  blacklisted_by UUID REFERENCES users(id),

  -- Audit
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES users(id)
);

CREATE INDEX idx_bank_connections_team
  ON bank_connections(team_id)
  WHERE deleted_at IS NULL;

ALTER TABLE bank_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bank_connections_select"
  ON bank_connections FOR SELECT
  USING (is_team_manager(team_id) AND deleted_at IS NULL);

CREATE POLICY "bank_connections_insert"
  ON bank_connections FOR INSERT
  WITH CHECK (is_team_manager(team_id));

CREATE POLICY "bank_connections_update"
  ON bank_connections FOR UPDATE
  USING (is_team_manager(team_id) AND deleted_at IS NULL);

CREATE POLICY "bank_connections_delete"
  ON bank_connections FOR DELETE
  USING (is_team_manager(team_id));

-- ---------------------------------------------------------------------------
-- 2. bank_transactions — Transactions synchronisees depuis Tink
-- ---------------------------------------------------------------------------
CREATE TABLE bank_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  bank_connection_id UUID NOT NULL REFERENCES bank_connections(id),

  -- Tink V2 data (immutable after import)
  tink_transaction_id TEXT NOT NULL UNIQUE,
  transaction_date DATE NOT NULL,
  value_date DATE,
  amount DECIMAL(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  description_original TEXT NOT NULL,
  description_display TEXT,
  description_detailed TEXT,

  -- Counterparties (Tink V2 rich structure)
  payer_name TEXT,
  payer_account_number TEXT,
  payee_name TEXT,
  payee_account_number TEXT,

  reference TEXT,
  tink_status TEXT,
  merchant_name TEXT,
  merchant_category_code TEXT,
  provider_transaction_id TEXT,

  -- Reconciliation state
  status TEXT NOT NULL DEFAULT 'to_reconcile'
    CHECK (status IN ('to_reconcile', 'reconciled', 'ignored')),
  reconciled_at TIMESTAMPTZ,
  reconciled_by UUID REFERENCES users(id),
  ignored_at TIMESTAMPTZ,
  ignored_by UUID REFERENCES users(id),

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bank_transactions_team_status
  ON bank_transactions(team_id, status, transaction_date DESC);
CREATE INDEX idx_bank_transactions_tink_id
  ON bank_transactions(tink_transaction_id);
CREATE INDEX idx_bank_transactions_connection
  ON bank_transactions(bank_connection_id, transaction_date DESC);

ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bank_transactions_select"
  ON bank_transactions FOR SELECT
  USING (is_team_manager(team_id));

CREATE POLICY "bank_transactions_insert"
  ON bank_transactions FOR INSERT
  WITH CHECK (is_team_manager(team_id));

CREATE POLICY "bank_transactions_update"
  ON bank_transactions FOR UPDATE
  USING (is_team_manager(team_id));

-- ---------------------------------------------------------------------------
-- 3. rent_calls — Echeances de loyer (auto-generees depuis les contrats)
-- ---------------------------------------------------------------------------
CREATE TABLE rent_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  contract_id UUID NOT NULL REFERENCES contracts(id),
  lot_id UUID NOT NULL REFERENCES lots(id),
  building_id UUID REFERENCES buildings(id),

  -- Echeance
  due_date DATE NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Montants attendus
  rent_amount DECIMAL(10,2) NOT NULL,
  charges_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_expected DECIMAL(10,2) GENERATED ALWAYS AS (rent_amount + charges_amount) STORED,

  -- Statut de paiement
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'partial', 'paid', 'overdue', 'cancelled')),
  total_received DECIMAL(10,2) NOT NULL DEFAULT 0,

  -- Auto-generation
  is_auto_generated BOOLEAN NOT NULL DEFAULT true,

  -- Relance
  last_reminder_sent_at TIMESTAMPTZ,
  reminder_count INTEGER NOT NULL DEFAULT 0,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Deduplication: 1 echeance par contrat par date
  CONSTRAINT unique_rent_call_per_contract_date UNIQUE (contract_id, due_date)
);

CREATE INDEX idx_rent_calls_contract ON rent_calls(contract_id, due_date);
CREATE INDEX idx_rent_calls_team_status ON rent_calls(team_id, status, due_date);
CREATE INDEX idx_rent_calls_lot ON rent_calls(lot_id, due_date);

ALTER TABLE rent_calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rent_calls_select"
  ON rent_calls FOR SELECT
  USING (is_team_manager(team_id));

CREATE POLICY "rent_calls_insert"
  ON rent_calls FOR INSERT
  WITH CHECK (is_team_manager(team_id));

CREATE POLICY "rent_calls_update"
  ON rent_calls FOR UPDATE
  USING (is_team_manager(team_id));

-- ---------------------------------------------------------------------------
-- 4. property_expenses — Charges recurrentes par bien (Phase 2 UI, tables Phase 1)
-- ---------------------------------------------------------------------------
CREATE TABLE property_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,

  building_id UUID REFERENCES buildings(id),
  lot_id UUID REFERENCES lots(id),
  CONSTRAINT property_expense_xor CHECK (
    (CASE WHEN building_id IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN lot_id IS NOT NULL THEN 1 ELSE 0 END) = 1
  ),

  category TEXT NOT NULL CHECK (category IN (
    'syndic', 'property_tax', 'insurance', 'utilities', 'maintenance', 'other'
  )),

  label TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  due_date DATE NOT NULL,
  period_start DATE,
  period_end DATE,

  is_recurring BOOLEAN NOT NULL DEFAULT false,
  recurrence_frequency TEXT CHECK (
    recurrence_frequency IS NULL OR
    recurrence_frequency IN ('monthly', 'quarterly', 'annually')
  ),

  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),

  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES users(id)
);

CREATE INDEX idx_property_expenses_team
  ON property_expenses(team_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_property_expenses_lot
  ON property_expenses(lot_id, due_date);
CREATE INDEX idx_property_expenses_building
  ON property_expenses(building_id, due_date);

ALTER TABLE property_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "property_expenses_select"
  ON property_expenses FOR SELECT
  USING (is_team_manager(team_id) AND deleted_at IS NULL);

CREATE POLICY "property_expenses_insert"
  ON property_expenses FOR INSERT
  WITH CHECK (is_team_manager(team_id));

CREATE POLICY "property_expenses_update"
  ON property_expenses FOR UPDATE
  USING (is_team_manager(team_id) AND deleted_at IS NULL);

-- ---------------------------------------------------------------------------
-- 5. security_deposits — Depots de garantie (obligation legale BE/FR)
-- ---------------------------------------------------------------------------
CREATE TABLE security_deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  contract_id UUID NOT NULL REFERENCES contracts(id),
  lot_id UUID NOT NULL REFERENCES lots(id),

  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',

  deposit_type TEXT NOT NULL DEFAULT 'bank_account'
    CHECK (deposit_type IN ('bank_account', 'bank_guarantee', 'cpas_guarantee', 'cash')),

  bank_name TEXT,
  account_reference TEXT,

  status TEXT NOT NULL DEFAULT 'held'
    CHECK (status IN ('pending', 'held', 'partial_return', 'returned', 'disputed')),
  received_at DATE,
  return_due_date DATE,
  returned_at DATE,
  returned_amount DECIMAL(10,2),
  deductions JSONB,

  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_security_deposits_contract ON security_deposits(contract_id);
CREATE INDEX idx_security_deposits_team ON security_deposits(team_id, status);

ALTER TABLE security_deposits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "security_deposits_select"
  ON security_deposits FOR SELECT
  USING (is_team_manager(team_id));

CREATE POLICY "security_deposits_insert"
  ON security_deposits FOR INSERT
  WITH CHECK (is_team_manager(team_id));

CREATE POLICY "security_deposits_update"
  ON security_deposits FOR UPDATE
  USING (is_team_manager(team_id));

-- ---------------------------------------------------------------------------
-- 6. auto_linking_rules — Regles d'auto-liaison
-- ---------------------------------------------------------------------------
CREATE TABLE auto_linking_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,

  name TEXT NOT NULL,

  conditions JSONB NOT NULL,

  target_type TEXT NOT NULL CHECK (target_type IN (
    'rent_call', 'intervention', 'supplier_contract',
    'property_expense', 'security_deposit', 'management_fee'
  )),
  target_contract_id UUID REFERENCES contracts(id),
  target_intervention_id UUID REFERENCES interventions(id),
  target_supplier_contract_id UUID REFERENCES supplier_contracts(id),

  is_active BOOLEAN NOT NULL DEFAULT true,

  times_applied INTEGER NOT NULL DEFAULT 0,
  last_applied_at TIMESTAMPTZ,

  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES users(id)
);

CREATE INDEX idx_auto_linking_rules_team
  ON auto_linking_rules(team_id) WHERE deleted_at IS NULL AND is_active = true;

ALTER TABLE auto_linking_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auto_linking_rules_select"
  ON auto_linking_rules FOR SELECT
  USING (is_team_manager(team_id) AND deleted_at IS NULL);

CREATE POLICY "auto_linking_rules_insert"
  ON auto_linking_rules FOR INSERT
  WITH CHECK (is_team_manager(team_id));

CREATE POLICY "auto_linking_rules_update"
  ON auto_linking_rules FOR UPDATE
  USING (is_team_manager(team_id) AND deleted_at IS NULL);

-- ---------------------------------------------------------------------------
-- 7. transaction_links — Liens transaction <-> entite
-- ---------------------------------------------------------------------------
CREATE TABLE transaction_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  bank_transaction_id UUID NOT NULL REFERENCES bank_transactions(id),

  entity_type TEXT NOT NULL CHECK (entity_type IN (
    'rent_call', 'intervention', 'supplier_contract',
    'property_expense', 'security_deposit', 'management_fee'
  )),

  rent_call_id UUID REFERENCES rent_calls(id),
  intervention_id UUID REFERENCES interventions(id),
  supplier_contract_id UUID REFERENCES supplier_contracts(id),
  property_expense_id UUID REFERENCES property_expenses(id),
  security_deposit_id UUID REFERENCES security_deposits(id),

  -- Exactly one FK non-null (except management_fee which has none)
  CONSTRAINT exactly_one_link CHECK (
    (CASE WHEN rent_call_id IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN intervention_id IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN supplier_contract_id IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN property_expense_id IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN security_deposit_id IS NOT NULL THEN 1 ELSE 0 END) =
    CASE WHEN entity_type = 'management_fee' THEN 0 ELSE 1 END
  ),

  match_confidence DECIMAL(5,2),
  match_method TEXT NOT NULL DEFAULT 'manual'
    CHECK (match_method IN ('manual', 'auto_rule', 'suggestion_accepted')),
  auto_rule_id UUID REFERENCES auto_linking_rules(id),

  linked_by UUID NOT NULL REFERENCES users(id),
  linked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  unlinked_at TIMESTAMPTZ,
  unlinked_by UUID REFERENCES users(id)
);

-- Partial unique indexes: prevent duplicate links (NULL-safe)
CREATE UNIQUE INDEX idx_transaction_links_rent_call
  ON transaction_links(bank_transaction_id, rent_call_id)
  WHERE rent_call_id IS NOT NULL AND unlinked_at IS NULL;

CREATE UNIQUE INDEX idx_transaction_links_intervention
  ON transaction_links(bank_transaction_id, intervention_id)
  WHERE intervention_id IS NOT NULL AND unlinked_at IS NULL;

CREATE UNIQUE INDEX idx_transaction_links_supplier_contract
  ON transaction_links(bank_transaction_id, supplier_contract_id)
  WHERE supplier_contract_id IS NOT NULL AND unlinked_at IS NULL;

CREATE UNIQUE INDEX idx_transaction_links_property_expense
  ON transaction_links(bank_transaction_id, property_expense_id)
  WHERE property_expense_id IS NOT NULL AND unlinked_at IS NULL;

CREATE UNIQUE INDEX idx_transaction_links_security_deposit
  ON transaction_links(bank_transaction_id, security_deposit_id)
  WHERE security_deposit_id IS NOT NULL AND unlinked_at IS NULL;

CREATE INDEX idx_transaction_links_transaction
  ON transaction_links(bank_transaction_id) WHERE unlinked_at IS NULL;

ALTER TABLE transaction_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "transaction_links_select"
  ON transaction_links FOR SELECT
  USING (is_team_manager(team_id));

CREATE POLICY "transaction_links_insert"
  ON transaction_links FOR INSERT
  WITH CHECK (is_team_manager(team_id));

CREATE POLICY "transaction_links_update"
  ON transaction_links FOR UPDATE
  USING (is_team_manager(team_id));

-- ---------------------------------------------------------------------------
-- 8. ALTER contracts — add auto_rent_calls flag
-- ---------------------------------------------------------------------------
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS auto_rent_calls BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN contracts.auto_rent_calls IS 'Enables automatic rent call generation. Cannot be disabled via UI (business rule).';

-- ---------------------------------------------------------------------------
-- 9. updated_at triggers for new tables
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_bank_connections_updated_at
  BEFORE UPDATE ON bank_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_bank_transactions_updated_at
  BEFORE UPDATE ON bank_transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_rent_calls_updated_at
  BEFORE UPDATE ON rent_calls
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_property_expenses_updated_at
  BEFORE UPDATE ON property_expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_auto_linking_rules_updated_at
  BEFORE UPDATE ON auto_linking_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_security_deposits_updated_at
  BEFORE UPDATE ON security_deposits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------------------------
-- 10. Comments
-- ---------------------------------------------------------------------------
COMMENT ON TABLE bank_connections IS 'Bank accounts connected via Tink Open Banking (PSD2)';
COMMENT ON TABLE bank_transactions IS 'Transactions synced from Tink, immutable after import';
COMMENT ON TABLE rent_calls IS 'Auto-generated rent payment echeances from active contracts';
COMMENT ON TABLE transaction_links IS 'Links between bank transactions and SEIDO entities (polymorphic)';
COMMENT ON TABLE auto_linking_rules IS 'User-defined rules for automatic transaction reconciliation';
COMMENT ON TABLE property_expenses IS 'Recurring property charges (syndic, taxes, insurance)';
COMMENT ON TABLE security_deposits IS 'Tenant security deposits with legal tracking (BE/FR compliance)';
