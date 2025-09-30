/**
 * Team Member Repository - Gestion des membres d'équipe avec rôles contextuels
 * Supporte la multi-appartenance: un utilisateur peut être dans plusieurs équipes avec différents rôles
 */

import { BaseRepository } from '../core/base-repository'
import type { RepositoryResult } from '../core/service-types'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createBrowserSupabaseClient, createServerSupabaseClient } from '../core/supabase-client'

/**
 * Team Member Type (from database)
 */
export interface TeamMember {
  id: string
  team_id: string
  user_id: string
  role: 'admin' | 'member'  // TODO: Migrer vers user_role après migration
  joined_at: string
}

/**
 * Team Member avec informations enrichies
 */
export interface TeamMemberWithDetails extends TeamMember {
  user?: {
    id: string
    email: string
    name: string
    role: 'admin' | 'gestionnaire' | 'locataire' | 'prestataire'
  }
  team?: {
    id: string
    name: string
    description: string | null
  }
}

/**
 * User Team Association (pour getUserTeams)
 */
export interface UserTeamAssociation {
  team_id: string
  team_name: string
  team_description: string | null
  member_role: 'admin' | 'member'  // Rôle dans team_members
  user_role: 'admin' | 'gestionnaire' | 'locataire' | 'prestataire'  // Rôle utilisateur
  joined_at: string
}

/**
 * Insert/Update types
 */
export interface TeamMemberInsert {
  team_id: string
  user_id: string
  role?: 'admin' | 'member'
}

export interface TeamMemberUpdate {
  role?: 'admin' | 'member'
}

/**
 * Team Member Repository
 * Gère les relations utilisateur-équipe avec support multi-équipes
 */
export class TeamMemberRepository extends BaseRepository<TeamMember> {
  constructor(supabase: SupabaseClient) {
    super(supabase, 'team_members')
  }

  /**
   * Trouver un membre spécifique dans une équipe
   */
  async findByUserAndTeam(userId: string, teamId: string): Promise<RepositoryResult<TeamMember>> {
    const cacheKey = `team_member_${userId}_${teamId}`
    const cached = this.getFromCache<TeamMember>(cacheKey)
    if (cached) return { success: true, data: cached }

    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('user_id', userId)
        .eq('team_id', teamId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return {
            success: false,
            error: { code: 'NOT_FOUND', message: 'Team member not found' }
          }
        }
        throw error
      }

