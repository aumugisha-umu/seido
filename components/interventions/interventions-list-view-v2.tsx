"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Eye,
  ChevronDown,
  ChevronUp,
  Building2,
  MapPin,
  Clock,
  Calendar,
  FileText
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
 * 📱 INTERVENTIONS LIST VIEW V2 - COMPACT ROWS
 *
 * **Design Philosophy:**
 * - Mobile-first compact rows with expand/collapse
 * - Primary info always visible
 * - Detailed info revealed on demand
 * - Similar to mobile email apps (Gmail, Outlook)
 *
 * **Pros:**
 * ✅ Mobile-optimized (no horizontal scroll)
 * ✅ Progressive disclosure (show details on demand)
 * ✅ Clean, scannable interface
 * ✅ Touch-friendly (large tap targets)
 * ✅ Flexible space usage
 *
 * **Cons:**
 * ❌ Requires tap to see full details
 * ❌ Less efficient for bulk comparison
 * ❌ Slower for power users scanning many items
 *
 * **Best for:**
 * - Mobile and tablet users
 * - Touch-first interfaces
 * - Casual browsing workflows
 * - Users reviewing interventions one-by-one
 * - Responsive designs (adapts well to all sizes)
 */

interface InterventionsListViewV2Props {
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

export function InterventionsListViewV2({
  interventions,
  userContext,
  loading = false,
  userId,
  className
}: InterventionsListViewV2Props) {
  const router = useRouter()
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  /**
   * 🔄 Toggle row expansion
   */
  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

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
      <div className="animate-pulse space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-20 bg-gray-200 rounded-lg" />
        ))}
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
    <div className={`space-y-2 ${className}`}>
      {interventions.map((intervention) => {
        const isExpanded = expandedIds.has(intervention.id)
        const isAlert = shouldShowAlertBadge(intervention as any, userContext, userId)
        const locationText = getInterventionLocationText(intervention as any)
        const locationIcon = getInterventionLocationIcon(intervention as any)

        return (
          <div
            key={intervention.id}
            className="bg-white border border-slate-200 rounded-lg hover:shadow-sm transition-shadow overflow-hidden"
          >
            {/* COMPACT ROW - Always Visible */}
            <div
              className="p-3 sm:p-4 cursor-pointer"
              onClick={() => toggleExpand(intervention.id)}
            >
              <div className="flex items-start gap-3">
                {/* Alert Indicator */}
                {isAlert && (
                  <div className="flex-shrink-0 mt-1">
                    <div className="w-2 h-2 rounded-full bg-orange-500" title="Action requise" />
                  </div>
                )}

                {/* Main Content */}
                <div className="flex-1 min-w-0">
                  {/* Title + Status */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-slate-900 text-sm sm:text-base truncate">
                      {intervention.title}
                    </h3>
                    <Badge className={`${getStatusColor(intervention.status)} text-xs px-2 py-0.5 flex-shrink-0`}>
                      {getStatusLabel(intervention.status)}
                    </Badge>
                  </div>

                  {/* Badges Row */}
                  <div className="flex flex-wrap items-center gap-1.5 mb-2">
                    {/* Type Badge */}
                    <Badge className={`${getTypeBadgeColor(intervention.type || 'autre')} text-xs px-2 py-0.5 border`}>
                      {getTypeLabel(intervention.type || 'autre')}
                    </Badge>

                    {/* Urgency Badge */}
                    <Badge className={`${getPriorityColor(intervention.urgency || 'normale')} text-xs px-2 py-0.5`}>
                      {getPriorityLabel(intervention.urgency || 'normale')}
                    </Badge>
                  </div>

                  {/* Location + Date */}
                  <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-600">
                    {/* Location */}
                    <div className="flex items-center gap-1 min-w-0">
                      {locationIcon === 'building' ? (
                        <Building2 className="h-3.5 w-3.5 flex-shrink-0" />
                      ) : (
                        <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                      )}
                      <span className="truncate">{locationText}</span>
                    </div>

                    {/* Created Date */}
                    {intervention.created_at && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Clock className="h-3.5 w-3.5" />
                        <span>
                          {new Date(intervention.created_at).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: '2-digit'
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Expand/Collapse Icon */}
                <div className="flex-shrink-0 pt-1">
                  {isExpanded ? (
                    <ChevronUp className="h-5 w-5 text-slate-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-slate-400" />
                  )}
                </div>
              </div>
            </div>

            {/* EXPANDED DETAILS - Shown on demand */}
            {isExpanded && (
              <div className="border-t border-slate-100 bg-slate-50 p-3 sm:p-4 space-y-3">
                {/* Description */}
                {intervention.description && (
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700 mb-1">
                      <FileText className="h-3.5 w-3.5" />
                      <span>Description</span>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed pl-5">
                      {intervention.description}
                    </p>
                  </div>
                )}

                {/* Dates Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {/* Created Date */}
                  {intervention.created_at && (
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-7 h-7 bg-slate-200 rounded flex items-center justify-center">
                        <Clock className="h-4 w-4 text-slate-600" />
                      </div>
                      <div>
                        <div className="text-xs text-slate-500">Créée le</div>
                        <div className="text-slate-700 font-medium">
                          {new Date(intervention.created_at).toLocaleDateString('fr-FR')}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Scheduled Date */}
                  {intervention.scheduled_date && (
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-7 h-7 bg-emerald-100 rounded flex items-center justify-center">
                        <Calendar className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div>
                        <div className="text-xs text-slate-500">Programmée</div>
                        <div className="text-slate-700 font-medium">
                          {new Date(intervention.scheduled_date).toLocaleDateString('fr-FR')}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 sm:flex-none"
                    onClick={(e) => {
                      e.stopPropagation()
                      router.push(getInterventionUrl(intervention.id))
                    }}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Voir les détails
                  </Button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

/**
 * ✶ Insight ─────────────────────────────────────
 *
 * **Progressive Disclosure Pattern:**
 *
 * This component follows the "progressive disclosure" UX principle:
 * show essential information first, reveal details on demand.
 *
 * Compact row shows:
 * - Title (most important)
 * - Status (current state)
 * - Type + Urgency badges (quick scan)
 * - Location + created date (context)
 *
 * Expanded row adds:
 * - Full description (complete context)
 * - Scheduled date (planning info)
 * - Action buttons (next steps)
 *
 * **Mobile-First Advantages:**
 * - No horizontal scroll (fits all screen sizes)
 * - Large touch targets (entire row clickable)
 * - Reduced cognitive load (only show what's needed)
 * - Fast scanning (compact rows = see more at once)
 *
 * **When to Choose V2 over V1:**
 * Use compact rows when:
 * - Mobile users are primary audience
 * - Touch interaction is common
 * - Users browse one intervention at a time
 * - Screen space is limited
 * - Progressive exploration is preferred over bulk comparison
 *
 * ─────────────────────────────────────────────────
 */
