'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, ScrollText, Wrench } from 'lucide-react'
import { SupplierContractCard } from './supplier-contract-card'
import { ContractCard } from './contract-card'
import type { SupplierContractWithRelations } from '@/lib/types/supplier-contract.types'
import type { ContractWithRelations } from '@/lib/types/contract.types'

interface LotContractGroup {
  lotId: string
  lotReference: string
  leaseContracts: ContractWithRelations[]
  supplierContracts: SupplierContractWithRelations[]
}

interface BuildingContractsTabProps {
  buildingId: string
  buildingSupplierContracts: SupplierContractWithRelations[]
  lotsWithContracts: LotContractGroup[]
}

export function BuildingContractsTab({
  buildingId,
  buildingSupplierContracts,
  lotsWithContracts,
}: BuildingContractsTabProps) {
  const router = useRouter()

  const hasAnyContracts = buildingSupplierContracts.length > 0 ||
    lotsWithContracts.some(lot => lot.leaseContracts.length > 0 || lot.supplierContracts.length > 0)

  // Completely empty state
  if (!hasAnyContracts) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <ScrollText className="h-12 w-12 text-muted-foreground/30 mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-1">Aucun contrat</h3>
        <p className="text-sm text-muted-foreground max-w-md mb-4">
          Aucun contrat n&apos;a été créé pour cet immeuble.
        </p>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => router.push(`/gestionnaire/contrats/nouveau?buildingId=${buildingId}`)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Créer un bail
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push(`/gestionnaire/contrats/nouveau?buildingId=${buildingId}&type=fournisseur`)}
          >
            <Wrench className="h-4 w-4 mr-2" />
            Ajouter un fournisseur
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Section A: Building-level supplier contracts */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Wrench className="h-4 w-4 text-muted-foreground" />
            Contrats fournisseurs · Immeuble
          </h3>
          <Badge variant="secondary">{buildingSupplierContracts.length}</Badge>
        </div>
        {buildingSupplierContracts.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            {buildingSupplierContracts.map((sc) => (
              <SupplierContractCard
                key={sc.id}
                contract={sc}
                onView={() => router.push(`/gestionnaire/contrats/fournisseur/${sc.id}`)}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">
            Aucun contrat fournisseur au niveau immeuble.
          </p>
        )}
      </div>

      {/* Separator */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Par lot</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Section B: Per-lot contracts */}
      {lotsWithContracts.length > 0 ? (
        <div className="space-y-5">
          {lotsWithContracts
            .filter(lot => lot.leaseContracts.length > 0 || lot.supplierContracts.length > 0)
            .map((lot) => (
              <div key={lot.lotId}>
                {/* Lot header */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Lot {lot.lotReference}
                  </span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {lot.leaseContracts.length + lot.supplierContracts.length}
                  </Badge>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  {/* Lease contracts */}
                  {lot.leaseContracts.map((contract) => (
                    <ContractCard
                      key={contract.id}
                      contract={contract}
                      mode="view"
                      onView={() => router.push(`/gestionnaire/contrats/${contract.id}`)}
                    />
                  ))}

                  {/* Supplier contracts */}
                  {lot.supplierContracts.map((sc) => (
                    <SupplierContractCard
                      key={sc.id}
                      contract={sc}
                      onView={() => router.push(`/gestionnaire/contrats/fournisseur/${sc.id}`)}
                    />
                  ))}
                </div>
              </div>
            ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground italic">
          Aucun contrat au niveau des lots.
        </p>
      )}
    </div>
  )
}
