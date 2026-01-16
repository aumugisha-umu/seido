"use client"

/**
 * LeaseSchedulingModal - Modale de planification d'interventions après création de bail
 *
 * Affiche après la création réussie d'un bail :
 * - Liste des interventions standard à planifier
 * - Documents manquants comme tâches de récupération
 * - Dates auto-calculées modifiables
 * - Possibilité de passer ou confirmer
 */

import { useState, useCallback, useMemo, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Calendar,
  CalendarCheck,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  FileSearch
} from 'lucide-react'
import { toast } from 'sonner'
import { format, addDays, addMonths } from 'date-fns'
import { fr } from 'date-fns/locale'

import { InterventionScheduleRow, type ScheduledInterventionData } from './intervention-schedule-row'
import {
  LEASE_INTERVENTION_TEMPLATES,
  createMissingDocumentIntervention,
  resolveTemplateText,
  type LeaseInterventionTemplate
} from '@/lib/constants/lease-interventions'
import { createInterventionAction } from '@/app/actions/intervention-actions'
import type { ContractDocumentType, ChargesType } from '@/lib/types/contract.types'
import { logger } from '@/lib/logger'

interface ContractData {
  id: string
  startDate: string
  durationMonths: number
  lotId: string
  teamId: string
  chargesType: ChargesType
}

interface LeaseSchedulingModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contract: ContractData
  missingDocuments: ContractDocumentType[]
  onComplete: () => void
  onSkip: () => void
}

/**
 * Génère les interventions avec leurs données initiales
 * Filtre selon le type de charges et résout les titres dynamiques
 */
function generateInitialInterventions(
  startDate: Date,
  endDate: Date,
  chargesType: ChargesType,
  missingDocs: ContractDocumentType[]
): ScheduledInterventionData[] {
  // Filtrer les templates selon le type de charges
  const applicableTemplates = LEASE_INTERVENTION_TEMPLATES.filter(template => {
    if (!template.applicableChargesTypes) return true
    return template.applicableChargesTypes.includes(chargesType)
  })

  // Interventions standard avec titres résolus
  const standardInterventions: ScheduledInterventionData[] = applicableTemplates.map(template => ({
    key: template.key,
    title: resolveTemplateText(template.title, chargesType),
    description: resolveTemplateText(template.description, chargesType),
    interventionTypeCode: template.interventionTypeCode,
    icon: template.icon,
    colorClass: template.colorClass,
    enabled: template.enabledByDefault,
    scheduledDate: template.calculateDefaultDate(startDate, endDate),
    isAutoCalculated: true
  }))

  // Interventions pour documents manquants
  const documentInterventions: ScheduledInterventionData[] = missingDocs.map((docType, index) => {
    const template = createMissingDocumentIntervention(docType, index)
    return {
      key: template.key,
      title: template.title,
      description: template.description,
      interventionTypeCode: template.interventionTypeCode,
      icon: template.icon,
      colorClass: template.colorClass,
      enabled: template.enabledByDefault,
      scheduledDate: template.calculateDefaultDate(startDate, endDate),
      isAutoCalculated: true
    }
  })

  return [...standardInterventions, ...documentInterventions]
}

