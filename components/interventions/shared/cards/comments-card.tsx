'use client'

/**
 * CommentsCard - Card des commentaires internes (visible par les gestionnaires uniquement)
 *
 * Design: Mode preview (liste + bouton Ajouter) / Mode input (textarea + bouton envoyer)
 *
 * @example
 * <CommentsCard
 *   comments={comments}
 *   onAddComment={handleAddComment}
 * />
 */

import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { MessageSquareText, Send, Lock, Plus, X } from 'lucide-react'
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
  const [isInputMode, setIsInputMode] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Focus le textarea quand on passe en mode input
  useEffect(() => {
    if (isInputMode && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [isInputMode])

  const handleSubmit = async () => {
    if (!newComment.trim() || !onAddComment) return

    setIsSubmitting(true)
    try {
      await onAddComment(newComment.trim())
      setNewComment('')
      setIsInputMode(false) // Revenir en mode preview après envoi
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    setNewComment('')
    setIsInputMode(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault()
      handleSubmit()
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      handleCancel()
    }
  }

  return (
    <Card className={cn('flex flex-col h-full', className)}>
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquareText className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            Commentaires
          </CardTitle>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Lock className="h-3 w-3" aria-hidden="true" />
            <span>Gestionnaires uniquement</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col flex-1 overflow-hidden gap-3">
        {/* Liste des commentaires avec scroll */}
        {comments.length > 0 ? (
          <div className="space-y-4 flex-1 overflow-y-auto pr-1">
            {comments.map((comment) => (
              <CommentItem key={comment.id} comment={comment} />
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-sm text-muted-foreground flex-1">
            Aucun commentaire pour le moment
          </div>
        )}

        {/* Zone d'action en bas */}
        {onAddComment && (
          <div className="pt-3 border-t flex-shrink-0">
            {isInputMode ? (
              /* Mode Input : Textarea + boutons Envoyer/Annuler */
              <div className="space-y-2">
                <Textarea
                  ref={textareaRef}
                  placeholder="Écrire un commentaire interne..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="min-h-[80px] resize-none"
                  disabled={isLoading || isSubmitting}
                  aria-describedby="comment-help"
                />
                <div className="flex items-center justify-between">
                  <span id="comment-help" className="text-xs text-muted-foreground">
                    Ctrl+Entrée envoyer · Échap annuler
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCancel}
                      disabled={isSubmitting}
                      className="h-8"
                    >
                      <X className="h-4 w-4 mr-1" aria-hidden="true" />
                      Annuler
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSubmit}
                      disabled={!newComment.trim() || isLoading || isSubmitting}
                      className="h-8"
                    >
                      <Send className="h-4 w-4 mr-1" aria-hidden="true" />
                      Envoyer
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              /* Mode Preview : Bouton Ajouter */
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsInputMode(true)}
                className="w-full"
                disabled={isLoading}
              >
                <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
                Ajouter un commentaire
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
