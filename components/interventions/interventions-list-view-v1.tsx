"use client"

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Eye,
  MoreVertical,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Building2,
  MapPin,
  Clock,
  Calendar
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
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
 * 📊 INTERVENTIONS LIST VIEW V1 - TABLE DENSE (RECOMMENDED)
 *
 * **Design Philosophy:**
 * - Dense table format maximizing information density
 * - Sortable columns for data exploration
 * - Horizontal scrolling on mobile
 * - Sticky header for long lists
 *
 * **Pros:**
 * ✅ High information density (see many interventions at once)
 * ✅ Sortable columns (find specific data quickly)
 * ✅ Scannable rows (compare interventions easily)
 * ✅ Professional appearance (enterprise-grade)
 * ✅ Efficient for power users
 *
 * **Cons:**
 * ❌ Requires horizontal scroll on mobile
 * ❌ Less visual hierarchy than cards
 * ❌ Reduced touch targets on small screens
 *
 * **Best for:**
 * - Desktop users managing many interventions
 * - Power users who need to scan and compare data
 * - Professional/enterprise contexts
 * - Data analysis and reporting workflows
 */

interface InterventionsListViewV1Props {
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

type SortField =
  | 'title'
  | 'status'
  | 'urgency'
  | 'type'
  | 'location'
  | 'created_at'
  | 'scheduled_date'

type SortDirection = 'asc' | 'desc' | null

export function InterventionsListViewV1({
  interventions,
  userContext,
  loading = false,
  userId,
  className
}: InterventionsListViewV1Props) {
  const router = useRouter()

  // Sorting state
  const [sortField, setSortField] = useState<SortField | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)

