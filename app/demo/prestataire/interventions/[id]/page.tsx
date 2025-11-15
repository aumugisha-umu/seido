/**
 * Page Détail Intervention Prestataire - Mode Démo
 * Affiche les informations détaillées d'une intervention
 */

'use client'

import { use } from 'react'
import { notFound, useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useDemoIntervention } from '@/hooks/demo/use-demo-interventions'

// Helper function to get French label for intervention status
function getStatusLabel(status: string): { label: string; color: string } {
  const statusLabels: Record<string, { label: string; color: string }> = {
    'demande': { label: 'Nouvelle demande', color: 'bg-blue-100 text-blue-800' },
    'rejetee': { label: 'Rejetée', color: 'bg-red-100 text-red-800' },
    'approuvee': { label: 'Approuvée', color: 'bg-green-100 text-green-800' },
    'demande_de_devis': { label: 'Devis demandé', color: 'bg-yellow-100 text-yellow-800' },
    'planification': { label: 'À planifier', color: 'bg-purple-100 text-purple-800' },
    'planifiee': { label: 'Planifiée', color: 'bg-indigo-100 text-indigo-800' },
    'en_cours': { label: 'En cours', color: 'bg-orange-100 text-orange-800' },
    'cloturee_par_prestataire': { label: 'Intervention terminée', color: 'bg-teal-100 text-teal-800' },
    'cloturee_par_locataire': { label: 'Validée par locataire', color: 'bg-cyan-100 text-cyan-800' },
    'cloturee_par_gestionnaire': { label: 'Clôturée', color: 'bg-gray-100 text-gray-800' },
    'annulee': { label: 'Annulée', color: 'bg-slate-100 text-slate-800' }
  }
  return statusLabels[status] || { label: status, color: 'bg-gray-100 text-gray-800' }
}

export default function InterventionDetailPageDemo({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()

  const { intervention } = useDemoIntervention(id)

  if (!intervention) {
    notFound()
  }

  const statusInfo = getStatusLabel(intervention.status)

  return (
    <div className="layout-container space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/demo/prestataire/interventions')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{intervention.title}</h1>
            <p className="text-sm text-muted-foreground mt-1">{intervention.reference}</p>
          </div>
        </div>
        <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle>Détails de l'intervention</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Description</p>
              <p className="text-sm mt-1">{intervention.description || '-'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Statut</p>
              <p className="text-sm mt-1">
                <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
              </p>
            </div>
            {intervention.urgency && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Urgence</p>
                <p className="text-sm mt-1">{intervention.urgency}</p>
              </div>
            )}
            {intervention.created_at && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Créée le</p>
                <p className="text-sm mt-1">{new Date(intervention.created_at).toLocaleDateString('fr-FR')}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Note about demo mode */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <p className="text-sm text-blue-800">
            ℹ️ <strong>Mode démo</strong> : Cette page affiche les informations de base. La version complète avec onglets
            (Devis, Créneaux, Documents, etc.) sera ajoutée prochainement.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
