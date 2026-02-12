'use client'

/**
 * ReportsCard - Affiche les rapports de clôture (prestataire, locataire, gestionnaire)
 * Sans Card wrapper - utilisé directement dans ContentWrapper
 */

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { ClipboardList, Wrench, CheckCircle2, Shield, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface InterventionReport {
  id: string
  report_type: string
  title: string
  content: string
  created_at: string
  created_by: string
  is_internal: boolean | null
  metadata: Record<string, any> | null
  creator?: {
    name: string
  } | null
}

interface ReportsCardProps {
  reports: InterventionReport[]
  className?: string
}

const REPORT_CONFIG: Record<string, {
  label: string
  icon: typeof Wrench
  borderColor: string
  bgColor: string
  iconColor: string
}> = {
  provider_report: {
    label: 'Rapport du prestataire',
    icon: Wrench,
    borderColor: 'border-purple-200',
    bgColor: 'bg-purple-50/30',
    iconColor: 'text-purple-600',
  },
  tenant_report: {
    label: 'Validation du locataire',
    icon: CheckCircle2,
    borderColor: 'border-green-200',
    bgColor: 'bg-green-50/30',
    iconColor: 'text-green-600',
  },
  manager_report: {
    label: 'Rapport du gestionnaire',
    icon: Shield,
    borderColor: 'border-blue-200',
    bgColor: 'bg-blue-50/30',
    iconColor: 'text-blue-600',
  },
}

const MAX_CONTENT_LENGTH = 200

export const ReportsCard = ({ reports = [], className }: ReportsCardProps) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Filter out internal reports and sort: provider → tenant → manager
  const visibleReports = reports
    .filter(r => !r.is_internal)
    .sort((a, b) => {
      const order = ['provider_report', 'tenant_report', 'manager_report']
      return order.indexOf(a.report_type) - order.indexOf(b.report_type)
    })

  if (visibleReports.length === 0) return null

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <h3 className="text-base font-semibold flex items-center gap-2">
        <ClipboardList className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        Rapports de clôture
      </h3>

      {/* Reports */}
      <div className="space-y-3">
        {visibleReports.map((report) => {
          const config = REPORT_CONFIG[report.report_type] || REPORT_CONFIG.provider_report
          const Icon = config.icon
          const isLong = report.content.length > MAX_CONTENT_LENGTH
          const isExpanded = expandedIds.has(report.id)
          const displayContent = isLong && !isExpanded
            ? report.content.slice(0, MAX_CONTENT_LENGTH) + '…'
            : report.content

          return (
            <div
              key={report.id}
              className={cn(
                'p-4 rounded-lg border',
                config.borderColor,
                config.bgColor,
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Icon className={cn('w-4 h-4', config.iconColor)} />
                  <span className="font-medium text-gray-900 text-sm">
                    {config.label}
                  </span>
                </div>
                <span className="text-xs text-gray-500">
                  {new Date(report.created_at).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>

              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {displayContent}
              </p>

              {isLong && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-1 h-7 px-2 text-xs text-gray-500"
                  onClick={() => toggleExpand(report.id)}
                >
                  {isExpanded ? (
                    <>Voir moins <ChevronUp className="h-3 w-3 ml-1" /></>
                  ) : (
                    <>Voir plus <ChevronDown className="h-3 w-3 ml-1" /></>
                  )}
                </Button>
              )}

              {report.creator?.name && (
                <p className="text-xs text-gray-500 mt-2">
                  Par {report.creator.name}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
