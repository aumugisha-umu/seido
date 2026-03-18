import Link from "next/link"
import AuthLogo from "@/components/ui/auth-logo"
import { SignupForm } from "./signup-form"
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Inscription | SEIDO',
  description: 'Creez votre compte SEIDO et commencez votre essai gratuit de gestion locative.',
  robots: { index: false, follow: false },
}

export default async function SignupPage() {
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
