'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import {
  Reply,
  Forward,
  Trash,
  MoreHorizontal,
  Paperclip,
  Building,
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
import { DummyEmail, DummyBuilding, getConversationEmails } from './dummy-data'
import { MarkAsIrrelevantDialog } from './mark-irrelevant-dialog'
import { ConversationThread } from './conversation-thread'
import { LinkToBuildingDropdown } from './link-to-building-dropdown'
import { MarkAsProcessedDialog } from './mark-as-processed-dialog'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'

interface EmailDetailProps {
  email: DummyEmail
  buildings: DummyBuilding[]
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
      ALLOW_DATA_ATTR: false
    })
  }, [email.body_html])

  const handleReply = () => {
    if (replyText.trim()) {
      onReply?.(replyText)
      setReplyText('')
      setShowReplyBox(false)
      toast.success('Reply sent!')
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
    ? getConversationEmails(email.conversation_id)
    : null

  // For conversations, the header shows the parent email's subject (which is already the selected email)

  return (
    <div className="flex-1 flex flex-col h-full min-w-0">
      {/* Email Header - Fixed */}
      <div className="p-4 border-b flex-shrink-0 min-w-0 group/header">
        {/* 1. Ligne 1: Sujet à gauche, Boutons à droite */}
        <div className="flex items-start justify-between gap-4 mb-3 min-w-0">
          <h1 className="text-xl font-semibold truncate flex-1 min-w-0">{email.subject}</h1>
          
          {/* Actions */}
          <div className="flex gap-2 shrink-0" role="toolbar" aria-label="Email actions">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowReplyBox(!showReplyBox)}
              aria-label="Reply to this email"
              aria-expanded={showReplyBox}
              className="px-2 md:group-hover/header:px-3 transition-all"
            >
              <Reply className="h-4 w-4" aria-hidden="true" />
              <span className="hidden md:group-hover/header:inline md:group-hover/header:ml-1.5 whitespace-nowrap">Reply</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              aria-label="Forward this email"
              className="px-2 md:group-hover/header:px-3 transition-all"
            >
              <Forward className="h-4 w-4" aria-hidden="true" />
              <span className="hidden md:group-hover/header:inline md:group-hover/header:ml-1.5 whitespace-nowrap">Forward</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onDelete}
              aria-label="Delete this email"
            >
              <Trash className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowProcessedDialog(true)}
              aria-label="Mark as processed"
              className="px-2 md:group-hover/header:px-3 transition-all"
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              <span className="hidden md:group-hover/header:inline md:group-hover/header:ml-1.5 whitespace-nowrap">Mark as Processed</span>
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
                  <Building className="mr-2 h-4 w-4" aria-hidden="true" />
                  {email.building_id ? 'Change link' : 'Link to Building'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowProcessedDialog(true)}>
                  <CheckCircle2 className="mr-2 h-4 w-4" aria-hidden="true" />
                  Mark as Processed
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onCreateIntervention}>
                  <Wrench className="mr-2 h-4 w-4" aria-hidden="true" />
                  Create Intervention
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowMarkDialog(true)}>
                  <Ban className="mr-2 h-4 w-4" aria-hidden="true" />
                  Mark as irrelevant
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* 2. Ligne 2: From, expéditeur, date et heure - Pleine largeur */}
        <div className="mb-3 min-w-0 w-full">
          <div className="flex items-center gap-2 text-sm text-muted-foreground flex-nowrap min-w-0">
            <span className="font-medium text-foreground shrink-0 hidden sm:inline">From:</span>
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
                {email.attachments.length} attachment{email.attachments.length > 1 ? 's' : ''}
              </span>
              <span className="md:hidden">{email.attachments.length}</span>
            </Badge>
          )}
          {email.building_name && (
            <Badge variant="outline" className="transition-all md:group-hover/header:px-2">
              <Building className="h-3 w-3" />
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

      {/* Zone scrollable */}
      <ScrollArea className="flex-1 min-h-0 min-w-0">
        {isConversationParent && conversationEmails ? (
          // Display conversation thread
          <div className="p-6">
            <ConversationThread emails={conversationEmails} />
          </div>
        ) : (
          // Display single email content
          <div className="p-6">
            <Card className="border">
              <CardContent className="p-6">
                <div
                  className="w-full break-words [&_*]:max-w-full [&_*]:box-border [&_div]:block [&_div]:w-full [&_table]:w-full"
                  dangerouslySetInnerHTML={{ __html: sanitizedBody }}
                />

                {/* Attachments */}
                {email.has_attachments && email.attachments.length > 0 && (
                  <div className="mt-6 pt-6 border-t">
                    <h3 className="text-sm font-semibold mb-3">Attachments</h3>
                    <div className="space-y-2">
                      {email.attachments.map((attachment) => (
                        <div
                          key={attachment.id}
                          className="flex items-center justify-between p-2 border rounded hover:bg-muted/50"
                        >
                          <div className="flex items-center gap-2">
                            <Paperclip className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{attachment.filename}</span>
                            <span className="text-xs text-muted-foreground">
                              ({(attachment.file_size / 1024).toFixed(1)} KB)
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label={`Download ${attachment.filename}`}
                          >
                            <Download className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* 2. Reply Box (si ouvert) */}
        {showReplyBox && (
          <div className="px-6 pb-6">
            <div className="p-6 border rounded-lg bg-card space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Reply to {email.sender_name}</h3>
                <Badge variant="secondary">Private Draft</Badge>
              </div>

              <div>
                <div className="text-sm text-muted-foreground mb-2">
                  <strong>To:</strong> {email.sender_email}
                </div>
                <div className="text-sm text-muted-foreground mb-2">
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

        {/* 3. Separator */}
        <Separator />

        {/* 4. Internal Team Chat */}
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-semibold">
              💬 Internal Team Chat
            </h2>
            <Badge variant="secondary">Private</Badge>
          </div>

          <div className="p-6 border rounded-lg bg-card">
            <div className="text-center text-muted-foreground py-8">
              <p className="text-sm">Internal chat will be integrated here</p>
              <p className="text-xs mt-2">(Reuses existing ChatInterface component)</p>
            </div>
          </div>
        </div>
      </ScrollArea>

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
            <DialogTitle>Link to Building</DialogTitle>
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
