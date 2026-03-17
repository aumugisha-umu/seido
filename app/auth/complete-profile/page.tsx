import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/services/core/supabase-client'
import AuthLogo from '@/components/ui/auth-logo'
import { CompleteProfileForm } from './complete-profile-form'
import { logger } from '@/lib/logger'

/**
 * Unified profile completion page for both OAuth and email signup users.
 *
 * - OAuth users: no profile exists yet → create user + team + subscription
 * - Email signup users: partial profile exists (no team) → update name + create team + subscription
 */
export default async function CompleteProfilePage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    logger.info('[COMPLETE-PROFILE] No user session, redirecting to login')
    redirect('/auth/login')
  }

  // Check existing profile state
  const { data: existingProfile } = await supabase
    .from('users')
    .select('id, role, team_id')
    .eq('auth_user_id', user.id)
    .single()

  // Profile with team = fully complete → redirect to dashboard
  if (existingProfile?.team_id) {
    logger.info('[COMPLETE-PROFILE] Profile already complete, redirecting to dashboard')
    redirect(`/${existingProfile.role}/dashboard`)
  }

  // Determine mode: partial profile (email signup) vs no profile (OAuth)
  const isEmailSignup = !!existingProfile
  const provider = user.app_metadata?.provider || 'email'

  // Extract user data for pre-fill
  const userData = {
    email: user.email || '',
    fullName: isEmailSignup ? '' : (user.user_metadata?.full_name || user.user_metadata?.name || ''),
    avatarUrl: user.user_metadata?.avatar_url || user.user_metadata?.picture || '',
    provider,
    isEmailSignup,
  }

  logger.info('[COMPLETE-PROFILE] Rendering form', {
    email: userData.email,
    provider,
    isEmailSignup,
  })

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col items-center space-y-4 text-center">
        <AuthLogo />
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-white">
            {isEmailSignup ? 'Finalisez votre inscription' : 'Bienvenue sur SEIDO'}
          </h1>
          <p className="text-white/60">
            {isEmailSignup
              ? 'Plus que quelques informations pour configurer votre espace'
              : 'Finalisez votre profil pour commencer'}
          </p>
        </div>
      </div>

      {/* Google avatar for OAuth users */}
      {!isEmailSignup && userData.avatarUrl && (
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
          {isEmailSignup ? 'Votre compte' : 'Connecté avec'}{' '}
          <span className="font-medium text-white">{userData.email}</span>
        </p>
      </div>

      <CompleteProfileForm userData={userData} />
    </div>
  )
}
