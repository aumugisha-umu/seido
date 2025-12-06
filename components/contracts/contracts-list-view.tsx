"use client"

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Eye,
  Edit,
  Trash2,
  MoreVertical,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Building2,
  Calendar,
  Euro,
  Users
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
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { ContractWithRelations, ContractStatus } from '@/lib/types/contract.types'
import { CONTRACT_STATUS_LABELS, CONTRACT_STATUS_COLORS } from '@/lib/types/contract.types'

/**
 * 📊 CONTRACTS LIST VIEW - TABLE DENSE
 *
 * Vue tabulaire dense pour les contrats avec colonnes triables.
 * Similaire à InterventionsListViewV1.
 */

interface ContractsListViewProps {
  /** Liste des contrats à afficher */
  contracts: ContractWithRelations[]
  /** Loading state */
  loading?: boolean
  /** Callbacks */
  onView?: (id: string) => void
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
  /** Optional CSS classes */
  className?: string
}

type SortField =
  | 'title'
  | 'status'
  | 'location'
  | 'start_date'
  | 'end_date'
  | 'rent_amount'
  | 'contacts'

type SortDirection = 'asc' | 'desc' | null

export function ContractsListView({
  contracts,
  loading = false,
  onView,
  onEdit,
  onDelete,
  className
}: ContractsListViewProps) {
  const router = useRouter()

  // Sorting state
  const [sortField, setSortField] = useState<SortField | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)

  /**
   * 🔄 Handle column sort
   */
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

  /**
   * 📊 Sorted contracts
   */
  const sortedContracts = useMemo(() => {
    if (!sortField || !sortDirection) {
      return contracts
    }

    return [...contracts].sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sortField) {
        case 'title':
          aValue = a.title
          bValue = b.title
          break
        case 'status':
          aValue = a.status
          bValue = b.status
          break
        case 'location':
          aValue = a.lot?.building?.name || a.lot?.reference || ''
          bValue = b.lot?.building?.name || b.lot?.reference || ''
          break
        case 'start_date':
          aValue = a.start_date
          bValue = b.start_date
          break
        case 'end_date':
          aValue = a.end_date
          bValue = b.end_date
          break
        case 'rent_amount':
          aValue = a.rent_amount + (a.charges_amount || 0)
          bValue = b.rent_amount + (b.charges_amount || 0)
          break
        case 'contacts':
          aValue = a.contacts?.length || 0
          bValue = b.contacts?.length || 0
          break
        default:
          return 0
      }

      // Handle null values
      if (aValue == null) return 1
      if (bValue == null) return -1

      // Numeric comparison
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
      }

      // Date comparison
      if (sortField.includes('_date')) {
        const aDate = new Date(aValue).getTime()
        const bDate = new Date(bValue).getTime()
        return sortDirection === 'asc' ? aDate - bDate : bDate - aDate
      }

      // String comparison
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      }

      return 0
    })
  }, [contracts, sortField, sortDirection])

  /**
   * 🎨 Get status badge styling
   */
  const getStatusBadge = (status: ContractStatus) => {
    return (
      <Badge className={`${CONTRACT_STATUS_COLORS[status]} text-xs border`}>
        {CONTRACT_STATUS_LABELS[status]}
      </Badge>
    )
  }

  /**
   * 📐 Calculate days remaining
   */
  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    end.setHours(0, 0, 0, 0)
    const days = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return days
  }

  /**
   * 🎨 Get days remaining color
   */
  const getDaysRemainingColor = (days: number) => {
    if (days < 0) return 'text-red-600'
    if (days <= 30) return 'text-orange-600'
    if (days <= 90) return 'text-amber-600'
    return 'text-green-600'
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

  /**
   * 📐 Format date
   */
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  /**
   * 📐 Format currency
   */
  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('fr-FR') + ' €'
  }

  /**
   * 🔗 Navigate to contract details
   */
  const handleRowClick = (id: string) => {
    if (onView) {
      onView(id)
    } else {
      router.push(`/gestionnaire/contrats/${id}`)
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
              {/* Title Column */}
              <TableHead className="w-[280px]">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 hover:bg-slate-100 font-semibold"
                  onClick={() => handleSort('title')}
                >
                  Contrat
                  {renderSortIcon('title')}
                </Button>
              </TableHead>

              {/* Status Column */}
              <TableHead className="w-[110px]">
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

              {/* Location Column */}
              <TableHead className="w-[200px]">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 hover:bg-slate-100 font-semibold"
                  onClick={() => handleSort('location')}
                >
                  Bien
                  {renderSortIcon('location')}
                </Button>
              </TableHead>

              {/* Dates Column */}
              <TableHead className="w-[180px]">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 hover:bg-slate-100 font-semibold"
                  onClick={() => handleSort('start_date')}
                >
                  Période
                  {renderSortIcon('start_date')}
                </Button>
              </TableHead>

              {/* Rent Column */}
              <TableHead className="w-[130px]">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 hover:bg-slate-100 font-semibold"
                  onClick={() => handleSort('rent_amount')}
                >
                  Loyer
                  {renderSortIcon('rent_amount')}
                </Button>
              </TableHead>

              {/* Contacts Column */}
              <TableHead className="w-[120px]">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 hover:bg-slate-100 font-semibold"
                  onClick={() => handleSort('contacts')}
                >
                  Locataires
                  {renderSortIcon('contacts')}
                </Button>
              </TableHead>

              {/* Actions Column */}
              <TableHead className="w-[100px] text-right">
                <span className="font-semibold">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {sortedContracts.map((contract) => {
              const monthlyTotal = contract.rent_amount + (contract.charges_amount || 0)
              const daysRemaining = getDaysRemaining(contract.end_date)
              const locationText = contract.lot?.building
                ? `${contract.lot.building.name} - Lot ${contract.lot.reference}`
                : contract.lot?.reference
                  ? `Lot ${contract.lot.reference}`
                  : 'Non spécifié'
              const addressText = contract.lot?.street || contract.lot?.city || ''
              const tenantCount = contract.contacts?.filter(c => c.role === 'locataire').length || 0
              const primaryTenant = contract.contacts?.find(c => c.role === 'locataire' && c.is_primary)
                || contract.contacts?.find(c => c.role === 'locataire')

              return (
                <TableRow
                  key={contract.id}
                  className="hover:bg-slate-50 cursor-pointer transition-colors"
                  onClick={() => handleRowClick(contract.id)}
                >
                  {/* Title Cell */}
                  <TableCell className="font-medium">
                    <div className="flex flex-col gap-0.5">
                      <span className="truncate font-semibold">{contract.title}</span>
                    </div>
                  </TableCell>

                  {/* Status Cell */}
                  <TableCell>
                    {getStatusBadge(contract.status)}
                  </TableCell>

                  {/* Location Cell */}
                  <TableCell>
                    <div className="flex items-start gap-1.5">
                      <Building2 className="h-3.5 w-3.5 mt-0.5 text-slate-500 flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{locationText}</div>
                        {addressText && (
                          <div className="text-xs text-slate-500 truncate">{addressText}</div>
                        )}
                      </div>
                    </div>
                  </TableCell>

                  {/* Dates Cell */}
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-1.5 text-sm">
                        <Calendar className="h-3.5 w-3.5 text-slate-500" />
                        <span>{formatDate(contract.start_date)} - {formatDate(contract.end_date)}</span>
                      </div>
                      <div className={`text-xs font-medium ${getDaysRemainingColor(daysRemaining)}`}>
                        {daysRemaining < 0
                          ? `Expiré depuis ${Math.abs(daysRemaining)}j`
                          : `${daysRemaining}j restants`
                        }
                      </div>
                    </div>
                  </TableCell>

                  {/* Rent Cell */}
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-1.5">
                        <Euro className="h-3.5 w-3.5 text-slate-500" />
                        <span className="font-semibold">{formatCurrency(monthlyTotal)}</span>
                        <span className="text-xs text-slate-500">/mois</span>
                      </div>
                      {contract.charges_amount > 0 && (
                        <div className="text-xs text-slate-500">
                          dont {formatCurrency(contract.charges_amount)} charges
                        </div>
                      )}
                    </div>
                  </TableCell>

                  {/* Contacts Cell */}
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-slate-500" />
                      <div className="flex items-center gap-1">
                        {primaryTenant && (
                          <div className="flex items-center gap-1">
                            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                              {primaryTenant.user?.name?.[0] || '?'}
                            </div>
                            <span className="text-sm truncate max-w-[60px]">
                              {primaryTenant.user?.name?.split(' ')[0] || 'Locataire'}
                            </span>
                          </div>
                        )}
                        {tenantCount > 1 && (
                          <span className="text-xs text-slate-500">+{tenantCount - 1}</span>
                        )}
                        {tenantCount === 0 && (
                          <span className="text-xs text-slate-400">Aucun</span>
                        )}
                      </div>
                    </div>
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
                                handleRowClick(contract.id)
                              }}
                            >
                              <Eye className="h-3.5 w-3.5" />
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
                          >
                            <MoreVertical className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onView?.(contract.id)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Voir les détails
                          </DropdownMenuItem>
                          {onEdit && contract.status !== 'resilie' && contract.status !== 'expire' && (
                            <DropdownMenuItem onClick={() => onEdit(contract.id)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Modifier
                            </DropdownMenuItem>
                          )}
                          {onDelete && contract.status !== 'actif' && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => onDelete(contract.id)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Supprimer
                              </DropdownMenuItem>
                            </>
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
