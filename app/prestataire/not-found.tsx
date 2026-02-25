/**
 * Prestataire Not Found Page (404)
 *
 * Displayed when a prestataire route doesn't exist.
 * Mobile-optimized with larger touch targets.
 */

import Link from 'next/link'
import { FileQuestion, LayoutDashboard, ClipboardList } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export default function PrestataireNotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
            <FileQuestion className="h-10 w-10 text-muted-foreground" />
          </div>
          <CardTitle className="text-3xl font-bold">404</CardTitle>
          <CardDescription className="text-lg">
            Page non trouvée
          </CardDescription>
        </CardHeader>

        <CardContent className="text-center">
          <p className="text-sm text-muted-foreground">
            Cette page n&apos;existe pas.
          </p>
        </CardContent>

        <CardFooter className="flex flex-col gap-2">
          <Button asChild className="w-full h-12 text-base">
            <Link href="/prestataire/dashboard">
              <LayoutDashboard className="mr-2 h-5 w-5" />
              Retour à l&apos;accueil
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full h-12 text-base">
            <Link href="/prestataire/interventions">
              <ClipboardList className="mr-2 h-5 w-5" />
              Mes interventions
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
