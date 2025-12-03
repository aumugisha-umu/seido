import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ShieldX, Home, LogOut } from 'lucide-react'
import AuthLogo from '@/components/ui/auth-logo'

/**
 * Page d'erreur d'autorisation - Style auth section
 * Affichée quand un utilisateur authentifié n'a pas les permissions requises
 */
export default function UnauthorizedPage() {
  return (
    <div className="w-full space-y-6">
      {/* Logo et titre */}
      <div className="flex flex-col items-center space-y-4 text-center">
        <AuthLogo />

        {/* Icône d'erreur */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 to-purple-500/20 rounded-full blur-xl" />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-red-500/10 to-purple-500/10 border border-red-500/20">
            <ShieldX className="h-8 w-8 text-red-400" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Accès non autorisé
          </h1>
          <p className="text-white/60">
            Vous n'avez pas les permissions nécessaires pour accéder à cette page.
          </p>
        </div>
      </div>

      {/* Message détaillé */}
      <div className="text-center space-y-4">
        <p className="text-sm text-white/50">
          Votre compte ne dispose pas des autorisations requises pour cette section.
          Contactez votre administrateur si vous pensez qu'il s'agit d'une erreur.
        </p>

        {/* Boutons d'action */}
        <div className="flex flex-col gap-3 pt-2">
          <Button
            asChild
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg shadow-purple-500/25 transition-all hover:scale-[1.02]"
          >
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              Retour à l'accueil
            </Link>
          </Button>

          <Button
            variant="outline"
            asChild
            className="w-full border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white transition-colors"
          >
            <Link href="/auth/login">
              <LogOut className="mr-2 h-4 w-4" />
              Se connecter avec un autre compte
            </Link>
          </Button>
        </div>
      </div>

      {/* Footer links */}
      <div className="mt-6 text-center space-y-2">
        <p className="text-sm text-white/60">
          Vous n'avez pas encore de compte ?{" "}
          <Link
            href="/auth/signup"
            className="text-purple-400 hover:text-purple-300 underline-offset-4 hover:underline font-medium transition-colors"
          >
            Créer un compte
          </Link>
        </p>
        <p className="text-sm text-white/60">
          Déjà un compte ?{" "}
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
