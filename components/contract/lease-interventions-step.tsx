"use client"

/**
 * LeaseInterventionsStep - Étape de planification des interventions dans le flux de création de bail
 *
 * Affiche une liste d'interventions planifiables avec :
 * - Interventions standard filtrées selon le type de charges
 * - Interventions pour documents manquants (récupération)
 * - Toggle enable/disable + scheduling dropdown par intervention
 * - Assignation de personnes via ContactSelector (réutilisé)
 */

import { useMemo, useRef, useState, useCallback } from 'react'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { CalendarCheck, FileSearch } from 'lucide-react'

import { InterventionScheduleRow, type ScheduledInterventionData } from './intervention-schedule-row'
import ContactSelector, { type ContactSelectorRef } from '@/components/contact-selector'
import type { ContractDocumentType } from '@/lib/types/contract.types'
import { CUSTOM_DATE_VALUE } from '@/lib/constants/lease-interventions'

/** Contact minimal passé par le parent */
interface AvailableContact {
  id: string
  name: string
  role: string
}

interface LeaseInterventionsStepProps {
  scheduledInterventions: ScheduledInterventionData[]
  onInterventionsChange: React.Dispatch<React.SetStateAction<ScheduledInterventionData[]>>
  missingDocuments: ContractDocumentType[]
  startDate: Date | null
  endDate: Date | null
  /** ID de l'équipe pour le ContactSelector */
  teamId: string
  /** IDs des locataires sélectionnés pour ce bail */
  leaseTenantIds: string[]
  /** Tous les contacts de l'équipe (pour résoudre les noms) */
  availableContacts: AvailableContact[]
}

// Mapping rôle FR → type ContactSelector EN
const ROLE_TO_CONTACT_TYPE: Record<string, string> = {
  gestionnaire: 'manager',
  locataire: 'tenant',
  prestataire: 'provider'
}

const CONTACT_TYPE_TO_ROLE: Record<string, 'gestionnaire' | 'prestataire' | 'locataire'> = {
  manager: 'gestionnaire',
  tenant: 'locataire',
  provider: 'prestataire'
}

