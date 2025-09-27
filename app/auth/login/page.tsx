import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Building2, CheckCircle } from "lucide-react"
import { LoginForm } from "./login-form"

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
  }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  // ✅ SERVER COMPONENT: Traitement des paramètres URL côté serveur (Next.js 15+)
  const params = await searchParams
  const showConfirmationSuccess = params.confirmed === 'true' || params.message === 'password-updated'
  const showSessionRequired = params.message === 'session-required'

  console.log('🔄 [LOGIN-SERVER] Login page rendered server-side', {
    confirmed: params.confirmed,
    message: params.message,
    showConfirmationSuccess,
    showSessionRequired
  })





  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="border-border shadow-lg">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                <Building2 className="w-6 h-6 text-primary-foreground" />
              </div>
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-foreground">Connexion à SEIDO</CardTitle>
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
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
