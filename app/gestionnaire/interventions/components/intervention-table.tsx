'use client'

/**
 * Intervention Table Component
 * Client component for displaying interventions in a table format
 */

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ChevronRight,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Calendar,
  User,
  Building2,
  Home
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

// UI Components
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip'
import { Card } from '@/components/ui/card'

// Types
import type { Database } from '@/lib/database.types'

type Intervention = Database['public']['Tables']['interventions']['Row']
type InterventionStatus = Database['public']['Enums']['intervention_status']
type InterventionUrgency = Database['public']['Enums']['intervention_urgency']
type InterventionType = Database['public']['Enums']['intervention_type']
type UserRole = Database['public']['Enums']['user_role']

interface InterventionTableProps {
  interventions: Intervention[]
  userRole: UserRole
}

// Status configuration
const STATUS_CONFIG: Record<InterventionStatus, {
  label: string
  color: string
  icon: React.ComponentType<{ className?: string }>
}> = {
  demande: { label: 'Demande', color: 'bg-gray-500', icon: Clock },
  rejetee: { label: 'Rejetée', color: 'bg-red-500', icon: XCircle },
  approuvee: { label: 'Approuvée', color: 'bg-green-500', icon: CheckCircle },
  demande_de_devis: { label: 'Devis demandé', color: 'bg-yellow-500', icon: AlertTriangle },
  planification: { label: 'Planification', color: 'bg-blue-400', icon: Calendar },
  planifiee: { label: 'Planifiée', color: 'bg-blue-500', icon: Calendar },
  en_cours: { label: 'En cours', color: 'bg-indigo-500', icon: Clock },
  cloturee_par_prestataire: { label: 'Terminée (Prestataire)', color: 'bg-purple-500', icon: CheckCircle },
  cloturee_par_locataire: { label: 'Validée (Locataire)', color: 'bg-purple-600', icon: CheckCircle },
  cloturee_par_gestionnaire: { label: 'Clôturée', color: 'bg-green-600', icon: CheckCircle },
  annulee: { label: 'Annulée', color: 'bg-gray-600', icon: XCircle }
}

// Urgency configuration
const URGENCY_CONFIG: Record<InterventionUrgency, {
  label: string
  color: string
}> = {
  basse: { label: 'Basse', color: 'text-green-600 bg-green-50' },
  normale: { label: 'Normale', color: 'text-blue-600 bg-blue-50' },
  haute: { label: 'Haute', color: 'text-orange-600 bg-orange-50' },
  urgente: { label: 'Urgente', color: 'text-red-600 bg-red-50' }
}

// Type labels
const TYPE_LABELS: Record<InterventionType, string> = {
  plomberie: 'Plomberie',
  electricite: 'Électricité',
  chauffage: 'Chauffage',
  serrurerie: 'Serrurerie',
  peinture: 'Peinture',
  menage: 'Ménage',
  jardinage: 'Jardinage',
  autre: 'Autre'
}

export function InterventionTable({
  interventions,
  userRole
}: InterventionTableProps) {
  const router = useRouter()
  const [hoveredRow, setHoveredRow] = useState<string | null>(null)

  // Navigate to detail page
  const handleRowClick = (id: string) => {
    router.push(`/${userRole}/interventions/${id}`)
  }

  // Format date helper
  const formatDate = (date: string | null) => {
    if (!date) return '-'
    try {
      return format(new Date(date), 'dd MMM yyyy', { locale: fr })
    } catch {
      return '-'
    }
  }

  return (
    <Card className="overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[120px]">Référence</TableHead>
            <TableHead>Titre</TableHead>
            <TableHead className="w-[140px]">Statut</TableHead>
            <TableHead className="w-[100px]">Urgence</TableHead>
            <TableHead className="w-[120px]">Type</TableHead>
            {userRole === 'gestionnaire' && (
              <TableHead className="w-[150px]">Locataire</TableHead>
            )}
            <TableHead className="w-[120px]">Créée le</TableHead>
            <TableHead className="w-[80px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {interventions.map((intervention) => {
            const statusConfig = STATUS_CONFIG[intervention.status]
            const urgencyConfig = URGENCY_CONFIG[intervention.urgency]
            const StatusIcon = statusConfig.icon

            return (
              <TableRow
                key={intervention.id}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onMouseEnter={() => setHoveredRow(intervention.id)}
                onMouseLeave={() => setHoveredRow(null)}
                onClick={() => handleRowClick(intervention.id)}
              >
                <TableCell className="font-mono text-sm">
                  {intervention.reference}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium line-clamp-1">
                      {intervention.title}
                    </span>
                    {intervention.specific_location && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <Home className="w-3 h-3" />
                        {intervention.specific_location}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge
                          variant="outline"
                          className="gap-1 cursor-help"
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${statusConfig.color}`}
                          />
                          {statusConfig.label}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">
                          Statut actuel de l'intervention
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="secondary"
                    className={urgencyConfig.color}
                  >
                    {urgencyConfig.label}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="text-sm">
                    {TYPE_LABELS[intervention.type]}
                  </span>
                </TableCell>
                {userRole === 'gestionnaire' && (
                  <TableCell>
                    {/* Tenant info now loaded from intervention_assignments */}
                    <span className="text-muted-foreground text-sm">
                      Voir détails
                    </span>
                  </TableCell>
                )}
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {formatDate(intervention.created_at)}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`transition-opacity ${
                      hoveredRow === intervention.id
                        ? 'opacity-100'
                        : 'opacity-0'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRowClick(intervention.id)
                    }}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </Card>
  )
}