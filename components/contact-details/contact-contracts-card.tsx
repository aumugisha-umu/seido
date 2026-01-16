'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollText } from 'lucide-react'
import type { LinkedContract } from './types'

interface ContactContractsCardProps {
  contracts: LinkedContract[]
  onNavigateToContract: (contractId: string) => void
}

/**
 * Card displaying linked contracts for a contact
 */
export function ContactContractsCard({
  contracts,
  onNavigateToContract
}: ContactContractsCardProps) {
  if (contracts.length === 0) {
    return null
  }

  const getRoleBadgeClass = (role: string): string => {
    switch (role) {
      case 'locataire':
      case 'colocataire':
        return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'garant':
        return 'bg-purple-50 text-purple-700 border-purple-200'
      case 'owner':
        return 'bg-amber-50 text-amber-700 border-amber-200'
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  const getRoleLabel = (role: string): string => {
    switch (role) {
      case 'locataire':
        return 'Locataire'
      case 'colocataire':
        return 'Co-locataire'
      case 'garant':
        return 'Garant'
      case 'owner':
        return 'Propriétaire'
      default:
        return role
    }
  }

  const getStatusBadgeClass = (status: string): string => {
    switch (status) {
      case 'actif':
        return 'bg-green-100 text-green-800'
      case 'a_venir':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-600'
    }
  }

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'actif':
        return 'Actif'
      case 'a_venir':
        return 'À venir'
      case 'expire':
        return 'Expiré'
      case 'resilie':
        return 'Résilié'
      case 'brouillon':
        return 'Brouillon'
      default:
        return status
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-lg font-semibold text-foreground">
          <ScrollText className="h-5 w-5 text-muted-foreground" />
          <span>Contrats Liés ({contracts.length})</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {contracts.map((contract) => (
            <div
              key={contract.id}
              className="flex items-center justify-between p-3 rounded-lg border border-border cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => onNavigateToContract(contract.id)}
            >
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <ScrollText className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-foreground">
                    {contract.title || `Contrat ${contract.lot?.reference || ''}`}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {contract.lot?.reference && `${contract.lot.reference} • `}
                    {contract.lot?.building?.name || contract.lot?.city || 'Bien non spécifié'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {/* Role badge */}
                <Badge variant="outline" className={getRoleBadgeClass(contract.contactRole)}>
                  {getRoleLabel(contract.contactRole)}
                </Badge>
                {/* Status badge */}
                <Badge
                  variant={contract.status === 'actif' ? 'default' : 'secondary'}
                  className={getStatusBadgeClass(contract.status)}
                >
                  {getStatusLabel(contract.status)}
                </Badge>
                {/* Dates */}
                <span className="text-sm text-muted-foreground hidden sm:inline">
                  {new Date(contract.start_date).toLocaleDateString('fr-FR')}
                  {contract.end_date &&
                    ` → ${new Date(contract.end_date).toLocaleDateString('fr-FR')}`}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
