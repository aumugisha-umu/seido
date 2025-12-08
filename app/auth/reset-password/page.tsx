import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, ArrowLeft } from "lucide-react"
import AuthLogo from "@/components/ui/auth-logo"
import { ResetPasswordForm } from "./reset-password-form"
import { logger, logError } from '@/lib/logger'
/**
 * 🔐 PAGE RESET PASSWORD - SERVER COMPONENT (Migration Server Components)
 *
 * Architecture optimisée:
 * 1. Server Component: Structure statique, layout
 * 2. Client Component (ResetPasswordForm): Logique de réinitialisation
 * 3. Rendu côté serveur: Chargement plus rapide
 */

export default function ResetPasswordPage() {
  logger.info('🔄 [RESET-PASSWORD-SERVER] Reset password page rendered server-side')

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col items-center space-y-4 text-center">
        <AuthLogo />
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Mot de passe oublié
          </h1>
          <p className="text-white/60">
            Saisissez votre email pour recevoir un lien de réinitialisation
          </p>
        </div>
      </div>

      {/* Formulaire de réinitialisation - composant client */}
      <ResetPasswordForm />

      <div className="mt-6 text-center">
        <Link
          href="/auth/login"
          className="inline-flex items-center text-sm text-brand-primary hover:text-brand-primary/80 underline-offset-4 hover:underline transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Retour à la connexion
        </Link>
      </div>
    </div>
  )
}
