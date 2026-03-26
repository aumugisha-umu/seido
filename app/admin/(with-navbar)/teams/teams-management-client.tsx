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
import { Search, Clock, Loader2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { DatePicker, formatLocalDate } from '@/components/ui/date-picker'
import { extendTeamTrialAction } from '@/app/actions/admin-team-actions'
import type { AdminTeam } from '@/app/actions/admin-team-actions'
import { inviteGestionnaireAction } from '@/app/actions/user-admin-actions'

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
// Main component
// ---------------------------------------------------------------------------

interface TeamsManagementClientProps {
  initialTeams: AdminTeam[]
}

export function TeamsManagementClient({ initialTeams }: TeamsManagementClientProps) {
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
                      {isTrial && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenExtendDialog(team)}
                          className="gap-1"
                        >
                          <Clock className="h-3 w-3" />
                          Etendre
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Extend Trial Dialog */}
      <Dialog open={!!extendTeam} onOpenChange={(open) => !open && setExtendTeam(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Etendre l'essai</DialogTitle>
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
