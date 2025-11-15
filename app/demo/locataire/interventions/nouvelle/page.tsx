/**
 * Page Nouvelle Demande Locataire - Mode Démo
 * Formulaire de création de demande d'intervention
 */

'use client'

import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, AlertCircle } from 'lucide-react'

export default function NouvelleDemandePage() {
  const router = useRouter()

  return (
    <div className="layout-container min-h-screen bg-gray-50">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/demo/locataire/interventions')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Nouvelle demande d'intervention</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Déclarez un problème dans votre logement
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-blue-900 font-medium mb-2">
                Fonctionnalité en cours de développement
              </p>
              <p className="text-sm text-blue-800">
                Le formulaire de création d'intervention pour locataire sera bientôt disponible en mode démo.
                En attendant, vous pouvez consulter la liste des interventions existantes.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => router.push('/demo/locataire/interventions')}
              >
                Retour aux interventions
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