      this.setCache(cacheKey, data, 300000) // 5 min cache
      return { success: true, data }
    } catch (error) {
      return this.handleError(error, 'findByUserAndTeam')
    }
  }

  /**
   * Obtenir toutes les équipes d'un utilisateur avec leurs rôles
   * Retourne les informations nécessaires pour le workspace switching
   */
  async findTeamsByUser(userId: string): Promise<RepositoryResult<UserTeamAssociation[]>> {
    const cacheKey = `user_teams_${userId}`
    const cached = this.getFromCache<UserTeamAssociation[]>(cacheKey)
    if (cached) return { success: true, data: cached }

    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select(`
          team_id,
          role,
          joined_at,
          teams:team_id (
            id,
            name,
            description
          ),
          users:user_id (
            id,
            role
          )
        `)
        .eq('user_id', userId)
        .order('joined_at', { ascending: false })

      if (error) throw error

      // Transform data pour typage correct
      const transformed: UserTeamAssociation[] = (data || []).map((item: any) => ({
        team_id: item.team_id,
        team_name: item.teams?.name || 'Unknown Team',
        team_description: item.teams?.description || null,
        member_role: item.role,
        user_role: item.users?.role || 'gestionnaire',
        joined_at: item.joined_at
      }))

      this.setCache(cacheKey, transformed, 300000) // 5 min cache
      return { success: true, data: transformed }
    } catch (error) {
      return this.handleError(error, 'findTeamsByUser')
    }
  }

  /**
   * Obtenir tous les membres d'une équipe avec détails utilisateur
   */
  async findMembersByTeam(teamId: string): Promise<RepositoryResult<TeamMemberWithDetails[]>> {
    const cacheKey = `team_members_${teamId}`
    const cached = this.getFromCache<TeamMemberWithDetails[]>(cacheKey)
    if (cached) return { success: true, data: cached }

    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select(`
          id,
          team_id,
          user_id,
          role,
          joined_at,
          users:user_id (
            id,
            email,
            name,
            role
          ),
          teams:team_id (
            id,
            name,
            description
          )
        `)
        .eq('team_id', teamId)
        .order('joined_at', { ascending: true })

      if (error) throw error

      // Cast avec transformation
      const members = (data || []).map((item: any) => ({
        id: item.id,
        team_id: item.team_id,
        user_id: item.user_id,
        role: item.role,
        joined_at: item.joined_at,
        user: item.users ? {
          id: item.users.id,
          email: item.users.email,
          name: item.users.name,
          role: item.users.role
        } : undefined,
        team: item.teams ? {
          id: item.teams.id,
          name: item.teams.name,
          description: item.teams.description
        } : undefined
      }))

      this.setCache(cacheKey, members, 300000)
      return { success: true, data: members }
    } catch (error) {
      return this.handleError(error, 'findMembersByTeam')
    }
  }

  /**
   * Ajouter un membre à une équipe
   */
  async addMember(insert: TeamMemberInsert): Promise<RepositoryResult<TeamMember>> {
    try {
      // Vérifier si le membre existe déjà
      const existing = await this.findByUserAndTeam(insert.user_id, insert.team_id)
      if (existing.success && existing.data) {
        return {
          success: false,
          error: { code: 'CONFLICT', message: 'User is already a member of this team' }
        }
      }

      const { data, error } = await this.supabase
        .from(this.tableName)
        .insert({
          team_id: insert.team_id,
          user_id: insert.user_id,
          role: insert.role || 'member'
        })
        .select()
        .single()

      if (error) throw error

      // Invalider les caches
      this.clearCache(`user_teams_${insert.user_id}`)
      this.clearCache(`team_members_${insert.team_id}`)

      return { success: true, data }
    } catch (error) {
      return this.handleError(error, 'addMember')
    }
  }

  /**
   * Retirer un membre d'une équipe
   */
  async removeMember(userId: string, teamId: string): Promise<RepositoryResult<void>> {
    try {
      const { error } = await this.supabase
        .from(this.tableName)
        .delete()
        .eq('user_id', userId)
        .eq('team_id', teamId)

      if (error) throw error

      // Invalider les caches
      this.clearCache(`team_member_${userId}_${teamId}`)
      this.clearCache(`user_teams_${userId}`)
      this.clearCache(`team_members_${teamId}`)

      return { success: true, data: undefined }
    } catch (error) {
      return this.handleError(error, 'removeMember')
    }
  }

  /**
   * Mettre à jour le rôle d'un membre
   */
  async updateMemberRole(userId: string, teamId: string, newRole: 'admin' | 'member'): Promise<RepositoryResult<TeamMember>> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .update({ role: newRole })
        .eq('user_id', userId)
        .eq('team_id', teamId)
        .select()
        .single()

      if (error) throw error

      // Invalider les caches
      this.clearCache(`team_member_${userId}_${teamId}`)
      this.clearCache(`user_teams_${userId}`)
      this.clearCache(`team_members_${teamId}`)

      return { success: true, data }
    } catch (error) {
      return this.handleError(error, 'updateMemberRole')
    }
  }

  /**
   * Vérifier si un utilisateur est membre d'une équipe
   */
  async isMember(userId: string, teamId: string): Promise<boolean> {
    const result = await this.findByUserAndTeam(userId, teamId)
    return result.success && !!result.data
  }

  /**
   * Vérifier si un utilisateur est admin d'une équipe
   */
  async isAdmin(userId: string, teamId: string): Promise<boolean> {
    const result = await this.findByUserAndTeam(userId, teamId)
    return result.success && result.data?.role === 'admin'
  }

  /**
   * Compter les membres d'une équipe
   */
  async countTeamMembers(teamId: string): Promise<number> {
    try {
      const { count, error } = await this.supabase
        .from(this.tableName)
        .select('*', { count: 'exact', head: true })
        .eq('team_id', teamId)

      if (error) throw error
      return count || 0
    } catch (error) {
      console.error('[TEAM-MEMBER-REPO] Error counting members:', error)
      return 0
    }
  }

  /**
   * Compter les équipes d'un utilisateur
   */
  async countUserTeams(userId: string): Promise<number> {
    try {
      const { count, error } = await this.supabase
        .from(this.tableName)
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)

      if (error) throw error
      return count || 0
    } catch (error) {
      console.error('[TEAM-MEMBER-REPO] Error counting user teams:', error)
      return 0
    }
  }
}

// Factory functions
export const createTeamMemberRepository = () => {
  const supabase = createBrowserSupabaseClient()
  return new TeamMemberRepository(supabase)
}

export const createServerTeamMemberRepository = async () => {
  const supabase = await createServerSupabaseClient()
  return new TeamMemberRepository(supabase)
}
