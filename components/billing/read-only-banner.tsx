'use client'

import { useRouter } from 'next/navigation'
import { ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// =============================================================================
// Types
// =============================================================================

interface ReadOnlyBannerProps {
  role: 'gestionnaire' | 'locataire' | 'prestataire'
  lotCount?: number
  className?: string
}

// =============================================================================
// Component
// =============================================================================

export function ReadOnlyBanner({ role, lotCount = 0, className }: ReadOnlyBannerProps) {
  const router = useRouter()

  // ── Gestionnaire banner ─────────────────────────────────────────────
  if (role === 'gestionnaire') {
    return (
      <div className={cn(
        'flex flex-col gap-3 p-4 rounded-lg',
        'bg-red-50/80 dark:bg-red-950/20 border border-red-200 dark:border-red-800',
        className,
      )}>
        <div className="flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-800 dark:text-red-300">
              Votre essai est termine. Vos donnees sont intactes.
            </p>
            <p className="text-sm text-red-700 dark:text-red-400 mt-1">
              Pour acceder a vos {lotCount} lots, creer des interventions et recevoir
              les notifications de vos locataires, activez votre abonnement.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 ml-8">
          <Button
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => router.push('/gestionnaire/settings/billing')}
          >
            Activer SEIDO &mdash; a partir de 5 EUR/lot/mois
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-700 dark:text-red-400 hover:text-red-800"
            onClick={() => router.push('/gestionnaire/settings/billing')}
          >
            Voir les tarifs
          </Button>
        </div>

        <div className="ml-8 flex flex-col gap-1">
          <p className="text-xs text-red-600 dark:text-red-500">
            Annulation en 1 clic - Sans engagement - Donnees preservees
          </p>
          <p className="text-xs text-red-500/80 dark:text-red-600">
            Vous ne souhaitez pas continuer ? <a
              href="mailto:support@seido.be?subject=Export%20de%20donnees"
              className="underline hover:text-red-700"
            >
              Contactez-nous
            </a> pour demander un export de vos donnees.
          </p>
        </div>
      </div>
    )
  }

  // ── Locataire banner (neutral gray) ─────────────────────────────────
  if (role === 'locataire') {
    return (
      <div className={cn(
        'flex items-start gap-3 p-4 rounded-lg',
        'bg-gray-50 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700',
        className,
      )}>
        <ShieldAlert className="h-5 w-5 text-gray-500 dark:text-gray-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-800 dark:text-gray-300">
            Les services pour ce bien sont temporairement suspendus.
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            Votre gestionnaire a ete informe. Pour toute urgence, contactez directement
            votre gestionnaire ou notre support.
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            Pour toute question concernant vos donnees, contactez votre gestionnaire ou{' '}
            <a href="mailto:support@seido.be" className="underline hover:text-gray-700">notre support</a>.
          </p>
        </div>
      </div>
    )
  }

  // ── Prestataire banner ──────────────────────────────────────────────
  return (
    <div className={cn(
      'flex items-start gap-3 p-4 rounded-lg',
      'bg-gray-50 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700',
      className,
    )}>
      <ShieldAlert className="h-5 w-5 text-gray-500 dark:text-gray-400 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-800 dark:text-gray-300">
          L&apos;acces a certains biens est temporairement limite.
        </p>
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
          Les interventions en cours restent accessibles. Pour toute question, contactez{' '}
          <a href="mailto:support@seido.be" className="underline hover:text-gray-700">notre support</a>.
        </p>
      </div>
    </div>
  )
}
