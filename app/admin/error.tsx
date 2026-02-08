'use client'

/**
 * Admin Error Boundary
 *
 * Catches errors in the admin routes and provides role-specific recovery.
 * Shows more technical details for admin users.
 */

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw, LayoutDashboard, ArrowLeft, Bug } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import logger from '@/lib/logger'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function AdminError({ error, reset }: ErrorProps) {
  useEffect(() => {
    logger.error({
      error: error.message,
      digest: error.digest,
      stack: error.stack,
      page: 'admin'
    }, 'Admin error boundary caught an error')
  }, [error])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl">Erreur Admin</CardTitle>
          <CardDescription>
            Une erreur s&apos;est produite dans le panneau d&apos;administration.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {/* Always show error details for admin */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Bug className="h-4 w-4" />
              <span>Détails de l&apos;erreur</span>
            </div>
            <pre className="p-3 bg-muted rounded-md text-xs overflow-auto max-h-40">
              {error.message}
            </pre>
            {error.digest && (
              <p className="text-xs text-muted-foreground">
                Error digest: <code className="bg-muted px-1 rounded">{error.digest}</code>
              </p>
            )}
          </div>
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
            onClick={() => window.location.href = '/admin/dashboard'}
            variant="outline"
            className="w-full"
          >
            <LayoutDashboard className="mr-2 h-4 w-4" />
            Retour au dashboard admin
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
