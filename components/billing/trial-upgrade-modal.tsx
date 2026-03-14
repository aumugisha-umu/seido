'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

const DISMISS_KEY = 'seido_trial_upgrade_modal_dismissed'

interface TrialUpgradeModalProps {
  daysLeft: number | null
  paymentMethodAdded: boolean
  trialEndDate: string | null
  lotCount: number
  interventionCount: number
}

export function TrialUpgradeModal({
  daysLeft,
  paymentMethodAdded,
  trialEndDate,
  lotCount,
  interventionCount,
}: TrialUpgradeModalProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    // Only show when: trialing, <=2 days left, no payment method, not already dismissed this session
    if (daysLeft == null || daysLeft > 2) return
    if (paymentMethodAdded) return
    if (typeof window === 'undefined') return
    if (sessionStorage.getItem(DISMISS_KEY) === 'true') return

    // Small delay to not interfere with page load
    const timer = setTimeout(() => setOpen(true), 1000)
    return () => clearTimeout(timer)
  }, [daysLeft, paymentMethodAdded])

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, 'true')
    setOpen(false)
  }

  const handleActivate = () => {
    sessionStorage.setItem(DISMISS_KEY, 'true')
    setOpen(false)
    router.push('/gestionnaire/settings/billing')
  }

  const endDateFormatted = trialEndDate
    ? new Date(trialEndDate).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : ''

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleDismiss() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">
            Votre essai se termine dans {daysLeft} jour{daysLeft !== 1 ? 's' : ''}.
          </DialogTitle>
          <DialogDescription className="text-base mt-2">
            Vous avez cree {lotCount} lots et gere {interventionCount} interventions.
            Ne perdez pas cet elan.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 mt-4">
          <Button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            onClick={handleActivate}
          >
            Activer mon abonnement &mdash; 0 EUR aujourd&apos;hui
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Aucun debit avant le {endDateFormatted} - Annulation en 1 clic
          </p>

          <button
            onClick={handleDismiss}
            className="text-sm text-muted-foreground hover:text-foreground text-center py-1"
          >
            Plus tard
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
