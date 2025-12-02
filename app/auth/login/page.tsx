import Link from "next/link"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Building2, CheckCircle } from "lucide-react"
import AuthLogo from "@/components/ui/auth-logo"
import { LoginForm } from "./login-form"
import { logger, logError } from '@/lib/logger'
import { createServerSupabaseClient } from '@/lib/services'
/**
 * 🔐 PAGE LOGIN - SERVER COMPONENT (Migration Server Components)
 *
 * Architecture optimisée:
 * 1. Server Component: Structure statique, messages d'état depuis URL
 * 2. Client Component (LoginForm): Interactions et logique de formulaire
 * 3. Rendu côté serveur: SEO optimisé, chargement plus rapide
 */

interface LoginPageProps {
  searchParams: Promise<{
    confirmed?: string
    message?: string
    reason?: string
    error?: string
  }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  // ✅ SERVER COMPONENT: Traitement des paramètres URL côté serveur (Next.js 15+)
  const params = await searchParams
  const showConfirmationSuccess = params.confirmed === 'true' || params.message === 'password-updated'
  const showSessionRequired = params.message === 'session-required'
  const showEmailNotConfirmed = params.reason === 'email_not_confirmed'
  const showSessionExpired = params.reason === 'session_expired'
  const showConfirmationError = params.error && ['expired_token', 'invalid_token', 'confirmation_failed'].includes(params.error)

  // 🔄 AUTO-REDIRECT: Si session active, rediriger vers le dashboard approprié
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      logger.info('🔄 [LOGIN-SERVER] Active session detected, redirecting to dashboard', { userId: user.id })

      // Récupérer le profil pour obtenir le rôle
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('auth_user_id', user.id)
        .single()

      if (profile?.role) {
        // Redirection vers le dashboard approprié selon le rôle
        redirect(`/${profile.role}/dashboard`)
      }
    }
  } catch (error) {
    // Si erreur lors de la vérification de session, continuer normalement vers le formulaire
    logger.info('🔄 [LOGIN-SERVER] No active session, showing login form')
  }

  logger.info('🔄 [LOGIN-SERVER] Login page rendered server-side', {
    confirmed: params.confirmed,
    message: params.message,
    reason: params.reason,
    error: params.error,
    showConfirmationSuccess,
    showSessionRequired,
    showEmailNotConfirmed,
    showSessionExpired,
    showConfirmationError
  })





  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col items-center space-y-4 text-center">
        <AuthLogo />
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-white">Connexion</h1>
          <p className="text-white/60">
            Accédez à votre espace de gestion immobilière
          </p>
        </div>
      </div>

      {/* Messages de statut - rendu côté serveur */}
      {showConfirmationSuccess && (
        <Alert className="border-green-500/30 bg-green-500/10 mb-4">
          <CheckCircle className="h-4 w-4 text-green-400" />
          <AlertDescription className="text-green-200">
            {params.message === 'password-updated' ? (
              <>
                <strong>Mot de passe mis à jour avec succès !</strong><br />
                Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.
              </>
            ) : (
              <>
                <strong>Email confirmé avec succès !</strong><br />
                Vous pouvez maintenant vous connecter avec vos identifiants.
              </>
            )}
          </AlertDescription>
        </Alert>
      )}

      {showSessionRequired && (
        <Alert variant="destructive" className="mb-4 bg-red-500/10 border-red-500/30 text-red-200">
          <AlertDescription>
            Vous devez être connecté pour accéder à la configuration du mot de passe
          </AlertDescription>
        </Alert>
      )}

      {showEmailNotConfirmed && (
        <Alert variant="destructive" className="mb-4 bg-red-500/10 border-red-500/30 text-red-200">
          <AlertDescription>
            <strong>Email non confirmé</strong><br />
            Veuillez confirmer votre email avant de vous connecter. Vérifiez votre boîte de réception.
          </AlertDescription>
        </Alert>
      )}

      {showSessionExpired && (
        <Alert variant="destructive" className="mb-4 bg-red-500/10 border-red-500/30 text-red-200">
          <AlertDescription>
            <strong>Session expirée</strong><br />
            Votre session a expiré. Veuillez vous reconnecter.
          </AlertDescription>
        </Alert>
      )}

      {showConfirmationError && (
        <Alert variant="destructive" className="mb-4 bg-red-500/10 border-red-500/30 text-red-200">
          <AlertDescription>
            <strong>Erreur de confirmation</strong><br />
            {params.error === 'expired_token' && 'Le lien de confirmation a expiré. Veuillez vous inscrire à nouveau.'}
            {params.error === 'invalid_token' && 'Le lien de confirmation est invalide.'}
            {params.error === 'confirmation_failed' && 'Erreur lors de la confirmation. Veuillez réessayer.'}
          </AlertDescription>
        </Alert>
      )}

      {/* Formulaire de connexion - composant client */}
      <LoginForm />

      <div className="flex items-center justify-between mt-4">
        <Link
          href="/auth/reset-password"
          className="text-sm text-purple-400 hover:text-purple-300 underline-offset-4 hover:underline transition-colors"
        >
          Mot de passe oublié ?
        </Link>
      </div>
      <div className="mt-6 text-center">
        <p className="text-sm text-white/60">
          Pas encore de compte ?{" "}
          <Link
            href="/auth/signup"
            className="text-purple-400 hover:text-purple-300 underline-offset-4 hover:underline font-medium transition-colors"
          >
            Créer un compte
          </Link>
        </p>
      </div>
    </div>
  )
}
