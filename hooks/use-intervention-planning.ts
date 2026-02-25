import { useState } from "react"
import { toast } from "sonner"
import { logger, logError } from '@/lib/logger'
import {
  interventionActionsService,
  type InterventionAction,
  type PlanningData
} from "@/lib/intervention-actions-service"
import { programInterventionAction, updateInterventionAction } from "@/app/actions/intervention-actions"

interface PlanningModal {
  isOpen: boolean
  intervention: InterventionAction | null
  acceptedQuote?: unknown
}

interface ProgrammingModal {
  isOpen: boolean
  intervention: InterventionAction | null
}

interface PlanningSuccessModal {
  isOpen: boolean
  interventionTitle: string
}

interface CancelSlotModal {
  isOpen: boolean
  slotId: string | null
  interventionId: string | null
  slot: {
    id: string
    slot_date: string
    start_time: string
    end_time: string
    notes?: string | null
  } | null
}

interface SlotResponseModal {
  isOpen: boolean
  interventionId: string | null
  slots: Array<{
    id: string
    slot_date: string
    start_time: string
    end_time: string
    notes?: string | null
    proposer_name?: string
    proposer_role?: 'gestionnaire' | 'prestataire' | 'locataire'
    responses?: Array<{
      user_id: string
      response: 'accepted' | 'rejected' | 'pending'
      user?: { name: string; role?: string }
    }>
  }>
}

interface TimeSlot {
  date: string
  startTime: string
  endTime: string
}

