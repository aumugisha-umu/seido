'use server'

/**
 * Server Actions for Admin User Management
 *
 * Uses service_role key to bypass RLS for admin operations.
 * All actions verify admin role before executing.
 */

import { after } from 'next/server'
import { getSupabaseAdmin, isAdminConfigured } from '@/lib/services/core/supabase-admin'
import { getServerAuthContext } from '@/lib/server-context'
// Pages are force-dynamic — no cache invalidation needed
import { logger } from '@/lib/logger'
import { emailService } from '@/lib/email/email-service'
import { EMAIL_CONFIG } from '@/lib/email/resend-client'
import type { User, UserInsert, UserUpdate, UserWithStatus, UserComputedStatus } from '@/lib/services/core/service-types'
import { sanitizeSearch } from '@/lib/utils/sanitize-search'

// Type for action results
interface ActionResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

/**
 * Verify admin role and get supabase admin client
 */
async function getAdminContext() {
  // Verify admin role
  const { profile } = await getServerAuthContext('admin')

  // Get admin client
  if (!isAdminConfigured()) {
    throw new Error('Service admin non configure - verifiez SUPABASE_SERVICE_ROLE_KEY')
  }

  const supabase = getSupabaseAdmin()
  if (!supabase) {
    throw new Error('Client admin non disponible')
  }

  return { profile, supabase }
}

/**
 * Get all users (admin only) - Basic version without status computation
 */
export async function getAllUsersAction(): Promise<ActionResult<User[]>> {
  try {
    const { supabase } = await getAdminContext()
    logger.info('[ADMIN-USERS] Fetching all users')

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) {
      logger.error('[ADMIN-USERS] Error fetching users:', error)
      return { success: false, error: error.message }
    }

    logger.info(`[ADMIN-USERS] Fetched ${data?.length || 0} users`)
    return { success: true, data: data as User[] }
  } catch (error) {
    logger.error('[ADMIN-USERS] Exception in getAllUsersAction:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }
  }
}

/**
 * Compute the real status of a user based on auth_user_id, password_set, and invitation status
 */
const computeUserStatus = (
  user: User,
  invitationStatus: string | null,
  lastSignInAt: string | null
): UserComputedStatus => {
  // If manually deactivated, show as inactive
  if (!user.is_active) {
    return 'inactive'
  }

  // If user has auth_user_id AND has logged in → active
  if (user.auth_user_id && lastSignInAt) {
    return 'active'
  }

  // If invitation accepted but not yet logged in (account created but not activated)
  if (invitationStatus === 'accepted') {
    return 'active'
  }

  // If invitation is pending
  if (invitationStatus === 'pending') {
    return 'pending'
  }

  // If invitation expired
  if (invitationStatus === 'expired') {
    return 'expired'
  }

  // If invitation cancelled or no invitation exists
  return 'not_invited'
}

/**
 * Get all users with computed status (admin only)
 * Includes invitation status and last sign in from auth.users
 */
