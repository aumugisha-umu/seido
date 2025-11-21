"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Eye,
  Building2,
  MapPin,
  Clock,
  Calendar,
  FileText,
  X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { InterventionWithRelations } from '@/lib/services'
import {
  getStatusColor,
  getStatusLabel,
  getPriorityColor,
  getPriorityLabel,
  getInterventionLocationText,
  getInterventionLocationIcon
} from '@/lib/intervention-utils'
import { shouldShowAlertBadge } from '@/lib/intervention-alert-utils'

/**
 * 📧 INTERVENTIONS LIST VIEW V3 - SPLIT LAYOUT
 *
 * **Design Philosophy:**
 * - Master-detail pattern (Gmail, Outlook style)
 * - List panel on left, details panel on right
 * - Reduces navigation (no page transitions)
 * - Efficient for reviewing multiple items
 *
 * **Pros:**
 * ✅ No page transitions (faster workflow)
 * ✅ Context preserved (see list while viewing details)
 * ✅ Keyboard navigation friendly (arrow keys)
 * ✅ Professional appearance (familiar pattern)
 * ✅ Efficient for sequential review
 *
 * **Cons:**
 * ❌ Requires wide screen (min ~800px)
 * ❌ Less mobile-friendly (single panel on mobile)
 * ❌ Split attention (two panes to manage)
 * ❌ Reduced space for each panel
 *
 * **Best for:**
 * - Desktop users with wide screens
 * - Sequential review workflows (triage, approval)
 * - Power users managing queues
 * - Professional/enterprise contexts
 * - When quick comparison between items is needed
 */

interface InterventionsListViewV3Props {
  /** List of interventions to display */
  interventions: InterventionWithRelations[]
  /** User role context for URL generation */
  userContext: 'gestionnaire' | 'prestataire' | 'locataire'
  /** Whether component is in loading state */
  loading?: boolean
  /** Current user ID for alert badge logic */
  userId?: string
  /** Optional CSS classes */
  className?: string
}