export function LeaseSchedulingModal({
  open,
  onOpenChange,
  contract,
  missingDocuments,
  onComplete,
  onSkip
}: LeaseSchedulingModalProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [creationResult, setCreationResult] = useState<{ success: number; failed: number } | null>(null)

  // Calculer les dates de début et fin
  const startDate = useMemo(() => new Date(contract.startDate), [contract.startDate])
  const endDate = useMemo(() => {
    const end = new Date(contract.startDate)
    end.setMonth(end.getMonth() + contract.durationMonths)
    return end
  }, [contract.startDate, contract.durationMonths])

  // État des interventions
  const [interventions, setInterventions] = useState<ScheduledInterventionData[]>(() =>
    generateInitialInterventions(startDate, endDate, contract.chargesType, missingDocuments)
  )

  // Réinitialiser quand la modale s'ouvre
  useEffect(() => {
    if (open) {
      setInterventions(generateInitialInterventions(startDate, endDate, contract.chargesType, missingDocuments))
      setCreationResult(null)
    }
  }, [open, startDate, endDate, contract.chargesType, missingDocuments])

  // Séparer les interventions standard et documents manquants
  const { standardInterventions, documentInterventions } = useMemo(() => {
    const standard = interventions.filter(i => !i.key.startsWith('retrieve_document_'))
    const documents = interventions.filter(i => i.key.startsWith('retrieve_document_'))
    return { standardInterventions: standard, documentInterventions: documents }
  }, [interventions])

  // Compter les interventions activées
  const enabledCount = useMemo(() =>
    interventions.filter(i => i.enabled && i.scheduledDate).length,
    [interventions]
  )

  // Toggle une intervention
  const handleToggle = useCallback((key: string, enabled: boolean) => {
    setInterventions(prev =>
      prev.map(i => i.key === key ? { ...i, enabled } : i)
    )
  }, [])

  // Changer la date d'une intervention
  const handleDateChange = useCallback((key: string, date: Date | null) => {
    setInterventions(prev =>
      prev.map(i => i.key === key ? { ...i, scheduledDate: date, isAutoCalculated: false } : i)
    )
  }, [])

  // Créer les interventions
  const handleConfirm = useCallback(async () => {
    const toCreate = interventions.filter(i => i.enabled && i.scheduledDate)

    if (toCreate.length === 0) {
      toast.info('Aucune intervention à créer')
      onSkip()
      return
    }

    setIsCreating(true)
    let successCount = 0
    let failedCount = 0

    try {
      // Créer les interventions séquentiellement avec Promise.allSettled
      const results = await Promise.allSettled(
        toCreate.map(async (intervention) => {
          return createInterventionAction({
            title: intervention.title,
            description: intervention.description,
            type: intervention.interventionTypeCode,
            urgency: 'basse',
            lot_id: contract.lotId,
            team_id: contract.teamId,
            contract_id: contract.id,  // Lier l'intervention au contrat
            requested_date: intervention.scheduledDate || undefined
          }, { useServiceRole: true })  // Bypass RLS pour création batch
        })
      )

      // Compter les résultats
      results.forEach(result => {
        if (result.status === 'fulfilled' && result.value.success) {
          successCount++
        } else {
          failedCount++
        }
      })

      setCreationResult({ success: successCount, failed: failedCount })

      // Afficher le résultat
      if (failedCount === 0) {
        toast.success(`${successCount} intervention${successCount > 1 ? 's' : ''} créée${successCount > 1 ? 's' : ''} avec succès`)
      } else if (successCount > 0) {
        toast.warning(`${successCount} intervention${successCount > 1 ? 's' : ''} créée${successCount > 1 ? 's' : ''}, ${failedCount} échec${failedCount > 1 ? 's' : ''}`)
      } else {
        toast.error('Erreur lors de la création des interventions')
      }

      logger.info({ successCount, failedCount, contractId: contract.id }, 'Lease interventions created')

      // Fermer la modale après un court délai
      setTimeout(() => {
        onComplete()
      }, 1000)

    } catch (error) {
      logger.error({ error }, 'Error creating lease interventions')
      toast.error('Erreur lors de la création des interventions')
    } finally {
      setIsCreating(false)
    }
  }, [interventions, contract, onComplete, onSkip])

  // Passer (skip)
  const handleSkip = useCallback(() => {
    onSkip()
  }, [onSkip])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarCheck className="h-5 w-5 text-primary" />
            Planifier les suivis du bail
          </DialogTitle>
          <DialogDescription>
            Programmez les interventions liées à ce contrat de location.
            Vous pouvez modifier les dates ou désactiver certaines tâches.
          </DialogDescription>
        </DialogHeader>

        {/* Résumé du bail */}
        <Card className="bg-muted/30 border-muted">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">
                  Bail du {format(startDate, 'dd MMMM yyyy', { locale: fr })}
                </p>
                <p className="text-xs text-muted-foreground">
                  Durée: {contract.durationMonths} mois • Fin prévue: {format(endDate, 'dd MMMM yyyy', { locale: fr })}
                </p>
              </div>
              <Badge variant="secondary" className="shrink-0">
                {enabledCount} intervention{enabledCount !== 1 ? 's' : ''}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Liste des interventions */}
        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-6 py-2">
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
                    disabled={isCreating}
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
                        disabled={isCreating}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        {/* Résultat de la création */}
        {creationResult && (
          <div className={`flex items-center gap-2 p-3 rounded-lg ${
            creationResult.failed === 0
              ? 'bg-green-50 border border-green-200'
              : 'bg-amber-50 border border-amber-200'
          }`}>
            {creationResult.failed === 0 ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            )}
            <span className={`text-sm ${
              creationResult.failed === 0 ? 'text-green-700' : 'text-amber-700'
            }`}>
              {creationResult.success} intervention{creationResult.success > 1 ? 's' : ''} créée{creationResult.success > 1 ? 's' : ''}
              {creationResult.failed > 0 && `, ${creationResult.failed} échec${creationResult.failed > 1 ? 's' : ''}`}
            </span>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="ghost"
            onClick={handleSkip}
            disabled={isCreating}
          >
            Passer
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isCreating || enabledCount === 0}
          >
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Création...
              </>
            ) : (
              `Créer ${enabledCount} intervention${enabledCount !== 1 ? 's' : ''}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default LeaseSchedulingModal
