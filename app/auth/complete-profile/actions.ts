'use server'

import { revalidatePath } from 'next/cache'
import { createServerActionSupabaseClient } from '@/lib/services/core/supabase-client'
import { getSupabaseAdmin, isAdminConfigured } from '@/lib/services/core/supabase-admin'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import { AVATAR_MAX_SIZE, AVATAR_ALLOWED_TYPES } from '@/lib/validation/schemas'

const ProfileSchema = z.object({
  firstName: z.string().min(1, 'Prénom requis').trim(),
  lastName: z.string().min(1, 'Nom requis').trim(),
  phone: z.string().optional(),
  organization: z.string().trim().optional(),
  avatarUrl: z.string().optional(),
  isEmailSignup: z.boolean(),
})

type ActionResult = {
  success: boolean
  error?: string
  data?: {
    redirectTo?: string
  }
}

/**
 * Unified profile completion action for both OAuth and email signup users.
 *
 * - OAuth users (isEmailSignup=false): creates user + team + subscription
 * - Email signup users (isEmailSignup=true): updates existing partial profile + creates team + subscription
 *
 * Organization name is used as team name when provided, else "Prénom Nom's Team".
 */
export async function completeProfileAction(
  prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  logger.info('[COMPLETE-PROFILE] Starting profile completion...')

  const supabase = await createServerActionSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    logger.error('[COMPLETE-PROFILE] No authenticated user')
    return { success: false, error: 'Session invalide. Veuillez vous reconnecter.' }
  }

  let validatedData
  try {
    validatedData = ProfileSchema.parse({
      firstName: formData.get('firstName'),
      lastName: formData.get('lastName'),
      phone: formData.get('phone') || undefined,
      organization: formData.get('organization') || undefined,
      avatarUrl: formData.get('avatarUrl') || undefined,
      isEmailSignup: formData.get('isEmailSignup') === 'true',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message }
    }
    return { success: false, error: 'Données invalides' }
  }

  if (!isAdminConfigured()) {
    logger.error('[COMPLETE-PROFILE] Admin service not configured')
    return { success: false, error: 'Service de configuration non disponible' }
  }

  // Extract avatar file (optional)
  const avatarFile = formData.get('avatar') as File | null
  if (avatarFile && avatarFile.size > 0) {
    if (avatarFile.size > AVATAR_MAX_SIZE) {
      return { success: false, error: 'Photo trop volumineuse (max 5 MB)' }
    }
    if (!(AVATAR_ALLOWED_TYPES as readonly string[]).includes(avatarFile.type)) {
      return { success: false, error: 'Format photo non supporté (JPG, PNG ou WebP)' }
    }
  }

  const supabaseAdmin = getSupabaseAdmin()!
  const userName = `${validatedData.firstName} ${validatedData.lastName}`
  const userRole = 'gestionnaire'
  const teamName = validatedData.organization?.trim() || `${userName}'s Team`
  const validAvatar = avatarFile && avatarFile.size > 0 ? avatarFile : null

  try {
    if (validatedData.isEmailSignup) {
      return await handleEmailSignupCompletion(supabaseAdmin, user, validatedData, userName, userRole, teamName, validAvatar)
    } else {
      return await handleOAuthCompletion(supabaseAdmin, user, validatedData, userName, userRole, teamName, validAvatar)
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
      throw error
    }
    logger.error('[COMPLETE-PROFILE] Unexpected error:', error)
    return { success: false, error: 'Une erreur inattendue est survenue' }
  }
}

/**
 * Email signup flow: partial profile exists (no team) → update name + create team + subscription
 */
