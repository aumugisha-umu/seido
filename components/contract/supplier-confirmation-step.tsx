"use client"

/**
 * Supplier Confirmation Step — Summary of all supplier contracts before submission
 * Uses reusable confirmation components for consistent layout.
 */

import { Building2, Home, FileText, CheckCircle2, AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  ConfirmationPageShell,
  ConfirmationEntityHeader,
  ConfirmationSection,
  ConfirmationKeyValueGrid,
  ConfirmationFinancialHighlight,
  ConfirmationDocumentList,
} from '@/components/confirmation'
import type { SupplierContractFormItem } from '@/lib/types/supplier-contract.types'
import { COST_FREQUENCY_OPTIONS } from '@/lib/types/supplier-contract.types'
import type { ScheduledInterventionData } from '@/components/contract/intervention-schedule-row'
import { format } from 'date-fns'

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
  scheduledInterventions?: ScheduledInterventionData[]
}

export function SupplierConfirmationStep({
  contracts,
  buildingName,
  lotReference,
  contacts,
  scheduledInterventions = [],
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

  // Annual cost calculation
  const annualMultiplier: Record<string, number> = {
    mensuel: 12, trimestriel: 4, semestriel: 2, annuel: 1, unique: 1,
  }
  const getAnnualCost = (cost: number | null, frequency: string) => {
    if (!cost || cost <= 0 || !frequency || frequency === 'unique') return null
    return cost * (annualMultiplier[frequency] || 1)
  }
  const totalAnnualCost = contracts.reduce((sum, c) => {
    const annual = getAnnualCost(c.cost, c.costFrequency)
    return sum + (annual || 0)
  }, 0)

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

      <ConfirmationSection title="Bien concerne" card>
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
          <ConfirmationSection title={`Contrat ${index + 1}`} compact card>
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
                  value: (() => {
                    if (!contract.cost || contract.cost <= 0) return undefined
                    const base = `${formatCost(contract.cost)} \u20AC / ${contract.costFrequency ? getFrequencyLabel(contract.costFrequency) : ''}`
                    const annual = getAnnualCost(contract.cost, contract.costFrequency)
                    if (annual && contract.costFrequency !== 'annuel') {
                      return `${base} (${formatCost(annual)} \u20AC/an)`
                    }
                    return base
                  })(),
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
            <ConfirmationDocumentList
              slots={contract.files.map((f) => ({
                label: f.name,
                fileCount: 1,
                fileNames: [{ name: f.name, url: URL.createObjectURL(f) }],
                recommended: false,
              }))}
            />
          )}
        </div>
      ))}

      {scheduledInterventions.length > 0 && (() => {
        const enabledInterventions = scheduledInterventions.filter(i => i.enabled)
        const disabledCount = scheduledInterventions.length - enabledInterventions.length
        return (
          <ConfirmationSection title="Interventions planifiees">
            {enabledInterventions.length > 0 ? (
              <div className="space-y-2">
                {enabledInterventions.map((intervention) => (
                  <div key={intervention.key} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{intervention.title}</span>
                      <span className="text-muted-foreground">
                        - {intervention.scheduledDate ? format(intervention.scheduledDate, 'dd/MM/yyyy') : '\u2014'}
                      </span>
                      {intervention.assignedUsers.length > 0 && (
                        <span className="text-muted-foreground text-xs">
                          ({intervention.assignedUsers.length} intervenant{intervention.assignedUsers.length > 1 ? 's' : ''})
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {disabledCount > 0 && (
                  <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>{disabledCount} intervention(s) desactivee(s)</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Aucune intervention activee</p>
            )}
          </ConfirmationSection>
        )
      })()}

      <ConfirmationFinancialHighlight
        title="Recapitulatif"
        lines={[
          {
            label: 'Nombre de contrats',
            value: `${contracts.length} contrat${contracts.length > 1 ? 's' : ''} fournisseur${contracts.length > 1 ? 's' : ''}`,
          },
          ...(allSameFrequency && totalCost > 0 && contracts[0]?.costFrequency
            ? [{
                label: `Total ${getFrequencyLabel(contracts[0].costFrequency)}`,
                value: `${formatCost(totalCost)} \u20AC`,
              }]
            : []),
        ]}
        totalLabel={totalAnnualCost > 0 ? 'Total annuel' : undefined}
        totalValue={totalAnnualCost > 0 ? `${formatCost(totalAnnualCost)} \u20AC/an` : undefined}
      />
    </ConfirmationPageShell>
  )
}
