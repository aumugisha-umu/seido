'use client'

import { useState, useEffect } from 'react'
import {
  UnifiedModal,
  UnifiedModalHeader,
  UnifiedModalBody,
  UnifiedModalFooter,
} from '@/components/ui/unified-modal'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { MessageSquarePlus, Loader2, Users } from 'lucide-react'
import { toast } from 'sonner'
import {
  getTeamGestionnairesAction,
  createEmailConversationAction
} from '@/app/actions/email-conversation-actions'

interface TeamGestionnaire {
  id: string
  name: string | null
  email: string | null
  avatar_url: string | null
  role: string
}

interface StartConversationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  emailId: string
  teamId: string
  currentUserId: string
  onConversationCreated: (threadId: string) => void
}

export function StartConversationModal({
  open,
  onOpenChange,
  emailId,
  teamId,
  currentUserId,
  onConversationCreated
}: StartConversationModalProps) {
  const [gestionnaires, setGestionnaires] = useState<TeamGestionnaire[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  // Fetch team gestionnaires when modal opens
  useEffect(() => {
    if (open && teamId) {
      fetchGestionnaires()
    }
  }, [open, teamId])

  const fetchGestionnaires = async () => {
    setIsLoading(true)
    try {
      const result = await getTeamGestionnairesAction(teamId)
      if (result.success && result.data) {
        setGestionnaires(result.data)
        // Pre-select all gestionnaires by default
        setSelectedIds(new Set(result.data.map(g => g.id)))
      } else {
        toast.error('Impossible de charger les gestionnaires')
      }
    } catch {
      toast.error('Erreur lors du chargement')
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggle = (userId: string) => {
    // Don't allow unchecking current user
    if (userId === currentUserId) return

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
    // Keep current user selected
    setSelectedIds(new Set([currentUserId]))
  }

  const handleConfirm = async () => {
    if (selectedIds.size === 0) {
      toast.error('Sélectionnez au moins un participant')
      return
    }

    setIsCreating(true)
    try {
      const result = await createEmailConversationAction(
        emailId,
        Array.from(selectedIds)
      )

      if (result.success && result.data) {
        toast.success('Conversation créée')
        onConversationCreated(result.data.id)
        onOpenChange(false)
      } else {
        // Ensure error is always a string (defensive against Supabase error objects)
        const errorMessage = typeof result.error === 'string'
          ? result.error
          : (result.error as { message?: string })?.message || 'Échec de la création'
        toast.error(errorMessage)
      }
    } catch {
      toast.error('Erreur lors de la création')
    } finally {
      setIsCreating(false)
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

  const handleOpenChange = (newOpen: boolean) => {
    if (!isCreating) {
      onOpenChange(newOpen)
    }
  }

  return (
    <UnifiedModal
      open={open}
      onOpenChange={handleOpenChange}
      size="md"
      preventCloseOnOutsideClick={isCreating}
      preventCloseOnEscape={isCreating}
    >
      <UnifiedModalHeader
        title="Démarrer une conversation"
        subtitle="Sélectionnez les membres de l'équipe à inclure dans cette discussion interne."
        icon={<MessageSquarePlus className="h-5 w-5" />}
      />

      <UnifiedModalBody>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
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
                disabled={selectedIds.size <= 1}
              >
                Tout désélectionner
              </Button>
            </div>

            {/* Gestionnaires list */}
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {gestionnaires.map((gestionnaire) => {
                const isCurrentUser = gestionnaire.id === currentUserId
                const isSelected = selectedIds.has(gestionnaire.id)

                return (
                  <label
                    key={gestionnaire.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-primary/5 border-primary/30'
                        : 'hover:bg-muted/50'
                    } ${isCurrentUser ? 'cursor-default' : ''}`}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleToggle(gestionnaire.id)}
                      disabled={isCurrentUser}
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
                        {isCurrentUser && (
                          <span className="text-xs text-muted-foreground ml-2">(vous)</span>
                        )}
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
      </UnifiedModalBody>

      <UnifiedModalFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isCreating}>
          Annuler
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={isCreating || isLoading || selectedIds.size === 0}
        >
          {isCreating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Création...
            </>
          ) : (
            <>
              <MessageSquarePlus className="mr-2 h-4 w-4" />
              Démarrer la conversation
            </>
          )}
        </Button>
      </UnifiedModalFooter>
    </UnifiedModal>
  )
}
