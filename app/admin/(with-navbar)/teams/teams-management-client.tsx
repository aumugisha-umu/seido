'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Search, Clock, Loader2, Plus, Send, Mail, MoreHorizontal, RefreshCw, Trash2, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { DatePicker, formatLocalDate } from '@/components/ui/date-picker'
import {
  extendTeamTrialAction,
  changeSubscriptionStatusAction,
  deleteTeamAction,
} from '@/app/actions/admin-team-actions'
import type { AdminTeam, AdminSettableStatus } from '@/app/actions/admin-team-actions'

const ADMIN_SETTABLE_STATUSES: AdminSettableStatus[] = ['trialing', 'active', 'canceled', 'paused', 'free_tier']
import { inviteGestionnaireAction, resendGestionnaireInvitationAction } from '@/app/actions/user-admin-actions'
import type { AdminInvitation } from '@/app/actions/user-admin-actions'

// ---------------------------------------------------------------------------
// Status labels for change dialog
// ---------------------------------------------------------------------------

const statusLabels: Record<string, string> = {
  trialing: 'En essai (30 jours)',
  active: 'Actif',
  canceled: 'Annule',
  paused: 'En pause',
  free_tier: 'Gratuit',
}

// ---------------------------------------------------------------------------
// Status badge helper
// ---------------------------------------------------------------------------

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string }> = {
  trialing: { label: 'Essai', variant: 'outline', className: 'border-amber-300 text-amber-700 bg-amber-50' },
  active: { label: 'Actif', variant: 'default', className: 'bg-green-100 text-green-800 border-green-200' },
  past_due: { label: 'Impaye', variant: 'destructive' },
  canceled: { label: 'Annule', variant: 'secondary' },
  incomplete: { label: 'Incomplet', variant: 'secondary' },
  paused: { label: 'Pause', variant: 'outline' },
  free_tier: { label: 'Gratuit', variant: 'outline', className: 'border-slate-300 text-slate-600 bg-slate-50' },
}

const StatusBadge = ({ status }: { status: string | null }) => {
  if (!status) return <Badge variant="secondary">Aucun</Badge>
  const config = statusConfig[status] || { label: status, variant: 'secondary' as const }
  return (
    <Badge variant={config.variant} className={config.className}>
      {config.label}
    </Badge>
  )
}

// ---------------------------------------------------------------------------
// Days left helper
// ---------------------------------------------------------------------------

