// Types simplifiés pour la clôture rapide d'intervention

export interface SimpleWorkCompletionData {
  // Champ obligatoire : rapport de travaux
  workReport: string

  // Fichiers optionnels : photos et vidéos
  mediaFiles: File[]
}

// Interface pour la réponse API
export interface SimpleWorkCompletionResponse {
  success: boolean
  error?: string
  interventionId?: string
  newStatus?: string
}

// Interface pour la validation du formulaire
export interface SimpleWorkCompletionValidation {
  isValid: boolean
  errors: string[]
}