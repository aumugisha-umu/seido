import { z } from 'zod'

export const reconcileTransactionSchema = z.object({
  entity_type: z.enum([
    'rent_call',
    'intervention',
    'supplier_contract',
    'property_expense',
    'security_deposit',
  ]),
  entity_id: z.string().uuid(),
  match_method: z
    .enum(['manual', 'auto_rule', 'suggestion_accepted'])
    .default('manual'),
  match_confidence: z.number().min(0).max(100).optional(),
})

export const unlinkTransactionSchema = z.object({
  link_id: z.string().uuid(),
})

export const syncConnectionSchema = z.object({
  connection_id: z.string().uuid(),
})

export const transactionFiltersSchema = z.object({
  status: z.enum(['to_reconcile', 'reconciled', 'ignored']).optional(),
  bank_connection_id: z.string().uuid().optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  amount_min: z.coerce.number().optional(),
  amount_max: z.coerce.number().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  page_size: z.coerce.number().int().positive().max(100).default(25),
})

export const toggleBlacklistSchema = z.object({
  blacklisted: z.boolean(),
})

export type ReconcileTransactionInput = z.infer<typeof reconcileTransactionSchema>
export type UnlinkTransactionInput = z.infer<typeof unlinkTransactionSchema>
export type SyncConnectionInput = z.infer<typeof syncConnectionSchema>
export type TransactionFilters = z.infer<typeof transactionFiltersSchema>
export type ToggleBlacklistInput = z.infer<typeof toggleBlacklistSchema>
