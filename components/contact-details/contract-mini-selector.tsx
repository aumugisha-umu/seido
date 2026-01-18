'use client'

/**
 * ContractMiniSelector - Sélecteur compact de contrats avec recherche
 *
 * Utilisé dans EntityLinkSection pour lier un contact à un contrat
 */

import { useState, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Search, FileText, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Contract {
  id: string
  reference?: string | null
  lot?: {
    id: string
    reference: string
    building?: {
      name: string
    } | null
  } | null
  start_date?: string | null
  status?: string | null
}

interface ContractMiniSelectorProps {
  contracts: Contract[]
  selectedId: string | null
  onSelect: (contractId: string | null) => void
  loading?: boolean
}

// Labels pour les statuts de contrat
const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  actif: { label: 'Actif', variant: 'default' },
  brouillon: { label: 'Brouillon', variant: 'secondary' },
  termine: { label: 'Terminé', variant: 'outline' },
  resilie: { label: 'Résilié', variant: 'destructive' }
}

export function ContractMiniSelector({
  contracts,
  selectedId,
  onSelect,
  loading = false
}: ContractMiniSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('')

  // Filtrer les contrats selon la recherche
  const filteredContracts = useMemo(() => {
    if (!searchTerm.trim()) return contracts

    const term = searchTerm.toLowerCase()
    return contracts.filter(contract => {
      const reference = contract.reference?.toLowerCase() || ''
      const lotReference = contract.lot?.reference?.toLowerCase() || ''
      const buildingName = contract.lot?.building?.name?.toLowerCase() || ''

      return (
        reference.includes(term) ||
        lotReference.includes(term) ||
        buildingName.includes(term)
      )
    })
  }, [contracts, searchTerm])

  // Formater la date
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
      {/* Barre de recherche */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Rechercher par référence, lot ou immeuble..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Liste des contrats */}
      <ScrollArea className="h-[250px]">
        <div className="space-y-2 pr-4">
          {filteredContracts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <FileText className="h-10 w-10 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">
                {searchTerm ? 'Aucun contrat trouvé' : 'Aucun contrat disponible'}
              </p>
            </div>
          ) : (
            filteredContracts.map(contract => {
              const isSelected = selectedId === contract.id
              const statusInfo = STATUS_LABELS[contract.status || ''] || { label: contract.status || 'Inconnu', variant: 'secondary' as const }

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
                  {/* Radio button visuel */}
                  <div className={cn(
                    "flex items-center justify-center h-5 w-5 rounded-full border-2 shrink-0 transition-colors",
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-muted-foreground/40"
                  )}>
                    {isSelected && <Check className="h-3 w-3" />}
                  </div>

                  {/* Contenu */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">
                        {contract.reference || contract.lot?.reference || 'Contrat sans référence'}
                      </p>
                      <Badge variant={statusInfo.variant} className="text-xs shrink-0">
                        {statusInfo.label}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {contract.lot?.building?.name || 'Immeuble non défini'}
                      {contract.start_date && ` • Début: ${formatDate(contract.start_date)}`}
                    </p>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </ScrollArea>

      {/* Compteur de résultats */}
      {searchTerm && (
        <p className="text-xs text-muted-foreground text-center">
          {filteredContracts.length} contrat{filteredContracts.length !== 1 ? 's' : ''} trouvé{filteredContracts.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}

export default ContractMiniSelector
