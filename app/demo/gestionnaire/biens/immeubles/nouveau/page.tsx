/**
 * Page Nouvel Immeuble - Mode Démo
 * Formulaire de création d'immeuble
 */

'use client'

import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, AlertCircle, Building2 } from 'lucide-react'

export default function NewBuildingPageDemo() {
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
          <h1 className="text-2xl font-bold text-slate-900">Nouvel immeuble</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Créez un nouvel immeuble dans votre patrimoine
          </p>
        </div>
      </div>

      {/* Content */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Building2 className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-blue-900 font-medium mb-2">
                Fonctionnalité en cours de développement
              </p>
              <p className="text-sm text-blue-800">
                Le formulaire de création d'immeuble sera bientôt disponible en mode démo.
                Ce formulaire complexe en plusieurs étapes permet de créer un immeuble avec ses lots et contacts.
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
