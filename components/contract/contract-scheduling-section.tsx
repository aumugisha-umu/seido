'use client'

import { CalendarCheck } from 'lucide-react'
import { InterventionPlannerStep } from '@/components/contract/intervention-planner-step'
import { SUPPLIER_ASSIGNABLE_ROLES } from '@/lib/constants/assignable-roles'
import type { InterventionPlannerSection } from '@/lib/types/intervention-planner.types'
import type { ScheduledInterventionData } from '@/components/contract/intervention-schedule-row'

interface ContractSchedulingSectionProps {
  supplierScheduledInterventions: ScheduledInterventionData[]
  onInterventionsChange: (interventions: ScheduledInterventionData[]) => void
  teamId: string
  onAddCustomIntervention: () => void
  onAddCustomReminder: () => void
  onDeleteCustomIntervention: (key: string) => void
  onCustomTitleChange: (key: string, title: string) => void
  onCustomDescriptionChange: (key: string, description: string) => void
}

export function ContractSchedulingSection({
  supplierScheduledInterventions,
  onInterventionsChange,
  teamId,
  onAddCustomIntervention,
  onAddCustomReminder,
  onDeleteCustomIntervention,
  onCustomTitleChange,
  onCustomDescriptionChange,
}: ContractSchedulingSectionProps) {
  const supplierSections: InterventionPlannerSection[] = [{
    id: 'supplier_main',
    title: 'Suivis du contrat',
    icon: CalendarCheck,
    iconColorClass: 'text-primary',
    rows: supplierScheduledInterventions,
    allowCustomAdd: true,
  }]

  return (
    <InterventionPlannerStep
      title="Planifier les suivis du contrat"
      subtitle="Programmez les interventions et rappels lies a vos contrats fournisseurs. Cette etape est optionnelle."
      headerIcon={CalendarCheck}
      sections={supplierSections}
      scheduledInterventions={supplierScheduledInterventions}
      onInterventionsChange={onInterventionsChange}
      teamId={teamId}
      assignableRoles={SUPPLIER_ASSIGNABLE_ROLES}
      allowedContactTypes={['manager', 'provider']}
      onAddCustomIntervention={onAddCustomIntervention}
      onAddCustomReminder={onAddCustomReminder}
      onDeleteCustomIntervention={onDeleteCustomIntervention}
      onCustomTitleChange={onCustomTitleChange}
      onCustomDescriptionChange={onCustomDescriptionChange}
    />
  )
}
