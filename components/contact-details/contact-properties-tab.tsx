'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PropertiesNavigator } from '@/components/properties/properties-navigator'
import { Home, Plus } from 'lucide-react'
import type { Lot, Building } from '@/lib/services'
import type { ContactWithCompany } from './types'

interface PropertyStats {
  totalProperties: number
  totalLots: number
  totalBuildings: number
}

interface ContactPropertiesTabProps {
  contact: ContactWithCompany
  properties: Array<(Lot & { type: 'lot' }) | (Building & { type: 'building' })>
  stats: PropertyStats
  onCreateLot: () => void
  onCreateBuilding: () => void
}

/**
 * Properties tab content for contact details
 */
export function ContactPropertiesTab({
  contact,
  properties,
  stats,
  onCreateLot,
  onCreateBuilding
}: ContactPropertiesTabProps) {
  const getEmptyStateDescription = (): string => {
    switch (contact.role) {
      case 'locataire':
        return "Ce locataire n'a pas encore de logement assigné."
      case 'gestionnaire':
        return 'Ce gestionnaire ne gère pas encore de biens.'
      default:
        return "Aucun bien n'a été trouvé pour ce contact."
    }
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold text-blue-600">{stats.totalProperties}</div>
            <div className="text-sm text-muted-foreground">Biens totaux</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold text-green-600">{stats.totalLots}</div>
            <div className="text-sm text-muted-foreground">Lots</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold text-purple-600">{stats.totalBuildings}</div>
            <div className="text-sm text-muted-foreground">Immeubles</div>
          </CardContent>
        </Card>
      </div>

      {/* Properties Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-xl font-semibold text-foreground leading-snug flex items-center">
          <Home className="h-5 w-5 mr-2 text-muted-foreground" />
          Biens liés à {contact.name} ({properties.length})
        </h2>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={onCreateLot}>
            <Plus className="h-4 w-4 mr-2" />
            Nouveau lot
          </Button>
          <Button variant="outline" size="sm" onClick={onCreateBuilding}>
            <Plus className="h-4 w-4 mr-2" />
            Nouvel immeuble
          </Button>
        </div>
      </div>

      {/* Properties Navigator */}
      <PropertiesNavigator
        properties={properties}
        loading={false}
        emptyStateConfig={{
          title: 'Aucun bien lié',
          description: getEmptyStateDescription(),
          showCreateButtons: true,
          createButtonsConfig: {
            lot: {
              text: 'Créer un lot',
              action: onCreateLot
            },
            building: {
              text: 'Créer un immeuble',
              action: onCreateBuilding
            }
          }
        }}
        contactContext={{
          contactId: contact.id,
          contactName: contact.name,
          contactRole: contact.role
        }}
        searchPlaceholder={`Rechercher les biens de ${contact.name}...`}
        showFilters={true}
      />
    </div>
  )
}
