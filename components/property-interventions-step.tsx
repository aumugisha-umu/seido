"use client"

/**
 * PropertyInterventionsStep - Étape de planification des interventions
 * dans les flux de création d'immeuble et de lot
 *
 * Réutilise InterventionScheduleRow et ContactSelector existants.
 * Affiche :
 * - Interventions techniques recommandées (filtré par entity type)
 * - Interventions pour documents manquants (récupération)
 * - Toggle enable/disable + scheduling dropdown par intervention
 * - Assignation de personnes via ContactSelector
 */

import { useMemo, useRef, useState, useCallback, useEffect } from 'react'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'

import { CalendarCheck, FileSearch, PenLine, Plus } from 'lucide-react'

import { InterventionScheduleRow, type ScheduledInterventionData } from './contract/intervention-schedule-row'
import ContactSelector, { type ContactSelectorRef } from '@/components/contact-selector'
import {
  type PropertyEntityType,
  generatePropertyInterventions,
  createEmptyCustomIntervention,
  CUSTOM_DATE_VALUE
} from '@/lib/constants/property-interventions'

/** Contact minimal passé par le parent */
interface AvailableContact {
  id: string
  name: string
  role: string
}

interface PropertyInterventionsStepProps {
  /** Type d'entité (building, lot, lot_in_building) */
  entityType: PropertyEntityType
  /** Interventions planifiées (state remonté au parent) */
  scheduledInterventions: ScheduledInterventionData[]
  /** Setter pour les interventions (state remonté au parent) */
  onInterventionsChange: React.Dispatch<React.SetStateAction<ScheduledInterventionData[]>>
  /** Types de documents recommandés manquants */
  missingDocuments: string[]
  /** Dates d'expiration des documents par type (ISO strings) */
  documentExpiryDates: Record<string, string>
  /** ID de l'équipe pour le ContactSelector */
  teamId: string
  /** Tous les contacts de l'équipe */
  availableContacts: AvailableContact[]
  /** Utilisateur courant (pré-assigné comme gestionnaire) */
  currentUser?: { id: string; name: string }
  /** Hide the header (title + description) — used when parent renders its own section header */
  hideHeader?: boolean
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

const ENTITY_TITLES: Record<PropertyEntityType, string> = {
  building: 'Planifier les suivis de l\'immeuble',
  lot: 'Planifier les suivis du lot',
  lot_in_building: 'Planifier les suivis du lot'
}

const ENTITY_DESCRIPTIONS: Record<PropertyEntityType, string> = {
  building: 'Programmez les interventions techniques liées à cet immeuble.',
  lot: 'Programmez les interventions techniques liées à ce lot.',
  lot_in_building: 'Programmez les interventions liées à ce lot.'
}

export function PropertyInterventionsStep({
  entityType,
  scheduledInterventions,
  onInterventionsChange,
  missingDocuments,
  documentExpiryDates,
  teamId,
  // availableContacts — reserved for future name resolution
  currentUser,
  hideHeader = false
}: PropertyInterventionsStepProps) {
  const contactSelectorRef = useRef<ContactSelectorRef>(null)

  // Track quel intervention + type est en cours d'assignation
  const [activeAssignment, setActiveAssignment] = useState<{
    interventionKey: string
    contactType: string
  } | null>(null)

  // Serialize object/array dependencies to stable strings so the effect only
  // fires when the actual *values* change, not when the parent creates new refs.
  const expiryDatesKey = JSON.stringify(documentExpiryDates)
  const missingDocsKey = JSON.stringify(missingDocuments)
  const currentUserKey = currentUser?.id ?? ''

  // Initialize interventions when inputs change — preserve custom ones
  useEffect(() => {
    const results = generatePropertyInterventions(entityType, documentExpiryDates, missingDocuments)

    // Pré-assigner le gestionnaire actuel à chaque intervention
    const defaultAssignedUsers = currentUser
      ? [{ userId: currentUser.id, role: 'gestionnaire' as const, name: currentUser.name }]
      : []

    const interventions: ScheduledInterventionData[] = results.map(({ template, options, defaultOption, defaultDate }) => ({
      key: template.key,
      title: template.title,
      description: template.description,
      interventionTypeCode: template.interventionTypeCode,
      icon: template.icon,
      colorClass: template.colorClass,
      enabled: template.enabledByDefault,
      scheduledDate: defaultDate,
      isAutoCalculated: true,
      availableOptions: options,
      selectedSchedulingOption: defaultOption,
      assignedUsers: defaultAssignedUsers
    }))

    onInterventionsChange(prev => {
      const existingCustom = prev.filter(i => i.key.startsWith('custom_'))
      return [...existingCustom, ...interventions]
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, expiryDatesKey, missingDocsKey, currentUserKey])

  // Séparer les interventions custom, standard et documents manquants
  const { customInterventions, standardInterventions, documentInterventions } = useMemo(() => {
    const custom = scheduledInterventions.filter(i => i.key.startsWith('custom_'))
    const standard = scheduledInterventions.filter(i => !i.key.startsWith('retrieve_document_') && !i.key.startsWith('custom_'))
    const documents = scheduledInterventions.filter(i => i.key.startsWith('retrieve_document_'))
    return { customInterventions: custom, standardInterventions: standard, documentInterventions: documents }
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
        if (!option) return i
        const creationDate = new Date()
        return {
          ...i,
          selectedSchedulingOption: optionValue,
          scheduledDate: option.calculateDate(creationDate, creationDate),
          isAutoCalculated: true
        }
      })
    )
  }

  // ─── Custom intervention handlers ──────────────────────────────
  const handleCustomTitleChange = (key: string, title: string) => {
    onInterventionsChange(prev =>
      prev.map(i => i.key === key ? { ...i, title, enabled: title.trim().length > 0 } : i)
    )
  }

  const handleCustomDescriptionChange = (key: string, description: string) => {
    onInterventionsChange(prev =>
      prev.map(i => i.key === key ? { ...i, description } : i)
    )
  }

  const handleAddCustomIntervention = () => {
    onInterventionsChange(prev => {
      const lastCustomIdx = prev.reduce((acc, item, idx) => item.key.startsWith('custom_') ? idx : acc, -1)
      const newCustom = createEmptyCustomIntervention(currentUser)
      const result = [...prev]
      result.splice(lastCustomIdx + 1, 0, newCustom)
      return result
    })
  }

  const handleDeleteCustomIntervention = (key: string) => {
    onInterventionsChange(prev => prev.filter(i => i.key !== key))
  }

  // Clic sur un type dans le Popover → ouvrir ContactSelector
  const handleAssignType = useCallback((interventionKey: string, contactType: string) => {
    setActiveAssignment({ interventionKey, contactType })

    requestAnimationFrame(() => {
      contactSelectorRef.current?.openContactModal(contactType, undefined)
    })
  }, [])

  // Construire les selectedContacts pour le ContactSelector basé sur l'intervention active
  const selectedContactsForSelector = useMemo(() => {
    if (!activeAssignment) return {}
    const intervention = scheduledInterventions.find(i => i.key === activeAssignment.interventionKey)
    if (!intervention) return {}

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
        if (i.assignedUsers.some(u => u.userId === contact.id)) return i
        return {
          ...i,
          assignedUsers: [...i.assignedUsers, { userId: contact.id, role, name: contact.name }]
        }
      })
    )
  }, [activeAssignment, onInterventionsChange])

  // Callback quand un contact est retiré dans le ContactSelector
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

  // lot_in_building with nothing returns null (parent handles layout)
  if (standardInterventions.length === 0 && documentInterventions.length === 0 && entityType === 'lot_in_building') {
    return null
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header — hidden when parent provides its own section header */}
      {!hideHeader && (
        <div className="text-center max-w-2xl mx-auto">
          <div className="flex items-center justify-center gap-2 mb-2">
            <CalendarCheck className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold">{ENTITY_TITLES[entityType]}</h2>
          </div>
          <p className="text-muted-foreground">
            {ENTITY_DESCRIPTIONS[entityType]}
          </p>
        </div>
      )}

      {/* Liste des interventions */}
      <div className="max-w-4xl mx-auto">
        <div className="space-y-6 py-2">
            {/* Custom interventions */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <PenLine className="h-4 w-4 text-indigo-500" />
                  Interventions personnalisées
                </h3>
                <Button variant="outline" size="sm" onClick={handleAddCustomIntervention} className="h-7 text-xs gap-1">
                  <Plus className="h-3.5 w-3.5" />
                  Ajouter
                </Button>
              </div>
              <div className="space-y-2">
                {customInterventions.map((intervention, index) => (
                  <InterventionScheduleRow
                    key={intervention.key}
                    intervention={intervention}
                    isEditable
                    onTitleChange={(title) => handleCustomTitleChange(intervention.key, title)}
                    onDescriptionChange={(desc) => handleCustomDescriptionChange(intervention.key, desc)}
                    onToggle={(enabled) => handleToggle(intervention.key, enabled)}
                    onDateChange={(date) => handleDateChange(intervention.key, date)}
                    onSchedulingOptionChange={(value) => handleSchedulingOptionChange(intervention.key, value)}
                    onAssignType={(contactType) => handleAssignType(intervention.key, contactType)}
                    onDelete={() => handleDeleteCustomIntervention(intervention.key)}
                    showDelete={true}
                  />
                ))}
              </div>
            </div>

            {(standardInterventions.length > 0 || documentInterventions.length > 0) && <Separator />}

            {/* Interventions standard */}
            {standardInterventions.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Suivis techniques recommandés
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
            )}

            {/* Documents manquants */}
            {documentInterventions.length > 0 && (
              <>
                {standardInterventions.length > 0 && <Separator />}
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
      </div>

      {/* ContactSelector caché — le Dialog s'ouvre via ref */}
      <ContactSelector
        ref={contactSelectorRef}
        teamId={teamId}
        hideUI={true}
        selectionMode="multi"
        allowedContactTypes={['manager', 'provider']}
        selectedContacts={selectedContactsForSelector}
        onContactSelected={handleContactSelected}
        onContactRemoved={handleContactRemoved}
      />
    </div>
  )
}

export default PropertyInterventionsStep