export async function getAllUsersWithStatusAction(): Promise<ActionResult<UserWithStatus[]>> {
  try {
    const { supabase } = await getAdminContext()
    logger.info('[ADMIN-USERS] Fetching all users with status')

    // 1. Fetch all users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (usersError) {
      logger.error('[ADMIN-USERS] Error fetching users:', usersError)
      return { success: false, error: usersError.message }
    }

    if (!users || users.length === 0) {
      return { success: true, data: [] }
    }

    // 2. Fetch invitations for all users' emails (get the most recent invitation per email)
    const emails = users.map(u => u.email).filter(Boolean) as string[]
    const { data: invitations, error: invitationsError } = await supabase
      .from('user_invitations')
      .select('email, status, expires_at')
      .in('email', emails)
      .order('created_at', { ascending: false })

    if (invitationsError) {
      logger.warn('[ADMIN-USERS] Error fetching invitations:', invitationsError)
    }

    // Create a map of email -> most recent invitation status
    const invitationMap = new Map<string, { status: string; expires_at: string | null }>()
    if (invitations) {
      for (const inv of invitations) {
        // Only store if not already present (first one is most recent due to ordering)
        if (!invitationMap.has(inv.email)) {
          // Check if pending invitation has expired
          let status = inv.status
          if (status === 'pending' && inv.expires_at) {
            const now = new Date()
            const expiresAt = new Date(inv.expires_at)
            if (now > expiresAt) {
              status = 'expired'
            }
          }
          invitationMap.set(inv.email, { status, expires_at: inv.expires_at })
        }
      }
    }

    // 3. Fetch auth users to get last_sign_in_at
    // Using Supabase admin API to list all users
    const authUsersMap = new Map<string, string | null>()
    try {
      const { data: authData, error: authError } = await supabase.auth.admin.listUsers({
        perPage: 1000
      })

      if (authError) {
        logger.warn('[ADMIN-USERS] Error fetching auth users:', authError)
      } else if (authData?.users) {
        for (const authUser of authData.users) {
          authUsersMap.set(authUser.id, authUser.last_sign_in_at || null)
        }
      }
    } catch (authException) {
      logger.warn('[ADMIN-USERS] Exception fetching auth users:', authException)
    }

    // 4. Merge data and compute status
    const usersWithStatus: UserWithStatus[] = users.map(user => {
      const invitation = user.email ? invitationMap.get(user.email) : null
      const invitationStatus = invitation?.status as UserWithStatus['invitation_status'] || null
      const lastSignInAt = user.auth_user_id ? authUsersMap.get(user.auth_user_id) || null : null
      
      const computedStatus = computeUserStatus(user as User, invitationStatus, lastSignInAt)

      return {
        ...user,
        computed_status: computedStatus,
        last_sign_in_at: lastSignInAt,
        invitation_status: invitationStatus,
      } as UserWithStatus
    })

    logger.info(`[ADMIN-USERS] Fetched ${usersWithStatus.length} users with status`)
    return { success: true, data: usersWithStatus }
  } catch (error) {
    logger.error('[ADMIN-USERS] Exception in getAllUsersWithStatusAction:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }
  }
}

/**
 * Get user by ID (admin only)
 */
export async function getUserByIdAction(id: string): Promise<ActionResult<User>> {
  try {
    const { supabase } = await getAdminContext()

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data: data as User }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }
  }
}

/**
 * Get all teams (admin only) — for team assignment dropdown
 */
export async function getAllTeamsAction(): Promise<ActionResult<{ id: string; name: string }[]>> {
  try {
    const { supabase } = await getAdminContext()
    const { data, error } = await supabase
      .from('teams')
      .select('id, name')
      .is('deleted_at', null)
      .order('name', { ascending: true })
    if (error) return { success: false, error: error.message }
    return { success: true, data: data || [] }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    }
  }
}

/**
 * Create a new user (admin only)
 */
