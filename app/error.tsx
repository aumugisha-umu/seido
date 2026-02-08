'use client'

/**
 * Global Error Boundary - Root Level
 *
 * Catches unhandled errors in the app and provides a recovery UI.
 * This is the fallback for all routes without their own error.tsx.
 *
 * @see https://nextjs.org/docs/app/building-your-application/routing/error-handling
 */

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import logger from '@/lib/logger'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log error to monitoring service
    logger.error({
      error: error.message,
      digest: error.digest,
      stack: error.stack,
      page: 'global'
    }, 'Global error boundary caught an error')
  }, [error])

  return (
    <html lang="fr">
      <body className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle className="text-2xl">Une erreur est survenue</CardTitle>
            <CardDescription>
              Nous sommes désolés, quelque chose s&apos;est mal passé.
            </CardDescription>
          </CardHeader>

          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground">
              Notre équipe a été notifiée et travaille à résoudre le problème.
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
              onClick={() => window.location.href = '/'}
              variant="outline"
              className="w-full"
            >
              <Home className="mr-2 h-4 w-4" />
              Retour à l&apos;accueil
            </Button>
          </CardFooter>
        </Card>
      </body>
    </html>
  )
}
