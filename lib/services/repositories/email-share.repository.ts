import { BaseRepository } from '../core/base-repository'
import { EmailShare } from '@/lib/types/email-integration'
import { SupabaseClient } from '@supabase/supabase-js'

export interface SharedWithMeGroup {
  connection: {
    id: string
    email_address: string
    owner_name: string | null
  }
  threads: {
    conversation_thread_id: string
    subject: string
    email_count: number
    shared_by: string | null
    shared_at: string
  }[]
}

export interface CreateSharesOptions {
  emailId: string
  conversationThreadId: string
  participantUserIds: string[]
  sharedByUserId: string
  teamId: string
  connectionId: string
}

export class EmailShareRepository extends BaseRepository<EmailShare> {
  constructor(supabaseClient: SupabaseClient) {
    super(supabaseClient, 'email_shares')
  }

  protected validate(): void {
    // No validation needed — all checks done at call site
  }

  /**
   * Create shares for all emails in a thread when a conversation participant is added.
   * Finds all emails in the same RFC thread (via message_id/references/in_reply_to_header)
   * on the same connection and creates email_shares for each.
   */
  async createSharesForThread(options: CreateSharesOptions): Promise<void> {
    const { emailId, conversationThreadId, participantUserIds, sharedByUserId, teamId, connectionId } = options

    // 1. Get the source email's threading headers
    const { data: sourceEmail, error: emailError } = await this.supabase
      .from('emails')
      .select('id, message_id, in_reply_to_header, references')
      .eq('id', emailId)
      .limit(1)

    if (emailError) throw emailError
    if (!sourceEmail?.[0]) return

    const source = sourceEmail[0]

    // 2. Find all emails in the same thread on this connection (parallel queries)
    const threadEmailIds = new Set<string>([source.id])

    const threadQueries: Promise<void>[] = []

    if (source.message_id) {
      threadQueries.push(
        this.supabase
          .from('emails')
          .select('id')
          .eq('email_connection_id', connectionId)
          .eq('in_reply_to_header', source.message_id)
          .then(({ data }) => { data?.forEach(r => threadEmailIds.add(r.id)) })
      )
    }

    if (source.in_reply_to_header) {
      threadQueries.push(
        this.supabase
          .from('emails')
          .select('id')
          .eq('email_connection_id', connectionId)
          .eq('message_id', source.in_reply_to_header)
          .then(({ data }) => { data?.forEach(p => threadEmailIds.add(p.id)) })
      )
    }

    if (source.references) {
      const refIds = source.references.split(' ').filter(Boolean)
      if (refIds.length > 0) {
        threadQueries.push(
          this.supabase
            .from('emails')
            .select('id')
            .eq('email_connection_id', connectionId)
            .in('message_id', refIds)
            .then(({ data }) => { data?.forEach(r => threadEmailIds.add(r.id)) })
        )
      }
    }

    await Promise.all(threadQueries)

    // 3. Create shares for each email x each participant
    const shares = Array.from(threadEmailIds).flatMap(eid =>
      participantUserIds
        .filter(uid => uid !== sharedByUserId) // Don't share with self
        .map(uid => ({
          email_id: eid,
          thread_id: conversationThreadId,
          shared_with_user_id: uid,
          shared_by_user_id: sharedByUserId,
          team_id: teamId,
        }))
    )

    if (shares.length === 0) return

    // Batch insert with ON CONFLICT DO NOTHING (via upsert ignoreDuplicates)
    const { error } = await this.supabase
      .from('email_shares')
      .upsert(shares, { onConflict: 'email_id,shared_with_user_id', ignoreDuplicates: true })

    if (error) throw error
  }

