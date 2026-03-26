"use client"

/**
 * PropertyInterventionsStep - Planning step for building and lot creation wizards
 *
 * Reuses InterventionScheduleRow and ContactSelector.
 * Displays:
 * - Recommended technical reminders/interventions (filtered by entity type)
 * - Missing document reminders
 * - Toggle type (intervention/reminder) + recurrence editing per row
 * - Assignment via ContactSelector
 * - Custom add popover (intervention or reminder)
 */

import { useMemo, useRef, useState, useCallback, useEffect } from 'react'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

import { CalendarCheck, FileSearch, Plus, Wrench, Bell } from 'lucide-react'

import { InterventionScheduleRow, type ScheduledInterventionData } from './contract/intervention-schedule-row'
import ContactSelector, { type ContactSelectorRef } from '@/components/contact-selector'
import {
  type PropertyEntityType,
  generatePropertyInterventions,
  createEmptyCustomIntervention,
  createEmptyCustomReminder,
  CUSTOM_DATE_VALUE
} from '@/lib/constants/property-interventions'

/** Contact minimal passed by parent */
interface AvailableContact {
  id: string
  name: string
  role: string
}

interface PropertyInterventionsStepProps {
  entityType: PropertyEntityType
  scheduledInterventions: ScheduledInterventionData[]
  onInterventionsChange: React.Dispatch<React.SetStateAction<ScheduledInterventionData[]>>
  missingDocuments: string[]
  documentExpiryDates: Record<string, string>
  teamId: string
  availableContacts: AvailableContact[]
  currentUser?: { id: string; name: string }
  hideHeader?: boolean
}

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
  building: 'Programmez les suivis techniques et rappels lies a cet immeuble.',
  lot: 'Programmez les suivis techniques et rappels lies a ce lot.',
  lot_in_building: 'Programmez les suivis lies a ce lot.'
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
  const [addPopoverOpen, setAddPopoverOpen] = useState(false)

  const [activeAssignment, setActiveAssignment] = useState<{
    interventionKey: string
    contactType: string
  } | null>(null)

  // Stable serializations for effect dependencies
  const expiryDatesKey = JSON.stringify(documentExpiryDates)
  const missingDocsKey = JSON.stringify(missingDocuments)
  const currentUserKey = currentUser?.id ?? ''

  // Initialize interventions — propagate itemType + recurrenceRule from templates
  useEffect(() => {
    const results = generatePropertyInterventions(entityType, documentExpiryDates, missingDocuments)

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
      assignedUsers: defaultAssignedUsers,
      itemType: template.itemType ?? 'reminder',
      recurrenceRule: template.recurrenceRule,
    }))

    onInterventionsChange(prev => {
      const existingCustom = prev.filter(i => i.key.startsWith('custom_'))
      return [...existingCustom, ...interventions]
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, expiryDatesKey, missingDocsKey, currentUserKey])

  // Split into main rows and document rows
  const { mainRows, documentRows } = useMemo(() => {
    const main = scheduledInterventions.filter(i => !i.key.startsWith('retrieve_document_'))
    const documents = scheduledInterventions.filter(i => i.key.startsWith('retrieve_document_'))
    return { mainRows: main, documentRows: documents }
  }, [scheduledInterventions])

  const hasEmptyCustomTitle = mainRows.some(i => i.key.startsWith('custom_') && i.enabled && !i.title.trim())

  // ─── Handlers ──────────────────────────────────────────────

  const handleToggle = useCallback((key: string, enabled: boolean) => {
    onInterventionsChange(prev =>
      prev.map(i => i.key === key ? { ...i, enabled } : i)
    )
  }, [onInterventionsChange])

  const handleDateChange = useCallback((key: string, date: Date | null) => {
    onInterventionsChange(prev =>
      prev.map(i => i.key === key
        ? { ...i, scheduledDate: date, isAutoCalculated: false, selectedSchedulingOption: CUSTOM_DATE_VALUE }
        : i
      )
    )
  }, [onInterventionsChange])

  const handleSchedulingOptionChange = useCallback((key: string, optionValue: string) => {
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
  }, [onInterventionsChange])

  const handleItemTypeChange = useCallback((key: string, newType: 'intervention' | 'reminder') => {
    onInterventionsChange(prev =>
      prev.map(i => {
        if (i.key !== key) return i
        const updated = { ...i, itemType: newType }
        if (newType === 'reminder') {
          updated.assignedUsers = i.assignedUsers.filter(u => u.role === 'gestionnaire')
        }
        return updated
      })
    )
  }, [onInterventionsChange])

  const handleRecurrenceChange = useCallback((key: string, rrule: string | null) => {
    onInterventionsChange(prev =>
      prev.map(i => i.key === key ? { ...i, recurrenceRule: rrule ?? undefined } : i)
    )
  }, [onInterventionsChange])

  // ─── Custom handlers ──────────────────────────────────────

  const handleCustomTitleChange = useCallback((key: string, title: string) => {
    onInterventionsChange(prev =>
      prev.map(i => i.key === key ? { ...i, title, enabled: title.trim().length > 0 } : i)
    )
  }, [onInterventionsChange])

  const handleCustomDescriptionChange = useCallback((key: string, description: string) => {
    onInterventionsChange(prev =>
      prev.map(i => i.key === key ? { ...i, description } : i)
    )
  }, [onInterventionsChange])

  const handleAddCustomIntervention = useCallback(() => {
    onInterventionsChange(prev => {
      const firstCustomIdx = prev.findIndex(i => i.key.startsWith('custom_'))
      const newCustom = createEmptyCustomIntervention(currentUser)
      const result = [...prev]
      result.splice(firstCustomIdx >= 0 ? firstCustomIdx : 0, 0, newCustom)
      return result
    })
    setAddPopoverOpen(false)
  }, [onInterventionsChange, currentUser])

  const handleAddCustomReminder = useCallback(() => {
    onInterventionsChange(prev => [...prev, createEmptyCustomReminder(currentUser)])
    setAddPopoverOpen(false)
  }, [onInterventionsChange, currentUser])

  const handleDeleteCustom = useCallback((key: string) => {
    onInterventionsChange(prev => prev.filter(i => i.key !== key))
  }, [onInterventionsChange])

  // ─── Assignment ────────────────────────────────────────────

  const handleAssignType = useCallback((interventionKey: string, contactType: string) => {
    setActiveAssignment({ interventionKey, contactType })
    requestAnimationFrame(() => {
      contactSelectorRef.current?.openContactModal(contactType, undefined)
    })
  }, [])

  const selectedContactsForSelector = useMemo(() => {
    if (!activeAssignment) return {}
    const intervention = scheduledInterventions.find(i => i.key === activeAssignment.interventionKey)
    if (!intervention) return {}

    const result: Record<string, Array<{ id: string; name: string; email: string; type: string }>> = {}
    for (const user of intervention.assignedUsers) {
      const contactType = ROLE_TO_CONTACT_TYPE[user.role]
      if (!contactType) continue
      if (!result[contactType]) result[contactType] = []
      result[contactType].push({ id: user.userId, name: user.name, email: '', type: contactType })
    }
    return result
  }, [activeAssignment, scheduledInterventions])

  const handleContactSelected = useCallback((contact: { id: string; name: string }, contactType: string) => {
    if (!activeAssignment) return
    const role = CONTACT_TYPE_TO_ROLE[contactType]
    if (!role) return
    onInterventionsChange(prev =>
      prev.map(i => {
        if (i.key !== activeAssignment.interventionKey) return i
        if (i.assignedUsers.some(u => u.userId === contact.id)) return i
        return { ...i, assignedUsers: [...i.assignedUsers, { userId: contact.id, role, name: contact.name }] }
      })
    )
  }, [activeAssignment, onInterventionsChange])

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleContactRemoved = useCallback((contactId: string, _contactType: string) => {
    if (!activeAssignment) return
    onInterventionsChange(prev =>
      prev.map(i => {
        if (i.key !== activeAssignment.interventionKey) return i
        return { ...i, assignedUsers: i.assignedUsers.filter(u => u.userId !== contactId) }
      })
    )
  }, [activeAssignment, onInterventionsChange])

  // ─── Render helpers ────────────────────────────────────────

  const renderRow = (intervention: ScheduledInterventionData) => {
    const isCustom = intervention.key.startsWith('custom_')
    return (
      <InterventionScheduleRow
        key={intervention.key}
        intervention={intervention}
        isEditable={isCustom}
        onToggle={(enabled) => handleToggle(intervention.key, enabled)}
        onDateChange={(date) => handleDateChange(intervention.key, date)}
        onSchedulingOptionChange={(value) => handleSchedulingOptionChange(intervention.key, value)}
        onAssignType={(contactType) => handleAssignType(intervention.key, contactType)}
        onItemTypeChange={(type) => handleItemTypeChange(intervention.key, type)}
        onRecurrenceChange={(rrule) => handleRecurrenceChange(intervention.key, rrule)}
        onTitleChange={isCustom ? (t) => handleCustomTitleChange(intervention.key, t) : undefined}
        onDescriptionChange={isCustom ? (d) => handleCustomDescriptionChange(intervention.key, d) : undefined}
        onDelete={isCustom ? () => handleDeleteCustom(intervention.key) : undefined}
        showDelete={isCustom}
      />
    )
  }

  // lot_in_building with nothing returns null
  if (mainRows.length === 0 && documentRows.length === 0 && entityType === 'lot_in_building') {
    return null
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {!hideHeader && (
        <div className="text-center max-w-2xl mx-auto">
          <div className="flex items-center justify-center gap-2 mb-2">
            <CalendarCheck className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold">{ENTITY_TITLES[entityType]}</h2>
          </div>
          <p className="text-muted-foreground">{ENTITY_DESCRIPTIONS[entityType]}</p>
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        <div className="space-y-6 py-2">
          {/* Main rows — unified list with toggle per row */}
          {mainRows.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <CalendarCheck className="h-4 w-4 text-primary" />
                  Suivis recommandes
                </h3>
              </div>
              <div className="space-y-2">
                {mainRows.map(renderRow)}
              </div>
            </div>
          )}

          {/* Add custom suivi button */}
          <div className="flex justify-center">
            <Popover open={addPopoverOpen} onOpenChange={setAddPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" disabled={hasEmptyCustomTitle} className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  Ajouter un suivi
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-3" align="center">
                <p className="text-sm font-medium mb-2">Ce suivi implique-t-il quelqu&apos;un d&apos;autre ?</p>
                <div className="space-y-1.5">
                  <button
                    type="button"
                    onClick={handleAddCustomIntervention}
                    className="w-full flex items-start gap-3 p-2.5 rounded-lg hover:bg-indigo-50 transition-colors text-left"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-100">
                      <Wrench className="h-4 w-4 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Oui — Intervention</p>
                      <p className="text-xs text-muted-foreground">Implique un prestataire externe</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={handleAddCustomReminder}
                    className="w-full flex items-start gap-3 p-2.5 rounded-lg hover:bg-amber-50 transition-colors text-left"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100">
                      <Bell className="h-4 w-4 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Non — Rappel</p>
                      <p className="text-xs text-muted-foreground">Tache interne de gestion</p>
                    </div>
                  </button>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Missing documents */}
          {documentRows.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <FileSearch className="h-4 w-4 text-amber-500" />
                  Documents a recuperer ({documentRows.length})
                </h3>
                <div className="space-y-2">
                  {documentRows.map(renderRow)}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

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
