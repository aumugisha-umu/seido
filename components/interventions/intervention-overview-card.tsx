'use client'

/**
 * Intervention Overview Card Component
 * Displays complete intervention information in a card format
 */

import { Card, CardContent } from '@/components/ui/card'
import {
  MapPin,
  Calendar,
  AlertCircle,
  User,
  Building,
  FileText,
  DollarSign,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { Database } from '@/lib/database.types'

type Intervention = Database['public']['Tables']['interventions']['Row'] & {
  building?: Database['public']['Tables']['buildings']['Row']
  lot?: Database['public']['Tables']['lots']['Row']
  tenant?: Database['public']['Tables']['users']['Row']
}

interface InterventionOverviewCardProps {
  intervention: Intervention
}

// Type icons
const typeIcons: Record<string, typeof FileText> = {
  'plomberie': FileText,
  'electricite': FileText,
  'chauffage': FileText,
  'serrurerie': FileText,
  'peinture': FileText,
  'menage': FileText,
  'jardinage': FileText,
  'autre': FileText
}

export function InterventionOverviewCard({ intervention }: InterventionOverviewCardProps) {
  const TypeIcon = typeIcons[intervention.type] || FileText

  // Format dates
  const formatDate = (date: string | null) => {
    if (!date) return 'Non définie'
    return format(new Date(date), 'dd MMMM yyyy', { locale: fr })
  }

  const formatDateTime = (date: string | null) => {
    if (!date) return 'Non définie'
    return format(new Date(date), 'dd MMM yyyy à HH:mm', { locale: fr })
  }

  // Get location display
  const getLocation = () => {
    const parts = []

    if (intervention.building?.name) {
      parts.push(intervention.building.name)
    }

    if (intervention.lot?.reference) {
      parts.push(`Lot ${intervention.lot.reference}`)
    }

    if (intervention.lot?.apartment_number) {
      parts.push(`Apt ${intervention.lot.apartment_number}`)
    }

    if (intervention.building?.address) {
      parts.push(intervention.building.address)
    }

    return parts.length > 0 ? parts.join(' - ') : 'Non spécifié'
  }

  return (
    <Card>
      <CardContent className="space-y-6">
        {/* Description */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">Description</h3>
          <p className="text-sm whitespace-pre-wrap">{intervention.description}</p>
        </div>

        {/* Key Information Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Type */}
          <div className="flex items-start gap-3">
            <TypeIcon className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium">Type d'intervention</p>
              <p className="text-sm text-muted-foreground capitalize">
                {intervention.type.replace('_', ' ')}
              </p>
            </div>
          </div>

          {/* Location */}
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium">Localisation</p>
              <p className="text-sm text-muted-foreground">{getLocation()}</p>
            </div>
          </div>

          {/* Tenant */}
          {intervention.tenant && (
            <div className="flex items-start gap-3">
              <User className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Demandeur</p>
                <p className="text-sm text-muted-foreground">
                  {intervention.tenant.name}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Dates */}
        <div className="space-y-3 border-t pt-4">
          <h3 className="text-sm font-medium text-muted-foreground">Dates importantes</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Créée le:</span>
              <span>{formatDate(intervention.created_at)}</span>
            </div>

            {intervention.requested_date && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Souhaitée le:</span>
                <span>{formatDate(intervention.requested_date)}</span>
              </div>
            )}

            {intervention.scheduled_date && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-blue-500" />
                <span className="text-muted-foreground">Planifiée le:</span>
                <span className="font-medium">{formatDateTime(intervention.scheduled_date)}</span>
              </div>
            )}

            {intervention.completed_date && (
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-muted-foreground">Terminée le:</span>
                <span className="font-medium">{formatDate(intervention.completed_date)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Costs */}
        {(intervention.estimated_cost || intervention.final_cost) && (
          <div className="space-y-3 border-t pt-4">
            <h3 className="text-sm font-medium text-muted-foreground">Coûts</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {intervention.estimated_cost && (
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Coût estimé:</span>
                  <span>{intervention.estimated_cost}€</span>
                </div>
              )}

              {intervention.final_cost && (
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="w-4 h-4 text-green-500" />
                  <span className="text-muted-foreground">Coût final:</span>
                  <span className="font-medium">{intervention.final_cost}€</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Comments */}
        {(intervention.tenant_comment || intervention.manager_comment || intervention.provider_comment) && (
          <div className="space-y-3 border-t pt-4">
            <h3 className="text-sm font-medium text-muted-foreground">Commentaires</h3>
            <div className="space-y-3">
              {intervention.tenant_comment && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Locataire</p>
                  <p className="text-sm">{intervention.tenant_comment}</p>
                </div>
              )}

              {intervention.manager_comment && (
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Gestionnaire</p>
                  <p className="text-sm">{intervention.manager_comment}</p>
                </div>
              )}

              {intervention.provider_comment && (
                <div className="bg-purple-50 rounded-lg p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Prestataire</p>
                  <p className="text-sm">{intervention.provider_comment}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}