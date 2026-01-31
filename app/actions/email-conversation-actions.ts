'use server'

/**
 * Email Conversation Server Actions
 * Server-side operations for email-linked internal team conversations
 * Allows gestionnaires to start private discussions about specific emails
 *
 * ✅ REFACTORED (Jan 2026): Uses centralized getServerActionAuthContextOrNull()
 *    instead of duplicated local auth helper
 */

import { createServerActionSupabaseClient, createServiceRoleSupabaseClient } from '@/lib/services'
import { getServerActionAuthContextOrNull } from '@/lib/server-context'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import type { Database } from '@/lib/database.types'

// Type aliases
type ConversationThread = Database['public']['Tables']['conversation_threads']['Row']

// Action result type
export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

// Extended types
interface ThreadWithParticipants extends ConversationThread {
  participants?: ParticipantInfo[]
  message_count: number
}

interface ParticipantInfo {
  user_id: string
  joined_at: string
  user?: {
    id: string
    name: string | null
    email: string | null
    avatar_url: string | null
  }
}

interface TeamGestionnaire {
  id: string
  name: string | null
  email: string | null
  avatar_url: string | null
  role: string
}

/**
 * Get email conversation thread if it exists
 * Returns the thread with participants if found, null otherwise
 */
export async function getEmailConversationAction(
  emailId: string
): Promise<ActionResult<ThreadWithParticipants | null>> {
  try {
    // Auth check
    const authContext = await getServerActionAuthContextOrNull()
    const user = authContext?.profile
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    // Validate email ID
    if (!z.string().uuid().safeParse(emailId).success) {
      return { success: false, error: 'Invalid email ID' }
    }

    logger.info('📧 [EMAIL-CONV] Checking for existing conversation:', {
      emailId,
      userId: user.id
    })

    const supabase = await createServerActionSupabaseClient()

    // Find thread linked to this email
    const { data: thread, error: threadError } = await supabase
      .from('conversation_threads')
      .select(`
        *,
        participants:conversation_participants(
          user_id,
          joined_at,
          user:users(id, name, email, avatar_url)
        )
      `)
      .eq('email_id', emailId)
      .eq('thread_type', 'email_internal')
      .maybeSingle()

    if (threadError) {
      logger.error('❌ [EMAIL-CONV] Error fetching thread:', threadError)
      return { success: false, error: 'Failed to fetch conversation' }
    }

    // Thread doesn't exist yet
    if (!thread) {
      return { success: true, data: null }
    }

    return {
      success: true,
      data: {
        ...thread,
        participants: thread.participants || []
      } as ThreadWithParticipants
    }
  } catch (error) {
    logger.error('❌ [EMAIL-CONV] Error in getEmailConversationAction:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Create a new email conversation with selected participants
 * All selected gestionnaires will be added as participants
 */
export async function createEmailConversationAction(
  emailId: string,
  participantIds: string[]
): Promise<ActionResult<ThreadWithParticipants>> {
  try {
    // Auth check
    const authContext = await getServerActionAuthContextOrNull()
    const user = authContext?.profile
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    // Only gestionnaires can create email conversations
    if (user.role !== 'gestionnaire' && user.role !== 'admin') {
      return { success: false, error: 'Only managers can create email conversations' }
    }

    // Validate input
    if (!z.string().uuid().safeParse(emailId).success) {
      return { success: false, error: 'Invalid email ID' }
    }
    if (!Array.isArray(participantIds) || participantIds.length === 0) {
      return { success: false, error: 'At least one participant required' }
    }

    logger.info('➕ [EMAIL-CONV] Creating email conversation:', {
      emailId,
      participantCount: participantIds.length,
      createdBy: user.id
    })

    const supabase = await createServerActionSupabaseClient()

    // Get email to verify it exists and get team_id
    const { data: email, error: emailError } = await supabase
      .from('emails')
      .select('id, team_id, subject')
      .eq('id', emailId)
      .single()

    if (emailError || !email) {
      return { success: false, error: 'Email not found' }
    }

    // Verify current user is in the team
    const { data: membership } = await supabase
      .from('team_members')
      .select('user_id')
      .eq('team_id', email.team_id)
      .eq('user_id', user.id)
      .is('left_at', null)
      .single()

    if (!membership) {
      return { success: false, error: 'You are not a member of this team' }
    }

    // Check if conversation already exists
    const { data: existingThread } = await supabase
      .from('conversation_threads')
      .select('id')
      .eq('email_id', emailId)
      .eq('thread_type', 'email_internal')
      .maybeSingle()

    if (existingThread) {
      return { success: false, error: 'A conversation already exists for this email' }
    }

    // Create the thread using service role to bypass RLS
    // Security: Permission validation already done above (role check + team membership)
    const supabaseAdmin = createServiceRoleSupabaseClient()
    const { data: newThread, error: createError } = await supabaseAdmin
      .from('conversation_threads')
      .insert({
        email_id: emailId,
        team_id: email.team_id,
        thread_type: 'email_internal',
        title: `Discussion: ${email.subject?.substring(0, 50) || 'Email'}`,
        created_by: user.id,
        message_count: 0
      })
      .select()
      .single()

    if (createError || !newThread) {
      logger.error('❌ [EMAIL-CONV] Failed to create thread:', createError)
      return { success: false, error: 'Failed to create conversation' }
    }

    // Add participants (including the creator)
    const uniqueParticipantIds = [...new Set([user.id, ...participantIds])]
    const participantsToInsert = uniqueParticipantIds.map(userId => ({
      thread_id: newThread.id,
      user_id: userId
    }))

    // Use same admin client for participants to ensure consistency
    const { error: participantsError } = await supabaseAdmin
      .from('conversation_participants')
      .insert(participantsToInsert)

    if (participantsError) {
      logger.error('❌ [EMAIL-CONV] Failed to add participants:', participantsError)
      // Thread was created, but participants failed - still return success
      // Participants can be added later
    }

    // Fetch the thread with participants using admin client for consistency
    const { data: threadWithParticipants, error: fetchError } = await supabaseAdmin
      .from('conversation_threads')
      .select(`
        *,
        participants:conversation_participants(
          user_id,
          joined_at,
          user:users(id, name, email, avatar_url)
        )
      `)
      .eq('id', newThread.id)
      .single()

    if (fetchError) {
      logger.error('❌ [EMAIL-CONV] Failed to fetch created thread:', fetchError)
      // Thread was created but fetch failed - return minimal data
      return {
        success: true,
        data: {
          ...newThread,
          participants: [],
          message_count: 0
        } as ThreadWithParticipants
      }
    }

    logger.info('✅ [EMAIL-CONV] Created conversation:', {
      threadId: newThread.id,
      participantCount: uniqueParticipantIds.length
    })

    revalidatePath('/gestionnaire/mail')

    return {
      success: true,
      data: threadWithParticipants as ThreadWithParticipants
    }
  } catch (error) {
    logger.error('❌ [EMAIL-CONV] Error in createEmailConversationAction:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Add participants to an existing email conversation
 */
export async function addEmailConversationParticipantsAction(
  threadId: string,
  userIds: string[]
): Promise<ActionResult<void>> {
  try {
    // Auth check
    const authContext = await getServerActionAuthContextOrNull()
    const user = authContext?.profile
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    // Only gestionnaires can add participants
    if (user.role !== 'gestionnaire' && user.role !== 'admin') {
      return { success: false, error: 'Only managers can add participants' }
    }

    // Validate input
    if (!z.string().uuid().safeParse(threadId).success) {
      return { success: false, error: 'Invalid thread ID' }
    }
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return { success: false, error: 'At least one user ID required' }
    }

    const supabase = await createServerActionSupabaseClient()

    // Get thread and verify it's an email conversation
    const { data: thread, error: threadError } = await supabase
      .from('conversation_threads')
      .select('id, team_id, thread_type')
      .eq('id', threadId)
      .single()

    if (threadError || !thread) {
      return { success: false, error: 'Thread not found' }
    }

    if (thread.thread_type !== 'email_internal') {
      return { success: false, error: 'This is not an email conversation' }
    }

    // Verify current user is in the team
    const { data: membership } = await supabase
      .from('team_members')
      .select('user_id')
      .eq('team_id', thread.team_id)
      .eq('user_id', user.id)
      .is('left_at', null)
      .single()

    if (!membership) {
      return { success: false, error: 'You are not a member of this team' }
    }

    // Get existing participants to avoid duplicates
    const { data: existingParticipants } = await supabase
      .from('conversation_participants')
      .select('user_id')
      .eq('thread_id', threadId)

    const existingIds = new Set(existingParticipants?.map(p => p.user_id) || [])
    const newUserIds = userIds.filter(id => !existingIds.has(id))

    if (newUserIds.length === 0) {
      return { success: true, data: undefined } // All users already participants
    }

    // Add new participants
    const participantsToInsert = newUserIds.map(userId => ({
      thread_id: threadId,
      user_id: userId
    }))

    const { error: insertError } = await supabase
      .from('conversation_participants')
      .insert(participantsToInsert)

    if (insertError) {
      logger.error('❌ [EMAIL-CONV] Failed to add participants:', insertError)
      return { success: false, error: 'Failed to add participants' }
    }

    logger.info('✅ [EMAIL-CONV] Added participants:', {
      threadId,
      addedCount: newUserIds.length
    })

    return { success: true, data: undefined }
  } catch (error) {
    logger.error('❌ [EMAIL-CONV] Error in addEmailConversationParticipantsAction:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Get all gestionnaires of a team for participant selection
 */
export async function getTeamGestionnairesAction(
  teamId: string
): Promise<ActionResult<TeamGestionnaire[]>> {
  try {
    // Auth check
    const authContext = await getServerActionAuthContextOrNull()
    const user = authContext?.profile
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    // Validate team ID
    if (!z.string().uuid().safeParse(teamId).success) {
      return { success: false, error: 'Invalid team ID' }
    }

    const supabase = await createServerActionSupabaseClient()

    // Get active team members who are gestionnaires or admins
    const { data: teamMembers, error: membersError } = await supabase
      .from('team_members')
      .select('user_id')
      .eq('team_id', teamId)
      .is('left_at', null)

    if (membersError) {
      return { success: false, error: 'Failed to fetch team members' }
    }

    if (!teamMembers || teamMembers.length === 0) {
      return { success: true, data: [] }
    }

    // Get user details for gestionnaires/admins only (with active auth account)
    const userIds = teamMembers.map(m => m.user_id)
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, name, email, avatar_url, role')
      .in('id', userIds)
      .in('role', ['gestionnaire', 'admin'])
      .not('auth_user_id', 'is', null) // Only users with active auth account

    if (usersError) {
      return { success: false, error: 'Failed to fetch users' }
    }

    return {
      success: true,
      data: (users || []) as TeamGestionnaire[]
    }
  } catch (error) {
    logger.error('❌ [EMAIL-CONV] Error in getTeamGestionnairesAction:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Get thread participants
 */
export async function getEmailConversationParticipantsAction(
  threadId: string
): Promise<ActionResult<ParticipantInfo[]>> {
  try {
    // Auth check
    const authContext = await getServerActionAuthContextOrNull()
    const user = authContext?.profile
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    // Validate thread ID
    if (!z.string().uuid().safeParse(threadId).success) {
      return { success: false, error: 'Invalid thread ID' }
    }

    const supabase = await createServerActionSupabaseClient()

    const { data: participants, error } = await supabase
      .from('conversation_participants')
      .select(`
        user_id,
        joined_at,
        user:users(id, name, email, avatar_url)
      `)
      .eq('thread_id', threadId)

    if (error) {
      return { success: false, error: 'Failed to fetch participants' }
    }

    return {
      success: true,
      data: (participants || []) as ParticipantInfo[]
    }
  } catch (error) {
    logger.error('❌ [EMAIL-CONV] Error in getEmailConversationParticipantsAction:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}
