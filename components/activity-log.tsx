"use client"

import { 
  Calendar,
  User,
  Building,
  Home,
  UserPlus,
  FileText,
  Settings,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Upload,
  Download,
  Mail,
  LogIn,
  LogOut,
  Edit,
  Trash2,
  Plus,
  UserCheck,
  UserX,
  UserCog,
  Eye
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

// Types basés sur notre schema DB
type ActivityActionType = 'create' | 'update' | 'delete' | 'assign' | 'unassign' | 'approve' | 'reject' | 'complete' | 'cancel' | 'upload' | 'download' | 'invite' | 'accept_invite' | 'status_change' | 'login' | 'logout'
type ActivityEntityType = 'user' | 'team' | 'team_member' | 'building' | 'lot' | 'contact' | 'intervention' | 'document' | 'invitation' | 'session'
type ActivityStatus = 'success' | 'failed' | 'in_progress' | 'cancelled'

interface ActivityLogEntry {
  id: string
  team_id: string
  user_id: string
  action_type: ActivityActionType
  entity_type: ActivityEntityType
  entity_id?: string
  entity_name?: string
  status: ActivityStatus
  description: string
  error_message?: string
  metadata?: Record<string, any>
  ip_address?: string
  user_agent?: string
  created_at: string
  updated_at: string
  // From the view
  user_name: string
  user_email: string
  user_role: string
  team_name: string
}

interface ActivityLogProps {
  activities: ActivityLogEntry[]
  loading?: boolean
  error?: string
}

// Fonction pour obtenir l'icône selon l'action et l'entité
const getActivityIcon = (actionType: ActivityActionType, entityType: ActivityEntityType, status: ActivityStatus) => {
  const iconClass = `h-4 w-4 ${getStatusColor(status)}`
  
  // Priorité au statut pour les couleurs d'erreur
  if (status === 'failed') {
    return <XCircle className={`h-4 w-4 text-red-500`} />
  }
  if (status === 'in_progress') {
    return <Clock className={`h-4 w-4 text-amber-500`} />
  }

  // Icônes par type d'action
  switch (actionType) {
    case 'create':
      return <Plus className={iconClass} />
    case 'update':
      return <Edit className={iconClass} />
    case 'delete':
      return <Trash2 className={`h-4 w-4 text-red-500`} />
    case 'assign':
      return <UserCheck className={iconClass} />
    case 'unassign':
      return <UserX className={iconClass} />
    case 'approve':
      return <CheckCircle className={`h-4 w-4 text-emerald-500`} />
    case 'reject':
      return <XCircle className={`h-4 w-4 text-red-500`} />
    case 'complete':
      return <CheckCircle className={`h-4 w-4 text-emerald-500`} />
    case 'upload':
      return <Upload className={iconClass} />
    case 'download':
      return <Download className={iconClass} />
    case 'invite':
      return <Mail className={iconClass} />
    case 'accept_invite':
      return <UserPlus className={`h-4 w-4 text-emerald-500`} />
    case 'login':
      return <LogIn className={`h-4 w-4 text-blue-500`} />
    case 'logout':
      return <LogOut className={`h-4 w-4 text-slate-500`} />
    case 'status_change':
      return <Settings className={iconClass} />
    default:
      return <Eye className={iconClass} />
  }
}

// Couleurs selon le statut
const getStatusColor = (status: ActivityStatus) => {
  switch (status) {
    case 'success':
      return 'text-emerald-600'
    case 'failed':
      return 'text-red-600'
    case 'in_progress':
      return 'text-amber-600'
    case 'cancelled':
      return 'text-slate-500'
    default:
      return 'text-slate-600'
  }
}

// Badge de statut
const getStatusBadge = (status: ActivityStatus) => {
  const variants = {
    success: 'default' as const,
    failed: 'destructive' as const,
    in_progress: 'secondary' as const,
    cancelled: 'outline' as const,
  }

  const labels = {
    success: 'Réussi',
    failed: 'Échec',
    in_progress: 'En cours',
    cancelled: 'Annulé',
  }

  return (
    <Badge variant={variants[status]} className="text-xs">
      {labels[status]}
    </Badge>
  )
}

// Icône pour le type d'entité
const getEntityIcon = (entityType: ActivityEntityType) => {
  const iconClass = "h-3 w-3"
  
  switch (entityType) {
    case 'user':
      return <User className={iconClass} />
    case 'team':
      return <UserCog className={iconClass} />
    case 'building':
      return <Building className={iconClass} />
    case 'lot':
      return <Home className={iconClass} />
    case 'contact':
      return <User className={iconClass} />
    case 'intervention':
      return <Settings className={iconClass} />
    case 'document':
      return <FileText className={iconClass} />
    case 'invitation':
      return <Mail className={iconClass} />
    default:
      return <Eye className={iconClass} />
  }
}

// Formater la date selon notre design (similaire à la photo)
const formatActivityDate = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
  
  if (diffInMinutes < 60) {
    return `${diffInMinutes} min ago`
  } else if (diffInMinutes < 1440) {
    const hours = Math.floor(diffInMinutes / 60)
    return `${hours}h ago`
  } else {
    return date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit"
    })
  }
}