export async function createUserAction(userData: UserInsert): Promise<ActionResult<User>> {
  try {
    const { supabase } = await getAdminContext()
    logger.info('[ADMIN-USERS] Creating new user:', userData.email)

    // Check email uniqueness
    if (userData.email) {
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('email', userData.email)
        .is('deleted_at', null)
        .single()

      if (existing) {
        return { success: false, error: 'Cet email est deja utilise' }
      }
    }

    const { data, error } = await supabase
      .from('users')
      .insert({
        ...userData,
        is_active: userData.is_active ?? true,
        password_set: userData.password_set ?? false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      logger.error('[ADMIN-USERS] Error creating user:', error)
      return { success: false, error: error.message }
    }

    // If team_id provided, also create team_members entry
    if (userData.team_id) {
      const { error: tmError } = await supabase
        .from('team_members')
        .insert({
          team_id: userData.team_id,
          user_id: data.id,
          role: userData.role,
        })
      if (tmError) {
        logger.warn('[ADMIN-USERS] Failed to create team_members entry:', tmError)
      }
    }

    logger.info('[ADMIN-USERS] User created:', data.id)
    return { success: true, data: data as User }
  } catch (error) {
    logger.error('[ADMIN-USERS] Exception in createUserAction:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }
  }
}

/**
 * Update an existing user (admin only)
 */
export async function updateUserAction(
  id: string,
  updates: UserUpdate
): Promise<ActionResult<User>> {
  try {
    const { supabase } = await getAdminContext()
    logger.info('[ADMIN-USERS] Updating user:', id)

    // Check email uniqueness if changing email
    if (updates.email) {
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('email', updates.email)
        .neq('id', id)
        .is('deleted_at', null)
        .single()

      if (existing) {
        return { success: false, error: 'Cet email est deja utilise par un autre utilisateur' }
      }
    }

    const { data, error } = await supabase
      .from('users')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      logger.error('[ADMIN-USERS] Error updating user:', error)
      return { success: false, error: error.message }
    }

    logger.info('[ADMIN-USERS] User updated:', id)
    return { success: true, data: data as User }
  } catch (error) {
    logger.error('[ADMIN-USERS] Exception in updateUserAction:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }
  }
}

/**
 * Delete a user (soft delete - admin only)
 */
export async function deleteUserAction(id: string): Promise<ActionResult> {
  try {
    const { supabase, profile } = await getAdminContext()
    logger.info('[ADMIN-USERS] Deleting user:', id)

    // Prevent self-deletion
    if (profile.id === id) {
      return { success: false, error: 'Vous ne pouvez pas supprimer votre propre compte' }
    }

    // Check if user is last admin
    const { data: user } = await supabase
      .from('users')
      .select('role')
      .eq('id', id)
      .single()

    if (user?.role === 'admin') {
      const { data: admins } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'admin')
        .is('deleted_at', null)

      if (admins && admins.length <= 1) {
        return { success: false, error: 'Impossible de supprimer le dernier administrateur' }
      }
    }

    // Soft delete
    const { error } = await supabase
      .from('users')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      logger.error('[ADMIN-USERS] Error deleting user:', error)
      return { success: false, error: error.message }
    }

    logger.info('[ADMIN-USERS] User deleted:', id)
    return { success: true }
  } catch (error) {
    logger.error('[ADMIN-USERS] Exception in deleteUserAction:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }
  }
}

/**
 * Change user role (admin only)
 */
export async function changeUserRoleAction(
  id: string,
  newRole: User['role']
): Promise<ActionResult<User>> {
  try {
    const { supabase, profile } = await getAdminContext()
    logger.info('[ADMIN-USERS] Changing role for user:', id, 'to', newRole)

    // Prevent changing own role
    if (profile.id === id) {
      return { success: false, error: 'Vous ne pouvez pas modifier votre propre role' }
    }

    // Check if removing last admin
    const { data: user } = await supabase
      .from('users')
      .select('role')
      .eq('id', id)
      .single()

    if (user?.role === 'admin' && newRole !== 'admin') {
      const { data: admins } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'admin')
        .is('deleted_at', null)

      if (admins && admins.filter(a => a.id !== id).length === 0) {
        return { success: false, error: 'Impossible de retirer le role admin au dernier administrateur' }
      }
    }

    return updateUserAction(id, { role: newRole })
  } catch (error) {
    logger.error('[ADMIN-USERS] Exception in changeUserRoleAction:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }
  }
}

/**
 * Toggle user active status (admin only)
 */
export async function toggleUserStatusAction(id: string): Promise<ActionResult<User>> {
  try {
    const { supabase, profile } = await getAdminContext()
    logger.info('[ADMIN-USERS] Toggling status for user:', id)

    // Prevent deactivating self
    if (profile.id === id) {
      return { success: false, error: 'Vous ne pouvez pas desactiver votre propre compte' }
    }

    const { data: user } = await supabase
      .from('users')
      .select('is_active, role')
      .eq('id', id)
      .single()

    if (!user) {
      return { success: false, error: 'Utilisateur non trouve' }
    }

    // Prevent deactivating last active admin
    if (user.is_active && user.role === 'admin') {
      const { data: activeAdmins } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'admin')
        .eq('is_active', true)
        .is('deleted_at', null)

      if (activeAdmins && activeAdmins.filter(a => a.id !== id).length === 0) {
        return { success: false, error: 'Impossible de desactiver le dernier administrateur actif' }
      }
    }

    return updateUserAction(id, { is_active: !user.is_active })
  } catch (error) {
    logger.error('[ADMIN-USERS] Exception in toggleUserStatusAction:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }
  }
}

/**
 * Search users by query (admin only)
 */
export async function searchUsersAction(query: string): Promise<ActionResult<User[]>> {
  try {
    const { supabase } = await getAdminContext()

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .is('deleted_at', null)
      .or(`name.ilike.%${sanitizeSearch(query)}%,email.ilike.%${sanitizeSearch(query)}%`)
      .order('name', { ascending: true })
      .limit(50)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data: data as User[] }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }
  }
}

/**
 * Get users by role (admin only)
 */
export async function getUsersByRoleAction(role: User['role']): Promise<ActionResult<User[]>> {
  try {
    const { supabase } = await getAdminContext()

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('role', role)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data: data as User[] }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }
  }
}

/**
 * Invite a gestionnaire (admin only)
 *
 * Flow:
 * 1. createUser with email_confirm: true → trigger creates profile + team + subscription
 * 2. generateLink('magiclink') → secure link for password setting
 * 3. Insert user_invitations record
 * 4. Send custom email via Resend (deferred with after())
 */
