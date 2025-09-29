import { useState } from "react"
import { 
  interventionActionsService, 
  type InterventionAction, 
  type PlanningData 
} from "@/lib/intervention-actions-service"

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

interface TimeSlot {
  date: string
  startTime: string
  endTime: string
}

export const useInterventionPlanning = () => {
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
  const [programmingProposedSlots, setProgrammingProposedSlots] = useState<TimeSlot[]>([
    { date: "", startTime: "", endTime: "" }
  ])

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
      console.error("Error planning intervention:", error)
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
    }

    try {
      await interventionActionsService.programIntervention(
        programmingModal.intervention,
        planningData
      )

      setProgrammingModal({ isOpen: false, intervention: null })

      setPlanningSuccessModal({
        isOpen: true,
        interventionTitle: programmingModal.intervention.title || "",
      })

      resetProgrammingState()
    } catch (error) {
      console.error("Error programming intervention:", error)
      // TODO: Handle error state
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
  const addProgrammingSlot = () => {
    setProgrammingProposedSlots([
      ...programmingProposedSlots, 
      { date: "", startTime: "", endTime: "" }
    ])
  }

  const updateProgrammingSlot = (index: number, field: keyof TimeSlot, value: string) => {
    const updated = programmingProposedSlots.map((slot, i) => 
      i === index ? { ...slot, [field]: value } : slot
    )
    setProgrammingProposedSlots(updated)
  }

  const removeProgrammingSlot = (index: number) => {
    if (programmingProposedSlots.length > 1) {
      setProgrammingProposedSlots(programmingProposedSlots.filter((_, i) => i !== index))
    }
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
    setProgrammingProposedSlots([{ date: "", startTime: "", endTime: "" }])
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

  // Validation
  const isPlanningFormValid = () => {
    if (!planningOption) return false
    
    if (planningOption === "direct") {
      return directSchedule.date && directSchedule.startTime && directSchedule.endTime
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
      return programmingDirectSchedule.date && 
        programmingDirectSchedule.startTime && 
        programmingDirectSchedule.endTime
    }
    
    if (programmingOption === "propose") {
      return programmingProposedSlots.every(slot => 
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

    // Actions principales
    handlePlanningModal,
    handlePlanningConfirmation,
    handleProgrammingModal,
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

    // Validation
    isPlanningFormValid,
    isProgrammingFormValid,
  }
}
