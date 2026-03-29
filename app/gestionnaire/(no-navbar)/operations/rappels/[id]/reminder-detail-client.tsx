'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { ReminderWithRelations, ReminderStatus, ReminderPriority } from '@/lib/types/reminder.types'
import { REMINDER_STATUS_LABELS, REMINDER_PRIORITY_LABELS } from '@/lib/types/reminder.types'
import {
  isReminderOverdue,
  getReminderLinkedEntity,
  getReminderAssigneeName,
} from '@/lib/utils/reminder-helpers'
import {
  startReminderAction,
  completeReminderAction,
  cancelReminderAction,
  updateReminderAction,
} from '@/app/actions/reminder-actions'
import { useRealtimeOptional } from '@/contexts/realtime-context'
import { toast } from 'sonner'
import { DetailPageHeader, type DetailPageHeaderBadge } from '@/components/ui/detail-page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Calendar,
  User,
  Building2,
  Home,
  AlertTriangle,
  RefreshCw,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  MoreVertical,
} from 'lucide-react'

// ============================================================================
// TYPES
// ============================================================================

interface ReminderDetailClientProps {
  reminder: ReminderWithRelations
  userId: string
  teamId: string
}

// ============================================================================
// STATUS / PRIORITY STYLING
// ============================================================================

const STATUS_BADGE_VARIANTS: Record<ReminderStatus, string> = {
  en_attente: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  en_cours: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  termine: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  annule: 'bg-muted text-muted-foreground',
}

const PRIORITY_BADGE_VARIANTS: Record<ReminderPriority, string> = {
  haute: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  normale: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  basse: 'bg-muted text-muted-foreground',
}

