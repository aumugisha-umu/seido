"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Upload,
  X,
  FileText,
  Image as ImageIcon,
  File,
  CheckCircle,
  AlertTriangle,
  Loader2
} from "lucide-react"
import { useDocumentUpload } from "@/hooks/use-document-upload"

interface DocumentUploadSectionProps {
  interventionId?: string
  onUploadComplete?: (documents: any[]) => void
  onUploadError?: (error: string) => void
  maxFiles?: number
  maxFileSize?: number // in bytes
  acceptedTypes?: string[]
  disabled?: boolean
}

export const DocumentUploadSection = ({
  interventionId,
  onUploadComplete,
  onUploadError,
  maxFiles = 10,
  maxFileSize = 10 * 1024 * 1024, // 10MB
  acceptedTypes = [
    'image/*',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ],
  disabled = false
}: DocumentUploadSectionProps) => {
  const [dragActive, setDragActive] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
    uploads,
    isUploading,
    overallProgress,
    completedCount,
    errorCount,
    uploadFiles,
    clearUploads,
    removeUpload
  } = useDocumentUpload({
    interventionId: interventionId || '',
    onUploadComplete,
    onUploadError
  })

  const validateFiles = (files: File[]): { valid: File[], invalid: string[] } => {
    const valid: File[] = []
    const invalid: string[] = []

    for (const file of files) {
      // Check file size
      if (file.size > maxFileSize) {
        invalid.push(`${file.name}: fichier trop volumineux (max ${Math.round(maxFileSize / 1024 / 1024)}MB)`)
        continue
      }

      // Check file type
      const isValidType = acceptedTypes.some(type => {
        if (type.endsWith('/*')) {
          return file.type.startsWith(type.slice(0, -1))
        }
        return file.type === type
      })

      if (!isValidType) {
        invalid.push(`${file.name}: type de fichier non supporté`)
        continue
      }

      valid.push(file)
    }

    // Check total file count
    if (valid.length + uploads.length > maxFiles) {
      const excess = valid.length + uploads.length - maxFiles
      invalid.push(`Trop de fichiers (max ${maxFiles}). ${excess} fichier(s) ignoré(s).`)
      valid.splice(maxFiles - uploads.length)
    }

    return { valid, invalid }
  }

  const handleFiles = (files: FileList | File[]) => {
    if (!interventionId) {
      setValidationError("ID d'intervention manquant")
      return
    }

    const fileArray = Array.from(files)
    const { valid, invalid } = validateFiles(fileArray)

    if (invalid.length > 0) {
      setValidationError(invalid.join('\n'))
    } else {
      setValidationError(null)
    }

    if (valid.length > 0) {
      uploadFiles(valid)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    
    if (disabled || isUploading) return

    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFiles(files)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled && !isUploading) {
      setDragActive(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files)
      // Reset input
      e.target.value = ''
    }
  }

  const handleBrowseFiles = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return ImageIcon
    if (file.type === 'application/pdf') return File
    return FileText
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const canUploadMore = uploads.length < maxFiles && !disabled

  return (
    <div className="space-y-4">
      {/* Upload Zone */}
      {canUploadMore && (
        <div
          className={`
            border-2 border-dashed rounded-lg p-6 text-center transition-colors
            ${dragActive 
              ? 'border-sky-400 bg-sky-50' 
              : 'border-slate-300 hover:border-slate-400'
            }
            ${disabled || isUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={!disabled && !isUploading ? handleBrowseFiles : undefined}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={acceptedTypes.join(',')}
            onChange={handleFileInput}
            className="hidden"
            disabled={disabled || isUploading}
          />
          
          <div className="flex flex-col items-center space-y-2">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              dragActive ? 'bg-sky-100' : 'bg-slate-100'
            }`}>
              <Upload className={`h-6 w-6 ${
                dragActive ? 'text-sky-600' : 'text-slate-600'
              }`} />
            </div>
            
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-900">
                {dragActive ? 'Déposer les fichiers ici' : 'Glisser-déposer des fichiers'}
              </p>
              <p className="text-xs text-slate-600">
                ou <span className="text-sky-600 font-medium">parcourir</span> pour sélectionner
              </p>
              <p className="text-xs text-slate-500">
                Max {maxFiles} fichiers, {Math.round(maxFileSize / 1024 / 1024)}MB chacun
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Validation Error */}
      {validationError && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800 whitespace-pre-line">
            {validationError}
            <Button 
              variant="ghost" 
              size="sm" 
              className="mt-2 text-orange-800 hover:text-orange-900" 
              onClick={() => setValidationError(null)}
            >
              Fermer
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Upload Progress */}
      {uploads.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <span className="text-base">Upload en cours</span>
              <div className="flex items-center space-x-2">
                {isUploading && <Loader2 className="h-4 w-4 animate-spin text-sky-600" />}
                <Badge variant="outline" className="text-xs">
                  {completedCount}/{uploads.length}
                </Badge>
                {errorCount > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {errorCount} erreur(s)
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearUploads}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </CardTitle>
            {isUploading && (
              <div className="space-y-2">
                <Progress value={overallProgress} className="h-2" />
                <p className="text-xs text-slate-600 text-center">
                  {Math.round(overallProgress)}% terminé
                </p>
              </div>
            )}
          </CardHeader>
          
          <CardContent className="pt-0">
            <div className="space-y-3">
              {uploads.map((upload, index) => {
                const FileIcon = getFileIcon(upload.file)
                
                return (
                  <div key={index} className="flex items-center space-x-3 p-2 bg-slate-50 rounded-lg">
                    <div className="w-8 h-8 bg-white rounded-md flex items-center justify-center border">
                      <FileIcon className="h-4 w-4 text-slate-600" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {upload.file.name}
                        </p>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-slate-500">
                            {formatFileSize(upload.file.size)}
                          </span>
                          {upload.status === 'completed' && (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          )}
                          {upload.status === 'error' && (
                            <AlertTriangle className="h-4 w-4 text-red-600" />
                          )}
                          {upload.status === 'uploading' && (
                            <Loader2 className="h-4 w-4 animate-spin text-sky-600" />
                          )}
                        </div>
                      </div>
                      
                      {upload.status === 'uploading' && (
                        <Progress value={upload.progress} className="h-1 mt-1" />
                      )}
                      
                      {upload.status === 'error' && upload.error && (
                        <p className="text-xs text-red-600 mt-1">{upload.error}</p>
                      )}
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeUpload(index)}
                      className="h-6 w-6 p-0 text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
