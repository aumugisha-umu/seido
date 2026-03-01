import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2 } from "lucide-react"
import AuthLogo from "@/components/ui/auth-logo"
import { SignupForm } from "./signup-form"
import { logger } from '@/lib/logger'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Inscription | SEIDO',
  description: 'Creez votre compte SEIDO et commencez votre essai gratuit de gestion locative.',
  robots: { index: false, follow: false },
}

/**
 * 🔐 PAGE SIGNUP - SERVER COMPONENT (Migration Server Components)
 *
 * Architecture optimisée:
 * 1. Server Component: Structure statique, layout et navigation
 * 2. Client Component (SignupForm): Interactions et logique de formulaire
 * 3. Rendu côté serveur: SEO optimisé, chargement plus rapide
 */

export default async function SignupPage() {
  logger.info('🔄 [SIGNUP-SERVER] Signup page rendered server-side')

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
            className="text-brand-primary hover:text-brand-primary/80 underline-offset-4 hover:underline font-medium transition-colors"
          >
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  )
}
