'use client'

import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SeidoBadge } from '@/components/ui/seido-badge'
import { Badge } from '@/components/ui/badge'
import { Wrench, Eye, Edit, MoreVertical, Calendar, Euro, Paperclip, Mail, Phone, Building2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { SupplierContractWithRelations } from '@/lib/types/supplier-contract.types'
import { COST_FREQUENCY_OPTIONS } from '@/lib/types/supplier-contract.types'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface SupplierContractCardProps {
  contract: SupplierContractWithRelations
  onView?: (contract: SupplierContractWithRelations) => void
  onEdit?: (contract: SupplierContractWithRelations) => void
  className?: string
}

const getSupplierDisplayName = (contract: SupplierContractWithRelations): string => {
  if (!contract.supplier) return 'Fournisseur inconnu'
  const parts = [contract.supplier.first_name, contract.supplier.last_name].filter(Boolean)
  if (parts.length > 0) return parts.join(' ')
  if (contract.supplier.name) return contract.supplier.name
  return 'Fournisseur inconnu'
}

const getSupplierCompanyName = (contract: SupplierContractWithRelations): string | null => {
  if (!contract.supplier) return null
  return contract.supplier.company_record?.name || contract.supplier.company || null
}

// Frequency label lookup map (avoids .find() per render)
const FREQUENCY_LABEL_MAP = new Map(
  COST_FREQUENCY_OPTIONS.map(o => [o.value, o.label.toLowerCase()])
)

// Hoisted formatter — single instance shared across all cards
const currencyFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

const formatEndDate = (dateStr: string | null): string | null => {
  if (!dateStr) return null
  return format(new Date(dateStr), 'd MMM yyyy', { locale: fr })
}

export function SupplierContractCard({
  contract,
  onView,
  onEdit,
  className,
}: SupplierContractCardProps) {
  const supplierName = getSupplierDisplayName(contract)
  const companyName = getSupplierCompanyName(contract)
  const endDateFormatted = formatEndDate(contract.end_date)
  // DB stores notice_period as a single text field (e.g. "3 mois")
  const noticePeriod = contract.notice_period || null

  const hasActions = onView || onEdit

  return (
    <Card
      className={cn(
        'border-l-4 border-l-slate-400 hover:shadow-md transition-shadow cursor-pointer',
        className
      )}
      onClick={() => onView?.(contract)}
    >
      <CardContent className="p-4">
        {/* Row 1: Icon + Reference + Badge + Actions */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Wrench className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="text-sm font-semibold text-foreground truncate">
              {contract.reference}
            </span>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <SeidoBadge
              type="contract"
              value={contract.status}
              size="sm"
              showIcon
            />
            {hasActions && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onView && (
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onView(contract) }}>
                      <Eye className="h-4 w-4 mr-2" />
                      Voir
                    </DropdownMenuItem>
                  )}
                  {onEdit && (
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(contract) }}>
                      <Edit className="h-4 w-4 mr-2" />
                      Modifier
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Row 2: Supplier name + company badge */}
        <div className="flex items-center gap-1.5 mt-1 min-w-0">
          <p className="text-sm text-muted-foreground truncate">
            {supplierName}
          </p>
          {companyName && (
            <Badge variant="secondary" className="bg-purple-100 text-purple-800 text-xs flex items-center gap-1 flex-shrink-0">
              <Building2 className="h-3 w-3" />
              {companyName}
            </Badge>
          )}
        </div>

        {/* Row 2b: Supplier contact info */}
        {(contract.supplier?.email || contract.supplier?.phone) && (
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            {contract.supplier?.email && (
              <div className="flex items-center gap-1 truncate">
                <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate">{contract.supplier.email}</span>
              </div>
            )}
            {contract.supplier?.phone && (
              <div className="flex items-center gap-1">
                <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                <span>{contract.supplier.phone}</span>
              </div>
            )}
          </div>
        )}

        {/* Row 3: End date + Notice period */}
        {(endDateFormatted || noticePeriod) && (
          <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
            {endDateFormatted && <span>Fin: {endDateFormatted}</span>}
            {endDateFormatted && noticePeriod && <span>·</span>}
            {noticePeriod && <span>Préavis: {noticePeriod}</span>}
          </div>
        )}

        {/* Row 4: Documents */}
        {contract.documents && contract.documents.length > 0 && (
          <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
            <Paperclip className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{contract.documents.length} document{contract.documents.length > 1 ? 's' : ''}</span>
          </div>
        )}

        {/* Row 5: Cost */}
        {contract.cost != null && contract.cost > 0 && (
          <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
            <Euro className="h-3.5 w-3.5 flex-shrink-0" />
            <span>
              {currencyFormatter.format(contract.cost)}
              {contract.cost_frequency && ` / ${FREQUENCY_LABEL_MAP.get(contract.cost_frequency) || contract.cost_frequency}`}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
