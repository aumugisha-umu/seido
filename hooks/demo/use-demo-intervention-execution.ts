/**
 * Hook démo pour gérer l'exécution d'interventions (start/cancel)
 * Simule les appels API en mode démo
 */

'use client'

import { useState } from "react"
import { logger } from '@/lib/logger'

interface InterventionAction {
  id: string
  title?: string
  [key: string]: any
}

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

export const useDemoInterventionExecution = () => {
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

    try {
      // Simuler un délai réseau
      await new Promise(resolve => setTimeout(resolve, 800))

      logger.info('🚀 [DEMO-EXECUTION] Simulating intervention execution:', {
        interventionId: executionConfirmModal.intervention.id,
        action: executionConfirmModal.action,
        comment: executionConfirmModal.comment,
        internalComment: executionConfirmModal.internalComment,
        filesCount: executionConfirmModal.files.length
      })

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
      logger.error("❌ [DEMO-EXECUTION] Error executing intervention:", error)
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
