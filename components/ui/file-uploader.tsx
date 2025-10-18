'use client'

/**
 * File Uploader Component
 * Reusable file upload component with drag & drop support
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Upload, FileText, Trash2 } from 'lucide-react'

interface FileUploaderProps {
  files: File[]
  onFilesChange: (files: File[]) => void
  accept?: string
  maxSize?: number // in MB
  maxFiles?: number
  label?: string
  className?: string
}

export function FileUploader({
  files,
  onFilesChange,
  accept = '.jpg,.jpeg,.png,.pdf,.doc,.docx',
  maxSize = 10,
  maxFiles,
  label = 'Fichiers joints (optionnel)',
  className = ''
}: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || [])
    addFiles(selectedFiles)
    event.target.value = '' // Reset input
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
    const droppedFiles = Array.from(event.dataTransfer.files)
    addFiles(droppedFiles)
  }

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const addFiles = (newFiles: File[]) => {
    // Filter by max size
    const validFiles = newFiles.filter(file => {
      const fileSizeMB = file.size / (1024 * 1024)
      return fileSizeMB <= maxSize
    })

    // Check max files limit
    let filesToAdd = validFiles
    if (maxFiles && files.length + validFiles.length > maxFiles) {
      filesToAdd = validFiles.slice(0, maxFiles - files.length)
    }

    onFilesChange([...files, ...filesToAdd])
  }

  const removeFile = (index: number) => {
    onFilesChange(files.filter((_, i) => i !== index))
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const inputId = `file-upload-${Math.random().toString(36).substring(7)}`

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <div
        className={`border-2 border-dashed rounded-lg p-3 text-center transition-colors h-[180px] flex flex-col justify-center ${
          isDragging
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <Upload className="h-6 w-6 text-gray-400 mx-auto mb-2" />
        <p className="text-xs text-gray-600 mb-1">
          Glissez vos fichiers ici
        </p>
        <p className="text-[10px] text-gray-500 mb-3">
          JPG, PNG, PDF, DOC
          <br />
          (max {maxSize}MB)
        </p>
        <input
          type="file"
          multiple={!maxFiles || maxFiles > 1}
          accept={accept}
          onChange={handleFileUpload}
          className="hidden"
          id={inputId}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => document.getElementById(inputId)?.click()}
          className="mx-auto"
        >
          Parcourir
        </Button>
      </div>

      {files.length > 0 && (
        <div className="mt-3 space-y-1.5 max-h-[120px] overflow-y-auto">
          {files.map((file, index) => (
            <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs">
              <div className="flex items-center space-x-2 min-w-0 flex-1">
                <FileText className="h-3 w-3 text-gray-500 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900 truncate">{file.name}</p>
                  <p className="text-[10px] text-gray-500">{formatFileSize(file.size)}</p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeFile(index)}
                className="text-red-500 hover:text-red-700 h-6 w-6 p-0 flex-shrink-0"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
