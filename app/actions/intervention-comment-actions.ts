'use server'

/**
 * Intervention Comment Server Actions
 * Server-side operations for managing intervention comments
 */

import { createServerActionInterventionCommentRepository } from '@/lib/services/repositories/intervention-comment.repository'
import { createServerActionSupabaseClient } from '@/lib/services'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { logger } from '@/lib/logger'

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

// Validation schemas
const AddCommentSchema = z.object({
  interventionId: z.string().uuid(),
  content: z.string().min(1).max(2000)
})

const DeleteCommentSchema = z.object({
  commentId: z.string().uuid()
})

/**
 * Helper to get authenticated user ID
 */
async function getAuthenticatedUserId(): Promise<string | null> {
  const supabase = await createServerActionSupabaseClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null

  const { data: userData } = await supabase
    .from('users')
    .select('id')
    .eq('auth_user_id', session.user.id)
    .single()

  return userData?.id || null
}

/**
 * Add a comment to an intervention
 * Restricted to gestionnaires only (RLS policy)
 */
export async function addInterventionComment(
  input: unknown
): Promise<ActionResult<any>> {
  try {
    // Validate input
    const validated = AddCommentSchema.safeParse(input)
    if (!validated.success) {
      return {
        success: false,
        error: 'Données invalides: ' + validated.error.errors[0].message
      }
    }

    const { interventionId, content } = validated.data

    // Get authenticated user
    const userId = await getAuthenticatedUserId()
    if (!userId) {
      return { success: false, error: 'Non authentifié' }
    }

    // Create comment
    const repository = await createServerActionInterventionCommentRepository()
    const result = await repository.createComment(interventionId, userId, content)

    if (!result.success) {
      return { success: false, error: result.error.message }
    }

    // Revalidate intervention page
    revalidatePath(`/gestionnaire/interventions/${interventionId}`)
    revalidatePath('/gestionnaire/interventions')

    logger.info('Comment added', {
      commentId: result.data.id,
      interventionId,
      userId
    })

    return { success: true, data: result.data }
  } catch (error) {
    logger.error('Error adding comment', { error })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }
  }
}

/**
 * Delete (soft delete) a comment
 * Restricted to comment owner or admin (RLS policy)
 */
export async function deleteInterventionComment(
  input: unknown
): Promise<ActionResult<void>> {
  try {
    // Validate input
    const validated = DeleteCommentSchema.safeParse(input)
    if (!validated.success) {
      return {
        success: false,
        error: 'Données invalides: ' + validated.error.errors[0].message
      }
    }

    const { commentId } = validated.data

    // Get authenticated user
    const userId = await getAuthenticatedUserId()
    if (!userId) {
      return { success: false, error: 'Non authentifié' }
    }

    // Delete comment
    const repository = await createServerActionInterventionCommentRepository()
    const result = await repository.softDelete(commentId)

    if (!result.success) {
      return { success: false, error: result.error.message }
    }

    // Revalidate all intervention pages
    revalidatePath('/gestionnaire/interventions')

    logger.info('Comment deleted', { commentId, userId })

    return { success: true, data: undefined }
  } catch (error) {
    logger.error('Error deleting comment', { error })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }
  }
}

/**
 * Get comments for an intervention
 * Available to all participants (RLS policy)
 */
export async function getInterventionComments(
  interventionId: string
): Promise<ActionResult<any[]>> {
  try {
    const repository = await createServerActionInterventionCommentRepository()
    const result = await repository.findByInterventionId(interventionId)

    if (!result.success) {
      return { success: false, error: result.error.message }
    }

    return { success: true, data: result.data }
  } catch (error) {
    logger.error('Error fetching comments', { error })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }
  }
}
