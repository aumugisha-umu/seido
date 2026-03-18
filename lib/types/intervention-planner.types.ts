/**
 * Shared types for the InterventionPlannerStep component
 *
 * Used by both lease and supplier contract wizards to configure
 * the intervention planning step with sections, assignable roles,
 * and scheduling options.
 */

import type { LucideIcon } from 'lucide-react'
import type { ScheduledInterventionData, InterventionAssignment } from '@/components/contract/intervention-schedule-row'

/** A role option shown in the assignment popover */
export interface AssignableRole {
  /** ContactSelector type: 'manager' | 'tenant' | 'provider' */
  type: string
  /** Display label: "Gestionnaires", "Locataires", "Prestataires" */
  label: string
  /** Lucide icon component */
  Icon: LucideIcon
  /** Tailwind color class for the icon: 'text-purple-600' */
  color: string
  /** Internal role name stored in InterventionAssignment.role */
  role: 'gestionnaire' | 'prestataire' | 'locataire'
}

/** A section of intervention rows in the planner */
export interface InterventionPlannerSection {
  /** Unique section identifier */
  id: string
  /** Section header title */
  title: string
  /** Optional icon for the section header */
  icon?: LucideIcon
  /** Tailwind color class for the section icon */
  iconColorClass?: string
  /** InterventionScheduleRow entries for this section */
  rows: ScheduledInterventionData[]
  /** Show "+ Ajouter" button for custom interventions */
  allowCustomAdd?: boolean
  /** Custom render function for non-standard sections (e.g. rent reminders) */
  renderCustom?: () => React.ReactNode
}

/** Props for the shared InterventionPlannerStep wrapper */
export interface InterventionPlannerStepProps {
  /** Page header title */
  title: string
  /** Page header subtitle */
  subtitle: string
  /** Icon displayed next to the title */
  headerIcon?: LucideIcon

  /** Section configuration (determines layout) */
  sections: InterventionPlannerSection[]

  /** Flat array of all scheduled interventions (parent-owned state) */
  scheduledInterventions: ScheduledInterventionData[]
  onInterventionsChange: React.Dispatch<React.SetStateAction<ScheduledInterventionData[]>>

  /** Assignment system */
  teamId: string
  assignableRoles: AssignableRole[]
  /** ContactSelector allowed types: ['manager', 'tenant', 'provider'] */
  allowedContactTypes: string[]
  /** Optional restriction of which contact IDs are selectable per type */
  allowedContactIds?: Record<string, string[]>
  /** Pre-select these contact IDs when opening assignment for a type */
  preSelectContactIds?: Record<string, string[]>

  /** Custom intervention CRUD (delegated to parent) */
  onAddCustomIntervention?: () => void
  onDeleteCustomIntervention?: (key: string) => void
  onCustomTitleChange?: (key: string, title: string) => void
  onCustomDescriptionChange?: (key: string, description: string) => void

  /**
   * Assigned users for keys outside scheduledInterventions
   * (e.g. rent reminders which have their own state)
   */
  externalAssignedUsers?: Record<string, InterventionAssignment[]>
  /** Called when a contact is selected for an external key */
  onExternalContactSelected?: (key: string, contact: { id: string; name: string }, contactType: string) => void
  /** Called when a contact is removed for an external key */
  onExternalContactRemoved?: (key: string, contactId: string, contactType: string) => void
}

/** Ref handle for InterventionPlannerStep — allows parent to trigger assignment */
export interface InterventionPlannerRef {
  /** Open the ContactSelector for a specific intervention key and contact type */
  handleAssignType: (interventionKey: string, contactType: string) => void
}
