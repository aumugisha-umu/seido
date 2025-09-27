import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ShieldX, Home, LogOut } from 'lucide-react'

/**
 * Page d'erreur d'autorisation - Bonnes pratiques Next.js 15
 * Affichée quand un utilisateur authentifié n'a pas les permissions requises
 */
export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <ShieldX className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-xl font-semibold text-gray-900">
            Accès non autorisé
          </CardTitle>
          <CardDescription className="text-gray-600">
            Vous n'avez pas les permissions nécessaires pour accéder à cette page.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="text-sm text-gray-500 text-center">
            Votre compte ne dispose pas des autorisations requises pour cette section.
            Contactez votre administrateur si vous pensez qu'il s'agit d'une erreur.
          </div>

          <div className="flex flex-col gap-2">
            <Button asChild className="w-full">
              <Link href="/">
                <Home className="mr-2 h-4 w-4" />
                Retour à l'accueil
              </Link>
            </Button>

            <Button variant="outline" asChild className="w-full">
              <Link href="/auth/login">
                <LogOut className="mr-2 h-4 w-4" />
                Se connecter avec un autre compte
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}