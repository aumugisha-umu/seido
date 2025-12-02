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
    <div className="w-full space-y-6">
      <div className="flex flex-col items-center space-y-4 text-center">
        <AuthLogo />
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-white">Inscription</h1>
          <p className="text-white/60">
            Créez votre compte pour accéder à votre espace de gestion
          </p>
        </div>
      </div>

      {/* Formulaire d'inscription - composant client */}
      <SignupForm />

      <div className="mt-6 text-center">
        <p className="text-sm text-white/60">
          Vous avez déjà un compte ?{" "}
          <Link
            href="/auth/login"
            className="text-purple-400 hover:text-purple-300 underline-offset-4 hover:underline font-medium transition-colors"
          >
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  )
}