export function LeaseInterventionsStep({
  scheduledInterventions,
  onInterventionsChange,
  missingDocuments,
  startDate,
  endDate,
  teamId,
  leaseTenantIds,
  availableContacts
}: LeaseInterventionsStepProps) {
  const contactSelectorRef = useRef<ContactSelectorRef>(null)

  // Track quel intervention + type est en cours d'assignation
  const [activeAssignment, setActiveAssignment] = useState<{
    interventionKey: string
    contactType: string
  } | null>(null)

  // Séparer les interventions standard et documents manquants
  const { standardInterventions, documentInterventions } = useMemo(() => {
    const standard = scheduledInterventions.filter(i => !i.key.startsWith('retrieve_document_'))
    const documents = scheduledInterventions.filter(i => i.key.startsWith('retrieve_document_'))
    return { standardInterventions: standard, documentInterventions: documents }
  }, [scheduledInterventions])

  // Toggle une intervention
  const handleToggle = (key: string, enabled: boolean) => {
    onInterventionsChange(prev =>
      prev.map(i => i.key === key ? { ...i, enabled } : i)
    )
  }

  // Changer la date d'une intervention (mode Date personnalisée)
  const handleDateChange = (key: string, date: Date | null) => {
    onInterventionsChange(prev =>
      prev.map(i => i.key === key
        ? { ...i, scheduledDate: date, isAutoCalculated: false, selectedSchedulingOption: CUSTOM_DATE_VALUE }
        : i
      )
    )
  }

  // Changer l'option de planification relative
  const handleSchedulingOptionChange = (key: string, optionValue: string) => {
    onInterventionsChange(prev =>
      prev.map(i => {
        if (i.key !== key) return i
        if (optionValue === CUSTOM_DATE_VALUE) {
          return { ...i, selectedSchedulingOption: CUSTOM_DATE_VALUE, isAutoCalculated: false }
        }
        const option = i.availableOptions.find(o => o.value === optionValue)
        if (!option || !startDate || !endDate) return i
        return {
          ...i,
          selectedSchedulingOption: optionValue,
          scheduledDate: option.calculateDate(startDate, endDate),
          isAutoCalculated: true
        }
      })
    )
  }

  // Clic sur un type dans le Popover → ouvrir ContactSelector (avec pré-sélection pour tenants)
  const handleAssignType = useCallback((interventionKey: string, contactType: string) => {
    setActiveAssignment({ interventionKey, contactType })

    // Pré-sélectionner les locataires du bail si aucun n'est encore assigné
    let preSelected: string[] | undefined
    if (contactType === 'tenant') {
      const intervention = scheduledInterventions.find(i => i.key === interventionKey)
      const hasTenants = intervention?.assignedUsers.some(u => u.role === 'locataire')
      if (!hasTenants && leaseTenantIds.length > 0) {
        preSelected = leaseTenantIds
      }
    }

    // Defer pour laisser React flush le state update (activeAssignment)
    // Ainsi selectedContactsForSelector sera à jour quand le modal s'ouvre
    requestAnimationFrame(() => {
      contactSelectorRef.current?.openContactModal(contactType, undefined, preSelected)
    })
  }, [scheduledInterventions, leaseTenantIds])

  // Construire les selectedContacts pour le ContactSelector basé sur l'intervention active
  const selectedContactsForSelector = useMemo(() => {
    if (!activeAssignment) return {}
    const intervention = scheduledInterventions.find(i => i.key === activeAssignment.interventionKey)
    if (!intervention) return {}

    // Grouper les assignedUsers par contact type (EN)
    const result: Record<string, Array<{ id: string; name: string; email: string; type: string }>> = {}
    for (const user of intervention.assignedUsers) {
      const contactType = ROLE_TO_CONTACT_TYPE[user.role]
      if (!contactType) continue
      if (!result[contactType]) result[contactType] = []
      result[contactType].push({
        id: user.userId,
        name: user.name,
        email: '',
        type: contactType
      })
    }
    return result
  }, [activeAssignment, scheduledInterventions])

  // Callback quand un contact est sélectionné dans le ContactSelector
  const handleContactSelected = useCallback((contact: { id: string; name: string }, contactType: string) => {
    if (!activeAssignment) return
    const role = CONTACT_TYPE_TO_ROLE[contactType]
    if (!role) return

    onInterventionsChange(prev =>
      prev.map(i => {
        if (i.key !== activeAssignment.interventionKey) return i
        // Éviter les doublons
        if (i.assignedUsers.some(u => u.userId === contact.id)) return i
        return {
          ...i,
          assignedUsers: [...i.assignedUsers, { userId: contact.id, role, name: contact.name }]
        }
      })
    )
  }, [activeAssignment, onInterventionsChange])

  // Callback quand un contact est retiré dans le ContactSelector
  const handleContactRemoved = useCallback((contactId: string, _contactType: string) => {
    if (!activeAssignment) return

    onInterventionsChange(prev =>
      prev.map(i => {
        if (i.key !== activeAssignment.interventionKey) return i
        return {
          ...i,
          assignedUsers: i.assignedUsers.filter(u => u.userId !== contactId)
        }
      })
    )
  }, [activeAssignment, onInterventionsChange])

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto">
        <div className="flex items-center justify-center gap-2 mb-2">
          <CalendarCheck className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Planifier les suivis du bail</h2>
        </div>
        <p className="text-muted-foreground">
          Programmez les interventions liées à ce contrat de location.
          Vous pouvez modifier les dates ou désactiver certaines tâches.
          Cette étape est optionnelle.
        </p>
      </div>

      {/* Liste des interventions */}
      <div className="max-w-4xl mx-auto">
        <ScrollArea className="max-h-[600px]">
          <div className="space-y-6 py-2 pr-4">
            {/* Interventions standard */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">
                Suivis standard du bail
              </h3>
              <div className="space-y-2">
                {standardInterventions.map(intervention => (
                  <InterventionScheduleRow
                    key={intervention.key}
                    intervention={intervention}
                    onToggle={(enabled) => handleToggle(intervention.key, enabled)}
                    onDateChange={(date) => handleDateChange(intervention.key, date)}
                    onSchedulingOptionChange={(value) => handleSchedulingOptionChange(intervention.key, value)}
                    onAssignType={(contactType) => handleAssignType(intervention.key, contactType)}
                  />
                ))}
              </div>
            </div>

            {/* Documents manquants */}
            {documentInterventions.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <FileSearch className="h-4 w-4 text-amber-500" />
                    Documents à récupérer ({documentInterventions.length})
                  </h3>
                  <div className="space-y-2">
                    {documentInterventions.map(intervention => (
                      <InterventionScheduleRow
                        key={intervention.key}
                        intervention={intervention}
                        onToggle={(enabled) => handleToggle(intervention.key, enabled)}
                        onDateChange={(date) => handleDateChange(intervention.key, date)}
                        onSchedulingOptionChange={(value) => handleSchedulingOptionChange(intervention.key, value)}
                        onAssignType={(contactType) => handleAssignType(intervention.key, contactType)}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* ContactSelector caché — le Dialog s'ouvre via ref */}
      <ContactSelector
        ref={contactSelectorRef}
        teamId={teamId}
        hideUI={true}
        selectionMode="multi"
        allowedContactTypes={['manager', 'tenant', 'provider']}
        allowedContactIds={{ tenant: leaseTenantIds }}
        selectedContacts={selectedContactsForSelector}
        onContactSelected={handleContactSelected}
        onContactRemoved={handleContactRemoved}
      />
    </div>
  )
}

export default LeaseInterventionsStep
