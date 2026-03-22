/**
 * Bank Module Types — SEIDO
 *
 * Types for Tink Open Banking integration, transaction reconciliation,
 * rent calls, and financial reporting.
 */

// ============================================================================
// TINK API TYPES
// ============================================================================

/** Tink OAuth token response */
export interface TinkTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token?: string
  scope?: string
}

/** Tink amount value — unscaledValue and scale can be string OR number */
export interface TinkAmountValue {
  unscaledValue: string | number
  scale: string | number
}

/** Tink amount with currency */
export interface TinkAmount {
  currencyCode: string
  value: TinkAmountValue
}

/** Tink account from /data/v2/accounts */
export interface TinkAccount {
  id: string
  name: string
  type: string
  balances?: {
    booked?: { amount: TinkAmount }
    available?: { amount: TinkAmount }
  }
  identifiers?: {
    iban?: { iban: string }
    financialInstitution?: { accountNumber: string }
  }
  financialInstitutionId?: string
}

/** Tink accounts list response */
export interface TinkAccountsResponse {
  accounts: TinkAccount[]
  nextPageToken?: string
}

/** Tink transaction from /data/v2/transactions */
export interface TinkTransaction {
  id: string
  accountId: string
  amount: TinkAmount
  dates: {
    booked: string
    value?: string
    transaction?: string
  }
  descriptions: {
    original: string
    display?: string
    detailed?: { unstructured?: string }
  }
  status: 'BOOKED' | 'PENDING' | 'UNDEFINED'
  reference?: string
  counterparties?: {
    payer?: {
      name?: string
      identifiers?: {
        financialInstitution?: { accountNumber?: string }
      }
    }
    payee?: {
      name?: string
      identifiers?: {
        financialInstitution?: { accountNumber?: string }
      }
    }
  }
  merchantInformation?: {
    merchantName?: string
    merchantCategoryCode?: string
  }
  identifiers?: {
    providerTransactionId?: string
  }
}

/** Tink transactions list response */
export interface TinkTransactionsResponse {
  transactions: TinkTransaction[]
  nextPageToken?: string
}

/** Tink user creation response */
export interface TinkUserResponse {
  user_id: string
}

// ============================================================================
// CONVERSION UTILITIES
// ============================================================================

/**
 * Convert Tink amount (unscaledValue + scale) to decimal number.
 * Handles both string and number types for unscaledValue/scale.
 *
 * Example: { unscaledValue: "-4500", scale: "2" } → -45.00
 * Example: { unscaledValue: 1050, scale: 2 } → 10.50
 */
export function parseTinkAmount(value: TinkAmountValue): number {
  return Number(value.unscaledValue) / Math.pow(10, Number(value.scale))
}

// ============================================================================
// BANK CONNECTION
// ============================================================================

export type BankConnectionSyncStatus = 'active' | 'error' | 'disconnected' | 'blacklisted'
export type AccountPurpose = 'operating' | 'client_funds' | 'security_deposits'

export interface CreateBankConnectionDTO {
  team_id: string
  tink_user_id: string
  tink_credentials_id?: string
  tink_account_id: string
  bank_name: string
  bank_logo_url?: string
  account_name?: string
  account_type?: string
  iban: string
  currency?: string
  account_purpose?: AccountPurpose
  tink_access_token: string
  tink_refresh_token: string
  token_expires_at: string
  consent_expires_at?: string
  balance?: number
  created_by: string
}

export interface BankConnectionRow {
  id: string
  team_id: string
  tink_user_id: string
  tink_credentials_id: string | null
  tink_account_id: string
  bank_name: string
  bank_logo_url: string | null
  account_name: string | null
  account_type: string | null
  iban_encrypted: string | null
  iban_last4: string | null
  currency: string
  account_purpose: AccountPurpose
  tink_access_token_encrypted: string | null
  tink_refresh_token_encrypted: string | null
  token_expires_at: string | null
  balance: number | null
  last_sync_at: string | null
  sync_status: BankConnectionSyncStatus
  sync_error_message: string | null
  consent_expires_at: string | null
  is_blacklisted: boolean
  blacklisted_at: string | null
  blacklisted_by: string | null
  created_by: string
  created_at: string
  updated_at: string
  deleted_at: string | null
  deleted_by: string | null
}

/** Safe version for client-side (no encrypted fields) */
export interface BankConnectionSafe {
  id: string
  team_id: string
  tink_account_id: string
  bank_name: string
  bank_logo_url: string | null
  account_name: string | null
  account_type: string | null
  iban_last4: string | null
  currency: string
  account_purpose: AccountPurpose
  balance: number | null
  last_sync_at: string | null
  sync_status: BankConnectionSyncStatus
  sync_error_message: string | null
  consent_expires_at: string | null
  is_blacklisted: boolean
  created_at: string
}

