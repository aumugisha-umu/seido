"use client"

/**
 * Supplier Confirmation Step — Summary of all supplier contracts before submission
 * Uses reusable confirmation components for consistent layout.
 */

import { Building2, Home, FileText, Paperclip, Eye } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  ConfirmationPageShell,
  ConfirmationEntityHeader,
  ConfirmationSection,
  ConfirmationKeyValueGrid,
  ConfirmationFinancialHighlight,
} from '@/components/confirmation'
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
    if (!supplierId) return 'Non assigne'
    return contacts.find(c => c.id === supplierId)?.name || 'Inconnu'
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return ''
    const [year, month, day] = dateStr.split('-')
    return `${day}/${month}/${year}`
  }

  const getFrequencyLabel = (value: string) =>
    COST_FREQUENCY_OPTIONS.find(o => o.value === value)?.label.toLowerCase() || value

  const formatCost = (cost: number) =>
    cost.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  // Total cost across all contracts (if same frequency)
  const allSameFrequency = contracts.every(c => c.costFrequency === contracts[0]?.costFrequency)
  const totalCost = contracts.reduce((sum, c) => sum + (c.cost || 0), 0)

  const propertyName = buildingName || `Lot ${lotReference || ''}`
  const propertyIcon = buildingName ? Building2 : Home

  return (
    <ConfirmationPageShell maxWidth="3xl">
      <ConfirmationEntityHeader
        icon={propertyIcon}
        title="Contrats fournisseurs"
        subtitle={propertyName}
        badges={[
          {
            label: `${contracts.length} contrat${contracts.length > 1 ? 's' : ''}`,
            variant: 'outline',
          },
        ]}
      />

      <ConfirmationSection title="Bien concerne">
        <ConfirmationKeyValueGrid
          columns={2}
          pairs={[
            { label: 'Type', value: buildingName ? 'Immeuble' : 'Lot' },
            { label: 'Nom', value: propertyName },
          ]}
        />
      </ConfirmationSection>

      {contracts.map((contract, index) => (
        <div
          key={contract.tempId}
          className="rounded-xl border bg-muted/20 p-4 space-y-4"
        >
          <ConfirmationSection title={`Contrat ${index + 1}`} compact>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <span className="font-mono font-semibold text-primary">{contract.reference}</span>
              </div>
              <Badge variant="secondary" className="shrink-0">#{index + 1}</Badge>
            </div>

            <ConfirmationKeyValueGrid
              columns={2}
              pairs={[
                {
                  label: 'Reference',
                  value: contract.reference || undefined,
                  empty: !contract.reference,
                },
                {
                  label: 'Prestataire',
                  value: contract.supplierName || getSupplierName(contract.supplierId),
                },
                {
                  label: 'Cout',
                  value: contract.cost !== null && contract.cost > 0
                    ? `${formatCost(contract.cost)} € / ${contract.costFrequency ? getFrequencyLabel(contract.costFrequency) : ''}`
                    : undefined,
                  empty: !contract.cost || contract.cost === 0,
                },
                {
                  label: 'Frequence',
                  value: contract.costFrequency
                    ? COST_FREQUENCY_OPTIONS.find(o => o.value === contract.costFrequency)?.label
                    : undefined,
                  empty: !contract.costFrequency,
                },
                {
                  label: 'Date de fin',
                  value: contract.endDate ? formatDate(contract.endDate) : undefined,
                  empty: !contract.endDate,
                },
                {
                  label: 'Preavis',
                  value: contract.noticePeriodValue
                    ? `${contract.noticePeriodValue} ${contract.noticePeriodUnit}`
                    : undefined,
                  empty: !contract.noticePeriodValue,
                },
                {
                  label: 'Description',
                  value: contract.description || undefined,
                  empty: !contract.description,
                  fullWidth: true,
                },
              ]}
            />
          </ConfirmationSection>

          {contract.files.length > 0 && (
            <div className="flex items-start gap-2 text-sm">
              <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
              <div className="min-w-0">
                <span className="font-medium">
                  {contract.files.length} piece{contract.files.length > 1 ? 's' : ''} jointe{contract.files.length > 1 ? 's' : ''}
                </span>
                {contract.files.map((file, fi) => {
                  const previewUrl = URL.createObjectURL(file)
                  return (
                    <div key={fi} className="flex items-center gap-1.5 group">
                      <p className="text-xs text-muted-foreground truncate flex-1">{file.name}</p>
                      <a
                        href={previewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 p-0.5 rounded text-muted-foreground/50 hover:text-primary hover:bg-primary/10 transition-colors"
                        title={`Apercu : ${file.name}`}
                      >
                        <Eye className="h-3 w-3" />
                      </a>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      ))}

      <ConfirmationFinancialHighlight
        title="Recapitulatif"
        lines={[
          {
            label: 'Nombre de contrats',
            value: `${contracts.length} contrat${contracts.length > 1 ? 's' : ''} fournisseur${contracts.length > 1 ? 's' : ''}`,
          },
        ]}
        totalLabel={
          allSameFrequency && totalCost > 0 && contracts[0]?.costFrequency
            ? `Total ${getFrequencyLabel(contracts[0].costFrequency)}`
            : undefined
        }
        totalValue={
          allSameFrequency && totalCost > 0 && contracts[0]?.costFrequency
            ? `${formatCost(totalCost)} \u20AC`
            : undefined
        }
      />
    </ConfirmationPageShell>
  )
}
