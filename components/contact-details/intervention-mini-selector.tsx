'use client'

/**
 * InterventionMiniSelector - Sélecteur compact d'interventions avec recherche
 *
 * Utilisé dans EntityLinkSection pour lier un contact à une intervention
 * Réutilise les utilitaires de statut existants pour la cohérence UI
 */

import { useState, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Search, Wrench, Check, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  getStatusLabel,
  getStatusBadgeVariant
} from '@/lib/services/utils/intervention-display'
import type { InterventionStatus } from '@/lib/services/core/service-types'

interface Intervention {
  id: string
  title: string
  status: InterventionStatus
  priority?: 'low' | 'medium' | 'high' | 'urgent' | null
  scheduled_date?: string | null
  lot?: {
    id: string
    reference: string
    building?: {
      name: string
    } | null
  } | null
}

interface InterventionMiniSelectorProps {
  interventions: Intervention[]
  selectedId: string | null
  onSelect: (interventionId: string | null) => void
  loading?: boolean
}

// Couleurs des priorités pour badges
const PRIORITY_VARIANTS: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  low: 'outline',
  medium: 'secondary',
  high: 'default',
  urgent: 'destructive'
}

const PRIORITY_LABELS: Record<string, string> = {
  low: 'Basse',
  medium: 'Normale',
  high: 'Haute',
  urgent: 'Urgente'
}

export function InterventionMiniSelector({
  interventions,
  selectedId,
  onSelect,
  loading = false
}: InterventionMiniSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('')

  // Filtrer les interventions selon la recherche
  const filteredInterventions = useMemo(() => {
    if (!searchTerm.trim()) return interventions

    const term = searchTerm.toLowerCase()
    return interventions.filter(intervention => {
      const title = intervention.title?.toLowerCase() || ''
      const lotReference = intervention.lot?.reference?.toLowerCase() || ''
      const buildingName = intervention.lot?.building?.name?.toLowerCase() || ''
      const statusLabel = getStatusLabel(intervention.status).toLowerCase()

      return (
        title.includes(term) ||
        lotReference.includes(term) ||
        buildingName.includes(term) ||
        statusLabel.includes(term)
      )
    })
  }, [interventions, searchTerm])

  // Formater la date
  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return ''
    try {
      return new Date(dateString).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })
    } catch {
      return ''
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-9 w-full" />
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Barre de recherche */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Rechercher par titre, lot ou immeuble..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Liste des interventions */}
      <ScrollArea className="h-[250px]">
        <div className="space-y-2 pr-4">
          {filteredInterventions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Wrench className="h-10 w-10 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">
                {searchTerm ? 'Aucune intervention trouvée' : 'Aucune intervention disponible'}
              </p>
            </div>
          ) : (
            filteredInterventions.map(intervention => {
              const isSelected = selectedId === intervention.id
              const statusVariant = getStatusBadgeVariant(intervention.status)
              const priorityVariant = intervention.priority
                ? PRIORITY_VARIANTS[intervention.priority]
                : undefined

              return (
                <button
                  key={intervention.id}
                  type="button"
                  onClick={() => onSelect(isSelected ? null : intervention.id)}
                  className={cn(
                    "flex items-center gap-3 w-full p-3 rounded-lg border text-left transition-all",
                    "hover:border-primary/50 hover:bg-primary/5",
                    isSelected
                      ? "border-primary bg-primary/10 ring-1 ring-primary/20"
                      : "border-border bg-background"
                  )}
                >
                  {/* Radio button visuel */}
                  <div className={cn(
                    "flex items-center justify-center h-5 w-5 rounded-full border-2 shrink-0 transition-colors",
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-muted-foreground/40"
                  )}>
                    {isSelected && <Check className="h-3 w-3" />}
                  </div>

                  {/* Contenu */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium truncate max-w-[200px]">
                        {intervention.title || 'Intervention sans titre'}
                      </p>
                      <Badge variant={statusVariant} className="text-xs shrink-0">
                        {getStatusLabel(intervention.status)}
                      </Badge>
                      {intervention.priority && priorityVariant && (
                        <Badge variant={priorityVariant} className="text-xs shrink-0">
                          {PRIORITY_LABELS[intervention.priority]}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="truncate">
                        {intervention.lot?.building?.name || 'Immeuble non défini'}
                        {intervention.lot?.reference && ` • Lot ${intervention.lot.reference}`}
                      </span>
                      {intervention.scheduled_date && (
                        <span className="flex items-center gap-1 shrink-0">
                          <Calendar className="h-3 w-3" />
                          {formatDate(intervention.scheduled_date)}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </ScrollArea>

      {/* Compteur de résultats */}
      {searchTerm && (
        <p className="text-xs text-muted-foreground text-center">
          {filteredInterventions.length} intervention{filteredInterventions.length !== 1 ? 's' : ''} trouvée{filteredInterventions.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}

export default InterventionMiniSelector