async function handleEmailSignupCompletion(
  supabaseAdmin: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  user: { id: string; email?: string },
  data: z.infer<typeof ProfileSchema>,
  userName: string,
  userRole: string,
  teamName: string,
  avatarFile: File | null,
): Promise<ActionResult> {
  // Find existing partial profile
  const { data: existingProfile, error: profileError } = await supabaseAdmin
    .from('users')
    .select('id, team_id')
    .eq('auth_user_id', user.id)
    .single()

  if (profileError || !existingProfile) {
    logger.error('[COMPLETE-PROFILE] Partial profile not found:', profileError)
    return { success: false, error: 'Profil introuvable. Veuillez vous reconnecter.' }
  }

  // Already has team → redirect
  if (existingProfile.team_id) {
    return { success: true, data: { redirectTo: `/${userRole}/dashboard` } }
  }

  // 1. Update user name/phone
  const { error: updateError } = await supabaseAdmin
    .from('users')
    .update({
      name: userName,
      first_name: data.firstName,
      last_name: data.lastName,
      phone: data.phone || null,
    })
    .eq('id', existingProfile.id)

  if (updateError) {
    logger.error('[COMPLETE-PROFILE] User update failed:', updateError)
    return { success: false, error: 'Erreur lors de la mise à jour du profil' }
  }

  // 2. Create team
  const { data: team, error: teamError } = await supabaseAdmin
    .from('teams')
    .insert({ name: teamName, created_by: existingProfile.id })
    .select('id')
    .single()

  if (teamError) {
    logger.error('[COMPLETE-PROFILE] Team creation failed:', teamError)
    return { success: false, error: "Erreur lors de la création de l'équipe" }
  }

  // 3. Link user to team + add as admin + create subscription (parallel)
  const [linkResult, memberResult, subResult] = await Promise.all([
    supabaseAdmin.from('users').update({ team_id: team.id }).eq('id', existingProfile.id),
    supabaseAdmin.from('team_members').insert({ team_id: team.id, user_id: existingProfile.id, role: 'admin' }),
    supabaseAdmin.from('subscriptions').insert({
      team_id: team.id,
      status: 'trialing',
      trial_start: new Date().toISOString(),
      trial_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      billable_properties: 0,
      subscribed_lots: 0,
    }),
  ])

  if (linkResult.error) logger.error('[COMPLETE-PROFILE] Team link failed:', linkResult.error)
  if (memberResult.error) logger.error('[COMPLETE-PROFILE] Team member failed:', memberResult.error)
  if (subResult.error) logger.error('[COMPLETE-PROFILE] Subscription failed:', subResult.error)

  // Upload avatar if provided (fire-and-forget, don't block redirect)
  if (avatarFile) {
    uploadAvatar(supabaseAdmin, user.id, existingProfile.id, avatarFile)
  }

  logger.info('[COMPLETE-PROFILE] Email signup completion done', { userId: existingProfile.id, teamId: team.id })

  // Admin notification (fire-and-forget)
  sendAdminNotification(supabaseAdmin, data.firstName, data.lastName, user.email!, 'email')

  revalidatePath('/', 'layout')
  return { success: true, data: { redirectTo: `/${userRole}/dashboard` } }
}

/**
 * OAuth flow: no profile → create user + team + subscription (preserved from original)
 */
