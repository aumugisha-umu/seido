"use client"

import { useState } from "react"
import { CheckCircle, X, Upload, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  UnifiedModal,
  UnifiedModalHeader,
  UnifiedModalBody,
  UnifiedModalFooter,
} from "@/components/ui/unified-modal"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { SimpleWorkCompletionData } from "./closure/simple-types"
import { logger } from '@/lib/logger'

interface SimpleWorkCompletionModalProps {
  intervention: {
    id: string
    title: string
  }
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: SimpleWorkCompletionData) => Promise<boolean>
  isLoading?: boolean
}

export function SimpleWorkCompletionModal({
  intervention,
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
}: SimpleWorkCompletionModalProps) {
  const [workReport, setWorkReport] = useState("")
  const [mediaFiles, setMediaFiles] = useState<File[]>([])
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])

    // Limiter à 10 fichiers maximum
    if (mediaFiles.length + files.length > 10) {
      setError("Vous ne pouvez ajouter que 10 fichiers maximum")
      return
    }

    setMediaFiles(prev => [...prev, ...files])
    setError(null)
  }

  const handleRemoveFile = (index: number) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    // Validation
    if (!workReport.trim()) {
      setError("Le rapport de travaux est obligatoire")
      return
    }

    // Préparation des données
    const data: SimpleWorkCompletionData = {
      workReport: workReport.trim(),
      mediaFiles,
    }

    try {
      setError(null)
      const success = await onSubmit(data)

      if (success) {
        // Réinitialiser le formulaire
        setWorkReport("")
        setMediaFiles([])

        // Afficher le toast de succès
        toast({
          title: "✅ Intervention terminée",
          description: "Votre rapport de fin de travaux a été soumis avec succès. Le locataire va être notifié pour valider les travaux.",
          variant: "default",
        })

        onClose()
      } else {
        setError("Une erreur est survenue lors de la soumission")
      }
    } catch (err) {
      setError("Une erreur inattendue s'est produite")
      logger.error("Erreur lors de la soumission:", err)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      // Réinitialiser le formulaire à la fermeture
      setWorkReport("")
      setMediaFiles([])
      setError(null)
      onClose()
    }
  }

  const isFormValid = workReport.trim().length > 0

  return (
    <UnifiedModal
      open={isOpen}
      onOpenChange={handleClose}
      size="md"
      preventCloseOnOutsideClick={isLoading}
      preventCloseOnEscape={isLoading}
    >
      <UnifiedModalHeader
        title="Terminer l'intervention"
        subtitle={intervention.title}
        icon={<CheckCircle className="h-5 w-5" />}
        variant="success"
      />

      <UnifiedModalBody>
        <div className="space-y-4">
          {/* Message d'erreur */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Rapport de travaux */}
          <div className="space-y-2">
            <Label htmlFor="workReport">
              Rapport de travaux <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="workReport"
              value={workReport}
              onChange={(e) => setWorkReport(e.target.value)}
              placeholder="Décrivez brièvement les travaux réalisés..."
              className="min-h-[120px]"
              disabled={isLoading}
            />
          </div>

          {/* Upload de fichiers */}
          <div className="space-y-2">
            <Label htmlFor="media">
              Photos/Vidéos
              <span className="text-sm text-gray-500 ml-2">
                (optionnel - max 10 fichiers)
              </span>
            </Label>

            <div className="space-y-2">
              {/* Input file avec style personnalisé */}
              <label
                htmlFor="media"
                className="flex items-center gap-2 px-3 py-2 text-sm border rounded-md cursor-pointer hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Upload className="h-4 w-4" />
                Ajouter des fichiers
                <input
                  id="media"
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={isLoading || mediaFiles.length >= 10}
                />
              </label>

              {/* Liste des fichiers sélectionnés */}
              {mediaFiles.length > 0 && (
                <div className="space-y-1">
                  {mediaFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between px-3 py-1.5 text-sm bg-gray-50 rounded-md"
                    >
                      <span className="truncate flex-1 mr-2">
                        {file.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(index)}
                        className="p-1 hover:bg-gray-200 rounded"
                        disabled={isLoading}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  <p className="text-xs text-gray-500">
                    {mediaFiles.length} fichier{mediaFiles.length > 1 ? "s" : ""} sélectionné{mediaFiles.length > 1 ? "s" : ""}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </UnifiedModalBody>

      <UnifiedModalFooter>
        <Button
          variant="outline"
          onClick={handleClose}
          disabled={isLoading}
        >
          Annuler
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!isFormValid || isLoading}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Traitement...
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Terminer l&apos;intervention
            </>
          )}
        </Button>
      </UnifiedModalFooter>
    </UnifiedModal>
  )
}
