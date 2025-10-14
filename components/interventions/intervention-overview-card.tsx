'use client'

/**
 * Intervention Overview Card Component
 * Displays complete intervention information in a card format
 */

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  MapPin,
  Calendar,
  Clock,
  AlertCircle,
  User,
  Building,
  Hash,
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

// Status color mapping
const statusColors: Record<string, string> = {
  'demande': 'bg-gray-100 text-gray-800 border-gray-300',
  'rejetee': 'bg-red-100 text-red-800 border-red-300',
  'approuvee': 'bg-green-100 text-green-800 border-green-300',
  'demande_de_devis': 'bg-yellow-100 text-yellow-800 border-yellow-300',
  'planification': 'bg-blue-100 text-blue-800 border-blue-300',
  'planifiee': 'bg-blue-200 text-blue-900 border-blue-400',
  'en_cours': 'bg-purple-100 text-purple-800 border-purple-300',
  'cloturee_par_prestataire': 'bg-indigo-100 text-indigo-800 border-indigo-300',
  'cloturee_par_locataire': 'bg-indigo-200 text-indigo-900 border-indigo-400',
  'cloturee_par_gestionnaire': 'bg-green-200 text-green-900 border-green-400',
  'annulee': 'bg-gray-200 text-gray-600 border-gray-400'
}

// Status labels in French
const statusLabels: Record<string, string> = {
  'demande': 'Demande',
  'rejetee': 'Rejetée',
  'approuvee': 'Approuvée',
  'demande_de_devis': 'Demande de devis',
  'planification': 'Planification',
  'planifiee': 'Planifiée',
  'en_cours': 'En cours',
  'cloturee_par_prestataire': 'Terminée (prestataire)',
  'cloturee_par_locataire': 'Validée (locataire)',
  'cloturee_par_gestionnaire': 'Clôturée',
  'annulee': 'Annulée'
}

// Urgency color mapping
const urgencyColors: Record<string, string> = {
  'basse': 'bg-gray-100 text-gray-700',
  'normale': 'bg-blue-100 text-blue-700',
  'haute': 'bg-orange-100 text-orange-700',
  'urgente': 'bg-red-100 text-red-700'
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

  // Calculate duration
  const getDuration = () => {
    if (!intervention.created_at) return null

    const start = new Date(intervention.created_at)
    const end = intervention.completed_date
      ? new Date(intervention.completed_date)
      : new Date()

    const days = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))

    if (days === 0) return "Aujourd'hui"
    if (days === 1) return "1 jour"
    return `${days} jours`
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
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold">{intervention.title}</h2>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Hash className="w-4 h-4" />
              <span>Réf: {intervention.reference}</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge
              variant="outline"
              className={`border ${statusColors[intervention.status]}`}
            >
              {statusLabels[intervention.status] || intervention.status}
            </Badge>
            <Badge
              variant="secondary"
              className={urgencyColors[intervention.urgency]}
            >
              Urgence: {intervention.urgency}
            </Badge>
          </div>
        </div>
      </CardHeader>

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

          {/* Duration */}
          {getDuration() && (
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Durée</p>
                <p className="text-sm text-muted-foreground">{getDuration()}</p>
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