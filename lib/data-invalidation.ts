'use client'

/**
 * Granular data invalidation via Supabase Broadcast.
 *
 * After a mutation, call broadcastInvalidation(['buildings', 'stats'])
 * All hooks subscribed to those entities auto-refetch.
 */

// Entity types for granular invalidation
export type DataEntity =
  | 'buildings'
  | 'lots'
  | 'contacts'
  | 'interventions'
  | 'contracts'
  | 'stats'
  | 'bank_transactions'
  | 'rent_calls'

export const BROADCAST_EVENT = 'data-invalidation'

export interface InvalidationPayload {
  type: typeof BROADCAST_EVENT
  entities: DataEntity[]
  triggeredBy: string
  timestamp: number
}
