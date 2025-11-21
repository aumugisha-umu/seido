import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2 } from "lucide-react"
import AuthLogo from "@/components/ui/auth-logo"
import { SignupForm } from "./signup-form"
import { BetaAccessGate } from "../beta-access-gate"
import { checkBetaAccess } from "@/lib/beta-access"
import { logger, logError } from '@/lib/logger'

/**
 * 🔐 PAGE SIGNUP - SERVER COMPONENT (Migration Server Components + Beta Protection)
 *
 * Architecture optimisée:
 * 1. Server Component: Structure statique, layout et navigation
 * 2. Client Component (SignupForm): Interactions et logique de formulaire
 * 3. Rendu côté serveur: SEO optimisé, chargement plus rapide
 * 4. Beta Protection: Cookie check server-side, affiche BetaAccessGate si non autorisé
 */

export default async function SignupPage() {
  logger.info('🔄 [SIGNUP-SERVER] Signup page rendered server-side')

  // ✅ BETA PROTECTION: Vérifier l'accès beta
  const hasBetaAccess = await checkBetaAccess()

  if (!hasBetaAccess) {
    logger.info('🔒 [SIGNUP-SERVER] Beta access denied - showing BetaAccessGate')
    return <BetaAccessGate />
  }

  logger.info('✅ [SIGNUP-SERVER] Beta access granted - showing signup form')

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="border-border shadow-lg">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <AuthLogo />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-foreground">Inscription</CardTitle>
              <CardDescription className="text-muted-foreground">
                Créez votre compte pour accéder à votre espace de gestion
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {/* Formulaire d'inscription - composant client */}
            <SignupForm />

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Vous avez déjà un compte ?{" "}
                <Link
                  href="/auth/login"
                  className="text-primary hover:text-secondary underline-offset-4 hover:underline font-medium"
                >
                  Se connecter
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