  /**
   * Get emails shared with a specific user, grouped by source connection.
   * Used for the "Shared with me" sidebar section.
   */
  async getSharedWithUser(
    userId: string,
    teamId: string
  ): Promise<SharedWithMeGroup[]> {
    const { data, error } = await this.supabase
      .from('email_shares')
      .select(`
        id,
        email_id,
        thread_id,
        shared_by_user_id,
        created_at,
        emails!inner (
          id,
          email_connection_id,
          subject,
          received_at,
          sent_at
        )
      `)
      .eq('shared_with_user_id', userId)
      .eq('team_id', teamId)
      .order('created_at', { ascending: false })

    if (error) throw error
    if (!data || data.length === 0) return []

    // Group by connection, then by thread
    const connectionMap = new Map<string, {
      emailIds: Set<string>
      threads: Map<string, {
        subject: string
        emailCount: number
        sharedBy: string | null
        sharedAt: string
      }>
    }>()

    for (const share of data) {
      const email = share.emails as unknown as {
        id: string
        email_connection_id: string | null
        subject: string
        received_at: string | null
        sent_at: string | null
      }
      const connId = email.email_connection_id || 'unknown'

      if (!connectionMap.has(connId)) {
        connectionMap.set(connId, { emailIds: new Set(), threads: new Map() })
      }
      const group = connectionMap.get(connId)!
      group.emailIds.add(email.id)

      const threadId = share.thread_id
      if (!group.threads.has(threadId)) {
        group.threads.set(threadId, {
          subject: email.subject,
          emailCount: 0,
          sharedBy: share.shared_by_user_id,
          sharedAt: share.created_at,
        })
      }
      group.threads.get(threadId)!.emailCount++
    }

    // Fetch connection details + all user names in parallel
    const connectionIds = Array.from(connectionMap.keys()).filter(id => id !== 'unknown')
    const sharerIds = [...new Set(data.map(s => s.shared_by_user_id).filter(Boolean))]

    const [connectionsResult, usersResult] = await Promise.all([
      connectionIds.length > 0
        ? this.supabase
            .from('team_email_connections')
            .select('id, email_address, added_by_user_id')
            .in('id', connectionIds)
        : { data: [], error: null },
      sharerIds.length > 0
        ? this.supabase.from('users').select('id, name').in('id', sharerIds)
        : { data: [], error: null },
    ])

    const connDetails = new Map(
      (connectionsResult.data || []).map(c => [c.id, c])
    )

    // Fetch owner names (may overlap with sharer names)
    const ownerIds = [...new Set(
      (connectionsResult.data || [])
        .map(c => c.added_by_user_id)
        .filter((id: string) => id && !sharerIds.includes(id))
    )]
    const ownerResult = ownerIds.length > 0
      ? await this.supabase.from('users').select('id, name').in('id', ownerIds)
      : { data: [] }

    // Merge all user names into one map
    const userMap = new Map<string, string>()
    ;(usersResult.data || []).forEach(u => userMap.set(u.id, u.name))
    ;(ownerResult.data || []).forEach(u => userMap.set(u.id, u.name))

    // Build result
    const groups: SharedWithMeGroup[] = []
    for (const [connId, group] of connectionMap) {
      const conn = connDetails.get(connId)
      groups.push({
        connection: {
          id: connId,
          email_address: conn?.email_address || 'Unknown',
          owner_name: conn ? userMap.get(conn.added_by_user_id) || null : null,
        },
        threads: Array.from(group.threads.entries()).map(([threadId, t]) => ({
          conversation_thread_id: threadId,
          subject: t.subject,
          email_count: t.emailCount,
          shared_by: t.sharedBy ? userMap.get(t.sharedBy) || null : null,
          shared_at: t.sharedAt,
        })),
      })
    }

    return groups
  }

  /**
   * Quick list of email IDs shared with a user (for query filtering)
   */
  async getSharedEmailIds(userId: string, teamId: string): Promise<string[]> {
    const { data, error } = await this.supabase
      .from('email_shares')
      .select('email_id')
      .eq('shared_with_user_id', userId)
      .eq('team_id', teamId)

    if (error) throw error
    return (data || []).map(s => s.email_id)
  }
}
