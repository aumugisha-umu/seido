'use server'

import { getServerActionAuthContext } from '@/lib/server-context'
import { logger } from '@/lib/logger'

/**
 * Update team name. Only team admins (team_members.role = 'admin') can do this.
 */
export async function updateTeamNameAction(teamId: string, newName: string): Promise<{ success: boolean; error?: string }> {
  const trimmedName = newName.trim()
  if (!trimmedName || trimmedName.length < 1) {
    return { success: false, error: 'Le nom de l\'equipe est requis' }
  }
  if (trimmedName.length > 100) {
    return { success: false, error: 'Le nom ne peut pas depasser 100 caracteres' }
  }

  const { profile, supabase } = await getServerActionAuthContext('gestionnaire')

  // Verify user is admin of this team
  const { data: membership } = await supabase
    .from('team_members')
    .select('role')
    .eq('team_id', teamId)
    .eq('user_id', profile.id)
    .limit(1)

  if (membership?.[0]?.role !== 'admin') {
    return { success: false, error: 'Seul l\'administrateur de l\'equipe peut modifier le nom' }
  }

  const { error } = await supabase
    .from('teams')
    .update({ name: trimmedName })
    .eq('id', teamId)

  if (error) {
    logger.error('[TEAM-ACTION] Failed to update team name:', error)
    return { success: false, error: 'Erreur lors de la mise a jour du nom' }
  }

  logger.info('[TEAM-ACTION] Team name updated', { teamId, newName: trimmedName, by: profile.id })
  return { success: true }
}