export const useInterventionPlanning = (
  requireQuote?: boolean,
  selectedProviders?: string[],
  instructions?: string,
  selectedManagers?: string[],
  selectedTenants?: string[],
  assignmentMode?: string,
  providerInstructions?: Record<string, string>,
  confirmationRequired?: string[],
  requiresConfirmation?: boolean,
) => {
  // État des modals
  const [planningModal, setPlanningModal] = useState<PlanningModal>({
    isOpen: false,
    intervention: null,
    acceptedQuote: null,
  })

  const [programmingModal, setProgrammingModal] = useState<ProgrammingModal>({
    isOpen: false,
    intervention: null,
  })

  const [planningSuccessModal, setPlanningSuccessModal] = useState<PlanningSuccessModal>({
    isOpen: false,
    interventionTitle: "",
  })

  const [cancelSlotModal, setCancelSlotModal] = useState<CancelSlotModal>({
    isOpen: false,
    slotId: null,
    interventionId: null,
    slot: null,
  })

  const [slotResponseModal, setSlotResponseModal] = useState<SlotResponseModal>({
    isOpen: false,
    interventionId: null,
    slots: [],
  })

  // État des formulaires de planification
  const [planningOption, setPlanningOption] = useState<"direct" | "propose" | "organize" | null>(null)
  const [directSchedule, setDirectSchedule] = useState<TimeSlot>({
    date: "",
    startTime: "",
    endTime: "",
  })
  const [proposedSlots, setProposedSlots] = useState<TimeSlot[]>([])

  // État des formulaires de programmation
  const [programmingOption, setProgrammingOption] = useState<"direct" | "propose" | "organize" | null>(null)
  const [programmingDirectSchedule, setProgrammingDirectSchedule] = useState<TimeSlot>({
    date: "",
    startTime: "",
    endTime: "",
  })
  const [programmingProposedSlots, setProgrammingProposedSlots] = useState<TimeSlot[]>([])

  // Actions de planification (après acceptation d'un devis)
  const handlePlanningModal = (intervention: InterventionAction, acceptedQuote?: unknown) => {
    setPlanningModal({
      isOpen: true,
      intervention,
      acceptedQuote,
    })
  }

  const handlePlanningConfirmation = async () => {
    if (!planningModal.intervention || !planningOption) return

    const planningData: PlanningData = {
      option: planningOption,
      directSchedule: planningOption === "direct" ? directSchedule : undefined,
      proposedSlots: planningOption === "propose" ? proposedSlots : undefined,
    }

    try {
      await interventionActionsService.programIntervention(
        planningModal.intervention,
        planningData
      )

      setPlanningModal({
        isOpen: false,
        intervention: null,
        acceptedQuote: null,
      })

      setPlanningSuccessModal({
        isOpen: true,
        interventionTitle: planningModal.intervention.title || "",
      })

      resetPlanningState()
    } catch (error) {
      logger.error("Error planning intervention:", error)
      // TODO: Handle error state
    }
  }

  // Actions de programmation (pour interventions approuvées)
  const handleProgrammingModal = (intervention: InterventionAction) => {
    setProgrammingModal({
      isOpen: true,
      intervention,
    })
  }

  const handleProgrammingConfirm = async () => {
    if (!programmingModal.intervention || !programmingOption) return

    const planningData: PlanningData = {
      option: programmingOption,
      directSchedule: programmingOption === "direct" ? programmingDirectSchedule : undefined,
      proposedSlots: programmingOption === "propose" ? programmingProposedSlots : undefined,
      // Add quote request data
      requireQuote: requireQuote,
      selectedProviders: selectedProviders || [],
      instructions: instructions || undefined,
      assignmentMode: assignmentMode || undefined,
      providerInstructions: providerInstructions && Object.keys(providerInstructions).length > 0
        ? providerInstructions
        : undefined,
      confirmationRequired: confirmationRequired && confirmationRequired.length > 0
        ? confirmationRequired
        : undefined,
      requiresConfirmation: requiresConfirmation || undefined,
    }

    try {
      // ── Step 1: Sync assignments FIRST ──
      // Assignments must exist before programInterventionAction sets confirmation flags.
      // (Mirrors creation flow: create assignments → then set confirmation requirements)
      if (selectedManagers || selectedProviders || selectedTenants) {
        logger.info("👥 Syncing participant assignments (before scheduling)", {
          managers: selectedManagers?.length,
          providers: selectedProviders?.length,
          tenants: selectedTenants?.length,
        })
        const assignmentResult = await updateInterventionAction(
          programmingModal.intervention.id,
          {
            assignedManagerIds: selectedManagers,
            assignedProviderIds: selectedProviders,
            assignedTenantIds: selectedTenants,
          }
        )
        if (!assignmentResult.success) {
          logger.error("Failed to sync assignments:", assignmentResult.error)
          toast.error('Les participants n\'ont pas pu être mis à jour')
          return
        }
      }

      // ── Step 2: Schedule intervention (sets confirmation flags on synced assignments) ──
      logger.info("📅 Using Server Action for programming intervention", {
        requireQuote,
        providerCount: selectedProviders?.length || 0
      })

      const result = await programInterventionAction(
        programmingModal.intervention.id,
        planningData
      )

      if (!result.success) {
        throw new Error(result.error || 'Erreur lors de la planification')
      }

      // Fermer la modale
      setProgrammingModal({ isOpen: false, intervention: null })

      // Show toast with quote creation stats (if applicable)
      if (result.data?.quoteStats) {
        const { totalSelected, skipped, created } = result.data.quoteStats

        if (skipped > 0 && created > 0) {
          toast.success(
            `${skipped} prestataire${skipped > 1 ? 's ont' : ' a'} déjà une demande active. ${created} nouvelle${created > 1 ? 's' : ''} demande${created > 1 ? 's' : ''} créée${created > 1 ? 's' : ''}.`,
            { duration: 5000 }
          )
        } else if (skipped > 0 && created === 0) {
          toast.success(
            `Tous les prestataires sélectionnés (${totalSelected}) ont déjà une demande active.`,
            { duration: 5000 }
          )
        } else if (created > 0) {
          toast.success(
            `${created} demande${created > 1 ? 's' : ''} envoyée${created > 1 ? 's' : ''} aux prestataires.`,
            { duration: 4000 }
          )
        }
      }

      // Message de succès adapté pour planification
      const successMessage = programmingOption === 'organize'
        ? 'Planification autonome activée'
        : 'Créneaux proposés avec succès'

      toast.success(successMessage)

      resetProgrammingState()

      // Rafraîchir la page pour afficher les changements
      window.location.reload()
    } catch (error) {
      logger.error("Error programming intervention:", error)
      toast.error('Erreur lors de la planification')
    }
  }

  // Gestion des créneaux proposés
  const addProposedSlot = () => {
    setProposedSlots([...proposedSlots, { date: "", startTime: "", endTime: "" }])
  }

  const updateProposedSlot = (index: number, field: keyof TimeSlot, value: string) => {
    const updated = proposedSlots.map((slot, i) => 
      i === index ? { ...slot, [field]: value } : slot
    )
    setProposedSlots(updated)
  }

  const removeProposedSlot = (index: number) => {
    setProposedSlots(proposedSlots.filter((_, i) => i !== index))
  }

  // Gestion des créneaux de programmation
  const addProgrammingSlot = (data?: TimeSlot) => {
    setProgrammingProposedSlots([
      ...programmingProposedSlots,
      data || { date: "", startTime: "", endTime: "" }
    ])
  }

  const updateProgrammingSlot = (index: number, field: keyof TimeSlot, value: string) => {
    const updated = programmingProposedSlots.map((slot, i) => 
      i === index ? { ...slot, [field]: value } : slot
    )
    setProgrammingProposedSlots(updated)
  }

  const removeProgrammingSlot = (index: number) => {
    setProgrammingProposedSlots(programmingProposedSlots.filter((_, i) => i !== index))
  }

  // Reset states
  const resetPlanningState = () => {
    setPlanningOption(null)
    setDirectSchedule({ date: "", startTime: "", endTime: "" })
    setProposedSlots([])
  }

  const resetProgrammingState = () => {
    setProgrammingOption(null)
    setProgrammingDirectSchedule({ date: "", startTime: "", endTime: "" })
    setProgrammingProposedSlots([])
  }

  const closePlanningModal = () => {
    setPlanningModal({
      isOpen: false,
      intervention: null,
      acceptedQuote: null,
    })
    resetPlanningState()
  }

  const closeProgrammingModal = () => {
    setProgrammingModal({ isOpen: false, intervention: null })
    resetProgrammingState()
  }

  const closePlanningSuccessModal = () => {
    setPlanningSuccessModal({
      isOpen: false,
      interventionTitle: "",
    })
  }

  const openCancelSlotModal = (slot: CancelSlotModal['slot'], interventionId: string) => {
    if (!slot) return
    setCancelSlotModal({
      isOpen: true,
      slotId: slot.id,
      interventionId,
      slot,
    })
  }

  const closeCancelSlotModal = () => {
    setCancelSlotModal({
      isOpen: false,
      slotId: null,
      interventionId: null,
      slot: null,
    })
  }

  const openSlotResponseModal = (
    slots: SlotResponseModal['slots'],
    interventionId: string
  ) => {
    if (!slots || slots.length === 0) return
    setSlotResponseModal({
      isOpen: true,
      interventionId,
      slots,
    })
  }

  const closeSlotResponseModal = () => {
    setSlotResponseModal({
      isOpen: false,
      interventionId: null,
      slots: [],
    })
  }

  // Validation
  const isPlanningFormValid = () => {
    if (!planningOption) return false

    if (planningOption === "direct") {
      // For direct appointment: only date and start time required (no end time)
      return directSchedule.date && directSchedule.startTime
    }

    if (planningOption === "propose") {
      return proposedSlots.length > 0 &&
        proposedSlots.every(slot => slot.date && slot.startTime && slot.endTime)
    }

    return planningOption === "organize"
  }

  const isProgrammingFormValid = () => {
    if (!programmingOption) return false

    if (programmingOption === "direct") {
      // For direct appointment: only date and start time required (no end time)
      return programmingDirectSchedule.date &&
        programmingDirectSchedule.startTime
    }

    if (programmingOption === "propose") {
      return programmingProposedSlots.length > 0 &&
        programmingProposedSlots.every(slot =>
          slot.date && slot.startTime && slot.endTime
        )
    }

    return programmingOption === "organize"
  }

  return {
    // États des modals
    planningModal,
    programmingModal,
    planningSuccessModal,
    cancelSlotModal,
    slotResponseModal,

    // États des formulaires
    planningOption,
    directSchedule,
    proposedSlots,
    programmingOption,
    programmingDirectSchedule,
    programmingProposedSlots,

    // Setters
    setPlanningOption,
    setDirectSchedule,
    setProgrammingOption,
    setProgrammingDirectSchedule,
    setProgrammingProposedSlots,

    // Actions principales
    handlePlanningModal,
    handlePlanningConfirmation,
    openProgrammingModal: handleProgrammingModal,
    handleProgrammingConfirm,

    // Gestion des créneaux
    addProposedSlot,
    updateProposedSlot,
    removeProposedSlot,
    addProgrammingSlot,
    updateProgrammingSlot,
    removeProgrammingSlot,

    // Fermeture des modals
    closePlanningModal,
    closeProgrammingModal,
    closePlanningSuccessModal,
    openCancelSlotModal,
    closeCancelSlotModal,
    openSlotResponseModal,
    closeSlotResponseModal,

    // Validation
    isPlanningFormValid,
    isProgrammingFormValid,
  }
}
