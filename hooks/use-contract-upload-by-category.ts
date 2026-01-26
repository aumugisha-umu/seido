/**
 * Hook pour la gestion des uploads de documents par catégorie
 *
 * Ce hook wraps useContractUpload et ajoute :
 * - Organisation des fichiers par type de document
 * - Tracking des documents manquants/recommandés
 * - Méthodes spécifiques par slot
 */

import { useMemo, useCallback } from 'react'
import { useContractUpload, ContractFileWithPreview, UseContractUploadOptions } from './use-contract-upload'
import { ContractDocumentType } from '@/lib/types/contract.types'
import {
  LEASE_DOCUMENT_SLOTS,
  RECOMMENDED_DOCUMENT_TYPES,
  DocumentSlotConfig
} from '@/lib/constants/lease-document-slots'

/**
 * État d'un slot de document
 */
export interface DocumentSlotState extends DocumentSlotConfig {
  files: ContractFileWithPreview[]
  hasFiles: boolean
  fileCount: number
}

/**
 * Options du hook
 */
export interface UseContractUploadByCategoryOptions extends UseContractUploadOptions {
  /** Configuration des slots (par défaut: LEASE_DOCUMENT_SLOTS) */
  slotConfigs?: DocumentSlotConfig[]
}

/**
 * Hook pour gérer les uploads de documents organisés par catégorie/slot
 */
export const useContractUploadByCategory = ({
  slotConfigs = LEASE_DOCUMENT_SLOTS,
  ...uploadOptions
}: UseContractUploadByCategoryOptions = {}) => {
  // Utilise le hook de base
  const baseUpload = useContractUpload(uploadOptions)

  /**
   * Organise les fichiers par type de document
   */
  const filesByType = useMemo(() => {
    const map = new Map<ContractDocumentType, ContractFileWithPreview[]>()

    // Initialiser avec des tableaux vides pour chaque slot
    slotConfigs.forEach(slot => {
      map.set(slot.type, [])
    })

    // Distribuer les fichiers dans les slots
    baseUpload.files.forEach(file => {
      const existing = map.get(file.documentType) || []
      map.set(file.documentType, [...existing, file])
    })

    return map
  }, [baseUpload.files, slotConfigs])

  /**
   * État complet de chaque slot
   */
  const slots = useMemo((): DocumentSlotState[] => {
    return slotConfigs.map(config => {
      const files = filesByType.get(config.type) || []
      return {
        ...config,
        files,
        hasFiles: files.length > 0,
        fileCount: files.length
      }
    })
  }, [slotConfigs, filesByType])

  /**
   * Ajoute des fichiers à un slot spécifique
   * Les fichiers sont automatiquement taggés avec le type du slot
   */
  const addFilesToSlot = useCallback((slotType: ContractDocumentType, newFiles: File[]) => {
    // Passer le type directement à addFiles() - pas de setTimeout, pas de race condition
    baseUpload.addFiles(newFiles, slotType)
  }, [baseUpload])

  /**
   * Supprime un fichier d'un slot
   */
  const removeFileFromSlot = useCallback((slotType: ContractDocumentType, fileId: string) => {
    baseUpload.removeFile(fileId)
  }, [baseUpload])

  /**
   * Obtient l'état d'un slot spécifique
   */
  const getSlotState = useCallback((slotType: ContractDocumentType): DocumentSlotState | undefined => {
    return slots.find(slot => slot.type === slotType)
  }, [slots])

  /**
   * Liste des types de documents recommandés qui n'ont pas été uploadés
   */
  const missingRecommendedDocuments = useMemo((): ContractDocumentType[] => {
    return RECOMMENDED_DOCUMENT_TYPES.filter(type => {
      const files = filesByType.get(type) || []
      return files.length === 0
    })
  }, [filesByType])

  /**
   * Compte des documents uploadés
   */
  const uploadedSlotsCount = useMemo(() => {
    return slots.filter(slot => slot.hasFiles).length
  }, [slots])

  /**
   * Progression globale (slots avec au moins un fichier / total slots)
   */
  const progress = useMemo(() => {
    return {
      uploaded: uploadedSlotsCount,
      total: slots.length,
      percentage: Math.round((uploadedSlotsCount / slots.length) * 100)
    }
  }, [uploadedSlotsCount, slots.length])

  /**
   * Vérifie si tous les documents recommandés sont présents
   */
  const hasAllRecommended = useMemo(() => {
    return missingRecommendedDocuments.length === 0
  }, [missingRecommendedDocuments])

  return {
    // État des slots
    slots,
    filesByType,
    getSlotState,

    // Actions par slot
    addFilesToSlot,
    removeFileFromSlot,

    // Tracking des recommandations
    missingRecommendedDocuments,
    hasAllRecommended,

    // Progression
    progress,
    uploadedSlotsCount,

    // Expose aussi les méthodes du hook de base pour l'upload final
    ...baseUpload
  }
}

export type UseContractUploadByCategoryReturn = ReturnType<typeof useContractUploadByCategory>