const getDaysLeft = (trialEnd: string | null): number | null => {
  if (!trialEnd) return null
  return Math.max(0, Math.ceil((new Date(trialEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
}

const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

// ---------------------------------------------------------------------------
// Invitation status badge
// ---------------------------------------------------------------------------

const invitationStatusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string }> = {
  pending: { label: 'En attente', variant: 'outline', className: 'border-blue-300 text-blue-700 bg-blue-50' },
  expired: { label: 'Expiree', variant: 'destructive' },
}

const InvitationStatusBadge = ({ status }: { status: string }) => {
  const config = invitationStatusConfig[status] || { label: status, variant: 'secondary' as const }
  return (
    <Badge variant={config.variant} className={config.className}>
      {config.label}
    </Badge>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface TeamsManagementClientProps {
  initialTeams: AdminTeam[]
  initialInvitations: AdminInvitation[]
}

export function TeamsManagementClient({ initialTeams, initialInvitations }: TeamsManagementClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('filter') || 'all')

  // Extend dialog state
  const [extendTeam, setExtendTeam] = useState<AdminTeam | null>(null)
  const [newTrialEnd, setNewTrialEnd] = useState('')
  const [reason, setReason] = useState('')
  const [isExtending, setIsExtending] = useState(false)

  // Invite dialog state
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [inviteData, setInviteData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    organization: '',
  })

  // Status change dialog state
  const [statusTeam, setStatusTeam] = useState<AdminTeam | null>(null)
  const [newStatus, setNewStatus] = useState<AdminSettableStatus | ''>('')
  const [isChangingStatus, setIsChangingStatus] = useState(false)

  // Delete dialog state
  const [deleteTeam, setDeleteTeam] = useState<AdminTeam | null>(null)
  const [deleteConfirmName, setDeleteConfirmName] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  // Resend invitation state
  const [resendingEmail, setResendingEmail] = useState<string | null>(null)
  const [resendConfirm, setResendConfirm] = useState<AdminInvitation | null>(null)

  // Auto-open dialog from URL param (?extend=teamId)
  useEffect(() => {
    const extendId = searchParams.get('extend')
    if (extendId) {
      const team = initialTeams.find(t => t.id === extendId)
      if (team) {
        handleOpenExtendDialog(team)
      }
    }
  }, [searchParams, initialTeams]) // eslint-disable-line react-hooks/exhaustive-deps

  // Filter teams
  const filteredTeams = useMemo(() => {
    let teams = initialTeams

    // Status filter
    if (statusFilter !== 'all') {
      teams = teams.filter(t => t.subscription_status === statusFilter)
    }

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase()
      teams = teams.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.admin_name?.toLowerCase().includes(q) ||
        t.admin_email?.toLowerCase().includes(q)
      )
    }

    return teams
  }, [initialTeams, statusFilter, search])

  // ---------------------------------------------------------------------------
  // Extension dialog
  // ---------------------------------------------------------------------------

  const handleOpenExtendDialog = (team: AdminTeam) => {
    setExtendTeam(team)
    setNewTrialEnd('')
    setReason('')
  }

  const handlePresetDays = (days: number) => {
    if (!extendTeam?.trial_end) return
    const currentEnd = new Date(extendTeam.trial_end)
    const newDate = new Date(currentEnd.getTime() + days * 24 * 60 * 60 * 1000)
    setNewTrialEnd(formatLocalDate(newDate))
  }

  const handleExtendTrial = async () => {
    if (!extendTeam || !newTrialEnd) return

    setIsExtending(true)
    try {
      const result = await extendTeamTrialAction(
        extendTeam.id,
        newTrialEnd,
        reason.trim() || undefined
      )

      if (result.success) {
        toast.success(`Essai prolonge pour ${extendTeam.name}`)
        setExtendTeam(null)
        router.refresh()
      } else {
        toast.error(result.error || 'Erreur lors de la prolongation')
      }
    } catch {
      toast.error('Erreur inattendue')
    } finally {
      setIsExtending(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Invite handler
  // ---------------------------------------------------------------------------

  const handleInviteGestionnaire = async () => {
    if (!inviteData.email || !inviteData.firstName || !inviteData.lastName || !inviteData.organization) {
      toast.error('Tous les champs sont requis')
      return
    }

    setIsSubmitting(true)
    try {
      const result = await inviteGestionnaireAction(inviteData)
      if (result.success) {
        setIsInviteDialogOpen(false)
        setInviteData({ email: '', firstName: '', lastName: '', organization: '' })
        toast.success(`Invitation envoyee a ${inviteData.firstName} ${inviteData.lastName}`)
        router.refresh()
      } else {
        toast.error(result.error || "Impossible d'envoyer l'invitation")
      }
    } catch {
      toast.error('Une erreur est survenue')
    } finally {
      setIsSubmitting(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Resend invitation handler
  // ---------------------------------------------------------------------------

  const handleResendInvitation = async () => {
    if (!resendConfirm) return
    const { email, first_name } = resendConfirm
    setResendingEmail(email)
    setResendConfirm(null)
    try {
      const result = await resendGestionnaireInvitationAction(email)
      if (result.success) {
        toast.success(`Invitation relancee pour ${first_name || email}`)
        router.refresh()
      } else {
        toast.error(result.error || 'Erreur lors de la relance')
      }
    } catch {
      toast.error('Erreur inattendue')
    } finally {
      setResendingEmail(null)
    }
  }

  // ---------------------------------------------------------------------------
  // Change status handler
  // ---------------------------------------------------------------------------

  const handleChangeStatus = async () => {
    if (!statusTeam || !newStatus) return

    setIsChangingStatus(true)
    try {
      const result = await changeSubscriptionStatusAction(
        statusTeam.id,
        newStatus as AdminSettableStatus
      )
      if (result.success) {
        toast.success(`Statut modifie pour ${statusTeam.name}`)
        setStatusTeam(null)
        setNewStatus('')
        router.refresh()
      } else {
        toast.error(result.error || 'Erreur lors du changement de statut')
      }
    } catch {
      toast.error('Erreur inattendue')
    } finally {
      setIsChangingStatus(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Delete team handler
  // ---------------------------------------------------------------------------

  const handleDeleteTeam = async () => {
    if (!deleteTeam) return

    setIsDeleting(true)
    try {
      const result = await deleteTeamAction(deleteTeam.id, deleteConfirmName)
      if (result.success) {
        const authCount = result.data?.deletedAuthUsers || 0
        toast.success(
          `Equipe "${deleteTeam.name}" supprimee. ${authCount} compte(s) supprime(s).`
        )
        setDeleteTeam(null)
        setDeleteConfirmName('')
        router.refresh()
      } else {
        toast.error(result.error || 'Erreur lors de la suppression')
      }
    } catch {
      toast.error('Erreur inattendue')
    } finally {
      setIsDeleting(false)
    }
  }

  // Preview computed values
  const previewDaysAdded = useMemo(() => {
    if (!extendTeam?.trial_end || !newTrialEnd) return null
    const oldEnd = new Date(extendTeam.trial_end)
    const newEnd = new Date(newTrialEnd)
    return Math.round((newEnd.getTime() - oldEnd.getTime()) / (1000 * 60 * 60 * 24))
  }, [extendTeam, newTrialEnd])

  const tomorrow = formatLocalDate(new Date(Date.now() + 24 * 60 * 60 * 1000))

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom d'equipe ou gestionnaire..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => setIsInviteDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Ajouter equipe
        </Button>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filtrer par statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="trialing">En essai</SelectItem>
            <SelectItem value="active">Actif</SelectItem>
            <SelectItem value="canceled">Annule</SelectItem>
            <SelectItem value="past_due">Impaye</SelectItem>
            <SelectItem value="paused">En pause</SelectItem>
            <SelectItem value="free_tier">Gratuit</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Equipe</TableHead>
              <TableHead>Gestionnaire</TableHead>
              <TableHead className="text-center">Membres</TableHead>
              <TableHead className="text-center">Lots</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Fin d&apos;essai</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTeams.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  {search || statusFilter !== 'all'
                    ? 'Aucune equipe ne correspond aux filtres'
                    : 'Aucune equipe'
                  }
                </TableCell>
              </TableRow>
            ) : (
              filteredTeams.map(team => {
                const daysLeft = getDaysLeft(team.trial_end)
                const isTrial = team.subscription_status === 'trialing'

                return (
                  <TableRow key={team.id}>
                    <TableCell className="font-medium">{team.name}</TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm">{team.admin_name || '—'}</p>
                        {team.admin_email && (
                          <p className="text-xs text-muted-foreground">{team.admin_email}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{team.member_count}</TableCell>
                    <TableCell className="text-center">{team.lot_count}</TableCell>
                    <TableCell>
                      <StatusBadge status={team.subscription_status} />
                    </TableCell>
                    <TableCell>
                      {isTrial && team.trial_end ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{formatDate(team.trial_end)}</span>
                          {daysLeft !== null && (
                            <Badge
                              variant={daysLeft <= 7 ? 'destructive' : daysLeft <= 14 ? 'outline' : 'secondary'}
                              className={daysLeft <= 7 ? '' : daysLeft <= 14 ? 'border-amber-300 text-amber-700' : ''}
                            >
                              {daysLeft}j
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {isTrial && (
                            <DropdownMenuItem onClick={() => handleOpenExtendDialog(team)}>
                              <Clock className="h-4 w-4 mr-2" />
                              Etendre l&apos;essai
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => {
                            setStatusTeam(team)
                            setNewStatus('')
                          }}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Changer le statut
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              setDeleteTeam(team)
                              setDeleteConfirmName('')
                            }}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Supprimer l&apos;equipe
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Invitations Section */}
      {initialInvitations.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-4">
            <Mail className="h-5 w-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-slate-900">
              Invitations en attente
            </h2>
            <Badge variant="secondary" className="ml-1">
              {initialInvitations.length}
            </Badge>
          </div>

          <div className="bg-white rounded-lg border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Invite le</TableHead>
                  <TableHead>Expire le</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {initialInvitations.map(inv => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">
                      {inv.first_name && inv.last_name
                        ? `${inv.first_name} ${inv.last_name}`
                        : inv.first_name || '—'
                      }
                      {inv.team_name && (
                        <p className="text-xs text-muted-foreground">{inv.team_name}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{inv.email}</TableCell>
                    <TableCell>
                      <InvitationStatusBadge status={inv.status} />
                    </TableCell>
                    <TableCell className="text-sm">{formatDate(inv.invited_at)}</TableCell>
                    <TableCell className="text-sm">
                      <span className={inv.status === 'expired' ? 'text-red-600 font-medium' : ''}>
                        {formatDate(inv.expires_at)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setResendConfirm(inv)}
                        disabled={resendingEmail === inv.email}
                        className="gap-1"
                      >
                        {resendingEmail === inv.email ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Send className="h-3 w-3" />
                        )}
                        Relancer
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Extend Trial Dialog */}
      <Dialog open={!!extendTeam} onOpenChange={(open) => !open && setExtendTeam(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Etendre l&apos;essai</DialogTitle>
            <DialogDescription>
              {extendTeam?.name}
            </DialogDescription>
          </DialogHeader>

          {extendTeam && (
            <div className="space-y-5">
              {/* Current trial info */}
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-sm text-muted-foreground">Trial actuel</p>
                <p className="text-sm font-medium">
                  Expire le {formatDate(extendTeam.trial_end)}
                  {getDaysLeft(extendTeam.trial_end) !== null && (
                    <span className="text-muted-foreground"> (dans {getDaysLeft(extendTeam.trial_end)}j)</span>
                  )}
                </p>
              </div>

              {/* Preset buttons */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Prolonger de</Label>
                <div className="flex gap-2">
                  {[7, 14, 30].map(days => (
                    <Button
                      key={days}
                      variant="outline"
                      size="sm"
                      onClick={() => handlePresetDays(days)}
                      className={
                        previewDaysAdded === days
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : ''
                      }
                    >
                      +{days} jours
                    </Button>
                  ))}
                </div>
              </div>

              {/* Custom date picker */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Ou choisir une date</Label>
                <DatePicker
                  value={newTrialEnd}
                  onChange={setNewTrialEnd}
                  minDate={tomorrow}
                  placeholder="Nouvelle date de fin"
                />
              </div>

              {/* Preview */}
              {newTrialEnd && previewDaysAdded !== null && previewDaysAdded > 0 && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800">
                    Nouvelle date : <strong>{formatDate(newTrialEnd)}</strong>
                    {' '}(+{previewDaysAdded} jours)
                  </p>
                </div>
              )}

              {/* Reason (optional) */}
              <div>
                <Label htmlFor="reason" className="text-sm font-medium mb-2 block">
                  Raison <span className="text-muted-foreground font-normal">(optionnel)</span>
                </Label>
                <Textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ex: Onboarding en cours, prospect strategique..."
                  maxLength={200}
                  className="resize-none"
                  rows={2}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setExtendTeam(null)}
              disabled={isExtending}
            >
              Annuler
            </Button>
            <Button
              onClick={handleExtendTrial}
              disabled={isExtending || !newTrialEnd || !previewDaysAdded || previewDaysAdded <= 0}
            >
              {isExtending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Prolongation...
                </>
              ) : (
                'Confirmer'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resend Invitation Confirmation Dialog */}
      <Dialog open={!!resendConfirm} onOpenChange={(open) => !open && setResendConfirm(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Relancer l&apos;invitation</DialogTitle>
            <DialogDescription>
              {resendConfirm?.first_name && resendConfirm?.last_name
                ? `${resendConfirm.first_name} ${resendConfirm.last_name}`
                : resendConfirm?.email
              }
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <p className="text-sm text-slate-700">
              Un nouveau lien d&apos;invitation sera genere et envoye par email.
              Le lien sera valide pendant <strong>7 jours</strong> a partir de maintenant.
            </p>
            {resendConfirm?.status === 'expired' && (
              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800">
                  L&apos;invitation precedente a expire. Le destinataire recevra un email
                  l&apos;informant qu&apos;un nouveau lien est disponible.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setResendConfirm(null)}>
              Annuler
            </Button>
            <Button onClick={handleResendInvitation}>
              <Send className="h-4 w-4 mr-2" />
              Confirmer la relance
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Status Dialog */}
      <Dialog open={!!statusTeam} onOpenChange={(open) => !open && setStatusTeam(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Changer le statut d&apos;abonnement</DialogTitle>
            <DialogDescription>
              {statusTeam?.name}
              {statusTeam?.subscription_status && (
                <> — actuellement <strong>{statusLabels[statusTeam.subscription_status] || statusTeam.subscription_status}</strong></>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Nouveau statut</Label>
              <Select value={newStatus} onValueChange={(v) => setNewStatus(v as AdminSettableStatus)}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un statut..." />
                </SelectTrigger>
                <SelectContent>
                  {ADMIN_SETTABLE_STATUSES.filter(s => s !== statusTeam?.subscription_status).map(s => (
                    <SelectItem key={s} value={s}>
                      {statusLabels[s] || s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {newStatus === 'trialing' && statusTeam?.subscription_status !== 'trialing' && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  Un nouveau trial de <strong>30 jours</strong> sera initialise.
                </p>
              </div>
            )}

            {newStatus === 'canceled' && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800">
                  L&apos;equipe passera en mode lecture seule (pas de suppression de donnees).
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusTeam(null)} disabled={isChangingStatus}>
              Annuler
            </Button>
            <Button onClick={handleChangeStatus} disabled={isChangingStatus || !newStatus}>
              {isChangingStatus ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Modification...</>
              ) : (
                'Confirmer'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Team Dialog */}
      <Dialog open={!!deleteTeam} onOpenChange={(open) => !open && setDeleteTeam(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              Supprimer l&apos;equipe
            </DialogTitle>
            <DialogDescription>
              Cette action est irreversible et supprimera toutes les donnees associees.
            </DialogDescription>
          </DialogHeader>

          {deleteTeam && (
            <div className="py-4 space-y-4">
              {/* Impact summary */}
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg space-y-1">
                <p className="text-sm font-medium text-red-800">Donnees supprimees :</p>
                <ul className="text-sm text-red-700 list-disc list-inside space-y-0.5">
                  <li>{deleteTeam.member_count} membre(s) et leur(s) compte(s)</li>
                  <li>{deleteTeam.lot_count} lot(s), immeubles, et documents</li>
                  <li>Interventions, contrats, devis</li>
                  <li>Abonnement et configuration email</li>
                </ul>
                <p className="text-xs text-red-600 mt-2">
                  Les membres presents dans d&apos;autres equipes conserveront leur compte.
                </p>
              </div>

              {/* Confirmation input */}
              <div>
                <Label htmlFor="delete-confirm" className="text-sm font-medium mb-2 block">
                  Tapez <strong className="text-red-700">{deleteTeam.name}</strong> pour confirmer
                </Label>
                <Input
                  id="delete-confirm"
                  value={deleteConfirmName}
                  onChange={(e) => setDeleteConfirmName(e.target.value)}
                  placeholder={deleteTeam.name}
                  className="border-red-200 focus-visible:ring-red-500"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTeam(null)} disabled={isDeleting}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteTeam}
              disabled={
                isDeleting ||
                deleteConfirmName.trim().toLowerCase() !== deleteTeam?.name.trim().toLowerCase()
              }
            >
              {isDeleting ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Suppression...</>
              ) : (
                <><Trash2 className="h-4 w-4 mr-2" />Supprimer definitivement</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite Gestionnaire Dialog */}
      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Ajouter une equipe</DialogTitle>
            <DialogDescription>
              Le gestionnaire recevra un email pour definir son mot de passe et commencer a utiliser SEIDO.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="invite-email">Email *</Label>
              <Input
                id="invite-email"
                type="email"
                value={inviteData.email}
                onChange={e => setInviteData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="gestionnaire@example.com"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="invite-firstName">Prenom *</Label>
                <Input
                  id="invite-firstName"
                  value={inviteData.firstName}
                  onChange={e => setInviteData(prev => ({ ...prev, firstName: e.target.value }))}
                  placeholder="Jean"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="invite-lastName">Nom *</Label>
                <Input
                  id="invite-lastName"
                  value={inviteData.lastName}
                  onChange={e => setInviteData(prev => ({ ...prev, lastName: e.target.value }))}
                  placeholder="Dupont"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="invite-organization">Organisation / Entreprise *</Label>
              <Input
                id="invite-organization"
                value={inviteData.organization}
                onChange={e => setInviteData(prev => ({ ...prev, organization: e.target.value }))}
                placeholder="SCI Les Jardins"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleInviteGestionnaire}
              disabled={isSubmitting || !inviteData.email || !inviteData.firstName || !inviteData.lastName || !inviteData.organization}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Envoyer l&apos;invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
