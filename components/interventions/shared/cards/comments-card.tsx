'use client'

/**
 * CommentsCard - Card des commentaires internes (visible par les gestionnaires uniquement)
 *
 * @example
 * <CommentsCard
 *   comments={comments}
 *   onAddComment={handleAddComment}
 * />
 */

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { MessageSquareText, Send, Lock } from 'lucide-react'
import { CommentsCardProps, Comment } from '../types'
import { getInitials, formatRelativeDate } from '../utils/helpers'

/**
 * Élément de commentaire individuel
 */
interface CommentItemProps {
  comment: Comment
}

const CommentItem = ({ comment }: CommentItemProps) => {
  return (
    <div className="flex gap-3">
      {/* Avatar */}
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarFallback className="bg-blue-100 text-blue-700 text-xs font-medium">
          {getInitials(comment.author)}
        </AvatarFallback>
      </Avatar>

      {/* Contenu */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium">{comment.author}</span>
          <span className="text-xs text-muted-foreground">
            {formatRelativeDate(comment.date)}
          </span>
        </div>
        <p className="text-sm text-slate-600 leading-relaxed">
          {comment.content}
        </p>
      </div>
    </div>
  )
}

/**
 * Card des commentaires internes
 */
export const CommentsCard = ({
  comments = [],
  onAddComment,
  isLoading = false,
  className
}: CommentsCardProps) => {
  const [newComment, setNewComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!newComment.trim() || !onAddComment) return

    setIsSubmitting(true)
    try {
      await onAddComment(newComment.trim())
      setNewComment('')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquareText className="h-4 w-4 text-muted-foreground" />
            Commentaires internes
          </CardTitle>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Lock className="h-3 w-3" />
            <span>Gestionnaires uniquement</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Liste des commentaires */}
        {comments.length > 0 ? (
          <div className="space-y-4 max-h-[300px] overflow-y-auto">
            {comments.map((comment) => (
              <CommentItem key={comment.id} comment={comment} />
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-sm text-muted-foreground">
            Aucun commentaire pour le moment
          </div>
        )}

        {/* Zone de saisie */}
        {onAddComment && (
          <div className="pt-3 border-t space-y-2">
            <Textarea
              placeholder="Ajouter un commentaire interne..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={handleKeyDown}
              className="min-h-[80px] resize-none"
              disabled={isLoading || isSubmitting}
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Ctrl + Entrée pour envoyer
              </span>
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={!newComment.trim() || isLoading || isSubmitting}
              >
                <Send className="h-3.5 w-3.5 mr-1.5" />
                Envoyer
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
