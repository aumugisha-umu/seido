'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { InterventionsNavigator } from '@/components/interventions/interventions-navigator'
import { Wrench, Plus } from 'lucide-react'
import type { InterventionWithRelations } from '@/lib/services'
import type { ContactWithCompany } from './types'

interface InterventionStats {
  total: number
  pending: number
  inProgress: number
  completed: number
}

interface ContactInterventionsTabProps {
  contact: ContactWithCompany
  interventions: InterventionWithRelations[]
  stats: InterventionStats
  onCreateIntervention: () => void
}

/**
 * Interventions tab content for contact details
 */
export function ContactInterventionsTab({
  contact,
  interventions,
  stats,
  onCreateIntervention
}: ContactInterventionsTabProps) {
  const getEmptyStateDescription = (): string => {
    switch (contact.role) {
      case 'prestataire':
        return "Aucune intervention n'a été assignée à ce prestataire."
      case 'locataire':
        return "Aucune intervention n'a été créée pour les logements de ce locataire."
      default:
        return "Aucune intervention n'a été trouvée pour ce contact."
    }
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
            <div className="text-sm text-muted-foreground">En attente</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold text-yellow-600">{stats.inProgress}</div>
            <div className="text-sm text-muted-foreground">En cours</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <div className="text-sm text-muted-foreground">Terminées</div>
          </CardContent>
        </Card>
      </div>

      {/* Interventions Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-xl font-semibold text-foreground leading-snug flex items-center">
          <Wrench className="h-5 w-5 mr-2 text-muted-foreground" />
          Interventions liées à {contact.name} ({interventions.length})
        </h2>
        <Button onClick={onCreateIntervention}>
          <Plus className="h-4 w-4 mr-2" />
          Créer une intervention
        </Button>
      </div>

      {/* Interventions Navigator */}
      <InterventionsNavigator
        interventions={interventions}
        loading={false}
        emptyStateConfig={{
          title: 'Aucune intervention',
          description: getEmptyStateDescription(),
          showCreateButton: true,
          createButtonText: 'Créer une intervention',
          createButtonAction: onCreateIntervention
        }}
      />
    </div>
  )
}
