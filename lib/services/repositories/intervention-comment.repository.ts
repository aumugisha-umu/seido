/**
 * Intervention Comment Repository
 * Handles all database operations for intervention comments
 */

import { BaseRepository } from '../core/base-repository'
import {
  createBrowserSupabaseClient,
  createServerSupabaseClient,
  createServerActionSupabaseClient
} from '../core/supabase-client'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import {
  NotFoundException,
  handleError,
  createErrorResponse
} from '../core/error-handler'
import {
  validateRequired,
  validateLength
} from '../core/service-types'

// Types
type InterventionComment = Database['public']['Tables']['intervention_comments']['Row']
type InterventionCommentInsert = Database['public']['Tables']['intervention_comments']['Insert']
type InterventionCommentUpdate = Database['public']['Tables']['intervention_comments']['Update']
type User = Database['public']['Tables']['users']['Row']

interface EnrichedComment extends InterventionComment {
  user?: Pick<User, 'id' | 'name' | 'email' | 'avatar_url' | 'role'>
}

export class InterventionCommentRepository extends BaseRepository<
  InterventionComment,
  InterventionCommentInsert,
  InterventionCommentUpdate
> {
  constructor(supabase: SupabaseClient) {
    super(supabase, 'intervention_comments')
  }

  /**
   * Validation hook
   */
  protected async validate(
    data: InterventionCommentInsert | InterventionCommentUpdate
  ): Promise<void> {
    if ('intervention_id' in data && data.intervention_id) {
      validateRequired({ intervention_id: data.intervention_id }, ['intervention_id'])
    }

    if ('user_id' in data && data.user_id) {
      validateRequired({ user_id: data.user_id }, ['user_id'])
    }

    if ('content' in data && data.content) {
      validateLength(data.content, 1, 2000, 'content')
    }
  }

  /**
   * Get comments for an intervention with user info
   */
  async findByInterventionId(interventionId: string) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select(`
        *,
        user:user_id(id, name, email, avatar_url, role)
      `)
      .eq('intervention_id', interventionId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false }) // Plus récent en haut

    if (error) {
      return createErrorResponse(
        handleError(error, 'intervention-comment:findByInterventionId')
      )
    }

    return { success: true as const, data: (data || []) as EnrichedComment[] }
  }

  /**
   * Create a new comment
   * @param interventionId - ID of the intervention
   * @param userId - ID of the user creating the comment
   * @param content - Comment content
   * @param isInternal - If true, comment visible only to gestionnaires/admins (default: false)
   */
  async createComment(
    interventionId: string,
    userId: string,
    content: string,
    isInternal: boolean = false
  ) {
    const insert: InterventionCommentInsert = {
      intervention_id: interventionId,
      user_id: userId,
      content: content.trim(),
      is_internal: isInternal
    }

    await this.validate(insert)

    const { data, error } = await this.supabase
      .from(this.tableName)
      .insert(insert)
      .select(`
        *,
        user:user_id(id, name, email, avatar_url, role)
      `)
      .single()

    if (error) {
      return createErrorResponse(
        handleError(error, 'intervention-comment:createComment')
      )
    }

    return { success: true as const, data: data as EnrichedComment }
  }

  /**
   * Soft delete a comment
   */
  async softDelete(commentId: string) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', commentId)
      .is('deleted_at', null)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundException(this.tableName, commentId)
      }
      return createErrorResponse(
        handleError(error, 'intervention-comment:softDelete')
      )
    }

    return { success: true as const, data }
  }

  /**
   * Get comment count for an intervention
   */
  async getCommentCount(interventionId: string) {
    const { count, error } = await this.supabase
      .from(this.tableName)
      .select('*', { count: 'exact', head: true })
      .eq('intervention_id', interventionId)
      .is('deleted_at', null)

    if (error) {
      return createErrorResponse(
        handleError(error, 'intervention-comment:getCommentCount')
      )
    }

    return { success: true as const, data: count || 0 }
  }
}

// Factory functions
export const createInterventionCommentRepository = () => {
  const supabase = createBrowserSupabaseClient()
  return new InterventionCommentRepository(supabase)
}

export const createServerInterventionCommentRepository = async () => {
  const supabase = await createServerSupabaseClient()
  return new InterventionCommentRepository(supabase)
}

export const createServerActionInterventionCommentRepository = async () => {
  const supabase = await createServerActionSupabaseClient()
  return new InterventionCommentRepository(supabase)
}
