'use client'

import { DocumentChecklist } from '@/components/contract/document-checklist'

interface ContractDocumentSectionProps {
  mode: 'create' | 'edit'
  slots: Parameters<typeof DocumentChecklist>[0]['slots']
  onAddFilesToSlot: Parameters<typeof DocumentChecklist>[0]['onAddFilesToSlot']
  onRemoveFileFromSlot: Parameters<typeof DocumentChecklist>[0]['onRemoveFileFromSlot']
  progress: Parameters<typeof DocumentChecklist>[0]['progress']
  missingRecommendedDocuments: string[]
  isUploading: boolean
  onSetSlotExpiryDate: Parameters<typeof DocumentChecklist>[0]['onSetSlotExpiryDate']
}

export function ContractDocumentSection({
  mode,
  slots,
  onAddFilesToSlot,
  onRemoveFileFromSlot,
  progress,
  missingRecommendedDocuments,
  isUploading,
  onSetSlotExpiryDate,
}: ContractDocumentSectionProps) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="text-center max-w-2xl mx-auto mb-4">
        <h2 className="text-2xl font-bold mb-2">Documents du bail</h2>
        <p className="text-muted-foreground">
          {mode === 'create'
            ? 'Ajoutez les documents associes au contrat de location. Tous les documents sont optionnels.'
            : 'Gerez les documents du bail. Vous pouvez ajouter ou retirer des fichiers.'}
        </p>
      </div>
      <DocumentChecklist
        slots={slots}
        onAddFilesToSlot={onAddFilesToSlot}
        onRemoveFileFromSlot={onRemoveFileFromSlot}
        progress={progress}
        missingRecommendedDocuments={missingRecommendedDocuments}
        isUploading={isUploading}
        onSetSlotExpiryDate={onSetSlotExpiryDate}
      />
    </div>
  )
}