export async function inviteGestionnaireAction(input: {
  email: string
  firstName: string
  lastName: string
  organization: string
}): Promise<ActionResult<{ userId: string; invitationId: string }>> {
  try {
    const { supabase, profile: adminProfile } = await getAdminContext()
    const { email, firstName, lastName, organization } = input

    if (!email || !firstName || !lastName || !organization) {
      return { success: false, error: 'Tous les champs sont requis' }
    }

    const normalizedEmail = email.trim().toLowerCase()
    logger.info({ email: normalizedEmail, organization }, '[ADMIN-INVITE] Starting gestionnaire invitation')

    // 1. Check email uniqueness in users table
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', normalizedEmail)
      .is('deleted_at', null)
      .limit(1)
      .maybeSingle()

    if (existingUser) {
      return { success: false, error: 'Un utilisateur avec cet email existe deja' }
    }

    // 2. Generate invite link — creates auth user + triggers profile/team/subscription
    const fullName = `${firstName} ${lastName}`
    const { data: inviteLink, error: inviteError } = await supabase.auth.admin.generateLink({
      type: 'invite',
      email: normalizedEmail,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
        data: {
          full_name: fullName,
          first_name: firstName,
          last_name: lastName,
          display_name: fullName,
          organization,
          role: 'gestionnaire',
          password_set: false,
        },
      },
    })

    if (inviteError || !inviteLink?.user) {
      logger.error({ error: inviteError }, '[ADMIN-INVITE] Failed to generate invite link')
      return { success: false, error: inviteError?.message || 'Echec de la creation du compte' }
    }

    const authUserId = inviteLink.user.id
    const hashedToken = inviteLink.properties.hashed_token
    const invitationUrl = `${EMAIL_CONFIG.appUrl}/auth/confirm?token_hash=${hashedToken}&type=invite`

    logger.info({ authUserId }, '[ADMIN-INVITE] Invite link generated, trigger should have fired')

    // 3. Get the profile + team created by the trigger
    const { data: userProfile } = await supabase
      .from('users')
      .select('id, team_id')
      .eq('auth_user_id', authUserId)
      .limit(1)
      .maybeSingle()

    // 4. Insert invitation record
    // team_id is null here — team is created when user confirms (trigger fires on email_confirmed_at UPDATE)
    // invited_by = admin who sent the invitation
    const { data: invitation, error: invError } = await supabase
      .from('user_invitations')
      .insert({
        email: normalizedEmail,
        first_name: firstName,
        last_name: lastName,
        role: 'gestionnaire' as const,
        team_id: userProfile?.team_id ?? null,
        invited_by: adminProfile.id,
        invitation_token: hashedToken,
        user_id: userProfile?.id ?? null,
        status: 'pending' as const,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select('id')
      .single()

    if (invError) {
      logger.warn({ error: invError }, '[ADMIN-INVITE] Failed to create invitation record (non-blocking)')
    }

    // 5. Send email (deferred — non-blocking)
    after(async () => {
      try {
        const result = await emailService.sendAdminInvitationEmail(normalizedEmail, {
          firstName,
          organization,
          invitationUrl,
          expiresIn: 7,
        })
        if (result.success) {
          logger.info({ emailId: result.emailId }, '[ADMIN-INVITE] Invitation email sent')
        } else {
          logger.warn({ error: result.error }, '[ADMIN-INVITE] Failed to send invitation email')
        }
      } catch (emailError) {
        logger.error({ error: emailError }, '[ADMIN-INVITE] Exception sending invitation email')
      }
    })

    logger.info({ authUserId, invitationId: invitation?.id }, '[ADMIN-INVITE] Gestionnaire invited successfully')
    return {
      success: true,
      data: {
        userId: authUserId,
        invitationId: invitation?.id || '',
      },
    }
  } catch (error) {
    logger.error({ error }, '[ADMIN-INVITE] Exception in inviteGestionnaireAction')
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    }
  }
}

// Type for admin invitation list
export interface AdminInvitation {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  status: 'pending' | 'expired'
  invited_at: string
  expires_at: string
  team_name: string | null
}

/**
 * Get all pending/expired invitations (admin only)
 *
 * Computes expired status at query time: pending + expires_at < now = expired.
 */
