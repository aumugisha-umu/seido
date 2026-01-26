'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { UserPlus, Loader2, Users, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  getTeamGestionnairesAction,
  addEmailConversationParticipantsAction
} from '@/app/actions/email-conversation-actions'

interface TeamGestionnaire {
  id: string
  name: string | null
  email: string | null
  avatar_url: string | null
  role: string
}

interface AddParticipantModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  threadId: string
  teamId: string
  currentParticipantIds: string[]
  onParticipantsAdded: () => void
}

export function AddParticipantModal({
  open,
  onOpenChange,
  threadId,
  teamId,
  currentParticipantIds,
  onParticipantsAdded
}: AddParticipantModalProps) {
  const [gestionnaires, setGestionnaires] = useState<TeamGestionnaire[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [isAdding, setIsAdding] = useState(false)

  // Fetch team gestionnaires when modal opens
  useEffect(() => {
    if (open && teamId) {
      fetchGestionnaires()
    }
  }, [open, teamId])

  // Reset selection when modal opens
  useEffect(() => {
    if (open) {
      setSelectedIds(new Set())
    }
  }, [open])

  const fetchGestionnaires = async () => {
    setIsLoading(true)
    try {
      const result = await getTeamGestionnairesAction(teamId)
      if (result.success && result.data) {
        // Filter out users who are already participants
        const availableGestionnaires = result.data.filter(
          g => !currentParticipantIds.includes(g.id)
        )
        setGestionnaires(availableGestionnaires)
      } else {
        toast.error('Impossible de charger les gestionnaires')
      }
    } catch (error) {
      toast.error('Erreur lors du chargement')
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggle = (userId: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(userId)) {
      newSelected.delete(userId)
    } else {
      newSelected.add(userId)
    }
    setSelectedIds(newSelected)
  }

  const handleSelectAll = () => {
    setSelectedIds(new Set(gestionnaires.map(g => g.id)))
  }

  const handleDeselectAll = () => {
    setSelectedIds(new Set())
  }

  const handleConfirm = async () => {
    if (selectedIds.size === 0) {
      toast.error('Sélectionnez au moins un participant')
      return
    }

    setIsAdding(true)
    try {
      const result = await addEmailConversationParticipantsAction(
        threadId,
        Array.from(selectedIds)
      )

      if (result.success) {
        toast.success(`${selectedIds.size} participant${selectedIds.size > 1 ? 's' : ''} ajouté${selectedIds.size > 1 ? 's' : ''}`)
        onParticipantsAdded()
        onOpenChange(false)
      } else {
        // Ensure error is always a string (defensive against Supabase error objects)
        const errorMessage = typeof result.error === 'string'
          ? result.error
          : (result.error as { message?: string })?.message || 'Échec de l\'ajout'
        toast.error(errorMessage)
      }
    } catch (error) {
      toast.error('Erreur lors de l\'ajout')
    } finally {
      setIsAdding(false)
    }
  }

  const getInitials = (name: string | null, email: string | null) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    }
    if (email) {
      return email.substring(0, 2).toUpperCase()
    }
    return '??'
  }

  // All gestionnaires are already participants
  const allAlreadyAdded = gestionnaires.length === 0 && !isLoading

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Ajouter des participants
          </DialogTitle>
          <DialogDescription>
            Sélectionnez les membres de l'équipe à ajouter à cette discussion.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : allAlreadyAdded ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500 opacity-70" />
              <p className="font-medium">Tous les gestionnaires sont déjà participants</p>
              <p className="text-sm mt-1">Aucun membre supplémentaire disponible</p>
            </div>
          ) : gestionnaires.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Aucun gestionnaire trouvé</p>
            </div>
          ) : (
            <>
              {/* Quick actions */}
              <div className="flex gap-2 mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  disabled={selectedIds.size === gestionnaires.length}
                >
                  Tout sélectionner
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDeselectAll}
                  disabled={selectedIds.size === 0}
                >
                  Tout désélectionner
                </Button>
              </div>

              {/* Gestionnaires list */}
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {gestionnaires.map((gestionnaire) => {
                  const isSelected = selectedIds.has(gestionnaire.id)

                  return (
                    <label
                      key={gestionnaire.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-primary/5 border-primary/30'
                          : 'hover:bg-muted/50'
                      }`}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleToggle(gestionnaire.id)}
                      />
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={gestionnaire.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {getInitials(gestionnaire.name, gestionnaire.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">
                          {gestionnaire.name || 'Sans nom'}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {gestionnaire.email}
                        </div>
                      </div>
                    </label>
                  )
                })}
              </div>

              <div className="mt-4 text-sm text-muted-foreground">
                {selectedIds.size} participant{selectedIds.size > 1 ? 's' : ''} sélectionné{selectedIds.size > 1 ? 's' : ''}
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isAdding}>
            {allAlreadyAdded ? 'Fermer' : 'Annuler'}
          </Button>
          {!allAlreadyAdded && (
            <Button
              onClick={handleConfirm}
              disabled={isAdding || isLoading || selectedIds.size === 0}
            >
              {isAdding ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Ajout...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Ajouter
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
