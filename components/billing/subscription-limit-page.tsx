'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { UpgradeModal } from '@/components/billing/upgrade-modal'

interface SubscriptionLimitPageProps {
  currentLots: number
  subscribedLots: number
}

export function SubscriptionLimitPage({
  currentLots,
  subscribedLots,
}: SubscriptionLimitPageProps) {
  const router = useRouter()
  const [upgradeOpen, setUpgradeOpen] = useState(false)

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <Lock className="h-8 w-8 text-muted-foreground" />
      </div>

      <div className="text-center space-y-2">
        <h1 className="text-2xl font-semibold">
          Limite de lots atteinte
        </h1>
        <p className="text-muted-foreground max-w-md">
          Votre abonnement est limit&eacute; &agrave; {subscribedLots} lots et vous en avez
          d&eacute;j&agrave; {currentLots}. Mettez &agrave; niveau pour cr&eacute;er de nouveaux lots.
        </p>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour
        </Button>
        <Button onClick={() => setUpgradeOpen(true)}>
          Mettre &agrave; niveau
        </Button>
      </div>

      <UpgradeModal
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        currentLots={currentLots}
        onUpgradeComplete={() => {
          setUpgradeOpen(false)
          router.refresh()
        }}
      />
    </div>
  )
}
