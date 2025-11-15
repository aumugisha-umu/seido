/**
 * Page Nouveau Lot - Mode Démo
 * Formulaire de création de lot
 */

'use client'

import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Home } from 'lucide-react'

export default function NewLotPageDemo() {
  const router = useRouter()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/demo/gestionnaire/biens')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Nouveau lot</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Créez un nouveau lot dans votre patrimoine
          </p>
        </div>
      </div>

      {/* Content */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Home className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-blue-900 font-medium mb-2">
                Fonctionnalité en cours de développement
              </p>
              <p className="text-sm text-blue-800">
                Le formulaire de création de lot sera bientôt disponible en mode démo.
                Ce formulaire permet de créer un lot indépendant ou rattaché à un immeuble, avec ses contacts associés.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => router.push('/demo/gestionnaire/biens')}
              >
                Retour au patrimoine
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