// Obtenir les initiales pour l'avatar
const getUserInitials = (name: string) => {
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export default function ActivityLog({ activities, loading, error }: ActivityLogProps) {
  if (loading) {
    return (
      <div className="space-y-2 sm:space-y-3">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-slate-200 rounded-full flex-shrink-0"></div>
                <div className="flex-1 space-y-1.5 sm:space-y-2 min-w-0">
                  <div className="h-3 sm:h-4 bg-slate-200 rounded w-full max-w-xs"></div>
                  <div className="h-2.5 sm:h-3 bg-slate-200 rounded w-full max-w-sm"></div>
                </div>
                <div className="h-5 w-12 sm:h-6 sm:w-16 bg-slate-200 rounded flex-shrink-0"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-4 sm:p-6 text-center">
          <AlertTriangle className="h-6 w-6 sm:h-8 sm:w-8 text-red-500 mx-auto mb-2 sm:mb-3" />
          <h3 className="text-base sm:text-lg font-medium text-red-900 mb-1 sm:mb-2">Erreur de chargement</h3>
          <p className="text-sm sm:text-base text-red-700 px-2">{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (!activities || activities.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 sm:p-8 text-center">
          <Clock className="h-8 w-8 sm:h-12 sm:w-12 text-slate-400 mx-auto mb-3 sm:mb-4" />
          <h3 className="text-base sm:text-lg font-medium text-slate-900 mb-1 sm:mb-2">Aucune activité</h3>
          <p className="text-sm sm:text-base text-slate-600 px-2">Aucune activité récente à afficher pour votre équipe.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-1 sm:space-y-1">
      {activities.map((activity, index) => (
        <Card 
          key={activity.id} 
          className={`transition-all hover:shadow-sm border-l-4 ${
            activity.status === 'failed' ? 'border-l-red-500 bg-red-50/30' :
            activity.status === 'in_progress' ? 'border-l-amber-500 bg-amber-50/30' :
            activity.status === 'success' ? 'border-l-emerald-500 bg-emerald-50/20' :
            'border-l-slate-300'
          }`}
        >
          <CardContent className="p-2.5 sm:p-3">
            <div className="flex items-start gap-2 sm:gap-3">
              {/* Avatar utilisateur */}
              <Avatar className="w-6 h-6 sm:w-8 sm:h-8 flex-shrink-0">
                <AvatarFallback className="text-xs bg-slate-100 text-slate-600">
                  {getUserInitials(activity.user_name)}
                </AvatarFallback>
              </Avatar>

              {/* Contenu principal */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-1 sm:gap-2">
                  <div className="flex-1 min-w-0">
                    {/* Ligne principale avec nom et action - responsive */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
                      <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                        <span className="text-xs sm:text-sm font-medium text-slate-900 truncate">
                          {activity.user_name}
                        </span>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {getActivityIcon(activity.action_type, activity.entity_type, activity.status)}
                          <span className="text-xs sm:text-sm text-slate-600 font-medium">
                            {activity.action_type}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Description de l'activité */}
                    <p className="text-xs sm:text-sm text-slate-700 mb-1 sm:mb-1.5 break-words overflow-hidden" 
                       style={{
                         display: '-webkit-box',
                         WebkitLineClamp: 2,
                         WebkitBoxOrient: 'vertical' as const
                       }}>
                      {activity.description}
                    </p>

                    {/* Message d'erreur si échec */}
                    {activity.status === 'failed' && activity.error_message && (
                      <p className="text-xs text-red-600 mb-1.5 italic">
                        {activity.error_message}
                      </p>
                    )}

                    {/* Tags informatifs */}
                    <div className="flex flex-wrap gap-0.5 sm:gap-1">
                      {/* Timestamp */}
                      <div className="flex items-center gap-1 bg-slate-100 px-1 sm:px-1.5 py-0.5 rounded-full">
                        <Calendar className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-slate-500 flex-shrink-0" />
                        <span className="text-xs text-slate-600 whitespace-nowrap">
                          {formatActivityDate(activity.created_at)}
                        </span>
                      </div>

                      {/* Entité concernée */}
                      {activity.entity_name && (
                        <div className="flex items-center gap-1 bg-blue-100 px-1 sm:px-1.5 py-0.5 rounded-full">
                          {getEntityIcon(activity.entity_type)}
                          <span className="text-xs text-blue-700 truncate max-w-[60px] sm:max-w-none">
                            {activity.entity_name}
                          </span>
                        </div>
                      )}

                      {/* Rôle utilisateur */}
                      <div className="flex items-center gap-1 bg-purple-100 px-1 sm:px-1.5 py-0.5 rounded-full">
                        <User className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-purple-600 flex-shrink-0" />
                        <span className="text-xs text-purple-700 capitalize whitespace-nowrap">
                          {activity.user_role}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Badge de statut */}
                  <div className="flex-shrink-0 self-start sm:self-center">
                    {getStatusBadge(activity.status)}
                  </div>
                </div>
              </div>
            </div>

            {/* Métadonnées additionnelles si présentes */}
            {activity.metadata && Object.keys(activity.metadata).length > 0 && (
              <div className="mt-2 pl-6 sm:pl-11">
                <details className="text-xs text-slate-500">
                  <summary className="cursor-pointer hover:text-slate-700 text-xs sm:text-sm">
                    Détails techniques
                  </summary>
                  <pre className="mt-1 text-xs bg-slate-50 p-2 rounded overflow-x-auto max-w-full">
                    {JSON.stringify(activity.metadata, null, 2)}
                  </pre>
                </details>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
