"use client"

import { useState, useEffect } from "react"
import { CheckCircle, X, Upload, FileIcon, ThumbsUp, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"

interface TenantValidationSimpleProps {
  intervention: {
    id: string
    title: string
  }
  isOpen: boolean
  onClose: () => void
  onApprove: (data: { comments: string; photos: File[] }) => Promise<boolean>
  onReject: (data: { comments: string; photos: File[] }) => Promise<boolean>
  isLoading?: boolean
  initialMode?: 'approve' | 'reject'
}

export function TenantValidationSimple({
  intervention,
  isOpen,
  onClose,
  onApprove,
  onReject,
  isLoading = false,
  initialMode = 'approve'
}: TenantValidationSimpleProps) {
  const [mode, setMode] = useState<'approve' | 'reject'>(initialMode)
  const [comments, setComments] = useState('')
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [error, setError] = useState<string | null>(null)

  // Synchroniser le mode quand initialMode change (ex: clic sur Valider vs Contester)
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode)
    }
  }, [isOpen, initialMode])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files)
      setSelectedFiles(prev => [...prev, ...files])
    }
  }

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    // Validation : pour le rejet, le commentaire est obligatoire
    if (mode === 'reject' && !comments.trim()) {
      setError('Le commentaire est obligatoire pour contester les travaux')
      return
    }

    setError(null)

    try {
      const data = {
        comments: comments.trim(),
        photos: selectedFiles
      }

      const success = mode === 'approve'
        ? await onApprove(data)
        : await onReject(data)

      if (success) {
        handleClose()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la validation')
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      setComments('')
      setSelectedFiles([])
      setError(null)
      setMode(initialMode)
      onClose()
    }
  }

  const isApproveMode = mode === 'approve'
  const buttonLabel = isApproveMode ? 'Valider les travaux' : 'Signaler le problème'

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span>Validation des travaux</span>
          </DialogTitle>
          <p className="text-sm text-gray-600 mt-2">
            {intervention.title}
          </p>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Sélecteur de mode */}
          <div className="space-y-3">
            <Label>Après vérification des travaux, êtes-vous satisfait du résultat ?</Label>

            <div className="space-y-2">
              {/* Option Valider */}
              <label
                className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  mode === 'approve'
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-green-200 hover:bg-green-50/50'
                }`}
              >
                <input
                  type="radio"
                  name="validationMode"
                  value="approve"
                  checked={mode === 'approve'}
                  onChange={() => setMode('approve')}
                  className="sr-only"
                />
                <div className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  mode === 'approve' ? 'border-green-500 bg-green-500' : 'border-gray-300'
                }`}>
                  {mode === 'approve' && <div className="w-2 h-2 bg-white rounded-full" />}
                </div>
                <ThumbsUp className={`h-5 w-5 ${mode === 'approve' ? 'text-green-600' : 'text-gray-400'}`} />
                <div className="flex-1">
                  <span className={`font-medium ${mode === 'approve' ? 'text-green-900' : 'text-gray-900'}`}>
                    Valider les travaux
                  </span>
                  <p className="text-sm text-gray-500">Les travaux sont satisfaisants et conformes</p>
                </div>
              </label>

              {/* Option Contester */}
              <label
                className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  mode === 'reject'
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-200 hover:border-red-200 hover:bg-red-50/50'
                }`}
              >
                <input
                  type="radio"
                  name="validationMode"
                  value="reject"
                  checked={mode === 'reject'}
                  onChange={() => setMode('reject')}
                  className="sr-only"
                />
                <div className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  mode === 'reject' ? 'border-red-500 bg-red-500' : 'border-gray-300'
                }`}>
                  {mode === 'reject' && <div className="w-2 h-2 bg-white rounded-full" />}
                </div>
                <AlertTriangle className={`h-5 w-5 ${mode === 'reject' ? 'text-red-600' : 'text-gray-400'}`} />
                <div className="flex-1">
                  <span className={`font-medium ${mode === 'reject' ? 'text-red-900' : 'text-gray-900'}`}>
                    Signaler un problème
                  </span>
                  <p className="text-sm text-gray-500">Les travaux présentent des défauts ou ne sont pas conformes</p>
                </div>
              </label>
            </div>
          </div>

          {/* Commentaire */}
          <div className="space-y-2">
            <Label htmlFor="comments">
              Commentaire {mode === 'reject' && <span className="text-red-500">*</span>}
            </Label>
            <Textarea
              id="comments"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder={
                isApproveMode
                  ? "Ajoutez un commentaire sur les travaux réalisés (optionnel)"
                  : "Décrivez les problèmes constatés (obligatoire)"
              }
              rows={4}
              className={error && mode === 'reject' && !comments.trim() ? 'border-red-500' : ''}
            />
            {mode === 'reject' && (
              <p className="text-xs text-gray-500">
                Veuillez décrire précisément les problèmes constatés
              </p>
            )}
          </div>

          {/* Upload de photos */}
          <div className="space-y-3">
            <Label>Photos (optionnel)</Label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
              <input
                type="file"
                id="photo-upload"
                multiple
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <label htmlFor="photo-upload" className="cursor-pointer">
                <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-gray-600">
                  Cliquez pour ajouter des photos
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  PNG, JPG jusqu'à 10MB
                </p>
              </label>
            </div>

            {/* Liste des fichiers sélectionnés */}
            {selectedFiles.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  {selectedFiles.length} photo{selectedFiles.length > 1 ? 's' : ''} sélectionnée{selectedFiles.length > 1 ? 's' : ''}
                </p>
                {selectedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded border"
                  >
                    <div className="flex items-center space-x-2">
                      <FileIcon className="h-4 w-4 text-blue-600" />
                      <span className="text-sm truncate max-w-xs">{file.name}</span>
                      <span className="text-xs text-gray-500">
                        ({(file.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveFile(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Message d'erreur */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || (mode === 'reject' && !comments.trim())}
            className={isApproveMode ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
          >
            {isLoading ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Traitement...
              </>
            ) : (
              <>
                {isApproveMode ? (
                  <ThumbsUp className="h-4 w-4 mr-2" />
                ) : (
                  <AlertTriangle className="h-4 w-4 mr-2" />
                )}
                {buttonLabel}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
