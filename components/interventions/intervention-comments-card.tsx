'use client'

/**
 * Intervention Comments Card
 * Displays a list of comments with add/delete functionality
 * Add: Gestionnaires only | Read: All participants | Delete: Owner or admin
 */

import { useState, useTransition, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { SeidoBadge } from '@/components/ui/seido-badge'
import { MessageSquare, Trash2, Plus } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { toast } from 'sonner'
import { addInterventionComment, deleteInterventionComment } from '@/app/actions/intervention-comment-actions'
import { AddCommentModal } from '@/components/interventions/modals/add-comment-modal'
import type { Database } from '@/lib/database.types'

type User = Database['public']['Tables']['users']['Row']

interface Comment {
  id: string
  content: string
  created_at: string
  user?: Pick<User, 'id' | 'name' | 'email' | 'avatar_url' | 'role'>
}

interface InterventionCommentsCardProps {
  interventionId: string
  comments: Comment[]
  currentUserId: string
  currentUserRole: 'admin' | 'gestionnaire' | 'locataire' | 'prestataire' | 'proprietaire'
}

export function InterventionCommentsCard({
  interventionId,
  comments: initialComments,
  currentUserId,
  currentUserRole
}: InterventionCommentsCardProps) {
  const [comments, setComments] = useState(initialComments)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Sync state when initialComments changes (fixes hydration)
  useEffect(() => {
    setComments(initialComments)
  }, [initialComments])

  // Only gestionnaires can add comments (per requirements)
  const canAddComment = currentUserRole === 'gestionnaire' || currentUserRole === 'admin'

  const handleAddComment = async (content: string) => {
    if (!content.trim()) {
      toast.error('Le commentaire ne peut pas être vide')
      return
    }

    return new Promise<void>((resolve, reject) => {
      startTransition(async () => {
        const result = await addInterventionComment({
          interventionId,
          content
        })

        if (result.success) {
          setComments([result.data, ...comments])
          toast.success('Commentaire ajouté')
          setIsModalOpen(false)
          resolve()
        } else {
          toast.error(result.error)
          reject(new Error(result.error))
        }
      })
    })
  }

  const handleDeleteComment = (commentId: string) => {
    startTransition(async () => {
      const result = await deleteInterventionComment({ commentId })

      if (result.success) {
        setComments(comments.filter(c => c.id !== commentId))
        toast.success('Commentaire supprimé')
      } else {
        toast.error(result.error)
      }
    })
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-5 w-5" />
            Commentaires ({comments.length})
          </CardTitle>
          {canAddComment && (
            <Button
              onClick={() => setIsModalOpen(true)}
              size="sm"
              variant="outline"
              className="gap-1.5"
            >
              <Plus className="h-4 w-4" />
              Nouveau
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">

        {/* Comments list */}
        <div className="space-y-3">
          {comments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucun commentaire pour le moment
            </p>
          ) : (
            comments.map((comment) => {
              const user = comment.user
              const isOwner = user?.id === currentUserId
              const canDelete = isOwner || currentUserRole === 'admin'

              return (
                <div
                  key={comment.id}
                  className="flex gap-3 p-3 rounded-lg border bg-card"
                >
                  {/* Avatar */}
                  <Avatar className="h-9 w-9 flex-shrink-0">
                    <AvatarImage src={user?.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {user?.name ? getInitials(user.name) : '?'}
                    </AvatarFallback>
                  </Avatar>

                  {/* Content */}
                  <div className="flex-1 min-w-0 space-y-1">
                    {/* Header: name, role, date */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">
                        {user?.name || 'Utilisateur inconnu'}
                      </span>
                      {user?.role && (
                        <SeidoBadge type="role" value={user.role} size="sm" />
                      )}
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(comment.created_at), 'dd MMM yyyy à HH:mm', {
                          locale: fr
                        })}
                      </span>
                    </div>

                    {/* Comment content */}
                    <p className="text-sm whitespace-pre-wrap break-words text-foreground">
                      {comment.content}
                    </p>
                  </div>

                  {/* Delete button */}
                  {canDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteComment(comment.id)}
                      disabled={isPending}
                      className="flex-shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )
            })
          )}
        </div>
      </CardContent>

      {/* Add Comment Modal */}
      <AddCommentModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onSubmit={handleAddComment}
        isSubmitting={isPending}
      />
    </Card>
  )
}
