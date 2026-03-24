"use client"

/**
 * InterventionPlannerStep - Shared wrapper for intervention planning in contract wizards
 *
 * Provides the common orchestration layer used by both lease and supplier contract wizards:
 * - Header (icon + title + subtitle)
 * - ScrollArea with configurable sections
 * - ContactSelector integration (ref + assignment state)
 * - Toggle, date, scheduling, and assignment handlers
 *
 * Each wizard passes its own sections configuration and assignable roles.
 */

import React, { useMemo, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { CalendarCheck, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

import { InterventionScheduleRow } from './intervention-schedule-row'
import ContactSelector, { type ContactSelectorRef } from '@/components/contact-selector'
import { CUSTOM_DATE_VALUE } from '@/lib/constants/lease-interventions'
import { CONTACT_TYPE_TO_ROLE, ROLE_TO_CONTACT_TYPE } from '@/lib/constants/assignable-roles'
import type { InterventionPlannerStepProps, InterventionPlannerRef } from '@/lib/types/intervention-planner.types'

export const InterventionPlannerStep = forwardRef<InterventionPlannerRef, InterventionPlannerStepProps>(function InterventionPlannerStep({
  title,
  subtitle,
  headerIcon: HeaderIcon = CalendarCheck,
  sections,
  scheduledInterventions,
  onInterventionsChange,
  teamId,
  assignableRoles,
  allowedContactTypes,
  allowedContactIds,
  preSelectContactIds,
  onAddCustomIntervention,
  onDeleteCustomIntervention,
  onCustomTitleChange,
  onCustomDescriptionChange,
  externalAssignedUsers,
  onExternalContactSelected,
  onExternalContactRemoved,
}, ref) {
  const contactSelectorRef = useRef<ContactSelectorRef>(null)

  const [activeAssignment, setActiveAssignment] = useState<{
    interventionKey: string
    contactType: string
  } | null>(null)

  // ─── Intervention handlers ──────────────────────────────────

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
        // SchedulingOption.calculateDate takes (startDate, endDate) — supplier options
        // ignore startDate but the signature is maintained for compatibility
        const dummyDate = new Date()
        return {
          ...i,
          selectedSchedulingOption: optionValue,
          scheduledDate: option.calculateDate(dummyDate, dummyDate),
          isAutoCalculated: true,
        }
      })
    )
  }, [onInterventionsChange])

  // ─── Custom intervention handlers ───────────────────────────

  const handleCustomTitleChange = useCallback((key: string, titleValue: string) => {
    onCustomTitleChange?.(key, titleValue)
  }, [onCustomTitleChange])

  const handleCustomDescriptionChange = useCallback((key: string, description: string) => {
    onCustomDescriptionChange?.(key, description)
  }, [onCustomDescriptionChange])

  // ─── Assignment handlers ────────────────────────────────────

  const handleAssignType = useCallback((interventionKey: string, contactType: string) => {
    setActiveAssignment({ interventionKey, contactType })

    // Pre-select contacts if configured (e.g. lease tenant auto-select)
    let preSelected: string[] | undefined
    if (preSelectContactIds?.[contactType]) {
      const intervention = scheduledInterventions.find(i => i.key === interventionKey)
      const role = CONTACT_TYPE_TO_ROLE[contactType]
      const hasRole = intervention?.assignedUsers.some(u => u.role === role)
      // Also check external users (e.g. rent reminders)
      const externalHasRole = externalAssignedUsers?.[interventionKey]?.some(u => u.role === role)
      if (!hasRole && !externalHasRole) {
        preSelected = preSelectContactIds[contactType]
      }
    }

    requestAnimationFrame(() => {
      contactSelectorRef.current?.openContactModal(contactType, undefined, preSelected)
    })
  }, [scheduledInterventions, preSelectContactIds, externalAssignedUsers])

  // Expose handleAssignType via ref for external callers (e.g. rent reminder popover)
  useImperativeHandle(ref, () => ({
    handleAssignType,
  }), [handleAssignType])

  // Build selectedContacts for ContactSelector based on active assignment
  const selectedContactsForSelector = useMemo(() => {
    if (!activeAssignment) return {}

    // Check external users first (e.g. rent reminders)
    const users = externalAssignedUsers?.[activeAssignment.interventionKey]
      ?? scheduledInterventions.find(i => i.key === activeAssignment.interventionKey)?.assignedUsers

    if (!users) return {}

    const result: Record<string, Array<{ id: string; name: string; email: string; type: string }>> = {}
    for (const user of users) {
      const contactType = ROLE_TO_CONTACT_TYPE[user.role]
      if (!contactType) continue
      if (!result[contactType]) result[contactType] = []
      result[contactType].push({
        id: user.userId,
        name: user.name,
        email: '',
        type: contactType,
      })
    }
    return result
  }, [activeAssignment, scheduledInterventions, externalAssignedUsers])

  const handleContactSelected = useCallback((contact: { id: string; name: string }, contactType: string) => {
    if (!activeAssignment) return
    const role = CONTACT_TYPE_TO_ROLE[contactType]
    if (!role) return

    // Delegate to external handler if this is an external key
    if (externalAssignedUsers?.[activeAssignment.interventionKey] !== undefined) {
      onExternalContactSelected?.(activeAssignment.interventionKey, contact, contactType)
      return
    }

    onInterventionsChange(prev =>
      prev.map(i => {
        if (i.key !== activeAssignment.interventionKey) return i
        if (i.assignedUsers.some(u => u.userId === contact.id)) return i
        return {
          ...i,
          assignedUsers: [...i.assignedUsers, { userId: contact.id, role, name: contact.name }],
        }
      })
    )
  }, [activeAssignment, onInterventionsChange, externalAssignedUsers, onExternalContactSelected])

  const handleContactRemoved = useCallback((contactId: string, contactType: string) => {
    if (!activeAssignment) return

    // Delegate to external handler if this is an external key
    if (externalAssignedUsers?.[activeAssignment.interventionKey] !== undefined) {
      onExternalContactRemoved?.(activeAssignment.interventionKey, contactId, contactType)
      return
    }

    onInterventionsChange(prev =>
      prev.map(i => {
        if (i.key !== activeAssignment.interventionKey) return i
        return {
          ...i,
          assignedUsers: i.assignedUsers.filter(u => u.userId !== contactId),
        }
      })
    )
  }, [activeAssignment, onInterventionsChange, externalAssignedUsers, onExternalContactRemoved])

  // ─── Derived state ─────────────────────────────────────────

  const hasEmptyCustomTitle = scheduledInterventions.some(
    i => i.key.startsWith('custom_') && i.enabled && !i.title.trim()
  )

  // ─── Render ─────────────────────────────────────────────────

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto">
        <div className="flex items-center justify-center gap-2 mb-2">
          <HeaderIcon className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">{title}</h2>
        </div>
        <p className="text-muted-foreground">{subtitle}</p>
      </div>

      {/* Sections */}
      <div className="max-w-4xl mx-auto">
        <ScrollArea className="max-h-[600px]">
          <div className="space-y-6 py-2 pr-4">
            {sections.map((section, idx) => (
              <React.Fragment key={section.id}>
                {idx > 0 && <Separator />}

                {section.renderCustom ? (
                  /* Custom section (e.g. rent reminders) */
                  section.renderCustom()
                ) : (
                  /* Standard section with InterventionScheduleRow entries */
                  <div className={cn(
                    "space-y-3",
                    section.allowCustomAdd && "rounded-lg border-2 border-dashed border-indigo-200 bg-indigo-50/30 p-4"
                  )}>
                    <div className="flex items-center justify-between">
                      <h3 className={cn(
                        "text-sm font-medium flex items-center gap-2",
                        section.allowCustomAdd ? "font-semibold text-indigo-700" : "text-muted-foreground"
                      )}>
                        {section.icon && (
                          <section.icon className={cn("h-4 w-4", section.allowCustomAdd ? "" : section.iconColorClass)} />
                        )}
                        {section.title}
                      </h3>
                      {section.allowCustomAdd && onAddCustomIntervention && section.rows.length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={onAddCustomIntervention}
                          disabled={hasEmptyCustomTitle}
                          className="h-7 text-xs gap-1 border-indigo-200 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Ajouter
                        </Button>
                      )}
                    </div>
                    {section.rows.length > 0 ? (
                      <div className="space-y-2">
                        {section.rows.map(intervention => {
                          const isCustom = intervention.key.startsWith('custom_')
                          return (
                            <InterventionScheduleRow
                              key={intervention.key}
                              intervention={intervention}
                              assignableRoles={assignableRoles}
                              isEditable={isCustom}
                              onToggle={(enabled) => handleToggle(intervention.key, enabled)}
                              onDateChange={(date) => handleDateChange(intervention.key, date)}
                              onSchedulingOptionChange={(value) => handleSchedulingOptionChange(intervention.key, value)}
                              onAssignType={(contactType) => handleAssignType(intervention.key, contactType)}
                              onTitleChange={isCustom ? (t) => handleCustomTitleChange(intervention.key, t) : undefined}
                              onDescriptionChange={isCustom ? (d) => handleCustomDescriptionChange(intervention.key, d) : undefined}
                              onDelete={isCustom && onDeleteCustomIntervention ? () => onDeleteCustomIntervention(intervention.key) : undefined}
                              showDelete={isCustom}
                            />
                          )
                        })}
                      </div>
                    ) : section.allowCustomAdd && onAddCustomIntervention ? (
                      <button
                        type="button"
                        onClick={onAddCustomIntervention}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-md hover:bg-indigo-50/50 transition-colors cursor-pointer text-sm text-indigo-600"
                      >
                        <Plus className="h-4 w-4" />
                        <span className="font-medium">Planifier une intervention</span>
                        <span className="text-muted-foreground text-xs">&mdash; entretien, réparation, visite...</span>
                      </button>
                    ) : (
                      <p className="text-sm text-muted-foreground/60 text-center py-4">
                        Aucun élément dans cette section.
                      </p>
                    )}
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* ContactSelector — hidden UI, opens via ref */}
      <ContactSelector
        ref={contactSelectorRef}
        teamId={teamId}
        hideUI={true}
        selectionMode="multi"
        allowedContactTypes={allowedContactTypes}
        allowedContactIds={allowedContactIds}
        selectedContacts={selectedContactsForSelector}
        onContactSelected={handleContactSelected}
        onContactRemoved={handleContactRemoved}
      />
    </div>
  )
})

export default InterventionPlannerStep
