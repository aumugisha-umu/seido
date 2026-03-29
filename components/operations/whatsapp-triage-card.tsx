'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Bot, Wrench, CheckCircle, XCircle, ChevronDown, ChevronUp, MapPin, MoreHorizontal, CalendarClock } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Textarea } from '@/components/ui/textarea'
import { getPriorityColor, getPriorityLabel } from '@/lib/intervention-utils'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { markWhatsAppAsHandled, rejectWhatsAppDemande, type WhatsAppTriageItem } from '@/app/actions/whatsapp-triage-actions'

// ============================================================================
// Props
// ============================================================================

interface WhatsAppTriageCardProps {
  item: WhatsAppTriageItem
  onRemoved: (id: string) => void
}

// ============================================================================
// Component
// ============================================================================

export function WhatsAppTriageCard({ item, onRemoved }: WhatsAppTriageCardProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showTranscript, setShowTranscript] = useState(false)
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const timeAgo = formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: fr })
  const displayName = item.callerName || item.callerPhone || 'Contact inconnu'
  const summary = item.problemSummary || item.title.replace('[WhatsApp] ', '')

  // ── Actions ──────────────────────────────────────────────────────

  const handleConvertIntervention = () => {
    router.push(`/gestionnaire/operations/interventions/modifier/${item.id}?focus=type`)
  }

  const handleConvertReminder = () => {
    const params = new URLSearchParams()
    if (item.problemSummary) params.set('title', item.problemSummary.slice(0, 80))
    if (item.building_id) params.set('building_id', item.building_id)
    if (item.lot_id) params.set('lot_id', item.lot_id)
    const notes = `Source WhatsApp — ${displayName}${item.callerPhone ? ` (${item.callerPhone})` : ''}`
    params.set('notes', notes)
    router.push(`/gestionnaire/operations/nouveau-rappel?${params.toString()}`)
  }

  const handleMarkHandled = () => {
    startTransition(async () => {
      const result = await markWhatsAppAsHandled(item.id)
      if (result.success) {
        onRemoved(item.id)
        toast.success('Marquee comme traitee')
      } else {
        toast.error(result.error || 'Erreur')
      }
    })
  }

  const handleReject = () => {
    startTransition(async () => {
      const result = await rejectWhatsAppDemande(item.id, rejectReason || undefined)
      if (result.success) {
        onRemoved(item.id)
        toast.success('Demande rejetee')
      } else {
        toast.error(result.error || 'Erreur')
        setShowRejectForm(false)
      }
    })
  }

  // ── Render ───────────────────────────────────────────────────────

  return (
    <Card className="border-l-2 border-l-emerald-500 transition-all">
      <CardContent className="p-4 space-y-3">
        {/* Header: caller + timestamp */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Bot className="h-4 w-4 text-emerald-600 shrink-0" />
            <div className="min-w-0">
              <p className="font-medium text-sm truncate">{displayName}</p>
              {item.callerPhone && item.callerName && (
                <p className="text-xs text-muted-foreground font-mono">{item.callerPhone}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-muted-foreground">{timeAgo}</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowTranscript(!showTranscript)}>
                  {showTranscript ? 'Masquer conversation' : 'Voir conversation'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Summary + metadata */}
        <p className="text-sm line-clamp-2">{summary}</p>

        {item.address && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{item.address}</span>
          </div>
        )}

        {item.urgency && item.urgency !== 'normale' && (
          <Badge variant="outline" className={getPriorityColor(item.urgency)}>
            {getPriorityLabel(item.urgency)}
          </Badge>
        )}

        {/* Expandable transcript */}
        {showTranscript && item.messages.length > 0 && (
          <div className="bg-muted/50 rounded-md p-3 max-h-[200px] overflow-y-auto space-y-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-muted-foreground">Conversation WhatsApp</span>
              <Button variant="ghost" size="sm" className="h-6 px-2" onClick={() => setShowTranscript(false)}>
                <ChevronUp className="h-3 w-3" />
              </Button>
            </div>
            {item.messages.map((msg, i) => (
              <div key={i} className="text-xs">
                <span className="font-medium">{msg.role === 'user' ? 'Locataire' : 'IA'}: </span>
                <span className="text-muted-foreground">{msg.content}</span>
              </div>
            ))}
          </div>
        )}

        {!showTranscript && item.messages.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-muted-foreground"
            onClick={() => setShowTranscript(true)}
          >
            <ChevronDown className="h-3 w-3 mr-1" />
            Voir conversation ({item.messages.length} messages)
          </Button>
        )}

        {/* Reject inline form */}
        {showRejectForm && (
          <div className="bg-destructive/5 border border-destructive/20 rounded-md p-3 space-y-2">
            <Textarea
              placeholder="Motif (optionnel)"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={2}
              className="resize-none text-sm"
            />
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowRejectForm(false)}>
                Annuler
              </Button>
              <Button variant="destructive" size="sm" disabled={isPending} onClick={handleReject}>
                Confirmer rejet
              </Button>
            </div>
          </div>
        )}

        {/* Action buttons (2x2 grid) */}
        {!showRejectForm && (
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Button size="sm" disabled={isPending} onClick={handleConvertIntervention}>
              <Wrench className="h-3.5 w-3.5 mr-1.5" />
              Intervention
            </Button>
            <Button variant="outline" size="sm" disabled={isPending} onClick={handleConvertReminder}>
              <CalendarClock className="h-3.5 w-3.5 mr-1.5" />
              Rappel
            </Button>
            <Button variant="outline" size="sm" disabled={isPending} onClick={handleMarkHandled}>
              <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
              Traite
            </Button>
            <Button variant="ghost" size="sm" className="text-destructive" disabled={isPending} onClick={() => setShowRejectForm(true)}>
              <XCircle className="h-3.5 w-3.5 mr-1.5" />
              Rejeter
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