// ============================================================================
// HELPERS
// ============================================================================

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Non definie'
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Parse an RFC 5545 RRULE string into a French human-readable label */
function formatRecurrenceRule(rrule: string): string {
  const parts = Object.fromEntries(
    rrule.replace(/^RRULE:/i, '').split(';').map(p => {
      const [k, v] = p.split('=')
      return [k.toUpperCase(), v]
    })
  )
  const interval = parseInt(parts.INTERVAL ?? '1', 10)
  const freq = parts.FREQ?.toUpperCase()

  const labels: Record<string, string> = {
    DAILY: interval === 1 ? 'Tous les jours' : `Tous les ${interval} jours`,
    WEEKLY: interval === 1 ? 'Toutes les semaines' : `Toutes les ${interval} semaines`,
    MONTHLY: interval === 1 ? 'Tous les mois' : `Tous les ${interval} mois`,
    YEARLY: interval === 1 ? 'Tous les ans' : `Tous les ${interval} ans`,
  }
  return labels[freq ?? ''] ?? rrule
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ReminderDetailClient({ reminder }: ReminderDetailClientProps) {
  const router = useRouter()
  const realtime = useRealtimeOptional()
  const [isPending, startTransition] = useTransition()
  const [notes, setNotes] = useState(reminder.description ?? '')
  const [isSavingNotes, setIsSavingNotes] = useState(false)

  const overdue = isReminderOverdue(reminder)
  const status = reminder.status as ReminderStatus
  const priority = (reminder.priority ?? 'normale') as ReminderPriority
  const linkedEntity = getReminderLinkedEntity(reminder)
  const EntityIcon = linkedEntity
    ? { building: Building2, lot: Home, contact: User }[linkedEntity.type]
    : null
  const assigneeName = getReminderAssigneeName(reminder)
  const isEditable = status !== 'termine' && status !== 'annule'
  const hasNotesChanged = notes !== (reminder.description ?? '')

  // ------------------------------------------------------------------
  // Action handlers
  // ------------------------------------------------------------------

  const handleStatusAction = (
    action: (id: string) => Promise<{ success: boolean; error?: string }>,
    successMessage: string,
  ) => {
    startTransition(async () => {
      const result = await action(reminder.id)
      if (result.success) {
        toast.success(successMessage)
        realtime?.broadcastInvalidation(['reminders'])
        router.refresh()
      } else {
        toast.error(result.error ?? 'Une erreur est survenue')
      }
    })
  }

  const handleStart = () => handleStatusAction(startReminderAction, 'Rappel demarre')
  const handleComplete = () => handleStatusAction(completeReminderAction, 'Rappel termine')
  const handleCancel = () => handleStatusAction(cancelReminderAction, 'Rappel annule')

  const handleSaveNotes = async () => {
    setIsSavingNotes(true)
    try {
      const formData = new FormData()
      formData.append('description', notes)
      const result = await updateReminderAction(reminder.id, formData)
      if (result.success) {
        toast.success('Notes mises a jour')
        realtime?.broadcastInvalidation(['reminders'])
        router.refresh()
      } else {
        toast.error(result.error ?? 'Erreur lors de la sauvegarde')
      }
    } finally {
      setIsSavingNotes(false)
    }
  }

  // ------------------------------------------------------------------
  // Header badges
  // ------------------------------------------------------------------

  const headerBadges: DetailPageHeaderBadge[] = [
    {
      label: REMINDER_STATUS_LABELS[status],
      color: STATUS_BADGE_VARIANTS[status],
    },
    ...(priority !== 'normale' ? [{
      label: REMINDER_PRIORITY_LABELS[priority],
      color: PRIORITY_BADGE_VARIANTS[priority],
    }] : []),
    ...(overdue ? [{
      label: 'En retard',
      icon: AlertTriangle,
      color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    }] : []),
    ...(reminder.recurrence_rule ? [{
      label: 'Recurrent',
      icon: RefreshCw,
      color: 'bg-muted text-muted-foreground border-border',
    }] : []),
  ]

  const isActionable = status === 'en_attente' || status === 'en_cours'

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Portal-based header — same pattern as intervention & triage detail */}
      <DetailPageHeader
        onBack={() => router.push('/gestionnaire/operations?type=rappel')}
        backButtonText="Retour"
        title={reminder.title}
        badges={headerBadges}
        actionButtons={
          isActionable ? (
            <ReminderHeaderActions
              status={status}
              isPending={isPending}
              onStart={handleStart}
              onComplete={handleComplete}
              onCancel={handleCancel}
            />
          ) : undefined
        }
      />

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 space-y-6">

        {/* Details Card */}
        <Card className="border-t-2 border-t-amber-400/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Details du rappel</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              {/* Due date */}
              <div className="flex items-start gap-2.5">
                <Calendar className={`h-4 w-4 mt-0.5 shrink-0 ${overdue ? 'text-destructive' : 'text-muted-foreground'}`} />
                <div>
                  <p className="text-xs text-muted-foreground">Echeance</p>
                  <p className={`text-sm font-medium ${overdue ? 'text-destructive' : 'text-foreground'}`}>
                    {formatDate(reminder.due_date)}
                  </p>
                </div>
              </div>

              {/* Assignee */}
              <div className="flex items-start gap-2.5">
                <User className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Assigne a</p>
                  <p className="text-sm font-medium text-foreground">
                    {assigneeName ?? 'Non assigne'}
                  </p>
                </div>
              </div>

              {/* Recurrence */}
              {reminder.recurrence_rule && (
                <div className="flex items-start gap-2.5">
                  <RefreshCw className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Recurrence</p>
                    <p className="text-sm font-medium text-foreground">
                      {formatRecurrenceRule(reminder.recurrence_rule.rrule)}
                    </p>
                  </div>
                </div>
              )}

              {/* Linked entity */}
              {linkedEntity && EntityIcon && (
                <div className="flex items-start gap-2.5">
                  <EntityIcon className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Bien lie</p>
                    <p className="text-sm font-medium text-foreground">
                      {linkedEntity.label}
                    </p>
                  </div>
                </div>
              )}

              {/* Created info */}
              <div className="flex items-start gap-2.5">
                <Clock className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Cree le</p>
                  <p className="text-sm font-medium text-foreground">
                    {formatDateTime(reminder.created_at)}
                    {reminder.created_by_user && (
                      <span className="text-muted-foreground font-normal">
                        {' '}par {reminder.created_by_user.name}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Completed info */}
              {reminder.completed_at && (
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-green-600" />
                  <div>
                    <p className="text-xs text-muted-foreground">Termine le</p>
                    <p className="text-sm font-medium text-foreground">
                      {formatDateTime(reminder.completed_at)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Notes Section */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" />
              Notes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isEditable ? (
              <>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ajouter des notes..."
                  rows={4}
                  className="resize-none"
                />
                {hasNotesChanged && (
                  <div className="flex justify-end">
                    <Button
                      onClick={handleSaveNotes}
                      disabled={isSavingNotes}
                      size="sm"
                    >
                      {isSavingNotes ? 'Enregistrement...' : 'Enregistrer'}
                    </Button>
                  </div>
                )}
              </>
            ) : notes ? (
              <p className="text-sm text-foreground whitespace-pre-wrap">{notes}</p>
            ) : (
              <p className="text-sm text-muted-foreground italic">Aucune note</p>
            )}
          </CardContent>
        </Card>

        {/* Activity Section (placeholder) */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Historique</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              L&apos;historique des modifications sera disponible prochainement.
            </p>
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Header actions (desktop/tablet/mobile — same 3-breakpoint pattern)
// ============================================================================

interface ReminderHeaderActionsProps {
  status: ReminderStatus
  isPending: boolean
  onStart: () => void
  onComplete: () => void
  onCancel: () => void
}

function ReminderHeaderActions({
  status,
  isPending,
  onStart,
  onComplete,
  onCancel,
}: ReminderHeaderActionsProps) {
  const primaryAction = status === 'en_attente'
    ? { label: 'Commencer', icon: Play, onClick: onStart }
    : { label: 'Terminer', icon: CheckCircle2, onClick: onComplete }

  return (
    <>
      {/* Desktop (>=1024px) */}
      <div className="hidden lg:flex items-center gap-2">
        <Button
          variant="default"
          size="sm"
          onClick={primaryAction.onClick}
          disabled={isPending}
          className="gap-1.5"
        >
          <primaryAction.icon className="h-3.5 w-3.5" />
          <span>{primaryAction.label}</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={isPending}
          className="gap-1.5 text-destructive hover:text-destructive"
        >
          <XCircle className="h-3.5 w-3.5" />
          <span>Annuler</span>
        </Button>
      </div>

      {/* Tablet (768-1023px) */}
      <div className="hidden md:flex lg:hidden items-center gap-2">
        <Button
          variant="default"
          size="sm"
          onClick={primaryAction.onClick}
          disabled={isPending}
          className="gap-1.5"
        >
          <primaryAction.icon className="h-3.5 w-3.5" />
          <span>{primaryAction.label}</span>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="h-9 w-9">
              <MoreVertical className="h-4 w-4" />
              <span className="sr-only">Plus d&apos;actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              onClick={onCancel}
              className="text-red-600 focus:text-red-600 focus:bg-red-50"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Annuler le rappel
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
            <DropdownMenuItem onClick={primaryAction.onClick}>
              <primaryAction.icon className="h-4 w-4 mr-2" />
              {primaryAction.label}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onCancel}
              className="text-red-600 focus:text-red-600 focus:bg-red-50"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Annuler le rappel
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  )
}
