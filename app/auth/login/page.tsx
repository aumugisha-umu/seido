import Link from "next/link"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Building2, CheckCircle, TestTube, ChevronRight } from "lucide-react"
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
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="border-border shadow-lg">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <AuthLogo />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-foreground">Connexion</CardTitle>
              <CardDescription className="text-muted-foreground">
                Accédez à votre espace de gestion immobilière
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {/* Messages de statut - rendu côté serveur */}
            {showConfirmationSuccess && (
              <Alert className="border-green-200 bg-green-50 mb-4">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
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
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>
                  Vous devez être connecté pour accéder à la configuration du mot de passe
                </AlertDescription>
              </Alert>
            )}

            {showEmailNotConfirmed && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>
                  <strong>Email non confirmé</strong><br />
                  Veuillez confirmer votre email avant de vous connecter. Vérifiez votre boîte de réception.
                </AlertDescription>
              </Alert>
            )}

            {showSessionExpired && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>
                  <strong>Session expirée</strong><br />
                  Votre session a expiré. Veuillez vous reconnecter.
                </AlertDescription>
              </Alert>
            )}

            {showConfirmationError && (
              <Alert variant="destructive" className="mb-4">
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
                className="text-sm text-primary hover:text-secondary underline-offset-4 hover:underline"
              >
                Mot de passe oublié ?
              </Link>
            </div>
            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Pas encore de compte ?{" "}
                <Link
                  href="/auth/signup"
                  className="text-primary hover:text-secondary underline-offset-4 hover:underline font-medium"
                >
                  Créer un compte
                </Link>
              </p>
            </div>

            {/* ✅ MODE DÉMO - Section */}
            <div className="mt-6 pt-6 border-t border-border">
              <Link
                href="/demo/gestionnaire/dashboard"
                className="block w-full"
              >
                <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 hover:shadow-md transition-all duration-200 cursor-pointer group">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-orange-100 rounded-lg group-hover:bg-orange-200 transition-colors">
                        <TestTube className="w-6 h-6 text-orange-600" />
                      </div>

                      <div className="flex-1">
                        <h3 className="font-semibold text-orange-900 group-hover:text-orange-700">
                          Essayer en mode démo
                        </h3>
                        <p className="text-sm text-orange-700 mt-1">
                          Découvrez l'application avec des données réalistes de Belgique et pays frontaliers
                        </p>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 text-xs text-orange-600">
                          <div className="flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            <span>Aucun compte requis</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            <span>Données locales</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            <span>Réinitialisable</span>
                          </div>
                        </div>
                      </div>

                      <ChevronRight className="w-5 h-5 text-orange-400 group-hover:translate-x-1 transition-transform shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