export async function getInvitationsAction(): Promise<ActionResult<AdminInvitation[]>> {
  try {
    const { supabase } = await getAdminContext()

    const { data, error } = await supabase
      .from('user_invitations')
      .select('id, email, first_name, last_name, status, invited_at, expires_at, teams:team_id(name)')
      .in('status', ['pending', 'expired'])
      .order('invited_at', { ascending: false })

    if (error) {
      logger.error({ error }, '[ADMIN-INVITATIONS] Error fetching invitations')
      return { success: false, error: error.message }
    }

    // Compute expired status at runtime (pending + past expiry = expired)
    const invitations: AdminInvitation[] = (data || []).map(inv => {
      const teamData = inv.teams as { name: string } | null
      let status: 'pending' | 'expired' = inv.status as 'pending' | 'expired'

      if (status === 'pending' && inv.expires_at && new Date(inv.expires_at) < new Date()) {
        status = 'expired'
      }

      return {
        id: inv.id,
        email: inv.email,
        first_name: inv.first_name,
        last_name: inv.last_name,
        status,
        invited_at: inv.invited_at,
        expires_at: inv.expires_at,
        team_name: teamData?.name || null,
      }
    })

    return { success: true, data: invitations }
  } catch (error) {
    logger.error({ error }, '[ADMIN-INVITATIONS] Exception in getInvitationsAction')
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    }
  }
}

/**
 * Resend invitation to a gestionnaire (admin only)
 *
 * Generates a new magic link, updates the invitation record, and resends the email.
 */
export async function resendGestionnaireInvitationAction(
  email: string
): Promise<ActionResult> {
  try {
    const { supabase } = await getAdminContext()
    const normalizedEmail = email.trim().toLowerCase()

    logger.info({ email: normalizedEmail }, '[ADMIN-RESEND] Resending invitation')

    // 1. Find the invitation
    const { data: invitation, error: invError } = await supabase
      .from('user_invitations')
      .select('id, first_name, status')
      .eq('email', normalizedEmail)
      .in('status', ['pending', 'expired'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (invError || !invitation) {
      return { success: false, error: 'Aucune invitation en attente trouvee pour cet email' }
    }

    // 2. Get auth user metadata via public.users → getUserById (targeted, not full list)
    const { data: publicUser } = await supabase
      .from('users')
      .select('auth_user_id')
      .eq('email', normalizedEmail)
      .limit(1)
      .maybeSingle()

    let authUserMetadata: Record<string, unknown> = {}
    if (publicUser?.auth_user_id) {
      const { data: authData } = await supabase.auth.admin.getUserById(publicUser.auth_user_id)
      authUserMetadata = authData?.user?.user_metadata || {}
    }

    const organization = (authUserMetadata.organization as string)
      || invitation.first_name
      || 'votre organisation'

    // 3. Generate new invite link (not magiclink — user hasn't confirmed yet)
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'invite',
      email: normalizedEmail,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
        data: authUserMetadata,
      },
    })

    if (linkError || !linkData?.properties?.hashed_token) {
      logger.error({ error: linkError }, '[ADMIN-RESEND] Failed to generate invite link')
      return { success: false, error: 'Echec de la generation du nouveau lien' }
    }

    const hashedToken = linkData.properties.hashed_token
    const invitationUrl = `${EMAIL_CONFIG.appUrl}/auth/confirm?token_hash=${hashedToken}&type=invite`

    // 4. Update invitation record
    await supabase
      .from('user_invitations')
      .update({
        invitation_token: hashedToken,
        status: 'pending' as const,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .eq('id', invitation.id)

    // 5. Send renewal email (deferred)
    const resendFirstName = invitation.first_name || 'Gestionnaire'

    after(async () => {
      try {
        const result = await emailService.sendAdminInvitationEmail(normalizedEmail, {
          firstName: resendFirstName,
          organization,
          invitationUrl,
          expiresIn: 7,
          isRenewal: true,
        })
        if (result.success) {
          logger.info({ emailId: result.emailId }, '[ADMIN-RESEND] Invitation email resent')
        } else {
          logger.warn({ error: result.error }, '[ADMIN-RESEND] Failed to resend email')
        }
      } catch (emailError) {
        logger.error({ error: emailError }, '[ADMIN-RESEND] Exception resending email')
      }
    })

    logger.info({ invitationId: invitation.id }, '[ADMIN-RESEND] Invitation resent successfully')
    return { success: true }
  } catch (error) {
    logger.error({ error }, '[ADMIN-RESEND] Exception in resendGestionnaireInvitationAction')
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    }
  }
}