async function handleOAuthCompletion(
  supabaseAdmin: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  user: { id: string; email?: string },
  data: z.infer<typeof ProfileSchema>,
  userName: string,
  userRole: string,
  teamName: string,
  avatarFile: File | null,
): Promise<ActionResult> {
  // Check if profile already exists
  const { data: existingProfile } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  if (existingProfile) {
    return { success: true, data: { redirectTo: `/${userRole}/dashboard` } }
  }

  // 1. Create team (created_by set after user creation)
  const { data: team, error: teamError } = await supabaseAdmin
    .from('teams')
    .insert({ name: teamName, created_by: null })
    .select('id')
    .single()

  if (teamError) {
    logger.error('[COMPLETE-PROFILE] Team creation failed:', teamError)
    return { success: false, error: "Erreur lors de la création de l'équipe" }
  }

  // 2. Create user profile (avatar_url set to Google URL initially, may be overwritten by upload)
  const { data: userProfile, error: userError } = await supabaseAdmin
    .from('users')
    .insert({
      auth_user_id: user.id,
      email: user.email!,
      name: userName,
      first_name: data.firstName,
      last_name: data.lastName,
      role: userRole,
      team_id: team.id,
      phone: data.phone || null,
      // If user uploaded a file, set null now (uploadAvatar sets final URL); otherwise use OAuth avatar URL
      avatar_url: avatarFile ? null : (data.avatarUrl || null),
      password_set: true,
    })
    .select('id')
    .single()

  if (userError) {
    logger.error('[COMPLETE-PROFILE] User creation failed:', userError)
    await supabaseAdmin.from('teams').delete().eq('id', team.id)
    return { success: false, error: 'Erreur lors de la création du profil' }
  }

  // 3. Update team created_by + add team member + create subscription (parallel)
  const [, memberResult, subResult] = await Promise.all([
    supabaseAdmin.from('teams').update({ created_by: userProfile.id }).eq('id', team.id),
    supabaseAdmin.from('team_members').insert({ team_id: team.id, user_id: userProfile.id, role: 'admin' }),
    supabaseAdmin.from('subscriptions').insert({
      team_id: team.id,
      status: 'trialing',
      trial_start: new Date().toISOString(),
      trial_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      billable_properties: 0,
      subscribed_lots: 0,
    }),
  ])

  if (memberResult.error) logger.error('[COMPLETE-PROFILE] Team member failed:', memberResult.error)
  if (subResult.error) logger.error('[COMPLETE-PROFILE] Subscription failed:', subResult.error)

  // Upload avatar if provided (fire-and-forget, don't block redirect)
  if (avatarFile) {
    uploadAvatar(supabaseAdmin, user.id, userProfile.id, avatarFile)
  }

  logger.info('[COMPLETE-PROFILE] OAuth completion done', { userId: userProfile.id, teamId: team.id })

  // Admin notification (fire-and-forget)
  sendAdminNotification(supabaseAdmin, data.firstName, data.lastName, user.email!, 'oauth')

  revalidatePath('/', 'layout')
  return { success: true, data: { redirectTo: `/${userRole}/dashboard` } }
}

/**
 * Upload avatar to Supabase Storage and update user record.
 * Uses supabaseAdmin to bypass RLS (profile may have just been created).
 */
async function uploadAvatar(
  supabaseAdmin: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  authUserId: string,
  dbUserId: string,
  file: File,
) {
  try {
    const fileExt = file.name.split('.').pop() || 'jpg'
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
    const filePath = `${authUserId}/${fileName}`

    const { error: uploadError } = await supabaseAdmin.storage
      .from('avatars')
      .upload(filePath, file, { cacheControl: '3600', upsert: false })

    if (uploadError) {
      logger.error('[COMPLETE-PROFILE] Avatar upload failed:', uploadError)
      return
    }

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('avatars')
      .getPublicUrl(filePath)

    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ avatar_url: publicUrl })
      .eq('id', dbUserId)

    if (updateError) {
      logger.error('[COMPLETE-PROFILE] Avatar URL update failed:', updateError)
      // Clean up uploaded file
      await supabaseAdmin.storage.from('avatars').remove([filePath])
      return
    }

    logger.info('[COMPLETE-PROFILE] Avatar uploaded successfully', { filePath })
  } catch (error) {
    logger.error('[COMPLETE-PROFILE] Avatar upload exception:', error)
  }
}

/**
 * Fire-and-forget admin notification
 */
function sendAdminNotification(
  supabaseAdmin: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  firstName: string,
  lastName: string,
  email: string,
  method: 'email' | 'oauth',
) {
  import('@/lib/services/domain/admin-notification/admin-notification.service')
    .then(({ createAdminNotificationService }) => {
      const adminService = createAdminNotificationService(supabaseAdmin)
      return adminService.notifyNewSignup({ firstName, lastName, email, method })
    })
    .catch(() => {
      // Non-blocking
    })
}

// Keep old export name for backwards compatibility (OAuth callback may reference it)
export { completeProfileAction as completeOAuthProfileAction }