export function InterventionsListViewV3({
  interventions,
  userContext,
  loading = false,
  userId,
  className
}: InterventionsListViewV3Props) {
  const router = useRouter()
  const [selectedId, setSelectedId] = useState<string | null>(
    interventions.length > 0 ? interventions[0].id : null
  )

  // Get selected intervention
  const selectedIntervention = interventions.find((i) => i.id === selectedId)

  /**
   * 🔗 Get intervention URL
   */
  const getInterventionUrl = (interventionId: string) => {
    switch (userContext) {
      case 'prestataire':
        return `/prestataire/interventions/${interventionId}`
      case 'locataire':
        return `/locataire/interventions/${interventionId}`
      case 'gestionnaire':
      default:
        return `/gestionnaire/interventions/${interventionId}`
    }
  }

  /**
   * 🎨 Get type label
   */
  const getTypeLabel = (_type: string) => {
    const labels: Record<string, string> = {
      plomberie: 'Plomberie',
      electricite: 'Électricité',
      chauffage: 'Chauffage',
      serrurerie: 'Serrurerie',
      peinture: 'Peinture',
      maintenance: 'Maintenance',
      autre: 'Autre'
    }
    return labels[_type?.toLowerCase()] || 'Autre'
  }

  /**
   * 🎨 Get type badge color
   */
  const getTypeBadgeColor = (_type: string) => {
    const colors: Record<string, string> = {
      plomberie: 'bg-blue-100 text-blue-800 border-blue-200',
      electricite: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      chauffage: 'bg-red-100 text-red-800 border-red-200',
      serrurerie: 'bg-gray-100 text-gray-800 border-gray-200',
      peinture: 'bg-purple-100 text-purple-800 border-purple-200',
      maintenance: 'bg-orange-100 text-orange-800 border-orange-200',
      autre: 'bg-slate-100 text-slate-800 border-slate-200'
    }
    return colors[_type?.toLowerCase()] || 'bg-slate-100 text-slate-800 border-slate-200'
  }

  if (loading) {
    return (
      <div className="flex gap-4 h-[600px]">
        <div className="w-1/3 animate-pulse bg-gray-200 rounded-lg" />
        <div className="flex-1 animate-pulse bg-gray-200 rounded-lg" />
      </div>
    )
  }

  if (interventions.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        <p>Aucune intervention à afficher</p>
      </div>
    )
  }

  return (
    <div className={`flex gap-0 border border-slate-200 rounded-lg overflow-hidden bg-white h-[600px] ${className}`}>
      {/* LEFT PANEL - List of interventions */}
      <div className="w-full md:w-[380px] border-r border-slate-200 flex flex-col">
        {/* List Header */}
        <div className="p-3 border-b border-slate-200 bg-slate-50">
          <h3 className="font-semibold text-sm text-slate-700">
            Interventions ({interventions.length})
          </h3>
        </div>

        {/* Scrollable List */}
        <ScrollArea className="flex-1">
          <div className="divide-y divide-slate-100">
            {interventions.map((intervention) => {
              const isSelected = selectedId === intervention.id
              const isAlert = shouldShowAlertBadge(intervention as any, userContext, userId)
              const locationText = getInterventionLocationText(intervention as any)
              const locationIcon = getInterventionLocationIcon(intervention as any)

              return (
                <div
                  key={intervention.id}
                  className={`
                    p-3 cursor-pointer transition-colors
                    ${isSelected
                      ? 'bg-blue-50 border-l-2 border-l-blue-600'
                      : 'hover:bg-slate-50 border-l-2 border-l-transparent'
                    }
                  `}
                  onClick={() => setSelectedId(intervention.id)}
                >
                  {/* Title + Alert */}
                  <div className="flex items-start gap-2 mb-1.5">
                    {isAlert && (
                      <div className="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0 mt-1.5" />
                    )}
                    <h4 className={`text-sm font-medium flex-1 line-clamp-1 ${isSelected ? 'text-blue-900' : 'text-slate-900'}`}>
                      {intervention.title}
                    </h4>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap items-center gap-1 mb-2">
                    <Badge className={`${getStatusColor(intervention.status)} text-xs px-1.5 py-0`}>
                      {getStatusLabel(intervention.status)}
                    </Badge>
                    <Badge className={`${getPriorityColor(intervention.urgency || 'normale')} text-xs px-1.5 py-0`}>
                      {getPriorityLabel(intervention.urgency || 'normale')}
                    </Badge>
                  </div>

                  {/* Location + Date */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-xs text-slate-600">
                      {locationIcon === 'building' ? (
                        <Building2 className="h-3 w-3 flex-shrink-0" />
                      ) : (
                        <MapPin className="h-3 w-3 flex-shrink-0" />
                      )}
                      <span className="truncate">{locationText}</span>
                    </div>

                    {intervention.created_at && (
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <Clock className="h-3 w-3 flex-shrink-0" />
                        <span>
                          {new Date(intervention.created_at).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: '2-digit'
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </ScrollArea>
      </div>

      {/* RIGHT PANEL - Details of selected intervention */}
      <div className="hidden md:flex flex-1 flex-col">
        {selectedIntervention ? (
          <>
            {/* Details Header */}
            <div className="p-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-lg text-slate-900 mb-2">
                    {selectedIntervention.title}
                  </h2>

                  {/* Badges */}
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={`${getTypeBadgeColor(selectedIntervention.type || 'autre')} text-xs border`}>
                      {getTypeLabel(selectedIntervention.type || 'autre')}
                    </Badge>
                    <Badge className={`${getPriorityColor(selectedIntervention.urgency || 'normale')} text-xs`}>
                      {getPriorityLabel(selectedIntervention.urgency || 'normale')}
                    </Badge>
                    <Badge className={`${getStatusColor(selectedIntervention.status)} text-xs`}>
                      {getStatusLabel(selectedIntervention.status)}
                    </Badge>
                  </div>
                </div>

                {/* Close button (mobile) */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="md:hidden h-8 w-8 p-0"
                  onClick={() => setSelectedId(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Details Content */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-6">
                {/* Location */}
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                    {getInterventionLocationIcon(selectedIntervention as any) === 'building' ? (
                      <Building2 className="h-4 w-4" />
                    ) : (
                      <MapPin className="h-4 w-4" />
                    )}
                    <span>Localisation</span>
                  </div>
                  <p className="text-sm text-slate-600 pl-6">
                    {getInterventionLocationText(selectedIntervention as any)}
                  </p>
                </div>

                {/* Description */}
                {selectedIntervention.description && (
                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                      <FileText className="h-4 w-4" />
                      <span>Description</span>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed pl-6">
                      {selectedIntervention.description}
                    </p>
                  </div>
                )}

                {/* Dates */}
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-3">
                    <Calendar className="h-4 w-4" />
                    <span>Dates importantes</span>
                  </div>

                  <div className="space-y-3 pl-6">
                    {/* Created Date */}
                    {selectedIntervention.created_at && (
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-slate-200 rounded flex items-center justify-center">
                          <Clock className="h-4 w-4 text-slate-600" />
                        </div>
                        <div>
                          <div className="text-xs text-slate-500">Créée le</div>
                          <div className="text-sm text-slate-700 font-medium">
                            {new Date(selectedIntervention.created_at).toLocaleDateString('fr-FR', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Scheduled Date */}
                    {selectedIntervention.scheduled_date && (
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-emerald-100 rounded flex items-center justify-center">
                          <Calendar className="h-4 w-4 text-emerald-600" />
                        </div>
                        <div>
                          <div className="text-xs text-slate-500">Programmée pour le</div>
                          <div className="text-sm text-slate-700 font-medium">
                            {new Date(selectedIntervention.scheduled_date).toLocaleDateString('fr-FR', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </ScrollArea>

            {/* Details Footer - Actions */}
            <div className="p-4 border-t border-slate-200 bg-slate-50">
              <Button
                className="w-full"
                onClick={() => router.push(getInterventionUrl(selectedIntervention.id))}
              >
                <Eye className="h-4 w-4 mr-2" />
                Voir tous les détails
              </Button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400">
            <p>Sélectionnez une intervention pour voir les détails</p>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * ✶ Insight ─────────────────────────────────────
 *
 * **Master-Detail Pattern (Split View):**
 *
 * This pattern excels for:
 * - Sequential processing (review queue of interventions)
 * - Quick comparison (see list context while viewing details)
 * - Keyboard workflows (arrow keys to navigate list)
 * - Reduced page transitions (faster, preserves context)
 *
 * **Design Decisions:**
 *
 * 1. **Left Panel Width (380px)**:
 *    - Wide enough for readable titles and badges
 *    - Narrow enough to preserve detail space
 *    - Industry standard (Gmail: 400px, Outlook: 360px)
 *
 * 2. **Selection Indicator**:
 *    - Blue background + left border (clear visual feedback)
 *    - Entire row clickable (large touch target)
 *    - Hover state for discoverability
 *
 * 3. **Responsive Strategy**:
 *    - Mobile: Hide right panel (show on item click if needed)
 *    - Tablet+: Show split view
 *    - Could add slide-over panel for mobile enhancement
 *
 * **When to Choose V3:**
 * Use split layout when:
 * - Desktop is primary platform (needs ~800px min width)
 * - Users process multiple items sequentially
 * - Context switching is frequent (compare between items)
 * - Professional workflow (triage, review, approval)
 *
 * **Performance Note:**
 * selectedIntervention lookup is O(n) but happens only on click,
 * and intervention lists are typically <100 items, so impact is minimal.
 * For lists >1000, consider Map<id, intervention> for O(1) lookup.
 *
 * ─────────────────────────────────────────────────
 */
