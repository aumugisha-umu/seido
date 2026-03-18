'use client'

/**
 * SupplierContractMiniSelector - Compact selector for supplier contracts
 *
 * Used in EntityLinkSection to link a prestataire to a supplier contract.
 * Different display than ContractMiniSelector: shows supplier name/company
 * and supplier contract statuses (actif/expiré/résilié).
 */

import { useState, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Search, FileText, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SupplierContractDTO {
  id: string
  reference: string | null
  supplier: {
    name: string | null
    company: string | null
  } | null
  building: {
    id: string
    name: string
  } | null
  lot: {
    id: string
    reference: string
  } | null
  status: string | null
  end_date: string | null
}

interface SupplierContractMiniSelectorProps {
  contracts: SupplierContractDTO[]
  selectedId: string | null
  onSelect: (contractId: string | null) => void
  loading?: boolean
}

const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  actif: { label: 'Actif', variant: 'default' },
  expire: { label: 'Expiré', variant: 'outline' },
  resilie: { label: 'Résilié', variant: 'destructive' },
}

export function SupplierContractMiniSelector({
  contracts,
  selectedId,
  onSelect,
  loading = false
}: SupplierContractMiniSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredContracts = useMemo(() => {
    if (!searchTerm.trim()) return contracts

    const term = searchTerm.toLowerCase()
    return contracts.filter(contract => {
      const reference = contract.reference?.toLowerCase() || ''
      const supplierName = contract.supplier?.name?.toLowerCase() || ''
      const supplierCompany = contract.supplier?.company?.toLowerCase() || ''
      const buildingName = contract.building?.name?.toLowerCase() || ''
      const lotRef = contract.lot?.reference?.toLowerCase() || ''

      return (
        reference.includes(term) ||
        supplierName.includes(term) ||
        supplierCompany.includes(term) ||
        buildingName.includes(term) ||
        lotRef.includes(term)
      )
    })
  }, [contracts, searchTerm])

  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return ''
    try {
      return new Date(dateString).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })
    } catch {
      return ''
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-9 w-full" />
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Rechercher par référence, fournisseur ou bien..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Contract list */}
      <ScrollArea className="h-[250px]">
        <div className="space-y-2 pr-4">
          {filteredContracts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <FileText className="h-10 w-10 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">
                {searchTerm ? 'Aucun contrat fournisseur trouvé' : 'Aucun contrat fournisseur disponible'}
              </p>
            </div>
          ) : (
            filteredContracts.map(contract => {
              const isSelected = selectedId === contract.id
              const statusInfo = STATUS_LABELS[contract.status || ''] || { label: contract.status || 'Inconnu', variant: 'secondary' as const }

              // Build supplier display text
              const supplierDisplay = contract.supplier?.company
                ? contract.supplier.company
                : contract.supplier?.name || 'Fournisseur non défini'

              // Build property display text
              const propertyDisplay = contract.building?.name
                ? contract.building.name
                : contract.lot?.reference || null

              return (
                <button
                  key={contract.id}
                  type="button"
                  onClick={() => onSelect(isSelected ? null : contract.id)}
                  className={cn(
                    "flex items-center gap-3 w-full p-3 rounded-lg border text-left transition-all",
                    "hover:border-primary/50 hover:bg-primary/5",
                    isSelected
                      ? "border-primary bg-primary/10 ring-1 ring-primary/20"
                      : "border-border bg-background"
                  )}
                >
                  {/* Radio button */}
                  <div className={cn(
                    "flex items-center justify-center h-5 w-5 rounded-full border-2 shrink-0 transition-colors",
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-muted-foreground/40"
                  )}>
                    {isSelected && <Check className="h-3 w-3" />}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">
                        {contract.reference || 'Contrat sans référence'}
                      </p>
                      <Badge variant={statusInfo.variant} className="text-xs shrink-0">
                        {statusInfo.label}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {supplierDisplay}
                      {propertyDisplay && ` • ${propertyDisplay}`}
                      {contract.end_date && ` • Fin: ${formatDate(contract.end_date)}`}
                    </p>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </ScrollArea>

      {/* Result count */}
      {searchTerm && (
        <p className="text-xs text-muted-foreground text-center">
          {filteredContracts.length} contrat{filteredContracts.length !== 1 ? 's' : ''} fournisseur{filteredContracts.length !== 1 ? 's' : ''} trouvé{filteredContracts.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}

export default SupplierContractMiniSelector
