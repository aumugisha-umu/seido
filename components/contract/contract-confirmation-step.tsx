'use client'

import { format } from 'date-fns'
import {
  Euro,
  FileText,
  Wrench,
  Bell,
  AlertTriangle
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { ParticipantChip } from '@/components/interventions/shared/layout/participants-row'
import {
  ConfirmationPageShell,
  ConfirmationEntityHeader,
  ConfirmationSection,
  ConfirmationKeyValueGrid,
  ConfirmationFinancialHighlight,
  ConfirmationContactGrid,
  ConfirmationDocumentList,
} from '@/components/confirmation'
import type { ScheduledInterventionData } from '@/components/contract/intervention-schedule-row'
import type {
  ContractFormData,
  ContractContactRole,
  ChargesType
} from '@/lib/types/contract.types'
import {
  GUARANTEE_TYPE_LABELS,
  CONTRACT_DURATION_OPTIONS,
  CONTRACT_CONTACT_ROLE_LABELS,
  PAYMENT_FREQUENCY_LABELS,
  CHARGES_TYPE_LABELS
} from '@/lib/types/contract.types'
import { LEASE_DOCUMENT_SLOTS } from '@/lib/constants/lease-document-slots'
import type { RentReminderConfig } from '@/components/contract/lease-interventions-step'

// Re-export helper functions used for calculations
export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function calculateContractEndDate(startDate: string, durationMonths: number): Date {
  const date = parseLocalDate(startDate)
  date.setMonth(date.getMonth() + durationMonths)
  date.setDate(date.getDate() - 1)
  return date
}

export function generateContractReference(lotReference: string | undefined, startDate: string, durationMonths: number): string {
  if (!lotReference || !startDate) return ''
  const start = parseLocalDate(startDate)
  const end = calculateContractEndDate(startDate, durationMonths)
  const formatDate = (d: Date) => `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
  return `BAIL-${lotReference}-${formatDate(start)}-${formatDate(end)}`
}

interface Contact {
  id: string
  name: string
  email: string | null
  phone: string | null
  role: string
}

interface FormContact {
  id?: string
  userId: string
  role: ContractContactRole
  isPrimary: boolean
}

interface DocumentSlotSummary {
  type: string
  files: Array<{ name?: string; fileName?: string; signedUrl?: string; expiryDate?: string }>
}

interface ContractConfirmationStepProps {
  formData: Partial<ContractFormData>
  selectedLot: { reference?: string; building?: { name?: string }; street?: string; city?: string; floor?: number | null } | undefined
  initialContacts: Contact[]
  originalContacts: FormContact[]
  scheduledInterventions: ScheduledInterventionData[]
  rentReminderConfig: RentReminderConfig
  slots: DocumentSlotSummary[]
  mode: 'create' | 'edit'
}

export function ContractConfirmationStep({
  formData,
  selectedLot,
  initialContacts,
  originalContacts,
  scheduledInterventions,
  rentReminderConfig,
  slots,
  mode
}: ContractConfirmationStepProps) {
  const displayRef = formData.title?.trim() || generateContractReference(
    selectedLot?.reference,
    formData.startDate!,
    formData.durationMonths || 12
  )
  const endDate = formData.startDate && formData.durationMonths
    ? calculateContractEndDate(formData.startDate, formData.durationMonths)
    : null
  const durationLabel = CONTRACT_DURATION_OPTIONS.find(o => o.value === formData.durationMonths)?.label || `${formData.durationMonths} mois`
  const chargesTypeLabel = formData.chargesType ? CHARGES_TYPE_LABELS[formData.chargesType as keyof typeof CHARGES_TYPE_LABELS] : ''
  const frequencyLabel = formData.paymentFrequency ? PAYMENT_FREQUENCY_LABELS[formData.paymentFrequency as keyof typeof PAYMENT_FREQUENCY_LABELS] : ''
  const monthlyTotal = (formData.rentAmount || 0) + (formData.chargesAmount || 0)
  const enabledInterventions = scheduledInterventions.filter(i => i.enabled && i.scheduledDate)
  const disabledInterventions = scheduledInterventions.filter(i => !i.enabled)
  const interventionItems = enabledInterventions.filter(i => i.itemType !== 'reminder')
  const reminderItems = enabledInterventions.filter(i => i.itemType === 'reminder')

  // Map document slots for ConfirmationDocumentList
  const documentSlotsSummary = slots.map(slot => {
    const slotConfig = LEASE_DOCUMENT_SLOTS.find(s => s.type === slot.type)
    return {
      label: slotConfig?.label || slot.type,
      fileCount: slot.files.length,
      fileNames: slot.files.map((f) => ({ name: f.name || f.fileName || '', url: f.signedUrl })),
      recommended: slotConfig?.recommended ?? false,
    }
  })

  // Map contacts into groups for ConfirmationContactGrid
  const tenantContacts = (formData.contacts || [])
    .filter(c => c.role === 'locataire')
    .map(c => {
      const info = initialContacts.find(ic => ic.id === c.userId)
      return { id: c.userId, name: info?.name || 'Inconnu', email: info?.email || undefined, sublabel: CONTRACT_CONTACT_ROLE_LABELS[c.role] }
    })
  const guarantorContacts = (formData.contacts || [])
    .filter(c => c.role === 'garant')
    .map(c => {
      const info = initialContacts.find(ic => ic.id === c.userId)
      return { id: c.userId, name: info?.name || 'Inconnu', email: info?.email || undefined, sublabel: CONTRACT_CONTACT_ROLE_LABELS[c.role] }
    })

  // Guarantee pairs
  const guaranteePairs = (() => {
    if (formData.guaranteeType === 'pas_de_garantie' || !formData.guaranteeType) {
      return [{ label: 'Type', value: 'Aucune garantie' }]
    }
    const pairs: { label: string; value: React.ReactNode; empty?: boolean }[] = [
      { label: 'Type', value: GUARANTEE_TYPE_LABELS[formData.guaranteeType as keyof typeof GUARANTEE_TYPE_LABELS] },
      { label: 'Montant', value: formData.guaranteeAmount ? `${formData.guaranteeAmount.toLocaleString('fr-FR')} \u20AC` : undefined, empty: !formData.guaranteeAmount },
      { label: 'Notes', value: formData.guaranteeNotes || undefined, empty: !formData.guaranteeNotes },
    ]
    return pairs
  })()

  return (
    <ConfirmationPageShell maxWidth="5xl">
      <ConfirmationEntityHeader
        icon={FileText}
        title={displayRef}
        subtitle={selectedLot ? `${selectedLot.building?.name || 'Lot'} \u00B7 Lot ${selectedLot.reference}` : undefined}
        badges={[
          { label: durationLabel },
          { label: formData.startDate ? parseLocalDate(formData.startDate).toLocaleDateString('fr-FR', { dateStyle: 'long' }) : '' },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-5">
        {/* RIGHT COLUMN (sidebar) - order-first on mobile */}
        <div className="order-first lg:order-none lg:col-start-2">
          <ConfirmationFinancialHighlight
            title="Finances"
            icon={Euro}
            lines={[
              { label: 'Loyer HC', value: `${(formData.rentAmount || 0).toLocaleString('fr-FR')} \u20AC` },
              { label: 'Charges', value: `${(formData.chargesAmount || 0).toLocaleString('fr-FR')} \u20AC` },
              { label: 'Type charges', value: chargesTypeLabel, muted: true },
              { label: 'Frequence', value: frequencyLabel, muted: true },
            ]}
            totalLabel="Total mensuel"
            totalValue={`${monthlyTotal.toLocaleString('fr-FR')} \u20AC`}
          />
        </div>

        {/* LEFT COLUMN */}
        <div className="space-y-5 lg:col-start-1 lg:row-start-1">
          <ConfirmationSection title="Lot concerne">
            <ConfirmationKeyValueGrid pairs={[
              { label: 'Immeuble', value: selectedLot?.building?.name || 'N/A', empty: !selectedLot?.building?.name },
              { label: 'Reference lot', value: selectedLot?.reference || 'N/A', empty: !selectedLot?.reference },
              { label: 'Adresse', value: selectedLot?.street || selectedLot?.city || undefined, empty: !selectedLot?.street && !selectedLot?.city },
              { label: 'Etage', value: selectedLot?.floor != null ? `${selectedLot.floor}` : undefined, empty: selectedLot?.floor == null },
            ]} />
          </ConfirmationSection>

          <ConfirmationSection title="Details du bail">
            <ConfirmationKeyValueGrid pairs={[
              { label: 'Reference', value: <span className="font-mono text-primary">{displayRef}</span> },
              { label: "Date d'effet", value: formData.startDate ? parseLocalDate(formData.startDate).toLocaleDateString('fr-FR', { dateStyle: 'long' }) : undefined, empty: !formData.startDate },
              { label: 'Date de fin', value: endDate ? endDate.toLocaleDateString('fr-FR', { dateStyle: 'long' }) : undefined, empty: !endDate },
              { label: 'Duree', value: durationLabel },
              { label: 'Type de charges', value: chargesTypeLabel, empty: !chargesTypeLabel },
              { label: 'Frequence de paiement', value: frequencyLabel, empty: !frequencyLabel },
              ...(formData.comments ? [{ label: 'Commentaires', value: formData.comments, fullWidth: true }] : []),
            ]} />
          </ConfirmationSection>

          <ConfirmationSection title="Garantie">
            <ConfirmationKeyValueGrid pairs={guaranteePairs} />
          </ConfirmationSection>

          <ConfirmationSection title="Signataires">
            <ConfirmationContactGrid
              groups={[
                { type: 'Locataires', contacts: tenantContacts, emptyLabel: 'Aucun locataire' },
                { type: 'Garants', contacts: guarantorContacts, emptyLabel: 'Aucun garant' },
              ]}
              columns={2}
            />
          </ConfirmationSection>

          <ConfirmationSection title="Documents">
            <ConfirmationDocumentList slots={documentSlotsSummary} />
          </ConfirmationSection>

          {interventionItems.length > 0 && (
            <ConfirmationSection title={`Interventions planifiees (${interventionItems.length})`}>
              <div className="space-y-2">
                {interventionItems.map((intervention, index) => (
                  <div key={index} className="flex items-start gap-2 text-sm">
                    <Wrench className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{intervention.title}</span>
                      <span className="text-muted-foreground">
                        - {intervention.scheduledDate ? format(intervention.scheduledDate, 'dd/MM/yyyy') : '\u2014'}
                      </span>
                      {intervention.assignedUsers.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap">
                          {intervention.assignedUsers.map(user => (
                            <ParticipantChip
                              key={user.userId}
                              participant={{ id: user.userId, name: user.name }}
                              roleKey={user.role === 'gestionnaire' ? 'managers' : user.role === 'prestataire' ? 'providers' : 'tenants'}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ConfirmationSection>
          )}

          {(reminderItems.length > 0 || rentReminderConfig.enabled) && (
            <ConfirmationSection title={`Rappels (${reminderItems.length + (rentReminderConfig.enabled ? 1 : 0)})`}>
              <div className="space-y-2">
                {reminderItems.map((reminder, index) => (
                  <div key={index} className="flex items-start gap-2 text-sm">
                    <Bell className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{reminder.title}</span>
                      <span className="text-muted-foreground">
                        - {reminder.scheduledDate ? format(reminder.scheduledDate, 'dd/MM/yyyy') : '\u2014'}
                      </span>
                      {reminder.assignedUsers.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap">
                          {reminder.assignedUsers.map(user => (
                            <ParticipantChip
                              key={user.userId}
                              participant={{ id: user.userId, name: user.name }}
                              roleKey={user.role === 'gestionnaire' ? 'managers' : user.role === 'prestataire' ? 'providers' : 'tenants'}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {rentReminderConfig.enabled && (
                  <div className="flex items-start gap-2 text-sm">
                    <Bell className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">Appel de loyer</span>
                      <span className="text-muted-foreground">&mdash; le {rentReminderConfig.dayOfMonth} de chaque mois</span>
                    </div>
                  </div>
                )}
              </div>
            </ConfirmationSection>
          )}

          {disabledInterventions.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{disabledInterventions.length} element(s) desactive(s)</span>
            </div>
          )}

          {interventionItems.length === 0 && reminderItems.length === 0 && !rentReminderConfig.enabled && (
            <ConfirmationSection title="Interventions & rappels">
              <p className="text-sm text-muted-foreground">Aucune intervention planifiee</p>
            </ConfirmationSection>
          )}
        </div>
      </div>

      {/* Changes summary (edit mode only) */}
      {mode === 'edit' && (() => {
        const currentUserIds = new Set((formData.contacts || []).map(c => c.userId))
        const originalUserIds = new Set(originalContacts.map(c => c.userId))
        const toAdd = [...currentUserIds].filter(id => !originalUserIds.has(id)).length
        const toRemove = [...originalUserIds].filter(id => !currentUserIds.has(id)).length

        if (toAdd > 0 || toRemove > 0) {
          return (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="p-4">
                <h4 className="font-medium text-amber-800 mb-2">Modifications des contacts</h4>
                {toRemove > 0 && (
                  <p className="text-sm text-amber-700">- {toRemove} contact(s) seront retires</p>
                )}
                {toAdd > 0 && (
                  <p className="text-sm text-amber-700">+ {toAdd} contact(s) seront ajoutes</p>
                )}
              </CardContent>
            </Card>
          )
        }
        return null
      })()}
    </ConfirmationPageShell>
  )
}
