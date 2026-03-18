"use client"

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { usePrefetchHandler } from '@/hooks/use-prefetch'
import {
  Eye,
  Edit,
  MoreVertical,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Building2,
  Calendar,
  Euro,
  Wrench,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SeidoBadge } from '@/components/ui/seido-badge'
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
import type { SupplierContractWithRelations } from '@/lib/types/supplier-contract.types'
import { COST_FREQUENCY_OPTIONS } from '@/lib/types/supplier-contract.types'

// ============================================================================
// SUPPLIER CONTRACTS LIST VIEW - DENSE SORTABLE TABLE
// ============================================================================

const parseLocalDate = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

// Frequency label lookup map
const FREQUENCY_LABEL_MAP = new Map(
  COST_FREQUENCY_OPTIONS.map(o => [o.value, o.label.toLowerCase()])
)

const currencyFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

interface SupplierContractsListViewProps {
  contracts: SupplierContractWithRelations[]
  loading?: boolean
  onView?: (id: string) => void
  onEdit?: (id: string) => void
  className?: string
}

type SortField = 'reference' | 'status' | 'supplier' | 'property' | 'end_date' | 'cost'

type SortDirection = 'asc' | 'desc' | null

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

const getPropertyName = (contract: SupplierContractWithRelations): string => {
  if (contract.building) return contract.building.name
  if (contract.lot) return `Lot ${contract.lot.reference}`
  return 'Non spécifié'
}

