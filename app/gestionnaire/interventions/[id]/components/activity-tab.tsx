'use client'

/**
 * Activity Tab Component
 * Displays intervention activity log
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Activity,
  User,
  Calendar,
  Clock,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  MessageSquare,
  Upload,
  DollarSign,
  UserPlus,
  UserMinus,
  Edit
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { Database } from '@/lib/database.types'

type ActivityLog = Database['public']['Tables']['activity_logs']['Row'] & {
  user?: Database['public']['Tables']['users']['Row']
}

interface ActivityTabProps {
  activityLogs: ActivityLog[]
}

// Activity icons
const activityIcons: Record<string, typeof Activity> = {
  'create': FileText,
  'update': Edit,
  'delete': XCircle,
  'view': Activity,
  'assign': UserPlus,
  'unassign': UserMinus,
  'approve': CheckCircle,
  'reject': XCircle,
  'upload': Upload,
  'download': Activity,
  'share': Activity,
  'comment': MessageSquare,
  'status_change': AlertCircle,
  'send_notification': MessageSquare
}

// Activity colors
const activityColors: Record<string, string> = {
  'create': 'bg-green-100 text-green-800',
  'update': 'bg-blue-100 text-blue-800',
  'delete': 'bg-red-100 text-red-800',
  'approve': 'bg-green-100 text-green-800',
  'reject': 'bg-red-100 text-red-800',
  'assign': 'bg-purple-100 text-purple-800',
  'unassign': 'bg-orange-100 text-orange-800',
  'status_change': 'bg-yellow-100 text-yellow-800'
}

// Status colors
const statusColors: Record<string, string> = {
  'success': 'bg-green-100 text-green-800',
  'failure': 'bg-red-100 text-red-800',
  'pending': 'bg-yellow-100 text-yellow-800'
}

export function ActivityTab({ activityLogs }: ActivityTabProps) {
  // Get user initials
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  // Format activity description
  const formatDescription = (log: ActivityLog) => {
    // Parse metadata for additional context
    const metadata = log.metadata as any
    let description = log.description

    // Add context from metadata
    if (metadata) {
      if (metadata.old_status && metadata.new_status) {
        description += ` de "${metadata.old_status}" à "${metadata.new_status}"`
      }
      if (metadata.assigned_user) {
        description += ` - ${metadata.assigned_user}`
      }
      if (metadata.amount) {
        description += ` - ${metadata.amount}€`
      }
    }

    return description
  }

  // Group activities by date
  const groupedLogs = activityLogs.reduce((acc, log) => {
    const date = format(new Date(log.created_at), 'yyyy-MM-dd')
    if (!acc[date]) acc[date] = []
    acc[date].push(log)
    return acc
  }, {} as Record<string, ActivityLog[]>)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Historique d'activité
        </CardTitle>
      </CardHeader>

      <CardContent>
        {activityLogs.length === 0 ? (
          <div className="text-center py-12">
            <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium text-muted-foreground mb-2">
              Aucune activité
            </p>
            <p className="text-sm text-muted-foreground">
              L'historique des actions apparaîtra ici
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedLogs).map(([date, logs]) => (
              <div key={date} className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground sticky top-0 bg-background py-2">
                  {format(new Date(date), 'EEEE dd MMMM yyyy', { locale: fr })}
                </h3>

                <div className="space-y-4">
                  {logs.map((log) => {
                    const Icon = activityIcons[log.action_type] || Activity
                    const color = activityColors[log.action_type] || 'bg-gray-100 text-gray-800'

                    return (
                      <div
                        key={log.id}
                        className="flex gap-4 relative"
                      >
                        {/* Timeline line */}
                        <div className="absolute left-5 top-10 bottom-0 w-px bg-border" />

                        {/* Avatar */}
                        <div className="relative z-10 flex-shrink-0">
                          <Avatar className="h-10 w-10 border-2 border-background">
                            {log.user?.avatar_url && (
                              <AvatarImage src={log.user.avatar_url} />
                            )}
                            <AvatarFallback className="text-xs">
                              {log.user ? getInitials(log.user.name) : '?'}
                            </AvatarFallback>
                          </Avatar>
                        </div>

                        {/* Content */}
                        <div className="flex-1 space-y-2 pb-6">
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-medium">
                                  {log.user?.name || 'Système'}
                                </p>
                                <Badge variant="outline" className={`text-xs ${color}`}>
                                  <Icon className="w-3 h-3 mr-1" />
                                  {log.action_type.replace('_', ' ')}
                                </Badge>
                                <Badge
                                  variant="outline"
                                  className={`text-xs ${statusColors[log.status]}`}
                                >
                                  {log.status === 'success' ? 'Succès' : log.status === 'failure' ? 'Échec' : 'En attente'}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {formatDescription(log)}
                              </p>
                              {log.error_message && (
                                <p className="text-sm text-red-600">
                                  Erreur: {log.error_message}
                                </p>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1 flex-shrink-0">
                              <Clock className="w-3 h-3" />
                              <span>
                                {formatDistanceToNow(new Date(log.created_at), {
                                  addSuffix: true,
                                  locale: fr
                                })}
                              </span>
                            </div>
                          </div>

                          {/* Metadata details */}
                          {log.metadata && Object.keys(log.metadata).length > 0 && (
                            <div className="pl-2 border-l-2 border-muted">
                              <div className="text-xs text-muted-foreground space-y-1">
                                {Object.entries(log.metadata as any).map(([key, value]) => (
                                  <div key={key} className="flex gap-2">
                                    <span className="font-medium">{key}:</span>
                                    <span>{String(value)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}