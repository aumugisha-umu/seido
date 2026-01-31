'use client'

/**
 * 🏢 TeamSelector - Sélecteur d'équipe pour utilisateurs multi-équipes
 *
 * ✅ MULTI-ÉQUIPE (Jan 2026): Dropdown permettant de basculer entre équipes
 *
 * Fonctionnalités:
 * - Affiche toutes les équipes de l'utilisateur (même rôle)
 * - Option "Toutes les équipes" pour vue consolidée
 * - Badge indiquant le nombre d'équipes
 * - Persiste le choix dans cookie + localStorage
 *
 * @example
 * <TeamSelector
 *   teams={teams}
 *   currentTeamId={currentTeamId}
 *   onTeamChange={(teamId) => handleTeamChange(teamId)}
 * />
 */

import * as React from 'react'
import { Building2, ChevronDown, Layers } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Team } from '@/lib/services/core/service-types'
import { ALL_TEAMS_VALUE } from '@/hooks/use-current-team'

export interface TeamSelectorProps {
  /** Équipes disponibles pour sélection */
  teams: Team[]
  /** ID de l'équipe actuellement sélectionnée (ou 'all') */
  currentTeamId: string | 'all'
  /** Callback quand l'équipe change */
  onTeamChange: (teamId: string | 'all') => void
  /** Rôle actuel (pour affichage) */
  currentRole?: string
  /** Variante de taille */
  size?: 'default' | 'compact'
  /** Classes CSS additionnelles */
  className?: string
  /** Désactiver le sélecteur */
  disabled?: boolean
}

/**
 * Composant de sélection d'équipe
 */
export function TeamSelector({
  teams,
  currentTeamId,
  onTeamChange,
  currentRole,
  size = 'default',
  className,
  disabled = false,
}: TeamSelectorProps) {
  // Si une seule équipe, ne pas afficher le sélecteur
  if (teams.length <= 1) {
    return null
  }

  const currentTeam = teams.find(t => t.id === currentTeamId)
  const isAllTeams = currentTeamId === ALL_TEAMS_VALUE

  // Label du rôle pour l'option "Toutes les équipes"
  const roleLabel = getRoleLabel(currentRole)

  return (
    <Select
      value={currentTeamId}
      onValueChange={onTeamChange}
      disabled={disabled}
    >
      <SelectTrigger
        className={cn(
          'min-w-[180px] gap-2',
          size === 'compact' && 'h-8 text-xs min-w-[140px]',
          className
        )}
        aria-label="Sélectionner une équipe"
      >
        <SelectValue placeholder="Sélectionner une équipe">
          <span className="flex items-center gap-2">
            {isAllTeams ? (
              <>
                <Layers className="h-4 w-4 text-muted-foreground" />
                <span className="truncate">Toutes les équipes</span>
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs font-normal">
                  {teams.length}
                </Badge>
              </>
            ) : (
              <>
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="truncate">{currentTeam?.name || 'Équipe'}</span>
              </>
            )}
          </span>
        </SelectValue>
      </SelectTrigger>

      <SelectContent>
        {/* Option "Toutes les équipes" */}
        <SelectItem value={ALL_TEAMS_VALUE} className="gap-2">
          <span className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            <span>Toutes mes équipes {roleLabel}</span>
            <Badge variant="secondary" className="ml-auto h-5 px-1.5 text-xs">
              {teams.length}
            </Badge>
          </span>
        </SelectItem>

        <SelectSeparator />

        {/* Liste des équipes */}
        {teams.map(team => (
          <SelectItem key={team.id} value={team.id} className="gap-2">
            <span className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span className="truncate">{team.name}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/**
 * Version compacte pour mobile / menu hamburger
 */
export function TeamSelectorCompact({
  teams,
  currentTeamId,
  onTeamChange,
  currentRole,
}: Omit<TeamSelectorProps, 'size' | 'className'>) {
  // Si une seule équipe, afficher juste le nom
  if (teams.length <= 1) {
    const team = teams[0]
    return (
      <div className="flex items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground">
        <Building2 className="h-4 w-4" />
        <span>{team?.name || 'Mon équipe'}</span>
      </div>
    )
  }

  const currentTeam = teams.find(t => t.id === currentTeamId)
  const isAllTeams = currentTeamId === ALL_TEAMS_VALUE
  const roleLabel = getRoleLabel(currentRole)

  return (
    <div className="space-y-1">
      <p className="px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
        Équipe
      </p>

      {/* Option "Toutes les équipes" */}
      <button
        onClick={() => onTeamChange(ALL_TEAMS_VALUE)}
        className={cn(
          'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
          isAllTeams
            ? 'bg-accent text-accent-foreground'
            : 'hover:bg-accent/50'
        )}
      >
        <Layers className="h-4 w-4" />
        <span className="flex-1 text-left">Toutes {roleLabel}</span>
        <Badge variant="secondary" className="h-5 px-1.5 text-xs">
          {teams.length}
        </Badge>
      </button>

      {/* Liste des équipes */}
      {teams.map(team => (
        <button
          key={team.id}
          onClick={() => onTeamChange(team.id)}
          className={cn(
            'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
            currentTeamId === team.id
              ? 'bg-accent text-accent-foreground'
              : 'hover:bg-accent/50'
          )}
        >
          <Building2 className="h-4 w-4" />
          <span className="flex-1 text-left truncate">{team.name}</span>
        </button>
      ))}
    </div>
  )
}

/**
 * Helper pour obtenir le label du rôle
 */
function getRoleLabel(role?: string): string {
  if (!role) return ''

  const roleLabels: Record<string, string> = {
    admin: '(admin)',
    gestionnaire: '(gestionnaire)',
    prestataire: '(prestataire)',
    locataire: '(locataire)',
    proprietaire: '(propriétaire)',
  }

  return roleLabels[role] || ''
}

export default TeamSelector
