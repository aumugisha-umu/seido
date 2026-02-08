'use client'

/**
 * Gestionnaire Error Boundary
 *
 * Catches errors in the gestionnaire routes and provides role-specific recovery.
 * Inherits from global error.tsx but with navigation back to gestionnaire dashboard.
 */

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw, LayoutDashboard, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import logger from '@/lib/logger'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GestionnaireError({ error, reset }: ErrorProps) {
  useEffect(() => {
    logger.error({
      error: error.message,
      digest: error.digest,
      stack: error.stack,
      page: 'gestionnaire'
    }, 'Gestionnaire error boundary caught an error')
  }, [error])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl">Erreur de chargement</CardTitle>
          <CardDescription>
            La page n&apos;a pas pu être chargée correctement.
          </CardDescription>
        </CardHeader>

        <CardContent className="text-center">
          <p className="text-sm text-muted-foreground">
            Vous pouvez réessayer ou retourner au tableau de bord.
          </p>
          {process.env.NODE_ENV === 'development' && error.message && (
            <pre className="mt-4 p-3 bg-muted rounded-md text-xs text-left overflow-auto max-h-32">
              {error.message}
            </pre>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-2">
          <Button
            onClick={reset}
            className="w-full"
            variant="default"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Réessayer
          </Button>
          <Button
            onClick={() => window.location.href = '/gestionnaire/dashboard'}
            variant="outline"
            className="w-full"
          >
            <LayoutDashboard className="mr-2 h-4 w-4" />
            Retour au tableau de bord
          </Button>
          <Button
            onClick={() => window.history.back()}
            variant="ghost"
            className="w-full"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Page précédente
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
