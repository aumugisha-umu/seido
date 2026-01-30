'use client'

/**
 * EntityActivityLog - Unified activity log component for all entity types
 *
 * Features:
 * - Hierarchical activity loading (entity + related entities)
 * - Timeline-style vertical layout
 * - Grouping by date
 * - Source entity context display
 * - Optimized via RPC function
 *
 * @example
 * <EntityActivityLog
 *   entityType="building"
 *   entityId={building.id}
 *   teamId={teamId}
 * />
 */

import { useMemo } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  Activity,
  Building2,
  Home,
  FileText,
  User,
  Wrench,
  Calendar,
  Clock,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  UserPlus,
  UserMinus,
  Upload,
  Mail,
  AlertTriangle,
  Eye
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useActivityLogs } from '@/hooks/use-activity-logs'
import type { EntityActivityLogProps, ActivityLogEntry, GroupedActivityLogs } from './types'

// ============================================================================
// Constants
// ============================================================================

/** Icon mapping by action type */
const ACTION_ICONS: Record<string, typeof Activity> = {
  create: Plus,
  update: Edit,
  delete: Trash2,
  assign: UserPlus,
  unassign: UserMinus,
  approve: CheckCircle,
  reject: XCircle,
  complete: CheckCircle,
  cancel: XCircle,
  upload: Upload,
  download: Activity,
  invite: Mail,
  accept_invite: UserPlus,
  status_change: Activity,
  send_notification: Mail,
  login: Activity,
  logout: Activity,
  import: Activity
}

/** Color mapping by action type */
const ACTION_COLORS: Record<string, string> = {
  create: 'bg-green-100 text-green-700 border-green-200',
  update: 'bg-blue-100 text-blue-700 border-blue-200',
  delete: 'bg-red-100 text-red-700 border-red-200',
  approve: 'bg-green-100 text-green-700 border-green-200',
  reject: 'bg-red-100 text-red-700 border-red-200',
  assign: 'bg-purple-100 text-purple-700 border-purple-200',
  unassign: 'bg-orange-100 text-orange-700 border-orange-200',
  status_change: 'bg-amber-100 text-amber-700 border-amber-200',
  complete: 'bg-green-100 text-green-700 border-green-200',
  cancel: 'bg-slate-100 text-slate-700 border-slate-200'
}

/** Status badge configuration */
const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  success: { label: 'Succès', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  failure: { label: 'Échec', className: 'bg-red-100 text-red-700 border-red-200' },
  pending: { label: 'En attente', className: 'bg-amber-100 text-amber-700 border-amber-200' }
}

/** Entity type icons and colors for context display */
const ENTITY_CONFIG: Record<string, { icon: typeof Activity; color: string; label: string }> = {
  building: { icon: Building2, color: 'text-blue-600 bg-blue-50', label: 'Immeuble' },
  lot: { icon: Home, color: 'text-amber-600 bg-amber-50', label: 'Lot' },
  contract: { icon: FileText, color: 'text-green-600 bg-green-50', label: 'Contrat' },
  contact: { icon: User, color: 'text-purple-600 bg-purple-50', label: 'Contact' },
  intervention: { icon: Wrench, color: 'text-orange-600 bg-orange-50', label: 'Intervention' }
}

/** Entity URL mapping */
const getEntityUrl = (entityType: string, entityId?: string | null): string | null => {
  if (!entityId) return null
  const routes: Record<string, string> = {
    building: `/gestionnaire/biens/immeubles/${entityId}`,
    lot: `/gestionnaire/biens/lots/${entityId}`,
    contract: `/gestionnaire/contrats/${entityId}`,
    contact: `/gestionnaire/contacts/details/${entityId}`,
    intervention: `/gestionnaire/interventions/${entityId}`
  }
  return routes[entityType] || null
}

// ============================================================================
// Helper Functions
// ============================================================================

