/**
 * Server-side data invalidation broadcast.
 *
 * Uses Supabase Broadcast to signal all connected clients
 * that specific entity types need to be refetched.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { DataEntity, InvalidationPayload } from '@/lib/data-invalidation'
import { BROADCAST_EVENT } from '@/lib/data-invalidation'

/**
 * Broadcast data invalidation from server actions.
 *
 * @param supabase - Authenticated Supabase client
 * @param teamId - Team ID for the broadcast channel
 * @param entities - Entity types to invalidate
 */
export async function broadcastInvalidationServer(
  supabase: SupabaseClient,
  teamId: string,
  entities: DataEntity[]
): Promise<void> {
  const channelName = `seido-team:${teamId}`

  const payload: InvalidationPayload = {
    type: BROADCAST_EVENT,
    entities,
    triggeredBy: 'server-action',
    timestamp: Date.now()
  }

  const channel = supabase.channel(channelName)

  await channel.send({
    type: 'broadcast',
    event: BROADCAST_EVENT,
    payload
  })

  // Clean up the channel subscription
  supabase.removeChannel(channel)
}
