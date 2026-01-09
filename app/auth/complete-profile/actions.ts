'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createServerActionSupabaseClient } from '@/lib/services/core/supabase-client'
import { getSupabaseAdmin, isAdminConfigured } from '@/lib/services/core/supabase-admin'
import { z } from 'zod'
import { logger } from '@/lib/logger'

/**
 * Schema de validation pour le profil OAuth
 */
const ProfileSchema = z.object({
  firstName: z.string().min(1, 'Prénom requis').trim(),
  lastName: z.string().min(1, 'Nom requis').trim(),
  phone: z.string().optional(),
  avatarUrl: z.string().optional()
})

/**
 * Type de retour de l'action
 */
type ActionResult = {
  success: boolean
  error?: string
  data?: {
    redirectTo?: string
  }
}

/**
 * Server Action pour compléter le profil d'un utilisateur OAuth
 *
 * Cette action est appelée après qu'un utilisateur se soit connecté
 * via Google OAuth pour la première fois. Elle crée:
 * 1. Le profil utilisateur dans la table `users`
 * 2. Une équipe personnelle pour cet utilisateur
 * 3. L'entrée dans `team_members` comme admin de l'équipe
 *
 * Le rôle est forcé à "gestionnaire" car c'est le seul rôle
 * autorisé pour l'inscription OAuth.
 */
export async function completeOAuthProfileAction(
  prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  logger.info('[COMPLETE-OAUTH-PROFILE] Starting profile creation...')

  // Récupérer la session utilisateur
  const supabase = await createServerActionSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    logger.error('[COMPLETE-OAUTH-PROFILE] No authenticated user')
    return { success: false, error: 'Session invalide. Veuillez vous reconnecter.' }
  }

  // Valider les données du formulaire
  let validatedData
  try {
    validatedData = ProfileSchema.parse({
      firstName: formData.get('firstName'),
      lastName: formData.get('lastName'),
      phone: formData.get('phone') || undefined,
      avatarUrl: formData.get('avatarUrl') || undefined
    })
    logger.info('[COMPLETE-OAUTH-PROFILE] Data validated', { firstName: validatedData.firstName })
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0]
      return { success: false, error: firstError.message }
    }
    return { success: false, error: 'Données invalides' }
  }

  // Vérifier que le service admin est configuré
  if (!isAdminConfigured()) {
    logger.error('[COMPLETE-OAUTH-PROFILE] Admin service not configured')
    return { success: false, error: 'Service de configuration non disponible' }
  }

  const supabaseAdmin = getSupabaseAdmin()!
  const userName = `${validatedData.firstName} ${validatedData.lastName}`
  const userRole = 'gestionnaire' // Rôle forcé pour OAuth

  try {
    // Vérifier que le profil n'existe pas déjà
    const { data: existingProfile } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (existingProfile) {
      logger.warn('[COMPLETE-OAUTH-PROFILE] Profile already exists, redirecting')
      return { success: true, data: { redirectTo: `/${userRole}/dashboard` } }
    }

    // 1. Créer l'équipe
    logger.info('[COMPLETE-OAUTH-PROFILE] Creating team...')
    const { data: team, error: teamError } = await supabaseAdmin
      .from('teams')
      .insert({
        name: `Équipe de ${userName}`,
        description: `Équipe personnelle créée automatiquement`,
        created_by: null // Sera mis à jour après création du user
      })
      .select('id')
      .single()

    if (teamError) {
      logger.error('[COMPLETE-OAUTH-PROFILE] Team creation failed:', teamError)
      return { success: false, error: 'Erreur lors de la création de l\'équipe' }
    }

    logger.info('[COMPLETE-OAUTH-PROFILE] Team created:', { teamId: team.id })

    // 2. Créer le profil utilisateur
    logger.info('[COMPLETE-OAUTH-PROFILE] Creating user profile...')
    const { data: userProfile, error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        auth_user_id: user.id,
        email: user.email!,
        name: userName,
        role: userRole,
        team_id: team.id,
        phone: validatedData.phone || null,
        avatar_url: validatedData.avatarUrl || null,
        password_set: true // OAuth users n'ont pas besoin de mot de passe
      })
      .select('id')
      .single()

    if (userError) {
      logger.error('[COMPLETE-OAUTH-PROFILE] User creation failed:', userError)
      // Nettoyer l'équipe créée
      await supabaseAdmin.from('teams').delete().eq('id', team.id)
      return { success: false, error: 'Erreur lors de la création du profil' }
    }

    logger.info('[COMPLETE-OAUTH-PROFILE] User profile created:', { userId: userProfile.id })

    // 3. Mettre à jour created_by sur l'équipe
    await supabaseAdmin
      .from('teams')
      .update({ created_by: userProfile.id })
      .eq('id', team.id)

    // 4. Ajouter l'utilisateur comme admin de l'équipe
    logger.info('[COMPLETE-OAUTH-PROFILE] Adding user to team members...')
    const { error: memberError } = await supabaseAdmin
      .from('team_members')
      .insert({
        team_id: team.id,
        user_id: userProfile.id,
        role: 'admin'
      })

    if (memberError) {
      logger.error('[COMPLETE-OAUTH-PROFILE] Team member creation failed:', memberError)
      // On continue quand même, ce n'est pas bloquant
    }

    logger.info('[COMPLETE-OAUTH-PROFILE] Profile creation completed successfully')

    // Invalider le cache et retourner le redirect path
    revalidatePath('/', 'layout')

    return {
      success: true,
      data: { redirectTo: `/${userRole}/dashboard` }
    }

  } catch (error) {
    // Gérer le cas spécial du redirect Next.js
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
      throw error
    }
    logger.error('[COMPLETE-OAUTH-PROFILE] Unexpected error:', error)
    return { success: false, error: 'Une erreur inattendue est survenue' }
  }
}
