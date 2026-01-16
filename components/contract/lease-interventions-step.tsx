"use client"

/**
 * LeaseInterventionsStep - Étape de planification des interventions dans le flux de création de bail
 *
 * Version inline (pas de Dialog) du contenu de lease-scheduling-modal.tsx
 * Affiche une liste d'interventions planifiables avec :
 * - Interventions standard filtrées selon le type de charges
 * - Interventions pour documents manquants (récupération)
 * - Toggle enable/disable + date picker par intervention
 */

import { useMemo } from 'react'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { CalendarCheck, FileSearch } from 'lucide-react'

import { InterventionScheduleRow, type ScheduledInterventionData } from './intervention-schedule-row'
import type { ContractDocumentType } from '@/lib/types/contract.types'

interface LeaseInterventionsStepProps {
  scheduledInterventions: ScheduledInterventionData[]
  onInterventionsChange: (interventions: ScheduledInterventionData[]) => void
  missingDocuments: ContractDocumentType[]
}

/**
 * Étape de planification des interventions du bail
 */
export function LeaseInterventionsStep({
  scheduledInterventions,
  onInterventionsChange,
  missingDocuments
}: LeaseInterventionsStepProps) {
  // Séparer les interventions standard et documents manquants
  const { standardInterventions, documentInterventions } = useMemo(() => {
    const standard = scheduledInterventions.filter(i => !i.key.startsWith('retrieve_document_'))
    const documents = scheduledInterventions.filter(i => i.key.startsWith('retrieve_document_'))
    return { standardInterventions: standard, documentInterventions: documents }
  }, [scheduledInterventions])

  // Toggle une intervention
  const handleToggle = (key: string, enabled: boolean) => {
    onInterventionsChange(
      scheduledInterventions.map(i => i.key === key ? { ...i, enabled } : i)
    )
  }

  // Changer la date d'une intervention
  const handleDateChange = (key: string, date: Date | null) => {
    onInterventionsChange(
      scheduledInterventions.map(i => i.key === key ? { ...i, scheduledDate: date, isAutoCalculated: false } : i)
    )
  }

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
                      />
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Note informative */}
      <div className="text-center text-sm text-muted-foreground max-w-2xl mx-auto">
        Vous pourrez toujours ajouter ou modifier ces interventions après la création du bail.
      </div>
    </div>
  )
}

export default LeaseInterventionsStep
