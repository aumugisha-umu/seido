/**
 * Demo Interventions Section - Matching Production Layout
 *
 * ✅ Matches production InterventionsSectionWithModals visual design
 * ✅ Tabs: En attente / En cours / Terminées
 * ✅ Intervention cards with status badges
 * ❌ No modal actions (simplified for demo)
 */

'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Wrench, Clock, CheckCircle, AlertCircle, Calendar, MapPin, Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface DemoInterventionsSectionProps {
  interventions: any[]
}

export function DemoInterventionsSection({ interventions }: DemoInterventionsSectionProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('en-attente')

  // Filtrer les interventions par statut
  const enAttente = useMemo(() => {
    return interventions.filter(i =>
      ['demande', 'approuvee', 'demande_de_devis', 'planification'].includes(i.status)
    )
  }, [interventions])

  const enCours = useMemo(() => {
    return interventions.filter(i =>
      ['planifiee', 'en_cours', 'cloturee_par_prestataire', 'cloturee_par_locataire'].includes(i.status)
    )
  }, [interventions])

  const terminees = useMemo(() => {
    return interventions.filter(i =>
      ['cloturee_par_gestionnaire', 'annulee'].includes(i.status)
    )
  }, [interventions])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'demande': return 'bg-blue-100 text-blue-800'
      case 'approuvee': return 'bg-green-100 text-green-800'
      case 'demande_de_devis': return 'bg-purple-100 text-purple-800'
      case 'planification': return 'bg-yellow-100 text-yellow-800'
      case 'planifiee': return 'bg-indigo-100 text-indigo-800'
      case 'en_cours': return 'bg-orange-100 text-orange-800'
      case 'cloturee_par_prestataire': return 'bg-teal-100 text-teal-800'
      case 'cloturee_par_locataire': return 'bg-cyan-100 text-cyan-800'
      case 'cloturee_par_gestionnaire': return 'bg-gray-100 text-gray-800'
      case 'annulee': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'urgente': return 'bg-red-100 text-red-800 border-red-200'
      case 'haute': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'normale': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'basse': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const renderInterventionCard = (intervention: any) => (
    <Card key={intervention.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push(`/demo/gestionnaire/interventions/${intervention.id}`)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm truncate">{intervention.title}</h3>
            <p className="text-xs text-gray-500 mt-1">{intervention.reference}</p>
          </div>
          <div className="flex flex-col gap-1.5 ml-3">
            <Badge variant="outline" className={`text-xs ${getStatusColor(intervention.status)}`}>
              {intervention.status}
            </Badge>
            <Badge variant="outline" className={`text-xs ${getUrgencyColor(intervention.urgency)}`}>
              {intervention.urgency}
            </Badge>
          </div>
        </div>

        <div className="space-y-2 text-xs text-gray-600">
          {intervention.lot_reference && (
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5" />
              <span>{intervention.lot_reference}</span>
            </div>
          )}
          {intervention.type && (
            <div className="flex items-center gap-2">
              <Wrench className="h-3.5 w-3.5" />
              <span className="capitalize">{intervention.type}</span>
            </div>
          )}
          {intervention.created_at && (
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5" />
              <span>{new Date(intervention.created_at).toLocaleDateString('fr-FR')}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )

  const renderEmptyState = (icon: any, title: string, description: string) => {
    const Icon = icon
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Icon className="h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-500 mb-4">{description}</p>
        <Button onClick={() => router.push('/demo/gestionnaire/interventions/nouvelle')}>
          <Plus className="h-4 w-4 mr-2" />
          Créer une intervention
        </Button>
      </div>
    )
  }

  return (
    <Card className="flex flex-col h-full overflow-hidden">
      <CardHeader className="flex-shrink-0 border-b pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-gray-700" />
            <h2 className="text-lg font-semibold">Interventions</h2>
          </div>
          <Button
            size="sm"
            onClick={() => router.push('/demo/gestionnaire/interventions')}
            variant="outline"
          >
            Voir toutes
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="w-full grid grid-cols-3 mb-4">
            <TabsTrigger value="en-attente" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              En attente
              {enAttente.length > 0 && (
                <Badge variant="secondary" className="ml-1">{enAttente.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="en-cours" className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              En cours
              {enCours.length > 0 && (
                <Badge variant="secondary" className="ml-1">{enCours.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="terminees" className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Terminées
              {terminees.length > 0 && (
                <Badge variant="secondary" className="ml-1">{terminees.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="en-attente" className="flex-1 overflow-auto mt-0">
            {enAttente.length === 0 ? (
              renderEmptyState(Clock, 'Aucune intervention en attente', 'Les nouvelles demandes apparaîtront ici')
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {enAttente.map(renderInterventionCard)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="en-cours" className="flex-1 overflow-auto mt-0">
            {enCours.length === 0 ? (
              renderEmptyState(AlertCircle, 'Aucune intervention en cours', 'Les interventions actives apparaîtront ici')
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {enCours.map(renderInterventionCard)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="terminees" className="flex-1 overflow-auto mt-0">
            {terminees.length === 0 ? (
              renderEmptyState(CheckCircle, 'Aucune intervention terminée', 'Les interventions clôturées apparaîtront ici')
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {terminees.map(renderInterventionCard)}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
