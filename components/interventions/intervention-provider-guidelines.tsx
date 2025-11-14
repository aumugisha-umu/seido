'use client'

/**
 * Editable Provider Guidelines Component
 * Allows gestionnaires to view and edit general instructions for providers
 */

import { useState } from 'react'
import { Info, Pencil, Save, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { updateProviderGuidelinesAction } from '@/app/actions/intervention-actions'

interface InterventionProviderGuidelinesProps {
  interventionId: string
  guidelines: string | null
  currentUserRole: 'admin' | 'gestionnaire' | 'locataire' | 'prestataire' | 'proprietaire'
  onUpdate?: () => void
}

export function InterventionProviderGuidelines({
  interventionId,
  guidelines,
  currentUserRole,
  onUpdate
}: InterventionProviderGuidelinesProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedGuidelines, setEditedGuidelines] = useState(guidelines || '')
  const [isSaving, setIsSaving] = useState(false)

  const canEdit = currentUserRole === 'gestionnaire' || currentUserRole === 'admin'

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const result = await updateProviderGuidelinesAction(
        interventionId,
        editedGuidelines.trim() || null
      )

      if (result.success) {
        toast.success('Instructions mises à jour avec succès')
        setIsEditing(false)
        onUpdate?.()
      } else {
        toast.error(result.error || 'Erreur lors de la mise à jour')
      }
    } catch (error) {
      console.error('Error updating guidelines:', error)
      toast.error('Erreur lors de la mise à jour des instructions')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setEditedGuidelines(guidelines || '')
    setIsEditing(false)
  }

  // Don't render if no guidelines and not a gestionnaire/admin
  if (!guidelines && !canEdit) {
    return null
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-500" />
          <h4 className="text-sm font-medium">Instructions générales</h4>
        </div>

        {canEdit && !isEditing && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(true)}
            className="h-7 text-xs"
          >
            <Pencil className="w-3 h-3 mr-1" />
            Modifier
          </Button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-2">
          <Textarea
            value={editedGuidelines}
            onChange={(e) => setEditedGuidelines(e.target.value)}
            placeholder="Ajoutez des instructions générales pour le prestataire..."
            className="min-h-[100px] text-sm"
            maxLength={5000}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {editedGuidelines.length} / 5000 caractères
            </span>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                disabled={isSaving}
                className="h-7 text-xs"
              >
                <X className="w-3 h-3 mr-1" />
                Annuler
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
                className="h-7 text-xs"
              >
                <Save className="w-3 h-3 mr-1" />
                {isSaving ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {guidelines ? (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-blue-50 rounded-lg p-3">
              {guidelines}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground italic bg-gray-50 rounded-lg p-3">
              Aucune instruction générale définie. Cliquez sur "Modifier" pour en ajouter.
            </p>
          )}
        </>
      )}
    </div>
  )
}
