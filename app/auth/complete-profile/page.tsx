import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/services/core/supabase-client'
import AuthLogo from '@/components/ui/auth-logo'
import { CompleteProfileForm } from './complete-profile-form'
import { logger } from '@/lib/logger'

/**
 * Page de complétion de profil pour les utilisateurs OAuth
 *
 * Cette page est affichée aux nouveaux utilisateurs qui se connectent
 * via Google OAuth et qui n'ont pas encore de profil dans la base de données.
 *
 * Le formulaire pré-remplit les champs avec les données Google (nom complet)
 * et force le rôle à "gestionnaire" (seul rôle autorisé pour l'inscription OAuth).
 */
export default async function CompleteProfilePage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Rediriger vers login si pas de session
  if (!user) {
    logger.info('[COMPLETE-PROFILE] No user session, redirecting to login')
    redirect('/auth/login')
  }

  // Vérifier si un profil existe déjà
  const { data: existingProfile } = await supabase
    .from('users')
    .select('id, role')
    .eq('auth_user_id', user.id)
    .single()

  // Si le profil existe, rediriger vers le dashboard
  if (existingProfile) {
    logger.info('[COMPLETE-PROFILE] Profile already exists, redirecting to dashboard')
    redirect(`/${existingProfile.role}/dashboard`)
  }

  // Extraire les infos de l'utilisateur OAuth
  const userData = {
    email: user.email || '',
    fullName: user.user_metadata?.full_name || user.user_metadata?.name || '',
    avatarUrl: user.user_metadata?.avatar_url || user.user_metadata?.picture || '',
    provider: user.app_metadata?.provider || 'google'
  }

  logger.info('[COMPLETE-PROFILE] Rendering form for new OAuth user', {
    email: userData.email,
    provider: userData.provider
  })

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col items-center space-y-4 text-center">
        <AuthLogo />
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Bienvenue sur SEIDO
          </h1>
          <p className="text-white/60">
            Finalisez votre profil pour commencer
          </p>
        </div>
      </div>

      {/* Afficher l'avatar Google si disponible */}
      {userData.avatarUrl && (
        <div className="flex justify-center">
          <img
            src={userData.avatarUrl}
            alt="Photo de profil"
            className="w-16 h-16 rounded-full border-2 border-white/20"
          />
        </div>
      )}

      <div className="bg-white/5 border border-white/10 rounded-lg p-4 text-center">
        <p className="text-sm text-white/80">
          Connecté avec <span className="font-medium text-white">{userData.email}</span>
        </p>
      </div>

      <CompleteProfileForm userData={userData} />
    </div>
  )
}
