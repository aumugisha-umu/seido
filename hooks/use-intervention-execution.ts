import { useState } from "react"
import { logger, logError } from '@/lib/logger'
import {
  interventionActionsService,
  type InterventionAction,
  type ExecutionData
} from "@/lib/intervention-actions-service"

interface ExecutionModal {
  isOpen: boolean
  intervention: InterventionAction | null
  action: "start" | "cancel" | null
}

interface ExecutionConfirmModal {
  isOpen: boolean
  intervention: InterventionAction | null
  action: "start" | "cancel" | null
  comment: string
  internalComment: string
  files: File[]
}

interface ExecutionSuccessModal {
  isOpen: boolean
  action: "start" | "cancel" | null
  interventionTitle: string
}

export const useInterventionExecution = () => {
  // État des modals
  const [executionModal, setExecutionModal] = useState<ExecutionModal>({
    isOpen: false,
    intervention: null,
    action: null,
  })

  const [executionConfirmModal, setExecutionConfirmModal] = useState<ExecutionConfirmModal>({
    isOpen: false,
    intervention: null,
    action: null,
    comment: "",
    internalComment: "",
    files: [],
  })

  const [executionSuccessModal, setExecutionSuccessModal] = useState<ExecutionSuccessModal>({
    isOpen: false,
    action: null,
    interventionTitle: "",
  })

  // État des formulaires
  const [executionComment, setExecutionComment] = useState("")
  const [executionInternalComment, setExecutionInternalComment] = useState("")
  const [executionFiles, setExecutionFiles] = useState<File[]>([])

  // Actions principales
  const handleExecutionModal = (intervention: InterventionAction, action: "start" | "cancel") => {
    setExecutionModal({
      isOpen: true,
      intervention,
      action,
    })
  }

  const handleExecutionAction = (action: "start" | "cancel") => {
    setExecutionConfirmModal({
      isOpen: true,
      intervention: executionModal.intervention,
      action,
      comment: executionComment,
      internalComment: executionInternalComment,
      files: executionFiles,
    })
    setExecutionModal({
      isOpen: false,
      intervention: null,
      action: null,
    })
  }

  const handleFinalExecutionConfirmation = async () => {
    if (!executionConfirmModal.intervention) return

    const executionData: ExecutionData = {
      action: executionConfirmModal.action as "start" | "cancel",
      comment: executionConfirmModal.comment,
      internalComment: executionConfirmModal.internalComment,
      files: executionConfirmModal.files,
    }

    try {
      await interventionActionsService.executeIntervention(
        executionConfirmModal.intervention,
        executionData
      )

      setExecutionConfirmModal({
        isOpen: false,
        intervention: null,
        action: null,
        comment: "",
        internalComment: "",
        files: [],
      })

      setExecutionSuccessModal({
        isOpen: true,
        interventionTitle: executionConfirmModal.intervention.title || "",
        action: executionConfirmModal.action,
      })

      resetExecutionForm()
    } catch (error) {
      logger.error("Error executing intervention:", error)
      // TODO: Handle error state
    }
  }

  // Gestion des fichiers
  const handleExecutionFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    setExecutionFiles((prev) => [...prev, ...files])
  }

  const removeExecutionFile = (index: number) => {
    setExecutionFiles((prev) => prev.filter((_, i) => i !== index))
  }

  // Reset et fermeture
  const resetExecutionForm = () => {
    setExecutionComment("")
    setExecutionInternalComment("")
    setExecutionFiles([])
  }

  const closeExecutionModal = () => {
    setExecutionModal({
      isOpen: false,
      intervention: null,
      action: null,
    })
    resetExecutionForm()
  }

  const closeExecutionConfirmModal = () => {
    setExecutionConfirmModal({
      isOpen: false,
      intervention: null,
      action: null,
      comment: "",
      internalComment: "",
      files: [],
    })
  }

  const closeExecutionSuccessModal = () => {
    setExecutionSuccessModal({
      isOpen: false,
      action: null,
      interventionTitle: "",
    })
  }

  return {
    // États des modals
    executionModal,
    executionConfirmModal,
    executionSuccessModal,

    // États des formulaires
    executionComment,
    executionInternalComment,
    executionFiles,

    // Setters
    setExecutionComment,
    setExecutionInternalComment,
    setExecutionFiles,

    // Actions principales
    handleExecutionModal,
    handleExecutionAction,
    handleFinalExecutionConfirmation,

    // Gestion des fichiers
    handleExecutionFileUpload,
    removeExecutionFile,

    // Fermeture des modals
    closeExecutionModal,
    closeExecutionConfirmModal,
    closeExecutionSuccessModal,
  }
}
