'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
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
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeft,
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
  // Render
  // ------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-2xl px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/gestionnaire/operations?type=rappel"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Retour aux rappels</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 space-y-6">
        {/* Title + Status + Actions */}
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <h1 className="text-xl font-semibold text-foreground sm:text-2xl">
                {reminder.title}
              </h1>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={STATUS_BADGE_VARIANTS[status]}>
                  {REMINDER_STATUS_LABELS[status]}
                </Badge>
                <Badge className={PRIORITY_BADGE_VARIANTS[priority]}>
                  {REMINDER_PRIORITY_LABELS[priority]}
                </Badge>
                {overdue && (
                  <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                    <AlertTriangle className="mr-1 h-3 w-3" />
                    En retard
                  </Badge>
                )}
                {reminder.recurrence_rule && (
                  <Badge variant="outline" className="gap-1">
                    <RefreshCw className="h-3 w-3" />
                    Recurrent
                  </Badge>
                )}
              </div>
            </div>

            {/* Action buttons */}
            {(status === 'en_attente' || status === 'en_cours') && (
              <div className="flex items-center gap-2 shrink-0">
                {status === 'en_attente' && (
                  <Button
                    onClick={handleStart}
                    disabled={isPending}
                    size="sm"
                    className="gap-1.5"
                  >
                    <Play className="h-4 w-4" />
                    Commencer
                  </Button>
                )}
                {status === 'en_cours' && (
                  <Button
                    onClick={handleComplete}
                    disabled={isPending}
                    size="sm"
                    className="gap-1.5"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Terminer
                  </Button>
                )}
                <Button
                  onClick={handleCancel}
                  disabled={isPending}
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-destructive hover:text-destructive"
                >
                  <XCircle className="h-4 w-4" />
                  Annuler
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Details Card */}
        <Card className="border-t-2 border-t-amber-400/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Details du rappel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Due date */}
            <div className="flex items-start gap-3">
              <Calendar className={`h-4 w-4 mt-0.5 shrink-0 ${overdue ? 'text-destructive' : 'text-muted-foreground'}`} />
              <div>
                <p className="text-sm text-muted-foreground">Echeance</p>
                <p className={`text-sm font-medium ${overdue ? 'text-destructive' : 'text-foreground'}`}>
                  {formatDate(reminder.due_date)}
                </p>
              </div>
            </div>

            <Separator />

            {/* Assignee */}
            <div className="flex items-start gap-3">
              <User className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Assigne a</p>
                <p className="text-sm font-medium text-foreground">
                  {assigneeName ?? 'Non assigne'}
                </p>
              </div>
            </div>

            {/* Linked entity */}
            {linkedEntity && EntityIcon && (
              <>
                <Separator />
                <div className="flex items-start gap-3">
                  <EntityIcon className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Bien lie</p>
                    <p className="text-sm font-medium text-foreground">
                      {linkedEntity.label}
                    </p>
                  </div>
                </div>
              </>
            )}

            <Separator />

            {/* Created info */}
            <div className="flex items-start gap-3">
              <Clock className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Cree le</p>
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

            {reminder.completed_at && (
              <>
                <Separator />
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-green-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Termine le</p>
                    <p className="text-sm font-medium text-foreground">
                      {formatDateTime(reminder.completed_at)}
                    </p>
                  </div>
                </div>
              </>
            )}
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
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ajouter des notes..."
              rows={4}
              className="resize-none"
              disabled={status === 'termine' || status === 'annule'}
            />
            {hasNotesChanged && status !== 'termine' && status !== 'annule' && (
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
  )
}
