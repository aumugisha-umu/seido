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

import { useMemo, useRef, useState, useCallback, useEffect } from 'react'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { CalendarCheck, FileSearch, PenLine, Plus, Banknote, UserPlus, Users, User, Briefcase } from 'lucide-react'
import { cn } from '@/lib/utils'

import { InterventionScheduleRow, type ScheduledInterventionData, type InterventionAssignment } from './intervention-schedule-row'
import ContactSelector, { type ContactSelectorRef } from '@/components/contact-selector'
import type { ContractDocumentType } from '@/lib/types/contract.types'
import { CUSTOM_DATE_VALUE } from '@/lib/constants/lease-interventions'
import { createEmptyCustomIntervention } from '@/lib/constants/property-interventions'

/** Contact minimal passé par le parent */
interface AvailableContact {
  id: string
  name: string
  role: string
}

/** Configuration des rappels de paiement */
export interface RentReminderConfig {
  enabled: boolean
  dayOfMonth: number
  assignedUsers: InterventionAssignment[]
}

const RENT_REMINDER_KEY = 'rent_reminders'

const ROLE_COLORS: Record<string, string> = {
  gestionnaire: 'bg-purple-100 text-purple-700 border-purple-200',
  prestataire: 'bg-green-100 text-green-700 border-green-200',
  locataire: 'bg-blue-100 text-blue-700 border-blue-200'
}

