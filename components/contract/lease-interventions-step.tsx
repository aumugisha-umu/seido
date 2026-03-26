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
import { CalendarCheck, FileSearch, Banknote, UserPlus, Users, Wrench, Bell } from 'lucide-react'
import { cn } from '@/lib/utils'

import { InterventionPlannerStep } from './intervention-planner-step'
import type { InterventionPlannerRef } from '@/lib/types/intervention-planner.types'
import type { ScheduledInterventionData, InterventionAssignment } from './intervention-schedule-row'
import type { ContractDocumentType } from '@/lib/types/contract.types'
import type { InterventionPlannerSection } from '@/lib/types/intervention-planner.types'
import { createEmptyCustomIntervention, createEmptyCustomReminder } from '@/lib/constants/property-interventions'
import { LEASE_ASSIGNABLE_ROLES, ROLE_COLORS, GESTIONNAIRE_ONLY_ROLES } from '@/lib/constants/assignable-roles'
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
  itemType: 'intervention' | 'reminder'
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

  const { mainRows, documentRows } = useMemo(() => {
    const main = scheduledInterventions.filter(i => !i.key.startsWith('retrieve_document_'))
    // Sort custom interventions to the top so newly added cards are immediately visible
    main.sort((a, b) => {
      const aCustom = a.key.startsWith('custom_') ? 0 : 1
      const bCustom = b.key.startsWith('custom_') ? 0 : 1
      return aCustom - bCustom
    })
    const documents = scheduledInterventions.filter(i => i.key.startsWith('retrieve_document_'))
    return { mainRows: main, documentRows: documents }
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
    onInterventionsChange(prev => [createEmptyCustomIntervention(), ...prev])
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

  const handleAddCustomReminder = useCallback(() => {
    onInterventionsChange(prev => [createEmptyCustomReminder(), ...prev])
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

  const handleRentReminderItemTypeChange = useCallback((newType: 'intervention' | 'reminder') => {
    const filtered = newType === 'reminder'
      ? rentReminderConfig.assignedUsers.filter(u => u.role === 'gestionnaire')
      : rentReminderConfig.assignedUsers
    onRentReminderChange({ ...rentReminderConfig, itemType: newType, assignedUsers: filtered })
  }, [rentReminderConfig, onRentReminderChange])

  // ─── Rent reminder renderCustom ─────────────────────────────
  // This is a ref-stable function that will be called by InterventionPlannerStep
  // to render the custom rent reminder section. We need a stable reference for handleAssignType
  // which lives inside the planner. We solve this by using the planner's externalAssignedUsers
  // + onExternalContactSelected/Removed pattern.

  const rentAssignableRoles = rentReminderConfig.itemType === 'reminder'
    ? GESTIONNAIRE_ONLY_ROLES
    : LEASE_ASSIGNABLE_ROLES.filter(r => r.type !== 'provider')

  const isRentReminder = rentReminderConfig.itemType === 'reminder'

  const renderRentReminders = useCallback(() => (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
        <Banknote className="h-4 w-4 text-emerald-600" />
        Appel de loyer
      </h3>
      {/* Card matching InterventionScheduleRow layout: border-l-4, same horizontal flow */}
      <div
        className={cn(
          "flex items-start gap-3 p-4 rounded-lg border border-l-4 transition-colors",
          rentReminderConfig.enabled
            ? (isRentReminder ? "bg-white border-l-amber-500" : "bg-white border-l-indigo-500")
            : (isRentReminder ? "bg-amber-50/30 border-l-amber-300" : "bg-indigo-50/30 border-l-indigo-300")
        )}
      >
        {/* Checkbox */}
        <Checkbox
          checked={rentReminderConfig.enabled}
          onCheckedChange={(checked: boolean) => onRentReminderChange({ ...rentReminderConfig, enabled: checked })}
          className="mt-1"
        />

        {/* Icon */}
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
            rentReminderConfig.enabled ? "bg-emerald-500/10" : "bg-muted"
          )}
        >
          <Banknote className={cn("h-4 w-4", rentReminderConfig.enabled ? "text-emerald-600" : "text-muted-foreground")} />
        </div>

        {/* Toggle intervention/rappel */}
        {rentReminderConfig.enabled && (
          <div className="shrink-0 flex rounded-md border overflow-hidden">
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" onClick={() => handleRentReminderItemTypeChange('intervention')}
                    className={cn("flex items-center justify-center h-7 w-7 transition-colors",
                      rentReminderConfig.itemType === 'intervention'
                        ? "bg-indigo-100 text-indigo-700"
                        : "bg-transparent text-muted-foreground hover:bg-muted"
                    )}>
                    <Wrench className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">Intervention — implique les locataires</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" onClick={() => handleRentReminderItemTypeChange('reminder')}
                    className={cn("flex items-center justify-center h-7 w-7 transition-colors",
                      rentReminderConfig.itemType === 'reminder'
                        ? "bg-amber-100 text-amber-700"
                        : "bg-transparent text-muted-foreground hover:bg-muted"
                    )}>
                    <Bell className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">Rappel interne</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}

        {/* Content: title + description + avatars */}
        <div className="flex-1 min-w-0">
          <h4 className={cn("font-medium text-sm", !rentReminderConfig.enabled && "text-muted-foreground")}>
            Appel de loyer
          </h4>
          <p className={cn("text-xs mt-0.5", rentReminderConfig.enabled ? "text-muted-foreground" : "text-muted-foreground/60")}>
            {rentReminderConfig.enabled && reminderCount > 0
              ? `${reminderCount} appel${reminderCount > 1 ? 's' : ''} de loyer mensuel${reminderCount > 1 ? 's' : ''} seront créés`
              : 'Un appel de loyer sera créé pour chaque échéance mensuelle du bail'}
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
                  {rentAssignableRoles.map(({ type, label, Icon, color }) => (
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

        {/* Day-of-month selector — same 240px column as scheduling dropdown in InterventionScheduleRow */}
        <div className="shrink-0 w-[240px] space-y-1.5">
          {rentReminderConfig.enabled ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Jour du mois</span>
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
          ) : (
            <div className="h-10 flex items-center justify-center text-xs text-muted-foreground">
              —
            </div>
          )}
        </div>
      </div>
    </div>
  ), [rentReminderConfig, onRentReminderChange, rentPopoverOpen, reminderCount, handleRentReminderItemTypeChange, rentAssignableRoles, isRentReminder])

  // ─── Build sections ─────────────────────────────────────────

  const sections: InterventionPlannerSection[] = useMemo(() => {
    const result: InterventionPlannerSection[] = []

    // Section 1: All interventions + reminders in a unified list (toggle on each row)
    if (mainRows.length > 0) {
      result.push({
        id: 'main',
        title: 'Suivis du bail',
        icon: CalendarCheck,
        iconColorClass: 'text-primary',
        rows: mainRows,
        allowCustomAdd: true,
      })
    }

    // Section 2: Rent reminders (custom inline rendering)
    result.push({
      id: 'rent_reminders',
      title: 'Appel de loyer',
      rows: [],
      renderCustom: renderRentReminders,
    })

    // Section 3: Missing documents
    if (documentRows.length > 0) {
      result.push({
        id: 'documents',
        title: `Documents a recuperer (${documentRows.length})`,
        icon: FileSearch,
        iconColorClass: 'text-amber-500',
        rows: documentRows,
      })
    }

    return result
  }, [mainRows, documentRows, renderRentReminders])

  // ─── Render ─────────────────────────────────────────────────

  return (
    <InterventionPlannerStep
      ref={plannerRef}
      title="Planifier les suivis du bail"
      subtitle="Programmez les interventions et rappels liés à ce contrat de location."
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
      onAddCustomReminder={handleAddCustomReminder}
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
