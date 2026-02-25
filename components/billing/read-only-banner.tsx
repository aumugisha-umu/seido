'use client'

import { useRouter } from 'next/navigation'
import { ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// =============================================================================
// Types
// =============================================================================

interface ReadOnlyBannerProps {
  /** The role viewing this banner — gestionnaire sees upgrade CTAs, others see info */
  role: 'gestionnaire' | 'locataire' | 'prestataire'
  className?: string
}

// =============================================================================
// Component
// =============================================================================

export function ReadOnlyBanner({ role, className }: ReadOnlyBannerProps) {
  const router = useRouter()

  return (
    <div className={cn(
      'flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 rounded-lg',
      'bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800',
      className,
    )}>
      <ShieldAlert className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5 sm:mt-0" />

      <div className="flex-1 min-w-0">
        {role === 'gestionnaire' ? (
          <>
            <p className="text-sm font-medium text-red-800 dark:text-red-300">
              Compte en lecture seule
            </p>
            <p className="text-xs text-red-700 dark:text-red-400 mt-0.5">
              Votre essai a expir&eacute;. Souscrivez un abonnement pour retrouver l&apos;acc&egrave;s complet &agrave; toutes les fonctionnalit&eacute;s.
              Vos donn&eacute;es sont conserv&eacute;es en toute s&eacute;curit&eacute;.
            </p>
          </>
        ) : role === 'locataire' ? (
          <>
            <p className="text-sm font-medium text-red-800 dark:text-red-300">
              Service temporairement indisponible
            </p>
            <p className="text-xs text-red-700 dark:text-red-400 mt-0.5">
              Les nouvelles demandes d&apos;intervention sont temporairement indisponibles.
              Contactez votre gestionnaire pour plus d&apos;informations.
            </p>
          </>
        ) : (
          <>
            <p className="text-sm font-medium text-red-800 dark:text-red-300">
              Acc&egrave;s limit&eacute;
            </p>
            <p className="text-xs text-red-700 dark:text-red-400 mt-0.5">
              Les interventions en cours restent accessibles. Les nouvelles assignations sont temporairement suspendues.
              Contactez votre gestionnaire pour plus d&apos;informations.
            </p>
          </>
        )}
      </div>

      {role === 'gestionnaire' && (
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => router.push('/gestionnaire/settings/billing')}
          >
            Choisir l&apos;annuel
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-700 dark:text-red-400 hover:text-red-800"
            onClick={() => router.push('/gestionnaire/settings/billing')}
          >
            ou mensuel
          </Button>
        </div>
      )}
    </div>
  )
}