const ASSIGN_TYPE_OPTIONS = [
  { type: 'manager', label: 'Gestionnaires', Icon: Users, color: 'text-purple-600' },
  { type: 'tenant', label: 'Locataires', Icon: User, color: 'text-blue-600' },
  { type: 'provider', label: 'Prestataires', Icon: Briefcase, color: 'text-green-600' }
]

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
  /** Rent reminder configuration */
  rentReminderConfig: RentReminderConfig
  onRentReminderChange: (config: RentReminderConfig) => void
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
  availableContacts,
  rentReminderConfig,
  onRentReminderChange
}: LeaseInterventionsStepProps) {
  const contactSelectorRef = useRef<ContactSelectorRef>(null)

  // Track quel intervention + type est en cours d'assignation
  const [activeAssignment, setActiveAssignment] = useState<{
    interventionKey: string
    contactType: string
  } | null>(null)
  const [rentPopoverOpen, setRentPopoverOpen] = useState(false)

  // Initialize one empty custom intervention when the list first populates
  const hasInitializedCustom = useRef(false)
  useEffect(() => {
    if (!hasInitializedCustom.current && scheduledInterventions.length > 0) {
      const hasCustom = scheduledInterventions.some(i => i.key.startsWith('custom_'))
      if (!hasCustom) {
        hasInitializedCustom.current = true
        onInterventionsChange(prev => [createEmptyCustomIntervention(), ...prev])
      }
    }
  }, [scheduledInterventions.length, onInterventionsChange])

  // Séparer les interventions custom, standard et documents manquants
  const { customInterventions, standardInterventions, documentInterventions } = useMemo(() => {
    const custom = scheduledInterventions.filter(i => i.key.startsWith('custom_'))
    const standard = scheduledInterventions.filter(i => !i.key.startsWith('retrieve_document_') && !i.key.startsWith('custom_'))
    const documents = scheduledInterventions.filter(i => i.key.startsWith('retrieve_document_'))
    return { customInterventions: custom, standardInterventions: standard, documentInterventions: documents }
  }, [scheduledInterventions])

  // Compute rent reminder count (future months only)
  const reminderCount = useMemo(() => {
    if (!startDate || !endDate) return 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    let count = 0
    const current = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
    const endMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 1)
    while (current <= endMonth) {
      const reminderDate = new Date(current.getFullYear(), current.getMonth(), rentReminderConfig.dayOfMonth)
      if (reminderDate >= today) count++
      current.setMonth(current.getMonth() + 1)
    }
    return count
  }, [startDate, endDate, rentReminderConfig.dayOfMonth])

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
      const newCustom = createEmptyCustomIntervention()
      const result = [...prev]
      result.splice(lastCustomIdx + 1, 0, newCustom)
      return result
    })
  }

  const handleDeleteCustomIntervention = (key: string) => {
    onInterventionsChange(prev => prev.filter(i => i.key !== key))
  }

  const getInitials = (name: string) => {
    const parts = name.split(' ').filter(Boolean)
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
    return (name.substring(0, 2)).toUpperCase()
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

    // Determine which users to show based on the key
    const users = activeAssignment.interventionKey === RENT_REMINDER_KEY
      ? rentReminderConfig.assignedUsers
      : scheduledInterventions.find(i => i.key === activeAssignment.interventionKey)?.assignedUsers

    if (!users) return {}

    // Grouper les assignedUsers par contact type (EN)
    const result: Record<string, Array<{ id: string; name: string; email: string; type: string }>> = {}
    for (const user of users) {
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
  }, [activeAssignment, scheduledInterventions, rentReminderConfig.assignedUsers])

  // Callback quand un contact est sélectionné dans le ContactSelector
  const handleContactSelected = useCallback((contact: { id: string; name: string }, contactType: string) => {
    if (!activeAssignment) return
    const role = CONTACT_TYPE_TO_ROLE[contactType]
    if (!role) return

    if (activeAssignment.interventionKey === RENT_REMINDER_KEY) {
      if (rentReminderConfig.assignedUsers.some(u => u.userId === contact.id)) return
      onRentReminderChange({
        ...rentReminderConfig,
        assignedUsers: [...rentReminderConfig.assignedUsers, { userId: contact.id, role, name: contact.name }]
      })
      return
    }

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
  }, [activeAssignment, onInterventionsChange, rentReminderConfig, onRentReminderChange])

  // Callback quand un contact est retiré dans le ContactSelector
  const handleContactRemoved = useCallback((contactId: string, _contactType: string) => {
    if (!activeAssignment) return

    if (activeAssignment.interventionKey === RENT_REMINDER_KEY) {
      onRentReminderChange({
        ...rentReminderConfig,
        assignedUsers: rentReminderConfig.assignedUsers.filter(u => u.userId !== contactId)
      })
      return
    }

    onInterventionsChange(prev =>
      prev.map(i => {
        if (i.key !== activeAssignment.interventionKey) return i
        return {
          ...i,
          assignedUsers: i.assignedUsers.filter(u => u.userId !== contactId)
        }
      })
    )
  }, [activeAssignment, onInterventionsChange, rentReminderConfig, onRentReminderChange])

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
                    showDelete={index > 0}
                  />
                ))}
              </div>
            </div>

            {/* Rappels de paiement */}
            <Separator />
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Banknote className="h-4 w-4 text-emerald-600" />
                Rappels de paiement
              </h3>
              <div
                className="flex items-start gap-3 p-4 rounded-lg border transition-colors bg-card border-border"
              >
                <Checkbox
                  checked={rentReminderConfig.enabled}
                  onCheckedChange={(checked: boolean) => onRentReminderChange({ ...rentReminderConfig, enabled: checked })}
                  className="mt-1"
                />
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                  <Banknote className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm">Rappel de paiement du loyer</h4>
                  <p className="text-xs mt-0.5 text-muted-foreground">
                    {rentReminderConfig.enabled && reminderCount > 0
                      ? `${reminderCount} rappel${reminderCount > 1 ? 's' : ''} mensuel${reminderCount > 1 ? 's' : ''} seront créés`
                      : 'Un rappel sera créé pour chaque échéance mensuelle du bail'}
                  </p>
                  {/* Avatar chips des personnes assignées */}
                  {rentReminderConfig.enabled && rentReminderConfig.assignedUsers.length > 0 && (
                    <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                      <TooltipProvider delayDuration={200}>
                        {rentReminderConfig.assignedUsers.map(user => (
                          <Tooltip key={user.userId}>
                            <TooltipTrigger asChild>
                              <div
                                className={cn(
                                  "flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-medium border cursor-default",
                                  ROLE_COLORS[user.role] || 'bg-muted text-muted-foreground border-border'
                                )}
                              >
                                {getInitials(user.name)}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="text-xs">
                              {user.name} ({user.role})
                            </TooltipContent>
                          </Tooltip>
                        ))}
                      </TooltipProvider>
                    </div>
                  )}
                </div>
                {/* Assign button */}
                {rentReminderConfig.enabled && (
                  <div className="shrink-0">
                    <Popover open={rentPopoverOpen} onOpenChange={setRentPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className={cn(
                            "h-9 gap-1.5 text-xs",
                            rentReminderConfig.assignedUsers.length > 0 && "border-primary/30 text-primary"
                          )}
                        >
                          {rentReminderConfig.assignedUsers.length > 0 ? (
                            <>
                              <Users className="h-3.5 w-3.5" />
                              {rentReminderConfig.assignedUsers.length}
                            </>
                          ) : (
                            <>
                              <UserPlus className="h-3.5 w-3.5" />
                              Assigner
                            </>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent align="end" className="w-48 p-1.5">
                        <div className="space-y-0.5">
                          <p className="text-xs font-medium text-muted-foreground px-2 py-1">Ajouter des...</p>
                          {ASSIGN_TYPE_OPTIONS.map(({ type, label, Icon, color }) => (
                            <Button
                              key={type}
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start gap-2 h-8 text-xs"
                              onClick={() => {
                                setRentPopoverOpen(false)
                                handleAssignType(RENT_REMINDER_KEY, type)
                              }}
                            >
                              <Icon className={cn("h-3.5 w-3.5", color)} />
                              {label}
                            </Button>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                )}
                {/* Day selector */}
                {rentReminderConfig.enabled && (
                  <div className="shrink-0 flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Jour</span>
                    <Select
                      value={String(rentReminderConfig.dayOfMonth)}
                      onValueChange={(v) => onRentReminderChange({ ...rentReminderConfig, dayOfMonth: Number(v) })}
                    >
                      <SelectTrigger className="w-[70px] h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                          <SelectItem key={day} value={String(day)} className="text-xs">
                            {day}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>

            {(standardInterventions.length > 0 || documentInterventions.length > 0) && <Separator />}

            {/* Interventions standard */}
            {standardInterventions.length > 0 && (
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