  /**
   * 🔄 Handle column sort
   */
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Cycle through: asc → desc → null
      if (sortDirection === 'asc') {
        setSortDirection('desc')
      } else if (sortDirection === 'desc') {
        setSortField(null)
        setSortDirection(null)
      }
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  /**
   * 📊 Sorted interventions
   */
  const sortedInterventions = useMemo(() => {
    if (!sortField || !sortDirection) {
      return interventions
    }

    return [...interventions].sort((a, b) => {
      let aValue: any = a[sortField]
      let bValue: any = b[sortField]

      // Special handling for location field
      if (sortField === 'location') {
        aValue = getInterventionLocationText(a as any)
        bValue = getInterventionLocationText(b as any)
      }

      // Handle null values
      if (aValue == null) return 1
      if (bValue == null) return -1

      // String comparison
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      }

      // Date comparison
      if (sortField.includes('_at') || sortField.includes('_date')) {
        const aDate = new Date(aValue).getTime()
        const bDate = new Date(bValue).getTime()
        return sortDirection === 'asc' ? aDate - bDate : bDate - aDate
      }

      // Default comparison
      return sortDirection === 'asc'
        ? aValue > bValue ? 1 : -1
        : bValue > aValue ? 1 : -1
    })
  }, [interventions, sortField, sortDirection])

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

  /**
   * 📐 Render sort icon
   */
  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3.5 w-3.5 ml-1 text-slate-400" />
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="h-3.5 w-3.5 ml-1 text-blue-600" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 ml-1 text-blue-600" />
    )
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 bg-gray-200 rounded" />
        ))}
      </div>
    )
  }

  return (
    <div className={`rounded-md border ${className}`}>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-slate-50 sticky top-0 z-10">
            <TableRow>
              {/* Title Column - Sortable */}
              <TableHead className="w-[250px]">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 hover:bg-slate-100 font-semibold"
                  onClick={() => handleSort('title')}
                >
                  Titre
                  {renderSortIcon('title')}
                </Button>
              </TableHead>

              {/* Type Column - Sortable */}
              <TableHead className="w-[120px]">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 hover:bg-slate-100 font-semibold"
                  onClick={() => handleSort('type')}
                >
                  Type
                  {renderSortIcon('type')}
                </Button>
              </TableHead>

              {/* Urgency Column - Sortable */}
              <TableHead className="w-[110px]">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 hover:bg-slate-100 font-semibold"
                  onClick={() => handleSort('urgency')}
                >
                  Urgence
                  {renderSortIcon('urgency')}
                </Button>
              </TableHead>

              {/* Status Column - Sortable */}
              <TableHead className="w-[130px]">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 hover:bg-slate-100 font-semibold"
                  onClick={() => handleSort('status')}
                >
                  Statut
                  {renderSortIcon('status')}
                </Button>
              </TableHead>

              {/* Location Column - Sortable */}
              <TableHead className="w-[200px]">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 hover:bg-slate-100 font-semibold"
                  onClick={() => handleSort('location')}
                >
                  Localisation
                  {renderSortIcon('location')}
                </Button>
              </TableHead>

              {/* Created Date - Sortable */}
              <TableHead className="w-[110px]">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 hover:bg-slate-100 font-semibold"
                  onClick={() => handleSort('created_at')}
                >
                  Créée
                  {renderSortIcon('created_at')}
                </Button>
              </TableHead>

              {/* Scheduled Date - Sortable */}
              <TableHead className="w-[110px]">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 hover:bg-slate-100 font-semibold"
                  onClick={() => handleSort('scheduled_date')}
                >
                  Programmée
                  {renderSortIcon('scheduled_date')}
                </Button>
              </TableHead>

              {/* Actions Column - Not sortable */}
              <TableHead className="w-[100px] text-right">
                <span className="font-semibold">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {sortedInterventions.map((intervention) => {
              const isAlert = shouldShowAlertBadge(intervention as any, userContext, userId)
              const locationText = getInterventionLocationText(intervention as any)
              const locationIcon = getInterventionLocationIcon(intervention as any)

              return (
                <TableRow
                  key={intervention.id}
                  className="hover:bg-slate-50 cursor-pointer transition-colors"
                  onClick={() => router.push(getInterventionUrl(intervention.id))}
                >
                  {/* Title Cell */}
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {isAlert && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0" aria-label="Action requise" role="img" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Action requise</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      <span className="truncate">{intervention.title}</span>
                    </div>
                  </TableCell>

                  {/* Type Cell */}
                  <TableCell>
                    <Badge className={`${getTypeBadgeColor(intervention.type || 'autre')} text-xs border`}>
                      {getTypeLabel(intervention.type || 'autre')}
                    </Badge>
                  </TableCell>

                  {/* Urgency Cell */}
                  <TableCell>
                    <Badge className={`${getPriorityColor(intervention.urgency || 'normale')} text-xs`}>
                      {getPriorityLabel(intervention.urgency || 'normale')}
                    </Badge>
                  </TableCell>

                  {/* Status Cell */}
                  <TableCell>
                    <Badge className={`${getStatusColor(intervention.status)} text-xs`}>
                      {getStatusLabel(intervention.status)}
                    </Badge>
                  </TableCell>

                  {/* Location Cell */}
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-sm text-slate-600">
                      {locationIcon === 'building' ? (
                        <Building2 className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
                      ) : (
                        <MapPin className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
                      )}
                      <span className="truncate">{locationText}</span>
                    </div>
                  </TableCell>

                  {/* Created Date Cell */}
                  <TableCell className="text-sm text-slate-600">
                    {intervention.created_at
                      ? new Date(intervention.created_at).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit'
                        })
                      : '-'}
                  </TableCell>

                  {/* Scheduled Date Cell */}
                  <TableCell className="text-sm text-slate-600">
                    {intervention.scheduled_date
                      ? new Date(intervention.scheduled_date).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit'
                        })
                      : '-'}
                  </TableCell>

                  {/* Actions Cell */}
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={(e) => {
                                e.stopPropagation()
                                router.push(getInterventionUrl(intervention.id))
                              }}
                              aria-label="Voir les détails"
                            >
                              <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Voir les détails</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={(e) => e.stopPropagation()}
                            aria-label="Plus d'actions"
                          >
                            <MoreVertical className="h-3.5 w-3.5" aria-hidden="true" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => router.push(getInterventionUrl(intervention.id))}>
                            <Eye className="h-4 w-4 mr-2" aria-hidden="true" />
                            Voir les détails
                          </DropdownMenuItem>
                          {/* Add more actions as needed */}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

/**
 * ✶ Insight ─────────────────────────────────────
 *
 * **Table vs Card Trade-offs:**
 *
 * Tables excel at:
 * - Information density (see 10-15 items vs 3-5 cards in same space)
 * - Sorting and comparison (click column headers)
 * - Scanning for specific values (eyes move horizontally)
 * - Professional appearance (enterprise users expect tables)
 *
 * Cards excel at:
 * - Visual hierarchy (colors, icons, spacing)
 * - Touch-friendly targets (larger click areas)
 * - Mobile-first design (no horizontal scroll)
 * - Rich content (descriptions, images, multiple actions)
 *
 * **When to Use Table View:**
 * - User managing 20+ interventions regularly
 * - Need to sort/filter by multiple criteria
 * - Desktop-primary workflow
 * - Data-driven decision making
 *
 * **Sticky Header Pattern:**
 * The sticky header (position: sticky, top: 0) keeps column headers
 * visible during scroll, crucial for maintaining context when viewing
 * long lists. The z-10 ensures it stays above table body content.
 *
 * ─────────────────────────────────────────────────
 */
