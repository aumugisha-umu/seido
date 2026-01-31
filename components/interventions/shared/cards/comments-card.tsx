'use client'

/**
 * CommentsCard - Card des commentaires internes
 *
 * Layout: Header | Liste scrollable | Zone action sticky en bas
 * Accessible aux gestionnaires et prestataires
 *
 * @example
 * <CommentsCard
 *   comments={comments}
 *   onAddComment={handleAddComment}
 *   showHeader={false} // Pour usage dans modale
 * />
 */

import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { MessageSquareText, Send, Lock, Plus, X, Loader2 } from 'lucide-react'
import { CommentsCardProps, Comment } from '../types'
import { getInitials, formatRelativeDate } from '../utils/helpers'

/**
 * Élément de commentaire individuel
 */
interface CommentItemProps {
  comment: Comment
}

const CommentItem = ({ comment }: CommentItemProps) => {
  // Détection du type de commentaire (rejet)
  const isRejectionComment = comment.content.includes('❌') || comment.content.toLowerCase().includes('rejet')

  return (
    <div
      className={cn(
        "flex gap-3 p-3 rounded-lg transition-colors",
        isRejectionComment
          ? "bg-red-50 border border-red-100"
          : "hover:bg-slate-50/50"
      )}
    >
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarFallback
          className={cn(
            "text-xs font-semibold",
            isRejectionComment
              ? "bg-red-100 text-red-700"
              : "bg-blue-100 text-blue-700"
          )}
        >
          {getInitials(comment.author)}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
          <span className={cn(
            "text-sm font-medium",
            isRejectionComment && "text-red-900"
          )}>
            {comment.author}
          </span>

          {comment.is_internal && (
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0 h-4 gap-0.5 text-amber-600 border-amber-300 bg-amber-50"
            >
              <Lock className="h-2.5 w-2.5" />
              Interne
            </Badge>
          )}

          <span className="text-[11px] text-muted-foreground">•</span>
          <span className="text-[11px] text-muted-foreground">
            {formatRelativeDate(comment.date)}
          </span>
        </div>

        <p className={cn(
          "text-sm leading-relaxed",
          isRejectionComment ? "text-red-800" : "text-slate-700"
        )}>
          {comment.content}
        </p>
      </div>
    </div>
  )
}

/**
 * Card des commentaires
 */
export const CommentsCard = ({
  comments = [],
  onAddComment,
  isLoading = false,
  className,
  showHeader = true
}: CommentsCardProps) => {
  const [newComment, setNewComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isInputMode, setIsInputMode] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

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
      setIsInputMode(false)
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

  // Version pour usage dans une Card standard (avec header)
  if (showHeader) {
    return (
      <Card className={cn('flex flex-col', className)}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquareText className="h-4 w-4 text-muted-foreground" />
              Commentaires
            </CardTitle>
            {onAddComment && !isInputMode && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsInputMode(true)}
                disabled={isLoading}
                className="h-8 text-xs"
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Ajouter
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="flex flex-col gap-3 pt-0">
          {comments.length > 0 ? (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {comments.map((comment) => (
                <CommentItem key={comment.id} comment={comment} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center py-6 text-center">
              <MessageSquareText className="h-8 w-8 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">Aucun commentaire</p>
            </div>
          )}

          {onAddComment && isInputMode && (
            <div className="pt-3 border-t space-y-3">
              <Textarea
                ref={textareaRef}
                placeholder="Écrire un commentaire..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={handleKeyDown}
                className="min-h-[80px] resize-none"
                disabled={isLoading || isSubmitting}
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={handleCancel} disabled={isSubmitting}>
                  Annuler
                </Button>
                <Button size="sm" onClick={handleSubmit} disabled={!newComment.trim() || isSubmitting}>
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Envoyer'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  // Version pour usage dans une modale (sans header, structure flex optimisée)
  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Zone scrollable des commentaires */}
      <div className="flex-1 overflow-y-auto px-4 py-2">
        {comments.length > 0 ? (
          <div className="space-y-2">
            {comments.map((comment) => (
              <CommentItem key={comment.id} comment={comment} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full py-8 text-center">
            <MessageSquareText className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">Aucun commentaire pour le moment</p>
          </div>
        )}
      </div>

      {/* Zone sticky en bas : bouton Ajouter ou formulaire */}
      {onAddComment && (
        <div className="flex-shrink-0 border-t bg-background px-4 py-3">
          {!isInputMode ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsInputMode(true)}
              disabled={isLoading}
              className="w-full h-9"
            >
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un commentaire
            </Button>
          ) : (
            <div className="space-y-3">
              <Textarea
                ref={textareaRef}
                placeholder="Écrire un commentaire..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={handleKeyDown}
                className="min-h-[80px] resize-none"
                disabled={isLoading || isSubmitting}
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground hidden sm:block">
                  Ctrl+Entrée pour envoyer
                </span>
                <div className="flex gap-2 ml-auto">
                  <Button variant="ghost" size="sm" onClick={handleCancel} disabled={isSubmitting}>
                    <X className="h-4 w-4 mr-1" />
                    Annuler
                  </Button>
                  <Button size="sm" onClick={handleSubmit} disabled={!newComment.trim() || isSubmitting}>
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-1" />
                        Envoyer
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
