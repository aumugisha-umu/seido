/**
 * Page Modifier Immeuble - Mode Démo
 * Formulaire de modification d'immeuble
 */

'use client'

import { use } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Building2 } from 'lucide-react'
import { useDemoBuilding } from '@/hooks/demo/use-demo-buildings'

export default function EditBuildingPageDemo({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const { building } = useDemoBuilding(id)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(`/demo/gestionnaire/biens/immeubles/${id}`)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Modifier {building?.name || 'l\'immeuble'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Modifiez les informations de cet immeuble
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
                Le formulaire de modification d'immeuble sera bientôt disponible en mode démo.
                Vous pourrez modifier le nom, l'adresse, la description et gérer les lots associés.
              </p>
              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/demo/gestionnaire/biens/immeubles/${id}`)}
                >
                  Retour aux détails
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/demo/gestionnaire/biens')}
                >
                  Retour au patrimoine
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
