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
import { Textarea } from '@/components/ui/textarea'
import { MessageSquare, Send, Trash2, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { toast } from 'sonner'
import { addInterventionComment, deleteInterventionComment } from '@/app/actions/intervention-comment-actions'
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
  const [newComment, setNewComment] = useState('')
  const [isPending, startTransition] = useTransition()

  // Sync state when initialComments changes (fixes hydration)
  useEffect(() => {
    setComments(initialComments)
  }, [initialComments])

  // Only gestionnaires can add comments (per requirements)
  const canAddComment = currentUserRole === 'gestionnaire' || currentUserRole === 'admin'

  const handleAddComment = () => {
    if (!newComment.trim()) {
      toast.error('Le commentaire ne peut pas être vide')
      return
    }

    startTransition(async () => {
      const result = await addInterventionComment({
        interventionId,
        content: newComment
      })

      if (result.success) {
        setComments([result.data, ...comments])
        setNewComment('')
        toast.success('Commentaire ajouté')
      } else {
        toast.error(result.error)
      }
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

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'gestionnaire':
        return 'bg-purple-100 text-purple-800'
      case 'prestataire':
        return 'bg-green-100 text-green-800'
      case 'locataire':
        return 'bg-blue-100 text-blue-800'
      case 'admin':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'gestionnaire':
        return 'Gestionnaire'
      case 'prestataire':
        return 'Prestataire'
      case 'locataire':
        return 'Locataire'
      case 'admin':
        return 'Admin'
      default:
        return role
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquare className="h-5 w-5" />
          Commentaires ({comments.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add comment form (gestionnaires only) */}
        {canAddComment && (
          <div className="space-y-3">
            <Textarea
              placeholder="Ajouter un commentaire..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="min-h-[80px] resize-none"
              disabled={isPending}
            />
            <Button
              onClick={handleAddComment}
              disabled={isPending || !newComment.trim()}
              className="w-full"
              size="sm"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Envoi...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Ajouter un commentaire
                </>
              )}
            </Button>
          </div>
        )}

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
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${getRoleBadgeColor(
                            user.role
                          )}`}
                        >
                          {getRoleLabel(user.role)}
                        </span>
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
    </Card>
  )
}
