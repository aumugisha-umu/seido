'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Reply,
  Forward,
  Trash,
  MoreHorizontal,
  Paperclip,
  Building as BuildingIcon,
  Wrench,
  Ban,
  Download,
  CheckCircle2
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { toast } from 'sonner'
import DOMPurify from 'isomorphic-dompurify'
import { MailboxEmail, Building, getConversationEmails } from './types'
import { MarkAsIrrelevantDialog } from './mark-irrelevant-dialog'
import { ConversationThread } from './conversation-thread'
import { LinkToBuildingDropdown } from './link-to-building-dropdown'
import { MarkAsProcessedDialog } from './mark-as-processed-dialog'
import { InternalChatPanel } from './internal-chat-panel'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'

interface EmailDetailProps {
  email: MailboxEmail
  allEmails: MailboxEmail[]
  buildings: Building[]
  onReply?: (replyText: string) => void
  onArchive?: () => void
  onDelete?: () => void
  onLinkBuilding?: (buildingId: string, lotId?: string) => void
  onCreateIntervention?: () => void
  onSoftDelete?: (emailId: string) => void
  onBlacklist?: (emailId: string, senderEmail: string, reason?: string) => void
  onMarkAsProcessed?: () => void
}

export function EmailDetail({
  email,
  allEmails,
  buildings,
  onReply,
  onArchive,
  onDelete,
  onLinkBuilding,
  onCreateIntervention,
  onSoftDelete,
  onBlacklist,
  onMarkAsProcessed
}: EmailDetailProps) {
  const [showReplyBox, setShowReplyBox] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [showMarkDialog, setShowMarkDialog] = useState(false)
  const [showLinkDialog, setShowLinkDialog] = useState(false)
  const [showProcessedDialog, setShowProcessedDialog] = useState(false)

  // Sanitize HTML body to prevent XSS attacks - Simple version
  const sanitizedBody = useMemo(() => {
    if (!email.body_html || email.body_html.trim() === '') {
      return ''
    }
    // DOMPurify basique - sécurité uniquement
    return DOMPurify.sanitize(email.body_html, {
      ALLOWED_TAGS: [
        'p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'code',
        'img', 'span', 'div', 'table', 'thead', 'tbody', 'tr', 'th', 'td'
      ],
      ALLOWED_ATTR: [
        'href', 'target', 'rel', 'src', 'alt', 'title', 'width', 'height',
        'class', 'style', 'loading', 'decoding'
      ],
      ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
      FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input'],
      FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
      ALLOW_DATA_ATTR: false,
      HOOKS: {
        afterSanitizeAttributes: (node) => {
          // Nettoyer les classes de padding Tailwind
          if (node.hasAttribute('class')) {
            const classes = node.getAttribute('class') || ''
            const cleanedClasses = classes
              .split(' ')
              .filter(cls => !cls.match(/^p[xytblr]?-\d+$/))
              .join(' ')
            if (cleanedClasses) {
              node.setAttribute('class', cleanedClasses)
            } else {
              node.removeAttribute('class')
            }
          }
          
          // Supprimer data-slot qui peut causer des conflits
          if (node.hasAttribute('data-slot')) {
            node.removeAttribute('data-slot')
          }
          
          // Nettoyer les attributs width/height sur images et tables
          if (node.tagName === 'IMG' || node.tagName === 'TABLE') {
            node.removeAttribute('width')
            node.removeAttribute('height')
          }
          
          // Nettoyer les styles inline pour enlever largeurs fixes
          if (node.hasAttribute('style')) {
            const style = node.getAttribute('style') || ''
            const cleanedStyle = style
              .split(';')
              .filter(rule => {
                const trimmed = rule.trim().toLowerCase()
                // Supprimer width, min-width, max-width fixes
                return !trimmed.startsWith('width:') && 
                       !trimmed.startsWith('min-width:') &&
                       !trimmed.startsWith('max-width:')
              })
              .join(';')
            
            if (cleanedStyle.trim()) {
              node.setAttribute('style', cleanedStyle)
            } else {
              node.removeAttribute('style')
            }
          }
        }
      }
    })
  }, [email.body_html])

  // Get content to display (HTML or fallback to text)
  const hasHtmlContent = sanitizedBody && sanitizedBody.trim() !== ''
  const textContent = email.body_text || email.snippet || ''

  const handleReply = () => {
    if (replyText.trim()) {
      onReply?.(replyText)
      setReplyText('')
      setShowReplyBox(false)
      toast.success('Réponse envoyée !')
    }
  }

  const handleLinkBuilding = (buildingId: string, lotId?: string) => {
    onLinkBuilding?.(buildingId, lotId)
    console.log('Linked to building:', buildingId, 'lot:', lotId)
  }

  const handleSoftDelete = (emailId: string) => {
    onSoftDelete?.(emailId)
    console.log('Soft deleted email:', emailId)
  }

  const handleBlacklist = (emailId: string, senderEmail: string, reason?: string) => {
    onBlacklist?.(emailId, senderEmail, reason)
    console.log('Blacklisted:', senderEmail, 'reason:', reason)
  }

  // Check if this email is a conversation parent or child
  const isConversationParent = email.is_parent && email.conversation_id
  const isConversationChild = email.conversation_id && !email.is_parent
  
  // Only show conversation thread if it's the parent email
  const conversationEmails = isConversationParent 
    ? getConversationEmails(email.conversation_id, allEmails)
    : null

  // For conversations, the header shows the parent email's subject (which is already the selected email)

  return (
    <div className="flex-1 flex flex-col h-full min-w-0 relative">
      {/* Zone 1: Email Header - Sticky */}
      <div className="sticky top-0 z-10 bg-white p-4 border-b flex-shrink-0 min-w-0 group/header shadow-sm">
        {/* 1. Ligne 1: Sujet à gauche, Boutons à droite */}
        <div className="flex items-start justify-between gap-4 mb-3 min-w-0">
          <h1 className="text-xl font-semibold truncate flex-1 min-w-0">{email.subject}</h1>
          
          {/* Actions */}
          <div className="flex gap-2 shrink-0" role="toolbar" aria-label="Actions email">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowReplyBox(!showReplyBox)}
              aria-label="Répondre à cet email"
              aria-expanded={showReplyBox}
              className="px-2 md:group-hover/header:px-3 transition-all"
            >
              <Reply className="h-4 w-4" aria-hidden="true" />
              <span className="hidden md:group-hover/header:inline md:group-hover/header:ml-1.5 whitespace-nowrap">Répondre</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              aria-label="Transférer cet email"
              className="px-2 md:group-hover/header:px-3 transition-all"
            >
              <Forward className="h-4 w-4" aria-hidden="true" />
              <span className="hidden md:group-hover/header:inline md:group-hover/header:ml-1.5 whitespace-nowrap">Transférer</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onDelete}
              aria-label="Supprimer cet email"
            >
              <Trash className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowProcessedDialog(true)}
              aria-label="Marquer comme traité"
              className="px-2 md:group-hover/header:px-3 transition-all"
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              <span className="hidden md:group-hover/header:inline md:group-hover/header:ml-1.5 whitespace-nowrap">Marquer comme traité</span>
            </Button>

            {/* More actions */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  aria-label="More email actions"
                >
                  <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowLinkDialog(true)}>
                  <BuildingIcon className="mr-2 h-4 w-4" aria-hidden="true" />
                  {email.building_id ? 'Changer le lien' : 'Lier à un immeuble'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowProcessedDialog(true)}>
                  <CheckCircle2 className="mr-2 h-4 w-4" aria-hidden="true" />
                  Marquer comme traité
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onCreateIntervention}>
                  <Wrench className="mr-2 h-4 w-4" aria-hidden="true" />
                  Créer une intervention
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowMarkDialog(true)}>
                  <Ban className="mr-2 h-4 w-4" aria-hidden="true" />
                  Marquer comme non pertinent
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* 2. Ligne 2: From, expéditeur, date et heure - Pleine largeur */}
        <div className="mb-3 min-w-0 w-full">
          <div className="flex items-center gap-2 text-sm text-muted-foreground flex-nowrap min-w-0">
            <span className="font-medium text-foreground shrink-0 hidden sm:inline">De:</span>
            <span className="min-w-0 truncate">{email.sender_name} ({email.sender_email})</span>
            <span className="shrink-0">•</span>
            <span className="shrink-0 whitespace-nowrap">
              <span className="sm:hidden">
                {format(new Date(email.received_at), 'dd/MM/yy', { locale: fr })}
              </span>
              <span className="hidden sm:inline">
                {format(new Date(email.received_at), 'PPp', { locale: fr })}
              </span>
            </span>
          </div>
        </div>

        {/* 3. Ligne 3: Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          {email.has_attachments && (
            <Badge variant="secondary" className="transition-all md:group-hover/header:px-2">
              <Paperclip className="h-3 w-3" />
              <span className="hidden md:group-hover/header:inline md:group-hover/header:ml-1.5 whitespace-nowrap">
                {email.attachments.length} pièce{email.attachments.length > 1 ? 's' : ''} jointe{email.attachments.length > 1 ? 's' : ''}
              </span>
              <span className="md:hidden">{email.attachments.length}</span>
            </Badge>
          )}
          {email.building_name && (
            <Badge variant="outline" className="transition-all md:group-hover/header:px-2">
              <BuildingIcon className="h-3 w-3" />
              <span className="hidden md:group-hover/header:inline md:group-hover/header:ml-1.5">{email.building_name}</span>
              {email.lot_name && (
                <span className="hidden md:group-hover/header:inline md:group-hover/header:ml-1">{` - ${email.lot_name}`}</span>
              )}
            </Badge>
          )}
          {email.labels.map((label) => (
            <Badge
              key={label}
              variant={label === 'Urgent' ? 'destructive' : 'outline'}
            >
              {label}
            </Badge>
          ))}
        </div>
      </div>

      {/* Zone 2: Contenu Central - Scrollable & Épuré */}
      <div className="flex-1 overflow-y-auto bg-slate-50 min-h-0">
        {isConversationParent && conversationEmails ? (
          // Display conversation thread
          <div className="max-w-4xl mx-auto px-8 py-6">
            <ConversationThread emails={conversationEmails} />
          </div>
        ) : (
          // Display single email content
          <div className="email-content-wrapper">
            {/* Email Content */}
            <div className="prose prose-slate max-w-none overflow-hidden">
              {hasHtmlContent ? (
                <div
                  className="break-words [&_.mb-4.pb-4.border-b:first-child]:hidden [&>div.mb-4.pb-4.border-b]:hidden"
                  dangerouslySetInnerHTML={{ __html: sanitizedBody }}
                />
              ) : (
                <pre className="whitespace-pre-wrap font-sans text-sm text-slate-700 leading-relaxed">
                  {textContent}
                </pre>
              )}
            </div>

            {/* Attachments */}
            {email.has_attachments && email.attachments.length > 0 && (
              <div className="mt-8 pt-6 border-t border-slate-300 px-4">
                <h3 className="text-sm font-semibold text-slate-900 mb-4">
                  📎 Pièces jointes ({email.attachments.length})
                </h3>
                <div className="space-y-3">
                  {email.attachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="flex items-center justify-between p-3 hover:bg-white/50 rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <Paperclip className="h-4 w-4 text-slate-500 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-900 truncate">
                            {attachment.filename}
                          </p>
                          <p className="text-xs text-slate-500">
                            {(attachment.file_size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="shrink-0"
                        aria-label={`Télécharger ${attachment.filename}`}
                      >
                        <Download className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reply Box (si ouvert) */}
            {showReplyBox && (
              <div className="mt-6">
                <div className="p-6 bg-white border border-slate-200 rounded-lg shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-slate-900">Reply to {email.sender_name}</h3>
                    <Badge variant="secondary">Draft</Badge>
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm text-slate-600">
                      <strong>To:</strong> {email.sender_email}
                    </div>
                    <div className="text-sm text-slate-600">
                      <strong>Subject:</strong> Re: {email.subject}
                    </div>
                  </div>

                  <Textarea
                    placeholder="Type your reply..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="min-h-[200px]"
                  />

                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      onClick={() => setShowReplyBox(false)}
                      aria-label="Cancel reply"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleReply}
                      disabled={!replyText.trim()}
                      aria-label="Send reply email"
                    >
                      Send Reply
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Zone 3: Internal Chat Panel - Sticky Bottom */}
      <InternalChatPanel
        emailId={email.id}
        currentUserId="current-user-id" // TODO: Get from auth context
        userRole="gestionnaire"
      />

      {/* Mark as Irrelevant Dialog */}
      <MarkAsIrrelevantDialog
        email={{
          id: email.id,
          sender_email: email.sender_email,
          sender_name: email.sender_name,
          subject: email.subject
        }}
        open={showMarkDialog}
        onOpenChange={setShowMarkDialog}
        onSoftDelete={handleSoftDelete}
        onBlacklist={handleBlacklist}
        onArchive={onArchive}
      />

      {/* Link to Building Dialog */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Lier à un immeuble</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <LinkToBuildingDropdown
              emailId={email.id}
              buildings={buildings}
              currentBuildingId={email.building_id}
              currentLotId={email.lot_id}
              onLink={(buildingId, lotId) => {
                handleLinkBuilding(buildingId, lotId)
                setShowLinkDialog(false)
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Mark as Processed Dialog */}
      <MarkAsProcessedDialog
        open={showProcessedDialog}
        onOpenChange={setShowProcessedDialog}
        onConfirm={() => {
          onMarkAsProcessed?.()
          onArchive?.() // Auto-archive when marked as processed
          toast.success(isConversationParent ? 'Conversation marked as processed and archived' : 'Email marked as processed and archived')
        }}
        isConversation={isConversationParent}
      />
    </div>
  )
}
