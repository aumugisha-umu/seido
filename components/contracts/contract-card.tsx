"use client"

import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ContractStatusBadge } from './contract-status-badge'
import { ContractTypeBadge } from './contract-type-badge'
import { ContractDatesDisplay } from './contract-dates-display'
import { ContractContactsPreview } from './contract-contacts-preview'
import { Eye, Edit, Trash2, Building2, Home, Euro, MoreVertical } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { ContractCardProps } from '@/lib/types/contract.types'

export function ContractCard({
  contract,
  mode = 'view',
  isSelected = false,
  onSelect,
  onView,
  onEdit,
  onDelete
}: ContractCardProps) {
  // Calculate monthly total
  const monthlyTotal = contract.rent_amount + (contract.charges_amount || 0)

  // Get location info
  const locationInfo = contract.lot ? (
    contract.lot.building ? (
      `${contract.lot.building.name} - Lot ${contract.lot.reference}`
    ) : (
      `Lot ${contract.lot.reference}`
    )
  ) : 'Lot non spécifié'

  const addressInfo = contract.lot?.building?.address || contract.lot?.street || contract.lot?.city || ''

  // BEM Classes
  const blockClass = cn(
    'contract-card',
    'group transition-all duration-200 h-full bg-white',
    mode === 'select' && 'cursor-pointer',
    isSelected && 'ring-2 ring-primary',
    'hover:shadow-md'
  )

  const headerClass = cn(
    'contract-card__header',
    'flex items-start justify-between gap-2 pb-2'
  )

  const contentClass = cn(
    'contract-card__content',
    'space-y-3'
  )

  const handleCardClick = () => {
    if (mode === 'select' && onSelect) {
      onSelect(contract.id)
    }
  }

  return (
    <Card
      className={blockClass}
      onClick={handleCardClick}
      role={mode === 'select' ? 'button' : undefined}
      tabIndex={mode === 'select' ? 0 : undefined}
    >
      <CardHeader className="p-4 pb-2">
        <div className={headerClass}>
          <div className="flex flex-col gap-1.5 min-w-0 flex-1">
            {/* Title and badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="contract-card__title font-semibold text-foreground truncate">
                {contract.title}
              </h3>
              <ContractStatusBadge status={contract.status} size="sm" />
            </div>
            <ContractTypeBadge type={contract.contract_type} />
          </div>

          {/* Actions dropdown */}
          {mode === 'view' && (onView || onEdit || onDelete) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onView && (
                  <DropdownMenuItem onClick={() => onView(contract.id)}>
                    <Eye className="h-4 w-4 mr-2" />
                    Voir les détails
                  </DropdownMenuItem>
                )}
                {onEdit && contract.status !== 'resilie' && contract.status !== 'expire' && (
                  <DropdownMenuItem onClick={() => onEdit(contract.id)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Modifier
                  </DropdownMenuItem>
                )}
                {(onView || onEdit) && onDelete && <DropdownMenuSeparator />}
                {onDelete && contract.status !== 'actif' && (
                  <DropdownMenuItem
                    onClick={() => onDelete(contract.id)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Supprimer
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-0">
        <div className={contentClass}>
          {/* Location */}
          <div className="contract-card__location flex items-start gap-2 text-sm">
            <Building2 className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <div className="font-medium text-foreground truncate">{locationInfo}</div>
              {addressInfo && (
                <div className="text-muted-foreground text-xs truncate">{addressInfo}</div>
              )}
            </div>
          </div>

          {/* Dates */}
          <ContractDatesDisplay
            startDate={contract.start_date}
            endDate={contract.end_date}
            compact
            showRemaining
          />

          {/* Financial info */}
          <div className="contract-card__financial flex items-center gap-2 text-sm">
            <Euro className="h-4 w-4 text-muted-foreground" />
            <div className="flex items-baseline gap-2">
              <span className="font-semibold text-foreground">
                {monthlyTotal.toLocaleString('fr-FR')} €
              </span>
              <span className="text-xs text-muted-foreground">/mois</span>
              {contract.charges_amount > 0 && (
                <span className="text-xs text-muted-foreground">
                  ({contract.rent_amount.toLocaleString('fr-FR')} € + {contract.charges_amount.toLocaleString('fr-FR')} € charges)
                </span>
              )}
            </div>
          </div>

          {/* Contacts preview */}
          {contract.contacts && contract.contacts.length > 0 && (
            <div className="contract-card__contacts pt-2 border-t border-border">
              <ContractContactsPreview
                contacts={contract.contacts}
                maxDisplay={3}
                showRoles
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
