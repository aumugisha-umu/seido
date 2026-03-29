'use client'

import { useState, useTransition, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { getPriorityLabel, getTypeLabel } from '@/lib/intervention-utils'
import type { WhatsAppTriageItem } from '@/app/actions/whatsapp-triage-actions'
import { markWhatsAppAsHandled, rejectWhatsAppDemande } from '@/app/actions/whatsapp-triage-actions'
import { CHANNEL_CONFIG } from '@/components/operations/triage-shared'
import { useRealtimeOptional } from '@/contexts/realtime-context'
import { DetailPageHeader, type DetailPageHeaderBadge } from '@/components/ui/detail-page-header'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  MapPin,
  User,
  Clock,
  Wrench,
  Phone,
  CheckCircle,
  XCircle,
  Flame,
  ImageIcon,
  Bell,
  MoreVertical,
} from 'lucide-react'

// ============================================================================
// Types
// ============================================================================

interface TriageDetailClientProps {
  item: WhatsAppTriageItem
}

// ============================================================================
// Helpers
// ============================================================================

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ============================================================================
// Component
// ============================================================================

export function TriageDetailClient({ item }: TriageDetailClientProps) {
  const router = useRouter()
  const realtime = useRealtimeOptional()
  const [isPending, startTransition] = useTransition()
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const channelConfig = CHANNEL_CONFIG[item.channel]
  const ChannelIcon = channelConfig.icon
  const timeAgo = formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: fr })
  const displayName = item.callerName || item.callerPhone || 'Contact inconnu'
  const summary = item.problemSummary || item.description || item.title
  const interventionType = item.type && item.type !== 'demande_whatsapp' ? item.type : null
  const hasConversation = item.messages.length > 0 || !!item.transcript
  const documents = item.documents ?? []
  const hasMedia = documents.length > 0

  // Channel-specific accent color for card borders
  const accentBorderColor = {
    whatsapp: 'border-t-[#25D366]/60',
    phone: 'border-t-blue-400/60',
    sms: 'border-t-violet-400/60',
  }[item.channel]

  // ── Actions ──────────────────────────────────────────────────────

  const handleMarkHandled = useCallback(() => {
    startTransition(async () => {
      const result = await markWhatsAppAsHandled(item.id)
      if (result.success) {
        toast.success('Demande traitee')
        realtime?.broadcastInvalidation(['interventions'])
        router.push('/gestionnaire/operations?type=assistant_ia')
      } else {
        toast.error(result.error || 'Erreur')
      }
    })
  }, [item.id, realtime, router])

  const handleReject = useCallback(() => {
    startTransition(async () => {
      const result = await rejectWhatsAppDemande(item.id, rejectReason || undefined)
      if (result.success) {
        toast.success('Demande rejetee')
        realtime?.broadcastInvalidation(['interventions'])
        router.push('/gestionnaire/operations?type=assistant_ia')
      } else {
        toast.error(result.error || 'Erreur')
      }
    })
  }, [item.id, rejectReason, realtime, router])

  const handleConvertIntervention = useCallback(() => {
    router.push(`/gestionnaire/operations/interventions/modifier/${item.id}?focus=type`)
  }, [item.id, router])

  const handleConvertReminder = useCallback(() => {
    const params = new URLSearchParams()
    if (item.problemSummary) params.set('title', item.problemSummary.slice(0, 80))
    if (item.building_id) params.set('building_id', item.building_id)
    if (item.lot_id) params.set('lot_id', item.lot_id)
    const source = channelConfig.label
    const notes = `Source ${source} — ${displayName}${item.callerPhone ? ` (${item.callerPhone})` : ''}`
    params.set('notes', notes)
    router.push(`/gestionnaire/operations/nouveau-rappel?${params.toString()}`)
  }, [item, channelConfig.label, displayName, router])

  // ── Header badges ─────────────────────────────────────────────────

  const urgencyColors: Record<string, string> = {
    urgente: 'bg-red-100 text-red-800 border-red-200',
    haute: 'bg-orange-100 text-orange-800 border-orange-200',
    normale: 'bg-blue-100 text-blue-800 border-blue-200',
    basse: 'bg-gray-100 text-gray-800 border-gray-200',
  }

  const headerBadges: DetailPageHeaderBadge[] = [
    {
      label: channelConfig.label,
      icon: ChannelIcon,
      color: cn(channelConfig.bgColor, channelConfig.color),
    },
    ...(item.urgency ? [{
      label: getPriorityLabel(item.urgency),
      icon: Flame,
      color: urgencyColors[item.urgency] ?? 'bg-blue-100 text-blue-800 border-blue-200',
    }] : []),
    ...(interventionType ? [{
      label: getTypeLabel(interventionType),
      icon: Wrench,
      color: 'bg-gray-100 text-gray-800 border-gray-200',
    }] : []),
  ]

  // ── Render ───────────────────────────────────────────────────────

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Portal-based header — same pattern as intervention detail */}
      <DetailPageHeader
        onBack={() => router.push('/gestionnaire/operations?type=assistant_ia')}
        backButtonText="Retour"
        title={summary ? summary.slice(0, 80) : `Demande via ${channelConfig.label}`}
        badges={headerBadges}
        actionButtons={
          <TriageHeaderActions
            isPending={isPending}
            onConvertIntervention={handleConvertIntervention}
            onConvertReminder={handleConvertReminder}
            onMarkHandled={handleMarkHandled}
            onReject={() => setShowRejectForm(true)}
          />
        }
      />

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 space-y-6">

          {/* ─── Card 1: Informations extraites ──────────────────────── */}
          <Card className={cn('border-t-2', accentBorderColor)}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Informations extraites</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-x-6 gap-y-4">
                {/* Contact */}
                <div className="flex items-start gap-2.5">
                  <User className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Contact</p>
                    <p className="text-sm font-medium text-foreground">{displayName}</p>
                  </div>
                </div>

                {/* Phone */}
                <div className="flex items-start gap-2.5">
                  <Phone className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Telephone</p>
                    <p className="text-sm font-medium text-foreground font-mono">
                      {item.callerPhone ?? '—'}
                    </p>
                  </div>
                </div>

                {/* Received — relative time with exact date on hover */}
                <div className="flex items-start gap-2.5">
                  <Clock className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Recu</p>
                    <p
                      className="text-sm font-medium text-foreground"
                      title={formatDateTime(item.created_at)}
                    >
                      {timeAgo}
                    </p>
                  </div>
                </div>

                {/* Address — full width */}
                {item.address && (
                  <div className="col-span-3 flex items-start gap-2.5">
                    <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Adresse</p>
                      <p className="text-sm font-medium text-foreground">{item.address}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ─── Card 2: Photos / Media (compact) ────────────────────── */}
          {hasMedia && (
            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 mb-3">
                  <ImageIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Pieces jointes</span>
                  <Badge variant="secondary" className="text-xs">{documents.length}</Badge>
                </div>
                <div className="flex gap-2 overflow-x-auto">
                  {documents.map((doc) => (
                    <MediaThumbnail key={doc.id} document={doc} />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ─── Card 3: Conversation / Transcript ───────────────────── */}
          {hasConversation && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  {item.channel === 'phone' ? 'Transcription appel' : `Conversation ${channelConfig.label}`}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {item.channel === 'phone' && item.transcript ? (
                  <div className="bg-muted/50 rounded-lg p-4 max-h-[400px] overflow-y-auto">
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                      {item.transcript}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                    {item.messages.map((msg, i) => (
                      <div
                        key={i}
                        className={cn(
                          'flex flex-col',
                          msg.role === 'user' ? 'items-start' : 'items-end',
                        )}
                      >
                        <div
                          className={cn(
                            'max-w-[80%] rounded-2xl px-4 py-2.5',
                            msg.role === 'user'
                              ? 'bg-muted text-foreground rounded-bl-md'
                              : 'bg-primary/10 text-foreground rounded-br-md',
                          )}
                        >
                          <p className="text-xs font-medium mb-0.5 text-muted-foreground">
                            {msg.role === 'user' ? 'Locataire' : 'IA'}
                          </p>
                          <p className="text-sm leading-relaxed">{msg.content}</p>
                        </div>
                        {msg.timestamp && (
                          <span className="text-[11px] text-muted-foreground mt-1 px-1">
                            {new Date(msg.timestamp).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}{' '}
                            {new Date(msg.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* ─── Reject inline form ──────────────────────────────────── */}
          {showRejectForm && (
            <Card className="border-destructive/30">
              <CardContent className="pt-5 space-y-3">
                <p className="text-sm font-medium text-destructive">Rejeter cette demande ?</p>
                <Textarea
                  placeholder="Motif (optionnel)"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
                <div className="flex gap-2 justify-end">
                  <Button variant="ghost" size="sm" onClick={() => setShowRejectForm(false)}>
                    Annuler
                  </Button>
                  <Button variant="destructive" size="sm" disabled={isPending} onClick={handleReject}>
                    Confirmer le rejet
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ─── Bottom action buttons (mobile only) ─────────────────── */}
          <div className="sm:hidden flex flex-col gap-3 pb-6">
            <Button
              onClick={handleConvertIntervention}
              disabled={isPending}
              className="gap-2"
              data-testid="triage-convert-intervention"
            >
              <Wrench className="h-4 w-4" />
              Convertir en intervention
            </Button>
            <Button
              onClick={handleConvertReminder}
              disabled={isPending}
              variant="outline"
              className="gap-2"
            >
              <Bell className="h-4 w-4" />
              Creer un rappel
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 min-h-[44px] text-green-700 border-green-200 hover:bg-green-50 hover:border-green-300 gap-2"
                disabled={isPending}
                onClick={handleMarkHandled}
                data-testid="triage-mark-handled"
              >
                <CheckCircle className="h-4 w-4" />
                Traite
              </Button>
              <Button
                variant="outline"
                className="flex-1 min-h-[44px] text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 gap-2"
                disabled={isPending}
                onClick={() => setShowRejectForm(true)}
                data-testid="triage-reject"
              >
                <XCircle className="h-4 w-4" />
                Rejeter
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Header actions (desktop/tablet/mobile — same 3-breakpoint pattern as intervention)
// ============================================================================

interface TriageHeaderActionsProps {
  isPending: boolean
  onConvertIntervention: () => void
  onConvertReminder: () => void
  onMarkHandled: () => void
  onReject: () => void
}

function TriageHeaderActions({
  isPending,
  onConvertIntervention,
  onConvertReminder,
  onMarkHandled,
  onReject,
}: TriageHeaderActionsProps) {
  return (
    <>
      {/* Desktop (>=1024px) */}
      <div className="hidden lg:flex items-center gap-2">
        <Button
          variant="default"
          size="sm"
          onClick={onConvertIntervention}
          disabled={isPending}
          className="gap-1.5"
        >
          <Wrench className="h-3.5 w-3.5" />
          <span>Intervention</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onConvertReminder}
          disabled={isPending}
          className="gap-1.5"
        >
          <Bell className="h-3.5 w-3.5" />
          <span>Rappel</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onMarkHandled}
          disabled={isPending}
          className="gap-1.5 text-green-700 border-green-200 hover:bg-green-50"
        >
          <CheckCircle className="h-3.5 w-3.5" />
          <span>Traite</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onReject}
          disabled={isPending}
          className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50"
        >
          <XCircle className="h-3.5 w-3.5" />
          <span>Rejeter</span>
        </Button>
      </div>

      {/* Tablet (768-1023px) */}
      <div className="hidden md:flex lg:hidden items-center gap-2">
        <Button
          variant="default"
          size="sm"
          onClick={onConvertIntervention}
          disabled={isPending}
          className="gap-1.5"
        >
          <Wrench className="h-3.5 w-3.5" />
          <span>Intervention</span>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="h-9 w-9">
              <MoreVertical className="h-4 w-4" />
              <span className="sr-only">Plus d&apos;actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={onConvertReminder}>
              <Bell className="h-4 w-4 mr-2" />
              Creer un rappel
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onMarkHandled} className="text-green-700">
              <CheckCircle className="h-4 w-4 mr-2" />
              Marquer traite
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onReject} className="text-red-600">
              <XCircle className="h-4 w-4 mr-2" />
              Rejeter
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Mobile (<768px) */}
      <div className="md:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 min-h-[44px]">
              <MoreVertical className="h-4 w-4" />
              <span>Actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={onConvertIntervention}>
              <Wrench className="h-4 w-4 mr-2" />
              Convertir en intervention
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onConvertReminder}>
              <Bell className="h-4 w-4 mr-2" />
              Creer un rappel
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onMarkHandled} className="text-green-700">
              <CheckCircle className="h-4 w-4 mr-2" />
              Marquer traite
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onReject} className="text-red-600">
              <XCircle className="h-4 w-4 mr-2" />
              Rejeter
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  )
}

// ============================================================================
// Media thumbnail sub-component
// ============================================================================

interface MediaThumbnailProps {
  document: NonNullable<WhatsAppTriageItem['documents']>[number]
}

function MediaThumbnail({ document }: MediaThumbnailProps) {
  const [loading, setLoading] = useState(false)
  const isImage = document.mime_type?.startsWith('image/')

  const handleView = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/view-intervention-document?documentId=${document.id}`)
      const data = await res.json()
      if (data.viewUrl) {
        window.open(data.viewUrl, '_blank')
      } else {
        toast.error('Impossible de charger le fichier')
      }
    } catch {
      toast.error('Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleView}
      disabled={loading}
      className={cn(
        'relative w-16 h-16 shrink-0 rounded-lg border bg-muted/50 overflow-hidden',
        'hover:border-primary/40 hover:shadow-sm transition-all group',
        'flex items-center justify-center',
        loading && 'opacity-50',
      )}
    >
      {isImage ? (
        <ImageIcon className="h-6 w-6 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
      ) : (
        <ImageIcon className="h-5 w-5 text-muted-foreground" />
      )}
      <span className="absolute bottom-0 left-0 right-0 text-[11px] leading-tight text-muted-foreground truncate bg-background/80 px-1 py-0.5">
        {document.original_filename || document.filename}
      </span>
    </button>
  )
}