// ============================================================================
// BANK TRANSACTION
// ============================================================================

export type TransactionReconciliationStatus = 'to_reconcile' | 'reconciled' | 'ignored'

export interface BankTransactionRow {
  id: string
  team_id: string
  bank_connection_id: string
  tink_transaction_id: string
  transaction_date: string
  value_date: string | null
  amount: number
  currency: string
  description_original: string
  description_display: string | null
  description_detailed: string | null
  payer_name: string | null
  payer_account_number: string | null
  payee_name: string | null
  payee_account_number: string | null
  reference: string | null
  tink_status: string | null
  merchant_name: string | null
  merchant_category_code: string | null
  provider_transaction_id: string | null
  status: TransactionReconciliationStatus
  reconciled_at: string | null
  reconciled_by: string | null
  ignored_at: string | null
  ignored_by: string | null
  created_at: string
  updated_at: string
}

export interface TransactionFilters {
  status?: TransactionReconciliationStatus
  bankConnectionId?: string
  dateFrom?: string
  dateTo?: string
  amountMin?: number
  amountMax?: number
  search?: string
  page?: number
  pageSize?: number
}

// ============================================================================
// RENT CALL
// ============================================================================

export type RentCallStatus = 'pending' | 'partial' | 'paid' | 'overdue' | 'cancelled'

export interface RentCallRow {
  id: string
  team_id: string
  contract_id: string
  lot_id: string
  building_id: string | null
  due_date: string
  period_start: string
  period_end: string
  rent_amount: number
  charges_amount: number
  total_expected: number
  status: RentCallStatus
  total_received: number
  is_auto_generated: boolean
  last_reminder_sent_at: string | null
  reminder_count: number
  created_at: string
  updated_at: string
}

export type RentCallInsert = Omit<RentCallRow, 'id' | 'total_expected' | 'created_at' | 'updated_at'>

export interface RentCallFilters {
  status?: RentCallStatus
  contractId?: string
  lotId?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  pageSize?: number
}

export interface RentCallPaginatedResult {
  data: RentCallRow[]
  total: number
}

export interface RentCallGenerationSummary {
  total: number
  created: number
  errors: number
}

// ============================================================================
// TRANSACTION LINK
// ============================================================================

export type TransactionEntityType =
  | 'rent_call'
  | 'intervention'
  | 'supplier_contract'
  | 'property_expense'
  | 'security_deposit'

export type MatchMethod = 'manual' | 'auto_rule' | 'suggestion_accepted'

export interface TransactionLinkRow {
  id: string
  team_id: string
  bank_transaction_id: string
  entity_type: TransactionEntityType
  rent_call_id: string | null
  intervention_id: string | null
  supplier_contract_id: string | null
  property_expense_id: string | null
  security_deposit_id: string | null
  match_confidence: number | null
  match_method: MatchMethod
  auto_rule_id: string | null
  linked_by: string
  linked_at: string
  unlinked_at: string | null
  unlinked_by: string | null
}

export interface CreateTransactionLinkDTO {
  team_id: string
  bank_transaction_id: string
  entity_type: TransactionEntityType
  rent_call_id?: string
  intervention_id?: string
  supplier_contract_id?: string
  property_expense_id?: string
  security_deposit_id?: string
  match_confidence?: number
  match_method: MatchMethod
  auto_rule_id?: string
  linked_by: string
}

// ============================================================================
// AUTO LINKING RULE
// ============================================================================

export interface AutoLinkingRuleConditions {
  counterparty_name?: { operator: 'contains' | 'equals' | 'starts_with'; value: string }
  bank_connection_id?: string
  amount?: { min?: number; max?: number }
  reference_pattern?: string
}

export interface AutoLinkingRuleRow {
  id: string
  team_id: string
  name: string
  conditions: AutoLinkingRuleConditions
  target_type: TransactionEntityType
  target_contract_id: string | null
  target_intervention_id: string | null
  target_supplier_contract_id: string | null
  is_active: boolean
  times_applied: number
  last_applied_at: string | null
  created_by: string
  created_at: string
  updated_at: string
  deleted_at: string | null
  deleted_by: string | null
}

// ============================================================================
// MATCHING / SUGGESTIONS
// ============================================================================

export type ConfidenceLevel = 'high' | 'medium' | 'low'

export interface MatchSuggestion {
  entity_type: TransactionEntityType
  entity_id: string
  label: string
  amount: number
  confidence: number
  confidence_level: 'high' | 'medium' | 'low'
  match_details: string[]
}

// ============================================================================
// REPORTS
// ============================================================================

export interface BankReportData {
  revenue: number
  revenueDelta: number
  expenses: number
  expensesDelta: number
  collectionRate: number
  toReconcileCount: number
  overdueRentCalls: Array<{
    id: string
    lot_name: string
    tenant_name: string
    amount: number
    days_overdue: number
  }>
}