export function SupplierContractsListView({
  contracts,
  loading = false,
  onView,
  onEdit,
  className
}: SupplierContractsListViewProps) {
  const router = useRouter()
  const handleRowHover = usePrefetchHandler()

  const [sortField, setSortField] = useState<SortField | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)

  const handleSort = (field: SortField) => {
    if (sortField === field) {
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

  const sortedContracts = useMemo(() => {
    if (!sortField || !sortDirection) return contracts

    return [...contracts].sort((a, b) => {
      let aValue: string | number | null
      let bValue: string | number | null

      switch (sortField) {
        case 'reference':
          aValue = a.reference || ''
          bValue = b.reference || ''
          break
        case 'status':
          aValue = a.status
          bValue = b.status
          break
        case 'supplier':
          aValue = getSupplierDisplayName(a)
          bValue = getSupplierDisplayName(b)
          break
        case 'property':
          aValue = getPropertyName(a)
          bValue = getPropertyName(b)
          break
        case 'end_date':
          aValue = a.end_date || ''
          bValue = b.end_date || ''
          break
        case 'cost':
          aValue = a.cost ?? 0
          bValue = b.cost ?? 0
          break
        default:
          return 0
      }

      if (aValue == null) return 1
      if (bValue == null) return -1

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
      }

      if (sortField === 'end_date' && typeof aValue === 'string' && typeof bValue === 'string' && aValue && bValue) {
        const aDate = parseLocalDate(aValue).getTime()
        const bDate = parseLocalDate(bValue).getTime()
        return sortDirection === 'asc' ? aDate - bDate : bDate - aDate
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      }

      return 0
    })
  }, [contracts, sortField, sortDirection])

  const getDaysRemaining = (endDate: string) => {
    const end = parseLocalDate(endDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    end.setHours(0, 0, 0, 0)
    return Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  }

  const getDaysRemainingColor = (days: number) => {
    if (days < 0) return 'text-red-600'
    if (days <= 30) return 'text-orange-600'
    if (days <= 90) return 'text-amber-600'
    return 'text-green-600'
  }

  const formatRemainingTime = (days: number): string => {
    if (days < 0) return `Expiré depuis ${Math.abs(days)}j`
    if (days === 0) return "Expire aujourd'hui"
    if (days <= 30) return `${days}j restants`
    const months = Math.floor(days / 30)
    return `${months} mois restants`
  }

  const formatDate = (date: string) => {
    return parseLocalDate(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

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

  const handleRowClick = (contract: SupplierContractWithRelations) => {
    if (onView) {
      onView(contract.id)
    } else {
      router.push(`/gestionnaire/contrats/fournisseur/${contract.id}`)
    }
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
    <div className={`rounded-md border ${className || ''}`}>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-slate-50 sticky top-0 z-10">
            <TableRow>
              <TableHead className="w-[200px]">
                <Button variant="ghost" size="sm" className="h-8 px-2 hover:bg-slate-100 font-semibold" onClick={() => handleSort('reference')}>
                  Référence{renderSortIcon('reference')}
                </Button>
              </TableHead>
              <TableHead className="w-[110px]">
                <Button variant="ghost" size="sm" className="h-8 px-2 hover:bg-slate-100 font-semibold" onClick={() => handleSort('status')}>
                  Statut{renderSortIcon('status')}
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" size="sm" className="h-8 px-2 hover:bg-slate-100 font-semibold" onClick={() => handleSort('supplier')}>
                  Fournisseur{renderSortIcon('supplier')}
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" size="sm" className="h-8 px-2 hover:bg-slate-100 font-semibold" onClick={() => handleSort('property')}>
                  Bien{renderSortIcon('property')}
                </Button>
              </TableHead>
              <TableHead className="w-[150px]">
                <Button variant="ghost" size="sm" className="h-8 px-2 hover:bg-slate-100 font-semibold" onClick={() => handleSort('end_date')}>
                  Échéance{renderSortIcon('end_date')}
                </Button>
              </TableHead>
              <TableHead className="w-[100px]">
                <span className="font-semibold px-2">Préavis</span>
              </TableHead>
              <TableHead className="w-[130px]">
                <Button variant="ghost" size="sm" className="h-8 px-2 hover:bg-slate-100 font-semibold" onClick={() => handleSort('cost')}>
                  Coût{renderSortIcon('cost')}
                </Button>
              </TableHead>
              <TableHead className="w-[80px] text-right">
                <span className="font-semibold">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {sortedContracts.map((contract) => {
              const supplierName = getSupplierDisplayName(contract)
              const companyName = getSupplierCompanyName(contract)
              const propertyName = getPropertyName(contract)
              const daysRemaining = contract.end_date ? getDaysRemaining(contract.end_date) : null

              return (
                <TableRow
                  key={contract.id}
                  className="hover:bg-slate-50 cursor-pointer transition-colors"
                  onClick={() => handleRowClick(contract)}
                  onMouseEnter={() => handleRowHover(`/gestionnaire/contrats/fournisseur/${contract.id}`)}
                >
                  {/* Reference */}
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-1.5">
                      <Wrench className="h-3.5 w-3.5 text-slate-500 flex-shrink-0" />
                      <span className="truncate font-semibold">{contract.reference}</span>
                    </div>
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    <SeidoBadge type="contract" value={contract.status} size="sm" showIcon />
                  </TableCell>

                  {/* Supplier */}
                  <TableCell>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-sm truncate">{supplierName}</span>
                      {companyName && (
                        <Badge variant="secondary" className="bg-purple-100 text-purple-800 text-xs flex items-center gap-1 flex-shrink-0">
                          <Building2 className="h-3 w-3" />
                          <span className="truncate max-w-[80px]">{companyName}</span>
                        </Badge>
                      )}
                    </div>
                  </TableCell>

                  {/* Property */}
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-slate-500 flex-shrink-0" />
                      <span className="text-sm truncate">{propertyName}</span>
                    </div>
                  </TableCell>

                  {/* End date */}
                  <TableCell>
                    {contract.end_date ? (
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5 text-sm">
                          <Calendar className="h-3.5 w-3.5 text-slate-500" />
                          <span>{formatDate(contract.end_date)}</span>
                        </div>
                        {daysRemaining !== null && (
                          <div className={`text-xs font-medium ${getDaysRemainingColor(daysRemaining)}`}>
                            {formatRemainingTime(daysRemaining)}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">Non définie</span>
                    )}
                  </TableCell>

                  {/* Notice period */}
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {contract.notice_period || '—'}
                    </span>
                  </TableCell>

                  {/* Cost */}
                  <TableCell>
                    {contract.cost != null && contract.cost > 0 ? (
                      <div className="flex items-center gap-1.5">
                        <Euro className="h-3.5 w-3.5 text-slate-500" />
                        <span className="font-semibold">{currencyFormatter.format(contract.cost)}</span>
                        {contract.cost_frequency && (
                          <span className="text-xs text-slate-500">/{FREQUENCY_LABEL_MAP.get(contract.cost_frequency) || contract.cost_frequency}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </TableCell>

                  {/* Actions */}
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
                                handleRowClick(contract)
                              }}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent><p>Voir les détails</p></TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={(e) => e.stopPropagation()}>
                            <MoreVertical className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onView?.(contract.id)}>
                            <Eye className="h-4 w-4 mr-2" />Voir les détails
                          </DropdownMenuItem>
                          {onEdit && contract.status !== 'resilie' && (
                            <DropdownMenuItem onClick={() => onEdit(contract.id)}>
                              <Edit className="h-4 w-4 mr-2" />Modifier
                            </DropdownMenuItem>
                          )}
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