/** Get user initials for avatar */
const getInitials = (name: string | null): string => {
  if (!name) return '?'
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

/** Group activity logs by date */
const groupLogsByDate = (logs: ActivityLogEntry[]): GroupedActivityLogs[] => {
  const groups: Record<string, ActivityLogEntry[]> = {}

  for (const log of logs) {
    const date = format(new Date(log.created_at), 'yyyy-MM-dd')
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(log)
  }

  return Object.entries(groups).map(([date, logs]) => ({
    date,
    dateLabel: format(new Date(date), 'EEEE dd MMMM yyyy', { locale: fr }),
    logs
  }))
}

// ============================================================================
// Sub-components
// ============================================================================

/** Single activity log entry */
function ActivityLogItem({
  log,
  showEntityLinks,
  showMetadata,
  isLast
}: {
  log: ActivityLogEntry
  showEntityLinks: boolean
  showMetadata: boolean
  isLast: boolean
}) {
  const ActionIcon = ACTION_ICONS[log.action_type] || Activity
  const actionColor = ACTION_COLORS[log.action_type] || 'bg-slate-100 text-slate-700 border-slate-200'
  const statusConfig = STATUS_CONFIG[log.status] || STATUS_CONFIG.pending
  const entityConfig = log.source_entity_type ? ENTITY_CONFIG[log.source_entity_type] : null
  const EntityIcon = entityConfig?.icon || Activity

  const entityUrl = showEntityLinks && log.entity_id
    ? getEntityUrl(log.entity_type, log.entity_id)
    : null

  return (
    <div className="flex gap-3 relative">
      {/* Timeline line */}
      {!isLast && (
        <div className="absolute left-[18px] top-10 bottom-0 w-px bg-slate-200" />
      )}

      {/* Avatar */}
      <div className="relative z-10 flex-shrink-0">
        <Avatar className="h-9 w-9 border-2 border-white shadow-sm">
          {log.user_avatar_url && <AvatarImage src={log.user_avatar_url} />}
          <AvatarFallback className="text-xs bg-slate-100 text-slate-600">
            {getInitials(log.user_name)}
          </AvatarFallback>
        </Avatar>
      </div>

      {/* Content */}
      <div className="flex-1 pb-6 min-w-0">
        {/* Header: User name + time */}
        <div className="flex items-start justify-between gap-2 mb-1">
          <span className="text-sm font-medium text-slate-900 truncate">
            {log.user_name || 'Système'}
          </span>
          <span className="text-xs text-slate-500 flex items-center gap-1 flex-shrink-0">
            <Clock className="h-3 w-3" />
            {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: fr })}
          </span>
        </div>

        {/* Description */}
        <p className="text-sm text-slate-700 mb-2">
          {log.description}
        </p>

        {/* Badges row */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Action badge */}
          <Badge variant="outline" className={cn('text-xs', actionColor)}>
            <ActionIcon className="h-3 w-3 mr-1" />
            {log.action_type.replace('_', ' ')}
          </Badge>

          {/* Status badge */}
          <Badge variant="outline" className={cn('text-xs', statusConfig.className)}>
            {statusConfig.label}
          </Badge>

          {/* Source entity context (if from related entity) */}
          {entityConfig && log.source_entity_name && (
            <div className={cn(
              'flex items-center gap-1 px-2 py-0.5 rounded-full text-xs',
              entityConfig.color
            )}>
              <EntityIcon className="h-3 w-3" />
              <span className="truncate max-w-[150px]">{log.source_entity_name}</span>
            </div>
          )}

          {/* Entity link */}
          {entityUrl && (
            <Link
              href={entityUrl}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            >
              <Eye className="h-3 w-3" />
              <span>Voir</span>
            </Link>
          )}
        </div>

        {/* Error message */}
        {log.status === 'failure' && log.error_message && (
          <p className="text-xs text-red-600 mt-2 italic">
            Erreur: {log.error_message}
          </p>
        )}

        {/* Metadata (collapsible) */}
        {showMetadata && log.metadata && Object.keys(log.metadata).length > 0 && (
          <details className="mt-2 text-xs text-slate-500">
            <summary className="cursor-pointer hover:text-slate-700">
              Détails techniques
            </summary>
            <pre className="mt-1 bg-slate-50 p-2 rounded text-xs overflow-x-auto">
              {JSON.stringify(log.metadata, null, 2)}
            </pre>
          </details>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function EntityActivityLog({
  entityType,
  entityId,
  teamId,
  includeRelated = true,
  showEntityLinks = true,
  showMetadata = false,
  emptyMessage = "Aucune activité enregistrée",
  className
}: EntityActivityLogProps) {
  // Fetch activity logs
  const { activities, loading, error } = useActivityLogs({
    teamId,
    entityType,
    entityId,
    includeRelated,
    limit: 100
  })

  // Group by date
  const groupedLogs = useMemo(() => {
    return groupLogsByDate(activities as ActivityLogEntry[])
  }, [activities])

  // Loading state
  if (loading) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Activity className="h-4 w-4 animate-spin" />
          Chargement de l'historique...
        </div>
        {/* Skeleton */}
        {[1, 2, 3].map(i => (
          <div key={i} className="flex gap-3 animate-pulse">
            <div className="h-9 w-9 rounded-full bg-slate-200" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-slate-200 rounded w-1/3" />
              <div className="h-3 bg-slate-200 rounded w-2/3" />
              <div className="flex gap-2">
                <div className="h-5 w-16 bg-slate-200 rounded-full" />
                <div className="h-5 w-12 bg-slate-200 rounded-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-8 text-center', className)}>
        <AlertTriangle className="h-10 w-10 text-red-400 mb-3" />
        <p className="text-sm font-medium text-red-600 mb-1">Erreur de chargement</p>
        <p className="text-xs text-red-500">{error}</p>
      </div>
    )
  }

  // Empty state
  if (groupedLogs.length === 0) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-12 text-center', className)}>
        <Activity className="h-12 w-12 text-slate-300 mb-4" />
        <p className="text-sm font-medium text-slate-600 mb-1">Aucune activité</p>
        <p className="text-xs text-slate-500">{emptyMessage}</p>
      </div>
    )
  }

  // Activity log
  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <Activity className="h-5 w-5 text-muted-foreground" />
        <h3 className="text-base font-semibold">Historique d'activité</h3>
        <Badge variant="secondary" className="text-xs">
          {activities.length}
        </Badge>
      </div>

      {/* Grouped logs */}
      {groupedLogs.map((group) => (
        <div key={group.date} className="space-y-3">
          {/* Date header */}
          <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide sticky top-0 bg-white py-1">
            {group.dateLabel}
          </h4>

          {/* Logs for this date */}
          <div className="space-y-0">
            {group.logs.map((log, index) => (
              <ActivityLogItem
                key={log.id}
                log={log}
                showEntityLinks={showEntityLinks}
                showMetadata={showMetadata}
                isLast={index === group.logs.length - 1}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
