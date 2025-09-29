import { Shield, Clock, Euro, Building, User, AlertTriangle, CheckCircle2, XCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

interface FinalizationHeaderProps {
  intervention: {
    id: string
    reference: string
    title: string
    type: string
    urgency: string
    status: string
    final_cost?: number
    created_at: string
    lot?: {
      reference: string
      building: {
        name: string
      }
    }
    tenant?: {
      name: string
      email: string
    }
  }
  className?: string
  compact?: boolean // New prop for mobile optimization
}

export const FinalizationHeader = ({ intervention, className, compact = false }: FinalizationHeaderProps) => {
  const getStatusBadge = (_status: string) => {
    const statusConfig = {
      'cloturee_par_prestataire': {
        label: "Terminée par prestataire",
        icon: Clock,
        className: "bg-blue-100 text-blue-800 border-blue-200"
      },
      'cloturee_par_locataire': {
        label: "Validée par locataire",
        icon: CheckCircle2,
        className: "bg-green-100 text-green-800 border-green-200"
      },
      'contestee': {
        label: "Contestée",
        icon: XCircle,
        className: "bg-red-100 text-red-800 border-red-200"
      }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || {
      label: status,
      icon: AlertTriangle,
      className: "bg-gray-100 text-gray-800 border-gray-200"
    }

    const IconComponent = config.icon

    return (
      <Badge variant="outline" className={cn("px-3 py-1.5 font-medium border", config.className)}>
        <IconComponent className="h-3.5 w-3.5 mr-1.5" />
        {config.label}
      </Badge>
    )
  }

  const getUrgencyBadge = (_urgency: string) => {
    const isUrgent = urgency === 'urgent' || urgency === 'urgente'
    return (
      <Badge
        variant={isUrgent ? "destructive" : "secondary"}
        className={cn(
          "px-2.5 py-1 text-xs font-medium",
          isUrgent ? "bg-red-600 hover:bg-red-700" : "bg-gray-100 text-gray-700"
        )}
      >
        {urgency.charAt(0).toUpperCase() + urgency.slice(1)}
      </Badge>
    )
  }

  // Mobile compact view - single line with essential info only
  if (compact) {
    return (
      <div className={cn("lg:hidden", className)}>
        <div className="flex items-center justify-between gap-2">
          {/* Left side: Reference and urgency */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Shield className="h-4 w-4 text-sky-600 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-semibold text-gray-900 whitespace-nowrap">
                  {intervention.reference}
                </span>
                {intervention.urgency === 'urgent' && (
                  <Badge
                    variant="destructive"
                    className="h-4 px-1.5 text-[10px] whitespace-nowrap"
                  >
                    URG
                  </Badge>
                )}
              </div>
              <p className="text-[11px] text-gray-600 line-clamp-1">
                {intervention.title}
              </p>
            </div>
          </div>

          {/* Right side: Cost and status (minimal) */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="text-right">
              <p className="text-xs font-bold text-emerald-700">
                {intervention.final_cost?.toFixed(0) || '0'}€
              </p>
              <p className="text-[10px] text-gray-500">
                {intervention.status === 'cloturee_par_locataire' ? '✓ Validé' :
                 intervention.status === 'contestee' ? '⚠ Contesté' : 'En cours'}
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Desktop full view - original layout for larger screens
  return (
    <div className={cn("bg-gradient-to-r from-sky-50/80 to-blue-50/80", className)}>
      <div>
        {/* Mobile compact view for medium screens */}
        <div className="lg:hidden">
          <div className="flex items-center justify-between gap-3">
            {/* Title and reference */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="p-1.5 bg-sky-100 rounded-lg flex-shrink-0">
                <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-sky-600" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-base sm:text-lg font-semibold text-gray-900 leading-tight">
                  Finalisation - {intervention.reference}
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 line-clamp-1">
                  {intervention.title}
                </p>
              </div>
            </div>

            {/* Status badges */}
            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1 sm:gap-2 flex-shrink-0">
              {intervention.urgency === 'urgent' && getUrgencyBadge(intervention.urgency)}
              <div className="hidden sm:block">
                {getStatusBadge(intervention.status)}
              </div>
            </div>
          </div>

          {/* Essential details in compact grid */}
          <div className="grid grid-cols-3 gap-2 mt-3">
            <div>
              <p className="text-[10px] font-medium text-gray-500 uppercase">
                Type
              </p>
              <p className="text-xs font-medium text-gray-900">
                {intervention.type}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-medium text-gray-500 uppercase">
                Coût
              </p>
              <p className="text-xs font-bold text-emerald-700">
                {intervention.final_cost?.toFixed(0) || '0'} €
              </p>
            </div>
            <div>
              <p className="text-[10px] font-medium text-gray-500 uppercase">
                Statut
              </p>
              <p className="text-xs font-medium text-gray-900">
                {intervention.status === 'cloturee_par_locataire' ? 'Validé' :
                 intervention.status === 'contestee' ? 'Contesté' : 'En cours'}
              </p>
            </div>
          </div>
        </div>

        {/* Desktop full view */}
        <div className="hidden lg:block">
          {/* Title Section */}
          <div className="flex items-start justify-between gap-4 mb-6">
            <div className="flex items-start gap-4 flex-1">
              <div className="p-2 bg-sky-100 rounded-lg flex-shrink-0">
                <Shield className="h-6 w-6 text-sky-600" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl font-semibold text-gray-900 leading-tight">
                  Finaliser l'intervention
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  Validation finale et archivage des travaux
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              {getUrgencyBadge(intervention.urgency)}
              {getStatusBadge(intervention.status)}
            </div>
          </div>

          {/* Intervention Details */}
          <div className="grid grid-cols-4 gap-6">
            {/* Reference & Title */}
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Référence
              </p>
              <p className="font-mono text-sm font-semibold text-gray-900">
                {intervention.reference}
              </p>
              <p className="text-sm text-gray-700 line-clamp-2">
                {intervention.title}
              </p>
            </div>

            {/* Type */}
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type d'intervention
              </p>
              <Badge variant="outline" className="w-fit">
                {intervention.type}
              </Badge>
            </div>

            {/* Cost */}
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Coût final
              </p>
              <div className="flex items-center gap-1">
                <Euro className="h-4 w-4 text-emerald-600" />
                <span className="text-lg font-bold text-emerald-700">
                  {intervention.final_cost?.toFixed(2) || '0.00'} €
                </span>
              </div>
            </div>

            {/* Timeline */}
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Créée le
              </p>
              <p className="text-sm font-medium text-gray-700">
                {format(new Date(intervention.created_at), 'dd MMMM yyyy', { locale: fr })}
              </p>
            </div>
          </div>

          {/* Location & Tenant Info */}
          <div className="flex items-center gap-4 mt-6 pt-4 border-t border-gray-200/60">
            {intervention.lot && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Building className="h-4 w-4" />
                <span className="font-medium">
                  {intervention.lot.building?.name || 'Bâtiment'} - Lot {intervention.lot.reference}
                </span>
              </div>
            )}

            {intervention.tenant && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <User className="h-4 w-4" />
                <span className="font-medium">
                  {intervention.tenant.name}
                </span>
                <span className="text-gray-400">•</span>
                <span className="text-gray-500">
                  {intervention.tenant.email}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
