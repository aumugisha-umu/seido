"use client"

/**
 * Supplier Confirmation Step — Summary of all supplier contracts before submission
 * Matches lease-form design patterns: section icons, Separator groups, summary pills.
 */

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Building2, Home, User, Euro, Calendar, Paperclip, Bell, FileText, CheckCircle2 } from 'lucide-react'
import type { SupplierContractFormItem } from '@/lib/types/supplier-contract.types'
import { COST_FREQUENCY_OPTIONS } from '@/lib/types/supplier-contract.types'

interface Contact {
  id: string
  name: string
  email: string | null
  phone: string | null
  role: string
}

interface SupplierConfirmationStepProps {
  contracts: SupplierContractFormItem[]
  buildingName?: string
  lotReference?: string
  contacts: Contact[]
}

export function SupplierConfirmationStep({
  contracts,
  buildingName,
  lotReference,
  contacts,
}: SupplierConfirmationStepProps) {
  const getSupplierName = (supplierId: string | null) => {
    if (!supplierId) return 'Non assigné'
    return contacts.find(c => c.id === supplierId)?.name || 'Inconnu'
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return ''
    const [year, month, day] = dateStr.split('-')
    return `${day}/${month}/${year}`
  }

  const getFrequencyLabel = (value: string) =>
    COST_FREQUENCY_OPTIONS.find(o => o.value === value)?.label.toLowerCase() || value

  // Total cost across all contracts (if same frequency)
  const allSameFrequency = contracts.every(c => c.costFrequency === contracts[0]?.costFrequency)
  const totalCost = contracts.reduce((sum, c) => sum + (c.cost || 0), 0)

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center max-w-2xl mx-auto mb-2">
        <h2 className="text-2xl font-bold mb-2">Récapitulatif</h2>
        <p className="text-sm text-muted-foreground">
          Vérifiez les informations avant de créer les contrats fournisseurs.
        </p>
      </div>

      <div className="space-y-4 max-w-3xl mx-auto">

        {/* Property info — highlighted like reference section */}
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-center gap-3">
            {buildingName
              ? <Building2 className="h-5 w-5 text-primary shrink-0" />
              : <Home className="h-5 w-5 text-primary shrink-0" />
            }
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Bien concerné
              </p>
              <p className="text-base font-semibold">
                {buildingName || `Lot ${lotReference || ''}`}
              </p>
            </div>
            <Badge variant="outline" className="ml-auto shrink-0">
              {contracts.length} contrat{contracts.length > 1 ? 's' : ''}
            </Badge>
          </div>
        </div>

        {/* Contracts summary */}
        {contracts.map((contract, index) => (
          <Card key={contract.tempId} className="shadow-sm overflow-hidden">
            <CardContent className="px-6 py-5 space-y-4">

              {/* Header row */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="font-mono font-semibold text-primary">{contract.reference}</span>
                </div>
                <Badge variant="secondary" className="shrink-0">#{index + 1}</Badge>
              </div>

              {/* Supplier */}
              <div className="flex items-center gap-1.5 text-sm">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{contract.supplierName || getSupplierName(contract.supplierId)}</span>
              </div>

              <Separator />

              {/* Details grid */}
              <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm">
                {contract.cost !== null && contract.cost > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Euro className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-semibold tabular-nums">
                      {contract.cost.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                    </span>
                    {contract.costFrequency && (
                      <span className="text-muted-foreground">/ {getFrequencyLabel(contract.costFrequency)}</span>
                    )}
                  </div>
                )}

                {contract.endDate && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Fin : {formatDate(contract.endDate)}</span>
                  </div>
                )}

                {contract.noticePeriodValue && (
                  <div className="flex items-center gap-1.5">
                    <Bell className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Préavis : {contract.noticePeriodValue} {contract.noticePeriodUnit}</span>
                  </div>
                )}

                {contract.files.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{contract.files.length} pièce{contract.files.length > 1 ? 's' : ''} jointe{contract.files.length > 1 ? 's' : ''}</span>
                  </div>
                )}
              </div>

            </CardContent>
          </Card>
        ))}

        {/* Summary footer */}
        <div className="flex items-center justify-center gap-3 py-3 rounded-lg bg-muted/40 border border-border/50">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          <span className="text-sm text-muted-foreground">
            {contracts.length} contrat{contracts.length > 1 ? 's' : ''} fournisseur{contracts.length > 1 ? 's' : ''} {contracts.length > 1 ? 'seront créés' : 'sera créé'}
          </span>
          {allSameFrequency && totalCost > 0 && contracts[0]?.costFrequency && (
            <>
              <span className="text-muted-foreground/40">|</span>
              <span className="text-sm font-semibold text-primary tabular-nums">
                Total : {totalCost.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € / {getFrequencyLabel(contracts[0].costFrequency)}
              </span>
            </>
          )}
        </div>

      </div>
    </div>
  )
}
