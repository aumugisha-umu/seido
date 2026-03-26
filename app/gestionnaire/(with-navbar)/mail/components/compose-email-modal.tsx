'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Loader2, Send, X } from 'lucide-react'
import { toast } from 'sonner'
import {
  UnifiedModal,
  UnifiedModalHeader,
  UnifiedModalBody,
  UnifiedModalFooter
} from '@/components/ui/unified-modal'
import { EmailClientService } from '@/lib/services/client/email-client.service'
import { EmailConnection } from './mailbox-sidebar'

function MultiAddressField({
  label,
  placeholder,
  addresses,
  onAddressesChange,
}: {
  label: string
  placeholder: string
  addresses: string[]
  onAddressesChange: (addresses: string[]) => void
}) {
  const [input, setInput] = useState('')

  const handleAdd = useCallback((value: string) => {
    const parsed = value.split(/[,;\s]+/).map(a => a.trim()).filter(a => a.includes('@'))
    const newAddresses = parsed.filter(a => !addresses.includes(a))
    if (newAddresses.length > 0) {
      onAddressesChange([...addresses, ...newAddresses])
    }
    setInput('')
  }, [addresses, onAddressesChange])

  const handleRemove = useCallback((address: string) => {
    onAddressesChange(addresses.filter(a => a !== address))
  }, [addresses, onAddressesChange])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      if (input.trim()) {
        handleAdd(input)
      }
    }
  }, [input, handleAdd])

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <div className="flex items-center gap-2 flex-wrap">
        {addresses.map(addr => (
          <Badge key={addr} variant="secondary" className="text-xs gap-1">
            {addr}
            <button
              type="button"
              onClick={() => handleRemove(addr)}
              className="hover:text-destructive"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <Input
          type="email"
          placeholder={placeholder}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => { if (input.trim()) handleAdd(input) }}
          className="h-8 text-sm flex-1 min-w-[150px] border-dashed"
        />
      </div>
    </div>
  )
}

interface ComposeEmailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  emailConnections: EmailConnection[]
  onEmailSent?: (emailId: string) => void
}

export function ComposeEmailModal({
  open,
  onOpenChange,
  emailConnections,
  onEmailSent
}: ComposeEmailModalProps) {
  const [connectionId, setConnectionId] = useState('')
  const [to, setTo] = useState('')
  const [ccAddresses, setCcAddresses] = useState<string[]>([])
  const [bccAddresses, setBccAddresses] = useState<string[]>([])
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [isSending, setIsSending] = useState(false)
  const toInputRef = useRef<HTMLInputElement>(null)

  const activeConnections = emailConnections.filter(c => c.is_active)

  // Reset form when modal opens
  useEffect(() => {
    if (!open) return

    setTo('')
    setSubject('')
    setBody('')
    setCcAddresses([])
    setBccAddresses([])
    setIsSending(false)

    if (activeConnections.length === 1) {
      setConnectionId(activeConnections[0].id)
    } else {
      setConnectionId('')
    }

    setTimeout(() => toInputRef.current?.focus(), 50)
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const isValid = connectionId && to.trim() && subject.trim() && body.trim()

  const handleSend = useCallback(async () => {
    if (!isValid) return

    setIsSending(true)
    try {
      const result = await EmailClientService.sendEmail({
        emailConnectionId: connectionId,
        to: to.trim(),
        cc: ccAddresses.length > 0 ? ccAddresses : undefined,
        bcc: bccAddresses.length > 0 ? bccAddresses : undefined,
        subject: subject.trim(),
        body: body.trim(),
      })

      toast.success('Email envoyé !')
      onOpenChange(false)

      if (result.emailId) {
        onEmailSent?.(result.emailId)
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur lors de l\'envoi'
      toast.error(message)
    } finally {
      setIsSending(false)
    }
  }, [isValid, connectionId, to, ccAddresses, bccAddresses, subject, body, onOpenChange, onEmailSent])

  const title = 'Nouvel email'

  return (
    <UnifiedModal open={open} onOpenChange={onOpenChange} size="lg">
      <UnifiedModalHeader
        title={title}
        icon={<Send className="h-5 w-5" />}
      />

      <UnifiedModalBody className="space-y-4">
        {/* De + À on the same line */}
        <div className="flex gap-4 items-end">
          {/* De (From) */}
          <div className="w-2/5 space-y-1.5">
            <label className="text-sm font-medium text-foreground">De</label>
            {activeConnections.length > 1 ? (
              <Select value={connectionId} onValueChange={setConnectionId}>
                <SelectTrigger className="w-full bg-white">
                  <SelectValue placeholder="Boîte mail..." />
                </SelectTrigger>
                <SelectContent className="z-[10000]">
                  {activeConnections.map(conn => (
                    <SelectItem key={conn.id} value={conn.id}>
                      <span className="flex items-center gap-2">
                        {conn.email_address}
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {conn.provider}
                        </Badge>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : activeConnections.length === 1 ? (
              <div className="h-9 flex items-center text-sm text-muted-foreground truncate">
                {activeConnections[0].email_address}
              </div>
            ) : (
              <div className="text-sm text-destructive">
                Aucune connexion active
              </div>
            )}
          </div>

          {/* À (To) */}
          <div className="flex-1 space-y-1.5">
            <label className="text-sm font-medium text-foreground">À</label>
            <Input
              ref={toInputRef}
              type="email"
              placeholder="destinataire@example.com"
              value={to}
              onChange={e => setTo(e.target.value)}
            />
          </div>
        </div>

        {/* CC field */}
        <MultiAddressField
          label="Cc"
          placeholder="Ajouter un Cc..."
          addresses={ccAddresses}
          onAddressesChange={setCcAddresses}
        />

        {/* BCC field */}
        <MultiAddressField
          label="Cci"
          placeholder="Ajouter un Cci..."
          addresses={bccAddresses}
          onAddressesChange={setBccAddresses}
        />

        {/* Subject field */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Objet</label>
          <Input
            placeholder="Objet du message"
            value={subject}
            onChange={e => setSubject(e.target.value)}
          />
        </div>

        {/* Body */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Message</label>
          <Textarea
            placeholder="Rédigez votre message..."
            value={body}
            onChange={e => setBody(e.target.value)}
            className="min-h-[200px]"
          />
        </div>
      </UnifiedModalBody>

      <UnifiedModalFooter>
        <Button
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={isSending}
        >
          Annuler
        </Button>
        <Button
          onClick={handleSend}
          disabled={!isValid || isSending || activeConnections.length === 0}
        >
          {isSending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Envoi en cours...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Envoyer
            </>
          )}
        </Button>
      </UnifiedModalFooter>
    </UnifiedModal>
  )
}
