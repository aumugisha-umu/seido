'use client'

import { Button } from '@/components/ui/button'

// ============================================================================
// Provisioning Progress (purchasing state)
// ============================================================================

export function ProvisioningProgress({ status }: { status: string | null }) {
  return (
    <div className="layout-padding">
      <div className="max-w-md mx-auto flex flex-col items-center justify-center py-20 gap-6">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        <div className="text-center space-y-2">
          <p className="text-lg font-medium">Configuration de votre assistant WhatsApp</p>
          <p className="text-sm text-muted-foreground">
            {status === 'purchasing'
              ? 'Achat du numero de telephone...'
              : 'Initialisation...'}
          </p>
        </div>
        <p className="text-xs text-muted-foreground text-center">
          Cette operation peut prendre quelques secondes. Ne fermez pas cette page.
        </p>
      </div>
    </div>
  )
}

// ============================================================================
// Provisioning Failed
// ============================================================================

export function ProvisioningFailed({ error, onRetry }: { error: string | null; onRetry: () => void }) {
  return (
    <div className="layout-padding">
      <div className="max-w-md mx-auto flex flex-col items-center justify-center py-20 gap-6">
        <div className="rounded-full h-12 w-12 bg-destructive/10 flex items-center justify-center">
          <span className="text-destructive text-2xl">!</span>
        </div>
        <div className="text-center space-y-2">
          <p className="text-lg font-medium">La configuration a echoue</p>
          <p className="text-sm text-muted-foreground">
            {error || 'Une erreur inattendue est survenue lors de la configuration.'}
          </p>
        </div>
        <Button onClick={onRetry} variant="default">
          Reessayer
        </Button>
        <p className="text-xs text-muted-foreground text-center">
          Si le probleme persiste, contactez le support.
        </p>
      </div>
    </div>
  )
}
