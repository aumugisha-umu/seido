"use client"

/**
 * LeaseInterventionsStep - Thin wrapper around InterventionPlannerStep for lease wizard
 *
 * Lease-specific responsibilities:
 * - Builds 4 sections: custom interventions, rent reminders, standard, documents
 * - Rent reminder UI (custom inline block with day selector, assign popover)
 * - Custom intervention CRUD handlers
 * - Tenant pre-selection for assignment
 */

import { useMemo, useState, useCallback, useRef } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { CalendarCheck, FileSearch, PenLine, Banknote, UserPlus, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

import { InterventionPlannerStep } from './intervention-planner-step'
import type { InterventionPlannerRef } from '@/lib/types/intervention-planner.types'
import type { ScheduledInterventionData, InterventionAssignment } from './intervention-schedule-row'
import type { ContractDocumentType } from '@/lib/types/contract.types'
import type { InterventionPlannerSection } from '@/lib/types/intervention-planner.types'
import { createEmptyCustomIntervention } from '@/lib/constants/property-interventions'
import { LEASE_ASSIGNABLE_ROLES, ROLE_COLORS } from '@/lib/constants/assignable-roles'
import { CONTACT_TYPE_TO_ROLE } from '@/lib/constants/assignable-roles'

/** Contact minimal passé par le parent */
export interface AvailableContact {
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

interface LeaseInterventionsStepProps {
  scheduledInterventions: ScheduledInterventionData[]
  onInterventionsChange: React.Dispatch<React.SetStateAction<ScheduledInterventionData[]>>
  missingDocuments: ContractDocumentType[]
  startDate: Date | null
  endDate: Date | null
  teamId: string
  leaseTenantIds: string[]
  availableContacts: AvailableContact[]
  rentReminderConfig: RentReminderConfig
  onRentReminderChange: (config: RentReminderConfig) => void
}

export function LeaseInterventionsStep({
  scheduledInterventions,
  onInterventionsChange,
  startDate,
  endDate,
  teamId,
  leaseTenantIds,
  rentReminderConfig,
  onRentReminderChange
}: LeaseInterventionsStepProps) {
  const [rentPopoverOpen, setRentPopoverOpen] = useState(false)
  const plannerRef = useRef<InterventionPlannerRef>(null)

  // ─── Intervention grouping ──────────────────────────────────

  const { customInterventions, standardInterventions, documentInterventions } = useMemo(() => {
    const custom = scheduledInterventions.filter(i => i.key.startsWith('custom_'))
    const standard = scheduledInterventions.filter(i => !i.key.startsWith('retrieve_document_') && !i.key.startsWith('custom_'))
    const documents = scheduledInterventions.filter(i => i.key.startsWith('retrieve_document_'))
    return { customInterventions: custom, standardInterventions: standard, documentInterventions: documents }
  }, [scheduledInterventions])

  // ─── Rent reminder logic ────────────────────────────────────

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

  const getInitials = (name: string) => {
    const parts = name.split(' ').filter(Boolean)
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
    return (name.substring(0, 2)).toUpperCase()
  }

  // ─── Custom intervention handlers ───────────────────────────

  const handleAddCustomIntervention = useCallback(() => {
    onInterventionsChange(prev => {
      const lastCustomIdx = prev.reduce((acc, item, idx) => item.key.startsWith('custom_') ? idx : acc, -1)
      const newCustom = createEmptyCustomIntervention()
      const result = [...prev]
      result.splice(lastCustomIdx + 1, 0, newCustom)
      return result
    })
  }, [onInterventionsChange])

  const handleDeleteCustomIntervention = useCallback((key: string) => {
    onInterventionsChange(prev => prev.filter(i => i.key !== key))
  }, [onInterventionsChange])

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

  // ─── External contact handlers (rent reminders) ─────────────

  const handleExternalContactSelected = useCallback((_key: string, contact: { id: string; name: string }, contactType: string) => {
    const role = CONTACT_TYPE_TO_ROLE[contactType]
    if (!role) return
    if (rentReminderConfig.assignedUsers.some(u => u.userId === contact.id)) return
    onRentReminderChange({
      ...rentReminderConfig,
      assignedUsers: [...rentReminderConfig.assignedUsers, { userId: contact.id, role, name: contact.name }],
    })
  }, [rentReminderConfig, onRentReminderChange])

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleExternalContactRemoved = useCallback((_key: string, contactId: string, _contactType: string) => {
    onRentReminderChange({
      ...rentReminderConfig,
      assignedUsers: rentReminderConfig.assignedUsers.filter(u => u.userId !== contactId),
    })
  }, [rentReminderConfig, onRentReminderChange])

  // ─── Rent reminder renderCustom ─────────────────────────────
  // This is a ref-stable function that will be called by InterventionPlannerStep
  // to render the custom rent reminder section. We need a stable reference for handleAssignType
  // which lives inside the planner. We solve this by using the planner's externalAssignedUsers
  // + onExternalContactSelected/Removed pattern.

  const renderRentReminders = useCallback(() => (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
        <Banknote className="h-4 w-4 text-emerald-600" />
        Rappels de paiement
      </h3>
      <div className="flex items-start gap-3 p-4 rounded-lg border transition-colors bg-card border-border">
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
                  {LEASE_ASSIGNABLE_ROLES.map(({ type, label, Icon, color }) => (
                    <Button
                      key={type}
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start gap-2 h-8 text-xs"
                      onClick={() => {
                        setRentPopoverOpen(false)
                        plannerRef.current?.handleAssignType(RENT_REMINDER_KEY, type)
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
  ), [rentReminderConfig, onRentReminderChange, rentPopoverOpen, reminderCount])

  // ─── Build sections ─────────────────────────────────────────

  const sections: InterventionPlannerSection[] = useMemo(() => {
    const result: InterventionPlannerSection[] = [
      {
        id: 'custom',
        title: 'Interventions personnalisées',
        icon: PenLine,
        iconColorClass: 'text-indigo-500',
        rows: customInterventions,
        allowCustomAdd: true,
      },
      {
        id: 'rent_reminders',
        title: 'Rappels de paiement',
        rows: [],
        renderCustom: renderRentReminders,
      },
    ]

    if (standardInterventions.length > 0) {
      result.push({
        id: 'standard',
        title: 'Suivis standard du bail',
        rows: standardInterventions,
      })
    }

    if (documentInterventions.length > 0) {
      result.push({
        id: 'documents',
        title: `Documents à récupérer (${documentInterventions.length})`,
        icon: FileSearch,
        iconColorClass: 'text-amber-500',
        rows: documentInterventions,
      })
    }

    return result
  }, [customInterventions, standardInterventions, documentInterventions, renderRentReminders])

  // ─── Render ─────────────────────────────────────────────────

  return (
    <InterventionPlannerStep
      ref={plannerRef}
      title="Planifier les suivis du bail"
      subtitle="Programmez les interventions liées à ce contrat de location. Vous pouvez modifier les dates ou désactiver certaines tâches. Cette étape est optionnelle."
      headerIcon={CalendarCheck}
      sections={sections}
      scheduledInterventions={scheduledInterventions}
      onInterventionsChange={onInterventionsChange}
      teamId={teamId}
      assignableRoles={LEASE_ASSIGNABLE_ROLES}
      allowedContactTypes={['manager', 'tenant', 'provider']}
      allowedContactIds={{ tenant: leaseTenantIds }}
      preSelectContactIds={{ tenant: leaseTenantIds }}
      onAddCustomIntervention={handleAddCustomIntervention}
      onDeleteCustomIntervention={handleDeleteCustomIntervention}
      onCustomTitleChange={handleCustomTitleChange}
      onCustomDescriptionChange={handleCustomDescriptionChange}
      externalAssignedUsers={{ [RENT_REMINDER_KEY]: rentReminderConfig.assignedUsers }}
      onExternalContactSelected={handleExternalContactSelected}
      onExternalContactRemoved={handleExternalContactRemoved}
    />
  )
}

export default LeaseInterventionsStep
